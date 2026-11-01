-- Missing historical dates must not override validated educational progress.
create or replace function public.clan_progress_stage(p jsonb,person_id text) returns text language sql immutable set search_path='' as $$
 with counts as (
  select a.area, count(distinct r->>'goalId') filter(where r->>'personId'=person_id and r->>'status'='completed' and r->>'goalId'=a.area||n::text) completed
  from (values ('F',6),('A',6),('C',8),('E',8),('I',7),('S',7)) a(area,total)
  cross join lateral generate_series(1,a.total) n
  left join lateral jsonb_array_elements(coalesce(p->'records','[]')) r on r->>'goalId'=a.area||n::text
  group by a.area
 )
 select case when bool_and(completed>=5) then 'partida'
  when bool_and(completed>=2) then 'servico'
  when sum(completed)>0 or exists(select 1 from jsonb_array_elements(coalesce(p->'milestones','[]')) m where m->>'personId'=person_id and m->>'commitmentDate' is not null) then 'comunidade'
  else 'caminho' end from counts;
$$;
revoke all on function public.clan_progress_stage(jsonb,text) from public,anon;
grant execute on function public.clan_progress_stage(jsonb,text) to authenticated;
