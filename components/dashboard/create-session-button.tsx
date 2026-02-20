"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FellowOption = {
  id: string;
  full_name: string;
};

type GroupOption = {
  id: string;
  name: string;
};

export function CreateSessionButton() {
  const [open, setOpen] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [fellows, setFellows] = useState<FellowOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  const [fellowId, setFellowId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [transcript, setTranscript] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const loadOptions = async () => {
      setIsLoadingOptions(true);
      setLoadError(null);

      try {
        const supabase = createClient();
        const [{ data: fellowRows, error: fellowError }, { data: groupRows, error: groupError }] =
          await Promise.all([
            supabase
              .from("fellows")
              .select("id, full_name")
              .order("full_name", { ascending: true }),
            supabase.from("groups").select("id, name").order("name", { ascending: true }),
          ]);

        if (fellowError) throw fellowError;
        if (groupError) throw groupError;

        setFellows((fellowRows ?? []) as FellowOption[]);
        setGroups((groupRows ?? []) as GroupOption[]);
      } catch (error: unknown) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load fellows and groups",
        );
      } finally {
        setIsLoadingOptions(false);
      }
    };

    void loadOptions();
  }, [open]);

  const canSubmit = useMemo(() => {
    return Boolean(fellowId && groupId && sessionDate && transcript.trim());
  }, [fellowId, groupId, sessionDate, transcript]);

  const resetForm = () => {
    setFellowId("");
    setGroupId("");
    setSessionDate("");
    setTranscript("");
    setSubmitError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const supabase = createClient();
      const isoDate = new Date(sessionDate).toISOString();

      // Fetch the fellow's supervisor_id to set as default reviewer
      const { data: fellowData, error: fellowError } = await supabase
        .from("fellows")
        .select("supervisor_id")
        .eq("id", fellowId)
        .single();

      if (fellowError) throw fellowError;

      const { error } = await supabase.from("sessions").insert({
        fellow_id: fellowId,
        group_id: groupId,
        session_date: isoDate,
        transcript: transcript.trim(),
        reviewer_id: fellowData?.supervisor_id ?? null,
      });

      if (error) throw error;

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create session",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
        >
          <PlusCircle className="h-4 w-4" />
          Create Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Create a new session by selecting a fellow and group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Fellow</Label>
            <Select value={fellowId} onValueChange={setFellowId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select fellow" />
              </SelectTrigger>
              <SelectContent>
                {fellows.map((fellow) => (
                  <SelectItem key={fellow.id} value={fellow.id}>
                    {fellow.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="session-date">Session date</Label>
            <Input
              id="session-date"
              type="datetime-local"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transcript">Transcript</Label>
            <textarea
              id="transcript"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-28 rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste session transcript..."
              required
            />
          </div>

          {(loadError || submitError) && (
            <p className="text-sm text-red-500">{loadError ?? submitError}</p>
          )}

          {isLoadingOptions && (
            <p className="text-sm text-muted-foreground">
              Loading fellows and groups...
            </p>
          )}

          <Button type="submit" disabled={!canSubmit || isLoadingOptions || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Session"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
