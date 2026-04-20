import { useMemo, useState } from "react";
import { useTasks, useMembers } from "@/hooks/useTaskflowData";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { TaskCard } from "@/components/tasks/TaskCard";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, type TaskStatus, PRIORITY_ORDER } from "@/lib/types";
import { CheckCircle2, Clock, AlertCircle, Calendar } from "lucide-react";

export default function MyTasksPage() {
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const { memberId, setMemberId } = useCurrentMember();
  const [filter, setFilter] = useState<"all" | "today" | "overdue" | "upcoming">("all");

  const myTasks = useMemo(() => {
    if (!memberId) return [];
    let arr = tasks.filter((t) => t.assignee_id === memberId && t.status !== "done");
    const todayStr = new Date().toISOString().slice(0, 10);
    if (filter === "today") arr = arr.filter((t) => t.due_date === todayStr);
    else if (filter === "overdue") arr = arr.filter((t) => t.due_date && t.due_date < todayStr);
    else if (filter === "upcoming") arr = arr.filter((t) => t.due_date && t.due_date > todayStr);
    return arr.sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pd !== 0) return pd;
      return (a.due_date || "9999").localeCompare(b.due_date || "9999");
    });
  }, [tasks, memberId, filter]);

  const stats = useMemo(() => {
    if (!memberId) return { total: 0, today: 0, overdue: 0, done: 0 };
    const mine = tasks.filter((t) => t.assignee_id === memberId);
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      total: mine.filter((t) => t.status !== "done").length,
      today: mine.filter((t) => t.status !== "done" && t.due_date === todayStr).length,
      overdue: mine.filter((t) => t.status !== "done" && t.due_date && t.due_date < todayStr).length,
      done: mine.filter((t) => t.status === "done").length,
    };
  }, [tasks, memberId]);

  if (!memberId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">ようこそ MGC TaskFlow へ</h2>
          <p className="text-muted-foreground mb-6">あなたの担当タスクを表示するには、まずメンバーを選択してください。</p>
          <Select onValueChange={setMemberId}>
            <SelectTrigger className="max-w-xs mx-auto"><SelectValue placeholder="メンバーを選択" /></SelectTrigger>
            <SelectContent>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              メンバーがまだ登録されていません。サイドバーの「メンバー」から追加してください。
            </p>
          )}
        </Card>
      </div>
    );
  }

  const me = members.find((m) => m.id === memberId);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{me?.name} さんのタスク</h1>
          <p className="text-sm text-muted-foreground">本日 {new Date().toLocaleDateString("ja-JP", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <NewTaskButton defaultAssigneeId={memberId} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="未完了" value={stats.total} icon={Clock} color="text-status-progress" onClick={() => setFilter("all")} active={filter === "all"} />
        <StatCard label="今日が期限" value={stats.today} icon={Calendar} color="text-warning" onClick={() => setFilter("today")} active={filter === "today"} />
        <StatCard label="期限超過" value={stats.overdue} icon={AlertCircle} color="text-destructive" onClick={() => setFilter("overdue")} active={filter === "overdue"} />
        <StatCard label="今後" value={tasks.filter(t => t.assignee_id === memberId && t.status !== "done" && t.due_date && t.due_date > new Date().toISOString().slice(0,10)).length} icon={CheckCircle2} color="text-status-done" onClick={() => setFilter("upcoming")} active={filter === "upcoming"} />
      </div>

      <div className="space-y-2">
        {myTasks.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-status-done" />
            <p>このフィルタに該当するタスクはありません 🎉</p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {myTasks.map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, onClick, active }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border bg-card text-left transition-all hover:shadow-elevated ${active ? "border-primary ring-2 ring-primary/20" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </button>
  );
}
