"""Preserve raw source, repair display diagonals using linked original listing text."""
from pathlib import Path
import re,json,hashlib
import pandas as pd
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parent

def norm(s):return re.sub(r'[^a-z0-9]','',s.lower().split('(')[0].replace('Laptop','').replace('laptop',''))
def main():
    raw=ROOT/'data/source_catalog.csv'
    if not raw.exists():raw.write_bytes((ROOT/'data/catalog.csv').read_bytes())
    df=pd.read_csv(raw);df['display_size_inch']=df['display_size_inch'].astype(float);soup=BeautifulSoup((ROOT/'data/source.html').read_text(),'html.parser')
    products={norm(p.select_one('h2').get_text()):p for p in soup.select('.sm-product') if p.select_one('h2')}
    corrections=[]
    for i,row in df.iterrows():
        p=products.get(norm(row['model']))
        if p is None:continue
        for li in p.select('ul.sm-feat li'):
            match=re.search(r'(\d+(?:\.\d+)?)\s*inches',li.get_text(),re.I)
            if match:
                v=float(match[1])
                if 10<=v<=20 and float(row['display_size_inch'])!=v:
                    corrections.append({'row':i,'field':'display_size_inch','original':float(row['display_size_inch']),'corrected':v,'evidence':li.get_text()});df.loc[i,'display_size_inch']=v
    df.to_csv(ROOT/'data/catalog.csv',index=False)
    report={'source_rows':len(df),'source_sha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'duplicate_models':int(df.model.duplicated().sum()),'missing_by_column':df.isna().sum().to_dict(),'display_corrections':corrections,'integrated_vram_policy':'Missing VRAM on integrated GPU is encoded as 0; dedicated unknown values remain missing and use training-only median imputation.'}
    (ROOT/'reports/data_quality.json').write_text(json.dumps(report,indent=2));print('Display diagonal corrections:',len(corrections))
if __name__=='__main__':main()
