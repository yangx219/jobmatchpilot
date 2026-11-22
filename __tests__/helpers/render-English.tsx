import { render, type RenderOptions } from "@testing-library/react";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";

// Legacy interaction specs use English selectors. Make that locale explicit
// instead of depending on the app's default French preference.
export function renderInEnglish(ui: React.ReactNode, options?: RenderOptions) {
  const OriginalWrapper = options?.wrapper;
  const Wrapper = ({ children }: { children: React.ReactNode }) => <LanguageProvider initialLocale="en">{OriginalWrapper ? <OriginalWrapper>{children}</OriginalWrapper> : children}</LanguageProvider>;
  return render(ui, { ...options, wrapper: Wrapper });
}
