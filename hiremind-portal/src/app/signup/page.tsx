"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  User,
  Briefcase,
  Mail,
  Phone,
  Lock,
  Loader2,
} from "lucide-react";
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

const candidateSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(5, "Phone number must be at least 5 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const recruiterSchema = z
  .object({
    recruiterName: z.string().min(2, "Name must be at least 2 characters"),
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    companyEmail: z.string().email("Invalid email address"),
    phone: z.string().min(5, "Phone number must be at least 5 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CandidateFormData = z.infer<typeof candidateSchema>;
type RecruiterFormData = z.infer<typeof recruiterSchema>;

export default function SignUp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = (searchParams.get("role") as UserRole) || "Candidate";
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
      router.replace(
        effectiveRole === "Candidate" ? "/candidate/dashboard" : "/recruiter/dashboard"
      );
    };
    const id = window.setTimeout(checkAuth, 50);
    return () => { mounted = false; window.clearTimeout(id); };
  }, [supabase, router]);

  const candidateForm = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const recruiterForm = useForm<RecruiterFormData>({
    resolver: zodResolver(recruiterSchema),
    defaultValues: {
      recruiterName: "",
      companyName: "",
      companyEmail: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: CandidateFormData | RecruiterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const email =
        role === "Candidate"
          ? (data as CandidateFormData).email
          : (data as RecruiterFormData).companyEmail;
      const password = data.password;

      const { error: signUpError, data: signUpData } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name:
                role === "Candidate"
                  ? (data as CandidateFormData).fullName
                  : (data as RecruiterFormData).recruiterName,
              phone: data.phone,
              company_name:
                role === "Recruiter"
                  ? (data as RecruiterFormData).companyName
                  : null,
            },
          },
        });

      console.log("Sign up response:", { signUpData, signUpError });

      if (signUpError) throw signUpError;

      // Profile is created automatically by database trigger
      if (signUpData.user && signUpData.session) {
        router.refresh();

        router.push(
          role === "Candidate" ? "/candidate/dashboard" : "/recruiter/dashboard"
        );
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
              Create {role} Account
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
              {role === "Candidate" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      {...candidateForm.register("fullName")}
                    />
                    {candidateForm.formState.errors.fullName && (
                      <p className="text-xs text-destructive">
                        {candidateForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        className="pl-10"
                        {...candidateForm.register("email")}
                      />
                    </div>
                    {candidateForm.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {candidateForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="recruiterName">Your Name</Label>
                    <Input
                      id="recruiterName"
                      placeholder="Jane Smith"
                      {...recruiterForm.register("recruiterName")}
                    />
                    {recruiterForm.formState.errors.recruiterName && (
                      <p className="text-xs text-destructive">
                        {recruiterForm.formState.errors.recruiterName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Tech Corp"
                      {...recruiterForm.register("companyName")}
                    />
                    {recruiterForm.formState.errors.companyName && (
                      <p className="text-xs text-destructive">
                        {recruiterForm.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="companyEmail"
                        type="email"
                        placeholder="jane@techcorp.com"
                        className="pl-10"
                        {...recruiterForm.register("companyEmail")}
                      />
                    </div>
                    {recruiterForm.formState.errors.companyEmail && (
                      <p className="text-xs text-destructive">
                        {recruiterForm.formState.errors.companyEmail.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    className="pl-10"
                    {...(role === "Candidate"
                      ? candidateForm.register("phone")
                      : recruiterForm.register("phone"))}
                  />
                </div>
                {role === "Candidate" && candidateForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">
                    {candidateForm.formState.errors.phone.message}
                  </p>
                )}
                {role === "Recruiter" && recruiterForm.formState.errors.phone && (
                  <p className="text-xs text-destructive">
                    {recruiterForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...(role === "Candidate"
                      ? candidateForm.register("confirmPassword")
                      : recruiterForm.register("confirmPassword"))}
                  />
                </div>
                {role === "Candidate" && candidateForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {candidateForm.formState.errors.confirmPassword.message}
                  </p>
                )}
                {role === "Recruiter" && recruiterForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {recruiterForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign Up
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link
                href={`/login?role=${role}`}
                className="text-primary hover:underline"
              >
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
