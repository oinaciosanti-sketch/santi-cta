# WhatsApp automático (módulo opcional)

O SANTI DRIVE funciona para agendamento, Pit Pass, cancelamento e reagendamento sem configurar a Meta. O botão de WhatsApp no Pit Pass permite compartilhar a confirmação manualmente.

Para automatizar lembretes da véspera e do dia:

1. Crie uma conta de desenvolvedor na Meta e configure **WhatsApp Business Platform / Cloud API**, telefone remetente verificado e consentimento adequado para mensagens de serviço.
2. Crie/aprove um modelo de mensagem de utilidade em **pt_BR** com três variáveis no corpo: primeiro nome, data e hora. Registre o nome exato em `META_TEMPLATE_NAME`. O modelo precisa aceitar os parâmetros nessa ordem.
3. Publique a função `supabase/functions/drive-reminders/index.ts` usando a Supabase CLI (`supabase functions deploy drive-reminders --no-verify-jwt`). A função utiliza seu próprio segredo de invocação obrigatório. Nunca coloque o token da Meta no frontend.
4. Configure **secrets** da Edge Function: `META_WA_TOKEN`, `META_PHONE_NUMBER_ID`, `META_TEMPLATE_NAME`, `SANTI_CRON_SECRET`. O Supabase fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente da função.
5. Configure um serviço agendador confiável (por exemplo Supabase Cron/pg_net, com segredo armazenado em Vault) para executar `POST https://SEU-PROJETO.supabase.co/functions/v1/drive-reminders` no horário adequado. Envie o cabeçalho `x-santi-cron-secret` correspondente. Nunca deixe segredo em repositório público.
6. Teste primeiro com seu próprio número e um agendamento fictício. Veja os resultados `{sent, failed, skipped}` nos logs. Mensagens de utilidade estão sujeitas às regras e preços atuais da Meta.

**Limites atuais:** o endpoint envia lembretes uma vez por reserva para o dia anterior e o mesmo dia, para agendamentos ainda na etapa **Agendado**. O envio automático a cada etapa do Kanban e pós-venda ainda não é realizado. O agendador precisa ser configurado separadamente. Em produção, considerar tentativas repetidas, confirmações de entrega via webhooks, filas e controle de custos.
