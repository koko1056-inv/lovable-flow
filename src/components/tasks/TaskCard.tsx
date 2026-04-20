import type { Task } from "@/lib/types";
import { useMembers, useProjects, useTaskTags, useTags } from "@/hooks/useTaskflowData";
import { useTaskDetail } from "@/hooks/useTaskDetail";
import { MemberAvatar } from "@/components/MemberAvatar";
import { PriorityBadge } from "@/components/StatusBadge";
import { Calendar, MessageSquare, Paperclip } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

export function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const { data: tags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags();
  const open = useTaskDetail((s) => s.open);

  const assignee = members.find((m) => m.id === task.assignee_id);
  const project = projects.find((p) => p.id === task.project_id);
  const tagIds = taskTags.filter((tt) => tt.task_id === task.id).map((tt) => tt.tag_id);
  const taskTagsList = tags.filter((t) => tagIds.includes(t.id));

  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = due && task.status !== "done" && isPast(due) && !isToday(due);
  const isDueToday = due && isToday(due);

  return (
    <button
      onClick={() => open(task.id)}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-3 hover:shadow-elevated hover:border-primary/40 transition-all group",
        task.status === "done" && "opacity-70",
      )}
    >
      {project && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.color }} />
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {project.name}
          </span>
        </div>
      )}
      <div className={cn("font-medium text-sm leading-snug", task.status === "done" && "line-through text-muted-foreground")}>
        {task.title}
      </div>

      {taskTagsList.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {taskTagsList.slice(0, 3).map((t) => (
            <span key={t.id} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${t.color}20`, color: t.color }}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      {!compact && (
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <PriorityBadge priority={task.priority} />
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  overdue ? "text-destructive font-semibold" : isDueToday ? "text-warning font-semibold" : "text-muted-foreground",
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(due, "M/d")}
              </span>
            )}
          </div>
          <MemberAvatar member={assignee} size="sm" />
        </div>
      )}
    </button>
  );
}
