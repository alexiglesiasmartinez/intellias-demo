import { useEffect, useRef } from 'react';

/**
 * A custom hook for setting up declarative intervals.
 * @param {function} callback - The function to be called.
 * @param {number | null} delay - The delay in milliseconds. Null to pause.
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}