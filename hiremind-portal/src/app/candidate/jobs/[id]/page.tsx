"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type Job } from "@/types";

export default function JobDetail() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    // Redirect to Resume Parser with parameters
    const resumeParserUrl = "http://localhost:5173";
    const returnUrl = `http://localhost:3000/candidate/jobs/${params.id}`;
    const paramsToSend = new URLSearchParams({
      userId: user.id,
      jobId: job?.id?.toString() || "",
      returnUrl: returnUrl
    });
    window.location.href = `${resumeParserUrl}?${paramsToSend.toString()}`;
  };

  if (!job) return <div className="flex h-screen items-center justify-center">Loading...</div>;

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
                    Application Submitted Successfully!
                  </div>
                ) : (
                  <Button className="w-full md:w-auto" size="lg" onClick={handleApply} disabled={isLoading}>
                    {isLoading ? "Applying..." : "Apply Now"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
