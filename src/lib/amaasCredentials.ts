enum credentType {
  token,
  apikey,
}

type credentTypeString = keyof typeof credentType

export interface AmaasCredentials {
  credentType: credentTypeString
  secret: string
}
