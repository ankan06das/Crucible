import { PageHeader, StatTile } from "./ui";

export default function AnalyticsView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent analytics"
        subtitle="Performance metrics and confidence telemetry across the debate panel."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label="Average debate shift" value="2.4 scores" caption="Difference between initial reviews and reflected reviews after debate." />
        <StatTile label="Top skeptic consensus" value="38% conceded" caption="Rate at which skeptic concessions occur after cross-examination." />
        <StatTile label="Confidence level" value="0.86 avg" caption="Aggregated score based on agent telemetry." />
      </div>
    </div>
  );
}
