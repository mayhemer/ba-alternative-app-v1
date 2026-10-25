# BA Backend

AWS Lambda functions and shared types for the Brutal Assault festival app.

## Structure

```
backend/
├── lambdas/
│   ├── sync/           # EventBridge-scheduled sync job (polls official API → DynamoDB)
│   │   ├── handler.ts        # Entry point
│   │   ├── official-api.ts   # Official best4fest API client
│   │   ├── normalize.ts      # API response → DynamoDB item transforms
│   │   ├── db.ts             # DynamoDB batch helpers (put / delete / query)
│   │   └── cloudfront.ts     # CloudFront invalidation
│   └── api/            # HTTP API handler (API Gateway → Lambda)
│       └── handler.ts
├── shared/
│   └── types.ts        # DynamoDB item type definitions shared across lambdas
└── tests/
    └── fixtures/
        ├── ba2025/     # Real API snapshots for ba2025 (artists, schedule, changes)
        └── ba2024/     # Real API snapshots for ba2024
```

## Additional notes

[authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
[local lambda dev](https://docs.aws.amazon.com/lambda/latest/dg/foundation-iac-local-development.html)
