import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { config as loadEnv } from "dotenv";
import { closeDb, getDb } from "../src/lib/db";
import { organizationalNeeds, organizations } from "../src/lib/db/schema";
import { getNeedsIntelligenceReport } from "../src/lib/needs-intelligence";

loadEnv({ path: ".env.local" });

async function verifyNeedsIntelligence() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL before running this integration test.");
  }
  const db = getDb();
  const suffix = randomUUID();
  const now = new Date();
  const organizationIds: string[] = [];

  try {
    const before30Days = await getNeedsIntelligenceReport("30d", now);
    const beforeSixMonths = await getNeedsIntelligenceReport("6m", now);
    const beforeAllTime = await getNeedsIntelligenceReport("all", now);
    const createdOrganizations = await db.insert(organizations).values([
      { name: `Needs analytics integration one ${suffix}` },
      { name: `Needs analytics integration two ${suffix}` },
      { name: `Needs analytics integration three ${suffix}` },
    ]).returning({ id: organizations.id });
    organizationIds.push(...createdOrganizations.map(({ id }) => id));

    const [one, two, three] = organizationIds;
    const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const previous = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const outside30Days = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
    await db.insert(organizationalNeeds).values([
      {
        organizationId: one,
        category: "Fundraising",
        canonicalKey: `integration-${suffix}-f1`,
        challenge: "Integration need fundraising 1",
        description: "Integration need fundraising 1",
        relevantContext: "",
        firstIdentifiedAt: recent,
      },
      {
        organizationId: one,
        category: "Fundraising",
        canonicalKey: `integration-${suffix}-f2`,
        challenge: "Integration need fundraising 2",
        description: "Integration need fundraising 2",
        relevantContext: "",
        firstIdentifiedAt: recent,
      },
      {
        organizationId: two,
        category: "Fundraising",
        canonicalKey: `integration-${suffix}-f3`,
        challenge: "Integration need fundraising 3",
        description: "Integration need fundraising 3",
        relevantContext: "",
        firstIdentifiedAt: recent,
      },
      {
        organizationId: three,
        category: "Fundraising",
        canonicalKey: `integration-${suffix}-f4`,
        challenge: "Integration need fundraising 4",
        description: "Integration need fundraising 4",
        relevantContext: "",
        firstIdentifiedAt: recent,
      },
      {
        organizationId: three,
        category: "Fundraising",
        canonicalKey: `integration-${suffix}-f5`,
        challenge: "Integration need fundraising 5",
        description: "Integration need fundraising 5",
        relevantContext: "",
        firstIdentifiedAt: previous,
      },
      {
        organizationId: one,
        category: "Financial Management",
        canonicalKey: `integration-${suffix}-m1`,
        challenge: "Integration need financial 1",
        description: "Integration need financial 1",
        relevantContext: "",
        firstIdentifiedAt: outside30Days,
      },
      {
        organizationId: one,
        category: "Technology & Digital Transformation",
        canonicalKey: `integration-${suffix}-inactive`,
        challenge: "Inactive integration need",
        description: "Inactive integration need",
        relevantContext: "",
        firstIdentifiedAt: recent,
        status: "INACTIVE",
      },
    ]);

    const after30Days = await getNeedsIntelligenceReport("30d", now);
    const afterSixMonths = await getNeedsIntelligenceReport("6m", now);
    const afterAllTime = await getNeedsIntelligenceReport("all", now);
    assert.equal(after30Days.totalNeeds - before30Days.totalNeeds, 5);
    assert.equal(after30Days.representedOrganizations - before30Days.representedOrganizations, 3);
    assert.equal(
      after30Days.categories.find(({ category }) => category === "Fundraising")!.organizations -
        before30Days.categories.find(({ category }) => category === "Fundraising")!.organizations,
      3,
      "category counts use distinct organizations rather than need-record totals",
    );
    assert.equal(
      after30Days.categories.find(({ category }) => category === "Fundraising")!.records -
        before30Days.categories.find(({ category }) => category === "Fundraising")!.records,
      5,
    );
    assert.equal(after30Days.trends.reduce((sum, point) => sum + point.total, 0) -
      before30Days.trends.reduce((sum, point) => sum + point.total, 0), 5);
    assert.equal(
      after30Days.emerging.find(({ category }) => category === "Fundraising")?.change,
      2,
      "emerging needs compare distinct organizations in equivalent intervals",
    );
    assert.equal(
      afterSixMonths.totalNeeds - beforeSixMonths.totalNeeds,
      6,
      "six-month period includes the need outside the last 30 days but excludes inactive needs",
    );
    assert.equal(afterAllTime.totalNeeds - beforeAllTime.totalNeeds, 6);
    assert.equal(afterAllTime.totalOrganizations - beforeAllTime.totalOrganizations, 3);

    const emptyReport = await getNeedsIntelligenceReport("30d", new Date("2200-01-01T00:00:00.000Z"));
    assert.equal(emptyReport.totalNeeds, 0);
    assert.equal(emptyReport.trends.length, 0);
    assert.equal(emptyReport.emerging.length, 0);
    assert.equal(emptyReport.hasPreviousPeriodData, false);
    assert.equal(emptyReport.categories.length, 9);
    assert.ok(emptyReport.categories.every(({ organizations: total }) => total === 0));
    console.info("Needs Intelligence database integration checks passed; temporary test organizations will be removed.");
  } finally {
    if (organizationIds.length) {
      await db.delete(organizationalNeeds).where(inArray(organizationalNeeds.organizationId, organizationIds));
      await db.delete(organizations).where(inArray(organizations.id, organizationIds));
    }
    await closeDb();
  }
}

verifyNeedsIntelligence().catch((error: unknown) => {
  console.error("Needs Intelligence integration test failed.", error);
  process.exitCode = 1;
});
