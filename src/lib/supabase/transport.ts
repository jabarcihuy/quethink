/** Bound network waits while preserving cancellation from the SDK/caller. */
export function withRequestTimeout(
  fetcher: typeof fetch,
  milliseconds = 20000,
): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController(),
      parent = init?.signal;
    const cancel = () => controller.abort(parent?.reason);
    if (parent?.aborted) cancel();
    else parent?.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(
      () => controller.abort(new Error("REQUEST_TIMEOUT")),
      milliseconds,
    );
    try {
      return await fetcher(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      parent?.removeEventListener("abort", cancel);
    }
  };
}
