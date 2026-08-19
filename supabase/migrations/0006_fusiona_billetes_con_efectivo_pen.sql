-- ============================================================================
-- "Bóveda Billetes" resultó ser la misma cuenta física que "Bóveda Efectivo
-- Soles" (los billetes ya son soles normales, a diferencia de las monedas de
-- baja denominación que sí necesitan tratarse aparte). Se fusiona el saldo
-- de vuelta y se desactiva la cuenta duplicada, sin borrar el historial.
-- ============================================================================

do $$
declare
  v_billetes uuid;
  v_efectivo_pen uuid;
  v_saldo_billetes numeric;
  v_usuario_dueña uuid;
begin
  select id into v_billetes from cuentas where slug = 'boveda_billetes';
  if v_billetes is null then
    return; -- nunca se creó en esta base, nada que hacer
  end if;

  select id into v_efectivo_pen from cuentas where slug = 'boveda_efectivo_pen';
  select id into v_usuario_dueña from usuarios where rol = 'dueña' limit 1;

  select coalesce(sum(monto_destino), 0) - coalesce(
    (select sum(monto_origen) from movimientos where cuenta_origen_id = v_billetes), 0
  )
  into v_saldo_billetes
  from movimientos where cuenta_destino_id = v_billetes;

  if v_saldo_billetes > 0 and v_usuario_dueña is not null then
    insert into movimientos (
      tipo, usuario_id, cuenta_origen_id, moneda_origen, monto_origen,
      cuenta_destino_id, moneda_destino, monto_destino, comentario
    ) values (
      'traspaso_interno', v_usuario_dueña, v_billetes, 'PEN', v_saldo_billetes,
      v_efectivo_pen, 'PEN', v_saldo_billetes,
      'Se fusiona Bóveda Billetes con Bóveda Efectivo Soles (son la misma cuenta física)'
    );
  end if;

  update cuentas set activa = false where id = v_billetes;
end $$;

-- La vista de saldos debe excluir cuentas desactivadas (si no, "Bóveda
-- Billetes" seguiría apareciendo con saldo 0 en el dashboard).
create or replace view v_saldos_cuentas
with (security_invoker = true) as
select
  c.id as cuenta_id,
  c.nombre as cuenta_nombre,
  c.slug as cuenta_slug,
  c.tipo as cuenta_tipo,
  c.moneda_codigo,
  coalesce(entradas.total, 0) - coalesce(salidas.total, 0) as saldo
from cuentas c
left join (
  select cuenta_destino_id as cuenta_id, sum(monto_destino) as total
  from movimientos
  where cuenta_destino_id is not null
  group by cuenta_destino_id
) entradas on entradas.cuenta_id = c.id
left join (
  select cuenta_origen_id as cuenta_id, sum(monto_origen) as total
  from movimientos
  where cuenta_origen_id is not null
  group by cuenta_origen_id
) salidas on salidas.cuenta_id = c.id
where c.activa = true;
