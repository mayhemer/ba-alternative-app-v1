import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  APIGatewayEventRequestContextV2WithAuthorizer,
  APIGatewayEventRequestContextJWTAuthorizer,
} from 'aws-lambda';
import { randomBytes } from 'node:crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  queryAll,
  getItem,
  putItem,
  deleteItem,
  queryUserInterestsBySlug,
  querySyncState,
} from './db';
import type { DbArtist, DbCategory, DbStage, DbEvent, DbUserInterest, DbShareToken } from '../../shared/types';

// ── Config (read lazily so tests can set process.env) ─────────────────────────

function getConfig() {
  const env = process.env as Record<string, string>;
  return {
    syncFunctionArn: env.SYNC_FUNCTION_ARN,
    tables: {
      artists:       env.ARTISTS_TABLE,
      stages:        env.STAGES_TABLE,
      categories:    env.CATEGORIES_TABLE,
      events:        env.EVENTS_TABLE,
      userInterests: env.USER_INTERESTS_TABLE,
      shareTokens:   env.SHARE_TOKENS_TABLE,
      syncState:     env.SYNC_STATE_TABLE,
    },
  };
}

const lambdaClient = new LambdaClient({});

// ── Entry point ───────────────────────────────────────────────────────────────

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const { syncFunctionArn, tables } = getConfig();
  const p = event.pathParameters ?? {};

  try {
    switch (event.routeKey) {

      // ── Public ──────────────────────────────────────────────────────────────

      case 'GET /{slug}/artists':
        return json(await queryAll<DbArtist>(tables.artists, p.slug!));

      case 'GET /{slug}/categories':
        return json(await queryAll<DbCategory>(tables.categories, p.slug!));

      case 'GET /{slug}/stages':
        return json(await queryAll<DbStage>(tables.stages, p.slug!));

      case 'GET /{slug}/schedule':
        return json(await queryAll<DbEvent>(tables.events, p.slug!));

      case 'GET /{slug}/validity/{time}': {
        const clientTime = Number(p.time);
        if (isNaN(clientTime)) return badRequest('time must be a number');
        const entries = await querySyncState(tables.syncState, p.slug!);
        const lastSyncedAt = Math.max(0, ...entries.map(e => e.lastSyncedAt));
        return json({ changed: lastSyncedAt > clientTime, lastSyncedAt });
      }

      case 'POST /sync':
        await lambdaClient.send(new InvokeCommand({
          FunctionName: syncFunctionArn,
          InvocationType: 'Event', // async — returns immediately, sync runs in background
        }));
        return json({ message: 'Sync triggered' }, 202);

      case 'GET /share/{token}': {
        const tokenItem = await getItem<DbShareToken>(tables.shareTokens, { token: p.token! });
        if (!tokenItem) return notFound('Share token not found');
        const interests = await queryUserInterestsBySlug(
          tables.userInterests,
          tokenItem.userId,
          tokenItem.slug,
        );
        return json({ slug: tokenItem.slug, interests });
      }

      // ── Authenticated ────────────────────────────────────────────────────────

      case 'GET /user/{slug}/schedule': {
        const interests = await queryUserInterestsBySlug(
          tables.userInterests,
          userId(event),
          p.slug!,
        );
        return json(interests);
      }

      case 'PUT /user/{slug}/schedule/{artistId}': {
        const body = parseBody(event.body);
        if (!body || !['will_go', 'maybe'].includes(body.status as string)) {
          return badRequest('body.status must be "will_go" or "maybe"');
        }
        const interest: DbUserInterest = {
          userId: userId(event),
          slugArtistId: `${p.slug!}#${p.artistId!}`,
          status: body.status as DbUserInterest['status'],
          updatedAt: Date.now(),
        };
        await putItem(tables.userInterests, interest);
        return json(interest);
      }

      case 'DELETE /user/{slug}/schedule/{artistId}': {
        // Soft delete: keep the record with status 'none' so that other devices can
        // resolve the deletion correctly via updatedAt comparison during sync merge.
        // Hard deletes would leave no timestamp for the merge to compare against,
        // causing the old interest to survive on devices that haven't synced yet.
        const softDelete: DbUserInterest = {
          userId: userId(event),
          slugArtistId: `${p.slug!}#${p.artistId!}`,
          status: 'none',
          updatedAt: Date.now(),
        };
        await putItem(tables.userInterests, softDelete);
        return noContent();
      }

      case 'POST /{slug}/share': {
        const token = randomBytes(24).toString('hex');
        const tokenItem: DbShareToken = {
          token,
          userId: userId(event),
          slug: p.slug!,
          createdAt: Date.now(),
        };
        await putItem(tables.shareTokens, tokenItem);
        return json({ token }, 201);
      }

      case 'DELETE /share/{token}': {
        const existing = await getItem<DbShareToken>(tables.shareTokens, { token: p.token! });
        if (!existing) return notFound('Share token not found');
        if (existing.userId !== userId(event)) return forbidden();
        await deleteItem(tables.shareTokens, { token: p.token! });
        return noContent();
      }

      default:
        return notFound('Route not found');
    }
  } catch (err) {
    console.error('[api] Unhandled error:', err);
    return { statusCode: 500, headers: CT_JSON, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CT_JSON = { 'Content-Type': 'application/json' };

function json(body: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return { statusCode, headers: CT_JSON, body: JSON.stringify(body) };
}

function noContent(): APIGatewayProxyResultV2 {
  return { statusCode: 204, body: '' };
}

function badRequest(message: string): APIGatewayProxyResultV2 {
  return { statusCode: 400, headers: CT_JSON, body: JSON.stringify({ error: message }) };
}

function notFound(message = 'Not found'): APIGatewayProxyResultV2 {
  return { statusCode: 404, headers: CT_JSON, body: JSON.stringify({ error: message }) };
}

function forbidden(message = 'Forbidden'): APIGatewayProxyResultV2 {
  return { statusCode: 403, headers: CT_JSON, body: JSON.stringify({ error: message }) };
}

// Extracts the Cognito sub from the JWT claims injected by API Gateway.
// The base event type omits the authorizer context, so we cast to the specific
// JWT authorizer variant — safe because API Gateway always populates it for
// routes that have a Cognito authorizer attached.
function userId(event: APIGatewayProxyEventV2): string {
  const ctx = event.requestContext as APIGatewayEventRequestContextV2WithAuthorizer<APIGatewayEventRequestContextJWTAuthorizer>;
  return ctx.authorizer.jwt.claims['sub'] as string;
}

function parseBody(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Record<string, unknown>; }
  catch { return null; }
}
