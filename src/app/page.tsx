import { auth } from "@/auth";
import { LandingPage } from "@/components/landing/LandingPage";
import { redirect } from "next/navigation";

export default async function RootPage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { auth: authMode } = await searchParams;
  return <LandingPage authMode={authMode === "signup" ? "signup" : authMode === "signin" ? "signin" : undefined} />;
}
