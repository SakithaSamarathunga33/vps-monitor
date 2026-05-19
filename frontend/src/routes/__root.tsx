import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";

import type { QueryClient } from "@tanstack/react-query";

const DevTools = lazy(() =>
  import("@/components/dev-tools").then((module) => ({
    default: module.DevTools,
  }))
);

interface MyRouterContext {
  queryClient: QueryClient;
}

function RootLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <ThemeProvider>
      <AuthProvider>
        <NuqsAdapter>
          {isLoginPage ? (
            <div className="min-h-screen">
              <Outlet />
            </div>
          ) : (
            <AppShell>
              <Outlet />
            </AppShell>
          )}
        </NuqsAdapter>
        <Toaster />
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <DevTools />
          </Suspense>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
});
