from contextlib import asynccontextmanager
from pathlib import Path
import json,sqlite3,threading,uuid
from datetime import datetime,timezone
import pandas as pd
from fastapi import FastAPI,UploadFile,File,HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from core import Engine,ROOT,FEATURES,NUM,CAT,frame
lock=threading.Lock()

def db():
    c=sqlite3.connect(ROOT/'data/history.sqlite');c.execute('CREATE TABLE IF NOT EXISTS predictions(id TEXT PRIMARY KEY, created_at TEXT, specs TEXT, result TEXT)');return c
@asynccontextmanager
async def lifespan(app):
    app.state.engine=Engine()
    with db() as c:pass
    yield
app=FastAPI(title='LaptopLens',version='1.0.0',lifespan=lifespan)
app.mount('/static',StaticFiles(directory=ROOT/'static'),name='static')
@app.get('/')
def home():return FileResponse(ROOT/'static/index.html')
@app.get('/api/health')
def health():return {'ok':True,'regressors':3,'vision_classifiers':len(app.state.engine.vision['models']) if app.state.engine.vision else 0}
@app.get('/api/catalog')
def catalog():
    df=pd.read_csv(ROOT/'data/catalog.csv');x=frame(df)
    return {'features':FEATURES,'numeric':NUM,'options':{c:sorted(x[c].unique().tolist()) for c in CAT},'laptops':[{'name':str(row['model']),'specs':{c:(float(x.iloc[i][c]) if c in NUM and pd.notna(x.iloc[i][c]) else (0 if c in NUM else str(x.iloc[i][c]))) for c in FEATURES}} for i,row in df.iterrows()]}
@app.get('/api/metrics')
def metrics():return app.state.engine.report
@app.post('/api/predict')
def predict(specs:dict):
    try:
        with lock:result=app.state.engine.predict(specs)
        result['id']=str(uuid.uuid4());result['created_at']=datetime.now(timezone.utc).isoformat()
        with db() as c:
            c.execute('INSERT INTO predictions VALUES(?,?,?,?)',(result['id'],result['created_at'],json.dumps(specs),json.dumps(result)))
            c.execute('DELETE FROM predictions WHERE id NOT IN (SELECT id FROM predictions ORDER BY created_at DESC LIMIT 100)')
        return result
    except (ValueError,TypeError,OverflowError) as e:raise HTTPException(422,str(e))
@app.post('/api/classify')
async def classify(image:UploadFile=File(...)):
    content=await image.read(8*1024*1024+1)
    try:
        with lock:return app.state.engine.classify(content)
    except ValueError as e:raise HTTPException(422,str(e))
@app.get('/api/history')
def history():
    with db() as c:return [json.loads(r[0]) for r in c.execute('SELECT result FROM predictions ORDER BY created_at DESC LIMIT 20')]
@app.delete('/api/history')
def clear():
    with db() as c:c.execute('DELETE FROM predictions')
    return {'ok':True}
