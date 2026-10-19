# IRON WRECK — Fontes Open Source e Plano de Evolução v7.1

Pesquisa de 19/10/2026 com foco em qualidade 3D e compatibilidade com Three.js.

## Diagnóstico

A v7 utiliza 10 veículos procedurais em `createKart()`, 3 arenas em `buildWasteland()`, `buildDeadCity()` e `buildHarbor()`, física arcade própria em `moveCar()`/`doCollisions()`, e não possui GLTFLoader nem motor 3D externo. Carrega Three.js 0.160.1 de um CDN. Preservar a física e os danos ao introduzir visuais novos.

## Melhoria real implementada

Base técnica: [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).

- 102 marcas de pista e 160 janelas da Cidade Fantasma;
- 168 nervuras de contêineres no Porto;
- Resultado: 430 objetos decorativos renderizáveis em apenas 3 lotes `InstancedMesh`.
- Testes de lógica, IA, física, colisões, armas e garagem: PASS.
- FPS/WebGL em navegador: não medido; não chamar de aceleração comprovada antes de benchmarking.

## Recursos encontrados (com licenças)

- [Kenney Car Kit](https://kenney.nl/assets/car-kit) — CC0: carros, caminhões, caminhão de lixo, bombeiros, pneus, destroços; primeira opção para modernizar os veículos.
- [Kenney City Kit Roads](https://kenney.nl/assets/city-kit-roads) — CC0: ruas, rampas e sinalização para Cidade Fantasma.
- [Kenney City Kit Industrial](https://kenney.nl/assets/city-kit-industrial) — CC0: edifícios para Porto das Sombras.
- [Quaternius Cars Pack](https://quaternius.com/packs/cars.html) — CC0: modelos 3D que podem ser modificados em Blender.
- [Poly Haven](https://polyhaven.com/license) — CC0: HDRI, texturas PBR de metal, ferrugem, asfalto, concreto e chão.
- [GLTFLoader oficial](https://threejs.org/docs/pages/GLTFLoader.html) — addon Three.js (MIT): integrar GLB com carregamento assíncrono.
- [glTF Transform](https://github.com/donmccurdy/glTF-Transform) — MIT: compressão de modelos, otimização, conversão de texturas e inspeção de GLB.
- [meshoptimizer / gltfpack](https://github.com/zeux/meshoptimizer) — MIT: redução de tamanho/triângulos, Meshopt.
- [Rapier](https://github.com/dimforge/rapier) — Apache 2.0: colisões e corpos rígidos; migrar em protótipos sem reescrever todo o jogo.
- [postprocessing](https://github.com/pmndrs/postprocessing) — Zlib: bloom, choque, AO e gradação de cor (exigir benchmarking).
- [three.quarks](https://github.com/Alchemist0823/three.quarks) — MIT: efeitos de partículas mais realistas.
- [Howler.js](https://github.com/goldfire/howler.js) — MIT: áudio espacial e gestão de múltiplos sons.

## Próximas etapas, por prioridade

1. Escolher um modelo CC0 do Kenney Car Kit (caminhão de lixo ou bombeiros); Blender -> GLB com orientação +Z; renderizar via GLTFLoader opcional mantendo fallback procedural.
2. Otimizar arquivo com `gltf-transform inspect input.glb` e `gltf-transform optimize input.glb output.glb --texture-compress webp`. Validar comparativamente.
3. Criar materiais PBR e HDRI leve; testar 512/1024px em Android e desktop.
4. Migrar faíscas/fumaça para pools e depois adotar three.quarks em uma explosão piloto.
5. Testar Rapier inicialmente apenas na sucata antes de substituir física dos veículos.
6. Medir `renderer.info.render.calls`, `renderer.info.render.triangles`, FPS e memória antes/depois.

**Importante:** não foram incorporados modelos externos ou bibliotecas novas nesta versão. O jogo preserva o motor atual. Não usar assets protegidos de franquias comerciais.
