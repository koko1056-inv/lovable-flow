import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useTaskDetail } from "@/hooks/useTaskDetail";
import { useTasks, useMembers, useProjects, useTags, useTaskTags } from "@/hooks/useTaskflowData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { MemberAvatar } from "@/components/MemberAvatar";
import { STATUS_LABELS, STATUS_ORDER, PRIORITY_LABELS, type TaskStatus, type TaskPriority, type Task } from "@/lib/types";
import { Trash2, Plus, Paperclip, MessageSquare, Activity, ListChecks, Download, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export function TaskDetailSheet() {
  const { openTaskId, close } = useTaskDetail();
  const { data: tasks = [] } = useTasks();
  const task = tasks.find((t) => t.id === openTaskId);

  return (
    <Sheet open={!!openTaskId} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        {task ? <TaskDetailContent task={task} onClose={close} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function TaskDetailContent({ task, onClose }: { task: Task; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const { data: tags = [] } = useTags();
  const { data: taskTags = [] } = useTaskTags();
  const { memberId } = useCurrentMember();
  const { data: tasks = [] } = useTasks();

  const [draft, setDraft] = useState(task);
  useEffect(() => setDraft(task), [task.id]);

  const subtasks = tasks.filter((t) => t.parent_task_id === task.id);
  const taskTagIds = taskTags.filter((tt) => tt.task_id === task.id).map((tt) => tt.tag_id);

  const update = async (updates: Partial<Task>, log?: { action: string; details?: any }) => {
    const { error } = await supabase.from("tasks").update(updates).eq("id", task.id);
    if (error) return toast.error(error.message);
    if (log) {
      await supabase.from("activity_logs").insert({
        task_id: task.id,
        member_id: memberId,
        action: log.action,
        details: log.details,
      });
      qc.invalidateQueries({ queryKey: ["activity_logs", task.id] });
    }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const saveBasics = async () => {
    const changes: Partial<Task> = {};
    if (draft.title !== task.title) changes.title = draft.title;
    if (draft.description !== task.description) changes.description = draft.description;
    if (draft.due_date !== task.due_date) changes.due_date = draft.due_date;
    if (draft.progress !== task.progress) changes.progress = draft.progress;
    if (Object.keys(changes).length === 0) return;
    await update(changes, { action: "編集", details: changes });
    toast.success("保存しました");
  };

  const handleDelete = async () => {
    if (!confirm("このタスクを削除しますか？")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    toast.success("削除しました");
    onClose();
  };

  const toggleTag = async (tagId: string) => {
    if (taskTagIds.includes(tagId)) {
      await supabase.from("task_tags").delete().eq("task_id", task.id).eq("tag_id", tagId);
    } else {
      await supabase.from("task_tags").insert({ task_id: task.id, tag_id: tagId });
    }
    qc.invalidateQueries({ queryKey: ["task_tags"] });
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-5 border-b sticky top-0 bg-card z-10">
        <div className="flex items-start justify-between gap-3">
          <SheetTitle className="text-left flex-1">
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={saveBasics}
              className="text-lg font-semibold border-0 px-0 h-auto focus-visible:ring-0 shadow-none"
            />
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </SheetHeader>

      <div className="p-5 space-y-4 border-b">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">ステータス</Label>
            <Select
              value={draft.status}
              onValueChange={(v: TaskStatus) => {
                setDraft({ ...draft, status: v });
                update(
                  { status: v, completed_at: v === "done" ? new Date().toISOString() : null },
                  { action: "ステータス変更", details: { from: task.status, to: v } },
                );
              }}
            >
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">優先度</Label>
            <Select
              value={draft.priority}
              onValueChange={(v: TaskPriority) => {
                setDraft({ ...draft, priority: v });
                update({ priority: v }, { action: "優先度変更", details: { from: task.priority, to: v } });
              }}
            >
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["urgent","high","medium","low"] as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">担当者</Label>
            <Select
              value={draft.assignee_id || "none"}
              onValueChange={(v) => {
                const newId = v === "none" ? null : v;
                setDraft({ ...draft, assignee_id: newId });
                update({ assignee_id: newId }, { action: "担当者変更" });
              }}
            >
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="未割当" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未割当</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">プロジェクト</Label>
            <Select
              value={draft.project_id || "none"}
              onValueChange={(v) => {
                const newId = v === "none" ? null : v;
                setDraft({ ...draft, project_id: newId });
                update({ project_id: newId }, { action: "プロジェクト変更" });
              }}
            >
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="なし" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">期日</Label>
            <Input
              type="date"
              value={draft.due_date || ""}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })}
              onBlur={saveBasics}
              className="h-9 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">進捗 ({draft.progress}%)</Label>
            <Input
              type="range" min={0} max={100} step={5}
              value={draft.progress}
              onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
              onMouseUp={saveBasics} onTouchEnd={saveBasics}
              className="h-9 mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">説明</Label>
          <Textarea
            value={draft.description || ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            onBlur={saveBasics}
            placeholder="必要情報や詳細を記入..."
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">タグ</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const active = taskTagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className="px-2 py-0.5 rounded-md text-xs font-medium border transition"
                  style={{
                    backgroundColor: active ? t.color : "transparent",
                    color: active ? "white" : t.color,
                    borderColor: t.color,
                  }}
                >
                  {t.name}
                </button>
              );
            })}
            {tags.length === 0 && <span className="text-xs text-muted-foreground">タグ管理画面で作成してください</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="subtasks" className="flex-1">
        <TabsList className="mx-5 mt-4">
          <TabsTrigger value="subtasks"><ListChecks className="h-3.5 w-3.5 mr-1" />サブ ({subtasks.length})</TabsTrigger>
          <TabsTrigger value="comments"><MessageSquare className="h-3.5 w-3.5 mr-1" />コメント</TabsTrigger>
          <TabsTrigger value="files"><Paperclip className="h-3.5 w-3.5 mr-1" />添付</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-3.5 w-3.5 mr-1" />活動</TabsTrigger>
        </TabsList>
        <TabsContent value="subtasks" className="p-5"><Subtasks parent={task} subtasks={subtasks} /></TabsContent>
        <TabsContent value="comments" className="p-5"><Comments task={task} /></TabsContent>
        <TabsContent value="files" className="p-5"><Attachments task={task} /></TabsContent>
        <TabsContent value="activity" className="p-5"><ActivityLog task={task} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Subtasks({ parent, subtasks }: { parent: Task; subtasks: Task[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const { memberId } = useCurrentMember();

  const add = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      parent_task_id: parent.id,
      project_id: parent.project_id,
      assignee_id: parent.assignee_id,
      status: "todo",
      priority: "medium",
    });
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ task_id: parent.id, member_id: memberId, action: "サブタスク追加", details: { title } });
    setTitle("");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const toggle = async (st: Task) => {
    const newStatus: TaskStatus = st.status === "done" ? "todo" : "done";
    await supabase.from("tasks").update({
      status: newStatus,
      progress: newStatus === "done" ? 100 : 0,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    }).eq("id", st.id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const remove = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const completed = subtasks.filter((s) => s.status === "done").length;
  const pct = subtasks.length ? Math.round((completed / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {subtasks.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>進捗</span><span>{completed}/{subtasks.length}</span>
          </div>
          <Progress value={pct} />
        </div>
      )}
      <ul className="space-y-1.5">
        {subtasks.map((st) => (
          <li key={st.id} className="flex items-center gap-2 group">
            <input type="checkbox" checked={st.status === "done"} onChange={() => toggle(st)} className="w-4 h-4 accent-primary" />
            <span className={`flex-1 text-sm ${st.status === "done" ? "line-through text-muted-foreground" : ""}`}>{st.title}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => remove(st.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="サブタスクを追加..." onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} size="icon"><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function Comments({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { memberId } = useCurrentMember();
  const { data: members = [] } = useMembers();
  const { data: comments = [] } = useQuery({
    queryKey: ["task_comments", task.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_comments").select("*").eq("task_id", task.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [text, setText] = useState("");

  const post = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from("task_comments").insert({ task_id: task.id, member_id: memberId, content: text.trim() });
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ task_id: task.id, member_id: memberId, action: "コメント投稿" });
    setText("");
    qc.invalidateQueries({ queryKey: ["task_comments", task.id] });
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {comments.length === 0 && <li className="text-sm text-muted-foreground text-center py-4">コメントはまだありません</li>}
        {comments.map((c: any) => {
          const m = members.find((mm) => mm.id === c.member_id);
          return (
            <li key={c.id} className="flex gap-2.5">
              <MemberAvatar member={m} size="sm" />
              <div className="flex-1 bg-muted/40 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{m?.name || "不明"}</span>
                  <span className="text-muted-foreground">{format(new Date(c.created_at), "M/d HH:mm", { locale: ja })}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap mt-1">{c.content}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2 items-end">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="コメントを書く..." className="min-h-[60px]" />
        <Button onClick={post}>投稿</Button>
      </div>
    </div>
  );
}

function Attachments({ task }: { task: Task }) {
  const qc = useQueryClient();
  const { memberId } = useCurrentMember();
  const { data: files = [] } = useQuery({
    queryKey: ["task_attachments", task.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_attachments").select("*").eq("task_id", task.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return toast.error("20MB以下のファイルにしてください");
    const path = `${task.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    const { data: pub } = supabase.storage.from("task-attachments").getPublicUrl(path);
    const { error } = await supabase.from("task_attachments").insert({
      task_id: task.id,
      file_name: file.name,
      file_path: pub.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: memberId,
    });
    if (error) return toast.error(error.message);
    await supabase.from("activity_logs").insert({ task_id: task.id, member_id: memberId, action: "ファイル添付", details: { name: file.name } });
    toast.success("アップロードしました");
    qc.invalidateQueries({ queryKey: ["task_attachments", task.id] });
    e.target.value = "";
  };

  const remove = async (id: string, path: string) => {
    const filePath = path.split("/task-attachments/")[1];
    if (filePath) await supabase.storage.from("task-attachments").remove([filePath]);
    await supabase.from("task_attachments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["task_attachments", task.id] });
  };

  return (
    <div className="space-y-3">
      <label className="block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/40 transition">
        <input type="file" onChange={upload} className="hidden" />
        <Paperclip className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">クリックしてファイルを選択 (最大20MB)</span>
      </label>
      <ul className="space-y-1.5">
        {files.map((f: any) => (
          <li key={f.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
            {f.mime_type?.startsWith("image/") ? (
              <img src={f.file_path} alt="" className="w-10 h-10 object-cover rounded" />
            ) : (
              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Paperclip className="h-4 w-4" /></div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{f.file_name}</div>
              <div className="text-xs text-muted-foreground">{f.file_size ? (f.file_size / 1024).toFixed(1) + " KB" : ""}</div>
            </div>
            <a href={f.file_path} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded"><Download className="h-4 w-4" /></a>
            <button onClick={() => remove(f.id, f.file_path)} className="p-1.5 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityLog({ task }: { task: Task }) {
  const { data: members = [] } = useMembers();
  const { data: logs = [] } = useQuery({
    queryKey: ["activity_logs", task.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_logs").select("*").eq("task_id", task.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <ul className="space-y-2">
      {logs.length === 0 && <li className="text-sm text-muted-foreground text-center py-4">活動履歴はまだありません</li>}
      {logs.map((l: any) => {
        const m = members.find((mm) => mm.id === l.member_id);
        return (
          <li key={l.id} className="flex gap-2 text-sm">
            <span className="text-xs text-muted-foreground shrink-0 w-20 pt-0.5">{format(new Date(l.created_at), "M/d HH:mm", { locale: ja })}</span>
            <span className="font-medium">{m?.name || "システム"}</span>
            <span className="text-muted-foreground">が</span>
            <span>{l.action}</span>
          </li>
        );
      })}
    </ul>
  );
}
