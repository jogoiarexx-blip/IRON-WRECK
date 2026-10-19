# IRON WRECK v7.0 — CAÇADA TÁTICA

Jogo original de combate entre veículos em **Three.js**, inspirado no gênero de **Twisted Metal** e **Vigilante 8**.

## Jogar online

Endereço do GitHub Pages (requer ativação em Settings → Pages, branch `main`, pasta `/(root)`):

https://jogoiarexx-blip.github.io/IRON-WRECK/

## O que inclui

- Dez veículos diferentes, inclusive ônibus blindado, caminhão de lixo, guincho, caminhão de bombeiros, van e monster truck.
- Três arenas: Deserto de Ferro, Cidade Fantasma e Porto das Sombras.
- Física de impactos, suspensão, danos progressivos e peças destacáveis.
- Metralhadoras, foguetes, ataques especiais e itens.
- **IA tática v7.0**: perseguição, flanqueamento, cobertura, busca de suprimentos, recuo e recuperação de veículos presos.
- Dificuldade de IA: Iniciante, Normal ou Implacável.
- Diagnóstico dos adversários com a tecla `I`.

## Como jogar

Abra `index.html` em um navegador moderno conectado à internet. `ABRIR-JOGO.cmd` abre o navegador no Windows e **não** é um executável nativo. É necessário acesso ao CDN do Three.js.

| Controles | Ação |
|---|---|
| W / S | Acelerar / frear |
| A / D | Virar à esquerda / direita |
| J | Metralhadora |
| F | Foguete |
| Q | Especial do veículo |
| E | Item |
| Shift | Nitro |
| Espaço | Freio de mão |
| P ou Esc | Pausar |
| H | Ocultar ou mostrar HUD |
| K | Capturar imagem |
| I | Mostrar decisões da IA |

A opção de inverter a direção fica na garagem.

## Arquivos

- `index.html` — entrada do jogo, compatível com GitHub Pages.
- `game.js` — lógica, IA, física, armas e renderização.
- `style.css` — HUD, menu e layout.
- `galeria.html` — imagens dos veículos e arenas.
- `previews/` — prévias técnicas baseadas nos modelos do jogo (as imagens da v6 também representam os veículos e arenas da v7, que não modificou a geometria).

## Verificações

No pacote-fonte da v7, os testes automatizados de lógica passaram, incluindo `tests/ai-v7.test.js`. Isso **não** comprova o desempenho gráfico ou a renderização WebGL no navegador. A publicação estática não exige compilação, mas precisa de internet para carregar a biblioteca Three.js.

O projeto é um protótipo original e não usa assets comerciais dos jogos que o inspiraram.


## v7.1 — otimização Three.js

430 detalhes visuais estáticos (102 marcas, 160 janelas, 168 nervuras) foram agrupados em 3 `InstancedMesh`, preservando física, armas e IA. Testes sintéticos passaram; FPS real não foi medido. Veja [pesquisa open source](OPEN_SOURCE_PLANO.md).
