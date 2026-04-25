"use client";

import { Copy, Download, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidencePill } from "@/components/ConfidencePill";
import type { ExecutiveMemo as ExecutiveMemoType } from "@/lib/types";

export function ExecutiveMemo({ memo }: { memo: ExecutiveMemoType }) {
  const sections = Object.values(memo.structured_json);

  function downloadMemo() {
    const blob = new Blob([memo.export_text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "econosense-executive-memo.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyMemo() {
    await navigator.clipboard.writeText(memo.export_text);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase">Executive Memo Generator</span>
            </div>
            <CardTitle>{memo.title}</CardTitle>
            <CardDescription>
              One-page consulting-grade memo with structured JSON, markdown, evidence cards, confidence, and assumptions.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={recommendationVariant(memo.recommendation)}>{memo.recommendation}</Badge>
            <ConfidencePill value={memo.confidence} />
            <Button variant="outline" size="sm" onClick={() => void copyMemo()}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadMemo}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
          <div className="mb-2 text-xs font-semibold uppercase text-primary">Clear recommendation</div>
          <p className="text-sm leading-6 text-slate-100">{memo.recommendation}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            This memo uses scenario language and does not claim perfect prediction.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {sections.map((section) => (
            <div key={section.heading} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{section.heading}</h3>
                <ConfidencePill value={section.confidence} />
              </div>
              <p className="text-sm leading-6 text-slate-300">{section.summary}</p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                {section.bullets.slice(0, 4).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {(section.evidence_card_ids.length > 0 ? section.evidence_card_ids.slice(0, 4) : ["assumption-labeled"]).map(
                  (id) => (
                    <Badge key={id} variant="secondary">
                      {id}
                    </Badge>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-white/10 bg-black/20 p-4">
          <div className="mb-3 text-sm font-semibold text-white">Downloadable markdown memo</div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-[#070b10] p-4 text-xs leading-5 text-slate-300">
            {memo.markdown_memo}
          </pre>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Citations used</div>
            <div className="flex flex-wrap gap-2">
              {memo.evidence_card_ids.map((id) => (
                <Badge key={id} variant="secondary">
                  {id}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Memo assumptions</div>
            <div className="space-y-2">
              {memo.assumptions.map((assumption) => (
                <div key={assumption} className="rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-muted-foreground">
                  {assumption}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function recommendationVariant(recommendation: ExecutiveMemoType["recommendation"]) {
  if (recommendation === "Launch as-is") return "success";
  if (recommendation === "Launch with mitigation") return "default";
  if (recommendation === "Pilot first") return "warning";
  return "destructive";
}
