"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  // =========================================================
  // FRONTEND AUTH BYPASS FLAG
  // Set to true to temporarily disable the /login redirect.
  // This DOES NOT disable backend JWT security or RBAC.
  // =========================================================
  const DEMO_AUTH_BYPASS = true;

  useEffect(() => {
    if (DEMO_AUTH_BYPASS) {
      return; // Bypass the login redirect completely
    }

    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.push("/login");
    } else if (!isLoading && isAuthenticated && isLoginPage) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  // 1. Initial loading state (verifying token / restoring session)
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-500/30">
            C
          </div>
          <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
            <span>Verifying CMPDI Security Credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Login or Landing page mode (no navbar wrapper)
  if (isLoginPage || pathname === "/") {
    return <>{children}</>;
  }

  // 3. Authenticated or Demo Application Shell (Direct Access Mode)
  return (
    <div className="flex h-full w-full overflow-hidden flex-col bg-obsidian-900 text-slate-100">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto px-4 pt-24 pb-8 sm:px-6 lg:px-8 w-full">
        {children}
      </main>
    </div>
  );
}
