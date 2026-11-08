import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { authSessions, users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/passwords";

export const SESSION_COOKIE = "capacity-connect-session";
const SHORT_SESSION_HOURS = 12;
const REMEMBERED_SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateUser(
  identity: string,
  password: string,
  role: "NONPROFIT_STAFF" | "CAPACITY_CANADA_ADMIN",
) {
  const db = getDb();
  const normalizedIdentity = identity.trim().toLowerCase();
  let [account] = await db
    .select({
      id: users.id,
      role: users.role,
      passwordHash: users.passwordHash,
      username: users.username,
    })
    .from(users)
    .where(
      and(eq(users.role, role), eq(users.username, normalizedIdentity)),
    )
    .limit(1);

  if (role === "NONPROFIT_STAFF" && normalizedIdentity.includes("@")) {
    const [emailAccount] = await db
      .select({
        id: users.id,
        role: users.role,
        passwordHash: users.passwordHash,
        username: users.username,
      })
      .from(users)
      .where(and(eq(users.role, role), eq(users.email, normalizedIdentity)))
      .limit(1);
    account = emailAccount;
  }

  if (!account || !(await verifyPassword(password, account.passwordHash))) return null;
  return { id: account.id, role: account.role, username: account.username };
}

export async function createLoginSession(userId: string, remember: boolean): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() +
      (remember
        ? REMEMBERED_SESSION_DAYS * 24 * 60 * 60 * 1000
        : SHORT_SESSION_HOURS * 60 * 60 * 1000),
  );
  const db = getDb();
  await db.insert(authSessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: remember ? expiresAt : undefined,
    maxAge: remember ? REMEMBERED_SESSION_DAYS * 24 * 60 * 60 : undefined,
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const [session] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      username: users.username,
      role: users.role,
      organizationId: users.organizationId,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  return session ?? null;
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  try {
    if (token) {
      await getDb()
        .delete(authSessions)
        .where(eq(authSessions.tokenHash, hashToken(token)));
    }
  } finally {
    cookieStore.delete(SESSION_COOKIE);
  }
}
