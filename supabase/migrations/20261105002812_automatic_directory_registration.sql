-- Only the trusted registration service may check the directory before creating an account.
create function public.clan_registration_allowed(p_email text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(nullif(btrim(p_email),''),'')<>'' and exists(
  select 1 from public.clan_state s cross join lateral jsonb_array_elements(coalesce(s.payload->'treasury'->'people','[]')) p
  where s.id=1 and (p->>'active')::boolean and lower(btrim(p->>'email'))=lower(btrim(p_email))
 );
$$;
revoke all on function public.clan_registration_allowed(text) from public,anon,authenticated;
grant execute on function public.clan_registration_allowed(text) to service_role;

create function public.clan_register_directory_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and public.clan_registration_allowed(new.email) then
  insert into public.clan_members(user_id,email,role) values(new.id,lower(new.email),'member')
  on conflict(user_id) do update set email=excluded.email,role=case when public.clan_members.role='pending' then 'member' else public.clan_members.role end;
 end if;
 return new;
end;$$;
revoke all on function public.clan_register_directory_user() from public,anon,authenticated;
create trigger clan_directory_registration after insert or update of email,email_confirmed_at on auth.users
for each row execute function public.clan_register_directory_user();

create or replace function public.request_clan_access() returns void language plpgsql security definer set search_path='' as $$
declare verified_email text; invited boolean; assigned boolean;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'EMAIL_NOT_VERIFIED';end if;
 assigned:=public.clan_registration_allowed(verified_email);
 delete from public.clan_admin_invites where email=verified_email returning true into invited;
 insert into public.clan_members(user_id,email,role) values(auth.uid(),verified_email,case when coalesce(invited,false) then 'admin' when assigned then 'member' else 'pending' end)
 on conflict(user_id) do update set email=excluded.email,role=case when coalesce(invited,false) then 'admin' when assigned and public.clan_members.role='pending' then 'member' else public.clan_members.role end;
end;$$;
revoke all on function public.request_clan_access() from public,anon;
grant execute on function public.request_clan_access() to authenticated;

-- Existing accounts with an email assigned by an administrator follow the same rule.
update auth.users set email_confirmed_at=now(),confirmation_token='',updated_at=now()
where email_confirmed_at is null and public.clan_registration_allowed(email);
insert into public.clan_members(user_id,email,role)
select id,lower(email),'member' from auth.users where email_confirmed_at is not null and public.clan_registration_allowed(email)
on conflict(user_id) do update set email=excluded.email,role=case when public.clan_members.role='pending' then 'member' else public.clan_members.role end;
