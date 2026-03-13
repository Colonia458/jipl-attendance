import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CheckIn from "./pages/CheckIn";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import LiveDashboard from "./pages/LiveDashboard";
import PendingApproval from "./pages/PendingApproval";
import VerifyOtp from "./pages/VerifyOtp";
import SuperAdminApprovals from "./pages/SuperAdminApprovals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/event/:id/live" element={<LiveDashboard />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/super-admin/approvals" element={<SuperAdminApprovals />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
