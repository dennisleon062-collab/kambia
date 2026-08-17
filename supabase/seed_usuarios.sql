-- ============================================================================
-- Seed de usuarios — ejecutar DESPUÉS de crear los 2 usuarios en Supabase Auth
-- (Dashboard → Authentication → Users → Add user), con estos emails:
--   milagro@kambia.local
--   juan@kambia.local
-- ============================================================================

insert into usuarios (id, nombre, rol, activo)
select id, 'Milagro', 'dueña', true
from auth.users where email = 'milagro@kambia.local'
on conflict (id) do nothing;

insert into usuarios (id, nombre, rol, activo)
select id, 'Juan', 'trabajador', true
from auth.users where email = 'juan@kambia.local'
on conflict (id) do nothing;
