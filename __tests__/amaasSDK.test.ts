/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, statSync } from 'fs'
import { loadSync } from '@grpc/proto-loader'
import * as path from 'path'
import {
  Server,
  ServerCredentials,
  loadPackageDefinition
} from '@grpc/grpc-js'
import { randomUUID } from 'crypto'

import { AmaasGrpcClient } from '../src/lib/amaasGrpcClient'
import { AmaasScanResultObject } from '../src/lib/amaasScanResultObject'
import { AmaasCredentials } from '../src/lib/amaasCredentials'
import { Logger, LogLevel } from '../src/lib/logger'
import * as scanPb from '../src/lib/protos/scan_pb'
import { isJWT, validateTags, getHashes, getBufferHashes } from '../src/lib/utils'
import { readFile } from './utils/fileUtils'
import { generateJwtToken } from './utils/jwtTokens'
import { maxTagLength, maxTags } from '../src/lib/constants'

const jestTimeout: number = 5 * 60 * 1000 // ms
jest.setTimeout(jestTimeout)
const protoLoaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}
const scanProtoFile = path.resolve('./protos/', 'scan.proto')
const packageDefinition = loadSync(
  scanProtoFile,
  protoLoaderOptions
)
const scanGrpcObj = loadPackageDefinition(packageDefinition)
const grpcClient = (scanGrpcObj.amaas as any).scan.v1.Scan
const grpcServiceAttrs = grpcClient.service
const serverInsecureCredent = ServerCredentials.createInsecure()

// Services implementation
const runImpl = (call: any): void => {
  // Random generated maximum number of runs in between 2 and 5
  const maxRuns = Math.floor(Math.random() * 4 + 1)
  let counts = 0
  let rsSize = 0
  const cmdQuitS2CMessage = {
    cmd: scanPb.Command.CMD_QUIT,
    stage: scanPb.Stage.STAGE_FINI,
    result: JSON.stringify({
      version: '1.0',
      fileName: 'faked-file.txt',
      scanResult: 0,
      scanId: randomUUID(),
      scanTimestamp: new Date().toUTCString(),
      foundMalwares: []
    })
  }
  call.on('data', (request: { stage: string; rs_size: number; tags?: string[] }) => {
    const stage: string = request.stage
    if (stage === 'STAGE_INIT') {
      if (request.tags) {
        const tags = request.tags
        if (!tags.every(tag => ['tag1', 'tag2', 'tag3'].includes(tag))) {
          const resultJson = JSON.parse(cmdQuitS2CMessage.result)
          resultJson.scanResult = -1
          cmdQuitS2CMessage.result = JSON.stringify(resultJson)
          call.write(cmdQuitS2CMessage)
          call.end()
        }
      }

      rsSize = request.rs_size

      // Returns CMD_QUIT if request's rs_size is zero
      if (rsSize === 0) {
        call.write(cmdQuitS2CMessage)
        call.end()
      } else {
        // Random generated length in between 1 and rs_size
        const length = Math.ceil(Math.random() * rsSize)
        call.write({ cmd: scanPb.Command.CMD_RETR, stage: scanPb.Stage.STAGE_RUN, length })
      }
    } else if (stage === 'STAGE_RUN') {
      // Send CMD_QUIT if maximum number of runs is reached
      if (counts >= maxRuns) {
        call.write(cmdQuitS2CMessage)
        call.end()
      } else {
        counts += 1
        const length = Math.ceil(Math.random() * rsSize)
        call.write({ cmd: scanPb.Command.CMD_RETR, stage: scanPb.Stage.STAGE_RUN, length })
      }
    } else {
      // other stages
      call.end()
    }
  })
  call.on('end', () => {
    call.end()
  })
}
const scanImpls = {
  Run: runImpl
}

// Mock server does not use TLS protocol. Set enableTLS to false.
const enableTLS = false
const grpcConnectionTimeout = 3 * 60 // seconds
const amaasHostName = 'localhost:50051'
const authKey = ''
const credent: AmaasCredentials = {
  credentType: 'apikey',
  secret: authKey
}
const filesToScan = ['package-lock.json', 'jest.config.ts', './protos/scan.proto']

// Disable NodeJS gRPC DNS resolution when localhost is used to fix process doesn't exit immediately issue
const server = new Server({ 'grpc.service_config_disable_resolution': 1 })

beforeAll(done => {
  server.addService(grpcServiceAttrs, scanImpls)
  server.bindAsync(amaasHostName, serverInsecureCredent, (err, port) => {
    if (err != null) {
      console.log(err.message)
      done(err)
      return
    }
    server.start()
    console.log(`gRPC listening on ${port}`)
    done()
  })
})

afterAll(() => {
  console.log('Server shutdown')
  server.tryShutdown(err => {
    if (err !== undefined) {
      console.log(err.message)
    }
  })
})

describe('AmaasGrpcClient class constructor testing', () => {
  it('should initiate class successfully with key', () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey)
    expect(amaasGrpcClient).toBeDefined()
    amaasGrpcClient.close()
  })

  it('should initiate class successfully with key and non-default params', () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    expect(amaasGrpcClient).toBeDefined()
    amaasGrpcClient.close()
  })

  it('should initiate class successfully with credential object', () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, credent)
    expect(amaasGrpcClient).toBeDefined()
    amaasGrpcClient.close()
  })

  it('should initiate class successfully with credential object and non-default params', () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, credent, grpcConnectionTimeout, enableTLS)
    expect(amaasGrpcClient).toBeDefined()
    amaasGrpcClient.close()
  })

  it('should initiate class successfully with region', () => {
    const amaasGrpcClient = new AmaasGrpcClient("us-east-1", authKey)
    expect(amaasGrpcClient).toBeDefined()
    amaasGrpcClient.close()
  })
})

describe('AmaasGrpcClient scanFile function testing', () => {
  it('should scan file successfully', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    await expect(amaasGrpcClient.scanFile(filesToScan[0])).resolves.toBeDefined()
    amaasGrpcClient.close()
  })

  it('should successfully scan file sequentially', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const filesArray = filesToScan.slice(1)
    const results: AmaasScanResultObject[] = []
    const lastResult = await filesArray.reduce(
      async (promised, current) => {
        await promised.then(result => {
          results.push(result)
        })
        return await amaasGrpcClient.scanFile(current)
      },
      amaasGrpcClient.scanFile(filesToScan[0])
    )
    amaasGrpcClient.close()
    results.push(lastResult)
    expect(results.length).toEqual(filesToScan.length)
    results.forEach(result => {
      expect(result).toBeDefined()
    })
  })

  it('should successfully scan file concurrently', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const actions = filesToScan.map(async file => {
      return await amaasGrpcClient.scanFile(file)
    })
    await Promise.all(actions)
      .then(results => {
        results.forEach(result => {
          expect(result).toBeDefined()
        })
      })
    amaasGrpcClient.close()
  })

  it('should scan file with tags successfully', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const tags = ['tag1', 'tag2', 'tag3']
    await amaasGrpcClient.scanFile(filesToScan[0], tags)
      .then(result => {
        expect(result.scanResult).not.toEqual(-1)
      })
    amaasGrpcClient.close()
  })
})

describe('AmaasGrpcClient scanBuffer function testing', () => {
  it('should scan buffer successfully', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const buff = readFileSync(filesToScan[0])
    await expect(amaasGrpcClient.scanBuffer(filesToScan[0], buff)).resolves.toBeDefined()
    amaasGrpcClient.close()
  })

  it('should successfully scan buffer sequentially', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const fileArray = filesToScan.slice(1)
    const results: AmaasScanResultObject[] = []
    const lastResult = await fileArray.reduce(
      async (promised, current) => {
        await promised.then(result => {
          results.push(result)
        })
        const buff = readFileSync(current)
        return await amaasGrpcClient.scanBuffer(current, buff)
      },
      amaasGrpcClient.scanBuffer(filesToScan[0], readFileSync(filesToScan[0]))
    )
    amaasGrpcClient.close()
    results.push(lastResult)
    expect(results.length).toEqual(filesToScan.length)
    results.forEach(result => {
      expect(result).toBeDefined()
    })
  })

  it('should successfully scan buffer concurrently', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const buffArray = filesToScan.map(file => {
      return { name: file, buff: readFileSync(file) }
    })
    const actions = buffArray.map(async buffObj => {
      return await amaasGrpcClient.scanBuffer(buffObj.name, buffObj.buff)
    })
    await Promise.all(actions)
      .then(results => {
        results.forEach(result => {
          expect(result).toBeDefined()
        })
      })
  })

  it('should scan buffer with tags successfully', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const buff = readFileSync(filesToScan[0])
    const tags = ['tag1', 'tag2', 'tag3']
    await amaasGrpcClient.scanBuffer(filesToScan[0], buff, tags)
      .then(result => {
        expect(result.scanResult).not.toEqual(-1)
      })
    amaasGrpcClient.close()
  })
})

describe('error testing', () => {
  it('should return an error if amaasHostName is not set', () => {
    const amaasHostName = ''
    const error = new Error('Failed to create scan client. Could not parse target name ""')
    expect(() => {
      const amaasScanClient = new AmaasGrpcClient(amaasHostName, authKey)
      expect(amaasScanClient).toBeUndefined()
    }).toThrowError(error)
  })
  it('should return an error if invalid region', () => {
    const region = 'us1'
    const error = new Error(`Invalid region: ${region}, region value should be one of ap-southeast-2,eu-central-1,ap-northeast-1,ap-southeast-1,us-east-1`)
    expect(() => {
      const amaasScanClient = new AmaasGrpcClient(region, authKey)
      expect(amaasScanClient).toBeUndefined()
    }).toThrowError(error)
  })

  it('should return an error when incorrect TLS protocol is used', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey)
    expect(amaasGrpcClient).toBeDefined()
    await expect(async () => {
      await amaasGrpcClient.scanFile(filesToScan[0])
    }).rejects.toThrow('Service is not reachable. No connection established')
    amaasGrpcClient.close()
  })

  it('should return an error when deadline exceeded', async () => {
    const deadline = 0
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, deadline)
    expect(amaasGrpcClient).toBeDefined()
    const error = new Error('The request deadline was exceeded. Deadline exceeded')
    await expect(async () => {
      await amaasGrpcClient.scanFile(filesToScan[0])
    }).rejects.toEqual(error)
    amaasGrpcClient.close()
  })

  it('should return an error with non-exist file', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey)
    expect(amaasGrpcClient).toBeDefined()
    const fileName = 'a-file-that-does-not-exist.txt'
    const error = new Error(`Failed to open file. ENOENT: no such file or directory, stat '${fileName}'`)
    await expect(async () => {
      await amaasGrpcClient.scanFile(fileName)
    }).rejects.toEqual(error)
    amaasGrpcClient.close()
  })

  it('should return scanResult equals to -1 for invalid tags', async () => {
    const amaasGrpcClient = new AmaasGrpcClient(amaasHostName, authKey, grpcConnectionTimeout, enableTLS)
    const tags = ['tag1', 'tag2', 'tag4']
    await amaasGrpcClient.scanFile(filesToScan[0], tags)
      .then(result => {
        expect(result.scanResult).toEqual(-1)
      })
    amaasGrpcClient.close()
  })
})

describe('isJWT function testing', () => {
  it('isJWT should return false for key not in correct JWT format', async () => {
    const key = generateJwtToken('invalid-format')
    const isJwt = isJWT(key)
    expect(isJwt).toBe(false)
  })

  it('isJWT should return true for key in correct C1 JWT token format', async () => {
    const key = generateJwtToken()
    const isJwt = isJWT(key)
    expect(isJwt).toBe(true)
  })

  it('isJWT should return false if the first part of key is not a JSON', async () => {
    const key = generateJwtToken('not-json')
    const isJwt = isJWT(key)
    expect(isJwt).toBe(false)
  })

  it('isJWT should return false if the first part of key is a JSON but does not have attribute alg', async () => {
    const key = generateJwtToken('invalid')
    const isJwt = isJWT(key)
    expect(isJwt).toBe(false)
  })
})

describe('Utils testing', () => {
  it('validateTags should return true if tags list does not exceed maxTagsSize', async () => {
    const tags = ['tag1', 'tag2', 'tag3']
    const isValid = validateTags(tags)
    expect(isValid).toBe(true)
  })
  it('validateTags should return Error if tags list exceeds maxTagsSize', async () => {
    const tags = (() => {
      const tags = [] as string[]
      for (let i = 0; i < maxTags + 1; i++) {
        tags.push(`tag${i}`)
      }
      return tags
    })()
    const error = new Error(`Tags size ${tags.length} is greater than ${maxTags}: ${tags}`)
    expect(() => {
      validateTags(tags)
    }).toThrowError(error)
  })
  it('getHashes should return sha256 and sha1 correctly', async () => {
    await expect(getHashes(filesToScan[0], ['sha256', 'sha1'], 'hex'))
      .resolves.toEqual(['fac1f07d0f56ad98456215730ed764121f7b2e7ea8e752dfb4f309952067982f', '749582c02eef6b4365f26e5b708b62270a0fada5'])
  })
  it('getBufferHashes should return sha256 and sha1 correctly', async () => {
    const buff = readFile(filesToScan[0], statSync(filesToScan[0]).size)
    await expect(getBufferHashes(buff, ['sha256', 'sha1'], 'hex'))
      .resolves.toEqual(['fac1f07d0f56ad98456215730ed764121f7b2e7ea8e752dfb4f309952067982f', '749582c02eef6b4365f26e5b708b62270a0fada5'])
  })
  it('validateTags should return true if each tag size does not exceed maxTagLength', async () => {
    const tags = ['tag1', 'tag2', 'tag3']
    const isValid = validateTags(tags)
    expect(isValid).toBe(true)
  })
  it('validateTags should return Error if each tag size exceeds maxTagLength', async () => {
    const tags0 = (() => {
      const tag = 'a'.repeat(maxTagLength + 1)
      return tag
    })()
    const tags = [tags0]
    const error = new Error(`Tag size ${tags[0].length} is greater than ${maxTagLength}: ${tags[0]}`)
    expect(() => {
      validateTags(tags)
    }).toThrowError(error)
  })
})
describe('Logger class testing', () => {
  const OLD_ENV = process.env
  let logSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    delete process.env.TM_AM_LOG_LEVEL
    logSpy = jest.spyOn(global.console, 'log')
  })

  afterEach(() => {
    process.env = OLD_ENV
    logSpy.mockRestore()
  })

  const logCallback = (level: LogLevel, message: string): void => {
    console.log(`logCallback, ${level}, ${message}`)
  }

  it('should return Logger instance', async () => {
    const logger = new Logger()
    expect(logger).toBeDefined()
    expect(logger.getLogLevel()).toEqual(LogLevel.OFF)
  })

  it('log level should be FATAL', async () => {
    process.env.TM_AM_LOG_LEVEL = 'FATAL'
    const logger = new Logger()
    expect(logger.getLogLevel()).toEqual(LogLevel.FATAL)
    logger.fatal('FATAL message')
    expect(logSpy).toHaveBeenCalledWith('[FATAL] FATAL message')
  })

  it('log level should be ERROR', async () => {
    process.env.TM_AM_LOG_LEVEL = 'ERROR'
    const logger = new Logger()
    expect(logger.getLogLevel()).toEqual(LogLevel.ERROR)
    logger.error('ERROR message')
    expect(logSpy).toHaveBeenCalledWith('[ERROR] ERROR message')
  })

  it('log level should be WARN', async () => {
    process.env.TM_AM_LOG_LEVEL = 'WARN'
    const logger = new Logger()
    expect(logger.getLogLevel()).toEqual(LogLevel.WARN)
    logger.warn('WARN message')
    expect(logSpy).toHaveBeenCalledWith('[WARN] WARN message')
  })

  it('log level should be INFO', async () => {
    process.env.TM_AM_LOG_LEVEL = 'INFO'
    const logger = new Logger()
    expect(logger.getLogLevel()).toEqual(LogLevel.INFO)
    logger.info('INFO message')
    expect(logSpy).toHaveBeenCalledWith('[INFO] INFO message')
  })

  it('log level should be INFO without env', async () => {
    const logger = new Logger()
    logger.setLoggingLevel(LogLevel.INFO)
    expect(logger.getLogLevel()).toEqual(LogLevel.INFO)
    logger.info('INFO message')
    expect(logSpy).toHaveBeenCalledWith('[INFO] INFO message')
  })

  it('log level should be DEBUG', async () => {
    process.env.TM_AM_LOG_LEVEL = 'DEBUG'
    const logger = new Logger()
    expect(logger.getLogLevel()).toEqual(LogLevel.DEBUG)
    logger.debug('DEBUG message')
    expect(logSpy).toHaveBeenCalledWith('[DEBUG] DEBUG message')
  })

  it('use callback FATAL level', async () => {
    const logger = new Logger()
    logger.setLoggingLevel(LogLevel.FATAL)
    logger.configLoggingCallback(logCallback)
    expect(logger.getLogLevel()).toEqual(LogLevel.FATAL)
    logger.fatal('FATAL message')
    expect(logSpy).toHaveBeenCalledWith('logCallback, 1, FATAL message')
  })

  it('use callback ERROR level', async () => {
    const logger = new Logger()
    logger.setLoggingLevel(LogLevel.ERROR)
    logger.configLoggingCallback(logCallback)
    expect(logger.getLogLevel()).toEqual(LogLevel.ERROR)
    logger.error('ERROR message')
    expect(logSpy).toHaveBeenCalledWith('logCallback, 2, ERROR message')
  })

  it('use callback WARN level', async () => {
    const logger = new Logger()
    logger.setLoggingLevel(LogLevel.WARN)
    logger.configLoggingCallback(logCallback)
    expect(logger.getLogLevel()).toEqual(LogLevel.WARN)
    logger.warn('WARN message')
    expect(logSpy).toHaveBeenCalledWith('logCallback, 3, WARN message')
  })

  it('use callback INFO level', async () => {
    const logger = new Logger()
    logger.setLoggingLevel(LogLevel.INFO)
    logger.configLoggingCallback(logCallback)
    expect(logger.getLogLevel()).toEqual(LogLevel.INFO)
    logger.info('INFO message')
    expect(logSpy).toHaveBeenCalledWith('logCallback, 4, INFO message')
  })

  it('use callback DEBUG level', async () => {
    const logger = new Logger()
    logger.setLoggingLevel(LogLevel.DEBUG)
    logger.configLoggingCallback(logCallback)
    expect(logger.getLogLevel()).toEqual(LogLevel.DEBUG)
    logger.debug('DEBUG message')
    expect(logSpy).toHaveBeenCalledWith('logCallback, 5, DEBUG message')
  })
})
