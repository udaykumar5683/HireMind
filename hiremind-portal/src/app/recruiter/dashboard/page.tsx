"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Clock,
  Plus,
  TrendingUp,
  User,
  ArrowRight,
} from "lucide-react";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type Job, type Application } from "@/types";
import { motion } from "framer-motion";

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    const fetchJobs = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from("jobs")
          .select("*")
          .eq("recruiter_id", userData.user.id)
          .limit(5);
        if (data) setJobs(data);
      }
    };

    const fetchApplications = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from("applications")
          .select("*, jobs(*)")
          .limit(5);
        if (data) setApplications(data);
      }
    };

    fetchUser();
    fetchJobs();
    fetchApplications();
  }, [supabase]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Recruiter" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        {/* Enhanced Header */}
        <header className="h-20 border-b border-border px-6 flex items-center justify-between bg-gradient-to-r from-background/50 to-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Hello, {user?.email?.split('@')[0] || 'Recruiter'}!
              </h1>
              <p className="text-sm text-muted-foreground">Manage your hiring process</p>
            </div>
          </div>
          <Link href="/recruiter/jobs/new">
            <Button className="group shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </Link>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div variants={itemVariants}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-gradient-to-br from-card to-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <Briefcase className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                      {jobs.length}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      <span>Great job!</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-gradient-to-br from-card to-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                      {jobs.length}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      <span>Keep posting!</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-gradient-to-br from-card to-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                        <Users className="w-5 h-5 text-purple-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                      {applications.length}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      <span>Top talent!</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-gradient-to-br from-card to-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">In Review</CardTitle>
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                        <Clock className="w-5 h-5 text-amber-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
                      {
                        applications.filter((app) => app.status === "Applied").length
                      }
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Review soon</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Two Column Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Jobs */}
              <motion.div variants={itemVariants}>
                <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-300 h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                      <CardTitle className="text-xl">Recent Jobs</CardTitle>
                      <CardDescription>Your latest job postings</CardDescription>
                    </div>
                    <Link href="/recruiter/jobs">
                      <Button variant="default" size="sm" className="group">
                        View All
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {jobs.map((job) => (
                        <motion.div
                          key={job.id}
                          whileHover={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-accent/30 transition-all duration-300"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                              <Briefcase className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{job.title}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>{job.location}</span>
                                <span>•</span>
                                <span>{job.employment_type}</span>
                              </div>
                            </div>
                          </div>
                          <Link href={`/recruiter/jobs/${job.id}`}>
                            <Button variant="default" size="sm" className="group">
                              View
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Applications */}
              <motion.div variants={itemVariants}>
                <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-300 h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div>
                      <CardTitle className="text-xl">Recent Applications</CardTitle>
                      <CardDescription>Latest candidate applications</CardDescription>
                    </div>
                    <Link href="/recruiter/applications">
                      <Button variant="default" size="sm" className="group">
                        View All
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {applications.slice(0, 5).map((app) => (
                        <motion.div
                          key={app.id}
                          whileHover={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-accent/30 transition-all duration-300"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                              <Users className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                              <div className="font-semibold text-lg">Candidate</div>
                              <div className="text-sm text-muted-foreground">
                                {(app as any).jobs?.title}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={
                                "px-4 py-1.5 rounded-full text-xs font-semibold " +
                                (app.status === "Applied"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")
                              }
                            >
                              {app.status}
                            </span>
                            <Button variant="default" size="sm" className="group">
                              View
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
