import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tinglum-secret-key-change-in-production'
);

export interface SessionData {
  userId: string;
  vippsSub: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
}

export async function createSession(data: SessionData): Promise<string> {
  return new SignJWT(data)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('tinglum_session')?.value;

  if (!token) return null;

  return verifySession(token);
}

export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set('tinglum_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete('tinglum_session');
}
