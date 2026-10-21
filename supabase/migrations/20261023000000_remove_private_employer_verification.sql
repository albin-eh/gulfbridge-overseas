create or replace function public.sync_legacy_job_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status
    and new.publication_status is not distinct from old.publication_status
  then
    new.publication_status := new.status;
  else
    new.status := case
      when new.publication_status in ('published', 'closed') then new.publication_status
      else 'draft'
    end;
  end if;

  if new.employer_disclosure_status <> 'disclosed' then
    new.employer_display_name := null;
  end if;
  new.employer := coalesce(nullif(btrim(new.employer_display_name), ''), 'Confidential');
  new.requirements := new.qualifications;
  new.job_type := new.employment_type;
  new.updated_at := now();

  if new.publication_status = 'published'
    and (new.verification_status <> 'verified' or new.verified_at is null)
  then
    raise exception using errcode = '23514', message = 'vacancy_verification_required';
  end if;

  return new;
end;
$$;

drop trigger if exists employer_verifications_keep_published_job_verified on public.employer_verifications;
drop trigger if exists employer_verifications_set_updated_at on public.employer_verifications;
drop trigger if exists employer_verifications_audit_log on public.employer_verifications;
drop function if exists public.keep_published_job_verified();
drop function if exists public.write_employer_verification_audit();

drop policy if exists "Admins can read employer verification records" on public.employer_verifications;
drop policy if exists "Admins can create employer verification records" on public.employer_verifications;
drop policy if exists "Admins can update employer verification records" on public.employer_verifications;
revoke all on public.employer_verifications from public, anon, authenticated;
