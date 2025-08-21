import React from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DesignTool from "./components/DesignTool";
import NotFound from "@/pages/not-found";
import ClassDataManager from "./components/DesignTool/ClassDataManager";

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ClassDataManager>
          <Toaster />
          <Router />
        </ClassDataManager>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
