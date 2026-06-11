-- Crear tabla para registrar qué empleados han visto cada noticia
create table if not exists noticias_vistos (
  id bigint generated always as identity primary key,
  noticia_id text not null,
  empleado_id text not null,
  visto_at timestamptz not null default now(),
  unique(noticia_id, empleado_id)
);
