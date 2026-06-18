// =====================================================================
// BLOG.JS — Blog da Comunidade (Maternidade Atípica)
// =====================================================================


const containerPublicacoes = document.getElementById('container-publicacoes');
const carregandoPublicacoes = document.getElementById('carregando-publicacoes');
const listaVazia = document.getElementById('lista-publicacoes-vazia');
const formNovaPublicacao = document.getElementById('form-nova-publicacao');
const publicacaoMensagem = document.getElementById('publicacao-mensagem');

let usuarioAtual = null;
let perfisCache = {};

// ---------------------------------------------------------------
// Util: busca e armazena perfis (nome + avatar) em cache
// ---------------------------------------------------------------
async function obterPerfilComCache(userId) {
    if (perfisCache[userId]) return perfisCache[userId];
    const perfil = await AuthApp.obterPerfil(userId);
    perfisCache[userId] = perfil || { nome: 'Mãe da Comunidade', avatar_url: null };
    return perfisCache[userId];
}

// ---------------------------------------------------------------
// CARREGAR PUBLICAÇÕES + COMENTÁRIOS
// ---------------------------------------------------------------
async function carregarPublicacoes() {
    carregandoPublicacoes.classList.remove('escondido');
    listaVazia.classList.add('escondido');
    containerPublicacoes.innerHTML = '';

    const { data: publicacoes, error } = await supabaseClient
        .from('publicacoes')
        .select('id, usuario_id, titulo, texto, criado_em')
        .order('criado_em', { ascending: false });

    carregandoPublicacoes.classList.add('escondido');

    if (error) {
        containerPublicacoes.innerHTML = `<p class="auth-mensagem auth-mensagem-erro">Não foi possível carregar as publicações: ${escaparHTML(error.message)}</p>`;
        return;
    }

    if (!publicacoes || publicacoes.length === 0) {
        listaVazia.classList.remove('escondido');
        return;
    }

    for (const publicacao of publicacoes) {
        const elemento = await criarElementoPublicacao(publicacao);
        containerPublicacoes.appendChild(elemento);
    }
}

// ---------------------------------------------------------------
// CRIAR ELEMENTO DE UMA PUBLICAÇÃO (com seus comentários)
// ---------------------------------------------------------------
async function criarElementoPublicacao(publicacao) {
    const perfilAutor = await obterPerfilComCache(publicacao.usuario_id);
    const ehAutor = usuarioAtual && usuarioAtual.id === publicacao.usuario_id;

    const artigo = document.createElement('article');
    artigo.className = 'publicacao-item';
    artigo.dataset.id = publicacao.id;

    artigo.innerHTML = `
        <div class="publicacao-cabecalho">
            <div class="publicacao-avatar">${htmlAvatar(perfilAutor)}</div>
            <div class="publicacao-meta">
                <strong>${escaparHTML(perfilAutor.nome)}</strong>
                <span>${formatarData(publicacao.criado_em)}</span>
            </div>
            ${ehAutor ? `
            <div class="relato-acoes-autor">
                <button type="button" class="btn-editar-publicacao btn-editar-relato" aria-label="Editar publicação">✏️ Editar</button>
                <button type="button" class="btn-excluir-publicacao btn-excluir-relato" aria-label="Excluir publicação">🗑️ Excluir</button>
            </div>
            ` : ''}
        </div>
        <div class="publicacao-conteudo-area">
            <h3 data-titulo-publicacao>${escaparHTML(publicacao.titulo)}</h3>
            <p class="publicacao-texto" data-texto-publicacao>${escaparHTML(publicacao.texto)}</p>
        </div>
        <div class="publicacao-edicao-area escondido" data-edicao-area></div>
        <div class="secao-comentarios">
            <h4>Comentários</h4>
            <div class="lista-comentarios" data-lista-comentarios></div>
            <div data-area-novo-comentario></div>
        </div>
    `;

    const listaComentariosEl = artigo.querySelector('[data-lista-comentarios]');
    const areaNovoComentario = artigo.querySelector('[data-area-novo-comentario]');

    await carregarComentarios(publicacao.id, listaComentariosEl);
    montarFormularioComentario(publicacao.id, areaNovoComentario, listaComentariosEl);

    if (ehAutor) {
        const btnEditar = artigo.querySelector('.btn-editar-publicacao');
        const btnExcluir = artigo.querySelector('.btn-excluir-publicacao');

        btnEditar.addEventListener('click', () => {
            iniciarEdicaoPublicacao(artigo, publicacao);
        });

        btnExcluir.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja excluir esta publicação? Os comentários também serão removidos. Esta ação não pode ser desfeita.')) return;

            const { error } = await supabaseClient
                .from('publicacoes')
                .delete()
                .eq('id', publicacao.id)
                .eq('usuario_id', usuarioAtual.id);

            if (error) {
                alert('Não foi possível excluir a publicação: ' + error.message);
                return;
            }

            artigo.style.opacity = '0';
            artigo.style.transform = 'scale(0.97)';
            artigo.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                artigo.remove();
                if (containerPublicacoes.children.length === 0) {
                    listaVazia.classList.remove('escondido');
                }
            }, 300);
        });
    }

    return artigo;
}

// ---------------------------------------------------------------
// EDIÇÃO INLINE DE PUBLICAÇÃO DO BLOG
// ---------------------------------------------------------------
function iniciarEdicaoPublicacao(artigo, publicacao) {
    const conteudoArea = artigo.querySelector('.publicacao-conteudo-area');
    const edicaoArea = artigo.querySelector('[data-edicao-area]');
    const btnEditar = artigo.querySelector('.btn-editar-publicacao');
    const btnExcluir = artigo.querySelector('.btn-excluir-publicacao');

    const tituloAtual = artigo.querySelector('[data-titulo-publicacao]').textContent;
    const textoAtual = artigo.querySelector('[data-texto-publicacao]').textContent;

    conteudoArea.classList.add('escondido');
    btnEditar.style.display = 'none';
    btnExcluir.style.display = 'none';

    edicaoArea.classList.remove('escondido');
    edicaoArea.innerHTML = `
        <div class="relato-edicao-form">
            <h4 class="relato-edicao-titulo">Editar publicação</h4>
            <div class="auth-grupo">
                <label>Título</label>
                <input type="text" class="editar-titulo-pub" value="${escaparHTML(tituloAtual)}" maxlength="120" required>
            </div>
            <div class="auth-grupo">
                <label>Texto</label>
                <textarea class="editar-texto-pub" rows="5" maxlength="3000" required>${escaparHTML(textoAtual)}</textarea>
            </div>
            <p class="auth-mensagem escondido pub-edicao-mensagem" role="alert"></p>
            <div class="relato-edicao-acoes">
                <button type="button" class="btn btn-principal btn-salvar-pub">Salvar alterações</button>
                <button type="button" class="btn btn-cancelar btn-cancelar-edicao-pub">Cancelar</button>
            </div>
        </div>
    `;

    const inputTitulo = edicaoArea.querySelector('.editar-titulo-pub');
    const textareaTexto = edicaoArea.querySelector('.editar-texto-pub');
    const mensagemEdicao = edicaoArea.querySelector('.pub-edicao-mensagem');

    inputTitulo.focus();

    edicaoArea.querySelector('.btn-cancelar-edicao-pub').addEventListener('click', () => {
        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudoArea.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });

    edicaoArea.querySelector('.btn-salvar-pub').addEventListener('click', async () => {
        const novoTitulo = inputTitulo.value.trim();
        const novoTexto = textareaTexto.value.trim();

        if (!novoTitulo || !novoTexto) {
            mensagemEdicao.textContent = 'Preencha o título e o texto.';
            mensagemEdicao.classList.remove('escondido', 'auth-mensagem-sucesso');
            mensagemEdicao.classList.add('auth-mensagem-erro');
            return;
        }

        const btnSalvar = edicaoArea.querySelector('.btn-salvar-pub');
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        const { error } = await supabaseClient
            .from('publicacoes')
            .update({ titulo: novoTitulo, texto: novoTexto })
            .eq('id', publicacao.id)
            .eq('usuario_id', usuarioAtual.id);

        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar alterações';

        if (error) {
            mensagemEdicao.textContent = 'Não foi possível salvar: ' + error.message;
            mensagemEdicao.classList.remove('escondido', 'auth-mensagem-sucesso');
            mensagemEdicao.classList.add('auth-mensagem-erro');
            return;
        }

        publicacao.titulo = novoTitulo;
        publicacao.texto = novoTexto;
        artigo.querySelector('[data-titulo-publicacao]').textContent = novoTitulo;
        artigo.querySelector('[data-texto-publicacao]').textContent = novoTexto;

        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudoArea.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });
}

// ---------------------------------------------------------------
// CARREGAR COMENTÁRIOS DE UMA PUBLICAÇÃO
// ---------------------------------------------------------------
async function carregarComentarios(publicacaoId, listaComentariosEl) {
    listaComentariosEl.innerHTML = '<p class="comentario-texto">Carregando comentários...</p>';

    const { data: comentarios, error } = await supabaseClient
        .from('comentarios')
        .select('id, usuario_id, texto, criado_em')
        .eq('publicacao_id', publicacaoId)
        .order('criado_em', { ascending: true });

    if (error) {
        listaComentariosEl.innerHTML = `<p class="auth-mensagem auth-mensagem-erro">Erro ao carregar comentários.</p>`;
        return;
    }

    if (!comentarios || comentarios.length === 0) {
        listaComentariosEl.innerHTML = '<p class="comentario-texto">Seja a primeira a comentar. 💬</p>';
    } else {
        listaComentariosEl.innerHTML = '';
        for (const comentario of comentarios) {
            const elemento = await criarElementoComentario(comentario, publicacaoId, listaComentariosEl);
            listaComentariosEl.appendChild(elemento);
        }
    }
}

// ---------------------------------------------------------------
// CRIAR ELEMENTO DE UM COMENTÁRIO (com edição/exclusão se for o autor)
// ---------------------------------------------------------------
async function criarElementoComentario(comentario, publicacaoId, listaComentariosEl) {
    const perfilAutor = await obterPerfilComCache(comentario.usuario_id);
    const ehAutor = usuarioAtual && usuarioAtual.id === comentario.usuario_id;

    const div = document.createElement('div');
    div.className = 'comentario-item';
    div.dataset.id = comentario.id;

    div.innerHTML = `
        <div class="comentario-cabecalho">
            <span class="comentario-autor">${escaparHTML(perfilAutor.nome)}</span>
            <span class="comentario-data">${formatarData(comentario.criado_em)}</span>
        </div>
        <p class="comentario-texto" data-conteudo-comentario>${escaparHTML(comentario.texto)}</p>
        ${ehAutor ? `
            <div class="comentario-acoes">
                <button type="button" class="btn-editar-comentario">Editar</button>
                <button type="button" class="btn-excluir-comentario">Excluir</button>
            </div>
        ` : ''}
    `;

    if (ehAutor) {
        const btnEditar = div.querySelector('.btn-editar-comentario');
        const btnExcluir = div.querySelector('.btn-excluir-comentario');
        const conteudoEl = div.querySelector('[data-conteudo-comentario]');

        btnEditar.addEventListener('click', () => {
            iniciarEdicaoComentario(div, comentario, conteudoEl);
        });

        btnExcluir.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

            const { error } = await supabaseClient
                .from('comentarios')
                .delete()
                .eq('id', comentario.id)
                .eq('usuario_id', usuarioAtual.id);

            if (error) {
                alert('Não foi possível excluir o comentário: ' + error.message);
                return;
            }
            div.remove();

            if (listaComentariosEl.children.length === 0) {
                listaComentariosEl.innerHTML = '<p class="comentario-texto">Seja a primeira a comentar. 💬</p>';
            }
        });
    }

    return div;
}

// ---------------------------------------------------------------
// EDIÇÃO INLINE DE COMENTÁRIO
// ---------------------------------------------------------------
function iniciarEdicaoComentario(divComentario, comentario, conteudoEl) {
    const acoesEl = divComentario.querySelector('.comentario-acoes');
    const textoOriginal = conteudoEl.textContent;

    conteudoEl.style.display = 'none';
    if (acoesEl) acoesEl.style.display = 'none';

    const edicao = document.createElement('div');
    edicao.className = 'comentario-edicao';
    edicao.innerHTML = `
        <textarea maxlength="1000">${escaparHTML(textoOriginal)}</textarea>
        <div class="comentario-edicao-acoes">
            <button type="button" class="btn-salvar-edicao">Salvar</button>
            <button type="button" class="btn-cancelar-edicao">Cancelar</button>
        </div>
    `;
    divComentario.appendChild(edicao);

    const textarea = edicao.querySelector('textarea');
    textarea.focus();

    edicao.querySelector('.btn-cancelar-edicao').addEventListener('click', () => {
        edicao.remove();
        conteudoEl.style.display = '';
        if (acoesEl) acoesEl.style.display = '';
    });

    edicao.querySelector('.btn-salvar-edicao').addEventListener('click', async () => {
        const novoTexto = textarea.value.trim();
        if (!novoTexto) {
            alert('O comentário não pode ficar vazio.');
            return;
        }

        const { error } = await supabaseClient
            .from('comentarios')
            .update({ texto: novoTexto })
            .eq('id', comentario.id)
            .eq('usuario_id', usuarioAtual.id);

        if (error) {
            alert('Não foi possível salvar a edição: ' + error.message);
            return;
        }

        comentario.texto = novoTexto;
        conteudoEl.textContent = novoTexto;
        edicao.remove();
        conteudoEl.style.display = '';
        if (acoesEl) acoesEl.style.display = '';
    });
}

// ---------------------------------------------------------------
// FORMULÁRIO DE NOVO COMENTÁRIO (ou aviso de login)
// ---------------------------------------------------------------
function montarFormularioComentario(publicacaoId, areaEl, listaComentariosEl) {
    if (!usuarioAtual) {
        areaEl.innerHTML = `
            <div class="login-comentario-aviso">
                <button type="button" class="btn-abrir-login-comentario">Entre ou crie uma conta</button> para comentar.
            </div>
        `;
        areaEl.querySelector('.btn-abrir-login-comentario').addEventListener('click', () => exibirModalAuth());
        return;
    }

    areaEl.innerHTML = `
        <form class="form-comentario">
            <label class="sr-only" for="comentario-${publicacaoId}">Escreva um comentário</label>
            <textarea id="comentario-${publicacaoId}" placeholder="Escreva um comentário de apoio..." maxlength="1000" required></textarea>
            <button type="submit">Comentar</button>
        </form>
    `;

    const form = areaEl.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = form.querySelector('textarea');
        const texto = textarea.value.trim();
        if (!texto) return;

        const botao = form.querySelector('button');
        botao.disabled = true;

        const { data, error } = await supabaseClient
            .from('comentarios')
            .insert([{ publicacao_id: publicacaoId, usuario_id: usuarioAtual.id, texto }])
            .select()
            .single();

        botao.disabled = false;

        if (error) {
            alert('Não foi possível publicar o comentário: ' + error.message);
            return;
        }

        textarea.value = '';

        if (listaComentariosEl.children.length === 1 && listaComentariosEl.textContent.includes('Seja a primeira')) {
            listaComentariosEl.innerHTML = '';
        }

        const elementoComentario = await criarElementoComentario(data, publicacaoId, listaComentariosEl);
        listaComentariosEl.appendChild(elementoComentario);
    });
}

// ---------------------------------------------------------------
// PUBLICAR NOVO POST NO BLOG
// ---------------------------------------------------------------
if (formNovaPublicacao) {
    formNovaPublicacao.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!usuarioAtual) {
            exibirModalAuth();
            return;
        }

        const titulo = document.getElementById('publicacao-titulo').value.trim();
        const texto = document.getElementById('publicacao-texto').value.trim();
        const botao = formNovaPublicacao.querySelector('button[type="submit"]');

        if (!titulo || !texto) {
            exibirMensagemAuth(publicacaoMensagem, 'Preencha o título e o texto da publicação.', 'erro');
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Publicando...';

        const { data: novaPublicacao, error } = await supabaseClient
            .from('publicacoes')
            .insert([{ usuario_id: usuarioAtual.id, titulo, texto }])
            .select()
            .single();

        botao.disabled = false;
        botao.textContent = 'Publicar no Blog';

        if (error) {
            exibirMensagemAuth(publicacaoMensagem, 'Não foi possível publicar: ' + error.message, 'erro');
            return;
        }

        exibirMensagemAuth(publicacaoMensagem, 'Publicação enviada com sucesso! 💛', 'sucesso');
        formNovaPublicacao.reset();

        // Adiciona a nova publicação no topo sem recarregar tudo
        listaVazia.classList.add('escondido');
        const elemento = await criarElementoPublicacao(novaPublicacao);
        elemento.style.opacity = '0';
        elemento.style.transform = 'translateY(-12px)';
        containerPublicacoes.insertBefore(elemento, containerPublicacoes.firstChild);
        requestAnimationFrame(() => {
            elemento.style.transition = 'all 0.4s ease';
            elemento.style.opacity = '1';
            elemento.style.transform = 'translateY(0)';
        });
    });
}

// ---------------------------------------------------------------
// INICIALIZAÇÃO
// ---------------------------------------------------------------
async function inicializarBlog() {
    usuarioAtual = await AuthApp.obterUsuarioAtual();

    const secaoLista = document.querySelector('.lista-publicacoes');
    const carregando = document.getElementById('carregando-publicacoes');

    if (!usuarioAtual) {
        // Esconde o spinner e a lista — visitante não vê as publicações
        if (carregando) carregando.classList.add('escondido');
        if (secaoLista) secaoLista.classList.add('escondido');
        return;
    }

    // Usuária logada: garante que a lista está visível e carrega
    if (secaoLista) secaoLista.classList.remove('escondido');
    await carregarPublicacoes();
}

document.addEventListener('DOMContentLoaded', inicializarBlog);

// Recarrega quando o usuário faz login/cadastro sem sair da página
document.addEventListener('auth-atualizado', inicializarBlog);