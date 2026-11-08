import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";
import { ProfileForm } from "@/components/profile-form";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getNonprofitProfile } from "@/lib/profile";

export default async function ProfilePage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="Profile setup" title="Your organization, all in one place." description="Connect the database to retrieve and keep your organization's account and orientation information." wide>
        <div className="form-heading">
          <span className="form-kicker">Database setup required</span>
          <h1>Your profile will appear here.</h1>
          <p>Profile data is read from the database for the currently authenticated user. No local or sample account data is used.</p>
        </div>
        <DemoNotice>Set DATABASE_URL in .env.local and run the database migration before logging in.</DemoNotice>
      </AccountLayout>
    );
  }

  if (!user) redirect("/login");
  if (user.role !== "NONPROFIT_STAFF") redirect("/admin");

  const profile = await getNonprofitProfile(user.id);
  if (!profile) {
    return (
      <WorkspaceLayout role="NONPROFIT_STAFF" username={user.username} displayName={user.fullName}>
        <div className="workspace-page-heading">
          <span className="page-eyebrow"><span className="page-eyebrow-dot" /> PROFILE</span>
          <h1>Your organization profile</h1>
          <p>Your profile is unavailable because its organization record is missing.</p>
        </div>
        <DemoNotice>Contact your platform administrator. No replacement profile has been fabricated.</DemoNotice>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout
      role="NONPROFIT_STAFF"
      username={user.username}
      displayName={user.fullName}
      organizationName={profile.organizationName}
    >
      <div className="workspace-page-heading">
        <span className="page-eyebrow"><span className="page-eyebrow-dot" /> YOUR ORGANIZATION</span>
        <h1>A clearer picture.<br /><span>A stronger next step.</span></h1>
        <p>Keep your organization details current. Your orientation stays here, ready to shape more relevant support.</p>
      </div>
      <div className="profile-context">
        <div className="profile-context-copy"><span className="context-icon"><Building2 size={18} /></span><span><strong>{profile.organizationName}</strong><small>Your organization profile</small></span></div>
        <span className="context-status"><span /> SAVED TO YOUR ACCOUNT</span>
      </div>
      <ProfileForm profile={profile} />
    </WorkspaceLayout>
  );
}
