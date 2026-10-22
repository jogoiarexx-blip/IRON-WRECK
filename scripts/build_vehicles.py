"""Reproducible ORIGINAL CC0-independent vehicle art authored for IRON WRECK.
Writes two glTF binary meshes with +Z front / Y up and garage-sized dimensions.
No third-party meshes or proprietary game art are embedded.
"""
import math, os, json
import numpy as np
import trimesh
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
COLORS={
 'bus_yellow':'e1ad43','bus_panel':'b8832d','bus_roof':'262f3a','windows':'283d4d','reflection':'739ead',
 'highlights':'d2dce3','metal':'8896a4','steel':'46515c','dark':'24272d','rubber':'191c20',
 'lamp':'fff2c4','red':'bf3030','warning':'f9c14c','truck_green':'5b885b','truck_light':'83ad81',
 'truck_hopper':'35594c','truck_armor':'3a4c4c','rust':'8a5034','white':'dfddd5','grille':'202a31'
}

def rgba(name):
 h=COLORS.get(name,name).lstrip('#'); return bytes.fromhex(h) + b'\xff'

class Build:
 def __init__(self,name):self.scene=trimesh.Scene();self.name=name;self.count=0
 def put(self,mesh,name,color):
  mesh.visual.face_colors=np.tile(np.frombuffer(rgba(color),dtype=np.uint8),(len(mesh.faces),1))
  self.scene.add_geometry(mesh,geom_name=f'{self.name}_{self.count:03d}_{name}')
  self.count+=1
 def box(self,name,size,pos,color):
  m=trimesh.creation.box(extents=size)
  m.apply_translation(pos)
  self.put(m,name,color)
 def cylinder(self,name,radius,height,pos,color,axis='y',sections=12):
  m=trimesh.creation.cylinder(radius,height,sections=sections)
  if axis=='y':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[1,0,0]))
  if axis=='x':m.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
  m.apply_translation(pos);self.put(m,name,color)
 def slope(self,name,top,base,y0,y1,z0,z1,color):
  # Beveled body shell cross-section, top narrower than base (8 vertices).
  a,b=base/2,top/2
  verts=np.array([[-a,y0,z0],[a,y0,z0],[a,y0,z1],[-a,y0,z1],[-b,y1,z0],[b,y1,z0],[b,y1,z1],[-b,y1,z1]])
  fs=np.array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])
  self.put(trimesh.Trimesh(vertices=verts,faces=fs,process=False),name,color)
 def plate(self,name,w,h,x,y,z,color): self.box(name,(w,h,.045),(x,y,z),color)

def bus():
 v=Build('omega_bus');w=5.05;front=7.50;back=-7.50
 v.slope('armored_lower_body',4.88,5.00,2.46,3.85,back+.35,front-.4,'bus_yellow')
 v.slope('armored_upper_body',4.42,4.84,3.83,5.62,back+.34,front-.53,'bus_yellow')
 v.box('roof_top',(4.55,.24,14.6),(0,5.76,0),'bus_roof')
 for side in (-1,1):
  x=side*2.44
  v.box('side_long_cargo_strip',(.1,.38,13.5),(x,2.64,-.3),'metal')
  v.box('yellow_horizontal_trim',(.085,.1,13.9),(x,3.56,-.23),'warning')
  v.box('red_danger_trim',(.09,.17,13.4),(x,2.93,-.23),'red')
  for k in range(7):
   z=-5.7+1.74*k
   v.box('sloped_window_side',(.092,1.10,1.43),(side*2.35,4.7,z),'windows')
   v.box('window_lower_chrome',(.105,.065,1.44),(side*2.412,4.10,z),'highlights')
   for yy in (4.22,5.16):v.box('rivet_holder',(.13,.08,.08),(side*2.418,yy,z-.56),'steel')
  for z in (-6.5,6.5):
   v.box('corner_protection',(.31,2.4,.34),(side*2.31,3.93,z),'steel')
  v.box('boarding_door',(.14,1.96,1.33),(side*2.43,3.58,4.72),'dark')
  for z in (4.25,5.18):v.box('door_glass',(.15,.83,.47),(side*2.52,4.12,z),'reflection')
  v.box('side_mirror_arm',(.85,.15,.15),(side*2.68,4.9,6.64),'steel')
  v.box('side_mirror',(.27,.47,.56),(side*3.05,4.89,6.61),'dark')
  v.box('side_mirror_glass',(.035,.33,.42),(side*3.20,4.89,6.68),'reflection')
  for z in (-5.7,5.7):
   v.box('armored_skirt',(.12,.68,1.65),(side*2.48,2.33,z),'bus_panel')
  for zz in [-6.5,-4.2,-1.9,.4,2.7,5.0]:
   v.box('roof_handrail',(0.16,.2,.74),(side*1.75,6.08,zz),'metal')
 for x in (-1.01,1.01):
  v.box('front_windscreen',(1.91,1.3,.07),(x,4.72,7.17),'windows')
  v.box('windshield_guard',(.09,1.42,.2),(x*1.90,4.71,7.25),'steel')
 for yy in [3.0,3.3,3.6]:
  v.box('front_grille_louver',(3.65,.12,.18),(0,yy,7.58),'steel')
 v.box('destination_sign',(3.5,.38,.1),(0,5.49,7.23),'grille')
 v.box('front_armored_bumper',(5.52,.59,.51),(0,1.88,7.76),'metal')
 v.box('rear_bar',(5.48,.52,.47),(0,1.9,-7.74),'steel')
 for side in (-1,1):
  for yy in (2.2,2.85):
   v.box('front_lamp',(.71,.23,.15),(side*1.71,yy,7.68),'lamp')
  v.box('rear_light',(.45,.89,.17),(side*2.13,3.13,-7.68),'red')
 for zz in (-2.15,3.85):
  v.box('roof_hvac_case',(2.2,.62,2.3),(0,6.2,zz),'metal')
  for xx in (-.8,-.4,0,.4,.8):v.box('hvac_vent',(0.14,.05,1.55),(xx,6.53,zz),'dark')
 for zz in (-5.2,-4.6,4.4,5.0):
  for xx in (-1.1,1.1):v.box('underbody_crossmember',(.18,.21,.74),(xx,1.95,zz),'steel')
 # front armored grille protection
 for xx in (-1.95,-1.2,0,1.2,1.95):v.box('ram_front_vertical',(.18,1.2,.3),(xx,2.35,7.93),'steel')
 for yy in (2.0,2.95):v.box('ram_front_horizontal',(4.5,.16,.32),(0,yy,7.94),'metal')
 return v

def garbage():
 v=Build('grinder');w=5.1;front=5.80;back=-5.80
 v.box('load_chassis',(4.75,.64,10.8),(0,1.66,0),'dark')
 v.slope('cab_beveled_shell',4.65,5.03,2.15,4.72,1.1,5.54,'truck_green')
 v.box('cab_roof',(4.65,.26,4.15),(0,4.86,3.30),'truck_light')
 v.box('cab_windshield',(4.05,1.06,.11),(0,4.00,5.59),'windows')
 v.box('cab_grille',(3.46,.91,.21),(0,2.65,5.84),'grille')
 for y in (2.36,2.62,2.9,3.14):v.box('cab_grille_rib',(3.24,.10,.27),(0,y,6.02),'highlights')
 for side in (-1,1):
  x=side*2.48
  v.box('cab_side_window',(.12,1.08,1.23),(x,4.02,3.68),'windows')
  v.box('door_line',(.16,1.36,.08),(side*2.51,3.0,2.22),'dark')
  v.box('door_handle',(.19,.13,.47),(side*2.58,3.45,3.13),'highlights')
  v.box('side_step',(.48,.18,1.7),(side*2.55,1.82,3.35),'metal')
  v.box('mirror_arm',(.6,.12,.11),(side*2.81,4.31,5.05),'steel')
  v.box('mirror_body',(.24,.54,.38),(side*3.1,4.26,5.05),'dark')
  v.box('rear_cab_air_pipe',(.23,2.05,.25),(side*1.97,4.21,.94),'steel')
  v.cylinder('exhaust_pipe',.22,1.6,(side*2.03,5.0,.98),'metal')
  for zz in [-4.7,-3.55,-2.4,-1.25,0]:v.box('hopper_rib',(.19,2.7,.19),(side*2.47,3.50,zz),'steel')
  v.box('hopper_side_stripe',(.11,.21,6.3),(side*2.50,3.22,-2.10),'warning')
  v.box('hopper_lower_wear_strip',(.1,.40,7),(side*2.48,2.12,-2.1),'rust')
 for side in (-1,1):
  v.box('cab_headlamp',(.71,.30,.19),(side*1.8,2.65,6.04),'lamp')
  v.box('orange_warning_light',(.27,.15,.38),(side*1.38,5.13,3.3),'warning')
 # loader hopper with thicker tapered walls, ribs and rear movable-looking panel
 v.slope('hopper_shaped_shell',4.64,4.93,2.22,4.92,-5.36,1.12,'truck_hopper')
 v.box('hopper_reinforced_roof',(4.84,.34,6.7),(0,5.08,-2.12),'truck_armor')
 v.box('compactor_backdoor',(4.54,2.8,.52),(0,3.34,-5.66),'truck_green')
 v.box('compactor_blade',(3.67,1.02,.37),(0,2.85,-5.98),'steel')
 v.box('rear_chute',(3.85,.42,1.04),(0,2.05,-5.89),'rust')
 for y in (2.2,2.7,3.25,4.3):
  v.box('backdoor_horizontal_rib',(4.5,.16,.20),(0,y,-5.96),'metal')
 for x in (-2.1,2.1):
  v.box('backdoor_hydraulic',(.35,3.55,.35),(x,3.54,-5.86),'steel')
  for y in (2.4,4.1):v.box('rear_hinge',(.47,.28,.41),(x,y,-6.04),'metal')
 for xx in (-1.7,1.7):
  for zz in (-4.6,-3.3,-2.0,-.7):
   v.box('roof_debris_fins',(.14,.25,1.02),(xx,5.37,zz),'steel')
 for zz in (-4.6,-2.4,-.2):
  for xx in (-1.83,1.83):v.box('floor_support',(.28,.29,1.5),(xx,1.87,zz),'metal')
 for xx in (-1.8,1.8):
  v.box('rear_light',(.41,.75,.18),(xx,2.45,-6.12),'red')
  v.box('front_bumper_guard',(.26,.76,.39),(xx,1.88,6.04),'steel')
 v.box('armored_front_bumper',(5.48,.55,.41),(0,1.72,6.11),'metal')
 return v

def main():
 (ROOT/'assets').mkdir(exist_ok=True)
 manifest={}
 for name,fn in [('omega-bus',bus),('grinder',garbage)]:
  obj=fn();path=ROOT/'assets'/f'{name}.glb'
  # Combine triangles of the same paint into one material/draw call. This keeps
  # all 140/77 modeled details while avoiding hundreds of WebGL mesh draws.
  groups={}
  for geom in obj.scene.geometry.values():
   key=bytes(geom.visual.face_colors[0])
   groups.setdefault(key,[]).append(geom)
  optimized=trimesh.Scene()
  for i,(color,geoms) in enumerate(groups.items()):
   merged=trimesh.util.concatenate(geoms)
   merged.visual.face_colors=np.tile(np.frombuffer(color,dtype=np.uint8),(len(merged.faces),1))
   optimized.add_geometry(merged,geom_name=f'{name}_material_{i:02d}')
  path.write_bytes(optimized.export(file_type='glb'))
  loaded=trimesh.load(path,force='scene')
  bounds=np.asarray(loaded.bounds);size=(bounds[1]-bounds[0]).tolist()
  if path.stat().st_size>600_000:raise ValueError('GLB too large '+str(path))
  if obj.count<55 or len(loaded.geometry)<6:raise ValueError('Not enough detail parts or batches')
  assert bounds[1][2]>0 and bounds[0][2]<0
  manifest[name]={'file':f'assets/{name}.glb','source':'original geometry authored for Iron Wreck 7.2','orientation':'+Z forward, Y up','bytes':path.stat().st_size,'parts':obj.count,'renderMeshes':len(optimized.geometry),'triangles':sum(len(g.faces) for g in optimized.geometry.values()),'bounds':bounds.tolist(),'size':size}
  print(name,manifest[name])
 (ROOT/'assets'/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
if __name__=='__main__':main()
