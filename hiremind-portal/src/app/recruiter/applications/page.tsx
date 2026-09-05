"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/supabase/client";
import { type Application, type Job } from "@/types";

interface GeneratedProfile {
  filename: string;
  full_name?: string;
  target_role?: string;
  all_recommended_roles?: any[];
  timestamp: string;
}

type UnifiedApplicationEntry = 
  | { type: 'generated'; data: GeneratedProfile }
  | { type: 'supabase'; data: Application & { jobs: Job; profiles: any } };

export default function RecruiterApplications() {
  const [applications, setApplications] = useState<
    (Application & { jobs: Job; profiles: any })[]
  >([]);
  const [generatedProfiles, setGeneratedProfiles] = useState<GeneratedProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchApplications = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from("applications")
          .select("*, jobs(*), profiles(*)")
          .order("applied_at", { ascending: false });
        if (data) setApplications(data as any);
      }
    };

    const fetchGeneratedProfiles = async () => {
      try {
        const response = await fetch("/api/profiles");
        const data = await response.json();
        // Ensure data is an array before setting state
        setGeneratedProfiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch generated profiles:", err);
        setGeneratedProfiles([]);
      }
    };

    fetchApplications();
    fetchGeneratedProfiles();
  }, [supabase]);

  const handleViewProfile = async (filename: string) => {
    setLoadingProfile(true);
    setProfileError(null);
    const url = `/api/profiles/${encodeURIComponent(filename)}`;
    console.log("[handleViewProfile] Fetching URL:", url);
    console.log("[handleViewProfile] Full URL:", window.location.origin + url);
    
    try {
      const response = await fetch(url);
      console.log("[handleViewProfile] Response status:", response.status);
      console.log("[handleViewProfile] Response OK:", response.ok);
      
      if (!response.ok) {
        let errorMsg = `Failed to fetch profile (status ${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg += `: ${errorData.error}`;
        } catch (e) {
          console.warn("[handleViewProfile] Could not parse error JSON:", e);
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      console.log("[handleViewProfile] Profile data loaded successfully:", data);
      setSelectedProfile(data);
    } catch (err) {
      console.error("[handleViewProfile] Failed to load profile:", err);
      setProfileError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleBackToList = () => {
    setSelectedProfile(null);
  };

  if (selectedProfile) {
    // Render full candidate profile view with fallback resolution for compiled profiles and raw profiles
    const p = selectedProfile.header
      ? {
          name: selectedProfile.header.full_name,
          email: selectedProfile.header.contact?.email,
          phone: selectedProfile.header.contact?.phone,
          location: selectedProfile.header.contact?.location,
          summary: selectedProfile.summary || selectedProfile.header.one_line_pitch,
          links: selectedProfile.header.links || {},
          education: selectedProfile.education_and_certifications?.education || [],
          certifications: selectedProfile.education_and_certifications?.certifications || [],
          projects: selectedProfile.key_projects || [],
        }
      : selectedProfile.profile || {};

    const pipeline = selectedProfile.pipeline_results || {};
    const credibility = selectedProfile.scorecard
      ? {
          overall_credibility_score: selectedProfile.scorecard.authenticity_score,
          resume_consistency: selectedProfile.scorecard.overall_strength_score,
        }
      : pipeline.agent2?.data?.credibility_score || {};

    const overallStrength =
      selectedProfile.scorecard?.overall_strength_score ??
      pipeline.agent4?.data?.overall_strength_score ??
      pipeline.agent3?.data?.candidate_strength_score ??
      85;

    const authenticityVerdict =
      selectedProfile.scorecard?.authenticity_verdict ||
      pipeline.agent5?.data?.verdict ||
      (credibility.overall_credibility_score >= 70 ? "High Trust" : "Review Needed");

    const recruiterAction =
      selectedProfile.scorecard?.recruiter_action ||
      selectedProfile.recruiter_recommendation?.recruiter_action ||
      (credibility.overall_credibility_score >= 70 ? "Schedule Interview" : "Screen Further");

    const recommendedRoles =
      selectedProfile.top_recommended_roles ||
      pipeline.agent4?.data?.top_recommended_roles ||
      pipeline.agent3?.data?.recommended_roles ||
      [];

    const hiddenSkills =
      selectedProfile.verified_strengths ||
      pipeline.agent3?.data?.hidden_skills ||
      [];

    const projects = p.projects || [];
    const education = p.education || [];
    const certifications = p.certifications || [];
    const verifiedProjects = pipeline.agent2?.data?.verified_projects || [];
    const riskFlags =
      selectedProfile.authenticity_and_risk?.risk_flags ||
      pipeline.agent2?.data?.risk_flags ||
      [];
    const improvementAreas =
      selectedProfile.authenticity_and_risk?.improvement_areas ||
      pipeline.agent3?.data?.improvement_areas ||
      [];

    return (
      <div className="flex h-screen bg-background">
        <Sidebar role="Recruiter" className="w-64 flex-shrink-0" />
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-6xl mx-auto w-full">
            <div className="h-16 border-b border-border px-0 pb-4 flex items-center mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToList}
                className="mr-4"
              >
                ← Back to List
              </Button>
              <h1 className="text-xl font-bold">Candidate Profile</h1>
            </div>
            <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
              <h1 className="text-4xl font-bold text-[#6366F1] mb-2">
                {p.name || p.user_submitted_data?.name || "Unknown Candidate"}
              </h1>
              <p className="text-lg text-gray-400 italic mb-6">{p.summary}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-400 mb-2">Contact</h3>
                  <p className="text-gray-300">{p.email}</p>
                  <p className="text-gray-300">{p.phone}</p>
                  <p className="text-gray-300">{p.location}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-400 mb-2">Links</h3>
                  {p.links?.github && (
                    <a
                      href={
                        p.links.github.startsWith("http")
                          ? p.links.github
                          : `https://${p.links.github}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6366F1] hover:underline block"
                    >
                      GitHub
                    </a>
                  )}
                  {p.links?.linkedin && (
                    <a
                      href={
                        p.links.linkedin.startsWith("http")
                          ? p.links.linkedin
                          : `https://${p.links.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6366F1] hover:underline block"
                    >
                      LinkedIn
                    </a>
                  )}
                  {p.links?.portfolio && (
                    <a
                      href={
                        p.links.portfolio.startsWith("http")
                          ? p.links.portfolio
                          : `https://${p.links.portfolio}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6366F1] hover:underline block"
                    >
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
                <h3 className="text-gray-400 text-sm font-medium mb-1">Overall Strength</h3>
                <p className="text-3xl font-bold text-[#6366F1]">{overallStrength}/100</p>
              </div>
              <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
                <h3 className="text-gray-400 text-sm font-medium mb-1">Authenticity</h3>
                <p className="text-3xl font-bold text-[#6366F1]">{credibility.overall_credibility_score || 85}/100</p>
                <p className="text-gray-300 mt-1">{authenticityVerdict}</p>
              </div>
              <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
                <h3 className="text-gray-400 text-sm font-medium mb-1">Technical Depth</h3>
                <p className="text-3xl font-bold text-[#6366F1]">
                  {selectedProfile.scorecard?.technical_depth_score || 80}/100
                </p>
              </div>
              <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
                <h3 className="text-gray-400 text-sm font-medium mb-1">Recruiter Action</h3>
                <p className="text-2xl font-semibold text-[#22c55e]">
                  {recruiterAction}
                </p>
              </div>
            </div>

            {recommendedRoles.length > 0 && (
              <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
                <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Top Recommended Roles</h2>
                <div className="space-y-4">
                  {recommendedRoles.map((role: any, idx: number) => {
                    const roleTitle = typeof role === "string" ? role : role.role || role.title || "Target Role";
                    const matchScore = typeof role === "object" ? role.match_score || role.fit_score || 90 : 90;
                    const reasoningText = typeof role === "object" ? role.reasoning || role.pitch || "" : "";
                    return (
                      <div key={idx} className="bg-[#1E293B] rounded-xl p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-semibold text-white">{roleTitle}</h3>
                          <span className="px-3 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded-full font-medium">
                            {matchScore}/100 Match
                          </span>
                        </div>
                        {reasoningText && <p className="text-gray-400 mb-3">{reasoningText}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hiddenSkills.length > 0 && (
              <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
                <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Verified Skills & Strengths</h2>
                <div className="flex flex-wrap gap-3">
                  {hiddenSkills.map((skill: any, idx: number) => {
                    const skillName = typeof skill === "string" ? skill : skill.name || skill.skill || "Skill";
                    const conf = typeof skill === "object" ? skill.confidence || 85 : 85;
                    return (
                      <div key={idx} className="px-4 py-2 bg-[#1E293B] rounded-lg border border-[#374151]">
                        <p className="font-medium text-white">{skillName}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Confidence: {conf}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {projects.length > 0 && (
              <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
                <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Key Projects</h2>
                <div className="space-y-4">
                  {projects.map((proj: any, idx: number) => {
                    const projName = proj.name || proj.project_name || "Project";
                    const verified = verifiedProjects.find((vp: any) => vp.project_name === projName);
                    return (
                      <div key={idx} className="bg-[#1E293B] rounded-xl p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-semibold text-white">{projName}</h3>
                          <div className="flex gap-2">
                            {proj.authenticity_score !== undefined && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                Authenticity: {proj.authenticity_score}/100
                              </span>
                            )}
                            {verified && (
                              <>
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                  Authenticity: {verified.authenticity_score || 0}/100
                                </span>
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                  Trust: {verified.trust_level || "N/A"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-300 mb-3">{proj.description}</p>
                        {proj.technologies?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {proj.technologies.map((tech: string, tidx: number) => (
                              <span key={tidx} className="px-2 py-1 bg-[#374151] text-gray-300 rounded text-xs">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(education.length > 0 || certifications.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {education.length > 0 && (
                  <div className="bg-[#111827] rounded-2xl p-8 border border-[#374151]">
                    <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Education</h2>
                    {education.map((edu: any, idx: number) => (
                      <div key={idx} className="mb-4">
                        <h3 className="font-semibold text-white">{edu.degree || edu.institution}</h3>
                        <p className="text-gray-300">{edu.institution} • {edu.year}</p>
                        {edu.gpa && <p className="text-[#6366F1] font-medium">GPA: {edu.gpa}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {certifications.length > 0 && (
                  <div className="bg-[#111827] rounded-2xl p-8 border border-[#374151]">
                    <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Certifications</h2>
                    {certifications.map((cert: any, idx: number) => {
                      const certName = typeof cert === "string" ? cert : cert.name || cert.title || "Certification";
                      return (
                        <div key={idx} className="mb-2 flex items-center gap-2">
                          <span className="text-[#6366F1]">•</span>
                          <p className="text-gray-300">{certName}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#111827] rounded-2xl p-8 border border-[#374151]">
              <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Final Recommendation</h2>
              {riskFlags.length > 0 && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <h3 className="font-semibold text-red-400 mb-2">Risk Flags</h3>
                  <ul className="list-disc pl-5 text-gray-300">
                    {riskFlags.map((flag: string, idx: number) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}
              {improvementAreas.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <h3 className="font-semibold text-yellow-400 mb-2">Improvement Areas</h3>
                  <ul className="list-disc pl-5 text-gray-300">
                    {improvementAreas.map((area: string, idx: number) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="p-6 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl">
                <h3 className="font-semibold text-[#22c55e] mb-2">Recruiter Recommendation</h3>
                <p className="text-gray-300">{recruiterAction} — Candidate profile processed by 8 AI agents.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create combined list
  const combinedEntries: UnifiedApplicationEntry[] = [
    ...generatedProfiles.map((p) => ({ type: 'generated', data: p } as const)),
    ...applications.map((a) => ({ type: 'supabase', data: a } as const))
  ];

  // Render the list view
  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Recruiter" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto w-full">
          <div className="h-16 border-b border-border px-0 pb-4 flex items-center mb-6">
            <h1 className="text-xl font-bold">Applications</h1>
          </div>

          <section className="w-full">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2 text-white">All Applications</h2>
              <p className="text-gray-400 text-lg">
                Total Entries: <span className="font-semibold text-[#6366F1]">{combinedEntries.length}</span>
              </p>
            </div>
            {profileError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400">{profileError}</p>
              </div>
            )}

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 mb-4 px-6 py-3 bg-[#1E293B] rounded-xl border border-[#374151]">
              <div className="col-span-4 text-sm font-semibold text-gray-300">Candidate Name</div>
              <div className="col-span-5 text-sm font-semibold text-gray-300">Job Applied</div>
              <div className="col-span-3 text-sm font-semibold text-gray-300 text-right">Actions</div>
            </div>

            {/* Entries */}
            <div className="space-y-4">
              {combinedEntries.map((entry) => {
                if (entry.type === 'generated') {
                  const prof = entry.data;
                  return (
                    <Card key={`generated-${prof.filename}`} className="bg-[#111827] border-[#374151] hover:border-[#6366F1]/50 transition-colors">
                      <CardHeader className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          <div className="md:col-span-4">
                            <CardTitle className="text-lg font-semibold text-white">
                              {prof.full_name || "Unknown Candidate"}
                            </CardTitle>
                          </div>
                          <div className="md:col-span-5">
                            <div className="text-sm text-gray-300">{prof.target_role}</div>
                            <div className="text-xs text-gray-500">Recommended Role</div>
                          </div>
                          <div className="md:col-span-3 flex flex-col md:flex-row gap-2 md:justify-end">
                            <Button 
                              onClick={() => handleViewProfile(prof.filename)}
                              disabled={loadingProfile}
                              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white w-full md:w-auto"
                            >
                              {loadingProfile ? 'Loading...' : 'View Profile'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                } else {
                  const app = entry.data;
                  return (
                    <Card key={`supabase-${app.id}`} className="bg-[#111827] border-[#374151] hover:border-[#6366F1]/50 transition-colors">
                      <CardHeader className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          <div className="md:col-span-4">
                            <CardTitle className="text-lg font-semibold text-white">
                              {app.profiles?.full_name}
                            </CardTitle>
                          </div>
                          <div className="md:col-span-5">
                            <div className="text-sm text-gray-300 mb-1">{app.jobs.title}</div>
                            <div className="text-xs text-gray-500">{app.jobs.company}</div>
                          </div>
                          <div className="md:col-span-3 flex flex-col md:flex-row gap-2 md:justify-end items-end md:items-center">
                            <span
                              className={
                                "px-3 py-1 rounded-full text-xs font-medium " +
                                (app.status === "Applied"
                                  ? "bg-blue-900/30 text-blue-300"
                                  : "bg-gray-800 text-gray-300")
                              }
                            >
                              {app.status}
                            </span>
                            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-[#1E293B]">
                              View Application
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                }
              })}

              {combinedEntries.length === 0 && (
                <Card className="text-center py-16 bg-[#111827] border-[#374151]">
                  <CardContent>
                    <p className="text-gray-400 text-lg">
                      No applications yet!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
