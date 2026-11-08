import {
  AnyPgColumn,
  check,
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
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(authSessions),
  conversations: many(conversations),
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
