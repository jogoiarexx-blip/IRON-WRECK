# IRON WRECK — Pesquisa open source e plano de evolução (19/10/2026)

## Diagnóstico do código v7.0 (repositório jogoiarexx-blip/IRON-WRECK)

- Os **10 veículos** são gerados proceduralmente por `createKart()`, com primitivas `BoxGeometry`, `CylinderGeometry` etc.; o jogo **não carrega GLB/GLTF**. Isso facilita alteração de danos, mas limita o acabamento visual.
- Os **3 cenários** são construídos com muitos objetos separados em `buildWasteland()`, `buildDeadCity()` e `buildHarbor()`.
- A física é arcade personalizada (`moveCar()`, `doCollisions()`), **não** usa um motor de corpos rígidos 3D.
- Texturas procedurais `CanvasTexture`, materiais físicos e controle de qualidade já existem. Efeitos de partículas ainda criam meshes e materiais individuais.
- O jogo importa `three@0.160.1` de CDNs e precisa de internet; não foi convertido para um pipeline local de build.

## Melhoria feita em v7.1: InstancedMesh

Base: https://threejs.org/docs/pages/InstancedMesh.html (biblioteca Three.js, licença MIT).

- Adicionado `batchStaticBoxes()` e aplicado a **102 marcas viárias**, **160 janelas** na Cidade Fantasma e **168 nervuras de contêiner** no Porto das Sombras.
- São **430 objetos decorativos representados por 3 malhas instanciadas**, preservando geometria, materiais, posição, cor, colisões e elementos destrutíveis separadamente.
- Ganho teórico: evita centenas de submissões de desenho dos elementos repetidos. O ganho real depende de visibilidade, material e GPU; **não há número de FPS medido**.
- Testes automatizados de lógica e regressão passaram; a **renderização WebGL real continua pendente**.

## Fontes verificadas e como usar no jogo

| Projeto | Licença | Aplicação no IRON WRECK | Integração |
|---|---|---|---|
| **Kenney Car Kit** — https://kenney.nl/assets/car-kit | CC0 | Bases de carros, pneus, acessórios e peças | Selecionar modelos, converter GLB e adaptar rig/danos; não substituir automaticamente veículos exclusivos |
| **Kenney City Kit Roads** — https://kenney.nl/assets/city-kit-roads | CC0 | Ruas, calçadas, semáforos e placas para Cidade Fantasma | Assets separados por setores e distâncias |
| **Quaternius Cars Pack** — https://quaternius.com/packs/cars.html | CC0 | Modelos de referência para customizar veículos | Blender -> GLB; verificar escala e orientação +Z |
| **Poly Haven** — https://polyhaven.com/license | CC0 | Texturas PBR de asfalto/metal/ferrugem e HDRI para reflexos | Texturas reduzidas 512–1024px, mipmaps e HDRI pequeno |
| **glTF Transform** — https://github.com/donmccurdy/glTF-Transform | MIT | Otimizar e comprimir modelos 3D convertidos | Ferramenta de build, não precisa rodar no navegador |
| **meshoptimizer / gltfpack** — https://github.com/zeux/meshoptimizer | MIT | Otimizar triangulação e quantidade de draw calls dos GLBs | Validar suporte da extensão no GLTFLoader |
| **Three.js GLTFLoader** — https://threejs.org/docs/pages/GLTFLoader.html | MIT (Three.js) | Carregar veículos e objetos 3D reais | Adicionar sem quebrar fallback procedural; decodificadores Meshopt/KTX2 se usados |
| **Rapier** — https://github.com/dimforge/rapier | Apache-2.0 | Corpos rígidos, colisão, salto, capotamento, rodas | Migração por fases; não trocar o sistema de física de uma vez |
| **postprocessing** — https://github.com/pmndrs/postprocessing | Zlib | Bloom em faróis/explosões, sombras de contato, cor cinematográfica | Só nas qualidades média/alta após benchmark |
| **three.quarks** — https://github.com/Alchemist0823/three.quarks | MIT | Efeitos de fumaça, fogo, detritos e faíscas mais ricos | Fazer prova de conceito com pooling e limites por qualidade |
| **Howler.js** — https://github.com/goldfire/howler.js | MIT | Motor, tiros, colisões e explosões com espacialização | Troca gradual do áudio sintetizado; sons requerem licença própria |

### Orientação de integração

1. **Próximo: GLB sem alterar a física:** carregar visual alternativo em um único veículo; manter corpo rígido, eixo +Z, escala e colisores existentes; preservar a versão procedural se o download falhar.
2. **PBR e luz:** uma textura de metal/envelhecimento e HDRI leve na garagem; garantir que os materiais tenham roughness/metalness adequados e limitar resolução mobile.
3. **Partículas:** agrupar em pool; substituir **um** efeito (explosão) por versão mais sofisticada medindo render calls, GPU e FPS.
4. **Rapier experimental:** primeiro objetos que caem e se chocam com o chão; depois suspensão, pneus e carros, sem substituir o runtime de colisões enquanto não houver paridade nos testes.
5. **Som:** integrar biblioteca e 4 amostras licenciadas, com Web Audio liberado após clique/touch do jogador.
6. **Diagnóstico:** registrar `renderer.info.render.calls`, `renderer.info.render.triangles`, FPS e memória antes/depois em desktop e Android para não trocar desempenho por efeitos cosméticos.

### Pipeline recomendado para um asset GLB

1. Importar FBX/OBJ/Blend para Blender; ajustar dimensões reais, eixo do veículo, rodas e pivô das peças.
2. Exportar `.glb` com nomes estáveis (`body`, `wheel_FL`, `wheel_FR`, `door_left`, etc.).
3. Instalar localmente `@gltf-transform/cli` (não foi instalado como parte desta entrega):

```bash
npm install --global @gltf-transform/cli
gltf-transform inspect input.glb
gltf-transform optimize input.glb output.glb --texture-compress webp
```

4. Testar em Chrome Android e desktop. Se habilitar Meshopt/KTX2/Draco, configure o decoder correspondente no `GLTFLoader`; caso contrário os modelos podem não carregar.
5. Publicar GLBs e texturas localmente em `assets/` no GitHub Pages; não depender de CDNs de terceiros para a arte do jogo.

**Licenciamento:** o código de bibliotecas e os modelos têm licenças diferentes. Conferir licença de **cada** pack e som antes de distribuir; CC0 dispensa atribuição, mas agradecimentos são recomendáveis. Não incluir assets de Twisted Metal/Vigilante 8 protegidos por copyright.

## Validação v7.1

- `node --check game.js`
- `node tests/smoke-test.js`: PASS — incluindo verificação de instâncias, controles, sobrevivência e 30 combinações.
- `node tests/ai-v7.test.js`: PASS.
- `node tests/physics-v6.test.js`: PASS, incluindo 3.000 quadros simulados.
- `node tests/visual-smoke.js`: PASS (testes sintéticos sem GPU real).
- FPS no navegador: **não validado** nesta sessão; testar antes de classificar a melhoria como desempenho comprovado.
