import { SignJWT, jwtVerify } from 'jose'

type OrderScope = 'orders' | 'eggs' | 'chickens'

interface CreateOrderAccessTokenInput {
  scope: OrderScope
  orderId: string
}

function getSecretKey() {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('Missing required environment variable: JWT_SECRET')
  }
  return new TextEncoder().encode(jwtSecret)
}

export async function createOrderAccessToken(input: CreateOrderAccessTokenInput): Promise<string> {
  return new SignJWT({
    scope: input.scope,
    orderId: input.orderId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(getSecretKey())
}

export async function verifyOrderAccessToken(
  token: string | null,
  expected: CreateOrderAccessTokenInput
): Promise<boolean> {
  if (!token) return false
  const secretKey = getSecretKey()

  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload.scope === expected.scope && payload.orderId === expected.orderId
  } catch {
    return false
  }
}
