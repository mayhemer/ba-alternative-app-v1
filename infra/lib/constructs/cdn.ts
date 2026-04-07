import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';

export interface CdnProps {
  httpApi: HttpApi;
}

export class Cdn extends Construct {
  readonly distribution: cloudfront.Distribution;
  readonly url: string;

  constructor(scope: Construct, id: string, props: CdnProps) {
    super(scope, id);

    const { httpApi } = props;

    // Extract hostname from the HTTP API URL (https://{id}.execute-api.{region}.amazonaws.com/)
    const apiDomainName = cdk.Fn.select(2, cdk.Fn.split('/', httpApi.url!));
    const apiOrigin = new origins.HttpOrigin(apiDomainName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    // Cache policies
    // Origin is included in the cache key so each browser origin gets its own cached
    // response with the correct Access-Control-Allow-Origin value. CloudFront also
    // automatically forwards headers that are in the cache key to the origin, so
    // API Gateway receives Origin and can echo the right value back.
    const longCache = new cloudfront.CachePolicy(this, 'LongCache', {
      cachePolicyName: 'ba-static-cache',
      comment: '1-hour cache for artists, stages, categories',
      defaultTtl: cdk.Duration.hours(1),
      maxTtl: cdk.Duration.hours(2),
      minTtl: cdk.Duration.seconds(0),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Origin'),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const shortCache = new cloudfront.CachePolicy(this, 'ShortCache', {
      cachePolicyName: 'ba-schedule-cache',
      comment: '5-minute cache for schedule endpoint',
      defaultTtl: cdk.Duration.minutes(5),
      maxTtl: cdk.Duration.minutes(10),
      minTtl: cdk.Duration.seconds(0),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Origin'),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // No-cache policy that forwards Authorization + Origin headers to the origin.
    // CloudFront requires both to be in the CachePolicy (not OriginRequestPolicy)
    // for them to reach API Gateway.
    const authPassThrough = new cloudfront.CachePolicy(this, 'AuthPassThrough', {
      cachePolicyName: 'ba-auth-passthrough',
      comment: 'No cache; forwards Authorization and Origin headers to origin',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization', 'Origin'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    // Optional custom domain — activated when context var is present.
    // Requires an ACM certificate in us-east-1 (CloudFront requirement).
    // Set: cdk deploy --context certificateArn=arn:aws:acm:us-east-1:...
    const certificateArn = this.node.tryGetContext('certificateArn') as string | undefined;
    const domainNames = certificateArn ? ['api.ba.janbambas.cz'] : undefined;
    const certificate = certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'Cert', certificateArn)
      : undefined;

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Brutal Assault Festival App CDN',
      domainNames,
      certificate,
      // Default behavior: pass-through with Authorization forwarded (covers /user/*, /share POST/DELETE)
      defaultBehavior: {
        origin: apiOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: authPassThrough,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      // Slug-prefixed public endpoints — cached per path (slug is part of the URL, so editions
      // are naturally cache-isolated). Wildcard patterns match any slug.
      additionalBehaviors: {
        '/*/artists': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: longCache,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
        '/*/categories': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: longCache,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
        '/*/stages': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: longCache,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
        '/*/schedule': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: shortCache,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
      },
    });

    this.url = certificateArn
      ? 'https://api.ba.janbambas.cz'
      : `https://${this.distribution.distributionDomainName}`;
  }
}
