// Legacy hook - replaced by direct API calls
import type { SocialAccount, Platform } from "../types";

export function useSocialAccounts() {
  return { data: undefined as SocialAccount[] | undefined, isLoading: false };
}

export function useConnectAccount() {
  return {
    mutateAsync: async (_payload: { platform: Platform; access_token: string; account_id: string; account_name: string }): Promise<SocialAccount> => {
      throw new Error("Use social accounts API directly");
    },
    isPending: false,
  };
}

export function useDisconnectAccount() {
  return {
    mutateAsync: async (_id: number): Promise<void> => {
      throw new Error("Use social accounts API directly");
    },
    isPending: false,
  };
}
