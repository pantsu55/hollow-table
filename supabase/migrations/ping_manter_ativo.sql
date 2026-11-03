-- Função mínima para manter o projeto ativo (chamada pela tarefa do GitHub).
create or replace function public.ping()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select now() $$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
