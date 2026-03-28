# Deployment instructions

## Prerequisites

```bash
cd app/infra
npx cdk bootstrap
```

## Certificate

### via cli

```bash
aws acm request-certificate \
  --domain-name api.ba.janbambas.cz \
  --validation-method DNS \
  --region us-east-1
```
```json
{
    "CertificateArn": "arn:aws:acm:us-east-1:xxxxxxx:certificate/xxxxxxx"
}
```

```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:xxxxxxx:certificate/xxxxxxx \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```
```json
{
    "Name": "_xxxxx_.api.ba.janbambas.cz.",
    "Type": "CNAME",
    "Value": "_xxxx.xxxx.acm-validations.aws."
}
```

...or via console

### Validation

DNS CNAME: _xxxxx.api.ba.janbambas.cz --> _xxxx.xxxx.acm-validations.aws

## Deploy/redeploy

Secrets are stored in `app/infra/cdk.context.json`
- reference to the certificate to deploy with; FIRST DEPLOY W/O IT TO GET THE TARGET CLOUDFRONT DOMAIN

```bash
cd app/infra
npx cdk deploy
# or
npm run deploy
```

Will output CdnUrl - that is where it deployed!

DNS CNAME: api.ba.janbambas.cz --> xxxx.cloudfront.net

