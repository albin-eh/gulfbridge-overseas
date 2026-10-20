create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'candidate' check (role in ('candidate', 'admin')),
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  title text not null check (length(trim(title)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  employer_display_name text,
  employer_disclosure_status text not null default 'awaiting_confirmation'
    check (employer_disclosure_status in ('disclosed', 'confidential', 'awaiting_confirmation')),
  country text not null check (length(trim(country)) between 2 and 80),
  city text,
  category text not null check (length(trim(category)) between 2 and 100),
  description text,
  responsibilities text,
  qualifications text,
  experience_requirements text,
  experience_level text check (experience_level is null or experience_level in ('Entry', 'Mid', 'Senior')),
  salary_min numeric(12, 2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(12, 2) check (salary_max is null or salary_max >= 0),
  salary_currency text,
  employment_type text,
  benefits text,
  contract_duration text,
  vacancies_count integer check (vacancies_count is null or vacancies_count > 0),
  working_hours text,
  weekly_rest text,
  accommodation text,
  transport text,
  work_permit_information text,
  required_documents text,
  application_deadline date,
  verification_status text not null default 'awaiting_confirmation'
    check (verification_status in ('awaiting_confirmation', 'verified', 'unverified')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'paused', 'closed', 'archived')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_max >= salary_min),
  check (
    employer_disclosure_status <> 'disclosed'
    or length(trim(coalesce(employer_display_name, ''))) >= 2
  ),
  check (verification_status <> 'verified' or verified_at is not null),
  check (publication_status <> 'published' or (verification_status = 'verified' and verified_at is not null))
);

create table public.employer_verifications (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  employer_legal_name text,
  partner_registration_details text,
  verification_notes text,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    verified_at is null
    or (verified_by is not null and length(trim(coalesce(verification_notes, ''))) >= 5)
  )
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  job_id uuid not null references public.jobs (id) on delete restrict,
  applicant_name text not null check (length(trim(applicant_name)) between 2 and 120),
  email text not null check (length(email) <= 254),
  phone text not null check (
    length(trim(phone)) between 7 and 30
    and trim(phone) ~ '^\+[1-9][0-9 ()-]{5,24}$'
  ),
  current_location text not null check (length(trim(current_location)) between 2 and 160),
  preferred_destination text not null check (length(trim(preferred_destination)) between 2 and 80),
  experience text not null check (length(trim(experience)) between 1 and 4000),
  qualifications text not null check (length(trim(qualifications)) between 1 and 2000),
  message text check (message is null or length(message) <= 1000),
  privacy_consent boolean not null check (privacy_consent),
  privacy_notice_version text not null,
  status text not null default 'received'
    check (status in ('received', 'under_review', 'shortlisted', 'interview_scheduled', 'employer_decision_pending', 'closed')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, email)
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  email text not null check (length(email) <= 254),
  phone text check (
    phone is null
    or (
      length(trim(phone)) between 7 and 30
      and trim(phone) ~ '^\+[1-9][0-9 ()-]{5,24}$'
    )
  ),
  enquiry_type text not null check (enquiry_type in ('candidate', 'employer', 'general')),
  message text not null check (length(trim(message)) between 2 and 3000),
  consent boolean not null check (consent),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  record_type text not null,
  record_id text,
  created_at timestamptz not null default now()
);

create table public.public_submission_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create index jobs_publication_created_idx on public.jobs (publication_status, created_at desc);
create index jobs_country_category_idx on public.jobs (country, category);
create index applications_created_idx on public.applications (created_at desc);
create index applications_status_idx on public.applications (status, created_at desc);
create index applications_email_lower_idx on public.applications (lower(email));
create index enquiries_created_idx on public.enquiries (created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_record_idx on public.audit_logs (record_type, record_id);
create index public_submission_rate_limits_window_idx on public.public_submission_rate_limits (window_started_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'candidate')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_id text;
  action_name text;
begin
  if tg_op = 'INSERT' then
    changed_id := new.id::text;
    action_name := 'create';
  elsif tg_op = 'UPDATE' then
    changed_id := new.id::text;
    action_name := 'update';
  else
    changed_id := old.id::text;
    action_name := 'delete';
  end if;

  insert into public.audit_logs (actor_id, action, record_type, record_id)
  values (auth.uid(), action_name, tg_table_name, changed_id);
  return null;
end;
$$;

create or replace function public.write_employer_verification_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_job_id uuid;
begin
  if tg_op = 'DELETE' then
    changed_job_id := old.job_id;
  else
    changed_job_id := new.job_id;
  end if;
  insert into public.audit_logs (actor_id, action, record_type, record_id)
  values (auth.uid(), lower(tg_op), 'employer_verifications', changed_job_id::text);
  return null;
end;
$$;

create or replace function public.set_employer_verification_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enforce_job_verification_before_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publication_status = 'published'
    and not exists (
      select 1
      from public.employer_verifications
      where job_id = new.id
        and verified_at is not null
        and length(trim(coalesce(verification_notes, ''))) >= 5
    )
  then
    raise exception using errcode = '23514', message = 'private_employer_verification_required';
  end if;
  return new;
end;
$$;

create or replace function public.keep_published_job_verified()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.verified_at is null
    and exists (
      select 1 from public.jobs
      where id = new.job_id and publication_status = 'published'
    )
  then
    raise exception using errcode = '23514', message = 'unpublish_job_before_reversing_verification';
  end if;
  return new;
end;
$$;

create trigger jobs_require_private_verification_on_insert
before insert on public.jobs
for each row execute function public.enforce_job_verification_before_publish();

create trigger jobs_require_private_verification_on_publish
before update of publication_status on public.jobs
for each row execute function public.enforce_job_verification_before_publish();

create trigger employer_verifications_keep_published_job_verified
before update on public.employer_verifications
for each row execute function public.keep_published_job_verified();

create trigger employer_verifications_set_updated_at
before update on public.employer_verifications
for each row execute function public.set_employer_verification_updated_at();

create trigger jobs_audit_log
after insert or update or delete on public.jobs
for each row execute function public.write_audit_log();

create trigger applications_audit_log
after insert or update or delete on public.applications
for each row execute function public.write_audit_log();

create trigger enquiries_audit_log
after insert or update or delete on public.enquiries
for each row execute function public.write_audit_log();

create trigger employer_verifications_audit_log
after insert or update or delete on public.employer_verifications
for each row execute function public.write_employer_verification_audit();

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.enquiries enable row level security;
alter table public.audit_logs enable row level security;
alter table public.employer_verifications enable row level security;
alter table public.public_submission_rate_limits enable row level security;

create policy "Users can read own profile or admins can read profiles"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Public can read published jobs"
on public.jobs for select to anon, authenticated
using (publication_status = 'published' and (application_deadline is null or application_deadline >= current_date));
create policy "Admins can read all jobs"
on public.jobs for select to authenticated
using ((select public.is_admin()));
create policy "Admins can create jobs"
on public.jobs for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins can update jobs"
on public.jobs for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins can delete jobs"
on public.jobs for delete to authenticated
using ((select public.is_admin()));

create policy "Admins can read employer verification records"
on public.employer_verifications for select to authenticated
using ((select public.is_admin()));
create policy "Admins can create employer verification records"
on public.employer_verifications for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins can update employer verification records"
on public.employer_verifications for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can read applications"
on public.applications for select to authenticated
using ((select public.is_admin()));
create policy "Admins can update applications"
on public.applications for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins can delete applications"
on public.applications for delete to authenticated
using ((select public.is_admin()));

create policy "Admins can read enquiries"
on public.enquiries for select to authenticated
using ((select public.is_admin()));
create policy "Admins can delete enquiries"
on public.enquiries for delete to authenticated
using ((select public.is_admin()));

create policy "Admins can read audit logs"
on public.audit_logs for select to authenticated
using ((select public.is_admin()));

revoke all on public.profiles, public.jobs, public.employer_verifications, public.applications, public.enquiries, public.audit_logs, public.public_submission_rate_limits from anon, authenticated;
grant select on public.jobs to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update on public.employer_verifications to authenticated;
grant select, update, delete on public.applications to authenticated;
grant select, delete on public.enquiries to authenticated;
grant select on public.audit_logs to authenticated;

create or replace function public.check_public_submission_rate_limit(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) <> 64 then
    raise exception using errcode = '22023', message = 'invalid_request';
  end if;

  insert into public.public_submission_rate_limits (ip_hash, window_started_at, request_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
  set window_started_at = case
        when now() - public.public_submission_rate_limits.window_started_at >= interval '1 minute' then now()
        else public.public_submission_rate_limits.window_started_at
      end,
      request_count = case
        when now() - public.public_submission_rate_limits.window_started_at >= interval '1 minute' then 1
        else public.public_submission_rate_limits.request_count + 1
      end
  returning request_count into current_count;

  if current_count > 5 then
    raise exception using errcode = 'P0001', message = 'rate_limited';
  end if;
end;
$$;

create or replace function public.submit_application(
  p_job_id uuid,
  p_applicant_name text,
  p_email text,
  p_phone text,
  p_current_location text,
  p_preferred_destination text,
  p_experience text,
  p_qualifications text,
  p_message text,
  p_privacy_consent boolean,
  p_privacy_notice_version text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_reference text;
begin
  if p_privacy_consent is distinct from true
    or length(trim(coalesce(p_applicant_name, ''))) not between 2 and 120
    or length(trim(coalesce(p_email, ''))) > 254
    or trim(coalesce(p_email, '')) !~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)+$'
    or length(trim(coalesce(p_phone, ''))) not between 7 and 30
    or trim(coalesce(p_phone, '')) !~ '^\+[1-9][0-9 ()-]{5,24}$'
    or length(trim(coalesce(p_current_location, ''))) not between 2 and 160
    or length(trim(coalesce(p_preferred_destination, ''))) not between 2 and 80
    or length(trim(coalesce(p_experience, ''))) not between 1 and 4000
    or length(trim(coalesce(p_qualifications, ''))) not between 1 and 2000
    or length(coalesce(p_message, '')) > 1000
    or length(trim(coalesce(p_privacy_notice_version, ''))) not between 1 and 40
    or trim(coalesce(p_preferred_destination, '')) not in ('UAE', 'Saudi Arabia', 'Qatar', 'Oman', 'Kuwait')
  then
    raise exception using errcode = '22023', message = 'invalid_application';
  end if;

  if not exists (
    select 1 from public.jobs
    where id = p_job_id
      and publication_status = 'published'
      and verification_status = 'verified'
      and (application_deadline is null or application_deadline >= current_date)
  ) then
    raise exception using errcode = '22023', message = 'vacancy_unavailable';
  end if;

  generated_reference := 'GB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.applications (
    reference_code, job_id, applicant_name, email, phone, current_location,
    preferred_destination, experience, qualifications, message, privacy_consent,
    privacy_notice_version
  )
  values (
    generated_reference, p_job_id, trim(p_applicant_name), lower(trim(p_email)),
    trim(p_phone), trim(p_current_location), trim(p_preferred_destination),
    trim(p_experience), trim(p_qualifications), nullif(trim(coalesce(p_message, '')), ''),
    true, p_privacy_notice_version
  );
  return generated_reference;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'duplicate_application';
end;
$$;

create or replace function public.submit_enquiry(
  p_name text,
  p_email text,
  p_phone text,
  p_enquiry_type text,
  p_message text,
  p_consent boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_consent is distinct from true
    or length(trim(coalesce(p_name, ''))) not between 2 and 120
    or length(trim(coalesce(p_email, ''))) > 254
    or trim(coalesce(p_email, '')) !~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)+$'
    or (
      p_phone is not null
      and (
        length(trim(p_phone)) not between 7 and 30
        or trim(p_phone) !~ '^\+[1-9][0-9 ()-]{5,24}$'
      )
    )
    or p_enquiry_type not in ('candidate', 'employer', 'general')
    or length(trim(coalesce(p_message, ''))) not between 2 and 3000
  then
    raise exception using errcode = '22023', message = 'invalid_enquiry';
  end if;
  insert into public.enquiries (name, email, phone, enquiry_type, message, consent)
  values (trim(p_name), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''), p_enquiry_type, trim(p_message), true);
end;
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.check_public_submission_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_public_submission_rate_limit(text) to service_role;
revoke all on function public.submit_application(uuid, text, text, text, text, text, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.submit_application(uuid, text, text, text, text, text, text, text, text, boolean, text) to service_role;
revoke all on function public.submit_enquiry(text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.submit_enquiry(text, text, text, text, text, boolean) to service_role;

-- Administrator access is provisioned through public.admin_users by the
-- follow-up migration; profile roles are not used for authorization.
