"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  MessageCircle,
  ShieldAlert,
  BrainCircuit,
  X,
  RefreshCw,
} from "lucide-react";
import type { SessionInsight } from "@/app/actions/analyze-session";
import {
  contentCoverageLabels,
  facilitationQualityLabels,
  protocolSafetyLabels,
} from "@/lib/schemas/session-analysis";

function scoreColor(score: number) {
  if (score === 3) return "text-green-600 dark:text-green-400";
  if (score === 2) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBg(score: number) {
  if (score === 3) return "bg-green-500/10 border-green-500/20";
  if (score === 2) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function MetricCard({
  title,
  icon,
  score,
  label,
  justification,
}: {
  title: string;
  icon: React.ReactNode;
  score: number;
  label: string;
  justification: string;
}) {
  return (
    <Card className={`${scoreBg(score)} border`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${scoreColor(score)}`}>
            {score}/3
          </span>
          <span className={`text-sm font-medium ${scoreColor(score)}`}>
            {label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {justification}
        </p>
      </CardContent>
    </Card>
  );
}

export function SessionAnalysisContent({
  promise,
  onReanalyze,
}: {
  promise: Promise<SessionInsight>;
  onReanalyze?: () => void;
}) {
  const { analysis, lastRanAt, lastRanBy } = use(promise);

  return (
    <div className="space-y-4">
      {/* Analysis metadata */}
      {(lastRanAt || lastRanBy) && (
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div className="text-xs text-muted-foreground">
            {lastRanAt && (
              <span>
                Last analyzed{" "}
                {new Date(lastRanAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {lastRanAt && lastRanBy && " • "}
            {lastRanBy && <span>by {lastRanBy.fullName}</span>}
          </div>
          {onReanalyze && (
            <Button
              variant="default"
              size="sm"
              onClick={onReanalyze}
              className="h-7 text-xs"
            >
              <RefreshCw className="size-3 mr-1.5" />
              Re-analyze
            </Button>
          )}
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Session Summary
        </h4>

        {analysis.risk_flag === "SAFE" ? (
          <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 mb-3">
            <ShieldCheck className="size-4 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              SAFE — No crisis indicators detected
            </span>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2">
              <AlertTriangle className="size-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                RISK — Crisis indicators detected
              </span>
            </div>
            {analysis.risk_quotes.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  Flagged quotes:
                </p>
                {analysis.risk_quotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    className="border-l-2 border-red-500/40 pl-3 text-sm italic text-muted-foreground"
                  >
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Quality Metrics
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            title="Content Coverage"
            icon={<BookOpen className="size-4" />}
            score={analysis.content_coverage_score}
            label={
              contentCoverageLabels[analysis.content_coverage_score] ?? ""
            }
            justification={analysis.content_coverage_justification}
          />
          <MetricCard
            title="Facilitation Quality"
            icon={<MessageCircle className="size-4" />}
            score={analysis.facilitation_quality_score}
            label={
              facilitationQualityLabels[analysis.facilitation_quality_score] ??
              ""
            }
            justification={analysis.facilitation_quality_justification}
          />
          <MetricCard
            title="Protocol Safety"
            icon={<ShieldAlert className="size-4" />}
            score={analysis.protocol_safety_score}
            label={
              protocolSafetyLabels[analysis.protocol_safety_score] ?? ""
            }
            justification={analysis.protocol_safety_justification}
          />
        </div>
      </div>
    </div>
  );
}

function AnimatedDots() {
  return (
    <span className="inline-flex ml-0.5" aria-hidden>
      <span className="animate-dot-1">.</span>
      <span className="animate-dot-2">.</span>
      <span className="animate-dot-3">.</span>
    </span>
  );
}

export function AnalysisSkeleton({ onStop }: { onStop?: () => void }) {

  return (
    <div className="flex flex-col items-center justify-center py-10 gap-5">
      {/* Brain icon with green ripple pulse */}
      <div className="relative flex items-center justify-center size-16">
        <span className="absolute size-10 rounded-full border border-green-500/30 animate-ripple" />
        <span className="absolute size-10 rounded-full border border-green-500/20 animate-ripple-delayed" />
        <span className="absolute size-10 rounded-full border border-green-500/10 animate-ripple-delayed-2" />
        <div className="relative rounded-full bg-green-500/10 p-2 shadow-[0_0_16px_rgba(34,197,94,0.15)]">
          <BrainCircuit className="size-7 text-green-600 dark:text-green-400 rotate-90" />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-md px-4 py-2 bg-muted/30">
        <p className="relative z-10 text-sm font-medium text-muted-foreground text-center min-w-[260px]">
          Analyzing session with AI
          <AnimatedDots />
        </p>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-green-500/20 to-transparent animate-scan-highlight" />
        </div>
      </div>

      {onStop && (
        <Button
          onClick={onStop}
          size="sm"
          className="w-full rounded-none hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white mt-2"
        >
          <X className="size-4 mr-2" />
          Stop Analyzing
        </Button>
      )}
    </div>
  );
}

export function AnalysisError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6 rounded-md border border-red-500/20 bg-red-500/5">
      <div className="flex flex-col items-center gap-1">
        <AlertTriangle className="size-6 text-red-500 shrink-0" />
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          Oops! Something went wrong.
        </p>
        <p className="text-xs text-muted-foreground">It's not you, it's us.</p>
      </div>
      <Button
        onClick={onRetry}
        className="text-xs font-medium text-white underline-offset-4 hover:underline"
        variant="default"
      >
        Try again
      </Button>
    </div>
  );
}
