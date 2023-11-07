import { APIGatewayProxyResult } from 'aws-lambda'
import { readFileSync } from 'fs'
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
 * runBufferScan function
 *
 * Create a scan client instance using AmaasGrpcClient class. Store the
 * content of a file in buffer and use AmaasGrpcClient.scanBuffer() to
 * scan it.
 *
 * @param fileName - Name of the file to scan
 */
const runBufferScan = async (fileName: string): Promise<void> => {
  console.log(`\nScanning buffer '${fileName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, credent)

  loggerConfig(amaasGrpcClient)

  const buff = readFileSync(fileName)
  await amaasGrpcClient
    .scanBuffer(fileName, buff)
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
  await runBufferScan('index.js')

  return {
    statusCode: 200,
    body: JSON.stringify('AMAAS Node Client SDK Scan Done!')
  }
}
