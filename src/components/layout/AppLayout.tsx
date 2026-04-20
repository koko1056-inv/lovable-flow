import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { RecurringRunner } from "@/components/RecurringRunner";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <TaskDetailSheet />
        <RecurringRunner />
      </div>
    </SidebarProvider>
  );
}
