import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "./components/layout/PublicLayout";

import Positions from "./pages/dashboard/Positions";
import Documentation from "./pages/dashboard/Documentation";
import Home from "./pages/Home";
import Product from "./pages/Product";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import Contact from "./pages/Contact";
import Demo from "./pages/Demo";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/admin/AdminLogin";
import Onboarding from "./pages/Onboarding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import Staff from "./pages/dashboard/Staff";
import Groups from "./pages/dashboard/Groups";
import GroupDetail from "./pages/dashboard/GroupDetail";
import Resources from "./pages/dashboard/Resources";
import ResourceDetail from "./pages/dashboard/ResourceDetail";
import Integrations from "./pages/dashboard/Integrations";
import AccessMatrix from "./pages/dashboard/AccessMatrix";
import Search from "./pages/dashboard/Search";
import Audit from "./pages/dashboard/Audit";
import DashboardSettings from "./pages/dashboard/Settings";
import Profile from "./pages/dashboard/Profile";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOrgs from "./pages/admin/AdminOrgs";
import AdminOrgDetail from "./pages/admin/AdminOrgDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminAudit from "./pages/admin/AdminAudit";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/product" element={<PublicLayout><Product /></PublicLayout>} />
          <Route path="/features" element={<PublicLayout><Features /></PublicLayout>} />
          <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
          <Route path="/docs" element={<PublicLayout><Docs /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/demo" element={<PublicLayout><Demo /></PublicLayout>} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Organization Portal (/app) */}
          <Route path="/app" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Overview />} />
            <Route path="staff" element={<Staff />} />
            <Route path="groups" element={<Groups />} />
            <Route path="groups/:id" element={<GroupDetail />} />
            <Route path="resources" element={<Resources />} />
            <Route path="resources/:id" element={<ResourceDetail />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="access-matrix" element={<AccessMatrix />} />
            <Route path="search" element={<Search />} />
            <Route path="audit" element={<Audit />} />
            <Route path="settings" element={<DashboardSettings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="positions" element={<Positions />} />
            <Route path="docs" element={<Documentation />} />
          </Route>

          {/* Super Admin Console (/admin) */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminOrgs />} />
            <Route path="orgs" element={<AdminOrgs />} />
            <Route path="orgs/:orgId" element={<AdminOrgDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="integrations" element={<AdminIntegrations />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>

          {/* Error Pages */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
