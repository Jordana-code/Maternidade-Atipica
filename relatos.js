// =====================================================================
// RELATOS.JS — Espaço de Relatos (Maternidade Atípica)
// =====================================================================

const containerRelatos = document.getElementById('container-relatos');
const carregandoRelatos = document.getElementById('carregando-relatos');
const listaRelatosVazia = document.getElementById('lista-relatos-vazia');
const formNovoRelato = document.getElementById('form-novo-relato');
const relatoMensagem = document.getElementById('relato-mensagem');

let usuarioAtualRelatos = null;
let perfisCacheRelatos = {};

// ---------------------------------------------------------------
// Util: busca e armazena perfis (nome + avatar) em cache
// ---------------------------------------------------------------
async function obterPerfilRelatosComCache(userId) {
    if (perfisCacheRelatos[userId]) return perfisCacheRelatos[userId];
    const perfil = await AuthApp.obterPerfil(userId);
    perfisCacheRelatos[userId] = perfil || { nome: 'Mãe da Comunidade', avatar_url: null };
    return perfisCacheRelatos[userId];
}

// ---------------------------------------------------------------
// CARREGAR RELATOS
// ---------------------------------------------------------------
async function carregarRelatos() {
    carregandoRelatos.classList.remove('escondido');
    listaRelatosVazia.classList.add('escondido');
    containerRelatos.innerHTML = '';

    const { data: relatos, error } = await supabaseClient
        .from('relatos')
        .select('id, usuario_id, titulo, nome_crianca, texto, criado_em')
        .order('criado_em', { ascending: false });

    carregandoRelatos.classList.add('escondido');

    if (error) {
        containerRelatos.innerHTML = `<p class="auth-mensagem auth-mensagem-erro">Não foi possível carregar os relatos: ${escaparHTML(error.message)}</p>`;
        return;
    }

    if (!relatos || relatos.length === 0) {
        listaRelatosVazia.classList.remove('escondido');
        return;
    }

    for (const relato of relatos) {
        const elemento = await criarElementoRelato(relato);
        containerRelatos.appendChild(elemento);
    }
}

// ---------------------------------------------------------------
// CRIAR ELEMENTO DE UM RELATO
// ---------------------------------------------------------------
async function criarElementoRelato(relato) {
    const perfilAutor = await obterPerfilRelatosComCache(relato.usuario_id);
    const ehAutor = usuarioAtualRelatos && usuarioAtualRelatos.id === relato.usuario_id;

    const artigo = document.createElement('article');
    artigo.className = 'publicacao-item relato-item';
    artigo.dataset.id = relato.id;

    artigo.innerHTML = `
        <div class="publicacao-cabecalho">
            <div class="publicacao-avatar">${htmlAvatar(perfilAutor)}</div>
            <div class="publicacao-meta">
                <strong>${escaparHTML(perfilAutor.nome)}</strong>
                <span>${formatarData(relato.criado_em)}</span>
            </div>
            ${ehAutor ? `
            <div class="relato-acoes-autor">
                <button type="button" class="btn-editar-relato" aria-label="Editar relato">✏️ Editar</button>
                <button type="button" class="btn-excluir-relato" aria-label="Excluir relato">🗑️ Excluir</button>
            </div>
            ` : ''}
        </div>
        <div class="relato-conteudo-area">
            <h3 data-titulo-relato>${escaparHTML(relato.titulo)}</h3>
            ${relato.nome_crianca ? `<span class="relato-tag-crianca" data-tag-crianca>👶 ${escaparHTML(relato.nome_crianca)}</span>` : ''}
            <p class="publicacao-texto" data-texto-relato>${escaparHTML(relato.texto)}</p>
        </div>
        <div class="relato-edicao-area escondido" data-edicao-area></div>
    `;

    if (ehAutor) {
        const btnEditar = artigo.querySelector('.btn-editar-relato');
        const btnExcluir = artigo.querySelector('.btn-excluir-relato');

        btnEditar.addEventListener('click', () => {
            iniciarEdicaoRelato(artigo, relato);
        });

        btnExcluir.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja excluir este relato? Esta ação não pode ser desfeita.')) return;

            const { error } = await supabaseClient
                .from('relatos')
                .delete()
                .eq('id', relato.id)
                .eq('usuario_id', usuarioAtualRelatos.id);

            if (error) {
                alert('Não foi possível excluir o relato: ' + error.message);
                return;
            }

            artigo.style.opacity = '0';
            artigo.style.transform = 'scale(0.97)';
            artigo.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                artigo.remove();
                if (containerRelatos.children.length === 0) {
                    listaRelatosVazia.classList.remove('escondido');
                }
            }, 300);
        });
    }

    return artigo;
}

// ---------------------------------------------------------------
// EDIÇÃO INLINE DE RELATO
// ---------------------------------------------------------------
function iniciarEdicaoRelato(artigo, relato) {
    const conteudoArea = artigo.querySelector('.relato-conteudo-area');
    const edicaoArea = artigo.querySelector('[data-edicao-area]');
    const btnEditar = artigo.querySelector('.btn-editar-relato');
    const btnExcluir = artigo.querySelector('.btn-excluir-relato');

    // Pega os valores atuais
    const tituloAtual = artigo.querySelector('[data-titulo-relato]').textContent;
    const tagCriancaEl = artigo.querySelector('[data-tag-crianca]');
    const nomeAtual = tagCriancaEl ? tagCriancaEl.textContent.replace('👶 ', '').trim() : '';
    const textoAtual = artigo.querySelector('[data-texto-relato]').textContent;

    // Oculta conteúdo e botões
    conteudoArea.classList.add('escondido');
    btnEditar.style.display = 'none';
    btnExcluir.style.display = 'none';

    // Monta formulário de edição
    edicaoArea.classList.remove('escondido');
    edicaoArea.innerHTML = `
        <div class="relato-edicao-form">
            <h4 class="relato-edicao-titulo">Editar relato</h4>
            <div class="auth-grupo">
                <label>Título</label>
                <input type="text" class="editar-titulo" value="${escaparHTML(tituloAtual)}" maxlength="120" required>
            </div>
            <div class="auth-grupo">
                <label>Nome ou apelido da criança (opcional)</label>
                <input type="text" class="editar-nome-crianca" value="${escaparHTML(nomeAtual)}" maxlength="60" placeholder="Ex: Léo, 6 anos">
            </div>
            <div class="auth-grupo">
                <label>Relato</label>
                <textarea class="editar-texto" rows="5" maxlength="4000" required>${escaparHTML(textoAtual)}</textarea>
            </div>
            <p class="auth-mensagem escondido relato-edicao-mensagem" role="alert"></p>
            <div class="relato-edicao-acoes">
                <button type="button" class="btn btn-principal btn-salvar-relato">Salvar alterações</button>
                <button type="button" class="btn btn-cancelar btn-cancelar-edicao-relato">Cancelar</button>
            </div>
        </div>
    `;

    const inputTitulo = edicaoArea.querySelector('.editar-titulo');
    const inputNome = edicaoArea.querySelector('.editar-nome-crianca');
    const textareaTexto = edicaoArea.querySelector('.editar-texto');
    const mensagemEdicao = edicaoArea.querySelector('.relato-edicao-mensagem');

    inputTitulo.focus();

    // Cancelar edição
    edicaoArea.querySelector('.btn-cancelar-edicao-relato').addEventListener('click', () => {
        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudoArea.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });

    // Salvar edição
    edicaoArea.querySelector('.btn-salvar-relato').addEventListener('click', async () => {
        const novoTitulo = inputTitulo.value.trim();
        const novoNome = inputNome.value.trim();
        const novoTexto = textareaTexto.value.trim();

        if (!novoTitulo || !novoTexto) {
            mensagemEdicao.textContent = 'Preencha o título e o relato.';
            mensagemEdicao.classList.remove('escondido', 'auth-mensagem-sucesso');
            mensagemEdicao.classList.add('auth-mensagem-erro');
            return;
        }

        const btnSalvar = edicaoArea.querySelector('.btn-salvar-relato');
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        const { error } = await supabaseClient
            .from('relatos')
            .update({
                titulo: novoTitulo,
                nome_crianca: novoNome || null,
                texto: novoTexto
            })
            .eq('id', relato.id)
            .eq('usuario_id', usuarioAtualRelatos.id);

        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar alterações';

        if (error) {
            mensagemEdicao.textContent = 'Não foi possível salvar: ' + error.message;
            mensagemEdicao.classList.remove('escondido', 'auth-mensagem-sucesso');
            mensagemEdicao.classList.add('auth-mensagem-erro');
            return;
        }

        // Atualiza os dados no objeto em memória
        relato.titulo = novoTitulo;
        relato.nome_crianca = novoNome || null;
        relato.texto = novoTexto;

        // Atualiza o DOM da área de conteúdo
        artigo.querySelector('[data-titulo-relato]').textContent = novoTitulo;
        artigo.querySelector('[data-texto-relato]').textContent = novoTexto;

        const tagEl = artigo.querySelector('[data-tag-crianca]');
        if (novoNome) {
            if (tagEl) {
                tagEl.textContent = '👶 ' + novoNome;
            } else {
                const novaTag = document.createElement('span');
                novaTag.className = 'relato-tag-crianca';
                novaTag.setAttribute('data-tag-crianca', '');
                novaTag.textContent = '👶 ' + novoNome;
                const tituloEl = artigo.querySelector('[data-titulo-relato]');
                tituloEl.insertAdjacentElement('afterend', novaTag);
            }
        } else if (tagEl) {
            tagEl.remove();
        }

        // Fecha edição
        edicaoArea.classList.add('escondido');
        edicaoArea.innerHTML = '';
        conteudoArea.classList.remove('escondido');
        btnEditar.style.display = '';
        btnExcluir.style.display = '';
    });
}

// ---------------------------------------------------------------
// PUBLICAR NOVO RELATO
// ---------------------------------------------------------------
if (formNovoRelato) {
    formNovoRelato.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!usuarioAtualRelatos) {
            exibirModalAuth();
            return;
        }

        const titulo = document.getElementById('relato-titulo').value.trim();
        const nomeCrianca = document.getElementById('relato-nome-crianca').value.trim();
        const texto = document.getElementById('relato-texto').value.trim();
        const botao = formNovoRelato.querySelector('button[type="submit"]');

        if (!titulo || !texto) {
            exibirMensagemAuth(relatoMensagem, 'Preencha o título e o relato.', 'erro');
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Publicando...';

        const { data: novoRelato, error } = await supabaseClient
            .from('relatos')
            .insert([{
                usuario_id: usuarioAtualRelatos.id,
                titulo,
                nome_crianca: nomeCrianca || null,
                texto
            }])
            .select()
            .single();

        botao.disabled = false;
        botao.textContent = 'Publicar Relato';

        if (error) {
            exibirMensagemAuth(relatoMensagem, 'Não foi possível publicar: ' + error.message, 'erro');
            return;
        }

        exibirMensagemAuth(relatoMensagem, 'Relato publicado com sucesso! Obrigada por compartilhar. 💛', 'sucesso');
        formNovoRelato.reset();

        // Adiciona o novo relato no topo sem recarregar tudo
        listaRelatosVazia.classList.add('escondido');
        const elemento = await criarElementoRelato(novoRelato);
        elemento.style.opacity = '0';
        elemento.style.transform = 'translateY(-12px)';
        containerRelatos.insertBefore(elemento, containerRelatos.firstChild);
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
async function inicializarRelatos() {
    usuarioAtualRelatos = await AuthApp.obterUsuarioAtual();
    await carregarRelatos();
}

document.addEventListener('DOMContentLoaded', inicializarRelatos);

// Recarrega quando o usuário faz login/cadastro sem sair da página
document.addEventListener('auth-atualizado', inicializarRelatos);