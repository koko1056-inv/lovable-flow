import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMembers, useProjects, useInvalidate } from "@/hooks/useTaskflowData";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { toast } from "sonner";

export function NewTaskButton({
  defaultStatus = "todo",
  defaultProjectId,
  defaultAssigneeId,
  defaultDueDate,
  variant = "default",
  size = "default",
  label = "新規タスク",
}: {
  defaultStatus?: TaskStatus;
  defaultProjectId?: string | null;
  defaultAssigneeId?: string | null;
  defaultDueDate?: string | null;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const invalidate = useInvalidate();
  const { memberId } = useCurrentMember();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>(defaultAssigneeId || "none");
  const [projectId, setProjectId] = useState<string>(defaultProjectId || "none");
  const [dueDate, setDueDate] = useState<string>(defaultDueDate || "");

  const reset = () => {
    setTitle(""); setDescription(""); setPriority("medium");
    setAssigneeId(defaultAssigneeId || "none");
    setProjectId(defaultProjectId || "none");
    setDueDate(defaultDueDate || "");
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("タイトルを入力してください");
    const { data, error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      status: defaultStatus,
      priority,
      assignee_id: assigneeId === "none" ? null : assigneeId,
      project_id: projectId === "none" ? null : projectId,
      due_date: dueDate || null,
    }).select().single();
    if (error || !data) return toast.error(error?.message || "作成失敗");
    await supabase.from("activity_logs").insert({ task_id: data.id, member_id: memberId, action: "作成" });
    toast.success("タスクを作成しました");
    invalidate(["tasks"]);
    reset(); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Plus className="h-4 w-4" />
          {size !== "icon" && <span>{label}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>新規タスク</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>タイトル *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="必要情報など" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>優先度</Label>
              <Select value={priority} onValueChange={(v: TaskPriority) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">緊急</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>期日</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>担当者</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未割当</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>プロジェクト</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
          <Button onClick={submit}>作成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
