import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { ForumPage } from "./repository";

export function usePaged<T extends { id: string }>(
  fetchPage: (offset: number) => Promise<ForumPage<T>>,
) {
  const [items, setItems] = useState<T[]>([]),
    [loading, setLoading] = useState(true),
    [moreLoading, setMoreLoading] = useState(false),
    [hasMore, setHasMore] = useState(false),
    [error, setError] = useState<unknown>(null);
  const active = useRef(false),
    generation = useRef(0),
    next = useRef(0),
    requesting = useRef(false);
  const refresh = useCallback(() => {
    const current = ++generation.current;
    requesting.current = false;
    next.current = 0;
    setItems([]);
    setHasMore(false);
    setLoading(true);
    setMoreLoading(false);
    setError(null);
    fetchPage(0)
      .then((page) => {
        if (active.current && generation.current === current) {
          setItems(page.items);
          next.current = page.offset + page.items.length;
          setHasMore(page.hasMore);
        }
      })
      .catch((e) => {
        if (active.current && generation.current === current) setError(e);
      })
      .finally(() => {
        if (active.current && generation.current === current) setLoading(false);
      });
  }, [fetchPage]);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      refresh();
      return () => {
        active.current = false;
        generation.current++;
      };
    }, [refresh]),
  );
  const more = useCallback(() => {
    if (!active.current || requesting.current || !hasMore || loading) return;
    const current = generation.current,
      offset = next.current;
    requesting.current = true;
    setMoreLoading(true);
    setError(null);
    fetchPage(offset)
      .then((page) => {
        if (active.current && generation.current === current) {
          setItems((previous) => {
            const ids = new Set(previous.map((x) => x.id));
            return [...previous, ...page.items.filter((x) => !ids.has(x.id))];
          });
          next.current = page.offset + page.items.length;
          setHasMore(page.hasMore);
        }
      })
      .catch((e) => {
        if (active.current && generation.current === current) {
          if (
            typeof e === "object" &&
            e &&
            "code" in e &&
            e.code === "OTHER_TEST_ACTIVE"
          ) {
            setItems([]);
            setHasMore(false);
          }
          setError(e);
        }
      })
      .finally(() => {
        if (active.current && generation.current === current) {
          requesting.current = false;
          setMoreLoading(false);
        }
      });
  }, [fetchPage, hasMore, loading]);
  return { items, loading, moreLoading, hasMore, error, refresh, more };
}
