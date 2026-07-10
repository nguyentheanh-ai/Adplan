import { toNumber } from "@/lib/revenue-report";

export type CommunityOrderRow = {
  id: string;
  order_code: string | null;
  student_name: string | null;
  email: string | null;
  phone: string | null;
  course_slug: string | null;
  course_title: string | null;
  amount: string | number | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  order_items?: Array<{ title?: string; slug?: string; price?: number }> | null;
};

export type CommunityLeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  created_at: string | null;
};

export type CommunityUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: "order" | "lead" | "order+lead";
  status: "paid" | "pending" | "lead";
  paidOrderCount: number;
  pendingOrderCount: number;
  failedOrderCount: number;
  leadCount: number;
  paidRevenue: number;
  products: string[];
  orderCodes: string[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export type CommunityUsersSummary = {
  total: number;
  paidUsers: number;
  pendingUsers: number;
  leadOnlyUsers: number;
  paidRevenue: number;
  products: string[];
};

function normalizeEmail(email?: string | null) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone?: string | null) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function contactKey(input: { email?: string | null; phone?: string | null; name?: string | null }) {
  const email = normalizeEmail(input.email);
  if (email) return `email:${email}`;

  const phone = normalizePhone(input.phone);
  if (phone) return `phone:${phone}`;

  return `name:${normalizeText(input.name).toLowerCase() || "unknown"}`;
}

function earlierDate(current: string, next: string) {
  if (!current) return next;
  if (!next) return current;
  return next.localeCompare(current) < 0 ? next : current;
}

function laterDate(current: string, next: string) {
  if (!current) return next;
  if (!next) return current;
  return next.localeCompare(current) > 0 ? next : current;
}

function orderProducts(order: CommunityOrderRow) {
  const itemProducts = (order.order_items ?? []).flatMap((item) => [item.title, item.slug]).map(normalizeText).filter(Boolean);
  return Array.from(new Set([...itemProducts, normalizeText(order.course_title), normalizeText(order.course_slug)].filter(Boolean)));
}

function emptyCommunityUser(seed: { id: string; name?: string | null; email?: string | null; phone?: string | null; seenAt?: string | null }): CommunityUser {
  return {
    id: seed.id,
    name: normalizeText(seed.name),
    email: normalizeEmail(seed.email),
    phone: normalizeText(seed.phone),
    source: "lead",
    status: "lead",
    paidOrderCount: 0,
    pendingOrderCount: 0,
    failedOrderCount: 0,
    leadCount: 0,
    paidRevenue: 0,
    products: [],
    orderCodes: [],
    firstSeenAt: normalizeText(seed.seenAt),
    lastSeenAt: normalizeText(seed.seenAt)
  };
}

function mergeUnique(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next].map(normalizeText).filter(Boolean)));
}

function applyOrder(user: CommunityUser, order: CommunityOrderRow) {
  user.name ||= normalizeText(order.student_name);
  user.email ||= normalizeEmail(order.email);
  user.phone ||= normalizeText(order.phone);
  user.source = user.source === "lead" ? "order+lead" : "order";
  user.products = mergeUnique(user.products, orderProducts(order));
  user.orderCodes = mergeUnique(user.orderCodes, [order.order_code || order.id]);

  const seenAt = normalizeText(order.paid_at || order.created_at);
  user.firstSeenAt = earlierDate(user.firstSeenAt, seenAt);
  user.lastSeenAt = laterDate(user.lastSeenAt, seenAt);

  const status = normalizeText(order.status).toLowerCase();
  if (status === "paid") {
    user.paidOrderCount += 1;
    user.paidRevenue += toNumber(order.amount);
  } else if (["failed", "cancelled", "canceled", "refunded", "expired"].includes(status)) {
    user.failedOrderCount += 1;
  } else {
    user.pendingOrderCount += 1;
  }

  if (user.paidOrderCount > 0) user.status = "paid";
  else if (user.pendingOrderCount > 0) user.status = "pending";
}

function applyLead(user: CommunityUser, lead: CommunityLeadRow) {
  user.name ||= normalizeText(lead.name);
  user.email ||= normalizeEmail(lead.email);
  user.phone ||= normalizeText(lead.phone);
  user.leadCount += 1;
  user.source = user.source === "order" ? "order+lead" : user.source;
  user.firstSeenAt = earlierDate(user.firstSeenAt, normalizeText(lead.created_at));
  user.lastSeenAt = laterDate(user.lastSeenAt, normalizeText(lead.created_at));
}

export function buildCommunityUsers({ orders, leads }: { orders: CommunityOrderRow[]; leads: CommunityLeadRow[] }) {
  const users = new Map<string, CommunityUser>();

  for (const order of orders) {
    const key = contactKey({ email: order.email, phone: order.phone, name: order.student_name });
    const current =
      users.get(key) ??
      emptyCommunityUser({
        id: key,
        name: order.student_name,
        email: order.email,
        phone: order.phone,
        seenAt: order.created_at
      });
    applyOrder(current, order);
    users.set(key, current);
  }

  for (const lead of leads) {
    const key = contactKey({ email: lead.email, phone: lead.phone, name: lead.name });
    const current =
      users.get(key) ??
      emptyCommunityUser({
        id: key,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        seenAt: lead.created_at
      });
    applyLead(current, lead);
    users.set(key, current);
  }

  const rows = Array.from(users.values()).sort((a, b) => (b.lastSeenAt || "").localeCompare(a.lastSeenAt || ""));
  return {
    users: rows,
    summary: {
      total: rows.length,
      paidUsers: rows.filter((user) => user.status === "paid").length,
      pendingUsers: rows.filter((user) => user.status === "pending").length,
      leadOnlyUsers: rows.filter((user) => user.status === "lead").length,
      paidRevenue: rows.reduce((total, user) => total + user.paidRevenue, 0),
      products: Array.from(new Set(rows.flatMap((user) => user.products))).sort()
    } satisfies CommunityUsersSummary
  };
}
