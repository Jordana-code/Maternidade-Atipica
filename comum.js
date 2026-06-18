// =====================================================================
// COMUM.JS — Funções compartilhadas por TODAS as páginas do site
// =====================================================================


// ---------------------------------------------------------------
// UTILITÁRIOS GLOBAIS — usados por blog.js, relatos.js e miconta.js
// ---------------------------------------------------------------

/**
 * Escapa caracteres HTML para prevenir XSS em conteúdo de usuários.
 */
function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

/**
 * Gera as iniciais de um nome para uso em avatares padrão.
 */
function iniciais(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Monta o HTML do avatar: foto se disponível, ou iniciais.
 */
function htmlAvatar(perfil) {
    if (perfil?.avatar_url) {
        return `<img src="${escaparHTML(perfil.avatar_url)}" alt="">`;
    }
    return iniciais(perfil?.nome);
}

/**
 * Formata uma data ISO para o padrão pt-BR com hora.
 */
function formatarData(dataIso) {
    const data = new Date(dataIso);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// --- Controle de Acessibilidade: Tamanho da Fonte ---
let tamanhoFonteAtual = 100;
const elementoHtml = document.documentElement;

// --- Sistema de Janela Modal de Autenticação (Login/Cadastro) ---
// Declaradas no escopo do módulo para serem acessíveis pelas funções abaixo
let modalAuth, btnAbrirLogin, btnFecharAuth, btnLoginAviso, btnSair;
let tabLogin, tabCadastro, painelLogin, painelCadastro;

let ultimoFocoAuth = null;

function exibirModalAuth() {
    ultimoFocoAuth = document.activeElement;
    modalAuth.classList.add('ativo');
    modalAuth.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { btnFecharAuth.focus(); }, 100);
}

function fecharModalAuth() {
    modalAuth.classList.remove('ativo');
    modalAuth.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (ultimoFocoAuth) { ultimoFocoAuth.focus(); }
}

function alternarAba(abaAtiva, abaInativa, painelAtivo, painelInativo) {
    abaAtiva.classList.add('ativa');
    abaAtiva.setAttribute('aria-selected', 'true');
    abaInativa.classList.remove('ativa');
    abaInativa.setAttribute('aria-selected', 'false');
    painelAtivo.classList.remove('escondido');
    painelInativo.classList.add('escondido');
}

// --- Autenticação Real com Supabase ---
function exibirMensagemAuth(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.classList.remove('escondido', 'auth-mensagem-erro', 'auth-mensagem-sucesso');
    elemento.classList.add(tipo === 'erro' ? 'auth-mensagem-erro' : 'auth-mensagem-sucesso');
}

// --- Sincroniza a interface com o estado de login ao carregar a página ---
document.addEventListener('DOMContentLoaded', async () => {

    // --- Controle de Acessibilidade: Tamanho da Fonte ---
    document.getElementById('btn-aumentar-fonte').addEventListener('click', () => {
        if (tamanhoFonteAtual < 130) {
            tamanhoFonteAtual += 10;
            elementoHtml.style.fontSize = `${tamanhoFonteAtual}%`;
        }
    });

    document.getElementById('btn-diminuir-fonte').addEventListener('click', () => {
        if (tamanhoFonteAtual > 90) {
            tamanhoFonteAtual -= 10;
            elementoHtml.style.fontSize = `${tamanhoFonteAtual}%`;
        }
    });

    // --- Controle de Acessibilidade: Modo Escuro ---
    const btnTema = document.getElementById('btn-tema');
    const textoTema = btnTema.querySelector('.texto-tema');

    if (localStorage.getItem('tema-escuro') === 'true' ||
        (!localStorage.getItem('tema-escuro') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('tema-escuro');
        textoTema.textContent = "Modo Claro";
    }

    btnTema.addEventListener('click', () => {
        const modoEscuroAtivo = document.body.classList.toggle('tema-escuro');
        localStorage.setItem('tema-escuro', modoEscuroAtivo);
        textoTema.textContent = modoEscuroAtivo ? "Modo Claro" : "Modo Escuro";
    });

    // --- Inicializar referências do modal de autenticação ---
    modalAuth     = document.getElementById('modal-auth');
    btnAbrirLogin = document.getElementById('btn-abrir-login');
    btnFecharAuth = document.getElementById('fechar-auth-btn');
    btnLoginAviso = document.getElementById('btn-login-aviso');
    btnSair       = document.getElementById('btn-sair');
    tabLogin      = document.getElementById('tab-login');
    tabCadastro   = document.getElementById('tab-cadastro');
    painelLogin   = document.getElementById('painel-login');
    painelCadastro = document.getElementById('painel-cadastro');

    tabLogin.addEventListener('click', () => alternarAba(tabLogin, tabCadastro, painelLogin, painelCadastro));
    tabCadastro.addEventListener('click', () => alternarAba(tabCadastro, tabLogin, painelCadastro, painelLogin));

    btnAbrirLogin.addEventListener('click', exibirModalAuth);
    btnFecharAuth.addEventListener('click', fecharModalAuth);
    modalAuth.addEventListener('click', (e) => { if (e.target === modalAuth) fecharModalAuth(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalAuth.classList.contains('ativo')) { fecharModalAuth(); }
    });

    // Botão de aviso "Entrar / Criar Conta" exibido em páginas restritas (blog, relatos)
    if (btnLoginAviso) {
        btnLoginAviso.addEventListener('click', exibirModalAuth);
    }

    // Botão "Sair" presente no menu quando o usuário está logado
    if (btnSair) {
        btnSair.addEventListener('click', () => AuthApp.sair());
    }

    // --- Formulário de Login ---
    const formLogin = document.getElementById('form-login');
    const loginMensagem = document.getElementById('login-mensagem');

    // Link "Esqueci a senha"
    const linkEsqueciSenha = document.getElementById('link-esqueci-senha');
    const painelEsqueciSenha = document.getElementById('painel-esqueci-senha');
    const formEsqueciSenha = document.getElementById('form-esqueci-senha');
    const esqueciMensagem = document.getElementById('esqueci-mensagem');
    const linkVoltarLogin = document.getElementById('link-voltar-login');

    if (linkEsqueciSenha && painelEsqueciSenha) {
        linkEsqueciSenha.addEventListener('click', (e) => {
            e.preventDefault();
            painelLogin.classList.add('escondido');
            painelEsqueciSenha.classList.remove('escondido');
        });
    }

    if (linkVoltarLogin) {
        linkVoltarLogin.addEventListener('click', (e) => {
            e.preventDefault();
            painelEsqueciSenha.classList.add('escondido');
            painelLogin.classList.remove('escondido');
        });
    }

    if (formEsqueciSenha) {
        formEsqueciSenha.addEventListener('submit', async (e) => {
            e.preventDefault();
            const botao = formEsqueciSenha.querySelector('button[type="submit"]');
            const email = document.getElementById('esqueci-email').value;

            botao.disabled = true;
            botao.textContent = 'Enviando...';

            const resultado = await AuthApp.resetarSenha(email);

            botao.disabled = false;
            botao.textContent = 'Enviar link de redefinição';

            if (resultado.erro) {
                exibirMensagemAuth(esqueciMensagem, resultado.erro, 'erro');
                return;
            }

            exibirMensagemAuth(esqueciMensagem, 'Link enviado! Verifique seu e-mail para redefinir a senha. 💚', 'sucesso');
        });
    }

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const botao = formLogin.querySelector('button[type="submit"]');
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;

        botao.disabled = true;
        botao.textContent = 'Entrando...';

        const resultado = await AuthApp.entrar(email, senha);

        botao.disabled = false;
        botao.textContent = 'Entrar no Espaço';

        if (resultado.erro) {
            exibirMensagemAuth(loginMensagem, resultado.erro, 'erro');
            return;
        }

        exibirMensagemAuth(loginMensagem, 'Login realizado com sucesso! Bem-vinda de volta. 💚', 'sucesso');
        await AuthApp.atualizarUIAuth();

        document.dispatchEvent(new CustomEvent('auth-atualizado'));

        setTimeout(fecharModalAuth, 900);
    });

    // --- Formulário de Cadastro ---
    const formCadastro = document.getElementById('form-cadastro');
    const cadastroMensagem = document.getElementById('cadastro-mensagem');

    formCadastro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const botao = formCadastro.querySelector('button[type="submit"]');
        const nome = document.getElementById('cadastro-nome').value;
        const email = document.getElementById('cadastro-email').value;
        const senha = document.getElementById('cadastro-senha').value;

        botao.disabled = true;
        botao.textContent = 'Criando conta...';

        const resultado = await AuthApp.cadastrar(nome, email, senha);

        botao.disabled = false;
        botao.textContent = 'Criar Minha Conta';

        if (resultado.erro) {
            exibirMensagemAuth(cadastroMensagem, resultado.erro, 'erro');
            return;
        }

        if (resultado.confirmarEmail) {
            exibirMensagemAuth(cadastroMensagem, 'Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.', 'sucesso');
            return;
        }

        exibirMensagemAuth(cadastroMensagem, 'Conta criada com sucesso! Seja muito bem-vinda. 💛', 'sucesso');
        await AuthApp.atualizarUIAuth();

        document.dispatchEvent(new CustomEvent('auth-atualizado'));

        setTimeout(fecharModalAuth, 900);
    });

    // --- Sincroniza UI com estado de login ---
    await AuthApp.atualizarUIAuth();

    // Se o usuário foi redirecionado por exigir login, abre o modal e avisa
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get('login') === 'necessario') {
        exibirModalAuth();
        const loginMensagem = document.getElementById('login-mensagem');
        exibirMensagemAuth(loginMensagem, 'Você precisa entrar ou criar uma conta para acessar essa área.', 'erro');
    }
});