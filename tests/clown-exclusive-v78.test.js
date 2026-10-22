// Verifica substituição COMPLETA da Frost Van pelo GLB, sem peças simultâneas.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const bootstrap=fs.readFileSync(path.join(__dirname,'smoke-test.js'),'utf8').split("run('setup3D()');")[0];
vm.runInThisContext(`(function(require,__dirname){${bootstrap}
// O mock representa o reparent real de THREE.Object3D.add().
Node.prototype.add=function(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;};
Node.prototype.remove=function(child){this.children=this.children.filter(c=>c!==child);if(child.parent===this)child.parent=null;};
T.Group.prototype.traverse=function(fn){fn(this);for(const child of this.children)child.traverse(fn);};
T.Group.prototype.clone=function(){const copy=new Node(this.geometry,this.material);copy.isMesh=this.isMesh;for(const child of this.children)copy.add(child.clone(true));return copy;};
function color(v){return {v,clone(){return color(this.v);},copy(c){this.v=c.v;return this;},multiplyScalar(n){this.v*=n;return this;}};}
const asset=new T.Group();asset.name='CLWN_FROM_GLB';
const modelMesh=new T.Mesh({dispose(){}},{color:color(1),userData:{},clone(){return {color:color(1),userData:{},dispose(){}}}});
modelMesh.isMesh=true;modelMesh.name='ClownVanActualModel';asset.add(modelMesh);context.asset=asset;
run('setup3D()');
// Controle: sem modelo, fallback procedural aparece intacto.
run("garageChoice=5;resetGame('wasteland')");
assert(!run('player.assetSkin'));
assert(run('player.visualShell.visible'));
assert(run('player.turret.visible'));
assert(run('player.wheelMounts.every(w=>w.group.visible)'));
// Carrega o template durante partida. O chassis antigo deve sair do desenho.
run('loadedVehicleTemplates.set(5,asset);attachVehicleAsset(player)');
assert(run('player.assetSkin!==null'));
assert(run('player.assetSkin.parent===player.body'));
assert(run('player.proceduralRig.visible===false'));
assert(run('!player.proceduralRig.parent'),'rig antigo foi retirado da árvore');
assert(run('player.body.children.length===2'),'somente GLB + equipamento de armas intencional no body');
assert(run('player.body.children.includes(player.equipmentRig)'),'arma montada não é carroceria duplicada');
assert(run('player.body.children.includes(player.assetSkin)'));
assert(run('!player.body.children.includes(player.proceduralRig)'),'rig antigo não está no scene graph');
assert(run('player.visualShell.parent===player.proceduralRig'));
assert(run('player.turret.parent===player.proceduralRig'));
assert(run('player.wheelMounts.every(w=>w.group.parent===player.proceduralRig)'));
assert(run('player.damageRig.panels.every(p=>p.mesh.parent===player.proceduralRig)'));
assert(run('player.assetFx.kind==="clownCream"'));
assert(!run('player.assetFx.root'),'não adicionar outro enfeite 3D no teto');
// Os danos podem alterar .visible das peças, mas o pai oculto prevalece.
run("player.hp=25;player.damageSide='hood';syncDamageVisuals(player);updateWorldVisual(1/60)");
assert(run('player.proceduralRig.visible===false'));
assert(run('player.assetSkin.visible!==false'));
run('player.hp=100;player.x=0;player.z=0;player.yaw=0;player.specialCharge=100;');
assert(run('useSpecial(player)'));
assert.equal(run('missiles.filter(m=>m.type==="candy").length'),5);
run('for(let i=0;i<60;i++){if(gameState!=="playing")break;update(1/60);updateWorldVisual(1/60)}');
assert(Number.isFinite(run('player.x'))&&Number.isFinite(run('player.z')));
// Os outros carros mantêm sua geometria procedural normal nas rodas/torres.
run("garageChoice=4;resetGame('city')");
assert(run('player.proceduralRig===undefined'));
assert(run('player.wheelMounts.every(w=>w.group.visible)'));
console.log('PASS: GLB Clown único visível, fallback preservado, rodas/torre/danos antigos agrupados e ocultos, partículas e 5 doces ativos; demais veículos preservados.');
})`)(require,__dirname);
