/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'fs'
import { loadSync } from '@grpc/proto-loader'
import * as path from 'path'
import {
  Server,
  ServerCredentials,
  loadPackageDefinition
} from '@grpc/grpc-js'
import { randomUUID } from 'crypto'

// Mock heartbeatIntervalMs to a short interval for fast tests
jest.mock('../src/lib/constants', () => ({
  ...jest.requireActual('../src/lib/constants'),
  heartbeatIntervalMs: 50
}))

import { AmaasGrpcClient } from '../src/lib/amaasGrpcClient'
import { AmaasScanResultObject } from '../src/lib/amaasScanResultObject'
import { Stage, Command } from '../src/lib/protos/scan'

const jestTimeout: number = 30 * 1000
jest.setTimeout(jestTimeout)

const protoLoaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}
const scanProtoFile = path.resolve('./protos/', 'scan.proto')
const packageDefinition = loadSync(scanProtoFile, protoLoaderOptions)
const scanGrpcObj = loadPackageDefinition(packageDefinition)
const grpcClient = (scanGrpcObj.amaas as any).scan.v1.Scan
const grpcServiceAttrs = grpcClient.service
const serverInsecureCredent = ServerCredentials.createInsecure()

const enableTLS = false
const grpcConnectionTimeout = 30 // seconds
const heartbeatPort = '50052'
const amaasHostName = `localhost:${heartbeatPort}`
const authKey = ''

// Counters for messages received by mock server, reset before each test
const receivedHeartbeats: Array<{ stage: string; timestamp: number }> = []
const receivedDataChunks: Array<{ stage: string; timestamp: number }> = []

const makeScanResult = (): string => JSON.stringify({
  version: '1.0',
  fileName: 'faked-file.txt',
  scanResult: 0,
  scanId: randomUUID(),
  scanTimestamp: new Date().toUTCString(),
  foundMalwares: []
})

/**
 * Mock gRPC scan server that records heartbeat and data messages.
 *
 * Flow:
 *   STAGE_INIT  → reply CMD_RETR (request first chunk)
 *   STAGE_RUN   → reply CMD_RETR until 2 chunks received,
 *                  then wait 200 ms before CMD_QUIT
 *                  (the delay gives heartbeat timer time to fire)
 *   STAGE_HEARTBEAT → record and ignore (same as production server)
 */
const mockScanHandler = (call: any): void => {
  let rsSize = 0
  let chunkCount = 0

  call.on('data', (request: { stage: string; rs_size: number }) => {
    const stage: string = request.stage

    if (stage === 'STAGE_HEARTBEAT') {
      receivedHeartbeats.push({ stage, timestamp: Date.now() })
      return
    }

    if (stage === 'STAGE_INIT') {
      rsSize = request.rs_size

      if (rsSize === 0) {
        call.write({
          cmd: Command.CMD_QUIT,
          stage: Stage.FINI,
          result: makeScanResult()
        })
        call.end()
        return
      }

      call.write({
        cmd: Command.CMD_RETR,
        stage: Stage.RUN,
        bulk_offset: [0],
        bulk_length: [Math.min(rsSize, 1024)],
        length: Math.min(rsSize, 1024)
      })
    } else if (stage === 'STAGE_RUN') {
      receivedDataChunks.push({ stage, timestamp: Date.now() })
      chunkCount++

      if (chunkCount >= 2) {
        // Delay before CMD_QUIT so heartbeat timer has time to fire
        setTimeout(() => {
          call.write({
            cmd: Command.CMD_QUIT,
            stage: Stage.FINI,
            result: makeScanResult()
          })
          call.end()
        }, 200)
      } else {
        const offset = Math.min(chunkCount * 1024, rsSize - 1)
        call.write({
          cmd: Command.CMD_RETR,
          stage: Stage.RUN,
          bulk_offset: [offset],
          bulk_length: [Math.min(1024, rsSize - offset)],
          length: Math.min(1024, rsSize - offset)
        })
      }
    } else {
      call.end()
    }
  })
  call.on('end', () => {
    call.end()
  })
}

const server = new Server({ 'grpc.service_config_disable_resolution': 1 })

beforeAll(done => {
  server.addService(grpcServiceAttrs, { Run: mockScanHandler })
  server.bindAsync(amaasHostName, serverInsecureCredent, (err, port) => {
    if (err != null) {
      console.log(err.message)
      done(err)
      return
    }
    server.start()
    console.log(`Heartbeat test gRPC server listening on ${port}`)
    done()
  })
})

afterAll(() => {
  server.tryShutdown(err => {
    if (err !== undefined) {
      console.log(err.message)
    }
  })
})

beforeEach(() => {
  receivedHeartbeats.length = 0
  receivedDataChunks.length = 0
})

describe('Heartbeat testing', () => {
  it('should send heartbeat messages during scan', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const fileToScan = 'package.json'

    await amaasGrpcClient.scanFile(fileToScan)
    amaasGrpcClient.close()

    // With 50ms interval and 200ms server delay, expect at least 1 heartbeat
    expect(receivedHeartbeats.length).toBeGreaterThanOrEqual(1)
    receivedHeartbeats.forEach(msg => {
      expect(msg.stage).toBe('STAGE_HEARTBEAT')
    })
  })

  it('should stop sending heartbeats after scan completes', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const fileToScan = 'package.json'

    await amaasGrpcClient.scanFile(fileToScan)
    amaasGrpcClient.close()

    const countAtEnd = receivedHeartbeats.length

    // Wait additional time to verify no more heartbeats arrive
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(receivedHeartbeats.length).toBe(countAtEnd)
  })

  it('should send both data and heartbeat messages during scan', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const fileToScan = 'package.json'

    const result = await amaasGrpcClient.scanFile(fileToScan)
    amaasGrpcClient.close()

    // Verify both data and heartbeat messages were received
    expect(receivedDataChunks.length).toBeGreaterThan(0)
    expect(receivedHeartbeats.length).toBeGreaterThan(0)

    // Verify scan completed successfully
    expect(result).toBeDefined()
    expect((result as AmaasScanResultObject).scanResult).toBe(0)
  })
})
