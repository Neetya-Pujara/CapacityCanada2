import { redirect } from "next/navigation";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";
import { StaffEventsBrowser, type StaffEvent } from "@/components/staff-events-browser";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listPublishedEvents } from "@/lib/events";
import { getNonprofitProfile } from "@/lib/profile";

export default async function EventsPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="Events" title="Find practical opportunities for your team." description="Sign in to browse events and workshops published for nonprofit staff.">
        <DemoNotice>{error.message} Apply the database migrations to enable events.</DemoNotice>
      </AccountLayout>
    );
  }
  if (!user) redirect("/login");
  if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) redirect("/admin");

  const [profile, events] = await Promise.all([
    getNonprofitProfile(user.id),
    listPublishedEvents(),
  ]);
  const initialEvents: StaffEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    summary: event.summary,
    description: event.description,
    categories: event.categories,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    location: event.location,
    registrationUrl: event.registrationUrl,
    registrationDeadline: event.registrationDeadline,
    imageUrl: event.imageUrl,
    status: "PUBLISHED",
  }));
  return (
    <WorkspaceLayout
      role="NONPROFIT_STAFF"
      username={user.username}
      displayName={user.fullName}
      organizationName={profile?.organizationName}
    >
      <div className="workspace-page-heading">
        <span className="page-eyebrow"><span className="page-eyebrow-dot" /> CAPACITY-BUILDING OPPORTUNITIES</span>
        <h1>Events &amp; workshops</h1>
        <p>Explore published opportunities to learn, connect, and strengthen your organization.</p>
      </div>
      <StaffEventsBrowser initialEvents={initialEvents} />
    </WorkspaceLayout>
  );
}
