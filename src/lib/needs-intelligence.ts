import { and, count, countDistinct, eq, gte, lte, min, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationalNeeds } from "@/lib/db/schema";
import { SUPPORT_AREAS } from "@/lib/validation";

export const NEEDS_REPORT_PERIODS = ["30d", "90d", "6m", "12m", "all"] as const;
export type NeedsReportPeriod = (typeof NEEDS_REPORT_PERIODS)[number];
export type NeedsReportGranularity = "day" | "week" | "month";

export const NEEDS_CATEGORY_LABELS: Record<(typeof SUPPORT_AREAS)[number], string> = {
  "Marketing & Communications": "Marketing & Communications",
  Fundraising: "Fundraising",
  HR: "Human Resources",
  "Volunteer Management": "Volunteer Management",
  "Governance & Leadership": "Governance & Leadership",
  "Financial Management": "Financial Management",
  "Technology & Digital Transformation": "Technology & Digital Transformation",
  "Strategic Planning": "Strategic Planning",
  Other: "Other",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function shiftUtcMonths(date: Date, amount: number) {
  const shifted = new Date(date);
  const day = shifted.getUTCDate();
  shifted.setUTCDate(1);
  shifted.setUTCMonth(shifted.getUTCMonth() + amount);
  const lastDay = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
  shifted.setUTCDate(Math.min(day, lastDay));
  return shifted;
}

export type NeedsReportWindow = {
  startsAt: Date | null;
  endsAt: Date;
  granularity: NeedsReportGranularity;
  label: string;
};

export function getNeedsReportWindow(period: NeedsReportPeriod, now = new Date()): NeedsReportWindow {
  const end = new Date(now);
  let startsAt: Date | null = new Date(end);
  let granularity: NeedsReportGranularity;
  let label: string;

  if (period === "30d") {
    startsAt = new Date(end.getTime() - 30 * DAY_MS);
    granularity = "day";
    label = "Last 30 days";
  } else if (period === "90d") {
    startsAt = new Date(end.getTime() - 90 * DAY_MS);
    granularity = "week";
    label = "Last 90 days";
  } else if (period === "6m") {
    startsAt = shiftUtcMonths(startsAt, -6);
    granularity = "month";
    label = "Last 6 months";
  } else if (period === "12m") {
    startsAt = shiftUtcMonths(startsAt, -12);
    granularity = "month";
    label = "Last 12 months";
  } else {
    startsAt = null;
    granularity = "month";
    label = "All time";
  }

  return { startsAt, endsAt: end, granularity, label };
}

export function getEmergingComparisonWindow(period: NeedsReportPeriod, now = new Date()) {
  const end = new Date(now);
  let intervalMs = 90 * DAY_MS;
  if (period === "30d") intervalMs = 15 * DAY_MS;
  else if (period === "90d") intervalMs = 45 * DAY_MS;
  const monthInterval = period === "6m" ? 3 : period === "12m" ? 6 : 0;
  const recentStartsAt = monthInterval
    ? shiftUtcMonths(end, -monthInterval)
    : new Date(end.getTime() - intervalMs);
  const previousStartsAt = monthInterval
    ? shiftUtcMonths(recentStartsAt, -monthInterval)
    : new Date(recentStartsAt.getTime() - intervalMs);
  return { previousStartsAt, recentStartsAt, endsAt: end };
}

export function isMeaningfulNeedIncrease(recentOrganizations: number, previousOrganizations: number) {
  return recentOrganizations >= previousOrganizations + Math.max(2, Math.ceil(previousOrganizations * 0.25));
}

function bucketExpression(granularity: NeedsReportGranularity) {
  return sql<Date>`date_trunc(${sql.raw(`'${granularity}'`)}, ${organizationalNeeds.firstIdentifiedAt} AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`;
}

function truncateUtc(date: Date, granularity: NeedsReportGranularity) {
  const bucket = new Date(date);
  if (granularity === "month") {
    bucket.setUTCDate(1);
    bucket.setUTCHours(0, 0, 0, 0);
  } else if (granularity === "week") {
    bucket.setUTCDate(bucket.getUTCDate() - ((bucket.getUTCDay() + 6) % 7));
    bucket.setUTCHours(0, 0, 0, 0);
  } else {
    bucket.setUTCHours(0, 0, 0, 0);
  }
  return bucket;
}

function addBucket(date: Date, granularity: NeedsReportGranularity) {
  const next = new Date(date);
  if (granularity === "month") next.setUTCMonth(next.getUTCMonth() + 1);
  else if (granularity === "week") next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function formatNeedsBucket(date: Date, granularity: NeedsReportGranularity) {
  if (granularity === "day") {
    return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
  }
  if (granularity === "week") {
    return `Week of ${new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)}`;
  }
  return new Intl.DateTimeFormat("en-CA", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

export type NeedsTrendPoint = {
  date: string;
  label: string;
  counts: Record<(typeof SUPPORT_AREAS)[number], number>;
  total: number;
};

export type NeedsCategorySummary = {
  category: (typeof SUPPORT_AREAS)[number];
  label: string;
  organizations: number;
  percentage: number;
  records: number;
};

export type EmergingNeed = {
  category: (typeof SUPPORT_AREAS)[number];
  label: string;
  organizations: number;
  recentOrganizations: number;
  previousOrganizations: number;
  change: number;
};

export type NeedsIntelligenceReport = {
  period: NeedsReportPeriod;
  periodLabel: string;
  granularity: NeedsReportGranularity;
  totalOrganizations: number;
  representedOrganizations: number;
  totalNeeds: number;
  mostCommonCategory: string | null;
  categories: NeedsCategorySummary[];
  trends: NeedsTrendPoint[];
  emerging: EmergingNeed[];
  hasPreviousPeriodData: boolean;
};

export async function getNeedsIntelligenceReport(
  period: NeedsReportPeriod,
  now = new Date(),
): Promise<NeedsIntelligenceReport> {
  const db = getDb();
  const window = getNeedsReportWindow(period, now);
  const active = eq(organizationalNeeds.status, "ACTIVE");
  const selectedConditions = [
    active,
    lte(organizationalNeeds.firstIdentifiedAt, window.endsAt),
    ...(window.startsAt ? [gte(organizationalNeeds.firstIdentifiedAt, window.startsAt)] : []),
  ];
  const selectedWhere = and(...selectedConditions);
  const [overallRows, lifetimeOrganizations, categoryRows, rawTrendRows] = await Promise.all([
    db.select({
      needs: count(),
      organizations: countDistinct(organizationalNeeds.organizationId),
      earliest: min(organizationalNeeds.firstIdentifiedAt),
    })
      .from(organizationalNeeds)
      .where(selectedWhere),
    db.select({ organizations: countDistinct(organizationalNeeds.organizationId) })
      .from(organizationalNeeds)
      .where(and(active, lte(organizationalNeeds.firstIdentifiedAt, window.endsAt))),
    db.select({
      category: organizationalNeeds.category,
      organizations: countDistinct(organizationalNeeds.organizationId),
      records: count(),
    })
      .from(organizationalNeeds)
      .where(selectedWhere)
      .groupBy(organizationalNeeds.category),
    db.select({
      bucket: bucketExpression(window.granularity),
      category: organizationalNeeds.category,
      records: count(),
    })
      .from(organizationalNeeds)
      .where(selectedWhere)
      .groupBy(bucketExpression(window.granularity), organizationalNeeds.category)
      .orderBy(bucketExpression(window.granularity), organizationalNeeds.category),
  ]);
  const overall = overallRows[0];
  const representedOrganizations = Number(overall?.organizations ?? 0);
  const categoryCounts = new Map(categoryRows.map((row) => [row.category, {
    organizations: Number(row.organizations),
    records: Number(row.records),
  }]));
  const categories = SUPPORT_AREAS.map((category) => {
    const categoryData = categoryCounts.get(category);
    const organizations = categoryData?.organizations ?? 0;
    return {
      category,
      label: NEEDS_CATEGORY_LABELS[category],
      organizations,
      percentage: representedOrganizations ? Math.round((organizations / representedOrganizations) * 100) : 0,
      records: categoryData?.records ?? 0,
    };
  });
  const mostCommonCategory = [...categories]
    .filter((category) => category.organizations > 0)
    .sort((left, right) => right.organizations - left.organizations || SUPPORT_AREAS.indexOf(left.category) - SUPPORT_AREAS.indexOf(right.category))[0]?.label ?? null;

  const earliest = overall?.earliest ? new Date(overall.earliest) : null;
  const chartStart = window.startsAt ?? earliest;
  const bucketDates: Date[] = [];
  if (chartStart && representedOrganizations) {
    const lastBucket = truncateUtc(window.endsAt, window.granularity);
    for (let bucket = truncateUtc(chartStart, window.granularity); bucket <= lastBucket; bucket = addBucket(bucket, window.granularity)) {
      bucketDates.push(bucket);
    }
  }
  const trendData = new Map<string, Partial<Record<(typeof SUPPORT_AREAS)[number], number>>>();
  for (const row of rawTrendRows) {
    const key = new Date(row.bucket).toISOString();
    const values = trendData.get(key) ?? {};
    values[row.category] = Number(row.records);
    trendData.set(key, values);
  }
  const trends: NeedsTrendPoint[] = bucketDates.map((date) => {
    const key = date.toISOString();
    const partialCounts = trendData.get(key) ?? {};
    const counts = Object.fromEntries(SUPPORT_AREAS.map((category) => [
      category,
      partialCounts[category] ?? 0,
    ])) as Record<(typeof SUPPORT_AREAS)[number], number>;
    return {
      date: key,
      label: formatNeedsBucket(date, window.granularity),
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    };
  });

  const comparison = getEmergingComparisonWindow(period, now);
  const comparisonRows = await db.select({
    category: organizationalNeeds.category,
    recentOrganizations: sql<number>`count(distinct case when ${organizationalNeeds.firstIdentifiedAt} >= ${sql.param(comparison.recentStartsAt, organizationalNeeds.firstIdentifiedAt)} then ${organizationalNeeds.organizationId} end)`,
    previousOrganizations: sql<number>`count(distinct case when ${organizationalNeeds.firstIdentifiedAt} >= ${sql.param(comparison.previousStartsAt, organizationalNeeds.firstIdentifiedAt)} and ${organizationalNeeds.firstIdentifiedAt} < ${sql.param(comparison.recentStartsAt, organizationalNeeds.firstIdentifiedAt)} then ${organizationalNeeds.organizationId} end)`,
  })
    .from(organizationalNeeds)
    .where(and(
      active,
      gte(organizationalNeeds.firstIdentifiedAt, comparison.previousStartsAt),
      lte(organizationalNeeds.firstIdentifiedAt, comparison.endsAt),
    ))
    .groupBy(organizationalNeeds.category);
  const emerging = comparisonRows
    .map((row) => {
      const recentOrganizations = Number(row.recentOrganizations);
      const previousOrganizations = Number(row.previousOrganizations);
      const organizations = categoryCounts.get(row.category)?.organizations ?? 0;
      return {
        category: row.category,
        label: NEEDS_CATEGORY_LABELS[row.category],
        organizations,
        recentOrganizations,
        previousOrganizations,
        change: recentOrganizations - previousOrganizations,
      };
    })
    .filter((row) => isMeaningfulNeedIncrease(row.recentOrganizations, row.previousOrganizations))
    .sort((left, right) => right.change - left.change || right.recentOrganizations - left.recentOrganizations);
  const hasPreviousPeriodData = comparisonRows.some((row) => Number(row.previousOrganizations) > 0);

  return {
    period,
    periodLabel: window.label,
    granularity: window.granularity,
    totalOrganizations: Number(lifetimeOrganizations[0]?.organizations ?? 0),
    representedOrganizations,
    totalNeeds: Number(overall?.needs ?? 0),
    mostCommonCategory,
    categories,
    trends,
    emerging,
    hasPreviousPeriodData,
  };
}
