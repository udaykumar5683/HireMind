"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type Job } from "@/types";

export default function RecruiterJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchJobs = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from("jobs")
          .select("*")
          .eq("recruiter_id", userData.user.id);
        if (data) setJobs(data);
      }
    };

    fetchJobs();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (!error) setJobs(jobs.filter((j) => j.id !== id));
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Recruiter" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <header className="h-16 border-b border-border px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">My Jobs</h1>
          <Link href="/recruiter/jobs/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </Link>
        </header>

        <main className="p-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {job.company} • {job.location} • {job.employment_type}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {job.description}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {jobs.length === 0 && (
              <Card className="col-span-full text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    No jobs yet. Create your first job posting!
                  </p>
                  <Link href="/recruiter/jobs/new">
                    <Button>Create Job</Button>
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
