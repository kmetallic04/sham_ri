"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ShieldCheck,
  Flag,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  getOrCreateAnalysis,
  updateSessionStatus,
} from "@/app/actions/analyze-session";
import { createClient } from "@/lib/supabase/client";
import type { SessionInsight } from "@/app/actions/analyze-session";
import {
  SessionAnalysisContent,
  AnalysisSkeleton,
  AnalysisError,
} from "./session-analysis-section";
import type { SessionRow, SupervisorOption } from "./sessions-table";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function GreenAvatar({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-700 dark:text-green-400 text-[10px] font-bold ring-1 ring-green-500/20">
        {getInitials(name)}
      </div>
      <span className="text-xs font-medium truncate">{name}</span>
    </div>
  );
}

function SupervisorAvatar({ name }: { name: string }) {
  return (
    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-700 dark:text-green-400 text-[9px] font-bold ring-1 ring-green-500/20">
      {getInitials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    case "processed":
      return <Badge variant="secondary">Processed</Badge>;
    case "flagged_for_review":
      return <Badge variant="destructive">Flagged</Badge>;
    case "safe":
      return (
        <Badge className="border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400">
          Safe
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

class AnalysisErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return null;
    }
    return this.props.children;
  }
}

export function SessionInsightDialog({
  session,
  open,
  onOpenChange,
  userRole,
  supervisorOptions,
}: {
  session: SessionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: "admin" | "supervisor" | null;
  supervisorOptions: SupervisorOption[];
}) {
  const router = useRouter();
  const [promise, setPromise] = useState<Promise<SessionInsight> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [supervisorSaving, setSupervisorSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("pending");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const analysisCancelledRef = React.useRef(false);
  const errorBoundaryRef = React.useRef<AnalysisErrorBoundary>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    getCurrentUser();
  }, []);

  // Fetch transcript and check for existing analysis when dialog opens
  useEffect(() => {
    if (open && session) {
      // Use reviewer_id if available, otherwise fallback to fellow's supervisor_id
      setSupervisorId(session.reviewer_id ?? session.fellows?.supervisor_id ?? null);
      setCurrentStatus(session.status);
      analysisCancelledRef.current = false;
      
      // Fetch transcript and check for existing analysis
      const fetchData = async () => {
        const supabase = createClient();
        
        // Fetch transcript
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("transcript")
          .eq("id", session.id)
          .single();
        
        if (!sessionError && sessionData) {
          setTranscript(sessionData.transcript as string);
        }
        
        // Check for existing analysis (get the most recent one)
        const { data: existingAnalyses } = await supabase
          .from("session_analyses")
          .select("id")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (existingAnalyses && existingAnalyses.length > 0) {
          // Analysis exists - load it automatically
          setHasExistingAnalysis(true);
          setError(null);
          errorBoundaryRef.current?.reset();
          setPromise(getOrCreateAnalysis(session.id));
        } else {
          // No analysis exists - user will need to click "Analyze"
          setHasExistingAnalysis(false);
        }
      };
      
      fetchData();
    }
    if (!open) {
      // Cancel analysis if dialog closes during analysis
      analysisCancelledRef.current = true;
      setPromise(null);
      setError(null);
      setTranscriptOpen(true);
      setReviewLoading(null);
      setSupervisorSaving(false);
      setIsAnalyzing(false);
      setTranscript(null);
      setHasExistingAnalysis(false);
    }
  }, [open, session]);

  const startAnalysis = useCallback(() => {
    if (!session) return;
    setError(null);
    setIsAnalyzing(true);
    analysisCancelledRef.current = false;
    errorBoundaryRef.current?.reset();
    
    const analysisPromise = getOrCreateAnalysis(session.id)
      .then((result) => {
        // Check if analysis was cancelled before updating state
        if (analysisCancelledRef.current) {
          // Return a rejected promise - but since promise will be null,
          // this won't trigger ErrorBoundary
          return Promise.reject(new Error("Analysis cancelled"));
        }
        setIsAnalyzing(false);
        setHasExistingAnalysis(true); // Mark as existing after successful analysis
        return result;
      })
      .catch((err) => {
        setIsAnalyzing(false);
        // Only propagate error if not cancelled
        // If cancelled, the promise is already set to null in stopAnalysis,
        // so this rejection won't be caught by ErrorBoundary
        if (!analysisCancelledRef.current) {
          throw err;
        }
        // Return rejected promise - won't matter since promise is null
        return Promise.reject(err);
      });
    
    setPromise(analysisPromise);
  }, [session]);

  const stopAnalysis = useCallback(() => {
    analysisCancelledRef.current = true;
    setIsAnalyzing(false);
    setPromise(null);
  }, []);

  const forceReanalyze = useCallback(() => {
    if (!session) return;
    setError(null);
    setIsAnalyzing(true);
    analysisCancelledRef.current = false;
    errorBoundaryRef.current?.reset();
    
    const analysisPromise = getOrCreateAnalysis(session.id, true)
      .then((result) => {
        // Check if analysis was cancelled before updating state
        if (analysisCancelledRef.current) {
          return Promise.reject(new Error("Analysis cancelled"));
        }
        setIsAnalyzing(false);
        setHasExistingAnalysis(true); // Mark as existing after successful analysis
        return result;
      })
      .catch((err) => {
        setIsAnalyzing(false);
        if (!analysisCancelledRef.current) {
          throw err;
        }
        return Promise.reject(err);
      });
    
    setPromise(analysisPromise);
  }, [session]);

  async function handleReview(status: "safe" | "flagged_for_review") {
    if (!session) return;
    setReviewLoading(status);
    try {
      await updateSessionStatus(session.id, status);
      setCurrentStatus(status);
      router.refresh();
    } catch {
      // Error handling - keep loading state to show error
    } finally {
      setReviewLoading(null);
    }
  }

  async function handleSupervisorChange(newId: string) {
    if (!session || newId === supervisorId) return;
    setSupervisorSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("sessions")
        .update({ reviewer_id: newId })
        .eq("id", session.id);

      if (error) {
        throw new Error("Failed to reassign supervisor");
      }

      setSupervisorId(newId);
      router.refresh();
    } finally {
      setSupervisorSaving(false);
    }
  }

  if (!session) return null;

  const fellowName = session.fellows?.full_name ?? "Unknown Fellow";
  const groupName = session.groups?.name ?? "Unknown Group";

  const currentSupervisor = supervisorOptions.find((s) => s.id === supervisorId);
  const supervisorName = currentSupervisor?.name ?? "Unknown Supervisor";

  // Check if current user is assigned as reviewer
  // Use supervisorId (local state) instead of session.reviewer_id (prop) so it updates immediately
  const isAssigned = supervisorId === currentUserId || (userRole === "admin");

  const dateStr = new Date(session.session_date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session — {dateStr}</DialogTitle>
          <DialogDescription>
            {fellowName}&apos;s session with {groupName}
          </DialogDescription>
        </DialogHeader>

        {/* Section A: Metadata */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs uppercase font-medium tracking-wide">
              Fellow:
            </span>
            <GreenAvatar name={fellowName} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs uppercase font-medium tracking-wide">
              Group:
            </span>
            <span className="text-xs font-medium">{groupName}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <StatusBadge status={currentStatus} />
          </div>
        </div>

        {/* Supervisor row */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs uppercase font-medium tracking-wide">
            Assigned Supervisor
          </span>
          {userRole === "admin" || (userRole === "supervisor" && currentStatus === "pending") ? (
            <Select
              value={supervisorId ?? ""}
              onValueChange={handleSupervisorChange}
              disabled={supervisorSaving}
            >
              <SelectTrigger size="sm" className="w-[200px]">
                <SelectValue>
                  {supervisorSaving ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Saving…
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <SupervisorAvatar name={supervisorName} />
                      <span>{supervisorName}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supervisorOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-1.5">
                      <SupervisorAvatar name={s.name} />
                      <span>{s.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="font-medium">{supervisorName}</span>
          )}
        </div>

        {/* Section B: Transcript (collapsible) */}
        {transcript && (
          <div className="rounded-md border">
            <button
              onClick={() => setTranscriptOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              Transcript
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${
                  transcriptOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {transcriptOpen && (
              <div className="border-t px-4 py-3 max-h-64 overflow-y-auto">
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground">
                  {transcript}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Analyze button - show if no existing analysis and not currently analyzing */}
        {!hasExistingAnalysis && !promise && !isAnalyzing && (
          <Button
            onClick={startAnalysis}
            className="w-full"
            size="sm"
          >
            Analyze Session with AI
            <Sparkles className="size-4 ml-2" />
          </Button>
        )}

        {/* Review actions — supervisors only, and only if assigned */}
        {userRole === "supervisor" && isAssigned && (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              size="sm"
              className={`w-full rounded-none text-white ${
                currentStatus === "safe"
                  ? "bg-green-700 ring-2 ring-green-400 ring-offset-2 ring-offset-background"
                  : "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              }`}
              disabled={reviewLoading !== null || currentStatus === "safe"}
              onClick={() => handleReview("safe")}
            >
              {reviewLoading === "safe" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {currentStatus === "safe" ? "Marked Safe" : "Mark as Safe"}
            </Button>
            <Button
              size="sm"
              className={`w-full rounded-none text-white ${
                currentStatus === "flagged_for_review"
                  ? "bg-red-700 ring-2 ring-red-400 ring-offset-2 ring-offset-background"
                  : "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              }`}
              disabled={reviewLoading !== null || currentStatus === "flagged_for_review"}
              onClick={() => handleReview("flagged_for_review")}
            >
              {reviewLoading === "flagged_for_review" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Flag className="size-4" />
              )}
              {currentStatus === "flagged_for_review" ? "Flagged" : "Flag for Review"}
            </Button>
          </div>
        )}

        {/* Section C: AI Analysis (Suspense) - only show if analysis exists or is being generated */}
        {(promise || error) && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-green-500" />
              AI Analysis
            </h3>

            {error ? (
              <AnalysisError error={error} onRetry={startAnalysis} />
            ) : promise ? (
              <AnalysisErrorBoundary
                ref={errorBoundaryRef}
                onError={setError}
              >
                <Suspense fallback={<AnalysisSkeleton onStop={stopAnalysis} />}>
                  <SessionAnalysisContent promise={promise} onReanalyze={forceReanalyze} />
                </Suspense>
              </AnalysisErrorBoundary>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

