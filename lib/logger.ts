/**
 * Server-side logging utility
 * Only logs errors in development or when explicitly needed
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export function logError(context: string, error: unknown): void {
  if (isDevelopment) {
    console.error(`[${context}]`, error);
  }
  // In production, you could send to a logging service like Sentry, LogRocket, etc.
}

export function logWarning(context: string, message: string): void {
  if (isDevelopment) {
    console.warn(`[${context}]`, message);
  }
}

export function logInfo(context: string, message: string): void {
  if (isDevelopment) {
    console.log(`[${context}]`, message);
  }
}
