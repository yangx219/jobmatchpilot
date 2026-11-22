import { notFound } from "next/navigation";
import {
  getDefaultResumeId,
  getResumeById,
} from "@/actions/profile.actions";
import ResumeContainer from "@/components/profile/ResumeContainer";

async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, defaultResumeId] = await Promise.all([
    getResumeById(id),
    getDefaultResumeId(),
  ]);
  if (!result?.success) throw new Error("Unable to load resume");
  if (!result.data) notFound();
  const resume = result.data;
  return (
    <div className="col-span-3">
      <ResumeContainer resume={resume} defaultResumeId={defaultResumeId} />
    </div>
  );
}

export default ResumePage;
