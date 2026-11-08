import assert from "node:assert/strict";
import test from "node:test";
import {
  getEmergingComparisonWindow,
  getNeedsReportWindow,
  isMeaningfulNeedIncrease,
} from "./needs-intelligence";

test("selects daily, weekly, and monthly buckets for each report period", () => {
  const now = new Date("2026-11-08T15:00:00.000Z");
  assert.equal(getNeedsReportWindow("30d", now).granularity, "day");
  assert.equal(getNeedsReportWindow("90d", now).granularity, "week");
  assert.equal(getNeedsReportWindow("6m", now).granularity, "month");
  assert.equal(getNeedsReportWindow("12m", now).granularity, "month");
  assert.equal(getNeedsReportWindow("all", now).startsAt, null);
});

test("uses two equivalent comparison windows within the selected period", () => {
  const now = new Date("2026-11-08T15:00:00.000Z");
  const thirtyDayComparison = getEmergingComparisonWindow("30d", now);
  assert.equal(now.getTime() - thirtyDayComparison.recentStartsAt.getTime(), 15 * 24 * 60 * 60 * 1000);
  assert.equal(thirtyDayComparison.recentStartsAt.getTime() - thirtyDayComparison.previousStartsAt.getTime(), 15 * 24 * 60 * 60 * 1000);

  const sixMonthComparison = getEmergingComparisonWindow("6m", now);
  assert.equal(sixMonthComparison.recentStartsAt.toISOString(), "2026-08-08T15:00:00.000Z");
  assert.equal(sixMonthComparison.previousStartsAt.toISOString(), "2026-05-08T15:00:00.000Z");
});

test("requires a meaningful organization-count increase to flag an emerging need", () => {
  assert.equal(isMeaningfulNeedIncrease(1, 0), false);
  assert.equal(isMeaningfulNeedIncrease(2, 0), true);
  assert.equal(isMeaningfulNeedIncrease(3, 1), true);
  assert.equal(isMeaningfulNeedIncrease(3, 2), false);
  assert.equal(isMeaningfulNeedIncrease(6, 4), true);
});
