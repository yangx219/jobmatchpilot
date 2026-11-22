import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getResumeList } from "@/actions/profile.actions";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileContainer from "@/components/profile/ProfileContainer";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: vi.fn().mockResolvedValue({ success: false }),
}));

vi.mock("@/actions/profile.actions", () => ({
  getResumeList: vi.fn(() =>
    Promise.resolve({
      data: [],
      total: 0,
      success: true,
      message: "",
    }),
  ),
  getDefaultResumeId: vi.fn(() => Promise.resolve(null)),
  getDefaultContactInfo: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/actions/coverLetter.actions", () => ({
  getCoverLetterList: vi.fn(() =>
    Promise.resolve({
      data: [],
      total: 0,
      success: true,
      message: "",
    }),
  ),
}));

describe("ProfileContainer Component", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => {
      render(<LanguageProvider initialLocale="en"><ProfileContainer /></LanguageProvider>);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
  it("should render the profile container component", () => {
    expect(screen.getByRole("heading", { name: "My CVs and documents" })).toBeInTheDocument();
  });

  it("should open the create resume dialog upon clicking create resume button", async () => {
    const user = userEvent.setup();

    const newButton = screen.getByRole("button", {
      name: /^new$/i,
    });
    await user.click(newButton);

    const addResumeItem = await screen.findByRole("menuitem", { name: /add new resume/i });
    await user.click(addResumeItem);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /create resume/i }),
    ).toBeInTheDocument();
  });
});


it("recovers from a rejected document request without an unhandled rejection or endless spinner", async () => {
  vi.mocked(getResumeList).mockRejectedValueOnce(new Error("network unavailable"));
  render(<LanguageProvider initialLocale="en"><ProfileContainer /></LanguageProvider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load documents");
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Add a resume to prepare applications and set up job searches.")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
