import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, HeartHandshake } from "lucide-react";
import { Brand } from "@/components/brand";
import { formatYear } from "@/lib/date-format";

export function AccountLayout({
  children,
  eyebrow = "A better way forward",
  title = "Big missions need the right support.",
  description = "A little context goes a long way. Let's make room for the work that matters.",
  wide = false,
}: {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  wide?: boolean;
}) {
  return (
    <main className="account-shell">
      <aside className="account-aside">
        <div className="aside-glow aside-glow-one" />
        <div className="aside-glow aside-glow-two" />
        <div className="aside-content">
          <Brand light />
          <div className="aside-message">
            <div className="aside-eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div>
            <h2>{title}</h2>
            <p>{description}</p>
            <div className="aside-note">
              <span className="note-icon"><HeartHandshake size={20} /></span>
              <span><strong>Built around your mission.</strong><br />Not the other way around.</span>
            </div>
          </div>
          <div className="aside-foot">
            <span>Capacity Canada</span><span className="aside-foot-separator">·</span><span>Stronger together</span>
          </div>
        </div>
      </aside>
      <section className="account-main">
        <div className="account-topline">
          <Link className="back-home" href="/"><ArrowLeft size={15} /> Back to home</Link>
          <span className="secure-note"><span className="secure-dot" /> Your journey starts here</span>
        </div>
        <div className={`account-form-wrap${wide ? " account-form-wrap-wide" : ""}`}>{children}</div>
        <footer className="account-footer">
          <span>© {formatYear()} Capacity Connect</span>
          <Link href="/#how-it-works">How it works <ArrowUpRight size={13} /></Link>
        </footer>
      </section>
    </main>
  );
}
