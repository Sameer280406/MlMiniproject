import unittest,json,io
import numpy as np,pandas as pd
from PIL import Image
from fastapi.testclient import TestClient
from core import Engine,ROOT,FEATURES
from app import app
class ProjectTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.engine=Engine()
    def spec(self):
        from core import frame,NUM
        row=frame(pd.read_csv(ROOT/'data/catalog.csv')).iloc[0]
        return {c:float(row[c]) if c in NUM and pd.notna(row[c]) else (0 if c in NUM else str(row[c])) for c in FEATURES}
    def test_prediction_explanation_additivity(self):
        r=self.engine.predict(self.spec());e=r['explanation'];self.assertAlmostEqual(e['baseline']+sum(c['rupees'] for c in e['contributions']),r['price_inr'],delta=.51)
        self.assertLessEqual(r['interval_90']['low'],r['price_inr']);self.assertGreaterEqual(r['interval_90']['high'],r['price_inr']);self.assertEqual(len(r['models']),3)
    def test_bad_input(self):
        for v in [float('nan'),-1,999]:
            s=self.spec();s['ram_gb']=v
            with self.assertRaises(ValueError):self.engine.predict(s)
        with self.assertRaises(ValueError):self.engine.predict({})
    def test_group_separation(self):
        for name in ['price','vision']:
            df=pd.read_csv(ROOT/f'reports/{name}_splits.csv');self.assertTrue((df.groupby('family')['split'].nunique()==1).all())
        df=pd.read_csv(ROOT/'reports/vision_splits.csv');self.assertTrue((df.groupby('visual_group')['split'].nunique()==1).all())
    def test_vision_real_image(self):
        manifest=json.loads((ROOT/'data/image_manifest.json').read_text());p=ROOT/manifest[0]['path']
        if p.exists():r=self.engine.classify(p.read_bytes())
        else:
            buf=io.BytesIO();Image.new('RGB',(96,96),'white').save(buf,format='PNG');r=self.engine.classify(buf.getvalue())
        self.assertGreater(len(r['catalogue_candidates']),0);self.assertEqual(set(r['catalogue_candidates'][0]['specs']),set(FEATURES));self.assertEqual(len(r['models']),3);self.assertTrue(r['requires_confirmation']);self.assertAlmostEqual(sum(r['scores'].values()),1,places=5)
        with self.assertRaises(ValueError):self.engine.classify(b'not an image')
    def test_api_flow(self):
        with TestClient(app) as client:
            self.assertEqual(client.get('/').status_code,200);self.assertEqual(client.get('/api/health').json()['vision_classifiers'],3)
            r=client.post('/api/predict',json=self.spec());self.assertEqual(r.status_code,200);self.assertIn('id',r.json())
            self.assertGreater(len(client.get('/api/history').json()),0);self.assertEqual(client.post('/api/predict',json={}).status_code,422)
            self.assertEqual(client.post('/api/classify',files={'image':('bad.png',b'bad','image/png')}).status_code,422)
if __name__=='__main__':unittest.main()
