import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Tables } from './tables';

export interface LambdasProps {
  tables: Tables;
}

export class Lambdas extends Construct {
  readonly apiFn: NodejsFunction;
  readonly syncFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdasProps) {
    super(scope, id);

    const { tables } = props;

    const tableEnv = {
      ARTISTS_TABLE: tables.artists.tableName,
      STAGES_TABLE: tables.stages.tableName,
      CATEGORIES_TABLE: tables.categories.tableName,
      EVENTS_TABLE: tables.events.tableName,
      USER_INTERESTS_TABLE: tables.userInterests.tableName,
      SHARE_TOKENS_TABLE: tables.shareTokens.tableName,
      SYNC_STATE_TABLE: tables.syncState.tableName,
    };

    // Lambda source lives in backend/ — a sibling package of infra/.
    // projectRoot + depsLockFilePath must be set explicitly so NodejsFunction's
    // path validation doesn't reject paths that are outside the infra directory.
    const backendRoot = path.join(__dirname, '../../../backend');
    const depsLockFilePath = path.join(backendRoot, 'package-lock.json');
    const bundling = { minify: true, sourceMap: false };

    // User-facing API Lambda
    this.apiFn = new NodejsFunction(this, 'ApiFunction', {
      functionName: 'ba-api',
      description: 'Brutal Assault — user-facing API handler',
      entry: path.join(backendRoot, 'lambdas/api/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: tableEnv,
      bundling,
      projectRoot: backendRoot,
      depsLockFilePath,
    });

    // Background sync Lambda — polls official API and rebuilds DynamoDB tables
    // CLOUDFRONT_DISTRIBUTION_ID is injected from the stack after the CDN construct is created
    this.syncFn = new NodejsFunction(this, 'SyncFunction', {
      functionName: 'ba-sync',
      description: 'Brutal Assault — background sync from official API',
      entry: path.join(backendRoot, 'lambdas/sync/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.minutes(5),
      environment: {
        ...tableEnv,
        // FESTIVAL_SLUGS: comma-separated `slug:<ISO end timestamp>` entries. An
        // edition stops being polled once its end timestamp has passed, so the
        // list can hold every edition and still only fetch the live one. A bare
        // slug with no timestamp is always synced.
        // Set via: cdk deploy --context festivalSlugs=ba2026:2026-08-08T23:59:59+02:00
        FESTIVAL_SLUGS: this.node.tryGetContext('festivalSlugs') ?? '',
      },
      bundling,
      projectRoot: backendRoot,
      depsLockFilePath,
    });

    // IAM: API Lambda — read public tables; read-write user tables
    for (const table of [tables.artists, tables.stages, tables.categories, tables.events, tables.syncState]) {
      table.grantReadData(this.apiFn);
    }
    tables.userInterests.grantReadWriteData(this.apiFn);
    tables.shareTokens.grantReadWriteData(this.apiFn);

    // IAM: Sync Lambda — read-write public tables + syncState
    // CloudFront invalidation permission is added from the stack after CDN is created
    for (const table of [tables.artists, tables.stages, tables.categories, tables.events, tables.syncState]) {
      table.grantReadWriteData(this.syncFn);
    }

    // EventBridge scheduled rule — the only trigger for the sync Lambda.
    const syncRule = new events.Rule(this, 'SyncSchedule', {
      ruleName: 'ba-sync-schedule',
      description: 'Trigger BA sync Lambda hourly',
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      enabled: true,
    });
    syncRule.addTarget(new targets.LambdaFunction(this.syncFn));
  }
}
