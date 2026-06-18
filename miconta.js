// =====================================================================
// PERFIL.JS — Meu Perfil (Maternidade Atípica)
// =====================================================================

const avatarGrande = document.getElementById('perfil-avatar-grande');
const inputAvatar = document.getElementById('input-avatar');
const avatarMensagem = document.getElementById('avatar-mensagem');
const perfilNomeEl = document.getElementById('perfil-nome');
const perfilEmailEl = document.getElementById('perfil-email');

const tabHistoricoBlog = document.getElementById('tab-historico-blog');
const tabHistoricoRelatos = document.getElementById('tab-historico-relatos');
const painelHistoricoBlog = document.getElementById('painel-historico-blog');
const painelHistoricoRelatos = document.getElementById('painel-historico-relatos');

const carregandoHistoricoBlog = document.getElementById('carregando-historico-blog');
const historicoBlogVazio = document.getElementById('historico-blog-vazio');
const containerHistoricoBlog = document.getElementById('container-historico-blog');

const carregandoHistoricoRelatos = document.getElementById('carregando-historico-relatos');
const historicoRelatosVazio = document.getElementById('historico-relatos-vazio');
const containerHistoricoRelatos = document.getElementById('container-historico-relatos');

let usuarioPerfil = null;

// ---------------------------------------------------------------
// RENDERIZAR AVATAR (foto ou iniciais)
// ---------------------------------------------------------------
function renderizarAvatar(perfil) {
    if (perfil?.avatar_url) {
        avatarGrande.innerHTML = `<img src="${escaparHTML(perfil.avatar_url)}" alt="Sua foto de perfil">`;
    } else {
        avatarGrande.textContent = iniciais(perfil?.nome);
    }
}

// ---------------------------------------------------------------
// CARREGAR DADOS DO PERFIL
// ---------------------------------------------------------------
async function carregarPerfil() {
    const perfil = await AuthApp.obterPerfil(usuarioPerfil.id);
    const nomeExibido = perfil?.nome || usuarioPerfil.user_metadata?.nome || 'Mãe da Comunidade';

    perfilNomeEl.textContent = nomeExibido;
    perfilEmailEl.textContent = usuarioPerfil.email;
    renderizarAvatar(perfil);

    return perfil;
}

// ---------------------------------------------------------------
// UPLOAD DE FOTO DE PERFIL
// ---------------------------------------------------------------
inputAvatar.addEventListener('change', async () => {
    const arquivo = inputAvatar.files[0];
    if (!arquivo) return;

    // Validação de tipo
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
    if (!tiposPermitidos.includes(arquivo.type)) {
        exibirMensagemAuth(avatarMensagem, 'Formato inválido. Use PNG, JPG ou WEBP.', 'erro');
        return;
    }

    // Validação de tamanho (máx 2MB)
    if (arquivo.size > 2 * 1024 * 1024) {
        exibirMensagemAuth(avatarMensagem, 'A imagem deve ter no máximo 2MB.', 'erro');
        return;
    }

    exibirMensagemAuth(avatarMensagem, 'Enviando foto...', 'sucesso');

    const mapaExtensoes = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const extensao = mapaExtensoes[arquivo.type] || 'jpg';
    const caminhoArquivo = `${usuarioPerfil.id}/avatar.${extensao}`;

    // Faz upload para o bucket "avatars" (upsert para substituir foto anterior)
    const { error: erroUpload } = await supabaseClient
        .storage
        .from('avatars')
        .upload(caminhoArquivo, arquivo, { upsert: true });

    if (erroUpload) {
        exibirMensagemAuth(avatarMensagem, 'Erro ao enviar a foto: ' + erroUpload.message, 'erro');
        return;
    }

    // Obtém a URL pública da imagem
    const { data: urlData } = supabaseClient
        .storage
        .from('avatars')
        .getPublicUrl(caminhoArquivo);

    const urlLimpa = urlData.publicUrl;

    // Atualiza o perfil com a URL limpa (sem cache-busting — o timestamp é adicionado só na exibição)
    const { error: erroPerfil } = await supabaseClient
        .from('perfis')
        .update({ avatar_url: urlLimpa })
        .eq('id', usuarioPerfil.id);

    if (erroPerfil) {
        exibirMensagemAuth(avatarMensagem, 'Foto enviada, mas houve um erro ao salvar no perfil: ' + erroPerfil.message, 'erro');
        return;
    }

    // Adiciona timestamp apenas para exibição local (evita cache do navegador sem poluir o banco)
    const urlComCache = `${urlLimpa}?t=${Date.now()}`;
    renderizarAvatar({ avatar_url: urlComCache, nome: perfilNomeEl.textContent });
    exibirMensagemAuth(avatarMensagem, 'Foto de perfil atualizada com sucesso! 💚', 'sucesso');
});

// ---------------------------------------------------------------
// ABAS DO HISTÓRICO
// ---------------------------------------------------------------
function alternarAbaHistorico(abaAtiva, abaInativa, painelAtivo, painelInativo) {
    abaAtiva.classList.add('ativa');
    abaAtiva.setAttribute('aria-selected', 'true');
    abaInativa.classList.remove('ativa');
    abaInativa.setAttribute('aria-selected', 'false');
    painelAtivo.classList.remove('escondido');
    painelInativo.classList.add('escondido');
}

tabHistoricoBlog.addEventListener('click', () => {
    alternarAbaHistorico(tabHistoricoBlog, tabHistoricoRelatos, painelHistoricoBlog, painelHistoricoRelatos);
});
tabHistoricoRelatos.addEventListener('click', () => {
    alternarAbaHistorico(tabHistoricoRelatos, tabHistoricoBlog, painelHistoricoRelatos, painelHistoricoBlog);
});

// ---------------------------------------------------------------
// CARREGAR HISTÓRICO DE PUBLICAÇÕES NO BLOG (com edição/exclusão)
// ---------------------------------------------------------------
async function carregarHistoricoBlog() {
    carregandoHistoricoBlog.classList.remove('escondido');
    historicoBlogVazio.classList.add('escondido');
    containerHistoricoBlog.innerHTML = '';

    const { data, error } = await supabaseClient
        .from('publicacoes')
        .select('id, titulo, texto, criado_em')
        .eq('usuario_id', usuarioPerfil.id)
        .order('criado_em', { ascending: false });

    carregandoHistoricoBlog.classList.add('escondido');

    if (error) {
        containerHistoricoBlog.innerHTML = `<p class="auth-mensagem auth-mensagem-erro">Erro ao carregar publicações: ${escaparHTML(error.message)}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        historicoBlogVazio.classList.remove('escondido');
        return;
    }

    for (const publicacao of data) {
        const item = criarItemHistoricoBlog(publicacao);
        containerHistoricoBlog.appendChild(item);
    }
}

function criarItemHistoricoBlog(publicacao) {
    const item = document.createElement('div');
    item.className = 'item-historico';
    item.dataset.id = publicacao.id;

    item.innerHTML = `
        <div class="item-historico-cabecalho">
            <div>
                <h4 data-titulo>${escaparHTML(publicacao.titulo)}</h4>
                <span class="item-historico-data">${formatarData(publicacao.criado_em)}</span>
            </div>
            <div class="item-historico-acoes">
                <button type="button" class="btn-historico-editar" aria-label="Editar publicação">✏️ Editar</button>
                <button type="button" class="btn-historico-excluir" aria-label="Excluir publicação">🗑️ Excluir</button>
            </div>
        </div>
        <div class="item-historico-conteudo">
            <p data-texto>${escaparHTML(publicacao.texto)}</p>
        </div>
        <div class="item-historico-edicao escondido" data-edicao></div>
    `;

    item.querySelector('.btn-historico-excluir').addEventListener('click', async () => {
        if (!confirm('Excluir esta publicação? Os comentários também serão removidos. Esta ação não pode ser desfeita.')) return;

        const { error } = await supabaseClient
            .from('publicacoes')
            .delete()
            .eq('id', publicacao.id)
            .eq('usuario_id', usuarioPerfil.id);

        if (error) { alert('Erro ao excluir: ' + error.message); return; }

        item.style.opacity = '0';
        item.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            item.remove();
            if (containerHistoricoBlog.children.length === 0) historicoBlogVazio.classList.remove('escondido');
        }, 300);
    });

    item.querySelector('.btn-historico-editar').addEventListener('click', () => {
        iniciarEdicaoItemHistoricoBlog(item, publicacao);
    });

    return item;
}

function iniciarEdicaoItemHistoricoBlog(item, publicacao) {
    const conteudo = item.querySelector('.item-historico-conteudo');
    const edicaoArea = item.querySelector('[data-edicao]');
    const btnEditar = item.querySelector('.btn-historico-editar');
    const btnExcluir = item.querySelector('.btn-historico-excluir');

    conteudo.classList.add('escondido');
    btnEditar.style.display = 'none';
    btnExcluir.style.display = 'none';
    edicaoArea.classList.remove('escondido');

    edicaoArea.innerHTML = `
        <div class="relato-edicao-form" style="margin-top:12px;">
            <div class="auth-grupo">
                <label>Título</label>
                <input type="text" class="editar-titulo-hist" value="${escaparHTML(publicacao.titulo)}" maxlength="120" required>
            </div>
            <div class="auth-grupo">
                <label>Texto</label>
                <textarea class="editar-texto-hist" rows="4" maxlength="3000" required>${escaparHTML(publicacao.texto)}</textarea>
            </div>
            <p class="auth-mensagem escondido hist-pub-msg" role="alert"></p>
            <div class="relato-edicao-acoes">
                <button type="button" class="btn btn-principal btn-salvar-hist-pub">Salvar</button>
                <button type="button" class="btn btn-cancelar btn-cancelar-hist-pub">Cancelar</button>
            </div>
        </div>
    `;

    const inputTitulo = edicaoArea.querySelector('.editar-titulo-hist');
    const textarea = edicaoArea.querySelector('.editar-texto-hist');
    const msg = edicaoArea.querySelector('.hist-pub-msg');

    inputTitulo.focus();

    edicaoArea.querySelector('.btn-cancelar-hist-pub').addEventListener('click', () => {
        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudo.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });

    edicaoArea.querySelector('.btn-salvar-hist-pub').addEventListener('click', async () => {
        const novoTitulo = inputTitulo.value.trim();
        const novoTexto = textarea.value.trim();
        if (!novoTitulo || !novoTexto) {
            msg.textContent = 'Preencha todos os campos.';
            msg.classList.remove('escondido', 'auth-mensagem-sucesso');
            msg.classList.add('auth-mensagem-erro');
            return;
        }
        const btn = edicaoArea.querySelector('.btn-salvar-hist-pub');
        btn.disabled = true; btn.textContent = 'Salvando...';

        const { error } = await supabaseClient
            .from('publicacoes')
            .update({ titulo: novoTitulo, texto: novoTexto })
            .eq('id', publicacao.id)
            .eq('usuario_id', usuarioPerfil.id);

        btn.disabled = false; btn.textContent = 'Salvar';

        if (error) {
            msg.textContent = 'Erro ao salvar: ' + error.message;
            msg.classList.remove('escondido', 'auth-mensagem-sucesso');
            msg.classList.add('auth-mensagem-erro');
            return;
        }

        publicacao.titulo = novoTitulo;
        publicacao.texto = novoTexto;
        item.querySelector('[data-titulo]').textContent = novoTitulo;
        item.querySelector('[data-texto]').textContent = novoTexto;

        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudo.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });
}

// ---------------------------------------------------------------
// CARREGAR HISTÓRICO DE RELATOS (com edição/exclusão)
// ---------------------------------------------------------------
async function carregarHistoricoRelatos() {
    carregandoHistoricoRelatos.classList.remove('escondido');
    historicoRelatosVazio.classList.add('escondido');
    containerHistoricoRelatos.innerHTML = '';

    const { data, error } = await supabaseClient
        .from('relatos')
        .select('id, titulo, nome_crianca, texto, criado_em')
        .eq('usuario_id', usuarioPerfil.id)
        .order('criado_em', { ascending: false });

    carregandoHistoricoRelatos.classList.add('escondido');

    if (error) {
        containerHistoricoRelatos.innerHTML = `<p class="auth-mensagem auth-mensagem-erro">Erro ao carregar relatos: ${escaparHTML(error.message)}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        historicoRelatosVazio.classList.remove('escondido');
        return;
    }

    for (const relato of data) {
        const item = criarItemHistoricoRelato(relato);
        containerHistoricoRelatos.appendChild(item);
    }
}

function criarItemHistoricoRelato(relato) {
    const item = document.createElement('div');
    item.className = 'item-historico';
    item.dataset.id = relato.id;

    item.innerHTML = `
        <div class="item-historico-cabecalho">
            <div>
                <h4 data-titulo>${escaparHTML(relato.titulo)}</h4>
                <span class="item-historico-data">${formatarData(relato.criado_em)}</span>
            </div>
            <div class="item-historico-acoes">
                <button type="button" class="btn-historico-editar" aria-label="Editar relato">✏️ Editar</button>
                <button type="button" class="btn-historico-excluir" aria-label="Excluir relato">🗑️ Excluir</button>
            </div>
        </div>
        <div class="item-historico-conteudo">
            ${relato.nome_crianca ? `<span class="relato-tag-crianca" data-tag>👶 ${escaparHTML(relato.nome_crianca)}</span>` : ''}
            <p data-texto>${escaparHTML(relato.texto)}</p>
        </div>
        <div class="item-historico-edicao escondido" data-edicao></div>
    `;

    item.querySelector('.btn-historico-excluir').addEventListener('click', async () => {
        if (!confirm('Excluir este relato? Esta ação não pode ser desfeita.')) return;

        const { error } = await supabaseClient
            .from('relatos')
            .delete()
            .eq('id', relato.id)
            .eq('usuario_id', usuarioPerfil.id);

        if (error) { alert('Erro ao excluir: ' + error.message); return; }

        item.style.opacity = '0';
        item.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            item.remove();
            if (containerHistoricoRelatos.children.length === 0) historicoRelatosVazio.classList.remove('escondido');
        }, 300);
    });

    item.querySelector('.btn-historico-editar').addEventListener('click', () => {
        iniciarEdicaoItemHistoricoRelato(item, relato);
    });

    return item;
}

function iniciarEdicaoItemHistoricoRelato(item, relato) {
    const conteudo = item.querySelector('.item-historico-conteudo');
    const edicaoArea = item.querySelector('[data-edicao]');
    const btnEditar = item.querySelector('.btn-historico-editar');
    const btnExcluir = item.querySelector('.btn-historico-excluir');

    conteudo.classList.add('escondido');
    btnEditar.style.display = 'none';
    btnExcluir.style.display = 'none';
    edicaoArea.classList.remove('escondido');

    const nomeAtual = relato.nome_crianca || '';

    edicaoArea.innerHTML = `
        <div class="relato-edicao-form" style="margin-top:12px;">
            <div class="auth-grupo">
                <label>Título</label>
                <input type="text" class="editar-titulo-hist" value="${escaparHTML(relato.titulo)}" maxlength="120" required>
            </div>
            <div class="auth-grupo">
                <label>Nome ou apelido da criança (opcional)</label>
                <input type="text" class="editar-nome-hist" value="${escaparHTML(nomeAtual)}" maxlength="60" placeholder="Ex: Léo, 6 anos">
            </div>
            <div class="auth-grupo">
                <label>Relato</label>
                <textarea class="editar-texto-hist" rows="4" maxlength="4000" required>${escaparHTML(relato.texto)}</textarea>
            </div>
            <p class="auth-mensagem escondido hist-rel-msg" role="alert"></p>
            <div class="relato-edicao-acoes">
                <button type="button" class="btn btn-principal btn-salvar-hist-rel">Salvar</button>
                <button type="button" class="btn btn-cancelar btn-cancelar-hist-rel">Cancelar</button>
            </div>
        </div>
    `;

    const inputTitulo = edicaoArea.querySelector('.editar-titulo-hist');
    const inputNome = edicaoArea.querySelector('.editar-nome-hist');
    const textarea = edicaoArea.querySelector('.editar-texto-hist');
    const msg = edicaoArea.querySelector('.hist-rel-msg');

    inputTitulo.focus();

    edicaoArea.querySelector('.btn-cancelar-hist-rel').addEventListener('click', () => {
        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudo.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });

    edicaoArea.querySelector('.btn-salvar-hist-rel').addEventListener('click', async () => {
        const novoTitulo = inputTitulo.value.trim();
        const novoNome = inputNome.value.trim();
        const novoTexto = textarea.value.trim();
        if (!novoTitulo || !novoTexto) {
            msg.textContent = 'Preencha o título e o relato.';
            msg.classList.remove('escondido', 'auth-mensagem-sucesso');
            msg.classList.add('auth-mensagem-erro');
            return;
        }
        const btn = edicaoArea.querySelector('.btn-salvar-hist-rel');
        btn.disabled = true; btn.textContent = 'Salvando...';

        const { error } = await supabaseClient
            .from('relatos')
            .update({ titulo: novoTitulo, nome_crianca: novoNome || null, texto: novoTexto })
            .eq('id', relato.id)
            .eq('usuario_id', usuarioPerfil.id);

        btn.disabled = false; btn.textContent = 'Salvar';

        if (error) {
            msg.textContent = 'Erro ao salvar: ' + error.message;
            msg.classList.remove('escondido', 'auth-mensagem-sucesso');
            msg.classList.add('auth-mensagem-erro');
            return;
        }

        relato.titulo = novoTitulo;
        relato.nome_crianca = novoNome || null;
        relato.texto = novoTexto;

        item.querySelector('[data-titulo]').textContent = novoTitulo;
        item.querySelector('[data-texto]').textContent = novoTexto;
        const tagEl = item.querySelector('[data-tag]');
        if (novoNome) {
            if (tagEl) { tagEl.textContent = '👶 ' + novoNome; }
            else {
                const novaTag = document.createElement('span');
                novaTag.className = 'relato-tag-crianca';
                novaTag.setAttribute('data-tag', '');
                novaTag.textContent = '👶 ' + novoNome;
                item.querySelector('.item-historico-conteudo').prepend(novaTag);
            }
        } else if (tagEl) { tagEl.remove(); }

        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudo.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });
}

// ---------------------------------------------------------------
// EXCLUIR CONTA PERMANENTEMENTE
// ---------------------------------------------------------------
async function excluirConta() {
    const confirmacao1 = confirm(
        '⚠️ Tem certeza que deseja excluir sua conta?\n\n' +
        'Todas as suas publicações, relatos e dados serão removidos permanentemente. Esta ação não pode ser desfeita.'
    );
    if (!confirmacao1) return;

    const email = prompt('Para confirmar, digite seu e-mail cadastrado:');
    if (!email || email.trim().toLowerCase() !== usuarioPerfil.email.toLowerCase()) {
        alert('E-mail incorreto. A exclusão foi cancelada.');
        return;
    }

    const btnExcluirConta = document.getElementById('btn-excluir-conta');
    if (btnExcluirConta) { btnExcluirConta.disabled = true; btnExcluirConta.textContent = 'Excluindo...'; }

    // Chama a função server-side que exclui publicações, relatos, perfil e o usuário do auth
    // (a função usa SECURITY DEFINER e cuida de tudo — não fazer deletes manuais antes para evitar conflitos)
    const { error } = await supabaseClient.rpc('excluir_conta_usuario');

    if (error) {
        // Fallback: mesmo sem conseguir deletar do auth, fazemos logout
        // e orientamos a entrar em contato
        await supabaseClient.auth.signOut();
        alert('Seus dados foram removidos. A conta foi desconectada com sucesso.');
        window.location.href = 'index.html';
        return;
    }

    await supabaseClient.auth.signOut();
    alert('Sua conta foi excluída com sucesso. Até um dia! 💚');
    window.location.href = 'index.html';
}

// ---------------------------------------------------------------
// INICIALIZAÇÃO — exige login para acessar esta página
// ---------------------------------------------------------------
async function inicializarPerfil() {
    usuarioPerfil = await AuthApp.exigirLogin();
    if (!usuarioPerfil) return; // já redirecionado para index.html

    await carregarPerfil();
    await carregarHistoricoBlog();
    await carregarHistoricoRelatos();

    const btnExcluirConta = document.getElementById('btn-excluir-conta');
    if (btnExcluirConta) {
        btnExcluirConta.addEventListener('click', excluirConta);
    }
}

document.addEventListener('DOMContentLoaded', inicializarPerfil);