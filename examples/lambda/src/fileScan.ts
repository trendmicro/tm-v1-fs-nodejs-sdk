import { APIGatewayProxyResult } from 'aws-lambda'
import { AmaasGrpcClient, AmaasCredentials } from 'cloudone-vsapi'
import loggerConfig from './loggerConfig'

/**
 * Handle environment variables.
 */
const amaasHostName = process.env?.TM_AM_SERVER_ADDR ?? ''
const key = process.env?.TM_AM_AUTH_KEY ?? ''
const credent: AmaasCredentials = {
  credentType: process.env?.TM_AM_AUTH_KEY_TYPE === 'token' ? 'token' : 'apikey',
  secret: key
}
const useKey = false

/**
 * runFileScan function
 *
 * Create a scan client instance using AmaasGrpcClient class.
 * Use AmaasGrpcClient.scanFile() to scan the file.
 *
 * @param fileName - Name of the file to scan
 */
const runFileScan = async (fileName: string): Promise<void> => {
  console.log(`\nScanning '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, credent)

  loggerConfig(amaasGrpcClient)

  await amaasGrpcClient
    .scanFile(fileName)
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

export const handler = async (): Promise<APIGatewayProxyResult> => {
  await runFileScan('index.js')

  return {
    statusCode: 200,
    body: JSON.stringify('AMAAS Node Client SDK Scan Done!')
  }
}
