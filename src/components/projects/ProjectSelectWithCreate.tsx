import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, useInvalidate } from "@/hooks/useTaskflowData";
import { toast } from "sonner";

const COLORS = ["#0ea5e9","#3b82f6","#6366f1","#a855f7","#ec4899","#ef4444","#f97316","#eab308","#14b8a6","#10b981","#64748b","#0f766e"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  includeNone?: boolean;
  placeholder?: string;
  className?: string;
}

const CREATE = "__create_new__";

export function ProjectSelectWithCreate({ value, onChange, includeNone = true, placeholder = "なし", className }: Props) {
  const { data: projects = [] } = useProjects();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleChange = (v: string) => {
    if (v === CREATE) {
      setName(""); setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
      setOpen(true);
      return;
    }
    onChange(v);
  };

  const save = async () => {
    if (!name.trim()) return toast.error("名前を入力してください");
    setSaving(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: name.trim(), color })
      .select()
      .single();
    setSaving(false);
    if (error || !data) return toast.error(error?.message || "作成失敗");
    toast.success("プロジェクトを作成しました");
    invalidate(["projects"]);
    setOpen(false);
    onChange(data.id);
  };

  return (
    <>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {includeNone && <SelectItem value="none">なし</SelectItem>}
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE} className="text-primary font-medium">
            <span className="inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />新規プロジェクト...</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新規プロジェクト</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>名前 *</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && save()} /></div>
            <div>
              <Label className="mb-2 block">カラー</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-md border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button onClick={save} disabled={saving}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
