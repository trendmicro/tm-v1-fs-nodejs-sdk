import type { Readable } from 'stream'
import { S3Event } from 'aws-lambda'
import { S3Client, S3ClientConfig, GetObjectCommand } from '@aws-sdk/client-s3'
import { AmaasGrpcClient, AmaasCredentials } from 'file-security-sdk'
import loggerConfig from './loggerConfig'

/**
 * Handle environment variables.
 */
const amaasHostName = process.env?.TM_AM_SERVER_ADDR ?? ''
const key = process.env?.TM_AM_AUTH_KEY ?? ''
const regionCode = process.env.AWS_REGION
const credent: AmaasCredentials = {
  credentType: process.env?.TM_AM_AUTH_KEY_TYPE === 'token' ? 'token' : 'apikey',
  secret: key
}
const useKey = false

/**
 * runScanBuffer function
 *
 * Create a scan client instance using AmaasGrpcClient class.
 * Use AmaasGrpcClient.scanBuffer() to scan the buffer.
 *
 * @param bucketName - Name to identify the buffer
 * @param buff - Buffer to scan
 */
const runScanBuffer = async (bucketName: string, buff: Buffer): Promise<void> => {
  console.log(`\nScan buffer '${bucketName}' started ...`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, credent)

  loggerConfig(amaasGrpcClient)

  await amaasGrpcClient
    .scanBuffer(bucketName, buff)
    .then(result => {
      console.log(`${JSON.stringify(result)}`)
    })
    .catch(err => {
      throw err
    })
    .finally(() => {
      amaasGrpcClient.close()
    })
}

/**
 * processS3ObjectData function
 *
 * Retrieve object from S3. Store content of the object in buffer.
 * Return the buffer to be used in runScanBuffer function.
 *
 * @param bucketName - S3 bucket name
 * @param key - S3 object key
 */
const processS3ObjectData = async (bucketName: string, key: string): Promise<Buffer> => {
  const chunks: Buffer[] = []
  const s3Configuration: S3ClientConfig = {
    region: regionCode
  }
  const client = new S3Client(s3Configuration)
  const command = new GetObjectCommand({
    Key: key,
    Bucket: bucketName
  })
  const response = await client.send(command)
  return await new Promise<Buffer>((resolve, reject) => {
    const stream = response.Body as Readable
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.once('end', () => resolve(Buffer.concat(chunks)))
    stream.once('error', () => reject)
  })
}

export const handler = async (event: S3Event): Promise<void> => {
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name
    const objectKey = record.s3.object.key
    await processS3ObjectData(bucketName, objectKey).then(
      async buff => {
        await runScanBuffer(`${bucketName}/${objectKey}`, buff)
      },
      err => {
        console.log(err)
        throw err
      }
    )
  }
}
