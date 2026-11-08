import { redirect } from "next/navigation";
import { NotificationCenter } from "@/components/notification-center";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getNonprofitProfile } from "@/lib/profile";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";

export default async function NotificationsPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout
        eyebrow="Notifications"
        title="Stay up to date with relevant opportunities."
        description="Sign in to review notifications for your organization."
      >
        <DemoNotice>{error.message} Apply the database migrations to enable notifications.</DemoNotice>
      </AccountLayout>
    );
  }
  if (!user) redirect("/login");
  if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) redirect("/admin");

  const profile = await getNonprofitProfile(user.id);
  return (
    <WorkspaceLayout
      role="NONPROFIT_STAFF"
      username={user.username}
      displayName={user.fullName}
      organizationName={profile?.organizationName}
    >
      <div className="workspace-page-heading">
        <span className="page-eyebrow"><span className="page-eyebrow-dot" /> YOUR WORKSPACE</span>
        <h1>Notifications</h1>
        <p>Review event opportunities selected for your organization and manage what you’ve read.</p>
      </div>
      <NotificationCenter variant="page" />
    </WorkspaceLayout>
  );
}
