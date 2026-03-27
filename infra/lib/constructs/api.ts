import { Construct } from 'constructs';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export interface ApiProps {
  apiLambda: NodejsFunction;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class Api extends Construct {
  readonly httpApi: HttpApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const { apiLambda, userPool, userPoolClient } = props;

    const integration = new HttpLambdaIntegration('ApiIntegration', apiLambda);

    const authorizer = new HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
      identitySource: ['$request.header.Authorization'],
    });

    this.httpApi = new HttpApi(this, 'HttpApi', {
      apiName: 'ba-api',
      description: 'Brutal Assault Festival App API',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.PUT,
          CorsHttpMethod.POST,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['https://ba.janbambas.cz', 'http://localhost:8081'],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Public routes — no auth required
    const publicRoutes: Array<[HttpMethod, string]> = [
      [HttpMethod.GET, '/{slug}/artists'],
      [HttpMethod.GET, '/{slug}/categories'],
      [HttpMethod.GET, '/{slug}/stages'],
      [HttpMethod.GET, '/{slug}/schedule'],
      [HttpMethod.GET, '/{slug}/validity/{time}'],
      [HttpMethod.GET, '/share/{token}'],
    ];

    for (const [method, path] of publicRoutes) {
      this.httpApi.addRoutes({ path, methods: [method], integration });
    }

    // Authenticated routes — Cognito JWT required
    const authRoutes: Array<[HttpMethod, string]> = [
      [HttpMethod.GET, '/user/{slug}/schedule'],
      [HttpMethod.PUT, '/user/{slug}/schedule/{artistId}'],
      [HttpMethod.DELETE, '/user/{slug}/schedule/{artistId}'],
      [HttpMethod.POST, '/{slug}/share'],
      [HttpMethod.DELETE, '/share/{token}'],
    ];

    for (const [method, path] of authRoutes) {
      this.httpApi.addRoutes({ path, methods: [method], integration, authorizer });
    }
  }
}
