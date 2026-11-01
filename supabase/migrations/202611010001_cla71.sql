-- Clã 71: private shared data, approved membership and atomic, versioned writes.
create extension if not exists pg_jsonschema with schema extensions;

create table public.clan_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 role text not null default 'pending' check (role in ('pending','member','treasurer','admin')),
 created_at timestamptz not null default now()
);
create table public.clan_state (
 id integer primary key check(id=1),
 payload jsonb not null,
 revision integer not null default 0,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
create table public.clan_history (
 revision integer primary key,
 payload jsonb not null,
 replaced_at timestamptz not null default now(),
 replaced_by uuid references auth.users(id) on delete set null
);
insert into public.clan_state(id,payload) values(1,'{"version":1,"materials":[],"movements":[],"loans":[],"treasury":{"types":[],"typologies":[],"people":[],"entries":[]}}');

create function public.clan_role() returns text language sql stable security definer set search_path='' as $$
 select m.role from public.clan_members m where m.user_id=auth.uid();
$$;
alter table public.clan_members enable row level security;
alter table public.clan_state enable row level security;
alter table public.clan_history enable row level security;
create policy members_read on public.clan_members for select to authenticated using (user_id=auth.uid() or public.clan_role()='admin');
create policy clan_read on public.clan_state for select to authenticated using (public.clan_role() in ('member','treasurer','admin'));
create policy history_read on public.clan_history for select to authenticated using (public.clan_role()='admin');
revoke all on public.clan_members, public.clan_state, public.clan_history from anon, authenticated;
grant select on public.clan_members, public.clan_state, public.clan_history to authenticated;

create function public.request_clan_access() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 insert into public.clan_members(user_id,email)
 select id,email from auth.users where id=auth.uid()
 on conflict(user_id) do update set email=excluded.email;
end;$$;

create function public.set_member_role(target_user uuid,new_role text) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.clan_role() is distinct from 'admin' then raise exception 'FORBIDDEN';end if;
 if target_user=auth.uid() then raise exception 'CANNOT_CHANGE_OWN_ROLE';end if;
 if new_role not in ('pending','member','treasurer','admin') then raise exception 'INVALID_ROLE';end if;
 update public.clan_members set role=new_role where user_id=target_user;
 if not found then raise exception 'MEMBER_NOT_FOUND';end if;
end;$$;

create function public.clan_valid_payload(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare schema json; t jsonb; row jsonb;
begin
 schema := '{"type":"object","required":["version","materials","movements","loans"],"additionalProperties":false,"properties":{"version":{"const":1},"materials":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name","category","total","borrowed","condition","location"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","maxLength":10000},"category":{"type":"string","maxLength":10000},"total":{"type":"integer","minimum":0,"maximum":1000000000},"borrowed":{"type":"integer","minimum":0,"maximum":1000000000},"condition":{"enum":["Bom","Rever","Reparar"]},"location":{"type":"string","maxLength":10000}}}},"movements":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","description","category","type","amount","date"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"description":{"type":"string","maxLength":10000},"category":{"type":"string","maxLength":10000},"type":{"enum":["income","expense"]},"amount":{"type":"number","exclusiveMinimum":0,"maximum":1000000000},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"}}}},"loans":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","materialId","person","quantity","due","returned"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"materialId":{"type":"string","minLength":1,"maxLength":200},"person":{"type":"string","maxLength":10000},"quantity":{"type":"integer","minimum":1,"maximum":1000000000},"due":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"returned":{"type":"boolean"}}}},"treasury":{"type":"object","required":["types","typologies","people","entries"],"additionalProperties":false,"properties":{"types":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200}}}},"typologies":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","typeId","name","priority","spendable"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"typeId":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200},"priority":{"type":"integer","minimum":0,"maximum":1000000000},"spendable":{"type":"boolean"}}}},"people":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","name","active"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"name":{"type":"string","minLength":1,"maxLength":200},"active":{"type":"boolean"}}}},"entries":{"type":"array","maxItems":50000,"items":{"type":"object","required":["id","personId","typologyId","cents","description","date","batchId"],"additionalProperties":false,"properties":{"id":{"type":"string","minLength":1,"maxLength":200},"personId":{"type":"string","minLength":1,"maxLength":200},"typologyId":{"type":"string","minLength":1,"maxLength":200},"cents":{"type":"integer","minimum":-1000000000,"maximum":1000000000,"not":{"const":0}},"description":{"type":"string","minLength":1,"maxLength":200},"date":{"type":"string","pattern":"^\\d{4}-\\d{2}-\\d{2}$"},"batchId":{"anyOf":[{"type":"string","minLength":1,"maxLength":200},{"type":"null"}]}}}}}}}}'::json;
 if not extensions.jsonb_matches_schema(schema,p) then return false;end if;
 -- Unique IDs, valid dates, relationships and exact material stock accounting.
 if exists(select 1 from jsonb_array_elements(p->'materials') m group by m->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p->'movements') m group by m->>'id' having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p->'loans') m group by m->>'id' having count(*)>1) then return false;end if;
 if exists(select 1 from jsonb_array_elements(p->'loans') l where not exists(select 1 from jsonb_array_elements(p->'materials') m where m->>'id'=l->>'materialId')) then return false;end if;
 if exists(select 1 from jsonb_array_elements(p->'materials') m where (m->>'borrowed')::numeric>(m->>'total')::numeric or (m->>'borrowed')::numeric<>(select coalesce(sum((l->>'quantity')::numeric),0) from jsonb_array_elements(p->'loans') l where l->>'materialId'=m->>'id' and not (l->>'returned')::boolean)) then return false;end if;
 for row in select v from jsonb_array_elements(p->'movements') v loop perform (row->>'date')::date;end loop;
 for row in select v from jsonb_array_elements(p->'loans') v loop perform (row->>'due')::date;end loop;
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

create function public.save_clan_state(new_payload jsonb,expected_revision integer)
returns table(revision integer) language plpgsql security definer set search_path='' as $$
declare old_state public.clan_state; actor_role text;
begin
 actor_role:=public.clan_role();
 if actor_role is null or actor_role not in ('member','treasurer','admin') then raise exception 'FORBIDDEN';end if;
 if pg_column_size(new_payload)>5000000 or not public.clan_valid_payload(new_payload) then raise exception 'INVALID_DATA';end if;
 select * into old_state from public.clan_state where id=1 for update;
 if old_state.revision<>expected_revision then raise exception 'CONFLICT';end if;
 if actor_role='member' and (new_payload->'movements' is distinct from old_state.payload->'movements' or new_payload->'treasury' is distinct from old_state.payload->'treasury') then raise exception 'FORBIDDEN';end if;
 -- Treasury can append entries; only administrators may replace previous history.
 if actor_role='treasurer' and exists(select 1 from jsonb_array_elements(coalesce(old_state.payload->'treasury'->'entries','[]'::jsonb)) old_entry where not exists(select 1 from jsonb_array_elements(coalesce(new_payload->'treasury'->'entries','[]'::jsonb)) new_entry where new_entry=old_entry)) then raise exception 'FORBIDDEN_HISTORY';end if;
 insert into public.clan_history(revision,payload,replaced_by) values(old_state.revision,old_state.payload,auth.uid());
 update public.clan_state set payload=new_payload,revision=old_state.revision+1,updated_at=now(),updated_by=auth.uid() where id=1;
 return query select old_state.revision+1;
end;$$;

revoke all on function public.clan_role(), public.request_clan_access(), public.set_member_role(uuid,text), public.save_clan_state(jsonb,integer), public.clan_valid_payload(jsonb) from public, anon;
grant execute on function public.clan_role(), public.request_clan_access(), public.set_member_role(uuid,text), public.save_clan_state(jsonb,integer) to authenticated;
-- Explicitly named so the database can be audited independently of the browser.
alter table public.clan_state add constraint clan_payload_valid check(public.clan_valid_payload(payload));
