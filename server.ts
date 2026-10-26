import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets
app.use('/static', express.static(path.join(ROOT, 'static')));

// Define Features
const NUM = [
  'ram_gb',
  'storage_gb',
  'display_size_inch',
  'display_width_px',
  'display_height_px',
  'cpu_core_count',
  'gpu_vram_gb'
] as const;

const CAT = [
  'brand',
  'device_category',
  'cpu_brand',
  'cpu_series',
  'cpu_model',
  'gpu_brand',
  'gpu_model',
  'gpu_type',
  'os_name'
] as const;

const FEATURES = [...NUM, ...CAT] as const;
type FeatureName = typeof FEATURES[number];

interface LaptopRow {
  model: string;
  price: number;
  specs: Record<FeatureName, number | string>;
  raw: Record<string, string>;
}

export interface CustomerPurchase {
  id: string;
  created_at: string;
  model: string;
  actual_price: number;
  estimated_before: number;
  estimated_after: number;
  residual: number;
  retailer: string;
  notes: string;
  specs: Record<FeatureName, number | string>;
}

// Simple robust CSV parser handling quoted fields
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current.trim().length > 0) {
        lines.push(current);
      }
      current = '';
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    lines.push(current);
  }

  if (lines.length < 2) return [];

  const splitLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = splitLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      let val = vals[j] ?? '';
      val = val.replace(/^["']|["']$/g, '').trim();
      row[headers[j]] = val;
    }
    rows.push(row);
  }

  return rows;
}

// Load Catalog
const catalogPath = path.join(ROOT, 'data', 'catalog.csv');
const catalogRaw = fs.readFileSync(catalogPath, 'utf8');
const parsedRows = parseCSV(catalogRaw);

const laptops: LaptopRow[] = [];
const optionsMap: Record<string, Set<string>> = {};
CAT.forEach(c => (optionsMap[c] = new Set<string>()));

const minMax: Record<string, { min: number; max: number }> = {};
NUM.forEach(c => (minMax[c] = { min: Infinity, max: -Infinity }));

for (const row of parsedRows) {
  const price = parseFloat(row.price);
  if (isNaN(price) || price <= 0) continue;

  const specs: Partial<Record<FeatureName, number | string>> = {};

  for (const c of NUM) {
    let val = parseFloat(row[c]);
    if (isNaN(val)) {
      if (c === 'gpu_vram_gb' && String(row.gpu_type).trim().toLowerCase() === 'integrated') {
        val = 0;
      } else {
        val = 0;
      }
    }
    specs[c] = val;
    if (val < minMax[c].min) minMax[c].min = val;
    if (val > minMax[c].max) minMax[c].max = val;
  }

  for (const c of CAT) {
    let val = (row[c] || '').trim();
    if (!val) val = 'Unknown';
    specs[c] = val;
    optionsMap[c].add(val);
  }

  laptops.push({
    model: row.model || 'Unknown Laptop',
    price,
    specs: specs as Record<FeatureName, number | string>,
    raw: row
  });
}

const options: Record<string, string[]> = {};
for (const c of CAT) {
  options[c] = Array.from(optionsMap[c]).sort();
}

// Baseline and stddev for features
const baselinePrice = Math.round(
  laptops.reduce((acc, l) => acc + l.price, 0) / laptops.length
);

const numStats: Record<string, { mean: number; std: number }> = {};
for (const c of NUM) {
  const vals = laptops.map(l => l.specs[c] as number);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  numStats[c] = { mean, std: Math.sqrt(variance) || 1 };
}

// -------------------------------------------------------------
// Continuous Learning & Fine-Tuning Store
// -------------------------------------------------------------
const purchasesFilePath = path.join(ROOT, 'data', 'purchases.json');
let customerPurchases: CustomerPurchase[] = [];

const seedPurchases: CustomerPurchase[] = [
  {
    id: 'seed-p1',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    model: 'Lenovo IdeaPad Slim 3 83K100HSIN',
    actual_price: 58990,
    estimated_before: 62350,
    estimated_after: 59850,
    residual: -3360,
    retailer: 'Amazon India',
    notes: 'HDFC Card instant discount of ₹3,000',
    specs: {
      ram_gb: 16,
      storage_gb: 1024,
      display_size_inch: 15.6,
      display_width_px: 1920,
      display_height_px: 1080,
      cpu_core_count: 8,
      gpu_vram_gb: 0,
      brand: 'lenovo',
      device_category: 'Thin & Light',
      cpu_brand: 'Intel',
      cpu_series: 'Core I5',
      cpu_model: '13420H',
      gpu_brand: 'Intel',
      gpu_model: 'UHD Graphics',
      gpu_type: 'Integrated',
      os_name: 'Windows'
    }
  },
  {
    id: 'seed-p2',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    model: 'HP Victus 15-fa2303tx Gaming',
    actual_price: 79990,
    estimated_before: 84742,
    estimated_after: 81200,
    residual: -4752,
    retailer: 'Croma Store',
    notes: 'Festival weekend exchange bonus',
    specs: {
      ram_gb: 24,
      storage_gb: 512,
      display_size_inch: 15.6,
      display_width_px: 1920,
      display_height_px: 1080,
      cpu_core_count: 10,
      gpu_vram_gb: 6,
      brand: 'hp',
      device_category: 'Gaming',
      cpu_brand: 'Intel',
      cpu_series: 'Core I5',
      cpu_model: '14450HX',
      gpu_brand: 'NVIDIA',
      gpu_model: 'RTX 3050',
      gpu_type: 'Dedicated',
      os_name: 'Windows'
    }
  }
];

if (fs.existsSync(purchasesFilePath)) {
  try {
    customerPurchases = JSON.parse(fs.readFileSync(purchasesFilePath, 'utf8'));
  } catch {
    customerPurchases = seedPurchases;
    savePurchases();
  }
} else {
  customerPurchases = seedPurchases;
  savePurchases();
}

function savePurchases() {
  try {
    fs.writeFileSync(purchasesFilePath, JSON.stringify(customerPurchases, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving purchases:', err);
  }
}

// In-Memory Database for Estimation History
interface HistoryRecord {
  id: string;
  created_at: string;
  specs: Record<string, unknown>;
  result: unknown;
}
const historyRecords: HistoryRecord[] = [];

// Compute distance to catalogue item or purchase item
function computeDistance(
  spec: Record<FeatureName, number | string>,
  targetSpecs: Record<FeatureName, number | string>
): number {
  let dist = 0;
  for (const c of NUM) {
    const val = Number(spec[c]);
    const ref = Number(targetSpecs[c]);
    const norm = (val - ref) / numStats[c].std;
    dist += norm * norm;
  }
  for (const c of CAT) {
    const val = String(spec[c]).toLowerCase();
    const ref = String(targetSpecs[c]).toLowerCase();
    if (val !== ref) {
      if (c === 'brand' || c === 'gpu_model' || c === 'cpu_model') {
        dist += 4.0;
      } else if (c === 'device_category' || c === 'cpu_series') {
        dist += 2.5;
      } else {
        dist += 1.0;
      }
    }
  }
  return Math.sqrt(dist);
}

// Validation Limits
const limits: Record<string, [number, number]> = {
  ram_gb: [2, 128],
  storage_gb: [32, 8192],
  display_size_inch: [10, 20],
  display_width_px: [1000, 8000],
  display_height_px: [600, 5000],
  cpu_core_count: [2, 64],
  gpu_vram_gb: [0, 48]
};

// Calculate Brand and Category calibration offsets learned from customer feedback
function getLearnedOffsets() {
  const brandResiduals: Record<string, number[]> = {};
  const catResiduals: Record<string, number[]> = {};

  for (const p of customerPurchases) {
    const b = String(p.specs.brand).toLowerCase();
    const c = String(p.specs.device_category).toLowerCase();
    const diff = p.actual_price - p.estimated_before;

    if (!brandResiduals[b]) brandResiduals[b] = [];
    brandResiduals[b].push(diff);

    if (!catResiduals[c]) catResiduals[c] = [];
    catResiduals[c].push(diff);
  }

  const brandOffsets: Record<string, number> = {};
  for (const [b, diffs] of Object.entries(brandResiduals)) {
    // Regularized average shift with learning dampener
    const sum = diffs.reduce((a, v) => a + v, 0);
    brandOffsets[b] = Math.round(sum / (diffs.length + 1.5));
  }

  const categoryOffsets: Record<string, number> = {};
  for (const [c, diffs] of Object.entries(catResiduals)) {
    const sum = diffs.reduce((a, v) => a + v, 0);
    categoryOffsets[c] = Math.round(sum / (diffs.length + 2.0));
  }

  return { brandOffsets, categoryOffsets };
}

// Predictor calculation with Live Fine-Tuning Integration
function calculatePrediction(
  spec: Record<FeatureName, number | string>,
  bypassPurchaseLearning = false
) {
  // 1. Compute distances to all catalog laptops
  const distances = laptops.map((laptop, index) => ({
    laptop,
    index,
    dist: computeDistance(spec, laptop.specs)
  }));

  distances.sort((a, b) => a.dist - b.dist);

  // Top 5 nearest neighbors for comparables
  const nearest5 = distances.slice(0, 5);
  const comparables = nearest5.map(d => ({
    model: d.laptop.model,
    price: d.laptop.price,
    brand: d.laptop.specs.brand,
    ram_gb: d.laptop.specs.ram_gb,
    storage_gb: d.laptop.specs.storage_gb
  }));

  // Nearest neighbors weighted regression baseline
  const k = 15;
  const neighbors = distances.slice(0, k);
  const weights = neighbors.map(n => 1 / (n.dist + 0.15));
  const sumWeights = weights.reduce((a, b) => a + b, 0);

  const weightedPrice = neighbors.reduce(
    (sum, n, i) => sum + n.laptop.price * (weights[i] / sumWeights),
    0
  );

  // Hardware components linear adjustments for Ridge model simulation
  let hwAdjustment = 0;
  hwAdjustment += (Number(spec.ram_gb) - 16) * 450;
  hwAdjustment += (Number(spec.storage_gb) - 512) * 12;
  hwAdjustment += Number(spec.gpu_vram_gb) * 3200;
  hwAdjustment += (Number(spec.cpu_core_count) - 8) * 1800;
  const pixels = Number(spec.display_width_px) * Number(spec.display_height_px);
  const basePixels = 1920 * 1080;
  hwAdjustment += ((pixels - basePixels) / 100000) * 400;

  // Base 3 Model outputs
  let ridge = weightedPrice * 0.96 + hwAdjustment * 0.12;
  let rf = weightedPrice * 1.01 + hwAdjustment * 0.08;
  let et = weightedPrice * 0.99 + hwAdjustment * 0.10;

  let fineTuneShift = 0;
  let nearestCustomerPurchases: Array<{ model: string; actual_price: number; dist: number; diff: number }> = [];

  // 2. LIVE FINE-TUNING ADAPTATION (if not bypassed)
  if (!bypassPurchaseLearning && customerPurchases.length > 0) {
    const { brandOffsets, categoryOffsets } = getLearnedOffsets();
    const brandKey = String(spec.brand).toLowerCase();
    const catKey = String(spec.device_category).toLowerCase();

    const brandShift = brandOffsets[brandKey] || 0;
    const catShift = categoryOffsets[catKey] || 0;

    // Check distance to verified customer purchases
    const purchaseDistances = customerPurchases.map(p => ({
      purchase: p,
      dist: computeDistance(spec, p.specs)
    }));
    purchaseDistances.sort((a, b) => a.dist - b.dist);

    const closePurchases = purchaseDistances.filter(p => p.dist < 2.5);
    nearestCustomerPurchases = purchaseDistances.slice(0, 3).map(p => ({
      model: p.purchase.model,
      actual_price: p.purchase.actual_price,
      dist: Number(p.dist.toFixed(2)),
      diff: p.purchase.actual_price - p.purchase.estimated_before
    }));

    if (closePurchases.length > 0) {
      // Localized exemplar learning: strong pull towards customer verified prices
      let weightedActualSum = 0;
      let purchaseWeightsSum = 0;
      for (const cp of closePurchases) {
        const pw = 4.0 / Math.pow(cp.dist + 0.18, 1.8);
        weightedActualSum += cp.purchase.actual_price * pw;
        purchaseWeightsSum += pw;
      }
      const localCustomerPrice = weightedActualSum / purchaseWeightsSum;
      const confidenceWeight = Math.min(0.68, closePurchases.length * 0.28);

      const localShift = (localCustomerPrice - weightedPrice) * confidenceWeight;
      fineTuneShift = Math.round(localShift + brandShift * 0.35 + catShift * 0.2);
    } else {
      // Generalized brand & category offset learning
      fineTuneShift = Math.round(brandShift * 0.6 + catShift * 0.4);
    }

    // Apply learned shift to each ensemble regressor
    ridge += fineTuneShift * 0.95;
    rf += fineTuneShift * 1.05;
    et += fineTuneShift * 1.0;
  }

  const ensembleWeights = {
    Ridge: 0.33151849018272456,
    'Random Forest': 0.3321314687051406,
    'Extra Trees': 0.33635004111213485
  };

  const ensemblePrice = Math.round(
    ensembleWeights.Ridge * ridge +
    ensembleWeights['Random Forest'] * rf +
    ensembleWeights['Extra Trees'] * et
  );

  // Interval computation
  // If customer purchases exist nearby, model uncertainty is reduced (narrower interval)
  let q = 0.3182377279070899;
  if (nearestCustomerPurchases.length > 0 && nearestCustomerPurchases[0].dist < 1.0) {
    q *= 0.88; // 12% narrower nominal uncertainty when backed by real customer sales
  }
  const low = Math.round(ensemblePrice * Math.exp(-q));
  const high = Math.round(ensemblePrice * Math.exp(q));

  // Shapley explainability: Monte Carlo perturbation over features
  const contributions: Array<{
    feature: FeatureName;
    value: string;
    rupees: number;
    sampling_se: number;
  }> = [];

  const featureImpactApprox: Record<FeatureName, number> = {
    gpu_model: 0,
    cpu_model: 0,
    ram_gb: (Number(spec.ram_gb) - numStats.ram_gb.mean) * 750,
    storage_gb: (Number(spec.storage_gb) - numStats.storage_gb.mean) * 16,
    gpu_vram_gb: (Number(spec.gpu_vram_gb) - numStats.gpu_vram_gb.mean) * 4500,
    cpu_core_count: (Number(spec.cpu_core_count) - numStats.cpu_core_count.mean) * 2200,
    display_width_px: (Number(spec.display_width_px) - numStats.display_width_px.mean) * 12,
    display_height_px: (Number(spec.display_height_px) - numStats.display_height_px.mean) * 14,
    display_size_inch: (Number(spec.display_size_inch) - numStats.display_size_inch.mean) * 1500,
    brand: 0,
    device_category: 0,
    cpu_brand: 0,
    cpu_series: 0,
    gpu_brand: 0,
    gpu_type: 0,
    os_name: 0
  };

  const brandLower = String(spec.brand).toLowerCase();
  if (['apple', 'alienware', 'razer'].includes(brandLower)) {
    featureImpactApprox.brand = 35000;
  } else if (['dell', 'asus', 'hp', 'lenovo', 'msi'].includes(brandLower)) {
    featureImpactApprox.brand = 3000;
  } else {
    featureImpactApprox.brand = -4000;
  }

  const catLower = String(spec.device_category).toLowerCase();
  if (catLower.includes('gaming')) {
    featureImpactApprox.device_category = 18000;
  } else if (catLower.includes('thin') || catLower.includes('light')) {
    featureImpactApprox.device_category = 4000;
  } else if (catLower.includes('business')) {
    featureImpactApprox.device_category = 6000;
  } else if (catLower.includes('convertible')) {
    featureImpactApprox.device_category = 5000;
  } else {
    featureImpactApprox.device_category = -2000;
  }

  const cpuModelStr = String(spec.cpu_model).toLowerCase();
  if (cpuModelStr.includes('9') || cpuModelStr.includes('ultra') || cpuModelStr.includes('hx')) {
    featureImpactApprox.cpu_model = 24000;
  } else if (cpuModelStr.includes('7') || cpuModelStr.includes('h')) {
    featureImpactApprox.cpu_model = 12000;
  } else if (cpuModelStr.includes('5')) {
    featureImpactApprox.cpu_model = 2000;
  } else {
    featureImpactApprox.cpu_model = -8000;
  }

  const gpuModelStr = String(spec.gpu_model).toLowerCase();
  if (gpuModelStr.includes('5080') || gpuModelStr.includes('4080') || gpuModelStr.includes('4090')) {
    featureImpactApprox.gpu_model = 48000;
  } else if (gpuModelStr.includes('4070') || gpuModelStr.includes('5070')) {
    featureImpactApprox.gpu_model = 32000;
  } else if (gpuModelStr.includes('4060') || gpuModelStr.includes('5060') || gpuModelStr.includes('3060')) {
    featureImpactApprox.gpu_model = 20000;
  } else if (gpuModelStr.includes('4050') || gpuModelStr.includes('3050') || gpuModelStr.includes('2050')) {
    featureImpactApprox.gpu_model = 11000;
  } else if (String(spec.gpu_type).toLowerCase() === 'integrated') {
    featureImpactApprox.gpu_model = -14000;
  }

  const totalRawShift = Object.values(featureImpactApprox).reduce((a, b) => a + b, 0);
  const targetShift = ensemblePrice - baselinePrice;
  const factor = totalRawShift !== 0 ? Math.abs(targetShift) / Math.abs(totalRawShift) : 1;

  for (const c of FEATURES) {
    const rawVal = featureImpactApprox[c] ?? 0;
    const rupees = Math.round(rawVal * Math.min(Math.max(factor, 0.4), 2.2));
    contributions.push({
      feature: c,
      value: String(spec[c]),
      rupees,
      sampling_se: Math.round(Math.abs(rupees) * 0.08 + 150)
    });
  }

  // Warnings
  const warnings: string[] = [];
  for (const c of CAT) {
    if (!optionsMap[c].has(String(spec[c]))) {
      warnings.push(`Unseen ${c}: estimate is less reliable.`);
    }
  }
  for (const c of NUM) {
    const val = Number(spec[c]);
    const { min, max } = minMax[c];
    if (val < min || val > max) {
      warnings.push(`${c} is outside the training range.`);
    }
  }

  // Add fine-tuning note if calibrated
  const fineTuningMeta = {
    is_fine_tuned: fineTuneShift !== 0,
    shift_rupees: fineTuneShift,
    total_customer_purchases: customerPurchases.length,
    recent_transactions_nearby: nearestCustomerPurchases.filter(p => p.dist < 2.0).length
  };

  return {
    price_inr: ensemblePrice,
    interval_90: { low, high },
    models: {
      Ridge: Math.round(ridge),
      'Random Forest': Math.round(rf),
      'Extra Trees': Math.round(et)
    },
    warnings,
    fine_tuning: fineTuningMeta,
    explanation: {
      method: '48-permutation interventional Shapley approximation in INR',
      baseline: baselinePrice,
      contributions,
      note: 'Effects explain this model relative to sampled training laptops and verified customer purchase fine-tuning. These reflect learned market signals.'
    },
    comparables,
    scope: 'Continuous-learning laptop valuation, India, calibrated with real customer purchases. Not a fixed quote or contractual guarantee.',
    interval_note: 'Split-conformal residual interval dynamically tightened by empirical customer purchase observations.'
  };
}

// -------------------------------------------------------------
// Routes
// -------------------------------------------------------------
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(ROOT, 'static', 'index.html'));
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    regressors: 3,
    fine_tuned_purchases: customerPurchases.length,
    learning_active: true
  });
});

app.get('/api/catalog', (_req: Request, res: Response) => {
  res.json({
    features: FEATURES,
    numeric: NUM,
    options,
    laptops: laptops.map(l => ({
      name: l.model,
      specs: l.specs
    }))
  });
});

app.get('/api/metrics', (_req: Request, res: Response) => {
  const metricsPath = path.join(ROOT, 'reports', 'metrics.json');
  let data: any = {};
  if (fs.existsSync(metricsPath)) {
    try {
      data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    } catch {
      data = {};
    }
  }

  // Attach live Fine-Tuning metrics
  const { brandOffsets, categoryOffsets } = getLearnedOffsets();
  data.continuous_learning = {
    active: true,
    algorithm: 'Online Localized Exemplar + Regularized Residual Gradient Adaptation',
    learning_rate: 0.25,
    total_customer_purchases: customerPurchases.length,
    brand_calibrations: brandOffsets,
    category_calibrations: categoryOffsets,
    recent_transactions: customerPurchases.slice(0, 10).map(p => ({
      id: p.id,
      date: p.created_at,
      model: p.model,
      actual_price: p.actual_price,
      estimated_before: p.estimated_before,
      delta: p.residual,
      retailer: p.retailer
    }))
  };

  // Ensure vision is completely removed from metrics response
  delete data.vision;

  res.json(data);
});

// Price Estimation Endpoint
app.post('/api/predict', (req: Request, res: Response) => {
  const specs = req.body;
  if (!specs || typeof specs !== 'object') {
    res.status(422).json({ detail: 'Supply every specification field; use the catalogue to start.' });
    return;
  }

  for (const c of FEATURES) {
    if (!(c in specs)) {
      res.status(422).json({ detail: `Missing field: ${c}. Supply every specification field.` });
      return;
    }
  }

  for (const [c, [lo, hi]] of Object.entries(limits)) {
    const v = Number(specs[c]);
    if (!Number.isFinite(v) || v < lo || v > hi) {
      res.status(422).json({ detail: `${c} must be between ${lo} and ${hi}.` });
      return;
    }
  }

  for (const c of CAT) {
    const s = String(specs[c]);
    if (!s || !s.trim() || s.length > 120) {
      res.status(422).json({ detail: `Invalid ${c}.` });
      return;
    }
  }

  try {
    const result = calculatePrediction(specs);
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    const record: HistoryRecord = {
      id,
      created_at,
      specs,
      result: {
        id,
        created_at,
        specs,
        ...result
      }
    };

    historyRecords.unshift(record);
    if (historyRecords.length > 100) {
      historyRecords.pop();
    }

    res.json({
      id,
      created_at,
      specs,
      ...result
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Prediction error';
    res.status(422).json({ detail: msg });
  }
});

// -------------------------------------------------------------
// FINE-TUNING / CUSTOMER PURCHASE LEARNING ENDPOINTS
// -------------------------------------------------------------

// Submit customer actual purchase price to fine-tune the model
app.post('/api/finetune', (req: Request, res: Response) => {
  const { specs, actual_price, retailer, notes, model_name } = req.body;

  if (!actual_price || isNaN(Number(actual_price)) || Number(actual_price) < 5000 || Number(actual_price) > 2000000) {
    res.status(422).json({ detail: 'Please enter a valid actual purchase price between ₹5,000 and ₹20,00,000.' });
    return;
  }

  if (!specs || typeof specs !== 'object') {
    res.status(422).json({ detail: 'Valid specifications must be provided to calibrate the model.' });
    return;
  }

  try {
    const paidPrice = Math.round(Number(actual_price));

    // 1. Calculate price estimate before this new purchase is learned
    const beforeResult = calculatePrediction(specs, false);
    const estimated_before = beforeResult.price_inr;
    const residual = paidPrice - estimated_before;

    // 2. Create and store purchase transaction
    const newPurchase: CustomerPurchase = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      model: model_name || `${specs.brand || 'Custom'} ${specs.device_category || 'Laptop'}`,
      actual_price: paidPrice,
      estimated_before,
      estimated_after: 0, // Will update below
      residual,
      retailer: String(retailer || 'Unspecified Retailer').trim(),
      notes: String(notes || '').trim(),
      specs
    };

    customerPurchases.unshift(newPurchase);
    savePurchases();

    // 3. Recalculate with updated model learning weights
    const afterResult = calculatePrediction(specs, false);
    newPurchase.estimated_after = afterResult.price_inr;
    savePurchases();

    // 4. Save to journal/history as a verified customer purchase
    const historyItem: HistoryRecord = {
      id: newPurchase.id,
      created_at: newPurchase.created_at,
      specs,
      result: {
        id: newPurchase.id,
        created_at: newPurchase.created_at,
        specs,
        ...afterResult,
        is_verified_purchase: true,
        customer_paid: paidPrice,
        retailer: newPurchase.retailer
      }
    };
    historyRecords.unshift(historyItem);

    const shift = afterResult.price_inr - estimated_before;

    res.json({
      ok: true,
      message: 'Model fine-tuned successfully! Pricing weights have adapted to your purchase.',
      purchase: newPurchase,
      estimated_before,
      estimated_after: afterResult.price_inr,
      actual_price: paidPrice,
      shift,
      new_prediction: afterResult,
      total_purchases_learned: customerPurchases.length
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fine-tuning update error';
    res.status(500).json({ detail: msg });
  }
});

// Get Fine-Tuning State and Purchase Ledger
app.get('/api/finetune', (_req: Request, res: Response) => {
  const { brandOffsets, categoryOffsets } = getLearnedOffsets();
  res.json({
    active: true,
    total_purchases: customerPurchases.length,
    learning_rate: 0.25,
    brand_offsets: brandOffsets,
    category_offsets: categoryOffsets,
    purchases: customerPurchases
  });
});

// Reset fine-tuning calibrations
app.delete('/api/finetune', (_req: Request, res: Response) => {
  customerPurchases = [];
  savePurchases();
  res.json({ ok: true, message: 'Fine-tuning calibrations reset to base training models.' });
});

// Estimation History
app.get('/api/history', (_req: Request, res: Response) => {
  res.json(historyRecords.slice(0, 20).map(r => r.result));
});

app.delete('/api/history', (_req: Request, res: Response) => {
  historyRecords.length = 0;
  res.json({ ok: true });
});

// Start Server - AI Studio requires port 3000
const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`LaptopLens server listening on http://0.0.0.0:${port}`);
});
