"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CustomerProvider, useCustomer } from "@/contexts/CustomerContext";
import { WeddingProvider } from "@/contexts/WeddingContext";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * DashboardGuard
 *
 * Inner component that has access to AuthContext. Handles:
 * - Showing a loading spinner while auth resolves (prevents flash of redirect)
 * - Redirecting unauthenticated users to /sign-in
 * - Wrapping authenticated content with CustomerProvider + WeddingProvider so
 *   admins can manage many customers (bride/groom couples), each with their
 *   own invitation draft + guest list, from a single dashboard.
 */
function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#FDFBF7]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-4 animate-spin"
            style={{
              borderColor: "hsl(43,75%,50%)",
              borderTopColor: "transparent",
            }}
          />
          <p className="font-sans text-sm text-muted-foreground">
            Loading your workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <CustomerProvider>
      {/* WeddingProvider reads the selected customer_id from CustomerContext */}
      <WeddingProvider>
        <DashboardShell user={user}>{children}</DashboardShell>
      </WeddingProvider>
    </CustomerProvider>
  );
}

/**
 * DashboardLayout
 *
 * Provides the single AuthProvider for the entire dashboard subtree.
 * Previously, each dashboard page (/, /guests, /share) created its own
 * onAuthStateChanged subscription — this replaces all of them with one.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardGuard>{children}</DashboardGuard>
    </AuthProvider>
  );
}
