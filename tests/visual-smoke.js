// Tests V5 procedural render shapes and cleanup with the same headless THREE shim.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const base=fs.readFileSync(path.join(__dirname,'smoke-test.js'),'utf8').split("run('setup3D()');")[0];
const simulated=base.replace('class Geo {setAttribute()', 'class Geo {setAttribute()').replace('for(const c of classes)T[c]=Geo;', 'for(const c of classes)T[c]=class extends Geo{constructor(...args){super();this.kind=c;this.args=args;}};');
const program=vm.runInThisContext(`(function(require,__dirname){${simulated}
run('setup3D()');
function count(o){return (o.geometry?1:0)+(o.children||[]).reduce((n,c)=>n+count(c),0)}
assert(Object.keys(run('battlefields')).length===3);
assert(run("battlefields.wasteland.children.length")>0);
assert(run("blastRings.length")===0);
const baseline=[];
for(let i=0;i<10;i++){
 const c=run('createKart(GARAGE['+i+'].color,GARAGE['+i+'].name,true,'+i+')');
 const countShapes=count(c.body);
 assert(countShapes>85,'Car '+i+' should have model details: '+countShapes);
 assert(c.wheels.length>=8);
 baseline.push(countShapes);
}
console.log('PASS: each of 10 car models has >= 85 geometry parts, including wheel hubs.');
run("resetGame('harbor')");
assert(run('cars.length')===8);
const before=run('player.wheels[0].rotation.x');
run('player.speed=22;updateWorldVisual(.1)');
assert(run('player.wheels[0].rotation.x')>before);
run('emitExplosion(0,0,0xffaa33,12,5)');
assert(run('blastRings.length')===1);
run('updateShockwaves(.3)');assert(run('blastRings.length')===1);
run('updateShockwaves(.3)');assert(run('blastRings.length')===0);
run('emitExplosion(0,0,0xffaa33,12,5);clearDynamic()');assert(run('blastRings.length')===0);
console.log('PASS: wheel animation, explosion rings expand, expire and clean up.');
run("chooseGraphicsQuality('low')");assert(run('graphicsQuality')==='low');assert(run('renderer.shadowMap.enabled')===false);
run("chooseGraphicsQuality('high')");assert(run('graphicsQuality')==='high');assert(run('renderer.shadowMap.enabled')===true);
run("chooseGraphicsQuality('invalid')");assert(run('graphicsQuality')==='medium');
console.log('PASS: quality levels low, medium and high toggle rendering settings.');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
assert(html.includes('id="qualitySelect"') && game.includes('garage-thumb'));
for(const i of ['01-marauder','02-phantom','03-titan','04-omega-bus','05-grinder','06-frost-van','07-hookjaw','08-inferno','09-sentinel','10-goliath'])assert(fs.existsSync(path.join(__dirname,'../previews/carro-'+i+'.png')));
assert(fs.existsSync(path.join(__dirname,'../previews/cenarios-v6.png')));
assert(fs.existsSync(path.join(__dirname,'../previews/carros-v6.png')));
console.log('PASS: gallery of 10 vehicles and all 3 arenas exists locally.');
})`);
program(require,__dirname);
