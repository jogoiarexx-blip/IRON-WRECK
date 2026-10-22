"""Produce real offline renders of authored GLB vehicle geometry (NOT gameplay screenshots)."""
from pathlib import Path
import numpy as np, trimesh, vtk
from PIL import Image,ImageDraw,ImageFont
from build_fleet_v73 import PROFILES
ROOT=Path(__file__).resolve().parents[1]
PRE=ROOT/'previews';PRE.mkdir(exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(s,b=False):return ImageFont.truetype(BOLD if b else FONT,s)

def capture(key,size=(690,470)):
 width,length,roof=PROFILES[key] if key in PROFILES else {'omega-bus':(5.05,15,5.9),'grinder':(5.1,11.6,5.1)}[key]
 sc=trimesh.load(ROOT/'assets'/f'{key}.glb',force='scene')
 renderer=vtk.vtkRenderer();renderer.SetBackground(.09,.12,.16)
 window=vtk.vtkRenderWindow();window.SetOffScreenRendering(1);window.SetSize(*size);window.SetMultiSamples(0);window.AddRenderer(renderer)
 for pos,intensity in [((72,90,110),1.25),((-45,50,-35),.67),((52,22,-90),.34)]:
  l=vtk.vtkLight();l.SetPosition(*pos);l.SetFocalPoint(0,3,0);l.SetIntensity(intensity);renderer.AddLight(l)
 def actorBox(ext,pos,col):
  b=vtk.vtkCubeSource();b.SetXLength(ext[0]);b.SetYLength(ext[1]);b.SetZLength(ext[2]);b.SetCenter(0,0,0)
  m=vtk.vtkPolyDataMapper();m.SetInputConnection(b.GetOutputPort());a=vtk.vtkActor();a.SetMapper(m);a.SetPosition(*pos);a.GetProperty().SetColor(*col);renderer.AddActor(a);return a
 actorBox((30,.12,36),(0,-.32,0),(.15,.22,.30))
 for geo in sc.geometry.values():
  pts=vtk.vtkPoints()
  for x,y,z in np.asarray(geo.vertices):pts.InsertNextPoint(float(x),float(y),float(z))
  cells=vtk.vtkCellArray()
  for i,j,k in geo.faces:
   t=vtk.vtkTriangle();t.GetPointIds().SetId(0,int(i));t.GetPointIds().SetId(1,int(j));t.GetPointIds().SetId(2,int(k));cells.InsertNextCell(t)
  poly=vtk.vtkPolyData();poly.SetPoints(pts);poly.SetPolys(cells)
  norms=vtk.vtkPolyDataNormals();norms.SetInputData(poly);norms.SplittingOff()
  mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(norms.GetOutputPort());a=vtk.vtkActor();a.SetMapper(mapper)
  rgb=np.asarray(geo.visual.face_colors)[0][:3]/255
  a.GetProperty().SetColor(*[float(v) for v in rgb]);a.GetProperty().SetAmbient(.19);a.GetProperty().SetDiffuse(.82);a.GetProperty().SetSpecular(.18);renderer.AddActor(a)
 wheel={'goliath':1.93,'omega-bus':1.4,'grinder':1.43,'inferno':1.36,'titan':1.34,'hookjaw':1.30}.get(key,1.2)
 axles=([-length*.38,0,length*.37] if length>12 else [-length*.35,length*.33])
 if key=='grinder':axles=[-length*.35,length*.33]
 for x in [-width*.55,width*.55]:
  for z in axles:
   for radius,height,shade in [(wheel,.9,(.07,.08,.10)),(wheel*.48,.95,(.56,.63,.72))]:
    src=vtk.vtkCylinderSource();src.SetRadius(radius);src.SetHeight(height);src.SetResolution(18)
    mp=vtk.vtkPolyDataMapper();mp.SetInputConnection(src.GetOutputPort());act=vtk.vtkActor();act.SetMapper(mp);act.RotateZ(90);act.SetPosition(x,wheel*.90,z);act.GetProperty().SetColor(*shade);renderer.AddActor(act)
 # weapon turret is separate procedural geometry at runtime
 actorBox((width*.28,.42,1.45),(0,roof+.13,.40),(.37,.43,.49))
 for s in [-1,1]:actorBox((.19,.18,1.9),(s*.30,roof+.25,1.47),(.12,.13,.15))
 c=renderer.GetActiveCamera();c.SetFocalPoint(0,2.7,0);c.SetPosition(length*.82,length*.58,length*.97);c.SetViewUp(0,1,0)
 c.ParallelProjectionOn();c.SetParallelScale(max(5.2,length*.55));renderer.ResetCameraClippingRange();window.Render()
 out=vtk.vtkWindowToImageFilter();out.SetInput(window);out.SetInputBufferTypeToRGB();out.ReadFrontBufferOff();out.Update()
 fname=PRE/f'modelo-{key}-v7.3.png';writer=vtk.vtkPNGWriter();writer.SetFileName(str(fname));writer.SetInputConnection(out.GetOutputPort());writer.Write();window.Finalize()
 return Image.open(fname).convert('RGB')

def main():
 keys=[('marauder','MARAUDER','Muscle blindado'),('phantom','PHANTOM','Interceptador'),('titan','TITAN','Caminhão militar'),('omega-bus','OMEGA BUS','Ônibus blindado'),('grinder','GRINDER','Caminhão de lixo'),('frost-van','FROST VAN','Van de sorvete'),('hookjaw','HOOKJAW','Guincho de combate'),('inferno','INFERNO','Bombeiros blindado'),('sentinel','SENTINEL','SUV de patrulha'),('goliath','GOLIATH','Monster truck')]
 im=Image.new('RGB',(2050,1190),(10,16,26));draw=ImageDraw.Draw(im)
 draw.text((46,27),'IRON WRECK  /  GARAGEM v7.3',font=font(51,True),fill=(244,202,120))
 draw.text((49,99),'10 modelos GLB do projeto + rodas e armas em Three.js | imagens técnicas, não screenshots de gameplay.',font=font(19),fill=(180,199,215))
 for idx,(key,name,subtitle) in enumerate(keys):
  i,j=idx%5,idx//5;x=30+i*405;y=157+j*507
  draw.rounded_rectangle((x,y,x+394,y+494),radius=17,fill=(24,35,50),outline=(64,84,105),width=2)
  draw.text((x+20,y+15),name,font=font(26,True),fill=(249,222,175))
  draw.text((x+20,y+57),subtitle,font=font(17),fill=(174,193,210))
  pic=capture(key,size=(690,470));pic.thumbnail((387,345));im.paste(pic,(x+4,y+100))
  draw.text((x+18,y+455),'GLB original • +Z para frente',font=font(15),fill=(153,191,210))
  print('render',idx,key,flush=True)
 out=PRE/'FROTA-COMPLETA-v7.3.png';im.save(out,optimize=True)
 print('MONTAGE',out,out.stat().st_size)
if __name__=='__main__':main()
