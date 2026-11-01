-- Reversible test of the educational thresholds, permissions and server audit.
begin;
do $test$
declare actor uuid; actor_email text; base jsonb:= '{"version":1,"materials":[],"movements":[],"loans":[],"treasury":{"people":[],"types":[],"typologies":[],"entries":[]},"progress":{"catalog":[{"id":"F1","code":"F1","area":"F","title":"Atividade física"},{"id":"F2","code":"F2","area":"F","title":"Maturação corporal"},{"id":"F3","code":"F3","area":"F","title":"Fisiologia humana"},{"id":"F4","code":"F4","area":"F","title":"Vida saudável"},{"id":"F5","code":"F5","area":"F","title":"Cuidados pessoais"},{"id":"F6","code":"F6","area":"F","title":"Prevenção de riscos"},{"id":"A1","code":"A1","area":"A","title":"Relações afetivas"},{"id":"A2","code":"A2","area":"A","title":"Sensibilidade artística"},{"id":"A3","code":"A3","area":"A","title":"Sexualidade responsável"},{"id":"A4","code":"A4","area":"A","title":"Gestão emocional"},{"id":"A5","code":"A5","area":"A","title":"Conhecimento pessoal"},{"id":"A6","code":"A6","area":"A","title":"Confiança pessoal"},{"id":"C1","code":"C1","area":"C","title":"Valores pessoais"},{"id":"C2","code":"C2","area":"C","title":"Escolhas conscientes"},{"id":"C3","code":"C3","area":"C","title":"Desenvolvimento pessoal"},{"id":"C4","code":"C4","area":"C","title":"Compromisso responsável"},{"id":"C5","code":"C5","area":"C","title":"Perseverança"},{"id":"C6","code":"C6","area":"C","title":"Consequências dos atos"},{"id":"C7","code":"C7","area":"C","title":"Defesa de convicções"},{"id":"C8","code":"C8","area":"C","title":"Coerência de vida"},{"id":"E1","code":"E1","area":"E","title":"História da Salvação"},{"id":"E2","code":"E2","area":"E","title":"Mensagem de Jesus"},{"id":"E3","code":"E3","area":"E","title":"Pertença à Igreja"},{"id":"E4","code":"E4","area":"E","title":"Oração e celebração"},{"id":"E5","code":"E5","area":"E","title":"Vivência do Evangelho"},{"id":"E6","code":"E6","area":"E","title":"Diálogo religioso"},{"id":"E7","code":"E7","area":"E","title":"Fé e dignidade"},{"id":"E8","code":"E8","area":"E","title":"Missão cristã"},{"id":"I1","code":"I1","area":"I","title":"Aprendizagem contínua"},{"id":"I2","code":"I2","area":"I","title":"Análise de informação"},{"id":"I3","code":"I3","area":"I","title":"Percurso formativo"},{"id":"I4","code":"I4","area":"I","title":"Adaptação"},{"id":"I5","code":"I5","area":"I","title":"Solução de problemas"},{"id":"I6","code":"I6","area":"I","title":"Inovação"},{"id":"I7","code":"I7","area":"I","title":"Comunicação criativa"},{"id":"S1","code":"S1","area":"S","title":"Direitos e deveres"},{"id":"S2","code":"S2","area":"S","title":"Participação cívica"},{"id":"S3","code":"S3","area":"S","title":"Decisões democráticas"},{"id":"S4","code":"S4","area":"S","title":"Serviço à sociedade"},{"id":"S5","code":"S5","area":"S","title":"Empatia e tolerância"},{"id":"S6","code":"S6","area":"S","title":"Trabalho conjunto"},{"id":"S7","code":"S7","area":"S","title":"Liderança equilibrada"}],"records":[],"stages":[]}}'::jsonb; changed jsonb; r integer; n integer; expected text; area text; records jsonb;
begin
 select user_id,email into actor,actor_email from public.clan_members where role='admin' order by created_at limit 1;
 if actor is null then raise exception 'Missing approved test actor';end if;
 update public.clan_members set role='member' where user_id=actor;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 base:=jsonb_set(base,'{treasury,people}',jsonb_build_array(jsonb_build_object('id','qa','name','Dirigente de teste','email',actor_email,'active',true,'positions',jsonb_build_array('leader_viewer'))));
 update public.clan_state set payload=base where id=1;
 select revision into r from public.clan_state where id=1;
 if not public.clan_valid_payload(base) then raise exception 'Invalid base';end if;
 execute 'set local role authenticated';
 changed:=jsonb_set(base,'{progress,milestones}','[{"personId":"qa","commitmentDate":"2026-10-01","departureDate":null,"departureReason":""}]');
 perform public.save_clan_state(changed,r);r:=r+1;base:=changed;
 if not exists(select 1 from public.clan_progress_logs where person_id='qa' and actor_user_id=actor and previous_value->'stage'->>'stage'='caminho' and next_value->'stage'->>'stage'='comunidade' and next_value->'milestone'->>'commitmentDate'='2026-10-01') then raise exception 'Missing commitment audit';end if;
 for n in 0..8 loop
  select coalesce(jsonb_agg(jsonb_build_object('personId','qa','goalId',g->>'id','status','completed','stage','comunidade','notes','Validado em teste','pending','[]'::jsonb)),'[]') into records from jsonb_array_elements(base->'progress'->'catalog') g where substring(g->>'id' from 2)::integer<=n;
  changed:=jsonb_set(base,'{progress,records}',records);
  expected:=case when n>=5 then 'partida' when n>=2 then 'servico' else 'comunidade' end;
  if public.clan_progress_stage(changed->'progress','qa')<>expected then raise exception 'Wrong threshold %',n;end if;
  perform public.save_clan_state(changed,r);r:=r+1;base:=changed;
 end loop;
 if not exists(select 1 from public.clan_progress_logs where person_id='qa' and next_value->'stage'->>'stage'='partida' and actor_user_id=actor) then raise exception 'Missing automatic stage audit';end if;
 foreach area in array array['F','A','C','E','I','S'] loop
  select jsonb_agg(rec) into records from jsonb_array_elements(base->'progress'->'records') rec where left(rec->>'goalId',1)<>area or substring(rec->>'goalId' from 2)::integer<=1;
  if public.clan_progress_stage(jsonb_set(base->'progress','{records}',records),'qa')<>'comunidade' then raise exception 'Unbalanced progression accepted';end if;
 end loop;
 changed:=jsonb_set(base,'{progress,milestones,0,commitmentDate}','"2026-02-31"');
 if public.clan_valid_payload(changed) then raise exception 'Invalid commitment date accepted';end if;
 changed:=jsonb_set(base,'{progress,milestones,0,departureDate}','"2026-09-01"');
 if public.clan_valid_payload(changed) then raise exception 'Invalid departure accepted';end if;
 changed:=jsonb_set(base,'{progress,milestones,0,departureDate}','"2026-11-01"');
 if public.clan_valid_payload(changed) then raise exception 'Unexplained departure accepted';end if;
 changed:=jsonb_set(changed,'{progress,milestones,0,departureReason}','"Deliberação do Clã"');
 perform public.save_clan_state(changed,r);r:=r+1;base:=changed;
 if not exists(select 1 from public.clan_progress_logs where person_id='qa' and next_value->'milestone'->>'departureReason'='Deliberação do Clã') then raise exception 'Missing recognition audit';end if;
 execute 'reset role';
end;$test$;
rollback;
select revision as preserved_revision, public.clan_valid_payload(payload) as data_valid from public.clan_state;
