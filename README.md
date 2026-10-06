# Migraine Terminal

Uma aplicação executável para registar, acompanhar e analisar enxaquecas. Interface inspirada num terminal moderno; formulários, navegação e acções rápidas funcionam sem escrever comandos.

**Track. Observe. Understand.** Apenas organização de informação. Não diagnostica, não recomenda tratamento nem sugere alterações de medicação.

## Stack e arquitectura

- Next.js 16, React 19 e TypeScript strict, com exportação estática.
- CSS responsivo com componentes de formulário reutilizáveis; Lucide para ícones e Recharts para gráficos. CSS próprio substitui Tailwind/shadcn para evitar dependências de apresentação desnecessárias neste projecto.
- Zod valida formulários, operações de domínio e backups importados.
- **IndexedDB** como base de dados local transaccional. Foi escolhida em vez de SQLite/PostgreSQL porque o requisito prioritário é uma PWA privada que regista offline no telemóvel, sem backend ou conta. SQLite no servidor não preservaria esse fluxo offline por si só. O adaptador `lib/storage.ts` pode ser substituído posteriormente, mantendo o domínio.
- jsPDF produz PDFs no dispositivo. JSON e CSV são gerados localmente.
- Service worker com precache de todos os assets do build, incluindo o gerador de PDF, e manifest com ícones PNG.

```
app/                 shell Next e CSS
components/          dashboard, formulários, calendário, analytics, relatórios, definições
lib/model.ts         entidades, validação e operações de crises/registos/medicação
lib/storage.ts       IndexedDB, revisão optimista e gravação atómica
lib/analytics.ts     métricas, amostras, comparação e observações antes das crises
lib/commands.ts      parser de comandos determinístico
lib/demo.ts          30 dias de dados fictícios
lib/export.ts        PDF, CSV e JSON
lib/weather.ts       Open-Meteo opcional
scripts/pwa.mjs      precache versionado gerado após o build
scripts/server.mjs   servidor estático local para validar o build
```

## Instalação e desenvolvimento

Requer Node.js **22 ou superior** e npm. Usar o checkout existente; cada tarefa na nuvem já é isolada, não é necessário criar um worktree.

```sh
cd /workspace/head
npm ci --cache /tmp/migraine-npm-cache
npm run dev
```

Servidor de desenvolvimento na porta 3000. `npm run typecheck` verifica TypeScript; `npm test` executa os testes do domínio. O service worker só é registado em produção para não interferir com hot reload.

## Build e execução

```sh
npm run build
npm start
```

O build escreve `out/` e gera `out/sw.js`. O servidor estático de validação usa a porta 3000; `PORT=4000 npm start` altera a porta. Não executa backend, não recebe dados clínicos e não deve substituir a configuração TLS de um alojamento de produção.

## Funcionalidades

- Check-in rápido: estado, dor, energia, sono, stress e água; secções expansíveis para sintomas, localização/tipo de dor, visuais/cognição/humor, sono detalhado, premonitórios, triggers, alimentação/cafés, exercício/ecrãs, meteorologia e notas.
- Crises com início automático ou corrigido manualmente, duração de vários dias, intensidade actual/máxima, sintomas, localização, triggers, eficácia e sintomas residuais. Apenas uma crise activa. Crises concluídas podem ser consultadas e corrigidas no histórico.
- Medicação preventiva/resgate/outra configurável, dose introduzida pelo utilizador, hora, eficácia, minutos até melhoria, segunda dose e notas. O histórico preserva nome/dose mesmo se o medicamento for removido da biblioteca. Ausência de toma significa **sem registo**; o check-in permite marcar explicitamente medicamentos não tomados. Uma nova toma limpa essa marca para evitar contradições.
- Dashboard, últimos 14 dias, timeline dos eventos de hoje com entrada manual de sintomas/melhorias/refeições, streak de dias consecutivos com dados, indicadores mensais, acções mobile LOG/MIGRAINE/MEDS/TODAY.
- Analytics por 7/30/90/365 dias: intensidade, duração, uso/eficácia de medicação, sintomas/triggers, hora e dia de início, comparação de sono, stress, refeições tardias, água, café/café tardio, ecrãs e meteorologia entre dias com/sem crise.
- Análise de observações 2/4/8/12/24h antes das crises, incluindo cobertura da amostra. Cada gravação de check-in conserva um snapshot com hora; a vista diária mostra a versão mais recente. As amostras são observações introduzidas pelo utilizador, não monitorização contínua.
- Calendário mensal e heatmap anual; símbolos e rótulos distinguem estados além da cor. Clique num dia para abrir o registo e as crises/tomas associadas.
- Relatórios por 7/30/90 dias ou período personalizado. PDF de consulta, CSV normalizado (`entity,date,field,value`), JSON do período e backup JSON completo.
- Pesquisa por termos presentes nos registos/medicação/crises ou `sleep less than 6h` / `sono menos de 6h`.
- Onboarding de defaults e demonstração isolada com 30 dias fictícios.

## Base de dados e integridade

Base IndexedDB `migraine-terminal`, versão 1, object store `datasets`. Chaves `personal` e `demo`. Cada conjunto contém um documento validado e uma revisão. Entidades: logs diários, crises, biblioteca de medicamentos, tomas, eventos de timeline, snapshots de observações e definições. Sono, alimentação, hidratação, exercício, meteorologia e notas são grupos dentro do log diário; IDs dos logs e datas são únicos. Um utilizador local por perfil/origem, sem entidade de autenticação.

Gravação atómica e verificação de revisão impedem substituir alterações feitas por outra janela: se ocorrer conflito, recarregue antes de editar. Falhas de armazenamento são apresentadas sem fingir que o registo foi guardado. Os dados demo nunca entram no conjunto pessoal. A aplicação abre sempre o conjunto pessoal numa nova sessão; pode voltar à demonstração nas definições.

## Métricas e limites das associações

Crises são contabilizadas pela **data local do início**. A duração média considera apenas crises terminadas e usa a duração completa, mesmo quando atravessa o período seleccionado. Intensidade média usa o máximo de cada crise. Check-ins marcados como enxaqueca sem uma crise iniciada aparecem no calendário/comparações, mas não inventam um episódio com duração ou hora desconhecida.

Streak só inclui dias consecutivos com check-in e sem crise/estado enxaqueca; não assume que dias em falta foram dias saudáveis. As comparações mostram média e tamanho de cada grupo. Percentagens pré-crise usam como denominador crises com observações na janela, e mostram também quantas crises não têm cobertura. Zero e ausência de dados são distintos. A linha do gráfico liga apenas dias registados.

Estas são **possíveis associações**, não causas. Não há inferência clínica, ajuste estatístico de factores de confusão ou recomendação de tratamento. A precisão depende dos registos e da hora correcta do dispositivo. Relógios/horas são guardados em ISO UTC e apresentados no fuso do dispositivo.

## Comandos

Abrir a palette com **Cmd+K / Ctrl+K**. A barra inferior executa comandos com Enter. A palette também permite pesquisa textual através do botão de pesquisa.

```text
log migraine
log pain 6
log coffee
log zolmitriptan
log water 500ml
log water 1.5l
log stress 8
migraine start
migraine stop
status
today
week
report 30d
history
symptoms
meds
```

Nomes de outros medicamentos funcionam em `log <nome completo>`. A dose predefinida vem exclusivamente do que o utilizador configurou; a toma rápida pode ser completada na área Medication. `log pain` actualiza também a intensidade da crise activa. Não é um shell de sistema: só executa comandos reconhecidos.

## Variáveis de ambiente e meteorologia

Não são necessárias chaves, segredos ou variáveis para registar dados. `PORT` configura o servidor estático local. `PLAYWRIGHT_CHROMIUM_PATH` configura o executável de Chromium para os testes E2E. `NEXT_TELEMETRY_DISABLED=1` desactiva telemetria da ferramenta de build Next (não existe tracking de utilizadores na app).

Meteorologia opcional: em Settings, activar e guardar latitude/longitude. O botão «Obter agora» associa os dados a hoje; ao guardar o check-in de hoje pode obtê-los automaticamente. Usa `https://api.open-meteo.com/v1/forecast`, sem API key. Guardamos temperatura, pressão de superfície, humidade, precipitação e variação aproximada da pressão em 24h. São valores meteorológicos modelados, não medições clínicas. Coordenadas são enviadas ao serviço; registos de saúde não são enviados. Requer acesso a `api.open-meteo.com` no navegador. Falhas nunca bloqueiam o registo; também é possível introduzir valores manualmente. Dias históricos não recebem a meteorologia actual automaticamente.

## PWA e offline

Instalação disponível em navegadores compatíveis, por HTTPS ou localhost durante desenvolvimento. Android/desktop: opção de instalação do navegador. iOS: Partilhar → Adicionar ao ecrã principal. A primeira visita e o precache requerem internet. Após activação do service worker, toda a interface, registos e exportação PDF funcionam offline. Ao publicar, **publique a pasta `out/` completa**, incluindo `sw.js`, manifest, ícones e `_next/`.

Não existe backend, portanto não é necessário fazer sync de saúde ao regressar à internet. Os dados são locais a cada origem e perfil; mudar o domínio não move os dados. Uma versão nova do service worker fica à espera até as janelas antigas fecharem, evitando misturar assets de versões distintas. Reabra a app para concluir uma actualização. Lembretes são opt-in e funcionam apenas com a app aberta; o navegador pode suspendê-los em segundo plano. Notificações exactas com a app fechada não estão implementadas.

## Exportação, restauro e privacidade

- **Backup completo JSON** inclui todas as entidades, snapshots e definições do conjunto actual. Guarde-o num local protegido.
- **JSON do período** é uma exportação filtrada; para restauro integral use o backup completo.
- Importação em Settings valida a versão, estrutura, datas, limites e IDs; pede confirmação antes de substituir o conjunto actual. Um backup demo só pode ser importado no conjunto demo e vice-versa. Limite de 20 MB.
- PDF e CSV também contêm informação de saúde. CSV protege células que podem ser interpretadas como fórmulas por folhas de cálculo.
- Não há contas, servidor clínico, publicidade ou marketing. IndexedDB **não é encriptada com palavra-passe** nesta versão. Proteja o dispositivo e o perfil do navegador. Dados podem desaparecer quando o navegador limpa armazenamento, especialmente em modo privado; faça backups.
- Remover um medicamento preserva tomas históricas. Apagar um conjunto exige escrever `APAGAR`; o outro conjunto é preservado.

## Testes

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

E2E usa o Chromium já instalado em `/usr/bin/chromium` no ambiente cloud. Noutro sistema indique um executável compatível:

```sh
PLAYWRIGHT_CHROMIUM_PATH=/caminho/para/chromium npm run test:e2e
```

Os testes abrem automaticamente o servidor de produção. Cobrem check-in/reload, crises de vários dias, tomas, demo isolada, analytics/calendário, comandos, PDF/CSV/backup/restauro, offline com o servidor desligado e PDF, mobile/palette/pesquisa, conflitos entre janelas e falha de meteorologia sem perda de registo. Testes unitários cobrem ciclo de crise, duração, máximo, validação, registo diário, histórico de observações, medicação, relatórios, amostras temporais, streak, parser e backups.

## Deploy e evolução

Hospede `out/` num servidor estático com HTTPS (por exemplo Cloudflare Pages, Netlify ou armazenamento com CDN). Build: `npm ci && npm run build`; output: `out`. Sem segredos ou base de dados no servidor. Configure `sw.js` com `Cache-Control: no-cache` e MIME JavaScript; preserve caminhos de `_next/`. CSP pode restringir ligações à própria origem e Open-Meteo; scripts inline de bootstrap Next requerem hashes próprios ou permissão inline, como no servidor local de validação.

Antes de acrescentar sync/backend, implementar autenticação segura, controlo de acesso por utilizador, estratégia de conflitos, encriptação apropriada e consentimento. O domínio/adaptador de armazenamento deixam esse caminho aberto. Esta primeira versão não promete sync entre dispositivos, integração com wearables nem notificações nativas agendadas.
