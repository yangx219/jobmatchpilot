"use client";
import { UiText } from "@/components/i18n/UiText";
import type { RefObject } from "react";
import { ArrowLeft, Eye, FileDown, MoreVertical, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import type { Resume } from "@/models/profile.model";
import {
  hasMinResumeSections,
  warnInsufficientResumeSections,
} from "@/utils/resumeSections.utils";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { CardTitle } from "../../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import AddResumeSection, { AddResumeSectionRef } from "../AddResumeSection";
import { DownloadFileButton } from "../DownloadFileButton";
import { ResumeFilePreviewDialog } from "../ResumeFilePreviewDialog";

export function ResumeHeader({
  resume,
  title,
  isDefault,
  resumeSectionRef,
  onBack,
  onReview,
  onExport,
  onSetDefault,
}: {
  resume: Resume;
  title: string;
  isDefault: boolean;
  resumeSectionRef: RefObject<AddResumeSectionRef | null>;
  onBack: () => void;
  onReview: () => void;
  onExport: () => void;
  onSetDefault: () => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button title="Go Back" size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <CardTitle>
          {resume.FileId && resume.File?.filePath
            ? DownloadFileButton(
                resume.id!,
                resume.File?.filePath,
                title,
                resume.File?.fileName,
              )
            : title}
        </CardTitle>
        {isDefault && (
          <Badge className="border-transparent bg-green-600 text-white hover:bg-green-600/90">
            Default
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {resume.FileId && <Button className="h-8 gap-1" onClick={() => setPreviewOpen(true)} size="sm" variant="outline"><Eye className="h-3.5 w-3.5" /><UiText text="resume.originalPreview" /></Button>}
        <AddResumeSection resume={resume} ref={resumeSectionRef} />
        <Button
          className="h-8 gap-1 cursor-pointer"
          onClick={onReview}
          size="sm"
          variant="outline"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            <UiText text={"Review"} /></span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer" onClick={onExport}>
              <FileDown className="h-4 w-4 mr-2" />
              Export to PDF
            </DropdownMenuItem>
            {!isDefault && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (!hasMinResumeSections(resume.ResumeSections?.length)) {
                    warnInsufficientResumeSections(
                      "setting this resume as default",
                    );
                    return;
                  }
                  onSetDefault();
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                Set as default
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>{resume.id && <ResumeFilePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} resumeId={resume.id} title={title} />}</>
  );
}
