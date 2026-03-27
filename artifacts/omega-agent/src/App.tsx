import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import Home from "@/pages/Home";
import ChatPage from "@/pages/Chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-center px-4">
      <h1 className="text-6xl font-display font-bold text-primary text-glow mb-4">404</h1>
      <p className="text-xl text-muted-foreground font-mono">Böyle bir sistem protokolü bulunamadı.</p>
      <a href="/" className="mt-8 text-accent hover:underline decoration-accent underline-offset-4">
        Ana Ağa Dön
      </a>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative selection:bg-primary/30 selection:text-white">
      {/* Global Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/ai-core-bg.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      {/* Global Vignette */}
      <div className="absolute inset-0 z-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)] pointer-events-none" />

      <Sidebar />
      <main className="flex-1 flex flex-col relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] bg-background/50 backdrop-blur-sm border-l border-border/30">
        {children}
      </main>
    </div>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster 
        theme="dark" 
        position="top-center"
        toastOptions={{
          className: "glass-panel border-primary/50 text-white font-sans rounded-xl",
          style: {
            background: "rgba(18, 18, 26, 0.9)",
            backdropFilter: "blur(12px)",
          }
        }} 
      />
    </QueryClientProvider>
  );
}

export default App;
