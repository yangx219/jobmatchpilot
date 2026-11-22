import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickSearch } from "@/components/discovery/QuickSearch";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { createAutomation } from "@/actions/automation.actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/actions/automation.actions", () => ({ createAutomation: vi.fn() }));
vi.mock("@/actions/userSettings.actions", () => ({
 getUserSettings: vi.fn().mockResolvedValue({ success: false }),
}));
vi.mock("@/components/automations/ats-search-step/CompanyPicker", () => ({ CompanyPicker: ({ onAdd }: any) => <button type="button" onClick={() => onAdd({ name: "Fixture", token: "fixture" })}>Select company</button> }));
const resumes = [{ id: "11111111-1111-4111-8111-111111111111", title: "My Java CV" }];
function setup(list = resumes) {
 const onCreated = vi.fn().mockResolvedValue(undefined);
 render(<LanguageProvider initialLocale="en"><QuickSearch resumes={list} initiallyOpen onCreated={onCreated} /></LanguageProvider>);
 return { onCreated };
}
beforeEach(() => { vi.clearAllMocks(); vi.mocked(createAutomation).mockResolvedValue({ success: true, data: { id: "task" } as any }); });
it("requires a company and creates an hourly AI-free search with the entered criteria", async () => {
 const { onCreated } = setup();
 await userEvent.click(screen.getByRole("button", { name: "Continue" }));
 await userEvent.click(screen.getByRole("button", { name: "Select company" }));
 await userEvent.click(screen.getByRole("button", { name: "Continue" }));
 await userEvent.click(screen.getByRole("button", { name: "Create and collect" }));
 await waitFor(() => expect(onCreated).toHaveBeenCalledWith("task"));
 expect(createAutomation).toHaveBeenCalledWith(expect.objectContaining({ resumeId: resumes[0].id, jobBoard: "greenhouse", sourceConfig: { greenhouse: expect.objectContaining({ companies: [{ name: "Fixture", token: "fixture" }], targetTitles: ["Junior Java Developer"], keywords: ["Java", "Spring Boot", "SQL"], locations: ["Paris"], strictLocation: true, intervalHours: 1, analyzeWithAi: false }) } }));
});
it("clears companies when switching sources instead of sending wrong ATS tokens", async () => {
 setup();
 await userEvent.click(screen.getByRole("button", { name: "Continue" }));
 await userEvent.click(screen.getByRole("button", { name: "Select company" }));
 await userEvent.selectOptions(screen.getByLabelText("Recruitment source"), "lever");
 expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
 expect(createAutomation).not.toHaveBeenCalled();
});
it("explains the missing resume and links to documents", async () => {
 setup([]);
 await userEvent.click(screen.getByRole("button", { name: "3 Review" }));
 expect(screen.getByRole("link", { name: "Add a resume" })).toHaveAttribute("href", "/dashboard/profile");
 expect(screen.getByRole("button", { name: "Create and collect" })).toBeDisabled();
});
it("shows creation failures without reporting a collection", async () => {
 vi.mocked(createAutomation).mockResolvedValue({ success: false, message: "Task limit reached" });
 const { onCreated } = setup();
 await userEvent.click(screen.getByRole("button", { name: "Continue" }));
 await userEvent.click(screen.getByRole("button", { name: "Select company" }));
 await userEvent.click(screen.getByRole("button", { name: "Continue" }));
 await userEvent.click(screen.getByRole("button", { name: "Create and collect" }));
 expect(await screen.findByRole("alert")).toHaveTextContent("Task limit reached");
 expect(onCreated).not.toHaveBeenCalled();
});
