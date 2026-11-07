import { requireSupabase } from "@/lib/supabase/client";
import {
  AccountError,
  parseClassroom,
  type Classroom,
} from "@/features/account/repository";
export type Question = {
  id: string;
  kind: "choice" | "sql";
  prompt: string;
  options?: { id: string; text: string }[];
};
export type TestKind = "PRETEST" | "POSTTEST";
export type BankQuestion = Question & {
  correct?: string;
  reference?: string;
  explanation: string;
};
export type QuestionBank = {
  kind: TestKind;
  questions: BankQuestion[];
  minutes: number;
  revision: number;
  locked: boolean;
};
export type LabResult = {
  names: string[];
  rows: (string | number | null)[][];
  passed: boolean;
  error?: string;
};
export type Attempt = {
  kind: TestKind;
  id: string;
  classId: string;
  status: "active" | "grading" | "completed";
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  completedAt: string | null;
  score: number | null;
  revision: number;
  serverTime?: string;
  questions?: Question[];
  answers?: Record<string, string>;
};
export type LearningStatus = {
  class: Classroom;
  attempt: Attempt | null;
  posttest: Attempt | null;
  posttestAvailable: boolean;
  posttestMinutes: number;
  postQuestionCount: number;
  materialCount: number;
  completedCount: number;
  pretestMinutes: number;
  questionCount: number;
  serverTime: string;
};
export type MaterialRow = {
  id: string;
  title: string;
  position: number;
  requiresLab: boolean;
  completed: boolean;
  available: boolean;
};
export type Attachment = { type: "pdf" | "video"; title: string; url: string };
export type Material = MaterialRow & {
  classId: string;
  body: string;
  attachments: Attachment[];
  archived: boolean;
  labKind?: "filter" | "update";
};
export type Feedback = Question & {
  answer: string | null;
  correctAnswer: string;
  explanation: string;
  correct: boolean;
};
export type Result = Attempt & { feedback: Feedback[] };
export type StudentResult = Attempt & { studentName: string; nim: string };
async function call<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await requireSupabase().rpc("mobile_learning", {
    p_action: action,
    p_payload: payload,
  });
  if (error) throw new AccountError("REQUEST_FAILED");
  if (!data || typeof data !== "object")
    throw new AccountError("INVALID_RESPONSE");
  if (data.error) throw new AccountError(String(data.error.code));
  if (!("data" in data)) throw new AccountError("INVALID_RESPONSE");
  return data.data as T;
}
function attempt(value: Attempt, details = false): Attempt {
  if (
    !value ||
    typeof value.id !== "string" ||
    !["active", "grading", "completed"].includes(value.status) ||
    !Number.isSafeInteger(value.revision)
  )
    throw new AccountError("INVALID_RESPONSE");
  if (
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    !Number.isFinite(Date.parse(value.startedAt))
  )
    throw new AccountError("INVALID_RESPONSE");
  if (
    details &&
    value.status === "active" &&
    (!value.serverTime ||
      !Number.isFinite(Date.parse(value.serverTime)) ||
      !Array.isArray(value.questions) ||
      value.questions.length === 0 ||
      !value.answers ||
      typeof value.answers !== "object")
  )
    throw new AccountError("INVALID_RESPONSE");
  return { ...value, score: value.score === null ? null : Number(value.score) };
}
export const learningRepository = {
  status: async (classId?: string): Promise<LearningStatus | null> => {
    try {
      const v = await call<LearningStatus>("status", { classId });
      return {
        ...v,
        class: parseClassroom(v.class),
        attempt: v.attempt ? attempt(v.attempt) : null,
        posttest: v.posttest ? attempt(v.posttest) : null,
      };
    } catch (e) {
      if (e instanceof AccountError && e.code === "CLASS_REQUIRED") return null;
      throw e;
    }
  },
  start: async (kind: TestKind = "PRETEST") =>
    attempt(await call<Attempt>("start", { kind })),
  attempt: async (attemptId: string) =>
    attempt(await call<Attempt>("attempt", { attemptId }), true),
  save: async (
    attemptId: string,
    revision: number,
    answers: Record<string, string>,
  ) => attempt(await call<Attempt>("save", { attemptId, revision, answers })),
  submit: async (attemptId: string) =>
    attempt(await call<Attempt>("submit", { attemptId })),
  result: async (attemptId: string) => {
    const r = await call<Result>("result", { attemptId });
    return { ...attempt(r), feedback: r.feedback };
  },
  materials: (classId?: string) =>
    call<MaterialRow[]>("materials", { classId }),
  material: (materialId: string) => call<Material>("material", { materialId }),
  read: (materialId: string) => call<Material>("read", { materialId }),
  edit: (
    materialId: string,
    input: {
      title: string;
      body: string;
      requiresLab: boolean;
      labKind?: "filter" | "update";
      attachments: Attachment[];
    },
  ) => call<Material>("edit_material", { materialId, ...input }),
  settings: (classId: string, minutes: number) =>
    call<{ pretestMinutes: number }>("settings", { classId, minutes }),
  results: (
    classId: string,
    cursor: string | null = null,
    kind: TestKind = "PRETEST",
  ) =>
    call<{ items: StudentResult[]; nextCursor: string | null }>("results", {
      classId,
      cursor,
      kind,
    }),
  add: (
    classId: string,
    input: {
      title: string;
      body: string;
      requiresLab: boolean;
      labKind?: "filter" | "update";
      attachments: Attachment[];
    },
  ) => call<Material>("add_material", { classId, ...input }),
  bank: (classId: string, kind: TestKind) =>
    call<QuestionBank>("bank", { classId, kind }),
  saveBank: (classId: string, bank: QuestionBank) =>
    edge<{ saved: boolean }>({ action: "save_bank", classId, ...bank }),
  lab: (materialId: string, query: string, check: boolean, requestId: string) =>
    edge<LabResult>({ action: "lab", materialId, query, check, requestId }),
  grade: async (attemptId: string) => {
    const { error } = await requireSupabase().functions.invoke("mobile-grade", {
      body: { attemptId },
    });
    if (error) throw new AccountError("GRADING_UNAVAILABLE");
  },
};

async function edge<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke(
    "mobile-grade",
    { body },
  );
  let value = data;
  if (error?.context && typeof error.context.json === "function")
    value = await error.context.json().catch(() => null);
  if (value?.error) throw new AccountError(String(value.error.code));
  if (error || !value || !("data" in value))
    throw new AccountError("REQUEST_FAILED");
  return value.data as T;
}
