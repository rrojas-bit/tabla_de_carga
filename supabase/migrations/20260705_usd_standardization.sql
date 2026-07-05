-- ============================================================
-- Estandarización de moneda a USD
-- Toda la plataforma opera en USD (ver docs/PLAN_DUCA_AI.md §2).
-- La industria naviera y las DUCA ya declaran valores en USD, y
-- nos da flexibilidad para operar en otros países centroamericanos.
--
-- Columna `moneda` agregada para flexibilidad futura multi-moneda;
-- no hay UI de selección todavía — todo default 'USD'.
-- ============================================================

ALTER TABLE public.bids         ADD COLUMN IF NOT EXISTS moneda char(3) NOT NULL DEFAULT 'USD';
ALTER TABLE public.cargas       ADD COLUMN IF NOT EXISTS moneda char(3) NOT NULL DEFAULT 'USD';
ALTER TABLE public.tarifas_ruta ADD COLUMN IF NOT EXISTS moneda char(3) NOT NULL DEFAULT 'USD';
