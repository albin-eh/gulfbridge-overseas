import { supabase } from "./supabase";

export interface Job {
  id: string;
  reference_code: string;
  title: string;
  slug: string;
  employer_display_name: string | null;
  employer_disclosure_status: string;
  country: string;
  city: string | null;
  category: string;
  description: string | null;
  responsibilities: string | null;
  qualifications: string | null;
  experience_requirements: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  employment_type: string | null;
  benefits: string | null;
  contract_duration: string | null;
  vacancies_count: number | null;
  working_hours: string | null;
  weekly_rest: string | null;
  accommodation: string | null;
  transport: string | null;
  work_permit_information: string | null;
  required_documents: string | null;
  application_deadline: string | null;
  verification_status: string;
  publication_status: string;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationInput {
  jobId: string;
  applicantName: string;
  email: string;
  phone: string;
  currentLocation: string;
  preferredDestination: string;
  experience: string;
  qualifications: string;
  message: string;
}

export interface EnquiryInput {
  name: string;
  email: string;
  phone: string;
  enquiryType: string;
  message: string;
}

export async function listPublishedJobs(): Promise<Job[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("publication_status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function getPublishedJob(slug: string): Promise<Job | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data as Job | null) ?? null;
}

export async function submitApplication(input: ApplicationInput): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.functions.invoke("public-submission", {
    body: {
      kind: "application",
      jobId: input.jobId,
      applicantName: input.applicantName,
      email: input.email,
      phone: input.phone,
      currentLocation: input.currentLocation,
      preferredDestination: input.preferredDestination,
      experience: input.experience,
      qualifications: input.qualifications,
      message: input.message || null,
      privacyConsent: true,
      privacyNoticeVersion: "2026-10-20",
    },
  });
  if (error) throw error;
  if (!data || typeof data.reference !== "string") throw new Error("The submission did not return an application reference.");
  return data.reference;
}

export async function submitEnquiry(input: EnquiryInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.functions.invoke("public-submission", {
    body: {
      kind: "enquiry",
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      enquiryType: input.enquiryType,
      message: input.message,
      consent: true,
    },
  });
  if (error) throw error;
}
