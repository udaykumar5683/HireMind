"use client";

import React from "react";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Edit3, Cpu, Send, Server, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export type LoadingStage = "submitting" | "transferring" | "processing" | "finalizing" | "completed" | "error";

interface StageInfo {
  id: LoadingStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STAGES: StageInfo[] = [
  {
    id: "submitting",
    label: "Submitting your application...",
    description: "Validating candidate details and preparing application package",
    icon: Send,
  },
  {
    id: "transferring",
    label: "Transferring data to resume parser...",
    description: "Securely sending application data to AI processing engine",
    icon: Server,
  },
  {
    id: "processing",
    label: "Processing your profile with AI agents...",
    description: "Running automated agents (Skill verification, hidden depth discovery & ranking)",
    icon: Cpu,
  },
  {
    id: "finalizing",
    label: "Finalizing results for recruiters...",
    description: "Generating candidate profile and syncing recruiter dashboard",
    icon: CheckCircle2,
  },
];

interface ApplicationLoadingOverlayProps {
  currentStage: LoadingStage;
  currentStepMessage?: string;
  progressPercentage?: number;
  errorMessage?: string | null;
  onRetry?: () => void;
  onCloseError?: () => void;
}

export default function ApplicationLoadingOverlay({
  currentStage,
  currentStepMessage,
  progressPercentage = 0,
  errorMessage,
  onRetry,
  onCloseError,
}: ApplicationLoadingOverlayProps) {
  const getStageIndex = (stage: LoadingStage): number => {
    switch (stage) {
      case "submitting":
        return 0;
      case "transferring":
        return 1;
      case "processing":
        return 2;
      case "finalizing":
        return 3;
      case "completed":
        return 4;
      case "error":
        return -1;
      default:
        return 0;
    }
  };

  const activeIndex = getStageIndex(currentStage);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md select-none pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg"
      >
        <Card className="border-border/60 shadow-2xl bg-card/95 overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2 shadow-inner">
                {currentStage === "error" ? (
                  <AlertCircle className="w-8 h-8 text-destructive animate-pulse" />
                ) : currentStage === "completed" ? (
                  <Check className="w-8 h-8 text-green-500" />
                ) : (
                  <Cpu className="w-8 h-8 text-primary animate-pulse" />
                )}
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                {currentStage === "error"
                  ? "Submission Interrupted"
                  : currentStage === "completed"
                  ? "Application Processed!"
                  : "Application Processing"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentStage === "error"
                  ? "An issue occurred while processing your application. Your entered details have been saved."
                  : "Please wait while our AI agents analyze your profile and send results to recruiters."}
              </p>
            </div>

            {/* Error View */}
            {currentStage === "error" ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm leading-relaxed flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-1">Error Details:</span>
                    {errorMessage || "Unable to complete application processing. Please try again."}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
                  {onCloseError && (
                    <Button
                      variant="outline"
                      onClick={onCloseError}
                      className="w-full sm:w-auto"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit & Return to Form
                    </Button>
                  )}
                  {onRetry && (
                    <Button
                      onClick={onRetry}
                      className="w-full sm:w-auto shadow-lg shadow-primary/20"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry Submission
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Processing / Loading View */
              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Overall Progress</span>
                    <span className="text-primary font-bold">{Math.min(100, Math.max(5, progressPercentage))}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-primary rounded-full transition-all duration-300"
                      initial={{ width: "5%" }}
                      animate={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
                    />
                  </div>
                </div>

                {/* Stages List */}
                <div className="space-y-3">
                  {STAGES.map((stageItem, idx) => {
                    const isPassed = activeIndex > idx;
                    const isActive = activeIndex === idx;

                    return (
                      <div
                        key={stageItem.id}
                        className={`flex items-start gap-4 p-3 rounded-xl border transition-all duration-300 ${
                          isActive
                            ? "bg-primary/5 border-primary/40 shadow-sm"
                            : isPassed
                            ? "bg-muted/30 border-border/40 opacity-90"
                            : "bg-transparent border-transparent opacity-40"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-all ${
                            isPassed
                              ? "bg-green-500/20 text-green-500 border border-green-500/30"
                              : isActive
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isPassed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <stageItem.icon className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isActive
                                  ? "text-primary"
                                  : isPassed
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {stageItem.label}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {isActive && currentStepMessage
                              ? currentStepMessage
                              : stageItem.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg bg-muted/40 text-center text-xs text-muted-foreground border border-border/40">
                  ⚡ All page interactions are locked until processing completes. Do not close this browser window.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
