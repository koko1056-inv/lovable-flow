import { useState } from "react";
import { useProjects, useInvalidate } from "@/hooks/useTaskflowData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Project } from "@/lib/types";

const COLORS = ["#0ea5e9","#3b82f6","#6366f1","#a855f7","#ec4899","#ef4444","#f97316","#eab308","#14b8a6","#10b981","#64748b","#0f766e"];

export default function ProjectsPage() {
  const { data: projects = [] } = useProjects();
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);

  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate(["projects"]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FolderKanban className="h-6 w-6" />プロジェクト</h1>
          <p className="text-sm text-muted-foreground">タスクをプロジェクトで分類</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />追加</Button></DialogTrigger>
          <ProjectForm project={editing} onClose={() => { setOpen(false); setEditing(null); invalidate(["projects"]); }} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects.map((p) => (
          <Card key={p.id} className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: p.color }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{p.name}</div>
              {p.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
        {projects.length === 0 && <Card className="p-8 text-center text-muted-foreground sm:col-span-2">プロジェクトを追加してください</Card>}
      </div>
    </div>
  );
}

function ProjectForm({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const [name, setName] = useState(project?.name || "");
  const [description, setDescription] = useState(project?.description || "");
  const [color, setColor] = useState(project?.color || COLORS[0]);

  const save = async () => {
    if (!name.trim()) return toast.error("名前を入力してください");
    const payload = { name: name.trim(), description: description.trim() || null, color };
    const { error } = project
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{project ? "プロジェクト編集" : "新規プロジェクト"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>名前 *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>説明</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div>
          <Label className="mb-2 block">カラー</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-md border-2 ${color === c ? "border-foreground scale-110" : "border-transparent"} transition`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter><Button onClick={save}>保存</Button></DialogFooter>
    </DialogContent>
  );
}
