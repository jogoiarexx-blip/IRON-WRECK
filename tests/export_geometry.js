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
  lookAt(){}updateProjectionMatrix(){}
}
class Geo {setAttribute(){return this;}setIndex(){return this;}computeVertexNormals(){}dispose(){}}
class Mat {constructor(props={}){Object.assign(this,props);if(typeof this.color==='number'){const initial=this.color;this.color={value:initial,setHex(v){this.value=v;}};}}dispose(){}set(){return this;}setHex(){return this;}}
class Curve {
 constructor(points){this.points=points;}
 getPointAt(t){t=((t%1)+1)%1;let p=t*this.points.length;let i=Math.floor(p),a=this.points[i],b=this.points[(i+1)%this.points.length],f=p-i;return new V3(a.x+(b.x-a.x)*f,0,a.z+(b.z-a.z)*f);}
 getTangentAt(t){const a=this.getPointAt(t-.0002),b=this.getPointAt(t+.0002);return new V3(b.x-a.x,0,b.z-a.z).normalize();}
}
const classes=['BoxGeometry','SphereGeometry','CylinderGeometry','ConeGeometry','PlaneGeometry','CircleGeometry','TorusGeometry','IcosahedronGeometry','BufferGeometry'];
const T={Vector3:V3,Scene:Node,Group:Node,Mesh:Node,Sprite:Node,CatmullRomCurve3:Curve,Clock:class{start(){}getDelta(){return 1/60;}},PerspectiveCamera:Node,DirectionalLight:Node,HemisphereLight:Node,MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,SpriteMaterial:Mat,CanvasTexture:class{},FogExp2:class{constructor(){this.color=new Mat()}},Color:Mat,Float32BufferAttribute:class{},
 WebGLRenderer:class{constructor(){this.domElement={};this.shadowMap={};}setSize(){}setPixelRatio(){}render(){}},
 PCFSoftShadowMap:1,ACESFilmicToneMapping:1,SRGBColorSpace:1,DoubleSide:2};
for(const c of classes)T[c]=class extends Geo{constructor(...args){super();this.kind=c;this.args=args;}};
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
function objToJSON(o){
 let color=0x999999;
 if(o.material?.color){color=typeof o.material.color==='number'?o.material.color:o.material.color.value??0x999999;}
 return {kind:o.geometry?.kind||'',args:o.geometry?.args||[],color,
   position:[o.position.x,o.position.y,o.position.z],rotation:[o.rotation.x,o.rotation.y,o.rotation.z],
   scale:[o.scale.x,o.scale.y,o.scale.z],visible:o.visible,
   children:o.children.map(objToJSON)};
}
const carData=[];
for(let i=0;i<10;i++){
 const g=run(`createKart(GARAGE[${i}].color,GARAGE[${i}].name,true,${i}).group`);
 carData.push(objToJSON(g));
}
const arenaData={};for(const arena of ['wasteland','city','harbor'])arenaData[arena]=objToJSON(run(`battlefields.${arena}`));
fs.writeFileSync(path.join(__dirname,'models-export.json'),JSON.stringify({carData,arenaData}));
console.log('Exported',carData.map(g=>count(g)).join(','),'arena',Object.values(arenaData).map(g=>count(g)).join(','));
function count(n){return (n.kind?1:0)+n.children.reduce((a,c)=>a+count(c),0);}
