import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Tables } from './constructs/tables';
import { Auth } from './constructs/auth';
import { Lambdas } from './constructs/lambdas';
import { Api } from './constructs/api';
import { Cdn } from './constructs/cdn';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tables = new Tables(this, 'Tables');
    const auth = new Auth(this, 'Auth');
    const lambdas = new Lambdas(this, 'Lambdas', { tables });
    const api = new Api(this, 'Api', {
      apiLambda: lambdas.apiFn,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
    });
    const cdn = new Cdn(this, 'Cdn', { httpApi: api.httpApi });

    // Wire distribution ID into sync Lambda (available only after CDN construct is created)
    lambdas.syncFn.addEnvironment('CLOUDFRONT_DISTRIBUTION_ID', cdn.distribution.distributionId);

    // IAM: allow sync Lambda to create CloudFront invalidations
    lambdas.syncFn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${cdn.distribution.distributionId}`,
      ],
    }));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.httpApi.url!,
      description: 'API Gateway HTTP API URL (not for direct client use — use CdnUrl)',
    });
    new cdk.CfnOutput(this, 'CdnUrl', {
      value: cdn.url,
      description: 'CloudFront distribution URL — use this as the API base in the app',
    });
    new cdk.CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: auth.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'IdentityPoolId', { value: auth.identityPool.ref });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: cdn.distribution.distributionId });
  }
}
