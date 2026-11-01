-- Dirigentes can update audited progress; other management remains read-only.
create or replace function public.clan_valid_payload(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare schema json; t jsonb; row jsonb;
begin
 schema := '{"type":"object","required":["version","materials","movements","loans"],"additionalProperties":false,"properties":{"version":{"const":1},"materials":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name","category","total","borrowed","condition","location"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","maxLength":10000},"category":{"type":"string","maxLength":10000},"total":{"type":"integer","minimum":0,"maximum":1000000000},"borrowed":{"type":"integer","minimum":0,"maximum":1000000000},"condition":{"enum":["Bom","Rever","Reparar"]},"location":{"type":"string","maxLength":10000},"alerts":{"type":"array","maxItems":10000,"items":{"type":"object","required":["id","kind","description","items","resolved","createdAt"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"kind":{"enum":["missing","maintenance","note"]},"description":{"type":"string","minLength":1,"maxLength":2000},"items":{"type":"array","maxItems":1000,"items":{"type":"object","required":["name","quantity"],"additionalProperties":false,"properties":{"name":{"type":"string","minLength":1,"maxLength":120},"quantity":{"type":"integer","minimum":1,"maximum":1000000}}}},"resolved":{"type":"boolean"},"createdAt":{"type":"string","minLength":1,"maxLength":100}}}}}}},"movements":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","description","category","type","amount","date"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"description":{"type":"string","maxLength":10000},"category":{"type":"string","maxLength":10000},"type":{"enum":["income","expense"]},"amount":{"type":"number","exclusiveMinimum":0,"maximum":1000000000},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"}}}},"loans":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","materialId","person","quantity","due","returned"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"materialId":{"type":"string","minLength":1,"maxLength":200},"person":{"type":"string","maxLength":10000},"quantity":{"type":"integer","minimum":1,"maximum":1000000000},"due":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"returned":{"type":"boolean"}}}},"treasury":{"type":"object","required":["types","typologies","people","entries"],"additionalProperties":false,"properties":{"types":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200}}}},"typologies":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","typeId","name","priority","spendable"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"typeId":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200},"priority":{"type":"integer","minimum":0,"maximum":1000000000},"spendable":{"type":"boolean"}}}},"people":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name","active"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200},"active":{"type":"boolean"},"email":{"type":"string","maxLength":254,"pattern":"^$|^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"},"positions":{"type":"array","uniqueItems":true,"maxItems":5,"items":{"enum":["material_keeper","guide","deputy_guide","treasurer","leader_viewer"]}},"tribeId":{"anyOf":[{"type":"string","minLength":1,"maxLength":200},{"type":"null"}]}}}},"entries":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","personId","typologyId","cents","description","date","batchId"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"personId":{"type":"string","minLength":1,"maxLength":200},"typologyId":{"type":"string","minLength":1,"maxLength":200},"cents":{"type":"integer","minimum":-1000000000,"maximum":1000000000,"not":{"const":0}},"description":{"type":"string","minLength":1,"maxLength":200},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"batchId":{"anyOf":[{"type":"string","minLength":1,"maxLength":200},{"type":"null"}]}}}}}},"tribes":{"type":"array","maxItems":1000,"items":{"type":"object","required":["id","name"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":120}}}},"progress":{"type":"object","required":["catalog","records","stages"],"additionalProperties":false,"properties":{"catalog":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","code","area","title"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"code":{"type":"string","minLength":1,"maxLength":30},"area":{"enum":["F","A","C","E","I","S"]},"title":{"type":"string","minLength":1,"maxLength":200}}}},"records":{"type":"array","maxItems":50000,"items":{"type":"object","required":["personId","goalId","status","stage","notes","pending"],"additionalProperties":false,"properties":{"personId":{"type":"string","minLength":1,"maxLength":200},"goalId":{"type":"string","minLength":1,"maxLength":200},"status":{"enum":["not_started","proposed","in_progress","completed"]},"stage":{"enum":["caminho","comunidade","servico","partida"]},"notes":{"type":"string","maxLength":4000},"pending":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","title","dueDate","done"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"title":{"type":"string","minLength":1,"maxLength":300},"dueDate":{"anyOf":[{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},{"type":"null"}]},"done":{"type":"boolean"}}}}}}},"stages":{"type":"array","maxItems":50000,"items":{"type":"object","required":["personId","stage"],"additionalProperties":false,"properties":{"personId":{"type":"string","minLength":1,"maxLength":200},"stage":{"enum":["caminho","comunidade","servico","partida"]}}}}}}}}'::json;
 if not extensions.jsonb_matches_schema(schema,p) then return false;end if;
 -- Unique IDs, valid dates, relationships and exact material stock accounting.
 if exists(select 1 from jsonb_array_elements(p->'materials') m group by m->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p->'movements') m group by m->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p->'loans') m group by m->>'id' having count(*)>1) then return false;end if;
 if exists(select 1 from jsonb_array_elements(p->'loans') l where not exists(select 1 from jsonb_array_elements(p->'materials') m where m->>'id'=l->>'materialId')) then return false;end if;
 if exists(select 1 from jsonb_array_elements(p->'materials') m where (m->>'borrowed')::numeric>(m->>'total')::numeric or (m->>'borrowed')::numeric<>(select coalesce(sum((l->>'quantity')::numeric),0) from jsonb_array_elements(p->'loans') l where l->>'materialId'=m->>'id' and not (l->>'returned')::boolean)) then return false;end if;
 for row in select v from jsonb_array_elements(p->'movements') v loop perform (row->>'date')::date;end loop;
 for row in select v from jsonb_array_elements(p->'loans') v loop perform (row->>'due')::date;end loop;

 if exists(select 1 from jsonb_array_elements(coalesce(p->'tribes','[]')) v group by v->>'id' having count(*)>1) then return false;end if;
 if exists(select 1 from jsonb_array_elements(coalesce(p->'treasury'->'people','[]')) v where nullif(v->>'tribeId','') is not null and not exists(select 1 from jsonb_array_elements(coalesce(p->'tribes','[]')) g where g->>'id'=v->>'tribeId')) then return false;end if;
 if exists(select 1 from jsonb_array_elements(coalesce(p->'treasury'->'people','[]')) v where nullif(v->>'email','') is not null group by lower(v->>'email') having count(*)>1) then return false;end if;
 for row in select a from jsonb_array_elements(p->'materials') m cross join lateral jsonb_array_elements(coalesce(m->'alerts','[]')) a loop
  if row->>'kind'='missing' and jsonb_array_length(row->'items')=0 then return false;end if;
  perform (row->>'createdAt')::timestamptz;
 end loop;
 if exists(select 1 from jsonb_array_elements(p->'materials') m where (select count(*) from jsonb_array_elements(coalesce(m->'alerts','[]')))<>(select count(distinct a->>'id') from jsonb_array_elements(coalesce(m->'alerts','[]')) a)) then return false;end if;

 if p ? 'progress' then
  if exists(select 1 from jsonb_array_elements(p->'progress'->'catalog') g group by g->>'id' having count(*)>1) or exists(select 1 from jsonb_array_elements(p->'progress'->'stages') s group by s->>'personId' having count(*)>1) or exists(select 1 from jsonb_array_elements(p->'progress'->'records') r group by r->>'personId',r->>'goalId' having count(*)>1) then return false;end if;
  if exists(select 1 from jsonb_array_elements(p->'progress'->'records') r where not exists(select 1 from jsonb_array_elements(coalesce(p->'treasury'->'people','[]')) person where person->>'id'=r->>'personId') or not exists(select 1 from jsonb_array_elements(p->'progress'->'catalog') g where g->>'id'=r->>'goalId')) then return false;end if;
  if exists(select 1 from jsonb_array_elements(p->'progress'->'stages') r where not exists(select 1 from jsonb_array_elements(coalesce(p->'treasury'->'people','[]')) person where person->>'id'=r->>'personId')) then return false;end if;
  if exists(select 1 from jsonb_array_elements(p->'progress'->'records') r where (select count(*) from jsonb_array_elements(r->'pending'))<>(select count(distinct t->>'id') from jsonb_array_elements(r->'pending') t)) then return false;end if;
  for row in select task from jsonb_array_elements(p->'progress'->'records') r cross join lateral jsonb_array_elements(r->'pending') task where task->>'dueDate' is not null loop perform (row->>'dueDate')::date;end loop;
 end if;
 if not p ? 'treasury' then return true;end if;
 t:=p->'treasury';
 if exists(select 1 from jsonb_array_elements(t->'types') v group by v->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(t->'typologies') v group by v->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(t->'people') v group by v->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(t->'entries') v group by v->>'id' having count(*)>1) then return false;end if;
 if exists(select 1 from jsonb_array_elements(t->'typologies') c where not exists(select 1 from jsonb_array_elements(t->'types') g where g->>'id'=c->>'typeId')) then return false;end if;
 if exists(select 1 from jsonb_array_elements(t->'entries') e where not exists(select 1 from jsonb_array_elements(t->'people') v where v->>'id'=e->>'personId') or not exists(select 1 from jsonb_array_elements(t->'typologies') v where v->>'id'=e->>'typologyId')) then return false;end if;
 if exists(select 1 from jsonb_array_elements(t->'entries') e group by e->>'personId',e->>'typologyId' having sum((e->>'cents')::numeric)<0) then return false;end if;
 for row in select v from jsonb_array_elements(t->'entries') v loop perform (row->>'date')::date;end loop;
 return true;
exception when others then return false;
end;$$;



create or replace function public.clan_permissions() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare member_role text; member_email text; assigned jsonb; material_access boolean:=false; finance_access boolean:=false;
begin
 select role,lower(email) into member_role,member_email from public.clan_members where user_id=auth.uid();
 if member_role='admin' then return jsonb_build_object('admin',true,'material',true,'finance',true,'progress',true);end if;
 if member_role is null or member_role not in ('member','treasurer') then return jsonb_build_object('admin',false,'material',false,'finance',false,'progress',false);end if;
 select p->'positions' into assigned from public.clan_state s cross join lateral jsonb_array_elements(coalesce(s.payload->'treasury'->'people','[]')) p where s.id=1 and lower(p->>'email')=member_email and (p->>'active')::boolean;
 if coalesce(assigned ? 'leader_viewer',false) then return jsonb_build_object('admin',false,'material',false,'finance',false,'progress',true);end if;
 material_access:=coalesce(assigned ?| array['material_keeper','guide','deputy_guide'],false);
 finance_access:=coalesce(assigned ?| array['treasurer','guide','deputy_guide'],false);
 return jsonb_build_object('admin',false,'material',material_access,'finance',finance_access,'progress',false);
end;$$;
revoke all on function public.clan_permissions() from public,anon;
grant execute on function public.clan_permissions() to authenticated;


create table public.clan_progress_logs(
 id bigint generated always as identity primary key,
 person_id text,
 actor_user_id uuid references auth.users(id) on delete set null,
 actor_label text not null,
 created_at timestamptz not null default now(),
 previous_value jsonb not null,
 next_value jsonb not null
);
create index clan_progress_logs_person_created on public.clan_progress_logs(person_id,created_at desc);
create index clan_progress_logs_created on public.clan_progress_logs(created_at desc);
alter table public.clan_progress_logs enable row level security;
revoke all on public.clan_progress_logs from anon,authenticated;
grant select on public.clan_progress_logs to authenticated;
create policy progress_log_read on public.clan_progress_logs for select to authenticated using ((select public.clan_role()) in ('member','treasurer','admin'));

create or replace function public.save_clan_state(new_payload jsonb,expected_revision integer)
returns table(revision integer) language plpgsql security definer set search_path='' as $$
declare old_state public.clan_state; actor_role text; permissions jsonb; person text; before_value jsonb; after_value jsonb; actor text;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN';end if;
 if pg_column_size(new_payload)>5000000 or not public.clan_valid_payload(new_payload) then raise exception 'INVALID_DATA';end if;
 select * into old_state from public.clan_state where id=1 for update;
 actor_role:=public.clan_role();
 if actor_role is null or actor_role not in ('member','treasurer','admin') then raise exception 'FORBIDDEN';end if;
 if old_state.revision<>expected_revision then raise exception 'CONFLICT';end if;
 permissions:=public.clan_permissions();
 if not (permissions->>'admin')::boolean then
  if coalesce(new_payload->'tribes','[]') is distinct from coalesce(old_state.payload->'tribes','[]') or coalesce(new_payload->'treasury'->'people','[]') is distinct from coalesce(old_state.payload->'treasury'->'people','[]') then raise exception 'FORBIDDEN_DIRECTORY';end if;
  if not (permissions->>'material')::boolean and (new_payload->'materials' is distinct from old_state.payload->'materials' or new_payload->'loans' is distinct from old_state.payload->'loans') then raise exception 'FORBIDDEN_MATERIAL';end if;
  if not (permissions->>'finance')::boolean and (new_payload->'movements' is distinct from old_state.payload->'movements' or (coalesce(new_payload->'treasury','{}')-'people') is distinct from (coalesce(old_state.payload->'treasury','{}')-'people')) then raise exception 'FORBIDDEN_FINANCE';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(old_state.payload->'treasury'->'entries','[]')) old_entry where not exists(select 1 from jsonb_array_elements(coalesce(new_payload->'treasury'->'entries','[]')) new_entry where new_entry=old_entry)) then raise exception 'FORBIDDEN_HISTORY';end if;
 end if;
 if not (permissions->>'progress')::boolean and coalesce(new_payload->'progress','{}') is distinct from coalesce(old_state.payload->'progress','{}') then raise exception 'FORBIDDEN_PROGRESS';end if;
 if new_payload->'progress' is distinct from old_state.payload->'progress' then
  select coalesce((select p->>'name' from jsonb_array_elements(coalesce(old_state.payload->'treasury'->'people','[]')) p where lower(p->>'email')=lower(m.email) limit 1),m.email) into actor from public.clan_members m where user_id=auth.uid();
  for person in select id from (
   select r->>'personId' id from jsonb_array_elements(coalesce(old_state.payload->'progress'->'records','[]')) r
   union select r->>'personId' from jsonb_array_elements(coalesce(new_payload->'progress'->'records','[]')) r
   union select r->>'personId' from jsonb_array_elements(coalesce(old_state.payload->'progress'->'stages','[]')) r
   union select r->>'personId' from jsonb_array_elements(coalesce(new_payload->'progress'->'stages','[]')) r
  ) ids where id is not null loop
   before_value:=jsonb_build_object('records',(select coalesce(jsonb_agg(r order by r->>'goalId'),'[]') from jsonb_array_elements(coalesce(old_state.payload->'progress'->'records','[]')) r where r->>'personId'=person),'stage',(select s from jsonb_array_elements(coalesce(old_state.payload->'progress'->'stages','[]')) s where s->>'personId'=person limit 1));
   after_value:=jsonb_build_object('records',(select coalesce(jsonb_agg(r order by r->>'goalId'),'[]') from jsonb_array_elements(coalesce(new_payload->'progress'->'records','[]')) r where r->>'personId'=person),'stage',(select s from jsonb_array_elements(coalesce(new_payload->'progress'->'stages','[]')) s where s->>'personId'=person limit 1));
   if before_value is distinct from after_value then insert into public.clan_progress_logs(person_id,actor_user_id,actor_label,previous_value,next_value) values(person,auth.uid(),actor,before_value,after_value);end if;
  end loop;
  if old_state.payload->'progress'->'catalog' is distinct from new_payload->'progress'->'catalog' then insert into public.clan_progress_logs(person_id,actor_user_id,actor_label,previous_value,next_value) values(null,auth.uid(),actor,jsonb_build_object('catalog',old_state.payload->'progress'->'catalog'),jsonb_build_object('catalog',new_payload->'progress'->'catalog'));end if;
 end if;
 insert into public.clan_history(revision,payload,replaced_by) values(old_state.revision,old_state.payload,auth.uid());
 update public.clan_state set payload=new_payload,revision=old_state.revision+1,updated_at=now(),updated_by=auth.uid() where id=1;
 return query select old_state.revision+1;
end;$$;
