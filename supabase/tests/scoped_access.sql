-- All fixture data, memberships and saves are rolled back.
begin;
do $test$
declare actor uuid; actor_email text; mask integer; roles text[]; base jsonb; snap jsonb; changed jsonb; rights jsonb; writes jsonb; r integer; want_progress boolean; want_finance boolean;
begin
 select user_id,email into actor,actor_email from public.clan_members where role='admin' order by created_at limit 1;
 if actor is null then raise exception 'Missing fixture actor';end if;
 update public.clan_members set role='member' where user_id=actor;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 insert into public.clan_progress_logs(person_id,actor_user_id,actor_label,previous_value,next_value) values('own',actor,'Teste','{}','{}'),('other',actor,'Teste','{}','{}');
 for mask in 0..31 loop
  roles:='{}';
  if (mask&1)>0 then roles:=array_append(roles,'material_keeper');end if;
  if (mask&2)>0 then roles:=array_append(roles,'guide');end if;
  if (mask&4)>0 then roles:=array_append(roles,'deputy_guide');end if;
  if (mask&8)>0 then roles:=array_append(roles,'treasurer');end if;
  if (mask&16)>0 then roles:=array_append(roles,'leader_viewer');end if;
  want_progress:=(mask&22)>0;want_finance:=(mask&30)>0;
  base:=jsonb_build_object('version',1,'materials','[{"id":"tent","name":"Tenda","category":"Campismo","total":2,"borrowed":0,"condition":"Bom","location":"Sede"}]'::jsonb,'movements','[{"id":"cash","description":"Caixa privada","category":"Outros","amount":20,"type":"income","date":"2026-11-02"}]'::jsonb,'loans','[]'::jsonb,'tribes','[]'::jsonb,'treasury',jsonb_build_object('types','[{"id":"type","name":"Individual"}]'::jsonb,'typologies','[{"id":"a","typeId":"type","name":"Disponivel","priority":1,"spendable":true}]'::jsonb,'people',jsonb_build_array(jsonb_build_object('id','own','name','Próprio','email',actor_email,'active',true,'positions',to_jsonb(roles)),jsonb_build_object('id','other','name','Outro','active',true,'positions','[]'::jsonb)),'entries','[{"id":"own-credit","personId":"own","typologyId":"a","cents":1000,"description":"Own","date":"2026-11-02","batchId":null},{"id":"other-credit","personId":"other","typologyId":"a","cents":3000,"description":"SECRET_OTHER_FINANCE","date":"2026-11-02","batchId":null}]'::jsonb),'progress','{"catalog":[{"id":"F1","area":"F","code":"F1","title":"Atividade física"}],"stages":[],"records":[{"personId":"own","goalId":"F1","status":"proposed","stage":"comunidade","notes":"Próprio","pending":[]},{"personId":"other","goalId":"F1","status":"completed","stage":"comunidade","notes":"SECRET_OTHER_PROGRESS","pending":[]}],"milestones":[]}'::jsonb);
  update public.clan_state set payload=base where id=1;
  select revision into r from public.clan_state where id=1;
  execute 'set local role authenticated';
  rights:=public.clan_read_access();writes:=public.clan_permissions();
  if (rights->>'progressAll')::boolean<>want_progress or (rights->>'financeAll')::boolean<>want_finance then raise exception 'Rights mismatch %',mask;end if;
  select payload into snap from public.get_clan_snapshot();
  if jsonb_array_length(snap->'progressOverview')<>(case when (mask&16)>0 then 1 else 2 end) then raise exception 'Stage overview incomplete';end if;
  if not want_progress and position('SECRET_OTHER_PROGRESS' in snap::text)>0 then raise exception 'Progress leak %',mask;end if;
  if not want_finance and (position('SECRET_OTHER_FINANCE' in snap::text)>0 or jsonb_array_length(snap->'movements')<>0) then raise exception 'Finance leak %',mask;end if;
  if (exists(select 1 from public.clan_progress_logs where person_id='other'))<>want_progress then raise exception 'Audit visibility mismatch %',mask;end if;
  if exists(select 1 from public.clan_state) then raise exception 'Raw state readable %',mask;end if;
  begin
   perform public.save_clan_state_internal(base,r);
   raise exception 'Internal writer exposed';
  exception when insufficient_privilege then null;end;
  changed:=jsonb_set(jsonb_set(snap,'{materials,0,borrowed}','1'),'{loans}','[{"id":"loan","materialId":"tent","person":"Próprio","quantity":1,"due":"2026-11-10","returned":false}]');
  select payload into changed from public.save_clan_state(changed,r);r:=r+1;
  if not want_finance and position('SECRET_OTHER_FINANCE' in changed::text)>0 then raise exception 'Writer response leaks finance';end if;
  select payload into snap from public.get_clan_snapshot();
  if not want_finance and position('SECRET_OTHER_FINANCE' in snap::text)>0 then raise exception 'Save response leak';end if;
  changed:=jsonb_set(snap,'{progress,records,0,notes}','"Alteração de teste"');
  begin
   perform public.save_clan_state(changed,r);
   if not (writes->>'progress')::boolean then raise exception 'Unexpected progress edit';end if;
   r:=r+1;
  exception when raise_exception then if (writes->>'progress')::boolean or sqlerrm<>'FORBIDDEN_PROGRESS' then raise;end if;end;
  execute 'reset role';
  if (select jsonb_array_length(payload->'treasury'->'entries') from public.clan_state where id=1)<>2 then raise exception 'Hidden entries erased';end if;
  if not exists(select 1 from public.clan_state s cross join lateral jsonb_array_elements(s.payload->'progress'->'records') rec where rec->>'personId'='other' and rec->>'notes'='SECRET_OTHER_PROGRESS') then raise exception 'Hidden progress erased';end if;
 end loop;
 update public.clan_members set role='pending' where user_id=actor;
 execute 'set local role authenticated';
 begin perform public.get_clan_snapshot();raise exception 'Pending user read snapshot';exception when raise_exception then if sqlerrm<>'FORBIDDEN' then raise;end if;end;
 execute 'reset role';
end;$test$;
rollback;
select revision as preserved_revision,public.clan_valid_payload(payload) as valid_data from public.clan_state where id=1;
