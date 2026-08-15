"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Briefcase, CheckCircle, Clock, User, ArrowRight, TrendingUp, Zap } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type Job, type Application } from "@/types";
import { motion } from "framer-motion";

export default function CandidateDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    const fetchJobs = async () => {
      const { data } = await supabase.from("jobs").select("*").limit(5);
      if (data) setJobs(data);
    };

    const fetchApplications = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from("applications")
          .select("*, jobs(*)")
          .eq("candidate_id", userData.user.id)
          .limit(5);
        if (data) setApplications(data);
      }
    };

    fetchUser();
    fetchJobs();
    fetchApplications();
  }, [supabase]);

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <Sidebar role="Candidate" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        {/* Enhanced Header */}
        <header className="h-20 border-b border-border px-6 flex items-center justify-between bg-gradient-to-r from-background/50 to-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Hello, {user?.email?.split('@')[0] || 'Candidate'}!
              </h1>
              <p className="text-sm text-muted-foreground">Welcome back to your dashboard</p>
            </div>
          </div>
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, company, or location..."
              className="pl-10 h-10 rounded-lg border-border/50 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <main className="p-8 max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Stats Cards */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl border-border/50 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-500" />
                  <CardHeader className="pb-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs Applied</CardTitle>
                      <motion.div 
                        className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                      >
                        <Briefcase className="w-5 h-5 text-blue-500" />
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <motion.div 
                      className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {applications.length}
                    </motion.div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      <span>Keep going!</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl border-border/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-all duration-500" />
                  <CardHeader className="pb-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Applications in Review</CardTitle>
                      <motion.div 
                        className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                      >
                        <Clock className="w-5 h-5 text-amber-500" />
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <motion.div 
                      className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {applications.filter((a) => a.status === "Applied").length}
                    </motion.div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      <span>Hang tight</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl border-border/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/10 group-hover:to-emerald-500/10 transition-all duration-500" />
                  <CardHeader className="pb-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">New Jobs Posted</CardTitle>
                      <motion.div 
                        className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                      >
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <motion.div 
                      className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {jobs.length}
                    </motion.div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      <span>New opportunities!</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Latest Jobs Section */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl">Latest Jobs</CardTitle>
                    <CardDescription>Discover your next opportunity</CardDescription>
                  </div>
                  <Link href="/candidate/jobs">
                    <Button variant="default" size="sm" className="group">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredJobs.map((job) => (
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
                              <span>{job.company}</span>
                              <span>•</span>
                              <span>{job.location}</span>
                              <span>•</span>
                              <span>{job.employment_type}</span>
                            </div>
                          </div>
                        </div>
                        <Link href={`/candidate/jobs/${job.id}`}>
                          <Button size="sm" className="group">
                            View Details
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* My Recent Applications Section */}
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-xl">My Recent Applications</CardTitle>
                    <CardDescription>Track your job applications</CardDescription>
                  </div>
                  <Link href="/candidate/applications">
                    <Button variant="default" size="sm" className="group">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <motion.div
                        key={app.id}
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-accent/30 transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-lg">{(app as any).jobs?.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {(app as any).jobs?.company}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              "px-4 py-1.5 rounded-full text-xs font-semibold " +
                              (app.status === "Applied"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : app.status === "Offer"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")
                            }
                          >
                            {app.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
