CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO anon, authenticated;
GRANT ALL ON public.project_members TO service_role;

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone read project_members" ON public.project_members FOR SELECT USING (true);
CREATE POLICY "anyone insert project_members" ON public.project_members FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone update project_members" ON public.project_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anyone delete project_members" ON public.project_members FOR DELETE USING (true);

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_member ON public.project_members(member_id);