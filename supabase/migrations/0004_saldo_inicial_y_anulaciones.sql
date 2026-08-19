-- ============================================================================
-- Agrega el tipo saldo_inicial (carga de cuánto dinero había en cada cuenta
-- al empezar a usar el sistema) al catálogo cerrado de movimientos.
-- ============================================================================

alter table movimientos drop constraint if exists movimientos_tipo_check;

alter table movimientos add constraint movimientos_tipo_check check (tipo in (
  'compra_divisa', 'venta_divisa', 'cruce_divisas',
  'traspaso_banco_efectivo', 'traspaso_interno',
  'venta_monedas_billetes', 'pago_deuda_cliente',
  'prestamo_a_cliente', 'deposito_sin_identificar',
  'ajuste_correccion', 'saldo_inicial'
));
