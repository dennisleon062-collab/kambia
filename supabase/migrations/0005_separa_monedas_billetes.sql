-- ============================================================================
-- Separa "Bóveda Monedas/Billetes" en dos cuentas: Monedas y Billetes.
-- Cada una lleva su propia tasa de comisión (S/2 monedas, S/1 billetes) y
-- ahora también su propio saldo, en vez de compartir una sola cuenta.
-- ============================================================================

update cuentas set nombre = 'Bóveda Monedas' where slug = 'boveda_monedas';

insert into cuentas (nombre, slug, tipo, moneda_codigo)
values ('Bóveda Billetes', 'boveda_billetes', 'efectivo_boveda', 'PEN')
on conflict (slug) do nothing;
