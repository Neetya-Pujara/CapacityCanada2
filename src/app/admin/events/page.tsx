import { redirect } from "next/navigation";
import { AccountLayout } from "@/components/account-layout";
import { AdminEventsManager, type AdminEvent } from "@/components/admin-events-manager";
import { DemoNotice } from "@/components/registration-form";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listAdminEvents } from "@/lib/events";

export default async function AdminEventsPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout eyebrow="Event management" title="A secure connection comes first." description="Event management requires a verified Capacity Canada Admin account.">
        <DemoNotice>{error.message} Apply the database migrations to enable events.</DemoNotice>
      </AccountLayout>
    );
  }
  if (!user) redirect("/login?accountType=CAPACITY_CANADA_ADMIN");
  if (user.role !== "CAPACITY_CANADA_ADMIN") redirect("/dashboard");

  let events: Awaited<ReturnType<typeof listAdminEvents>>;
  try {
    events = await listAdminEvents();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <WorkspaceLayout role="CAPACITY_CANADA_ADMIN" username={user.username} displayName={user.fullName}>
        <div className="workspace-page-heading"><h1>Events are unavailable</h1><p>Connect the database and apply its migrations.</p></div>
        <DemoNotice>{error.message}</DemoNotice>
      </WorkspaceLayout>
    );
  }

  const initialEvents: AdminEvent[] = events.map((event) => ({
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    registrationDeadline: event.registrationDeadline,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }));
  return (
    <WorkspaceLayout role="CAPACITY_CANADA_ADMIN" username={user.username} displayName={user.fullName}>
      <div className="workspace-page-heading">
        <span className="page-eyebrow"><span className="page-eyebrow-dot" /> CAPACITY CANADA</span>
        <h1>Events &amp; workshops</h1>
        <p>Create, publish, and manage capacity-building opportunities for nonprofit teams.</p>
      </div>
      <AdminEventsManager initialEvents={initialEvents} />
    </WorkspaceLayout>
  );
}
