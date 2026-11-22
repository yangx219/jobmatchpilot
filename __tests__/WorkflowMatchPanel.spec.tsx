import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowMatchPanel } from "@/components/myjobs/job-details/WorkflowMatchPanel";

vi.mock("@/lib/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

const queuedWorkflow = {
  id: "workflow-1",
  status: "QUEUED",
  steps: [
    { id: "step-1", name: "prepare_context", status: "PENDING" },
    { id: "step-2", name: "generate_match", status: "PENDING" },
  ],
};

describe("WorkflowMatchPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts a durable job-match workflow with the linked resume", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: queuedWorkflow }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(
      <WorkflowMatchPanel
        jobId="job-1"
        resumeId="resume-1"
        hasAnalysis={false}
        onCompleted={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /match with ai/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v2/workflows");
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(init?.body))).toEqual({
      type: "job_match",
      jobId: "job-1",
      resumeId: "resume-1",
    });
    expect(screen.getByText("Preparing resume and job")).toBeInTheDocument();
  });

  it("can cancel an active workflow", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: queuedWorkflow }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }));

    render(
      <WorkflowMatchPanel
        jobId="job-1"
        hasAnalysis={false}
        onCompleted={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /match with ai/i }));
    await userEvent.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v2/workflows/workflow-1/cancel",
      { method: "POST" },
    );
    expect(screen.getByText("cancelled")).toBeInTheDocument();
  });
});
