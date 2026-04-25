"use client";

import dynamic from "next/dynamic";
import { DatabaseZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StakeholderSignals } from "@/components/StakeholderSignals";
import type { StakeholderIntelligence as StakeholderIntelligenceType } from "@/lib/types";

const StakeholderGraph = dynamic(
  () => import("@/components/StakeholderGraph").then((module) => module.StakeholderGraph),
  { ssr: false }
);

const StakeholderTable = dynamic(
  () => import("@/components/StakeholderTable").then((module) => module.StakeholderTable),
  { ssr: false }
);

export function StakeholderIntelligence({ intelligence }: { intelligence: StakeholderIntelligenceType }) {
  const status = intelligence.crustDataStatus;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
              <DatabaseZap className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">CrustData Stakeholder Intelligence</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                CrustData powers stakeholder and company intelligence. It does not represent full public sentiment.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={status?.usedLiveData ? "success" : "secondary"}>
              {status?.usedLiveData ? "CrustData Live" : "Mock Data"}
            </Badge>
            <Badge variant="secondary">Company Signal</Badge>
            <Badge variant="secondary">People Signal</Badge>
            <Badge variant="secondary">Social Signal</Badge>
            <Badge variant="secondary">Inferred Position</Badge>
          </div>
        </CardContent>
      </Card>

      <StakeholderSignals intelligence={intelligence} />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.9fr)_minmax(700px,1.1fr)]">
        <StakeholderGraph intelligence={intelligence} />
        <StakeholderTable intelligence={intelligence} />
      </div>
    </div>
  );
}
