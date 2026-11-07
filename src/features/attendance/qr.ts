export function parseAttendanceQR(
  value: string,
): { sessionId: string; token: string } | null {
  if (value.length > 160) return null;
  const match =
    /^quethink-attendance:v1:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([0-9a-f]{64})$/.exec(
      value,
    );
  return match ? { sessionId: match[1]!, token: match[2]! } : null;
}
