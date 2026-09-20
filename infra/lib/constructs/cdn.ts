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
      // Required for CloudFront to compress at all: `compress` on the behaviour
      // (true by default) only takes effect when the cache policy also opts in.
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
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
      // Required for CloudFront to compress at all: `compress` on the behaviour
      // (true by default) only takes effect when the cache policy also opts in.
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // The sync watermark is polled by every running app on a timer, so it is by
    // far the most-requested path. A short TTL collapses the whole fleet onto one
    // origin request per slug per window while still surfacing a rebuild promptly.
    const validityCache = new cloudfront.CachePolicy(this, 'ValidityCache', {
      cachePolicyName: 'ba-validity-cache',
      comment: '30-second cache for the sync watermark endpoint',
      defaultTtl: cdk.Duration.seconds(30),
      maxTtl: cdk.Duration.seconds(60),
      minTtl: cdk.Duration.seconds(0),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Origin'),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      // Required for CloudFront to compress at all: `compress` on the behaviour
      // (true by default) only takes effect when the cache policy also opts in.
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // For authenticated routes: no caching + forward every viewer header to the
    // origin so API Gateway receives Origin, Authorization, and the CORS preflight
    // headers (Access-Control-Request-Method / -Headers) unmodified.
    // Using the managed CACHING_DISABLED policy avoids allowList conflicts with
    // ALL_VIEWER_EXCEPT_HOST_HEADER (which implicitly covers Origin and Authorization).
    const noCache = cloudfront.CachePolicy.CACHING_DISABLED;
    const allViewerHeaders = cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER;

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
      // Default behavior: covers /share/* and any unmatched authenticated routes.
      defaultBehavior: {
        origin: apiOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: noCache,
        originRequestPolicy: allViewerHeaders,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      // Slug-prefixed public endpoints — cached per path (slug is part of the URL, so editions
      // are naturally cache-isolated). Wildcard patterns match any slug.
      additionalBehaviors: {
        // Explicit behavior for all user routes — must come before /*/schedule
        // so that /user/*/schedule is not accidentally captured by the cached
        // public-schedule behavior (CloudFront's * wildcard matches slashes).
        '/user/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: noCache,
          originRequestPolicy: allViewerHeaders,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },
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
        '/*/validity': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: validityCache,
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
