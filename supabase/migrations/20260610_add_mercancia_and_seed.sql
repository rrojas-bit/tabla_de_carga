-- ============================================================
-- Columna mercancia + seed de cargas/movimientos de prueba
-- Applied: 2026-06-10 (vía MCP apply_migration:
--   add_mercancia_and_seed_cargas_movimientos)
-- ============================================================

-- Tipo de mercancía transportada (Café, Frijol, Concentrado, etc.)
-- Texto libre a propósito: el catálogo de productos no está cerrado.
ALTER TABLE public.cargas ADD COLUMN IF NOT EXISTS mercancia text;

-- El seed de 20 cargas (20'/40' × import/export) + 12 movimientos se aplicó
-- directamente en la base de datos. No se versiona aquí porque depende de
-- UUIDs de empresas/puertos específicos del entorno.
