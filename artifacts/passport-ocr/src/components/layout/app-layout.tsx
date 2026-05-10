import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ScanText, LayoutDashboard, UploadCloud, FileText, FileSignature, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Process Document", icon: UploadCloud },
  { href: "/passports", label: "Records", icon: FileText },
  { href: "/loa", label: "LOA", icon: FileSignature },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <ScanText className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="font-bold text-base tracking-tight text-sidebar-foreground">PassportOCR</span>
      </div>
      <nav className="flex-1 py-4">
        <p className="px-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-sidebar-foreground/40">
          Operations
        </p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
              ${location === href
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarNav />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-56 bg-sidebar border-r border-sidebar-border flex flex-col
          transform transition-transform duration-200 ease-in-out md:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded text-sidebar-foreground/60 hover:text-sidebar-foreground"
            data-testid="button-close-sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarNav onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(true)}
            data-testid="button-open-sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ScanText className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm tracking-tight">PassportOCR</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
