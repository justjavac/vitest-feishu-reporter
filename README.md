# vitest-feishu-reporter

将 Vitest 的测试错误发送到飞书（Lark）。

## 安装

```bash
npm install -D vitest-feishu-reporter
# 或者
yarn add -D vitest-feishu-reporter
# 或者
pnpm add -D vitest-feishu-reporter
```

## 使用

在 `vitest.config.ts` 中配置：

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: [
      "default",
      // ... other reporters
      [
        "vitest-feishu-reporter",
        {
          token: "xxxxxx-xxxxxxx-xxxx-xxxx",
          secret: "xxxxxxx",
        },
      ],
    ],
  },
});
```

## 配置说明

### token

在[飞书自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)文档中可以获取机器人的 webhook 地址，格式如下：

```
https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxxx
                                             ^^^^^^^^^^^^^^^^^
                                                   token
```

`token` 就是 URL 最后面的部分。

### secret

飞书有 3 种安全模式，如果使用**签名校验**，则需要设置 `secret`。

### silent

是否静默模式，设置为 `true` 时不会在控制台输出 reporter 的日志信息。

```ts
export default defineConfig({
  test: {
    reporters: [
      ["vitest-feishu-reporter", { silent: true }],
    ],
  },
});
```

## 环境变量

对于公有仓库，还可以通过设置系统环境变量来进行配置：

- `VITEST_FEISHU_TOKEN` - 设置 token
- `VITEST_FEISHU_SECRET` - 设置 secret

环境变量的优先级高于配置文件中的选项。

使用：

```bash
VITEST_FEISHU_TOKEN=xxxx-xxxx-xxx npm run test
```

GitHub Actions 配置：

```yaml
- name: Test
  env:
    VITEST_FEISHU_TOKEN: ${{ secrets.FEISHU_TOKEN }}
  run: pnpm test
```

## License

[MIT](LICENSE)
