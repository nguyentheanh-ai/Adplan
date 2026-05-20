import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  href,
  action
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <Card className="flex min-h-72 flex-col items-center justify-center text-center">
      <div className="mb-5 rounded-2xl bg-surface-container p-4 text-primary">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {href && action ? (
        <Link href={href} className="mt-6">
          <Button variant="ai">{action}</Button>
        </Link>
      ) : null}
    </Card>
  );
}
