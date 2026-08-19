-- ============================================================================
-- Kambia — Tipo de movimiento "gasto" + resumen diario (ganancia declarada)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Nuevo tipo de movimiento: gasto
-- Dinero real que sale de una cuenta (bóveda o banco) sin destino, ej. pagar
-- gasolina, sueldos, etc. Se registra igual que un traspaso pero sin la otra
-- punta, y resta el saldo real de la cuenta de origen.
-- ----------------------------------------------------------------------------
alter table movimientos drop constraint if exists movimientos_tipo_check;

alter table movimientos add constraint movimientos_tipo_check check (tipo in (
  'compra_divisa', 'venta_divisa', 'cruce_divisas',
  'traspaso_banco_efectivo', 'traspaso_interno',
  'venta_monedas_billetes', 'pago_deuda_cliente',
  'prestamo_a_cliente', 'deposito_sin_identificar',
  'gasto',
  'ajuste_correccion', 'saldo_inicial'
));

-- ----------------------------------------------------------------------------
-- 2. Resumen diario: la ganancia del día (que Milagro ya calcula de cabeza,
-- no se registra como movimiento) junto a una foto del total en soles del
-- sistema en ese momento, para poder comparar mañana: ayer - gastos + ganancia
-- contra el total en vivo de hoy.
-- ----------------------------------------------------------------------------
create table resumen_diario (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  ganancia numeric(14, 2) not null,
  total_soles numeric(14, 2) not null,
  comentario text,
  usuario_id uuid not null references usuarios (id),
  creado_en timestamptz not null default now()
);

create index idx_resumen_diario_fecha on resumen_diario (fecha desc);

alter table resumen_diario enable row level security;

create policy "resumen_diario_select" on resumen_diario for select to authenticated using (true);
create policy "resumen_diario_insert" on resumen_diario for insert to authenticated
  with check (usuario_id = auth.uid());
create policy "resumen_diario_update" on resumen_diario for update to authenticated
  using (usuario_id = auth.uid());
