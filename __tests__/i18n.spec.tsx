import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider, useI18n } from "@/components/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { LOCALE_COOKIE, parseLocale, translate } from "@/lib/i18n/core";
import { messages } from "@/lib/i18n/messages";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function Sample() {
  const { t } = useI18n();
  return <><LanguageSwitcher /><h1>{t("landing.title")}</h1></>;
}

describe("three-language UI", () => {
  it.each(["fr", "en", "zh"] as const)("has complete nonempty %s entries and matching placeholders", (locale) => {
    const index = ["fr", "en", "zh"].indexOf(locale);
    for (const [key, row] of Object.entries(messages)) {
      expect(row[index]?.trim(), key).toBeTruthy();
      expect([...row[index].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(), key)
        .toEqual([...row[0].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort());
    }
  });

  it("accepts only the three known cookie values", () => {
    expect(parseLocale("zh")).toBe("zh");
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("<script>")).toBe("fr");
    expect(parseLocale(null)).toBe("fr");
  });

  it("preserves uncatalogued content and interpolates without evaluating markup", () => {
    expect(translate("zh", "A company-provided job description")).toBe("A company-provided job description");
    expect(translate("en", "lastSaved", { count: 3 })).toContain("3 job(s)");
  });

  it("updates UI and document language, persists the cookie and refreshes server content", async () => {
    const user = userEvent.setup();
    render(<LanguageProvider initialLocale="fr"><Sample /></LanguageProvider>);
    await user.selectOptions(screen.getByRole("combobox", { name: "Langue" }), "zh");
    await waitFor(() => expect(screen.getByRole("heading")).toHaveTextContent("下一份理想工作"));
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=zh`);
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(refresh).toHaveBeenCalled();
    document.cookie = `${LOCALE_COOKIE}=; Path=/; Max-Age=0`;
  });
});
