"use client";
import { UiText } from "@/components/i18n/UiText";
import { useCallback, useEffect, useState } from "react";
import {
  AiModel,
  AiProvider,
  defaultModel,
  OpenaiModel,
  DeepseekModel,
  GeminiModel,
} from "@/models/ai.model";
import {
  PROVIDER_REGISTRY,
  AI_PROVIDERS,
} from "@/lib/ai/provider-registry";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { toastSuccess, toastError } from "@/lib/toast";
import { XCircle, Loader2, RefreshCw } from "lucide-react";
import { checkOllamaConnection } from "@/utils/ai.utils";
import { getUserSettings, updateAiSettings } from "@/actions/userSettings.actions";
import { useAgentChat } from "@/components/agent/AgentChatProvider";
import { useI18n } from "@/components/i18n/LanguageProvider";

function AiSettings() {
  const { isOpen: isAgentChatOpen, refreshPreflight } = useAgentChat();
  const { t } = useI18n();
  const [selectedModel, setSelectedModel] = useState<AiModel>(defaultModel);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fetchError, setFetchError] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string>("");


  const setSelectedProvider = (provider: AiProvider) => {
    setSelectedModel({ provider, model: undefined });
    setFetchError("");
    setConnectionError("");
  };

  const setSelectedProviderModel = (model: string) => {
    setSelectedModel({ ...selectedModel, model });
  };

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const settingsResult = await getUserSettings();

        if (settingsResult.success && settingsResult.data?.settings?.ai) {
          const aiSettings = settingsResult.data.settings.ai;
          setSelectedModel({
            provider: aiSettings.provider || defaultModel.provider,
            model: aiSettings.model,
          });
        }
      } catch (error) {
        console.error("Error fetching user settings:", error);
      } finally {
        setIsLoadingSettings(false);
        setIsInitialized(true);
      }
    };
    fetchSettings();
  }, []);

  const getFallbackModels = (provider: AiProvider): string[] => {
    switch (provider) {
      case AiProvider.OPENAI:
        return Object.values(OpenaiModel);
      case AiProvider.DEEPSEEK:
        return Object.values(DeepseekModel);
      case AiProvider.GEMINI:
        return Object.values(GeminiModel);
      default:
        return [];
    }
  };

  const fetchModelsForProvider = useCallback(
    (provider: AiProvider) => {
      const entry = PROVIDER_REGISTRY[provider];
      if (!entry) return () => {};

      if (!entry.modelsEndpoint) {
        const fallbackModels = getFallbackModels(provider);
        setFetchedModels(fallbackModels);
        setSelectedModel((prev) =>
          prev.model && !fallbackModels.includes(prev.model)
            ? { ...prev, model: undefined }
            : prev,
        );
        return () => {};
      }

      const fallback = getFallbackModels(provider);
      let cancelled = false;
      setIsLoadingModels(true);
      setFetchError("");
      setConnectionError("");

      (async () => {
        try {
          if (entry.category === "local") {
            const connResult = await checkOllamaConnection(provider);
            if (!connResult.isConnected) {
              if (!cancelled) {
                setFetchedModels(fallback);
                setConnectionError(connResult.error || "Ollama is not reachable.");
              }
              return;
            }
          }
          const response = await fetch(`/api/ai/${entry.modelsEndpoint}`);
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMsg = errorData?.error
              || (entry.category === "local"
                ? `Failed to fetch ${entry.displayName} models. Make sure ${entry.displayName} is running.`
                : `Failed to fetch ${entry.displayName} models. Please check your API key in API Keys settings.`);
            if (!cancelled) {
              setFetchError(errorMsg);
              setFetchedModels(fallback);
            }
            return;
          }
          const data = await response.json();
          const models = entry.parseModelsResponse?.(data) ?? [];
          const finalModels = models.length > 0 ? models : fallback;
          if (!cancelled) {
            setFetchedModels(finalModels);
            setSelectedModel((prev) =>
              prev.model && !finalModels.includes(prev.model)
                ? { ...prev, model: undefined }
                : prev,
            );
          }
        } catch (error) {
          console.error(`Error fetching ${entry.displayName} models:`, error);
          if (!cancelled) {
            setFetchedModels(fallback);
            setFetchError(
              entry.category === "local"
                ? `Failed to fetch ${entry.displayName} models. Make sure ${entry.displayName} is running.`
                : `Failed to fetch ${entry.displayName} models. Please check your API key in API Keys settings.`,
            );
          }
        } finally {
          if (!cancelled) setIsLoadingModels(false);
        }
      })();

      return () => { cancelled = true; };
    },
    [],
  );

  useEffect(() => {
    if (!isInitialized) return;
    return fetchModelsForProvider(selectedModel.provider);
  }, [selectedModel.provider, isInitialized, fetchModelsForProvider]);

  const retryConnection = () => {
    fetchModelsForProvider(selectedModel.provider);
  };

  const saveModelSettings = async () => {
    if (!selectedModel.model) {
      toastError("Please select a model to save.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateAiSettings({
        provider: selectedModel.provider,
        model: selectedModel.model,
      });
      if (result.success) {
        toastSuccess("AI Settings saved successfully.", "Saved!");
        if (isAgentChatOpen) void refreshPreflight();
      } else {
        toastError(result.message || "Failed to save AI settings.");
      }
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toastError("Failed to save AI settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Radix reads an undefined value as uncontrolled and falls back to its own
  // internal state, which still holds the previous provider's pick; a value
  // matching no item renders neither item text nor placeholder.
  const modelValue =
    selectedModel.model && fetchedModels.includes(selectedModel.model)
      ? selectedModel.model
      : "";

  if (isLoadingSettings) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium"><UiText text={"AI Provider"} /></h3>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span><UiText text={"Loading settings..."} /></span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium"><UiText text={"AI Provider"} /></h3>
      <div>
        <Label className="my-4" htmlFor="ai-provider">
          {t("AI Service Provider")}
        </Label>
        <Select
          value={selectedModel.provider}
          onValueChange={setSelectedProvider}
        >
          <SelectTrigger
            id="ai-provider"
            aria-label={t("Select AI Service Provider")}
            className="w-full sm:w-[220px]"
          >
            <SelectValue placeholder={t("Select AI Service Provider")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {AI_PROVIDERS.map((id) => {
                const entry = PROVIDER_REGISTRY[id];
                return (
                  <SelectItem key={id} value={id}>
                    {entry.displayName}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="my-4" htmlFor="ai-model">
          <UiText text={"Model"} /></Label>
        <div className="flex max-w-xl flex-col items-start gap-2">
          <Select
            value={isLoadingModels ? "" : modelValue}
            onValueChange={setSelectedProviderModel}
            disabled={isLoadingModels}
          >
            <SelectTrigger
              id="ai-model"
              aria-label={t("Select Model")}
              className="w-full sm:w-[220px]"
            >
              {/* a flex row here must nest inside SelectValue's span, which the
                  trigger's [&>span]:line-clamp-1 outranks */}
              <SelectValue
                placeholder={
                  isLoadingModels ? (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t("Loading models...")}
                    </span>
                  ) : (
                    t("Select Model")
                  )
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {fetchedModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fetchError && (
            <div className="flex w-full items-start gap-1 rounded-md bg-red-50 p-2 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{t(fetchError)}</span>
            </div>
          )}
          {connectionError && (
            <div className="flex w-full flex-col gap-2 rounded-md bg-red-50 p-2 sm:flex-row sm:items-start">
              <Button
                variant="outline"
                size="sm"
                className="h-6 shrink-0 text-muted-foreground"
                onClick={retryConnection}
                disabled={isLoadingModels}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingModels ? "animate-spin" : ""}`} />
                {t("Retry")}
              </Button>
              <div className="flex items-start gap-1 text-red-600 text-sm">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t(connectionError)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Button
        className="mt-4"
        onClick={saveModelSettings}
        disabled={!selectedModel.model || isLoadingModels || isSaving}
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <UiText text={"Save"} /></Button>
    </div>
  );
}

export default AiSettings;
