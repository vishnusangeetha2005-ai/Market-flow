export interface Owner {
  id: number;
  email: string;
  name: string;
  role: "owner";
}

export interface Client {
  id: number;
  name: string;
  email: string;
  status: "active" | "suspended";
  account_locked: boolean;
  failed_attempts: number;
  last_login: string | null;
  login_count: number;
  created_at: string;
  subscription?: SubscriptionInfo;
  plan_name?: string;
}

export interface SubscriptionInfo {
  plan_name: string;
  status: "active" | "expired" | "cancelled";
  payment_status: "paid" | "pending" | "overdue";
  start_date: string;
  end_date: string;
}

export interface Plan {
  id: number;
  name: string;
  ai_token_limit: number;
  banner_limit: number;
  post_limit: number;
  price: number;
  description: string;
}

export interface Subscription {
  id: number;
  client_id: number;
  plan_id: number;
  status: string;
  payment_status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  client_name?: string;
  plan_name?: string;
}

export interface GeneratedContent {
  id: number;
  type: "hook" | "caption" | "banner";
  prompt: string;
  result_text: string | null;
  result_url: string | null;
  tokens_used: number;
  platform: string | null;
  created_at: string;
}

export interface TemplateField {
  name: string;
  x: number;
  y: number;
  font: string;
  font_size: number;
  color: string;
  align: "left" | "center" | "right";
  max_chars: number;
}

export interface BannerTemplate {
  id: number;
  name: string;
  description: string | null;
  width: number;
  height: number;
  background_color: string;
  background_image: string | null;
  fields: TemplateField[] | null;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Banner {
  id: number;
  client_id: number;
  template_id: number | null;
  field_values: Record<string, string> | null;
  result_url: string;
  created_at: string;
}

export interface Post {
  id: number;
  client_id: number;
  title?: string;
  caption: string;
  banner_url: string | null;
  platforms: string[];
  status: "draft" | "scheduled" | "published" | "partial" | "failed";
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at?: string;
  results: PostResult[];
}

export interface PostResult {
  id: number;
  platform: string;
  status: "success" | "failed";
  error_message: string | null;
  published_at: string | null;
}

export interface OwnerStats {
  total_clients: number;
  active_clients: number;
  suspended_clients: number;
  locked_clients: number;
  total_revenue: number;
  monthly_revenue: number;
  total_ai_tokens_used: number;
  scheduled_posts: number;
  failed_posts: number;
  total_banners: number;
  revenue_chart: { month: string; revenue: number }[];
  subscription_breakdown: Record<string, number>;
}

export interface ClientStats {
  posts_published: number;
  posts_scheduled: number;
  posts_failed: number;
  banners_generated: number;
  tokens_used: number;
  tokens_limit: number;
  plan_name: string;
  subscription_status: string;
  subscription_end_date: string | null;
}

export interface AutomationContentItem {
  id: number;
  client_id: number;
  banner_url: string | null;
  hook_text: string;
  caption_text: string | null;
  order_index: number;
  created_at: string;
}

export interface AuthState {
  user: {
    id?: number;
    email: string;
    name: string;
    // Legacy fields for backward compatibility
    full_name?: string | null;
    is_active?: boolean;
    is_verified?: boolean;
  } | null;
  role: "owner" | "client" | null;
  isAuthenticated: boolean;
  accessToken: string | null;
}

// Legacy type aliases for backward compatibility with existing hooks/pages
export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type Platform = "facebook" | "instagram" | "linkedin";

export interface SocialAccount {
  id: number;
  platform: Platform;
  account_name: string;
  account_id: string;
  is_active: boolean;
  created_at: string;
}

export type ContentType = "banner" | "hook" | "caption";

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export interface DashboardStats {
  total_posts: number;
  published: number;
  scheduled: number;
  drafts: number;
  failed: number;
  by_platform: Record<Platform, number>;
  generated_banners: number;
  generated_captions: number;
}
