import "server-only";
import { getAppSession } from "./auth/session";
import { createAdminClient } from "./supabase/admin";
import {
  evaluateAgentKeyAccess,
  generateAgentIngestKeyValue,
  hashAgentIngestKey,
  normalizeAgentKeyPermissions,
  type AgentKeyAccessRule,
  type AgentKeyAllowedWindow,
  type AgentKeyPermissions
} from "./agent-keys-shared";

export type AgentIngestKeyRecord = {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  label: string;
  permissions: AgentKeyPermissions;
  allowed_page_ids: string[];
  daily_post_limit: number | null;
  allowed_window_json: AgentKeyAllowedWindow;
  expires_at: string | null;
  created_at: string;
  updated_at?: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type AgentIngestKeyPublic = Omit<AgentIngestKeyRecord, "key_hash">;

export type AgentIngestLogRecord = {
  id: string;
  user_id: string;
  agent_key_id?: string | null;
  action: string;
  page_id?: string | null;
  title?: string | null;
  status: string;
  post_id?: string | null;
  error_message?: string | null;
  created_at: string;
};

type CreateAgentKeyInput = {
  userId: string;
  label?: string;
  permissions?: Partial<AgentKeyPermissions>;
  allowedPageIds?: string[];
  dailyPostLimit?: number | null;
  allowedWindow?: AgentKeyAllowedWindow | null;
  expiresAt?: string | null;
};

export function isSharedDevAgentKeyEnabled() {
  return process.env.NODE_ENV !== "production";
}

export async function requireAgentKeyOwnerSession() {
  const session = await getAppSession();
  if (!session?.userId) throw new Error("Bạn cần đăng nhập Facebook để quản lý mã Agent.");
  return session;
}

export async function createAgentIngestKey(input: CreateAgentKeyInput) {
  const rawKey = generateAgentIngestKeyValue();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_ingest_keys")
    .insert({
      user_id: input.userId,
      key_hash: hashAgentIngestKey(rawKey),
      key_prefix: rawKey.slice(0, 16),
      label: (input.label || "Agent key").trim(),
      permissions: normalizeAgentKeyPermissions(input.permissions),
      allowed_page_ids: (input.allowedPageIds ?? []).filter(Boolean),
      daily_post_limit: typeof input.dailyPostLimit === "number" ? input.dailyPostLimit : null,
      allowed_window_json: normalizeAllowedWindow(input.allowedWindow),
      expires_at: input.expiresAt || null
    })
    .select("id,user_id,key_hash,key_prefix,label,permissions,allowed_page_ids,daily_post_limit,allowed_window_json,expires_at,created_at,updated_at,last_used_at,revoked_at")
    .single<AgentIngestKeyRecord>();

  if (error) throw new Error(error.message);

  return {
    rawKey,
    record: normalizeAgentKeyRecord(data)
  };
}

export async function listAgentIngestKeysForUser(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_ingest_keys")
    .select("id,user_id,key_hash,key_prefix,label,permissions,allowed_page_ids,daily_post_limit,allowed_window_json,expires_at,created_at,updated_at,last_used_at,revoked_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeAgentKeyRecord);
}

export async function listAgentIngestKeysForAdmin() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_ingest_keys")
    .select("id,user_id,key_hash,key_prefix,label,permissions,allowed_page_ids,daily_post_limit,allowed_window_json,expires_at,created_at,updated_at,last_used_at,revoked_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeAgentKeyRecord(row as AgentIngestKeyRecord));
}

export async function revokeAgentIngestKey(input: { id: string; userId?: string | null; asAdmin?: boolean }) {
  const admin = createAdminClient();
  let query = admin.from("agent_ingest_keys").update({ revoked_at: new Date().toISOString() }).eq("id", input.id);
  if (!input.asAdmin && input.userId) {
    query = query.eq("user_id", input.userId);
  }
  const { data, error } = await query
    .select("id,user_id,key_hash,key_prefix,label,permissions,allowed_page_ids,daily_post_limit,allowed_window_json,expires_at,created_at,updated_at,last_used_at,revoked_at")
    .maybeSingle<AgentIngestKeyRecord>();

  if (error) throw new Error(error.message);
  return data ? normalizeAgentKeyRecord(data) : null;
}

export async function resolveAgentIngestKey(rawKey: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_ingest_keys")
    .select("id,user_id,key_hash,key_prefix,label,permissions,allowed_page_ids,daily_post_limit,allowed_window_json,expires_at,created_at,updated_at,last_used_at,revoked_at")
    .eq("key_hash", hashAgentIngestKey(rawKey))
    .maybeSingle<AgentIngestKeyRecord>();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeAgentKeyRecord(data);
}

export async function touchAgentIngestKey(keyId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("agent_ingest_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyId);
  if (error) throw new Error(error.message);
}

export async function countAgentKeyPublishesToday(keyId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("agent_ingest_logs")
    .select("id", { count: "exact", head: true })
    .eq("agent_key_id", keyId)
    .eq("action", "direct_publish")
    .eq("status", "success")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function logAgentIngestEvent(input: {
  userId: string;
  agentKeyId?: string | null;
  action: "draft_ingest" | "direct_publish";
  pageId?: string | null;
  title?: string | null;
  status: "success" | "failed";
  postId?: string | null;
  requestJson?: Record<string, unknown>;
  responseJson?: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("agent_ingest_logs").insert({
    user_id: input.userId,
    agent_key_id: input.agentKeyId || null,
    action: input.action,
    page_id: input.pageId || null,
    title: input.title || null,
    status: input.status,
    post_id: input.postId || null,
    request_json: input.requestJson ?? {},
    response_json: input.responseJson ?? {},
    error_message: input.errorMessage || null
  });

  if (error) throw new Error(error.message);
}

export async function validateAgentKeyAccess(input: {
  rawKey: string;
  action: "draft_ingest" | "direct_publish";
  pageId?: string | null;
  scheduledPublishTime?: string | null;
}) {
  const record = await resolveAgentIngestKey(input.rawKey);
  if (!record) {
    return { ok: false as const, reason: "Mã kết nối Agent không hợp lệ hoặc đã bị xóa." };
  }

  const dailyUsageCount =
    input.action === "direct_publish" ? await countAgentKeyPublishesToday(record.id) : 0;

  const access = evaluateAgentKeyAccess(toAccessRule(record), {
    action: input.action,
    pageId: input.pageId,
    scheduledPublishTime: input.scheduledPublishTime,
    dailyUsageCount
  });

  if (!access.ok) return access;
  return { ok: true as const, record };
}

export function getDevIngestUserId(requestedUserId?: string | null) {
  if (!isSharedDevAgentKeyEnabled()) return null;
  if (requestedUserId) return requestedUserId;
  return process.env.AGENT_INGEST_USER_ID || null;
}

function normalizeAllowedWindow(input?: AgentKeyAllowedWindow | null) {
  if (!input) return {};
  return {
    startHour: typeof input.startHour === "number" ? input.startHour : null,
    endHour: typeof input.endHour === "number" ? input.endHour : null
  };
}

function toAccessRule(record: AgentIngestKeyRecord): AgentKeyAccessRule {
  return {
    revokedAt: record.revoked_at,
    expiresAt: record.expires_at,
    permissions: normalizeAgentKeyPermissions(record.permissions),
    allowedPageIds: record.allowed_page_ids,
    dailyPostLimit: record.daily_post_limit,
    allowedWindow: record.allowed_window_json
  };
}

function normalizeAgentKeyRecord(row: AgentIngestKeyRecord): AgentIngestKeyRecord {
  return {
    ...row,
    permissions: normalizeAgentKeyPermissions(row.permissions),
    allowed_page_ids: Array.isArray(row.allowed_page_ids) ? row.allowed_page_ids.filter((item): item is string => typeof item === "string") : [],
    daily_post_limit: typeof row.daily_post_limit === "number" ? row.daily_post_limit : null,
    allowed_window_json: normalizeAllowedWindow(row.allowed_window_json),
    expires_at: row.expires_at || null,
    last_used_at: row.last_used_at || null,
    revoked_at: row.revoked_at || null
  };
}

export function sanitizeAgentKeyRecord(record: AgentIngestKeyRecord): AgentIngestKeyPublic {
  const { key_hash: _hidden, ...safe } = record;
  return safe;
}
