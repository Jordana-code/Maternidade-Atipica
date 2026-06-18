-- =====================================================================
-- BANCO DE DADOS SUPABASE — Maternidade Atípica
-- =====================================================================

-- =====================================================================
-- 1. TABELA: perfis
-- =====================================================================
create table if not exists public.perfis (
    id uuid primary key references auth.users (id) on delete cascade,
    nome text not null,
    avatar_url text,
    criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Remove políticas antigas para recriar de forma limpa
drop policy if exists "Perfis sao visiveis para todos" on public.perfis;
drop policy if exists "Usuarios podem criar o proprio perfil" on public.perfis;
drop policy if exists "Usuarios podem atualizar o proprio perfil" on public.perfis;

create policy "Perfis sao visiveis para todos"
    on public.perfis for select
    using (true);

create policy "Usuarios podem criar o proprio perfil"
    on public.perfis for insert
    with check (auth.uid() = id);

create policy "Usuarios podem atualizar o proprio perfil"
    on public.perfis for update
    using (auth.uid() = id);


-- ---------------------------------------------------------------
-- GATILHO: cria automaticamente uma linha em "perfis" quando
-- uma nova conta é criada em auth.users.
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.perfis (id, nome, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nome', 'Mãe da Comunidade'),
        null
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();


-- =====================================================================
-- 2. TABELA: publicacoes (Blog da Comunidade)
-- =====================================================================
create table if not exists public.publicacoes (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references auth.users (id) on delete cascade,
    titulo text not null,
    texto text not null,
    criado_em timestamptz not null default now()
);

create index if not exists publicacoes_usuario_id_idx on public.publicacoes (usuario_id);
create index if not exists publicacoes_criado_em_idx on public.publicacoes (criado_em desc);

alter table public.publicacoes enable row level security;

drop policy if exists "Publicacoes sao visiveis para todos" on public.publicacoes;
drop policy if exists "Usuarios logados podem publicar" on public.publicacoes;
drop policy if exists "Autoras podem editar suas publicacoes" on public.publicacoes;
drop policy if exists "Autoras podem excluir suas publicacoes" on public.publicacoes;

create policy "Publicacoes sao visiveis para todos"
    on public.publicacoes for select
    using (true);

create policy "Usuarios logados podem publicar"
    on public.publicacoes for insert
    with check (auth.uid() = usuario_id);

create policy "Autoras podem editar suas publicacoes"
    on public.publicacoes for update
    using (auth.uid() = usuario_id);

create policy "Autoras podem excluir suas publicacoes"
    on public.publicacoes for delete
    using (auth.uid() = usuario_id);


-- =====================================================================
-- 3. TABELA: comentarios (Comentários do Blog)
-- =====================================================================
create table if not exists public.comentarios (
    id uuid primary key default gen_random_uuid(),
    publicacao_id uuid not null references public.publicacoes (id) on delete cascade,
    usuario_id uuid not null references auth.users (id) on delete cascade,
    texto text not null,
    criado_em timestamptz not null default now()
);

create index if not exists comentarios_publicacao_id_idx on public.comentarios (publicacao_id);
create index if not exists comentarios_usuario_id_idx on public.comentarios (usuario_id);

alter table public.comentarios enable row level security;

drop policy if exists "Comentarios sao visiveis para todos" on public.comentarios;
drop policy if exists "Usuarios logados podem comentar" on public.comentarios;
drop policy if exists "Autoras podem editar seus comentarios" on public.comentarios;
drop policy if exists "Autoras podem excluir seus comentarios" on public.comentarios;

create policy "Comentarios sao visiveis para todos"
    on public.comentarios for select
    using (true);

create policy "Usuarios logados podem comentar"
    on public.comentarios for insert
    with check (auth.uid() = usuario_id);

create policy "Autoras podem editar seus comentarios"
    on public.comentarios for update
    using (auth.uid() = usuario_id);

create policy "Autoras podem excluir seus comentarios"
    on public.comentarios for delete
    using (auth.uid() = usuario_id);


-- =====================================================================
-- 4. TABELA: relatos (Espaço de Relatos)
-- =====================================================================
create table if not exists public.relatos (
    id uuid primary key default gen_random_uuid(),
    usuario_id uuid not null references auth.users (id) on delete cascade,
    titulo text not null,
    nome_crianca text,
    texto text not null,
    criado_em timestamptz not null default now()
);

create index if not exists relatos_usuario_id_idx on public.relatos (usuario_id);
create index if not exists relatos_criado_em_idx on public.relatos (criado_em desc);

alter table public.relatos enable row level security;

-- Remove todas as políticas antigas antes de recriar
drop policy if exists "Relatos sao visiveis para todos" on public.relatos;
drop policy if exists "Usuarios logados podem publicar relatos" on public.relatos;
drop policy if exists "Autoras podem editar seus relatos" on public.relatos;
drop policy if exists "Autoras podem excluir seus relatos" on public.relatos;

-- Qualquer pessoa (logada ou não) pode ler os relatos
create policy "Relatos sao visiveis para todos"
    on public.relatos for select
    using (true);

-- Apenas usuárias logadas podem publicar um relato, somente em seu próprio nome
create policy "Usuarios logados podem publicar relatos"
    on public.relatos for insert
    with check (auth.uid() = usuario_id);

-- A autora pode editar seu próprio relato
create policy "Autoras podem editar seus relatos"
    on public.relatos for update
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

-- A autora pode excluir seu próprio relato
create policy "Autoras podem excluir seus relatos"
    on public.relatos for delete
    using (auth.uid() = usuario_id);


-- =====================================================================
-- 5. STORAGE: bucket "avatars" (fotos de perfil)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Remove políticas antigas de storage antes de recriar
drop policy if exists "Avatares sao publicos para leitura" on storage.objects;
drop policy if exists "Usuarios podem enviar seu proprio avatar" on storage.objects;
drop policy if exists "Usuarios podem atualizar seu proprio avatar" on storage.objects;
drop policy if exists "Usuarios podem excluir seu proprio avatar" on storage.objects;

create policy "Avatares sao publicos para leitura"
    on storage.objects for select
    using (bucket_id = 'avatars');

create policy "Usuarios podem enviar seu proprio avatar"
    on storage.objects for insert
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Usuarios podem atualizar seu proprio avatar"
    on storage.objects for update
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Usuarios podem excluir seu proprio avatar"
    on storage.objects for delete
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
