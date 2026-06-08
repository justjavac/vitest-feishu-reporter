export interface FeishuReporterOptions {
  /** Feishu bot webhook token */
  token?: string;
  /** Feishu bot secret for signature verification */
  secret?: string;
  /** Whether to suppress console output */
  silent?: boolean;
}

/**
 * Resolve reporter options from constructor options and environment variables.
 * Environment variables take precedence over constructor options.
 */
export function resolveOptions(
  options?: Partial<FeishuReporterOptions>,
): Required<FeishuReporterOptions> {
  const token =
    process.env["VITEST_FEISHU_TOKEN"] ??
    process.env["npm_package_vitest_feishu_token"] ??
    options?.token;

  const secret =
    process.env["VITEST_FEISHU_SECRET"] ??
    process.env["npm_package_vitest_feishu_secret"] ??
    options?.secret;

  return {
    token: token ?? "",
    secret: secret ?? "",
    silent: options?.silent ?? false,
  };
}
