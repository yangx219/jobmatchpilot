import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getI18n } from "@/lib/i18n/server";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
  title: {
    template: `%s | ${BRAND_NAME}`,
    default: `${BRAND_NAME} — ${t("Repérez. Préparez. Décrochez.")}`,
  },
  description: t("landing.description"),
  };
}

interface Props {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: Readonly<Props>) {
  const { locale } = await getI18n();
  return (
    <html lang={locale === "zh" ? "zh-CN" : locale} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
