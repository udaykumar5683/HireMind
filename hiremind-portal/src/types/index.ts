export type UserRole = "Candidate" | "Recruiter";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  company_name: string | null;
  created_at: string;
}

export type EmploymentType = "Full-time" | "Part-time" | "Internship" | "Contract";

export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: string;
  employment_type: EmploymentType;
  description: string;
  responsibilities: string;
  required_skills: string[];
  preferred_skills: string[];
  eligibility: string;
  benefits: string;
  created_at: string;
}

export type ApplicationStatus = "Applied" | "Under Review" | "Assessment" | "Interview" | "Offer" | "Rejected";

export interface Application {
  id: string;
  candidate_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string;
}
