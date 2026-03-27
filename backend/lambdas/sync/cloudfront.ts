import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

const cf = new CloudFrontClient({});

export async function invalidatePaths(
  distributionId: string,
  paths: string[],
): Promise<void> {
  await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: String(Date.now()),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    }),
  );
}
