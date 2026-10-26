"""Additional grouped validation of fixed regressors; no test-driven tuning."""
import json,numpy as np,pandas as pd,joblib
from sklearn.base import clone
from sklearn.model_selection import GroupKFold
from core import ROOT,frame,family
from train import price_metrics

def main():
    df=pd.read_csv(ROOT/'data/catalog.csv');x=frame(df);y=df.price.to_numpy(float);g=np.array([family(s) for s in df.model]);base=joblib.load(ROOT/'models/prices.joblib')['models'];rows=[]
    # Development rows only: final calibration and test stay untouched.
    splits=pd.read_csv(ROOT/'reports/price_splits.csv');dev=splits.loc[splits['split'].isin(['train','validation']),'row'].to_numpy();xx=x.iloc[dev];yy=y[dev];gg=g[dev]
    for fold,(tr,te) in enumerate(GroupKFold(n_splits=3,shuffle=True,random_state=71).split(xx,groups=gg),1):
        ps=[]
        for name,m in base.items():
            model=clone(m).fit(xx.iloc[tr],yy[tr]);p=model.predict(xx.iloc[te]);ps.append(p);rows.append({'fold':fold,'model':name,'test_rows':len(te),**price_metrics(yy[te],p)})
        rows.append({'fold':fold,'model':'Fixed equal-weight ensemble','test_rows':len(te),**price_metrics(yy[te],np.mean(ps,axis=0))});print('CV fold',fold,'complete',flush=True)
    report={'scope':'3-fold shuffled family-group cross-validation on development (train+validation) rows only. Calibration and final test excluded. Fixed hyperparameters; equal-weight ensemble benchmark, no model selection from these results.','folds':rows,'mean_MAE_INR':{n:float(np.mean([r['MAE_INR'] for r in rows if r['model']==n])) for n in list(base)+['Fixed equal-weight ensemble']}}
    (ROOT/'reports/group_cross_validation.json').write_text(json.dumps(report,indent=2));metrics=json.loads((ROOT/'reports/metrics.json').read_text());metrics['cross_validation']=report;(ROOT/'reports/metrics.json').write_text(json.dumps(metrics,indent=2));print(json.dumps(report['mean_MAE_INR'],indent=2))
if __name__=='__main__':main()
