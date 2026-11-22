"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, LoaderCircle, RotateCcw } from "lucide-react";
import { useI18n } from "@/components/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OriginalResumePanel({
  resumeId,
  fileName,
}: {
  resumeId: string;
  fileName: string;
}) {
  const { t } = useI18n();
  const previewUrl = `/api/profile/resume?resumeId=${encodeURIComponent(resumeId)}&preview=1`;
  const downloadUrl = `/api/profile/resume?resumeId=${encodeURIComponent(resumeId)}`;
  const [previewDocument, setPreviewDocument] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setPreviewError(false);
    try {
      const response = await fetch(previewUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Preview failed: ${response.status}`);
      setPreviewDocument(await response.text());
    } catch {
      setPreviewError(true);
      setPreviewDocument("");
    } finally {
      setLoading(false);
    }
  }, [previewUrl]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-4 border-b bg-white">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            {t("resume.original")}
          </CardTitle>
          <p className="mt-1 truncate text-sm text-muted-foreground">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={downloadUrl}>
            <Download className="mr-2 h-4 w-4" />
            {t("resume.download")}
          </a>
        </Button>
      </CardHeader>
      <CardContent className="bg-slate-100 p-2 sm:p-4">
        <div className="relative h-[72dvh] min-h-[560px] overflow-hidden rounded-lg border bg-white">
          {loading ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("resume.previewLoading")}
              </span>
            </div>
          ) : previewError ? (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <p className="text-sm text-muted-foreground">{t("resume.previewError")}</p>
                <Button className="mt-4" variant="outline" size="sm" onClick={loadPreview}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("resume.previewRetry")}
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              title={t("resume.original")}
              srcDoc={previewDocument}
              sandbox=""
              className="h-full w-full bg-white"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
