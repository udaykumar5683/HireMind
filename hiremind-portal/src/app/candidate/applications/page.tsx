"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type Application, type Job } from "@/types";
import Link from "next/link";

export default function CandidateApplications() {
  const [applications, setApplications] = useState<
    (Application & { jobs: Job })[]
  >([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchApplications = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from("applications")
          .select("*, jobs(*)")
          .eq("candidate_id", userData.user.id);
        if (data) setApplications(data as any);
      }
    };

    fetchApplications();
  }, [supabase]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Candidate" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <header className="h-16 border-b border-border px-6 flex items-center">
          <h1 className="text-xl font-bold">My Applications</h1>
        </header>

        <main className="p-6 max-w-4xl mx-auto">
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{app.jobs.title}</CardTitle>
                    <span
                      className={
                        "px-3 py-1 rounded-full text-xs font-medium " +
                        (app.status === "Applied"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : app.status === "Offer"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : app.status === "Rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")
                      }
                    >
                      {app.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>{app.jobs.company} • {app.jobs.location}</div>
                    <div>
                      Applied on {new Date(app.applied_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {applications.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">
                    No applications yet. Start applying for jobs!
                  </p>
                  <Link href="/candidate/jobs" className="mt-4 inline-block">
                    <Button>Browse Jobs</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Let's import Button here
import { Button } from "@/components/ui/button";
