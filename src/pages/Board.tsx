import { useMemo, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { useTasks } from "@/hooks/useTaskflowData";
import { TaskCard } from "@/components/tasks/TaskCard";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { STATUS_LABELS, STATUS_ORDER, type TaskStatus, type Task } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMembers, useProjects } from "@/hooks/useTaskflowData";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PRIORITY_LABELS } from "@/lib/types";

export default function BoardPage() {
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const qc = useQueryClient();
  const { memberId } = useCurrentMember();
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const exportCsv = () => {
    const filtered = tasks.filter((t) => {
      if (t.parent_task_id) return false;
      if (assigneeFilter === "me") return t.assignee_id === memberId;
      if (assigneeFilter !== "all") return t.assignee_id === assigneeFilter;
      return true;
    });
    const memberMap = new Map(members.map((m) => [m.id, m.name]));
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const headers = ["タイトル", "ステータス", "優先度", "担当者", "プロジェクト", "期日", "期限時刻", "進捗(%)", "説明", "作成日", "完了日"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = STATUS_ORDER.flatMap((s) =>
      filtered
        .filter((t) => t.status === s)
        .map((t) => [
          t.title,
          STATUS_LABELS[t.status],
          PRIORITY_LABELS[t.priority],
          t.assignee_id ? memberMap.get(t.assignee_id) ?? "" : "",
          t.project_id ? projectMap.get(t.project_id) ?? "" : "",
          t.due_date ?? "",
          t.due_time ?? "",
          t.progress,
          t.description ?? "",
          t.created_at ? new Date(t.created_at).toLocaleString("ja-JP") : "",
          t.completed_at ? new Date(t.completed_at).toLocaleString("ja-JP") : "",
        ]),
    );
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanban_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length}件のタスクをCSVに出力しました`);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (t.parent_task_id) return false; // hide subtasks at top level
      if (assigneeFilter === "me") return t.assignee_id === memberId;
      if (assigneeFilter !== "all") return t.assignee_id === assigneeFilter;
      return true;
    });
    return STATUS_ORDER.reduce((acc, s) => {
      acc[s] = filtered.filter((t) => t.status === s);
      return acc;
    }, {} as Record<TaskStatus, Task[]>);
  }, [tasks, assigneeFilter, memberId]);

  const onDragEnd = async (e: DragEndEvent) => {
    const taskId = e.active.id as string;
    const newStatus = e.over?.id as TaskStatus | undefined;
    if (!newStatus) return;
    const t = tasks.find((tt) => tt.id === taskId);
    if (!t || t.status === newStatus) return;
    const { error } = await supabase.from("tasks").update({
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
      progress: newStatus === "done" ? 100 : t.progress,
    }).eq("id", taskId);
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ task_id: taskId, member_id: memberId, action: "ステータス変更", details: { from: t.status, to: newStatus } });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">カンバン</h1>
          <p className="text-sm text-muted-foreground">ドラッグ&ドロップでステータスを変更</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全担当者</SelectItem>
              {memberId && <SelectItem value="me">自分のみ</SelectItem>}
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <NewTaskButton />
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_ORDER.map((status) => (
            <Column key={status} status={status} tasks={grouped[status]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-muted/30 p-3 min-h-[300px] transition ${isOver ? "ring-2 ring-primary/50 bg-accent-soft/40" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-status-${status === "in_progress" ? "progress" : status}`} />
          <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
          <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded">{tasks.length}</span>
        </div>
        <NewTaskButton defaultStatus={status} variant="ghost" size="icon" label="" />
      </div>
      <div className="space-y-2">
        {tasks.map((t) => <DraggableCard key={t.id} task={t} />)}
      </div>
    </div>
  );
}

function DraggableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} />
    </div>
  );
}
