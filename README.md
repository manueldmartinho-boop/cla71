# Clã 71 · Agrupamento 1008

Aplicação em **Next.js 16, React e TypeScript**, com autenticação Supabase e base de dados PostgreSQL partilhada. Preparada para a Vercel.

## Funcionalidades

- Inventário, estado de conservação, localização, empréstimos e devoluções com controlo de stock.
- Caixa geral: receitas, despesas, saldo, gráficos e exportação CSV.
- Contas individuais: pessoas, tipos de dinheiro e tipologias criadas pela tesouraria.
- Prioridade por tipologia e proteção contra retiradas automáticas.
- Simulação de um valor por pessoa: a aplicação divide a retirada entre os saldos disponíveis e apresenta as origens antes da confirmação.
- Pessoas sem saldo elegível bloqueiam a confirmação. Pode-se ajustar as regras, creditar saldo ou desmarcar essas pessoas e recalcular.
- Opção explícita de registar também a despesa total na caixa geral, evitando duplicar uma despesa já registada.
- Histórico de movimentos individuais, arquivo de pessoas e cópias de segurança JSON.
- Entrada, pedido de acesso, confirmação de email e recuperação de palavra-passe.

## Permissões

- **Pendente:** sem acesso aos dados do clã.
- **Membro:** consulta os dados e gere material e empréstimos.
- **Tesouraria:** também gere receitas, despesas, pessoas, tipos, tipologias, saldos e retiradas.
- **Administrador:** também aprova contas, atribui permissões, importa backups e limpa registos.

As permissões são verificadas na base de dados. O cliente utiliza apenas a chave pública Supabase; não usa service_role. A tesouraria pode acrescentar movimentos individuais, mas não remover o seu histórico. Cada gravação arquiva a versão anterior em clan_history, com o autor e a data.

## Instalar

Requer Node.js 20.9 ou superior (22 recomendado).

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

Preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. A chave publishable é pública por definição; as políticas RLS e funções verificam as permissões.

## Preparar a base de dados

1. Num projeto Supabase, aplicar por ordem os ficheiros em supabase/migrations.
2. Configurar Authentication → URL Configuration: Site URL e Redirect URLs devem incluir o endereço final do site. Para desenvolvimento, adicionar http://localhost:3000.
3. Em Authentication, manter a confirmação de email ativa. Configurar SMTP próprio se necessário para envio de emails a todos os membros; os limites do serviço de emails incluído dependem do plano Supabase.
4. Para criar o primeiro administrador, executar no SQL Editor (substituir pelo email autorizado):

```sql
insert into public.clan_admin_invites(email)
values (lower('EMAIL_DO_ADMINISTRADOR'))
on conflict(email) do nothing;
```

O convite é privado e é consumido quando a conta confirma o email e entra no site. As restantes contas começam pendentes. O primeiro administrador aprova-as em **Definições → Acessos ao clã**.

## Publicar na Vercel

Importar o repositório cla71, com raiz ./ e preset **Next.js**. O vercel.json fixa o framework e a saída .next para impedir o erro de procura da pasta public. Não usar exportação estática.

Adicionar as duas variáveis do .env.example às variáveis de ambiente do projeto e voltar a publicar. Em Settings → Build and Deployment, remover o override public do Output Directory se tiver sido definido manualmente.

## Concorrência e cópias de segurança

As gravações são transações atómicas com bloqueio e revisão. Se duas pessoas editarem a mesma versão, a segunda gravação é rejeitada e a versão atual é carregada, para evitar sobrescrever dados de outro membro. Usar o botão Atualizar dados partilhados para carregar alterações antes de trabalhar.

Cada conta individual tem um saldo por tipologia calculado em cêntimos inteiros. O servidor verifica a estrutura, relações, quantidades e saldos não negativos. A confirmação de uma retirada guarda os débitos individuais e a eventual despesa geral na mesma transação.

Backups JSON da primeira versão local podem ser importados por um administrador. Não existe importação automática do navegador antigo, para evitar substituir dados partilhados sem confirmação. A pasta backups/ é privada e está excluída do Git.

## Verificar

```sh
pnpm test
pnpm typecheck
pnpm build
```

O teste cobre divisão entre tipologias, prioridades, fundos protegidos, pessoas arquivadas, simulação sem mutação e bloqueio de saldos negativos.

Os dados de demonstração só são carregados por opção de um utilizador autenticado e não são guardados na base de dados.
