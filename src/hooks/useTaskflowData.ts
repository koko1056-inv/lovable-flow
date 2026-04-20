import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Member, Project, Tag, Task, RecurringTemplate } from "@/lib/types";

export const useMembers = () =>
  useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("*").order("name");
      if (error) throw error;
      return data as Member[];
    },
  });

export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("name");
      if (error) throw error;
      return data as Project[];
    },
  });

export const useTags = () =>
  useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

export const useTasks = () =>
  useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

export const useTaskTags = () =>
  useQuery({
    queryKey: ["task_tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_tags").select("*");
      if (error) throw error;
      return data as { task_id: string; tag_id: string }[];
    },
  });

export const useTemplates = () =>
  useQuery({
    queryKey: ["recurring_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recurring_templates").select("*").order("title");
      if (error) throw error;
      return data as RecurringTemplate[];
    },
  });

export const useInvalidate = () => {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
};
