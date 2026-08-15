"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, User, Briefcase, Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type UserRole } from "@/types";

const candidateLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(false),
});

const recruiterLoginSchema = z.object({
  companyEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(false),
});

type CandidateLoginFormData = z.infer<typeof candidateLoginSchema>;
type RecruiterLoginFormData = z.infer<typeof recruiterLoginSchema>;

export default function Login() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = (searchParams.get("role") as UserRole) || "Candidate";
  const next = searchParams.get("next");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const effectiveRole = profileData?.role || user.user_metadata?.role || "Candidate";
      const dashboard = effectiveRole === "Candidate" ? "/candidate/dashboard" : "/recruiter/dashboard";
      router.replace(next || dashboard);
    };
    const id = window.setTimeout(checkAuth, 50);
    return () => { mounted = false; window.clearTimeout(id); };
  }, [supabase, router, next]);

  const candidateForm = useForm<CandidateLoginFormData>({
    resolver: zodResolver(candidateLoginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const recruiterForm = useForm<RecruiterLoginFormData>({
    resolver: zodResolver(recruiterLoginSchema),
    defaultValues: {
      companyEmail: "",
      password: "",
      remember: false,
    },
  });

  const handleSubmit = async (data: CandidateLoginFormData | RecruiterLoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const email =
        role === "Candidate"
          ? (data as CandidateLoginFormData).email
          : (data as RecruiterLoginFormData).companyEmail;
      const password = data.password;

      const { error: signInError, data: signInData } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", signInData.user?.id)
        .single();

      if (!profileData) throw new Error("Profile not found");
      if (profileData.role !== role) throw new Error(`Please log in as ${profileData.role}`);

      router.refresh();

      const dashboard =
        role === "Candidate" ? "/candidate/dashboard" : "/recruiter/dashboard";
      router.push(next || dashboard);
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              {role === "Candidate" ? (
                <User className="w-6 h-6 text-primary" />
              ) : (
                <Briefcase className="w-6 h-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              Log in as {role}
            </CardTitle>
            <CardDescription>
              {role === "Candidate"
                ? "Find your dream job today"
                : "Hire the best talent for your company"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={
                role === "Candidate"
                  ? candidateForm.handleSubmit(handleSubmit)
                  : recruiterForm.handleSubmit(handleSubmit)
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">
                  {role === "Candidate" ? "Email" : "Company Email"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={role === "Candidate" ? "email" : "companyEmail"}
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    {...(role === "Candidate"
                      ? candidateForm.register("email")
                      : recruiterForm.register("companyEmail"))}
                  />
                </div>
                {role === "Candidate" && candidateForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {candidateForm.formState.errors.email.message}
                  </p>
                )}
                {role === "Recruiter" && recruiterForm.formState.errors.companyEmail && (
                  <p className="text-xs text-destructive">
                    {recruiterForm.formState.errors.companyEmail.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...(role === "Candidate"
                      ? candidateForm.register("password")
                      : recruiterForm.register("password"))}
                  />
                </div>
                {role === "Candidate" && candidateForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {candidateForm.formState.errors.password.message}
                  </p>
                )}
                {role === "Recruiter" && recruiterForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {recruiterForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-input"
                  {...(role === "Candidate"
                    ? candidateForm.register("remember")
                    : recruiterForm.register("remember"))}
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground">
                  Remember me
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log in
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link
                href={`/signup?role=${role}`}
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
