import { createHmac } from "node:crypto";

export interface SignPayload {
  timestamp?: string;
  sign?: string;
}

export interface CardElement {
  tag: string;
  text?: {
    content: string;
    tag: string;
  };
}

export interface FeishuCardMessage {
  timestamp?: string;
  sign?: string;
  msg_type: "interactive";
  card: {
    header: {
      title: {
        tag: "plain_text";
        content: string;
      };
      template: string;
    };
    elements: CardElement[];
  };
}

/**
 * Generate signature for Feishu custom bot.
 * @see https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot#359ac
 */
export function sign(secret: string): SignPayload {
  const timestamp = String(Date.now()).slice(0, 10);
  const stringToSign = `${timestamp}\n${secret}`;
  const hash = createHmac("sha256", stringToSign);
  hash.update("");
  const signature = hash.digest("base64");

  return { timestamp, sign: signature };
}

/**
 * Send interactive card message to Feishu via webhook.
 */
export async function sendMessage(
  token: string,
  secret: string | undefined,
  elements: CardElement[],
): Promise<void> {
  const signPayload = secret ? sign(secret) : {};

  const data: FeishuCardMessage = {
    ...signPayload,
    msg_type: "interactive",
    card: {
      header: {
        title: {
          tag: "plain_text",
          content: "Vitest 测试报告",
        },
        template: "red",
      },
      elements,
    },
  };

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bot/v2/hook/${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Feishu API error: ${response.status} ${response.statusText}`,
    );
  }

  let body: { code: number; msg: string };
  try {
    body = (await response.json()) as { code: number; msg: string };
  } catch {
    throw new Error("Feishu API error: invalid JSON response");
  }

  if (body.code !== 0) {
    throw new Error(`Feishu API error: ${body.msg}`);
  }
}
