"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";

const jobSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  salary: z.string().min(2, "Salary must be at least 2 characters"),
  experience: z.string().min(1, "Experience is required"),
  employmentType: z.enum(["Full-time", "Part-time", "Internship", "Contract"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  responsibilities: z.string().min(10, "Responsibilities must be at least 10 characters"),
  requiredSkills: z.string().min(2, "Required skills are required"),
  preferredSkills: z.string().optional(),
  eligibility: z.string().min(10, "Eligibility must be at least 10 characters"),
  benefits: z.string().min(10, "Benefits must be at least 10 characters"),
});

type JobFormData = z.infer<typeof jobSchema>;

export default function CreateJob() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      employmentType: "Full-time",
    },
  });

  const handleSubmit = async (data: JobFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("You must be logged in to create a job");
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error(
          "Recruiter profile not found. Please complete your profile setup before creating jobs."
        );
      }

      if (profileData.role !== "Recruiter") {
        throw new Error("Only recruiters can create job postings");
      }

      const { error } = await supabase.from("jobs").insert({
        recruiter_id: userData.user.id,
        title: data.title,
        company: data.company,
        location: data.location,
        salary: data.salary,
        experience: data.experience,
        employment_type: data.employmentType,
        description: data.description,
        responsibilities: data.responsibilities,
        required_skills: data.requiredSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        preferred_skills: (data.preferredSkills || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        eligibility: data.eligibility,
        benefits: data.benefits,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        if (error.code === "42501") {
          throw new Error(
            "Permission denied: Row Level Security policy prevented job creation. Please contact support."
          );
        } else if (error.code === "23503") {
          throw new Error(
            "Foreign key constraint failed: Your recruiter profile may be missing or incomplete."
          );
        } else if (error.code === "23514") {
          throw new Error(
            "Validation failed: One or more fields contain invalid values (e.g., employment type)."
          );
        } else {
          throw new Error(error.message || "Failed to create job");
        }
      }

      router.push("/recruiter/jobs");
    } catch (err: any) {
      console.error("Job creation error:", err);
      setError(err.message || "An unexpected error occurred while creating the job");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Recruiter" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <header className="h-16 border-b border-border px-6 flex items-center">
          <Link
            href="/recruiter/jobs"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </header>

        <main className="p-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create New Job</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input id="title" placeholder="e.g., Frontend Developer" {...form.register("title")} />
                    {form.formState.errors.title && (
                      <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="e.g., Tech Corp" {...form.register("company")} />
                    {form.formState.errors.company && (
                      <p className="text-xs text-destructive">{form.formState.errors.company.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="e.g., New York, NY" {...form.register("location")} />
                    {form.formState.errors.location && (
                      <p className="text-xs text-destructive">{form.formState.errors.location.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input id="salary" placeholder="e.g., $100,000 - $150,000" {...form.register("salary")} />
                    {form.formState.errors.salary && (
                      <p className="text-xs text-destructive">{form.formState.errors.salary.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Input id="experience" placeholder="e.g., 3+ years" {...form.register("experience")} />
                    {form.formState.errors.experience && (
                      <p className="text-xs text-destructive">{form.formState.errors.experience.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <select
                    id="employmentType"
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    {...form.register("employmentType")}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    placeholder="Describe the job..."
                    className="w-full h-32 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    {...form.register("description")}
                  />
                  {form.formState.errors.description && (
                    <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibilities">Responsibilities</Label>
                  <textarea
                    id="responsibilities"
                    placeholder="What will the candidate do?"
                    className="w-full h-32 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    {...form.register("responsibilities")}
                  />
                  {form.formState.errors.responsibilities && (
                    <p className="text-xs text-destructive">{form.formState.errors.responsibilities.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requiredSkills">Required Skills (comma separated)</Label>
                    <Input id="requiredSkills" placeholder="e.g., JavaScript, React, CSS" {...form.register("requiredSkills")} />
                    {form.formState.errors.requiredSkills && (
                      <p className="text-xs text-destructive">{form.formState.errors.requiredSkills.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredSkills">Preferred Skills (comma separated)</Label>
                    <Input id="preferredSkills" placeholder="e.g., TypeScript, Node.js" {...form.register("preferredSkills")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eligibility">Eligibility</Label>
                  <textarea
                    id="eligibility"
                    placeholder="Who is eligible for this role?"
                    className="w-full h-24 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    {...form.register("eligibility")}
                  />
                  {form.formState.errors.eligibility && (
                    <p className="text-xs text-destructive">{form.formState.errors.eligibility.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefits">Benefits</Label>
                  <textarea
                    id="benefits"
                    placeholder="What are the benefits of this role?"
                    className="w-full h-24 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    {...form.register("benefits")}
                  />
                  {form.formState.errors.benefits && (
                    <p className="text-xs text-destructive">{form.formState.errors.benefits.message}</p>
                  )}
                </div>

                <div className="pt-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Job"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
