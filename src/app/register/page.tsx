import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck } from "lucide-react";
import { AccountLayout } from "@/components/account-layout";

export default function RegisterPage() {
  return (
    <AccountLayout eyebrow="Find your starting point" title="Good things happen when we work together." description="Join the nonprofit organizations finding support for the work that matters.">
      <div className="form-heading">
        <span className="form-kicker">Let&apos;s get connected</span>
        <h1>Grow your organization&apos;s capacity.</h1>
        <p>Create a nonprofit staff account and tell us a little about your organization.</p>
      </div>
      <div className="role-cards">
        <Link className="role-card" href="/register/nonprofit">
          <span className="role-card-icon role-icon-coral"><HeartHandshake size={22} /></span>
          <span className="role-card-copy">
            <strong>I&apos;m with a nonprofit</strong>
            <small>Find support and grow your organization&apos;s capacity.</small>
            <span className="role-card-tag">Nonprofit Staff</span>
          </span>
          <ArrowRight className="role-card-arrow" size={19} />
        </Link>
      </div>
      <div className="trust-line"><ShieldCheck size={16} /><span>Your information is handled with care and kept private.</span></div>
      <p className="form-bottom-link">Capacity Canada team? <Link href="/login?accountType=CAPACITY_CANADA_ADMIN">Admin log in <ArrowRight size={14} /></Link></p>
      <p className="form-bottom-link">Already part of the community? <Link href="/login">Log in <ArrowRight size={14} /></Link></p>
    </AccountLayout>
  );
}
