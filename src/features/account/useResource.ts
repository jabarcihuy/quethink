import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<unknown>(null);
  const focused = useRef(false),
    request = useRef(0);
  const refresh = useCallback(() => {
    const version = ++request.current;
    setLoading(true);
    setError(null);
    load()
      .then((next) => {
        if (focused.current && request.current === version) setData(next);
      })
      .catch((failure) => {
        if (focused.current && request.current === version) setError(failure);
      })
      .finally(() => {
        if (focused.current && request.current === version) setLoading(false);
      });
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      refresh();
      return () => {
        focused.current = false;
      };
    }, [refresh]),
  );
  return { data, setData, loading, error, refresh };
}
