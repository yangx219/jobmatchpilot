import { Metadata } from "next";
import {
  MockActivitiesCard,
  MockProfileCard,
  MockJobsCard,
} from "@/components/developer/DeveloperContainer";
import { ClearAllDataButton } from "@/components/developer/ClearAllDataButton";
import { GenerateMockDataButton } from "@/components/developer/GenerateMockDataButton";
import { UiText } from "@/components/i18n/UiText";

export const metadata: Metadata = {
  title: "Developer Options",
  description: "Developer tools and utilities for development mode",
};

export default function DeveloperPage() {
  return (
    <>
      <div className="col-span-3 flex min-w-0 flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <UiText text="Developer Options" />
          </h1>
          <p className="text-muted-foreground mt-2">
            <UiText text="Developer tools description" />
          </p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
          <GenerateMockDataButton />
          <ClearAllDataButton />
        </div>
      </div>
      <div className="min-w-0 self-start @3xl/main:col-start-1">
        <MockActivitiesCard />
      </div>
      <div className="min-w-0 self-start @3xl/main:col-start-2">
        <MockProfileCard />
      </div>
      <div className="min-w-0 self-start @3xl/main:col-start-3">
        <MockJobsCard />
      </div>
    </>
  );
}
