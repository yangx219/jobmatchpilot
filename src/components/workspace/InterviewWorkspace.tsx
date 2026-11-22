"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import InterviewsContainer, { type InterviewsContainerProps } from "@/components/interviews/InterviewsContainer";
import QuestionsPageClient from "@/app/dashboard/questions/QuestionsPageClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UiText } from "@/components/i18n/UiText";
import type { Tag } from "@/models/job.model";

type CountedTag = Tag & { questionCount: number };

export function InterviewWorkspace({ interviewProps, tags, countedTags, totalQuestions }: { interviewProps: InterviewsContainerProps; tags: Tag[]; countedTags: CountedTag[]; totalQuestions: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = params.get("tab") === "questions" ? "questions" : "interviews";
  return <div className="col-span-3 min-w-0 space-y-4">
    <div><h1 className="text-2xl font-bold"><UiText text="Interview preparation" /></h1><p className="mt-1 text-sm text-muted-foreground"><UiText text="Manage interview rounds and preparation questions in one place." /></p></div>
    <Tabs value={value} onValueChange={(tab) => router.replace(`${pathname}?tab=${tab}`, { scroll: false })}>
      <TabsList><TabsTrigger value="interviews"><UiText text="Interviews" /></TabsTrigger><TabsTrigger value="questions"><UiText text="Questions" /></TabsTrigger></TabsList>
      <TabsContent value="interviews"><InterviewsContainer {...interviewProps} /></TabsContent>
      <TabsContent value="questions"><QuestionsPageClient allTags={tags} tagsWithCounts={countedTags} totalQuestions={totalQuestions} /></TabsContent>
    </Tabs>
  </div>;
}
