type Store = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/** SecureStore has per-value limits. Commit a manifest only after all chunks exist. */
export function createSecureStorage(store: Store) {
  let sequence = 0;
  const locks = new Map<string, Promise<unknown>>();
  async function serialized<T>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = locks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    locks.set(key, next);
    try {
      return await next;
    } finally {
      if (locks.get(key) === next) locks.delete(key);
    }
  }
  function manifest(
    raw: string | null,
  ): { version: string; count: number } | null {
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !("version" in value) ||
      !("count" in value) ||
      typeof value.version !== "string" ||
      !Number.isInteger(value.count) ||
      Number(value.count) < 1 ||
      Number(value.count) > 512
    )
      throw new Error("Invalid secure session");
    return value as { version: string; count: number };
  }
  async function cleanup(
    key: string,
    value: { version: string; count: number } | null,
  ) {
    if (value)
      await Promise.all(
        Array.from({ length: value.count }, (_, i) =>
          store.removeItem(`${key}.${value.version}.${i}`),
        ),
      );
  }
  return {
    getItem: (key: string) =>
      serialized(key, async () => {
        const current = manifest(await store.getItem(key));
        if (!current) return null;
        const parts = await Promise.all(
          Array.from({ length: current.count }, (_, i) =>
            store.getItem(`${key}.${current.version}.${i}`),
          ),
        );
        if (parts.some((p) => p === null))
          throw new Error("Incomplete secure session");
        return parts.join("");
      }),
    setItem: (key: string, value: string) =>
      serialized(key, async () => {
        const old = manifest(await store.getItem(key));
        const chars = Array.from(value),
          parts: string[] = [];
        for (let i = 0; i < chars.length; i += 400)
          parts.push(chars.slice(i, i + 400).join(""));
        if (parts.length === 0) parts.push("");
        if (parts.length > 512)
          throw new Error("Session exceeds secure storage limit");
        const current = {
          version: `${Date.now().toString(36)}-${++sequence}`,
          count: parts.length,
        };
        try {
          const writes = await Promise.allSettled(
            parts.map((part, i) =>
              store.setItem(`${key}.${current.version}.${i}`, part),
            ),
          );
          const failed = writes.find((result) => result.status === "rejected");
          if (failed?.status === "rejected") throw failed.reason;
          await store.setItem(key, JSON.stringify(current));
        } catch (error) {
          await cleanup(key, current).catch(() => undefined);
          throw error;
        }
        await cleanup(key, old).catch(() => undefined);
      }),
    removeItem: (key: string) =>
      serialized(key, async () => {
        const old = manifest(await store.getItem(key));
        await store.removeItem(key);
        await cleanup(key, old);
      }),
  };
}
