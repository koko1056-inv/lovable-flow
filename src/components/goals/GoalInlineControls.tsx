import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidate, useTasks } from "@/hooks/useTaskflowData";
import { GOAL_STATUS_LABELS, GOAL_STATUS_COLORS, type GoalStatus, type Goal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function InlineGoalTitle({ goal }: { goal: Goal }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal.title);
  const invalidate = useInvalidate();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(goal.title), [goal.title]);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const save = async () => {
    setEditing(false);
    if (value.trim() && value !== goal.title) {
      const { error } = await supabase.from("goals").update({ title: value.trim() }).eq("id", goal.id);
      if (error) return toast.error(error.message);
      invalidate(["goals"]);
    } else {
      setValue(goal.title);
    }
  };

  if (editing) {
    return (
      <Input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setValue(goal.title); setEditing(false); } }}
        className="h-7 px-2 py-0 text-sm font-medium"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span
      className="font-medium text-sm cursor-text hover:bg-accent/50 rounded px-1 -mx-1"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="クリックで編集"
    >
      {goal.title}
    </span>
  );
}

export function InlineGoalStatus({ goal }: { goal: Goal }) {
  const invalidate = useInvalidate();
  const change = async (v: GoalStatus) => {
    const { error } = await supabase.from("goals").update({ status: v }).eq("id", goal.id);
    if (error) return toast.error(error.message);
    invalidate(["goals"]);
  };
  return (
    <Select value={goal.status} onValueChange={(v: GoalStatus) => change(v)}>
      <SelectTrigger className={cn(
        "h-5 px-1.5 py-0 border text-[10px] gap-1 w-auto rounded-md focus:ring-0",
        GOAL_STATUS_COLORS[goal.status],
      )}>
        <SelectValue>{GOAL_STATUS_LABELS[goal.status]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(GOAL_STATUS_LABELS) as GoalStatus[]).map((s) => (
          <SelectItem key={s} value={s}>{GOAL_STATUS_LABELS[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InlineGoalProgress({ goal, pct }: { goal: Goal; pct: number }) {
  const [value, setValue] = useState(goal.progress);
  const invalidate = useInvalidate();
  useEffect(() => setValue(goal.progress), [goal.progress]);

  const save = async () => {
    if (value === goal.progress) return;
    const { error } = await supabase.from("goals").update({ progress: value }).eq("id", goal.id);
    if (error) return toast.error(error.message);
    invalidate(["goals"]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-[11px] text-muted-foreground tabular-nums hover:text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
          {pct}%{goal.progress > 0 && <span className="ml-0.5 text-primary">●</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="flex justify-between text-xs"><span>手動進捗</span><span className="tabular-nums">{value}%</span></div>
          <Input type="range" min={0} max={100} step={5} value={value}
            onChange={(e) => setValue(Number(e.target.value))} onMouseUp={save} onTouchEnd={save} />
          <p className="text-[10px] text-muted-foreground">0%なら紐付けタスクの完了率を自動表示</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function QuickAddTaskToGoal({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [linkTaskId, setLinkTaskId] = useState<string>("");
  const { data: tasks = [] } = useTasks();
  const invalidate = useInvalidate();

  const unlinkedSameProject = tasks.filter((t) => !t.goal_id && !t.parent_task_id && (!goal.project_id || t.project_id === goal.project_id));

  const create = async () => {
    if (!title.trim()) return toast.error("タイトルを入力してください");
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      goal_id: goal.id,
      project_id: goal.project_id,
      status: "todo",
      priority: "medium",
    });
    if (error) return toast.error(error.message);
    toast.success("タスクを追加しました");
    setTitle("");
    invalidate(["tasks"]);
    setOpen(false);
  };

  const linkExisting = async () => {
    if (!linkTaskId) return;
    const { error } = await supabase.from("tasks").update({ goal_id: goal.id }).eq("id", linkTaskId);
    if (error) return toast.error(error.message);
    toast.success("紐付けました");
    setLinkTaskId("");
    invalidate(["tasks"]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="タスク追加・紐付け" onClick={(e) => e.stopPropagation()}>
          <Link2 className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-xs font-semibold mb-1.5">新規タスクを追加</div>
          <div className="flex gap-1.5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タイトル"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && create()}
              autoFocus
            />
            <Button size="icon" className="h-8 w-8" onClick={create}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div className="border-t pt-2.5">
          <div className="text-xs font-semibold mb-1.5">既存タスクを紐付け</div>
          {unlinkedSameProject.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">紐付け可能なタスクなし</p>
          ) : (
            <div className="flex gap-1.5">
              <Select value={linkTaskId} onValueChange={setLinkTaskId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="タスクを選択..." /></SelectTrigger>
                <SelectContent>
                  {unlinkedSameProject.slice(0, 50).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={linkExisting} disabled={!linkTaskId}>OK</Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
