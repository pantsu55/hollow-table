-- Canal privado entre o app do Mestre e a página da TV (a mesma conta nos dois aparelhos).
-- Só a própria pessoa entra no canal "tv:<id dela>": ninguém mais ouve nem envia comandos.
create policy "tv: dono ouve" on realtime.messages for select to authenticated
  using (realtime.topic() = 'tv:' || (select auth.uid())::text);
create policy "tv: dono fala" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'tv:' || (select auth.uid())::text);
