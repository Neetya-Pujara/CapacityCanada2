import {
  AnyPgColumn,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const accountRole = pgEnum("account_role", [
  "NONPROFIT_STAFF",
  "CAPACITY_CANADA_ADMIN",
]);

export const supportArea = pgEnum("support_area", [
  "Marketing & Communications",
  "Fundraising",
  "HR",
  "Volunteer Management",
  "Governance & Leadership",
  "Financial Management",
  "Technology & Digital Transformation",
  "Strategic Planning",
  "Other",
]);

export const conversationSender = pgEnum("conversation_sender", ["USER", "ASSISTANT"]);
export const messageGenerationStatus = pgEnum("message_generation_status", [
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);
export const eventStatus = pgEnum("event_status", [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "ARCHIVED",
]);
export const organizationalNeedStatus = pgEnum("organizational_need_status", [
  "ACTIVE",
  "RESOLVED",
  "INACTIVE",
]);

export type ResourceRecommendationSnapshot = {
  id: string;
  title: string;
  description: string;
  url: string;
  sourceOrganization: string;
  categories: (typeof supportArea.enumValues)[number][];
  lastVerifiedAt: string | null;
  whyRelevant: string;
};

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  website: varchar("website", { length: 2048 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    username: varchar("username", { length: 32 }).notNull(),
    passwordHash: varchar("password_hash", { length: 100 }).notNull(),
    role: accountRole("role").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_unique_idx").on(sql`lower(${table.email})`),
    uniqueIndex("users_username_unique_idx").on(sql`lower(${table.username})`),
    index("users_organization_id_idx").on(table.organizationId),
    check(
      "users_role_organization_check",
      sql`(${table.role} = 'NONPROFIT_STAFF' AND ${table.organizationId} IS NOT NULL)
        OR (${table.role} = 'CAPACITY_CANADA_ADMIN' AND ${table.organizationId} IS NULL)`,
    ),
  ],
);

export const organizationProfiles = pgTable(
  "organization_profiles",
  {
    organizationId: uuid("organization_id")
      .primaryKey()
      .references(() => organizations.id, { onDelete: "cascade" }),
    primaryMission: text("primary_mission").notNull(),
    communitiesServed: text("communities_served").notNull(),
    paidStaffCount: integer("paid_staff_count").notNull(),
    volunteerCount: integer("volunteer_count").notNull(),
    operationalChallenges: text("operational_challenges").notNull(),
    supportAreas: supportArea("support_areas")
      .array()
      .notNull()
      .default(sql`ARRAY[]::support_area[]`),
    otherSupportArea: varchar("other_support_area", { length: 240 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("organization_profiles_paid_staff_nonnegative", sql`${table.paidStaffCount} >= 0`),
    check("organization_profiles_volunteers_nonnegative", sql`${table.volunteerCount} >= 0`),
    check("organization_profiles_support_areas_nonempty", sql`cardinality(${table.supportAreas}) > 0`),
    check(
      "organization_profiles_other_support_area_check",
      sql`(
        (array_position(${table.supportAreas}, 'Other'::support_area) IS NOT NULL
          AND ${table.otherSupportArea} IS NOT NULL
          AND btrim(${table.otherSupportArea}) <> '')
        OR
        (array_position(${table.supportAreas}, 'Other'::support_area) IS NULL
          AND ${table.otherSupportArea} IS NULL)
      )`,
    ),
  ],
);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description").notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    sourceOrganization: varchar("source_organization", { length: 200 }).notNull(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    adminNotes: text("admin_notes"),
    seedKey: varchar("seed_key", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("resources_seed_key_unique_idx").on(table.seedKey),
    index("resources_created_at_idx").on(table.createdAt),
  ],
);

export const resourceCategories = pgTable(
  "resource_categories",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    category: supportArea("category").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.category] }),
    index("resource_categories_category_idx").on(table.category),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 240 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull().default(""),
    description: text("description").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 500 }).notNull(),
    registrationUrl: varchar("registration_url", { length: 2048 }),
    registrationDeadline: date("registration_deadline"),
    imageUrl: varchar("image_url", { length: 2048 }),
    status: eventStatus("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("events_status_starts_at_idx").on(table.status, table.startsAt),
    index("events_starts_at_idx").on(table.startsAt),
    index("events_updated_at_idx").on(table.updatedAt),
  ],
);

export const eventCategories = pgTable(
  "event_categories",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    category: supportArea("category").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.category] }),
    index("event_categories_category_idx").on(table.category),
  ],
);

export const organizationalNeeds = pgTable(
  "organizational_needs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "set null" }),
    category: supportArea("category").notNull(),
    canonicalKey: varchar("canonical_key", { length: 120 }).notNull(),
    challenge: varchar("challenge", { length: 240 }).notNull(),
    description: text("description").notNull(),
    relevantContext: text("relevant_context").notNull(),
    status: organizationalNeedStatus("status").notNull().default("ACTIVE"),
    firstIdentifiedAt: timestamp("first_identified_at", { withTimezone: true }).defaultNow().notNull(),
    lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organizational_needs_identity_unique_idx").on(
      table.organizationId,
      table.category,
      table.canonicalKey,
    ),
    index("organizational_needs_org_idx").on(table.organizationId),
    index("organizational_needs_category_status_idx").on(table.category, table.status),
    index("organizational_needs_last_observed_idx").on(table.lastObservedAt),
    index("organizational_needs_conversation_idx").on(table.conversationId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }).notNull(),
    message: varchar("message", { length: 500 }).notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notifications_event_recipient_unique_idx").on(table.eventId, table.recipientUserId),
    index("notifications_recipient_created_idx").on(table.recipientUserId, table.createdAt),
    index("notifications_recipient_read_idx").on(table.recipientUserId, table.readAt),
    index("notifications_organization_idx").on(table.organizationId),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique_idx").on(table.tokenHash),
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("conversations_user_updated_idx").on(table.userId, table.updatedAt),
    index("conversations_user_id_idx").on(table.userId),
  ],
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender: conversationSender("sender").notNull(),
    content: text("content").notNull(),
    requestId: uuid("request_id"),
    replyToMessageId: uuid("reply_to_message_id").references(
      (): AnyPgColumn => conversationMessages.id,
      { onDelete: "cascade" },
    ),
    generationStatus: messageGenerationStatus("generation_status")
      .notNull()
      .default("COMPLETED"),
    resourceRecommendations: jsonb("resource_recommendations").$type<ResourceRecommendationSnapshot[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("conversation_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("conversation_messages_reply_to_idx").on(table.replyToMessageId),
    uniqueIndex("conversation_messages_request_id_unique_idx").on(table.requestId),
    check(
      "conversation_messages_role_link_check",
      sql`(${table.sender} = 'USER' AND ${table.replyToMessageId} IS NULL)
        OR (${table.sender} = 'ASSISTANT' AND ${table.replyToMessageId} IS NOT NULL)`,
    ),
  ],
);

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  users: many(users),
  profile: one(organizationProfiles),
  needs: many(organizationalNeeds),
  notifications: many(notifications),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(authSessions),
  conversations: many(conversations),
  notifications: many(notifications),
}));

export const organizationProfilesRelations = relations(organizationProfiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationProfiles.organizationId],
    references: [organizations.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ many }) => ({
  categories: many(resourceCategories),
}));

export const resourceCategoriesRelations = relations(resourceCategories, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceCategories.resourceId],
    references: [resources.id],
  }),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  categories: many(eventCategories),
  notifications: many(notifications),
}));

export const eventCategoriesRelations = relations(eventCategories, ({ one }) => ({
  event: one(events, {
    fields: [eventCategories.eventId],
    references: [events.id],
  }),
}));

export const organizationalNeedsRelations = relations(organizationalNeeds, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationalNeeds.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [organizationalNeeds.conversationId],
    references: [conversations.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientUserId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
  event: one(events, {
    fields: [notifications.eventId],
    references: [events.id],
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(conversationMessages),
}));

export const conversationMessagesRelations = relations(
  conversationMessages,
  ({ one, many }) => ({
    conversation: one(conversations, {
      fields: [conversationMessages.conversationId],
      references: [conversations.id],
    }),
    replyTo: one(conversationMessages, {
      fields: [conversationMessages.replyToMessageId],
      references: [conversationMessages.id],
      relationName: "message_reply",
    }),
    replies: many(conversationMessages, {
      relationName: "message_reply",
    }),
  }),
);
