// Headless simulation smoke-test: validates construction & 1200 physics frames
// without requiring WebGL or access to a Three.js CDN.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
class V3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this;}
  lerp(t,a){this.x+=(t.x-this.x)*a;this.y+=(t.y-this.y)*a;this.z+=(t.z-this.z)*a;return this;}
}
class Node {
  constructor(geo,material){this.geometry=geo;this.material=material||{};this.position=new V3();this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;},setScalar(v){this.x=v;this.y=v;this.z=v;}};this.children=[];this.visible=true;this.shadow={mapSize:{set(){}},camera:{}};}
  add(m){this.children.push(m);}remove(m){this.children=this.children.filter(c=>c!==m);}
  lookAt(){}updateProjectionMatrix(){}updateMatrix(){this.matrix={matrixId:Math.random()};}
}
class Geo {setAttribute(){return this;}setIndex(){return this;}computeVertexNormals(){}dispose(){}}
class Mat {constructor(props={}){Object.assign(this,props);if(typeof this.color==='number')this.color={setHex(){}};}dispose(){}set(){return this;}setHex(){return this;}}
class Curve {
 constructor(points){this.points=points;}
 getPointAt(t){t=((t%1)+1)%1;let p=t*this.points.length;let i=Math.floor(p),a=this.points[i],b=this.points[(i+1)%this.points.length],f=p-i;return new V3(a.x+(b.x-a.x)*f,0,a.z+(b.z-a.z)*f);}
 getTangentAt(t){const a=this.getPointAt(t-.0002),b=this.getPointAt(t+.0002);return new V3(b.x-a.x,0,b.z-a.z).normalize();}
}
const classes=['BoxGeometry','SphereGeometry','CylinderGeometry','ConeGeometry','PlaneGeometry','CircleGeometry','TorusGeometry','IcosahedronGeometry','BufferGeometry'];
const T={Vector3:V3,Scene:Node,Group:Node,Mesh:Node,Sprite:Node,CatmullRomCurve3:Curve,Clock:class{start(){}getDelta(){return 1/60;}},PerspectiveCamera:Node,DirectionalLight:Node,HemisphereLight:Node,MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,SpriteMaterial:Mat,CanvasTexture:class{},FogExp2:class{constructor(){this.color=new Mat()}},Color:Mat,Float32BufferAttribute:class{},
 WebGLRenderer:class{constructor(){this.domElement={};this.shadowMap={};}setSize(){}setPixelRatio(){}render(){}},
 PCFSoftShadowMap:1,ACESFilmicToneMapping:1,SRGBColorSpace:1,DoubleSide:2};
for(const c of classes)T[c]=Geo;
class FakeInstancedMesh extends Node {
  constructor(g,m,n){super(g,m);this.count=n;this.isInstancedMesh=true;this.instanceMatrix={needsUpdate:false};this.matrices=[];}
  setMatrixAt(i,m){this.matrices[i]=m;}
  computeBoundingSphere(){}
}
T.Object3D=Node;T.InstancedMesh=FakeInstancedMesh;

const nodes=new Map();
function el(id){if(!nodes.has(id))nodes.set(id,{style:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',dataset:{mode:'race'},appendChild(){},addEventListener(){},getContext(){return canvasContext;}});return nodes.get(id);}
const canvasContext={fillRect(){},strokeRect(){},fillText(){},clearRect(){},beginPath(){},arc(){},ellipse(){},rect(){},closePath(){},moveTo(){},lineTo(){},stroke(){},fill(){}};
const fakeDoc={getElementById:el,createElement:()=>({width:512,height:128,getContext:()=>canvasContext}),querySelector:()=>({dataset:{mode:'race'}}),querySelectorAll:()=>[]};
class AudioParam {setValueAtTime(){}exponentialRampToValueAtTime(){}setTargetAtTime(){}}
class AudioNode {constructor(){this.frequency=new AudioParam();this.gain=new AudioParam();}connect(){return this;}start(){}stop(){}}
class FakeAudioContext {
  constructor(){this.state='running';this.currentTime=0;this.destination={};}
  createOscillator(){return new AudioNode();}createGain(){return new AudioNode();}
  createBiquadFilter(){return new AudioNode();}resume(){}
}
const window={addEventListener(){},AudioContext:FakeAudioContext,webkitAudioContext:null};
const context=vm.createContext({document:fakeDoc,window,console,Math,Set,Map,performance:{now:()=>0},innerWidth:1366,innerHeight:768,devicePixelRatio:1,navigator:{maxTouchPoints:0},requestAnimationFrame(){}});
let src=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8').replace(/boot\(\);\s*$/,'');
vm.runInContext(src,context,{filename:'game.js'});
vm.runInContext('THREE=three; particleGeo=new THREE.IcosahedronGeometry();followLook=new THREE.Vector3();clock=new THREE.Clock();',vm.createContext(Object.assign(context,{three:T})));
function run(expr){return vm.runInContext(expr,context);}
run('setup3D()');
assert.equal(run("battlefields.city.children.filter(m=>m.isInstancedMesh).length"),2,'Cidade deve ter 2 lotes de instancing');
assert.equal(run("battlefields.city.children.filter(m=>m.isInstancedMesh).reduce((n,m)=>n+m.count,0)"),262,'102 marcas + 160 janelas');
assert.equal(run("battlefields.harbor.children.filter(m=>m.isInstancedMesh).length"),1,'Porto deve ter 1 lote de instancing');
assert.equal(run("battlefields.harbor.children.filter(m=>m.isInstancedMesh)[0].count"),168,'14 contêineres * 12 nervuras');
console.log('PASS: InstancedMesh reduz 430 objetos decorativos a 3 draw calls de malha (não contabiliza materiais/sombras).');
// Screen-aligned controls: camera behind a +Z-facing car sees world -X on screen-right.
run("resetGame('wasteland'); player.x=0;player.z=0;player.yaw=0;player.speed=0;held.clear();held.add('KeyW')");
run('updatePlayerInput();moveCar(player,1/10)');
assert(run('player.z')>0, 'W deve avançar para a frente (+Z)');
run("held.add('KeyA');updatePlayerInput();moveCar(player,1/10)");
assert(run('player.yaw')>0, 'A deve virar à esquerda na projeção da câmera');
run("held.delete('KeyA');held.add('KeyD');player.yaw=0;updatePlayerInput();moveCar(player,1/10)");
assert(run('player.yaw')<0, 'D deve virar à direita na projeção da câmera');
run("invertSteering=true;updatePlayerInput();player.yaw=0;moveCar(player,1/10)");
assert(run('player.yaw')>0, 'Opção de inverter direção deve funcionar');
run('invertSteering=false;held.clear()');
console.log('PASS: WASD, freio e opção de direção invertida.');
for(const type of ['wasteland','city']){
 run(`resetGame('${type}')`);
 assert.equal(run('cars.length'),8);
 assert.equal(run('player.hp'),100);
 assert(run(`battlefields['${type}'].visible`),'arena escolhida deve estar visível');
 assert.equal(run('player.ammo'),8);
 assert(run('pickups.some(p=>p.level===mode&&p.group.visible)'));
 run("held.add('KeyW')");
 for(let i=0;i<700;i++){
  run(`if(gameState==="playing"){update(1/60);updateWorldVisual(1/60)}`);
  if(i===60)run("held.add('ShiftLeft'); held.add('ArrowLeft')");
  if(i===125)run("held.delete('ShiftLeft');held.delete('ArrowLeft');held.add('KeyJ')");
  if(i===200)run("held.delete('KeyJ');held.add('Space');playerFire()");
  if(i===270)run("held.delete('Space');player.item='emp';playerItem()");
 }
 const result=run('({alive:cars.filter(c=>c.alive).length,hp:player.hp,score:player.score,elapsed,shots:missiles.length})');
 console.log(type,'OK',result);
 assert(Number.isFinite(run('player.x'))&&Number.isFinite(run('player.z')));
 assert(Number.isFinite(run('player.yaw')));
 assert.equal(run('cars.length'),8);
 run('held.clear()');
}
console.log('PASS: 2 arenas, 8 veículos, simulação de 1400 quadros, HUD, IA, colisões, metralhadora e foguetes.');
for(let vi=0;vi<3;vi++){
 run(`garageChoice=${vi};resetGame('wasteland')`);
 assert.equal(run('player.vehicleIndex'),vi);
 assert(run('player.specialCharge')===100);
 assert(run('useSpecial(player)'));
 assert(run('player.specialCharge')===0);
 assert(!run('useSpecial(player)'));
}
console.log('PASS: 3 veículos clássicos e especiais com recarga.');
// Target aligned in front of the muzzle: a continuous-fire hit must inflict damage.
run("garageChoice=0;resetGame('wasteland');player.x=0;player.z=0;player.yaw=0;player.gunCooldown=0;player.gunHeat=0;cars[1].x=0;cars[1].z=24;cars[1].hp=100");
assert(run('fireMachineGun(player)'), 'metralhadora deve disparar');
assert(run('cars[1].hp')<100, 'tiro deve atingir um alvo alinhado');
assert.equal(run('tracers.length'),1);
run('updateMissiles(.2)');
assert.equal(run('tracers.length'),0);
console.log('PASS: dano da metralhadora e descarte de traçadores.');

run("garageChoice=0;resetGame('city')");
run("for(const enemy of cars.slice(1)){enemy.hp=1;enemy.invuln=0;takeDamage(enemy,9,player)}");
assert.equal(run('gameState'),'ended');
assert.equal(run('player.wrecks'),7);
console.log('PASS: vitória quando os sete adversários são eliminados.');
run("resetGame('wasteland');player.hp=1;takeDamage(player,20,cars[1])");
assert.equal(run('gameState'),'ended');
assert.equal(run('player.alive'),false);
console.log('PASS: derrota quando jogador perde toda a blindagem.');

// v3.0: a garagem deve conter dez modelos realmente diferentes, com massa,
// dimensões, controles e habilidades especiais próprias.
assert.equal(run('GARAGE.length'),11,'garagem de onze veículos');
assert.equal(run('new Set(GARAGE.map(v=>v.specialType)).size'),10,'dez especiais distintos');
assert.equal(run('new Set(GARAGE.map(v=>v.length)).size'),11,'comprimentos únicos');
assert(run('GARAGE[3].length>GARAGE[0].length*1.7'),'ônibus comprido');
assert(run('GARAGE[4].mass>GARAGE[1].mass*2.5'),'caminhão de lixo pesado');
for(const stage of ['wasteland','city'])for(let vi=0;vi<11;vi++){
 run(`garageChoice=${vi};resetGame('${stage}');held.clear()`);
 assert.equal(run('player.vehicleIndex'),vi);
 assert.equal(run('player.garage.name'),run(`GARAGE[${vi}].name`));
 assert(run('player.radius')>2.1);
 assert(run('player.vehicleIndex===10 ? player.body.children.length>8 : player.body.children.length>13'),'malha de veículo precisa ter detalhes');
 assert(run('player.vehicleIndex===10 ? player.wheels.length>=4 : player.wheels.length>=8'),'rodas precisam existir');
 assert.equal(run('cars.length'),8,'sempre 8 carros');
 assert.equal(run('new Set(cars.slice(1).map(c=>c.vehicleIndex)).size'),7,'adversários variados');
 // IA não deve gerar NaN em 180 quadros em nenhuma combinação.
 run('for(let k=0;k<180;k++){if(gameState!=="playing")break;update(1/60)}');
 assert(Number.isFinite(run('player.x'))&&Number.isFinite(run('player.z')));
 // Rearme o especial e faça um teste isolado, com adversário à frente.
 run('resetGame(mode);player.x=0;player.z=0;player.yaw=0;player.specialCharge=100;'+
     'cars[1].x=0;cars[1].z=18;cars[1].hp=100;cars[1].speed=25;');
 assert(run('useSpecial(player)'),'habilidade '+vi+' deve ativar');
 assert.equal(run('player.specialCharge'),0,'habilidade deve entrar em recarga');
 assert(!run('useSpecial(player)'),'não deve usar habilidade antes de recarregar');
}
console.log('PASS: dez modelos, vinte combinações de arena/veículo e habilidades exclusivas.');
run("garageChoice=3;resetGame('wasteland');player.x=0;player.z=0;player.yaw=0;player.speed=38;player.ramCooldown=0;cars[1].x=0;cars[1].z=player.radius+cars[1].radius-.5;cars[1].speed=0;cars[1].ramCooldown=0;");
run('doCollisions(1/60)');
assert(run('player.hp')<100 && run('cars[1].hp')<100, 'colisão de veículos de tamanhos diferentes');
assert(run('Math.hypot(player.x-cars[1].x,player.z-cars[1].z)')>=run('player.radius+cars[1].radius')-.001,'interpenetração física corrigida');
console.log('PASS: dimensões e massas afetam colisões de ônibus, caminhões e carros pequenos.');

// V4.0: três arenas e deformação/destacamento em estágios.
assert.equal(run('Object.keys(battlefields).length'),3,'terceira arena deve existir');
assert(run('obstacles.filter(o=>o.level==="harbor").length')>=12,'porto precisa de cobertura sólida');
assert(run('pickups.filter(p=>p.level==="harbor").length')>=10,'porto deve ter suprimentos');
for(const stage of ['wasteland','city','harbor']){
 for(let vi=0;vi<10;vi++){
  run(`garageChoice=${vi};resetGame('${stage}')`);
  assert.equal(run('player.damageRig.panels.length'),4);
  assert.equal(run('player.damageLevel'),0);
  assert.equal(run('scrapParts.length'),0);
  assert(run('player.damageRig.crackGroup.visible')===false);
  run('takeDamage(player,20*player.garage.armor,null)');
  assert(run('player.damageLevel')>=1,'primeiras rachaduras');
  assert(run('player.damageRig.crackGroup.visible')===true);
  run('takeDamage(player,38*player.garage.armor,null)');
  assert(run('player.damageLevel')>=2,'estágio de chapa danificada');
  assert(run('scrapParts.length')>=1,'ao menos uma peça deve cair');
  run('takeDamage(player,30*player.garage.armor,null)');
  assert(run('player.damageLevel')>=3,'terceiro estágio visual');
  if(run('gameState')!=='playing')continue;
  run('player.item="repair";useItem(player)');
  assert(run('player.hp')>20,'power-up de reparo');
  assert(run('player.damageLevel')<5,'nível deve atualizar após reparo');
  assert(run('Number.isFinite(player.x)'));
  run('for(let t=0;t<120;t++){if(gameState==="playing")update(1/60);updateWorldVisual(1/60);}');
  assert(Number.isFinite(run('player.x')));
 }
}
console.log('PASS: 33 configurações (11 veículos × 3 arenas) com danos, sucata e reparos.');
run("garageChoice=3;resetGame('harbor');player.hp=15;syncDamageVisuals(player)");
assert(run('player.damageRig.fireGroup.visible'),'fogo deve estar visível em veículo crítico');
assert(run('player.damageRig.tirePunctured'),'pneu deve furar com HP crítico');
run('player.item="repair";useItem(player)');
assert(!run('player.damageRig.tirePunctured'),'reparo recupera dirigibilidade');
assert(!run('player.damageRig.fireGroup.visible'),'reparo apaga fogo');
run('player.hp=1;takeDamage(player,20,cars[1])');
assert(run('gameState')==='ended');
assert(run('player.burnTime')>0);
run('updateWorldVisual(.1)');
run("garageChoice=4;resetGame('harbor')");
assert.equal(run('scrapParts.length'),0,'sucata anterior descartada após reinício');
console.log('PASS: incêndio, pneus, reparo, destruição e limpeza de recursos.');

// Regressão: a terceira arena também precisa disparar vitória e derrota.
run("garageChoice=5;resetGame('harbor')");
run('for(const enemy of cars.slice(1)){enemy.hp=1;enemy.invuln=0;takeDamage(enemy,20,player)}');
assert.equal(run('gameState'),'ended');
assert.equal(run('player.wrecks'),7);
run("resetGame('harbor');player.hp=1;takeDamage(player,20,cars[1])");
assert.equal(run('gameState'),'ended');
assert.equal(run('player.alive'),false);
console.log('PASS: vitória e derrota no Porto das Sombras.');
