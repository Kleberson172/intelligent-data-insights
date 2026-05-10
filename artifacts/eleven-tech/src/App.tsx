import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import Predicoes from "@/pages/predicoes";
import Anomalias from "@/pages/anomalias";
import Integracoes from "@/pages/integracoes";
import Admin from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center font-black text-[#0a0e14] text-lg animate-pulse">
            11
          </div>
          <div className="text-gray-400 text-sm">A carregar...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/predicoes" component={Predicoes} />
      <Route path="/anomalias" component={Anomalias} />
      <Route path="/integracoes">
        <AdminRoute component={Integracoes} />
      </Route>
      <Route path="/admin">
        <AdminRoute component={Admin} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
