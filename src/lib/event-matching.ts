import { inferSupportCategories, type NeedCategory } from "@/lib/organizational-needs";
import { SUPPORT_AREAS } from "@/lib/validation";

export type MatchableEvent = {
  id: string;
  title: string;
  summary: string;
  description: string;
  categories: string[];
  status: string;
  startsAt: Date | string;
  endsAt: Date | string;
  location: string;
};

export type OrganizationMatchContext = {
  supportAreas: string[];
  mission: string;
  operationalChallenges: string;
  needs: Array<{ category: string; description: string }>;
};

export type EventMatch = {
  event: MatchableEvent;
  score: number;
  reason: string;
  categories: string[];
};

const genericWords = new Set([
  "about", "after", "also", "among", "and", "are", "because", "been", "being", "building",
  "capacity", "community", "communities", "could", "event", "events", "from", "help", "into",
  "more", "need", "needs", "nonprofit", "organization", "organizations", "our", "people",
  "program", "programs", "service", "services", "some", "support", "their", "there", "these",
  "they", "this", "through", "training", "with", "workshop", "workshops", "your",
]);

function normalizedCategories(values: string[]): Set<NeedCategory> {
  const allowed = new Set<string>(SUPPORT_AREAS);
  return new Set(values
    .map((value) => value === "Human Resources" ? "HR" : value)
    .filter((value): value is NeedCategory => allowed.has(value)));
}

function meaningfulWords(value: string) {
  return new Set(
    value.toLocaleLowerCase("en").match(/[\p{L}\p{N}]{5,}/gu)?.filter((word) =>
      !genericWords.has(word) && !/^\d+$/.test(word),
    ) ?? [],
  );
}

function sharedKeywordScore(profileText: string, eventText: string) {
  const profileWords = meaningfulWords(profileText);
  const eventWords = meaningfulWords(eventText);
  const shared = [...profileWords].filter((word) => eventWords.has(word));
  if (shared.length >= 2 || shared.some((word) => word.length >= 11)) return 28;
  return 0;
}

function categoryName(category: string) {
  return category === "HR" ? "Human Resources" : category;
}

export function matchEventToOrganization(
  event: MatchableEvent,
  organization: OrganizationMatchContext,
): EventMatch | null {
  if (event.status !== "PUBLISHED") return null;

  const supportAreas = normalizedCategories(organization.supportAreas);
  const needCategories = normalizedCategories(organization.needs.map((need) => need.category));
  supportAreas.delete("Other");
  needCategories.delete("Other");
  const profileText = `${organization.mission} ${organization.operationalChallenges}`;
  const profileCategories = new Set(inferSupportCategories(profileText));
  const eventText = `${event.title} ${event.summary} ${event.description}`;
  const eventCategories = new Set([
    ...normalizedCategories(event.categories),
    ...inferSupportCategories(eventText),
  ]);
  eventCategories.delete("Other");

  const matchedCategories: string[] = [];
  let score = 0;
  let reason = "";
  for (const category of eventCategories) {
    if (supportAreas.has(category)) {
      matchedCategories.push(category);
      score += 100;
      if (!reason) {
        reason = `Recommended because your organization selected ${categoryName(category)} as an area needing support.`;
      }
    } else if (needCategories.has(category)) {
      matchedCategories.push(category);
      score += 90;
      if (!reason) {
        reason = `Recommended because your organization has identified a need in ${categoryName(category)}.`;
      }
    } else if (profileCategories.has(category)) {
      matchedCategories.push(category);
      score += 55;
      if (!reason) {
        reason = `Recommended because your organization profile points to support related to ${categoryName(category)}.`;
      }
    }
  }

  const inferredEventCategories = new Set(inferSupportCategories(eventText));
  const allOrganizationCategories = new Set([
    ...supportAreas,
    ...needCategories,
    ...profileCategories,
  ]);
  const keywordCategoryMatches = [...inferredEventCategories].filter((category) =>
    allOrganizationCategories.has(category) && !matchedCategories.includes(category),
  );
  if (keywordCategoryMatches.length) {
    matchedCategories.push(...keywordCategoryMatches);
    score += 35 * keywordCategoryMatches.length;
    if (!reason) {
      reason = `Recommended because the event details connect to your organization's ${categoryName(keywordCategoryMatches[0])} support needs.`;
    }
  }

  const keywordScore = sharedKeywordScore(
    `${organization.mission} ${organization.operationalChallenges} ${organization.needs.map((need) => need.description).join(" ")}`,
    eventText,
  );
  if (keywordScore) {
    score += keywordScore;
    if (!reason) reason = "Recommended because specific topics in the event details match your organization's profile.";
  }

  if (score < 28) return null;
  return {
    event,
    score,
    reason,
    categories: [...new Set(matchedCategories)].map((category) => categoryName(category)),
  };
}

export function rankEventsForOrganization(
  events: MatchableEvent[],
  organization: OrganizationMatchContext,
  limit = 4,
): EventMatch[] {
  return events
    .map((event) => matchEventToOrganization(event, organization))
    .filter((match): match is EventMatch => match !== null)
    .sort((left, right) =>
      right.score - left.score ||
      new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime(),
    )
    .slice(0, limit);
}
