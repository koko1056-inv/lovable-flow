import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTemplates, useInvalidate } from "@/hooks/useTaskflowData";
import { toast } from "sonner";

/**
 * Auto-generates tasks from active recurring_templates.
 * - Runs on mount and every hour while the app is open.
 * - Idempotent via generated_runs (template_id, target_date) PK.
 */
export function RecurringRunner() {
  const { data: templates = [] } = useTemplates();
  const invalidate = useInvalidate();
  const ranRef = useRef(false);

  useEffect(() => {
    if (templates.length === 0) return;
    const run = async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const dow = today.getDay(); // 0..6
      let created = 0;

      for (const tpl of templates) {
        if (!tpl.is_active) continue;
        if (tpl.recurrence === "weekly" && (!tpl.weekdays || !tpl.weekdays.includes(dow))) continue;

        // Check if already generated
        const { data: existing } = await supabase
          .from("generated_runs")
          .select("template_id")
          .eq("template_id", tpl.id)
          .eq("target_date", todayStr)
          .maybeSingle();
        if (existing) continue;

        const due = new Date(today);
        due.setDate(due.getDate() + (tpl.due_offset_days || 0));

        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert({
            title: tpl.title,
            description: tpl.description,
            priority: tpl.default_priority,
            assignee_id: tpl.default_assignee_id,
            project_id: tpl.default_project_id,
            due_date: due.toISOString().slice(0, 10),
            template_id: tpl.id,
            status: "todo",
          })
          .select()
          .single();
        if (error || !newTask) continue;

        await supabase.from("generated_runs").insert({
          template_id: tpl.id,
          target_date: todayStr,
          task_id: newTask.id,
        });
        created++;
      }
      if (created > 0) {
        toast.success(`定期タスクを ${created} 件自動生成しました`);
        invalidate(["tasks", "recurring_templates"]);
      }
    };

    if (!ranRef.current) {
      ranRef.current = true;
      run();
    }
    const interval = setInterval(run, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [templates]);

  return null;
}
