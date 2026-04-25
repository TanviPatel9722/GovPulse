import { ExternalLink, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { StakeholderIntelligence } from "@/lib/types";
import type { Stakeholder } from "@/lib/types/stakeholders";

export function StakeholderTable({ intelligence }: { intelligence: StakeholderIntelligence }) {
  const rows = intelligence.stakeholderObjects ?? intelligence.stakeholders.map(toStakeholderRow);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Table2 className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">Stakeholder Evidence Table</span>
            </div>
            <CardTitle>Affected organizations and people</CardTitle>
            <CardDescription>
              CrustData powers this stakeholder layer; people sentiment remains the strategy center.
            </CardDescription>
          </div>
          <ConfidencePill value={intelligence.confidence} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-white/10">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-semibold">Stakeholder</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Industry</th>
                <th className="px-3 py-3 font-semibold">Exposure</th>
                <th className="px-3 py-3 font-semibold">Influence</th>
                <th className="px-3 py-3 font-semibold">Likely Position</th>
                <th className="px-3 py-3 font-semibold">Why It Matters</th>
                <th className="px-3 py-3 font-semibold">Signals</th>
                <th className="px-3 py-3 font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((stakeholder) => (
                <tr key={stakeholder.id} className="border-t border-white/10 align-top">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-white">{stakeholder.name}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="success">{stakeholder.source === "crustdata" ? "CrustData Live" : "CrustData cited"}</Badge>
                      <Badge variant="secondary">Inferred Position</Badge>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary">{stakeholder.type.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[180px] text-xs leading-5 text-slate-300">{stakeholder.industry ?? "Unknown"}</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{stakeholder.location ?? "Location unavailable"}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={levelVariant(stakeholder.exposureLevel)}>{stakeholder.exposureLevel}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={levelVariant(stakeholder.influenceLevel)}>{stakeholder.influenceLevel}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={badgeVariantForModernPosition(stakeholder.likelyPosition)}>{stakeholder.likelyPosition}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[260px] text-xs leading-5 text-muted-foreground">{stakeholder.reasonAffected}</div>
                    {stakeholder.relevantPeople?.length ? (
                      <div className="mt-2 text-xs leading-5 text-slate-300">
                        {stakeholder.relevantPeople.slice(0, 2).map((person) => person.title ?? person.name).join("; ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[260px] space-y-1 text-xs leading-5 text-muted-foreground">
                      <SignalLine label="Hiring" value={stakeholder.signals.hiring} />
                      <SignalLine label="Headcount" value={stakeholder.signals.headcount} />
                      <SignalLine label="News" value={stakeholder.signals.news} />
                      <SignalLine label="Social" value={stakeholder.signals.socialPosts?.[0]} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">Company Signal</Badge>
                      {stakeholder.relevantPeople?.length ? <Badge variant="secondary">People Signal</Badge> : null}
                      {stakeholder.signals.socialPosts?.length ? <Badge variant="secondary">Social Signal</Badge> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <ConfidencePill value={stakeholder.confidence} />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stakeholder.evidenceCardIds.slice(0, 2).map((id) => (
                        <a
                          key={id}
                          href={`#${id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          <ExternalLink className="h-3 w-3 text-primary" aria-hidden="true" />
                          {id}
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function badgeVariantForModernPosition(position: Stakeholder["likelyPosition"]) {
  if (position === "support") return "success";
  if (position === "oppose") return "warning";
  return "secondary";
}

function levelVariant(level: Stakeholder["influenceLevel"] | Stakeholder["exposureLevel"]) {
  if (level === "high") return "warning";
  if (level === "medium") return "default";
  return "secondary";
}

function SignalLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="font-medium text-slate-300">{label}:</span> {value}
    </div>
  );
}

function toStakeholderRow(stakeholder: StakeholderIntelligence["stakeholders"][number]): Stakeholder {
  return {
    id: stakeholder.company_or_org_name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: stakeholder.company_or_org_name,
    type: "company",
    category: stakeholder.stakeholder_type.replaceAll("_", " "),
    industry: stakeholder.industry,
    location: stakeholder.location,
    likelyPosition:
      stakeholder.likely_position === "Supportive"
        ? "support"
        : stakeholder.likely_position === "Concerned" || stakeholder.likely_position === "Opposed"
          ? "oppose"
          : "mixed",
    influenceLevel: stakeholder.influence_level === "Very High" || stakeholder.influence_level === "High" ? "high" : "medium",
    exposureLevel: /direct|compliance|burden|demand/i.test(stakeholder.reason_affected) ? "high" : "medium",
    reasonAffected: stakeholder.reason_affected,
    signals: {
      headcount: stakeholder.size_signal,
      news: stakeholder.growth_signal
    },
    relevantPeople: stakeholder.relevant_people.map((person) => ({
      name: person.name,
      title: person.title,
      linkedinUrl: person.public_profile_url,
      reasonRelevant: person.relevance
    })),
    evidenceCardIds: stakeholder.evidence_cards.map((card) => card.id),
    source: stakeholder.evidence_cards.some((card) => card.raw_metadata.mode === "live-api") ? "crustdata" : "mock",
    confidence: stakeholder.confidence
  };
}
