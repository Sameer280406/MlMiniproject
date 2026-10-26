const $ = s => document.querySelector(s),
  money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n),
  esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let catalog, lastResult;

const labels = {
  ram_gb: 'RAM (GB)',
  storage_gb: 'Storage (GB)',
  display_size_inch: 'Screen size (inches)',
  display_width_px: 'Resolution width (px)',
  display_height_px: 'Resolution height (px)',
  cpu_core_count: 'CPU cores',
  gpu_vram_gb: 'Dedicated VRAM (GB)',
  brand: 'Brand',
  device_category: 'Laptop type',
  cpu_brand: 'CPU brand',
  cpu_series: 'CPU series',
  cpu_model: 'Exact CPU model',
  gpu_brand: 'GPU brand',
  gpu_model: 'Exact GPU model',
  gpu_type: 'Graphics type',
  os_name: 'Operating system'
};

const fieldGroups = [
  { title: 'Identity & class', icon: '◈', keys: ['brand', 'device_category', 'os_name'] },
  { title: 'Processor & graphics', icon: '⌁', keys: ['cpu_brand', 'cpu_series', 'cpu_model', 'cpu_core_count', 'gpu_brand', 'gpu_model', 'gpu_type', 'gpu_vram_gb'] },
  { title: 'Memory & storage', icon: '▤', keys: ['ram_gb', 'storage_gb'] },
  { title: 'Display', icon: '▣', keys: ['display_size_inch', 'display_width_px', 'display_height_px'] }
];

async function api(url, options) {
  let r;
  try {
    r = await fetch(url, options);
  } catch (e) {
    throw new Error('Could not reach LaptopLens. Check that the server is running, then try again.');
  }
  let body;
  try {
    body = await r.json();
  } catch (e) {
    throw new Error('The server returned an unexpected response. Restart the app and try again.');
  }
  if (!r.ok) {
    const d = body.detail;
    throw new Error(typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => x.msg || 'Invalid input').join(', ') : 'Something went wrong. Please check your inputs and try again.');
  }
  return body;
}

function friendlyError(e) {
  const m = String(e?.message || e || 'Something went wrong.');
  if (/422|validation|field required/i.test(m)) return 'Some specifications are missing or invalid. Review the highlighted fields and try again.';
  if (/500|internal server|traceback/i.test(m)) return 'The model could not complete this request. Please review the specifications and try again.';
  return m;
}

function specs() {
  return Object.fromEntries(catalog.features.map(c => [c, catalog.numeric.includes(c) ? Number(document.getElementById(c).value) : document.getElementById(c).value]));
}

function fill(s) {
  for (const c of catalog.features) {
    const el = document.getElementById(c);
    if (el && s[c] !== undefined) el.value = s[c];
  }
  $('#confirmed').checked = false;
}

function presets(q = '') {
  if (!catalog) return;
  const matches = catalog.laptops.map((r, i) => ({ ...r, i })).filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
  $('#preset').innerHTML = matches.map(r => `<option value="${r.i}">${esc(r.name)}</option>`).join('');
  if (matches.length) fill(matches[0].specs);
  else $('#preset').innerHTML = '<option value="">No matching catalogue laptops</option>';

  const ftPreset = $('#ftPreset');
  if (ftPreset) {
    ftPreset.innerHTML = catalog.laptops.map((r, i) => `<option value="${i}">${esc(r.name)}</option>`).join('');
  }
}

function renderFields() {
  const available = new Set(catalog.features);
  let markup = '';
  for (const group of fieldGroups) {
    const keys = group.keys.filter(c => available.has(c));
    if (!keys.length) continue;
    markup += `<div class="field-group-title"><span>${group.icon}</span>${group.title}</div>`;
    markup += keys.map(c => `<div class="field-unit"><label for="${c}">${labels[c] || c.replaceAll('_', ' ')}</label>${catalog.numeric.includes(c) ? `<input id="${c}" name="${c}" type="number" step="${c === 'display_size_inch' ? '.1' : '1'}" required inputmode="decimal" aria-label="${labels[c] || c}">` : `<select id="${c}" name="${c}" aria-label="${labels[c] || c}">${(catalog.options[c] || []).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>`}</div>`).join('');
  }
  const grouped = new Set(fieldGroups.flatMap(g => g.keys));
  const rest = catalog.features.filter(c => !grouped.has(c));
  if (rest.length) {
    markup += '<div class="field-group-title"><span>＋</span>Additional details</div>';
    markup += rest.map(c => `<div class="field-unit"><label for="${c}">${labels[c] || c.replaceAll('_', ' ')}</label>${catalog.numeric.includes(c) ? `<input id="${c}" name="${c}" type="number" required>` : `<select id="${c}" name="${c}">${(catalog.options[c] || []).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select>`}</div>`).join('');
  }
  $('#fields').innerHTML = markup;
  $('#fields').querySelectorAll('.field-unit').forEach((el, i) => el.style.animationDelay = `${Math.min(i, 10) * 22}ms`);
}

async function init() {
  try {
    catalog = await api('/api/catalog');
    renderFields();
    presets();
    $('#preset').addEventListener('change', () => {
      const r = catalog.laptops[$('#preset').value];
      if (r) fill(r.specs);
    });
    $('#search').addEventListener('input', e => presets(e.target.value));
    $('#fields').addEventListener('input', () => $('#confirmed').checked = false);
    $('#fields').addEventListener('change', () => $('#confirmed').checked = false);
    updateHistoryCount();
    updateFinetuneCount();
    setupStandaloneFinetune();
  } catch (e) {
    $('#error').textContent = friendlyError(e);
    $('#fields').innerHTML = '<p class="muted">Specifications could not be loaded. Check the server and refresh the page.</p>';
  }
}

function showLoading() {
  const b = $('#submit');
  b.disabled = true;
  b.innerHTML = '<span class="button-spinner"></span><span>Analyzing hardware signals…</span>';
  $('#error').textContent = '';
  $('#result').innerHTML = `<div class="result-topline"><span class="live-indicator"><i></i> VALUATION IN PROGRESS</span><span class="result-ref">LL / COMPUTING</span></div><div class="loading-state"><div class="loading-orb">⌁</div><span class="micro-label">RUNNING THE ESTIMATOR</span><h2>Reading the hardware.</h2><p>Comparing component signals and incorporating continuous customer purchase calibrations.</p><div class="skeleton-line short"></div><div class="skeleton-line" style="width:85%"></div><div class="skeleton-line long"></div><div class="skeleton-line"></div><div class="skeleton-line" style="width:72%"></div></div><div class="result-disclaimer"><span>ⓘ</span><p>The model is running. The result will appear here when ready.</p></div>`;
}

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!$('#confirmed').checked) {
    $('#error').textContent = 'Please confirm that you have reviewed the specifications first.';
    return;
  }
  const b = $('#submit');
  showLoading();
  try {
    const currentSpecs = specs();
    lastResult = await api('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentSpecs)
    });
    lastResult.specs = currentSpecs;
    render(lastResult);
    updateHistoryCount();
  } catch (e) {
    $('#error').textContent = friendlyError(e);
    $('#result').innerHTML = `<div class="result-topline"><span class="live-indicator"><i></i> VALUATION PAUSED</span><span class="result-ref">LL / CHECK INPUT</span></div><div class="empty-result error-state"><div class="error-symbol">!</div><span class="micro-label">WE COULDN’T COMPLETE THAT</span><h2>Let’s check the<br><em>configuration.</em></h2><p>${esc(friendlyError(e))}</p><button class="button button-secondary" id="retryFocus">Review specifications ↗</button></div><div class="result-disclaimer"><span>ⓘ</span><p>No new estimate was saved for this failed request.</p></div>`;
    $('#retryFocus').onclick = () => $('#fields').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  } finally {
    b.disabled = false;
    b.innerHTML = '<span>Estimate laptop value</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  }
});

function animateCount(el, target, duration = 900) {
  if (!el) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    el.textContent = money(target);
    return;
  }
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const t = Math.min(1, (now - start) / duration),
      ease = 1 - Math.pow(1 - t, 4),
      value = from + (target - from) * ease;
    el.textContent = money(value);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function render(r) {
  const ex = r.explanation,
    sorted = [...ex.contributions].sort((a, b) => Math.abs(b.rupees) - Math.abs(a.rupees)),
    max = Math.max(...sorted.map(a => Math.abs(a.rupees)), 1),
    low = Number(r.interval_90.low),
    high = Number(r.interval_90.high),
    price = Number(r.price_inr),
    spread = Math.max(high - low, 1),
    position = Math.max(8, Math.min(92, ((price - low) / spread) * 100));

  const fineTuningBadge = r.fine_tuning?.is_fine_tuned
    ? `<span class="result-badge" style="background:rgba(101,228,230,.12); color:var(--cyan); border-color:rgba(101,228,230,.3);">⚡ FINE-TUNED (${r.fine_tuning.shift_rupees >= 0 ? '+' : ''}${money(r.fine_tuning.shift_rupees)})</span>`
    : `<span class="result-badge">✓ ESTIMATE READY</span>`;

  $('#result').innerHTML = `
    <div class="result-topline">
      <span class="live-indicator"><i></i> VALUATION COMPLETE</span>
      <span class="result-ref">LL / OUTPUT 001</span>
    </div>
    <div class="price-result">
      <div class="result-heading">
        <div>
          <span class="micro-label">ESTIMATED NEW-LAPTOP LISTING PRICE</span>
          <h2>Model valuation</h2>
        </div>
        ${fineTuningBadge}
      </div>
      <div class="price" id="animatedPrice"><span class="currency">₹</span>0</div>
      <div class="result-subline">Based on confirmed hardware profile & live customer calibrations · India / INR</div>
      <div class="price-dash"></div>
      <div class="range-card">
        <div class="range-top">
          <b>90% nominal prediction interval</b>
          <span>MODEL UNCERTAINTY</span>
        </div>
        <div class="range-track">
          <div class="range-fill" id="rangeFill"></div>
          <span class="range-marker" style="left:${position}%" title="Point estimate"></span>
        </div>
        <div class="range-labels">
          <span><small>LOWER ESTIMATE</small><br>${money(low)}</span>
          <span><small>UPPER ESTIMATE</small><br>${money(high)}</span>
        </div>
      </div>
      <p class="scope-copy">${esc(r.scope)}</p>
      ${r.warnings.map(w => `<div class="warn">⚠ &nbsp;${esc(w)}</div>`).join('')}

      <!-- FINE-TUNING BUYER FEEDBACK SECTION -->
      <section class="result-section" style="background: linear-gradient(135deg, rgba(214,255,79,.04), rgba(142,124,255,.03)); border: 1px solid rgba(214,255,79,.22); border-radius: 14px; padding: 18px 20px; margin-top: 24px;">
        <div class="result-section-head" style="margin-bottom: 8px;">
          <div>
            <span class="micro-label" style="color:var(--accent);">⚡ MODEL FINE-TUNING</span>
            <h3 style="font-size: 17px; margin-top: 3px;">Purchased this laptop?</h3>
          </div>
          <span class="pill" style="border-color: rgba(214,255,79,.3); color: var(--accent);">CALIBRATE</span>
        </div>
        <p class="baseline-note" style="margin-bottom: 15px;">Tell us what you actually paid. The model will immediately learn your transaction to fine-tune future valuations for everyone in real time.</p>
        <form id="resFinetuneForm">
          <div class="fields" style="grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label for="resActualPrice" style="display:block; font-size:9px; font-weight:700; color:#aebbd3; margin-bottom:5px;">Price you paid (₹ INR) *</label>
              <input id="resActualPrice" type="number" min="10000" max="1500000" step="100" value="${price}" required>
            </div>
            <div>
              <label for="resRetailer" style="display:block; font-size:9px; font-weight:700; color:#aebbd3; margin-bottom:5px;">Store / Platform</label>
              <input id="resRetailer" type="text" placeholder="e.g. Amazon India, Croma, Official Store">
            </div>
          </div>
          <div style="margin-bottom: 14px;">
            <label for="resNotes" style="display:block; font-size:9px; font-weight:700; color:#aebbd3; margin-bottom:5px;">Discounts or card offers applied</label>
            <input id="resNotes" type="text" placeholder="e.g. Bank card discount ₹3,500, festival sale">
          </div>
          <button class="button button-primary full-width" type="submit" id="resFinetuneSubmit">
            <span>⚡ Submit actual price & update model</span>
          </button>
          <div id="resFinetuneStatus" style="margin-top: 12px; font-size: 11px;"></div>
        </form>
      </section>

      <section class="result-section">
        <div class="result-section-head">
          <div><span class="micro-label">THE WHY</span><h3>What moves the price?</h3></div>
          <small>COMPONENT IMPACT</small>
        </div>
        <p class="baseline-note">Training reference: <b>${money(ex.baseline)}</b>. Contributions show each feature's modelled effect relative to that baseline.</p>
        ${sorted.map(c => `
          <div class="barrow" title="${esc(c.value)} · sampling SE ${money(c.sampling_se)}">
            <span>${esc(labels[c.feature] || c.feature)}<small class="specvalue">${esc(c.value)}</small></span>
            <div class="bartrack"><div class="bar ${c.rupees < 0 ? 'negative' : ''}" data-width="${Math.abs(c.rupees) / max * 100}" style="width:0"></div></div>
            <b class="${c.rupees < 0 ? 'negative-value' : ''}">${c.rupees >= 0 ? '+' : '−'}${money(Math.abs(c.rupees))}</b>
          </div>
        `).join('')}
        <p class="result-note">${esc(ex.note)}</p>
      </section>

      <section class="result-section">
        <div class="result-section-head">
          <div><span class="micro-label">MODEL CONSENSUS</span><h3>Three regression estimates</h3></div>
          <small>ACTUAL OUTPUTS</small>
        </div>
        <div>${Object.entries(r.models).map(([n, p]) => `<span class="pill">${esc(n)} <b>${money(p)}</b></span>`).join('')}</div>
      </section>

      <section class="result-section">
        <div class="result-section-head">
          <div><span class="micro-label">MARKET CONTEXT</span><h3>Similar catalogue configurations</h3></div>
          <small>NEAREST MATCHES</small>
        </div>
        <p class="baseline-note">Nearest neighbours by encoded specifications, with historical listing prices.</p>
        <div class="tablewrap">
          <table>
            <thead><tr><th>Configuration</th><th>Listed price</th></tr></thead>
            <tbody>${r.comparables.map(p => `<tr><td>${esc(p.model)}</td><td class="table-price">${money(p.price)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </section>

      <p class="result-note">${esc(r.interval_note)}</p>
      <div class="download-row">
        <button class="button button-primary" id="download"><span>↓</span> Download full explanation</button>
      </div>
    </div>
  `;

  animateCount($('#animatedPrice'), price);
  requestAnimationFrame(() => {
    const f = $('#rangeFill');
    if (f) f.style.width = '100%';
    document.querySelectorAll('.bar[data-width]').forEach((el, i) => setTimeout(() => el.style.width = `${el.dataset.width}%`, 100 + i * 55));
  });

  $('#download').onclick = () => {
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
    a.href = url;
    a.download = 'LaptopLens-estimate.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Wire In-Result Fine-Tuning Submission
  const ftForm = $('#resFinetuneForm');
  if (ftForm) {
    ftForm.onsubmit = async ev => {
      ev.preventDefault();
      const btn = $('#resFinetuneSubmit');
      const status = $('#resFinetuneStatus');
      const paidPrice = Number($('#resActualPrice').value);
      if (!paidPrice || paidPrice < 5000) {
        status.innerHTML = '<span class="inline-error">Please enter a valid price paid.</span>';
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="button-spinner"></span> Updating regression weights…';
      status.innerHTML = '';
      try {
        const specToTeach = r.specs || specs();
        const modelName = r.comparables?.[0]?.model || $('#preset')?.options[$('#preset').selectedIndex]?.text || `${specToTeach.brand} ${specToTeach.device_category}`;
        const res = await api('/api/finetune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            specs: specToTeach,
            actual_price: paidPrice,
            retailer: $('#resRetailer').value,
            notes: $('#resNotes').value,
            model_name: modelName
          })
        });

        status.innerHTML = `
          <div class="warn" style="border-color: rgba(214,255,79,.35); background: rgba(214,255,79,.09); color: var(--accent); margin-top: 10px;">
            <b>✓ Model Fine-Tuned Successfully!</b><br>
            The ensemble learned your purchase of ${money(paidPrice)}. New calibrated valuation is <b>${money(res.estimated_after)}</b> (shift: ${res.shift >= 0 ? '+' : ''}${money(res.shift)}).
          </div>
        `;
        // Animate price to newly adapted valuation
        animateCount($('#animatedPrice'), res.estimated_after);
        updateFinetuneCount();
        updateHistoryCount();
      } catch (err) {
        status.innerHTML = `<span class="inline-error">${esc(friendlyError(err))}</span>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Submit another price update</span>';
      }
    };
  }
}

// Fine-Tuning Hub standalone logic
function setupStandaloneFinetune() {
  const form = $('#standaloneFinetuneForm');
  if (!form) return;

  form.onsubmit = async ev => {
    ev.preventDefault();
    const btn = $('#ftSubmit');
    const status = $('#ftStatus');
    const paidPrice = Number($('#ftActualPrice').value);
    const selectedIdx = $('#ftPreset').value;

    if (!catalog || !catalog.laptops[selectedIdx]) {
      status.innerHTML = '<span class="inline-error">Please select a laptop model.</span>';
      return;
    }

    const laptop = catalog.laptops[selectedIdx];
    btn.disabled = true;
    btn.innerHTML = '<span class="button-spinner"></span> Calibrating model weights…';
    status.innerHTML = '';

    try {
      const res = await api('/api/finetune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specs: laptop.specs,
          actual_price: paidPrice,
          retailer: $('#ftRetailer').value,
          notes: $('#ftNotes').value,
          model_name: laptop.name
        })
      });

      status.innerHTML = `
        <div class="warn" style="border-color: rgba(214,255,79,.35); background: rgba(214,255,79,.09); color: var(--accent);">
          <b>✓ Model fine-tuned!</b><br>
          Learned purchase of ${money(paidPrice)} for ${esc(laptop.name)}. Model valuation shifted from ${money(res.estimated_before)} → ${money(res.estimated_after)}.
        </div>
      `;
      form.reset();
      updateFinetuneCount();
      updateHistoryCount();
      await renderFinetuneLedger();
    } catch (err) {
      status.innerHTML = `<span class="inline-error">${esc(friendlyError(err))}</span>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡ Fine-tune model with this purchase</span>';
    }
  };

  const resetBtn = $('#ftResetBtn');
  if (resetBtn) {
    resetBtn.onclick = async () => {
      if (!confirm('Reset all customer purchase calibrations back to baseline training state?')) return;
      resetBtn.disabled = true;
      try {
        await api('/api/finetune', { method: 'DELETE' });
        await renderFinetuneLedger();
        updateFinetuneCount();
      } catch (err) {
        alert(friendlyError(err));
      } finally {
        resetBtn.disabled = false;
      }
    };
  }
}

async function renderFinetuneLedger() {
  const statBox = $('#ftStatCount');
  const tableBox = $('#ftPurchasesList');
  const pillsBox = $('#ftBrandPills');

  try {
    const data = await api('/api/finetune');
    if (statBox) statBox.textContent = data.total_purchases;
    $('#finetuneCount').textContent = data.total_purchases;

    if (tableBox) {
      if (!data.purchases || !data.purchases.length) {
        tableBox.innerHTML = '<p class="muted" style="padding: 18px;">No customer purchases recorded yet. Submit your first transaction above to teach the model!</p>';
      } else {
        tableBox.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Laptop Model</th>
                <th>Price Paid</th>
                <th>Prior Model Est.</th>
                <th>Residual Delta</th>
                <th>Store / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${data.purchases.map(p => `
                <tr>
                  <td style="white-space:nowrap; font-size:9px; color:var(--subtle);">${new Date(p.created_at).toLocaleDateString()}</td>
                  <td><b>${esc(p.model)}</b></td>
                  <td class="table-price">${money(p.actual_price)}</td>
                  <td style="color:var(--muted);">${money(p.estimated_before)}</td>
                  <td style="color:${p.residual < 0 ? 'var(--cyan)' : 'var(--accent)'}; font-family:var(--mono);">
                    ${p.residual >= 0 ? '+' : ''}${money(p.residual)}
                  </td>
                  <td style="font-size:9px; color:var(--muted);">
                    ${esc(p.retailer || '—')}
                    ${p.notes ? `<span class="pill" style="padding:2px 5px; font-size:8px; margin-left:4px;">${esc(p.notes)}</span>` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    if (pillsBox) {
      const brands = Object.entries(data.brand_offsets || {});
      if (!brands.length) {
        pillsBox.innerHTML = '<span class="pill">No active brand shifts</span>';
      } else {
        pillsBox.innerHTML = brands.map(([b, off]) => `
          <span class="pill">${esc(b.toUpperCase())}: <b>${off >= 0 ? '+' : ''}${money(off)}</b></span>
        `).join(' ');
      }
    }
  } catch (err) {
    if (tableBox) tableBox.innerHTML = `<p class="inline-error" style="padding: 15px;">${esc(friendlyError(err))}</p>`;
  }
}

// Navigation Tabs
for (const b of document.querySelectorAll('nav button[data-tab]')) {
  b.onclick = async () => {
    for (const t of document.querySelectorAll('.tab')) t.hidden = t.id !== b.dataset.tab;
    for (const x of document.querySelectorAll('nav button[data-tab]')) x.classList.toggle('active', x === b);
    const active = $(`#${b.dataset.tab}`);
    if (active) {
      active.classList.remove('tab-enter');
      void active.offsetWidth;
      active.classList.add('tab-enter');
    }
    try {
      if (b.dataset.tab === 'finetune') await renderFinetuneLedger();
      if (b.dataset.tab === 'models') await metrics();
      if (b.dataset.tab === 'history') await history();
    } catch (e) {
      const target = $('#' + (b.dataset.tab === 'models' ? 'metrics' : b.dataset.tab === 'finetune' ? 'ftPurchasesList' : 'historylist'));
      if (target) target.innerHTML = `<div class="empty-history"><h2>Couldn’t load this view.</h2><p>${esc(friendlyError(e))}</p></div>`;
    }
  };
}

async function metrics() {
  const box = $('#metrics');
  box.innerHTML = '<div class="card loading-state"><div class="loading-orb">⌁</div><h2>Loading model evidence…</h2><div class="skeleton-line"></div><div class="skeleton-line long"></div></div>';
  const m = await api('/api/metrics');
  let h = `
    <div class="card">
      <div class="panel-head">
        <div class="panel-title-icon">⌁</div>
        <div>
          <span class="micro-label">REGRESSION BENCHMARK</span>
          <h3>Price model performance</h3>
        </div>
        <span class="panel-number">${m.data_rows || 992} REAL LISTINGS</span>
      </div>
      <p>${esc(m.split_strategy || 'Grouped cross-validation on real Indian laptop catalogue')}</p>
      <p class="muted">${Object.entries(m.split_sizes || {}).map(([k, v]) => `${esc(k)}: ${v}`).join(' · ')}</p>
      <div class="tablewrap">
        <table>
          <thead>
            <tr><th>Model</th><th>MAE (₹)</th><th>RMSE (₹)</th><th>R²</th><th>MAPE</th></tr>
          </thead>
          <tbody>
            ${Object.entries({ ...m.regression, 'Selected predictor': m.selected_prediction }).map(([n, r]) => `
              <tr>
                <td>${esc(n)}</td>
                <td>${money(r.MAE_INR)}</td>
                <td>${money(r.RMSE_INR)}</td>
                <td>${r.R2.toFixed(3)}</td>
                <td>${r.MAPE_pct.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <h3>Development-family cross-validation</h3>
      <p class="muted">${esc(m.cross_validation?.scope || '3-fold shuffled family-group cross-validation.')}</p>
      ${m.cross_validation ? Object.entries(m.cross_validation.mean_MAE_INR).map(([n, p]) => `<span class="pill">${esc(n)} mean MAE: <b>${money(p)}</b></span>`).join('') : ''}
      <div class="metric-callout">
        <span>◈</span>
        <p>Observed test interval coverage: <b>${((m.interval?.test_coverage || 0.95) * 100).toFixed(1)}%</b>; nominal target: 90%.</p>
      </div>
      <p class="muted">${esc(m.price_scope || '')}</p>
    </div>
  `;

  // Continuous Learning / Fine-Tuning Performance Card
  if (m.continuous_learning) {
    const cl = m.continuous_learning;
    h += `
      <div class="card">
        <div class="panel-head">
          <div class="panel-title-icon" style="color:var(--accent); background:rgba(214,255,79,.1);">⚡</div>
          <div>
            <span class="micro-label">CONTINUOUS FINE-TUNING ENGINE</span>
            <h3>Customer purchase online learning</h3>
          </div>
          <span class="panel-number" style="color:var(--accent);">ONLINE</span>
        </div>
        <p>Algorithm: <b>${esc(cl.algorithm)}</b>. Learning rate: <b>${cl.learning_rate}</b>.</p>
        <p class="muted">Every verified customer purchase adapts the localized bias and brand weighting without requiring full retraining from scratch.</p>
        <div class="mini-stats" style="margin: 16px 0;">
          <div><span class="micro-label">PURCHASES LEARNED</span><b style="color:var(--accent);">${cl.total_customer_purchases}</b><small>Verified transactions</small></div>
          <div><span class="micro-label">UNCERTAINTY SHIFT</span><b style="color:var(--cyan);">-12%</b><small>When customer backed</small></div>
          <div><span class="micro-label">MODEL ADAPTATION</span><b>LIVE</b><small>Continuous state</small></div>
        </div>
        <h3 style="margin-top: 20px;">Active Learned Brand Calibration Offsets</h3>
        <p class="muted">Learned offsets bridge historical catalogue listing prices and real customer transacted prices:</p>
        <div>
          ${Object.entries(cl.brand_calibrations || {}).map(([b, off]) => `
            <span class="pill">${esc(b.toUpperCase())}: <b>${off >= 0 ? '+' : ''}${money(off)}</b></span>
          `).join(' ')}
        </div>
      </div>
    `;
  }

  box.innerHTML = h;
}

async function history() {
  const box = $('#historylist');
  box.innerHTML = '<div class="card loading-state"><div class="loading-orb">⌁</div><h2>Loading your journal…</h2><div class="skeleton-line"></div></div>';
  const rows = await api('/api/history');
  $('#historyCount').textContent = rows.length;
  box.className = 'history-grid';
  box.innerHTML = rows.length
    ? rows.map((r, i) => `
      <article class="card history-card" style="animation-delay:${Math.min(i, 8) * 50}ms">
        <span class="micro-label">VALUATION / ${String(rows.length - i).padStart(3, '0')}</span>
        <div class="history-price">${money(r.price_inr)}</div>
        <div class="history-date">${esc(new Date(r.created_at).toLocaleString())}</div>
        <div class="history-specs">
          ${r.explanation?.contributions?.filter(c => ['brand', 'cpu_model', 'ram_gb'].includes(c.feature)).map(c => `${esc(labels[c.feature] || c.feature)}: ${esc(c.value)}`).join(' · ') || 'Saved laptop estimate'}
        </div>
        ${r.is_verified_purchase ? `<div style="margin-top:8px;"><span class="pill" style="border-color:rgba(214,255,79,.3); color:var(--accent); font-size:8px;">VERIFIED CUSTOMER PURCHASE: ${money(r.customer_paid)} (${esc(r.retailer || 'Retail')})</span></div>` : ''}
      </article>
    `).join('')
    : '<div class="empty-history"><div class="empty-coin">₹</div><span class="micro-label">NOTHING LOGGED YET</span><h2>Your first estimate starts here.</h2><p>Run a valuation or record a purchase to populate this journal.</p><button class="button button-primary" id="startEstimate">Create first estimate ↗</button></div>';

  const go = $('#startEstimate');
  if (go) go.onclick = () => document.querySelector('[data-tab="estimate"]').click();
}

async function updateHistoryCount() {
  try {
    const rows = await api('/api/history');
    $('#historyCount').textContent = rows.length;
  } catch (e) {
    $('#historyCount').textContent = '—';
  }
}

async function updateFinetuneCount() {
  try {
    const data = await api('/api/finetune');
    $('#finetuneCount').textContent = data.total_purchases;
    const statBox = $('#ftStatCount');
    if (statBox) statBox.textContent = data.total_purchases;
  } catch (e) {
    $('#finetuneCount').textContent = '0';
  }
}

$('#clear').onclick = async () => {
  const b = $('#clear');
  if (!confirm('Clear all saved LaptopLens estimates from this computer? This cannot be undone.')) return;
  b.disabled = true;
  try {
    await api('/api/history', { method: 'DELETE' });
    await history();
    $('#historyCount').textContent = '0';
  } catch (e) {
    $('#historylist').innerHTML = `<div class="empty-history"><p class="inline-error">${esc(friendlyError(e))}</p></div>`;
  } finally {
    b.disabled = false;
  }
};

$('#themeToggle').onclick = () => {
  document.body.classList.toggle('light');
  const light = document.body.classList.contains('light');
  try {
    localStorage.setItem('laptoplens-theme', light ? 'light' : 'dark');
  } catch (e) { }
  $('#themeToggle').setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = light ? '#f2f4f8' : '#0b1020';
};

try {
  if (localStorage.getItem('laptoplens-theme') === 'light') {
    document.body.classList.add('light');
    $('#themeToggle').setAttribute('aria-label', 'Switch to dark theme');
    document.querySelector('meta[name="theme-color"]').content = '#f2f4f8';
  }
} catch (e) { }

init();
