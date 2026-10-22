from pathlib import Path
p=Path(__file__).resolve().parents[1]/'game.js'; s=p.read_text()
def swap(a,b):
 global s
 assert a in s,('missing',a[:120]); assert s.count(a)==1,('duplicate',a[:120]);s=s.replace(a,b)
swap("const VEHICLE_GLB={3:'assets/omega-bus.glb',4:'assets/grinder.glb'};", """const VEHICLE_GLB={
  0:'assets/marauder.glb',1:'assets/phantom.glb',2:'assets/titan.glb',
  3:'assets/omega-bus.glb',4:'assets/grinder.glb',5:'assets/frost-van.glb',
  6:'assets/hookjaw.glb',7:'assets/inferno.glb',8:'assets/sentinel.glb',9:'assets/goliath.glb'
};""")
swap('  const skin=template.clone(true),materials=[];', '  const skin=template.clone(true),materials=[],morphMeshes=[];')
swap('''  skin.traverse(node=>{if(node.isMesh){
    node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();''','''  skin.traverse(node=>{if(node.isMesh){
    // A geometria original dos GLBs é compartilhada. Cada veículo em combate
    // precisa de sua própria cópia para permitir deformação sem afetar rivais.
    if(node.geometry?.attributes?.position && node.geometry.clone){
      node.geometry=node.geometry.clone();
      const pos=node.geometry.attributes.position;
      morphMeshes.push({geometry:node.geometry,base:new Float32Array(pos.array)});
    }
    node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();''')
swap('  car.body.add(skin);car.assetSkin=skin;car.assetMaterials=materials;', '  car.body.add(skin);car.assetSkin=skin;car.assetMaterials=materials;car.assetMorphMeshes=morphMeshes;')
swap('''function applyAssetDamageTint(car){
  if(!car.assetMaterials)return;
  const intensity=car.hp<20?.47:car.hp<40?.61:car.hp<65?.77:car.hp<83?.90:1;
  for(const m of car.assetMaterials){m.color.copy(m.userData.basePaint).multiplyScalar(intensity);}
}
function createKart''', '''function applyAssetDamageTint(car){
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
function createKart''')
swap('const car={id:cars.length,name,color,group:g,body,visualShell,assetSkin:null,assetMaterials:null,turret,', 'const car={id:cars.length,name,color,group:g,body,visualShell,assetSkin:null,assetMaterials:null,assetMorphMeshes:[],assetDentStamp:null,turret,')
swap('''  applyAssetDamageTint(car);
  const health=clamp(car.hp,0,100),rig=car.damageRig;''','''  applyAssetDamageTint(car);
  applyAssetDents(car);
  const health=clamp(car.hp,0,100),rig=car.damageRig;''')
swap('''  applyAssetDamageTint(car);
  return true;''', '''  applyAssetDamageTint(car);
  applyAssetDents(car);
  return true;''')
p.write_text(s)
q=Path(__file__).resolve().parents[1]/'index.html';h=q.read_text().replace('IRON WRECK v7.2 — FROTA BLINDADA','IRON WRECK v7.3 — GARAGEM COMPLETA').replace('· v7.2 · FROTA BLINDADA','· v7.3 · GARAGEM COMPLETA').replace('dois novos modelos GLB','dez modelos GLB');q.write_text(h)
