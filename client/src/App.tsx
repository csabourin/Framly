import React from 'react';
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ColorModeProvider } from "./contexts/ColorModeContext";
import DesignTool from "./components/DesignTool";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DesignTool} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ColorModeProvider>
      <TooltipProvider>
        <Toaster />
        <PWAInstallPrompt />
        <Router />
      </TooltipProvider>
    </ColorModeProvider>
  );
}

export default App;
