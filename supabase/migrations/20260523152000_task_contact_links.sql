alter table tasks
  add column if not exists company_id text references companies(id) on delete set null,
  add column if not exists contact_id text references contacts(id) on delete set null,
  add column if not exists project_contact_id text references project_contacts(id) on delete set null;

create index if not exists idx_tasks_company on tasks(company_id);
create index if not exists idx_tasks_contact on tasks(contact_id);
create index if not exists idx_tasks_project_contact on tasks(project_contact_id);

notify pgrst, 'reload schema';
