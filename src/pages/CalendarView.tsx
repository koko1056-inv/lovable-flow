import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTaskflowData";
import { useTaskDetail } from "@/hooks/useTaskDetail";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { data: tasks = [] } = useTasks();
  const open = useTaskDetail((s) => s.open);
  const [cursor, setCursor] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const arr: Date[] = [];
    let d = start;
    while (d <= end) { arr.push(d); d = new Date(d.getTime() + 86400000); }
    return arr;
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const arr = map.get(t.due_date) || [];
      arr.push(t);
      map.set(t.due_date, arr);
    });
    return map;
  }, [tasks]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{format(cursor, "yyyy年 M月", { locale: ja })}</h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>今月</Button>
            <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {["日","月","火","水","木","金","土"].map((d, i) => (
            <div key={d} className={cn("p-2 text-center text-xs font-semibold", i === 0 && "text-destructive", i === 6 && "text-status-progress")}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10);
            const dayTasks = tasksByDate.get(key) || [];
            const inMonth = isSameMonth(d, cursor);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[110px] border-r border-b p-1.5 text-xs",
                  !inMonth && "bg-muted/30 text-muted-foreground",
                  isToday(d) && "bg-accent-soft/40",
                )}
              >
                <div className={cn("font-semibold mb-1", isToday(d) && "text-accent")}>{format(d, "d")}</div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => open(t.id)}
                      className={cn(
                        "block w-full text-left truncate px-1.5 py-0.5 rounded text-[11px] hover:opacity-80",
                        t.status === "done" ? "bg-status-done/15 text-status-done line-through" : "bg-status-progress/15 text-status-progress",
                      )}
                    >
                      {t.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} 件</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
