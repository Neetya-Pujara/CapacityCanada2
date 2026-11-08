import assert from "node:assert/strict";
import test from "node:test";
import { rankEventsForOrganization, type MatchableEvent, type OrganizationMatchContext } from "./event-matching";

const event = (overrides: Partial<MatchableEvent> = {}): MatchableEvent => ({
  id: "event-1",
  title: "Fundraising foundations for nonprofit teams",
  summary: "Build a practical donor engagement plan.",
  description: "A workshop covering donor outreach and grant readiness.",
  categories: ["Fundraising"],
  status: "PUBLISHED",
  startsAt: "2027-01-01T10:00:00.000Z",
  endsAt: "2027-01-01T12:00:00.000Z",
  location: "Online",
  ...overrides,
});

const organization = (overrides: Partial<OrganizationMatchContext> = {}): OrganizationMatchContext => ({
  supportAreas: ["Fundraising"],
  mission: "Providing food access in rural communities.",
  operationalChallenges: "The organization is working to grow its services.",
  needs: [],
  ...overrides,
});

test("recommends a published event for a selected fundraising support area", () => {
  const [match] = rankEventsForOrganization([event()], organization());
  assert.ok(match);
  assert.match(match.reason, /selected Fundraising/);
});

test("recommends a technology event for a stored technology need", () => {
  const technologyEvent = event({
    id: "event-2",
    title: "Practical technology systems",
    categories: ["Technology & Digital Transformation"],
  });
  const [match] = rankEventsForOrganization(
    [technologyEvent],
    organization({
      supportAreas: [],
      needs: [{ category: "Technology & Digital Transformation", description: "Improve data systems." }],
    }),
  );
  assert.ok(match);
  assert.match(match.reason, /identified a need in Technology/);
});

test("does not recommend an unrelated event or unpublished event", () => {
  const unrelated = event({
    categories: ["Governance & Leadership"],
    title: "Board governance essentials",
    summary: "Support board development.",
    description: "A practical session for nonprofit boards.",
  });
  const draft = event({ status: "DRAFT" });
  assert.deepEqual(rankEventsForOrganization([unrelated, draft], organization()), []);
});

test("repeated needs in one category do not multiply the matching score", () => {
  const oneNeed = organization({
    supportAreas: [],
    needs: [{ category: "Fundraising", description: "Improve donor outreach." }],
  });
  const repeatedNeeds = organization({
    supportAreas: [],
    needs: [
      { category: "Fundraising", description: "Improve donor outreach." },
      { category: "Fundraising", description: "Improve grant writing." },
      { category: "Fundraising", description: "Improve donor outreach." },
    ],
  });
  const oneScore = rankEventsForOrganization([event()], oneNeed)[0]?.score;
  const repeatedScore = rankEventsForOrganization([event()], repeatedNeeds)[0]?.score;
  assert.equal(repeatedScore, oneScore);
});
