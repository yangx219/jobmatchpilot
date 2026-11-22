import { PlanningWorkspace } from "@/components/workspace/PlanningWorkspace";
import { getAllActivityTypes } from "@/actions/activity.actions";
import { getActivityTypesWithTaskCounts } from "@/actions/task.actions";

async function Activities() {
  const [types, counts] = await Promise.all([getAllActivityTypes(), getActivityTypesWithTaskCounts()]);
  return <PlanningWorkspace activityTypes={types || []} countedTypes={counts?.data || []} totalTasks={counts?.totalTasks || 0} />;
}

export default Activities;
