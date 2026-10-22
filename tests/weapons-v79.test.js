// v7.9 independent functional tests: visible ground pickups, vehicle-mounted weapons,
// twin headlight firing, ammo rack and GLB isolation.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const boilerplate=fs.readFileSync(path.join(__dirname,'smoke-test.js'),'utf8').split("run('setup3D()');")[0];
const program=vm.runInThisContext(`(function(require,__dirname){${boilerplate}
run('setup3D()');
const types=run("PICKUP_TYPES.join(String.fromCharCode(44))");
assert.equal(types,'rocket,emp,mine,shield,repair,boost');
for(const stage of ['wasteland','city','harbor']){
  const drops=run('pickups.filter(p=>p.level==="'+stage+'")');
  assert.equal(drops.length,12,'twelve typed pickups in '+stage);
  assert.equal(new Set(drops.map(p=>p.type)).size,6,'all distinct item types on each stage');
  for(const p of drops){assert(p.icon?.children?.length>0,'pickup model exists'); assert(p.group.visible,'ground object visible');}
}
run("garageChoice=0;resetGame('city');player.x=0;player.z=0;player.item=null");
let found=run("pickups.find(p=>p.level===mode&&p.type==='emp')");
run("player.x="+found.x+";player.z="+found.z+";collectItems(1/60)");
assert.equal(run('player.item'),'emp','pickup gives actual visible ground type');
assert.equal(run('player.shownItem'),'emp');
assert.equal(run('player.itemVisual.visible'),true,'weapon mounted on vehicle');
const visible=run('player.itemVisual');
assert(visible.parent===undefined||run('player.equipmentRig.children.includes(player.itemVisual)'),'car attachment');
let second=run("pickups.find(p=>p.level===mode&&p.type==='mine')");
run("player.x="+second.x+";player.z="+second.z+";collectItems(1/60)");
assert.equal(run('player.item'),'emp','cannot replace equipped item silently');
assert.equal(run("pickups.find(p=>p.level===mode&&p.type==='mine').respawn"),0,'uncollected mine remains');
run('useItem(player)');
assert.equal(run('player.item'),null);assert.equal(run('player.itemVisual'),null,'attachment removed on use');
console.log('PASS: type visible on ground -> collected -> mounted -> used and removed');

run("resetGame('harbor');player.x=0;player.z=0;player.yaw=0;player.item=null;player.ammo=6");
const rockets=run("pickups.find(p=>p.level===mode&&p.type==='rocket')");
run("player.x="+rockets.x+";player.z="+rockets.z+";collectItems(1/60)");
assert.equal(run('player.ammo'),10,'rocket drop restocks 4');
assert.equal(run('player.rocketRack.visible'),true,'rack shown while loaded');
run('player.x=0;player.z=0;player.yaw=0;player.fireCooldown=0;player.ammo=1');
run('fireRocket(player)');
assert.equal(run('player.ammo'),0);assert.equal(run('player.rocketRack.visible'),false,'empty pod hidden');
const rocketY=run('missiles[missiles.length-1].y');
assert(rocketY>3,'rockets spawn from mounted pod on roof rather than central bumper');
console.log('PASS: visible rocket pickup refills ammo, rocket launches from mounted roof pod');

run("resetGame('wasteland');player.x=0;player.z=0;player.yaw=0;player.gunCooldown=0;cars[1].x=0;cars[1].z=26;cars[1].hp=100");
const hpBefore=run('cars[1].hp');
run('fireMachineGun(player)');
assert.equal(run('tracers.length'),2,'exactly two barrels per shot');
const origins=run('tracers.map(t=>t.origin.x)');
assert(origins[0]<0&&origins[1]>0,'one from each front headlight');
const originZ=run('tracers.map(t=>t.origin.z)');
assert(Math.abs(originZ[0]-originZ[1])<.001,'two headlights aligned on front bumper');
const dmg=hpBefore-run('cars[1].hp');
const expected=run('6*player.garage.damage/cars[1].garage.armor');
assert(Math.abs(dmg-expected)<.001,'two half-damage hits; do not double DPS');
console.log('PASS: two simultaneously traced headlight projectiles, balanced damage');

// Glb v7.8: new weapon rig must remain rendered, but old Frost rig must NOT return.
run("garageChoice=5;resetGame('city')");
const clown=run('player');
assert(run('player.equipmentRig') && run('player.equipmentRig.parent')===undefined||run('player.body.children.includes(player.equipmentRig)'));
const gameSrc=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
assert(gameSrc.includes('child!==skin&&child!==car.equipmentRig'),'exclude mounted weapons when detaching old Frost Van');
assert(gameSrc.includes('car.proceduralRig=hidden'),'existing GLB exclusive fix preserved');
assert(gameSrc.includes('function headlightMuzzle(c,side)'));
for(const vi of [0,3,4,5,10]){
  run('garageChoice='+vi+";resetGame('city');player.gunCooldown=0;player.x=0;player.z=0;player.yaw=.4");
  run('fireMachineGun(player)');
  assert.equal(run('tracers.length'),2,'two headlights for vehicle '+vi);
  assert(run('player.equipmentRig') && run('player.rocketRack'),'equipment rig for vehicle '+vi);
}
console.log('PASS: headlight and weapon mount compatible with bus, truck, GLB Frost and bike');
})`);
program(require,__dirname);
