import { APIGatewayProxyResult } from 'aws-lambda'
import { readdirSync } from 'fs'
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
 * runConcurrentFileScan function
 *
 * Create a scan client instance using AmaasGrpcClient class.
 * Run AmaasGrpcClient.scanFile() concurrently to scan files
 * under a directory.
 *
 * @param directoryName - Directory to scan
 */
const runConcurrentFileScan = async (directoryName: string): Promise<void> => {
  console.log(`\nScanning '${directoryName}'`)
  const amaasGrpcClient = useKey
    ? new AmaasGrpcClient(amaasHostName, key)
    : new AmaasGrpcClient(amaasHostName, credent)

  loggerConfig(amaasGrpcClient)

  if (directoryName.charAt(directoryName.length - 1) !== '/') {
    directoryName += '/'
  }
  const filesToScan = readdirSync(directoryName, { withFileTypes: true })
    .filter(item => !item.isDirectory())
    .map(item => `${directoryName}${item.name}`)
  const actions = filesToScan.map(async fileName => {
    return await amaasGrpcClient.scanFile(fileName)
  })
  await Promise.all(actions)
    .then(results => {
      results.forEach(result => {
        console.log(JSON.stringify(result))
      })
    })
    .catch(reason => {
      throw reason
    })
    .finally(() => {
      amaasGrpcClient.close()
    })
}

export const handler = async (): Promise<APIGatewayProxyResult> => {
  await runConcurrentFileScan('./')

  return {
    statusCode: 200,
    body: JSON.stringify('AMAAS Node Client SDK Scan Done!')
  }
}
