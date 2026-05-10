import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthGate } from "@/components/auth-gate";
import Dashboard from "@/pages/dashboard";
import UploadPage from "@/pages/upload";
import PassportsPage from "@/pages/passports";
import LoaPage from "@/pages/loa";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <AuthGate>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/upload" component={UploadPage} />
          <Route path="/passports" component={PassportsPage} />
          <Route path="/loa" component={LoaPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </AuthGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
