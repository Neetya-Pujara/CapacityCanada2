import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import {
  NEEDS_REPORT_PERIODS,
  type NeedsIntelligenceReport,
  type NeedsReportGranularity,
} from "@/lib/needs-intelligence";

const categoryColors = [
  "#315f53",
  "#b66b4f",
  "#688a63",
  "#7b7195",
  "#c18d40",
  "#56828b",
  "#9a6d55",
  "#6682a0",
  "#9a9e85",
];

const periodLabels: Record<(typeof NEEDS_REPORT_PERIODS)[number], string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  all: "All time",
};

function TrendChart({
  report,
}: {
  report: NeedsIntelligenceReport;
}) {
  if (!report.totalNeeds || !report.trends.length) {
    return <p className="needs-chart-empty">No active organizational needs were recorded during this period.</p>;
  }

  const width = 900;
  const height = 330;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...report.trends.flatMap((point) => Object.values(point.counts)));
  const yStep = Math.max(1, Math.ceil(maxValue / 4));
  const yMax = yStep * 4;
  const x = (index: number) => left + (report.trends.length <= 1 ? plotWidth / 2 : (index / (report.trends.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (value / yMax) * plotHeight;
  const tickIndexes = new Set(
    Array.from({ length: Math.min(6, report.trends.length) }, (_, index) =>
      Math.round((index * (report.trends.length - 1)) / Math.max(1, Math.min(6, report.trends.length) - 1)),
    ),
  );
  const series = report.categories.map((category, index) => ({
    ...category,
    color: categoryColors[index % categoryColors.length],
  })).filter((category) => category.records > 0);

  return (
    <div className="needs-trend-chart">
      <svg
        className="needs-trend-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby="needs-trend-title needs-trend-description"
      >
        <title id="needs-trend-title">Identified organizational needs over time</title>
        <desc id="needs-trend-description">
          Monthly, weekly, or daily counts of active need records by support category for {report.periodLabel.toLowerCase()}.
        </desc>
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = yMax - tick * yStep;
          const yPosition = y(value);
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={yPosition} y2={yPosition} className="needs-chart-grid" />
              <text x={left - 10} y={yPosition + 4} textAnchor="end" className="needs-chart-axis-label">{value}</text>
            </g>
          );
        })}
        {series.map((category) => {
          const path = report.trends.map((point, index) =>
            `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.counts[category.category])}`,
          ).join(" ");
          return (
            <g key={category.category}>
              <path d={path} fill="none" stroke={category.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {report.trends.map((point, index) => (
                <circle key={`${category.category}-${point.date}`} cx={x(index)} cy={y(point.counts[category.category])} r="2.4" fill={category.color}>
                  <title>{`${point.label}: ${point.counts[category.category]} ${category.label} needs`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {[...tickIndexes].map((index) => (
          <text key={index} x={x(index)} y={height - 17} textAnchor={index === 0 ? "start" : index === report.trends.length - 1 ? "end" : "middle"} className="needs-chart-axis-label">
            {report.trends[index].label}
          </text>
        ))}
      </svg>
      <ul className="needs-trend-legend" aria-label="Chart categories">
        {series.map((category) => (
          <li key={category.category}><span style={{ backgroundColor: category.color }} />{category.label}</li>
        ))}
      </ul>
    </div>
  );
}

function EmergingSection({ report }: { report: NeedsIntelligenceReport }) {
  return (
    <section className="needs-panel needs-emerging">
      <div className="needs-panel-heading">
        <div><span className="dashboard-kicker">CHANGE OVER TIME</span><h2>Emerging needs</h2></div>
        <TrendingUp size={18} aria-hidden="true" />
      </div>
      <p className="needs-section-intro">
        Recent reporting compared with the previous equivalent interval within the selected period.
      </p>
      {report.emerging.length ? (
        <ul className="emerging-needs-list">
          {report.emerging.map((item) => (
            <li key={item.category}>
              <div className="emerging-need-title">
                <strong>{item.label}</strong>
                <span>{item.organizations} {item.organizations === 1 ? "organization" : "organizations"} in period</span>
              </div>
              <div className="emerging-need-change">
                <span><ArrowUpRight size={15} /> +{item.change} organizations</span>
                <small>{item.recentOrganizations} recently, compared with {item.previousOrganizations} previously</small>
              </div>
              <p>{item.previousOrganizations === 0
                ? `At least ${item.recentOrganizations} organizations reported this need recently; none did in the previous interval.`
                : `${item.recentOrganizations} organizations reported this need recently, up from ${item.previousOrganizations} in the previous interval.`}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="needs-empty-state">
          <span className="needs-empty-mark"><Minus size={16} /></span>
          <div>
            <strong>{report.hasPreviousPeriodData ? "No meaningful increases detected" : "More history is needed"}</strong>
            <p>{report.hasPreviousPeriodData
              ? "No category met the growth threshold of at least two additional organizations and 25% growth (or two additional organizations from a zero baseline)."
              : "There are not yet active needs in the previous comparison interval, so a change over time cannot be established."}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function granularityLabel(granularity: NeedsReportGranularity) {
  return granularity === "day" ? "Daily" : granularity === "week" ? "Weekly" : "Monthly";
}

export function NeedsIntelligenceDashboard({ report }: { report: NeedsIntelligenceReport }) {
  const largestCategory = Math.max(1, ...report.categories.map((category) => category.organizations));
  return (
    <div className="needs-intelligence">
      <form className="needs-period-filter" method="get">
        <label htmlFor="needs-period">Reporting period</label>
        <select id="needs-period" name="period" defaultValue={report.period}>
          {NEEDS_REPORT_PERIODS.map((period) => <option key={period} value={period}>{periodLabels[period]}</option>)}
        </select>
        <button type="submit">Update report</button>
      </form>

      <section className="needs-summary-grid" aria-label="Needs overview statistics">
        <article className="needs-summary-card">
          <span>Organizations represented</span>
          <strong>{report.totalOrganizations.toLocaleString()}</strong>
          <small>Across active needs recorded to date</small>
        </article>
        <article className="needs-summary-card">
          <span>Identified needs</span>
          <strong>{report.totalNeeds.toLocaleString()}</strong>
          <small>{report.periodLabel} · active records only</small>
        </article>
        <article className="needs-summary-card needs-summary-featured">
          <span>Most common category</span>
          <strong>{report.mostCommonCategory ?? "—"}</strong>
          <small>{report.mostCommonCategory ? "By distinct organizations in this period" : "No needs recorded in this period"}</small>
        </article>
        <article className="needs-summary-card">
          <span>Organizations reporting needs</span>
          <strong>{report.representedOrganizations.toLocaleString()}</strong>
          <small>Distinct organizations · {report.periodLabel}</small>
        </article>
      </section>

      <section className="needs-panel needs-category-panel">
        <div className="needs-panel-heading">
          <div><span className="dashboard-kicker">WHERE SUPPORT IS NEEDED</span><h2>Organizations by category</h2></div>
          <span className="needs-panel-note">Distinct organizations · {report.periodLabel}</span>
        </div>
        {!report.representedOrganizations ? (
          <p className="needs-chart-empty">No active needs were recorded during this period.</p>
        ) : (
          <ol className="needs-category-bars">
            {report.categories.map((category) => (
              <li key={category.category}>
                <span className="needs-category-label">{category.label}</span>
                <span className="needs-category-track" aria-hidden="true">
                  <span style={{ width: `${(category.organizations / largestCategory) * 100}%` }} />
                </span>
                <strong>{category.organizations.toLocaleString()}</strong>
                <small>{category.percentage}%</small>
              </li>
            ))}
          </ol>
        )}
        <p className="needs-chart-footnote">Percentages use organizations with at least one active need in this period as the denominator. Organizations may appear in multiple categories.</p>
      </section>

      <div className="needs-insight-grid">
        <section className="needs-panel needs-trend-panel">
          <div className="needs-panel-heading">
            <div><span className="dashboard-kicker">NEEDS OVER TIME</span><h2>Reported challenges</h2></div>
            <span className="needs-panel-note">{granularityLabel(report.granularity)} · record count</span>
          </div>
          <TrendChart report={report} />
          <p className="needs-chart-footnote">Each point counts active need records by the date first identified. Repeated mentions of an already-recorded need do not create extra records.</p>
        </section>
        <EmergingSection report={report} />
      </div>

      <p className="needs-privacy-note">This report uses aggregated counts only. Individual organization challenges, conversations, and transcripts are not shown.</p>
      <Link className="needs-report-back" href="/admin">Back to admin overview <ArrowDownRight size={14} /></Link>
    </div>
  );
}
