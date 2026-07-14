import { useEffect, useState } from 'react';

/**
 * Debounces a value by the given delay in milliseconds.
 * Returns the debounced value only after `delay` ms of inactivity.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 400);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
