# Clã 71 · Agrupamento 1008

Aplicação em **Next.js 16, React e TypeScript** para gestão de material e tesouraria do Clã 71, Forte da Casa. Preparada para publicação na Vercel.

## Funcionalidades

- Painel com saldo, receitas, despesas e disponibilidade do material.
- Gráfico dos últimos 3, 6 ou 12 meses.
- Inventário: adicionar, editar, pesquisar, filtrar e eliminar material.
- Estado de conservação, localização e controlo de quantidades.
- Empréstimos com responsável, prazo e devolução; atualização automática de stock.
- Registo de receitas e despesas, pesquisa, filtros e exportação CSV para Excel.
- Cópias de segurança JSON com validação na importação.
- Interface em português de Portugal, valores em euros e navegação móvel.

## Dados e acesso

**Esta versão utiliza localStorage.** Os dados pertencem apenas ao navegador e dispositivo usados. Não existe autenticação nem sincronização entre membros. O alojamento na Vercel não transforma o armazenamento local numa base de dados partilhada.

No primeiro acesso são apresentados dados de demonstração claramente identificados. Selecionar **Começar com os dados do clã** cria um espaço vazio e ativa a gravação local. Exportar cópias regularmente em **Definições**. Limpar os dados do navegador pode apagar os registos.

Para utilização partilhada em produção, integrar uma base de dados (por exemplo, PostgreSQL) e autenticação com permissões antes de introduzir dados reais de vários membros.

## Desenvolvimento

Requer Node.js 20.9 ou superior e pnpm (ou npm).

```sh
pnpm install
pnpm dev
```

Abrir http://localhost:3000.

```sh
pnpm typecheck
pnpm build
pnpm start
```

## Publicar na Vercel

1. Adicionar estes ficheiros à raiz de https://github.com/manueldmartinho-boop/cla71.
2. Na Vercel, selecionar **Add New → Project** e importar o repositório `cla71`.
3. Confirmar o preset **Next.js** e a raiz do projeto `./`.
4. Manter as opções automáticas de instalação e build. Não são necessárias variáveis de ambiente nesta versão.
5. Selecionar **Deploy**. Os próximos commits no ramo de produção geram novas publicações.

Alternativamente, com a Vercel CLI instalada e autenticada: `vercel` para uma pré-visualização ou `vercel --prod` para produção.

As fontes Google têm alternativas locais: a aplicação continua funcional sem acesso ao serviço de fontes.
