# Game Design Document (GDD)
## Bubble Shooter — documento de design e requisitos

**Versão:** 1.0  
**Status:** Base de pré-produção  
**Data:** 12 de novembro de 2026  
**Plataforma-alvo inicial:** dispositivos móveis (Android e iOS)  
**Gênero:** puzzle arcade de combinação de bolhas  
**Modelo de distribuição:** gratuito, com monetização opcional a definir

> **Nota de escopo:** Este documento consolida e revisa os dois textos de referência. Ele descreve um jogo original inspirado nas convenções do gênero Bubble Shooter; não pressupõe a cópia exata de telas, identidade visual, marcas, fases, textos ou recursos proprietários de outro produto. Nomes, arte, áudio e conteúdo final devem ser originais ou devidamente licenciados.

---

## 1. Visão do produto

### 1.1 Resumo

O jogador mira um lançador fixo na parte inferior da tela e dispara bolhas coloridas contra um agrupamento suspenso no topo. Ao conectar três ou mais bolhas da mesma cor, o grupo estoura. Bolhas que deixam de estar conectadas ao teto após uma remoção caem, criando oportunidades de pontuação e combos. Cada fase propõe um arranjo próprio, um objetivo claro e um limite de pressão — como quantidade de disparos, teto descendente ou uma linha de perigo.

A experiência deve ser fácil de aprender, satisfatória a cada disparo e progressivamente mais estratégica. A apresentação favorece partidas curtas em orientação retrato, com leitura clara em telas pequenas e controles por toque.

### 1.2 Fantasia e promessa ao jogador

“Planeje o ricochete, encontre o ponto certo e limpe o tabuleiro com uma sequência de disparos inteligentes.” O jogo combina precisão, leitura espacial e alívio visual ao estourar grandes grupos.

### 1.3 Pilares de design

1. **Mira legível e justa:** a trajetória prevista deve corresponder de forma confiável à física do disparo.
2. **Decisões com consequência:** cada bolha disponível importa; a próxima cor e a possibilidade de troca ajudam o jogador a planejar.
3. **Recompensa visual imediata:** impactos, estouros e quedas precisam ser fáceis de acompanhar e agradáveis, sem esconder o estado do tabuleiro.
4. **Progressão gradual:** novas cores, formatos de tabuleiro e obstáculos são introduzidos em etapas compreensíveis.
5. **Acessibilidade e respeito ao jogador:** informação não depende apenas de cor; monetização não deve bloquear a compreensão nem tornar a vitória dependente de pagamento.

### 1.4 Público e sessão

- Público amplo, incluindo jogadores casuais e fãs de puzzles.
- Sessões curtas, idealmente de 1 a 5 minutos por fase.
- Controles adequados para uma mão, com botões e alvos de toque dimensionados para dispositivos móveis.

---

## 2. Loop principal e experiência da fase

### 2.1 Loop de jogo

1. O jogador vê o tabuleiro, o objetivo da fase, a bolha atual e a próxima.
2. Toca ou arrasta para definir a direção do disparo; uma linha pontilhada apresenta a trajetória e os ricochetes previstos.
3. Solta para disparar.
4. A bolha voa, colide com uma parede ou com o conjunto do tabuleiro e se encaixa em uma célula válida.
5. O jogo procura grupos conectados da mesma cor. Se houver pelo menos três, eles estouram.
6. O sistema identifica bolhas sem conexão com o teto e as remove como queda/avalanche.
7. A interface atualiza pontuação, objetivos, sequência, munição e estado do tabuleiro.
8. A partida termina em vitória quando o objetivo é concluído ou em derrota quando a condição de falha é atingida.
9. A tela de resultado apresenta recompensas e opções para avançar, repetir ou retornar ao mapa.

### 2.2 Condições de vitória

A condição principal configurada para cada fase é limpar todas as bolhas removíveis. Fases podem substituir ou complementar esse objetivo com metas explícitas, por exemplo:

- resgatar todos os itens presos no tabuleiro;
- remover um número determinado de obstáculos;
- alcançar uma pontuação mínima;
- concluir o objetivo antes de esgotar os disparos.

Uma fase deve comunicar claramente se exige limpar todo o tabuleiro ou apenas cumprir uma meta parcial.

### 2.3 Condições de derrota

Uma fase pode terminar quando:

- o jogador fica sem disparos antes de concluir o objetivo; ou
- uma fileira do tabuleiro alcança a linha de perigo definida para a fase.

Se o tabuleiro descer periodicamente, a regra deve ser informada antes do primeiro disparo e indicada durante a partida. Recomenda-se que fases introdutórias não combinem limite de munição e descida do teto ao mesmo tempo.

### 2.4 Pausa e interrupções

A pausa deve interromper simulação, cronômetros e animações que alterem o resultado. Ao retomar, o estado deve permanecer idêntico. Mudanças de aplicativo, chamadas e suspensão do dispositivo não devem consumir disparos.

---

## 3. Mecânicas e regras

### 3.1 Grade do tabuleiro

O tabuleiro usa uma grade hexagonal deslocada, também chamada de grade em colmeia. Cada célula, exceto as bordas, possui até seis vizinhas. Uma implementação por linhas alternadas (offset) é recomendada para simplificar a representação em uma matriz.

Cada célula pode estar vazia ou conter uma bolha com tipo e atributos. O tabuleiro também armazena o número de linhas, o deslocamento das linhas e as posições ocupadas. As coordenadas visuais das bolhas são derivadas da grade, e não usadas como fonte primária das regras.

**Regra de vizinhança:** as seis células adjacentes são calculadas conforme a paridade da linha (par ou ímpar). A convenção escolhida deve ser única no editor, no jogo e nos testes.

### 3.2 Disparo e encaixe

- O lançador permanece na região inferior, normalmente centralizado.
- O jogador escolhe uma direção dentro de um intervalo angular permitido. O ângulo mínimo impede disparos diretamente para baixo ou contra a própria interface.
- A bolha lançada move-se por simulação determinística e ricocheteia nas paredes laterais configuradas.
- Ao tocar uma bolha existente ou o limite superior, ela se encaixa na célula livre válida mais próxima do ponto de contato, respeitando a grade.
- O encaixe deve impedir sobreposição e deve ser consistente entre aparelhos e taxas de atualização.
- Se não houver célula válida, o jogo deve aplicar uma regra de contingência previsível — por exemplo, escolher a célula livre adjacente mais próxima — e registrar o caso para teste.

### 3.3 Mira e ricochete

A linha de mira é uma previsão da trajetória da bolha atual. A simulação da mira deve usar os mesmos limites e regras de colisão do disparo real. A linha pode ser pontilhada e terminar no primeiro ponto de impacto válido; ricochetes podem ser mostrados até um limite configurável para não poluir a tela.

A reflexão de um vetor de direção **V** em uma superfície com normal unitária **N** pode ser calculada por `R = V - 2 × (V · N) × N`. Para paredes verticais, uma inversão do componente horizontal também pode ser suficiente. A mira deve respeitar bloqueios, bordas, zoom e tamanho da bolha.

A opção **Mira estendida** pode aumentar o número de ricochetes exibidos ou tornar a previsão mais informativa. Não deve mudar a física do disparo.

### 3.4 Combinação e remoção

Após o encaixe, uma busca em largura ou profundidade percorre vizinhas da mesma cor/tipo. Se o grupo conectado à bolha recém-disparada tiver três ou mais bolhas combináveis, todas as bolhas desse grupo são removidas simultaneamente.

- A bolha recém-disparada participa da contagem.
- Bolhas especiais e obstáculos têm regras próprias e não devem ser tratados automaticamente como cores comuns.
- A pontuação pode considerar quantidade removida, tamanho do grupo, queda de bolhas e combos.
- Um grupo menor que três permanece no tabuleiro.

### 3.5 Queda de grupos desconectados

Depois de qualquer remoção que altere conectividade, o sistema inicia uma busca a partir de todas as bolhas conectadas à fileira superior (âncoras). Toda bolha removível que não for alcançada é considerada desconectada e cai. Esse cálculo acontece após a remoção do grupo, antes da próxima ação do jogador.

Obstáculos podem ter regras próprias: alguns caem quando desconectados, mesmo que não combinem por cor; outros permanecem fixos. A regra por tipo deve ser definida nos dados da fase.

### 3.6 Próxima bolha e troca

A interface mostra a bolha atual e a próxima. Se a fase permitir, o jogador pode trocar as duas uma vez por disparo. A troca não consome disparo. O conjunto de cores disponíveis deve refletir, de preferência, as cores presentes no tabuleiro ou as regras específicas da fase, para evitar munição sem utilidade.

### 3.7 Descida do teto e limite de disparos

Cada fase pode definir um limite de disparos, uma regra de descida do teto, ambos ou nenhum. Em uma configuração comum, o teto desce após **N disparos sem progresso**, em vez de após qualquer disparo; “progresso” (por exemplo, remoção de bolhas ou avanço do objetivo) precisa ser definido de forma explícita. Os parâmetros são dados configuráveis por fase.

A linha de perigo é visualmente distinta do tabuleiro. Caso uma bolha ultrapasse essa linha, a fase termina em derrota, exceto quando a fase adotar outra condição documentada.

---

## 4. Conteúdo, fases e progressão

### 4.1 Estrutura de fases

As fases são organizadas em uma sequência desbloqueável e podem ser agrupadas em capítulos, mundos ou conjuntos temáticos. Cada fase contém, no mínimo:

- identificador e versão do conteúdo;
- matriz/arranjo inicial do tabuleiro;
- conjunto de cores e tipos de bolha permitidos;
- objetivo e condição de falha;
- quantidade de disparos e regra de descida, quando aplicável;
- configuração do lançador e da linha de perigo;
- recompensas e parâmetros de pontuação;
- tutorial ou instruções contextuais, quando necessários.

### 4.2 Mapa de progressão

O mapa apresenta nós numerados conectados por um caminho visual. Ele indica fases concluídas, fase atual e fases bloqueadas. O avatar do jogador destaca a posição atual; recompensas especiais podem aparecer em nós dedicados.

O mapa deve permitir identificar rapidamente o próximo nível jogável. Um botão primário, por exemplo **Jogar — Fase X**, inicia a fase atual. Eventos e áreas bloqueadas por nível podem ser apresentados com o requisito de desbloqueio visível.

### 4.3 Curva de dificuldade

A dificuldade deve aumentar por introdução controlada de variáveis, sem depender apenas de reduzir disparos. Progressão sugerida:

1. ensinar mira, encaixe e combinação com poucas cores;
2. introduzir grupos maiores e importância da queda;
3. habilitar ricochetes e escolha entre bolha atual/próxima;
4. introduzir mais cores e formatos irregulares;
5. apresentar obstáculos, metas secundárias e limites de disparo;
6. combinar regras previamente ensinadas em desafios avançados.

Cada nova mecânica deve ter pelo menos uma fase de apresentação segura antes de ser usada em combinação difícil.

### 4.4 Missões e tarefas

O sistema de missões pode incluir objetivos diários, semanais ou de evento, como estourar bolhas, vencer fases, executar quedas ou concluir níveis sem usar uma troca. O progresso é atualizado por eventos de jogo e apresentado com texto, contador e recompensa.

Exemplo de tarefa: “Estoure 12 bolhas” — progresso 2/12. O texto deve nomear exatamente o que está sendo contado: bolhas individuais, grupos, fases ou ações. Recompensas só são concedidas uma vez por ciclo e devem ser registradas para evitar duplicação.

---

## 5. Obstáculos e itens especiais

### 5.1 Obstáculos potenciais

- **Pedra:** não combina por cor; pode cair se desconectada ou exigir regra própria.
- **Gelo:** recebe mais de um impacto ou precisa ser removido por uma combinação adjacente. A regra deve ser indicada visualmente.
- **Bloqueador:** ocupa espaço e não pode ser atravessado; pode exigir uma condição específica para remoção.
- **Item resgatável:** fica preso entre bolhas e conta para um objetivo secundário quando cai ou é alcançado.

O conjunto inicial deve conter poucos obstáculos. Cada tipo adiciona custo de leitura e balanceamento, portanto deve ser introduzido apenas quando ampliar decisões interessantes.

### 5.2 Power-ups (escopo posterior ao MVP)

- **Bomba:** remove bolhas em uma área definida ao redor do impacto.
- **Bola de fogo:** atravessa ou remove uma faixa, conforme regra visualmente comunicada.
- **Bola arco-íris:** combina com qualquer cor comum ou adota uma cor compatível ao encaixar.

Os power-ups podem ser recebidos como recompensa ou adquiridos, mas precisam ter regras claras, animações concisas e limites de uso definidos. Nenhum power-up deve ser necessário para concluir fases normais dentro das condições apresentadas ao jogador.

---

## 6. Pontuação, recompensas e economia

### 6.1 Pontuação

A pontuação deve premiar remoções eficientes sem obscurecer o objetivo principal. Fatores possíveis: bolhas estouradas, bolhas desconectadas que caem, tamanho da combinação e sequência de acertos. A fórmula final deve ser parametrizada e testada para evitar que um único comportamento domine todos os demais.

### 6.2 Moedas e recompensas

A moeda virtual pode ser concedida por primeira conclusão de fase, tarefas, eventos ou recompensas de sessão. O saldo é mostrado no menu e em telas de resultado. Gastos possíveis incluem itens cosméticos ou power-ups, conforme decisão de produto.

Regras mínimas:

- apresentar custo antes da confirmação;
- evitar compras acidentais com um toque;
- atualizar saldo e inventário de forma atômica;
- persistir operações de modo idempotente;
- distinguir moeda virtual de compras com dinheiro real.

### 6.3 Anúncios e compras integradas

Monetização é opcional e fica fora do protótipo de mecânica. Possibilidades futuras incluem anúncios recompensados voluntários e compra para remover anúncios. Qualquer anúncio recompensado deve informar a recompensa antes da exibição e concedê-la somente após confirmação válida do SDK.

Integrações com lojas e publicidade devem seguir as políticas atuais de Google Play e App Store, legislação aplicável, consentimento e regras de privacidade. Compras devem ser validadas pelo mecanismo apropriado da plataforma; benefícios permanentes, como remoção de anúncios, precisam ter restauração de compra. A interface nunca deve sugerir que o pagamento é obrigatório para vencer.

### 6.4 Códigos promocionais

A tela pode aceitar códigos que concedem recompensas. Se o jogo tiver serviços online, validação, expiração e prevenção de reutilização devem ser feitas no servidor. Em modo totalmente offline, a lista embutida pode ser extraída do aplicativo; portanto, não deve ser considerada segura para campanhas de alto valor.

---

## 7. Interface e experiência do usuário

### 7.1 Telas principais

1. **Inicialização/carregamento:** marca original do jogo e indicador de carregamento apenas quando houver trabalho real a executar. A interface deve apresentar progresso honesto; evitar ficar artificialmente parada em 99%.
2. **Menu principal:** botão principal para continuar/jogar, acesso ao mapa, saldo e atalhos para configurações e loja.
3. **Mapa:** caminho de níveis, estado de desbloqueio, avatar e botão para iniciar a fase disponível.
4. **Partida:** tabuleiro na região superior, lançador e mira na inferior, objetivo, bolha atual/próxima, contador relevante, pausa e moedas somente quando fizerem parte do contexto.
5. **Vitória/derrota:** resultado, objetivo, pontuação/recompensa, avançar ou tentar novamente.
6. **Configurações:** preferências de áudio, vibração, mira e acessibilidade; perfil e informações de versão, se aplicável.
7. **Missões/eventos/loja:** telas acessíveis por navegação clara e sem competir com o botão de jogo.

### 7.2 Princípios de interface

- Hierarquia visual simples: objetivo, tabuleiro e lançador são prioritários durante a partida.
- Texto legível em diferentes proporções de tela, com área segura para recortes e barras do sistema.
- Não depender exclusivamente de ícones sem rótulo em ações importantes.
- Estados bloqueados devem explicar o requisito, por exemplo “Desbloqueia na fase 8”.
- Animações não devem impedir entrada de comandos nem atrasar excessivamente o reinício.
- Confirmar antes de ações que consumam recursos escassos.

### 7.3 Perfil

O perfil pode exibir nome e avatar editáveis. A edição de nome deve aplicar limites de comprimento e caracteres e evitar coleta de dados pessoais desnecessária. A versão do aplicativo pode ser exibida em informações ou configurações.

### 7.4 Configurações e acessibilidade

- **Som:** controla efeitos e música separadamente quando possível, além de permitir silenciar tudo.
- **Vibração:** habilita ou desabilita retorno tátil; usa a API apropriada da plataforma e respeita as preferências do sistema.
- **Mira estendida:** controla o nível de informação visual da trajetória, sem alterar a jogabilidade.
- **Modo de acessibilidade para daltonismo:** combina cor com padrões, formas, símbolos ou rótulos consistentes. A identificação não pode depender apenas de matizes.
- **Contraste e tamanho:** considerar opção de maior contraste e interface adaptável.
- **Redução de movimento:** opcionalmente diminui tremores, partículas e efeitos de câmera.

As preferências devem ser salvas localmente e restauradas na próxima inicialização.

---

## 8. Direção de arte, animação e áudio

### 8.1 Direção visual

Estilo casual, colorido e de leitura imediata. As bolhas devem parecer distintas no tabuleiro mesmo em miniatura. Brilhos e gradientes podem sugerir material gelatinoso ou vítreo, mas não devem reduzir contraste entre cores próximas. A interface, os ícones, os personagens e os cenários devem formar uma identidade própria.

Não é requisito produzir todos os recursos em 4K. Resolução e compressão devem ser escolhidas conforme tamanho em tela, memória e desempenho do dispositivo. A qualidade percebida depende de composição, legibilidade, consistência e animação, não apenas da resolução da textura.

### 8.2 Animação e efeitos

- deslocamento suave e previsível da bolha disparada;
- compressão/expansão breve no impacto (squash and stretch);
- animação curta de estouro e partículas controladas;
- queda das bolhas desconectadas com leitura clara;
- feedback de combo sem ocultar o tabuleiro;
- efeitos de vibração apenas quando habilitados e suportados.

### 8.3 Áudio

- trilha em loop adequada a sessões longas;
- sons distintos para disparo, impacto, combinação, queda, erro e resultado;
- variação sutil de tom ou camada para sequências, sem volume agressivo;
- opção de controlar música e efeitos separadamente;
- arquivos comprimidos em formatos apropriados à plataforma, com streaming para trilhas maiores quando necessário.

---

## 9. Requisitos técnicos e arquitetura

### 9.1 Componentes lógicos

- **Game State / Session Controller:** estados de inicialização, menu, partida, pausa e resultado.
- **Board Model:** matriz, vizinhança, encaixe, grupos e conectividade ao teto.
- **Projectile Controller:** movimento, colisões e encaixe.
- **Aim Predictor:** previsão de trajetória com a mesma configuração física do projétil.
- **Level Loader:** leitura e validação dos dados da fase.
- **Scoring and Objective System:** objetivos, progresso, pontuação e condições de término.
- **Progression/Map System:** desbloqueio e estado de conclusão das fases.
- **Economy/Inventory:** saldo, recompensas e itens.
- **Settings/Profile:** preferências locais e perfil mínimo.
- **UI Presenter:** apresentação dos estados sem conter as regras centrais.
- **Persistence Service:** gravação versionada e recuperação segura do progresso.
- **Analytics (opcional):** eventos minimizados e consentidos para balanceamento e estabilidade.

A lógica do tabuleiro deve ser testável sem depender da interface ou das animações. A simulação deve produzir o mesmo resultado com a mesma configuração e sequência de ações.

### 9.2 Dados de fase

Recomenda-se definir fases em JSON ou formato equivalente, versionado e validado. Exemplo conceitual:

```json
{
  "id": "level_001",
  "schemaVersion": 1,
  "rows": [
    ["red", "blue", "red", "blue"],
    ["blue", "red", "blue", "red"]
  ],
  "availableColors": ["red", "blue"],
  "objective": { "type": "clear_board" },
  "shotLimit": 24,
  "ceilingDrop": { "enabled": false },
  "hazards": [],
  "rewards": { "coins": 10 }
}
```

O exemplo é ilustrativo, não uma especificação final de esquema. Deve-se definir como linhas incompletas, células vazias, obstáculos e offset são representados. Dados inválidos devem falhar com mensagem de diagnóstico durante desenvolvimento, em vez de corromper silenciosamente a partida.

### 9.3 Persistência e salvamento

Salvar ao menos: maior fase desbloqueada, fases concluídas, saldo e inventário, configurações, progresso de missões e versão do esquema de dados. O salvamento deve ser feito em momentos seguros e tratado contra interrupção durante a escrita. Uma migração deve preservar progresso quando o formato mudar.

Para MVP offline, armazenamento local é suficiente. Sincronização entre dispositivos, ranking e validação online exigem backend e regras próprias de privacidade e integridade; não são assumidos como parte do escopo inicial.

### 9.4 Desempenho e compatibilidade

- manter entrada responsiva durante simulação e efeitos;
- limitar partículas e efeitos para aparelhos de menor capacidade;
- adaptar layout a resoluções e proporções suportadas;
- testar suspensão/retomada, falta de espaço e interrupções;
- evitar dependência de taxa de quadros para a lógica de colisão;
- medir tamanho de instalação e consumo de memória antes de escolher recursos e formatos.

---

## 10. Escopo e prioridades

### 10.1 MVP (primeira versão jogável)

- menu simples;
- grade hexagonal e encaixe consistente;
- mira, disparo e ricochete lateral;
- combinação de três ou mais;
- queda de grupos desconectados;
- próxima bolha e troca;
- objetivos de limpar o tabuleiro e limite de disparos;
- pelo menos 20 fases de teste, configuráveis por dados;
- vitória, derrota, reinício e avanço;
- mapa linear simples e salvamento local;
- áudio e configurações básicas;
- modo de acessibilidade que não depende apenas de cor.

### 10.2 Pós-MVP

- missões diárias e eventos;
- economia expandida e loja;
- power-ups e obstáculos adicionais;
- anúncios recompensados e compras integradas;
- perfil com avatar e nome;
- sincronização em nuvem, ranking e conteúdo sazonal;
- editor visual de fases e ferramentas de balanceamento.

Cada funcionalidade pós-MVP exige avaliação de custo, manutenção, privacidade, regras de plataforma e impacto na experiência. Não deve atrasar a validação do loop principal.

---

## 11. Métricas e telemetria (opcional)

Se forem implementadas métricas, usar coleta proporcional e transparente, respeitando consentimento e legislação aplicável. Exemplos úteis para balanceamento:

- taxa de conclusão por fase e número de tentativas;
- média de disparos restantes na vitória;
- cores e regras que geram falhas inesperadas;
- tempo de carregamento, erros e encerramentos;
- uso de troca, mira estendida e opções de acessibilidade.

Não registrar conteúdo pessoal desnecessário. Dados analíticos não devem ser condição para jogar offline.

---

## 12. Critérios de aceitação e testes

### 12.1 Regras centrais

- Ao encaixar uma bolha, o resultado deve ocupar uma única célula sem sobreposição.
- Um grupo conectado de duas bolhas não estoura; um grupo de três ou mais estoura segundo as regras.
- Todas as bolhas removíveis sem caminho até o teto caem após uma combinação.
- A mira e o projétil concordam quanto a ricochetes e primeiro ponto de colisão dentro da tolerância definida.
- Trocar bolhas não consome disparo; disparar consome exatamente um.
- A vitória/derrota não pode ocorrer duas vezes na mesma partida.
- Pausar e retomar não altera posição, objetivo ou munição.

### 12.2 Conteúdo e progressão

- Fases inválidas são detectadas pelo validador.
- A fase seguinte só desbloqueia após a condição de conclusão definida.
- O estado de progresso permanece após fechar e reabrir o aplicativo.
- Recompensas de uma mesma conclusão não são duplicadas por repetição de eventos.

### 12.3 Usabilidade e compatibilidade

- Todos os controles essenciais são utilizáveis por toque em telas pequenas.
- Texto e elementos críticos permanecem dentro das áreas seguras.
- Bolhas continuam distinguíveis com o modo de acessibilidade ativo.
- Interrupção do aplicativo não consome disparo nem corrompe progresso.
- Desempenho e consumo são medidos nos dispositivos mínimos definidos pelo projeto.

---

## 13. Riscos e decisões em aberto

Antes de produção, decidir:

1. Engine e linguagem (por exemplo, Unity/C#, Godot/GDScript ou outra opção).
2. Orientação final, proporções de tela e lista mínima de dispositivos.
3. Nome, identidade visual, personagens e universo originais.
4. Fórmula de pontuação, recompensas e ritmo de dificuldade.
5. Quantidade de fases para lançamento e política de conteúdo futuro.
6. Regras exatas de cada obstáculo e power-up.
7. Se o jogo será exclusivamente offline ou contará com serviços online.
8. Modelo de monetização e requisitos de consentimento/privacidade.
9. Necessidade de conta, sincronização, ranking e validação de códigos.
10. Idiomas de lançamento e necessidades de localização.

### Riscos principais e mitigação

- **Mira inconsistente:** compartilhar o modelo de colisão entre previsão e disparo e criar testes automatizados de trajetórias.
- **Fases injustas ou repetitivas:** testar com jogadores e analisar margem média de disparos, não apenas tempo de conclusão.
- **Baixa legibilidade de cores:** usar símbolos/padrões além da cor e validar em diferentes condições visuais.
- **Escopo excessivo:** validar primeiro o loop central; adiar loja, eventos e backend.
- **Problemas com SDKs e políticas:** integrar publicidade e compras somente após revisão técnica, legal e de plataforma.
- **Perda de progresso:** versionar dados, testar migrações e gravar de forma resiliente.

---

## 14. Glossário

- **Bolha atual:** próxima bolha que será disparada.
- **Próxima bolha:** bolha de reserva exibida ao lado do lançador.
- **Grupo:** conjunto conectado de bolhas da mesma categoria combinável.
- **Queda/avalanche:** remoção de bolhas que perdem conexão com o teto.
- **Ricochete:** reflexão do projétil ao atingir uma parede.
- **Linha de perigo:** limite que determina derrota quando alcançado pelo tabuleiro.
- **Offset:** deslocamento alternado das linhas usado para representar uma grade hexagonal.
- **MVP:** versão mínima capaz de validar a experiência principal.

---

## 15. Resumo executivo

O núcleo do produto é um puzzle de tiro de bolhas com grade hexagonal, mira previsível, combinação por conexão e queda de grupos sem suporte. A primeira versão deve priorizar controles justos, fases legíveis, progressão local e salvamento confiável. Mapa elaborado, missões, loja, monetização, eventos e recursos avançados são extensões possíveis, não pré-requisitos para validar o jogo. A qualidade será medida pela clareza das regras, pela satisfação de cada disparo e pela sensação de desafio justo — e não pelo volume de sistemas ou pela resolução isolada dos recursos visuais.
