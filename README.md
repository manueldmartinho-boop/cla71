# Clã 71 · Agrupamento 1008

Aplicação em **Next.js 16, React e TypeScript**, com autenticação Supabase e base de dados PostgreSQL partilhada. Preparada para a Vercel.

## Funcionalidades

- Inventário, estado de conservação, localização, empréstimos e devoluções com controlo de stock.
- Caixa geral: receitas, despesas, saldo, gráficos e exportação CSV.
- Contas individuais: pessoas, tipos de dinheiro e tipologias criadas pela tesouraria.
- Prioridade por tipologia e proteção contra retiradas automáticas.
- Simulação de um valor por pessoa: a aplicação divide a retirada entre os saldos disponíveis e apresenta as origens antes da confirmação.
- Pessoas sem saldo elegível bloqueiam a confirmação. Pode-se ajustar as regras, creditar saldo ou desmarcar essas pessoas e recalcular.
- Caixa do Clã independente das contas individuais, sem movimentos gerais automáticos.
- Histórico de movimentos individuais, arquivo de pessoas e cópias de segurança JSON.
- Entrada, pedido de acesso, confirmação de email e recuperação de palavra-passe.

## Pessoas, tribos e permissões

A área **Pessoas e tribos** centraliza os perfis, saldos individuais e cargos. Cada pessoa pode pertencer a uma tribo e acumular vários cargos. O email associa o perfil à conta de entrada, que continua a precisar de aprovação em Definições.

| Cargo | Material e empréstimos | Finanças |
| --- | --- | --- |
| Caminheiro sem cargo | Consulta | Consulta |
| Guarda-material | Gestão | Consulta |
| Tesoureira | Consulta | Gestão |
| Guia / Subguia | Gestão | Gestão |
| Dirigente | Consulta | Consulta |

Os cargos acumulam-se. Dirigente prevalece sobre os outros cargos: consulta material e finanças, mas pode atualizar o progresso. Administradores mantêm gestão total. Arquivar uma pessoa preserva saldos e histórico, retirando as permissões dos cargos. O administrador gere pessoas, tribos e aprovações. Contas pendentes não têm acesso aos dados. As regras são aplicadas na base de dados; um utilizador não consegue atribuir cargos a si próprio através do cliente.

## Notificações de material

Cada artigo tem avisos de falta, manutenção ou notas. As faltas incluem artigos e quantidades, por exemplo: 1 martelo e 10 estacas. Os avisos podem ser editados, resolvidos, reabertos ou removidos. Resolver um aviso não altera automaticamente o stock. É possível registar artigos com stock zero.

O painel mostra avisos pendentes e devoluções em atraso. A edição do material preserva as notificações. Pessoas com cargos de material e administradores podem gerir avisos; os restantes membros consultam-nos.

As contas utilizam apenas a chave pública Supabase; não se usa service_role no cliente. Cada gravação arquiva a versão anterior em clan_history, com autor e data. Quem tem gestão financeira pode acrescentar movimentos individuais, mas só um administrador pode substituir o histórico existente.

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
2. Configurar Authentication → URL Configuration: Site URL: https://cla71.vercel.app. Redirect URLs: https://cla71.vercel.app/recuperar-password. O modelo de recuperação deve usar {{ .ConfirmationURL }}.
3. Em Authentication, manter a confirmação de email ativa. Configurar SMTP próprio se necessário para envio de emails a todos os membros; os limites do serviço de emails incluído dependem do plano Supabase.
4. Para criar o primeiro administrador, executar no SQL Editor (substituir pelo email autorizado):

```sql
insert into public.clan_admin_invites(email)
values (lower('EMAIL_DO_ADMINISTRADOR'))
on conflict(email) do nothing;
```

O convite é privado e é consumido quando a conta confirma o email e entra no site. As restantes contas começam pendentes. O primeiro administrador aprova-as em **Definições → Acessos ao Clã**.

## Publicar na Vercel

Importar o repositório cla71, com raiz ./ e preset **Next.js**. O vercel.json fixa o framework e a saída .next para impedir o erro de procura da pasta public. Não usar exportação estática.

Adicionar as duas variáveis do .env.example às variáveis de ambiente do projeto e voltar a publicar. Em Settings → Build and Deployment, remover o override public do Output Directory se tiver sido definido manualmente.

## Concorrência e cópias de segurança

As gravações são transações atómicas com bloqueio e revisão. Se duas pessoas editarem a mesma versão, a segunda gravação é rejeitada e a versão atual é carregada, para evitar sobrescrever dados de outro membro. Atualizar a página carrega a versão partilhada mantendo o endereço atual.

Cada conta individual tem um saldo por tipologia calculado em cêntimos inteiros. O servidor verifica a estrutura, relações, quantidades e saldos não negativos. A confirmação de uma retirada guarda os débitos individuais na mesma transação.

A interface permite exportar cópias de segurança. A importação e a demonstração foram retiradas. A pasta backups/ é privada e está excluída do Git.

## Verificar

```sh
pnpm test
pnpm typecheck
pnpm build
```

O teste cobre divisão entre tipologias, prioridades, fundos protegidos, pessoas arquivadas, simulação sem mutação e bloqueio de saldos negativos.

As amostras existentes no código são usadas apenas nos testes; não são carregadas na aplicação.

## Perfil, navegação e progresso

Cada área tem endereço próprio: /material, /financas, /financas/individual, /pessoas, /progresso, /perfil e /definicoes. Atualizar ou usar o histórico do navegador mantém a área.

No Perfil pode-se alterar a palavra-passe confirmando a atual e terminar sessão. O cabeçalho usa o logótipo fornecido.

Progresso: quadro FACEIS e ficha por caminheiro, 42 objetivos de referência da IV secção, estados Não tem/Proposto/Em curso/Tem, etapa, observações e várias pendências com prazo e conclusão. Rótulos resumidos baseados no programa CNE e no cartaz de objetivos ligado na aplicação. Não atribui insígnias automaticamente. Dirigentes e administradores atualizam; restantes membros consultam.

clan_progress_logs regista autor verificado pelo servidor, data e valores antes/depois na mesma transação. O cliente só pode ler os registos, nunca alterá-los. A migração aceita os dados antigos sem os substituir.

## Navegação partilhada e empréstimos

As páginas do grupo app/(clan) partilham a mesma sessão e o mesmo estado em memória. Mudar de área não repete a autenticação nem o carregamento inicial; atualizar a página continua a consultar a versão mais recente.

Qualquer membro aprovado, incluindo dirigentes e caminheiros sem cargo, pode registar empréstimos e devoluções. Apenas os cargos de material podem editar inventário ou reescrever/remover empréstimos. O servidor valida o stock e mantém o histórico de versões em cada gravação. Contas pendentes continuam sem permissão.

O quadro de progresso agrupa os nomes pela etapa atual e permite filtrar a tabela. Todos pertencem ao Caminho. Os grupos de etapas alcançadas são cumulativos e a tabela indica a etapa atual calculada.

## Regras de progresso da IV secção

Referência: [Manual do Dirigente — Sistema de Progresso](https://vianadocastelo.escutismo.pt/Documentos/formacao/Manual_do_Dirigente_Sistema_de_Progresso.pdf), páginas 7–15, e cartaz CNE dos OEF.

A etapa é calculada: Caminho até registar o compromisso na IV secção; Comunidade após o compromisso; Serviço com pelo menos 2 OEF validados em cada uma das seis áreas; Partida com pelo menos 5 em cada área. Só o estado Tem conta como validado. Objetivos adicionais, oportunidades concluídas, propostas e etapas manuais antigas não alteram estes cálculos.

A hierarquia apresenta as seis áreas, três trilhos por área e os OEF. Na ficha, cada objetivo pode integrar a negociação de Comunidade, Serviço ou Partida; o quadro da negociação mostra os escolhidos e validados por área, com referência de 2–3 por etapa. Propostas incluem oportunidades educativas, prazos e evidências. Objetivos reconhecidos na negociação podem ser validados diretamente.

Completar oportunidades não valida objetivos automaticamente. A cerimónia de Partida fica num registo separado com data e fundamentação do Clã; não é atribuída por atingir o limiar da etapa. Todos os 42 OEF validados assinalam a conclusão do percurso para reconhecimento de mérito, sem simular a cerimónia.

Os logs de progresso incluem compromisso, reconhecimento e etapa calculada antes/depois. Dados antigos, observações e pendências são mantidos; a aplicação não inventa datas de compromisso a partir das antigas etapas manuais.
