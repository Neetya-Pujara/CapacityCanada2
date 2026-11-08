import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  eventCategories,
  events,
  notifications,
  organizationalNeeds,
  organizationProfiles,
  organizations,
  users,
} from "@/lib/db/schema";
import { matchEventToOrganization, type MatchableEvent, type OrganizationMatchContext } from "@/lib/event-matching";
import type { EventInput } from "@/lib/validation";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "ARCHIVED";
export type EventCategory = EventInput["categories"][number];
export type EventRecord = {
  id: string;
  title: string;
  summary: string;
  description: string;
  categories: EventCategory[];
  startsAt: Date;
  endsAt: Date;
  location: string;
  registrationUrl: string | null;
  registrationDeadline: string | null;
  imageUrl: string | null;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
};

function escapedSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function selectEvents(filters: {
  status?: EventStatus;
  search?: string;
  category?: EventCategory;
  id?: string;
  limit?: number;
} = {}): Promise<EventRecord[]> {
  const conditions = [];
  if (filters.status) conditions.push(eq(events.status, filters.status));
  if (filters.id) conditions.push(eq(events.id, filters.id));
  if (filters.search) {
    const pattern = `%${escapedSearch(filters.search)}%`;
    conditions.push(or(
      ilike(events.title, pattern),
      ilike(events.summary, pattern),
      ilike(events.description, pattern),
    )!);
  }
  if (filters.category) {
    conditions.push(inArray(
      events.id,
      getDb().select({ id: eventCategories.eventId })
        .from(eventCategories)
        .where(eq(eventCategories.category, filters.category)),
    ));
  }

  const rows = await getDb()
    .select({ event: events, category: eventCategories.category })
    .from(events)
    .leftJoin(eventCategories, eq(events.id, eventCategories.eventId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      filters.status === "PUBLISHED" ? events.startsAt : desc(events.updatedAt),
      events.id,
    )
    .limit(Math.min(filters.limit ?? 300, 1000));

  const grouped = new Map<string, EventRecord>();
  for (const { event, category } of rows) {
    let record = grouped.get(event.id);
    if (!record) {
      const newRecord = { ...event, categories: [] };
      grouped.set(event.id, newRecord);
      record = newRecord;
    }
    if (category) record.categories.push(category);
  }
  return [...grouped.values()];
}

export function listAdminEvents(filters: {
  status?: EventStatus;
  search?: string;
  category?: EventCategory;
} = {}) {
  return selectEvents(filters);
}

export function listPublishedEvents(filters: {
  search?: string;
  category?: EventCategory;
} = {}) {
  return selectEvents({ ...filters, status: "PUBLISHED" });
}

export async function getPublishedEvent(id: string) {
  const [event] = await selectEvents({ status: "PUBLISHED", id, limit: 1 });
  return event ?? null;
}

export async function getRecommendedEventsForOrganization(
  organizationId: string,
  profile: {
    primaryMission: string;
    operationalChallenges: string;
    supportAreas: string[];
  },
) {
  const [publishedEvents, needs] = await Promise.all([
    listPublishedEvents(),
    getDb().select({
      category: organizationalNeeds.category,
      description: organizationalNeeds.description,
    })
      .from(organizationalNeeds)
      .where(and(
        eq(organizationalNeeds.organizationId, organizationId),
        eq(organizationalNeeds.status, "ACTIVE"),
      )),
  ]);
  return matchEvents(publishedEvents, {
    supportAreas: profile.supportAreas,
    mission: profile.primaryMission,
    operationalChallenges: profile.operationalChallenges,
    needs,
  });
}

function matchEvents(events: EventRecord[], organization: OrganizationMatchContext) {
  return events
    .map((event) => matchEventToOrganization(event, organization))
    .filter((match): match is NonNullable<typeof match> => match !== null)
    .sort((left, right) =>
      right.score - left.score ||
      new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime(),
    )
    .slice(0, 4);
}

export async function saveAdminEvent(
  input: EventInput,
  eventId?: string,
): Promise<EventRecord | null> {
  const db = getDb();
  const savedId = await db.transaction(async (tx) => {
    const now = new Date();
    let previousStatus: EventStatus | null = null;
    let id = eventId;
    if (eventId) {
      const [current] = await tx.select({ status: events.status })
        .from(events)
        .where(eq(events.id, eventId))
        .for("update")
        .limit(1);
      if (!current) return null;
      previousStatus = current.status;
      await tx.update(events).set({
        title: input.title,
        summary: input.summary,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        location: input.location,
        registrationUrl: input.registrationUrl || null,
        registrationDeadline: input.registrationDeadline || null,
        imageUrl: input.imageUrl || null,
        status: input.status,
        updatedAt: now,
      }).where(eq(events.id, eventId));
      await tx.delete(eventCategories).where(eq(eventCategories.eventId, eventId));
    } else {
      const [created] = await tx.insert(events).values({
        title: input.title,
        summary: input.summary,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        location: input.location,
        registrationUrl: input.registrationUrl || null,
        registrationDeadline: input.registrationDeadline || null,
        imageUrl: input.imageUrl || null,
        status: input.status,
      }).returning({ id: events.id });
      id = created.id;
    }
    if (!id) throw new Error("The event could not be saved.");
    const savedEventId = id;

    await tx.insert(eventCategories).values(input.categories.map((category) => ({
      eventId: savedEventId,
      category,
    })));

    if (input.status === "PUBLISHED" && previousStatus !== "PUBLISHED") {
      const profiles = await tx.select({
        organizationId: organizations.id,
        mission: organizationProfiles.primaryMission,
        operationalChallenges: organizationProfiles.operationalChallenges,
        supportAreas: organizationProfiles.supportAreas,
      })
        .from(organizations)
        .innerJoin(organizationProfiles, eq(organizationProfiles.organizationId, organizations.id));
      const needs = profiles.length
        ? await tx.select({
            organizationId: organizationalNeeds.organizationId,
            category: organizationalNeeds.category,
            description: organizationalNeeds.description,
          })
            .from(organizationalNeeds)
            .where(and(
              inArray(
                organizationalNeeds.organizationId,
                profiles.map((profile) => profile.organizationId),
              ),
              eq(organizationalNeeds.status, "ACTIVE"),
            ))
        : [];
      const event: MatchableEvent = {
        id: savedEventId,
        title: input.title,
        summary: input.summary,
        description: input.description,
        categories: input.categories,
        status: input.status,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        location: input.location,
      };
      const matches = profiles.flatMap((profile) => {
        const context: OrganizationMatchContext = {
          supportAreas: profile.supportAreas,
          mission: profile.mission,
          operationalChallenges: profile.operationalChallenges,
          needs: needs
            .filter((need) => need.organizationId === profile.organizationId)
            .map(({ category, description }) => ({ category, description })),
        };
        const match = matchEventToOrganization(event, context);
        return match ? [{ organizationId: profile.organizationId, reason: match.reason }] : [];
      });

      for (const match of matches) {
        const recipients = await tx.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.organizationId, match.organizationId),
            eq(users.role, "NONPROFIT_STAFF"),
          ));
        if (!recipients.length) continue;
        await tx.insert(notifications).values(recipients.map((recipient) => ({
          recipientUserId: recipient.id,
          organizationId: match.organizationId,
          eventId: savedEventId,
          title: input.title,
          message: "A new capacity-building event may be relevant to your organization.",
          reason: match.reason,
        }))).onConflictDoNothing({
          target: [notifications.eventId, notifications.recipientUserId],
        });
      }
    }
    return savedEventId;
  });
  return savedId ? getAdminEvent(savedId) : null;
}

export async function getAdminEvent(id: string) {
  const [event] = await selectEvents({ id, limit: 1 });
  return event ?? null;
}

export async function deleteAdminEvent(id: string) {
  const [deleted] = await getDb().delete(events)
    .where(eq(events.id, id))
    .returning({ id: events.id });
  return Boolean(deleted);
}
