import { expect, test, vi } from 'vitest';

import { sendMessage, sign } from '../src/feishu.js';

test('sign generates timestamp and signature', () => {
  const result = sign('test-secret');

  expect(result.timestamp).toBeDefined();
  expect(result.sign).toBeDefined();
  expect(typeof result.timestamp).toBe('string');
  expect(typeof result.sign).toBe('string');
  expect(result.timestamp!.length).toBe(10);
});

test('sign generates different signatures for different secrets', () => {
  const result1 = sign('secret-1');
  const result2 = sign('secret-2');

  expect(result1.sign).not.toBe(result2.sign);
});

test('sendMessage with secret sends successfully', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ code: 0, msg: 'ok' }),
  });
  vi.stubGlobal('fetch', fetchMock);

  await sendMessage('test-token', 'test-secret', [
    { tag: 'div', text: { content: 'test', tag: 'lark_md' } },
  ]);

  expect(fetchMock).toHaveBeenCalledOnce();
  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse(init.body as string);
  expect(body.msg_type).toBe('interactive');
  expect(body.timestamp).toBeDefined();
  expect(body.sign).toBeDefined();

  vi.unstubAllGlobals();
});

test('sendMessage without secret sends successfully', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ code: 0, msg: 'ok' }),
  });
  vi.stubGlobal('fetch', fetchMock);

  await sendMessage('test-token', undefined, [
    { tag: 'div', text: { content: 'test', tag: 'lark_md' } },
  ]);

  expect(fetchMock).toHaveBeenCalledOnce();
  const [, init] = fetchMock.mock.calls[0];
  const body = JSON.parse(init.body as string);
  expect(body.msg_type).toBe('interactive');
  expect(body.timestamp).toBeUndefined();
  expect(body.sign).toBeUndefined();

  vi.unstubAllGlobals();
});

test('sendMessage throws when response is not ok', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: false,
    status: 400,
    statusText: 'Bad Request',
  });
  vi.stubGlobal('fetch', fetchMock);

  await expect(
    sendMessage('test-token', undefined, [{ tag: 'div' }]),
  ).rejects.toThrow('Feishu API error: 400 Bad Request');

  vi.unstubAllGlobals();
});

test('sendMessage throws when body code is not 0', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ code: 9499, msg: 'Bad Request' }),
  });
  vi.stubGlobal('fetch', fetchMock);

  await expect(
    sendMessage('test-token', undefined, [{ tag: 'div' }]),
  ).rejects.toThrow('Feishu API error: Bad Request');

  vi.unstubAllGlobals();
});
