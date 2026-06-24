# 🌸 Maternidade Atípica

Plataforma web de apoio, informação e acolhimento para mães e famílias na jornada do Transtorno do Espectro Autista (TEA).

🔗 **Site:** [maternidade-atipica.netlify.app](https://maternidade-atipica.netlify.app)  
📁 **Repositório:** [github.com/Jordana-code/Maternidade-Atipica](https://github.com/Jordana-code/Maternidade-Atipica)

---

## 👩‍💻 Participantes

| Nome | GitHub |
|------|--------|
| Jordana Moreira | [@Jordana-code](https://github.com/Jordana-code) |
| Gabriella Lima | [@gabriellalmendes](https://github.com/gabriellalmendes) |
| Caio Godoy | [@1caiogodoy](https://github.com/1caiogodoy) |

---

## 📖 Sobre o Projeto

O **Maternidade Atípica** nasceu da necessidade real de mães e famílias que, após o diagnóstico de TEA de um filho, encontram dificuldade em reunir, em um único lugar, informações confiáveis sobre diagnóstico, direitos, rotina, terapias e um espaço seguro para trocar experiências.

A plataforma centraliza conteúdo qualificado e cria uma comunidade acolhedora, sem substituir o acompanhamento médico, neuropsicológico ou terapêutico especializado.

> Projeto desenvolvido como trabalho final da disciplina de Desenvolvimento Web — Centro Universitário de Brasília (2026).

**Autoras/Autores:** Jordana Moreira, Gabriella Lima e Caio Godoy

---

## ✨ Funcionalidades

### 📚 Central de Conhecimento
Nove guias temáticos cobrindo as principais dúvidas de famílias atípicas:

| Guia | Tema |
|------|------|
| Acolhimento | O Laudo Chegou. E agora? |
| Leis e Cidadania | Direitos, Planos e BPC |
| Dia a Dia | Rotina e Regulação Sensorial |
| Educação | Inclusão Escolar Efetiva |
| Saúde Materna | Quem Cuida de Quem Cuida? |
| Nutrição | Lidando com a Seletividade |
| Comportamento | Entendendo e Manejando Comportamentos |
| Entendendo o TEA | O Espectro: Níveis, Perfis e Necessidades |
| Terapias | Guia Completo das Terapias |

A Central também conta com **busca por palavras-chave** (ex: "BPC", "Rotina", "Laudo").

### ✍️ Blog da Comunidade
Espaço colaborativo onde usuárias cadastradas podem criar, editar e excluir publicações, além de comentar nas postagens umas das outras.

### 💬 Espaço de Relatos
Área dedicada ao compartilhamento de experiências pessoais com os filhos — conquistas, desafios e histórias reais. Os relatos em destaque aparecem na página inicial como elemento de identificação e acolhimento.

### 👤 Autenticação e Área do Usuário
- Cadastro com nome, e-mail e senha
- Login seguro e recuperação de senha por e-mail
- Área **"Minha Conta"**: alteração de avatar, histórico de publicações e exclusão permanente de conta (com remoção de todos os dados associados)

### ♿ Acessibilidade
- Modo escuro (manual ou automático)
- Ajuste de tamanho de fonte (A− / A+)
- Compatibilidade com leitores de tela
- Layout responsivo para smartphones e tablets

---

## 🛠️ Tecnologias Utilizadas

### Front-end
- **HTML5**
- **CSS3**
- **JavaScript**
- **Tailwind CSS v3** (via CDN, com configuração personalizada para preservar o design system)

### Back-end & Banco de Dados
- **[Supabase](https://supabase.com)** — autenticação, armazenamento de dados e controle de permissões

---

## 🏗️ Arquitetura do Projeto

maternidade-atipica/
├── assets/          # Recursos visuais (imagens, ícones)
├── css/             # Folhas de estilo
│   └── style.css
├── js/              # Scripts JavaScript
├── pages/           # Páginas internas
├── components/      # Componentes reutilizáveis
├── index.html       # Página inicial
├── supabase-setup.sql  # Regras de segurança e políticas de acesso
└── README.md


### Segurança e Controle de Acesso
As políticas de acesso estão centralizadas em `supabase-setup.sql` e garantem que:
- Conteúdos públicos são visíveis a todas as visitantes
- Edição e exclusão são restritas ao próprio autor
- Entradas são sanitizadas para prevenir injeção de código
- Ações sensíveis exigem autenticação obrigatória

---

## ⚠️ Aviso Importante

O conteúdo disponibilizado nesta plataforma tem caráter **exclusivamente informativo e acolhedor**. Não substitui diagnóstico médico, avaliação neuropsicológica ou qualquer tratamento clínico especializado.

---

## 📄 Licença

Projeto acadêmico desenvolvido para o Centro Universitário de Brasília (UniCEUB), 2026.