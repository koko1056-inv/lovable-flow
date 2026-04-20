import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, type TaskStatus, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", STATUS_COLORS[status], className)}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", PRIORITY_COLORS[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
