do $$
begin
  if to_regclass('public.jobs') is null
    or exists (
      select required.column_name
      from (values
        ('publication_status'),
        ('verification_status'),
        ('verified_at'),
        ('employer_display_name'),
        ('employer_disclosure_status'),
        ('qualifications'),
        ('employment_type')
      ) as required(column_name)
      where not exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'jobs'
          and c.column_name = required.column_name
      )
    )
  then
    raise exception 'Apply 20261022000000_legacy_jobs_compatibility.sql before this migration.';
  end if;
end;
$$;

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

do $$
begin
  if to_regclass('public.employer_verifications') is not null then
    execute 'drop trigger if exists employer_verifications_keep_published_job_verified on public.employer_verifications';
    execute 'drop trigger if exists employer_verifications_set_updated_at on public.employer_verifications';
    execute 'drop trigger if exists employer_verifications_audit_log on public.employer_verifications';
    execute 'drop policy if exists "Admins can read employer verification records" on public.employer_verifications';
    execute 'drop policy if exists "Admins can create employer verification records" on public.employer_verifications';
    execute 'drop policy if exists "Admins can update employer verification records" on public.employer_verifications';
    execute 'revoke all on public.employer_verifications from public, anon, authenticated';
  end if;
end;
$$;

drop function if exists public.keep_published_job_verified();
drop function if exists public.write_employer_verification_audit();
