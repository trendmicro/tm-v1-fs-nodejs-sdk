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
  switch (region) {
    case 'us-1':
      return 'antimalware.us-1.cloudone.trendmicro.com:443'
    case 'in-1':
      return 'antimalware.in-1.cloudone.trendmicro.com:443'
    case 'de-1':
      return 'antimalware.de-1.cloudone.trendmicro.com:443'
    case 'sg-1':
      return 'antimalware.sg-1.cloudone.trendmicro.com:443'
    case 'au-1':
      return 'antimalware.au-1.cloudone.trendmicro.com:443'
    case 'jp-1':
      return 'antimalware.jp-1.cloudone.trendmicro.com:443'
    case 'gb-1':
      return 'antimalware.gb-1.cloudone.trendmicro.com:443'
    case 'ca-1':
      return 'antimalware.ca-1.cloudone.trendmicro.com:443'
    default:
      throw new Error(`Invalid region: ${region}`)
  }
}
