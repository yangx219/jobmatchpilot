import { Metadata } from "next";

import { getInterviewFilterOptions } from "@/actions/interview.actions";
import { getAllJobStageTypes } from "@/actions/jobStageType.actions";
import { getStatusList } from "@/actions/job.actions";
import { getTagsWithQuestionCounts } from "@/actions/question.actions";
import { getAllTags } from "@/actions/tag.actions";
import { InterviewWorkspace } from "@/components/workspace/InterviewWorkspace";

export const metadata: Metadata = {
  title: "Interviews",
};

async function Interviews() {
  const [filters, stageTypes, statuses, tags, counted] = await Promise.all([
    getInterviewFilterOptions(),
    getAllJobStageTypes(),
    getStatusList(),
    getAllTags(),
    getTagsWithQuestionCounts(),
  ]);
  return <InterviewWorkspace interviewProps={{ rounds: filters?.rounds ?? [], companies: filters?.companies ?? [], stageTypes: stageTypes ?? [], jobStatuses: statuses ?? [] }} tags={tags || []} countedTags={counted?.data || []} totalQuestions={counted?.totalQuestions || 0} />;
}

export default Interviews;
