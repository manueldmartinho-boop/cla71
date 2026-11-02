-- Detailed progress and finance are scoped before data leaves Postgres.
create or replace function public.clan_read_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare member_role text; member_email text; person jsonb; all_progress boolean; all_finance boolean;
begin
 select role,lower(email) into member_role,member_email from public.clan_members where user_id=auth.uid();
 if member_role is null or member_role not in ('admin','member','treasurer') then raise exception 'FORBIDDEN';end if;
 select p into person from public.clan_state s cross join lateral jsonb_array_elements(coalesce(s.payload->'treasury'->'people','[]')) p where s.id=1 and lower(p->>'email')=member_email and (p->>'active')::boolean;
 all_progress:=member_role='admin' or coalesce(person->'positions' ?| array['guide','deputy_guide','leader_viewer'],false);
 all_finance:=all_progress or coalesce(person->'positions' ? 'treasurer',false);
 return jsonb_build_object('progressAll',all_progress,'financeAll',all_finance,'personId',person->>'id');
end;$$;
revoke all on function public.clan_read_access() from public,anon;
grant execute on function public.clan_read_access() to authenticated;

create or replace function public.clan_view_payload(p jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare rights jsonb:=public.clan_read_access(); result jsonb:=p; person text:=rights->>'personId'; treasury jsonb; progress jsonb; overview jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object('personId',member->>'id','stage',public.clan_progress_stage(p->'progress',member->>'id'))),'[]') into overview from jsonb_array_elements(coalesce(p->'treasury'->'people','[]')) member where (member->>'active')::boolean and not coalesce(member->'positions' ? 'leader_viewer',false);
 if not (rights->>'financeAll')::boolean then
  result:=jsonb_set(result,'{movements}','[]');
  treasury:=coalesce(result->'treasury','{"types":[],"typologies":[],"people":[],"entries":[]}');
  treasury:=jsonb_set(treasury,'{entries}',(select coalesce(jsonb_agg(e),'[]') from jsonb_array_elements(treasury->'entries') e where e->>'personId'=person));
  result:=jsonb_set(result,'{treasury}',treasury);
 end if;
 if not (rights->>'progressAll')::boolean and result ? 'progress' then
  progress:=result->'progress';
  progress:=jsonb_set(progress,'{records}',(select coalesce(jsonb_agg(r),'[]') from jsonb_array_elements(progress->'records') r where r->>'personId'=person));
  progress:=jsonb_set(progress,'{stages}',(select coalesce(jsonb_agg(r),'[]') from jsonb_array_elements(progress->'stages') r where r->>'personId'=person));
  if progress ? 'milestones' then progress:=jsonb_set(progress,'{milestones}',(select coalesce(jsonb_agg(r),'[]') from jsonb_array_elements(progress->'milestones') r where r->>'personId'=person));end if;
  result:=jsonb_set(result,'{progress}',progress);
 end if;
 return result||jsonb_build_object('access',rights,'progressOverview',overview);
end;$$;
revoke all on function public.clan_view_payload(jsonb) from public,anon,authenticated;

create or replace function public.get_clan_snapshot() returns table(payload jsonb,revision integer) language plpgsql stable security definer set search_path='' as $$
begin
 perform public.clan_read_access();
 return query select public.clan_view_payload(s.payload),s.revision from public.clan_state s where id=1;
end;$$;
revoke all on function public.get_clan_snapshot() from public,anon;
grant execute on function public.get_clan_snapshot() to authenticated;

-- Keep the validated, audited writer internal. The public writer merges hidden
-- fields back into the locked state, so scoped readers cannot erase other people.
alter function public.save_clan_state(jsonb,integer) rename to save_clan_state_internal;
revoke all on function public.save_clan_state_internal(jsonb,integer) from public,anon,authenticated;
create function public.save_clan_state(new_payload jsonb,expected_revision integer) returns table(revision integer,payload jsonb) language plpgsql security definer set search_path='' as $$
declare old_state public.clan_state; visible jsonb; merged jsonb; permissions jsonb;
begin
 if auth.uid() is null then raise exception 'FORBIDDEN';end if;
 perform public.clan_read_access();
 select * into old_state from public.clan_state where id=1 for update;
 if old_state.revision<>expected_revision then raise exception 'CONFLICT';end if;
 visible:=public.clan_view_payload(old_state.payload);
 merged:=new_payload-'access'-'progressOverview';
 permissions:=public.clan_permissions();
 if not (permissions->>'finance')::boolean then
  if new_payload->'movements' is distinct from visible->'movements' or (coalesce(new_payload->'treasury','{}')-'people') is distinct from (coalesce(visible->'treasury','{}')-'people') then raise exception 'FORBIDDEN_FINANCE';end if;
  merged:=jsonb_set(merged,'{movements}',old_state.payload->'movements');
  if old_state.payload ? 'treasury' then merged:=jsonb_set(merged,'{treasury}',(old_state.payload->'treasury')||jsonb_build_object('people',new_payload->'treasury'->'people'));end if;
 end if;
 if not (permissions->>'progress')::boolean then
  if new_payload->'progress' is distinct from visible->'progress' then raise exception 'FORBIDDEN_PROGRESS';end if;
  if old_state.payload ? 'progress' then merged:=jsonb_set(merged,'{progress}',old_state.payload->'progress');else merged:=merged-'progress';end if;
 end if;
 perform public.save_clan_state_internal(merged,expected_revision);
 return query select state.revision,public.clan_view_payload(state.payload) from public.clan_state state where state.id=1;
end;$$;
revoke all on function public.save_clan_state(jsonb,integer) from public,anon;
grant execute on function public.save_clan_state(jsonb,integer) to authenticated;

drop policy clan_read on public.clan_state;
create policy clan_read on public.clan_state for select to authenticated using ((select public.clan_role())='admin');
drop policy progress_log_read on public.clan_progress_logs;
create policy progress_log_read on public.clan_progress_logs for select to authenticated using (
 (select public.clan_role()) in ('admin','member','treasurer') and (
 ((select public.clan_read_access())->>'progressAll')::boolean or person_id=(select public.clan_read_access())->>'personId' or person_id is null
 ));
