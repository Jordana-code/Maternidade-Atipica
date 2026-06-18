// =====================================================================
// AUTH.JS — Autenticação compartilhada (Maternidade Atípica)
// =====================================================================


const AuthApp = (() => {

    // ---------------------------------------------------------------
    // CADASTRO — cria usuário no auth.users + linha em "perfis"
    // ---------------------------------------------------------------
    async function cadastrar(nome, email, senha) {
        // --- Validações de cadastro ---
        const nomeTrim = (nome || "").trim();
        const emailTrim = (email || "").trim();

        if (nomeTrim.length < 2) {
            return { erro: "Por favor, informe seu nome (mínimo 2 caracteres)." };
        }

        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(emailTrim)) {
            return { erro: "Digite um e-mail válido." };
        }

        if (!senha || senha.length < 6) {
            return { erro: "A senha precisa ter no mínimo 6 caracteres." };
        }

        // --- Cria o usuário no Supabase Auth ---
        const { data, error } = await supabaseClient.auth.signUp({
            email: emailTrim,
            password: senha,
            options: {
                data: { nome: nomeTrim }
            }
        });

        if (error) {
            return { erro: traduzirErro(error.message) };
        }

        // --- Cria o perfil correspondente (se o usuário já tiver sessão) ---
        if (data.user) {
            const { error: erroPerfil } = await supabaseClient
                .from('perfis')
                .insert([{ id: data.user.id, nome: nomeTrim, avatar_url: null }]);

            // Ignora erro de duplicidade (caso o perfil já exista via trigger)
            if (erroPerfil && erroPerfil.code !== '23505') {
                console.warn('Aviso ao criar perfil:', erroPerfil.message);
            }
        }

        // Se a confirmação por e-mail estiver ativada, não haverá sessão ainda.
        if (!data.session) {
            return { sucesso: true, confirmarEmail: true };
        }

        return { sucesso: true, confirmarEmail: false, usuario: data.user };
    }

    // ---------------------------------------------------------------
    // LOGIN
    // ---------------------------------------------------------------
    async function entrar(email, senha) {
        const emailTrim = (email || "").trim();

        if (!emailTrim || !senha) {
            return { erro: "Preencha e-mail e senha." };
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: emailTrim,
            password: senha
        });

        if (error) {
            return { erro: traduzirErro(error.message) };
        }

        return { sucesso: true, usuario: data.user };
    }

    // ---------------------------------------------------------------
    // LOGOUT
    // ---------------------------------------------------------------
    async function sair() {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    }

    // ---------------------------------------------------------------
    // SESSÃO ATUAL
    // ---------------------------------------------------------------
    async function obterUsuarioAtual() {
        const { data } = await supabaseClient.auth.getUser();
        return data?.user || null;
    }

    // ---------------------------------------------------------------
    // PROTEGER PÁGINA — redireciona se não estiver logado
    // Use no topo de páginas que exigem conta (blog, relatos, perfil)
    // ---------------------------------------------------------------
    async function exigirLogin() {
        const usuario = await obterUsuarioAtual();
        if (!usuario) {
            window.location.href = 'index.html?login=necessario';
            return null;
        }
        return usuario;
    }

    // ---------------------------------------------------------------
    // BUSCAR PERFIL (nome + avatar) DE UM USUÁRIO
    // ---------------------------------------------------------------
    async function obterPerfil(userId) {
        const { data, error } = await supabaseClient
            .from('perfis')
            .select('id, nome, avatar_url')
            .eq('id', userId)
            .single();

        if (error) {
            console.warn('Erro ao buscar perfil:', error.message);
            return null;
        }
        return data;
    }

    // ---------------------------------------------------------------
    // ATUALIZAR ELEMENTOS DE UI COMUNS DE AUTENTICAÇÃO
    // Procura por elementos com data-attributes padronizados:
    //   [data-auth="logado"]     -> mostrado apenas se logado
    //   [data-auth="visitante"]  -> mostrado apenas se NÃO logado
    //   [data-auth="nome-usuario"] -> recebe o nome do usuário
    // ---------------------------------------------------------------
    async function atualizarUIAuth() {
        const usuario = await obterUsuarioAtual();
        const elementosLogado = document.querySelectorAll('[data-auth="logado"]');
        const elementosVisitante = document.querySelectorAll('[data-auth="visitante"]');
        const elementosNome = document.querySelectorAll('[data-auth="nome-usuario"]');

        if (usuario) {
            elementosLogado.forEach(el => el.classList.remove('escondido'));
            elementosVisitante.forEach(el => el.classList.add('escondido'));

            const perfil = await obterPerfil(usuario.id);
            const nomeExibido = perfil?.nome || usuario.user_metadata?.nome || usuario.email;
            elementosNome.forEach(el => el.textContent = nomeExibido);
        } else {
            elementosLogado.forEach(el => el.classList.add('escondido'));
            elementosVisitante.forEach(el => el.classList.remove('escondido'));
        }

        return usuario;
    }

    // ---------------------------------------------------------------
    // REDEFINIÇÃO DE SENHA — envia link por e-mail
    // ---------------------------------------------------------------
    async function resetarSenha(email) {
        const emailTrim = (email || "").trim();
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(emailTrim)) {
            return { erro: "Digite um e-mail válido." };
        }

        const { error } = await supabaseClient.auth.resetPasswordForEmail(emailTrim, {
            redirectTo: window.location.origin + '/index.html'
        });

        if (error) {
            return { erro: traduzirErro(error.message) };
        }

        return { sucesso: true };
    }

    // ---------------------------------------------------------------
    // TRADUZIR MENSAGENS DE ERRO DO SUPABASE PARA PT-BR
    // ---------------------------------------------------------------
    function traduzirErro(mensagem) {
        const mapa = {
            "Invalid login credentials": "E-mail ou senha incorretos.",
            "User already registered": "Já existe uma conta com este e-mail.",
            "Email not confirmed": "Confirme seu e-mail antes de entrar.",
            "Password should be at least 6 characters": "A senha precisa ter no mínimo 6 caracteres."
        };
        return mapa[mensagem] || mensagem;
    }

    return {
        cadastrar,
        entrar,
        sair,
        obterUsuarioAtual,
        exigirLogin,
        obterPerfil,
        atualizarUIAuth,
        resetarSenha
    };
})();