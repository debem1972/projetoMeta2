# projetoMeta2 v1.1
Aplicação web para gestão de gastos pessoais.

## Sobre o projeto
O `projetoMeta2` é uma evolução da primeira versão do projeto, trazendo recursos para controle diário de despesas, análise de gastos, dashboard financeiro, geração de relatório em PDF e apoio com IA.

## Novidades da versão v1.1
- Persistência dos dados migrada de `localStorage` para `IndexedDB`.
- Exportação de dados em arquivo `.json` com data e hora no nome do arquivo.
- Importação de dados `.json` salvos no device do usuário.
- Controle de virada de mês com preservação dos dados do mês anterior.
- Solicitação de exportação dos dados do mês anterior na primeira abertura do novo mês.
- Melhorias no cálculo de dias restantes e no saldo diário disponível.
- Filtros de análise por período e categoria.

## Funcionalidades principais
- Cadastro de meta, recursos, data, valor e categoria de gasto.
- Resumo financeiro com saldo restante e gasto diário disponível.
- Gráfico de gastos mensais com Chart.js.
- Dashboard com visualização por categoria e período.
- Edição e exclusão de lançamentos.
- Relatório em PDF (dados e gráfico).
- Botão de consulta para apoio com IA.

## Tecnologias
- HTML5
- CSS3
- Bootstrap 5
- JavaScript
- IndexedDB
- Chart.js
- jsPDF

## Bibliotecas e recursos utilizados
- Ícones: Bootstrap Icons e Font Awesome.
- Gráficos: API gratuita do Chart.js.
- PDF: API gratuita do jsPDF.
- Efeitos sonoros: arquivos gratuitos do site zapsplat.com.
- Fonte externa: arquivo gratuito do site dafont.com.

## Persistência e ciclo mensal
Na versão `v1.1`, os dados ficam armazenados em `IndexedDB`, separados por mês.

Ao detectar a entrada em um novo mês, a aplicação:
1. Mantém os dados do mês anterior salvos.
2. Solicita a exportação desses dados na primeira abertura do novo mês.
3. Permite exportar/importar dados manualmente a qualquer momento.

## Observações
Projeto com foco didático e de portfólio.

Por se tratar de um projeto educacional, solicita-se não comercializar este programa.
