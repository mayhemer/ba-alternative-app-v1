import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cdk from 'aws-cdk-lib';

export class Auth extends Construct {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'ba-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Social identity providers — each is activated only when context vars are present.
    // Pass them at deploy time:
    //   cdk deploy --context googleClientId=... --context googleClientSecret=...
    //   cdk deploy --context appleServicesId=... --context appleTeamId=... --context appleKeyId=... --context applePrivateKey=...

    const googleClientId = this.node.tryGetContext('googleClientId') as string | undefined;
    const googleClientSecret = this.node.tryGetContext('googleClientSecret') as string | undefined;
    if (googleClientId && googleClientSecret) {
      new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
        userPool: this.userPool,
        clientId: googleClientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      });
    }

    const appleServicesId = this.node.tryGetContext('appleServicesId') as string | undefined;
    const appleTeamId = this.node.tryGetContext('appleTeamId') as string | undefined;
    const appleKeyId = this.node.tryGetContext('appleKeyId') as string | undefined;
    const applePrivateKey = this.node.tryGetContext('applePrivateKey') as string | undefined;
    if (appleServicesId && appleTeamId && appleKeyId && applePrivateKey) {
      new cognito.UserPoolIdentityProviderApple(this, 'Apple', {
        userPool: this.userPool,
        clientId: appleServicesId,
        teamId: appleTeamId,
        keyId: appleKeyId,
        privateKey: applePrivateKey,
        scopes: ['email', 'name'],
        attributeMapping: {
          email: cognito.ProviderAttribute.APPLE_EMAIL,
        },
      });
    }

    // Hosted UI domain (Cognito-managed subdomain)
    this.userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: 'brutal-assault-app' },
    });

    // App client — public client (no secret), used by mobile + web
    this.userPoolClient = new cognito.UserPoolClient(this, 'AppClient', {
      userPool: this.userPool,
      userPoolClientName: 'ba-app-client',
      authFlows: { userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: [
          'https://ba.janbambas.cz',
          'ba://auth/callback',          // deep link for native mobile
          'http://localhost:8081',
        ],
        logoutUrls: [
          'https://ba.janbambas.cz',
          'http://localhost:8081',
        ],
      },
      generateSecret: false,
    });

    // Identity Pool — enables anonymous (unauthenticated) identities + Cognito federation
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: 'ba_identity_pool',
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });
  }
}
