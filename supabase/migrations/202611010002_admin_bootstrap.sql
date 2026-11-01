create table public.clan_admin_invites(email text primary key);
alter table public.clan_admin_invites enable row level security;
revoke all on public.clan_admin_invites from anon, authenticated;

create or replace function public.request_clan_access() returns void language plpgsql security definer set search_path='' as $$
declare verified_email text; invited boolean;
begin
 if auth.uid() is null then raise exception 'UNAUTHENTICATED';end if;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'EMAIL_NOT_VERIFIED';end if;
 delete from public.clan_admin_invites where email=verified_email returning true into invited;
 insert into public.clan_members(user_id,email,role) values(auth.uid(),verified_email,case when coalesce(invited,false) then 'admin' else 'pending' end)
 on conflict(user_id) do update set email=excluded.email,role=case when coalesce(invited,false) then 'admin' else public.clan_members.role end;
end;$$;
