"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sessionAnalysisSchema,
  type SessionAnalysis,
} from "@/lib/schemas/session-analysis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";

export interface SessionInsight {
  transcript: string;
  supervisorName: string;
  analysis: SessionAnalysis;
  lastRanAt: string | null;
  lastRanBy: {
    id: string;
    fullName: string;
  } | null;
}

export async function updateSessionStatus(
  sessionId: string,
  status: "safe" | "flagged_for_review"
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("sessions")
    .update({
      status,
      reviewer_id: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error("Failed to update session status");
  }
}

export async function getOrCreateAnalysis(
  sessionId: string,
  force: boolean = false
): Promise<SessionInsight> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      `id, transcript, status,
       fellows(full_name, supervisors(profiles(first_name, last_name))),
       groups(name)`
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fellow = session.fellows as any;
  const supervisorProfile = fellow?.supervisors?.profiles;
  const supervisorName = supervisorProfile
    ? `${supervisorProfile.first_name} ${supervisorProfile.last_name}`
    : "Unknown";

  // Get the most recent analysis for this session (if any) - skip if forcing re-analysis
  if (!force) {
    const { data: existingAnalyses } = await supabase
      .from("session_analyses")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1);

    const existingAnalysis = existingAnalyses?.[0];

    if (existingAnalysis) {
    // Fetch profile info for last_ran_by
    let ranByFullName: string | null = null;
    if (existingAnalysis.last_ran_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", existingAnalysis.last_ran_by)
        .single();
      if (profile) {
        ranByFullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || null;
      }
    }

    return {
      transcript: session.transcript as string,
      supervisorName,
      analysis: {
        summary: existingAnalysis.summary,
        content_coverage_score: existingAnalysis.content_coverage_score,
        content_coverage_justification:
          existingAnalysis.content_coverage_justification,
        facilitation_quality_score: existingAnalysis.facilitation_quality_score,
        facilitation_quality_justification:
          existingAnalysis.facilitation_quality_justification,
        protocol_safety_score: existingAnalysis.protocol_safety_score,
        protocol_safety_justification:
          existingAnalysis.protocol_safety_justification,
        risk_flag: existingAnalysis.risk_flag,
        risk_quotes: existingAnalysis.risk_quotes ?? [],
      },
      lastRanAt: existingAnalysis.last_ran_at ?? existingAnalysis.created_at,
      lastRanBy: existingAnalysis.last_ran_by && ranByFullName
        ? {
            id: existingAnalysis.last_ran_by,
            fullName: ranByFullName,
          }
        : null,
    };
    }
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to your .env.local file."
    );
  }

  const promptPath = path.join(
    process.cwd(),
    "lib",
    "prompts",
    "session-analysis.md"
  );
  const systemPrompt = await fs.readFile(promptPath, "utf-8");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(
    systemPrompt +
      "\n\n---\n\n## Transcript\n\n" +
      (session.transcript as string)
  );

  const responseText = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  const analysis = sessionAnalysisSchema.parse(parsed);

  const now = new Date().toISOString();
  // Always insert a new analysis record (re-analysis creates a new record)
  await supabase.from("session_analyses").insert({
    session_id: sessionId,
    ...analysis,
    last_ran_at: now,
    last_ran_by: user?.id ?? null,
  });

  // Fetch profile info for last_ran_by
  let ranByFullName: string | null = null;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();
    if (profile) {
      ranByFullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || null;
    }
  }

  return {
    transcript: session.transcript as string,
    supervisorName,
    analysis,
    lastRanAt: now,
    lastRanBy: user?.id && ranByFullName
      ? {
          id: user.id,
          fullName: ranByFullName,
        }
      : null,
  };
}
