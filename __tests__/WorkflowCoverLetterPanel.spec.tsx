import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowCoverLetterPanel } from "@/components/myjobs/job-details/WorkflowCoverLetterPanel";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

const draftWorkflow = {
  id: "workflow-1",
  status: "WAITING_APPROVAL",
  output: "Dear Hiring Manager,\n\nA grounded draft.\n\nSincerely,\nXue Yang",
  steps: [
    { id: "s1", name: "prepare_context", status: "COMPLETED" },
    { id: "s2", name: "generate_letter", status: "COMPLETED" },
    { id: "s3", name: "validate_output", status: "COMPLETED" },
    { id: "s4", name: "await_approval", status: "RUNNING" },
  ],
};

describe("WorkflowCoverLetterPanel", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("creates a draft without saving it immediately", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: draftWorkflow }), { status: 202, headers: { "Content-Type": "application/json" } }),
    );
    render(<WorkflowCoverLetterPanel jobId="job-1" resumeId="resume-1" hasLetter={false} onCompleted={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /generate draft/i }));

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ type: "cover_letter", jobId: "job-1", resumeId: "resume-1" });
    expect(await screen.findByText(/Dear Hiring Manager/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve and save/i })).toBeInTheDocument();
  });

  it("saves only after explicit approval", async () => {
    const completed = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: draftWorkflow }), { status: 202, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "letter-1" } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    render(<WorkflowCoverLetterPanel jobId="job-1" hasLetter={false} onCompleted={completed} />);
    await userEvent.click(screen.getByRole("button", { name: /generate draft/i }));
    await userEvent.click(await screen.findByRole("button", { name: /approve and save/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/v2/workflows/workflow-1/approve", { method: "POST" }));
    expect(completed).toHaveBeenCalledOnce();
  });
});
