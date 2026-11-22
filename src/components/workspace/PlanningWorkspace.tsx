"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ActivitiesContainer from "@/components/activities/ActivitiesContainer";
import TasksPageClient from "@/app/dashboard/tasks/TasksPageClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UiText } from "@/components/i18n/UiText";
import type { ActivityType } from "@/models/activity.model";

type CountedType = ActivityType & { taskCount: number };

export function PlanningWorkspace({ activityTypes, countedTypes, totalTasks }: { activityTypes: ActivityType[]; countedTypes: CountedType[]; totalTasks: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = params.get("tab") === "tasks" ? "tasks" : "activities";
  return <div className="col-span-3 min-w-0 space-y-4">
    <div><h1 className="text-2xl font-bold"><UiText text="Plan & activity" /></h1><p className="mt-1 text-sm text-muted-foreground"><UiText text="Keep tasks and time records together." /></p></div>
    <Tabs value={value} onValueChange={(tab) => router.replace(`${pathname}?tab=${tab}`, { scroll: false })}>
      <TabsList><TabsTrigger value="activities"><UiText text="Activities" /></TabsTrigger><TabsTrigger value="tasks"><UiText text="Tasks" /></TabsTrigger></TabsList>
      <TabsContent value="activities"><ActivitiesContainer /></TabsContent>
      <TabsContent value="tasks"><TasksPageClient activityTypes={activityTypes} activityTypesWithCounts={countedTypes} totalTasks={totalTasks} /></TabsContent>
    </Tabs>
  </div>;
}
