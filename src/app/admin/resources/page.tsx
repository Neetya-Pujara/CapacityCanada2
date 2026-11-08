import { redirect } from "next/navigation";
import { AccountLayout } from "@/components/account-layout";
import { AdminResourceLibrary, type AdminResource } from "@/components/admin-resource-library";
import { DemoNotice } from "@/components/registration-form";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listResources } from "@/lib/resources";

export default async function AdminResourcesPage() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let setupError = "";
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    setupError = error.message;
  }
  if (setupError) {
    return (
      <AccountLayout eyebrow="Resource library" title="A secure connection comes first." description="Resource management requires an authenticated Capacity Canada Admin account.">
        <DemoNotice>{setupError} Apply the database migrations to enable the library.</DemoNotice>
      </AccountLayout>
    );
  }

  if (!user) redirect("/login?accountType=CAPACITY_CANADA_ADMIN");
  if (user.role !== "CAPACITY_CANADA_ADMIN") redirect("/dashboard");

  let resources: Awaited<ReturnType<typeof listResources>> = [];
  try {
    resources = await listResources();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    setupError = error.message;
  }
  if (setupError) {
    return (
      <WorkspaceLayout role="CAPACITY_CANADA_ADMIN" username={user.username} displayName={user.fullName}>
        <div className="workspace-page-heading">
          <span className="page-eyebrow"><span className="page-eyebrow-dot" /> CAPACITY CANADA</span>
          <h1>Resource library unavailable</h1>
          <p>We could not load resources from the database.</p>
        </div>
        <DemoNotice>{setupError}</DemoNotice>
      </WorkspaceLayout>
    );
  }

  const initialResources: AdminResource[] = resources.map((resource) => ({
    ...resource,
    lastVerifiedAt: resource.lastVerifiedAt?.toISOString() ?? null,
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  }));
  return (
    <WorkspaceLayout role="CAPACITY_CANADA_ADMIN" username={user.username} displayName={user.fullName}>
      <div className="workspace-page-heading">
        <span className="page-eyebrow"><span className="page-eyebrow-dot" /> CAPACITY CANADA</span>
        <h1>Resource library</h1>
        <p>Manage trusted support resources and keep their details current for nonprofit teams.</p>
      </div>
      <AdminResourceLibrary initialResources={initialResources} asOfDate={new Date().toISOString()} />
    </WorkspaceLayout>
  );
}
