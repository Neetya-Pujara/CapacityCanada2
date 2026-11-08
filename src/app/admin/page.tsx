import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";

export default async function AdminPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="Admin access" title="A secure connection comes first." description="Admin access is only available after the database and session configuration are in place.">
        <span className="form-kicker">Database setup required</span>
        <h1>Admin sign-in is not ready yet.</h1>
        <DemoNotice>Set DATABASE_URL in .env.local, apply migrations, then seed the admin account. No admin login has been simulated.</DemoNotice>
        <Link className="button button-outline" href="/login?accountType=CAPACITY_CANADA_ADMIN">Admin login</Link>
      </AccountLayout>
    );
  }

  if (!user) redirect("/login?accountType=CAPACITY_CANADA_ADMIN");
  if (user.role !== "CAPACITY_CANADA_ADMIN") redirect("/profile");

  return (
    <WorkspaceLayout role="CAPACITY_CANADA_ADMIN" username={user.username} displayName={user.fullName}>
    <div className="workspace-page-heading">
      <span className="page-eyebrow"><span className="page-eyebrow-dot" /> CAPACITY CANADA</span>
      <h1>Welcome back,<br /><span>{user.fullName}.</span></h1>
      <p>Your admin account is verified. Review shared nonprofit needs and manage the capacity-building opportunities available to organizations.</p>
    </div>
    <section className="admin-welcome-panel">
      <div className="admin-panel-mark"><LayoutDashboard size={19} /></div>
      <div>
        <span className="admin-panel-kicker">ADMIN WORKSPACE</span>
        <h2>Your support work starts here.</h2>
        <p>Explore aggregated needs intelligence to understand where support is most needed across participating nonprofits.</p>
      </div>
      <Link className="button button-outline" href="/admin/needs-intelligence">Explore needs intelligence <ArrowRight size={14} /></Link>
      <span className="admin-panel-status">ACCESS VERIFIED</span>
    </section>
    </WorkspaceLayout>
  );
}
