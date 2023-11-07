import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { AmaasGrpcClient } from 'cloudone-vsapi'
import loggerConfig from './loggerConfig.js'

/**
 * Handle environment variables.
 */
const amaasHostName = process.env?.TM_AM_SERVER_ADDR ?? ''
const key = process.env?.TM_AM_AUTH_KEY ?? ''
const regionCode = process.env.AWS_REGION
const creds = {
  credsType: process.env?.TM_AM_AUTH_KEY_TYPE === 'token' ? 'token' : 'apikey',
  secret: key
}
const useKey = false

/**
 * Create a scan client instance using AmaasGrpcClient class.
 * Use AmaasGrpcClient.scanBuffer() to scan the buffer.
 * @async
 * @function runScanBuffer
 * @param {string} bucketName The S3 bucket name.
 * @param {Buffer} buff The buffer to scan.
 * @returns {Promise<void>} Promise object represents the result of the scan.
 */
const runScanBuffer = async (bucketName, buff) => {
  console.log(`\nScan buffer '${bucketName}' started ...`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, creds)

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
 * Retrieve object from S3. Store content of the object in buffer.
 * Return the buffer to be used in runScanBuffer function.
 * @async
 * @function processS3ObjectData
 * @param {string} bucketName - The S3 bucket name.
 * @param {string} key - The S3 object key.
 * @returns {Promise<Buffer>} - Promise object represents the buffer.
 *
 */
const processS3ObjectData = async (bucketName, key) => {
  const chunks = []
  const s3Configuration = {
    region: regionCode
  }
  const client = new S3Client(s3Configuration)
  const command = new GetObjectCommand({
    Key: key,
    Bucket: bucketName
  })
  const response = await client.send(command)
  return await new Promise((resolve, reject) => {
    const stream = response.Body
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.once('end', () => resolve(Buffer.concat(chunks)))
    stream.once('error', () => reject)
  })
}

export const handler = async (event) => {
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
