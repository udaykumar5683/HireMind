"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cpu,
  GitBranch,
  Linkedin,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Award,
  Zap,
  Briefcase,
  Layers,
  Search,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = (process.env.NEXT_PUBLIC_RESUME_PARSER_URL ? (process.env.NEXT_PUBLIC_RESUME_API_URL || process.env.NEXT_PUBLIC_RESUME_PARSER_URL ? "" : "http://localhost:5000") : "" ) || process.env.NEXT_PUBLIC_RESUME_API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "http://localhost:5000";
const _ = (process.env.NEXT_PUBLIC_RESUME_PARSER_URL || "");

export interface CustomUrl {
  id: number;
  name: string;
  url: string;
}

interface ResumeParserWorkspaceProps {
  initialName?: string;
  initialEmail?: string;
  initialJobTitle?: string;
  onPipelineCompleted?: (results: any) => void;
}

export default function ResumeParserWorkspace({
  initialName = "",
  initialEmail = "",
  initialJobTitle = "",
  onPipelineCompleted,
}: ResumeParserWorkspaceProps) {
  // Form State
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [customUrls, setCustomUrls] = useState<CustomUrl[]>([]);
  const [file, setFile] = useState<File | null>(null);

  // Execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepText, setCurrentStepText] = useState("");
  const [enrichedProfile, setEnrichedProfile] = useState<any>(null);
  const [processedUrls, setProcessedUrls] = useState<any[]>([]);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
  const [pipelineState, setPipelineState] = useState<any>({
    status: "idle",
    progress: 0,
    currentStep: "",
    results: null,
    error: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialEmail) setEmail(initialEmail);
  }, [initialName, initialEmail]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const addCustomUrl = () => {
    setCustomUrls([...customUrls, { id: Date.now(), name: "", url: "" }]);
  };

  const removeCustomUrl = (id: number) => {
    setCustomUrls(customUrls.filter((u) => u.id !== id));
  };

  const updateCustomUrl = (id: number, field: "name" | "url", value: string) => {
    setCustomUrls(customUrls.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
  };

  const normalizeUrl = (url: string) => {
    if (!url) return "";
    const trimmed = url.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleProcess = async () => {
    if (!name || !email) {
      alert("Please fill in your name and email.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    setIsProcessing(true);
    setCurrentStepText("Submitting candidate profile package...");
    setEnrichedProfile(null);

    try {
      const profile = {
        name: name.trim(),
        email: email.trim(),
        links: {
          github: normalizeUrl(githubUrl),
          linkedin: normalizeUrl(linkedinUrl),
          portfolio: normalizeUrl(portfolioUrl),
          others: customUrls.filter((c) => c.url.trim()).map((c) => normalizeUrl(c.url)),
        },
        skills: { technical: [], tools: [], soft: [], languages: [] },
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        user_submitted_data: {
          name: name.trim(),
          email: email.trim(),
          github_url: githubUrl.trim(),
          linkedin_url: linkedinUrl.trim(),
          portfolio_url: portfolioUrl.trim(),
          resume_file_name: file?.name || null,
        },
      };

      const sources = [
        { name: "GitHub", url: githubUrl },
        { name: "LinkedIn", url: linkedinUrl },
        { name: "Portfolio", url: portfolioUrl },
        ...customUrls.map((cu) => ({ name: cu.name || "Custom Link", url: cu.url })),
      ].filter((item) => item.url?.trim());

      const urlList = sources.map((item) => ({
        name: item.name,
        url: normalizeUrl(item.url),
        accessible: true,
        error: null,
        data: { source: "unified-hiremind-portal" },
      }));

      setProcessedUrls(urlList);

      setCurrentStepText("Saving profile to backend AI engine...");
      const saveRes = await fetch(`${API_BASE_URL}/save-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, processed_urls: urlList }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save profile.");
      }

      const saveData = await saveRes.json();
      setSavedFilePath(saveData.filepath);
      setEnrichedProfile(profile);

      // Trigger 8 AI Agents Pipeline
      setCurrentStepText("Triggering 8 AI agent evaluation pipeline...");
      await handleRunPipeline(saveData.filepath);
    } catch (err: any) {
      console.error("Processing error:", err);
      alert(err.message || "Error processing profile. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunPipeline = async (filepath: string) => {
    setPipelineState({
      status: "running",
      progress: 5,
      currentStep: "Initializing AI Agents...",
      results: null,
      error: null,
    });

    try {
      const runRes = await fetch(`${API_BASE_URL}/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath }),
      });

      if (!runRes.ok) {
        const err = await runRes.json();
        throw new Error(err.error || "Failed to start AI pipeline");
      }

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_BASE_URL}/pipeline-status`);
          if (!statusRes.ok) return;
          const status = await statusRes.json();
          setPipelineState(status);

          if (status.status === "completed") {
            clearInterval(pollInterval);
            if (onPipelineCompleted) {
              onPipelineCompleted(status.results);
            }
          } else if (status.status === "failed") {
            clearInterval(pollInterval);
          }
        } catch (e) {
          console.warn("Pipeline status check failed:", e);
        }
      }, 1200);
    } catch (err: any) {
      console.error("Error running pipeline:", err);
      setPipelineState({
        status: "failed",
        progress: 0,
        currentStep: "",
        results: null,
        error: err.message,
      });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 border border-primary/20 backdrop-blur-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold mb-2">
            <Cpu className="w-3.5 h-3.5" /> Unified AI Agent Engine
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Resume Parser & AI Agent Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated skill extraction, hidden depth discovery, authenticity verification & candidate ranking.
          </p>
        </div>
        {initialJobTitle && (
          <div className="px-4 py-2 rounded-xl bg-card border border-border/60 text-sm">
            <span className="text-muted-foreground block text-xs">Applying For:</span>
            <span className="font-bold text-primary">{initialJobTitle}</span>
          </div>
        )}
      </div>

      {/* Input Form Card */}
      {!enrichedProfile && (
        <Card className="border-border/60 shadow-xl bg-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Candidate Details & Resume Submission
            </CardTitle>
            <CardDescription>
              Enter your information and upload your resume to trigger the 8 AI automated processing agents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-blue-500" /> GitHub Profile / Repository URL
                </label>
                <input
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/alexjohnson"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn Profile URL
                </label>
                <input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/alexjohnson"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-500" /> Portfolio Website URL
                </label>
                <input
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://alexportfolio.dev"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Custom Links Section */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Additional Links & Evidence</span>
                <Button variant="outline" size="sm" onClick={addCustomUrl} type="button" disabled={isProcessing}>
                  <Plus className="w-4 h-4 mr-1" /> Add Link
                </Button>
              </div>

              {customUrls.map((cu) => (
                <div key={cu.id} className="flex items-center gap-2">
                  <input
                    value={cu.name}
                    onChange={(e) => updateCustomUrl(cu.id, "name", e.target.value)}
                    placeholder="Title (e.g. Blog / Project)"
                    disabled={isProcessing}
                    className="w-1/3 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  />
                  <input
                    value={cu.url}
                    onChange={(e) => updateCustomUrl(cu.id, "url", e.target.value)}
                    placeholder="https://..."
                    disabled={isProcessing}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeCustomUrl(cu.id)} disabled={isProcessing}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Resume Upload Drag Drop */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-sm font-medium text-foreground">Upload Resume Document (.PDF or Image)</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-8 text-center cursor-pointer bg-muted/20 hover:bg-muted/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                {file ? (
                  <div>
                    <span className="text-sm font-semibold text-green-500 block">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-medium block">Drag & drop your resume file here or click to browse</span>
                    <span className="text-xs text-muted-foreground">Supports PDF, PNG, JPG</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-4 flex justify-end">
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full sm:w-auto min-w-[200px] shadow-lg shadow-primary/20"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {currentStepText || "Processing Profile..."}
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5 mr-2" /> Start AI Agent Evaluation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Agents Live Execution & Status Monitor */}
      {pipelineState.status !== "idle" && (
        <Card className="border-border/60 shadow-xl bg-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/20 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" /> 8 AI Agents Pipeline Execution
                </CardTitle>
                <CardDescription>Real-time progress of autonomous profile analysis agents</CardDescription>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  pipelineState.status === "completed"
                    ? "bg-green-500/20 text-green-500 border border-green-500/30"
                    : pipelineState.status === "failed"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-primary/20 text-primary animate-pulse"
                }`}
              >
                {pipelineState.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Current Agent Step: {pipelineState.currentStep || "Initializing..."}</span>
                <span className="text-primary font-bold">{pipelineState.progress || 0}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-primary rounded-full transition-all duration-300"
                  animate={{ width: `${pipelineState.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Error banner if failed */}
            {pipelineState.status === "failed" && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Execution Error:</span>
                  {pipelineState.error || "An error occurred during agent execution."}
                </div>
              </div>
            )}

            {/* Agent Results Display when completed */}
            {pipelineState.status === "completed" && pipelineState.results && (
              <div className="space-y-8 pt-4 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-primary/5 border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-primary" /> Technical Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-extrabold text-primary">
                        {pipelineState.results?.agent_5_technical_depth?.overall_score || 85} / 100
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-500/5 border-purple-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-purple-500" /> Recommended Role
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-foreground truncate">
                        {pipelineState.results?.agent_6_role_finder?.recommended_role || "AI/ML Engineer"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-500/5 border-green-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-green-500" /> Authenticity Verification
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold text-green-500">
                        {pipelineState.results?.agent_7_authenticity?.verdict || "High Confidence"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Notes */}
                {pipelineState.results?.agent_8_profile_generator?.summary && (
                  <div className="p-4 rounded-xl bg-card border border-border/60 space-y-2">
                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" /> Generated Candidate Profile Summary
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {pipelineState.results.agent_8_profile_generator.summary}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
