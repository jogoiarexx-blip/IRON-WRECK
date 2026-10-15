// Regression tests for the v6.0 arcade suspension and collision response.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const base=fs.readFileSync(path.join(__dirname,'smoke-test.js'),'utf8').split("run('setup3D()');")[0];
const program=vm.runInThisContext(`(function(require,__dirname){${base}
run('setup3D()');
run("garageChoice=3;resetGame('harbor');player.x=0;player.z=0;player.yaw=0;player.speed=38;player.sideVelocity=0;player.ramCooldown=0;cars[1].x=0;cars[1].z=player.radius+cars[1].radius-.2;cars[1].speed=0;cars[1].yaw=0;cars[1].sideVelocity=0;cars[1].ramCooldown=0;");
run('doCollisions(1/60)');
assert(run('cars[1].speed')>0,'momentum should transfer to stationary car');
assert(run('player.speed')<38,'striker must lose momentum');
assert(run('player.suspension.impact')>0,'chassis absorbs impact');
assert(run('Math.hypot(player.x-cars[1].x,player.z-cars[1].z)')>=run('player.radius+cars[1].radius')-.005,'nonpenetration');
console.log('PASS: impulse, mass, chassis reaction and nonpenetration');
run("garageChoice=0;resetGame('wasteland');player.x=0;player.z=0;player.yaw=0;player.speed=31;player.sideVelocity=0;player.steer=-1;player.acc=0;player.brake=0;player.useDrift=true;");
run('moveCar(player,1/60)');
assert(Math.abs(run('player.sideVelocity'))>0,'lateral slip should exist');
assert(run('player.yaw')<0,'steering remains consistent');
for(let i=0;i<150;i++)run('moveCar(player,1/60)');
assert(Number.isFinite(run('player.body.rotation.z'))&&Number.isFinite(run('player.body.rotation.x')));
assert(run('player.wheelMounts.length')===4,'individual wheel rigs');
assert(run('player.wheelMounts.every(w=>Number.isFinite(w.travel))'));
console.log('PASS: skid traction, independent wheel springs and stable roll/pitch');
run("resetGame('city');player.yaw=0;player.x=0;player.z=0;cars[1].x=22;cars[1].z=0;cars[1].invuln=0;player.hp=100;");
run('takeDamage(player,12,cars[1])');
assert(run('player.damageSide')==='right');
assert(run('player.damageRig.panels.find(p=>p.key==="right").dent')>0);
assert(run('player.damageRig.panels.find(p=>p.key==="right").mesh.position.x')<run('player.garage.width*.497'));
console.log('PASS: impact-side dent');
run("chooseGraphicsQuality('medium');emitExplosion(0,0,0xffaa33,12,5)");
assert(run('impactFlashes.length')===1);
run('updateShockwaves(.4)');
assert(run('impactFlashes.length')===0);
run("chooseGraphicsQuality('low');emitExplosion(0,0,0xffaa33,12,5)");
assert(run('impactFlashes.length')===0);
run('clearDynamic()');
assert(run('blastRings.length')===0 && run('impactFlashes.length')===0);
console.log('PASS: bright core transient quality guard and cleanup');
for(const level of ['wasteland','city','harbor'])for(let i=0;i<10;i++){
 run('garageChoice='+i+';resetGame("'+level+'")');
 run('for(let t=0;t<100;t++){ if(gameState!=="playing")break;update(1/60);updateWorldVisual(1/60); }');
 assert(run('cars.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.z)&&Number.isFinite(c.speed)&&Number.isFinite(c.sideVelocity)&&Number.isFinite(c.suspension.height))'));
}
console.log('PASS: 3000 simulation frames across 30 garage/arena combinations');
})`);
program(require,__dirname);
