import { useCallback, useEffect, useRef, useState } from "react";
import { learningRepository, type Attempt } from "./repository";
export function useAnswers(initial: Attempt) {
  const [answers, setAnswers] = useState<Record<string, string>>(
      initial.answers ?? {},
    ),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState<unknown>(null);
  const current = useRef(initial.answers ?? {}),
    revision = useRef(initial.revision),
    version = useRef(0),
    savedVersion = useRef(0),
    flight = useRef<Promise<void> | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    mounted = useRef(true);
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (flight.current) {
      await flight.current;
      if (savedVersion.current === version.current) return;
    }
    const task = async () => {
      if (mounted.current) {
        setSaving(true);
        setError(null);
      }
      try {
        while (savedVersion.current !== version.current) {
          const sending = version.current,
            snapshot = { ...current.current };
          const next = await learningRepository.save(
            initial.id,
            revision.current,
            snapshot,
          );
          revision.current = next.revision;
          savedVersion.current = sending;
          if (mounted.current)
            setDirty(savedVersion.current !== version.current);
        }
      } catch (e) {
        if (mounted.current) setError(e);
        throw e;
      } finally {
        if (mounted.current) setSaving(false);
        flight.current = null;
      }
    };
    flight.current = task();
    return flight.current;
  }, [initial.id]);
  function change(id: string, value: string) {
    current.current = { ...current.current, [id]: value };
    version.current++;
    setAnswers(current.current);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush().catch(() => undefined);
    }, 500);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return { answers, change, flush, saving, dirty, error };
}
