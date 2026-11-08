"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ChevronLeft,
  History,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Settings2,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";

type WorkspaceRole = "NONPROFIT_STAFF" | "CAPACITY_CANADA_ADMIN";

export function WorkspaceLayout({
  role,
  username,
  displayName,
  organizationName,
  children,
}: {
  role: WorkspaceRole;
  username: string;
  displayName?: string;
  organizationName?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = role === "CAPACITY_CANADA_ADMIN";
  const pageTitle =
    pathname === "/admin" ? "Overview" :
      pathname === "/admin/resources" ? "Resource library" :
      pathname === "/assistant" ? "AI assistant" :
        pathname === "/history" ? "Conversation history" :
          pathname === "/dashboard" ? "Dashboard" : "Organization profile";
  const navigation: { href: Route; label: string; icon: typeof LayoutDashboard }[] = isAdmin
    ? [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/resources", label: "Resource library", icon: BookOpen },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/assistant", label: "AI assistant", icon: MessageCircle },
        { href: "/history", label: "Conversation history", icon: History },
        { href: "/profile", label: "Profile", icon: Building2 },
      ];
  const active = (href: string) =>
    href === "/assistant"
      ? pathname === "/assistant"
      : href === "/admin"
        ? pathname === "/admin"
      : pathname === href || (href === "/dashboard" && pathname === "/");

  return (
    <div className={`workspace${collapsed ? " is-collapsed" : ""}${mobileMenuOpen ? " is-mobile-open" : ""}`}>
      {mobileMenuOpen && (
        <button
          type="button"
          className="workspace-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className="workspace-sidebar">
        <div className="workspace-brand-row">
          <div className="workspace-brand"><Brand href={isAdmin ? "/admin" : "/dashboard"} /></div>
          <button
            type="button"
            className="workspace-collapse-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <ChevronLeft size={17} />
          </button>
        </div>
        <div className="workspace-org">
          <span className="workspace-org-mark">
            {isAdmin ? "CC" : (organizationName ?? username).slice(0, 2).toUpperCase()}
          </span>
          <span className="workspace-org-copy">
            <strong>{isAdmin ? "Capacity Canada" : organizationName ?? "Your organization"}</strong>
            <small>{isAdmin ? "Admin account" : "Nonprofit workspace"}</small>
          </span>
          <span className="workspace-switch" aria-hidden="true">⌄</span>
        </div>
        <div className="workspace-nav-label">YOUR SPACE</div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              className={`workspace-nav-item${active(href) ? " active" : ""}`}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active(href) ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon size={18} />
              <span className="workspace-nav-copy">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="workspace-sidebar-foot">
          <Link className="workspace-nav-item" href="/#how-it-works" title={collapsed ? "Help & guidance" : undefined}>
            <Settings2 size={18} /><span className="workspace-nav-copy">Help &amp; guidance</span>
          </Link>
          <div className="workspace-user">
            <span className="workspace-avatar">{(displayName ?? username).slice(0, 1).toUpperCase()}</span>
            <span className="workspace-user-name">
              <strong>{displayName ?? username}</strong>
              <small>{isAdmin ? "Capacity Canada Admin" : "Nonprofit Staff"}</small>
            </span>
            <span className="workspace-online" />
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            type="button"
            className="workspace-mobile-toggle"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="workspace-breadcrumb">
            <span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{pageTitle}</strong>
          </div>
          <div className="workspace-top-actions">
            <Link className="workspace-site-link" href={isAdmin ? "/admin" : "/dashboard"}><span>Workspace home</span><ArrowUpRight size={14} /></Link>
            <LogoutButton />
          </div>
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
