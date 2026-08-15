"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/supabase/client";
import { type Profile } from "@/types";

export default function CompanyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .single();
        if (data) setProfile(data);
      }
    };

    fetchProfile();
  }, [supabase]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="Recruiter" className="w-64 flex-shrink-0" />
      <div className="flex-1 overflow-auto">
        <header className="h-16 border-b border-border px-6 flex items-center">
          <h1 className="text-xl font-bold">Company Profile</h1>
        </header>

        <main className="p-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{profile?.company_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Company Name</div>
                  <div className="font-medium">{profile?.company_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Recruiter Name</div>
                  <div className="font-medium">{profile?.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{profile?.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{profile?.phone}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
