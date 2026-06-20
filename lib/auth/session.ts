import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/constants/app';

// Memoised so TextEncoder is not re-instantiated on every request.
let _secretKey: Uint8Array | null = null;
function getSecretKey(): Uint8Array {
  if (_secretKey) return _secretKey;
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('Missing required environment variable: JWT_SECRET');
  _secretKey = new TextEncoder().encode(jwtSecret);
  return _secretKey;
}

export interface SessionData {
  userId: string;
  vippsSub: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  role?: 'admin' | 'operations' | 'customer' | 'director';
  /** BNIMSP-scoped editor rights (does NOT grant farm-wide admin access). */
  bnimspAdmin?: boolean;
  isImpersonating?: boolean;
  impersonatorId?: string;
  impersonatorEmail?: string;
  impersonatorName?: string;
}

interface CreateSessionOptions {
  expiresIn?: string | number;
}

export async function createSession(data: SessionData, options?: CreateSessionOptions): Promise<string> {
  return new SignJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn ?? '7d')
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
