"use client";
import { UiText } from "@/components/i18n/UiText";
import ActivityTypesContainer from "@/components/admin/ActivityTypesContainer";
import CompaniesContainer from "@/components/admin/CompaniesContainer";
import ContactRolesContainer from "@/components/admin/ContactRolesContainer";
import ContactsContainer from "@/components/admin/ContactsContainer";
import JobLocationsContainer from "@/components/admin/JobLocationsContainer";
import JobSourcesContainer from "@/components/admin/JobSourcesContainer";
import JobStagesContainer from "@/components/admin/JobStagesContainer";
import JobTitlesContainer from "@/components/admin/JobTitlesContainer";
import TagsContainer from "@/components/admin/TagsContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

function AdminTabsContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const queryParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(queryParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [queryParams],
  );

  const onTabChange = (tab: string) => {
    router.push(pathname + "?" + createQueryString("tab", tab));
  };
  return (
    <Tabs
      defaultValue={queryParams.get("tab") || "companies"}
      onValueChange={(e) => onTabChange(e)}
    >
      <div className="max-w-full overflow-x-auto pb-1" aria-label="Library sections">
      <TabsList className="w-max min-w-full justify-start [&>*]:shrink-0">
        <TabsTrigger value="companies"><UiText text={"Companies"} /></TabsTrigger>
        <TabsTrigger value="job-titles"><UiText text="Job Titles" /></TabsTrigger>
        <TabsTrigger value="locations"><UiText text={"Locations"} /></TabsTrigger>
        <TabsTrigger value="sources"><UiText text="Sources" /></TabsTrigger>
        <TabsTrigger value="skills"><UiText text="Skills" /></TabsTrigger>
        <TabsTrigger value="activity-types"><UiText text="Activity Types" /></TabsTrigger>
        <TabsTrigger value="contacts"><UiText text={"Contacts"} /></TabsTrigger>
        <TabsTrigger value="roles"><UiText text="Roles" /></TabsTrigger>
        <TabsTrigger value="stages"><UiText text="Stages" /></TabsTrigger>
      </TabsList>
      </div>
      <TabsContent value="companies">
        <CompaniesContainer />
      </TabsContent>
      <TabsContent value="job-titles">
        <JobTitlesContainer />
      </TabsContent>
      <TabsContent value="locations">
        <JobLocationsContainer />
      </TabsContent>
      <TabsContent value="sources">
        <JobSourcesContainer />
      </TabsContent>
      <TabsContent value="skills">
        <TagsContainer />
      </TabsContent>
      <TabsContent value="activity-types">
        <ActivityTypesContainer />
      </TabsContent>
      <TabsContent value="contacts">
        <ContactsContainer />
      </TabsContent>
      <TabsContent value="roles">
        <ContactRolesContainer />
      </TabsContent>
      <TabsContent value="stages">
        <JobStagesContainer />
      </TabsContent>
    </Tabs>
  );
}

export default AdminTabsContainer;
