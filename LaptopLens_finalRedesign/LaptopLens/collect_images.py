"""Build linked vision dataset from original saved catalogue; no synthetic labels."""
from pathlib import Path
import concurrent.futures, urllib.request, hashlib, json, re
import pandas as pd
from bs4 import BeautifulSoup
from PIL import Image
ROOT=Path(__file__).resolve().parent

def collect():
    df=pd.read_csv(ROOT/'data/catalog.csv')
    soup=BeautifulSoup((ROOT/'data/source.html').read_text(),'html.parser')
    products=soup.select('.sm-product')
    def norm(s): return re.sub(r'[^a-z0-9]','',s.lower().split('(')[0].replace('Laptop','').replace('laptop',''))
    records={norm(p.select_one('h2').get_text()):p for p in products if p.select_one('h2') and p.select_one('.sm-img-wrap img')}
    images=ROOT/'data/images';images.mkdir(exist_ok=True)
    jobs=[]
    for i,row in df.iterrows():
        p=records.get(norm(row['model']))
        if p is not None:
            im=p.select_one('.sm-img-wrap img');jobs.append({'row':int(i),'model':row['model'],'label':row['device_category'],'url':im['src'],'source_url':'https://www.smartprix.com'+p.select_one('a.name')['href']})
    def fetch(r):
        try:
            path=images/f"{r['row']}.webp"
            if not path.exists():
                req=urllib.request.Request(r['url'],headers={'User-Agent':'LaptopLens-Academic/1.0'})
                path.write_bytes(urllib.request.urlopen(req,timeout=12).read())
            with Image.open(path) as im:
                im.load();g=im.convert('L').resize((8,8));a=list(g.getdata());r['visual_group']=''.join('1' if v>sum(a)/64 else '0' for v in a)
            r['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();r['path']=str(path.relative_to(ROOT));return r
        except Exception as e: return {'row':r['row'],'error':str(e)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        results=list(pool.map(fetch,jobs))
    good=[r for r in results if 'path' in r]
    (ROOT/'data/image_manifest.json').write_text(json.dumps(good,indent=2))
    (ROOT/'reports/image_collection.json').write_text(json.dumps({'matched':len(jobs),'downloaded':len(good),'failed':[r for r in results if 'error' in r]},indent=2))
    print('Image collection:',len(good),'of',len(jobs),'linked listings',flush=True)
if __name__=='__main__':collect()
