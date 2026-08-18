-- ============================================================================
-- El TC de `tipos_cambio` es solo el de referencia para el cierre diario
-- (variación cambiaria). Cada compra_divisa/venta_divisa/cruce_divisas trae
-- su propio TC negociado en el momento — el operador lo escribe directo o el
-- sistema lo calcula a partir de los dos montos ingresados. Ya no se toma
-- automáticamente de `tipos_cambio` ni es obligatorio enlazarlo.
-- ============================================================================

alter table movimientos add column if not exists tc_aplicado numeric(12, 4);

comment on column movimientos.tc_aplicado is
  'TC de esta operación puntual (negociado o calculado desde monto_origen/monto_destino). No es el TC de tipos_cambio, que solo se usa como referencia para el cierre diario.';
