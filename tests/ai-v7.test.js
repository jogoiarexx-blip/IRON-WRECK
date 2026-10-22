// IRON WRECK v7 — tactics, obstacle cover, path selection and anti-stuck regression.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const base=fs.readFileSync(path.join(__dirname,'smoke-test.js'),'utf8').split("run('setup3D()');")[0];
const program=vm.runInThisContext(`(function(require,__dirname){${base}
run('setup3D()');
run("resetGame('city');player.x=0;player.z=0;player.yaw=0;player.speed=0;cars[1].x=0;cars[1].z=26;cars[1].yaw=Math.PI;cars[1].aiThink=0;");
const target=run('cars[1]');
assert(run('aiChooseTarget(cars[1])') && run('aiChooseTarget(cars[1]).alive'));
run("cars[1].hp=23;cars[1].aiThink=0;cars[1].aiTarget=player;cars[1].aiStuck=0;aiChooseTactics(cars[1],player)");
assert(['retreat','resupply'].includes(run('cars[1].aiState')),'injured rival must preserve itself');
run("cars[1].hp=100;cars[1].aiThink=0;cars[1].aiPersonality='flanker';aiChooseTactics(cars[1],player)");
assert(['flank','ambush'].includes(run('cars[1].aiState')),'flank role must attack sideways');
run("cars[1].hp=100;cars[1].aiStuck=2;cars[1].aiThink=0;cars[1].aiReverse=0;aiSteer(cars[1],1/60)");
assert(run('cars[1].aiReverse')>0 && run('cars[1].brake')===1,'stuck bot should reverse');
console.log('PASS: health-based tactics, flank role, reversing when stuck');
run("obstacles.push({x:0,z:13,r:5,level:'city'});player.x=0;player.z=0;cars[1].x=0;cars[1].z=32;cars[1].hp=100;player.yaw=0");
assert(run('firstCoverOnLine(0,0,0,32)')!==null,'cover intercept');
assert(!run('aiHasLineOfSight(player,cars[1])'),'LOS blocked by cover');
assert(run('segmentCircleFraction(0,0,0,32,0,13,5)')!==null);
assert(run('segmentCircleFraction(0,0,0,32,33,13,5)')===null);
const heading=run('aiNavigate(player,{x:0,z:42})');
assert(Math.abs(heading)>0.15,'bot avoids obstacle instead of driving straight through');
console.log('PASS: segment geometry, line of sight and local obstacle avoidance');
run("player.gunCooldown=0;player.gunHeat=0;player.gunLocked=false;cars[1].hp=100;");
assert(run('fireMachineGun(player)')===true);
assert(run('cars[1].hp')===100,'gun must not shoot through cover');
run('player.fireCooldown=0;player.ammo=5;fireRocket(player)');
assert(run('missiles.length')===1);
run('for(let t=0;t<40;t++)updateMissiles(1/60)');
assert(run('missiles.length')===0,'rocket must explode on cover');
assert(run('cars[1].hp')===100,'cover absorbs direct rocket hit');
console.log('PASS: metralhadora and foguete cannot pass through concrete');
for(const difficulty of ['easy','normal','hard']){
 run('aiDifficulty="'+difficulty+'";resetGame("harbor");held.clear()');
 run('for(let t=0;t<160;t++){if(gameState!=="playing")break;update(1/60);updateWorldVisual(1/60)}');
 assert(run('cars.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.z)&&Number.isFinite(c.yaw)&&Number.isFinite(c.speed))'));
 assert(run('cars.slice(1).every(c=>typeof c.aiState==="string")'));
}
assert(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').includes('id="difficultySelect"'));
console.log('PASS: all three AI difficulty settings, finite motion, UI selector');
})`);
program(require,__dirname);
