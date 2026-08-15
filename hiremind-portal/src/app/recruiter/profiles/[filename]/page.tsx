'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const filename = encodeURIComponent(params.filename as string);
        const response = await fetch(`/api/profiles/${filename}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.filename) fetchProfile();
  }, [params.filename]);

  if (loading) return <div className="p-8 text-center text-gray-300">Loading profile...</div>;
  if (error) return <div className="p-8 text-center text-red-400">{error}</div>;
  if (!profile) return <div className="p-8 text-center text-gray-300">Profile not found</div>;

  const p = profile.profile || {};
  const pipeline = profile.pipeline_results || {};
  const credibility = pipeline.agent2?.data?.credibility_score || {};
  const recommendedRoles = pipeline.agent3?.data?.recommended_roles || [];
  const hiddenSkills = pipeline.agent3?.data?.hidden_skills || [];
  const projects = p.projects || [];
  const education = p.education || [];
  const certifications = p.certifications || [];
  const verifiedProjects = pipeline.agent2?.data?.verified_projects || [];

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <button 
          onClick={() => router.back()} 
          className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111827] border border-[#374151] text-gray-300 hover:border-[#6366F1] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
          <h1 className="text-4xl font-bold text-[#6366F1] mb-2">
            {p.name || p.user_submitted_data?.name || 'Unknown Candidate'}
          </h1>
          <h2 className="text-xl text-gray-300 mb-4">Candidate Profile</h2>
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
                <a href={`https://${p.links.github}`} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline block">GitHub</a>
              )}
              {p.links?.linkedin && (
                <a href={`https://${p.links.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline block">LinkedIn</a>
              )}
              {p.links?.portfolio && (
                <a href={`https://${p.links.portfolio}`} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline block">Portfolio</a>
              )}
            </div>
          </div>
        </div>

        {/* Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Overall Strength</h3>
            <p className="text-3xl font-bold text-[#6366F1]">{pipeline.agent3?.data?.candidate_strength_score || 0}/100</p>
          </div>
          <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Authenticity</h3>
            <p className="text-3xl font-bold text-[#6366F1]">{credibility.overall_credibility_score || 0}/100</p>
            <p className="text-gray-300 mt-1">{credibility.overall_credibility_score >= 70 ? 'High Trust' : 'Review Needed'}</p>
          </div>
          <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Resume Consistency</h3>
            <p className="text-3xl font-bold text-[#6366F1]">{credibility.resume_consistency || 0}/100</p>
          </div>
          <div className="bg-[#111827] rounded-xl p-6 border border-[#374151]">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Recruiter Action</h3>
            <p className="text-2xl font-semibold text-[#22c55e]">
              {credibility.overall_credibility_score >= 70 ? 'Schedule Interview' : 'Screen Further'}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
          <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Professional Summary</h2>
          <p className="text-gray-300 leading-relaxed">{p.summary}</p>
        </div>

        {/* Recommended Roles */}
        {recommendedRoles.length > 0 && (
          <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
            <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Top Recommended Roles</h2>
            <div className="space-y-4">
              {recommendedRoles.map((role: any, idx: number) => (
                <div key={idx} className="bg-[#1E293B] rounded-xl p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-white">{role.role}</h3>
                    <span className="px-3 py-1 bg-[#6366F1]/20 text-[#6366F1] rounded-full font-medium">{role.match_score}/100 Match</span>
                  </div>
                  <p className="text-gray-400 mb-3">{role.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden Skills */}
        {hiddenSkills.length > 0 && (
          <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
            <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Hidden Skills & Strengths</h2>
            <div className="flex flex-wrap gap-3">
              {hiddenSkills.map((skill: any, idx: number) => (
                <div key={idx} className="px-4 py-2 bg-[#1E293B] rounded-lg border border-[#374151]">
                  <p className="font-medium text-white">{skill.skill}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Confidence: {skill.confidence}% • Evidence: {skill.evidence?.length || 0} sources
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Projects */}
        {projects.length > 0 && (
          <div className="bg-[#111827] rounded-2xl p-8 mb-8 border border-[#374151]">
            <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Key Projects</h2>
            <div className="space-y-4">
              {projects.map((proj: any, idx: number) => {
                const verified = verifiedProjects.find((vp: any) => vp.project_name === proj.name);
                return (
                  <div key={idx} className="bg-[#1E293B] rounded-xl p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-white">{proj.name}</h3>
                      <div className="flex gap-2">
                        {verified && (
                          <>
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                              Authenticity: {verified.authenticity_score || 0}/100
                            </span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                              Trust: {verified.trust_level || 'N/A'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 mb-3">{proj.description}</p>
                    {proj.technologies?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {proj.technologies.map((tech: string, tidx: number) => (
                          <span key={tidx} className="px-2 py-1 bg-[#374151] text-gray-300 rounded text-xs">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Education and Certifications */}
        {(education.length > 0 || certifications.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {education.length > 0 && (
              <div className="bg-[#111827] rounded-2xl p-8 border border-[#374151]">
                <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Education</h2>
                {education.map((edu: any, idx: number) => (
                  <div key={idx} className="mb-4">
                    <h3 className="font-semibold text-white">{edu.degree}</h3>
                    <p className="text-gray-300">{edu.institution} • {edu.year}</p>
                    {edu.gpa && <p className="text-[#6366F1] font-medium">GPA: {edu.gpa}</p>}
                  </div>
                ))}
              </div>
            )}
            {certifications.length > 0 && (
              <div className="bg-[#111827] rounded-2xl p-8 border border-[#374151]">
                <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Certifications</h2>
                {certifications.map((cert: string, idx: number) => (
                  <div key={idx} className="mb-2 flex items-center gap-2">
                    <span className="text-[#6366F1]">•</span>
                    <p className="text-gray-300">{cert}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Risk Notes and Recommendation */}
        <div className="bg-[#111827] rounded-2xl p-8 border border-[#374151]">
          <h2 className="text-2xl font-bold text-[#6366F1] mb-4">Final Recommendation</h2>
          {pipeline.agent2?.data?.risk_flags?.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <h3 className="font-semibold text-red-400 mb-2">Risk Flags</h3>
              <ul className="list-disc pl-5 text-gray-300">
                {pipeline.agent2.data.risk_flags.map((flag: string, idx: number) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
          {pipeline.agent3?.data?.improvement_areas?.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <h3 className="font-semibold text-yellow-400 mb-2">Improvement Areas</h3>
              <ul className="list-disc pl-5 text-gray-300">
                {pipeline.agent3.data.improvement_areas.map((area: string, idx: number) => (
                  <li key={idx}>{area}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="p-6 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl">
            <h3 className="font-semibold text-[#22c55e] mb-2">Recruiter Recommendation</h3>
            <p className="text-gray-300 mb-2">
              Trust Level: {credibility.overall_credibility_score >= 80 ? 'High' : credibility.overall_credibility_score >= 60 ? 'Medium' : 'Low'}
            </p>
            <p className="text-lg font-semibold text-white">
              Suggested Action: {credibility.overall_credibility_score >= 70 ? 'Schedule Interview' : 'Screen Further'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
