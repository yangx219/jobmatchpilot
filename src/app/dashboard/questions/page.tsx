import { redirect } from "next/navigation";

async function Questions({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  redirect(`/dashboard/interviews?tab=questions${stage ? `&stage=${encodeURIComponent(stage)}` : ""}`);
}

export default Questions;
