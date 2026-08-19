-- ============================================================================
-- Faltaba la política de RLS para DELETE en movimientos (solo existía la de
-- UPDATE). Sin esto, ni siquiera la dueña podía borrar un movimiento para
-- casos excepcionales (ej. limpiar datos de prueba al configurar el sistema).
-- El trigger de inmutabilidad sigue exigiendo rol 'dueña' y deja log.
-- ============================================================================

create policy "movimientos_delete_dueña" on movimientos for delete to authenticated
  using (exists (select 1 from usuarios where id = auth.uid() and rol = 'dueña'));
