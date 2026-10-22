import json,sys,struct
from pathlib import Path
import trimesh
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'assets/manifest.json').read_text())
assert set(d)=={'omega-bus','grinder'}
for name,part_min,max_render in [('omega-bus',140,16),('grinder',77,16)]:
 x=ROOT/'assets'/f'{name}.glb';raw=x.read_bytes()
 assert raw[:4]==b'glTF',name
 assert struct.unpack('<I',raw[8:12])[0]==len(raw)
 mesh=trimesh.load(x,force='scene')
 assert len(mesh.geometry)<=max_render and len(mesh.geometry)>5
 assert mesh.bounds[0][2]<-5 and mesh.bounds[1][2]>5
 assert d[name]['parts']>=part_min
 assert abs(d[name]['size'][2]-(mesh.bounds[1][2]-mesh.bounds[0][2]))<.001
 print(f'PASS: {name}: {len(mesh.geometry)} render meshes, {d[name]["parts"]} parts, {len(raw)} B, GLB geometry valid.')
js=(ROOT/'game.js').read_text()
assert 'loadVehicleTemplate(' in js
assert 'applyAssetDamageTint(' in js
assert 'car.visualShell.visible=false' in js
assert 'car.visualShell' not in js[js.index('function disposeDynamic('):js.index('function clearDynamic(')]
assert (ROOT/'previews/FROTA-BLINDADA-V7.2.png').is_file()
print('PASS: GLB loader, fallback, damage material tint and previews are integrated.')
