import { useState } from "react";
import { useTags, useInvalidate } from "@/hooks/useTaskflowData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tag as TagIcon, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COLORS = ["#64748b","#3b82f6","#0ea5e9","#14b8a6","#10b981","#84cc16","#eab308","#f97316","#ef4444","#ec4899","#a855f7","#6366f1"];

export default function TagsPage() {
  const { data: tags = [] } = useTags();
  const invalidate = useInvalidate();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("tags").insert({ name: name.trim(), color });
    if (error) return toast.error(error.message);
    setName("");
    invalidate(["tags"]);
  };

  const remove = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await supabase.from("tags").delete().eq("id", id);
    invalidate(["tags"]);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><TagIcon className="h-6 w-6" />タグ</h1>
        <p className="text-sm text-muted-foreground">タスクの横断的なラベル</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="タグ名" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button onClick={add}><Plus className="h-4 w-4" />追加</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-md border-2 ${color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: `${t.color}20`, color: t.color, borderWidth: 1, borderColor: t.color }}>
            {t.name}
            <button onClick={() => remove(t.id)} className="hover:bg-foreground/10 rounded-full p-0.5"><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-sm text-muted-foreground">タグがありません</span>}
      </div>
    </div>
  );
}
