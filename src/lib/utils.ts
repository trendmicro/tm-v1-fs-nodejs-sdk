import { maxTagLength, maxTags } from './constants'
import { BinaryToTextEncoding, createHash } from 'crypto'
import { createReadStream } from 'fs'



const AWS_JP_REGION = 'ap-northeast-1'
const AWS_SG_REGION = 'ap-southeast-1'
const AWS_AU_REGION = 'ap-southeast-2'
const AWS_IN_REGION = 'ap-south-1'
const AWS_US_REGION = 'us-east-1'
const AWS_DE_REGION = 'eu-central-1'
// const AWS_CA_REGION = 'ca-central-1'
// const AWS_TREND_REGION = 'us-east-2'
// const AWS_GB_REGION = 'eu-west-2'
const AWS_AE_REGION = 'me-central-1'
const C1_JP_REGION = 'jp-1'
const C1_SG_REGION = 'sg-1'
const C1_AU_REGION = 'au-1'
const C1_IN_REGION = 'in-1'
const C1_US_REGION = 'us-1'
const C1_DE_REGION = 'de-1'
const C1_CA_REGION = 'ca-1'
// const C1_TREND_REGION = 'trend-us-1'
const C1_GB_REGION = 'gb-1'
const C1_AE_REGION = 'ae-1'

/*
const C1Regions = [C1_AU_REGION, C1_CA_REGION, C1_DE_REGION, C1_GB_REGION, C1_IN_REGION, C1_JP_REGION, C1_SG_REGION,
  C1_US_REGION, C1_TREND_REGION]
*/
const V1Regions = [AWS_AU_REGION, AWS_DE_REGION, AWS_JP_REGION, AWS_SG_REGION, AWS_US_REGION, AWS_IN_REGION, AWS_AE_REGION]
const SupportedV1Regions = V1Regions
// const SupportedC1Regions = [C1_AU_REGION, C1_CA_REGION, C1_DE_REGION, C1_GB_REGION, C1_IN_REGION, C1_JP_REGION, C1_SG_REGION, C1_US_REGION]

// const AllRegions = C1Regions.concat(V1Regions)
// const AllValidRegions = SupportedC1Regions.concat(SupportedV1Regions)

const V1ToC1RegionMapping = new Map<string, string>([
  [AWS_AU_REGION, C1_AU_REGION],
  [AWS_DE_REGION, C1_DE_REGION],
  [AWS_IN_REGION, C1_IN_REGION],
  [AWS_JP_REGION, C1_JP_REGION],
  [AWS_SG_REGION, C1_SG_REGION],
  [AWS_US_REGION, C1_US_REGION],
  [AWS_AE_REGION, C1_AE_REGION],
]
)



export const isJWT = (key: string): boolean => {
  try {
    const keySplitted = key.split('.')
    if (keySplitted.length !== 3) { // The JWT should contain three parts
      return false
    }
    const jsonFirstPart = Buffer.from(keySplitted[0], 'base64').toString('ascii')
    const firstPart = JSON.parse(jsonFirstPart) // The first part of JWT should be a JSON
    if (firstPart?.alg === undefined) { // The first part should have the attribute "alg"
      return false
    }
    return true
  } catch (error) {
    return false
  }
}

// Function to return FQDN of the host based on param "region"
export const getFQDN = (region: string): string => {

  const mapping = new Map<string, string>([
    [C1_US_REGION, 'antimalware.us-1.cloudone.trendmicro.com:443'],
    [C1_IN_REGION, 'antimalware.in-1.cloudone.trendmicro.com:443'],
    [C1_DE_REGION, 'antimalware.de-1.cloudone.trendmicro.com:443'],
    [C1_SG_REGION, 'antimalware.sg-1.cloudone.trendmicro.com:443'],
    [C1_AU_REGION, 'antimalware.au-1.cloudone.trendmicro.com:443'],
    [C1_JP_REGION, 'antimalware.jp-1.cloudone.trendmicro.com:443'],
    [C1_GB_REGION, 'antimalware.gb-1.cloudone.trendmicro.com:443'],
    [C1_CA_REGION, 'antimalware.ca-1.cloudone.trendmicro.com:443'],
    [C1_AE_REGION, 'antimalware.ae-1.cloudone.trendmicro.com:443'],
  ]
  )

  if (!SupportedV1Regions.includes(region)) {
    throw new Error(`Invalid region: ${region}, region value should be one of ${SupportedV1Regions}`)
  } else { // map it to C1 region if it is V1 region
    const c1_region = V1ToC1RegionMapping.get(region)
    if (!c1_region) {
      throw new Error(`Invalid region: ${region}, region value should be one of ${SupportedV1Regions}`)
    }
    region = c1_region
  }
  const host = mapping.get(region)
  if (host) {
    return host
  }
  throw new Error(`Invalid region: ${region}`)
}

// Check if the tagsList size is greater than maxTags and each tag size is greater than maxTagLength
export const validateTags = (tags: string[]): boolean => {
  if (tags.length > maxTags) {
    throw new Error(`Tags size ${tags.length} is greater than ${maxTags}: ${tags}`)
  }
  for (const tag of tags) {
    if (tag.length > maxTagLength) {
      throw new Error(`Tag size ${tag.length} is greater than ${maxTagLength}: ${tag}`)
    }
  }
  return true
}

// Function to generate sha256 and sha1 hashes of a Buffer and return the hashes
export function getBufferHashes(buff: Buffer, algorithms: string[], encoding: BinaryToTextEncoding): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const hashes = algorithms.map(algorithm => createHash(algorithm));
    hashes.forEach(hash => hash.update(buff));
    const digests = hashes.map(hash => hash.digest(encoding));
    resolve(digests);
    reject(new Error('Failed to generate hashes'));
  })
}

// Function to generate hashes of a file and return the hashes
export function getHashes(filePath: string, algorithms: string[], encoding: BinaryToTextEncoding): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const hashes = algorithms.map(algorithm => createHash(algorithm));
    const input = createReadStream(filePath);

    input.on('readable', () => {
      const data = input.read();
      if (data) {
        hashes.forEach(hash => hash.write(data));
      }
    });

    input.on('end', () => {
      hashes.forEach(hash => hash.end());
      const digests = hashes.map(hash => hash.read().toString(encoding));
      resolve(digests);
    });

    input.on('error', (err) => {
      reject(err);
    });
  });
}
