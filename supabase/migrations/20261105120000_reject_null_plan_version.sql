-- A NULL version must never bypass optimistic concurrency control.
create or replace function public.update_plan(p_plan uuid, p_version integer, p_name text, p_message text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans;
begin
  select * into v_plan from public.plans where id = p_plan for update;
  if v_plan.id is null or not public.is_plan_member(p_plan) then
    perform public.cinet_fail('CN404', 'El plan no existe o no tienes acceso.');
  end if;
  if v_plan.owner_id <> (select auth.uid()) then
    perform public.cinet_fail('CN403', 'Solo quien organiza puede editar el plan.');
  end if;
  if v_plan.status = 'cancelled' then
    perform public.cinet_fail('CN410', 'El plan está cancelado.');
  end if;
  if v_plan.version is distinct from p_version then
    perform public.cinet_fail('CN409', 'Alguien cambió el plan mientras lo editabas. Recarga para ver la versión actual.');
  end if;
  begin
    update public.plans
    set name = btrim(p_name), message = btrim(coalesce(p_message, '')), version = version + 1, updated_at = now()
    where id = p_plan;
  exception when check_violation then
    perform public.cinet_fail('CN422', 'El nombre o el mensaje no son válidos.');
  end;
  return v_plan.version + 1;
end;
$$;
