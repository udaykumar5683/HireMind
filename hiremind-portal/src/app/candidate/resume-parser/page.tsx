"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import ResumeParserWorkspace from "@/components/ResumeParserWorkspace";
import { createClient } from "@/supabase/client";

export default function CandidateResumeParserPage() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const getUserData = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email || "");
        setUserName(data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "");
      }
    };
    getUserData();
  }, [supabase]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Candidate" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <header className="h-16 border-b border-border px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Resume Parser AI</h1>
        </header>

        <main className="p-6">
          <ResumeParserWorkspace initialName={userName} initialEmail={userEmail} />
        </main>
      </div>
    </div>
  );
}
