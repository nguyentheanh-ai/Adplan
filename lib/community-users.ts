import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cleanEnvValue } from "@/lib/env";
import {
  buildCommunityUsers,
  type CommunityLeadRow,
  type CommunityOrderRow,
  type CommunityUser,
  type CommunityUsersSummary
} from "@/lib/community-users-core";

export type { CommunityUser, CommunityUsersSummary };

export type CommunityUsersDataStatus = {
  ok: boolean;
  source: "revenue-report-supabase" | "shared-supabase";
  message?: string;
};

export type CommunityUsersResult = {
  users: CommunityUser[];
  summary: CommunityUsersSummary;
  status: CommunityUsersDataStatus;
};

function createWebsiteSupabaseClient() {
  const url = cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_URL) || cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey =
    cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_SERVICE_ROLE_KEY) || cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function dataSource(): CommunityUsersDataStatus["source"] {
  return cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_URL) || cleanEnvValue(process.env.REVENUE_REPORT_SUPABASE_SERVICE_ROLE_KEY)
    ? "revenue-report-supabase"
    : "shared-supabase";
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || String(error?.message || "").toLowerCase().includes("could not find the table");
}

export async function loadCommunityUsers(): Promise<CommunityUsersResult> {
  const source = dataSource();
  const supabase = createWebsiteSupabaseClient();

  if (!supabase) {
    const empty = buildCommunityUsers({ orders: [], leads: [] });
    return {
      ...empty,
      status: {
        ok: false,
        source,
        message: "Chua cau hinh Supabase website de doc community users."
      }
    };
  }

  try {
    const [ordersResult, leadsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id,order_code,student_name,email,phone,course_slug,course_title,amount,status,paid_at,created_at,order_items")
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase.from("leads").select("id,name,phone,email,source,created_at").order("created_at", { ascending: false }).limit(10000)
    ]);

    if (ordersResult.error) throw ordersResult.error;
    if (leadsResult.error) throw leadsResult.error;

    const built = buildCommunityUsers({
      orders: (ordersResult.data ?? []) as CommunityOrderRow[],
      leads: (leadsResult.data ?? []) as CommunityLeadRow[]
    });

    return {
      ...built,
      status: {
        ok: true,
        source
      }
    };
  } catch (error) {
    const known = error && typeof error === "object" ? (error as { code?: string; message?: string }) : null;
    const empty = buildCommunityUsers({ orders: [], leads: [] });
    return {
      ...empty,
      status: {
        ok: false,
        source,
        message: isMissingTableError(known) ? "Chua tim thay bang orders/leads trong Supabase website." : known?.message || "Khong doc duoc community users."
      }
    };
  }
}
