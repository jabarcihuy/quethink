import { requireSupabase } from "@/lib/supabase/client";
import { AccountError } from "@/features/account/repository";

export type Category = "DATABASE" | "GENERAL";
export type Topic = {
  id: string;
  title: string;
  category: Category;
  authorName: string;
  isMine: boolean;
  isLocked: boolean;
  isHidden: boolean;
  createdAt: string;
  body?: string;
  replyCount?: number;
};
export type Reply = {
  id: string;
  body: string;
  authorName: string;
  isMine: boolean;
  isHidden: boolean;
  createdAt: string;
};
export type ForumPage<T> = { items: T[]; offset: number; hasMore: boolean };
type Row = Record<string, unknown>;
function row(v: unknown): Row {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new AccountError("INVALID_RESPONSE");
  return v as Row;
}
function str(v: unknown): string {
  if (typeof v !== "string") throw new AccountError("INVALID_RESPONSE");
  return v;
}
function bool(v: unknown): boolean {
  if (typeof v !== "boolean") throw new AccountError("INVALID_RESPONSE");
  return v;
}
function time(v: unknown): string {
  const s = str(v);
  if (!Number.isFinite(Date.parse(s)))
    throw new AccountError("INVALID_RESPONSE");
  return s;
}
export function parseTopic(v: unknown, detail = false): Topic {
  const r = row(v),
    category = str(r.category);
  if (category !== "DATABASE" && category !== "GENERAL")
    throw new AccountError("INVALID_RESPONSE");
  const item: Topic = {
    id: str(r.id),
    title: str(r.title),
    category,
    authorName: str(r.authorName),
    isMine: bool(r.isMine),
    isLocked: bool(r.isLocked),
    isHidden: bool(r.isHidden),
    createdAt: time(r.createdAt),
  };
  if (detail) item.body = str(r.body);
  else {
    if (!Number.isSafeInteger(r.replyCount) || Number(r.replyCount) < 0)
      throw new AccountError("INVALID_RESPONSE");
    item.replyCount = Number(r.replyCount);
  }
  return item;
}
export function parseReply(v: unknown): Reply {
  const r = row(v);
  return {
    id: str(r.id),
    body: str(r.body),
    authorName: str(r.authorName),
    isMine: bool(r.isMine),
    isHidden: bool(r.isHidden),
    createdAt: time(r.createdAt),
  };
}
export function parsePage<T>(
  v: unknown,
  parse: (item: unknown) => T,
): ForumPage<T> {
  const r = row(v);
  if (
    !Array.isArray(r.items) ||
    !Number.isSafeInteger(r.offset) ||
    Number(r.offset) < 0
  )
    throw new AccountError("INVALID_RESPONSE");
  return {
    items: r.items.map(parse),
    offset: Number(r.offset),
    hasMore: bool(r.hasMore),
  };
}
async function call(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<unknown> {
  const { data, error } = await requireSupabase().rpc("mobile_forum", {
    p_action: action,
    p_payload: payload,
  });
  if (error) throw new AccountError("REQUEST_FAILED");
  const result = row(data);
  if (result.error) throw new AccountError(str(row(result.error).code));
  if (!("data" in result)) throw new AccountError("INVALID_RESPONSE");
  return result.data;
}
export const forumRepository = {
  async topics(category: Category | null, search: string, offset = 0) {
    return parsePage(
      await call("topics", { category, search, offset, limit: 20 }),
      (v) => parseTopic(v),
    );
  },
  async topic(id: string) {
    return parseTopic(await call("topic", { topicId: id }), true);
  },
  async replies(id: string, offset = 0) {
    return parsePage(
      await call("replies", { topicId: id, offset, limit: 20 }),
      parseReply,
    );
  },
  async createTopic(title: string, body: string, category: Category) {
    const result = row(await call("create_topic", { title, body, category }));
    return str(result.id);
  },
  async createReply(topicId: string, body: string) {
    const result = row(await call("create_reply", { topicId, body }));
    return str(result.id);
  },
  async moderate(
    targetId: string,
    operation: "lock_topic" | "hide_topic" | "hide_reply",
    value: boolean,
  ) {
    const result = row(await call("moderate", { targetId, operation, value }));
    if (result.ok !== true) throw new AccountError("INVALID_RESPONSE");
  },
};
