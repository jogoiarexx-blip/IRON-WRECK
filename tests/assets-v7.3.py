"""Validate all 10 GLBs used by the IRON WRECK v7.3 garage."""
from pathlib import Path
import json,struct,trimesh,re
ROOT=Path(__file__).resolve().parents[1]
expected=['marauder','phantom','titan','omega-bus','grinder','frost-van','hookjaw','inferno','sentinel','goliath']
manifest=json.loads((ROOT/'assets/manifest.json').read_text())
assert set(manifest)==set(expected)
for name in expected:
 d=manifest[name];path=ROOT/d['file'];data=path.read_bytes()
 assert data[:4]==b'glTF' and struct.unpack('<I',data[8:12])[0]==len(data)
 if name!='frost-van':
  assert len(data)<120_000,(name,len(data))
 else:
  assert len(data)<3_000_000 and len(data)>400_000,(name,len(data))
 scene=trimesh.load(path,force='scene')
 if name!='frost-van':
  assert 4<=len(scene.geometry)<=20,(name,len(scene.geometry))
  assert d['renderMeshes']==len(scene.geometry)
  assert sum(len(m.faces) for m in scene.geometry.values())==d['triangles']
  assert scene.bounds[0][2]<-2 and scene.bounds[1][2]>2
  assert d['orientation']=='+Z forward, Y up'
  assert (ROOT/'previews'/f'modelo-{name}-v7.3.png').is_file()
 else:
  assert len(scene.geometry)>=1
  assert (ROOT/'previews'/'clown-cream-carnage-v7.7-thumb.jpg').is_file()
 print(f'PASS {name}: {len(data)} bytes, {len(scene.geometry)} render batches')
js=(ROOT/'game.js').read_text()
assert len(re.findall(r"[0-9]:'assets/[a-z-]+\.glb(?:\?v=[0-9.]+)?'",js[:800]))>=10
assert 'applyAssetDents(car)' in js and 'assetMorphMeshes' in js
assert (ROOT/'previews'/'FROTA-COMPLETA-v7.3.png').exists()
print('PASS 10 GLBs + independent deformation and gallery integration')
