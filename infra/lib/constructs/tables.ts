// ⚠ When adding or renaming tables/keys here, mirror the change in
//   app/backend/db-table-schema.js (used by integration tests against DynamoDB Local).

import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export class Tables extends Construct {
  readonly artists: dynamodb.Table;
  readonly stages: dynamodb.Table;
  readonly categories: dynamodb.Table;
  readonly events: dynamodb.Table;
  readonly userInterests: dynamodb.Table;
  readonly shareTokens: dynamodb.Table;
  readonly syncState: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // All public tables use slug as PK so editions are fully isolated.
    // Artist/stage/event IDs are NOT unique across slugs.

    this.artists = new dynamodb.Table(this, 'Artists', {
      tableName: 'ba-artists',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'artistId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.stages = new dynamodb.Table(this, 'Stages', {
      tableName: 'ba-stages',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'stageId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.categories = new dynamodb.Table(this, 'Categories', {
      tableName: 'ba-categories',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'categoryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.events = new dynamodb.Table(this, 'Events', {
      tableName: 'ba-events',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // SK is "slug#artistId" so a user's interests span multiple editions in one table
    this.userInterests = new dynamodb.Table(this, 'UserInterests', {
      tableName: 'ba-user-interests',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'slugArtistId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.shareTokens = new dynamodb.Table(this, 'ShareTokens', {
      tableName: 'ba-share-tokens',
      partitionKey: { name: 'token', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Tracks last-seen timestamps from official /changes per slug+dataset
    this.syncState = new dynamodb.Table(this, 'SyncState', {
      tableName: 'ba-sync-state',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'tableName', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
