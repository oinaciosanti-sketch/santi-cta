# SANTI CTA — Centro Técnico Automotivo

Aplicação web para gestão inicial da oficina SANTI CTA. Interface dark industrial, logo oficial fornecida pelo proprietário, navegação responsiva, Kanban de atendimentos, agenda, ordens de serviço, clientes, veículos, histórico, PDF imprimível, botão WhatsApp e indicadores.

## Instalação e visualização local

Requisitos: Node.js 20.19+ ou 22+.

```bash
npm install
npm run dev
```

Abra o endereço indicado no terminal. Sem `.env`, a aplicação abre em **modo demonstração**, com registros fictícios salvos no localStorage do navegador. Não use esse modo para dados reais de clientes.

## Publicação GitHub + Vercel + Supabase

1. **GitHub:** crie um repositório privado (`santi-cta`). Extraia o ZIP e envie os arquivos de dentro da pasta `santi-cta`, mantendo `package.json` na raiz. No GitHub, `Add file` > `Upload files` > `Commit changes`.
2. **Supabase:** crie projeto em https://supabase.com. Em **SQL Editor**, cole e execute todo o arquivo `supabase/schema.sql`. Isso cria a tabela `orders` e políticas que exigem login. Em **Authentication > Users**, crie o usuário interno pelo painel; mantenha cadastro público desativado. Não crie políticas anon/public.
3. **Supabase:** em **Project Settings / Connect / API**, copie **Project URL** e a chave **publishable** (ou chave pública `anon`, dependendo do painel). **NUNCA use `service_role` ou secret keys no Vercel/cliente.**
4. **Vercel:** acesse https://vercel.com > `Add New` > `Project` > importe o repositório GitHub. Framework: **Vite**. Build command: `npm run build`. Output: `dist`.
5. **Vercel > Settings > Environment Variables:** configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Use a chave pública copiada no passo 3. Clique em **Redeploy**, se as variáveis forem adicionadas após a primeira publicação.
6. Acesse o domínio da Vercel; faça login com a conta criada no Supabase. Comece com a primeira OS real.

**Importante:** env de produção preenchido = banco Supabase vazio inicialmente, sem registros fictícios. Env ausente = demo local, mesmo que publicada na Vercel.

## Escopo funcional entregue

- Dashboard: indicadores de veículos e valores das OS.
- Kanban: 10 etapas; arrastar entre colunas, clicar para atualizar.
- Agenda: chegadas do dia com horário por atendimento.
- OS: criar, editar, excluir, registrar diagnosis/peças, responsável, histórico e status de pagamento.
- Clientes e veículos: cadastros derivados das OS; histórico por placa.
- WhatsApp: abre mensagem pronta no WhatsApp do cliente. **Envio não é automático.**
- Relatório técnico: exibe relatório para impressão/`Salvar em PDF` pelo navegador.
- Modo demo: anexo de imagem pequena até 900 KB salvo localmente; **foto não é armazenada no Supabase nesta versão**.
- Responsivo para computador, tablets e celular.

## Limites do MVP — leia antes do uso comercial

- **Acesso:** login único para usuários internos, ainda **sem funções/cargos ou segregação de permissões**. Todos os usuários autenticados no projeto podem ver/editar todas as OS. Crie apenas contas confiáveis, mantenha cadastro público desligado e não use em escala sem aprofundar segurança e auditoria.
- **Notificações:** o aplicativo **não envia automaticamente** mensagens nem campanhas. Para isso será necessário backend seguro e WhatsApp Business Platform, com modelos aprovados, custos e regras de comunicação/consentimento.
- **Fotos:** para produção, implementar Supabase Storage privado, políticas de acesso, limitação de upload, thumbnails e URLs temporárias; não salvar base64 em `orders`.
- **Relatórios:** impressão em PDF não equivale a assinatura, NFS-e/NF-e ou certificado de garantia.
- **Financeiro:** os valores são lançamentos simplificados de OS, não fluxo de caixa contábil.
- **Auditoria:** o histórico é operacional e editável; antes de uso crítico, implementar log de auditoria imutável em backend com identificação do usuário.
- **LGPD:** obtenha informações necessárias, forneça aviso de privacidade, estabeleça finalidade/base legal e separe mensagens transacionais de marketing com gestão de opt-out.
- **Dados em tempo real:** a tela é atualizada ao carregar ou clicar no botão de atualização. Ainda não há sincronização realtime/subscriptions ou prevenção de edição concorrente; recomendada na próxima fase.

## Identidade visual

A logo oficial foi incluída em `public/logo-santi.png`. As cores do painel seguem grafite, preto, prata e vermelho SANTI.

## Estrutura

- `src/App.jsx`: interface e fluxos de operação.
- `src/data.js`: etapas, exemplos e textos WhatsApp.
- `src/db.js`: integração ao Supabase ou dados locais de demonstração.
- `src/styles.css`: visual responsivo.
- `supabase/schema.sql`: criação segura da tabela e políticas de acesso.
- `.env.example`: nomes das variáveis de ambiente.
