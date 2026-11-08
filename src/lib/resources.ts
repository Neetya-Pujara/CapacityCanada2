import { and, desc, eq, gt, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { resourceCategories, resources, type ResourceRecommendationSnapshot } from "@/lib/db/schema";
import type { SUPPORT_AREAS } from "@/lib/validation";

export type ResourceCategory = (typeof SUPPORT_AREAS)[number];

export type ResourceInput = {
  title: string;
  description: string;
  url: string;
  sourceOrganization: string;
  categories: ResourceCategory[];
  lastVerifiedAt: string | null;
  adminNotes: string | null;
};

export type ResourceRecord = Omit<ResourceInput, "lastVerifiedAt"> & {
  id: string;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  seedKey: string | null;
};

const categoryKeywords: Record<ResourceCategory, string[]> = {
  "Marketing & Communications": ["marketing", "communication", "website", "social media", "publicity", "brand"],
  Fundraising: ["fundrais", "donor", "grant", "revenue", "campaign", "philanthropy"],
  HR: ["human resource", "staff", "employee", "hiring", "workforce", "team", "employment"],
  "Volunteer Management": ["volunteer", "recruit", "retention", "engagement"],
  "Governance & Leadership": ["governance", "board", "leadership", "director", "succession", "policy"],
  "Financial Management": ["financial", "finance", "budget", "accounting", "cash flow", "audit"],
  "Technology & Digital Transformation": ["technology", "digital", "software", "data", "cyber", "automation"],
  "Strategic Planning": ["strateg", "planning", "priorit", "mission", "impact", "capacity"],
  Other: [],
};

function escapedSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function groupResources(rows: Array<{
  resource: typeof resources.$inferSelect;
  category: ResourceCategory | null;
}>): ResourceRecord[] {
  const grouped = new Map<string, ResourceRecord>();
  for (const { resource, category } of rows) {
    let item = grouped.get(resource.id);
    if (!item) {
      item = {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        url: resource.url,
        sourceOrganization: resource.sourceOrganization,
        categories: [],
        lastVerifiedAt: resource.lastVerifiedAt,
        adminNotes: resource.adminNotes,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt,
        seedKey: resource.seedKey,
      };
      grouped.set(resource.id, item);
    }
    if (category) item.categories.push(category);
  }
  return [...grouped.values()];
}

async function selectResources(filters: {
  search?: string;
  category?: ResourceCategory;
  ids?: string[];
  categories?: ResourceCategory[];
  verifiedAfter?: Date;
} = {}): Promise<ResourceRecord[]> {
  const conditions = [];
  if (filters.search) {
    const pattern = `%${escapedSearch(filters.search)}%`;
    conditions.push(or(ilike(resources.title, pattern), ilike(resources.description, pattern))!);
  }
  if (filters.ids?.length) conditions.push(inArray(resources.id, filters.ids));
  if (filters.category) {
    conditions.push(inArray(
      resources.id,
      getDb().select({ id: resourceCategories.resourceId })
        .from(resourceCategories)
        .where(eq(resourceCategories.category, filters.category)),
    ));
  }
  if (filters.categories?.length) {
    conditions.push(inArray(
      resources.id,
      getDb().select({ id: resourceCategories.resourceId })
        .from(resourceCategories)
        .where(inArray(resourceCategories.category, filters.categories)),
    ));
  }
  if (filters.verifiedAfter) conditions.push(gt(resources.lastVerifiedAt, filters.verifiedAfter));

  const rows = await getDb()
    .select({ resource: resources, category: resourceCategories.category })
    .from(resources)
    .leftJoin(resourceCategories, eq(resources.id, resourceCategories.resourceId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(resources.updatedAt));
  return groupResources(rows);
}

export function listResources(filters: { search?: string; category?: ResourceCategory } = {}) {
  return selectResources(filters);
}

export async function getResource(id: string) {
  const [resource] = await selectResources({ ids: [id] });
  return resource ?? null;
}

export async function createResource(input: ResourceInput) {
  const db = getDb();
  const id = await db.transaction(async (tx) => {
    const [resource] = await tx.insert(resources).values({
      title: input.title,
      description: input.description,
      url: input.url,
      sourceOrganization: input.sourceOrganization,
      lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null,
      adminNotes: input.adminNotes,
    }).returning();
    await tx.insert(resourceCategories).values(input.categories.map((category) => ({
      resourceId: resource.id,
      category,
    })));
    return resource.id;
  });
  return getResource(id);
}

export async function updateResource(id: string, input: ResourceInput) {
  const db = getDb();
  const updatedId = await db.transaction(async (tx) => {
    const [resource] = await tx.update(resources)
      .set({
        title: input.title,
        description: input.description,
        url: input.url,
        sourceOrganization: input.sourceOrganization,
        lastVerifiedAt: input.lastVerifiedAt ? new Date(input.lastVerifiedAt) : null,
        adminNotes: input.adminNotes,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))
      .returning({ id: resources.id });
    if (!resource) return null;

    await tx.delete(resourceCategories).where(eq(resourceCategories.resourceId, id));
    await tx.insert(resourceCategories).values(input.categories.map((category) => ({
      resourceId: id,
      category,
    })));
    return resource.id;
  });
  return updatedId ? getResource(updatedId) : null;
}

export async function deleteResource(id: string) {
  const [deleted] = await getDb().delete(resources)
    .where(eq(resources.id, id))
    .returning({ id: resources.id });
  return Boolean(deleted);
}

export async function findResourceCandidates(input: {
  profileSupportAreas: ResourceCategory[];
  organizationContext: string;
  recentConversation: string;
}): Promise<ResourceRecord[]> {
  const searchableContext = `${input.organizationContext} ${input.recentConversation}`.toLowerCase();
  const matchedCategories = Object.entries(categoryKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => searchableContext.includes(keyword)))
    .map(([category]) => category as ResourceCategory);
  const preferredCategories = [...new Set([...matchedCategories, ...input.profileSupportAreas])];
  const verifiedAfter = new Date();
  verifiedAfter.setFullYear(verifiedAfter.getFullYear() - 1);
  const candidates = await selectResources({ categories: preferredCategories, verifiedAfter });
  return candidates.slice(0, 24);
}

export function toRecommendationSnapshot(
  resource: ResourceRecord,
  whyRelevant: string,
): ResourceRecommendationSnapshot {
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    url: resource.url,
    sourceOrganization: resource.sourceOrganization,
    categories: resource.categories,
    lastVerifiedAt: resource.lastVerifiedAt?.toISOString() ?? null,
    whyRelevant,
  };
}
