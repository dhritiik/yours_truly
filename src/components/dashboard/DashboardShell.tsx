"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  PencilLine, ClipboardList, Users, SquareCheckBig, LayoutGrid,
  Send, ChartColumn, Settings, Download, CreditCard,
  LogOut, X, Menu, Sparkles, UserCog, ChevronDown,
} from "lucide-react";
import { useCustomer } from "@/contexts/CustomerContext";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "My Invitation", icon: PencilLine },
  { href: "/dashboard/guests", label: "Guest List", icon: Users, upgrade: true },
  { href: "/dashboard/share", label: "Share", icon: Send },
];

const SECONDARY_NAV = [
  { href: "/dashboard/planner", label: "Planner", icon: ClipboardList },
  { href: "/dashboard/rsvps", label: "Responses", icon: SquareCheckBig, upgrade: true },
  { href: "/dashboard/seating", label: "Seating", icon: LayoutGrid, upgrade: true },
  { href: "/dashboard/analytics", label: "Insights", icon: ChartColumn, upgrade: true },
  { href: "/dashboard/settings", label: "RSVP Settings", icon: Settings, upgrade: true },
  { href: "/dashboard/export", label: "Download Data", icon: Download, upgrade: true },
  { href: "/dashboard/plan", label: "Plan & Billing", icon: CreditCard },
];

interface DashboardShellProps {
  user: User;
  children: React.ReactNode;
}

function CustomerSelector() {
  const { isAdmin, customers, customersLoading, selectedCustomerId, selectCustomer } = useCustomer();
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  const selected = customers.find((c) => c.customer_id === selectedCustomerId);

  return (
    <div className="px-3 mb-3 relative">
      <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Managing Customer</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 py-2 text-left"
      >
        <span className="font-sans text-sm font-medium text-[hsl(25,30%,12%)] truncate">
          {customersLoading ? "Loading…" : selected?.display_name || "No customer selected"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute left-3 right-3 mt-1 z-20 rounded-lg border border-[#E8E0D8] bg-white shadow-lg max-h-64 overflow-y-auto"
          >
            {customers.length === 0 ? (
              <p className="px-3 py-2 font-sans text-xs text-muted-foreground">No customers yet.</p>
            ) : (
              customers.map((c) => (
                <button
                  key={c.customer_id}
                  onClick={() => { selectCustomer(c.customer_id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 font-sans text-sm hover:bg-[#F5EFE6] transition-colors ${
                    c.customer_id === selectedCustomerId ? "text-[hsl(43,75%,40%)] font-medium" : "text-[hsl(25,30%,20%)]"
                  }`}
                >
                  {c.display_name}
                </button>
              ))
            )}
            <Link
              href="/dashboard/customers"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 font-sans text-xs font-semibold text-[hsl(43,75%,40%)] border-t border-[#E8E0D8] hover:bg-[#F5EFE6]"
            >
              + Manage Customers
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  upgrade,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  upgrade?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-sans font-medium transition-all duration-150 group ${
        isActive
          ? "bg-[hsl(43,75%,50%)]/10 text-[hsl(43,75%,40%)] border-l-2 border-[hsl(43,75%,50%)]"
          : "text-[hsl(25,20%,40%)] hover:bg-[#F5EFE6] hover:text-[hsl(25,30%,12%)] border-l-2 border-transparent"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[hsl(43,75%,50%)]" : "text-[hsl(25,10%,55%)] group-hover:text-[hsl(25,30%,12%)]"}`} />
      <span className="flex-1">{label}</span>
      {upgrade && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
          Soon
        </span>
      )}
    </Link>
  );
}

function Sidebar({ user, onClose }: { user: User; onClose?: () => void }) {
  const router = useRouter();
  const { isAdmin } = useCustomer();
  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/sign-in");
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E8E0D8]">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#E8E0D8] shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl text-[hsl(25,30%,20%)] tracking-wide">
            Yours Truly
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-full hover:bg-[#F5EFE6]">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <CustomerSelector />
        <div className="space-y-0.5 px-3 mb-4">
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}
          {isAdmin && (
            <NavItem href="/dashboard/customers" label="Customers" icon={UserCog} onClick={onClose} />
          )}
        </div>
        <div className="border-t border-[#E8E0D8] pt-3 px-3 space-y-0.5">
          {SECONDARY_NAV.map((item) => (
            <NavItem key={item.href} {...item} onClick={onClose} />
          ))}
        </div>
      </nav>

      {/* Wedding info card */}
      <div className="p-4 border-t border-[#E8E0D8] shrink-0">
        <div className="rounded-xl p-3.5 space-y-2"
          style={{ background: "linear-gradient(135deg, hsl(43,75%,50%)/8%, hsl(0,85%,50%)/5%)", border: "1px solid hsl(43,75%,50%)/15%" }}>
          <p className="font-sans text-[10px] text-muted-foreground uppercase tracking-widest">Your Account</p>
          <p className="font-sans font-semibold text-sm text-[hsl(25,30%,12%)] truncate">{user.displayName || user.email}</p>
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium w-fit"
            style={{ background: "hsl(43,75%,50%)/10%", border: "1px solid hsl(43,75%,50%)/20%", color: "hsl(43,75%,40%)" }}>
            <Sparkles className="h-3 w-3" />
            Draft · Free Plan
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-sans text-[hsl(25,10%,50%)] hover:bg-[#FEF2F2] hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin, roleLoading, customersLoading, customers, selectedCustomerId } = useCustomer();
  const pathname = usePathname();

  // Admins must select (or create) a customer before editing an invitation.
  // The /dashboard/customers page itself is exempt so admins can create one.
  const needsCustomerSelection =
    isAdmin &&
    !roleLoading &&
    !customersLoading &&
    !selectedCustomerId &&
    pathname !== "/dashboard/customers";

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      {/* Mobile top header */}
      <header className="sticky top-0 z-40 lg:hidden flex h-14 items-center justify-between px-4 bg-white/90 backdrop-blur-sm border-b border-[#E8E0D8]">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-full hover:bg-[#F5EFE6] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg text-[hsl(25,30%,20%)]">Yours Truly</span>
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[hsl(43,75%,50%)/15%] flex items-center justify-center">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="font-sans font-bold text-sm text-[hsl(43,75%,40%)]">
              {(user.displayName || user.email || "U")[0].toUpperCase()}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 shrink-0">
          <Sidebar user={user} />
        </aside>

        {/* Mobile sidebar drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 bottom-0 w-72 z-50 lg:hidden shadow-2xl"
              >
                <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {needsCustomerSelection ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-6">
              <UserCog className="h-10 w-10" style={{ color: "hsl(43,75%,50%)" }} />
              <div>
                <h2 className="font-display text-xl text-[hsl(25,30%,12%)] mb-1">
                  {customers.length === 0 ? "No customers yet" : "Select a customer"}
                </h2>
                <p className="font-sans text-sm text-muted-foreground max-w-sm">
                  {customers.length === 0
                    ? "Add your first bride & groom customer to start building their invitation."
                    : "Choose a customer from the sidebar, or add a new one, to manage their invitation."}
                </p>
              </div>
              <Link
                href="/dashboard/customers"
                className="font-sans text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(43,75%,50%), hsl(0,85%,50%))" }}
              >
                Manage Customers
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
