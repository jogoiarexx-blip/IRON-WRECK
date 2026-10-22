"""Software previews of the actual GLB meshes (not Three.js screenshots)."""
from pathlib import Path
import numpy as np, trimesh, vtk
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
PRE=ROOT/'previews';PRE.mkdir(exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def f(n,b=False):return ImageFont.truetype(BOLD if b else FONT,n)
def capture(key,length):
 scene=trimesh.load(ROOT/'assets'/f'{key}.glb',force='scene')
 R=vtk.vtkRenderer();R.SetBackground(.09,.145,.21);W=vtk.vtkRenderWindow();W.SetOffScreenRendering(1);W.SetSize(860,550);W.SetMultiSamples(4);W.AddRenderer(R)
 for position,intensity in [((75,95,110),1.3),((-64,40,-50),.52),((55,35,-90),.40)]:
  l=vtk.vtkLight();l.SetPosition(*position);l.SetFocalPoint(0,3,0);l.SetIntensity(intensity);R.AddLight(l)
 ground=vtk.vtkCubeSource();ground.SetXLength(26);ground.SetYLength(.18);ground.SetZLength(32);ground.SetCenter(0,-.35,0)
 gm=vtk.vtkPolyDataMapper();gm.SetInputConnection(ground.GetOutputPort());ga=vtk.vtkActor();ga.SetMapper(gm);ga.GetProperty().SetColor(.16,.23,.30);R.AddActor(ga)
 for geo in scene.geometry.values():
  pts=vtk.vtkPoints();vertices=np.asarray(geo.vertices)
  for x,y,z in vertices:pts.InsertNextPoint(float(x),float(y),float(z))
  cells=vtk.vtkCellArray()
  for a,b,c in geo.faces:
   t=vtk.vtkTriangle();t.GetPointIds().SetId(0,int(a));t.GetPointIds().SetId(1,int(b));t.GetPointIds().SetId(2,int(c));cells.InsertNextCell(t)
  pd=vtk.vtkPolyData();pd.SetPoints(pts);pd.SetPolys(cells)
  norms=vtk.vtkPolyDataNormals();norms.SetInputData(pd);norms.SplittingOff();norms.ConsistencyOn();norms.Update()
  mp=vtk.vtkPolyDataMapper();mp.SetInputConnection(norms.GetOutputPort())
  act=vtk.vtkActor();act.SetMapper(mp)
  color=np.asarray(geo.visual.face_colors)[0][:3]/255
  act.GetProperty().SetColor(*[float(k) for k in color]);act.GetProperty().SetAmbient(.19);act.GetProperty().SetDiffuse(.82);act.GetProperty().SetSpecular(.2)
  R.AddActor(act)
 # Wheels and turret stay procedural in-game; include their proportions in the preview.
 width=5.05 if key=='omega-bus' else 5.1
 wheel=1.4 if key=='omega-bus' else 1.43
 axleZ=[-length*.38,0,length*.37] if key=='omega-bus' else [-length*.35,length*.33]
 for x in (-width*.55,width*.55):
  for z in axleZ:
   for radius,thick,rgb,offset in [(wheel,1.07,(.085,.090,.10),0),(wheel*.48,1.16,(.68,.73,.79),.03)]:
    wheelGeo=vtk.vtkCylinderSource();wheelGeo.SetRadius(radius);wheelGeo.SetHeight(thick);wheelGeo.SetResolution(20);wheelGeo.SetCenter(0,0,0)
    mp=vtk.vtkPolyDataMapper();mp.SetInputConnection(wheelGeo.GetOutputPort());a=vtk.vtkActor();a.SetMapper(mp)
    a.RotateZ(90);a.SetPosition(x+(offset if x>0 else -offset),wheel*.9,z);a.GetProperty().SetColor(*rgb)
    R.AddActor(a)
 turretHeight=6.45 if key=='omega-bus' else 5.58
 def addBox(widths,xyz,color):
  b=vtk.vtkCubeSource();b.SetXLength(widths[0]);b.SetYLength(widths[1]);b.SetZLength(widths[2])
  bm=vtk.vtkPolyDataMapper();bm.SetInputConnection(b.GetOutputPort());a=vtk.vtkActor();a.SetMapper(bm);a.SetPosition(*xyz);a.GetProperty().SetColor(*color);R.AddActor(a)
 addBox((1.5,.6,1.8),(0,turretHeight+.2,.5),(.57,.61,.63))
 for bx in (-.38,.38):addBox((.23,.20,2.3),(bx,turretHeight+.35,1.78),(.18,.19,.21))
 cam=R.GetActiveCamera();cam.SetFocalPoint(0,3,0);cam.SetPosition(length*.75,length*.53,length*.91);cam.SetViewUp(0,1,0);cam.ParallelProjectionOn();cam.SetParallelScale(length*.72);R.ResetCameraClippingRange()
 W.Render()
 wt=vtk.vtkWindowToImageFilter();wt.SetInput(W);wt.SetInputBufferTypeToRGB();wt.ReadFrontBufferOff();wt.Update()
 save=PRE/f'modelo-{key}-v7.2.png';writer=vtk.vtkPNGWriter();writer.SetFileName(str(save));writer.SetInputConnection(wt.GetOutputPort());writer.Write();W.Finalize()
 return Image.open(save).convert('RGB')

def render():
 keys=[('omega-bus','OMEGA BUS','ÔNIBUS DE ASSALTO • 140 DETALHES','13 lotes de renderização'),('grinder','GRINDER','COMPACTADOR DE GUERRA • 77 DETALHES','14 lotes de renderização')]
 canvas=Image.new('RGB',(1860,1080),(13,20,30));d=ImageDraw.Draw(canvas)
 d.text((56,24),'IRON WRECK  /  v7.2',font=f(65,True),fill=(248,202,114))
 d.text((57,108),'FROTA BLINDADA — NOVOS MODELOS GLB',font=f(27,True),fill='white')
 d.text((57,147),'Prévia técnica dos GLBs originais exportados; não é captura da partida WebGL.',font=f(20),fill=(161,182,200))
 for i,(slug,name,sub,dc) in enumerate(keys):
  x=46+i*900;y=225
  d.rounded_rectangle((x,y,x+870,y+784),radius=24,fill=(25,35,48),outline=(76,96,112),width=3)
  d.text((x+35,y+24),name,font=f(39,True),fill=(255,228,166))
  d.text((x+37,y+91),sub,font=f(19,True),fill=(202,215,225))
  img=capture(slug,15 if i==0 else 12)
  canvas.paste(img,(x+4,y+143))
  d.text((x+36,y+710),f'{dc} • GLB local • licença do modelo: original',font=f(18),fill=(167,200,214))
  d.text((x+36,y+744),'Armas, rodas e danos são preservados no motor do jogo.',font=f(17),fill=(175,190,198))
 outfile=PRE/'FROTA-BLINDADA-V7.2.png';canvas.save(outfile,optimize=True)
 print(outfile, outfile.stat().st_size)
if __name__=='__main__':render()
