import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OwnerRoute } from "./components/auth/OwnerRoute";
import { ClientRoute } from "./components/auth/ClientRoute";
import { OwnerLayout } from "./components/layout/OwnerLayout";
import { ClientLayout } from "./components/layout/ClientLayout";

// Pages
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OwnerLoginPage } from "./pages/OwnerLoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { OwnerDashboardPage } from "./pages/owner/OwnerDashboardPage";
import { ClientsPage } from "./pages/owner/ClientsPage";
import { SubscriptionsPage } from "./pages/owner/SubscriptionsPage";
import { BannerTemplatesPage } from "./pages/owner/BannerTemplatesPage";
import { SocialMonitorPage } from "./pages/owner/SocialMonitorPage";
import { OwnerSettingsPage } from "./pages/owner/OwnerSettingsPage";
import { ClientDashboardPage } from "./pages/client/ClientDashboardPage";
import { GeneratePage } from "./pages/client/GeneratePage";
import { BannersPage } from "./pages/client/BannersPage";
import { SchedulePage } from "./pages/client/SchedulePage";
import { ProfilePage } from "./pages/client/ProfilePage";
import { AutomationPage } from "./pages/client/AutomationPage";

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/owner-login" element={<OwnerLoginPage />} />
      <Route path="/owner/login" element={<OwnerLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Owner routes */}
      <Route
        path="/owner/dashboard"
        element={
          <OwnerRoute>
            <OwnerLayout>
              <OwnerDashboardPage />
            </OwnerLayout>
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/clients"
        element={
          <OwnerRoute>
            <OwnerLayout>
              <ClientsPage />
            </OwnerLayout>
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/subscriptions"
        element={
          <OwnerRoute>
            <OwnerLayout>
              <SubscriptionsPage />
            </OwnerLayout>
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/banner-templates"
        element={
          <OwnerRoute>
            <OwnerLayout>
              <BannerTemplatesPage />
            </OwnerLayout>
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/social-monitor"
        element={
          <OwnerRoute>
            <OwnerLayout>
              <SocialMonitorPage />
            </OwnerLayout>
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/settings"
        element={
          <OwnerRoute>
            <OwnerLayout>
              <OwnerSettingsPage />
            </OwnerLayout>
          </OwnerRoute>
        }
      />

      {/* Client routes */}
      <Route
        path="/client/dashboard"
        element={
          <ClientRoute>
            <ClientLayout>
              <ClientDashboardPage />
            </ClientLayout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/generate"
        element={
          <ClientRoute>
            <ClientLayout>
              <GeneratePage />
            </ClientLayout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/banners"
        element={
          <ClientRoute>
            <ClientLayout>
              <BannersPage />
            </ClientLayout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/schedule"
        element={
          <ClientRoute>
            <ClientLayout>
              <SchedulePage />
            </ClientLayout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/profile"
        element={
          <ClientRoute>
            <ClientLayout>
              <ProfilePage />
            </ClientLayout>
          </ClientRoute>
        }
      />
      <Route
        path="/client/automation"
        element={
          <ClientRoute>
            <ClientLayout>
              <AutomationPage />
            </ClientLayout>
          </ClientRoute>
        }
      />

      {/* Redirects */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? role === "owner"
              ? <Navigate to="/owner/dashboard" replace />
              : <Navigate to="/client/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
