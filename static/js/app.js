/* ============================================
   NeuroScan — app.js
   Parkinson's Detection Platform
   ============================================ */

// ─── DOM Elements ───────────────────────────
const fileInput       = document.getElementById('fileInput');
const dropZone        = document.getElementById('dropZone');
const dropContent     = document.getElementById('dropContent');
const dropPreview     = document.getElementById('dropPreview');
const previewImg      = document.getElementById('previewImg');
const fileName        = document.getElementById('fileName');
const removeBtn       = document.getElementById('removeBtn');
const analyzeBtn      = document.getElementById('analyzeBtn');

const resultIdle      = document.getElementById('resultIdle');
const resultLoading   = document.getElementById('resultLoading');
const resultOutput    = document.getElementById('resultOutput');

const step1           = document.getElementById('step1');
const step2           = document.getElementById('step2');
const step3           = document.getElementById('step3');

const riskChip            = document.getElementById('riskChip');
const resultBadge         = document.getElementById('resultBadge');
const parkinsonVal        = document.getElementById('parkinsonVal');
const normalVal           = document.getElementById('normalVal');
const parkinsonFill       = document.getElementById('parkinsonFill');
const normalFill          = document.getElementById('normalFill');
const confidenceVal       = document.getElementById('confidenceVal');
const confidenceFill      = document.getElementById('confidenceFill');
const resultDetails       = document.getElementById('resultDetails');
const reportPreviewBadge  = document.getElementById('reportPreviewBadge');
const reportPreviewText   = document.getElementById('reportPreviewText');
const reportPreviewList   = document.getElementById('reportPreviewList');
const reportBtn           = document.getElementById('reportBtn');
const resetBtn            = document.getElementById('resetBtn');

// ─── State ──────────────────────────────────
let selectedFile = null;
let lastReport   = null;

const RISK_LABELS = {
  normal:     { text: 'خطر منخفض',     cls: 'risk-low' },
  suspicious: { text: 'شك بسيط',       cls: 'risk-mid' },
  parkinson:  { text: 'خطر مرتفع',     cls: 'risk-high' },
};

// ─── File Selection Handlers ─────────────────

dropZone.addEventListener('click', (e) => {
  if (e.target === removeBtn || removeBtn.contains(e.target)) return;
  if (!selectedFile) fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragging');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragging');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleFile(file);
  } else {
    showToast('يرجى رفع ملف صورة صالح (PNG أو JPG)');
  }
});

removeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetUpload();
});

// ─── File Handler ────────────────────────────
function handleFile(file) {
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    fileName.textContent = file.name;
    dropContent.style.display = 'none';
    dropPreview.style.display = 'block';
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

// ─── Reset Upload ────────────────────────────
function resetUpload() {
  selectedFile = null;
  lastReport   = null;
  fileInput.value = '';
  previewImg.src = '';
  fileName.textContent = '—';
  dropContent.style.display = 'block';
  dropPreview.style.display = 'none';
  analyzeBtn.disabled = true;
  showResultIdle();
}

// ─── Analyze Button ───────────────────────────
analyzeBtn.addEventListener('click', () => {
  if (!selectedFile) return;
  runAnalysis();
});

resetBtn.addEventListener('click', () => resetUpload());

reportBtn.addEventListener('click', () => {
  if (!lastReport) return;
  openReport(lastReport);
});

// ─── Analysis Flow ─────────────────────────────
async function runAnalysis() {
  analyzeBtn.disabled = true;
  showResultLoading();

  try {
    await delay(1000);
    markStepDone(step1);
    markStepActive(step2);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch('/predict', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Server error');
    }

    lastReport = data.report;

    const realResult = {
      label: data.result.class === 'Parkinson' ? 'positive' : 'negative',
      confidence: data.result.confidence,
      probability: data.result.probability,
      risk_level: data.result.risk_level,
      report: data.report,
    };

    await delay(1200);
    markStepDone(step2);
    markStepActive(step3);

    await delay(800);
    markStepDone(step3);

    await delay(400);
    showResultOutput(realResult);

  } catch (err) {
    console.error('Analysis failed:', err);
    showToast('حدث خطأ أثناء التحليل. يرجى المحاولة مرة أخرى.');
    analyzeBtn.disabled = false;
    showResultIdle();
  }
}

// ─── Show / Hide States ───────────────────────

function showResultIdle() {
  resultIdle.style.display    = 'flex';
  resultLoading.style.display = 'none';
  resultOutput.style.display  = 'none';
}

function showResultLoading() {
  resultIdle.style.display    = 'none';
  resultLoading.style.display = 'flex';
  resultOutput.style.display  = 'none';

  [step1, step2, step3].forEach(s => {
    s.classList.remove('done', 'active');
  });
  markStepActive(step1);
}

function showResultOutput(result) {
  resultIdle.style.display    = 'none';
  resultLoading.style.display = 'none';
  resultOutput.style.display  = 'flex';

  const report = result.report;
  const isPositive = result.label === 'positive';
  const isSuspicious = result.risk_level === 'suspicious';
  const confidence = Math.round(result.confidence * 100);
  const parkinsonPct = Math.round(result.probability * 100);
  const normalPct = 100 - parkinsonPct;
  const risk = RISK_LABELS[result.risk_level] || RISK_LABELS.normal;

  // Risk chip
  riskChip.className = 'risk-chip ' + risk.cls;
  riskChip.textContent = risk.text;

  // Badge
  resultBadge.className = 'result-badge ' + (isPositive ? 'positive' : isSuspicious ? 'warning' : 'negative');
  if (isPositive) {
    resultBadge.innerHTML = '⚠️ يُحتمل وجود الشلل الرعاش';
  } else if (isSuspicious) {
    resultBadge.innerHTML = '🔍 لا توجد علامات واضحة — مع شك بسيط';
  } else {
    resultBadge.innerHTML = '✅ لا تظهر علامات الشلل الرعاش';
  }

  // Probability cards
  parkinsonVal.textContent = parkinsonPct + '%';
  normalVal.textContent = normalPct + '%';
  setTimeout(() => {
    parkinsonFill.style.width = parkinsonPct + '%';
    normalFill.style.width = normalPct + '%';
  }, 100);

  // Confidence bar
  confidenceVal.textContent = confidence + '%';
  setTimeout(() => {
    confidenceFill.style.width = confidence + '%';
    const color = isPositive
      ? 'linear-gradient(90deg, #ff3b5c, #ff8c00)'
      : isSuspicious
        ? 'linear-gradient(90deg, #e6a700, #ffbb00)'
        : 'linear-gradient(90deg, #00c26e, #00e87a)';
    confidenceFill.style.background = color;
  }, 100);

  // Details
  resultDetails.innerHTML = `
    <strong style="color: var(--text);">ملخص التحليل:</strong><br/>
    ${report.summary}
  `;

  // Report preview
  reportPreviewBadge.textContent = report.risk_badge;
  reportPreviewBadge.style.color = report.risk_color;
  reportPreviewBadge.style.borderColor = report.risk_color + '55';
  reportPreviewBadge.style.background = report.risk_color + '18';
  reportPreviewText.textContent = 'يتضمن التقرير الكامل: نصائح طبية، نظام غذائي، خيارات علاجية، وخطة متابعة حسب مستوى الخطر.';

  const previewItems = [
    ...report.sections.advice.slice(0, 2),
    ...report.sections.diet.slice(0, 1),
    ...report.sections.followup.slice(0, 1),
  ];
  reportPreviewList.innerHTML = previewItems.map(item => `<li>${item}</li>`).join('');
}

// ─── Open Report ──────────────────────────────

function openReport(report) {
  const params = new URLSearchParams({
    class: report.pred_class,
    probability: report.parkinson_pct / 100,
    confidence: report.confidence_pct / 100,
    filename: report.filename,
  });
  if (report.image_url) params.set('image_url', report.image_url);

  window.open('/report?' + params.toString(), '_blank', 'width=900,height=800');
}

// ─── Loading Steps ────────────────────────────

function markStepActive(el) {
  el.classList.remove('done');
  el.classList.add('active');
}

function markStepDone(el) {
  el.classList.remove('active');
  el.classList.add('done');
}

// ─── Helpers ──────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '30px',
    right: '30px',
    background: '#1e3050',
    color: '#e8f0fe',
    padding: '14px 22px',
    borderRadius: '10px',
    border: '1px solid #ff3b5c',
    fontSize: '0.9rem',
    fontFamily: "'Cairo', sans-serif",
    zIndex: '9999',
    animation: 'fadeUp 0.3s ease',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ─── Init ─────────────────────────────────────
showResultIdle();
