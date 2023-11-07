import { sign, SignOptions } from 'jsonwebtoken'
import { generateKeyPairSync } from 'crypto'

enum tokenTypes {
  valid,
  invalid,
  'invalid-format',
  'not-json',
}

type tokenTypeString = keyof typeof tokenTypes

export const generateJwtToken = (kind: tokenTypeString | undefined = 'valid'): string => {
  const payload = {
    aud: 'us-1.cloudone.trendmicro.com',
    iss: 'accounts.us-1.cloudone.trendmicro.com',
    cloudOne: {
      principal: {
        account: '012345678901',
        role: 'urn:cloudone:identity:us-1:012345678901:role/full-access',
        type: 'user',
        urn: 'urn:cloudone:identity:us-1:012345678901:user/TBD',
        mfa: true,
        e: 'trendmicro@example.com'
      }
    },
    locale: 'en'
  }

  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096, // The size of the key modulus in bits
    publicKeyEncoding: {
      type: 'pkcs1', // The type of key to generate, in this case RSA with PKCS#1 padding
      format: 'pem' // The output format, in this case PEM-encoded text
    },
    privateKeyEncoding: {
      type: 'pkcs1', // The type of key to generate, in this case RSA with PKCS#1 padding
      format: 'pem' // The output format, in this case PEM-encoded text
    }
  })

  const signInOptions: SignOptions = {
    algorithm: 'RS256',
    expiresIn: '1h'
  }

  const signature = sign(payload, privateKey, signInOptions)
  const keySplitted = signature.split('.')

  switch (kind) {
    case 'invalid':
      keySplitted[0] = 'ewogICJrZXkiOiAiYW55dGhpbmciLAogICJ2YWx1ZSI6ICJhbnl0aGluZyIKfQ=='
      return keySplitted.join('.')
    case 'invalid-format':
      return keySplitted[0] + '.' + keySplitted[1]
    case 'not-json':
      keySplitted[0] = 'not-json'
      return keySplitted.join('.')
    default:
      return signature
  }
}
