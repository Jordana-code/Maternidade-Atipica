-- =====================================================================
-- FUNÇÃO: excluir_conta_usuario
-- Permite que um usuário autenticado exclua sua própria conta
-- permanentemente, incluindo todos os dados vinculados.
-- =====================================================================


create or replace function public.excluir_conta_usuario()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
begin
    -- Garante que apenas usuários autenticados podem chamar
    if uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    -- Remove publicações (comentários são removidos em cascade pelo FK)
    delete from public.publicacoes where usuario_id = uid;

    -- Remove relatos
    delete from public.relatos where usuario_id = uid;

    -- Remove perfil (cascade do FK em auth.users já cuida, mas fazemos explicitamente)
    delete from public.perfis where id = uid;

    -- Remove o usuário do sistema de autenticação
    delete from auth.users where id = uid;
end;
$$;

-- Permite que qualquer usuário autenticado chame a função
grant execute on function public.excluir_conta_usuario() to authenticated;

-- =====================================================================
-- APÓS EXECUTAR ESTE SCRIPT:
--   O botão "Excluir minha conta" em miconta.html passará a funcionar
--   chamando esta função via supabaseClient.rpc('excluir_conta_usuario')
-- =====================================================================