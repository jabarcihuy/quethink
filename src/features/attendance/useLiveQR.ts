import { useCallback, useState, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { attendanceRepository, type SessionDetail } from "./repository";
// Fresh server lifetime is projected onto monotonic time, never the phone's clock.
export function useLiveQR(
  id: string,
  enabled: boolean,
  onSession: (v: SessionDetail) => void,
) {
  const [code, setCode] = useState<{ value: string; deadline: number } | null>(
      null,
    ),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState<unknown>(null),
    [version, setVersion] = useState(0);
  const deadline = useRef(0);
  useFocusEffect(
    useCallback(() => {
      void version;
      if (!enabled) {
        setCode(null);
        return;
      }
      let alive = true,
        inFlight = false,
        generation = 0;
      async function update() {
        if (inFlight || AppState.currentState !== "active") return;
        inFlight = true;
        const current = generation;
        const began = performance.now();
        try {
          const detail = await attendanceRepository.session(id);
          if (!alive || generation !== current) return;
          onSession(detail);
          if (
            detail.class.status !== "active" ||
            detail.session.status !== "active"
          ) {
            setCode(null);
            return;
          }
          const qr = await attendanceRepository.qr(id);
          if (alive && generation === current) {
            const remaining = Math.max(
              0,
              Date.parse(qr.expiresAt) -
                Date.parse(qr.serverTime) -
                (performance.now() - began),
            );
            deadline.current = performance.now() + remaining;
            setCode({
              value: qr.value,
              deadline: performance.now() + remaining,
            });
            setSeconds(Math.ceil(remaining / 1000));
            setError(null);
          }
        } catch (e) {
          if (alive && generation === current) {
            setError(e);
            setCode(null);
          }
        } finally {
          inFlight = false;
        }
      }
      void update();
      const poll = setInterval(() => void update(), 20000),
        tick = setInterval(
          () =>
            setSeconds(
              Math.max(
                0,
                Math.ceil((deadline.current - performance.now()) / 1000),
              ),
            ),
          1000,
        );
      const sub = AppState.addEventListener("change", (state) => {
        generation++;
        deadline.current = 0;
        setCode(null);
        setSeconds(0);
        if (state === "active") void update();
      });
      return () => {
        alive = false;
        generation++;
        clearInterval(poll);
        clearInterval(tick);
        sub.remove();
        setCode(null);
      };
    }, [id, enabled, version, onSession]),
  );
  return {
    value: seconds > 0 ? code?.value : null,
    seconds,
    error,
    refresh: () => setVersion((v) => v + 1),
  };
}
