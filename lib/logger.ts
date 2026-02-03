/**
 * Enhanced logging utility with structured logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  userId?: string;
  orderId?: string;
  action?: string;
  component?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

const isDevelopment = process.env.NODE_ENV === 'development';

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry, null, isDevelopment ? 2 : 0);
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
      code: (error as any).code,
    };
  }

  return entry;
}

export function logError(message: string, errorOrContext?: unknown, context?: LogContext): void {
  // Handle different parameter types
  let error: Error | undefined;
  let ctx: LogContext | undefined = context;
  
  if (errorOrContext instanceof Error) {
    error = errorOrContext;
  } else if (errorOrContext && typeof errorOrContext === 'object' && !context) {
    // If it's an object but not an Error and no context provided, treat as context
    ctx = errorOrContext as LogContext;
  } else if (errorOrContext) {
    // If it's unknown type (from catch blocks), create an Error
    error = new Error(String(errorOrContext));
  }
  
  const entry = createEntry('error', message, ctx, error);
  console.error(formatLog(entry));
}

export function logWarning(message: string, context?: LogContext): void {
  const entry = createEntry('warn', message, context);
  console.warn(formatLog(entry));
}

export function logInfo(message: string, context?: LogContext): void {
  const entry = createEntry('info', message, context);
  console.log(formatLog(entry));
}

export function logDebug(message: string, context?: LogContext): void {
  if (isDevelopment) {
    const entry = createEntry('debug', message, context);
    console.debug(formatLog(entry));
  }
}

/**
 * Log payment related events
 */
export function logPayment(action: string, context: LogContext & { amount?: number }): void {
  logInfo(`Payment: ${action}`, { ...context, category: 'payment' });
}

/**
 * Log order related events
 */
export function logOrder(action: string, context: LogContext): void {
  logInfo(`Order: ${action}`, { ...context, category: 'order' });
}

/**
 * Performance monitoring
 */
export async function measurePerformance<T>(
  fn: () => T | Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logDebug(`Performance: ${label}`, { duration: `${duration}ms` });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logError(`Performance failed: ${label}`, error as Error, { duration: `${duration}ms` });
    throw error;
  }
}
