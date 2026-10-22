// Teste sem WebGL: carregamento de skin, isolamento de material, fallback e cleanup.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const bootstrap=fs.readFileSync(path.join(__dirname,'smoke-test.js'),'utf8').split("run('setup3D()');")[0];
const result=vm.runInThisContext(`(function(require,__dirname){${bootstrap}
run('setup3D()');
const G=T.Group.prototype;
G.traverse=function(fn){fn(this);for(const x of this.children)x.traverse(fn)};
G.clone=function(){const clone=new Node(this.geometry,this.material);clone.isMesh=this.isMesh;for(const c of this.children)clone.add(c.clone(true));return clone;};
function color(value){return {value,clone(){return color(this.value)},copy(other){this.value=other.value;return this},multiplyScalar(n){this.value*=n;return this}};}
const model=new T.Group();const child=new T.Mesh({dispose(){}},{color:color(1),userData:{},clone(){return {color:color(1),userData:{},dispose(){}}}});
child.isMesh=true;model.add(child);
context.model=model;run('loadedVehicleTemplates.set(3,model)'); // no data fetch required
const bus=run("createKart(0xe6a93b,'BUS',true,3)");
assert.equal(bus.assetSkin!==null,true,'GLB scene clone should be attached');
assert.equal(bus.visualShell.visible,false,'replaced shell must be hidden');
assert.equal(bus.wheelMounts.length,6,'independent suspension kept');
assert.equal(bus.assetMaterials.length,1);
const paint=bus.assetMaterials[0].color;
bus.hp=30;run('applyAssetDamageTint(cars[0])');assert(paint.value<.7,'GLB changes tone when damaged');
bus.hp=100;run('applyAssetDamageTint(cars[0])');assert.equal(paint.value,1,'GLB recovers tone after repairs');
const truck=run("createKart(0x568b54,'TRUCK',true,4)");
assert.equal(truck.assetSkin,null,'missing GLB should preserve procedural fallback');
assert.equal(truck.visualShell.visible,true);
run('clearDynamic()');assert.equal(run('cars.length'),0);
console.log('PASS: asset attachment, per-car damage tint, suspension and procedural fallback/cleanup.');
})`)(require,__dirname);
