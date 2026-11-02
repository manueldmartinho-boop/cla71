-- Dirigente remains read-only for material; Tesouraria is an explicit cumulative grant.
create or replace function public.clan_permissions() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare member_role text; member_email text; assigned jsonb;
begin
 select role,lower(email) into member_role,member_email from public.clan_members where user_id=auth.uid();
 if member_role='admin' then return jsonb_build_object('admin',true,'material',true,'finance',true,'progress',true);end if;
 if member_role is null or member_role not in ('member','treasurer') then return jsonb_build_object('admin',false,'material',false,'finance',false,'progress',false);end if;
 select p->'positions' into assigned from public.clan_state s cross join lateral jsonb_array_elements(coalesce(s.payload->'treasury'->'people','[]')) p where s.id=1 and lower(p->>'email')=member_email and (p->>'active')::boolean;
 if coalesce(assigned ? 'leader_viewer',false) then return jsonb_build_object('admin',false,'material',false,'finance',coalesce(assigned ? 'treasurer',false),'progress',true);end if;
 return jsonb_build_object('admin',false,'material',coalesce(assigned ?| array['material_keeper','guide','deputy_guide'],false),'finance',coalesce(assigned ?| array['treasurer','guide','deputy_guide'],false),'progress',false);
end;$$;
revoke all on function public.clan_permissions() from public,anon;
grant execute on function public.clan_permissions() to authenticated;
