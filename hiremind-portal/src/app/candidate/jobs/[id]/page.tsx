"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowLeft,
  Briefcase,
  User,
  Mail,
  GitBranch,
  Linkedin,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type Job } from "@/types";
import ApplicationLoadingOverlay, { type LoadingStage } from "@/components/ApplicationLoadingOverlay";
import { launchExternalResumePortal } from "@/lib/portalLauncher";

const API_BASE_URL = (process.env.NEXT_PUBLIC_RESUME_API_URL || "http://localhost:5000").replace(/\/$/, "");

export default function JobDetail() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applied, setApplied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Loading Workflow States
  const [loadingStage, setLoadingStage] = useState<LoadingStage | null>(null);
  const [currentStepMessage, setCurrentStepMessage] = useState<string>("");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    summary: "",
  });
  const supabase = createClient();

  useEffect(() => {
    const fetchJob = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", params.id)
        .single();
      if (data) setJob(data);
    };

    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    fetchJob();
    fetchUser();
  }, [params.id, supabase]);

  const handleApply = () => {
    if (!user) {
      router.push("/login?role=Candidate");
      return;
    }
    setShowApplicationForm(true);
  };

  const normalizeUrl = (value: string) => {
    if (!value) return "";
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const buildProcessedUrls = () => {
    const sources = [
      { name: "GitHub", url: form.githubUrl },
      { name: "LinkedIn", url: form.linkedinUrl },
      { name: "Portfolio", url: form.portfolioUrl },
    ].filter((item) => item.url?.trim());

    return sources.map((item) => ({
      name: item.name,
      url: normalizeUrl(item.url),
      accessible: true,
      error: null,
      data: { source: "hiremind-portal-form" },
    }));
  };

  const pollPipelineStatus = async (): Promise<any> => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((res) => setTimeout(res, 1500));
      attempts++;

      try {
        const res = await fetch(`${API_BASE_URL}/pipeline-status`);
        if (!res.ok) continue;
        const statusData = await res.json();

        const prog = typeof statusData.progress === "number" ? statusData.progress : attempts * 6;
        const scaledProg = Math.min(90, Math.max(40, Math.round(prog)));
        setProgressPercentage(scaledProg);

        if (statusData.current_step) {
          setCurrentStepMessage(statusData.current_step);
        }

        if (statusData.status === "completed") {
          return statusData;
        }
        if (statusData.status === "failed") {
          throw new Error(statusData.error || "AI agent processing failed on backend engine.");
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("AI agent processing failed")) {
          throw e;
        }
        console.warn("Polling attempt warning:", e);
      }
    }

    return { status: "completed" };
  };

  const handleSubmitApplication = async () => {
    if (!user || !job) return;

    if (!form.name.trim() || !form.email.trim()) {
      alert("Please provide your full name and email before applying.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setLoadingError(null);

    // Stage 1: Submitting application
    setLoadingStage("submitting");
    setProgressPercentage(10);
    setCurrentStepMessage("Validating form inputs and packaging application details...");
    await new Promise((res) => setTimeout(res, 400));

    try {
      // Stage 2: Transferring data to resume parser portal
      setLoadingStage("transferring");
      setProgressPercentage(25);
      setCurrentStepMessage("Securely transferring candidate profile & link data to Vite resume parser backend...");

      const profile = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        summary: form.summary.trim(),
        links: {
          github: normalizeUrl(form.githubUrl),
          linkedin: normalizeUrl(form.linkedinUrl),
          portfolio: normalizeUrl(form.portfolioUrl),
          others: [],
        },
        skills: {
          technical: [],
          tools: [],
          soft: [],
          languages: [],
        },
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        total_experience_years: 0,
        user_submitted_data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          location: form.location.trim(),
          github_url: form.githubUrl.trim(),
          linkedin_url: form.linkedinUrl.trim(),
          portfolio_url: form.portfolioUrl.trim(),
          summary: form.summary.trim(),
          resume_file_name: resumeFile?.name || null,
        },
      };

      const processedUrls = buildProcessedUrls();
      const savePayload = { profile, processed_urls: processedUrls };

      const saveRes = await fetch(`${API_BASE_URL}/save-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Unable to save application profile to backend engine.");
      }

      const saveData = await saveRes.json();
      const profileFilepath = saveData.filepath;

      // Stage 3: Processing profile with AI agents
      setLoadingStage("processing");
      setProgressPercentage(40);
      setCurrentStepMessage("Triggering 8 AI agents (Skill verification, hidden depth discovery & ranking)...");

      const runRes = await fetch(`${API_BASE_URL}/run-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filepath: profileFilepath }),
      });

      if (!runRes.ok) {
        const errorData = await runRes.json().catch(() => ({}));
        throw new Error(errorData.error || "AI agent pipeline execution could not be started.");
      }

      // Poll pipeline until completed
      await pollPipelineStatus();

      // Stage 4: Finalizing results for recruiters
      setLoadingStage("finalizing");
      setProgressPercentage(95);
      setCurrentStepMessage("Finalizing candidate profile and syncing recruiter portal...");

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "hiremind-application-data",
          JSON.stringify({
            jobId: job.id,
            userId: user.id,
            profile,
            processedUrls,
            filepath: profileFilepath,
            submittedAt: new Date().toISOString(),
          })
        );
      }

      const applicationInsert = {
        candidate_id: user.id,
        job_id: job.id,
        status: "Applied",
        applied_at: new Date().toISOString(),
      };

      const { error: applicationError } = await supabase.from("applications").insert(applicationInsert);
      if (applicationError) {
        console.error("Failed to save application record in Supabase:", applicationError);
      }

      // Stage: Completed
      setLoadingStage("completed");
      setProgressPercentage(100);
      setCurrentStepMessage("Application submitted and AI profile generated successfully!");

      await new Promise((res) => setTimeout(res, 1200));

      setApplied(true);
      setShowApplicationForm(false);
      setLoadingStage(null);
      setResumeFile(null);
      setForm({
        name: "",
        email: "",
        phone: "",
        location: "",
        githubUrl: "",
        linkedinUrl: "",
        portfolioUrl: "",
        summary: "",
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      const msg = error instanceof Error ? error.message : "Unable to complete application processing.";
      setLoadingError(msg);
      setLoadingStage("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!job) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const isFormLocked = isSubmitting || loadingStage !== null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Candidate" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <header className="h-16 border-b border-border px-6 flex items-center">
          <Link
            href="/candidate/jobs"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Link>
        </header>

        <main className="p-6 max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{job.title}</CardTitle>
              <div className="flex flex-wrap gap-6 mt-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{job.company}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {job.salary}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {job.employment_type}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{job.description}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Responsibilities</h3>
                <p className="text-muted-foreground">{job.responsibilities}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Preferred Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.preferred_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-accent text-accent-foreground rounded-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Eligibility</h3>
                <p className="text-muted-foreground">{job.eligibility}</p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">Benefits</h3>
                <p className="text-muted-foreground">{job.benefits}</p>
              </section>

              <div className="pt-4 border-t border-border">
                {applied ? (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="w-5 h-5" />
                    Application submitted successfully. Our agents have processed your profile for recruiters.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="w-full sm:w-auto" size="lg" onClick={handleApply} disabled={isLoading || isFormLocked}>
                      {isLoading ? "Applying..." : "Apply Now"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto border-[#6366F1] text-[#6366F1] hover:bg-[#6366F1]/10"
                      size="lg"
                      onClick={() => launchExternalResumePortal({ jobId: job.id, userId: user?.id })}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Apply via External Portal (localhost:5173)
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {showApplicationForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Briefcase className="w-5 h-5" />
                  Complete Your Application
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <fieldset disabled={isFormLocked} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <User className="w-4 h-4" /> Full Name
                      </label>
                      <input
                        value={form.name}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Mail className="w-4 h-4" /> Email Address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Phone</label>
                      <input
                        value={form.phone}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Location</label>
                      <input
                        value={form.location}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="City, State / Remote"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <GitBranch className="w-4 h-4" /> GitHub URL
                      </label>
                      <input
                        value={form.githubUrl}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, githubUrl: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="https://github.com/yourname"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Linkedin className="w-4 h-4" /> LinkedIn URL
                      </label>
                      <input
                        value={form.linkedinUrl}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, linkedinUrl: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="https://linkedin.com/in/yourname"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Globe className="w-4 h-4" /> Portfolio URL
                      </label>
                      <input
                        value={form.portfolioUrl}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, portfolioUrl: event.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="https://yourportfolio.dev"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <FileText className="w-4 h-4" /> Resume Upload (optional)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        disabled={isFormLocked}
                        onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {resumeFile && <p className="text-sm text-muted-foreground">Selected file: {resumeFile.name}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-foreground">Short Summary</label>
                      <textarea
                        value={form.summary}
                        disabled={isFormLocked}
                        onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Tell us a bit about yourself and your experience"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowApplicationForm(false)}
                      type="button"
                      disabled={isFormLocked}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitApplication} disabled={isFormLocked} type="button">
                      {isFormLocked ? "Processing..." : "Apply"}
                    </Button>
                  </div>
                </fieldset>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Loading Overlay */}
      {loadingStage !== null && (
        <ApplicationLoadingOverlay
          currentStage={loadingStage}
          currentStepMessage={currentStepMessage}
          progressPercentage={progressPercentage}
          errorMessage={loadingError}
          onRetry={handleSubmitApplication}
          onCloseError={() => setLoadingStage(null)}
        />
      )}
    </div>
  );
}

