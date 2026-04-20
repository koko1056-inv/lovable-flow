import { useState } from "react";
import { useMembers, useInvalidate } from "@/hooks/useTaskflowData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MemberAvatar } from "@/components/MemberAvatar";
import { toast } from "sonner";
import type { Member } from "@/lib/types";

const COLORS = ["#3b82f6","#0ea5e9","#14b8a6","#10b981","#84cc16","#eab308","#f97316","#ef4444","#ec4899","#a855f7","#6366f1","#64748b"];

export default function MembersPage() {
  const { data: members = [] } = useMembers();
  const invalidate = useInvalidate();
  const [editing, setEditing] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);

  const remove = async (id: string) => {
    if (!confirm("このメンバーを削除しますか？")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate(["members"]);
    toast.success("削除しました");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />メンバー</h1>
          <p className="text-sm text-muted-foreground">タスクの担当者として割り当てられるメンバーを管理</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />追加</Button>
          </DialogTrigger>
          <MemberForm member={editing} onClose={() => { setOpen(false); setEditing(null); invalidate(["members"]); }} />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((m) => (
          <Card key={m.id} className="p-4 flex items-center gap-3">
            <MemberAvatar member={m} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{m.name}</div>
              {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Card>
        ))}
        {members.length === 0 && <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">メンバーを追加してください</Card>}
      </div>
    </div>
  );
}

function MemberForm({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [name, setName] = useState(member?.name || "");
  const [email, setEmail] = useState(member?.email || "");
  const [color, setColor] = useState(member?.color || COLORS[0]);
  const [avatar, setAvatar] = useState(member?.avatar || "");

  const save = async () => {
    if (!name.trim()) return toast.error("名前を入力してください");
    const payload = { name: name.trim(), email: email.trim() || null, color, avatar: avatar.trim() || null };
    const { error } = member
      ? await supabase.from("members").update(payload).eq("id", member.id)
      : await supabase.from("members").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{member ? "メンバー編集" : "新規メンバー"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>名前 *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>メール</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></div>
        <div><Label>イニシャル/絵文字 (任意)</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} maxLength={2} placeholder="例: 山" /></div>
        <div>
          <Label className="mb-2 block">カラー</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-foreground scale-110" : "border-transparent"} transition`} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter><Button onClick={save}>保存</Button></DialogFooter>
    </DialogContent>
  );
}
