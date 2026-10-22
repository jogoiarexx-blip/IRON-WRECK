"""Original low-poly vehicle shells for Iron Wreck; +Z forward, Y up.
Independently-authored meshes. No external artwork/meshes are embedded.
"""
from pathlib import Path
import sys, numpy as np, trimesh, json
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_vehicles import Build, rgba, COLORS
ROOT=Path(__file__).resolve().parents[1]
COLORS.update({
 'marauder':'bf9b3e','marauder_shadow':'695828','phantom':'36bfc9','phantom_shadow':'1d6976',
 'titan':'b85442','titan_shadow':'6e3a31','frost':'ed9cbb','frost_shadow':'d0dfec',
 'hookjaw':'bc6e32','hookjaw_shadow':'65503c','inferno':'ca3635','inferno_shadow':'722d31',
 'sentinel':'4874b1','sentinel_shadow':'253e63','goliath':'8d73c7','goliath_shadow':'55427e',
 'ice':'a5efff','ice_white':'e6f8fa','police_red':'d6463e','police_blue':'4c93eb',
 'gold':'f3cd75','black':'1d2530','light_blue':'88d6e4'})
PROFILES={
 'marauder':(4.15,7.65,2.55),'phantom':(3.9,7.8,2.30),'titan':(4.9,8.7,4.1),
 'frost-van':(4.35,8.6,3.85),'hookjaw':(4.8,10.4,4.15),'inferno':(5.,12.5,4.85),
 'sentinel':(4.4,8.15,3.4),'goliath':(5.55,9.35,3.45)}

def shell(key):
 w,L,roof=PROFILES[key]; F=L/2; B=-L/2; v=Build(key); color=key.replace('-van','')
 # chassis with wheel arches handled by independent original in-game wheel assemblies
 v.box('heavy_frame',(w*.9,.48,L*.91),(0,1.58,0),'black')
 v.slope('body_canted',w*.91,w*.99,1.97,2.35,B+.23,F-.23,color)
 v.box('armor_belly',(w*.86,.16,L*.92),(0,1.87,0),'steel')
 for s in [-1,1]:
  x=s*w*.495
  v.box('side_rocker',(.16,.35,L*.84),(x,1.77,0),'dark')
  v.box('side_vinyl_stripe',(.105,.095,L*.66),(x,2.35,0),color+'_shadow')
  for z in (-F*.69, F*.68):
   v.box('fender_rib',(.12,.53,.85),(x,2.11,z),'steel')
   v.box('corner_mudguard',(.16,.58,.48),(x,1.78,z+.38),'dark')
  v.box('exposed_side_pipe',(.20,.2,L*.5),(s*w*.44,1.69,-.35),'metal')
 for z,cls in [(F+.18,'metal'),(B-.18,'steel')]:
  v.box('armored_bumper',(w*1.08,.43,.35),(0,1.72,z),cls)
  for s in (-1,1):
   v.box('bumper_bolt',(.15,.25,.38),(s*w*.37,1.74,z),'black')
 for s in (-1,1):
  v.box('headlight',(.60,.28,.18),(s*w*.33,2.17,F+.30),'lamp')
  v.box('taillight',(.36,.35,.14),(s*w*.38,2.10,B-.32),'red')
 return v,w,L,F,B,roof

def armored_windows(v,w,F,B,y,zlo,zhi):
 v.box('front_windscreen',(w*.73,.85,.11),(0,y,F-.29),'windows')
 v.box('rear_glass',(w*.68,.64,.11),(0,y-.13,zlo),'windows')
 for s in (-1,1):
  v.box('side_tinted_glass',(.11,.78,max(.8,zhi-zlo)),(s*w*.46,y,(zhi+zlo)/2),'windows')
  v.box('side_mirror_arm',(.52,.13,.17),(s*w*.53,y+.05,zhi+.45),'metal')
  v.box('side_mirror',(.18,.45,.40),(s*w*.59,y+.05,zhi+.45),'dark')

def roof_guns(v,w,y,z,accent='steel'):
 v.box('turret_housing',(w*.28,.44,1.5),(0,y,z),accent)
 for s in [-1,1]:
  v.box('barrel',(.22,.20,2),(s*.35,y+.1,z+1.14),'black')
  v.box('barrel_ring',(.29,.31,.22),(s*.35,y+.1,z+2.1),'metal')

def make_car(key):
 v,w,L,F,B,roof=shell(key)
 col=key.replace('-van','');dark=col+'_shadow'
 if key in ('marauder','phantom','sentinel'):
  if key=='phantom':
   v.slope('wide_hood',w*.76,w*.92,2.32,2.64,.1,F-.4,col)
   v.slope('fighter_cabin',w*.68,w*.8,2.67,3.47,-F*.56,.65,'black')
   v.box('low_roof',(w*.62,.19,2.6),(0,3.50,-F*.22),col)
   armored_windows(v,w,F-.25,B,3.05,-F*.66,-F*.12)
   for s in [-1,1]:
    v.box('side_rocket_pod',(.5,.46,1.85),(s*w*.43,2.85,-.5),'black')
    for z in [-.92,-.5,-.08]:v.cylinder('rocket_nozzle',.15,.29,(s*w*.45,2.88,z),'red',axis='z',sections=8)
    v.box('rear_spoiler_pylon',(.20,.7,.28),(s*w*.32,3.45,B+.35),'steel')
   v.box('rear_mega_wing',(w*1.06,.12,.73),(0,3.82,B+.25),'metal')
   v.box('nose_guard',(w*.77,.2,.8),(0,2.22,F+.12),'steel')
  elif key=='marauder':
   v.slope('armored_muscle_hood',w*.88,w*.94,2.3,2.75,.10,F-.32,col)
   v.slope('cabin_taper',w*.78,w*.88,2.42,3.58,-2.7,-.2,'black')
   v.box('roof_rivets',(w*.67,.18,2.75),(0,3.61,-1.45),col)
   armored_windows(v,w,F-.21,B,3.05,-2.63,-.40)
   for s in [-1,1]:
    v.box('hood_engine_blower',(.65,.72,1.8),(s*.48,3.04,1.25),'black')
    for zz in [1.1,1.5,1.9]:v.box('blower_intake',(.53,.10,.17),(s*.48,3.45,zz),'steel')
    v.box('ram_fork',(.28,.77,1.8),(s*w*.36,2.05,F+.62),'metal')
    v.box('side_plate',(.19,.62,1.9),(s*w*.5,2.45,-.45),'steel')
   v.box('ram_blade',(w*1.12,.32,.43),(0,2.0,F+1.30),'steel')
  else:
   v.slope('suv_cabin',w*.82,w*.9,2.35,3.63,-2.1,1.70,col)
   v.box('bulletproof_roof',(w*.83,.25,3.8),(0,3.65,-.15),'black')
   armored_windows(v,w,F-.18,B,3.07,-2.0,1.55)
   for s in [-1,1]:
    v.box('offroad_fender',(.17,.83,1.72),(s*w*.51,2.19,s*1.2),'black')
    v.box('door_badge',(.11,.58,1.1),(s*w*.53,2.88,-.25),'ice_white')
    v.box('searchlight',(.5,.28,.61),(s*w*.38,3.92,2.0),'steel')
   v.box('roof_lightbar',(w*.7,.30,.66),(0,4.03,-.7),'metal')
   for s in [-1,1]:v.box('roof_emergency_beacon',(.77,.25,.51),(s*w*.19,4.27,-.7),'police_red' if s<0 else 'police_blue')
   v.box('front_push_bar',(w*.84,.78,.28),(0,2.09,F+.49),'steel')
 elif key in ('titan','frost-van','hookjaw','inferno'):
  if key=='titan':
   v.slope('tactical_cabin',w*.8,w*.97,2.2,4.12,.65,F-.40,col)
   v.box('windshield_gunport',(w*.65,.72,.12),(0,3.49,F-.15),'windows')
   v.slope('cargo_armored_box',w*.91,w*.97,2.36,3.87,B+.35,.55,dark)
   v.box('cargo_roof',(w*.92,.27,L*.47),(0,4.02,-L*.26),'steel')
   for s in [-1,1]:
    v.box('cab_windows',(.11,.77,1.0),(s*w*.48,3.45,F*.37),'windows')
    for z in [-L*.38,-L*.2,-L*.02]:v.box('cargo_armor_slats',(.15,1.73,.22),(s*w*.49,3.09,z),'steel')
    v.box('smoke_stack',(.40,2.15,.43),(s*w*.40,4.53,.5),'black')
   roof_guns(v,w,4.43,-.7)
  if key=='frost-van':
   v.slope('ice_cream_van',w*.91,w*.98,2.18,3.85,B+.32,F-.44,col)
   v.box('frozen_roof',(w*.94,.26,L*.9),(0,3.96,0),'ice_white')
   v.box('big_windscreen',(w*.79,.91,.1),(0,3.30,F-.24),'windows')
   for s in (-1,1):
    for k in range(3):v.box('pastel_window',(.13,.77,1.29),(s*w*.5,3.12,-2.6+1.85*k),'ice')
    v.box('pink_awning',(.66,.25,4.8),(s*w*.58,3.90,-.8),'ice_white')
    v.box('rear_ice_launcher',(.61,.6,1.9),(s*w*.29,4.2,-1.7),'ice')
   for z in [-2.8,-1.6,-.4,.8]:v.box('roof_candy_stripe',(w*.94,.14,.25),(0,4.07,z),'frost_shadow')
   v.cylinder('ice_cream_cone',.61,1.34,(0,4.87,-.25),'gold',sections=9)
   v.cylinder('ice_cream_ball',.79,.78,(0,5.58,-.25),'ice_white',sections=12)
  if key=='hookjaw':
   v.slope('tow_cabin',w*.86,w*.96,2.2,4.02,1.08,F-.42,col)
   v.box('front_glass',(w*.70,.92,.12),(0,3.40,F-.18),'windows')
   for s in (-1,1):
    v.box('side_glass',(.13,.86,1.1),(s*w*.49,3.41,2.05),'windows')
    for z in [-3.6,-2.3,-1.0]:v.box('deck_stripe',(.12,.13,.8),(s*w*.49,2.54,z),'warning')
   v.box('load_platform',(w*.89,.33,L*.63),(0,2.27,-L*.18),'metal')
   v.box('tow_crane_column',(w*.23,2.0,.85),(0,3.39,-1.2),'black')
   v.box('tow_crane_beam',(.72,.64,6.15),(0,4.45,-2.35),'warning')
   v.box('lift_cable',(.18,2.15,.20),(0,3.33,-5.25),'steel')
   v.box('hook_jaw',(1.25,.68,.68),(0,2.24,-5.35),'black')
   for s in (-1,1):v.box('hydraulic_tow_arm',(.19,.32,3.65),(s*1.32,3.27,-2.25),'steel')
  if key=='inferno':
   v.slope('fire_cabin',w*.85,w*.96,2.15,4.45,1.75,F-.44,col)
   v.box('front_window',(w*.79,1.20,.11),(0,3.72,F-.19),'windows')
   v.slope('water_reservoir',w*.85,w*.94,2.24,4.45,B+.33,1.53,col)
   v.box('equipment_roof',(w*.88,.22,L*.61),(0,4.59,-2.0),'steel')
   for s in (-1,1):
    for z in [-4.5,-2.8,-1.1,.5]:
     v.box('shutter_door',(.16,1.53,1.35),(s*w*.49,3.31,z),'metal')
     for yy in [2.85,3.1,3.35,3.6,3.85]:v.box('shutter_rib',(.18,.06,1.27),(s*w*.51,yy,z),'black')
    v.box('warning_side_stripe',(.11,.19,L*.80),(s*w*.51,2.50,-.42),'ice_white')
    v.box('ladder_rack',(.28,.20,8.10),(s*w*.28,5.0,-1.20),'gold')
   for z in [x*.85 for x in range(-5,5)]:v.box('ladder_step',(w*.57,.1,.18),(0,5.1,z-1.4),'steel')
   v.cylinder('water_cannon',.48,2.05,(0,5.22,.85),'ice',axis='z')
   v.box('roof_hose_spool',(1.6,.4,1.8),(0,4.9,-4.5),'dark')
 else:  # monster truck, visibly lifted in game by massive separate wheels
  v.slope('lifted_goliath',w*.72,w*.82,2.45,3.15,-3.65,3.75,col)
  v.slope('pickup_roof',w*.57,w*.67,3.11,4.32,-2.95,1.05,'black')
  v.box('armored_turret_top',(w*.55,.21,3.4),(0,4.4,-.85),col)
  v.box('front_glass',(w*.54,.75,.11),(0,3.71,1.15),'windows')
  v.box('roll_cage_cross',(w*.75,.27,1.35),(0,4.62,-2.22),'steel')
  for s in (-1,1):
   v.box('roll_cage_side',(.22,1.17,3.1),(s*w*.32,3.70,-1.1),'steel')
   v.box('monster_footplate',(.4,.24,3.1),(s*w*.54,2.20,0),'metal')
   v.box('front_jump_ram',(.4,1.30,1.8),(s*w*.28,2.35,F+.2),'steel')
  v.box('roof_spotlights',(w*.56,.24,.55),(0,4.53,1.0),'gold')
  v.box('front_stomp_rig',(w*.9,.36,.46),(0,1.88,F+.62),'steel')
 return v

def export_one(key):
 v=make_car(key);by_material={}
 for geom in v.scene.geometry.values():
  key_color=bytes(geom.visual.face_colors[0]);by_material.setdefault(key_color,[]).append(geom)
 out=trimesh.Scene()
 for i,(color,geos) in enumerate(by_material.items()):
  merged=trimesh.util.concatenate(geos)
  merged.visual.face_colors=np.tile(np.frombuffer(color,dtype=np.uint8),(len(merged.faces),1))
  out.add_geometry(merged,geom_name=f'{key}_batch{i:02d}')
 path=ROOT/'assets'/f'{key}.glb';path.write_bytes(out.export(file_type='glb'))
 loaded=trimesh.load(path,force='scene');b=loaded.bounds
 return {'file':f'assets/{key}.glb','source':'Original procedural geometry IRON WRECK v7.3','orientation':'+Z forward, Y up','bytes':path.stat().st_size,'parts':v.count,'renderMeshes':len(loaded.geometry),'triangles':sum(len(g.faces) for g in loaded.geometry.values()),'bounds':b.tolist(),'size':(b[1]-b[0]).tolist()}

def main():
 (ROOT/'assets').mkdir(exist_ok=True)
 manifest=json.loads((ROOT/'assets/manifest.json').read_text())
 for key in PROFILES:
  entry=export_one(key)
  assert entry['parts']>=30 and entry['renderMeshes']<=20 and entry['bytes']<120000, (key,entry)
  manifest[key]=entry
  print(f'{key}: parts={entry["parts"]}, batches={entry["renderMeshes"]}, faces={entry["triangles"]}, bytes={entry["bytes"]}')
 (ROOT/'assets/manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
if __name__=='__main__':main()
