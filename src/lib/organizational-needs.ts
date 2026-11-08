import { createHash } from "node:crypto";
import { and, asc, eq, ilike, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  conversationMessages,
  conversations,
  organizationalNeeds,
  users,
} from "@/lib/db/schema";
import { SUPPORT_AREAS } from "@/lib/validation";

export type NeedCategory = (typeof SUPPORT_AREAS)[number];
export type ExtractedNeed = {
  category: NeedCategory;
  description: string;
  canonicalKey: string;
};

const categoryRules: Array<{ category: NeedCategory; patterns: RegExp[] }> = [
  {
    category: "Marketing & Communications",
    patterns: [/\bmarketing\b/i, /\bcommunications?\b/i, /\bsocial media\b/i, /\bbranding\b/i, /\bwebsite\b/i],
  },
  {
    category: "Fundraising",
    patterns: [/\bfundrais(?:e|ing|er|ers)\b/i, /\bdonor(?:s|ship)?\b/i, /\bgrant(?:s|writing)?\b/i, /\bphilanthrop(?:y|ic)\b/i, /\brevenue development\b/i],
  },
  {
    category: "HR",
    patterns: [/\bhuman resources?\b/i, /\bHR\b/i, /\bstaff(?:ing)?\b/i, /\bemployees?\b/i, /\bhiring\b/i, /\bworkforce\b/i],
  },
  {
    category: "Volunteer Management",
    patterns: [/\bvolunteers?\b/i, /\bvolunteer management\b/i, /\bvolunteer recruitment\b/i],
  },
  {
    category: "Governance & Leadership",
    patterns: [/\bgovernance\b/i, /\bboard\b/i, /\bleadership\b/i, /\bsuccession\b/i, /\bdirectors?\b/i],
  },
  {
    category: "Financial Management",
    patterns: [/\bfinancial?\b/i, /\bbudget(?:ing)?\b/i, /\baccounting\b/i, /\bcash flow\b/i, /\baudit(?:s|ing)?\b/i],
  },
  {
    category: "Technology & Digital Transformation",
    patterns: [/\btechnology\b/i, /\bdigital\b/i, /\bsoftware\b/i, /\bdata systems?\b/i, /\bcybersecurity\b/i, /\bautomation\b/i],
  },
  {
    category: "Strategic Planning",
    patterns: [/\bstrateg(?:y|ic|ies)\b/i, /\bplanning\b/i, /\bpriorit(?:y|ies|ize|izing)\b/i, /\bimpact measurement\b/i],
  },
];

export function normalizeNeed(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function sameNeedDescription(
  existing: { canonicalKey: string; challenge: string; description: string },
  candidate: ExtractedNeed,
) {
  const normalized = normalizeNeed(candidate.description);
  return normalizeNeed(existing.description) === normalized ||
    normalizeNeed(existing.challenge) === normalized ||
    normalizeNeed(existing.canonicalKey) === normalized;
}

export function inferSupportCategories(value: string): NeedCategory[] {
  return categoryRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(value)))
    .map((rule) => rule.category);
}

function getCategory(description: string): NeedCategory {
  return inferSupportCategories(description)[0] ?? "Other";
}

export function extractIdentifiedChallenges(response: string): ExtractedNeed[] {
  const lines = response.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) =>
    /^#{1,6}\s*identified challenges\s*#*\s*$/i.test(line.trim()),
  );
  if (headingIndex < 0) return [];

  const section: string[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (/^#{1,6}\s+/.test(line.trim())) break;
    section.push(line);
  }
  const sectionText = section.join("\n").trim();
  if (!sectionText || /^(?:none|no challenges?(?: were)? identified|not identified|no specific challenges?)\.?$/i.test(sectionText)) {
    return [];
  }

  const bulletItems = sectionText
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, "").replace(/^\*\*(.+?)\*\*:?\s*/, "$1: "))
    .filter((line) => line.length > 0);
  const candidates = bulletItems.length > 1
    ? bulletItems
    : sectionText.split(/\n{2,}/).map((part) => part.trim());

  const unique = new Map<string, ExtractedNeed>();
  for (const candidate of candidates) {
    const description = candidate.replace(/\s+/g, " ").trim().replace(/^[-*]\s*/, "").slice(0, 2000);
    const normalized = normalizeNeed(description);
    if (!normalized || /^(?:none|not identified|no specific challenges?)\.?$/.test(normalized)) continue;
    const canonicalKey = createHash("sha256").update(normalized).digest("hex");
    if (!unique.has(canonicalKey)) {
      unique.set(canonicalKey, {
        category: getCategory(description),
        description,
        canonicalKey,
      });
    }
  }
  return [...unique.values()];
}

export async function saveIdentifiedChallenges(input: {
  organizationId: string;
  conversationId: string;
  response: string;
}) {
  const needs = extractIdentifiedChallenges(input.response);
  if (!needs.length) return { extracted: 0, inserted: 0 };

  const inserted = await getDb().transaction(async (tx) => {
    let count = 0;
    for (const need of needs) {
      const existing = await tx.select({
        id: organizationalNeeds.id,
        conversationId: organizationalNeeds.conversationId,
        canonicalKey: organizationalNeeds.canonicalKey,
        challenge: organizationalNeeds.challenge,
        description: organizationalNeeds.description,
      })
        .from(organizationalNeeds)
        .where(and(
          eq(organizationalNeeds.organizationId, input.organizationId),
          eq(organizationalNeeds.category, need.category),
        ))
        .orderBy(asc(organizationalNeeds.createdAt))
        .for("update");
      const duplicate = existing.find((row) => sameNeedDescription(row, need));
      if (duplicate) {
        if (!duplicate.conversationId) {
          await tx.update(organizationalNeeds)
            .set({ conversationId: input.conversationId })
            .where(and(
              eq(organizationalNeeds.id, duplicate.id),
              isNull(organizationalNeeds.conversationId),
            ));
        }
        continue;
      }

      const [created] = await tx.insert(organizationalNeeds).values({
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        category: need.category,
        canonicalKey: need.canonicalKey,
        challenge: need.description.slice(0, 240),
        description: need.description,
        relevantContext: "",
        status: "ACTIVE",
      }).onConflictDoNothing({
        target: [
          organizationalNeeds.organizationId,
          organizationalNeeds.category,
          organizationalNeeds.canonicalKey,
        ],
      }).returning({ id: organizationalNeeds.id });
      if (created) count += 1;
    }
    return count;
  });

  return { extracted: needs.length, inserted };
}

export async function backfillIdentifiedChallenges() {
  const responses = await getDb()
    .select({
      conversationId: conversations.id,
      organizationId: users.organizationId,
      content: conversationMessages.content,
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(and(
      eq(conversationMessages.sender, "ASSISTANT"),
      ilike(conversationMessages.content, "%Identified Challenges%"),
    ))
    .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id));

  let processed = 0;
  let extracted = 0;
  let skipped = 0;
  for (const response of responses) {
    processed += 1;
    if (!response.organizationId) {
      skipped += 1;
      continue;
    }
    const result = await saveIdentifiedChallenges({
      organizationId: response.organizationId,
      conversationId: response.conversationId,
      response: response.content,
    });
    extracted += result.inserted;
    if (result.extracted === 0 || result.inserted < result.extracted) skipped += 1;
  }

  return { processed, extracted, skipped };
}
