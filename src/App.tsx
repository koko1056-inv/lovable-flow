import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import MyTasks from "./pages/MyTasks";
import Board from "./pages/Board";
import ListView from "./pages/ListView";
import CalendarView from "./pages/CalendarView";
import Members from "./pages/Members";
import Projects from "./pages/Projects";
import Tags from "./pages/Tags";
import Templates from "./pages/Templates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<MyTasks />} />
            <Route path="/board" element={<Board />} />
            <Route path="/list" element={<ListView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/members" element={<Members />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/templates" element={<Templates />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
