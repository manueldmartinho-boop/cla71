-- No fixture users, directory changes or membership changes survive this test.
begin;
do $test$
declare actor uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); fixture text:='qa-registration@example.test'; p jsonb;
begin
 if has_function_privilege('anon','public.clan_registration_allowed(text)','execute') or has_function_privilege('authenticated','public.clan_registration_allowed(text)','execute') then raise exception 'Directory lookup exposed';end if;
 if not has_function_privilege('service_role','public.clan_registration_allowed(text)','execute') then raise exception 'Service cannot verify directory';end if;
 select payload into p from public.clan_state where id=1 for update;
 p:=jsonb_set(p,'{treasury,people}',p->'treasury'->'people'||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'name','Teste de registo','email',fixture,'active',true,'positions',jsonb_build_array('leader_viewer','treasurer'))));
 update public.clan_state set payload=p where id=1;
 if not public.clan_registration_allowed(upper(fixture)) or public.clan_registration_allowed('outsider@example.test') or public.clan_registration_allowed('') then raise exception 'Directory validation failed';end if;
 insert into auth.users(id,email,email_confirmed_at) values(actor,fixture,now()),(outsider,'outsider@example.test',now());
 if not exists(select 1 from public.clan_members where user_id=actor and role='member') then raise exception 'Allowed account not activated';end if;
 if exists(select 1 from public.clan_members where user_id=outsider) then raise exception 'Unknown email activated';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 perform public.request_clan_access();
 if not (public.clan_permissions()->>'finance')::boolean or not (public.clan_permissions()->>'progress')::boolean then raise exception 'Assigned positions lost';end if;
 update public.clan_members set role='admin' where user_id=actor;
 perform public.request_clan_access();
 if (select role from public.clan_members where user_id=actor)<>'admin' then raise exception 'Admin downgraded';end if;
 update public.clan_members set role='pending' where user_id=actor;
 perform public.request_clan_access();
 if (select role from public.clan_members where user_id=actor)<>'member' then raise exception 'Assigned pending account not activated';end if;
 update public.clan_state set payload=jsonb_set(payload,'{treasury,people}',(select jsonb_agg(case when value->>'email'=fixture then jsonb_set(value,'{active}','false') else value end) from jsonb_array_elements(payload->'treasury'->'people'))) where id=1;
 if public.clan_registration_allowed(fixture) then raise exception 'Archived person accepted';end if;
end;$test$;
rollback;
select revision as preserved_revision from public.clan_state where id=1;
