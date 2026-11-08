import assert from "node:assert/strict";
import test from "node:test";
import { extractIdentifiedChallenges } from "./organizational-needs";

test("extracts and maps challenges from the saved structured response section", () => {
  const needs = extractIdentifiedChallenges([
    "## Identified Challenges",
    "- Fundraising: donor retention has been difficult.",
    "- Technology: client data is stored in disconnected systems.",
    "",
    "## Recommended Strategies",
    "- Review current systems.",
  ].join("\n"));

  assert.equal(needs.length, 2);
  assert.equal(needs[0].category, "Fundraising");
  assert.equal(needs[1].category, "Technology & Digital Transformation");
});

test("deduplicates repeated bullets and does not infer a challenge without the section", () => {
  const response = [
    "## Identified Challenges",
    "- Difficulty with donor retention.",
    "- Difficulty with donor retention.",
    "",
    "## Recommended Strategies",
    "Create a schedule.",
  ].join("\n");
  assert.equal(extractIdentifiedChallenges(response).length, 1);
  assert.deepEqual(extractIdentifiedChallenges("The organization may need fundraising help."), []);
});
