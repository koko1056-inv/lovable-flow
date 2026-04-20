
-- ENUM types
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.recurrence_type AS ENUM ('daily', 'weekly');

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- members
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  avatar TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0ea5e9',
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#64748b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- recurring_templates
CREATE TABLE public.recurring_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  recurrence recurrence_type NOT NULL,
  weekdays INTEGER[] DEFAULT NULL, -- 0=Sun..6=Sat for weekly
  generate_time TIME NOT NULL DEFAULT '06:00:00',
  default_priority task_priority NOT NULL DEFAULT 'medium',
  default_assignee_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  default_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  due_offset_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  due_time TIME,
  assignee_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.recurring_templates(id) ON DELETE SET NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  position INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- task_tags
CREATE TABLE public.task_tags (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- task_comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_task ON public.task_comments(task_id);

-- task_attachments
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_task ON public.task_attachments(task_id);

-- activity_logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logs_task ON public.activity_logs(task_id);

-- generated_runs
CREATE TABLE public.generated_runs (
  template_id UUID NOT NULL REFERENCES public.recurring_templates(id) ON DELETE CASCADE,
  target_date DATE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, target_date)
);

-- updated_at triggers
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.recurring_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_runs ENABLE ROW LEVEL SECURITY;

-- Open policies (no auth, internal use)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['members','projects','tags','tasks','task_tags','task_comments','task_attachments','activity_logs','recurring_templates','generated_runs'])
  LOOP
    EXECUTE format('CREATE POLICY "Public read %I" ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Public insert %I" ON public.%I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "Public update %I" ON public.%I FOR UPDATE USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Public delete %I" ON public.%I FOR DELETE USING (true)', t, t);
  END LOOP;
END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read attachments" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments');
CREATE POLICY "Public upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "Public update attachments" ON storage.objects FOR UPDATE USING (bucket_id = 'task-attachments');
CREATE POLICY "Public delete attachments" ON storage.objects FOR DELETE USING (bucket_id = 'task-attachments');
