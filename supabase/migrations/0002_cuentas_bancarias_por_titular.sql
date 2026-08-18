-- ============================================================================
-- Actualiza el catálogo de cuentas bancarias: cada banco se maneja con
-- cuentas personales de distintos titulares (no hay cuenta empresarial),
-- y se agrega BBVA. Se elimina la cuenta genérica "conta".
--
-- Los titulares (Dennis, Andrea, Juan, Mili) son solo un dato descriptivo
-- en el nombre de la cuenta — no tienen relación con la tabla `usuarios`
-- ni con el login del sistema.
-- ============================================================================

delete from cuentas where slug in ('bcp_pen', 'bcp_usd', 'scotiabank_pen', 'scotiabank_usd', 'interbank_pen', 'interbank_usd', 'conta_pen', 'conta_usd');

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
  ('Interbank Dólares - Andrea',  'interbank_usd_andrea',   'banco', 'USD')
on conflict (slug) do nothing;
