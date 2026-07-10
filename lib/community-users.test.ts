import { describe, expect, it } from "vitest";
import { buildCommunityUsers } from "@/lib/community-users-core";

describe("community users", () => {
  it("builds website community users from orders and leads without duplicating contacts", () => {
    const result = buildCommunityUsers({
      orders: [
        {
          id: "order-1",
          order_code: "TAM1",
          student_name: "Nguyen Van A",
          email: "Student@Example.com",
          phone: "0901000001",
          course_slug: "facebook-ads-2026",
          course_title: "Facebook Ads Master 2026",
          amount: 799000,
          status: "paid",
          paid_at: "2026-06-04T01:00:00.000Z",
          created_at: "2026-06-04T00:00:00.000Z",
          order_items: null
        },
        {
          id: "order-2",
          order_code: "TAM2",
          student_name: "Nguyen Van A",
          email: "student@example.com",
          phone: "0901000001",
          course_slug: "ai-master-x10-hieu-suat",
          course_title: "AI Master X10",
          amount: 399000,
          status: "pending",
          paid_at: null,
          created_at: "2026-06-05T00:00:00.000Z",
          order_items: null
        }
      ],
      leads: [
        {
          id: "lead-1",
          name: "Nguyen Van A",
          email: "student@example.com",
          phone: "0901000001",
          source: "website",
          created_at: "2026-06-03T00:00:00.000Z"
        },
        {
          id: "lead-2",
          name: "Tran Van B",
          email: "",
          phone: "0902000002",
          source: "website",
          created_at: "2026-06-02T00:00:00.000Z"
        }
      ]
    });

    expect(result.summary.total).toBe(2);
    expect(result.summary.paidUsers).toBe(1);
    expect(result.summary.pendingUsers).toBe(0);
    expect(result.summary.leadOnlyUsers).toBe(1);
    expect(result.summary.paidRevenue).toBe(799000);

    const paidUser = result.users.find((user) => user.email === "student@example.com");
    expect(paidUser).toMatchObject({
      status: "paid",
      paidOrderCount: 1,
      pendingOrderCount: 1,
      leadCount: 1,
      source: "order+lead"
    });
    expect(paidUser?.products).toEqual(expect.arrayContaining(["Facebook Ads Master 2026", "AI Master X10"]));
  });
});
