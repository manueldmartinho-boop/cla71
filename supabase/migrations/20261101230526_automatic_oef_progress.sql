create or replace function public.clan_valid_payload(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare schema json; t jsonb; row jsonb;
begin
 schema := '{"type":"object","required":["version","materials","movements","loans"],"additionalProperties":false,"properties":{"version":{"const":1},"materials":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name","category","total","borrowed","condition","location"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","maxLength":10000},"category":{"type":"string","maxLength":10000},"total":{"type":"integer","minimum":0,"maximum":1000000000},"borrowed":{"type":"integer","minimum":0,"maximum":1000000000},"condition":{"enum":["Bom","Rever","Reparar"]},"location":{"type":"string","maxLength":10000},"alerts":{"type":"array","maxItems":10000,"items":{"type":"object","required":["id","kind","description","items","resolved","createdAt"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"kind":{"enum":["missing","maintenance","note"]},"description":{"type":"string","minLength":1,"maxLength":2000},"items":{"type":"array","maxItems":1000,"items":{"type":"object","required":["name","quantity"],"additionalProperties":false,"properties":{"name":{"type":"string","minLength":1,"maxLength":120},"quantity":{"type":"integer","minimum":1,"maximum":1000000}}}},"resolved":{"type":"boolean"},"createdAt":{"type":"string","minLength":1,"maxLength":100}}}}}}},"movements":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","description","category","type","amount","date"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"description":{"type":"string","maxLength":10000},"category":{"type":"string","maxLength":10000},"type":{"enum":["income","expense"]},"amount":{"type":"number","exclusiveMinimum":0,"maximum":1000000000},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"}}}},"loans":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","materialId","person","quantity","due","returned"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"materialId":{"type":"string","minLength":1,"maxLength":200},"person":{"type":"string","maxLength":10000},"quantity":{"type":"integer","minimum":1,"maximum":1000000000},"due":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"returned":{"type":"boolean"}}}},"treasury":{"type":"object","required":["types","typologies","people","entries"],"additionalProperties":false,"properties":{"types":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200}}}},"typologies":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","typeId","name","priority","spendable"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"typeId":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200},"priority":{"type":"integer","minimum":0,"maximum":1000000000},"spendable":{"type":"boolean"}}}},"people":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name","active"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200},"active":{"type":"boolean"},"email":{"type":"string","maxLength":254,"pattern":"^$|^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"},"positions":{"type":"array","uniqueItems":true,"maxItems":5,"items":{"enum":["material_keeper","guide","deputy_guide","treasurer","leader_viewer"]}},"tribeId":{"anyOf":[{"type":"string","minLength":1,"maxLength":200},{"type":"null"}]}}}},"entries":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","personId","typologyId","cents","description","date","batchId"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"personId":{"type":"string","minLength":1,"maxLength":200},"typologyId":{"type":"string","minLength":1,"maxLength":200},"cents":{"type":"integer","minimum":-1000000000,"maximum":1000000000,"not":{"const":0}},"description":{"type":"string","minLength":1,"maxLength":200},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"batchId":{"anyOf":[{"type":"string","minLength":1,"maxLength":200},{"type":"null"}]}}}}}},"tribes":{"type":"array","maxItems":1000,"items":{"type":"object","required":["id","name"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":120}}}},"progress":{"type":"object","required":["catalog","records","stages"],"additionalProperties":false,"properties":{"catalog":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","code","area","title"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"code":{"type":"string","minLength":1,"maxLength":30},"area":{"enum":["F","A","C","E","I","S"]},"title":{"type":"string","minLength":1,"maxLength":200},"trailId":{"type":"string","enum":["F-1","F-2","F-3","A-1","A-2","A-3","C-1","C-2","C-3","E-1","E-2","E-3","I-1","I-2","I-3","S-1","S-2","S-3"]}}}},"records":{"type":"array","maxItems":50000,"items":{"type":"object","required":["personId","goalId","status","stage","notes","pending"],"additionalProperties":false,"properties":{"personId":{"type":"string","minLength":1,"maxLength":200},"goalId":{"type":"string","minLength":1,"maxLength":200},"status":{"enum":["not_started","proposed","in_progress","completed"]},"stage":{"enum":["caminho","comunidade","servico","partida"]},"notes":{"type":"string","maxLength":4000},"pending":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","title","dueDate","done"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"title":{"type":"string","minLength":1,"maxLength":300},"dueDate":{"anyOf":[{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},{"type":"null"}]},"done":{"type":"boolean"}}}}}}},"stages":{"type":"array","maxItems":50000,"items":{"type":"object","required":["personId","stage"],"additionalProperties":false,"properties":{"personId":{"type":"string","minLength":1,"maxLength":200},"stage":{"enum":["caminho","comunidade","servico","partida"]}}}},"milestones":{"type":"array","maxItems":50000,"items":{"type":"object","required":["personId","commitmentDate","departureDate","departureReason"],"additionalProperties":false,"properties":{"personId":{"type":"string","minLength":1,"maxLength":200},"commitmentDate":{"anyOf":[{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},{"type":"null"}]},"departureDate":{"anyOf":[{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},{"type":"null"}]},"departureReason":{"type":"string","maxLength":4000}}}}}}}}'::json;
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
  if exists(select 1 from jsonb_array_elements(p->'progress'->'records') r where (select count(*) from jsonb_array_elements(r->'pending'))<>(select count(distinct pending_item->>'id') from jsonb_array_elements(r->'pending') pending_item)) then return false;end if;
  for row in select task from jsonb_array_elements(p->'progress'->'records') r cross join lateral jsonb_array_elements(r->'pending') task where task->>'dueDate' is not null loop perform (row->>'dueDate')::date;end loop;
 end if;
 if p ? 'progress' then
  if exists(select 1 from jsonb_array_elements(p->'progress'->'catalog') g where g ? 'trailId' and left(g->>'trailId',1)<>g->>'area') then return false;end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p->'progress'->'milestones','[]')) m group by m->>'personId' having count(*)>1) then return false;end if;
  for row in select m from jsonb_array_elements(coalesce(p->'progress'->'milestones','[]')) m loop
   if not exists(select 1 from jsonb_array_elements(coalesce(p->'treasury'->'people','[]')) person_entry where person_entry->>'id'=row->>'personId') then return false;end if;
   if row->>'commitmentDate' is not null then perform (row->>'commitmentDate')::date;end if;
   if row->>'departureDate' is not null then
    perform (row->>'departureDate')::date;
    if row->>'commitmentDate' is null or row->>'departureDate'<row->>'commitmentDate' or length(trim(row->>'departureReason'))=0 then return false;end if;
   end if;
  end loop;
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

-- Educational stage follows validated OEF in every area, never a manually selected stage.
create or replace function public.clan_progress_stage(p jsonb,person_id text) returns text language sql immutable set search_path='' as $$
 with counts as (
  select a.area, count(distinct r->>'goalId') filter(where r->>'personId'=person_id and r->>'status'='completed' and r->>'goalId'=a.area||n::text) completed
  from (values ('F',6),('A',6),('C',8),('E',8),('I',7),('S',7)) a(area,total)
  cross join lateral generate_series(1,a.total) n
  left join lateral jsonb_array_elements(coalesce(p->'records','[]')) r on r->>'goalId'=a.area||n::text
  group by a.area
 )
 select case when not exists(select 1 from jsonb_array_elements(coalesce(p->'milestones','[]')) m where m->>'personId'=person_id and m->>'commitmentDate' is not null) then 'caminho'
  when bool_and(completed>=5) then 'partida'
  when bool_and(completed>=2) then 'servico' else 'comunidade' end from counts;
$$;
revoke all on function public.clan_progress_stage(jsonb,text) from public,anon;
grant execute on function public.clan_progress_stage(jsonb,text) to authenticated;

-- Approved members may register loans and returns without editing the inventory.
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
  if not (permissions->>'material')::boolean then
   -- All approved members may append loans and record returns. Inventory details remain protected.
   if jsonb_array_length(new_payload->'materials')<>jsonb_array_length(old_state.payload->'materials')
    or exists(select 1 from jsonb_array_elements(old_state.payload->'materials') old_m where not exists(select 1 from jsonb_array_elements(new_payload->'materials') new_m where new_m->>'id'=old_m->>'id' and new_m-'borrowed'=old_m-'borrowed'))
    then raise exception 'FORBIDDEN_MATERIAL';end if;
   if exists(select 1 from jsonb_array_elements(old_state.payload->'loans') old_l where not exists(select 1 from jsonb_array_elements(new_payload->'loans') new_l where new_l=old_l or (new_l-'returned'=old_l-'returned' and not (old_l->>'returned')::boolean and (new_l->>'returned')::boolean)))
    or exists(select 1 from jsonb_array_elements(new_payload->'loans') new_l where (new_l->>'returned')::boolean and not exists(select 1 from jsonb_array_elements(old_state.payload->'loans') old_l where old_l->>'id'=new_l->>'id'))
    then raise exception 'FORBIDDEN_LOANS';end if;
  end if;
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
   union select r->>'personId' from jsonb_array_elements(coalesce(old_state.payload->'progress'->'milestones','[]')) r
   union select r->>'personId' from jsonb_array_elements(coalesce(new_payload->'progress'->'milestones','[]')) r
  ) ids where id is not null loop
   before_value:=jsonb_build_object('records',(select coalesce(jsonb_agg(r order by r->>'goalId'),'[]') from jsonb_array_elements(coalesce(old_state.payload->'progress'->'records','[]')) r where r->>'personId'=person),'stage',jsonb_build_object('stage',public.clan_progress_stage(old_state.payload->'progress',person)),'milestone',(select m from jsonb_array_elements(coalesce(old_state.payload->'progress'->'milestones','[]')) m where m->>'personId'=person limit 1));
   after_value:=jsonb_build_object('records',(select coalesce(jsonb_agg(r order by r->>'goalId'),'[]') from jsonb_array_elements(coalesce(new_payload->'progress'->'records','[]')) r where r->>'personId'=person),'stage',jsonb_build_object('stage',public.clan_progress_stage(new_payload->'progress',person)),'milestone',(select m from jsonb_array_elements(coalesce(new_payload->'progress'->'milestones','[]')) m where m->>'personId'=person limit 1));
   if before_value is distinct from after_value then insert into public.clan_progress_logs(person_id,actor_user_id,actor_label,previous_value,next_value) values(person,auth.uid(),actor,before_value,after_value);end if;
  end loop;
  if old_state.payload->'progress'->'catalog' is distinct from new_payload->'progress'->'catalog' then insert into public.clan_progress_logs(person_id,actor_user_id,actor_label,previous_value,next_value) values(null,auth.uid(),actor,jsonb_build_object('catalog',old_state.payload->'progress'->'catalog'),jsonb_build_object('catalog',new_payload->'progress'->'catalog'));end if;
 end if;
 insert into public.clan_history(revision,payload,replaced_by) values(old_state.revision,old_state.payload,auth.uid());
 update public.clan_state set payload=new_payload,revision=old_state.revision+1,updated_at=now(),updated_by=auth.uid() where id=1;
 return query select old_state.revision+1;
end;$$;
