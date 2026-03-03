// Legacy hook - replaced by direct generate API calls in GeneratePage
import type { GeneratedContent, Platform } from "../types";

export function useGenerateBanner() {
  return {
    mutateAsync: async (_payload: { prompt: string; platform?: Platform | "all" }): Promise<GeneratedContent> => {
      throw new Error("Use generate API directly");
    },
    isPending: false,
    data: undefined as GeneratedContent | undefined,
  };
}

export function useGenerateHook() {
  return {
    mutateAsync: async (_payload: { topic: string; tone?: string; platform?: Platform | "all" }): Promise<GeneratedContent> => {
      throw new Error("Use generate API directly");
    },
    isPending: false,
    data: undefined as GeneratedContent | undefined,
  };
}

export function useGenerateCaption() {
  return {
    mutateAsync: async (_payload: { topic: string; platform?: Platform | "all"; tone?: string }): Promise<GeneratedContent> => {
      throw new Error("Use generate API directly");
    },
    isPending: false,
    data: undefined as GeneratedContent | undefined,
  };
}
