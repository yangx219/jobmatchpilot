import { redirect } from "next/navigation";

async function Tasks() {
  redirect("/dashboard/activities?tab=tasks");
}

export default Tasks;
