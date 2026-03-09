const API_BASE = import.meta.env.VITE_API_URL ?? "";
const API_V1 = `${API_BASE}/api/v1`;

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

let isRefreshing = false;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_V1}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  skipAuthRedirect = false
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_V1}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (!skipAuthRedirect && !isRefreshing) {
      isRefreshing = true;
      const newToken = await tryRefresh();
      isRefreshing = false;
      if (newToken) {
        const retryRes = await fetch(`${API_V1}${path}`, {
          ...options,
          headers: { ...headers, Authorization: `Bearer ${newToken}` },
        });
        if (retryRes.ok) {
          if (retryRes.status === 204) return undefined as T;
          return retryRes.json();
        }
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_role");
      window.location.href = "/login";
    } else if (!skipAuthRedirect) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_role");
      window.location.href = "/login";
    }
    const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
    throw new Error(err.detail || "Invalid credentials");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth — skipAuthRedirect=true so wrong-password errors display on the form
export const auth = {
  ownerLogin: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string; role: string }>(
      "/auth/owner-login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      true
    ),
  clientLogin: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string; role: string }>(
      "/auth/client-login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      true
    ),
  register: (name: string, email: string, password: string) =>
    request<{ access_token: string; refresh_token: string; role: string }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ name, email, password }) },
      true
    ),
  logout: () => request("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) =>
    request<{ message: string; reset_token?: string }>(
      "/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) },
      true
    ),
  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>(
      "/auth/reset-password",
      { method: "POST", body: JSON.stringify({ token, new_password }) },
      true
    ),
};

// Clients (Owner)
export const clients = {
  list: (params?: { search?: string; status?: string; plan_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.status) q.set("status", params.status);
    if (params?.plan_id) q.set("plan_id", String(params.plan_id));
    return request<import("../types").Client[]>(`/clients?${q}`);
  },
  get: (id: number) => request<import("../types").Client>(`/clients/${id}`),
  create: (data: { name: string; email: string; password: string; plan_id: number }) =>
    request<import("../types").Client>("/clients", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; email?: string }) =>
    request<import("../types").Client>(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request(`/clients/${id}`, { method: "DELETE" }),
  suspend: (id: number) => request(`/clients/${id}/suspend`, { method: "POST" }),
  activate: (id: number) => request(`/clients/${id}/activate`, { method: "POST" }),
  unlock: (id: number) => request(`/clients/${id}/unlock`, { method: "POST" }),
  resetPassword: (id: number, password: string) =>
    request(`/clients/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ new_password: password }),
    }),
  activity: (id: number) => request(`/clients/${id}/activity`),
  // Owner-managed social tokens per client
  getSocialTokens: (id: number) => request<{
    id: number; platform: string; account_name: string;
    access_token_preview: string; page_id: string | null;
    is_active: boolean; updated_at: string;
  }[]>(`/clients/${id}/social-tokens`),
  saveSocialToken: (id: number, data: {
    platform: string; account_name: string; access_token: string; page_id?: string;
  }) => request<{
    id: number; platform: string; account_name: string;
    access_token_preview: string; page_id: string | null;
    is_active: boolean; updated_at: string;
  }>(`/clients/${id}/social-tokens`, { method: "POST", body: JSON.stringify(data) }),
  deleteSocialToken: (id: number, platform: string) =>
    request(`/clients/${id}/social-tokens/${platform}`, { method: "DELETE" }),
};

// Plans
export const plans = {
  list: () => request<import("../types").Plan[]>("/plans"),
};

// Subscriptions
export const subscriptions = {
  list: () => request<import("../types").Subscription[]>("/subscriptions"),
  create: (data: object) =>
    request<import("../types").Subscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: object) =>
    request<import("../types").Subscription>(`/subscriptions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Generate (Client)
export const generate = {
  hook: (data: { topic: string; platform?: string; tone?: string; include_cta?: boolean }) =>
    request<{
      id: number;
      type: string;
      result_text: string;
      tokens_used: number;
      tokens_remaining: number;
      created_at: string;
    }>("/generate/hook", { method: "POST", body: JSON.stringify(data) }),
  caption: (data: { topic: string; platform?: string; tone?: string; include_cta?: boolean }) =>
    request<{
      id: number;
      type: string;
      result_text: string;
      tokens_used: number;
      tokens_remaining: number;
      created_at: string;
    }>("/generate/caption", { method: "POST", body: JSON.stringify(data) }),
  history: () => request<import("../types").GeneratedContent[]>("/generate/history"),
  delete: (id: number) => request(`/generate/${id}`, { method: "DELETE" }),
};

// Client Profile
export const profile = {
  get: () => request<{
    id: number; name: string; email: string;
    company_name: string | null; phone: string | null;
    address: string | null; website: string | null; logo_url: string | null;
  }>("/profile"),
  update: (data: { company_name?: string; phone?: string; address?: string; website?: string }) =>
    request("/profile", { method: "PUT", body: JSON.stringify(data) }),
  uploadLogo: (file: File): Promise<{ logo_url: string }> => {
    const form = new FormData();
    form.append("logo", file);
    const token = localStorage.getItem("access_token");
    return fetch(`${API_V1}/profile/logo`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      return res.json();
    });
  },
};

// Banner Templates (Owner)
export const bannerTemplates = {
  list: () => request<import("../types").BannerTemplate[]>("/banner-templates"),
  listPublic: () => request<import("../types").BannerTemplate[]>("/banner-templates/public"),
  create: (data: object) =>
    request<import("../types").BannerTemplate>("/banner-templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: object) =>
    request<import("../types").BannerTemplate>(`/banner-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request(`/banner-templates/${id}`, { method: "DELETE" }),
};

// Banners (Client)
export const banners = {
  generate: (data: { template_id: number; field_values: Record<string, string> }) =>
    request<import("../types").Banner>("/banners/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  upload: (file: File): Promise<import("../types").Banner> => {
    const form = new FormData();
    form.append("image", file);
    const token = localStorage.getItem("access_token");
    return fetch(`${API_V1}/banners/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      return res.json();
    });
  },
  list: () => request<import("../types").Banner[]>("/banners"),
  delete: (id: number) => request(`/banners/${id}`, { method: "DELETE" }),
  templates: () => request<import("../types").BannerTemplate[]>("/banners/templates-public"),
};

// Posts (Client)
export const posts = {
  list: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return request<import("../types").Post[]>(`/posts${q}`);
  },
  create: (data: { caption: string; banner_url?: string; platforms: string[] }) =>
    request<import("../types").Post>("/posts", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => request<import("../types").Post>(`/posts/${id}`),
  update: (id: number, data: object) =>
    request<import("../types").Post>(`/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request(`/posts/${id}`, { method: "DELETE" }),
  publish: (id: number) => request(`/posts/${id}/publish`, { method: "POST" }),
  schedule: (id: number, scheduled_at: string) =>
    request(`/posts/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduled_at }) }),
  retry: (id: number) => request(`/posts/${id}/retry`, { method: "POST" }),
};

// Social Tokens (Client)
export const socialTokens = {
  list: () => request<{
    id: number; platform: string; account_name: string;
    access_token_preview: string; page_id: string | null;
    is_active: boolean; updated_at: string;
  }[]>("/social-tokens"),
  save: (data: { platform: string; account_name: string; access_token: string; page_id?: string }) =>
    request("/social-tokens", { method: "POST", body: JSON.stringify(data) }),
  delete: (platform: string) => request(`/social-tokens/${platform}`, { method: "DELETE" }),
};

// Automation content (Basic Plan)
export const automationContent = {
  list: () => request<import("../types").AutomationContentItem[]>("/automation/content"),
  add: (data: { hook_text: string; caption_text?: string; banner?: File | null }): Promise<import("../types").AutomationContentItem> => {
    const form = new FormData();
    form.append("hook_text", data.hook_text);
    if (data.caption_text) form.append("caption_text", data.caption_text);
    if (data.banner) form.append("banner", data.banner);
    const token = localStorage.getItem("access_token");
    return fetch(`${API_V1}/automation/content`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to add content" }));
        throw new Error(err.detail || "Failed to add content");
      }
      return res.json();
    });
  },
  delete: (id: number) => request(`/automation/content/${id}`, { method: "DELETE" }),
};

// Dashboard
export const dashboard = {
  ownerStats: () => request<import("../types").OwnerStats>("/dashboard/owner-stats"),
  clientStats: () => request<import("../types").ClientStats>("/dashboard/client-stats"),
  revenue: () => request<{ month: string; revenue: number }[]>("/dashboard/revenue"),
};

// Owner Settings
export const ownerSettings = {
  get: () => request<{ name: string; email: string; openai_configured: boolean; app_name: string }>("/owner/settings"),
  changePassword: (current_password: string, new_password: string) =>
    request("/owner/settings/password", { method: "PUT", body: JSON.stringify({ current_password, new_password }) }),
  updateName: (name: string) =>
    request("/owner/settings/name", { method: "PUT", body: JSON.stringify({ name }) }),
};

// Social Monitor
export const socialMonitor = {
  get: () => request<{
    recent_posts: {
      id: number; client_name: string; client_id: number; caption_preview: string;
      platforms: string[]; status: string; published_at: string | null;
      created_at: string; results: { platform: string; status: string }[];
    }[];
    automation_overview: {
      client_id: number; client_name: string; enabled: boolean; mode: string;
      post_time: string; last_posted_date: string | null; total_auto_posts: number;
      connected_platforms: string[];
    }[];
    total_auto_posts: number;
    active_automations: number;
  }>("/dashboard/social-monitor"),
};

// Legacy axios-compatible default export for backward compatibility with old hooks/pages
type AxiosResponse<T> = { data: T };

const legacyApi = {
  get: <T>(path: string, _config?: object): Promise<AxiosResponse<T>> =>
    request<T>(path).then((data) => ({ data })),
  post: <T>(path: string, body?: object, _config?: object): Promise<AxiosResponse<T>> =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }).then((data) => ({ data })),
  put: <T>(path: string, body?: object): Promise<AxiosResponse<T>> =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }).then((data) => ({ data })),
  delete: <T>(path: string): Promise<AxiosResponse<T>> =>
    request<T>(path, { method: "DELETE" }).then((data) => ({ data })),
};

export default legacyApi;
