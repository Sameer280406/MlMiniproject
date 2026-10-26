from pathlib import Path
import json, re, io
import numpy as np
import pandas as pd
import joblib
from PIL import Image, ImageOps, UnidentifiedImageError
from skimage.feature import hog
ROOT=Path(__file__).resolve().parent
NUM=['ram_gb','storage_gb','display_size_inch','display_width_px','display_height_px','cpu_core_count','gpu_vram_gb']
CAT=['brand','device_category','cpu_brand','cpu_series','cpu_model','gpu_brand','gpu_model','gpu_type','os_name']
FEATURES=NUM+CAT

def frame(df):
    x=df[FEATURES].copy()
    for c in NUM:x[c]=pd.to_numeric(x[c],errors='coerce')
    x.loc[x['gpu_type'].astype(str).str.strip().eq('Integrated') & x['gpu_vram_gb'].isna(),'gpu_vram_gb']=0
    for c in CAT:x[c]=x[c].fillna('Unknown').astype(str).str.strip()
    return x

def family(model):
    s=re.sub(r'[^a-z ]',' ',str(model).lower());return ' '.join(s.split()[:3])

def image_features(im):
    im=ImageOps.exif_transpose(im).convert('RGB')
    im=ImageOps.pad(im,(96,96),color='white')
    arr=np.asarray(im)/255.
    h=hog(arr,orientations=9,pixels_per_cell=(12,12),cells_per_block=(2,2),channel_axis=2)
    colors=np.concatenate([np.histogram(arr[:,:,c],bins=12,range=(0,1),density=True)[0] for c in range(3)])
    return np.concatenate([h,colors]).astype(np.float32)

class Engine:
    def __init__(self):
        self.bundle=joblib.load(ROOT/'models/prices.joblib')
        self.data=frame(pd.read_csv(ROOT/'data/catalog.csv'))
        self.report=json.loads((ROOT/'reports/metrics.json').read_text())
        self.retrieval=np.load(ROOT/'data/vision_features.npz') if (ROOT/'data/vision_features.npz').exists() else None
        self.manifest=json.loads((ROOT/'data/image_manifest.json').read_text()) if (ROOT/'data/image_manifest.json').exists() else []
        self.catalog=pd.read_csv(ROOT/'data/catalog.csv')
        self.vision=joblib.load(ROOT/'models/vision.joblib') if (ROOT/'models/vision.joblib').exists() else None
    def infer(self,x):
        return sum(w*m.predict(x) for w,m in zip(self.bundle['weights'],self.bundle['models'].values()))
    def validate(self,spec):
        if set(spec)!=set(FEATURES):raise ValueError('Supply every specification field; use the catalogue to start.')
        limits={'ram_gb':(2,128),'storage_gb':(32,8192),'display_size_inch':(10,20),'display_width_px':(1000,8000),'display_height_px':(600,5000),'cpu_core_count':(2,64),'gpu_vram_gb':(0,48)}
        for c,(lo,hi) in limits.items():
            v=float(spec[c])
            if not np.isfinite(v) or not lo<=v<=hi:raise ValueError(f'{c} must be between {lo} and {hi}.')
        for c in CAT:
            if not isinstance(spec[c],str) or not spec[c].strip() or len(spec[c])>120:raise ValueError(f'Invalid {c}.')
        return frame(pd.DataFrame([spec]))
    def explain(self,x):
        # Monte Carlo interventional Shapley, entire feature groups in original units.
        rng=np.random.default_rng(42);bg=self.bundle['background'];paths=[];orders=[]
        for _ in range(48):
            order=rng.permutation(len(FEATURES));row=bg.iloc[int(rng.integers(len(bg)))].copy();paths.append(row.copy())
            for j in order:row[FEATURES[j]]=x.iloc[0][FEATURES[j]];paths.append(row.copy())
            orders.append(order)
        values=self.infer(frame(pd.DataFrame(paths))).reshape(48,len(FEATURES)+1)
        effects=np.zeros((48,len(FEATURES)))
        for k,order in enumerate(orders):effects[k,order]=np.diff(values[k])
        means=effects.mean(axis=0)
        return {'method':'48-permutation interventional Shapley approximation in INR','baseline':float(values[:,0].mean()),'contributions':[{'feature':c,'value':str(x.iloc[0][c]),'rupees':float(means[i]),'sampling_se':float(effects[:,i].std()/np.sqrt(48))} for i,c in enumerate(FEATURES)],'note':'Effects explain this model relative to sampled training laptops. Correlations and impossible feature combinations can affect attribution; these are not causal premiums.'}
    def predict(self,spec):
        x=self.validate(spec);p=float(self.infer(x)[0]);warnings=[]
        for c in CAT:
            if x.iloc[0][c] not in self.bundle['categories'][c]:warnings.append(f'Unseen {c}: estimate is less reliable.')
        for c in NUM:
            lo,hi=self.bundle['ranges'][c]
            if not lo<=float(x.iloc[0][c])<=hi:warnings.append(f'{c} is outside the training range.')
        q=self.bundle['interval_q'];preds={n:float(m.predict(x)[0]) for n,m in self.bundle['models'].items()}
        z=self.bundle['neighbor_encoder'].transform(x);dist,idx=self.bundle['neighbors'].kneighbors(z)
        peers=self.bundle['peer_rows'].iloc[idx[0]]
        result={'price_inr':round(p),'interval_90':{'low':round(p*np.exp(-q)),'high':round(p*np.exp(q))},'models':preds,'warnings':warnings,'explanation':self.explain(x),'comparables':peers[['model','price','brand','ram_gb','storage_gb']].to_dict('records'),'scope':'New-laptop listing prices, India, historical 2025 catalogue. Not a live quote or used-laptop valuation.','interval_note':'Split-conformal absolute log-ratio residual interval; family-group holdout calibration. Coverage may change under market or image distribution shift.'}
        return result
    def classify(self,content):
        if not self.vision:raise ValueError('Vision models not trained; run train.py after collecting images.')
        if len(content)>8*1024*1024:raise ValueError('Maximum image size is 8 MB.')
        try:
            with Image.open(io.BytesIO(content)) as im:
                if im.width*im.height>20_000_000:raise ValueError('Image exceeds 20 megapixels.')
                im.load();vec=image_features(im).reshape(1,-1)
        except (UnidentifiedImageError,OSError):raise ValueError('Upload a valid JPEG, PNG or WebP image.')
        candidates=[]
        if self.retrieval is not None and 'visual_groups' in self.retrieval:
            a=self.retrieval['features'][:,:-36];v=vec[0,:-36]
            sim=(a@v)/(np.linalg.norm(a,axis=1)*np.linalg.norm(v)+1e-9)
            for j in np.argsort(-sim)[:3]:
                group=self.retrieval['visual_groups'][j]
                for r in [r for r in self.manifest if r['visual_group']==group][:3]:
                    row=frame(self.catalog.iloc[[r['row']]]).iloc[0]
                    spec={c:(float(row[c]) if c in NUM and pd.notna(row[c]) else (0 if c in NUM else str(row[c]))) for c in FEATURES}
                    candidates.append({'name':r['model'],'specs':spec,'similarity':float(sim[j]),'source_url':r['source_url']})
        probs={n:m.predict_proba(vec)[0] for n,m in self.vision['models'].items()}
        avg=np.mean(list(probs.values()),axis=0);classes=self.vision['classes'];k=int(avg.argmax())
        return {'suggested_type':str(classes[k]),'confidence':float(avg[k]),'requires_confirmation':True,'catalogue_candidates':candidates,'scores':{str(c):float(p) for c,p in zip(classes,avg)},'models':{n:{'type':str(classes[int(p.argmax())]),'score':float(p.max())} for n,p in probs.items()},'note':'Experimental catalogue-photo classifier. Scores are not calibrated probabilities of correctness. Always confirm type and hardware; arbitrary photos and non-laptop images can be misclassified.'}
