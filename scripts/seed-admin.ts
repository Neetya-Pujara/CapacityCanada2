import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { closeDb, getDb } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/passwords";

loadEnv({ path: ".env.local" });

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.local before seeding the admin account.");
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("ADMIN_USERNAME must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.");
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters and no more than 72 UTF-8 bytes.");
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || `${username}@admin.capacityconnect.invalid`;
  if (!z.string().email().max(254).safeParse(email).success) {
    throw new Error("ADMIN_EMAIL must be a valid email address when provided.");
  }
  const db = getDb();
  const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.username, username)).limit(1);
  if (existing) {
    if (existing.role !== "CAPACITY_CANADA_ADMIN") {
      throw new Error("ADMIN_USERNAME is already assigned to a non-admin account; no changes were made.");
    }
    console.info("The configured Capacity Canada admin already exists; no changes were made.");
    return;
  }
  const [configuredAdmin] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.role, "CAPACITY_CANADA_ADMIN"))
    .limit(1);
  if (configuredAdmin) {
    throw new Error("A Capacity Canada admin already exists; no second admin account was created.");
  }

  try {
    await db.insert(users).values({
      fullName: "Capacity Canada Admin",
      email,
      username,
      passwordHash: await hashPassword(password),
      role: "CAPACITY_CANADA_ADMIN",
      organizationId: null,
    });
    console.info("The initial Capacity Canada admin account was created.");
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("The admin username or email is already in use; no account was created.");
    }
    throw error;
  }
}

seedAdmin()
  .catch((error: unknown) => {
    console.error("Admin seeding failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
