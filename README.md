# IRON WRECK v6.0 — IMPACTO TOTAL

Jogo original de combate veicular 3D em Three.js com 10 veículos diferentes, 3 arenas e melhorias estruturais na física e no combate. Este projeto preserva o combate, controles, danos, 10 veículos e 3 arenas da v5.0.

## Como jogar

1. Extraia o ZIP completo mantendo `previews/` ao lado de `index.html`.
2. Abra `index.html` no Chrome ou Edge com WebGL ativo e conexão para carregar Three.js 0.160.1 (há 3 fontes alternativas). Não é necessário instalar jogos nem pacotes adicionais.
3. Escolha a arena, um dos dez veículos (a garagem tem imagens reais de seus modelos procedurais) e ajuste a qualidade gráfica: **Leve, Equilibrada (padrão), Alta**.
4. Clique **ENTRAR NA ZONA DE GUERRA**.

**Nota:** esta versão NÃO traz `exe` nativo: ela é um jogo HTML/JS que funciona pelo navegador. Seu funcionamento inicial depende da biblioteca Three.js disponibilizada por CDN. É possível abrir `galeria.html` sem iniciar o Three.js.

## Melhorias reais da v6.0

- **Materiais:** pintura automotiva com clearcoat e rugosidade; vidros e peças com acabamento metálico (MeshPhysicalMaterial), iluminação direcional mais equilibrada.
- **Veículos:** grade frontal ripada, faróis funcionais estilizados (material emissivo), suportes, peças de proteção, estribos, faixas industriais, novos detalhes específicos para ônibus, caminhão de lixo, bombeiro, guincho, SUV e monster truck.
- **Rodas:** calotas/hubs detalhados, animação de rolagem ligada à velocidade, pneus furados encolhem visualmente em raio (e já prejudicam velocidade e curva).
- **Cenários:** texturas procedurais de chão, marcas de pista, refletores, painéis e sinalizações em três arenas.
- **Explosões:** onda de choque expandindo, partículas quentes e fumaça sobre os efeitos anteriores; descarte dos objetos temporários após o efeito.
- **Desempenho:** modo Leve desliga sombras e reduz pixel ratio, Equilibrado otimiza resolução e sombra 1024px, Alta habilita maior definição e sombra 2048px.
- **Interface:** garagem agora mostra miniaturas reais de cada carro modelado no projeto; galeria individual, de grupo e das três arenas.

## Comandos

| Tecla | Ação |
|---|---|
| W / S ou ↑ / ↓ | Acelerar / frear e dar ré |
| A / D ou ← / → | Virar à esquerda / direita, vista de trás do carro |
| J / clique esquerdo | Metralhadora |
| F | Foguete |
| Q | Arma especial |
| E | Item |
| Shift | Nitro |
| Espaço | Freio de mão |
| C | Olhar para trás |
| P / Esc | Pausar |
| H | Esconder HUD |
| K | Capturar foto PNG da cena atual |

A garagem mantém a opção **Inverter direção** como preferência pessoal.

## Imagens

- `previews/carros-v6.png`: prancha com os 10 carros.
- `previews/cenarios-v6.png`: prancha com as 3 arenas.
- `previews/carro-01-marauder.png` etc.: imagens individuais dos 10 modelos.
- `previews/cenario-wasteland.png`, `cenario-city.png`, `cenario-harbor.png`: arenas isoladas.

**Transparência:** as imagens foram renderizadas em VTK por software usando geometrias efetivamente exportadas das funções `createKart()` e `buildBattlefields()`. Não são capturas de gameplay WebGL. O render de prévia não recria texturas, emissivos, pós-processamento e materiais especiais do navegador.

## Testes

- `tests/smoke-test.js`: testes de simulação de todas as combinações 10×3, controle, armas, IA, vitórias, derrotas e dano.
- `tests/visual-smoke.js`: testes dos novos detalhes, superfícies, qualidade e ondas de choque.
- `tests/physics-v6.test.js`: testes de colisão por impulso, amortecimento, derrapagem e deformação localizada em 30 combinações.
- `tests/export_geometry.js`: exporta as geometrias procedurais para conferência.
- `tests/render_previews.py`: reproduz as prévias offline com VTK, Pillow e SciPy (ferramenta do desenvolvedor; **não é necessária para jogar**).
- `test-results.txt`: relatório detalhado da rodada atual.

**Limite de validação:** o sandbox não tem a distribuição oficial do Three.js e não tem acesso de rede a CDN; portanto a renderização WebGL do jogo em navegador real não pôde ser certificada neste ambiente. Simulações e exportação de geometrias foram verificadas. A biblioteca Three.js é software de terceiros sob licença MIT.


## v6.0 — IMPACTO TOTAL

- Física arcade revisada: transferência de momento nas colisões, impulso lateral e separação por massa.
- Suspensão amortecida independente por eixo, com balanço da carroceria e contato visual das rodas.
- Latarias recebem amassados localizados conforme a direção do golpe; persistem até a destruição.
- Explosões possuem núcleo luminoso de duração limitada, com descarte das geometrias.
- Três arenas, dez carros e comandos preservados.
- Prévia dos modelos e cenários feita a partir das geometrias do jogo, **não captura WebGL**.
- A biblioteca Three.js é carregada pela internet; o arquivo index.html não é independente da rede.
