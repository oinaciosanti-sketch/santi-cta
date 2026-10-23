# SANTI CTA V11.2 — Instalação e teste

## Instalação
1. Faça um backup do projeto Supabase e mantenha uma cópia do ZIP V11.
2. No Supabase > SQL Editor, execute somente `supabase/migration_v11_2_reception.sql` (após a migração V11).
3. Substitua os arquivos do repositório GitHub pela pasta `santi-cta` deste ZIP e faça commit na `main`.
4. Aguarde o build `Ready` do projeto na Vercel. Se houver erro, consulte Deployment Logs.
5. No CTA, a nova aba **Recepção** está disponível para Proprietário, Administrativo e Líder.
6. Abra `/agendar` em janela anônima e crie uma OS de teste para uma data futura.
7. Na Recepção, escolha a data e use **WhatsApp** para abrir a mensagem pronta (o envio ainda é manual).
8. Clique **Confirmar** para registrar presença. Clique **Check-in** e verifique a OS na coluna **Recebido**.
9. Faça outro agendamento e teste reagendamento e cancelamento pelo link do Pit Pass.
10. Confirme que o cliente não consegue abrir a área administrativa sem autenticação.

## WhatsApp — o que já dá para testar
- O botão WhatsApp da recepção abre o `wa.me` com o texto de confirmação, dirigido ao telefone cadastrado.
- Você precisa confirmar o envio no WhatsApp. NÃO é disparo automático nem marca 'enviado' no banco.
- Para testar com segurança, use seu próprio número como cliente fictício.

## WhatsApp — habilitar lembretes automáticos de verdade
A base da função está em `supabase/functions/drive-reminders/index.ts` (V11).
São necessários: (1) WhatsApp Business Platform / Cloud API, (2) número de envio configurado, (3) template de utilidade aprovado pela Meta, com exatamente três campos (nome, data e hora), (4) Edge Function implantada e secrets `META_WA_TOKEN`, `META_PHONE_NUMBER_ID`, `META_TEMPLATE_NAME`, `SANTI_CRON_SECRET`, (5) agendador privado chamando a função em horário definido, (6) registro/testes de entrega e falhas. Nunca inclua tokens no ZIP, GitHub, React ou `VITE_*`.
Use templates e números de teste autorizados pela Meta na validação. A função da V11 não é acionada automaticamente ao apenas instalar este ZIP.

## Critérios de aceite antes de divulgar
- 3 reservas no mesmo horário: quarta reserva recusada; executar também em navegadores simultâneos.
- Reagendamento devolve vaga antiga; cancelamento devolve vaga.
- Check-in marca etapa `Recebido` e grava histórico.
- Confirmação de presença não move o veículo antes de ele chegar.
- Técnico não acessa recepção; público não consegue listar ordens.
- A agenda V11 ainda usa janelas fixas de 3 vagas, e NÃO modela duração de serviços ou ocupação real de 10 boxes. Antes de produção, instalar política dinâmica de capacidade e proteção de abuso no backend (rate limit/CAPTCHA).
