"use client";

import Link from "next/link";
import { ArrowLeft, Brain, User, Briefcase, CheckCircle } from "lucide-react";

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-6 px-4 border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center">
          <Link
            href="/"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm text-primary-foreground mb-6 shadow-sm">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-medium">Choose Your Path</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
              How do you want to use HireMind?
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select your user type to get started with the perfect onboarding experience for your needs
            </p>
          </div>

          {/* User Type Selection Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Candidate Card */}
            <Link
              href="/signup?role=Candidate"
              className="group relative bg-card border border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <User className="w-8 h-8 text-primary" />
              </div>

              <h3 className="text-2xl font-bold mb-3 text-foreground">
                I'm a Candidate
              </h3>

              <p className="text-muted-foreground mb-6">
                Find your dream job, showcase your skills, and let AI match you with the perfect opportunities
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "AI-powered job matching",
                  "Technical skill verification",
                  "Profile optimization tips",
                  "Direct recruiter connections"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Continue as Candidate
                </span>
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </div>
              </div>
            </Link>

            {/* Recruiter Card */}
            <Link
              href="/signup?role=Recruiter"
              className="group relative bg-card border border-border rounded-2xl p-8 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>

              <h3 className="text-2xl font-bold mb-3 text-foreground">
                I'm a Recruiter
              </h3>

              <p className="text-muted-foreground mb-6">
                Hire smarter, not harder with our AI-powered candidate evaluation and matching platform
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "6-agent AI pipeline",
                  "Technical depth analysis",
                  "Truth verification system",
                  "Candidate ranking & scoring"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Continue as Recruiter
                </span>
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </div>
              </div>
            </Link>
          </div>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground mt-12">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in here
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
