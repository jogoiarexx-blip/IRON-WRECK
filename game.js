let THREE;
// v7.2: modelos originais GLB para dois veículos. A lógica de direção,
// física, suspensão, colisões e armas permanece na implementação existente.
const VEHICLE_GLB={
  0:'assets/marauder.glb',1:'assets/phantom.glb',2:'assets/titan.glb',
  3:'assets/omega-bus.glb',4:'assets/grinder.glb',5:'assets/frost-van.glb?v=7.7',
  6:'assets/hookjaw.glb',7:'assets/inferno.glb',8:'assets/sentinel.glb',9:'assets/goliath.glb'
}; // índice 10 (moto) usa carroceria procedural por enquanto.

const loadedVehicleTemplates=new Map(), assetPending=new Map();
const assetSharedGeometries=new Set(), assetSharedMaterials=new Set(), assetSharedTextures=new Set();
let gltfAssetLoader=null;
const vehicleAssetState=new Map();
let loaderError='';
function updateGarageAssetBadge(index=garageChoice){
  const notice=typeof document!=='undefined'?document.getElementById('garageAssetStatus'):null;
  if(!notice)return;
  if(index===10){notice.textContent='🏍️ REAPER BIKE — modelo procedural';notice.dataset.state='ready';return;}
  const status=vehicleAssetState.get(index),isClown=index===5;
  const label=isClown?'CLOWN CREAM CARNAGE':'MODELO 3D';
  notice.dataset.state=status?.status||'loading';
  if(status?.status==='ready')notice.textContent=`✅ ${label} — GLB carregado!`;
  else if(status?.status==='error')notice.textContent=`⚠️ ${label} indisponível: ${status.message||loaderError||'falha de carregamento'}. Usando modelo alternativo.`;
  else notice.textContent=`⏳ Carregando ${label} em GLB…`;
}



// IRON WRECK v7.0 — combate tático com IA, navegação local, cobertura e recuperação de travamentos.
const $ = id => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a,b,t) => a+(b-a)*t;
const rand = (min,max) => min+Math.random()*(max-min);
const choose = a => a[Math.floor(Math.random()*a.length)];
const angleWrap = a => Math.atan2(Math.sin(a),Math.cos(a));
const vec2Dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const COLORS = [0xeabd39,0xc44f43,0x26b4bc,0xa66bc5,0x81a848,0xd87432,0x607cd9,0xce628a];
const NAMES = ['VOCÊ','ESPECTRO','BRUTUS','VÍBORA','CARRASCO','FERRUGEM','ABUTRE','FÚRIA'];
const GARAGE = [
 {name:'MARAUDER',className:'MUSCLE BLINDADO',icon:'🏎️',speed:1.02,armor:1,damage:1.12,mass:1,turn:1.03,accel:1.07,width:4.15,length:7.65,wheel:1.2,color:0xeabd39,special:'ARÍETE ELÉTRICO',specialType:'ram'},
 {name:'PHANTOM',className:'INTERCEPTADOR',icon:'🚘',speed:1.22,armor:.82,damage:1.05,mass:.85,turn:1.18,accel:1.18,width:3.9,length:7.8,wheel:1.12,color:0x36c8d5,special:'SALVA TRIPLA',specialType:'rockets'},
 {name:'TITAN',className:'CAMINHÃO DE GUERRA',icon:'🚛',speed:.82,armor:1.38,damage:.95,mass:1.75,turn:.78,accel:.78,width:4.9,length:8.7,wheel:1.34,color:0xcf664b,special:'PULSO DE FERRO',specialType:'pulse'},
 {name:'OMEGA BUS',className:'ÔNIBUS BLINDADO',icon:'🚌',speed:.68,armor:1.62,damage:1.04,mass:2.4,turn:.62,accel:.60,width:5.05,length:15.0,wheel:1.40,color:0xe6a93b,special:'BUZINA SÍSMICA',specialType:'horn'},
 {name:'GRINDER',className:'CAMINHÃO DE LIXO',icon:'🚛',speed:.73,armor:1.78,damage:1.1,mass:2.6,turn:.65,accel:.65,width:5.1,length:11.6,wheel:1.43,color:0x568b54,special:'COMPACTADOR',specialType:'crusher'},
 {name:'FROST VAN',className:'CLOWN CREAM CARNAGE',icon:'🍦',speed:1.06,armor:.83,damage:1,mass:1,turn:1.08,accel:1.10,width:4.35,length:8.6,wheel:1.19,color:0xf5a3c0,special:'CARNAVAL DE CASQUINHAS',specialType:'frost'},
 {name:'HOOKJAW',className:'GUINCHO BRUTAL',icon:'🪝',speed:.88,armor:1.24,damage:1.04,mass:1.64,turn:.90,accel:.86,width:4.8,length:10.4,wheel:1.30,color:0xd67c39,special:'GANCHO MAGNÉTICO',specialType:'hook'},
 {name:'INFERNO',className:'CAMINHÃO DE BOMBEIROS',icon:'🚒',speed:.78,armor:1.48,damage:1.05,mass:2.12,turn:.72,accel:.73,width:5.0,length:12.5,wheel:1.36,color:0xda3834,special:'JATO DE PRESSÃO',specialType:'water'},
 {name:'SENTINEL',className:'SUV DE PATRULHA',icon:'🚓',speed:1.14,armor:1.07,damage:1.0,mass:1.18,turn:1.09,accel:1.07,width:4.4,length:8.15,wheel:1.2,color:0x5177b7,special:'SIRENE EMP',specialType:'siren'},
 {name:'GOLIATH',className:'MONSTER TRUCK',icon:'🛻',speed:.95,armor:1.35,damage:1.18,mass:1.9,turn:.88,accel:.98,width:5.55,length:9.35,wheel:1.93,color:0x8e71d3,special:'SALTO ESMAGADOR',specialType:'stomp'},
 {name:'REAPER BIKE',className:'MOTO DE ASSALTO',icon:'🏍️',speed:1.36,armor:.56,damage:.92,mass:.46,turn:1.42,accel:1.34,width:2.15,length:6.95,wheel:1.02,color:0x53f0a8,special:'CORRENTE ELÉTRICA',specialType:'hook'}
];
// Raio físico escalado com o comprimento e largura: ônibus e caminhões são alvos maiores.
const bodyRadius = vehicle => Math.max(vehicle.width*.54,vehicle.length*.34)+.05;
const aimTo = (from,to) => Math.abs(angleWrap(Math.atan2(to.x-from.x,to.z-from.z)-from.yaw));
const PICKUP_TYPES = ['shield','emp','repair','boost','mine'];
const ITEMS = {shield:['🛡️','ESCUDO'],emp:['⚡','CHOQUE'],repair:['💚','REPARO'],boost:['🔥','SUPER NITRO'],mine:['💣','MINA']};
const ARENA_RADIUS = 90;
let renderer, scene, camera, sun, pickups=[], crates=[], debris=[], missiles=[], mines=[], tracers=[], scrapParts=[], blastRings=[], impactFlashes=[], obstacles=[], battlefields={};
let garageChoice=0;
let cars=[], player=null, elapsed=0, mode='wasteland', gameState='menu', frameTime=0, toastUntil=0, comboUntil=0, visualClock=0, followLook, shake=0, lastUi=0, lastMap=0;
const held = new Set();
const input = {acc:0, brake:0, steer:0, drift:false, nitro:false};
let invertSteering=false, photoMode=false, graphicsQuality='medium', aiDifficulty='normal', showAiPlans=false;
const audio = {ctx:null, muted:false, engine:null, engineGain:null, filter:null, musicAt:0, beat:0};
let clock;
let frameCount=0, frameAccumulator=0;

function mat(color,roughness=.8,metalness=.08,other={}) {return new THREE.MeshStandardMaterial({color,roughness,metalness,...other});}
const M = {};
function mesh(geo,material,x=0,y=0,z=0,parent=scene){
  const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function box(w,h,d,material,x,y,z,parent){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);}
// InstancedMesh (Three.js MIT) agrupa decoração estática sem alterar colisões.
// Somente meshes que não precisam de danos/animação individual entram nos lotes.
function batchStaticBoxes(parent,material,items){
  if(!items.length)return null;
  const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,items.length);
  const dummy=new THREE.Object3D();
  for(let i=0;i<items.length;i++){
    const [x,y,z,w,h,d,rotation=0]=items[i];
    dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);
    dummy.scale.set(w,h,d);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);
  }
  batch.instanceMatrix.needsUpdate=true;
  batch.computeBoundingSphere?.();
  batch.castShadow=false;batch.receiveShadow=true;batch.frustumCulled=false;
  parent.add(batch);
  return batch;
}
function sphere(r,material,x,y,z,parent,width=9,height=7){return mesh(new THREE.SphereGeometry(r,width,height),material,x,y,z,parent);}
function cylinder(top,bottom,height,material,x,y,z,parent,segments=12){return mesh(new THREE.CylinderGeometry(top,bottom,height,segments),material,x,y,z,parent);}
function makeCanvasText(txt,back='#151c37',foreground='#ffffff',scale=1){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle=back;ctx.fillRect(0,0,512,128);
  ctx.lineWidth=7;ctx.strokeStyle='#ffffff70';ctx.strokeRect(4,4,504,120);
  ctx.font=`900 ${Math.round(67*scale)}px Impact,Arial,sans-serif`;ctx.fillStyle=foreground;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,256,66,475);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function sign(txt,x,y,z,rot=0,w=14,h=3,color='#151c37',front='#ffffff'){
  const board=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:makeCanvasText(txt,color,front),side:THREE.DoubleSide}),x,y,z);
  board.rotation.y=rot;board.castShadow=false;return board;
}
// Superfícies pintadas proceduralmente: não exigem baixar texturas externas.
function makeSurfaceMap(base,accent,scale=20){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  // PRNG determinístico: o mesmo terreno em toda execução.
  let seed=4512;const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<950;i++){
    ctx.globalAlpha=.035+next()*.14;ctx.fillStyle=accent;
    ctx.fillRect(next()*256,next()*256,1+next()*9,1+next()*5);
  }
  ctx.globalAlpha=.21;ctx.strokeStyle=accent;ctx.lineWidth=1.2;
  for(let i=0;i<10;i++){
    const x=next()*256,y=next()*256;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+next()*26,y+next()*16);ctx.lineTo(x+next()*35,y+next()*36);ctx.stroke();
  }
  ctx.globalAlpha=1;
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=THREE.RepeatWrapping;map.wrapT=THREE.RepeatWrapping;
  if(map.repeat?.set)map.repeat.set(scale,scale);
  map.anisotropy=4;
  return map;
}
function textured(mat0,base,accent,scale=20){mat0.map=makeSurfaceMap(base,accent,scale);mat0.needsUpdate=true;return mat0;}
function paintFinish(color){
  // Clearcoat produz realces de pintura automotiva, sem assets externos.
  const properties={color,metalness:.44,roughness:.33,clearcoat:.85,clearcoatRoughness:.21};
  return THREE.MeshPhysicalMaterial?new THREE.MeshPhysicalMaterial(properties):mat(color,.33,.44);
}
function setup3D(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x9f8069);scene.fog=new THREE.FogExp2(0x9f8069,.0034);
  camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.15,750);camera.position.set(-6,22,-130);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  $('game').appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xeaf4ff,0x6d4c45,1.6));
  sun=new THREE.DirectionalLight(0xffe5b1,2.3);sun.position.set(-90,150,-95);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-235;sun.shadow.camera.right=235;sun.shadow.camera.top=235;sun.shadow.camera.bottom=-235;
  sun.shadow.camera.near=1;sun.shadow.camera.far=420;sun.shadow.bias=-.0002;scene.add(sun);
  M.grass=mat(0x856a51);M.road=mat(0x31394c,.91);M.roadEdge=mat(0x1a2638,.88);
  M.stripeWhite=mat(0xf4f6f1);M.curbRed=mat(0xff546e);M.curbWhite=mat(0xfff8d8);
  M.yellow=mat(0xffcd43,.5);M.cyan=mat(0x37eaf3,.3);M.concrete=mat(0x5d6d80);
  M.tree=mat(0x2b8d63);M.trunk=mat(0x896540);M.rock=mat(0x7b96a4);
  M.dark=mat(0x171a29,.65,.35);M.glass=mat(0x8de4f9,.25,.4,{transparent:true,opacity:.77});
  M.tire=mat(0x18191f,.98);M.rim=mat(0xdadfe8,.35,.65);M.chrome=mat(0xe5eefa,.24,.8);
  buildBattlefields();
  window.addEventListener('resize',resize);
  window.addEventListener('blur',()=>{held.clear();if(gameState==='playing')pauseGame();});
  resize();
}
function buildBattlefields(){
  buildWasteland();buildDeadCity();buildHarbor();
  for(const level of ["wasteland","city","harbor"])decorateArena(level);
  battlefields.city.visible=false;battlefields.harbor.visible=false;
}
function addObstacle(x,z,r,level,kind='concrete'){
  obstacles.push({x,z,r,level,kind});
}
function makePickup(x,z,level){
  const group=new THREE.Group();group.position.set(x,2.6,z);battlefields[level].add(group);
  const glow=mesh(new THREE.IcosahedronGeometry(1.62,0),mat(0xffba4b,.22,.35,{emissive:0xff6926,emissiveIntensity:.88}),0,0,0,group);
  const ring=mesh(new THREE.TorusGeometry(2.22,.18,8,20),mat(0x72efff,.28,.4,{emissive:0x32ddfa,emissiveIntensity:.7}),0,0,0,group);
  pickups.push({group,glow,ring,x,z,respawn:0,baseY:2.6,level});
}
function spawnCrate(x,z,size=3,level='wasteland'){
  const group=new THREE.Group();group.position.set(x,1.4,z);battlefields[level].add(group);
  const wood=mat(level==='city'?0x777986:0x9d6943,.88);
  box(size,size,size,wood,0,size/2-1.4,0,group);
  for(const y of [-.95,.95]){
    box(size+.15,.2,.32,M.dark,0,size/2-1.4+y,0,group);
    box(.32,.2,size+.15,M.dark,0,size/2-1.4+y,0,group);
  }
  crates.push({group,x,z,r:size*.68,alive:true,level});
}
function buildWasteland(){
  const level='wasteland',g=new THREE.Group();scene.add(g);battlefields[level]=g;
  const sand=textured(mat(0xb29a7a,1),"#a78963","#d2b48a",55),darkSand=mat(0x665445,1),rust=mat(0xa75e3a,.8,.2),metal=mat(0x55545b,.78,.4),warning=mat(0xf2b349);
  const ground=mesh(new THREE.PlaneGeometry(900,900),sand,0,-.36,0,g);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  const floor=cylinder(ARENA_RADIUS,ARENA_RADIUS,.35,darkSand,0,-.02,0,g,72);floor.castShadow=false;
  for(let i=0;i<44;i++){
    const a=(i+.5)*Math.PI*2/44,x=Math.sin(a)*(ARENA_RADIUS+2),z=Math.cos(a)*(ARENA_RADIUS+2);
    const wall=box(11.5,6,2.8,i%4===0?rust:metal,x,3,z,g);wall.rotation.y=a;
    if(i%4===0){const post=box(2.2,10,2.2,warning,x,5,z,g);post.castShadow=false;}
  }
  const ring=mesh(new THREE.TorusGeometry(ARENA_RADIUS-2,.55,6,96),mat(0xedb752,.5,.2),0,.23,0,g);ring.rotation.x=Math.PI/2;ring.castShadow=false;
  for(let i=0;i<38;i++){
    const a=rand(0,Math.PI*2),r=rand(106,300),x=Math.sin(a)*r,z=Math.cos(a)*r;
    const h=rand(6,37);const mesa=cylinder(rand(5,11),rand(9,17),h,mat(i%3?0xaa7655:0x72584c),x,h/2-1,z,g,7);mesa.castShadow=false;
    if(i%2===0)box(rand(10,22),2,rand(10,22),darkSand,x,h,z,g).castShadow=false;
  }
  // Posto abandonado, cisternas de combustível e sucata servem de cobertura.
  for(const [x,z] of [[-29,-24],[-21,-24],[-13,-24]]){
    const tank=cylinder(3.3,3.3,10,rust,x,5.1,z,g,12);tank.rotation.z=Math.PI/2;
    addObstacle(x,z,5.3,level);
    box(1,8,1,metal,x-4,4,z-4,g);
  }
  box(37,1.5,20,metal,-24,10.8,-24,g); // cobertura do posto
  for(const [x,z,r] of [[24,-17,5.5],[38,-20,4],[33,30,6],[-38,26,4.5]]){
    cylinder(r,r,3.5,metal,x,1.7,z,g,11);cylinder(r*.85,r*.85,.5,warning,x,3.8,z,g,11);
    addObstacle(x,z,r+1.4,level);
  }
  for(const [x,z] of [[-8,33],[6,36],[-3,47],[40,5],[-36,-4]]){
    const t=new THREE.Group();t.position.set(x,0,z);g.add(t);
    box(6,2.8,10,rust,0,1.5,0,t);
    box(5,2.5,5,metal,0,4,0,t);
    box(5.5,.4,10,M.dark,0,4.9,0,t);
    t.rotation.y=rand(-2,2);
    addObstacle(x,z,6,level);
  }
  for(let i=0;i<19;i++){
    const a=i*Math.PI*2/19,r=i%2?32:43,x=Math.sin(a)*r,z=Math.cos(a)*r;
    if(Math.hypot(x+24,z+24)<19)continue;
    spawnCrate(x,z,i%3===0?4.2:3,level);
  }
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12,r=i%2?63:45;makePickup(Math.sin(a)*r,Math.cos(a)*r,level);
  }
  const warningSign=sign('DANGER ZONE',0,14,-86,0,24,4,'#301f1c','#f6c266');scene.remove(warningSign);g.add(warningSign);
}
function buildDeadCity(){
  const level='city',g=new THREE.Group();scene.add(g);battlefields[level]=g;
  const asphalt=textured(mat(0x9ba5ad,1),"#515966","#1c2837",14),slab=mat(0x515869,1),steel=mat(0x606879,.85,.2),paint=mat(0xf3ac44,.8),glass=mat(0x69b3c4,.35,.4,{emissive:0x154455,emissiveIntensity:.18});
  const ground=mesh(new THREE.PlaneGeometry(900,900),mat(0x273443),0,-.36,0,g);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  const surface=mesh(new THREE.PlaneGeometry(180,180),asphalt,0,-.16,0,g);surface.rotation.x=-Math.PI/2;surface.castShadow=false;
  for(let i=-3;i<=3;i++){
    const ln=box(1,.04,177,i===0?paint:slab,i*24,.05,0,g);ln.castShadow=false;
    const cross=box(177,.04,1,i===0?paint:slab,0,.05,i*24,g);cross.castShadow=false;
  }
  const roadMarks=[];
  for(let i=-1;i<=1;i++)for(let j=0;j<17;j++){
    const z=-78+j*9.3,x=i*35;
    roadMarks.push([x,.09,z,.22,.05,4.2],[z,.09,x,4.2,.05,.22]);
  }
  batchStaticBoxes(g,paint,roadMarks);
  const facadeWindows=[];
  for(let i=0;i<40;i++){
    const side=i%4,loc=-83+(i/4|0)*18.2;
    const x=side===0?-91:side===1?91:loc;
    const z=side===2?-91:side===3?91:loc;
    const w=16,h=rand(14,43);
    box(w,h,w,mat(choose([0x5c6a7a,0x77818e,0x4d5868,0x876956])),x,h/2,z,g).castShadow=false;
    for(let k=1;k<5;k++){
      facadeWindows.push([x,k*h/5,z+(side%2===0?1:-1)*8.1,9,.8,.16]);
    }
  }
  batchStaticBoxes(g,glass,facadeWindows);
  for(const [x,z,w,h,d] of [[-35,-28,18,12,18],[35,25,16,17,19],[-31,37,12,9,23],[35,-36,21,13,13]]){
    const building=box(w,h,d,steel,x,h/2,z,g);
    box(w+2,.6,d+2,M.dark,x,h,z,g);
    addObstacle(x,z,Math.max(w,d)*.62,level);
    for(let j=0;j<3;j++)box(w*.6,.5,.16,glass,x,3+j*3,z+d/2+.11,g).castShadow=false;
  }
  // Ônibus destruído, caminhões, barricadas, semáforos e focos de incêndio.
  for(const [x,z,a] of [[-4,-36,.25],[50,-6,1.1],[-48,5,-.7]]){
    const bus=new THREE.Group();bus.position.set(x,0,z);bus.rotation.y=a;g.add(bus);
    box(6,5,15,mat(0x926a38),0,3,0,bus);
    for(const zz of [-4,0,4])box(6.1,1.1,2.3,M.dark,0,4.3,zz,bus);
    for(const zz of [-5,5])for(const xx of [-3,3]){const w=cylinder(1.3,1.3,.65,M.tire,xx,1.2,zz,bus);w.rotation.z=Math.PI/2;}
    addObstacle(x,z,8.2,level);
  }
  for(let i=0;i<22;i++){
    const a=i*2.399,r=18+(i%6)*8,x=Math.sin(a)*r,z=Math.cos(a)*r;
    if(obstacles.some(o=>o.level===level&&Math.hypot(o.x-x,o.z-z)<o.r+7))continue;
    spawnCrate(x,z,i%4?3:4.4,level);
  }
  for(let i=0;i<12;i++){
    const a=i*Math.PI*2/12,r=i%2?67:48;makePickup(Math.sin(a)*r,Math.cos(a)*r,level);
  }
  for(const [x,z] of [[-65,-66],[65,-65],[-65,65],[65,65]]){
    const tower=box(1.5,15,1.5,slab,x,7.5,z,g);
    sphere(2,mat(0xf5a354,.38,.2,{emissive:0xe95820,emissiveIntensity:1.9}),x,15,z,g);
  }
}


// V4.0 — porto industrial: terceira arena, cobertura modular e caminhos entre contêineres.
function buildHarbor(){
  const level='harbor',g=new THREE.Group();scene.add(g);battlefields[level]=g;
  const concrete=textured(mat(0xb6bec6,.96),"#747d83","#383c42",13),metal=mat(0x253343,.64,.45),water=mat(0x1f6674,.33,.2),yellow=mat(0xefb945,.77),glass=mat(0x98c5d7,.37);
  const sea=mesh(new THREE.PlaneGeometry(950,950),water,0,-2.8,0,g);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
  const pier=box(184,.8,184,concrete,0,-.53,0,g);pier.castShadow=false;
  for(let k=-8;k<=8;k++){
    box(.26,.035,176,k%2===0?yellow:metal,k*11,.02,0,g).castShadow=false;
    box(176,.035,.19,metal,0,.02,k*11,g).castShadow=false;
  }
  for(let i=0;i<4;i++){
    const angle=(i+.5)*Math.PI*.5,x=Math.sin(angle)*92,z=Math.cos(angle)*92;
    const railing=box(160,1.9,.8,metal,x,1.0,z,g);railing.rotation.y=angle;addObstacle(x,z,1.4,level);
  }
  // Corredores largos preservam dirigibilidade para ônibus e caminhões.
  const layouts=[[-53,-56,0],[-53,-22,1],[-53,15,0],[-53,53,1],
    [53,-53,1],[53,-17,0],[53,20,1],[53,55,0],
    [-18,-56,1],[17,-56,0],[-18,54,0],[17,54,1],[-35,0,1],[35,0,0]];
  const containerRibs=[];
  layouts.forEach(([x,z,rot],i)=>{
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rot?Math.PI/2:0;g.add(group);
    const paint=mat([0xb65835,0x3d87a5,0xb6a052,0x667c56,0x99554f][i%5],.75,.33);
    const h= i%3===0?8.8:6.5;
    box(9,h,17,paint,0,h/2,0,group);
    for(const side of [-1,1])for(let k=-6;k<=6;k+=2.1){
      const xx=side*4.58;
      // Instâncias no espaço da arena; mantêm a rotação do contêiner.
      containerRibs.push(rot?[x+k,h/2,z-xx,.14,h-.8,.12,Math.PI/2]:[x+xx,h/2,z+k,.14,h-.8,.12]);
    }
    for(const y of [1,h-1])box(9.2,.17,17.2,metal,0,y,0,group);
    for(const xx of [-3.3,3.3])box(.3,h-.7,.16,metal,xx,h/2,8.56,group);
    addObstacle(x,z,rot?10.2:7.7,level,'container');
  });
  batchStaticBoxes(g,metal,containerRibs);
  // Guindastes monumentais, tanques e farol no perímetro.
  for(const [x,z] of [[-75,-75],[75,-75],[75,75]]){
    for(const dx of [-6,6])for(const dz of [-5,5])box(1.25,35,1.25,yellow,x+dx,17.5,z+dz,g);
    box(18,1.5,2.1,yellow,x,35,z,g);
    box(2,1.7,45,yellow,x,37,z+10,g);
    box(.16,17,.16,metal,x,28,z+29,g);
    box(3.4,2.7,3,mat(0xb16a32),x,20,z+29,g);
    box(7,3,8,metal,x,38,z-3,g);
  }
  const tower=cylinder(3.9,5.7,33,mat(0xd0c2a0),-74,16.5,73,g,12);
  for(const y of [6,14,23])cylinder(4.5,4.5,.5,mat(0xaf5c44),-74,y,73,g,12);
  cylinder(6,6,1.1,metal,-74,33.5,73,g,14);
  sphere(2.3,mat(0xffc67a,.27,.15,{emissive:0xffad56,emissiveIntensity:1.75}),-74,35,73,g);
  for(const [x,z] of [[-6,-15],[14,17],[-12,28],[17,-23]]){
    for(let k=0;k<3;k++){cylinder(1.35,1.35,2.7,mat(k%2?0x775947:0x965b35,.68,.5),x+k*3.3,1.4,z,g,12);}
    addObstacle(x+3,z,3.0,level,'barrels');
  }
  for(let i=0;i<16;i++){
    const angle=i*Math.PI*2/16,rr=i%2?32:43,x=Math.sin(angle)*rr,z=Math.cos(angle)*rr;
    if(obstacles.some(o=>o.level===level&&Math.hypot(x-o.x,z-o.z)<o.r+6))continue;
    spawnCrate(x,z,i%3===0?4.1:3.1,level);
  }
  for(let i=0;i<12;i++){const a=i*Math.PI*2/12,r=i%2?61:42;makePickup(Math.sin(a)*r,Math.cos(a)*r,level);}
  const board=sign('IRON HARBOR',0,9,-88,0,19,3.5,'#202c38','#ffe4a6');scene.remove(board);g.add(board);
}

// Elementos de composição de cada arena: faixas, luz ambiente falsa, placas e sucata.
function decorateArena(level){
  const g=battlefields[level];
  const paint=mat(level==='harbor'?0xf0bc42:level==='city'?0xc8b6a0:0xe2b563,.85);
  const soot=mat(level==='city'?0x1d2530:0x302f31,.98);
  const lamp=mat(level==='harbor'?0xffcf80:0xffad57,.25,.1,{emissive:0xffb13c,emissiveIntensity:1.7});
  // Marcas no piso e rastros de colisão não bloqueiam veículos.
  for(let i=0;i<38;i++){
    const theta=i*2.399963229728653,r=18+((i*19)%57);
    const x=Math.cos(theta)*r,z=Math.sin(theta)*r;
    const stain=mesh(new THREE.PlaneGeometry(2.4+(i%4)*1.8,5+(i%3)*2),i%4===0?paint:soot,x,.095,z,g);
    stain.rotation.x=-Math.PI/2;stain.rotation.z=theta;stain.castShadow=false;
  }
  // Refletores de LED e barreiras de segurança nos limites das arenas.
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,dist=81,x=Math.sin(a)*dist,z=Math.cos(a)*dist;
    const post=box(.44,12,.44,M.dark,x,6,z,g);
    const arm=box(2.6,.28,.45,M.chrome,x,12.1,z,g);arm.rotation.y=a;
    const head=box(2.3,.9,.28,lamp,x,11.75,z,g);
    head.rotation.y=a;
  }
  if(level==='harbor'){
    const yellow=mat(0xffbd38,.7),stripe=mat(0x161d28,.8);
    for(let i=-8;i<=8;i++)for(let j=0;j<3;j++){
      const x=i*10.5;
      const segment=box(5,.036,.65,j%2?yellow:stripe,x,.075,-73+j*3,g);segment.rotation.y=Math.PI/5;
    }
    for(const x of [-82,82])for(const z of [-45,45]){
      cylinder(1.35,1.65,5.1,M.dark,x,2.1,z,g);cylinder(1.6,1.6,.4,lamp,x,4.95,z,g);
    }
  } else if(level==='city'){
    for(let j=0;j<5;j++){
      const z=-65+j*30;
      for(const x of [-66,66]){
        box(1.0,12,.9,M.dark,x,6,z,g);
        box(3.2,.85,.65,lamp,x,12,z,g);
      }
    }
    const board=sign('NO MERCY',0,13,-84,0,19,3,'#211923','#ff625e');scene.remove(board);g.add(board);
  } else {
    for(let k=0;k<9;k++){
      const x=-72+k*18,z=(k%2?72:-72);
      cylinder(1.35,1.35,2.0,mat(0x9b5a31,.8,.5),x,1,z,g,12);
      cylinder(1.38,1.38,.3,M.dark,x,2,z,g,12);
    }
  }
}
function addVehicleDetails(body,garage,index,paint,metal,dark){
  const w=garage.width,len=garage.length,front=len/2,back=-len/2;
  const black=mat(0x101317,.78,.28),alloy=mat(0xa7bdc1,.27,.8),led=mat(0xfff5d4,.28,.1,{emissive:0xffe2a2,emissiveIntensity:1.4});
  const red=mat(0xf23835,.49,.2,{emissive:0x8b1d18,emissiveIntensity:.28});
  const hazard=mat(0xe4b82d,.45,.27);
  // Grade frontal vazada (ripado real), proteção do radiador e faróis.
  box(w*.76,.94,.13,black,0,1.65,front+.47,body);
  for(let i=0;i<6;i++)box(w*.69,.055,.18,alloy,0,1.31+i*.14,front+.58,body);
  for(const side of [-1,1]){
    box(.16,.88,.16,alloy,side*w*.42,1.6,front+.55,body);
    box(.65,.17,.25,led,side*w*.34,1.7,front+.63,body);
    box(.76,.22,.19,red,side*w*.33,1.55,back-.6,body);
    // Degraus e estribos laterais para leitura de silhueta.
    box(.4,.18,len*.66,metal,side*w*.55,.85,0,body);
    // Amarrações laterais e faixas de alta visibilidade.
    for(let i=0;i<3;i++){
      const decal=box(.055,.14,len*.085,i%2?hazard:black,side*w*.52,1.73,back+len*(.29+i*.2),body);
      decal.rotation.x=.02;
    }
    const exhaust=cylinder(.19,.23,1.15,alloy,side*w*.39,2.85,back+1.1,body,9);
    exhaust.rotation.z=side*.1;
  }
  for(const z of [front-1.0,back+.95]){
    box(w*.77,.1,.36,alloy,0,2.27,z,body);
  }
  // Peças exclusivas por carro: mantém reconhecíveis ônibus, guincho, lixo e bombeiro.
  if(index===3){
    box(w*.73,.6,.12,black,0,5.32,front+.22,body);
    for(let i=0;i<6;i++)box(.08,1.38,.13,alloy,0,4.42,back+2+i*1.65,body);
    for(const side of [-1,1])box(.35,2.3,.18,alloy,side*w*.48,3.5,back+1.2,body);
  }else if(index===4){
    for(const side of [-1,1])for(let z=back+1.5;z<1;z+=1.2)box(.18,.36,.3,hazard,side*w*.5,3.9,z,body);
    box(w*.65,.13,1.4,black,0,4.87,back+1.1,body);
  }else if(index===7){
    for(let z=back+.8;z<front-2;z+=1.15)box(w*.71,.08,.14,alloy,0,5.32,z,body);
    for(const side of [-1,1])box(.21,.45,1.05,red,side*1.3,4.66,front-2.0,body);
  }else if(index===6){
    for(const side of [-1,1]){
      box(.55,.36,1.4,hazard,side*w*.46,2.58,back+1.2,body);
    }
  }else if(index===9){
    for(const side of [-1,1]){
      const brace=box(.19,2.05,.23,alloy,side*w*.28,3.86,back+2,body);brace.rotation.z=side*.4;
    }
    for(const x of [-.8,.8])sphere(.48,led,x,4.76,1.55,body);
  }else if(index===5){
    for(const side of [-1,1])box(.065,.3,len*.6,mat(0x67c7d4),side*w*.51,2.85,0,body);
    for(let i=0;i<4;i++)sphere(.18,mat([0xff80a8,0xfff0a3,0x74ceeb,0x9bd798][i]),-1.2+i*.8,5.05,back+2.2,body);
  }else if(index===8){
    for(const side of [-1,1])box(.17,.27,len*.49,alloy,side*w*.5,2.54,-.36,body);
  }else if(index===2){
    for(const side of [-1,1])box(.3,1.15,len*.33,alloy,side*w*.5,2.93,back+len*.31,body);
  }else{
    for(const x of [-.9,.9])box(.2,.2,1.6,alloy,x,2.39,front-1.3,body);
  }
}
// Carregamento opcional e não bloqueante. Arquivos glb locais precisam de HTTP(S).
// Caso a rede/loader falhe, o jogo continua usando as carrocerias procedurais.
async function startVehicleAssets(){
  if(typeof location!=='undefined'&&location.protocol==='file:'){
    const error='GLB requer HTTP/HTTPS; use o iniciador ou GitHub Pages';
    for(const key of Object.keys(VEHICLE_GLB))vehicleAssetState.set(Number(key),{status:'error',message:error});
    updateGarageAssetBadge();console.warn(error);return;
  }
  gltfAssetLoader=null;
  const sources=['three/addons/loaders/GLTFLoader.js',
    'https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js'];
  for(const url of sources){
    try{
      const {GLTFLoader}=await import(url);
      gltfAssetLoader=new GLTFLoader();loaderError='';break;
    }catch(error){loaderError=String(error.message||error).slice(0,120);console.warn('GLTFLoader não abriu:',url,error);}
  }
  if(!gltfAssetLoader){
    for(const key of Object.keys(VEHICLE_GLB))vehicleAssetState.set(Number(key),{status:'error',message:loaderError});
    updateGarageAssetBadge();return;
  }
  // O veículo selecionado tem prioridade. O restante da garagem não deve
  // impedir que o carro de sorvete apareça quando o jogador apertar Jogar.
  const order=[garageChoice,5,...Object.keys(VEHICLE_GLB).map(Number)];
  for(const index of [...new Set(order)]){
    if(!VEHICLE_GLB[index])continue;
    await loadVehicleTemplate(index);
  }
  updateGarageAssetBadge();
}
function loadVehicleTemplate(index){
  if(loadedVehicleTemplates.has(index))return Promise.resolve(loadedVehicleTemplates.get(index));
  if(assetPending.has(index))return assetPending.get(index);
  if(!gltfAssetLoader||!VEHICLE_GLB[index])return Promise.resolve(null);
  vehicleAssetState.set(index,{status:'loading'});updateGarageAssetBadge();
  const path=new URL(VEHICLE_GLB[index],document.baseURI).href;
  const job=gltfAssetLoader.loadAsync(path).then(gltf=>{
    const template=gltf.scene;
    if(!template)throw new Error('GLB sem cena 3D');
    template.traverse(node=>{
      if(node.isMesh){assetSharedGeometries.add(node.geometry);
        if(Array.isArray(node.material))for(const m of node.material)assetSharedMaterials.add(m);
        else assetSharedMaterials.add(node.material);
        for(const material of (Array.isArray(node.material)?node.material:[node.material])){
          for(const value of Object.values(material))if(value?.isTexture)assetSharedTextures.add(value);
        }
      }
    });
    loadedVehicleTemplates.set(index,template);
    for(const car of cars)if(car.vehicleIndex===index)attachVehicleAsset(car);
    vehicleAssetState.set(index,{status:'ready'});updateGarageAssetBadge();
    console.info(`GLB ${index} carregado:`,path);return template;
  }).catch(error=>{
    const message=String(error?.message||error).slice(0,140);
    vehicleAssetState.set(index,{status:'error',message});updateGarageAssetBadge();
    console.error('GLB não carregado:',path,error);return null;
  }).finally(()=>assetPending.delete(index));
  assetPending.set(index,job);return job;
}

function emitSweetToothBurst(car,count=10){
  const colors=[0xff66cc,0x7df3ff,0xfff28a,0xffffff];
  const rearX=car.x-Math.sin(car.yaw)*(car.garage.length*.34);
  const rearZ=car.z-Math.cos(car.yaw)*(car.garage.length*.34);
  for(let i=0;i<count;i++){
    const c=colors[i%colors.length],a=rand(0,Math.PI*2),spread=rand(.4,2.1);
    createParticle(rearX+rand(-.7,.7),2.2+rand(0,.9),rearZ+rand(-.7,.7),c,rand(.12,.34),Math.cos(a)*spread,rand(.8,2.7),Math.sin(a)*spread,rand(.25,.7));
  }
}

function emitCandyConfetti(x,z,count=16,power=3){
  const colors=[0xff66cc,0x7df3ff,0xfff28a,0xffffff,0x96ff6e];
  for(let i=0;i<count;i++){
    const a=rand(0,Math.PI*2),v=rand(2,power*3.4+2),c=colors[i%colors.length];
    createParticle(x+rand(-1.1,1.1),1.4+rand(0,1.2),z+rand(-1.1,1.1),c,rand(.11,.28),Math.cos(a)*v,rand(3,10),Math.sin(a)*v,rand(.45,.95));
  }
}
function emitCreamDrip(car,count=3){
  for(let i=0;i<count;i++){
    createParticle(car.x+rand(-1.2,1.2),4.8+rand(0,.9),car.z+rand(-1.2,1.2),choose([0xffd9ef,0xfdf1b8,0xc4f8ff]),rand(.08,.16),rand(-.4,.4),rand(-1.6,-.4),rand(-.4,.4),rand(.35,.8));
  }
}
function spawnCandyRocket(car,spread=0,speed=94){
  const angle=car.yaw+spread;
  const g=new THREE.Group();scene.add(g);
  const shell=mesh(new THREE.CylinderGeometry(.28,.28,1.9,10),mat(0xffd2ef,.28,.08,{emissive:0xff8fd7,emissiveIntensity:.45}),0,0,0,g);shell.rotation.x=Math.PI/2;
  const scoop=mesh(new THREE.SphereGeometry(.34,12,10),mat(0xf8f1ff,.25,.05,{emissive:0xffffff,emissiveIntensity:.25}),0,0,.95,g);
  const cherry=mesh(new THREE.SphereGeometry(.1,10,8),new THREE.MeshBasicMaterial({color:0xff3254}),0,.28,1.08,g);
  const glow=mesh(new THREE.TorusGeometry(.24,.06,8,14),new THREE.MeshBasicMaterial({color:0x8cf7ff,transparent:true,opacity:.88,depthWrite:false}),0,0,-.65,g);glow.rotation.x=Math.PI/2;
  g.position.set(car.x+Math.sin(angle)*(car.garage.length*.42+1),3.0,car.z+Math.cos(angle)*(car.garage.length*.42+1));g.rotation.y=angle;
  missiles.push({mesh:g,x:g.position.x,z:g.position.z,y:3.0,yaw:angle,speed,owner:car,ttl:2.1,type:'candy',trail:0,swirl:rand(0,Math.PI*2)});
}
function buildClownCreamFx(car){
  const root=new THREE.Group();root.position.set(0,5.15,.1);car.body.add(root);
  const topperMat=mat(0xfff0d6,.32,.05,{emissive:0xffb56b,emissiveIntensity:.35});
  const candyMat=mat(0xff70bf,.28,.1,{emissive:0xff4fb0,emissiveIntensity:.5});
  const cyanMat=new THREE.MeshBasicMaterial({color:0x7df3ff,transparent:true,opacity:.9,depthWrite:false});
  const pinkMat=new THREE.MeshBasicMaterial({color:0xff75d7,transparent:true,opacity:.9,depthWrite:false});
  const glowMats=[cyanMat,pinkMat,new THREE.MeshBasicMaterial({color:0xfff08a,transparent:true,opacity:.92,depthWrite:false}),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,depthWrite:false})];
  const bulbs=[],halo=new THREE.Group();root.add(halo);
  for(let i=0;i<8;i++){
    const a=i*Math.PI*2/8,bulb=mesh(new THREE.SphereGeometry(.18,10,8),glowMats[i%glowMats.length],Math.cos(a)*1.18,.18,Math.sin(a)*1.18,halo);
    bulb.userData=bulb.userData||{};bulb.userData.phase=i*.7;bulbs.push(bulb);
  }
  const cone=mesh(new THREE.ConeGeometry(.56,1.35,12),topperMat,0,1.02,0,root);cone.rotation.x=Math.PI;
  const scoop=mesh(new THREE.SphereGeometry(.48,14,12),candyMat,0,1.82,0,root);
  const cherry=mesh(new THREE.SphereGeometry(.15,12,10),new THREE.MeshBasicMaterial({color:0xff3048}),0,2.32,0,root);
  const banner=mesh(new THREE.TorusGeometry(.88,.06,10,22),cyanMat,0,.62,0,root);banner.rotation.x=Math.PI/2;
  const signPivot=new THREE.Group();signPivot.position.set(0,1.34,1.06);root.add(signPivot);
  const signPlate=mesh(new THREE.CylinderGeometry(.62,.62,.08,18),pinkMat,0,0,0,signPivot);signPlate.rotation.x=Math.PI/2;
  const signInner=mesh(new THREE.CylinderGeometry(.44,.44,.09,16),new THREE.MeshBasicMaterial({color:0xfff9d3,transparent:true,opacity:.95}),0,0,.02,signPivot);signInner.rotation.x=Math.PI/2;
  const spiral=mesh(new THREE.TorusKnotGeometry(.22,.055,42,7,2,3),new THREE.MeshBasicMaterial({color:0x79fff5,transparent:true,opacity:.8}),0,0,.09,signPivot);
  const streamers=[];
  for(const side of [-1,1])for(let i=0;i<2;i++){
    const strip=mesh(new THREE.PlaneGeometry(.18,1.15),new THREE.MeshBasicMaterial({color:side<0?(i?0xff71c9:0xfff28a):(i?0x7df3ff:0xffffff),transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}),side*.92,.18,-.28+i*.22,root);
    strip.rotation.y=side<0?.22:-.22;streamers.push(strip);
  }
  return {kind:'clownCream',root,halo,bulbs,cone,scoop,cherry,banner,signPivot,signPlate,signInner,spiral,streamers,clock:0,vaporClock:0,dripClock:.07};
}
function updateVehicleAssetFx(car,dt){
  if(!car.assetFx||car.assetFx.kind!=='clownCream')return;
  const fx=car.assetFx;fx.clock+=dt;
  fx.root.rotation.y+=dt*(1.1+Math.abs(car.speed)*.01);
  fx.root.position.y=5.15+Math.sin(fx.clock*4.2+car.id)*.09;
  fx.cone.rotation.z=Math.sin(fx.clock*3.4+car.id)*.05;
  fx.scoop.position.y=1.82+Math.sin(fx.clock*5.3)*.06;
  fx.cherry.position.y=2.32+Math.sin(fx.clock*7.1)*.04;
  fx.banner.rotation.z=Math.sin(fx.clock*2.7)*.18;
  fx.halo.rotation.y+=dt*2.4;
  fx.signPivot.rotation.z=Math.sin(fx.clock*2.15)*.18;
  fx.signPivot.rotation.y+=dt*(1.4+Math.abs(car.speed)*.01);
  fx.spiral.rotation.z+=dt*3.2;
  let i=0;
  const hype=car.boosting||car.specialCharge<35||car.boostTime>0;
  for(const bulb of fx.bulbs){
    const pulse=.62+.38*Math.sin(fx.clock*(hype?9:6.2)+bulb.userData.phase+i*.25);
    bulb.scale.setScalar(.8+pulse*.45);
    if(bulb.material){bulb.material.opacity=.35+pulse*.6;}
    i++;
  }
  for(let k=0;k<fx.streamers.length;k++){
    const strip=fx.streamers[k];
    strip.rotation.x=Math.sin(fx.clock*4.5+k)*.22;
    strip.rotation.z=Math.sin(fx.clock*3.2+k*1.3)*.18;
    strip.position.y=.18+Math.sin(fx.clock*3.8+k)*.06;
  }
  const drifting=car.drifting||Math.abs(car.sideVelocity)>8;
  const fast=Math.abs(car.speed)>16||car.boosting;
  const iced=car.slowTime>0||car.specialCharge<25;
  fx.vaporClock-=dt;fx.dripClock-=dt;
  if(fx.dripClock<=0&&(fast||car.hp<70||Math.random()<.25)){
    fx.dripClock=fast?.05:.12;
    emitCreamDrip(car,fast?4:2);
  }
  if(fx.vaporClock<=0&&(fast||drifting||iced||hype)){
    fx.vaporClock=fast?.045:drifting?.07:.12;
    emitSweetToothBurst(car,fast?9:5);
    emitCandyConfetti(car.x,car.z,fast?6:3,fast?2.2:1.3);
    if(Math.random()<.7)emitSmoke(car.x-Math.sin(car.yaw)*2.1,car.z-Math.cos(car.yaw)*2.1,fast?0xb7f8ff:0xfbe2ff);
  }
}


function attachVehicleAsset(car){
  const template=loadedVehicleTemplates.get(car.vehicleIndex);
  if(!template||!cars.includes(car)||car.assetSkin)return false;
  const skin=template.clone(true),materials=[],morphMeshes=[];
  // Cópias de materiais permitem avarias visuais por veículo sem contaminar
  // as carrocerias de outros oponentes que compartilham a mesma geometria.
  skin.traverse(node=>{if(node.isMesh){
    // A geometria original dos GLBs é compartilhada. Cada veículo em combate
    // precisa de sua própria cópia para permitir deformação sem afetar rivais.
    if(node.geometry?.attributes?.position && node.geometry.clone){
      // O Clown Cream tem ~40 mil vértices: evita recriar normais em cada
      // batida e mantém os danos por peças e escurecimento, sem travar jogo.
      const count=node.geometry.attributes.position.count;
      if(!(car.vehicleIndex===5&&count>12000)){
        node.geometry=node.geometry.clone();
        const pos=node.geometry.attributes.position;
        morphMeshes.push({geometry:node.geometry,base:new Float32Array(pos.array)});
      }
    }
    node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();
    const mm=Array.isArray(node.material)?node.material:[node.material];
    for(const m of mm){if(m.color){m.userData.basePaint=m.color.clone();materials.push(m);}}
    node.castShadow=car.vehicleIndex!==5;node.receiveShadow=true;
  }});
  if(car.vehicleIndex===5){
    skin.rotation.y=Math.PI/2;
    skin.scale.set(4.4,3.3,4.4);
    skin.position.set(0,3.68,0);
  }
  car.body.add(skin);car.assetSkin=skin;car.assetMaterials=materials;car.assetMorphMeshes=morphMeshes;
  car.visualShell.visible=false; // rodas, torre e danos continuam independentes.
  if(car.vehicleIndex===5)car.assetFx=buildClownCreamFx(car);
  applyAssetDamageTint(car);
  applyAssetDents(car);
  return true;
}
function applyAssetDamageTint(car){
  if(!car.assetMaterials)return;
  const intensity=car.hp<20?.47:car.hp<40?.61:car.hp<65?.77:car.hp<83?.90:1;
  for(const m of car.assetMaterials){m.color.copy(m.userData.basePaint).multiplyScalar(intensity);}
}
// Deformação 3D por contato: altera vértices do GLB do próprio carro, em vez
// de escurecer toda a peça. Recalcula a partir da malha original para que o
// reparo recupere a forma. Funciona com dez modelos + fallback procedural.
function applyAssetDents(car){
  if(!car.assetMorphMeshes?.length)return;
  const health=clamp(car.hp,0,100),dent=clamp((83-health)/83,0,1);
  const side=car.damageSide||'hood',stamp=side+':'+Math.round(health*2)/2;
  if(car.assetDentStamp===stamp)return;
  car.assetDentStamp=stamp;
  const halfW=car.garage.width*.5, halfL=car.garage.length*.5;
  for(const part of car.assetMorphMeshes){
    const geo=part.geometry,attr=geo?.attributes?.position;
    if(!attr||!part.base)continue;
    const xyz=part.base;
    for(let i=0;i<attr.count;i++){
      const ix=i*3,x=xyz[ix],y=xyz[ix+1],z=xyz[ix+2];
      // Influência centrada na região atingida, sem reposicionar as rodas/armas.
      const dFront=(z-halfL*.72)/Math.max(1,halfL*.52);
      const dRear=(z+halfL*.72)/Math.max(1,halfL*.52);
      const sideMid=z/Math.max(1,halfL*.85);
      let influence=0,nx=x,ny=y,nz=z;
      if(side==='hood'){
        influence=Math.exp(-2.1*(dFront*dFront+(x/(halfW*.9))**2));
        nz=z-dent*.72*influence;ny=y-dent*.14*influence;
      }else if(side==='bumper'){
        influence=Math.exp(-2.2*(dRear*dRear+(x/(halfW*.9))**2));
        nz=z+dent*.66*influence;ny=y-dent*.10*influence;
      }else{
        const sign=side==='left'?-1:1;
        const dx=(x-sign*halfW*.86)/Math.max(.65,halfW*.6);
        influence=Math.exp(-1.8*(dx*dx+sideMid*sideMid));
        nx=x-sign*dent*.58*influence;
        ny=y-dent*.08*influence;
      }
      attr.setXYZ(i,nx,ny,nz);
    }
    attr.needsUpdate=true;
    geo.computeVertexNormals?.();geo.computeBoundingSphere?.();
  }
}
function createKart(color,name,isPlayer=false,vehicleIndex=0){
  const garage=GARAGE[vehicleIndex],g=new THREE.Group();scene.add(g);
  const body=new THREE.Group();g.add(body);
  const visualShell=new THREE.Group();body.add(visualShell);
  const paint=paintFinish(color),silver=mat(0xc4cdd1,.35,.75),metal=mat(0x65727a,.63,.59),dark=mat(0x252b32,.82,.2),rust=mat(0x976953,.87,.15),glass=mat(0x76b7c7,.22,.5,{transparent:true,opacity:.84}),lamp=mat(0xffdca3,.3,.1,{emissive:0xffbd53,emissiveIntensity:.7});
  const w=garage.width,len=garage.length,front=len/2,back=-len/2;
  const tw=garage.wheel;
  box(w,1.24,len,paint,0,1.36,0,visualShell);
  box(w*.94,.3,len*.91,dark,0,2.09,0,visualShell);
  for(const z of [front+.19,back-.19]){
    box(w+.55,.65,.72,silver,0,1.0,z,visualShell);
    box(w*.84,.24,.3,dark,0,1.43,z+(z>0?.41:-.41),visualShell);
  }
  for(const x of [-w*.32,w*.32]){
    box(.8,.34,.18,lamp,x,1.53,front+.54,visualShell);
    box(.7,.28,.18,mat(0xab3431,.4,.1,{emissive:0x501412,emissiveIntensity:.4}),x,1.51,back-.54,visualShell);
  }
  // Todas as carrocerias têm a frente no eixo +Z, de acordo com física, mira e câmera.
  if(vehicleIndex===10){ // Moto de assalto
    const frame=mat(0x161a1f,.64,.42),accent=mat(0x59f0b2,.38,.16,{emissive:0x1b8f64,emissiveIntensity:.25});
    box(w*.36,.42,len*.72,paint,0,1.56,0,visualShell);
    box(w*.22,.34,len*.25,dark,0,2.02,-.55,visualShell);
    box(w*.32,.26,len*.20,accent,0,1.83,1.15,visualShell);
    box(w*.18,.10,1.28,silver,0,2.34,-1.18,visualShell);
    for(const side of [-1,1]){
      box(.08,.66,1.18,silver,side*.44,2.05,1.28,visualShell);
      box(.08,.26,.9,silver,side*.54,2.56,-1.34,visualShell);
      box(.08,.08,.66,M.chrome,side*.66,2.64,-1.72,visualShell);
    }
    box(.22,.18,.95,frame,0,1.18,-.32,visualShell);
    box(.18,.14,.84,frame,0,1.07,1.65,visualShell);
    box(.46,.18,.22,lamp,0,1.92,front+.34,visualShell);
    box(.36,.15,.18,mat(0xab3431,.4,.1,{emissive:0x501412,emissiveIntensity:.4}),0,1.88,back-.28,visualShell);
  }else if(vehicleIndex===0 || vehicleIndex===1){
    const sport=vehicleIndex===1;
    box(w*.86,sport?1.05:1.44,len*.44,dark,0,sport?2.63:2.82,-.7,visualShell);
    box(w*.76,.72,.18,glass,0,2.74,len*.08,visualShell);
    box(w*.88,.2,len*.39,paint,0,sport?3.26:3.57,-.7,visualShell);
    box(w*.89,.52,len*.31,paint,0,2.12,len*.29,visualShell);
    box(w*.83,.18,1.4,dark,0,2.29,back+.7,visualShell);
    for(const x of [-w*.39,w*.39])box(.42,.78,2,rust,x,2.2,.0,visualShell);
    if(sport){box(w*.93,.23,.54,silver,0,2.57,back+.2,visualShell);}
    else for(const x of [-.9,.9])box(.22,.44,1.62,silver,x,2.63,len*.27,visualShell);
  }else if(vehicleIndex===2){ // Caminhão de guerra
    box(w*.85,2.25,3.4,paint,0,3.12,front-2.15,visualShell);
    box(w*.75,.9,.17,glass,0,3.75,front-.38,visualShell);
    box(w*.92,1.58,len*.48,rust,0,3.05,back+len*.27,visualShell);
    for(const z of [-2.8,-.85])box(w+.14,.36,.25,metal,0,4.03,z,visualShell);
    box(w*.82,.38,len*.42,metal,0,4.12,back+len*.26,visualShell);
  }else if(vehicleIndex===3){ // Ônibus: corpo longo, janelas repetidas, porta e letreiro
    box(w*.96,3.8,len*.94,paint,0,3.79,0,visualShell);
    box(w*.98,.35,len*.97,dark,0,5.83,0,visualShell);
    box(w*.82,1.45,.18,glass,0,4.35,front-.24,visualShell);
    box(w*.82,.38,.2,dark,0,5.42,front+.13,visualShell);
    for(let k=0;k<7;k++){
      const z=back+1.7+k*1.88;
      for(const side of [-1,1])box(.10,1.23,1.46,glass,side*(w*.49),4.43,z,visualShell);
    }
    box(.13,2.35,1.5,silver,w*.51,2.93,front-2.0,visualShell);
    box(w+.15,.21,len*.93,dark,0,2.55,0,visualShell);
    for(const x of [-1.14,1.14])sphere(.24,lamp,x,6.08,front-.55,visualShell);
    box(w*.66,.24,.13,dark,0,3.1,front+.25,visualShell);
  }else if(vehicleIndex===4){ // Compactador traseiro do caminhão de lixo
    box(w*.9,2.35,len*.38,paint,0,3.22,front-len*.23,visualShell);
    box(w*.73,.82,.16,glass,0,3.78,front-.32,visualShell);
    box(w*.95,3.25,len*.58,mat(0x406751,.68,.3),0,3.65,back+len*.30,visualShell);
    for(const side of [-1,1])for(const z of [back+1.2,back+3.2,back+5.2])box(.18,2.6,.28,metal,side*w*.49,3.72,z,visualShell);
    box(w+.18,2.75,.48,metal,0,3.1,back-.18,visualShell);
    box(w*.72,.65,.38,dark,0,1.25,back-.65,visualShell);
    for(const x of [-w*.39,w*.39])box(.32,3.0,.42,metal,x,3.8,back-.17,visualShell);
  }else if(vehicleIndex===5){ // Van de sorvete de visual original
    box(w*.92,2.2,len*.84,mat(0xf7efe5,.85),0,3.03,-.2,visualShell);
    box(w*.85,.92,.16,glass,0,3.65,front-1,visualShell);
    box(w*.97,.46,len*.93,paint,0,4.39,-.15,visualShell);
    box(.12,1.05,2.4,glass,w*.47,3.25,-.8,visualShell);
    box(w*.71,.30,2,mat(0x60b0c2),0,4.69,-.9,visualShell);
    const ice=mesh(new THREE.ConeGeometry(.72,1.5,9),mat(0xd9a25b),0,5.46,back+2.0,visualShell);ice.rotation.z=Math.PI;
    sphere(.83,mat(0xffc0d8,.8),0,6.15,back+2.0,visualShell);
    for(const side of [-1,1])box(.15,.47,2.25,paint,side*w*.46,2.38,back+2.55,visualShell);
  }else if(vehicleIndex===6){ // Guincho com lança, cabo e gancho traseiro
    box(w*.91,2.3,len*.34,paint,0,3.2,front-len*.2,visualShell);
    box(w*.76,.82,.17,glass,0,3.73,front-.34,visualShell);
    box(w*.88,.34,len*.54,metal,0,2.35,back+len*.30,visualShell);
    for(const x of [-w*.38,w*.38])box(.23,1.75,len*.55,silver,x,3.11,back+len*.3,visualShell);
    const boom=box(.66,.67,len*.49,metal,0,4.35,back+len*.27,visualShell);boom.rotation.x=-.25;
    box(.15,1.95,.14,dark,0,4.0,back-.42,visualShell);
    const hook=mesh(new THREE.TorusGeometry(.42,.14,7,11,Math.PI*1.55),silver,0,2.99,back-.48,visualShell);hook.rotation.z=.4;
  }else if(vehicleIndex===7){ // Bombeiro: tanque, escada e sinalização
    box(w*.93,2.42,len*.36,paint,0,3.18,front-len*.2,visualShell);
    box(w*.8,.82,.18,glass,0,3.64,front-.3,visualShell);
    box(w*.88,2.4,len*.6,paint,0,3.2,back+len*.31,visualShell);
    box(w*.73,.56,len*.5,silver,0,4.78,back+len*.3,visualShell);
    for(const x of [-.75,.75])box(.18,.17,len*.61,metal,x,5.27,back+len*.29,visualShell);
    for(let z=back+1.05;z<front-3;z+=.65)box(1.75,.14,.18,silver,0,5.27,z,visualShell);
    for(const x of [-.89,.89])sphere(.39,mat(x<0?0x377edd:0xea3838,.25,.1,{emissive:x<0?0x192966:0x8d1111,emissiveIntensity:1.2}),x,5.09,front-2.1,visualShell);
    box(w+.06,.21,len*.86,mat(0xeac8a0),0,2.66,0,visualShell);
  }else if(vehicleIndex===8){ // Patrulha blindada e sirene
    box(w*.86,1.75,len*.58,dark,0,2.95,-.3,visualShell);
    box(w*.75,.84,.14,glass,0,3.11,1.89,visualShell);
    box(w*.95,.42,len*.27,paint,0,2.14,len*.34,visualShell);
    box(w*.91,.21,len*.51,paint,0,3.94,-.25,visualShell);
    box(2.1,.31,.75,metal,0,4.26,0,visualShell);
    for(const x of [-.65,.65])box(.83,.24,.78,mat(x<0?0x377dff:0xfd4650,.32,.25,{emissive:x<0?0x0e48ce:0xc61b30,emissiveIntensity:1.15}),x,4.28,0,visualShell);
    box(.15,.9,1.2,glass,w*.46,3.0,.2,visualShell);
  }else if(vehicleIndex===9){ // Monster truck: suspensão exposta, rollcage e admissão
    box(w*.84,1.2,len*.69,paint,0,2.76,.25,visualShell);
    box(w*.78,1.35,len*.37,dark,0,3.75,-.9,visualShell);
    box(w*.76,.79,.16,glass,0,3.85,.88,visualShell);
    for(const x of [-w*.4,w*.4]){
      box(.18,1.7,len*.43,metal,x,3.65,-.9,visualShell);
      box(.3,.4,len*.93,silver,x,1.6,0,visualShell);
    }
    box(.88,1.1,.88,dark,0,3.49,2.15,visualShell);
    box(w*.5,.3,len*.4,metal,0,4.6,-.6,visualShell);
    for(const x of [-1.5,1.5])box(.3,.7,.4,rust,x,3.27,len*.3,visualShell);
  }
  addVehicleDetails(visualShell,garage,vehicleIndex,paint,metal,dark);
  // Conjuntos de rodas em seus próprios suportes de suspensão. A roda gira
  // independentemente do balanço da lataria; cada suporte absorve um solavanco.
  const wheels=[],wheelMounts=[];
  if(vehicleIndex===10){
    for(const z of [-len*.31,len*.31]){
      const assembly=new THREE.Group();assembly.position.set(0,tw*.98,z);body.add(assembly);
      const tire=cylinder(tw,tw,Math.min(.72,tw*.58),M.tire,0,0,0,assembly,18);tire.rotation.z=Math.PI/2;
      const rim=cylinder(tw*.46,tw*.46,Math.min(.8,tw*.58)+.04,M.rim,0,0,0,assembly,14);rim.rotation.z=Math.PI/2;
      cylinder(tw*.18,tw*.18,Math.min(.84,tw*.58)+.08,M.dark,0,0,0,assembly,12).rotation.z=Math.PI/2;
      for(let b=0;b<5;b++){
        const a=b*Math.PI*2/5;
        sphere(.055,M.chrome,0,Math.sin(a)*tw*.28,Math.cos(a)*tw*.28,assembly,6,5);
      }
      wheels.push(tire,rim);
      wheelMounts.push({group:assembly,x:0,z,baseY:tw*.98,travel:0,velocity:0});
    }
  }else{
    const wheelZ=garage.length>12?[-len*.38,0,len*.37]:garage.length>10?[-len*.35,len*.33]:[-len*.33,len*.34];
    for(const x of [-w*.55,w*.55])for(const z of wheelZ){
      const assembly=new THREE.Group();assembly.position.set(x,tw*.9,z);body.add(assembly);
      const tire=cylinder(tw,tw,Math.min(1.38,tw*.85),M.tire,0,0,0,assembly,14);tire.rotation.z=Math.PI/2;
      const rim=cylinder(tw*.48,tw*.48,Math.min(1.4,tw*.85)+.05,M.rim,0,0,0,assembly,12);rim.rotation.z=Math.PI/2;
      cylinder(tw*.20,tw*.20,Math.min(1.45,tw*.85)+.12,M.dark,0,0,0,assembly,10).rotation.z=Math.PI/2;
      for(let b=0;b<5;b++){
        const a=b*Math.PI*2/5;
        sphere(.075,M.chrome,x>0?.72:-.72,Math.sin(a)*tw*.34,Math.cos(a)*tw*.34,assembly,6,5);
      }
      wheels.push(tire,rim);
      wheelMounts.push({group:assembly,x,z,baseY:tw*.9,travel:0,velocity:0});
    }
  }
  // Armas montadas acima da carroceria, mesmo em veículos altos.
  const mountHeight=[3.65,3.2,4.82,6.45,5.58,4.98,5.3,5.8,4.59,5.17,3.05][vehicleIndex] ?? 3.8;
  const turret=new THREE.Group();turret.position.set(0,mountHeight,.4);body.add(turret);
  cylinder(.83,.96,.58,silver,0,0,0,turret,10);
  for(const x of [-.41,.41]){
    const barrel=cylinder(.18,.24,2.6,dark,x,.26,1.22,turret,10);barrel.rotation.x=Math.PI/2;
    sphere(.25,M.chrome,x,.26,2.55,turret);
  }
  for(const x of [-w*.3,w*.3]){
    const tube=cylinder(.37,.4,1.9,rust,x,mountHeight-.25,back+len*.28,body,9);tube.rotation.x=Math.PI/2;
  }
  // Nome flutua acima de ônibus e caminhões sem cobrir a carroceria.
  const labelTexture=makeCanvasText(name,'#171a22',isPlayer?'#f6c869':'#ffffff',.81);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture,transparent:true,depthWrite:false}));sprite.position.set(0,mountHeight+3,0);sprite.scale.set(12,3,1);g.add(sprite);
  const damageRig=buildDamageRig(body,garage,vehicleIndex,color);
  const car={id:cars.length,name,color,group:g,body,visualShell,assetSkin:null,assetMaterials:null,assetMorphMeshes:[],assetDentStamp:null,turret,wheels,sprite,paint,damageRig,wheelMounts,sideVelocity:0,suspension:{height:0,verticalSpeed:0,roll:0,rollSpeed:0,pitch:0,pitchSpeed:0,impact:0},damageLevel:0,damageSide:'right',burnTime:0,damageImpacts:0,x:0,z:0,yaw:0,speed:0,
    radius:bodyRadius(garage),hp:100,nitro:75,ammo:5,item:null,shield:0,slowTime:0,driftTime:0,drifting:false,boosting:false,boostTime:0,
    lap:1,score:0,wrecks:0,alive:true,invuln:0,isPlayer,steer:0,acc:0,brake:0,useDrift:false,useNitro:false,
    ramCooldown:0,fireCooldown:0,gunCooldown:0,gunHeat:0,gunLocked:false,specialCharge:100,
    boostPadCooldown:0,smokeClock:0,aiOffset:rand(-2,2),aiTarget:null,aiThink:0,
    aiState:'hunt',aiFlankSide:(cars.length%2?1:-1),aiStuck:0,aiReverse:0,aiLastX:0,aiLastZ:0,aiHeading:0,aiGoal:null,aiPersonality:['hunter','flanker','brawler','scavenger'][cars.length%4],
    lastAttacker:null,damageFlash:0,crashCount:0,garage,vehicleIndex};
  cars.push(car);attachVehicleAsset(car);return car;
}

// Partes independentes. As texturas e os objetos são gerados localmente, sem assets pagos.
function buildDamageRig(body,garage,vehicleIndex,paintHex){
  const w=garage.width,len=garage.length,front=len/2;
  const tall=[3,4,5,6,7].includes(vehicleIndex), high=[3,4,7].includes(vehicleIndex);
  const sideY=high?3.1:tall?2.65:2.0;
  const panelMat=mat(paintHex,.63,.31),scrape=mat(0x6b5347,.96,.10),cracks=mat(0xd4f3ed,.61,.3,{transparent:true,opacity:.86});
  const panels=[];
  function panel(key,x,y,z,a,b,c,threshold){
    const part=box(a,b,c,panelMat,x,y,z,body);
    part.castShadow=true;
    panels.push({key,mesh:part,pos:[x,y,z],dims:[a,b,c],threshold,detached:false,dent:0});
  }
  // Pedaços da lataria fisicamente separáveis, inclusive em veículos grandes.
  panel('left',-w*.497,sideY,-len*.13,.22,high?2.6:1.10,len*.35,58);
  panel('right',w*.497,sideY,len*.10,.22,high?2.6:1.10,len*.35,45);
  panel('hood',0,2.16,front-len*.16,w*.78,.22,len*.24,29);
  panel('bumper',0,1.18,front+.49,w*.90,.52,.27,19);
  const crackGroup=new THREE.Group();body.add(crackGroup);
  crackGroup.visible=false;
  // Rachaduras frontais e laterais que aparecem após dano leve.
  const windshield=[[2.74,len*.08],[2.74,len*.08],[3.75,front-.38],[4.35,front-.24],
    [3.78,front-.32],[3.65,front-1],[3.73,front-.34],[3.64,front-.3],[3.11,1.89],[3.85,.88],[2.32,front-.48]][vehicleIndex] ?? [2.7,front-.4];
  const [crackY,crackZ]=windshield;
  for(const [x,y,len2,rot] of [[-.65,0,1.1,.48],[.25,.15,1.35,-.65],[1.0,-.2,.84,.42],[-.2,-.34,.82,1.2]]){
    const shard=box(.075,len2,.07,cracks,x,crackY+y,crackZ+.14,crackGroup);shard.rotation.z=rot;shard.castShadow=false;
  }
  const soot=box(w*.78,.04,len*.27,scrape,0,2.31,front-len*.15,body);
  soot.visible=false;
  const fireGroup=new THREE.Group();body.add(fireGroup);
  fireGroup.position.set(0,2.75,front-len*.2);fireGroup.visible=false;
  const inner=mat(0xffb33c,.25,.0,{emissive:0xff6118,emissiveIntensity:1.7}), outer=mat(0xe33e20,.39,.0,{emissive:0x9f210d,emissiveIntensity:1.6});
  for(const dx of [-.9,.6]){
    const flame=mesh(new THREE.ConeGeometry(.58,2.25,7),inner,dx,1.05,0,fireGroup);
    flame.rotation.z=dx*.28;
    const secondary=mesh(new THREE.ConeGeometry(.77,1.3,6),outer,dx*.5,.56,-.4,fireGroup);secondary.castShadow=false;
  }
  return {panels,panelMat,soot,crackGroup,fireGroup,tirePunctured:false,lastStage:0};
}
function scatterVehiclePart(car,part){
  if(part.detached)return;
  part.detached=true;part.mesh.visible=false;
  const [x,y,z]=part.pos,[w,h,d]=part.dims;
  const scrap=box(w,h,d,mat(0x756052,.83,.42),car.x+Math.cos(car.yaw)*x+Math.sin(car.yaw)*z,y+.45,
    car.z-Math.sin(car.yaw)*x+Math.cos(car.yaw)*z,scene);
  scrap.rotation.y=car.yaw;scrap.rotation.z=rand(-.3,.3);
  const side=x<0?-1:1;
  scrapParts.push({mesh:scrap,ttl:11,vx:Math.cos(car.yaw)*side*rand(3,7),vy:rand(3,7),vz:-Math.sin(car.yaw)*side*rand(3,7)});
  emitBurst(car.x,car.z,0xe2ae70,9,2.2);
}
function syncDamageVisuals(car){
  if(!car?.damageRig)return;
  applyAssetDamageTint(car);
  applyAssetDents(car);
  const health=clamp(car.hp,0,100),rig=car.damageRig;
  const level=health<=0?5:health<20?4:health<40?3:health<65?2:health<83?1:0;
  if(level>rig.lastStage){
    for(const p of rig.panels){
      // Desprendimento é condicionado ao dano na peça, não só à vida global.
      if(health<p.threshold && !p.detached)scatterVehiclePart(car,p);
    }
  }
  rig.lastStage=level;car.damageLevel=level;
  rig.crackGroup.visible=health<83;
  rig.soot.visible=health<65;
  rig.fireGroup.visible=health<20;
  rig.panelMat.color.setHex(health<41?0x645448:health<65?0x9d8474:car.color);
  car.paint.color.setHex(health<50?0x655f56:car.color);
  for(const p of rig.panels){
    p.mesh.visible=!p.detached;
    p.mesh.rotation.z=(p.key==='left'?-1:1)*(.025*level);
    p.mesh.scale.x=p.key==='bumper'?1:.98-.034*level;
    p.mesh.scale.z=1-.025*level-Math.min(.23,p.dent*.39);
    p.mesh.position.x=p.pos[0]+(p.key==='left'?1:p.key==='right'?-1:0)*p.dent;
    p.mesh.position.y=p.pos[1]-(p.key==='hood'?.25*p.dent:0);
    p.mesh.position.z=p.pos[2]-(p.key==='bumper'?.32*p.dent:0);
  }
  // Roda dianteira amassada tem efeito mecânico real na velocidade e curva.
  rig.tirePunctured=health<22;
  for(let i=0;i<car.wheels.length;i++){
    const wheel=car.wheels[i];
    const puncture=rig.tirePunctured && i>=car.wheels.length-4 && i<car.wheels.length-2;
    wheel.scale.y=puncture?.76:1;wheel.scale.z=puncture?.76:1;
  }
  if(health===0)car.burnTime=Math.max(car.burnTime,9);
}
function updateScrapParts(dt){
  for(let i=scrapParts.length-1;i>=0;i--){
    const p=scrapParts[i];p.ttl-=dt;
    if(p.ttl<=0){disposeDynamic(p.mesh);scrapParts.splice(i,1);continue;}
    p.vy-=15*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y=Math.max(.15,p.mesh.position.y+p.vy*dt);
    p.mesh.position.z+=p.vz*dt;
    if(p.mesh.position.y<=.151){p.vy=Math.abs(p.vy)*.19;p.vx*=.9;p.vz*=.9;}
    p.mesh.rotation.z+=dt*p.vx*.13;p.mesh.rotation.x+=dt*p.vz*.1;
  }
}
// Foto da renderização real do navegador: HTML salvo não depende de serviços de imagem.
function saveScreenshot(){
  if(!renderer)return false;
  try{
    renderer.render(scene,camera);
    const anchor=document.createElement('a');
    anchor.download=`IRON-WRECK-v7-${mode}-${Date.now()}.png`;
    anchor.href=renderer.domElement.toDataURL('image/png');
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    showToast('📸 FOTO SALVA!',1.6);return true;
  }catch(error){console.warn('Captura indisponível',error);showToast('FOTO INDISPONÍVEL NESTE NAVEGADOR',1.6);return false;}
}
function togglePhotoMode(){
  if(gameState!=='playing'&&gameState!=='paused')return;
  photoMode=!photoMode;
  $('hud').classList.toggle('hidden',photoMode);$('minimap').classList.toggle('hidden',photoMode);
  $('mobileControls').classList.toggle('hidden',photoMode||!isTouchDevice());
  if(!photoMode)showToast('📸 FOTO: PRESSIONE K',1.7);
}

function disposeDynamic(root){
  // Impede acumular geometria e texturas GPU ao voltar à garagem repetidas vezes.
  if(!root)return;
  const shared=new Set(Object.values(M)), seenGeo=new Set(),seenMat=new Set();
  function visit(obj){
    for(const child of obj.children||[])visit(child);
    if(obj.geometry&&obj.geometry!==particleGeo&&!assetSharedGeometries.has(obj.geometry)&&!seenGeo.has(obj.geometry)){obj.geometry.dispose?.();seenGeo.add(obj.geometry);}
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const material of materials){
      if(!material||shared.has(material)||assetSharedMaterials.has(material)||seenMat.has(material))continue;
      seenMat.add(material);if(material.map&&!assetSharedTextures.has(material.map))material.map.dispose?.();material.dispose?.();
    }
  }
  visit(root);scene.remove(root);
}
function clearDynamic(){
  for(const c of cars)disposeDynamic(c.group);
  for(const p of debris)disposeDynamic(p.mesh);
  for(const m of missiles)disposeDynamic(m.mesh);
  for(const m of mines)disposeDynamic(m.mesh);
  for(const t of tracers)disposeDynamic(t.mesh);
  for(const p of scrapParts)disposeDynamic(p.mesh);
  for(const b of blastRings)disposeDynamic(b.mesh);
  for(const f of impactFlashes)disposeDynamic(f.mesh);
  cars=[];debris=[];missiles=[];mines=[];tracers=[];scrapParts=[];blastRings=[];impactFlashes=[];player=null;
  for(const p of pickups){p.respawn=0;p.group.visible=false;}
  for(const c of crates){c.alive=true;c.group.visible=false;}
}
function resetGame(nextMode){
  if(!battlefields[nextMode])nextMode='wasteland';
  clearDynamic();mode=nextMode;elapsed=0;visualClock=0;lastUi=-1;lastMap=-1;shake=0;toastUntil=0;comboUntil=0;photoMode=false;$('minimap').classList.remove('hidden');
  for(const [k,g] of Object.entries(battlefields))g.visible=k===mode;
  const sky=mode==='city'?0x485e77:mode==='harbor'?0x66828b:0x9f8069;
  scene.background=new THREE.Color(sky);scene.fog.color.set(sky);
  for(const p of pickups)p.group.visible=p.level===mode;
  for(const c of crates){c.alive=true;c.group.visible=c.level===mode;}
  const roster=[garageChoice,...Array.from({length:7},(_,i)=>(garageChoice+1+i)%GARAGE.length)];
  for(let i=0;i<8;i++){
    const vi=roster[i];const c=createKart(i===0?GARAGE[vi].color:COLORS[i],i===0?'VOCÊ':NAMES[i],i===0,vi);
    const a=i*Math.PI*2/8+Math.PI/8,r=58+(i%2)*9;
    c.x=Math.sin(a)*r;c.z=Math.cos(a)*r;c.yaw=Math.atan2(-c.x,-c.z);
    c.nitro=70;c.ammo=i===0?8:5;c.aiThink=rand(.05,.35);c.aiLastX=c.x;c.aiLastZ=c.z;
    c.group.position.set(c.x,.7,c.z);c.group.rotation.y=c.yaw;
    if(i===0)player=c;
  }
  gameState='playing';$('menu').classList.add('hidden');$('endScreen').classList.add('hidden');
  $('hud').classList.remove('hidden');$('pausePanel').classList.add('hidden');
  $('mobileControls').classList.toggle('hidden',!isTouchDevice());
  $('positionLabel').textContent='SOBREVIVENTES';$('lapLabel').textContent='ELIMINAÇÕES';
  $('arenaName').textContent=({city:'CIDADE FANTASMA',harbor:'PORTO DAS SOMBRAS',wasteland:'DESERTO DE FERRO'}[mode])+' · '+player.garage.name;
  camera.position.set(player.x-Math.sin(player.yaw)*20,14,player.z-Math.cos(player.yaw)*20);
  followLook.set(player.x,3,player.z);
  updateUI(true);showToast('☠ DESTRUA OS 7 RIVAIS E SOBREVIVA!',3.2);
  initializeAudio();playSound('start');
}

function isTouchDevice(){return 'ontouchstart' in window || navigator.maxTouchPoints>0;}
function pauseGame(){if(gameState!=='playing')return;gameState='paused';$('pausePanel').classList.remove('hidden');held.clear();stopEngine();}
function resumeGame(){if(gameState!=='paused')return;gameState='playing';$('pausePanel').classList.add('hidden');}
function returnMenu(){photoMode=false;$('minimap').classList.remove('hidden');gameState='menu';$('menu').classList.remove('hidden');$('endScreen').classList.add('hidden');$('hud').classList.add('hidden');$('pausePanel').classList.add('hidden');$('mobileControls').classList.add('hidden');stopEngine();}
function endGame(reason){
  if(gameState!=='playing')return;
  gameState='ended';stopEngine();photoMode=false;$('minimap').classList.add('hidden');$('hud').classList.add('hidden');$('mobileControls').classList.add('hidden');
  const won=player.alive;
  $('endEmoji').textContent=won?'🏆':'💀';
  $('endTitle').textContent=won?'REI DA SUCATA':'VEÍCULO DESTRUÍDO';
  $('endDescription').textContent=won?'Você eliminou todos os rivais e dominou a zona de guerra.':'Sua máquina caiu. Use cobertura, ataque pelas laterais e recolha suprimentos!';
  $('endResult').textContent=won?'VITÓRIA':'ELIMINADO';
  $('endScore').textContent=Math.floor(player.score).toLocaleString('pt-BR');
  $('endWrecks').textContent=player.wrecks;$('endTime').textContent=fmtTime(elapsed);
  $('endScreen').classList.remove('hidden');playSound(won?'win':'lose');
}
function fmtTime(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`;}
function showToast(message,duration=1.45){const toast=$('toast');toast.textContent=message;toast.classList.add('show');toastUntil=elapsed+duration;}
function showCombo(message){const el=$('combo');el.textContent=message;el.classList.add('show');comboUntil=elapsed+1.45;}
function updatePlayerInput(){
  input.acc=+(held.has('KeyW')||held.has('ArrowUp'));input.brake=+(held.has('KeyS')||held.has('ArrowDown'));
  // A câmera fica atrás do capô (+Z). Ao olhar para +Z, o eixo horizontal na
  // tela é -X; portanto D precisa DIMINUIR yaw e A AUMENTAR yaw.
  // Este é o conserto da direção visual invertida da v1.0.
  const normal=+(held.has('KeyD')||held.has('ArrowRight'))-+(held.has('KeyA')||held.has('ArrowLeft'));
  input.steer=invertSteering?normal:-normal;
  input.drift=held.has('Space');input.nitro=held.has('ShiftLeft')||held.has('ShiftRight');
  if(!player)return;
  player.acc=input.acc;player.brake=input.brake;player.steer=input.steer;player.useDrift=input.drift;player.useNitro=input.nitro;
}
function playerFire(){if(gameState==='playing'&&player?.alive)fireRocket(player);}
function playerSpecial(){if(gameState==='playing'&&player?.alive)useSpecial(player);}
function playerItem(){if(gameState==='playing'&&player?.alive)useItem(player);}
// Geometria 2D do combate: a IA e as armas respeitam as mesmas coberturas.
function segmentCircleFraction(x0,z0,x1,z1,cx,cz,r){
  const dx=x1-x0,dz=z1-z0,den=dx*dx+dz*dz;
  if(den<1e-8)return Math.hypot(x0-cx,z0-cz)<=r?0:null;
  const t=clamp(((cx-x0)*dx+(cz-z0)*dz)/den,0,1);
  const px=x0+dx*t,pz=z0+dz*t;
  return (px-cx)**2+(pz-cz)**2<=r*r?t:null;
}
function firstCoverOnLine(x0,z0,x1,z1,padding=0){
  let result=null,best=Infinity;
  for(const o of obstacles){
    if(o.level!==mode)continue;
    const t=segmentCircleFraction(x0,z0,x1,z1,o.x,o.z,o.r+padding);
    if(t!==null&&t<best){best=t;result={t,object:o,crate:false};}
  }
  for(const o of crates){
    if(!o.alive||o.level!==mode)continue;
    const t=segmentCircleFraction(x0,z0,x1,z1,o.x,o.z,o.r+padding);
    if(t!==null&&t<best){best=t;result={t,object:o,crate:true};}
  }
  return result;
}
function aiHasLineOfSight(c,target){
  const dx=target.x-c.x,dz=target.z-c.z,length=Math.hypot(dx,dz);
  if(length<.01)return true;
  const start=Math.min(c.radius*.63,length*.35);
  return !firstCoverOnLine(c.x+dx/length*start,c.z+dz/length*start,target.x,target.z,.35);
}
function aiArenaContains(x,z,r=0){
  const limit=ARENA_RADIUS-6-r;
  if(mode==='wasteland')return x*x+z*z<=limit*limit;
  return Math.abs(x)<=limit&&Math.abs(z)<=limit;
}
// Somente seleção tática usa saúde, acessibilidade, suprimentos e ameaça.
function aiChooseTarget(c){
  let best=null,score=Infinity;
  for(const enemy of cars){
    if(enemy===c||!enemy.alive)continue;
    const d=vec2Dist(c,enemy);
    let s=d+(enemy.hp/100)*13;
    if(enemy===c.aiTarget)s-=12; // persistência evita mudanças bruscas de objetivo.
    if(enemy===c.lastAttacker)s-=16;
    if(aiHasLineOfSight(c,enemy))s-=7;
    if(s<score){score=s;best=enemy;}
  }
  return best;
}
function aiNearestPickup(c){
  let best=null,dist=Infinity;
  for(const p of pickups){
    if(p.level!==mode||p.respawn>0||!p.group.visible)continue;
    const d=Math.hypot(c.x-p.x,c.z-p.z);
    if(d<dist){dist=d;best=p;}
  }
  return best;
}
function aiChooseCover(c,target){
  if(!target)return null;
  let best=null,score=Infinity;
  for(const o of obstacles){
    if(o.level!==mode)continue;
    const d=Math.hypot(o.x-c.x,o.z-c.z),enemyDistance=Math.hypot(o.x-target.x,o.z-target.z);
    if(d>38||enemyDistance>48||d<o.r+c.radius+2)continue;
    const vx=o.x-target.x,vz=o.z-target.z,vl=Math.hypot(vx,vz)||1;
    const gap=o.r+c.radius+3.5;
    const x=o.x+vx/vl*gap,z=o.z+vz/vl*gap;
    if(!aiArenaContains(x,z,c.radius))continue;
    const cost=Math.hypot(x-c.x,z-c.z)+enemyDistance*.2;
    if(cost<score){score=cost;best={x,z};}
  }
  return best;
}
function aiChooseTactics(c,target){
  const supply=aiNearestPickup(c),d=vec2Dist(c,target);
  const urgent=c.hp<30,lowAmmo=c.ammo<1,moreResources=c.hp<45||c.ammo<2;
  if(c.item==='repair'&&c.hp<55)useItem(c);
  else if(c.item==='shield'&&d<29&&c.shield<1)useItem(c);
  else if(c.item==='boost'&&d>32)useItem(c);
  else if(c.item==='emp'&&d<23)useItem(c);
  else if(c.item==='mine'&&d<13)useItem(c);
  // Se não há uma caixa disponível, a IA não fica eternamente recuando.
  if(moreResources&&supply&&Math.hypot(c.x-supply.x,c.z-supply.z)<65){
    c.aiState='resupply';c.aiGoal={x:supply.x,z:supply.z};return;
  }
  if(urgent&&d<24){
    c.aiState='retreat';
    const angle=Math.atan2(c.x-target.x,c.z-target.z);
    c.aiGoal={x:clamp(c.x+Math.sin(angle)*28,-76,76),z:clamp(c.z+Math.cos(angle)*28,-76,76)};
    return;
  }
  const personality=c.aiPersonality,cover=(personality==='scavenger'||personality==='flanker')&&c.hp<70?aiChooseCover(c,target):null;
  if(cover&&d<53){c.aiState='ambush';c.aiGoal=cover;return;}
  if(personality==='flanker'||(personality==='hunter'&&d<45)){
    c.aiState='flank';
    const side=c.aiFlankSide,offset=clamp(d*.42,9,21),lead=clamp(d*.12,2,8);
    c.aiGoal={x:target.x+Math.cos(target.yaw)*offset*side+Math.sin(target.yaw)*lead,
              z:target.z-Math.sin(target.yaw)*offset*side+Math.cos(target.yaw)*lead};
  }else{
    c.aiState='hunt';
    const lead=clamp(d*.16,2,11);
    c.aiGoal={x:target.x+Math.sin(target.yaw)*lead,z:target.z+Math.cos(target.yaw)*lead};
  }
  // blindagem pesada persegue sem recuar; os leves tentam ângulos laterais.
  if(personality==='brawler'&&c.garage.mass>=1.5)c.aiGoal={x:target.x,z:target.z};
}
// Local steering por amostragem: escolhe o caminho mais livre sem pathfinding caro.
// A mesma rotina funciona em deserto circular, quadras da cidade e porto.
function aiNavigate(c,goal){
  const desired=Math.atan2(goal.x-c.x,goal.z-c.z);
  const look=clamp(12+Math.max(0,c.speed)*.32,14,29);
  let heading=desired,best=-Infinity;
  const blocks=[];
  for(const o of obstacles)if(o.level===mode)blocks.push({x:o.x,z:o.z,r:o.r});
  for(const o of crates)if(o.level===mode&&o.alive)blocks.push({x:o.x,z:o.z,r:o.r});
  for(const other of cars)if(other!==c&&other.alive&&vec2Dist(c,other)<32)blocks.push({x:other.x,z:other.z,r:other.radius*.78});
  const offsets=[0,.28,-.28,.56,-.56,.92,-.92,1.36,-1.36,2.1,-2.1];
  for(const offset of offsets){
    const a=desired+offset,x=c.x+Math.sin(a)*look,z=c.z+Math.cos(a)*look;
    const boundary=aiArenaContains(x,z,c.radius+1);
    let penalty=boundary?0:50;
    // Veículos parados e caixotes são obstáculos temporários.
    for(const o of blocks){
      const rr=o.r+c.radius+2.2,d=Math.hypot(o.x-c.x,o.z-c.z);
      if(d>look+rr)continue;
      const t=segmentCircleFraction(c.x,c.z,x,z,o.x,o.z,rr);
      if(t!==null){
        // Contatos muito próximos exigem manobra mais forte; evita colisões frontais.
        penalty+=t<.12?25:44*(1-t)+9;
      }
    }
    const alignment=Math.abs(angleWrap(a-c.yaw));
    const score=-Math.abs(offset)*7-alignment*2.3-penalty;
    if(score>best){best=score;heading=a;}
  }
  return heading;
}
function aiSteer(c,dt){
  if(!c.alive)return;
  const cfg={easy:{reaction:.9,aim:.16,gun:3.4,rocket:.17},normal:{reaction:.55,aim:.22,gun:7.2,rocket:.53},hard:{reaction:.28,aim:.30,gun:10.4,rocket:.87}}[aiDifficulty];
  c.aiThink-=dt;
  if(!c.aiTarget||!c.aiTarget.alive||c.aiThink<=0){
    c.aiTarget=aiChooseTarget(c);
    if(c.aiTarget)aiChooseTactics(c,c.aiTarget);
    c.aiThink=cfg.reaction*(.8+Math.random()*.4);
  }
  const target=c.aiTarget;
  if(!target||!target.alive){c.acc=0;c.brake=1;c.steer=0;return;}
  const d=vec2Dist(c,target),goal=c.aiGoal||target;
  // Progresso em metros por segundo, não por frame (menos dependente de FPS).
  const progress=Math.hypot(c.x-c.aiLastX,c.z-c.aiLastZ);
  if(c.acc>0&&Math.abs(c.speed)<7&&progress<dt*2)c.aiStuck+=dt;
  else c.aiStuck=Math.max(0,c.aiStuck-dt*.75);
  c.aiLastX=c.x;c.aiLastZ=c.z;
  if(c.aiStuck>1.7&&c.aiReverse<=0){c.aiReverse=1.15;c.aiStuck=0;c.aiFlankSide*=-1;c.aiThink=0;}
  if(c.aiReverse>0){
    c.aiReverse-=dt;c.aiState='unstuck';c.acc=0;c.brake=1;
    c.steer=c.aiFlankSide*.85;c.useDrift=false;c.useNitro=false;
    return;
  }
  const heading=aiNavigate(c,goal);
  const delta=angleWrap(heading-c.yaw);
  c.aiHeading=heading;
  c.steer=clamp(delta*1.7,-1,1);
  const sharp=Math.abs(delta)>.7,closing=c.aiState==='ambush'&&Math.hypot(goal.x-c.x,goal.z-c.z)<10;
  const desiredSpeed=(c.aiState==='retreat'?49:c.aiState==='resupply'?38:closing?13:sharp?19:d<19?22:40)*c.garage.speed;
  c.acc=c.speed<desiredSpeed?1:0;
  c.brake=c.speed>desiredSpeed+4?1:0;
  c.useDrift=sharp&&c.speed>22;
  const hasSight=aiHasLineOfSight(c,target);
  c.useNitro=c.nitro>34&&d>31&&!sharp&&c.aiState!=='ambush'&&c.aiState!=='resupply'&&c.aiState!=='retreat'&&c.hp>25;
  if(c.useNitro&&c.nitro<38)c.useNitro=false;
  const aiming=aimTo(c,target);
  if(hasSight&&d<75&&aiming<cfg.aim){
    if(Math.random()<1-Math.exp(-cfg.gun*dt))fireMachineGun(c);
    if(d<62&&c.ammo>0&&Math.random()<1-Math.exp(-cfg.rocket*dt))fireRocket(c);
  }
  if(c.specialCharge>=100&&d<32&&aiming<.8&&hasSight)useSpecial(c);
  if(c.item&&c.item!=='repair'&&Math.random()<1-Math.exp(-.15*dt)){
    if((c.item==='shield'&&d<30)||(c.item==='emp'&&d<23)||(c.item==='mine'&&d<14))useItem(c);
  }
}
// Molas com amortecimento por eixo, com balanço do chassi e recomposição
// numérica independente da taxa de quadros (dt limitado no loop).
function updateVehicleSuspension(c,dt,accelChange=0){
  const s=c.suspension;
  if(!s)return;
  const mass=c.garage.mass;
  const speed=Math.abs(c.speed);
  const noise=Math.sin(c.x*.55+c.z*.31)*Math.sin(c.z*.69-c.x*.22);
  const roughness=(mode==='wasteland'?.105:mode==='harbor'?.055:.035);
  const travelTarget=clamp(noise*roughness*clamp(speed/32,0,1)+s.impact*.085,-.12,.24);
  const k=24/(.65+mass*.26),damping=8.5/(.75+mass*.16);
  s.verticalSpeed+=((travelTarget-s.height)*k-s.verticalSpeed*damping)*dt;
  s.height=clamp(s.height+s.verticalSpeed*dt,-.20,.42);
  s.impact*=Math.exp(-6.4*dt);
  const forward=clamp((accelChange*.008+s.impact*.012),-.12,.16);
  const side=clamp((-c.steer*speed*.0018-c.sideVelocity*.004),-.18,.18);
  const pitchK=13/(.7+mass*.22),rollK=17/(.7+mass*.22);
  s.pitchSpeed+=((forward-s.pitch)*pitchK-6.6*s.pitchSpeed)*dt;
  s.rollSpeed+=((side-s.roll)*rollK-7.0*s.rollSpeed)*dt;
  s.pitch=clamp(s.pitch+s.pitchSpeed*dt,-.22,.22);
  s.roll=clamp(s.roll+s.rollSpeed*dt,-.22,.22);
  c.body.position.y=s.height;
  c.body.rotation.x=s.pitch;
  c.body.rotation.z=s.roll;
  const maxZ=c.garage.length*.5;
  for(const mount of c.wheelMounts){
    const sample=Math.sin(c.x*.73+c.z*.28+mount.x*1.5+mount.z*.25)*roughness*clamp(speed/38,0,1);
    const wanted=clamp(-sample-s.height-s.roll*mount.x*.42+s.pitch*mount.z*.18,-.34,.31);
    mount.velocity+=((wanted-mount.travel)*45-mount.velocity*11)*dt;
    mount.travel=clamp(mount.travel+mount.velocity*dt,-.39,.36);
    mount.group.position.y=mount.baseY+mount.travel;
    // Leve esterçamento visual nas rodas dianteiras (posição Z positiva).
    mount.group.rotation.y=mount.z>maxZ*.20?c.steer*.18:0;
  }
}

function applyCollisionVelocity(car,vx,vz){
  const forwardX=Math.sin(car.yaw),forwardZ=Math.cos(car.yaw);
  car.speed=clamp(vx*forwardX+vz*forwardZ,-27,93);
  car.sideVelocity=clamp(vx*forwardZ-vz*forwardX,-26,26);
}
function velocityComponents(car){
  return {x:Math.sin(car.yaw)*car.speed+Math.cos(car.yaw)*car.sideVelocity,
          z:Math.cos(car.yaw)*car.speed-Math.sin(car.yaw)*car.sideVelocity};
}

function moveCar(c,dt){
  if(!c.alive)return;
  c.invuln=Math.max(0,c.invuln-dt);c.ramCooldown=Math.max(0,c.ramCooldown-dt);
  c.fireCooldown=Math.max(0,c.fireCooldown-dt);c.gunCooldown=Math.max(0,c.gunCooldown-dt);
  c.boostTime=Math.max(0,c.boostTime-dt);c.damageFlash=Math.max(0,c.damageFlash-dt);
  c.shield=Math.max(0,c.shield-dt);
  c.specialCharge=Math.min(100,c.specialCharge+dt*3.3);
  c.slowTime=Math.max(0,c.slowTime-dt);
  c.gunHeat=Math.max(0,c.gunHeat-dt*25);
  if(c.gunLocked&&c.gunHeat<48)c.gunLocked=false;
  const nitro=c.useNitro&&c.nitro>1,boosted=nitro||c.boostTime>0;
  c.boosting=boosted;
  if(nitro)c.nitro=Math.max(0,c.nitro-28*dt);
  else c.nitro=Math.min(100,c.nitro+6*dt);
  const previousSpeed=c.speed;
  const maxSpeed=(boosted?81:58)*c.garage.speed*(c.damageRig.tirePunctured?.73:c.hp<23?.85:1)*(c.slowTime>0?.6:1);
  if(c.acc)c.speed+=((boosted?47:33)*(c.hp<20?.82:1)*c.garage.accel*(c.slowTime>0?.7:1))*dt;
  if(c.brake)c.speed-= (c.speed>0?60:23)*dt;
  if(!c.acc&&!c.brake)c.speed*=Math.exp(-.88*dt);
  c.speed=clamp(c.speed,-21,maxSpeed);
  const slip=c.useDrift&&Math.abs(c.speed)>11;
  const turn=1.65*c.garage.turn*(c.damageRig.tirePunctured?.73:1)*clamp(Math.abs(c.speed)/27,.22,1.22)*(slip?1.48:1);
  const yawDelta=c.steer*turn*dt*(c.speed>=0?1:-.9);
  c.yaw+=yawDelta;
  // Transferência de momento: o chassi não muda a direção do movimento de
  // forma instantânea; derrapar reduz a aderência lateral.
  c.sideVelocity-=c.speed*yawDelta*.85;
  const grip=(slip?1.7:5.4)*(c.damageRig.tirePunctured?.55:1);
  c.sideVelocity=clamp(c.sideVelocity*Math.exp(-grip*dt),-27,27);
  c.x+=(Math.sin(c.yaw)*c.speed+Math.cos(c.yaw)*c.sideVelocity)*dt;
  c.z+=(Math.cos(c.yaw)*c.speed-Math.sin(c.yaw)*c.sideVelocity)*dt;
  if(slip){c.driftTime+=dt;if(Math.random()<.3)emitSpark(c.x-Math.sin(c.yaw)*2,c.z-Math.cos(c.yaw)*2,0xebba69,2,3);}
  else if(c.driftTime>0){
    if(c.driftTime>.64){c.boostTime=Math.max(c.boostTime,clamp(c.driftTime*.5,.4,1.6));
      c.nitro=Math.min(100,c.nitro+clamp(c.driftTime*7,4,21));
      if(c.isPlayer){showToast('⚡ BÔNUS DE DERRAPAGEM!',.85);playSound('drift');}}
    c.driftTime=0;
  }
  c.drifting=slip;
  // A câmera acompanha o veículo; W avança na direção em que o capô aponta.
  if(mode==='wasteland'){
    const r=Math.hypot(c.x,c.z);
    if(r>ARENA_RADIUS-5){
      const nx=c.x/r,nz=c.z/r;c.x=nx*(ARENA_RADIUS-5);c.z=nz*(ARENA_RADIUS-5);
      if(c.ramCooldown<=0&&Math.abs(c.speed)>13){takeDamage(c,8,null);emitBurst(c.x,c.z,0xf3ae62,12);c.ramCooldown=.7;}
      c.speed*=-.32;c.sideVelocity*=-.32;
      c.suspension.impact+=.65;
    }
  }else{
    const limit=ARENA_RADIUS-6;
    if(Math.abs(c.x)>limit||Math.abs(c.z)>limit){
      c.x=clamp(c.x,-limit,limit);c.z=clamp(c.z,-limit,limit);
      if(c.ramCooldown<=0&&Math.abs(c.speed)>13){takeDamage(c,8,null);emitBurst(c.x,c.z,0xf3ae62,12);c.ramCooldown=.7;}
      c.speed*=-.32;c.sideVelocity*=-.32;
      c.suspension.impact+=.65;
    }
  }
  c.group.position.set(c.x,.66,c.z);
  c.group.rotation.y=c.yaw;
  updateVehicleSuspension(c,dt,c.speed-previousSpeed);
  c.body.rotation.y=lerp(c.body.rotation.y,slip?-c.steer*.12:0,1-Math.exp(-8*dt));
  if(c.invuln>0)c.group.visible=Math.sin(elapsed*22)>-.5;else c.group.visible=true;
  c.sprite.visible=!c.isPlayer;
  if(boosted&&Math.random()<.7){
    emitSpark(c.x-Math.sin(c.yaw)*4+rand(-1,1),c.z-Math.cos(c.yaw)*4+rand(-1,1),choose([0xffa12d,0x7ceaff,0xff6b54]),2,3);
  }
  c.smokeClock-=dt;
  if(c.hp<48&&c.smokeClock<=0){emitSmoke(c.x,c.z,c.hp<19?0x222b31:0x777a7c);c.smokeClock=c.hp<19?.06:.14;}
}

function doCollisions(dt){
  for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
    const a=cars[i],b=cars[j];if(!a.alive||!b.alive)continue;
    let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
    if(d>a.radius+b.radius)continue;
    if(d<.01){dx=1;dz=0;d=1;}
    const nx=dx/d,nz=dz/d,overlap=a.radius+b.radius-d;
    const totalMass=a.garage.mass+b.garage.mass;
    a.x-=nx*overlap*(b.garage.mass/totalMass);a.z-=nz*overlap*(b.garage.mass/totalMass);
    b.x+=nx*overlap*(a.garage.mass/totalMass);b.z+=nz*overlap*(a.garage.mass/totalMass);
    const av=velocityComponents(a),bv=velocityComponents(b);
    const vax=av.x,vaz=av.z,vbx=bv.x,vbz=bv.z;
    const relative=Math.hypot(vax-vbx,vaz-vbz);
    const closing=Math.max(0,(vax-vbx)*nx+(vaz-vbz)*nz);
    if(closing>0){
      const ma=a.garage.mass,mb=b.garage.mass;
      const impulse=clamp((1+.34)*closing/(1/ma+1/mb),0,130);
      applyCollisionVelocity(a,vax-impulse*nx/ma,vaz-impulse*nz/ma);
      applyCollisionVelocity(b,vbx+impulse*nx/mb,vbz+impulse*nz/mb);
      a.suspension.impact+=clamp(closing*.025,0,2.4);
      b.suspension.impact+=clamp(closing*.025,0,2.4);
      a.suspension.rollSpeed-=nz*closing*.004;
      b.suspension.rollSpeed+=nz*closing*.004;
    }
    if(a.ramCooldown>0||b.ramCooldown>0||relative<7)continue;
    a.ramCooldown=.64;b.ramCooldown=.64;
    const raw=clamp((relative-7)*.59,3,33);
    const aOffense=(vax*nx+vaz*nz),bOffense=-(vbx*nx+vbz*nz);
    const aDmg=raw*(b.garage.mass/a.garage.mass)**.56*(bOffense>aOffense?1.15:.82);
    const bDmg=raw*(a.garage.mass/b.garage.mass)**.56*(aOffense>bOffense?1.15:.82);
    takeDamage(a,aDmg,b);takeDamage(b,bDmg,a);
    // A resposta de velocidade já veio do impulso de conservação de momento.
    a.yaw-=clamp((bOffense-aOffense)*.004,-.28,.28);
    b.yaw+=clamp((aOffense-bOffense)*.004,-.28,.28);
    emitBurst((a.x+b.x)*.5,(a.z+b.z)*.5,choose([0xffd44a,0xff6881,0xddeafa]),Math.round(raw*.8+8));
    if(a.isPlayer||b.isPlayer){shake=clamp(relative*.014,.13,.66);playSound('crash');
      const target=a.isPlayer?b:a;if(raw>12)showCombo(`💥 BATIDA EM ${target.name}! +${Math.round(raw*8)}`);
    }
    for(const [victim,attacker,dmg] of [[a,b,aDmg],[b,a,bDmg]]){
      attacker.score+=Math.round(dmg*8);attacker.nitro=Math.min(100,attacker.nitro+dmg*.23);
      if(!victim.alive&&attacker.isPlayer){showToast('🔥 ELIMINAÇÃO! +500',1.8);}
    }
  }
  // Colisão de lataria contra cobertura e obstáculos sólidos.
  for(const c of cars){if(!c.alive)continue;
    for(const o of obstacles){if(o.level!==mode)continue;
      const dx=c.x-o.x,dz=c.z-o.z,d=Math.hypot(dx,dz);if(d>=o.r+c.radius)continue;
      const nx=dx/(d||1),nz=dz/(d||1);c.x=o.x+nx*(o.r+c.radius);c.z=o.z+nz*(o.r+c.radius);
      if(c.ramCooldown<=0&&Math.abs(c.speed)>12){takeDamage(c,Math.min(16,Math.abs(c.speed)*.2),null);c.ramCooldown=.72;emitBurst(c.x,c.z,0xe0bd86,11);if(c.isPlayer){shake=.25;playSound('crash');}}
      const v=velocityComponents(c),penetration=v.x*nx+v.z*nz;
      if(penetration<0){
        const e=.25,normalImpulse=(1+e)*penetration;
        applyCollisionVelocity(c,(v.x-normalImpulse*nx)*.77,(v.z-normalImpulse*nz)*.77);
      }
      c.suspension.impact+=.55;
    }
  }
  for(const crate of crates){if(crate.level!==mode)continue;
    if(!crate.alive)continue;
    for(const c of cars){if(!c.alive)continue;
      const d=Math.hypot(c.x-crate.x,c.z-crate.z);if(d>crate.r+c.radius)continue;
      if(Math.abs(c.speed)>16/Math.sqrt(c.garage.mass)){
        crate.alive=false;crate.group.visible=false;emitBurst(crate.x,crate.z,0xf3b368,18,4);
        c.score+=45;c.speed*=.74;if(c.isPlayer){playSound('crate');showCombo('📦 CAIXA DESTRUÍDA! +45');}
      }else{
        const nx=(c.x-crate.x)/(d||1),nz=(c.z-crate.z)/(d||1);
        c.x+=nx*.25;c.z+=nz*.25;c.speed*=-.15;
      }
    }
  }
}
// Impacto localizado: registra afundamento permanente da chapa mais próxima
// da direção do choque. Ao contrário do desgaste global, o lado atingido importa.
function deformImpactPanel(car,amount,attacker){
  const panels=car.damageRig?.panels;
  if(!panels?.length)return;
  let side='bumper';
  if(attacker){
    const dx=attacker.x-car.x,dz=attacker.z-car.z;
    const localX=dx*Math.cos(car.yaw)-dz*Math.sin(car.yaw);
    const localZ=dx*Math.sin(car.yaw)+dz*Math.cos(car.yaw);
    if(Math.abs(localX)>Math.abs(localZ)*.52)side=localX>0?'right':'left';
    else side=localZ>0?'hood':'bumper';
  }
  const panel=panels.find(p=>p.key===side&&!p.detached)||panels.find(p=>!p.detached);
  if(!panel)return;
  panel.dent=clamp(panel.dent+amount*.009,0,.48);
  car.damageSide=side;
}

function takeDamage(car,amount,attacker){
  if(!car.alive||car.invuln>0)return;
  if(car.shield>0)amount*=.15;
  amount/=car.garage.armor;
  if(amount<=0)return;
  car.hp=Math.max(0,car.hp-amount);
  car.damageImpacts++;
  deformImpactPanel(car,amount,attacker);
  syncDamageVisuals(car);
  if(car.hp<50){car.paint.color.setHex(0x655f56);car.body.rotation.x=.025;}
  if(car.isPlayer&&amount>8)shake=Math.max(shake,Math.min(.35,amount*.014));
  if(attacker)car.lastAttacker=attacker;
  if(car.hp<=0){
    emitExplosion(car.x,car.z,0xff9049,35,6);playSound('explosion');
    const killer=attacker||car.lastAttacker;
    if(killer&&killer!==car){killer.wrecks++;killer.score+=500;killer.nitro=Math.min(100,killer.nitro+20);}
    if(mode==='wasteland'||mode==='city'||mode==='harbor'){
      car.alive=false;car.group.visible=true;car.sprite.visible=false;
      car.paint.color.setHex(0x28272a);car.body.rotation.z=.22;car.body.rotation.x=.11;syncDamageVisuals(car);
      car.group.position.y=.15;
      if(car.isPlayer){endGame('wreck');return;}
      if(killer?.isPlayer)showToast(`💀 ${car.name} ELIMINADO!`,2);
      if(cars.filter(c=>c.alive).length===1&&player.alive){endGame('victory');}
    }

  }
}
function collectItems(dt){
  for(const p of pickups){
    if(p.level!==mode)continue;
    if(p.respawn>0){p.respawn-=dt;if(p.respawn<=0)p.group.visible=true;continue;}
    for(const c of cars){if(!c.alive||Math.hypot(c.x-p.x,c.z-p.z)>c.radius+1.8)continue;
      p.respawn=10;p.group.visible=false;
      if(c.hp<40&&Math.random()<.55){c.hp=Math.min(100,c.hp+36);syncDamageVisuals(c);}
      else if(c.item===null)c.item=choose(PICKUP_TYPES);
      else if(c.ammo<12)c.ammo+=2;
      else c.nitro=Math.min(100,c.nitro+30);
      c.ammo=Math.min(15,c.ammo+1);c.score+=45;
      if(c.isPlayer){showToast('📦 SUPRIMENTOS COLETADOS!',1.1);playSound('pickup');}
      break;
    }
  }
}
function useItem(c){
  if(!c.item||!c.alive)return;
  const t=c.item;c.item=null;
  if(t==='shield'){c.shield=8;if(c.isPlayer)showToast('🛡️ ESCUDO ATIVADO!',1.4);playSound('shield');}
  if(t==='emp'){
    emitBurst(c.x,c.z,0x8df9ff,45,7);playSound('emp');
    for(const enemy of cars)if(enemy!==c&&enemy.alive&&vec2Dist(c,enemy)<26){
      takeDamage(enemy,24,c);enemy.speed*=.55;c.score+=45;
    }
    if(c.isPlayer)showToast('⚡ ONDA DE CHOQUE!',1.4);
  }
  if(t==='repair'){c.hp=Math.min(100,c.hp+45);syncDamageVisuals(c);if(c.isPlayer)showToast('💚 BLINDAGEM REPARADA!',1.4);playSound('pickup');}
  if(t==='boost'){c.nitro=Math.min(100,c.nitro+80);c.boostTime=3.2;if(c.isPlayer)showToast('🔥 SUPER NITRO!',1.4);playSound('boost');}
  if(t==='mine'){
    const x=c.x-Math.sin(c.yaw)*6,z=c.z-Math.cos(c.yaw)*6;
    const obj=sphere(1.4,mat(0xfa4c68,.3,.5,{emissive:0xb91e41,emissiveIntensity:.6}),x,1.4,z);
    mines.push({mesh:obj,x,z,owner:c,ttl:18,arm:.5});if(c.isPlayer)showToast('💣 MINA IMPLANTADA!',1.2);playSound('pickup');
  }
}
function fireMachineGun(c){
  if(!c||!c.alive||c.gunCooldown>0||c.gunLocked)return false;
  c.gunCooldown=.125;c.gunHeat=Math.min(100,c.gunHeat+7.8);
  if(c.gunHeat>=98){c.gunLocked=true;if(c.isPlayer)showToast('⚠ ARMA SUPERAQUECIDA!',.9);}
  const dx=Math.sin(c.yaw),dz=Math.cos(c.yaw),muzzleX=c.x+dx*(c.garage.length*.43+1),muzzleZ=c.z+dz*(c.garage.length*.43+1);
  let nearest=null,distance=88;
  for(const enemy of cars){if(enemy===c||!enemy.alive)continue;
    const ox=enemy.x-muzzleX,oz=enemy.z-muzzleZ,along=ox*dx+oz*dz;
    if(along<=0||along>85||along>=distance)continue;
    const lateral=Math.abs(ox*dz-oz*dx);
    if(lateral<enemy.radius+along*.018){nearest=enemy;distance=along;}
  }
  const cover=firstCoverOnLine(muzzleX,muzzleZ,muzzleX+dx*distance,muzzleZ+dz*distance,.1);
  if(cover){
    const clipped=Math.max(.4,distance*cover.t);
    if(clipped<distance){distance=clipped;nearest=null;}
  }
  const endX=muzzleX+dx*distance,endZ=muzzleZ+dz*distance;
  const geometry=new THREE.CylinderGeometry(.065,.095,distance,5);
  const tracer=mesh(geometry,new THREE.MeshBasicMaterial({color:c.isPlayer?0xffe28a:0xff6d62,transparent:true,opacity:.85}),
    (muzzleX+endX)*.5,2.95,(muzzleZ+endZ)*.5);
  tracer.rotation.x=Math.PI/2;tracer.rotation.y=c.yaw;tracer.castShadow=false;
  tracers.push({mesh:tracer,ttl:.075});
  if(Math.random()<.7)emitSpark(muzzleX,muzzleZ,0xffdb83,1,1.4);
  if(nearest){
    const damage=6*c.garage.damage;takeDamage(nearest,damage,c);c.score+=Math.round(damage*5);
    if(c.isPlayer&&Math.random()<.19)showCombo(`✹ ${nearest.name} ATINGIDO!`);
    emitSpark(nearest.x,nearest.z,0xffa95e,2,1.7);
  }
  if(c.isPlayer)playSound('gun');
  return true;
}
function useSpecial(c){
  if(!c||!c.alive||c.specialCharge<100)return false;
  c.specialCharge=0;
  const kind=c.garage.specialType;
  const enemies=cars.filter(e=>e!==c&&e.alive);
  const near=(range)=>enemies.filter(e=>vec2Dist(c,e)<=range+e.radius);
  const forward=(range,angle=.7)=>near(range).filter(e=>aimTo(c,e)<angle);
  if(kind==='ram'){
    c.shield=Math.max(c.shield,3);c.boostTime=Math.max(c.boostTime,2.4);
    for(const e of near(19)){takeDamage(e,27,c);e.speed*=.5;}
    emitBurst(c.x,c.z,0xffd87f,40,7);
  }else if(kind==='rockets'){
    c.ammo=Math.min(15,c.ammo+3);
    for(const spread of [-.23,0,.23])fireRocket(c,true,spread);
    emitBurst(c.x,c.z,0x67efff,21,3);
  }else if(kind==='pulse'){
    c.hp=Math.min(100,c.hp+28);syncDamageVisuals(c);c.shield=Math.max(c.shield,4.5);
    for(const e of near(31)){takeDamage(e,19,c);e.speed*=.35;}
    emitBurst(c.x,c.z,0x97aafc,50,8);
  }else if(kind==='horn'){
    c.boostTime=Math.max(c.boostTime,1.7);
    for(const e of forward(33,1.05)){takeDamage(e,36,c);e.speed*=.28;e.slowTime=Math.max(e.slowTime,2.2);}
    emitBurst(c.x+Math.sin(c.yaw)*9,c.z+Math.cos(c.yaw)*9,0xf4ce69,48,8);
  }else if(kind==='crusher'){
    let hits=0;
    for(const e of forward(22,.94)){takeDamage(e,49,c);e.speed*=.18;e.slowTime=Math.max(e.slowTime,3);hits++;}
    if(hits){c.hp=Math.min(100,c.hp+Math.min(24,hits*12));syncDamageVisuals(c);}
    c.shield=Math.max(c.shield,2.5);
    emitBurst(c.x+Math.sin(c.yaw)*5,c.z+Math.cos(c.yaw)*5,0x8bc76d,45,6);
  }else if(kind==='frost'){
    if(c.vehicleIndex===5){
      for(const spread of [-.34,-.17,0,.17,.34])spawnCandyRocket(c,spread,94+Math.abs(spread)*8);
      c.boostTime=Math.max(c.boostTime,1.2);c.shield=Math.max(c.shield,1.35);c.nitro=Math.min(100,c.nitro+12);
      emitBurst(c.x,c.z,0xf8b7ff,46,7);emitCandyConfetti(c.x,c.z,34,5);emitSweetToothBurst(c,36);
      playSound('pickup');
    }else{
      for(const e of near(31)){takeDamage(e,17,c);e.slowTime=Math.max(e.slowTime,5);e.speed*=.37;}
      emitBurst(c.x,c.z,0x9eebff,65,10);
    }
  }else if(kind==='hook'){
    const target=forward(48,.52).sort((a,b)=>vec2Dist(c,a)-vec2Dist(c,b))[0];
    if(target){const dist=vec2Dist(c,target),pull=clamp(dist-6,0,20);
      target.x-=(target.x-c.x)/Math.max(dist,.01)*pull;
      target.z-=(target.z-c.z)/Math.max(dist,.01)*pull;
      target.speed*=.26;target.slowTime=Math.max(target.slowTime,1.6);
      takeDamage(target,32,c);}
    c.shield=Math.max(c.shield,2);
    emitBurst(c.x+Math.sin(c.yaw)*8,c.z+Math.cos(c.yaw)*8,0xffb770,36,5);
  }else if(kind==='water'){
    for(const e of forward(41,.85)){takeDamage(e,29,c);e.speed*=.33;e.slowTime=Math.max(e.slowTime,2.6);
      const dist=Math.max(1,vec2Dist(c,e));e.x+=(e.x-c.x)/dist*8;e.z+=(e.z-c.z)/dist*8;}
    c.shield=Math.max(c.shield,2.8);
    emitBurst(c.x+Math.sin(c.yaw)*7,c.z+Math.cos(c.yaw)*7,0x6bcfff,55,9);
  }else if(kind==='siren'){
    for(const e of near(35)){takeDamage(e,22,c);e.slowTime=Math.max(e.slowTime,4);e.speed*=.3;}
    c.nitro=Math.min(100,c.nitro+35);
    emitBurst(c.x,c.z,0x5b88ff,55,8);
  }else if(kind==='stomp'){
    c.invuln=Math.max(c.invuln,.9);
    for(const e of near(24)){takeDamage(e,41,c);e.speed*=.22;e.slowTime=Math.max(e.slowTime,2.2);}
    for(const crate of crates){if(crate.level===mode&&crate.alive&&Math.hypot(crate.x-c.x,crate.z-c.z)<21){crate.alive=false;crate.group.visible=false;}}
    emitBurst(c.x,c.z,0xe7a3ff,70,9);
  }
  if(c.isPlayer)showToast(`☄ ${c.garage.special}!`,1.8);
  c.score+=120;playSound('emp');return true;
}
function fireRocket(c,force=false,spread=0){
  if(!c.alive||c.ammo<=0||(!force&&c.fireCooldown>0))return;
  c.ammo--;if(!force)c.fireCooldown=.95;
  const g=new THREE.Group();scene.add(g);
  const shell=cylinder(.55,.5,2.0,mat(0xf3f1e8,.45),0,0,0,g);shell.rotation.x=Math.PI/2;
  const tip=mesh(new THREE.ConeGeometry(.56,.85,10),mat(0xff5a58,.38,.2,{emissive:0xa7262b,emissiveIntensity:.5}),0,0,1.35,g);tip.rotation.x=Math.PI/2;
  sphere(.48,mat(0xffbf35,.24,.1,{emissive:0xff8a1e,emissiveIntensity:1.6}),0,0,-1.2,g);
  const angle=c.yaw+spread;g.position.set(c.x+Math.sin(angle)*(c.garage.length*.42+1),2.8,c.z+Math.cos(angle)*(c.garage.length*.42+1));g.rotation.y=angle;
  missiles.push({mesh:g,x:g.position.x,z:g.position.z,yaw:angle,speed:113,owner:c,ttl:1.9});
  playSound('rocket');
}
function updateMissiles(dt){
  for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.ttl-=dt;if(t.ttl<=0){scene.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.dispose();tracers.splice(i,1);}}
  for(let i=missiles.length-1;i>=0;i--){
    const m=missiles[i],oldX=m.x,oldZ=m.z;
    m.ttl-=dt;m.x+=Math.sin(m.yaw)*m.speed*dt;m.z+=Math.cos(m.yaw)*m.speed*dt;
    const cover=firstCoverOnLine(oldX,oldZ,m.x,m.z,.3);
    if(cover){
      const x=lerp(oldX,m.x,cover.t),z=lerp(oldZ,m.z,cover.t);
      m.x=x;m.z=z;
      if(cover.crate){cover.object.alive=false;cover.object.group.visible=false;m.owner.score+=40;}
      for(const c of cars)if(c!==m.owner&&c.alive&&Math.hypot(c.x-x,c.z-z)<8.5)takeDamage(c,12,m.owner);
      emitExplosion(x,z,0xffae55,18,3.6);disposeDynamic(m.mesh);missiles.splice(i,1);continue;
    }
    m.mesh.position.set(m.x,2.8+Math.sin(elapsed*24)*.14,m.z);
    if(Math.random()<.7)emitSpark(m.x-Math.sin(m.yaw)*1.5,m.z-Math.cos(m.yaw)*1.5,0xffac36,.8,2.2);
    let hit=null;
    for(const c of cars)if(c!==m.owner&&c.alive&&Math.hypot(c.x-m.x,c.z-m.z)<c.radius+1.0){hit=c;break;}
    if(hit||m.ttl<=0){
      if(hit){
        for(const c of cars)if(c!==m.owner&&c.alive&&Math.hypot(c.x-m.x,c.z-m.z)<11){takeDamage(c,c===hit?31:14,m.owner);c.speed*=.82;}
        m.owner.score+=125;
        if(m.owner.isPlayer){showCombo(`🚀 ACERTOU ${hit.name}! +125`);shake=.2;}
        emitExplosion(m.x,m.z,0xff8c4e,32,6);playSound('explosion');
      }else emitBurst(m.x,m.z,0xffb75a,12,3);
      disposeDynamic(m.mesh);missiles.splice(i,1);
    }
  }
  for(let i=mines.length-1;i>=0;i--){
    const m=mines[i];m.ttl-=dt;m.arm-=dt;m.mesh.rotation.y+=dt*2.4;
    let hit=null;
    if(m.arm<=0)for(const c of cars)if(c!==m.owner&&c.alive&&Math.hypot(c.x-m.x,c.z-m.z)<c.radius+1.6){hit=c;break;}
    if(hit){for(const c of cars)if(c!==m.owner&&c.alive&&Math.hypot(c.x-m.x,c.z-m.z)<9){takeDamage(c,22,m.owner);c.speed*=.55;}
      m.owner.score+=110;emitExplosion(m.x,m.z,0xff5571,27,5);playSound('explosion');
    }
    if(hit||m.ttl<=0){disposeDynamic(m.mesh);mines.splice(i,1);}
  }
}
let particleGeo;
function createParticle(x,y,z,color,radius,vx,vy,vz,ttl,fade=true){
  if(debris.length>275){const old=debris.shift();scene.remove(old.mesh);old.mesh.material.dispose();}
  const m=new THREE.Mesh(particleGeo,new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));
  m.position.set(x,y,z);m.scale.setScalar(radius);m.castShadow=false;scene.add(m);
  debris.push({mesh:m,vx,vy,vz,ttl,life:ttl,fade});
}
function emitShockwave(x,z,color,scale=1){
  // Efeito de superfície com decaimento suave (limite impede estouro de draw calls).
  if(blastRings.length>=12){const old=blastRings.shift();disposeDynamic(old.mesh);}
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2*scale,.20*scale,6,32),material);
  ring.rotation.x=Math.PI/2;ring.position.set(x,.36,z);ring.castShadow=false;scene.add(ring);
  blastRings.push({mesh:ring,life:.55,ttl:.55,scale});
}
function emitExplosion(x,z,color,count=24,power=5){
  // Núcleo aditivo de curta duração: expande e desaparece, sem luzes
  // persistentes que comprometam FPS em batalha com vários oponentes.
  if(impactFlashes.length>=8){const old=impactFlashes.shift();disposeDynamic(old.mesh);}
  if(graphicsQuality!=='low'){
    const glow=new THREE.Mesh(new THREE.SphereGeometry(1.6,10,8),
      new THREE.MeshBasicMaterial({color:0xffc275,transparent:true,opacity:.83,depthWrite:false,blending:THREE.AdditiveBlending}));
    glow.position.set(x,2.4,z);glow.castShadow=false;scene.add(glow);
    impactFlashes.push({mesh:glow,ttl:.31,life:.31,power});
  }
  emitBurst(x,z,color,graphicsQuality==='low'?Math.ceil(count*.55):count,power);
  emitShockwave(x,z,color,Math.min(1.6,Math.max(.65,power/6)));
  for(let i=0;i<Math.min(count,18);i++){
    const a=rand(0,Math.PI*2),speed=rand(7,power*3.6);
    createParticle(x,rand(1.7,4.5),z,choose([0xfff3b0,0xffa347,0x4b4545]),rand(.3,1.1),Math.sin(a)*speed,rand(6,16),Math.cos(a)*speed,rand(.35,.85));
  }
}
function updateShockwaves(dt){
  for(let i=impactFlashes.length-1;i>=0;i--){
    const f=impactFlashes[i];f.ttl-=dt;
    if(f.ttl<=0){disposeDynamic(f.mesh);impactFlashes.splice(i,1);continue;}
    const t=1-f.ttl/f.life;
    f.mesh.scale.setScalar(1+t*f.power*.8);
    f.mesh.material.opacity=Math.pow(1-t,1.7)*.78;
  }
  for(let i=blastRings.length-1;i>=0;i--){
    const b=blastRings[i];b.ttl-=dt;
    if(b.ttl<=0){disposeDynamic(b.mesh);blastRings.splice(i,1);continue;}
    const t=1-b.ttl/b.life;
    b.mesh.scale.setScalar(1+t*5);b.mesh.material.opacity=(1-t)*.68;
  }
}
function emitBurst(x,z,color,count=16,power=3){
  for(let i=0;i<count;i++){
    const a=rand(0,Math.PI*2),v=rand(3,power*5+6);
    createParticle(x+rand(-1,1),1.1+rand(0,1.5),z+rand(-1,1),color,rand(.25,.75),Math.cos(a)*v,rand(4,13),Math.sin(a)*v,rand(.36,1.1));
  }
}
function emitSpark(x,z,color,count=2,power=2){
  for(let i=0;i<count;i++){
    const a=rand(0,Math.PI*2),v=rand(2,power*4);
    createParticle(x,.7+rand(0,.5),z,color,rand(.15,.42),Math.cos(a)*v,rand(1,4),Math.sin(a)*v,rand(.25,.64));
  }
}
function emitSmoke(x,z,color){createParticle(x,2,z,color,rand(.65,1),rand(-1.5,1.5),rand(1.2,3),rand(-1.5,1.5),rand(.7,1.4));}
function updateParticles(dt){
  for(let i=debris.length-1;i>=0;i--){
    const p=debris[i];p.ttl-=dt;
    if(p.ttl<=0){scene.remove(p.mesh);p.mesh.material.dispose();debris.splice(i,1);continue;}
    p.vy-=13*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;
    p.mesh.position.y=Math.max(.11,p.mesh.position.y);
    if(p.mesh.position.y<=.12)p.vy=Math.abs(p.vy)*.25;
    p.mesh.material.opacity=p.ttl/p.life;
  }
}
function updateWorldVisual(dt){
  visualClock+=dt;
  for(const p of pickups){if(!p.group.visible)continue;p.group.rotation.y+=dt*1.4;p.group.position.y=p.baseY+Math.sin(visualClock*3+p.x)*.52;p.ring.rotation.x+=dt*1.4;}
  for(const c of cars){if(c.shield>0&&c.alive){
    if(!c.shieldMesh){
      const material=new THREE.MeshBasicMaterial({color:0x53eaff,transparent:true,opacity:.15,wireframe:true,depthWrite:false});
      c.shieldMesh=mesh(new THREE.SphereGeometry(4.5,12,8),material,0,1.2,0,c.group);c.shieldMesh.castShadow=false;
    }
    c.shieldMesh.visible=true;c.shieldMesh.rotation.y+=dt*1.6;
  }else if(c.shieldMesh)c.shieldMesh.visible=false;}
  for(const c of cars){
    if(c.damageRig?.fireGroup?.visible){c.damageRig.fireGroup.scale.y=1+Math.sin(visualClock*14+c.id)*.16;}
    if(!c.alive && c.burnTime>0){c.burnTime-=dt;c.smokeClock-=dt;if(c.smokeClock<=0){emitSmoke(c.x,c.z,0x252a2f);c.smokeClock=.14;}
      if(c.burnTime<=0)c.damageRig.fireGroup.visible=false;}
    if(c.assetFx&&c.alive)updateVehicleAssetFx(c,dt);
  }
  if(gameState==='playing')for(const c of cars){
    if(!c.alive)continue;
    for(const wheel of c.wheels)wheel.rotation.x+=dt*c.speed*.53;
  }
  updateShockwaves(dt);updateScrapParts(dt);updateParticles(dt);
}
function updateCamera(dt){
  if(!player)return;
  const reverse=held.has('KeyC');
  const backward=reverse?-1:1;
  const forward=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
  const wanted=new THREE.Vector3(player.x-forward.x*23*backward,13+Math.abs(player.speed)*.045,player.z-forward.z*23*backward);
  if(shake>0){wanted.x+=rand(-shake,shake)*1.6;wanted.y+=rand(-shake,shake);wanted.z+=rand(-shake,shake)*1.6;shake=Math.max(0,shake-dt*1.7);}
  camera.position.lerp(wanted,1-Math.exp(-dt*6.5));
  const target=new THREE.Vector3(player.x+forward.x*8*backward,2.8,player.z+forward.z*8*backward);
  followLook.lerp(target,1-Math.exp(-dt*7.2));camera.lookAt(followLook);
  const fov=lerp(62,73,clamp(Math.abs(player.speed)/90,0,1));
  if(Math.abs(camera.fov-fov)>.07){camera.fov=lerp(camera.fov,fov,dt*3);camera.updateProjectionMatrix();}
}
function drawMinimap(){
  const c=$('minimap'),ctx=c.getContext('2d');ctx.clearRect(0,0,220,170);
  ctx.fillStyle='#0c1424df';ctx.fillRect(0,0,220,170);
  const project=(x,z)=>[110+x*.79,88+z*.69];
  ctx.strokeStyle='#edac56';ctx.lineWidth=3;ctx.beginPath();
  if(mode==='wasteland')ctx.ellipse(110,88,ARENA_RADIUS*.79,ARENA_RADIUS*.69,0,0,Math.PI*2);
  else ctx.rect(110-ARENA_RADIUS*.79,88-ARENA_RADIUS*.69,ARENA_RADIUS*1.58,ARENA_RADIUS*1.38);
  ctx.stroke();
  for(const o of obstacles){if(o.level!==mode)continue;const [x,y]=project(o.x,o.z);ctx.fillStyle='#667584';ctx.beginPath();ctx.arc(x,y,Math.max(2,o.r*.46),0,Math.PI*2);ctx.fill();}
  for(const p of pickups){if(p.level!==mode||!p.group.visible)continue;const [x,y]=project(p.x,p.z);ctx.fillStyle='#52e0e9';ctx.fillRect(x-1.4,y-1.4,2.8,2.8);}
  for(const car of cars){if(!car.alive)continue;const [x,y]=project(car.x,car.z);
    ctx.fillStyle=car.isPlayer?'#ffe27a':'#ff6775';ctx.beginPath();ctx.arc(x,y,car.isPlayer?4.6:3,0,Math.PI*2);ctx.fill();
    if(car.isPlayer){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(car.yaw)*10,y+Math.cos(car.yaw)*10);ctx.stroke();}
  }
}
function updateUI(force=false){
  if(!player)return;
  if(!force&&elapsed-lastUi<.1)return;
  lastUi=elapsed;
  $('time').textContent=fmtTime(elapsed);
  $('position').innerHTML=`${cars.filter(c=>c.alive).length}<span class="slash"> / 8</span>`;
  $('lap').innerHTML=`${player.wrecks} <span class="slash">KOs</span>`;
  $('score').textContent=Math.floor(player.score).toLocaleString('pt-BR');
  $('hpFill').style.width=`${player.hp}%`;$('hpText').textContent=`${Math.round(player.hp)}%`;
  $('nitroFill').style.width=`${player.nitro}%`;$('nitroText').textContent=`${Math.round(player.nitro)}%`;
  $('specialFill').style.width=`${player.specialCharge}%`;
  $('specialText').textContent=player.specialCharge>=100?'PRONTO [Q]':`${Math.round(player.specialCharge)}%`;
  $('heatFill').style.width=`${player.gunHeat}%`;
  $('heatText').textContent=player.gunLocked?'QUENTE!':`${Math.round(player.gunHeat)}%`;
  $('speed').textContent=String(Math.round(Math.abs(player.speed)*3));
  $('itemIcon').textContent=player.item?ITEMS[player.item][0]:'?';
  $('itemName').textContent=player.item?ITEMS[player.item][1]:'VAZIO';
  $('ammo').textContent=`× ${player.ammo}`;
  if(toastUntil&&elapsed>toastUntil){$('toast').classList.remove('show');toastUntil=0;}
  if(comboUntil&&elapsed>comboUntil){$('combo').classList.remove('show');comboUntil=0;}
  if(showAiPlans){
    const labels={hunt:'PERSEGUINDO',flank:'FLANQUEANDO',ambush:'EM COBERTURA',resupply:'SUPRIMENTOS',retreat:'RECUANDO',unstuck:'DESATOLANDO'};
    $('aiStatus').textContent=cars.filter(c=>!c.isPlayer&&c.alive).map(c=>`${c.name} · ${labels[c.aiState]||c.aiState} · ${Math.ceil(c.hp)}%`).join('\n');
  }
  if(elapsed-lastMap>.13){lastMap=elapsed;drawMinimap();}
}
function initializeAudio(){
  if(audio.muted)return;
  try{
    if(!audio.ctx)audio.ctx=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.ctx.state==='suspended')audio.ctx.resume();
    if(!audio.engine){
      audio.engine=audio.ctx.createOscillator();audio.engine.type='sawtooth';
      audio.filter=audio.ctx.createBiquadFilter();audio.filter.type='lowpass';audio.filter.frequency.value=430;
      audio.engineGain=audio.ctx.createGain();audio.engineGain.gain.value=0;
      audio.engine.connect(audio.filter).connect(audio.engineGain).connect(audio.ctx.destination);audio.engine.start();
    }
  }catch(err){console.warn('Áudio indisponível:',err);}
}
function stopEngine(){if(audio.engineGain&&audio.ctx)audio.engineGain.gain.setTargetAtTime(0,audio.ctx.currentTime,.07);}
function note(freq,duration,type='square',volume=.075,slide=1){
  if(audio.muted||!audio.ctx)return;
  try{
    const now=audio.ctx.currentTime,osc=audio.ctx.createOscillator(),gain=audio.ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(Math.max(20,freq),now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain).connect(audio.ctx.destination);osc.start(now);osc.stop(now+duration+.02);
  }catch(err){console.warn('Erro no som',err);}
}
function playSound(type){
  if(audio.muted||!audio.ctx)return;
  if(type==='start'){note(390,.15,'triangle',.09,1.3);note(630,.3,'square',.04,1.5);}
  if(type==='crash'){note(95,.24,'sawtooth',.13,.32);note(59,.3,'triangle',.12,.55);}
  if(type==='rocket')note(780,.23,'sawtooth',.065,.23);
  if(type==='gun')note(190,.045,'sawtooth',.025,.51);
  if(type==='explosion'){note(140,.41,'sawtooth',.18,.2);note(60,.46,'triangle',.12,.55);}
  if(type==='pickup'){note(630,.1,'sine',.075,1.3);note(940,.16,'triangle',.06,1.25);}
  if(type==='boost')note(290,.4,'sawtooth',.06,2.4);
  if(type==='drift')note(530,.18,'triangle',.07,1.9);
  if(type==='lap'){note(520,.17,'square',.06,1.2);note(790,.18,'square',.04,1.35);}
  if(type==='shield')note(370,.34,'sine',.09,1.9);
  if(type==='emp'){note(850,.5,'sawtooth',.075,.18);}
  if(type==='crate')note(180,.19,'triangle',.11,.5);
  if(type==='win'){note(440,.22,'triangle',.08,1.5);note(660,.33,'triangle',.07,1.5);}
  if(type==='lose')note(420,.5,'sawtooth',.065,.45);
}
function updateAudio(dt){
  if(!audio.ctx||!audio.engine||!player)return;
  audio.engine.frequency.setTargetAtTime(42+Math.abs(player.speed)*3.6,audio.ctx.currentTime,.045);
  audio.filter.frequency.setTargetAtTime(235+Math.abs(player.speed)*12,audio.ctx.currentTime,.06);
  audio.engineGain.gain.setTargetAtTime(audio.muted?0:clamp(.035+Math.abs(player.speed)*.001,.03,.13),audio.ctx.currentTime,.08);
  if(audio.muted)return;
  audio.musicAt-=dt;
  if(audio.musicAt<=0){
    const bass=[110,110,146.83,164.81,110,130.81,146.83,98.0];
    const melody=[440,0,587.33,0,659.25,587.33,440,392];
    const b=audio.beat%8;
    if(b%2===0)note(bass[b],.14,'triangle',.025,.98);
    if(melody[b])note(melody[b],.11,'square',.011,1);
    audio.beat++;audio.musicAt=.31;
  }
}
function update(dt){
  elapsed+=dt;
  updatePlayerInput();
  for(const c of cars)if(c!==player)aiSteer(c,dt);
  for(const c of cars)moveCar(c,dt);
  if(held.has('KeyJ')||held.has('Mouse0'))fireMachineGun(player);
  if(gameState!=='playing')return;
  doCollisions(dt);
  if(gameState!=='playing')return;
  collectItems(dt);updateMissiles(dt);
  if(gameState!=='playing')return;
  updateCamera(dt);updateUI();updateAudio(dt);
}
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),.045);
  if(gameState==='playing')update(dt);
  else if(gameState==='menu'){
    const t=performance.now()*.00011;
    camera.position.set(Math.sin(t)*160,68,Math.cos(t)*160);camera.lookAt(0,0,0);
  }
  if(scene){updateWorldVisual(dt);renderer.render(scene,camera);}
  frameCount++;frameAccumulator+=dt;
  if(frameAccumulator>=1){const fps=Math.round(frameCount/frameAccumulator);$('fpsText').textContent=fps+' FPS · '+({low:'LEVE',medium:'EQUILIBRADO',high:'ALTO'}[graphicsQuality]);frameCount=0;frameAccumulator=0;}
}
function chooseGraphicsQuality(value){
  graphicsQuality=['low','medium','high'].includes(value)?value:'medium';
  if(!renderer)return;
  renderer.shadowMap.enabled=graphicsQuality!=='low';
  const resolution=graphicsQuality==='high'?2048:1024;
  if(sun.shadow.mapSize.x!==resolution){
    sun.shadow.mapSize.set(resolution,resolution);
    if(sun.shadow.map){sun.shadow.map.dispose?.();sun.shadow.map=null;}
  }
  resize();
}
function resize(){
  if(!renderer)return;
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  const limit=graphicsQuality==='high'?(innerWidth<750?1.5:1.8):graphicsQuality==='medium'?(innerWidth<750?1.1:1.35):1;
  renderer.setPixelRatio(Math.min(devicePixelRatio,limit));
}
function populateGarage(){
  const thumbs=['marauder','phantom','titan','omega-bus','grinder','frost-van','hookjaw','inferno','sentinel','goliath','reaper-bike'];
  const grid=document.getElementById('garageGrid');
  if(!grid)return;
  grid.innerHTML=GARAGE.map((v,i)=>{
    const speed=Math.min(5,Math.max(1,Math.round(v.speed*4)));
    const armor=Math.min(5,Math.max(1,Math.round(v.armor*3)));
    const force=Math.min(5,Math.max(1,Math.round(v.mass*2)));
    const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
    return `<button class="garage-card ${i===garageChoice?'active':''}" data-vehicle="${i}" aria-pressed="${i===garageChoice}">
      <span class="car-stripe" style="background:#${v.color.toString(16).padStart(6,'0')}"></span>
      <img class="garage-thumb" src="${i===5?'previews/clown-cream-carnage-v7.7-thumb.jpg':`previews/modelo-${thumbs[i]}-${thumbs[i]==='reaper-bike'?'v7.4':'v7.3'}.png`}" alt="Modelo 3D de ${v.name}" loading="lazy"><b>${v.name}</b><small>${v.className}</small>
      <span class="special-name">☄ ${v.special}</span>
      <em>BLINDAGEM ${stars(armor)}<br>VELOCIDADE ${stars(speed)}<br>IMPACTO ${stars(force)}</em>
    </button>`;
  }).join('');
}
function registerControls(){
  populateGarage();updateGarageAssetBadge();
  document.querySelectorAll('.garage-card').forEach(btn=>btn.addEventListener('click',()=>{
    garageChoice=Number(btn.dataset.vehicle)||0;document.querySelectorAll('.garage-card').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.garage-card').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    updateGarageAssetBadge();
    if(gltfAssetLoader&&VEHICLE_GLB[garageChoice])void loadVehicleTemplate(garageChoice);
  }));
  $('invertToggle').addEventListener('change',ev=>{invertSteering=!!ev.target.checked;});
  $('retryAssetsBtn')?.addEventListener('click',()=>{
    loaderError='';vehicleAssetState.clear();updateGarageAssetBadge();
    if(gltfAssetLoader){
      const current=garageChoice;
      // Forçar nova tentativa somente para os modelos que ainda falharam.
      if(!loadedVehicleTemplates.has(current))void loadVehicleTemplate(current);
    }else void startVehicleAssets();
  });
  $('qualitySelect').addEventListener('change',ev=>chooseGraphicsQuality(ev.target.value));
  $('difficultySelect').addEventListener('change',ev=>{aiDifficulty=['easy','normal','hard'].includes(ev.target.value)?ev.target.value:'normal';});
  window.addEventListener('pointerdown',ev=>{if(ev.button===0&&ev.target===renderer?.domElement)held.add('Mouse0');});
  window.addEventListener('pointerup',()=>held.delete('Mouse0'));
  for(const card of document.querySelectorAll('.mode-card'))card.addEventListener('click',()=>{
    document.querySelectorAll('.mode-card').forEach(c=>c.classList.remove('active'));card.classList.add('active');
  });
  $('startBtn').addEventListener('click',()=>resetGame(document.querySelector('.mode-card.active').dataset.mode));
  $('againBtn').addEventListener('click',()=>resetGame(mode));
  $('menuBtn').addEventListener('click',returnMenu);
  $('pauseBtn').addEventListener('click',pauseGame);$('resumeBtn').addEventListener('click',resumeGame);$('quitBtn').addEventListener('click',returnMenu);
  $('photoBtn').addEventListener('click',saveScreenshot);
  $('soundBtn').addEventListener('click',()=>{audio.muted=!audio.muted;$('soundBtn').textContent=audio.muted?'♪̸':'♫';if(!audio.muted)initializeAudio();else stopEngine();});
  window.addEventListener('keydown',ev=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(ev.code))ev.preventDefault();
    held.add(ev.code);
    if(ev.repeat)return;
    if(ev.code==='KeyP'||ev.code==='Escape'){
      if(gameState==='playing')pauseGame();else if(gameState==='paused')resumeGame();
    }
    if(ev.code==='KeyF')playerFire();
    if(ev.code==='KeyE')playerItem();
    if(ev.code==='KeyQ')playerSpecial();
    if(ev.code==='KeyR'&&gameState==='ended')resetGame(mode);
    if(ev.code==='KeyH')togglePhotoMode();
    if(ev.code==='KeyK'&&(gameState==='playing'||gameState==='paused'))saveScreenshot();
    if(ev.code==='KeyI'){showAiPlans=!showAiPlans;$('aiStatus').classList.toggle('hidden',!showAiPlans);updateUI(true);}
    if(ev.code==='Enter'&&gameState==='menu')resetGame(document.querySelector('.mode-card.active').dataset.mode);
  });
  window.addEventListener('keyup',ev=>held.delete(ev.code));
  document.querySelectorAll('[data-key]').forEach(el=>{
    const key=el.dataset.key;
    const down=e=>{e.preventDefault();held.add(key);try{el.setPointerCapture(e.pointerId);}catch{}};
    const up=e=>{e.preventDefault();held.delete(key);};
    el.addEventListener('pointerdown',down);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',()=>held.delete(key));
  });
  document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.dataset.action==='fire')playerFire();else if(el.dataset.action==='special')playerSpecial();else playerItem();}));
}
async function boot(){
  registerControls();
  const sources=[
    'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js',
    'https://unpkg.com/three@0.160.1/build/three.module.js',
    'https://esm.sh/three@0.160.1'
  ];
  let problem='';
  for(const url of sources){
    try{THREE=await import(url);break;}catch(e){problem=String(e);console.warn('Falha ao carregar Three.js:',url,e);}
  }
  if(!THREE){
    $('loading').classList.add('hidden');$('errorText').textContent='A biblioteca Three.js não pôde ser carregada. '+problem;
    $('errorPanel').classList.remove('hidden');return;
  }
  try{
    $('loadingText').textContent='Construindo arenas e carros de guerra…';
    particleGeo=new THREE.IcosahedronGeometry(.42,0);
    followLook=new THREE.Vector3();
    clock=new THREE.Clock();
    setup3D();$('loading').classList.add('hidden');clock.start();loop();
    void startVehicleAssets();
  }catch(err){
    $('loading').classList.add('hidden');$('errorText').textContent=String(err.stack||err);
    $('errorPanel').classList.remove('hidden');console.error(err);
  }
}
boot();
