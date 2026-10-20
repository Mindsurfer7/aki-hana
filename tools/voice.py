import json,os,re,sys,subprocess,urllib.request,concurrent.futures as cf,hashlib,time
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True); TMP=os.path.join(OUT,'_seg'); os.makedirs(TMP,exist_ok=True)
ENV='/Users/a1/Documents/Workspace/Flutter/clones/qonbaq-mono/qonbaq/.env'
KEY=os.environ.get('FISHAUDIO_API_KEY') or re.search(r'^FISHAUDIO_API_KEY\s*=\s*["\']?([^"\'\s#]+)',open(ENV).read(),re.M).group(1)
N=("2a1036d645634680b3cc69aeeb60375b","Тёплый добрый рассказчик детской сказки на ночь. Спокойно, мягко, неторопливо, с лёгкой улыбкой и уютными паузами — как бабушка у камина осенним вечером.")
F=("02f8eff6783c4fe59a849cc439f250e9","Взрослый женский мультяшный голос, выразительный и тёплый, без детского тембра.")
H=("3866bdb5e1e24cdb94599b70a7f07a35","Взрослый мужской мультяшный голос, бодрый, озорной и дружелюбный, без детского тембра.")
B=("40a5463e69a240918d9f9f47e822ffc2","Медвежонок — добрый, неторопливый, басовитый, но очень ласковый и заботливый.")
S=[
[(N,"Осенью, в одном японском лесу, на острове Хоккайдо...")],
[(N,"...жила маленькая лисичка по имени Аки Хана — «осенний цветок».")],
[(N,"Вокруг росли высокие деревья,")],
[(N,"журчал ручей,")],
[(N,"а среди мха и папоротников находились уютные лесные домики.")],
[(N,"Лисичка часто наблюдала за другими зверями.")],
[(N,"Зайчик быстро строил себе домик,")],
[(N,"белочка ловко собирала орешки,")],
[(N,"а медвежонок умел чинить сломанные вещи.")],
[(F,"Как у них всё хорошо получается!"),(N,"— думала лисичка."),(F,"А у меня не всегда выходит... Наверное, я хуже других.")],
[(N,"Однажды лисичка решила построить себе уютный домик. Она собрала веточки, мох и большие листья."),(F,"Я попробую всё сделать сама!"),(N,"— решила она.")],
[(N,"Но веточки постоянно падали, а листья с крыши сдувал ветер. Лисичка пробовала снова и снова, но домик никак не получался.")],
[(N,"Мимо проходил зайчик."),(H,"Лисичка, давай я тебе помогу!"),(F,"Нет, спасибо! Я сама справлюсь."),(N,"— ответила лисичка. На самом деле она боялась, что зайчик подумает, будто она ничего не умеет.")],
[(N,"Лисичка продолжила работать, но вскоре устала и расстроилась.")],
[(N,"Тут подошёл медвежонок."),(B,"Почему ты грустишь?"),(F,"Я хочу построить домик, но у меня ничего не получается. У других зверей всё выходит лучше, чем у меня."),(N,"— призналась лисичка.")],
[(N,"Медвежонок удивился:"),(B,"Но ведь у каждого что-то получается лучше, а чему-то приходится учиться.")],
[(B,"Я, например, не умею красиво украшать домики. Поэтому я прошу белочку помочь мне с украшениями.")],
[(F,"Значит, другие звери тоже иногда просят о помощи?"),(N,"— спросила лисичка."),(B,"Конечно!"),(N,"— ответил медвежонок."),(B,"Необязательно всё уметь самому.")],
[(N,"Лисичка подумала и решила позвать зайчика и медвежонка на помощь.")],
[(N,"Зайчик помог сложить стены, медвежонок укрепил крышу, а лисичка украсила домик красивыми листьями и цветами.")],
[(N,"Вскоре домик был готов. Лисичка с радостью посмотрела на свою работу."),(F,"Как хорошо, что мы сделали это вместе!"),(N,"— сказала она.")],
[(N,"И с тех пор лисичка больше не думала, что она хуже других, если что-то не получается с первого раза. Она продолжала учиться новому, радовалась своим успехам и не стеснялась просить о помощи.")],
]
selected=set(map(int,sys.argv[2:])) if len(sys.argv)>2 else set(range(len(S)))
jobs=[(i,j,v,ins,t) for i,sc in enumerate(S) if i in selected for j,((v,ins),t) in enumerate(sc)]
def tts(job):
  i,j,v,ins,t=job
  cue = ('[worried]' if i in (9,14) else '[curious]' if i == 17 else '[happy]' if i == 20 else '[determined]') if v == F[0] else '[happy]' if v == H[0] else ''
  spoken = (cue + ' ' + t).strip()
  # New character takes use content-addressed cache; retain existing narrator/bear takes.
  suffix = '_' + hashlib.sha256((v+spoken+'s2.1-pro-free').encode()).hexdigest()[:12] if v in (F[0],H[0]) else ''
  p=f"{TMP}/{i:02d}_{j}{suffix}.mp3"
  paths[(i,j)]=p
  if os.path.exists(p) and os.path.getsize(p)>0: return
  r=urllib.request.Request("https://api.fish.audio/v1/tts",json.dumps({"text":spoken,"reference_id":v,"format":"mp3","mp3_bitrate":128,"normalize":True,"latency":"normal"}).encode(),{"Authorization":"Bearer "+KEY,"Content-Type":"application/json","model":"s2.1-pro-free"})
  for a in range(3):
    try:
      with urllib.request.urlopen(r,timeout=180) as response: data=response.read()
      if len(data)<1000: raise ValueError('Empty or invalid TTS audio')
      with open(p+'.tmp','wb') as f: f.write(data)
      os.replace(p+'.tmp',p)
      print('Generated',i,j,flush=True); return
    except Exception as e: err=e; time.sleep(2*(a+1))
  raise err
paths={}
with cf.ThreadPoolExecutor(2) as ex: list(ex.map(tts,jobs))
for i,sc in enumerate(S):
  if i not in selected: continue
  ins=[]; fl=[]
  for j in range(len(sc)):
    ins+=['-i',paths[(i,j)]]; fl.append(f"[{j}:a]aresample=24000,apad=pad_dur=0.35[a{j}]")
  fc=';'.join(fl)+';'+''.join(f"[a{j}]" for j in range(len(sc)))+f"concat=n={len(sc)}:v=0:a=1[o]"
  subprocess.run(['ffmpeg','-loglevel','error','-y',*ins,'-filter_complex',fc,'-map','[o]','-ac','1','-c:a','libmp3lame','-b:a','64k',f"{OUT}/{i:02d}.mp3"],check=True)
print('OK',len(selected))
