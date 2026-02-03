import { useState, useCallback, useRef } from 'react';

/**
 * Hook to prevent double submissions and race conditions
 * Returns [isProcessing, executeAsync] where executeAsync wraps your async function
 */
export function useAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: {
    onSuccess?: (result: R) => void;
    onError?: (error: Error) => void;
  } = {}
): [boolean, (...args: T) => Promise<R | undefined>] {
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeAsync = useCallback(
    async (...args: T): Promise<R | undefined> => {
      if (isProcessing) {
        console.warn('Action already in progress, ignoring duplicate call');
        return undefined;
      }

      // Abort any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsProcessing(true);

      try {
        const result = await action(...args);
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('Request aborted');
          return undefined;
        }
        options.onError?.(error as Error);
        throw error;
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [action, isProcessing, options]
  );

  return [isProcessing, executeAsync];
}

/**
 * Simple debounce hook
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}
