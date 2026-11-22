"use client";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { localeTags } from "@/lib/i18n/core";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  SquareCheckBig,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AddContactShortcut from "./AddContactShortcut";

export default function JobsAppliedCard() {
  const { t, locale } = useI18n();
  const router = useRouter();
  return (
    <Card className="@lg:col-span-2 min-w-0 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-green-600">{t("analytics.quick")}</CardTitle>
        <CardDescription className="max-w-lg text-balance leading-relaxed">
          {t("analytics.quickDescription")}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="justify-start min-w-0 h-auto min-h-10 py-2 whitespace-normal text-left"
          onClick={() => router.push("/dashboard/myjobs?add-job=true")}
        >
          <BriefcaseBusiness className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 whitespace-normal break-words">{t("analytics.addJob")}</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start min-w-0 h-auto min-h-10 py-2 whitespace-normal text-left"
          onClick={() =>
            router.push("/dashboard/automations?add-automation=true")
          }
        >
          <Zap className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 whitespace-normal break-words">{t("analytics.addAutomation")}</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start min-w-0 h-auto min-h-10 py-2 whitespace-normal text-left"
          onClick={() => router.push("/dashboard/tasks?add-task=true")}
        >
          <SquareCheckBig className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 whitespace-normal break-words">{t("analytics.addTask")}</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start min-w-0 h-auto min-h-10 py-2 whitespace-normal text-left"
          onClick={() =>
            router.push("/dashboard/questions?add-question=true")
          }
        >
          <BookOpen className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 whitespace-normal break-words">{t("analytics.addQuestion")}</span>
        </Button>
        <Button
          variant="outline"
          className="justify-start min-w-0 h-auto min-h-10 py-2 whitespace-normal text-left"
          onClick={() =>
            router.push("/dashboard/activities?add-activity=true")
          }
        >
          <CalendarClock className="h-3.5 w-3.5 mr-1 shrink-0" />
          <span className="min-w-0 whitespace-normal break-words">{t("analytics.addActivity")}</span>
        </Button>
        <AddContactShortcut />
      </CardFooter>
    </Card>
  );
}
