create table public.filings (
  id bigserial primary key,
  company_id bigint references public.companies(id) on delete cascade not null,
  form_type text not null,
  accession_number text unique not null,
  filed_date date,
  doc_url text,
  created_at timestamptz default now() not null
);
alter table public.filings enable row level security;
create policy "Authenticated users can view filings"
  on public.filings for select using (auth.role() = 'authenticated');
create index idx_filings_company_id on public.filings(company_id);
