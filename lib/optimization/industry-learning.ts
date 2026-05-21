export type IndustryLearningInput = {
  objective: string;
  ctr: number;
  cpc: number;
  cpm: number;
  costPerResult: number;
  messages: number;
  leads: number;
};

export type IndustryLearningProfileDraft = {
  industryKey: string;
  objective: string;
  sampleSize: number;
  medianCtr: number | null;
  medianCpc: number | null;
  medianCpm: number | null;
  medianCpl: number | null;
  medianCostPerMessage: number | null;
  winningPatterns: Record<string, unknown>;
  losingPatterns: Record<string, unknown>;
};

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function median(values: number[]) {
  const rows = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!rows.length) return null;
  const middle = Math.floor(rows.length / 2);
  if (rows.length % 2) return rows[middle] ?? null;
  return ((rows[middle - 1] ?? 0) + (rows[middle] ?? 0)) / 2;
}

export function buildIndustryLearningProfiles(
  industryKey: string,
  rows: IndustryLearningInput[]
): IndustryLearningProfileDraft[] {
  const groups = new Map<string, IndustryLearningInput[]>();
  for (const row of rows) {
    const objective = row.objective || "UNKNOWN";
    groups.set(objective, [...(groups.get(objective) ?? []), row]);
  }

  return [...groups.entries()].map(([objective, items]) => {
    const withResult = items.filter((item) => numeric(item.leads) + numeric(item.messages) > 0);
    const poor = items.filter((item) => numeric(item.ctr) > 0 && numeric(item.ctr) < 1);

    return {
      industryKey,
      objective,
      sampleSize: items.length,
      medianCtr: median(items.map((item) => numeric(item.ctr))),
      medianCpc: median(items.map((item) => numeric(item.cpc))),
      medianCpm: median(items.map((item) => numeric(item.cpm))),
      medianCpl: median(items.filter((item) => numeric(item.leads) > 0).map((item) => numeric(item.costPerResult))),
      medianCostPerMessage: median(items.filter((item) => numeric(item.messages) > 0).map((item) => numeric(item.costPerResult))),
      winningPatterns: {
        result_sample_size: withResult.length,
        top_objective: objective,
        note: withResult.length >= 5 ? "Có đủ mẫu ban đầu để so sánh mặt bằng." : "Cần thêm dữ liệu để kết luận chắc hơn."
      },
      losingPatterns: {
        low_ctr_sample_size: poor.length,
        note: poor.length ? "Một số campaign có CTR thấp, nên ưu tiên kiểm tra hook/creative." : "Chưa thấy mẫu CTR thấp rõ ràng."
      }
    };
  });
}
