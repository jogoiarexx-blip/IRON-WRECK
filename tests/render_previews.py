"""VTK software preview of actual JS procedural geometry exported by export_geometry.js.
These are technical model renders, NOT in-game WebGL screenshots.
"""
import json, math
import numpy as np
from scipy.spatial.transform import Rotation
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import vtk
ROOT=Path(__file__).resolve().parents[1]
PREVIEW=ROOT/'previews';PREVIEW.mkdir(exist_ok=True)
data=json.loads((ROOT/'tests/models-export.json').read_text())
for a in data['arenaData'].values():a['visible']=True
hexs=[0xeabd39,0x36c8d5,0xcf664b,0xe6a93b,0x568b54,0xf5a3c0,0xd67c39,0xda3834,0x5177b7,0x8e71d3]
names=['MARAUDER','PHANTOM','TITAN','OMEGA BUS','GRINDER','FROST VAN','HOOKJAW','INFERNO','SENTINEL','GOLIATH']
descr=['MUSCLE BLINDADO','INTERCEPTADOR','CAMINHÃO MILITAR','ÔNIBUS BLINDADO','CAMINHÃO DE LIXO','VAN DE SORVETE','GUINCHO ARMADO','CAMINHÃO BOMBEIRO','SUV POLICIAL','MONSTER TRUCK']
ARENA_NAMES=['DESERTO DE FERRO','CIDADE FANTASMA','PORTO DAS SOMBRAS']
ARENA_DESCR=['Sucata, tanques de combustível e canyons','Ruas devastadas, fachadas e ônibus abandonados','Contêineres, guindastes e cais industrial']
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
cache={}
def src(node):
 kind=node['kind'];args=node['args']
 key=(kind,tuple(args[:6]))
 if key in cache:return cache[key]
 s=None
 try:
  if kind=='BoxGeometry':
   s=vtk.vtkCubeSource();s.SetXLength(args[0]);s.SetYLength(args[1]);s.SetZLength(args[2]);
  elif kind in ('SphereGeometry','IcosahedronGeometry'):
   s=vtk.vtkSphereSource();s.SetRadius(args[0]);s.SetThetaResolution(12);s.SetPhiResolution(9)
  elif kind=='CylinderGeometry':
   s=vtk.vtkCylinderSource();s.SetRadius((args[0]+args[1])/2);s.SetHeight(args[2]);s.SetResolution(min(20,args[3] if len(args)>3 else 14));s.CappingOn()
  elif kind=='ConeGeometry':
   s=vtk.vtkConeSource();s.SetRadius(args[0]);s.SetHeight(args[1]);s.SetResolution(min(18,args[2] if len(args)>2 else 12));s.SetDirection(0,1,0)
  elif kind=='TorusGeometry':
   tor=vtk.vtkParametricTorus();tor.SetRingRadius(args[0]);tor.SetCrossSectionRadius(args[1]);s=vtk.vtkParametricFunctionSource();s.SetParametricFunction(tor);s.SetUResolution(28);s.SetVResolution(7)
  elif kind=='PlaneGeometry':
   s=vtk.vtkPlaneSource();s.SetOrigin(-args[0]/2,-args[1]/2,0);s.SetPoint1(args[0]/2,-args[1]/2,0);s.SetPoint2(-args[0]/2,args[1]/2,0)
 except: pass
 if s:cache[key]=s
 return s

def trmat(node):
 x,y,z=node['position'];rx,ry,rz=node['rotation'];sx,sy,sz=node['scale']
 A=np.eye(4);A[:3,3]=[x,y,z]
 B=np.eye(4);B[:3,:3]=Rotation.from_euler('XYZ',[rx,ry,rz]).as_matrix()
 S=np.diag([sx,sy,sz,1]);return A@B@S

def add_items(renderer,node,parent=None,limit=1e9,center_only=False):
 if not node.get('visible',True):return 0
 matrix=trmat(node);world=matrix if parent is None else parent@matrix
 total=0
 if node['kind']:
  obj=src(node)
  if obj is not None:
   loc=world[:3,3]
   if not center_only or math.hypot(loc[0],loc[2])<limit:
    mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(obj.GetOutputPort());actor=vtk.vtkActor();actor.SetMapper(mapper)
    mat=vtk.vtkMatrix4x4()
    for i in range(4):
     for j in range(4):mat.SetElement(i,j,float(world[i,j]))
    actor.SetUserMatrix(mat)
    v=int(node['color'] or 0x999999)
    rgb=tuple(((v>>sh)&255)/255 for sh in (16,8,0));actor.GetProperty().SetColor(*rgb)
    actor.GetProperty().SetDiffuse(.78);actor.GetProperty().SetSpecular(.23);actor.GetProperty().SetSpecularPower(30)
    if node['kind']=='PlaneGeometry':actor.GetProperty().SetAmbient(.36)
    renderer.AddActor(actor);total+=1
 for c in node['children']:
  total+=add_items(renderer,c,world,limit,center_only)
 return total

def capture(filename,node,kind='car',length=8,env='wasteland'):
 W,H=(650,390) if kind=='car' else (850,465)
 renderer=vtk.vtkRenderer()
 colors={'wasteland':(.17,.22,.26),'city':(.14,.21,.29),'harbor':(.17,.24,.29)}
 renderer.SetBackground(*colors.get(env,(.12,.17,.24)))
 # no outdoor skybox; this deliberately represents model geometry.
 window=vtk.vtkRenderWindow();window.SetOffScreenRendering(1);window.SetSize(W,H);window.SetMultiSamples(4)
 window.AddRenderer(renderer)
 lights=[((60,120,80),.98),((-90,70,-75),.45),((10,45,-100),.5)]
 for xyz,power in lights:
  light=vtk.vtkLight();light.SetPosition(*xyz);light.SetFocalPoint(0,0,0);light.SetIntensity(power);renderer.AddLight(light)
 if kind=='car':
  ground=vtk.vtkCubeSource();ground.SetXLength(max(19,length*1.75));ground.SetZLength(max(22,length*1.9));ground.SetYLength(.17);ground.SetCenter(0,-.33,0)
  mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(ground.GetOutputPort());actor=vtk.vtkActor();actor.SetMapper(mapper);actor.GetProperty().SetColor(.16,.21,.26);renderer.AddActor(actor)
  # contact shadows: translucent concentric discs
  for r,a in [(1.2,.1),(.92,.12),(.68,.14)]:
   shadow=vtk.vtkCylinderSource();shadow.SetRadius(max(4.3,length*.49)*r);shadow.SetHeight(.02);shadow.SetCenter(0,-.13,0);shadow.SetResolution(38)
   mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(shadow.GetOutputPort());act=vtk.vtkActor();act.SetMapper(mapper);act.GetProperty().SetColor(.02,.04,.07);act.GetProperty().SetOpacity(a);renderer.AddActor(act)
  add_items(renderer,node)
  target=(0,2.5,0);c=length*.97;camera=(c*.97,c*.8,c*1.48);scale=max(4.8,length*.62)
 else:
  add_items(renderer,node,limit=138,center_only=True)
  target=(0,3,0);camera=(142,157,166);scale=111
 cam=renderer.GetActiveCamera();cam.SetFocalPoint(*target);cam.SetPosition(*camera);cam.SetViewUp(0,1,0)
 cam.ParallelProjectionOn();cam.SetParallelScale(scale)
 renderer.ResetCameraClippingRange()
 window.Render()
 flt=vtk.vtkWindowToImageFilter();flt.SetInput(window);flt.SetInputBufferTypeToRGB();flt.ReadFrontBufferOff();flt.Update()
 wr=vtk.vtkPNGWriter();wr.SetFileName(str(filename));wr.SetInputConnection(flt.GetOutputPort());wr.Write()
 window.Finalize()
 return Image.open(filename).convert('RGB')

print('Rendering ten actual procedural model geometries...',flush=True)
for i,n in enumerate(data['carData']):
 fn=PREVIEW/f'carro-{i+1:02d}-{names[i].lower().replace(" ","-")}.png'
 capture(fn,n,length=[7.65,7.8,8.7,15,11.6,8.6,10.4,12.5,8.15,9.35][i])
 print(i+1,names[i],flush=True)
print('Rendering arenas...',flush=True)
for i,(k,n) in enumerate(data['arenaData'].items()):
 capture(PREVIEW/f'cenario-{k}.png',n,kind='arena',env=k)
 print(k,flush=True)
# composite studio cards based on actual exported JS geometry, with accurate labels
fnt=lambda size,bold=False:ImageFont.truetype(BOLD if bold else FONT,size)
COLORS=[tuple((n>>s)&255 for s in (16,8,0)) for n in hexs]
BG=(14,21,31);panel=(23,34,47);muted=(159,178,190);gold=(242,195,102)
W=1960;card_w=368;card_h=375;gap=18;x0=22;y0=144
out=Image.new('RGB',(W,926),BG);d=ImageDraw.Draw(out)
d.text((24,18),'IRON WRECK / V6.0',font=fnt(54,True),fill=gold)
d.text((26,87),'GARAGEM DE GUERRA  •  10 CARROCERIAS REAIS DO CÓDIGO 3D',font=fnt(22,True),fill=(241,246,249))
d.text((26,117),'Prévia renderizada a partir das geometrias procedurais; não é captura do jogo WebGL.',font=fnt(17),fill=muted)
for i in range(10):
 x=x0+(i%5)*(card_w+gap);y=y0+(i//5)*(card_h+18)
 d.rounded_rectangle((x,y,x+card_w,y+card_h),radius=15,fill=panel,outline=(75,93,109),width=2)
 d.rectangle((x+13,y+12,x+70,y+19),fill=COLORS[i]);d.text((x+15,y+35),names[i],font=fnt(24,True),fill='white')
 d.text((x+15,y+69),descr[i],font=fnt(14),fill=muted)
 fn=PREVIEW/f'carro-{i+1:02d}-{names[i].lower().replace(" ","-")}.png';im=Image.open(fn)
 im=im.resize((card_w-28,235),Image.Resampling.LANCZOS)
 out.paste(im,(x+14,y+101));d.text((x+16,y+344),f'#{i+1:02d}  •  ARMADO + DETALHADO',font=fnt(14,True),fill=gold)
out.save(PREVIEW/'carros-v6.png',optimize=True)
# arenas at original geometry
W=1800;out=Image.new('RGB',(W,790),BG);d=ImageDraw.Draw(out)
d.text((25,18),'IRON WRECK / V6.0',font=fnt(50,True),fill=gold)
d.text((28,81),'TRÊS ARENAS DE COMBATE',font=fnt(25,True),fill=(241,246,249))
d.text((29,120),'Geometrias renderizadas externamente ao navegador • prévias técnicas, não screenshots da partida.',font=fnt(18),fill=muted)
for i,(k,n) in enumerate(data['arenaData'].items()):
 x=24+i*592;y=180
 d.rounded_rectangle((x,y,x+566,748),radius=16,fill=panel,outline=(72,94,115),width=2)
 im=Image.open(PREVIEW/f'cenario-{k}.png').resize((530,390),Image.Resampling.LANCZOS);out.paste(im,(x+18,y+21))
 d.text((x+21,y+437),ARENA_NAMES[i],font=fnt(24,True),fill=gold)
 d.text((x+21,y+487),ARENA_DESCR[i],font=fnt(15),fill='white')
 d.text((x+22,y+519),f'ARENA #{i+1} • cenário gerado por código',font=fnt(14),fill=muted)
out.save(PREVIEW/'cenarios-v6.png',optimize=True)
print('Composite PNG created',flush=True)
