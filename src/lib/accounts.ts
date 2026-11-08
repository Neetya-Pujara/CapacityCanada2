import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationProfiles, organizations, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/passwords";
import type { NonprofitRegistration } from "@/lib/validation";

export class DuplicateAccountError extends Error {
  constructor(public readonly field: "email" | "username") {
    super(`An account with that ${field} already exists.`);
    this.name = "DuplicateAccountError";
  }
}

function isUniqueViolation(error: unknown): error is { code: string; constraint?: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function duplicateField(error: unknown): "email" | "username" | null {
  if (!isUniqueViolation(error)) return null;
  if (error.constraint?.includes("email")) return "email";
  if (error.constraint?.includes("username")) return "username";
  return "email";
}

export async function createNonprofitAccount(input: NonprofitRegistration): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, input.email), eq(users.username, input.username)));

  if (existing.some((user) => user.email === input.email)) {
    throw new DuplicateAccountError("email");
  }
  if (existing.some((user) => user.username === input.username)) {
    throw new DuplicateAccountError("username");
  }

  const passwordHash = await hashPassword(input.password);
  try {
    await db.transaction(async (transaction) => {
      const [organization] = await transaction
        .insert(organizations)
        .values({
          name: input.organizationName,
          website: input.website || null,
        })
        .returning({ id: organizations.id });

      await transaction.insert(users).values({
        fullName: input.fullName,
        email: input.email,
        username: input.username,
        passwordHash,
        role: "NONPROFIT_STAFF",
        organizationId: organization.id,
      });

      await transaction.insert(organizationProfiles).values({
        organizationId: organization.id,
        primaryMission: input.primaryMission,
        communitiesServed: input.communitiesServed,
        paidStaffCount: input.paidStaffCount,
        volunteerCount: input.volunteerCount,
        operationalChallenges: input.operationalChallenges,
        supportAreas: input.supportAreas,
        otherSupportArea: input.supportAreas.includes("Other") ? input.otherSupportArea : null,
      });
    });
  } catch (error) {
    const field = duplicateField(error);
    if (field) throw new DuplicateAccountError(field);
    throw error;
  }
}

export async function updateNonprofitAccount(
  userId: string,
  input: Omit<NonprofitRegistration, "password" | "confirmPassword">,
): Promise<void> {
  const db = getDb();
  const [user] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "NONPROFIT_STAFF")))
    .limit(1);
  const organizationId = user?.organizationId;
  if (!user || !organizationId) {
    throw new Error("The authenticated nonprofit account has no organization.");
  }

  const existing = await db
    .select({ id: users.id, email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, input.email), eq(users.username, input.username)));

  if (existing.some((row) => row.id !== userId && row.email === input.email)) {
    throw new DuplicateAccountError("email");
  }
  if (existing.some((row) => row.id !== userId && row.username === input.username)) {
    throw new DuplicateAccountError("username");
  }

  try {
    await db.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({
          fullName: input.fullName,
          email: input.email,
          username: input.username,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await transaction
        .update(organizations)
        .set({
          name: input.organizationName,
          website: input.website || null,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId));

      await transaction
        .update(organizationProfiles)
        .set({
          primaryMission: input.primaryMission,
          communitiesServed: input.communitiesServed,
          paidStaffCount: input.paidStaffCount,
          volunteerCount: input.volunteerCount,
          operationalChallenges: input.operationalChallenges,
          supportAreas: input.supportAreas,
          otherSupportArea: input.supportAreas.includes("Other") ? input.otherSupportArea : null,
          updatedAt: new Date(),
        })
        .where(eq(organizationProfiles.organizationId, organizationId));
    });
  } catch (error) {
    const field = duplicateField(error);
    if (field) throw new DuplicateAccountError(field);
    throw error;
  }
}
