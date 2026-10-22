## Estado de validação v7.7
- GLB original otimizado presente em `assets/frost-van.glb` (1.472.380 bytes), com textura embutida e geometria verificadas.
- Miniatura gerada a partir do GLB real do jogo.
- Testes de simulação (`smoke-test.js`, `ai-v7.test.js`, `physics-v6.test.js`, `glb-fleet-v7.3.test.js`) passaram.
- Teste de navegação WebGL: o Chromium do ambiente bloqueou a abertura de `127.0.0.1` com `ERR_BLOCKED_BY_ADMINISTRATOR`; portanto, o jogo 3D não foi confirmado visualmente no navegador.
- Na garagem, selecione FROST VAN: `✅ CLOWN CREAM CARNAGE — GLB carregado!` deve aparecer; caso contrário a interface exibe uma falha específica e botão de recarga.

# IRON WRECK v7.7 — GLB do carro de sorvete corrigido

Esta revisão corrige o card da garagem para exibir o **modelo real Clown Cream Carnage**, adiciona status de carregamento do GLB, botão para nova tentativa, prioridade para o veículo selecionado e fallback visível. Arquivo `assets/frost-van.glb` preservado; reconhecido no repositório com 1.472.380 bytes.

**Diagnóstico:** a v7.6 ainda exibia `previews/modelo-frost-van-v7.3.png`, portanto a seleção mostrava a van antiga independentemente do GLB disponível. Além disso, erros do GLTFLoader não eram mostrados ao usuário e o modelo denso consumia recursos em deformações.

**Teste:** todos os GLBs podem ser verificados na pasta `assets`, o jogo carrega os GLBs via HTTP(S); em `file://` é esperado fallback. Testes headless rodam `node tests/smoke-test.js` etc. WebGL interativo requer execução em navegador compatível.

---
# IRON WRECK v7.6 — Site publicado

# IRON WRECK v7.4 — GARAGEM COMPLETA

Jogo original de combate veicular em Three.js, inspirado no gênero Twisted Metal/Vigilante 8, sem usar ativos comerciais das franquias.

## Novidades verificadas

- 10 carrocerias 3D originais em GLB + 1 moto procedural: Marauder, Phantom, Titan, Omega Bus, Grinder, Frost Van, Hookjaw, Inferno, Sentinel e Goliath.
- 8 novos GLBs gerados nesta versão; Omega Bus e Grinder preservados da v7.2.
- 40–140 peças geométricas por carroceria, agrupadas em 9–14 malhas por material.
- Deformação local dos vértices em quatro regiões (frente, traseira, esquerda, direita) para cada veículo **sem afetar os adversários**.
- Reparos devolvem a geometria a partir dos vértices originais.
- Mantidas rodas, física, suspensão, armas, IA tática, colisões, as três arenas e fallback procedural.
- Galeria v7.4 inclui imagens renderizadas das geometrias GLB originais do projeto.
- Galeria acessível em `galeria.html`, e miniaturas dos novos GLBs na seleção.

## Como jogar

No Windows, com Python 3 instalado, execute `ABRIR-JOGO.cmd`. Esse inicializador cria um servidor HTTP local em `http://127.0.0.1:8765/index.html` para carregar os arquivos GLB corretamente.

Sem Python, `index.html` pode abrir diretamente, porém o navegador em `file://` usa o fallback procedural e não carrega os GLBs locais. É preciso internet para carregar Three.js do CDN. O jogo é HTML/Three.js, não um EXE nativo.

### Controles

| Tecla | Ação |
|---|---|
| W/S | Acelerar / frear |
| A/D | Virar à esquerda / direita |
| J | Metralhadora |
| F | Foguete |
| Q | Especial |
| E | Item |
| Shift | Nitro |
| Espaço | Freio de mão |
| I | Mostrar IA |
| P | Pausar |
| K | Screenshot |

## Testes de regressão

```bash
node --check game.js
node tests/smoke-test.js
node tests/ai-v7.test.js
node tests/physics-v6.test.js
node tests/model-integration-v7.2.js
node tests/glb-fleet-v7.4.test.js
node tests/visual-smoke.js
python tests/assets-v7.4.py
```

**Status:** sintaxe, testes de lógica, integração dos GLBs, dimensões/malhas, simulações e deformações passaram. **WebGL real, FPS e dispositivo Windows não verificados** neste ambiente: validar abrindo o jogo em Chrome/Edge com Python HTTP e a internet conectada.

## Arquivos

- `game.js` — jogabilidade, física, IA, renderizador, carregamento assíncrono e deformação GLB.
- `assets/*.glb` — dez arquivos 3D locais; `assets/manifest.json` com dimensões/tamanhos.
- `scripts/build_vehicles.py` — gera os dois GLBs da v7.2.
- `scripts/build_fleet_v73.py` — gera os oito GLBs adicionais da v7.4.
- `scripts/render_fleet_v73.py` — renderiza modelos do projeto para a galeria (prévia técnica sem WebGL).
- `tests/` — testes reproduzíveis de regressão.

As três arenas não foram modificadas nesta revisão. Nenhum asset externo ou proprietário foi incorporado nesta edição. Os modelos GLB são originais e editáveis pelo pipeline Python/Trimesh.

## Publicação

A v7.4 está neste ZIP. Ainda não foi sincronizada automaticamente com o repositório do GitHub, porque os novos GLBs binários precisam ser enviados com o restante dos arquivos. **Não confundir a versão do ZIP com a versão publicada do site.**

# IRON WRECK v7.0 — CAÇADA TÁTICA

Combate veicular arcade em Three.js inspirado no gênero de Twisted Metal / Vigilante 8. Projeto original, modelos procedurais próprios. Derivado da base **v6.0**: mantém 11 veículos selecionáveis, 3 arenas, danos por peças, suspensão, colisões por impulso, câmera e comandos corrigidos.

## Iniciar o jogo

No Windows, extraia o ZIP completo e dê dois cliques em `ABRIR-JOGO.cmd`. Alternativamente, abra `index.html` com Chrome, Firefox ou Edge atualizado. Para iniciar o WebGL, **precisa de conexão com a internet**: o jogo importa Three.js 0.160.1 por CDN, com URLs alternativas. `ABRIR-JOGO.cmd` NÃO é um `.exe` nativo, apenas abre o HTML no navegador, e não instala nada.

`galeria.html` pode ser aberto offline para ver as prévias. Use `ABRIR-GALERIA.cmd` para a galeria no Windows.

## IA v7

- **Quatro perfis:** perseguidor, flanqueador, atacante pesado e coletor de recursos. Sete oponentes reagem a alvo, vida, distância e munição.
- **Estados:** caçada, flanqueamento, emboscada na cobertura, recuo, procura de suprimentos e recuperação quando preso.
- **Navegação:** avalia direções alternativas diante de cobertura sólida, caixas, rivais e limites da arena; não depende de serviço ou biblioteca de IA online.
- **Ameaça:** busca alvos com base em distância, saúde, visibilidade e represália ao último atacante; preferência pelo alvo anterior reduz mudanças constantes.
- **Armas e cobertura:** metralhadoras deixam de atravessar estruturas; foguetes colidem com obstáculos e podem quebrar caixas.
- **Níveis de dificuldade:** INICIANTE, NORMAL e IMPLACÁVEL (frequência de decisões, mira, cadência de ataques e probabilidade de foguetes).
- **Diagnóstico:** pressione `I` na partida para consultar as decisões atuais dos rivais (ajuda a ajustar a IA em versões futuras).

## Controles

| Tecla | Ação |
|---|---|
| W/S ou ↑/↓ | Acelerar, frear e dar ré |
| A/D ou ←/→ | Esquerda e direita na perspectiva da câmera |
| J ou clique esquerdo | Metralhadora |
| F | Foguete |
| Q | Especial único de cada veículo |
| E | Usar item |
| Shift | Nitro |
| Espaço | Freio de mão |
| C | Olhar para trás |
| P ou Esc | Pausar |
| I | Exibir/ocultar o plano da IA |
| H | Exibir/ocultar HUD |
| K | Salvar screenshot PNG durante a partida |

A opção "Inverter direção" da garagem continua disponível. Controles por toque também foram preservados.

## Galeria de modelos e arenas

`previews/carros-v7.png` e `previews/cenarios-v7.png` apresentam os **mesmos 10 modelos e 3 cenários preservados da v6**. As miniaturas individuais continuam no mesmo diretório. São renderizações técnicas externas ao WebGL, construídas com geometrias exportadas do próprio projeto; **não são capturas reais de gameplay**, nem representam um upgrade gráfico nesta versão. O foco v7 é IA.

## Estrutura / testes

- `index.html`, `style.css`, `game.js`: jogo completo em HTML/JS.
- `tests/smoke-test.js`: movimentação, dezenas de combinações, armas e finais.
- `tests/physics-v6.test.js`: regressão de suspensão, batida, deformação, 3.000 frames simulados.
- `tests/visual-smoke.js`: geometria procedural, qualidade, galeria e efeitos.
- `tests/ai-v7.test.js`: estratégias, antitravamento, desvio, linha de visão, tiros bloqueados e três dificuldades.
- `test-results.txt`: execução final de teste e limitações conhecidas.

Para rodar o teste no desenvolvimento: `node tests/ai-v7.test.js` (requer Node.js). O jogo não requer Node.js para funcionar.

## Validação e limites

Os testes Node headless passaram. Eles simulam objetos Three.js e não certificam a renderização real WebGL nem os FPS. Neste ambiente, o Chromium de teste bloqueou a navegação local e o download da biblioteca Three.js; portanto a apresentação gráfica precisa ser testada em um navegador real com rede. Ainda não existe versão `.exe` nativa/offline; o pacote Windows oferece iniciador de navegador `.cmd`.

Todo o código original e os arquivos gerados estão incluídos na versão **FONTE**. As fontes de Three.js são disponibilizadas pelos CDNs, sob licença MIT.

## Atualização incremental v7.1 — desempenho 3D

O jogo agora utiliza `InstancedMesh` nas marcas viárias, janelas e nervuras de contêineres. Isso permite representar 430 detalhes de cenário em 3 grupos de desenho, sem modificar IA, colisões ou veículos. Os testes sintéticos passaram; ganho real em FPS e renderização WebGL precisam de validação no navegador. Veja [pesquisa de open source e plano técnico](OPEN_SOURCE_PLANO.md).

## Novidade v7.2 — FROTA BLINDADA

Dois novos modelos **GLB originais incluídos** em `assets/`: `omega-bus.glb` (ônibus, 140 elementos desenhados, 13 lotes de render) e `grinder.glb` (caminhão de lixo, 77 elementos, 14 lotes). Não são modelos extraídos de outras franquias nem do Kenney. Os modelos foram criados para este jogo usando Python e trimesh, e suas fontes estão em `scripts/build_vehicles.py`.

O `GLTFLoader` (Three.js, MIT) carrega os GLBs de forma assíncrona no navegador por HTTP/HTTPS. Quando carregam, substituem a carroceria procedural sem substituir as rodas, torres, colisões, armamento, danos ou suspensão. Quando falham, os modelos antigos continuam funcionando. Atualizamos a cor do GLB progressivamente conforme os danos. Usamos um único template de geometria para cada veículo, clonando materiais por carro.

**Executando no Windows:** use `ABRIR-JOGO.cmd` com Python 3 instalado (apenas biblioteca padrão; ele inicia um servidor HTTP local e abre o navegador). No GitHub Pages, o jogo pode carregar os modelos diretamente. Abrir `index.html` pelo esquema `file://` continua possível, mas os dois GLBs são substituídos pelas carrocerias procedurais como fallback.

**Testes:** `python tests/assets-v7.2.py`, `node tests/smoke-test.js`, `node tests/physics-v6.test.js`, `node tests/ai-v7.test.js`, `node tests/visual-smoke.js`. A renderização WebGL real no Windows e Android permanece pendente de validação.

**Fontes de terceiros consultadas (não incorporadas nesta versão):** Kenney Car Kit (CC0) <https://kenney.nl/assets/car-kit> e Quaternius Public Transport Pack (CC0) <https://quaternius.com/packs/publictransport.html>. O ambiente bloqueou o download direto do asset. Não atribuímos a eles a autoria dos novos GLBs.


## v7.5 — Clown Cream Carnage no jogo

- O slot **FROST VAN** agora usa o GLB enviado pelo usuário (`Meshy_AI_Clown_Cream_Carnage_...`).
- O modelo foi integrado ao jogo com ajuste de rotação/escala para o chassi da van.
- Foram adicionados efeitos visuais próprios: luzes pulsantes no teto, topper giratório, fumaça gelada/doce em movimento e explosão extra ao usar o especial de gelo.
- O fallback procedural e o backup do modelo antigo foram preservados em `assets/frost-van-v73-backup.glb`.


## v7.6 — Clown Cream Carnage aprimorado

- **Efeitos visuais melhores**: letreiro giratório, espiral luminosa, fitas animadas, confete doce, pingos de creme e pulsação mais agressiva das luzes.
- **Ataque exclusivo**: **Carnaval de Casquinhas**. O veículo dispara uma salva de 5 projéteis doces em leque; ao acertar, eles causam dano em área, reduzem a velocidade dos rivais e espalham confete/fumaça colorida.
- O restante da garagem, física, danos e IA foi preservado.


## Publicação GitHub Pages — 22/10/2026

Este repositório contém o jogo v7.6, o Clown Cream Carnage e 11 veículos. O GLB do carro de sorvete foi **otimizado para a web** (45 mil faces aproximadamente em vez de 450 mil, texturas 512px, e 1,47 MB) para melhorar o carregamento no site. O arquivo original de 23 MB permanece no ZIP de distribuição do projeto. Os GLBs são opcionais para inicialização: se algum não carregar, o jogo recorre aos modelos procedurais.

Os novos efeitos animados (luzes, ornamentos, confetes e projéteis especiais) são realizados via código Three.js, não são animações esqueléticas incorporadas ao arquivo GLB original.


## v7.8 — Somente GLB, sem mistura de modelos

O Clown Cream Carnage agora oculta toda a geometria procedural da Frost Van quando o GLB carrega: carroceria, rodas, torres de armas e peças de dano. Os antigos componentes ficam agrupados em um único pai invisível para manter referências físicas e permitir fallback quando o GLB não carregar. Não há mais cone, enfeites ou ornamentos 3D extras sobre o GLB; permanecem apenas partículas temporárias (fumaça/confete) e o ataque Carnaval de Casquinhas. Os outros 10 veículos não foram alterados visualmente.
