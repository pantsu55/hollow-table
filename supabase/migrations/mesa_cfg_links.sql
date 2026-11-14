-- Ajustes da mesa que os jogadores podem ler (ex.: links do Mestre no compêndio). Só o dono edita (regra "editar mesa").
alter table public.campaigns add column if not exists cfg jsonb not null default '{}'::jsonb;
alter table public.campaigns add constraint campaigns_cfg_size check (pg_column_size(cfg) < 200000);
