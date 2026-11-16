-- desenhos à mão livre guardam os pontos do traço: o limite por objeto sobe de 4 KB para 12 KB
alter table public.map_objs drop constraint map_objs_data_check;
alter table public.map_objs add constraint map_objs_data_check check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 12000);
