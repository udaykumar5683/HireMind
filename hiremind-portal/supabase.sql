-- Create a table for public profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('Candidate', 'Recruiter')),
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_profiles_id FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    recruiter_id UUID NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    salary TEXT NOT NULL,
    experience TEXT NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('Full-time', 'Part-time', 'Internship', 'Contract')),
    description TEXT NOT NULL,
    responsibilities TEXT NOT NULL,
    required_skills TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    preferred_skills TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
    eligibility TEXT NOT NULL,
    benefits TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_jobs_recruiter_id FOREIGN KEY (recruiter_id) REFERENCES public.profiles (id) ON DELETE CASCADE
);

-- Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    candidate_id UUID NOT NULL,
    job_id UUID NOT NULL,
    status TEXT DEFAULT 'Applied' NOT NULL CHECK (status IN ('Applied', 'Under Review', 'Assessment', 'Interview', 'Offer', 'Rejected')),
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_applications_candidate_id FOREIGN KEY (candidate_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_applications_job_id FOREIGN KEY (job_id) REFERENCES public.jobs (id) ON DELETE CASCADE
);

-- Row Level Security Policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Jobs policies
DROP POLICY IF EXISTS "Recruiters can manage their own jobs" ON public.jobs;
CREATE POLICY "Recruiters can manage their own jobs" ON public.jobs FOR ALL USING (auth.uid() = recruiter_id) WITH CHECK (auth.uid() = recruiter_id);
DROP POLICY IF EXISTS "Everyone can view jobs" ON public.jobs;
CREATE POLICY "Everyone can view jobs" ON public.jobs FOR SELECT USING (true);

-- Applications policies
DROP POLICY IF EXISTS "Candidates can manage their own applications" ON public.applications;
CREATE POLICY "Candidates can manage their own applications" ON public.applications FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);
DROP POLICY IF EXISTS "Recruiters can view applications for their jobs" ON public.applications;
CREATE POLICY "Recruiters can view applications for their jobs" ON public.applications FOR SELECT USING (auth.uid() = (SELECT recruiter_id FROM public.jobs WHERE id = job_id));

-- Enable realtime
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table jobs;
alter publication supabase_realtime add table applications;

-- Trigger to create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, role, company_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'company_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
