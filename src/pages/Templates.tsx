import { useState } from "react";
import { useTemplates, useMembers, useProjects, useInvalidate } from "@/hooks/useTaskflowData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RecurringTemplate, RecurrenceType, TaskPriority } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/types";

export default function TemplatesPage() {
  const { data: templates = [] } = useTemplates();
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState<RecurringTemplate | null>(null);
  const [open, setOpen] = useState(false);

  const remove = async (id: string) => {
    if (!confirm("テンプレを削除しますか？(過去に生成されたタスクは残ります)")) return;
    const { error } = await supabase.from("recurring_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate(["recurring_templates"]);
  };

  const toggle = async (t: RecurringTemplate) => {
    await supabase.from("recurring_templates").update({ is_active: !t.is_active }).eq("id", t.id);
    invalidate(["recurring_templates"]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Repeat className="h-6 w-6" />繰り返しテンプレ</h1>
          <p className="text-sm text-muted-foreground">毎日 / 毎週 自動でタスクを生成（アプリを開いた時に判定）</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />追加</Button></DialogTrigger>
          <TemplateForm template={editing} onClose={() => { setOpen(false); setEditing(null); invalidate(["recurring_templates"]); }} />
        </Dialog>
      </div>

      <div className="space-y-2">
        {templates.map((t) => (
          <Card key={t.id} className="p-4 flex items-center gap-3">
            <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t.recurrence === "daily" ? "毎日" : `毎週 ${t.weekdays?.map((d) => WEEKDAY_LABELS[d]).join("・") || ""}`}
                {" · 優先度: "}{({low:"低",medium:"中",high:"高",urgent:"緊急"})[t.default_priority]}
                {t.due_offset_days > 0 && ` · 期日: ${t.due_offset_days}日後`}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
        {templates.length === 0 && <Card className="p-8 text-center text-muted-foreground">テンプレートがありません</Card>}
      </div>
    </div>
  );
}

function TemplateForm({ template, onClose }: { template: RecurringTemplate | null; onClose: () => void }) {
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const [title, setTitle] = useState(template?.title || "");
  const [description, setDescription] = useState(template?.description || "");
  const [recurrence, setRecurrence] = useState<RecurrenceType>(template?.recurrence || "daily");
  const [weekdays, setWeekdays] = useState<number[]>(template?.weekdays || [1,2,3,4,5]);
  const [priority, setPriority] = useState<TaskPriority>(template?.default_priority || "medium");
  const [assigneeId, setAssigneeId] = useState(template?.default_assignee_id || "none");
  const [projectId, setProjectId] = useState(template?.default_project_id || "none");
  const [dueOffset, setDueOffset] = useState(template?.due_offset_days || 0);

  const toggleDay = (d: number) => {
    setWeekdays(weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d].sort());
  };

  const save = async () => {
    if (!title.trim()) return toast.error("タイトルを入力してください");
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      recurrence,
      weekdays: recurrence === "weekly" ? weekdays : null,
      default_priority: priority,
      default_assignee_id: assigneeId === "none" ? null : assigneeId,
      default_project_id: projectId === "none" ? null : projectId,
      due_offset_days: dueOffset,
      is_active: true,
    };
    const { error } = template
      ? await supabase.from("recurring_templates").update(payload).eq("id", template.id)
      : await supabase.from("recurring_templates").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{template ? "テンプレ編集" : "新規テンプレ"}</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        <div><Label>タスクタイトル *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><Label>説明</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div>
          <Label>繰り返し</Label>
          <Select value={recurrence} onValueChange={(v: RecurrenceType) => setRecurrence(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">毎日</SelectItem>
              <SelectItem value="weekly">毎週</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {recurrence === "weekly" && (
          <div>
            <Label className="mb-2 block">曜日</Label>
            <div className="flex gap-1.5">
              {WEEKDAY_LABELS.map((l, i) => (
                <button key={i} onClick={() => toggleDay(i)} className={`w-9 h-9 rounded-md text-sm font-medium border ${weekdays.includes(i) ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>{l}</button>
              ))}
            </div>
          </div>
        )}
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
            <Label>期日 (生成日から N日後)</Label>
            <Input type="number" min={0} max={30} value={dueOffset} onChange={(e) => setDueOffset(Number(e.target.value))} />
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
      <DialogFooter><Button onClick={save}>保存</Button></DialogFooter>
    </DialogContent>
  );
}
