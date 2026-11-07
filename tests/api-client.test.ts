import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError, createApiClient } from '../src/lib/api/client';

const baseUrl = 'https://api.example.org/mobile/v1';
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const isError = (kind: ApiError['kind'], status?: number) => (error: unknown) => error instanceof ApiError && error.kind === kind && (status === undefined || error.status === status);

test('keeps API prefix, supplies session and locale, unwraps successful data', async () => {
  const api = createApiClient({ baseUrl, getLocale: () => 'id', getAccessToken: async () => 'test-token',
    fetchImpl: async (url, init) => {
      assert.equal(url, `${baseUrl}/me`);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'Bearer test-token');
      assert.equal(headers.get('Accept-Language'), 'id');
      assert.equal(headers.get('X-Quethink-Locale'), 'id');
      return json({ data: { id: 'student-1' } });
    },
  });
  assert.deepEqual(await api.request('/me'), { id: 'student-1' });
});

test('does not send a missing session token or retry a rejected mutation', async () => {
  let calls = 0;
  const api = createApiClient({ baseUrl, getLocale: () => 'en', fetchImpl: async (_url, init) => {
    calls++;
    const headers = new Headers(init?.headers);
    assert.equal(headers.has('Authorization'), false);
    assert.equal(headers.get('Idempotency-Key'), 'join-1');
    assert.equal(init?.body, JSON.stringify({ code: 'EXAMPLE' }));
    return json({ error: { code: 'ALREADY_JOINED', message: 'Already joined.' } }, 409);
  } });
  await assert.rejects(api.request('/classes/join', { method: 'POST', body: { code: 'EXAMPLE' }, idempotencyKey: 'join-1' }), (error: unknown) =>
    error instanceof ApiError && error.status === 409 && error.code === 'ALREADY_JOINED');
  assert.equal(calls, 1);
});

test('normalizes legacy auth errors without treating them as success', async () => {
  const api = createApiClient({ baseUrl, getLocale: () => 'en', fetchImpl: async () => json({ code: 'SESSION_EXPIRED', error: 'Please sign in.' }, 401) });
  await assert.rejects(api.request('/me'), (error: unknown) => error instanceof ApiError && error.code === 'SESSION_EXPIRED' && error.message === 'Please sign in.');
});

test('handles 204, invalid JSON, missing envelopes and non-JSON service errors', async () => {
  const responses = [new Response(null, { status: 204 }), new Response('<html/>'), json({ id: 'wrong-envelope' }), new Response('<html/>', { status: 502 })];
  const api = createApiClient({ baseUrl, getLocale: () => 'en', fetchImpl: async () => responses.shift()! });
  assert.equal(await api.request('/auth/logout', { method: 'POST' }), undefined);
  await assert.rejects(api.request('/me'), isError('invalid-response'));
  await assert.rejects(api.request('/me'), isError('invalid-response'));
  await assert.rejects(api.request('/me'), isError('http', 502));
});

test('rejects missing configuration and external/traversal routes before network access', async () => {
  const fetchImpl: typeof fetch = async () => { throw new Error('Must not reach network'); };
  const api = createApiClient({ baseUrl, getLocale: () => 'en', fetchImpl });
  for (const path of ['https://elsewhere.example/me', '//elsewhere.example/me', '/../me', '/%2e%2e/me', '/me?redirect=elsewhere']) {
    await assert.rejects(api.request(path), isError('configuration'));
  }
  await assert.rejects(createApiClient({ getLocale: () => 'en', fetchImpl }).request('/me'), isError('configuration'));
  await assert.rejects(createApiClient({ baseUrl: 'https://user:secret@api.example.org', getLocale: () => 'en', fetchImpl }).request('/me'), isError('configuration'));
});

test('distinguishes network failure, timeout and cancellation', async () => {
  const network = createApiClient({ baseUrl, getLocale: () => 'en', fetchImpl: async () => { throw new TypeError('offline'); } });
  await assert.rejects(network.request('/me'), isError('network'));
  const waiting: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    if (init?.signal?.aborted) reject(new Error('aborted'));
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  const timed = createApiClient({ baseUrl, getLocale: () => 'en', timeoutMs: 5, fetchImpl: waiting });
  await assert.rejects(timed.request('/me'), isError('timeout'));
  const cancellable = createApiClient({ baseUrl, getLocale: () => 'en', fetchImpl: waiting });
  const controller = new AbortController();
  const request = cancellable.request('/me', { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, isError('cancelled'));
});
