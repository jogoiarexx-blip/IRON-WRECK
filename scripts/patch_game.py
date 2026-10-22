from pathlib import Path
p=Path(__file__).resolve().parents[1]/'game.js'
s=p.read_text()
def swap(old,new,once=True):
 global s
 if old not in s:raise Exception('missing:'+old[:120])
 if once and s.count(old)!=1:raise Exception('non unique:'+old[:100])
 s=s.replace(old,new,1 if once else -1)
swap('let THREE;','''let THREE;
// v7.2: modelos originais GLB para dois veículos. A lógica de direção,
// física, suspensão, colisões e armas permanece na implementação existente.
const VEHICLE_GLB={3:'assets/omega-bus.glb',4:'assets/grinder.glb'};
const loadedVehicleTemplates=new Map(), assetPending=new Map();
const assetSharedGeometries=new Set(), assetSharedMaterials=new Set();
let gltfAssetLoader=null;
''')
swap('function createKart(color,name,isPlayer=false,vehicleIndex=0){', '''// Carregamento opcional e não bloqueante. Arquivos glb locais precisam de HTTP(S).
// Caso a rede/loader falhe, o jogo continua usando as carrocerias procedurais.
async function startVehicleAssets(){
  if(typeof location!=='undefined'&&location.protocol==='file:'){
    console.info('Carrocerias GLB exigem HTTP: fallback procedural em file://');return;
  }
  try{
    const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
    gltfAssetLoader=new GLTFLoader();
    await Promise.allSettled(Object.keys(VEHICLE_GLB).map(index=>loadVehicleTemplate(Number(index))));
  }catch(error){console.warn('GLTFLoader indisponível, mantendo carrocerias procedurais',error);}
}
function loadVehicleTemplate(index){
  if(loadedVehicleTemplates.has(index))return Promise.resolve(loadedVehicleTemplates.get(index));
  if(assetPending.has(index))return assetPending.get(index);
  if(!gltfAssetLoader||!VEHICLE_GLB[index])return Promise.resolve(null);
  const job=gltfAssetLoader.loadAsync(VEHICLE_GLB[index]).then(gltf=>{
    const template=gltf.scene;
    template.traverse(node=>{
      if(node.isMesh){assetSharedGeometries.add(node.geometry);
        if(Array.isArray(node.material))for(const m of node.material)assetSharedMaterials.add(m);
        else assetSharedMaterials.add(node.material);
      }
    });
    loadedVehicleTemplates.set(index,template);
    for(const car of cars)if(car.vehicleIndex===index)attachVehicleAsset(car);
    return template;
  }).catch(error=>{console.warn('GLB não carregado:',VEHICLE_GLB[index],error);return null;
  }).finally(()=>assetPending.delete(index));
  assetPending.set(index,job);return job;
}
function attachVehicleAsset(car){
  const template=loadedVehicleTemplates.get(car.vehicleIndex);
  if(!template||!cars.includes(car)||car.assetSkin)return false;
  const skin=template.clone(true),materials=[];
  // Cópias de materiais permitem avarias visuais por veículo sem contaminar
  // as carrocerias de outros oponentes que compartilham a mesma geometria.
  skin.traverse(node=>{if(node.isMesh){
    node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();
    const mm=Array.isArray(node.material)?node.material:[node.material];
    for(const m of mm){if(m.color){m.userData.basePaint=m.color.clone();materials.push(m);}}
    node.castShadow=true;node.receiveShadow=true;
  }});
  car.body.add(skin);car.assetSkin=skin;car.assetMaterials=materials;
  car.visualShell.visible=false; // rodas, torre e danos continuam independentes.
  applyAssetDamageTint(car);
  return true;
}
function applyAssetDamageTint(car){
  if(!car.assetMaterials)return;
  const intensity=car.hp<20?.47:car.hp<40?.61:car.hp<65?.77:car.hp<83?.90:1;
  for(const m of car.assetMaterials){m.color.copy(m.userData.basePaint).multiplyScalar(intensity);}
}
function createKart(color,name,isPlayer=false,vehicleIndex=0){''')
start=s.index('function createKart(')
end=s.index('  // Conjuntos de rodas em seus próprios suportes de suspensão.',start)
slice0=s[start:end]
slice0=slice0.replace('const body=new THREE.Group();g.add(body);','const body=new THREE.Group();g.add(body);\n  const visualShell=new THREE.Group();body.add(visualShell);')
slice0=slice0.replace(',body)',',visualShell)').replace('addVehicleDetails(body,','addVehicleDetails(visualShell,')
s=s[:start]+slice0+s[end:]
swap('const car={id:cars.length,name,color,group:g,body,turret,wheels,sprite,paint,damageRig,wheelMounts,sideVelocity:',
     'const car={id:cars.length,name,color,group:g,body,visualShell,assetSkin:null,assetMaterials:null,turret,wheels,sprite,paint,damageRig,wheelMounts,sideVelocity:')
swap('cars.push(car);return car;', 'cars.push(car);attachVehicleAsset(car);return car;')
swap('const shared=new Set(Object.values(M)), seenGeo=new Set(),seenMat=new Set();', 'const shared=new Set(Object.values(M)), seenGeo=new Set(),seenMat=new Set();')
swap('if(obj.geometry&&obj.geometry!==particleGeo&&!seenGeo.has(obj.geometry))',
     'if(obj.geometry&&obj.geometry!==particleGeo&&!assetSharedGeometries.has(obj.geometry)&&!seenGeo.has(obj.geometry))')
swap('if(!material||shared.has(material)||seenMat.has(material))continue;',
     'if(!material||shared.has(material)||assetSharedMaterials.has(material)||seenMat.has(material))continue;')
# preserve ability to recolor the skin when shot (without changing the skin on other rivals)
swap('function syncDamageVisuals(car){\n  if(!car?.damageRig)return;',
     'function syncDamageVisuals(car){\n  if(!car?.damageRig)return;\n  applyAssetDamageTint(car);')
swap("    setup3D();$('loading').classList.add('hidden');clock.start();loop();",
     "    setup3D();$('loading').classList.add('hidden');clock.start();loop();\n    void startVehicleAssets();")
p.write_text(s)

html=Path(__file__).resolve().parents[1]/'index.html'
h=html.read_text()
h=h.replace('<title>IRON WRECK v7 — CAÇADA TÁTICA</title>', '<title>IRON WRECK v7.2 — FROTA BLINDADA</title>')
h=h.replace('<script src="game.js"></script>', '''<script type="importmap">
{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/"}}
</script>
<script src="game.js"></script>''')
h=h.replace('· v7.0 · CAÇADA TÁTICA','· v7.2 · FROTA BLINDADA')
h=h.replace('dez veículos, dano progressivo', 'dez veículos, dois novos modelos GLB, dano progressivo')
html.write_text(h)
