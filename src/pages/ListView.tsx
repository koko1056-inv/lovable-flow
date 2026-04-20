import { useMemo, useState } from "react";
import { useTasks, useMembers, useProjects, useTags, useTaskTags } from "@/hooks/useTaskflowData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useTaskDetail } from "@/hooks/useTaskDetail";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { STATUS_ORDER, type TaskStatus, PRIORITY_ORDER } from "@/lib/types";

export default function ListPage() {
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const { data: tags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags();
  const open = useTaskDetail((s) => s.open);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [project, setProject] = useState<string>("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (t.parent_task_id) return false;
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (status !== "all" && t.status !== status) return false;
      if (assignee !== "all" && t.assignee_id !== assignee) return false;
      if (project !== "all" && t.project_id !== project) return false;
      return true;
    }).sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pd !== 0) return pd;
      return (a.due_date || "9999").localeCompare(b.due_date || "9999");
    });
  }, [tasks, q, status, assignee, project]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">タスク一覧</h1>
        <NewTaskButton />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="検索..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ステータス</SelectItem>
            {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{({todo:"未着手",in_progress:"進行中",review:"レビュー",done:"完了"})[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全担当者</SelectItem>
            {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全プロジェクト</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead className="w-[110px]">ステータス</TableHead>
              <TableHead className="w-[80px]">優先度</TableHead>
              <TableHead className="w-[140px]">プロジェクト</TableHead>
              <TableHead className="w-[100px]">期日</TableHead>
              <TableHead className="w-[120px]">担当者</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">該当タスクなし</TableCell></TableRow>
            )}
            {filtered.map((t) => {
              const m = members.find((mm) => mm.id === t.assignee_id);
              const p = projects.find((pp) => pp.id === t.project_id);
              return (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => open(t.id)}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                  <TableCell>
                    {p && <span className="inline-flex items-center gap-1.5 text-sm"><span className="w-2 h-2 rounded-full" style={{background: p.color}} />{p.name}</span>}
                  </TableCell>
                  <TableCell className="text-sm">{t.due_date ? format(new Date(t.due_date), "M/d") : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2"><MemberAvatar member={m} size="sm" /><span className="text-sm truncate">{m?.name || "-"}</span></div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} 件表示</div>
    </div>
  );
}
