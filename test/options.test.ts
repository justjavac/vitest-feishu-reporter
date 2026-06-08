import { expect, test, vi } from 'vitest';

import { resolveOptions } from '../src/options.js';

test('resolves all options from constructor', () => {
  const options = resolveOptions({
    token: 'test-token',
    secret: 'test-secret',
    silent: true,
  });

  expect(options).toEqual({
    token: 'test-token',
    secret: 'test-secret',
    silent: true,
  });
});

test('uses default values when options are not provided', () => {
  const options = resolveOptions({});

  expect(options).toEqual({
    token: '',
    secret: '',
    silent: false,
  });
});

test('uses default values when options is undefined', () => {
  const options = resolveOptions(undefined);

  expect(options).toEqual({
    token: '',
    secret: '',
    silent: false,
  });
});

test('VITEST_FEISHU_TOKEN env var takes precedence', () => {
  vi.stubEnv('VITEST_FEISHU_TOKEN', 'env-token');

  const options = resolveOptions({ token: 'constructor-token' });

  expect(options.token).toBe('env-token');

  vi.unstubAllEnvs();
});

test('VITEST_FEISHU_SECRET env var takes precedence', () => {
  vi.stubEnv('VITEST_FEISHU_SECRET', 'env-secret');

  const options = resolveOptions({ secret: 'constructor-secret' });

  expect(options.secret).toBe('env-secret');

  vi.unstubAllEnvs();
});

test('npm_package_vitest_feishu_token env var is used when VITEST_FEISHU_TOKEN is not set', () => {
  vi.stubEnv('npm_package_vitest_feishu_token', 'npm-token');

  const options = resolveOptions({ token: 'constructor-token' });

  expect(options.token).toBe('npm-token');

  vi.unstubAllEnvs();
});

test('npm_package_vitest_feishu_secret env var is used when VITEST_FEISHU_SECRET is not set', () => {
  vi.stubEnv('npm_package_vitest_feishu_secret', 'npm-secret');

  const options = resolveOptions({ secret: 'constructor-secret' });

  expect(options.secret).toBe('npm-secret');

  vi.unstubAllEnvs();
});

test('constructor options are used when no env vars are set', () => {
  vi.unstubAllEnvs();

  const options = resolveOptions({
    token: 'constructor-token',
    secret: 'constructor-secret',
    silent: true,
  });

  expect(options.token).toBe('constructor-token');
  expect(options.secret).toBe('constructor-secret');
  expect(options.silent).toBe(true);
});

test('silent defaults to false', () => {
  vi.unstubAllEnvs();

  const options = resolveOptions({ token: 't' });

  expect(options.silent).toBe(false);
});

test('token and secret default to empty string', () => {
  vi.unstubAllEnvs();

  const options = resolveOptions({ silent: true });

  expect(options.token).toBe('');
  expect(options.secret).toBe('');
});
