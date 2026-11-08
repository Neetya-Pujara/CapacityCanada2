"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, Shapes, X } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand${light ? " brand-light" : ""}`}
      aria-label="Capacity Connect home"
    >
      <span className="brand-mark"><Shapes size={18} strokeWidth={2.2} /></span>
      <span className="brand-name">capacity<span>connect</span></span>
    </Link>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#for-organizations">For organizations</Link>
        </nav>
        <div className="header-actions">
          <Link className="nav-login" href="/login">Log in</Link>
          <Link className="button button-dark button-small" href="/register">
            Get started <ArrowUpRight size={15} />
          </Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-site-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {menuOpen && <nav className="mobile-site-nav" id="mobile-site-navigation" aria-label="Mobile navigation">
        <Link href="/#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
        <Link href="/#for-organizations" onClick={() => setMenuOpen(false)}>For organizations</Link>
        <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
        <Link href="/register" onClick={() => setMenuOpen(false)}>Get started <ArrowUpRight size={14} /></Link>
      </nav>}
    </header>
  );
}
