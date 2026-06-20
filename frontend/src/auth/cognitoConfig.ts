// Fill userPoolId and clientId from `cdk deploy` stack outputs after deploying the infra.
export const COGNITO = {
  region: 'eu-central-1',
  userPoolId: 'eu-central-1_Y2KpZFvZ6',
  clientId: '5n6tag1jg8re5695dni9ld4ro',
  domain: 'brutal-assault-app.auth.eu-central-1.amazoncognito.com',
};

export const COGNITO_DISCOVERY = {
  authorizationEndpoint: `https://${COGNITO.domain}/oauth2/authorize`,
  tokenEndpoint: `https://${COGNITO.domain}/oauth2/token`,
  revocationEndpoint: `https://${COGNITO.domain}/oauth2/revoke`,
};
