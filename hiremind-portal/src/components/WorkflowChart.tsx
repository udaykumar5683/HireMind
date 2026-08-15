"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion, useInView } from "framer-motion";
import {
  User,
  FileText,
  Briefcase,
  Search,
  ShieldCheck,
  Lightbulb,
  Brain,
  CheckCircle2,
  BarChart3,
  Users,
  TrendingUp,
  Eye,
  Trophy,
  FileBarChart,
  LayoutDashboard,
  ClipboardList
} from "lucide-react";

// Target icon component (since it's missing from lucide, use a simple one)
const Target = ({ size = 24, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

// Define the workflow steps data
const candidateJourneySteps = [
  { id: 1, title: "Discover Job", icon: Search, color: "bg-purple-100 text-purple-600", desc: "Candidate searches and views job roles" },
  { id: 2, title: "Apply for Role", icon: Briefcase, color: "bg-blue-100 text-blue-600", desc: "Fill required details and submit application" },
  { id: 3, title: "Upload Resume & Docs", icon: FileText, color: "bg-indigo-100 text-indigo-600", desc: "Resume, portfolio, links (GitHub, etc.) submitted" },
  { id: 7, title: "Receive Assessment Invite", icon: User, color: "bg-green-100 text-green-600", desc: "Selected candidates receive assessment invitation" },
  { id: 8, title: "Take Assessment", icon: Brain, color: "bg-teal-100 text-teal-600", desc: "Appear for online assessment with AI proctoring" },
  { id: 9, title: "Get Performance Report", icon: TrendingUp, color: "bg-orange-100 text-orange-600", desc: "View scores, feedback and performance" }
];

const aiAgentSteps = [
  { id: 1, title: "Resume Parser", icon: FileText, color: "bg-blue-100 text-blue-700", desc: "Extracts skills, experience, education and other key information" },
  { id: 2, title: "Role Match Agent", icon: Target, color: "bg-indigo-100 text-indigo-700", desc: "Matches candidate profile w/ job requirements & calculates fit score" },
  { id: 3, title: "Evidence Correlator", icon: ShieldCheck, color: "bg-purple-100 text-purple-700", desc: "Verifies skills via projects, portfolio, and other credible sources" },
  { id: 4, title: "Hidden Skills Discovery", icon: Lightbulb, color: "bg-pink-100 text-pink-700", desc: "Identifies transferable and hidden skills not explicitly mentioned" },
  { id: 5, title: "Project Authenticity Checker", icon: CheckCircle2, color: "bg-green-100 text-green-700", desc: "Assesses authenticity and impact of projects claimed" },
  { id: 6, title: "Technical Depth Assessment", icon: BarChart3, color: "bg-orange-100 text-orange-700", desc: "Evaluates depth of knowledge and problem solving ability" },
  { id: 7, title: "Ranking & Cutoff Generator", icon: Users, color: "bg-red-100 text-red-700", desc: "Ranks all candidates and determines dynamic cutoff" },
  { id: "assessment", title: "AI Assessment Generator", icon: FileBarChart, color: "bg-yellow-100 text-yellow-700", desc: "Creates assessment using company question bank + AI-generated questions" }
];

const recruiterSteps = [
  { id: 10, title: "AI-Proctored Assessment Monitoring", icon: Eye, color: "bg-green-100 text-green-700", desc: "AI monitors the assessment for fairness and integrity" },
  { id: 11, title: "Evaluation & Scoring", icon: CheckCircle2, color: "bg-blue-100 text-blue-700", desc: "Answers are evaluated automatically and scored" },
  { id: 12, title: "Candidate Ranking & Filtering", icon: Trophy, color: "bg-purple-100 text-purple-700", desc: "Candidates ranked based on assessment scores and overall fit" },
  { id: 13, title: "Reports & Insights Generated", icon: FileBarChart, color: "bg-indigo-100 text-indigo-700", desc: "Detailed reports with scores, strengths, weaknesses and insights" },
  { id: 14, title: "Recruiter Dashboard", icon: LayoutDashboard, color: "bg-orange-100 text-orange-700", desc: "View reports, compare candidates and proceed with interviews" },
  { id: 15, title: "Interview Shortlist & Hiring Decision", icon: ClipboardList, color: "bg-red-100 text-red-700", desc: "Interview shortlisted candidates and make hiring decisions" }
];

type WorkflowStep = {
  id: number | string;
  title: string;
  icon: React.ElementType;
  color: string;
  desc: string;
};

type StepCardProps = {
  step: WorkflowStep;
  index: number;
  delay: number;
  type: string;
};

// Helper component for animated step cards
const StepCard = ({ step, index, delay, type }: StepCardProps) => {
  const shouldReduceMotion = useReducedMotion();
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px 0px" });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.5,
        delay: shouldReduceMotion ? 0 : delay,
        ease: "easeOut"
      }}
      className="flex flex-col items-center p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-all"
    >
      <div className={`p-3 rounded-full ${step.color} mb-3`}>
        <Icon size={24} />
      </div>
      <h4 className="text-base sm:text-lg font-semibold mb-2 text-center">{step.title}</h4>
      <p className="text-sm text-muted-foreground text-center leading-relaxed">{step.desc}</p>
    </motion.div>
  );
};

export default function WorkflowChart() {
  const [activeSection, setActiveSection] = useState("candidate");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.h2
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            The Complete HireMind Workflow
          </motion.h2>
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Explore the end-to-end process from candidate application to hiring decision
          </motion.p>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {["candidate", "ai", "recruiter"].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeSection === section
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/30"
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)} Journey
            </button>
          ))}
        </div>

        {/* Animated Section Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === "candidate" && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-center text-purple-400 mb-6">
                  Candidate Journey
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {candidateJourneySteps.map((step, index) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={index}
                      delay={index * 0.1}
                      type="candidate"
                    />
                  ))}
                </div>
              </div>
            )}

            {activeSection === "ai" && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-center text-blue-400 mb-6">
                  AI Agent Processing Layer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {aiAgentSteps.map((step, index) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={index}
                      delay={index * 0.1}
                      type="ai"
                    />
                  ))}
                </div>
              </div>
            )}

            {activeSection === "recruiter" && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-center text-green-400 mb-6">
                  Recruiter Experience Layer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recruiterSteps.map((step, index) => (
                    <StepCard
                      key={step.id}
                      step={step}
                      index={index}
                      delay={index * 0.1}
                      type="recruiter"
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Integration Points (Bottom Bar) */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 p-6 bg-card border border-border rounded-xl"
        >
          <h4 className="text-xl font-semibold mb-4 text-center text-orange-400">
            Integration Points
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            {[
              { icon: Search, label: "Job Discovery & Role Details" },
              { icon: FileText, label: "Application & Resume Submission" },
              { icon: ClipboardList, label: "Assessment Delivery & Proctoring" },
              { icon: BarChart3, label: "Recruiter Dashboard & Analytics" },
              { icon: Users, label: "Interview Management & Hiring Workflow" }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex flex-col items-center p-3">
                  <div className="p-2 rounded-lg bg-orange-100/10 text-orange-400 mb-2">
                    <Icon size={20} />
                  </div>
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Accessibility Fallback */}
        <div className="mt-12 p-4 bg-card/50 rounded-lg border border-border">
          <h4 className="text-lg font-semibold mb-2">Workflow Summary (Text Description)</h4>
          <p className="text-muted-foreground text-sm">
            The HireMind platform enables candidates to discover jobs, apply, upload resumes, take AI-proctored assessments, and receive performance reports. Behind the scenes, 8 AI agents process applications (parsing resumes, verifying skills, discovering hidden abilities, checking authenticity, and ranking candidates). Recruiters can monitor assessments, view automated scoring and reports, compare candidates via a dashboard, and make hiring decisions.
          </p>
        </div>
      </div>
    </section>
  );
}
