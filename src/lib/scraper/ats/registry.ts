import { searchJobSpy } from "../jobspy";
import type { JobBoard } from "@/models/automation.model";
import { searchGreenhouseJobs } from "../greenhouse";
import { searchLeverJobs } from "../lever";
import { searchAshbyJobs } from "../ashby";
import type { AtsProvider } from "./types";

// Server-only: imports the real network-calling search fns (fetch, p-limit).
// Never import this from client-bundled code — use ATS_BOARDS from
// automation.model.ts for the plain, dependency-free board list.
export const ATS_PROVIDERS: Partial<Record<JobBoard, AtsProvider>> = {
  jobspy: { id: "jobspy", label: "Recherche multi-plateformes", search: searchJobSpy },
  greenhouse: {
    id: "greenhouse",
    label: "Greenhouse",
    search: searchGreenhouseJobs,
  },
  lever: { id: "lever", label: "Lever", search: searchLeverJobs },
  ashby: { id: "ashby", label: "Ashby", search: searchAshbyJobs },
};
