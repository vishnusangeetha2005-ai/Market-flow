// Legacy hook - replaced by direct posts API calls in page components
import type { Post, PostStatus } from "../types";

export function usePosts(_status?: PostStatus) {
  return { data: undefined as { items: Post[]; total: number } | undefined, isLoading: false };
}

export function usePost(_id: number) {
  return { data: undefined as Post | undefined, isLoading: false };
}

export function useCreatePost() {
  return {
    mutateAsync: async (_payload: unknown): Promise<Post> => { throw new Error("Use posts API directly"); },
    isPending: false,
  };
}

export function useUpdatePost(_id: number) {
  return {
    mutateAsync: async (_payload: unknown): Promise<Post> => { throw new Error("Use posts API directly"); },
    isPending: false,
  };
}

export function useDeletePost() {
  return {
    mutateAsync: async (_id: number): Promise<void> => { throw new Error("Use posts API directly"); },
    isPending: false,
  };
}

export function usePublishPost() {
  return {
    mutateAsync: async (_id: number): Promise<Post> => { throw new Error("Use posts API directly"); },
    isPending: false,
  };
}
