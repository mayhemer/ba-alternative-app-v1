import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DbSyncState, DbUserInterest } from '../../shared/types';

const client = new DynamoDBClient(
  process.env.MOCK_DYNAMODB_ENDPOINT
    ? {
        endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
        region: 'local',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      }
    : {},
);
const dynamo = DynamoDBDocumentClient.from(client);

// Called in integration tests to release the connection so dynalite can shut down
export function closeDbClient(): void {
  client.destroy();
}

// ── Public tables (slug-partitioned) ─────────────────────────────────────────

// Returns all items for a slug — full projection, paginated
export async function queryAll<T>(tableName: string, slug: string): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'slug = :slug',
        ExpressionAttributeValues: { ':slug': slug },
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of result.Items ?? []) items.push(item as T);
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

// ── Single-item operations ────────────────────────────────────────────────────

export async function getItem<T>(
  tableName: string,
  key: Record<string, string>,
): Promise<T | null> {
  const result = await dynamo.send(new GetCommand({ TableName: tableName, Key: key }));
  return (result.Item as T | undefined) ?? null;
}

export async function putItem(tableName: string, item: object): Promise<void> {
  await dynamo.send(
    new PutCommand({ TableName: tableName, Item: item as Record<string, unknown> }),
  );
}

export async function deleteItem(tableName: string, key: Record<string, string>): Promise<void> {
  await dynamo.send(new DeleteCommand({ TableName: tableName, Key: key }));
}

// ── User interests ────────────────────────────────────────────────────────────

// Returns all interests for a user in a specific festival edition.
// Uses begins_with on the composite SK "slug#artistId".
export async function queryUserInterestsBySlug(
  tableName: string,
  userId: string,
  slug: string,
): Promise<DbUserInterest[]> {
  const items: DbUserInterest[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'userId = :uid AND begins_with(slugArtistId, :prefix)',
        ExpressionAttributeValues: { ':uid': userId, ':prefix': `${slug}#` },
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of result.Items ?? []) items.push(item as DbUserInterest);
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

// ── Sync state ────────────────────────────────────────────────────────────────

// Returns all sync-state entries for a slug (one per sync group: artists, schedule)
export async function querySyncState(
  tableName: string,
  slug: string,
): Promise<DbSyncState[]> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
    }),
  );
  return (result.Items ?? []) as DbSyncState[];
}
