import React, { createContext, useContext, useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import Home from "@/pages/Home";
import ChatPage from "@/pages/Chat";
import AgentsPage from "@/pages/Agents";
import ModelsPage from "@/pages/Models";
import KnowledgePage from "@/pages/Knowledge";
import ToolsPage from "@/pages/Tools";
import { SecurityGuard } from "@/components/SecurityGuard";
import { AuthScreen } from "@/pages/AuthScreen";
import { getUser } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
      staleTime: 0,
    },
  },
});

interface SidebarCtx { open: boolean; toggle: () => void; close: () => void; }
export const SidebarContext = createContext<SidebarCtx>({ open: false, toggle: () => {}, close: () => {} });
export const useSidebar = () => useContext(SidebarContext);

function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
      <span className="text-7xl mb-6">🌌</span>
      <h1 className="text-4xl font-display font-bold gemini-gradient mb-3">404</h1>
      <p className="text-muted-foreground">Bu sayfa bulunamadı.</p>
      <a href="/" className="mt-6 text-primary hover:underline">Ana Sayfaya Dön</a>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, toggle: () => setOpen(p => !p), close: () => setOpen(false) }}>
      <div className="flex h-screen w-full bg-background overflow-hidden relative">
        {open && <div className="sidebar-overlay md:hidden" onClick={() => setOpen(false)} />}
        <div className={`fixed md:relative z-50 md:z-auto h-full transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</main>
      </div>
    </SidebarContext.Provider>
  );
}

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/chat/:id" component={ChatPage} />
        <Route path="/agents" component={AgentsPage} />
        <Route path="/models" component={ModelsPage} />
        <Route path="/knowledge" component={KnowledgePage} />
        <Route path="/tools" component={ToolsPage} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(!!getUser());
  }, []);

  if (authed === null) return null; // brief flicker guard

  if (!authed) {
    return (
      <>
        <AuthScreen onAuth={() => setAuthed(true)} />
        <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 88%)", borderRadius: "10px", fontSize: "13px" } }} />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <SecurityGuard>
          <Router />
        </SecurityGuard>
      </WouterRouter>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "hsl(0 0% 10%)",
            border: "1px solid hsl(0 0% 18%)",
            color: "hsl(0 0% 88%)",
            borderRadius: "10px",
            fontSize: "13px",
          }
        }}
      />
    </QueryClientProvider>
  );
}
