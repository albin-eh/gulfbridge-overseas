import { supabase } from "./supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

export const JOB_SELECT_COLUMNS = [
  "id", "reference_code", "title", "slug", "employer_display_name", "employer_disclosure_status",
  "country", "city", "category", "description", "responsibilities", "qualifications",
  "experience_requirements", "experience_level", "salary_min", "salary_max", "salary_currency",
  "employment_type", "benefits", "contract_duration", "vacancies_count", "working_hours",
  "weekly_rest", "accommodation", "transport", "work_permit_information", "required_documents",
  "application_deadline", "verification_status", "publication_status", "verified_at",
  "created_at", "updated_at",
].join(",");

export interface Job {
  id: number;
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
  jobId: number;
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

async function submissionError(error: Error, kind: "application" | "enquiry"): Promise<Error> {
  let code = "";
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const payload: unknown = await error.context.clone().json();
      if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
        code = payload.error;
      }
    } catch {
      return new Error(`The ${kind} service returned an unreadable error. Please try again later.`);
    }
  }

  if (code === "duplicate_application") {
    return new Error("An application with this email address has already been received for this vacancy.");
  }
  if (code === "invalid_or_unavailable_application") {
    return new Error("This vacancy is no longer accepting applications, or some details are invalid. Review the form and try again.");
  }
  if (code === "invalid_enquiry") {
    return new Error("Please review your enquiry details and try again.");
  }
  if (code === "consent_required") {
    return new Error("Please confirm the privacy notice before submitting.");
  }
  if (code === "rate_limited") {
    return new Error("Too many submissions have been made. Please wait a minute and try again.");
  }
  if (error.name === "FunctionsFetchError" || error.name === "FunctionsRelayError" || code === "service_unavailable" || code === "submission_failed") {
    return new Error(`The ${kind} service is temporarily unavailable. Please try again later.`);
  }
  return new Error(`We couldn't submit your ${kind}. Please review the details and try again.`);
}

export async function listPublishedJobs(): Promise<Job[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select<typeof JOB_SELECT_COLUMNS, Job>(JOB_SELECT_COLUMNS)
    .eq("publication_status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPublishedJob(slug: string): Promise<Job | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("jobs")
    .select<typeof JOB_SELECT_COLUMNS, Job>(JOB_SELECT_COLUMNS)
    .eq("slug", slug)
    .eq("publication_status", "published")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
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
  if (error) throw await submissionError(error, "application");
  if (!data || typeof data.reference !== "string") throw new Error("The application could not be confirmed. Please contact GulfBridge before submitting again.");
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
  if (error) throw await submissionError(error, "enquiry");
}
