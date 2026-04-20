import { useMemo } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTasks, useMembers } from "@/hooks/useTaskflowData";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberAvatar } from "@/components/MemberAvatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";

function isToday(d: string) {
  return d === new Date().toISOString().slice(0, 10);
}
function isOverdue(d: string) {
  return d < new Date().toISOString().slice(0, 10);
}
function isTomorrow(d: string) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d === t.toISOString().slice(0, 10);
}

export function AppHeader() {
  const { data: tasks = [] } = useTasks();
  const { data: members = [] } = useMembers();
  const { memberId, setMemberId } = useCurrentMember();

  const { overdue, today, tomorrow } = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "done" && t.due_date && (!memberId || t.assignee_id === memberId));
    return {
      overdue: open.filter((t) => isOverdue(t.due_date!)),
      today: open.filter((t) => isToday(t.due_date!)),
      tomorrow: open.filter((t) => isTomorrow(t.due_date!)),
    };
  }, [tasks, memberId]);

  const totalAlerts = overdue.length + today.length;
  const currentMember = members.find((m) => m.id === memberId);

  return (
    <header className="h-14 border-b bg-card px-4 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-soft">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger />
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">MGC TaskFlow</span>
          <span>· 社内タスク管理</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">あなた:</span>
          <Select value={memberId || "none"} onValueChange={(v) => setMemberId(v === "none" ? null : v)}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="メンバー選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未選択</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                    {m.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentMember && <MemberAvatar member={currentMember} size="sm" />}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {totalAlerts}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b">
              <div className="font-semibold text-sm">期日リマインド</div>
              <div className="text-xs text-muted-foreground">
                {memberId ? "あなたのタスクのみ表示" : "全メンバーのタスクを表示"}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {overdue.length === 0 && today.length === 0 && tomorrow.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">期日が近いタスクはありません 🎉</div>
              ) : (
                <>
                  {overdue.length > 0 && (
                    <NotifSection title="🔥 期限超過" items={overdue} color="text-destructive" />
                  )}
                  {today.length > 0 && <NotifSection title="📅 今日が期限" items={today} color="text-warning" />}
                  {tomorrow.length > 0 && <NotifSection title="⏰ 明日が期限" items={tomorrow} color="text-status-progress" />}
                </>
              )}
            </div>
            <div className="p-2 border-t">
              <NavLink to="/" className="block text-center text-xs text-primary hover:underline py-1">
                My Tasks を開く
              </NavLink>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

function NotifSection({ title, items, color }: { title: string; items: any[]; color: string }) {
  return (
    <div className="p-3 border-b last:border-b-0">
      <div className={`text-xs font-semibold mb-2 ${color}`}>
        {title} ({items.length})
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 5).map((t) => (
          <li key={t.id} className="text-sm truncate">
            · {t.title}
          </li>
        ))}
        {items.length > 5 && <li className="text-xs text-muted-foreground">…他 {items.length - 5} 件</li>}
      </ul>
    </div>
  );
}
