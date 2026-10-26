"""Retrain the three classifiers offline from bundled real-image HOG features."""
import json,joblib,numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.metrics import accuracy_score,f1_score,balanced_accuracy_score,confusion_matrix
from core import ROOT
z=np.load(ROOT/'data/vision_features.npz');x=z['features'];y=z['labels'];tr=z['train_indices'];te=z['test_indices']
models={};report={}
for name,m in [('HOG + Logistic Regression',make_pipeline(StandardScaler(),LogisticRegression(max_iter=2000,C=.1,class_weight='balanced'))),('HOG + RBF SVM',make_pipeline(StandardScaler(),SVC(C=3,probability=True,class_weight='balanced',random_state=42))),('HOG + Extra Trees',ExtraTreesClassifier(n_estimators=300,min_samples_leaf=2,class_weight='balanced',n_jobs=2,random_state=42))]:
    m.fit(x[tr],y[tr]);p=m.predict(x[te]);models[name]=m
    report[name]={'accuracy':float(accuracy_score(y[te],p)),'balanced_accuracy':float(balanced_accuracy_score(y[te],p)),'macro_F1':float(f1_score(y[te],p,average='macro',zero_division=0)),'confusion_matrix':confusion_matrix(y[te],p,labels=m.classes_).tolist()}
joblib.dump({'models':models,'classes':next(iter(models.values())).classes_},ROOT/'models/vision.joblib',compress=3)
metrics=json.loads((ROOT/'reports/metrics.json').read_text());metrics['vision']['models']=report;(ROOT/'reports/metrics.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(report,indent=2))
