import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ArgoCdApplications from "./pages/ArgoCdApplications";
import SecureShare from "./pages/SecureShare";
import SecureShareAccess from "./pages/SecureShareAccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/argocd" element={<ArgoCdApplications />} />
        <Route path="/secure-share" element={<SecureShare />} />
        {/* One route for both forms keeps the page mounted when the token is removed from the URL */}
        <Route path="/share/:token?" element={<SecureShareAccess />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
