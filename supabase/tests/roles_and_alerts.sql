-- Run as the database owner. All fixture data and grants are rolled back.
begin;
do $test$
declare actor uuid; actor_email text; original_revision integer; r integer; mask integer; wanted_material boolean; wanted_finance boolean; role_names text[]; p jsonb; base jsonb; changed jsonb; rights jsonb;
begin
 select user_id,email into actor,actor_email from public.clan_members where role='admin' order by created_at limit 1;
 if actor is null then raise exception 'No approved admin for reversible test';end if;
 select revision into original_revision from public.clan_state where id=1;
 update public.clan_members set role='member' where user_id=actor;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 for mask in 0..15 loop
  role_names:='{}';
  if (mask&1)>0 then role_names:=array_append(role_names,'material_keeper');end if;
  if (mask&2)>0 then role_names:=array_append(role_names,'guide');end if;
  if (mask&4)>0 then role_names:=array_append(role_names,'deputy_guide');end if;
  if (mask&8)>0 then role_names:=array_append(role_names,'treasurer');end if;
  wanted_material:=(mask&7)>0;wanted_finance:=(mask&14)>0;
  base:=jsonb_build_object('version',1,'materials','[{"id":"qa-tent","name":"Tenda de teste","category":"Campismo","total":1,"borrowed":0,"condition":"Bom","location":"Teste"}]'::jsonb,'loans','[]'::jsonb,'movements','[]'::jsonb,'tribes','[{"id":"tribe","name":"Tribo de teste"}]'::jsonb,'treasury',jsonb_build_object('types','[]'::jsonb,'typologies','[]'::jsonb,'entries','[]'::jsonb,'people',jsonb_build_array(jsonb_build_object('id','qa-person','name','Pessoa de teste','email',actor_email,'active',true,'tribeId','tribe','positions',to_jsonb(role_names)))));
  update public.clan_state set payload=base where id=1;
  select revision into r from public.clan_state where id=1;
  execute 'set local role authenticated';
  rights:=public.clan_permissions();
  if (rights->>'material')::boolean<>wanted_material or (rights->>'finance')::boolean<>wanted_finance then raise exception 'Permission mismatch for mask %',mask;end if;
  changed:=jsonb_set(base,'{materials,0,alerts}','[{"id":"qa-alert","kind":"missing","description":"Falta de material","items":[{"name":"Martelo","quantity":1},{"name":"Estacas","quantity":10}],"resolved":false,"createdAt":"2026-11-01T12:00:00Z"}]'::jsonb);
  begin
   perform public.save_clan_state(changed,r);
   if not wanted_material then raise exception 'Unexpected material access';end if;
   base:=changed;r:=r+1;
  exception when raise_exception then if wanted_material or sqlerrm<>'FORBIDDEN_MATERIAL' then raise;end if;
  end;
  changed:=jsonb_set(base,'{movements}','[{"id":"qa-expense","description":"Despesa de teste","category":"Atividades","type":"expense","amount":2,"date":"2026-11-01"}]'::jsonb);
  begin
   perform public.save_clan_state(changed,r);
   if not wanted_finance then raise exception 'Unexpected finance access';end if;
   base:=changed;r:=r+1;
  exception when raise_exception then if wanted_finance or sqlerrm<>'FORBIDDEN_FINANCE' then raise;end if;
  end;
  begin
   perform public.save_clan_state(jsonb_set(base,'{treasury,people,0,positions}','["guide"]'::jsonb),r);
   if to_jsonb(role_names) <> '["guide"]'::jsonb then raise exception 'Self escalation accepted';end if;
  exception when raise_exception then if sqlerrm<>'FORBIDDEN_DIRECTORY' then raise;end if;
  end;
  execute 'reset role';
 end loop;
end;$test$;
rollback;
select revision as preserved_revision, (select count(*) from public.clan_members where role='admin') as admins from public.clan_state where id=1;
