"use client";

import { ChangeEvent, useRef } from "react";
import { ClipboardCheck, FileUp, Loader2, Play, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_POLICY_TEXT } from "@/lib/types";

interface PolicyIntakeProps {
  value: string;
  loading: boolean;
  jurisdiction: string;
  policyType: string;
  onChange: (value: string) => void;
  onJurisdictionChange: (value: string) => void;
  onPolicyTypeChange: (value: string) => void;
  onAnalyze: () => void;
  onLoadSample: () => void;
}

const jurisdictions = [
  "Washington, DC",
  "United States",
  "California",
  "New York",
  "Maryland",
  "Virginia",
  "Custom jurisdiction"
];

const policyTypes = [
  "AI governance",
  "Labor and employment",
  "Procurement",
  "Grant or subsidy",
  "Tax credit",
  "Benefits program",
  "Housing",
  "Public safety",
  "Environmental retail regulation"
];

export function PolicyIntake({
  value,
  loading,
  jurisdiction,
  policyType,
  onChange,
  onJurisdictionChange,
  onPolicyTypeChange,
  onAnalyze,
  onLoadSample
}: PolicyIntakeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsText(file);
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="glow-line absolute left-6 right-6 top-0 h-px" />
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">Policy Intake</span>
        </div>
        <CardTitle className="text-xl">Paste or upload policy</CardTitle>
        <CardDescription>Policy inputs for a focused impact brief.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={DEMO_POLICY_TEXT}
          aria-label="Policy text"
          className="min-h-[230px] resize-y"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Jurisdiction
            </span>
            <select
              value={jurisdiction}
              onChange={(event) => onJurisdictionChange(event.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            >
              {jurisdictions.map((item) => (
                <option key={item} value={item} className="bg-[#0b111a]">
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Policy type
            </span>
            <select
              value={policyType}
              onChange={(event) => onPolicyTypeChange(event.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            >
              {policyTypes.map((item) => (
                <option key={item} value={item} className="bg-[#0b111a]">
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onAnalyze} disabled={loading || value.trim().length < 12} className="h-11">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Analyze
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading} className="h-11">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onLoadSample} disabled={loading}>
            <RotateCcw className="h-4 w-4" />
            Sample policy
          </Button>
          <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 text-xs text-muted-foreground">
            <FileUp className="h-4 w-4 text-primary" aria-hidden="true" />
            Evidence-ready
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.csv,.json,.policy"
          onChange={handleFileUpload}
        />
      </CardContent>
    </Card>
  );
}
