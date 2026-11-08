import { redirect } from "next/navigation";
import { AccountLayout } from "@/components/account-layout";
import { DemoNotice } from "@/components/registration-form";
import { NeedsIntelligenceDashboard } from "@/components/needs-intelligence-dashboard";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import {
  getNeedsIntelligenceReport,
  NEEDS_REPORT_PERIODS,
  type NeedsReportPeriod,
} from "@/lib/needs-intelligence";

type SearchParams = Promise<{ period?: string | string[] }>;

export default async function AdminNeedsIntelligencePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof DatabaseNotConfiguredError)) throw error;
    return (
      <AccountLayout
        eyebrow="Needs intelligence"
        title="A secure connection comes first."
        description="Sector-wide needs analytics require a verified Capacity Canada Admin account."
      >
        <DemoNotice>{error.message} Apply the database migrations to enable analytics.</DemoNotice>
      </AccountLayout>
    );
  }
  if (!user) redirect("/login?accountType=CAPACITY_CANADA_ADMIN");
  if (user.role !== "CAPACITY_CANADA_ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const requestedPeriod = Array.isArray(params.period) ? params.period[0] : params.period;
  const period: NeedsReportPeriod = NEEDS_REPORT_PERIODS.find((option) => option === requestedPeriod) ?? "90d";

  let report;
  let loadError = "";
  try {
    report = await getNeedsIntelligenceReport(period);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) loadError = error.message;
    else {
      console.error("Loading admin needs intelligence failed.", error);
      loadError = "Needs analytics could not be loaded. Please try again later.";
    }
  }

  return (
    <WorkspaceLayout role="CAPACITY_CANADA_ADMIN" username={user.username} displayName={user.fullName}>
      <div className="workspace-page-heading needs-page-heading">
        <span className="page-eyebrow"><span className="page-eyebrow-dot" /> CAPACITY CANADA</span>
        <h1>Needs Intelligence</h1>
        <p>Understand shared support needs across participating nonprofits using aggregated, saved needs data.</p>
      </div>
      {loadError ? (
        <DemoNotice>{loadError}</DemoNotice>
      ) : report ? (
        <NeedsIntelligenceDashboard report={report} />
      ) : (
        <DemoNotice>Needs analytics are temporarily unavailable.</DemoNotice>
      )}
    </WorkspaceLayout>
  );
}
