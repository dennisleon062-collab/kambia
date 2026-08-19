-- ============================================================================
-- Kambia — Sistema de control de dinero para casa de cambio informal
-- Migración inicial: schema completo + integridad + saldos calculados
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Usuarios del sistema
-- El id de usuarios coincide con auth.users.id (login por Supabase Auth).
-- ----------------------------------------------------------------------------
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('dueña', 'trabajador')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Catálogo de monedas
-- ----------------------------------------------------------------------------
create table monedas (
  codigo text primary key check (codigo in ('PEN', 'USD', 'EUR', 'MONEDAS')),
  nombre text not null
);

insert into monedas (codigo, nombre) values
  ('PEN', 'Soles'),
  ('USD', 'Dólares'),
  ('EUR', 'Euros'),
  ('MONEDAS', 'Monedas/billetes físicos (valorados en soles)');

-- ----------------------------------------------------------------------------
-- 3. Cuentas (bancos, efectivo bóveda, fondo Juan)
-- ----------------------------------------------------------------------------
create table cuentas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  tipo text not null check (tipo in ('banco', 'efectivo_boveda', 'fondo_juan')),
  moneda_codigo text not null references monedas (codigo),
  activa boolean not null default true
);

insert into cuentas (nombre, slug, tipo, moneda_codigo) values
  ('BCP Soles - Dennis',        'bcp_pen_dennis',        'banco', 'PEN'),
  ('BCP Dólares - Dennis',      'bcp_usd_dennis',        'banco', 'USD'),
  ('BCP Soles - Andrea',        'bcp_pen_andrea',        'banco', 'PEN'),
  ('BCP Dólares - Andrea',      'bcp_usd_andrea',        'banco', 'USD'),
  ('BCP Soles - Juan',          'bcp_pen_juan',          'banco', 'PEN'),
  ('BCP Dólares - Juan',        'bcp_usd_juan',          'banco', 'USD'),
  ('Scotiabank Soles - Mili',   'scotiabank_pen_mili',   'banco', 'PEN'),
  ('Scotiabank Dólares - Mili', 'scotiabank_usd_mili',   'banco', 'USD'),
  ('BBVA Soles - Dennis',       'bbva_pen_dennis',       'banco', 'PEN'),
  ('BBVA Dólares - Dennis',     'bbva_usd_dennis',       'banco', 'USD'),
  ('Interbank Soles - Dennis',    'interbank_pen_dennis',   'banco', 'PEN'),
  ('Interbank Dólares - Dennis',  'interbank_usd_dennis',   'banco', 'USD'),
  ('Interbank Soles - Andrea',    'interbank_pen_andrea',   'banco', 'PEN'),
  ('Interbank Dólares - Andrea',  'interbank_usd_andrea',   'banco', 'USD'),
  ('Bóveda Efectivo Soles',   'boveda_efectivo_pen', 'efectivo_boveda', 'PEN'),
  ('Bóveda Efectivo Dólares', 'boveda_efectivo_usd', 'efectivo_boveda', 'USD'),
  ('Bóveda Efectivo Euros',   'boveda_efectivo_eur', 'efectivo_boveda', 'EUR'),
  ('Bóveda Monedas',          'boveda_monedas',      'efectivo_boveda', 'MONEDAS'),
  ('Fondo de Juan',           'fondo_juan_pen',      'fondo_juan',      'PEN');

-- ----------------------------------------------------------------------------
-- 4. Tipo de cambio histórico (varias veces al día)
-- ----------------------------------------------------------------------------
create table tipos_cambio (
  id uuid primary key default gen_random_uuid(),
  fecha_hora timestamptz not null default now(),
  tc_usd numeric(12, 4) not null check (tc_usd > 0),
  tc_eur numeric(12, 4) not null check (tc_eur > 0),
  usuario_id uuid not null references usuarios (id)
);

create index idx_tipos_cambio_fecha on tipos_cambio (fecha_hora desc);

-- ----------------------------------------------------------------------------
-- 5. Comisiones configurables
-- ----------------------------------------------------------------------------
create table comisiones_config (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('monedas', 'billetes')),
  tasa_por_100 numeric(6, 2) not null check (tasa_por_100 >= 0),
  vigente_desde timestamptz not null default now()
);

insert into comisiones_config (tipo, tasa_por_100) values
  ('monedas', 2.00),
  ('billetes', 1.00);

create index idx_comisiones_vigencia on comisiones_config (tipo, vigente_desde desc);

-- ----------------------------------------------------------------------------
-- 6. Cuentas por cobrar + abonos parciales
-- (se crean antes de movimientos porque movimientos las referencia)
-- ----------------------------------------------------------------------------
create table cuentas_por_cobrar (
  id uuid primary key default gen_random_uuid(),
  cliente_texto text not null,
  moneda text not null references monedas (codigo),
  monto_original numeric(14, 2) not null check (monto_original > 0),
  fecha_operacion timestamptz not null default now(),
  movimiento_id uuid -- FK agregada tras crear movimientos
);

-- ----------------------------------------------------------------------------
-- 7. Movimientos (núcleo del sistema, doble cara, inmutable)
-- ----------------------------------------------------------------------------
create table movimientos (
  id uuid primary key default gen_random_uuid(),
  fecha_hora timestamptz not null default now(),
  fecha_contable date not null default current_date,
  usuario_id uuid not null references usuarios (id),
  tipo text not null check (tipo in (
    'compra_divisa', 'venta_divisa', 'cruce_divisas',
    'traspaso_banco_efectivo', 'traspaso_interno',
    'venta_monedas_billetes', 'pago_deuda_cliente',
    'prestamo_a_cliente', 'deposito_sin_identificar',
    'ajuste_correccion', 'saldo_inicial'
  )),
  cliente_texto text,

  cuenta_origen_id uuid references cuentas (id),
  moneda_origen text references monedas (codigo),
  monto_origen numeric(14, 2) check (monto_origen is null or monto_origen > 0),

  cuenta_destino_id uuid references cuentas (id),
  moneda_destino text references monedas (codigo),
  monto_destino numeric(14, 2) check (monto_destino is null or monto_destino > 0),

  tipo_cambio_id uuid references tipos_cambio (id),
  -- TC negociado de esta operación puntual (compra_divisa/venta_divisa/cruce_divisas).
  -- El TC de `tipos_cambio` es solo la referencia para el cierre diario (variación
  -- cambiaria); cada operación trae su propio TC, no el de la tabla tipos_cambio.
  tc_aplicado numeric(12, 4),
  comision_calculada numeric(14, 2),

  cuenta_por_cobrar_id uuid references cuentas_por_cobrar (id),

  estado text not null default 'normal' check (estado in ('normal', 'pendiente_identificar', 'identificado')),

  movimiento_corregido_id uuid references movimientos (id),

  comentario text,

  creado_en timestamptz not null default now(),

  constraint chk_origen_o_destino check (cuenta_origen_id is not null or cuenta_destino_id is not null),
  constraint chk_ajuste_referencia check (tipo <> 'ajuste_correccion' or movimiento_corregido_id is not null)
);

alter table cuentas_por_cobrar
  add constraint fk_cxc_movimiento foreign key (movimiento_id) references movimientos (id);

create index idx_movimientos_fecha_contable on movimientos (fecha_contable);
create index idx_movimientos_cuenta_origen on movimientos (cuenta_origen_id);
create index idx_movimientos_cuenta_destino on movimientos (cuenta_destino_id);
create index idx_movimientos_cliente on movimientos (cliente_texto);
create index idx_movimientos_estado on movimientos (estado) where estado = 'pendiente_identificar';

-- ----------------------------------------------------------------------------
-- 8. Abonos parciales a cuentas por cobrar
-- ----------------------------------------------------------------------------
create table abonos_cxc (
  id uuid primary key default gen_random_uuid(),
  cuenta_por_cobrar_id uuid not null references cuentas_por_cobrar (id),
  fecha timestamptz not null default now(),
  monto_abonado numeric(14, 2) not null check (monto_abonado > 0),
  movimiento_id uuid not null references movimientos (id)
);

create index idx_abonos_cxc_cuenta on abonos_cxc (cuenta_por_cobrar_id);

-- ----------------------------------------------------------------------------
-- 9. Fondo diario de Juan (préstamo)
-- ----------------------------------------------------------------------------
create table fondo_diario (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  usuario_id uuid not null references usuarios (id),
  monto_entregado numeric(14, 2) not null check (monto_entregado > 0),
  monto_devuelto numeric(14, 2),
  diferencia numeric(14, 2) generated always as (
    coalesce(monto_devuelto, 0) - monto_entregado
  ) stored,
  estado text not null default 'investigando' check (
    estado in ('cuadrado', 'investigando', 'asumido_por_juan', 'pendiente_devolucion')
  ),
  observacion text,
  creado_en timestamptz not null default now(),
  unique (fecha, usuario_id)
);

create index idx_fondo_diario_fecha on fondo_diario (fecha desc);

-- ----------------------------------------------------------------------------
-- 10. Bitácora informativa de operaciones de Juan (no afecta el cuadre)
-- ----------------------------------------------------------------------------
create table movimientos_juan (
  id uuid primary key default gen_random_uuid(),
  fondo_diario_id uuid not null references fondo_diario (id),
  hora timestamptz not null default now(),
  cliente_texto text,
  tipo_operacion text not null,
  moneda_origen text references monedas (codigo),
  monto_origen numeric(14, 2),
  moneda_destino text references monedas (codigo),
  monto_destino numeric(14, 2),
  tc_aplicado numeric(12, 4),
  comentario text
);

create index idx_movimientos_juan_fondo on movimientos_juan (fondo_diario_id);

-- ----------------------------------------------------------------------------
-- 11. Cierres diarios
-- ----------------------------------------------------------------------------
create table cierres_diarios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora_cierre timestamptz not null default now(),
  cuenta_id uuid not null references cuentas (id),
  saldo_sistema numeric(14, 2) not null,
  conteo_milagro numeric(14, 2),
  conteo_juan numeric(14, 2),
  diferencia_real numeric(14, 2),
  variacion_cambiaria numeric(14, 2),
  estado text not null default 'con_diferencia' check (estado in ('cuadrado', 'con_diferencia')),
  observacion text,
  cerrado boolean not null default false,
  usuario_id uuid not null references usuarios (id),
  creado_en timestamptz not null default now(),
  unique (fecha, cuenta_id)
);

create index idx_cierres_fecha on cierres_diarios (fecha desc);

-- ============================================================================
-- INMUTABILIDAD: movimientos nunca se editan ni se borran (salvo admin + log)
-- ============================================================================

create table movimientos_audit_log (
  id uuid primary key default gen_random_uuid(),
  movimiento_id uuid not null,
  accion text not null check (accion in ('update', 'delete')),
  usuario_id uuid,
  datos_previos jsonb not null,
  fecha_hora timestamptz not null default now()
);

create or replace function fn_bloquear_edicion_movimientos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from usuarios
    where id = auth.uid() and rol = 'dueña'
  ) then
    raise exception 'Los movimientos son inmutables. Use un ajuste_correccion en su lugar.';
  end if;

  insert into movimientos_audit_log (movimiento_id, accion, usuario_id, datos_previos)
  values (old.id, lower(tg_op), auth.uid(), to_jsonb(old));

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_bloquear_update_movimientos
  before update on movimientos
  for each row execute function fn_bloquear_edicion_movimientos();

create trigger trg_bloquear_delete_movimientos
  before delete on movimientos
  for each row execute function fn_bloquear_edicion_movimientos();

-- Bloqueo de días cerrados: no se pueden insertar movimientos con fecha_contable
-- de un día ya cerrado (todas las cuentas afectadas cerradas), salvo ajustes que
-- siempre se registran con fecha_contable = hoy.
create or replace function fn_bloquear_movimientos_dia_cerrado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cerrado boolean;
begin
  select exists (
    select 1 from cierres_diarios
    where fecha = new.fecha_contable
      and cerrado = true
      and cuenta_id in (coalesce(new.cuenta_origen_id, new.cuenta_destino_id), coalesce(new.cuenta_destino_id, new.cuenta_origen_id))
  ) into v_cerrado;

  if v_cerrado then
    raise exception 'El día % ya está cerrado. Registre un ajuste_correccion con fecha de hoy.', new.fecha_contable;
  end if;

  return new;
end;
$$;

create trigger trg_bloquear_movimientos_dia_cerrado
  before insert on movimientos
  for each row execute function fn_bloquear_movimientos_dia_cerrado();

-- ============================================================================
-- SALDOS CALCULADOS (nunca almacenados): vista que suma/resta movimientos
-- security_invoker=true: la vista corre con los permisos de quien consulta,
-- no del dueño de la vista, para que SÍ respete el RLS de las tablas base
-- (sin esto, cualquiera sin login podría leer los saldos vía la API).
-- ============================================================================
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

-- Saldo pendiente de cuentas por cobrar = monto_original - SUM(abonos)
create or replace view v_cuentas_por_cobrar_saldo
with (security_invoker = true) as
select
  cxc.id,
  cxc.cliente_texto,
  cxc.moneda,
  cxc.monto_original,
  cxc.fecha_operacion,
  cxc.movimiento_id,
  coalesce(ab.total_abonado, 0) as total_abonado,
  cxc.monto_original - coalesce(ab.total_abonado, 0) as saldo_pendiente
from cuentas_por_cobrar cxc
left join (
  select cuenta_por_cobrar_id, sum(monto_abonado) as total_abonado
  from abonos_cxc
  group by cuenta_por_cobrar_id
) ab on ab.cuenta_por_cobrar_id = cxc.id;

-- TC vigente más reciente
create or replace view v_tipo_cambio_vigente
with (security_invoker = true) as
select tc_usd, tc_eur, fecha_hora
from tipos_cambio
order by fecha_hora desc
limit 1;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table usuarios enable row level security;
alter table monedas enable row level security;
alter table cuentas enable row level security;
alter table tipos_cambio enable row level security;
alter table comisiones_config enable row level security;
alter table movimientos enable row level security;
alter table cuentas_por_cobrar enable row level security;
alter table abonos_cxc enable row level security;
alter table fondo_diario enable row level security;
alter table movimientos_juan enable row level security;
alter table cierres_diarios enable row level security;
alter table movimientos_audit_log enable row level security;

-- Todo usuario autenticado (Milagro o Juan) puede leer/escribir: son solo 2
-- personas de confianza operando el mismo negocio. Se restringe solo lectura
-- del log de auditoría a la dueña.
create policy "usuarios_select" on usuarios for select to authenticated using (true);
create policy "monedas_select" on monedas for select to authenticated using (true);
create policy "cuentas_select" on cuentas for select to authenticated using (true);

create policy "tipos_cambio_select" on tipos_cambio for select to authenticated using (true);
create policy "tipos_cambio_insert" on tipos_cambio for insert to authenticated with check (usuario_id = auth.uid());

create policy "comisiones_select" on comisiones_config for select to authenticated using (true);
create policy "comisiones_insert" on comisiones_config for insert to authenticated
  with check (exists (select 1 from usuarios where id = auth.uid() and rol = 'dueña'));

create policy "movimientos_select" on movimientos for select to authenticated using (true);
create policy "movimientos_insert" on movimientos for insert to authenticated with check (usuario_id = auth.uid());
-- Update solo para identificar depósitos pendientes o correcciones excepcionales de la dueña;
-- el trigger fn_bloquear_edicion_movimientos exige rol 'dueña' y deja log en movimientos_audit_log.
create policy "movimientos_update_dueña" on movimientos for update to authenticated
  using (exists (select 1 from usuarios where id = auth.uid() and rol = 'dueña'));
-- Borrado real solo para casos excepcionales (ej. limpiar datos de prueba al
-- configurar el sistema); igual que el update, el trigger de inmutabilidad
-- exige rol 'dueña' y deja log en movimientos_audit_log.
create policy "movimientos_delete_dueña" on movimientos for delete to authenticated
  using (exists (select 1 from usuarios where id = auth.uid() and rol = 'dueña'));

create policy "cxc_select" on cuentas_por_cobrar for select to authenticated using (true);
create policy "cxc_insert" on cuentas_por_cobrar for insert to authenticated with check (true);
create policy "cxc_update" on cuentas_por_cobrar for update to authenticated using (true);

create policy "abonos_select" on abonos_cxc for select to authenticated using (true);
create policy "abonos_insert" on abonos_cxc for insert to authenticated with check (true);

create policy "fondo_diario_select" on fondo_diario for select to authenticated using (true);
create policy "fondo_diario_insert" on fondo_diario for insert to authenticated with check (true);
create policy "fondo_diario_update" on fondo_diario for update to authenticated using (true);

create policy "movimientos_juan_select" on movimientos_juan for select to authenticated using (true);
create policy "movimientos_juan_insert" on movimientos_juan for insert to authenticated with check (true);

create policy "cierres_select" on cierres_diarios for select to authenticated using (true);
create policy "cierres_insert" on cierres_diarios for insert to authenticated with check (usuario_id = auth.uid());
create policy "cierres_update" on cierres_diarios for update to authenticated using (true);

create policy "audit_log_select_dueña" on movimientos_audit_log for select to authenticated
  using (exists (select 1 from usuarios where id = auth.uid() and rol = 'dueña'));
