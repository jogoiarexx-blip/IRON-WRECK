// Headless GLB skin regression: 10 vehicle IDs, independent vertex deformation and reversible repairs.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const bootstrap=fs.readFileSync(path.join(__dirname,'smoke-test.js'),'utf8').split("run('setup3D()');")[0];
vm.runInThisContext(`(function(require,__dirname){${bootstrap}
run('setup3D()');
const G=T.Group.prototype;
G.traverse=function(fn){fn(this);for(const x of this.children)x.traverse(fn)};
G.clone=function(){const clone=new Node(this.geometry,this.material);clone.isMesh=this.isMesh;for(const c of this.children)clone.add(c.clone(true));return clone;};
const materialColor=value=>({value,clone(){return materialColor(this.value)},copy(other){this.value=other.value;return this},multiplyScalar(x){this.value*=x;return this}});
function geometry(){
 const orig=new Float32Array([1,2,3, -1,2,3, 1,3,2, -1,3,-2]);
 const attr={array:orig,count:4,setXYZ(i,x,y,z){this.array[i*3]=x;this.array[i*3+1]=y;this.array[i*3+2]=z;}};
 return {attributes:{position:attr},clone(){
   const cp=geometry();cp.attributes.position.array.set(this.attributes.position.array);return cp;
 },computeVertexNormals(){},computeBoundingSphere(){},dispose(){}};
}
const master=new T.Group(),mesh=new T.Mesh(geometry(),{color:materialColor(1),userData:{},clone(){return {color:materialColor(1),userData:{},dispose(){}}}});
mesh.isMesh=true;master.add(mesh);
context.model=master;for(let i=0;i<10;i++)run('loadedVehicleTemplates.set('+i+',model)');
const carsList=[];
for(let i=0;i<10;i++)carsList.push(run('createKart('+[0xeabd39,0x36c8d5,0xcf664b,0xe6a93b,0x568b54,0xf5a3c0,0xd67c39,0xda3834,0x5177b7,0x8e71d3][i]+',"V'+i+'",false,'+i+')'));
for(let i=0;i<10;i++){
 assert.ok(carsList[i].assetSkin,'Vehicle '+i+' has GLB skin');
 assert.equal(carsList[i].visualShell.visible,false);
 assert.equal(carsList[i].assetMorphMeshes.length,1);
 assert.notEqual(carsList[i].assetMorphMeshes[0].geometry,mesh.geometry);
}
const first=carsList[0],second=carsList[1];
const firstAttr=first.assetMorphMeshes[0].geometry.attributes.position;
const secondAttr=second.assetMorphMeshes[0].geometry.attributes.position;
const clean=Array.from(firstAttr.array),untouched=Array.from(secondAttr.array);
first.hp=5;first.damageSide='hood';run('applyAssetDents(cars[0])');
assert.notDeepEqual(Array.from(firstAttr.array),clean,'Damaged GLB must change vertex coordinates');
assert.deepEqual(Array.from(secondAttr.array),untouched,'Rival GLB must stay unchanged');
first.hp=100;run('applyAssetDents(cars[0])');
assert.deepEqual(Array.from(firstAttr.array),clean,'Repair restores original GLB vertices');
for(const side of ['left','right','bumper']){
 first.hp=5;first.damageSide=side;run('applyAssetDents(cars[0])');
 assert.notDeepEqual(Array.from(firstAttr.array),clean,'Dent in '+side);
 first.hp=100;run('applyAssetDents(cars[0])');
}
run('clearDynamic()');assert.equal(run('cars.length'),0);
console.log('PASS: 10 GLB attachments, per-car mesh isolation, 4 impact sides, reversible repair and cleanup');
})`)(require,__dirname);
