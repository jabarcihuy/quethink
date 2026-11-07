import { requireSupabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  role: "student" | "teacher" | "admin";
  displayName: string | null;
  nim: string | null;
  avatarPath: string | null;
  birthDate: string | null;
  profileComplete: boolean;
};
export type Classroom = {
  id: string;
  name: string;
  status: "active" | "archived";
  teacherName: string | null;
  studentCount: number;
  joinCode: string | null;
  createdAt: string;
  archivedAt: string | null;
};
export type ResolvedClass = {
  id: string;
  name: string;
  teacherName: string | null;
};
export type Student = {
  id: string;
  displayName: string;
  nim: string;
  joinedAt: string;
};
export type Template = { id: string; title: string };
export type Dashboard = {
  class: Classroom;
  nextAction: "archived" | "pretest_not_started";
  progress: null;
  pretestScore: null;
  posttestScore: null;
};
export class AccountError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
type Row = Record<string, unknown>;
function row(value: unknown): Row {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new AccountError("INVALID_RESPONSE");
  return value as Row;
}
function str(value: unknown): string {
  if (typeof value !== "string") throw new AccountError("INVALID_RESPONSE");
  return value;
}
function optional(value: unknown): string | null {
  return value === null ? null : str(value);
}
function profile(value: unknown): Profile {
  const r = row(value);
  if (
    !["student", "teacher", "admin"].includes(str(r.role)) ||
    typeof r.profileComplete !== "boolean"
  )
    throw new AccountError("INVALID_RESPONSE");
  return {
    id: str(r.id),
    role: r.role as Profile["role"],
    displayName: optional(r.displayName),
    nim: optional(r.nim),
    avatarPath: optional(r.avatarPath),
    birthDate: optional(r.birthDate),
    profileComplete: r.profileComplete,
  };
}
function classroom(value: unknown): Classroom {
  const r = row(value);
  if (
    !["active", "archived"].includes(str(r.status)) ||
    !Number.isSafeInteger(r.studentCount) ||
    Number(r.studentCount) < 0
  )
    throw new AccountError("INVALID_RESPONSE");
  return {
    id: str(r.id),
    name: str(r.name),
    status: r.status as Classroom["status"],
    teacherName: optional(r.teacherName),
    studentCount: Number(r.studentCount),
    joinCode: optional(r.joinCode),
    createdAt: str(r.createdAt),
    archivedAt: optional(r.archivedAt),
  };
}
async function call(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await requireSupabase().rpc(`mobile_${name}`, args);
  if (error)
    throw new AccountError(
      error.code === "PGRST301" ? "AUTH_REQUIRED" : "REQUEST_FAILED",
    );
  const r = row(data);
  if (r.error) throw new AccountError(str(row(r.error).code));
  if (!("data" in r)) throw new AccountError("INVALID_RESPONSE");
  return r;
}
async function page<T>(
  name: string,
  args: Record<string, unknown>,
  parse: (value: unknown) => T,
) {
  const r = await call(name, args);
  if (!Array.isArray(r.data)) throw new AccountError("INVALID_RESPONSE");
  return { data: r.data.map(parse), nextCursor: optional(r.nextCursor) };
}
export const accountRepository = {
  profile: async () => profile((await call("get_my_profile")).data),
  updateProfile: async (input: {
    displayName: string;
    nim: string | null;
    birthDate: string | null;
    avatarPath: string | null;
  }) =>
    profile(
      (
        await call("update_my_profile", {
          p_display_name: input.displayName,
          p_nim: input.nim,
          p_birth_date: input.birthDate,
          p_avatar_path: input.avatarPath,
        })
      ).data,
    ),
  myClass: async () => {
    const r = await call("get_my_class");
    return r.data === null ? null : classroom(r.data);
  },
  classes: (cursor: string | null = null) =>
    page("list_my_classes", { p_cursor: cursor }, classroom),
  resolveCode: async (code: string): Promise<ResolvedClass> => {
    const r = row((await call("resolve_class_code", { p_code: code })).data);
    return {
      id: str(r.id),
      name: str(r.name),
      teacherName: optional(r.teacherName),
    };
  },
  join: async (code: string) => {
    const r = row((await call("join_class", { p_code: code })).data);
    return { id: str(r.id), classId: str(r.classId) };
  },
  templates: async (): Promise<Template[]> => {
    const r = await call("list_templates");
    if (!Array.isArray(r.data)) throw new AccountError("INVALID_RESPONSE");
    return r.data.map((v) => {
      const item = row(v);
      return { id: str(item.id), title: str(item.title) };
    });
  },
  createClass: async (name: string, templateId: string) =>
    classroom(
      (await call("create_class", { p_name: name, p_template_id: templateId }))
        .data,
    ),
  archive: async (id: string) =>
    classroom((await call("archive_class", { p_class_id: id })).data),
  dashboard: async (id?: string): Promise<Dashboard> => {
    const r = row(
      (await call("get_dashboard", { p_class_id: id ?? null })).data,
    );
    if (r.nextAction !== "archived" && r.nextAction !== "pretest_not_started")
      throw new AccountError("INVALID_RESPONSE");
    return {
      class: classroom(r.class),
      nextAction: r.nextAction,
      progress: null,
      pretestScore: null,
      posttestScore: null,
    };
  },
  roster: (id: string, cursor: string | null = null) =>
    page("get_class_roster", { p_class_id: id, p_cursor: cursor }, (v) => {
      const r = row(v);
      return {
        id: str(r.id),
        displayName: str(r.displayName),
        nim: str(r.nim),
        joinedAt: str(r.joinedAt),
      } as Student;
    }),
};

export { classroom as parseClassroom };
