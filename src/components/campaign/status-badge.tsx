import { Badge } from "@/components/ui/badge";
import { STATUS_META, type CampaignStatus } from "@/lib/campaign/history";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", meta.className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}
