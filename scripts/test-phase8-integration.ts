import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { count, eq, inArray } from "drizzle-orm";
import { config as loadEnv } from "dotenv";
import { closeDb, getDb } from "../src/lib/db";
import {
  events,
  notifications,
  organizationalNeeds,
  organizationProfiles,
  organizations,
  users,
} from "../src/lib/db/schema";
import { listPublishedEvents, saveAdminEvent } from "../src/lib/events";
import { listUserNotifications, markUserNotificationAsRead } from "../src/lib/notifications";
import type { EventInput } from "../src/lib/validation";

loadEnv({ path: ".env.local" });

async function verifyPhase8Integration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Set DATABASE_URL before running this integration test.");
  }
  const db = getDb();
  const suffix = randomUUID();
  const organizationIds: string[] = [];
  const userIds: string[] = [];
  const eventIds: string[] = [];

  try {
    const uniqueKeyword = `capacitytest${suffix.replaceAll("-", "")}`;
    const [matchingOrganization] = await db.insert(organizations).values({
      name: `Capacity Connect integration ${suffix}`,
    }).returning({ id: organizations.id });
    const [unrelatedOrganization] = await db.insert(organizations).values({
      name: `Capacity Connect unrelated ${suffix}`,
    }).returning({ id: organizations.id });
    organizationIds.push(matchingOrganization.id, unrelatedOrganization.id);

    await db.insert(organizationProfiles).values([
      {
        organizationId: matchingOrganization.id,
        primaryMission: `Provide accessible support for local communities ${uniqueKeyword}.`,
        communitiesServed: "Community members in the region.",
        paidStaffCount: 2,
        volunteerCount: 4,
        operationalChallenges: "Improve digital records and data coordination.",
        supportAreas: ["Other"],
        otherSupportArea: uniqueKeyword,
      },
      {
        organizationId: unrelatedOrganization.id,
        primaryMission: "Provide accessible support for local communities.",
        communitiesServed: "Community members in the region.",
        paidStaffCount: 1,
        volunteerCount: 2,
        operationalChallenges: "Strengthen governance and board participation.",
        supportAreas: ["Governance & Leadership"],
        otherSupportArea: null,
      },
    ]);

    const createdUsers = await db.insert(users).values([
      {
        fullName: "Integration Staff One",
        email: `phase8-${suffix}-one@example.invalid`,
        username: `p8-${suffix.slice(0, 20)}-1`,
        passwordHash: "integration-test-only",
        role: "NONPROFIT_STAFF",
        organizationId: matchingOrganization.id,
      },
      {
        fullName: "Integration Staff Two",
        email: `phase8-${suffix}-two@example.invalid`,
        username: `p8-${suffix.slice(0, 20)}-2`,
        passwordHash: "integration-test-only",
        role: "NONPROFIT_STAFF",
        organizationId: matchingOrganization.id,
      },
      {
        fullName: "Unrelated Integration Staff",
        email: `phase8-${suffix}-other@example.invalid`,
        username: `p8-${suffix.slice(0, 19)}-3`,
        passwordHash: "integration-test-only",
        role: "NONPROFIT_STAFF",
        organizationId: unrelatedOrganization.id,
      },
    ]).returning({ id: users.id });
    userIds.push(...createdUsers.map((user) => user.id));

    await db.insert(organizationalNeeds).values({
      organizationId: matchingOrganization.id,
      category: "Other",
      canonicalKey: `integration-${suffix}`,
      challenge: `Support ${uniqueKeyword}`,
      description: `Build capacity around ${uniqueKeyword}.`,
      relevantContext: "",
      status: "ACTIVE",
    });

    const startsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const draft: EventInput = {
      title: uniqueKeyword,
      summary: "A focused workshop.",
      description: `A practical session about ${uniqueKeyword}.`,
      categories: ["Other"],
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      location: "Online",
      registrationUrl: "https://example.invalid/register",
      registrationDeadline: null,
      imageUrl: null,
      status: "DRAFT",
    };

    const savedDraft = await saveAdminEvent(draft);
    assert.ok(savedDraft);
    eventIds.push(savedDraft.id);
    assert.equal((await listPublishedEvents()).some((event) => event.id === savedDraft.id), false);
    const [draftNotifications] = await db.select({ count: count() })
      .from(notifications)
      .where(eq(notifications.eventId, savedDraft.id));
    assert.equal(draftNotifications.count, 0);

    const published = await saveAdminEvent({ ...draft, status: "PUBLISHED" }, savedDraft.id);
    assert.ok(published);
    assert.equal((await listPublishedEvents()).some((event) => event.id === published.id), true);

    const [createdNotifications] = await db.select({ count: count() })
      .from(notifications)
      .where(eq(notifications.eventId, published.id));
    assert.equal(createdNotifications.count, 2, "each matching staff member gets one notification");

    const [first, second, unrelated] = createdUsers;
    const firstNotifications = await listUserNotifications(first.id, matchingOrganization.id);
    const secondNotifications = await listUserNotifications(second.id, matchingOrganization.id);
    const unrelatedNotifications = await listUserNotifications(unrelated.id, unrelatedOrganization.id);
    assert.equal(firstNotifications.unreadCount, 1);
    assert.equal(secondNotifications.unreadCount, 1);
    assert.equal(unrelatedNotifications.notifications.length, 0);
    assert.equal(
      await markUserNotificationAsRead(unrelated.id, unrelatedOrganization.id, firstNotifications.notifications[0].id),
      false,
      "a different staff account cannot mark another recipient's notification as read",
    );
    assert.equal(
      await markUserNotificationAsRead(first.id, matchingOrganization.id, firstNotifications.notifications[0].id),
      true,
    );
    assert.equal((await listUserNotifications(first.id, matchingOrganization.id)).unreadCount, 0);
    assert.equal((await listUserNotifications(second.id, matchingOrganization.id)).unreadCount, 1);

    await saveAdminEvent({ ...draft, status: "PUBLISHED", summary: "Edited published summary." }, published.id);
    const draftAgain = await saveAdminEvent({ ...draft, status: "DRAFT" }, published.id);
    assert.ok(draftAgain);
    await saveAdminEvent({ ...draft, status: "PUBLISHED" }, published.id);
    const [afterRepublish] = await db.select({ count: count() })
      .from(notifications)
      .where(eq(notifications.eventId, published.id));
    assert.equal(afterRepublish.count, 2, "editing and republishing do not duplicate notifications");

    const cancelled = await saveAdminEvent({ ...draft, status: "CANCELLED" }, published.id);
    assert.ok(cancelled);
    assert.equal((await listPublishedEvents()).some((event) => event.id === cancelled.id), false);
    assert.equal((await listUserNotifications(second.id, matchingOrganization.id)).notifications[0].eventAvailable, false);
    console.info("Phase 8 database integration checks passed; temporary test records will be removed.");
  } finally {
    if (eventIds.length) {
      await db.delete(notifications).where(inArray(notifications.eventId, eventIds));
    }
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    if (eventIds.length) await db.delete(events).where(inArray(events.id, eventIds));
    if (organizationIds.length) {
      await db.delete(organizations).where(inArray(organizations.id, organizationIds));
    }
    await closeDb();
  }
}

verifyPhase8Integration().catch((error: unknown) => {
  console.error("Phase 8 integration test failed.", error);
  process.exitCode = 1;
});
