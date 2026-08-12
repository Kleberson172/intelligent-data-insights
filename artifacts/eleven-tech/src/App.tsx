import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AccessDenied from "@/pages/access-denied";
import { canAccess } from "@/lib/permissions";

import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Orders from "@/pages/orders";
import Customers from "@/pages/customers";
import Analytics from "@/pages/analytics";
import Marketing from "@/pages/marketing";
import SettingsPage from "@/pages/settings";
import Admin from "@/pages/admin";
import Anomalias from "@/pages/anomalias";
import Predicoes from "@/pages/predicoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ path, component: Component }: { path: string; component: React.ComponentType }) {
  const { user } = useAuth();
  if (!canAccess(path, user?.role)) {
    return <AccessDenied />;
  }
  return <Component />;
}

function Router() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/logo-eleven.png"
            alt="ELEVEN"
            className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.6)] animate-pulse"
          />
          <div className="text-gray-400 text-sm tracking-widest uppercase">A carregar...</div>
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
      <Route path="/products">
        <ProtectedRoute path="/products" component={Products} />
      </Route>
      <Route path="/orders">
        <ProtectedRoute path="/orders" component={Orders} />
      </Route>
      <Route path="/customers">
        <ProtectedRoute path="/customers" component={Customers} />
      </Route>
      <Route path="/analytics">
        <ProtectedRoute path="/analytics" component={Analytics} />
      </Route>
      <Route path="/marketing">
        <ProtectedRoute path="/marketing" component={Marketing} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute path="/settings" component={SettingsPage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute path="/admin" component={Admin} />
      </Route>
      <Route path="/anomalias">
        <ProtectedRoute path="/anomalias" component={Anomalias} />
      </Route>
      <Route path="/predicoes">
        <ProtectedRoute path="/predicoes" component={Predicoes} />
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