import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
  PutCommand,
  type WriteRequest,
} from '@aws-sdk/lib-dynamodb';
import type { DbSyncState } from '../../shared/types';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const BATCH_SIZE = 25; // DynamoDB BatchWrite max items per request
const MAX_RETRIES = 5;

// ── Batch write (put) ─────────────────────────────────────────────────────────

export async function batchPut(tableName: string, items: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const requests: WriteRequest[] = items
      .slice(i, i + BATCH_SIZE)
      .map(item => ({ PutRequest: { Item: item } }));
    await sendBatchWithRetry(tableName, requests);
  }
}

// ── Batch delete ──────────────────────────────────────────────────────────────

export async function batchDelete(
  tableName: string,
  keys: Record<string, unknown>[],
): Promise<void> {
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const requests: WriteRequest[] = keys
      .slice(i, i + BATCH_SIZE)
      .map(key => ({ DeleteRequest: { Key: key } }));
    await sendBatchWithRetry(tableName, requests);
  }
}

// Retry loop for unprocessed items (can occur under burst load even with PAY_PER_REQUEST)
async function sendBatchWithRetry(
  tableName: string,
  requests: WriteRequest[],
  attempt = 0,
): Promise<void> {
  const result = await dynamo.send(
    new BatchWriteCommand({ RequestItems: { [tableName]: requests } }),
  );
  const unprocessed = result.UnprocessedItems?.[tableName];
  if (unprocessed && unprocessed.length > 0) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`BatchWrite: ${unprocessed.length} unprocessed items after ${MAX_RETRIES} retries in ${tableName}`);
    }
    const delayMs = Math.min(100 * Math.pow(2, attempt), 3000);
    await sleep(delayMs);
    await sendBatchWithRetry(tableName, unprocessed, attempt + 1);
  }
}

// ── Query all keys for a slug ─────────────────────────────────────────────────

// Returns all {slug, {skName}} key objects for PK=slug (paginated)
export async function queryAllKeys(
  tableName: string,
  slug: string,
  skName: string,
): Promise<Record<string, unknown>[]> {
  const keys: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'slug = :slug',
        ExpressionAttributeValues: { ':slug': slug },
        ProjectionExpression: `slug, ${skName}`,
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of result.Items ?? []) {
      keys.push({ slug: item['slug'], [skName]: item[skName] });
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return keys;
}

// ── SyncState ─────────────────────────────────────────────────────────────────

export async function getSyncState(
  syncStateTable: string,
  slug: string,
): Promise<Map<string, DbSyncState>> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: syncStateTable,
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slug },
    }),
  );
  const map = new Map<string, DbSyncState>();
  for (const item of result.Items ?? []) {
    map.set(item['tableName'] as string, item as unknown as DbSyncState);
  }
  return map;
}

export async function putSyncState(
  syncStateTable: string,
  item: DbSyncState,
): Promise<void> {
  await dynamo.send(new PutCommand({ TableName: syncStateTable, Item: item }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
