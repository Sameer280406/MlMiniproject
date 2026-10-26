"""Reproducible group-held-out training and honest evaluation."""
import json, hashlib, math
from pathlib import Path
import numpy as np,pandas as pd,joblib
from sklearn.compose import ColumnTransformer,TransformedTargetRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder,StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge,LogisticRegression
from sklearn.ensemble import RandomForestRegressor,ExtraTreesRegressor,ExtraTreesClassifier
from sklearn.svm import SVC
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score,accuracy_score,f1_score,confusion_matrix,balanced_accuracy_score
from sklearn.neighbors import NearestNeighbors
from PIL import Image
from core import ROOT,NUM,CAT,FEATURES,frame,family,image_features

def encoder():
    return ColumnTransformer([('numeric',make_pipeline(SimpleImputer(strategy='median'),StandardScaler()),NUM),('category',OneHotEncoder(handle_unknown='ignore',sparse_output=False),CAT)])
def split(indices,groups,size,seed):
    a,b=next(GroupShuffleSplit(n_splits=1,test_size=size,random_state=seed).split(indices,groups=groups[indices]));return indices[a],indices[b]
def price_metrics(y,p):return {'MAE_INR':float(mean_absolute_error(y,p)),'RMSE_INR':float(np.sqrt(mean_squared_error(y,p))),'R2':float(r2_score(y,p)),'MAPE_pct':float(np.mean(abs(y-p)/y)*100),'median_APE_pct':float(np.median(abs(y-p)/y)*100)}
def main():
    df=pd.read_csv(ROOT/'data/catalog.csv').drop_duplicates(subset=['model']).reset_index(drop=True)
    df=df.loc[pd.to_numeric(df.price,errors='coerce').gt(0)].reset_index(drop=True)
    x=frame(df);y=df.price.to_numpy(float);groups=np.array([family(s) for s in df.model]);ids=np.arange(len(df))
    rest,test=split(ids,groups,.15,42);rest,cal=split(rest,groups,.15,43);train,val=split(rest,groups,.18,44)
    models={};scores={}
    for name,base in [('Ridge',Ridge(alpha=10)),('Random Forest',RandomForestRegressor(n_estimators=250,min_samples_leaf=2,max_features=.8,n_jobs=2,random_state=42)),('Extra Trees',ExtraTreesRegressor(n_estimators=300,min_samples_leaf=2,max_features=.9,n_jobs=2,random_state=42))]:
        m=TransformedTargetRegressor(regressor=make_pipeline(encoder(),base),func=np.log1p,inverse_func=np.expm1)
        m.fit(x.iloc[train],y[train]);models[name]=m;scores[name]=mean_absolute_error(y[val],m.predict(x.iloc[val]));print(name,'validation MAE',round(scores[name]),flush=True)
    w=1/np.array(list(scores.values()));w/=w.sum();ensemble=sum(a*m.predict(x.iloc[val]) for a,m in zip(w,models.values()))
    best=int(np.argmin(list(scores.values())))
    if mean_absolute_error(y[val],ensemble)>list(scores.values())[best]:w=np.eye(3)[best]
    # Refit only train+validation; calibration and test remain untouched.
    fit=np.concatenate([train,val])
    for m in models.values():m.fit(x.iloc[fit],y[fit])
    def pred(z):return sum(a*m.predict(z) for a,m in zip(w,models.values()))
    residual=np.abs(np.log(y[cal]/pred(x.iloc[cal])));rank=min(len(cal),math.ceil((len(cal)+1)*.9));q=float(np.sort(residual)[rank-1])
    final=pred(x.iloc[test]);enc=encoder().fit(x.iloc[fit]);nn=NearestNeighbors(n_neighbors=5).fit(enc.transform(x.iloc[fit]))
    bundle={'models':models,'weights':w,'interval_q':q,'background':x.iloc[fit].sample(min(64,len(fit)),random_state=42),'categories':{c:sorted(x.iloc[fit][c].unique().tolist()) for c in CAT},'ranges':{c:[float(x.iloc[fit][c].min()),float(x.iloc[fit][c].max())] for c in NUM},'neighbor_encoder':enc,'neighbors':nn,'peer_rows':df.iloc[fit]}
    joblib.dump(bundle,ROOT/'models/prices.joblib',compress=3)
    report={'data_rows':len(df),'data_sha256':hashlib.sha256((ROOT/'data/catalog.csv').read_bytes()).hexdigest(),'split_strategy':'brand/model family grouped; 4 disjoint train/validation/calibration/test sets','split_sizes':dict(train=len(train),validation=len(val),calibration=len(cal),test=len(test)),'regression':{n:price_metrics(y[test],m.predict(x.iloc[test])) for n,m in models.items()},'selected_prediction':price_metrics(y[test],final),'validation_MAE':scores,'ensemble_weights':dict(zip(models,w.tolist())),'interval':{'nominal_coverage':.9,'test_coverage':float(np.mean(np.abs(np.log(y[test]/final))<=q)),'log_residual_quantile':q},'price_scope':'Historical new-laptop Indian listing prices; source states December 2025. Category labels are source heuristics, not independent ground truth.'}
    pd.DataFrame([{'row':int(i),'family':groups[i],'split':s} for s,ii in [('train',train),('validation',val),('calibration',cal),('test',test)] for i in ii]).to_csv(ROOT/'reports/price_splits.csv',index=False)
    pd.DataFrame({'model':df.iloc[test].model,'actual_INR':y[test],'predicted_INR':final,'absolute_error_INR':abs(y[test]-final)}).to_csv(ROOT/'reports/price_test_predictions.csv',index=False)
    manifest=json.loads((ROOT/'data/image_manifest.json').read_text()) if (ROOT/'data/image_manifest.json').exists() else []
    manifest=[r for r in manifest if (ROOT/r['path']).exists()]
    if not manifest and (ROOT/'reports/metrics.json').exists() and (ROOT/'models/vision.joblib').exists():
        prior=json.loads((ROOT/'reports/metrics.json').read_text())
        if 'vision' in prior:report['vision']=prior['vision']
    if manifest:
        # One image per perceptual hash: same photos/configurations cannot cross splits.
        unique={r['visual_group']:r for r in manifest};records=list(unique.values())
        counts=pd.Series([r['label'] for r in records]).value_counts();records=[r for r in records if counts[r['label']]>=10]
        labels=np.array([r['label'] for r in records]);g=np.array([family(r['model']) for r in records]);ii=np.arange(len(records))
        tr,te=split(ii,g,.25,45)
        if set(labels[te])-set(labels[tr]):raise RuntimeError('Vision group split omits a class; collect more data.')
        feats=np.array([image_features(Image.open(ROOT/r['path'])) for r in records]);vm={};vr={}
        for name,m in [('HOG + Logistic Regression',make_pipeline(StandardScaler(),LogisticRegression(max_iter=2000,C=.1,class_weight='balanced'))),('HOG + RBF SVM',make_pipeline(StandardScaler(),SVC(C=3,probability=True,class_weight='balanced',random_state=42))),('HOG + Extra Trees',ExtraTreesClassifier(n_estimators=300,min_samples_leaf=2,class_weight='balanced',n_jobs=2,random_state=42))]:
            m.fit(feats[tr],labels[tr]);p=m.predict(feats[te]);vm[name]=m;vr[name]={'accuracy':float(accuracy_score(labels[te],p)),'balanced_accuracy':float(balanced_accuracy_score(labels[te],p)),'macro_F1':float(f1_score(labels[te],p,average='macro',zero_division=0)),'confusion_matrix':confusion_matrix(labels[te],p,labels=m.classes_).tolist()};print(name,vr[name]['accuracy'],flush=True)
        joblib.dump({'models':vm,'classes':next(iter(vm.values())).classes_},ROOT/'models/vision.joblib',compress=3)
        report['vision']={'models':vr,'classes':next(iter(vm.values())).classes_.tolist(),'train_images':len(tr),'test_images':len(te),'total_downloaded':len(manifest),'unique_photos_after_ahash':len(unique),'retained_class_counts':pd.Series(labels).value_counts().to_dict(),'split':'Model-family groups held out; perceptual-hash duplicates collapsed before splitting. White-background catalogue photos only; no arbitrary-photo validation.','label_quality':'Weak labels from source device_category; noisy and visually ambiguous.'}
        pd.DataFrame([{'row':records[int(i)]['row'],'model':records[int(i)]['model'],'visual_group':records[int(i)]['visual_group'],'family':g[i],'split':s} for s,ids2 in [('train',tr),('test',te)] for i in ids2]).to_csv(ROOT/'reports/vision_splits.csv',index=False)
        np.savez_compressed(ROOT/'data/vision_features.npz',features=feats,labels=labels,train_indices=tr,test_indices=te,row_indices=np.array([r['row'] for r in records]),visual_groups=np.array([r['visual_group'] for r in records]))
    (ROOT/'reports/metrics.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
if __name__=='__main__':main()
