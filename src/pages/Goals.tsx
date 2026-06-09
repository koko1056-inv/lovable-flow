import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Target, ChevronRight, ChevronDown, Edit, Trash2, ListChecks, Network, LayoutDashboard, Search, X } from "lucide-react";
import { useGoals, useProjects, useTasks, useInvalidate, useMembers } from "@/hooks/useTaskflowData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTaskDetail } from "@/hooks/useTaskDetail";
import {
  GOAL_STATUS_LABELS,
  GOAL_STATUS_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type Goal,
  type GoalStatus,
  type Task,
  type Project,
  type Member,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { InlineGoalTitle, InlineGoalStatus, InlineGoalProgress, QuickAddTaskToGoal } from "@/components/goals/GoalInlineControls";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function monthLabel(s: string) {
  const [y, m] = s.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

export default function GoalsPage() {
  const { data: goals = [] } = useGoals();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const invalidate = useInvalidate();

  const today = new Date();
  const [month, setMonth] = useState(monthKey(today));
  const [editing, setEditing] = useState<Goal | null>(null);
  const [open, setOpen] = useState(false);
  const [prefillParent, setPrefillParent] = useState<string | null>(null);
  const [prefillProject, setPrefillProject] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const availableMonths = useMemo(() => {
    const set = new Set<string>([month]);
    goals.forEach((g) => set.add(g.month.slice(0, 10)));
    return Array.from(set).sort().reverse();
  }, [goals, month]);

  const monthGoals = useMemo(() => {
    const base = goals.filter((g) => g.month.slice(0, 10) === month);
    const q = search.trim().toLowerCase();
    const matchesAssignee = (g: Goal) => {
      if (assigneeFilter === "all") return true;
      return tasks.some((t) => t.goal_id === g.id && t.assignee_id === assigneeFilter);
    };
    const matchesProject = (g: Goal) => projectFilter === "all" || g.project_id === projectFilter;
    const matchesSearch = (g: Goal) => !q || g.title.toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q);
    // Keep parent ancestors when child matches, so tree stays intact
    const directMatches = base.filter((g) => matchesAssignee(g) && matchesProject(g) && matchesSearch(g));
    if (!q && assigneeFilter === "all" && projectFilter === "all") return base;
    const keep = new Set(directMatches.map((g) => g.id));
    let added = true;
    while (added) {
      added = false;
      for (const g of base) {
        if (keep.has(g.id) && g.parent_goal_id && !keep.has(g.parent_goal_id)) {
          keep.add(g.parent_goal_id);
          added = true;
        }
      }
    }
    return base.filter((g) => keep.has(g.id));
  }, [goals, month, search, assigneeFilter, projectFilter, tasks]);

  const openCreate = (projectId: string | null = null, parentId: string | null = null) => {
    setEditing(null);
    setPrefillParent(parentId);
    setPrefillProject(projectId);
    setOpen(true);
  };
  const openEdit = (g: Goal) => {
    setEditing(g);
    setPrefillParent(g.parent_goal_id);
    setPrefillProject(g.project_id);
    setOpen(true);
  };
  const remove = async (id: string) => {
    if (!confirm("この目標を削除しますか？（紐付けタスクは残ります）")) return;
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate(["goals", "tasks"]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" />事業部目標</h1>
          <p className="text-sm text-muted-foreground">事業部ごとの月次目標とタスクを管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month.slice(0, 7)}
            onChange={(e) => setMonth(`${e.target.value}-01`)}
            className="w-40"
          />
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setPrefillParent(null); setPrefillProject(null); } }}>
            <DialogTrigger asChild>
              <Button onClick={() => openCreate()}><Plus className="h-4 w-4" />目標追加</Button>
            </DialogTrigger>
            {open && (
              <GoalForm
                key={editing?.id || "new"}
                goal={editing}
                defaultMonth={month}
                defaultProjectId={prefillProject}
                defaultParentId={prefillParent}
                goals={goals}
                projects={projects}
                onClose={() => { setOpen(false); setEditing(null); invalidate(["goals"]); }}
              />
            )}
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-3.5 w-3.5 mr-1" />月次ダッシュボード</TabsTrigger>
          <TabsTrigger value="tree"><Network className="h-3.5 w-3.5 mr-1" />樹形図</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <Dashboard
            month={month}
            availableMonths={availableMonths}
            monthGoals={monthGoals}
            projects={projects}
            tasks={tasks}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={remove}
          />
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <TreeView
            month={month}
            goals={monthGoals}
            allGoals={goals}
            projects={projects}
            tasks={tasks}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={remove}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function computeGoalStats(goal: Goal, tasks: Task[]) {
  const linked = tasks.filter((t) => t.goal_id === goal.id);
  const done = linked.filter((t) => t.status === "done").length;
  const pct = goal.progress || (linked.length ? Math.round((done / linked.length) * 100) : 0);
  return { linked, done, pct };
}

function Dashboard({
  month, availableMonths, monthGoals, projects, tasks, onCreate, onEdit, onDelete,
}: {
  month: string;
  availableMonths: string[];
  monthGoals: Goal[];
  projects: Project[];
  tasks: Task[];
  onCreate: (projectId?: string | null, parentId?: string | null) => void;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string | null, Goal[]>();
    monthGoals.forEach((g) => {
      const arr = map.get(g.project_id) || [];
      arr.push(g);
      map.set(g.project_id, arr);
    });
    return map;
  }, [monthGoals]);

  if (monthGoals.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Target className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>{monthLabel(month)}の目標はまだありません</p>
        <Button className="mt-4" onClick={() => onCreate()}><Plus className="h-4 w-4" />目標を追加</Button>
      </Card>
    );
  }

  const orderedProjectIds: (string | null)[] = [
    ...projects.filter((p) => grouped.has(p.id)).map((p) => p.id),
    ...(grouped.has(null) ? [null] : []),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {orderedProjectIds.map((pid) => {
        const project = projects.find((p) => p.id === pid);
        const list = grouped.get(pid) || [];
        const rootGoals = list.filter((g) => !g.parent_goal_id || !list.find((x) => x.id === g.parent_goal_id));
        return (
          <Card key={pid || "none"} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: project?.color || "hsl(var(--muted-foreground))" }} />
                <h3 className="font-semibold">{project?.name || "未分類"}</h3>
                <Badge variant="outline" className="text-[10px]">{list.length}件</Badge>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onCreate(pid, null)}><Plus className="h-3.5 w-3.5" />追加</Button>
            </div>
            <ul className="space-y-2">
              {rootGoals.map((g) => (
                <GoalRow
                  key={g.id} goal={g} depth={0} allInProject={list} tasks={tasks}
                  onCreate={onCreate} onEdit={onEdit} onDelete={onDelete}
                />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function GoalRow({
  goal, depth, allInProject, tasks, onCreate, onEdit, onDelete,
}: {
  goal: Goal; depth: number; allInProject: Goal[]; tasks: Task[];
  onCreate: (projectId?: string | null, parentId?: string | null) => void;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const children = allInProject.filter((g) => g.parent_goal_id === goal.id);
  const { linked, done, pct } = computeGoalStats(goal, tasks);
  return (
    <li>
      <div
        className="rounded-md border bg-card hover:bg-accent/40 transition px-3 py-2 group"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{goal.title}</span>
              <Badge variant="outline" className={cn("text-[10px]", GOAL_STATUS_COLORS[goal.status])}>
                {GOAL_STATUS_LABELS[goal.status]}
              </Badge>
            </div>
            {goal.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {pct}% ({done}/{linked.length})
              </span>
            </div>
          </div>
          <div className="flex opacity-0 group-hover:opacity-100 transition">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreate(goal.project_id, goal.id)} title="子目標を追加">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(goal.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
      {children.length > 0 && (
        <ul className="space-y-2 mt-2">
          {children.map((c) => (
            <GoalRow key={c.id} goal={c} depth={depth + 1} allInProject={allInProject} tasks={tasks}
              onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </li>
  );
}

function TreeView({
  month, goals, projects, tasks, onCreate, onEdit, onDelete,
}: {
  month: string;
  goals: Goal[];
  allGoals: Goal[];
  projects: Project[];
  tasks: Task[];
  onCreate: (projectId?: string | null, parentId?: string | null) => void;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const { open: openTask } = useTaskDetail();
  const grouped = useMemo(() => {
    const map = new Map<string | null, Goal[]>();
    goals.forEach((g) => {
      const arr = map.get(g.project_id) || [];
      arr.push(g);
      map.set(g.project_id, arr);
    });
    return map;
  }, [goals]);

  if (goals.length === 0) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Network className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>{monthLabel(month)}の目標がありません</p>
      </Card>
    );
  }

  const orderedProjectIds: (string | null)[] = [
    ...projects.filter((p) => grouped.has(p.id)).map((p) => p.id),
    ...(grouped.has(null) ? [null] : []),
  ];

  return (
    <div className="space-y-4">
      {orderedProjectIds.map((pid) => {
        const project = projects.find((p) => p.id === pid);
        const list = grouped.get(pid) || [];
        const rootGoals = list.filter((g) => !g.parent_goal_id || !list.find((x) => x.id === g.parent_goal_id));
        return (
          <Card key={pid || "none"} className="p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b">
              <div className="w-3 h-3 rounded" style={{ background: project?.color || "hsl(var(--muted-foreground))" }} />
              <h3 className="font-semibold">{project?.name || "未分類"}</h3>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onCreate(pid, null)}>
                <Plus className="h-3.5 w-3.5" />ルート目標
              </Button>
            </div>
            <div className="space-y-1">
              {rootGoals.map((g) => (
                <TreeNode
                  key={g.id} goal={g} depth={0} allInProject={list} tasks={tasks}
                  onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} onOpenTask={openTask}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TreeNode({
  goal, depth, allInProject, tasks, onCreate, onEdit, onDelete, onOpenTask,
}: {
  goal: Goal; depth: number; allInProject: Goal[]; tasks: Task[];
  onCreate: (projectId?: string | null, parentId?: string | null) => void;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onOpenTask: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allInProject.filter((g) => g.parent_goal_id === goal.id);
  const linked = tasks.filter((t) => t.goal_id === goal.id);
  const done = linked.filter((t) => t.status === "done").length;
  const pct = goal.progress || (linked.length ? Math.round((done / linked.length) * 100) : 0);
  const hasChildren = children.length > 0 || linked.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1.5 group"
        style={{ paddingLeft: depth * 20 }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn("p-0.5 rounded hover:bg-accent", !hasChildren && "invisible")}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <Target className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-medium text-sm truncate">{goal.title}</span>
        <Badge variant="outline" className={cn("text-[10px] ml-1", GOAL_STATUS_COLORS[goal.status])}>
          {GOAL_STATUS_LABELS[goal.status]}
        </Badge>
        <span className="text-[11px] text-muted-foreground ml-1 tabular-nums">{pct}%</span>
        <div className="ml-auto flex opacity-0 group-hover:opacity-100 transition">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCreate(goal.project_id, goal.id)} title="子目標">
            <Plus className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(goal)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(goal.id)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
      {expanded && (
        <>
          {linked.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-1 py-1 text-sm hover:bg-accent/40 rounded cursor-pointer"
              style={{ paddingLeft: depth * 20 + 28 }}
              onClick={() => onOpenTask(t.id)}
            >
              <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className={cn("truncate", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
              <Badge variant="outline" className={cn("text-[10px] ml-1", STATUS_COLORS[t.status])}>
                {STATUS_LABELS[t.status]}
              </Badge>
            </div>
          ))}
          {children.map((c) => (
            <TreeNode
              key={c.id} goal={c} depth={depth + 1} allInProject={allInProject} tasks={tasks}
              onCreate={onCreate} onEdit={onEdit} onDelete={onDelete} onOpenTask={onOpenTask}
            />
          ))}
        </>
      )}
    </div>
  );
}

function GoalForm({
  goal, defaultMonth, defaultProjectId, defaultParentId, goals, projects, onClose,
}: {
  goal: Goal | null;
  defaultMonth: string;
  defaultProjectId: string | null;
  defaultParentId: string | null;
  goals: Goal[];
  projects: Project[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(goal?.title || "");
  const [description, setDescription] = useState(goal?.description || "");
  const [month, setMonth] = useState((goal?.month || defaultMonth).slice(0, 7));
  const [projectId, setProjectId] = useState<string | null>(goal?.project_id ?? defaultProjectId);
  const [parentId, setParentId] = useState<string | null>(goal?.parent_goal_id ?? defaultParentId);
  const [status, setStatus] = useState<GoalStatus>(goal?.status || "not_started");
  const [progress, setProgress] = useState<number>(goal?.progress ?? 0);

  const parentOptions = goals.filter(
    (g) => g.id !== goal?.id && (!projectId || !g.project_id || g.project_id === projectId)
  );

  const save = async () => {
    if (!title.trim()) return toast.error("タイトルを入力してください");
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      month: `${month}-01`,
      project_id: projectId,
      parent_goal_id: parentId,
      status,
      progress,
    };
    const { error } = goal
      ? await supabase.from("goals").update(payload).eq("id", goal.id)
      : await supabase.from("goals").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    onClose();
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{goal ? "目標を編集" : "新規目標"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>タイトル *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>説明</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>対象月</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div>
            <Label>事業部（プロジェクト）</Label>
            <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分類</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>親目標</Label>
            <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="なし" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし（ルート）</SelectItem>
                {parentOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ステータス</Label>
            <Select value={status} onValueChange={(v: GoalStatus) => setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(GOAL_STATUS_LABELS) as GoalStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{GOAL_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>進捗 ({progress}%) <span className="text-xs text-muted-foreground ml-1">※ 0なら紐付けタスクの完了率で自動表示</span></Label>
          <Input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
        </div>
      </div>
      <DialogFooter><Button onClick={save}>保存</Button></DialogFooter>
    </DialogContent>
  );
}
