import { NextResponse } from "next/server";

const LOG_PREFIX = "[telegram]";

function getWebhookUrl() {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/api/telegram/webhook`;
}

export async function POST() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  const webhookUrl = getWebhookUrl();

  if (!token) {
    console.error(`${LOG_PREFIX} Missing TELEGRAM_BOT_TOKEN`);
    return NextResponse.json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });
  }

  if (!secret) {
    console.error(`${LOG_PREFIX} Missing TELEGRAM_WEBHOOK_SECRET`);
    return NextResponse.json({ ok: false, error: "Missing TELEGRAM_WEBHOOK_SECRET" }, { status: 500 });
  }

  if (!webhookUrl) {
    console.error(`${LOG_PREFIX} Missing NEXT_PUBLIC_APP_URL`);
    return NextResponse.json({ ok: false, error: "Missing NEXT_PUBLIC_APP_URL" }, { status: 500 });
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret
    })
  });

  const payloadText = await response.text().catch(() => "");
  const payload = (() => {
    try {
      return payloadText ? JSON.parse(payloadText) : null;
    } catch {
      return null;
    }
  })();
  if (!response.ok || payload?.ok === false) {
    console.error(`${LOG_PREFIX} Telegram setWebhook error`, response.status, payloadText.slice(0, 400));
    return NextResponse.json(
      {
        ok: false,
        error: `Telegram setWebhook failed with status ${response.status}`,
        description: payload?.description,
        url: webhookUrl
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, result: payload, url: webhookUrl });
}
