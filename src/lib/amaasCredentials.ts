type credentTypeString = 'token' | 'apikey'

export interface AmaasCredentials {
  credentType: credentTypeString
  secret: string
}
