import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SetupRequired() {
  return (
    <Card className="border border-amber-200 bg-amber-50 shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-fit rounded-2xl bg-white p-3 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Cần cấu hình Supabase trước</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            App đã dựng xong, nhưng môi trường local chưa có Supabase URL và anon key nên chưa thể tải dashboard dữ liệu thật.
            Tạo file <code className="rounded bg-white px-1 py-0.5">.env.local</code> từ{" "}
            <code className="rounded bg-white px-1 py-0.5">.env.example</code>, điền Supabase và Gemini key, rồi khởi động lại server.
          </p>
        </div>
      </div>
    </Card>
  );
}
