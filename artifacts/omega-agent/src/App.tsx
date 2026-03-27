import React, { createContext, useContext, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import Home from "@/pages/Home";
import ChatPage from "@/pages/Chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false },
  },
});

// Mobile sidebar context
interface SidebarCtx {
  open: boolean;
  toggle: () => void;
  close: () => void;
}
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
  const toggle = () => setOpen(p => !p);
  const close = () => setOpen(false);

  return (
    <SidebarContext.Provider value={{ open, toggle, close }}>
      <div className="flex h-screen w-full bg-background overflow-hidden relative">
        {/* Mobile overlay */}
        {open && (
          <div className="sidebar-overlay md:hidden" onClick={close} />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:relative z-50 md:z-auto h-full
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <Sidebar />
        </div>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
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
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(20, 25, 40, 0.95)",
            border: "1px solid rgba(66, 133, 244, 0.3)",
            color: "#fff",
            borderRadius: "12px",
            backdropFilter: "blur(12px)",
          }
        }}
      />
    </QueryClientProvider>
  );
}
