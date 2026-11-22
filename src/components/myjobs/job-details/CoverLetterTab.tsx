"use client";

import { format } from "date-fns";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import type { CoverLetter } from "@/models/profile.model";
import { JobTabEmptyState } from "./JobTabEmptyState";
import { WorkflowCoverLetterPanel } from "./WorkflowCoverLetterPanel";

type CoverLetterTabProps = {
  letter?: CoverLetter;
  blockedReason?: string;
  onGenerate: () => void;
  jobId: string;
  resumeId?: string;
  trigger?: number;
  onCompleted: () => void;
};

export function CoverLetterTab({
  letter,
  blockedReason,
  onGenerate,
  jobId,
  resumeId,
  trigger,
  onCompleted,
}: CoverLetterTabProps) {
  if (!letter) {
    return (
      <div className="space-y-4">
        <WorkflowCoverLetterPanel jobId={jobId} resumeId={resumeId} disabled={!!blockedReason} hasLetter={false} trigger={trigger} onCompleted={onCompleted} />
        <JobTabEmptyState icon={FileText} title="No cover letter yet" />
      </div>
    );
  }

  const generatedAt = letter.updatedAt ?? letter.createdAt;

  return (
    <div className="space-y-4">
      <WorkflowCoverLetterPanel jobId={jobId} resumeId={resumeId} disabled={!!blockedReason} hasLetter trigger={trigger} onCompleted={onCompleted} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {letter.title}
          {generatedAt &&
            ` · Generated ${format(new Date(generatedAt), "PP")}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto cursor-pointer"
          onClick={onGenerate}
          disabled={!!blockedReason}
          title={blockedReason}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      </div>
      <TipTapContentViewer content={letter.content} />
    </div>
  );
}
