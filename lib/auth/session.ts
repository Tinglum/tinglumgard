import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

function getSecretKey() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }
  return new TextEncoder().encode(jwtSecret);
}

export interface SessionData {
  userId: string;
  vippsSub: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  role?: 'admin' | 'operations' | 'customer';
  [key: string]: unknown;
}

export async function createSession(data: SessionData): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT(data)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifySession(token: string): Promise<SessionData | null> {
  const secretKey = getSecretKey();
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tinglum_session')?.value;

  if (!token) return null;

  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('tinglum_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('tinglum_session');
}
