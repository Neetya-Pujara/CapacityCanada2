import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { organizationProfiles, organizations, users } from "@/lib/db/schema";

export async function getNonprofitProfile(userId: string) {
  const db = getDb();
  const [profile] = await db
    .select({
      organizationId: users.organizationId,
      fullName: users.fullName,
      email: users.email,
      username: users.username,
      organizationName: organizations.name,
      website: organizations.website,
      primaryMission: organizationProfiles.primaryMission,
      communitiesServed: organizationProfiles.communitiesServed,
      paidStaffCount: organizationProfiles.paidStaffCount,
      volunteerCount: organizationProfiles.volunteerCount,
      operationalChallenges: organizationProfiles.operationalChallenges,
      supportAreas: organizationProfiles.supportAreas,
      otherSupportArea: organizationProfiles.otherSupportArea,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .innerJoin(organizationProfiles, eq(organizations.id, organizationProfiles.organizationId))
    .where(and(eq(users.id, userId), eq(users.role, "NONPROFIT_STAFF")))
    .limit(1);
  return profile ?? null;
}
