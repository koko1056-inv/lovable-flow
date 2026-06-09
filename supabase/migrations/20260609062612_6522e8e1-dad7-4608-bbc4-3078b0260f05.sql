
CREATE TYPE public.goal_status AS ENUM ('not_started', 'in_progress', 'achieved', 'missed');

CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.goal_status NOT NULL DEFAULT 'not_started',
  progress INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO anon, authenticated;
GRANT ALL ON public.goals TO service_role;

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_all_select" ON public.goals FOR SELECT USING (true);
CREATE POLICY "goals_all_insert" ON public.goals FOR INSERT WITH CHECK (true);
CREATE POLICY "goals_all_update" ON public.goals FOR UPDATE USING (true);
CREATE POLICY "goals_all_delete" ON public.goals FOR DELETE USING (true);

CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_goals_project_month ON public.goals(project_id, month);
CREATE INDEX idx_goals_parent ON public.goals(parent_goal_id);

ALTER TABLE public.tasks ADD COLUMN goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_goal ON public.tasks(goal_id);
