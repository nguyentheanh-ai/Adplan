import { NextResponse } from "next/server";
import {
  buildTelegramAdsPeriodMessage,
  buildTelegramRevenuePeriodMessage,
  getAllowedChatIds,
  getTelegramCommandHelp,
  isChatIdAllowed,
  sendTelegramMessage
} from "@/lib/telegram-revenue-report.service";

type TelegramMessage = {
  text?: string;
  chat?: { id?: string | number | null };
};

type TelegramUpdate = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
};

type TelegramCommand = "start" | "help" | "report" | "ads" | "revenue" | "profit" | "chatid";
type ParsedCommand = { command: TelegramCommand | null; args: string[] };

const LOG_PREFIX = "[telegram]";
const TELEGRAM_SECRET_HEADER = "x-telegram-bot-api-secret-token";
const VALID_COMMANDS = new Set<TelegramCommand>(["start", "help", "report", "ads", "revenue", "profit", "chatid"]);

function isWebhookAuthorized(request: Request) {
  const secret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error(`${LOG_PREFIX} Missing TELEGRAM_WEBHOOK_SECRET`);
    return false;
  }

  const requestSecret = request.headers.get(TELEGRAM_SECRET_HEADER);
  return requestSecret === secret;
}

function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return { command: null, args: [] };

  const firstToken = trimmed.split(/\s+/)[0] || "";
  if (!firstToken) return { command: null, args: [] };

  const command = firstToken.replace(/^\//, "").split("@")[0].toLowerCase();
  if (!VALID_COMMANDS.has(command as TelegramCommand)) return { command: null, args: [] };

  const args = trimmed.slice(firstToken.length).trim().split(/\s+/).filter(Boolean);
  return { command: command as TelegramCommand, args };
}

function isChatAllowed(chatId: string) {
  return isChatIdAllowed(chatId);
}

export async function GET() {
  return NextResponse.json({ ok: true, status: "ready" });
}

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Missing TELEGRAM_WEBHOOK_SECRET" }, { status: 500 });
  }

  if (!isWebhookAuthorized(request)) {
    console.warn(`${LOG_PREFIX} Webhook secret mismatch`);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = body?.message ?? body?.edited_message ?? body?.channel_post;
  const rawText = String(message?.text || "").trim();
  const chatId = String(message?.chat?.id || "").trim();

  if (!rawText || !chatId) {
    return NextResponse.json({ ok: false, error: "Missing message text or chat id." }, { status: 400 });
  }

  if (!isChatAllowed(chatId)) {
    console.warn(`${LOG_PREFIX} Chat id not allowed`, chatId, `allowList=${getAllowedChatIds().join(",")}`);
    return NextResponse.json({ ok: false, error: "Chat not allowed." }, { status: 403 });
  }

  const { command, args } = parseCommand(rawText);

  try {
    if (command === "start" || command === "help") {
      await sendTelegramMessage(chatId, getTelegramCommandHelp());
      return NextResponse.json({ ok: true, command: "help" });
    }

    if (command === "chatid") {
      await sendTelegramMessage(chatId, `Group chat_id la: ${chatId}`);
      return NextResponse.json({ ok: true, command: "chatid" });
    }

    if (command === "report" || command === "revenue") {
      const messageText = await buildTelegramRevenuePeriodMessage(args);
      await sendTelegramMessage(chatId, messageText);
      return NextResponse.json({ ok: true, command });
    }

    if (command === "ads" || command === "profit") {
      const messageText = await buildTelegramAdsPeriodMessage(args);
      await sendTelegramMessage(chatId, messageText);
      return NextResponse.json({ ok: true, command });
    }

    if (!command) {
      return NextResponse.json({ ok: true, skipped: "non_command" });
    }

    return NextResponse.json({ ok: true, skipped: command });
  } catch (error) {
    console.error(`${LOG_PREFIX} Telegram command handling error`, error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to process command." },
      { status: 500 }
    );
  }
}
