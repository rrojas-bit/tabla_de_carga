-- ============================================================
-- Perfil de usuario: fecha de nacimiento + proteger rol/empresa
-- ============================================================

-- Cumpleaños (opcional) para la página de Perfil
alter table public.profiles
  add column if not exists fecha_nacimiento date;

-- La política profiles_own (ALL, auth.uid() = id) permitía que un usuario
-- cambiara su propio rol (p. ej. a 'admin') o su empresa. Solo admins o
-- la service_role (auth.uid() nulo: registro, panel SQL) pueden hacerlo.
create or replace function public.proteger_campos_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.rol is distinct from old.rol
       or new.empresa_id is distinct from old.empresa_id
       or new.id is distinct from old.id then
      raise exception 'No puedes modificar rol ni empresa de tu perfil'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.proteger_campos_profile() from anon, authenticated;

drop trigger if exists trg_proteger_campos_profile on public.profiles;
create trigger trg_proteger_campos_profile
  before update on public.profiles
  for each row execute function public.proteger_campos_profile();
