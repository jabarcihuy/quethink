import { requireSupabase } from "@/lib/supabase/client";
import { AccountError, type Classroom } from "@/features/account/repository";
export type AttendanceState = "present" | "absent" | "excused" | "sick";
export type AttendanceRecord = {
  state: AttendanceState;
  source: "qr" | "manual";
  revision: number;
  updated_at: string;
};
export type AttendanceSession = {
  id: string;
  classId: string;
  title: string;
  startsAt: string;
  expiresAt: string;
  status: "active" | "closed" | "expired";
  record: AttendanceRecord | null;
};
export type AttendanceList = {
  class: Classroom | null;
  items: AttendanceSession[];
  nextCursor: string | null;
};
export type SessionDetail = {
  session: AttendanceSession;
  class: Classroom;
  serverTime: string;
  counts: Record<AttendanceState, number> | null;
};
export type AttendanceStudent = {
  id: string;
  name: string;
  nim: string;
  state: AttendanceState | null;
  revision: number;
  source: "qr" | "manual" | null;
};
export type Roster = {
  items: AttendanceStudent[];
  nextCursor: string | null;
  session: AttendanceSession;
  archived: boolean;
};
export type Audit = {
  id: string;
  old_state: AttendanceState | null;
  new_state: AttendanceState;
  reason: string;
  created_at: string;
};
export type RecordDetail = {
  name: string;
  record: AttendanceRecord | null;
  audit: Audit[];
  nextCursor: string | null;
  archived: boolean;
  session: AttendanceSession;
};
async function call<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await requireSupabase().rpc("mobile_attendance", {
    p_action: action,
    p_payload: payload,
  });
  if (error) throw new AccountError("REQUEST_FAILED");
  if (data?.error) throw new AccountError(String(data.error.code));
  if (!data || !("data" in data)) throw new AccountError("INVALID_RESPONSE");
  return data.data as T;
}
export const attendanceRepository = {
  list: (classId?: string, cursor: string | null = null) =>
    call<AttendanceList>("list", { classId, cursor }),
  session: (sessionId: string) => call<SessionDetail>("session", { sessionId }),
  start: (classId: string, title: string, minutes: number) =>
    call<SessionDetail>("start", { classId, title, minutes }),
  close: (sessionId: string) => call<SessionDetail>("close", { sessionId }),
  qr: (sessionId: string) =>
    call<{ value: string; expiresAt: string; serverTime: string }>("qr", {
      sessionId,
    }),
  scan: (sessionId: string, token: string) =>
    call<{ session: AttendanceSession; alreadyRecorded: boolean }>("scan", {
      sessionId,
      token,
    }),
  roster: (sessionId: string, cursor: string | null = null) =>
    call<Roster>("roster", { sessionId, cursor }),
  record: (
    sessionId: string,
    studentId: string,
    cursor: string | null = null,
  ) => call<RecordDetail>("record", { sessionId, studentId, cursor }),
  correct: (
    sessionId: string,
    studentId: string,
    state: AttendanceState,
    reason: string,
    revision: number,
  ) =>
    call<RecordDetail>("correct", {
      sessionId,
      studentId,
      state,
      reason,
      revision,
    }),
};
