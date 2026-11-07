export type ApiErrorKind = 'configuration' | 'network' | 'timeout' | 'cancelled' | 'http' | 'invalid-response';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  idempotencyKey?: string;
};

type ClientOptions = {
  baseUrl?: string;
  getLocale: () => 'en' | 'id';
  getAccessToken?: () => Promise<string | null>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requestUrl(baseUrl: string | undefined, path: string) {
  if (!baseUrl) throw new ApiError('configuration', 'The mobile API base URL has not been configured.');
  let base: URL;
  try { base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`); }
  catch { throw new ApiError('configuration', 'The mobile API base URL is invalid.'); }

  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new ApiError('configuration', 'The mobile API base URL must be an HTTP(S) URL without credentials, query or fragment.');
  }
  // API routes are internal constants; never send bearer tokens to caller-supplied URLs.
  if (!/^\/[A-Za-z0-9/_-]*$/.test(path) || path.startsWith('//')) {
    throw new ApiError('configuration', 'API paths must be relative routes without traversal or query strings.');
  }
  return new URL(path.slice(1), base).toString();
}

export function createApiClient(options: ClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  return {
    async request<T>(path: string, request: RequestOptions = {}): Promise<T> {
      const url = requestUrl(options.baseUrl, path);
      if (request.signal?.aborted) throw new ApiError('cancelled', 'The request was cancelled.');
      const token = await options.getAccessToken?.();
      const locale = options.getLocale();
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Accept-Language': locale,
        'X-Quethink-Locale': locale,
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (request.body !== undefined) headers['Content-Type'] = 'application/json';
      if (request.idempotencyKey) headers['Idempotency-Key'] = request.idempotencyKey;

      const body = request.body === undefined ? undefined : JSON.stringify(request.body);
      const controller = new AbortController();
      let timedOut = false;
      const cancel = () => controller.abort();
      request.signal?.addEventListener('abort', cancel, { once: true });
      if (request.signal?.aborted) cancel();
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);

      try {
        const response = await fetchImpl(url, {
          method: request.method ?? 'GET', headers, body, signal: controller.signal,
          redirect: 'error',
        });
        if (response.status === 204 && response.ok) return undefined as T;
        let payload: unknown;
        try { payload = await response.json(); }
        catch {
          if (controller.signal.aborted) throw new Error('Request aborted while reading response.');
          throw new ApiError(response.ok ? 'invalid-response' : 'http', 'The service returned an unreadable response.', response.status);
        }
        if (!response.ok) {
          const detail = record(payload) && record(payload.error) ? payload.error : payload;
          const code = record(detail) && typeof detail.code === 'string' ? detail.code : undefined;
          const message = record(detail) && typeof detail.message === 'string' ? detail.message
            : record(payload) && typeof payload.error === 'string' ? payload.error : 'The request could not be completed.';
          throw new ApiError('http', message, response.status, code);
        }
        if (!record(payload) || !('data' in payload)) {
          throw new ApiError('invalid-response', 'The service response is missing its data envelope.', response.status);
        }
        // Repositories must validate their feature payload before it reaches UI state.
        return payload.data as T;
      } catch (error) {
        if (timedOut) throw new ApiError('timeout', 'The service took too long to respond.');
        if (controller.signal.aborted) throw new ApiError('cancelled', 'The request was cancelled.');
        if (error instanceof ApiError) throw error;
        throw new ApiError('network', 'Could not connect to the service.');
      } finally {
        clearTimeout(timeout);
        request.signal?.removeEventListener('abort', cancel);
      }
    },
  };
}
