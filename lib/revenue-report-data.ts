import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cleanEnvValue } from "@/lib/env";
import type { RevenueReportOrder, RevenueReportRegistration } from "@/lib/revenue-report";
import { toNumber } from "@/lib/revenue-report";

export type RevenueDataStatus = {
  ok: boolean;
  message?: string;
  source: "shared-supabase" | "revenue-report-supabase";
};

type OrdersRow = {
  id: string;
  order_code: string | null;
  student_name: string | null;
  email: string | null;
  phone: string | null;
  course_slug: string | null;
  course_title: string | null;
  amount: string | number | null;
  status: string | null;
  payment_method?: string | null;
  paid_at: string | null;
  created_at: string | null;
  sepay_transaction_id?: string | null;
  sepay_reference_code?: string | null;
  sepay_payload?: Record<string, unknown> | null;
  order_items?: Array<{ title?: string; slug?: string; price?: number }> | null;
};

type LeadsRow = {
  id: string;
  source: string | null;
  created_at: string | null;
};

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || String(error?.message || "").toLowerCase().includes("could not find the table");
}

function createRevenueSupabaseClient() {
  const url = cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_URL) || cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey =
    cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_SERVICE_ROLE_KEY) || cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function dataSource(): RevenueDataStatus["source"] {
  return cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_URL) || cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_SERVICE_ROLE_KEY)
    ? "revenue-report-supabase"
    : "shared-supabase";
}

function inferSourceSite(source?: string | null): RevenueReportOrder["sourceSite"] {
  const normalized = String(source || "").toLowerCase();
  if (normalized.includes("adsplan") || normalized.includes("adplan") || normalized.includes("greezhub")) return "adsplan";
  return "theanhmarketing";
}

function inferProductCodeFromOrder(row: OrdersRow) {
  const text = [
    row.course_slug,
    row.course_title,
    ...(row.order_items ?? []).flatMap((item) => [item.slug, item.title])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("facebook-ads") || text.includes("facebook ads") || text.includes("quang cao facebook")) return "FBA";
  if (text.includes("ai-master") || text.includes("ai master") || text.includes("x10-hieu-suat") || text.includes("x10 hieu suat")) return "AIM";
  return null;
}

function inferProductCodeFromLead(row: LeadsRow) {
  const text = String(row.source || "").toLowerCase();
  if (text.includes("facebook") || text.includes("fba")) return "FBA";
  if (text.includes("ai master") || text.includes("ai-master") || text.includes("aim") || text.includes("x10")) return "AIM";
  return null;
}

function productNameFromOrder(row: OrdersRow) {
  const firstItemTitle = row.order_items?.find((item) => item.title)?.title;
  return firstItemTitle || row.course_title || row.course_slug || "Chưa rõ sản phẩm";
}

export function mapOrderRow(row: OrdersRow): RevenueReportOrder {
  return {
    sourceSite: inferSourceSite(row.order_code),
    customerName: row.student_name ?? "",
    customerEmail: row.email ?? "",
    phone: row.phone ?? "",
    productName: productNameFromOrder(row),
    productCode: inferProductCodeFromOrder(row),
    amount: toNumber(row.amount),
    paymentMethod: row.payment_method ?? "sepay",
    paymentStatus: row.status ?? "pending",
    createdAt: row.created_at ?? "",
    paidAt: row.paid_at,
    sepayTransactionId: row.sepay_transaction_id ?? null,
    sepayReferenceCode: row.sepay_reference_code ?? null,
    hasSepayPayload: Boolean(row.sepay_payload && Object.keys(row.sepay_payload).length > 0),
    orderId: row.order_code || row.id
  };
}

export function mapLeadRow(row: LeadsRow): RevenueReportRegistration {
  return {
    sourceSite: inferSourceSite(row.source),
    productCode: inferProductCodeFromLead(row),
    createdAt: row.created_at ?? "",
    id: row.id
  };
}

async function readOrders(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,order_code,student_name,email,phone,course_slug,course_title,amount,status,payment_method,paid_at,created_at,sepay_transaction_id,sepay_reference_code,sepay_payload,order_items"
    )
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) throw error;
  return ((data ?? []) as OrdersRow[]).map(mapOrderRow);
}

async function readRegistrations(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("leads")
    .select("id,source,created_at")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) throw error;
  return ((data ?? []) as LeadsRow[]).map(mapLeadRow);
}

export async function getRevenueData() {
  const source = dataSource();
  const supabase = createRevenueSupabaseClient();

  if (!supabase) {
    return {
      orders: [] as RevenueReportOrder[],
      registrations: [] as RevenueReportRegistration[],
      status: {
        ok: false,
        source,
        message: "Chưa cấu hình Supabase để đọc dữ liệu doanh thu."
      } satisfies RevenueDataStatus
    };
  }

  try {
    const [orders, registrations] = await Promise.all([readOrders(supabase), readRegistrations(supabase)]);
    return {
      orders,
      registrations,
      status: { ok: true, source } satisfies RevenueDataStatus
    };
  } catch (error) {
    const known = error && typeof error === "object" ? (error as { code?: string; message?: string }) : null;
    return {
      orders: [] as RevenueReportOrder[],
      registrations: [] as RevenueReportRegistration[],
      status: {
        ok: false,
        source,
        message: isMissingTableError(known)
          ? "Chưa tìm thấy bảng orders/leads trong schema Supabase hiện tại."
          : known?.message || "Không đọc được dữ liệu doanh thu."
      } satisfies RevenueDataStatus
    };
  }
}
