"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  Sparkles,
  Briefcase,
  User,
  Zap,
  CheckCircle,
  Compass,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Star,
  BarChart3,
  Bot,
  FileText,
  Users,
  Globe,
  ChevronRight,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { type ReactNode, useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence, useReducedMotion } from "framer-motion";
import WorkflowChart from "@/components/WorkflowChart";
import LoginDropdown from "@/components/LoginDropdown";
import { createClient } from "@/supabase/client";

const features = [
  {
    title: "6-Agent AI Pipeline",
    description:
      "Our sequential agent system analyzes every aspect of candidates, from profiles to technical depth.",
    icon: Bot,
  },
  {
    title: "Truth Verification",
    description:
      "Cross-agent validation ensures that candidate claims are backed by real evidence.",
    icon: ShieldCheck,
  },
  {
    title: "Technical Depth Analysis",
    description:
      "Leverages LeetCode and HackerRank data to evaluate actual coding skills.",
    icon: BarChart3,
  },
  {
    title: "Resume Parsing",
    description: "Advanced AI extracts key information from resumes quickly and accurately.",
    icon: FileText,
  },
  {
    title: "Candidate Matching",
    description:
      "Intelligent algorithms find the perfect candidates for your job openings.",
    icon: Users,
  },
  {
    title: "Global Reach",
    description: "Connect with candidates and recruiters from around the world.",
    icon: Globe,
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "CTO at TechCorp",
    content:
      "HireMind helped us find 3 amazing engineers in just 2 weeks. The technical depth analysis is a game-changer!",
  },
  {
    name: "Michael Chen",
    role: "Software Engineer",
    content:
      "As a candidate, I loved the transparent feedback. It helped me improve my profile and land my dream job.",
  },
  {
    name: "Emily Rodriguez",
    role: "HR Manager",
    content:
      "The AI agents save us so much time on initial screening. We now focus only on the best candidates.",
  },
];

type AnimatedCounterProps = {
  to: number;
  duration?: number;
  suffix?: string;
};

const AnimatedCounter = ({ to, duration = 2000, suffix = "" }: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [count, setCount] = useState(to);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView || shouldReduceMotion) {
      setCount(to);
      return;
    }
    let startTime: number | undefined;
    let animationFrame: number | undefined;
    setCount(0);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentCount = Math.floor(progress * to);
      setCount(currentCount);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    };
  }, [isInView, to, duration, shouldReduceMotion]);

  return (
    <span ref={ref} className="text-4xl md:text-5xl font-bold text-primary">
      {count}
      {suffix}
    </span>
  );
};

type SectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  delay?: number;
};

const Section = ({ children, id, className = "", delay = 0 }: SectionProps) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 50 }}
      animate={shouldReduceMotion ? false : (isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 })}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();

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
    const id = window.setTimeout(checkAuth, 100);
    return () => { mounted = false; window.clearTimeout(id); };
  }, [supabase, router]);
  
  // Only apply parallax/animations if reduced motion is not preferred
  const heroY1 = shouldReduceMotion ? 0 : useTransform(scrollY, [0, 1000], [0, 300]);
  const heroY2 = shouldReduceMotion ? 0 : useTransform(scrollY, [0, 1000], [0, 200]);
  const heroScale = shouldReduceMotion ? 1 : useTransform(scrollY, [0, 500], [1, 0.95]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20"
            >
              <Brain className="w-6 h-6 text-white" />
            </motion.div>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400"
            >
              HireMind
            </motion.span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {["Features", "How it Works", "Testimonials"].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <LoginDropdown />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-foreground"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileMenuOpen ? "close" : "open"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {mobileMenuOpen ? (
                  <X className="w-8 h-8" />
                ) : (
                  <Menu className="w-8 h-8" />
                )}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border px-4 overflow-hidden"
            >
              <div className="py-6 space-y-4">
                {["Features", "How it Works", "Testimonials"].map((item) => (
                  <Link
                    key={item}
                    href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                    className="block text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item}
                  </Link>
                ))}
                <div className="py-2">
                  <p className="text-sm text-muted-foreground mb-2">Login as</p>
                  <div className="space-y-2">
                    <Link
                      href="/login?role=Candidate"
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Candidate
                    </Link>
                    <Link
                      href="/login?role=Recruiter"
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors font-medium py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Users className="w-4 h-4" />
                      Recruiter
                    </Link>
                  </div>
                </div>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <Section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Background with gradient and perspective grid */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Base gradient layer */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(10, 15, 30, 0.8), rgba(10, 15, 30, 0.95))',
                zIndex: 0
              }}
            />
            {/* Perspective grid layer */}
            <div 
              className="absolute inset-0"
              style={{
                zIndex: 1,
                perspective: '1000px',
                transformStyle: 'preserve-3d'
              }}
            >
              <div 
                className="absolute inset-0"
                style={{
                  transform: 'rotateX(60deg) translateY(20%)',
                  transformOrigin: 'center top',
                  backgroundImage: `
                    linear-gradient(90deg, rgba(55, 65, 81, 0.4) 1px, transparent 1px),
                    linear-gradient(rgba(55, 65, 81, 0.4) 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                  backgroundRepeat: 'repeat'
                }}
              />
            </div>
          </div>
          <motion.div
            style={{ y: heroY1 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl -z-10"
          />
          <motion.div
            style={{ y: heroY2 }}
            className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl -z-10"
          />

          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                style={{ scale: heroScale }}
                className="text-center lg:text-left"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 text-sm text-primary-foreground mb-8 shadow-sm"
                >
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-medium">6-Agent AI Pipeline</span>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight"
                >
                  Hire Smarter,{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                    Not Harder
                  </span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
                >
                  Revolutionize recruitment with our multi-agent AI system that
                  verifies every claim, analyzes technical depth, and finds your
                  perfect match.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
                >
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 w-full sm:w-auto group"
                  >
                    <span>Get Started</span>
                    <motion.div
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <ArrowRight className="w-6 h-6" />
                    </motion.div>
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Free to start</span>
                  </div>
                </motion.div>

                {/* Animated Metrics */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="mt-12 grid grid-cols-3 gap-8 pt-8 border-t border-border"
                >
                  <div className="text-center">
                    <AnimatedCounter to={10000} suffix="+" />
                    <p className="text-sm text-muted-foreground mt-2">Candidates</p>
                  </div>
                  <div className="text-center">
                    <AnimatedCounter to={500} suffix="+" />
                    <p className="text-sm text-muted-foreground mt-2">Companies</p>
                  </div>
                  <div className="text-center">
                    <AnimatedCounter to={98} suffix="%" />
                    <p className="text-sm text-muted-foreground mt-2">Match Rate</p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Hero Illustration */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="bg-card border border-border rounded-2xl p-8 shadow-xl relative z-10"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center"
                      >
                        <Bot className="w-6 h-6 text-white" />
                      </motion.div>
                      <div>
                        <h3 className="font-semibold">AI Agents At Work</h3>
                        <p className="text-sm text-muted-foreground">
                          Analyzing candidate profile...
                        </p>
                      </div>
                    </div>
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="w-8 h-8 rounded-full bg-muted border-2 border-card"
                          style={{ background: `hsl(${i * 100}, 70%, 50%)` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Profile Analysis", status: "done" },
                      { label: "Verification Check", status: "done" },
                      { label: "Hidden Skills Extraction", status: "done" },
                      { label: "Technical Depth Assessment", status: "active" },
                      { label: "Final Report", status: "pending" },
                    ].map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          step.status === "done"
                            ? "bg-green-500/10 border border-green-500/20"
                            : step.status === "active"
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/50 border border-border"
                        }`}
                      >
                        <motion.div
                          animate={
                            step.status === "active"
                              ? {
                                  scale: [1, 1.2, 1],
                                }
                              : {}
                          }
                          transition={{
                            duration: 1,
                            repeat: step.status === "active" ? Infinity : 0,
                          }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            step.status === "done"
                              ? "bg-green-500 text-white"
                              : step.status === "active"
                              ? "bg-primary text-white"
                              : "bg-muted-foreground/30"
                          }`}
                        >
                          {step.status === "done" && (
                            <CheckCircle className="w-3 h-3" />
                          )}
                        </motion.div>
                        <span
                          className={`text-sm ${
                            step.status === "done" || step.status === "active"
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Floating Elements */}
                <motion.div
                  animate={{
                    y: [0, 15, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                  className="absolute -top-4 -right-4 bg-card border border-border p-4 rounded-xl shadow-lg z-20"
                >
                  <Zap className="w-6 h-6 text-yellow-400" />
                </motion.div>
                <motion.div
                  animate={{
                    y: [0, -15, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute -bottom-4 -left-4 bg-card border border-border p-4 rounded-xl shadow-lg z-20"
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </Section>

        {/* Features Section */}
        <Section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30" delay={0.2}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-4xl font-bold mb-4"
              >
                Powerful Features
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-xl text-muted-foreground max-w-3xl mx-auto"
              >
                Everything you need to find, evaluate, and hire the best talent
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-card p-8 rounded-2xl border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group"
                  >
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                    >
                      <Icon className="w-7 h-7 text-primary" />
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground text-base leading-relaxed">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Animated Workflow Chart */}
        <WorkflowChart />

        {/* How it Works */}
        <Section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8" delay={0.3}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-4xl font-bold mb-4"
              >
                How It Works
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-xl text-muted-foreground max-w-3xl mx-auto"
              >
                Our 6-agent pipeline ensures thorough and accurate candidate evaluation
              </motion.p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Upload & Analyze",
                  description:
                    "Candidates upload resumes or recruiters post jobs. Our first agent extracts all relevant information.",
                },
                {
                  step: "02",
                  title: "Verify & Validate",
                  description:
                    "Multiple agents cross-verify claims using external data sources like GitHub, LeetCode, and more.",
                },
                {
                  step: "03",
                  title: "Get Insights",
                  description:
                    "Receive a comprehensive report with technical depth scores, verification status, and hidden skills.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  whileHover={{ scale: 1.05 }}
                  className="relative"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.15 + 0.1 }}
                    className="text-6xl font-extrabold text-primary/10 mb-4"
                  >
                    {item.step}
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-base leading-relaxed">{item.description}</p>
                  {i < 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 + 0.2 }}
                      className="hidden md:block absolute top-1/2 -right-4"
                    >
                      <ChevronRight className="w-8 h-8 text-muted-foreground/50" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* Testimonials */}
        <Section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30" delay={0.4}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-4xl font-bold mb-4"
              >
                What Our Users Say
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-xl text-muted-foreground max-w-3xl mx-auto"
              >
                Trusted by recruiters and candidates worldwide
              </motion.p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-card p-8 rounded-2xl border border-border"
                >
                  <div className="flex items-center gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.div
                        key={star}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 + star * 0.05 }}
                      >
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-base sm:text-lg mb-6 text-foreground leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-4">
                    <motion.div
                      whileHover={{ rotate: 10 }}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold"
                    >
                      {testimonial.name.charAt(0)}
                    </motion.div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* CTA Section */}
        <Section className="py-24 px-4 sm:px-6 lg:px-8" delay={0.5}>
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-3xl border border-primary/20 p-12"
            >
              <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join thousands of recruiters and candidates who are already using HireMind
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 w-full sm:w-auto group"
                >
                  <span>Start for Free</span>
                  <motion.div
                    whileHover={{ x: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <ArrowUpRight className="w-6 h-6" />
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Link href="/" className="flex items-center gap-2 mb-6 group">
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center"
                >
                  <Brain className="w-6 h-6 text-white" />
                </motion.div>
                <span className="text-2xl font-bold">HireMind</span>
              </Link>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                AI-powered recruitment platform connecting the best talent with amazing opportunities.
              </p>
            </motion.div>

            {[
              { title: "Product", links: ["Features", "Pricing", "Integrations"] },
              { title: "Company", links: ["About", "Blog", "Careers"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy"] },
            ].map((column, i) => (
              <motion.div
                key={column.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i + 1) * 0.1 }}
              >
                <h4 className="font-semibold mb-6">{column.title}</h4>
                <ul className="space-y-4">
                  {column.links.map((link, j) => (
                    <motion.li
                      key={link}
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Link
                        href="#"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <p className="text-muted-foreground text-sm">
              © 2026 HireMind. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: Globe, label: "Website" },
                { icon: Users, label: "Community" },
              ].map((social, i) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={i}
                    href="#"
                    whileHover={{ y: -3, scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
