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
