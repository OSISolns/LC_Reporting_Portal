'use strict';
/**
 * LocalAI — Self-Adapting Reason Classifier
 * ──────────────────────────────────────────
 * Incidents: Classified against the official Legacy Clinics incident taxonomy
 *            (38 types × severity × department) — no API key needed.
 * Cancellations / Refunds: TF-IDF + cosine-similarity clustering.
 *
 * NOTE: `natural` is lazy-loaded so it doesn't inflate cold-start time on
 * Vercel. The module is only required when analyzeRecords() is actually called.
 */

// Lazy references — populated on first use
let PorterStemmer, WordTokenizer, tokenizer;
function getNLP() {
  if (!PorterStemmer) {
    ({ PorterStemmer, WordTokenizer } = require('natural'));
    tokenizer = new WordTokenizer();
  }
  return { PorterStemmer, tokenizer };
}

// ══════════════════════════════════════════════════════════════════════════════
// LEGACY CLINICS INCIDENT TAXONOMY (Official Knowledge Base)
// Source: Quality & Patient Safety Department
// ══════════════════════════════════════════════════════════════════════════════
const INCIDENT_TAXONOMY = [
  {
    id: 1, label: 'Wrong PID',
    keywords: ['wrong','pid','patient id','identification number','incorrect pid','pid error','wrong patient id'],
    severityRange: 'severe', department: 'Cross-Cutting',
  },
  {
    id: 2, label: 'Slips & Falls',
    keywords: ['slip','fall','fell','fallen','trip','floor','ground','sliding','stumble','collapse'],
    severityRange: 'mild/moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 3, label: 'Medication Delay',
    keywords: ['medication delay','drug delay','medicine late','dose delay','administration delay','late medication','medication not given'],
    severityRange: 'mild/severe', department: 'Clinical',
  },
  {
    id: 4, label: 'Wrong Medication',
    keywords: ['wrong medication','wrong drug','wrong medicine','incorrect drug','wrong dose','wrong prescription','medication error','wrong tablet','wrong injection'],
    severityRange: 'severe/death', department: 'Clinical',
  },
  {
    id: 5, label: 'Allergic Reaction',
    keywords: ['allergic','allergy','reaction','anaphylaxis','rash','swelling','hypersensitivity','adverse reaction'],
    severityRange: 'mild/death', department: 'Clinical',
  },
  {
    id: 6, label: 'Equipment Malfunction (No Patient Impact)',
    keywords: ['equipment malfunction','device failure','machine breakdown','equipment failure','broken equipment','non functional equipment'],
    severityRange: 'mild', department: 'Logistics',
  },
  {
    id: 7, label: 'Equipment Malfunction (Patient Impact)',
    keywords: ['equipment malfunction patient','device failure patient','machine failure affecting patient','equipment failure harm'],
    severityRange: 'moderate/severe/death', department: 'Logistics',
  },
  {
    id: 8, label: 'Patient/Staff/Visitor Abuse',
    keywords: ['abuse','abused','abusing','assault','harass','harassment','verbal abuse','physical abuse','fight','violence','threatening','threat'],
    severityRange: 'mild/moderate/severe', department: 'Cross-Cutting',
  },
  {
    id: 9, label: 'Wrong Documentation',
    keywords: ['wrong documentation','incorrect documentation','wrong record','wrong chart','documentation error','wrong file','wrong notes','wrong report entry'],
    severityRange: 'mild/moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 10, label: 'Fire Safety Failure',
    keywords: ['fire extinguisher','fire alarm','unrefilled','non functional fire','fire safety','fire hazard'],
    severityRange: 'mild/severe/death', department: 'Logistics',
  },
  {
    id: 11, label: 'Wrong Diagnostics / Treatment',
    keywords: ['wrong diagnosis','wrong treatment','misdiagnosis','incorrect diagnosis','wrong therapy','wrong procedure','missed diagnosis'],
    severityRange: 'moderate/severe/death', department: 'Clinical',
  },
  {
    id: 12, label: 'Uncovered Electrical / Civil / Biomedical Hazard',
    keywords: ['uncovered','electrical','exposed wire','civil hazard','biomedical hazard','bare wire','open electrical','exposed cable'],
    severityRange: 'moderate/severe/death', department: 'Logistics',
  },
  {
    id: 13, label: 'Falling Objects',
    keywords: ['falling object','fell object','dropped object','object fall','items fell','ceiling fall','shelf fall'],
    severityRange: 'moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 14, label: 'Needle Stick Injury',
    keywords: ['needle stick','needlestick','sharps injury','needle prick','sharp injury','needle puncture'],
    severityRange: 'mild/moderate/severe', department: 'Clinical/Cleaning',
  },
  {
    id: 15, label: 'Unqualified Staff Hiring',
    keywords: ['unqualified','unqualified staff','hiring','wrong staff','unqualified employee','unqualified hire'],
    severityRange: 'moderate/severe', department: 'Human Resources',
  },
  {
    id: 16, label: 'Defective Ambulance',
    keywords: ['ambulance','defective ambulance','ambulance failure','broken ambulance','ambulance malfunction'],
    severityRange: 'severe/death', department: 'Logistics/Clinical',
  },
  {
    id: 17, label: 'Unsecured Software / IT System',
    keywords: ['software','system','unsecured','it system','cyber','hack','data breach','system failure','software failure','network','it security'],
    severityRange: 'moderate/severe/death', department: 'IT',
  },
  {
    id: 18, label: 'Improper Deliveries',
    keywords: ['improper delivery','wrong delivery','incorrect delivery','delivery error','supply error'],
    severityRange: 'mild/moderate/severe', department: 'Administration',
  },
  {
    id: 19, label: 'Improper Non-Medical Decision Making',
    keywords: ['improper decision','wrong decision','non medical decision','administrative decision error'],
    severityRange: 'mild/moderate/severe', department: 'Administration',
  },
  {
    id: 20, label: 'Release of Wrong Results',
    keywords: ['wrong result','wrong results','incorrect result','result error','wrong lab result','wrong imaging','wrong report released','wrong test result'],
    severityRange: 'mild/moderate/severe/death', department: 'Laboratory/Imaging/POCT',
  },
  {
    id: 21, label: 'Malpractice',
    keywords: ['malpractice','negligence','negligent','unprofessional','incompetence','mistreatment'],
    severityRange: 'moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 22, label: 'Security Issue',
    keywords: ['security','lost item','lost key','stolen','theft','misplaced key','missing item','security breach'],
    severityRange: 'moderate/severe', department: 'Cross-Cutting',
  },
  {
    id: 23, label: 'Wrong Patient Orientation',
    keywords: ['wrong patient orientation','wrong instructions','incorrect guidance','wrong direction given to patient','patient misinformed'],
    severityRange: 'mild/moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 24, label: 'Wrong Billing',
    keywords: ['wrong billing','incorrect billing','billing error','overbilled','overcharged billing','billing mistake','wrong amount charged','duplicate billing'],
    severityRange: 'moderate/severe', department: 'Customer Care',
  },
  {
    id: 25, label: 'Cross Contamination',
    keywords: ['contamination','cross contamination','contaminated','infection control','sterile','sterilization','cleaning failure'],
    severityRange: 'moderate/severe', department: 'Cross-Cutting',
  },
  {
    id: 26, label: 'Long Waiting Time',
    keywords: ['long wait','long waiting','waiting time','prolonged wait','patient waiting','queue','long queue','slow service'],
    severityRange: 'mild/moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 27, label: 'Long TAT of Results',
    keywords: ['long tat','tat','turnaround','slow results','results delayed','delayed results','late results','long result time'],
    severityRange: 'mild/moderate/severe/death', department: 'Laboratory/Imaging',
  },
  {
    id: 28, label: 'Delayed Admission / Referral / Discharge',
    keywords: ['delayed admission','delayed referral','delayed discharge','late admission','late referral','late discharge','delayed transfer'],
    severityRange: 'moderate/severe/death', department: 'Clinical',
  },
  {
    id: 29, label: 'Mislabeling of Samples / Records',
    keywords: ['mislabeling','mislabel','wrong label','incorrect label','sample labeling error','wrong sample label','mislabelled'],
    severityRange: 'moderate', department: 'Clinical',
  },
  {
    id: 30, label: 'Exposure to Biological / Chemical Substances',
    keywords: ['biological exposure','chemical exposure','substance exposure','hazardous','biohazard','chemical spill','toxic exposure'],
    severityRange: 'mild/moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 31, label: 'Resource Shortage',
    keywords: ['shortage','lack of staff','staff shortage','no equipment','resource shortage','insufficient','understaffed','no medical device'],
    severityRange: 'mild/moderate/severe/death', department: 'Cross-Cutting',
  },
  {
    id: 32, label: 'Severe Self-Harm',
    keywords: ['self harm','self-harm','stabbing','overdose','icu','suicide attempt','self inflicted','overdose icu'],
    severityRange: 'severe/death', department: 'Cross-Cutting',
  },
  {
    id: 33, label: 'Unexpected Patient Death',
    keywords: ['unexpected death','unknown death','preventable death','sudden death','unexplained death','died unexpectedly'],
    severityRange: 'death', department: 'Clinical',
  },
  {
    id: 34, label: 'Surgical Complication / Death',
    keywords: ['surgical complication','surgery complication','post operative','post-op','surgical death','operative complication'],
    severityRange: 'death', department: 'Clinical',
  },
  {
    id: 35, label: 'Severe Infection / Death',
    keywords: ['severe infection','sepsis','deadly infection','infection death','infection resulting in death'],
    severityRange: 'death', department: 'Cross-Cutting',
  },
  {
    id: 36, label: 'Failure to Treat Life-Threatening Condition',
    keywords: ['failure to treat','life threatening','life-threatening','not treated','delayed treatment','emergency missed','failed to recognize'],
    severityRange: 'death', department: 'Clinical',
  },
  {
    id: 37, label: 'Radiation Exposure',
    keywords: ['radiation','radiation exposure','xray exposure','x-ray exposure','radiological','nuclear'],
    severityRange: 'moderate/severe', department: 'Cross-Cutting',
  },
  {
    id: 38, label: 'Working Under Substance Influence',
    keywords: ['drug influence','substance influence','drunk','intoxicated','alcohol','under influence','impaired staff'],
    severityRange: 'mild/moderate/severe/death', department: 'Cross-Cutting',
  },
];

// STEMMED_TAXONOMY is computed lazily on first use
let STEMMED_TAXONOMY = null;
function getStemmedTaxonomy() {
  if (!STEMMED_TAXONOMY) {
    const { PorterStemmer } = getNLP();
    STEMMED_TAXONOMY = INCIDENT_TAXONOMY.map(cat => ({
      ...cat,
      stemmedKeys: cat.keywords.flatMap(k => k.split(/\s+/).map(w => PorterStemmer.stem(w.toLowerCase()))),
    }));
  }
  return STEMMED_TAXONOMY;
}

// ── Severity: resolve range string to worst-case level ────────────────────────
function worstSeverity(range) {
  if (!range) return 'low';
  const r = range.toLowerCase();
  if (r.includes('death'))   return 'high';
  if (r.includes('severe'))  return 'high';
  if (r.includes('moderate'))return 'medium';
  return 'low';
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC NLP (TF-IDF + Clustering) for Cancellations & Refunds
// ══════════════════════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','was','are','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','can','that','this',
  'these','those','i','we','you','he','she','they','it','my','our','your','his',
  'her','their','its','me','him','us','them','what','which','who','when','where',
  'how','why','not','no','yes','as','so','if','then','than','because','about',
  'into','through','during','before','after','above','below','between','each',
  'few','more','most','other','some','such','own','same','just','any','there',
  'patient','clinic','hospital','legacy','clinics','service','services','doctor',
  'nurse','staff','request','please','management','report','form','need','want',
  'made','make','also','get','got','said','one','two','three','case','due',
  'today','yesterday','last','first','new','old','still','already','since',
]);

const HIGH_KEYWORDS   = new Set(['error','wrong','mistake','incorrect','duplicate','fraud','unauthorized','overcharged','overcharge','double','falsified','missing','lost','void','cancel','refund','dispute','illegal']);
const MEDIUM_KEYWORDS = new Set(['complaint','issue','problem','delay','late','missed','failure','failed','waiting','wait','incomplete','partial','pending','rejected','billing','charge']);

function preprocess(text) {
  const { PorterStemmer, tokenizer } = getNLP();
  if (!text) return [];
  return tokenizer
    .tokenize(text.toLowerCase())
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
    .map(w => PorterStemmer.stem(w));
}

function buildTFIDF(docs) {
  const N = docs.length;
  const df = {};
  for (const tokens of docs) {
    const seen = new Set(tokens);
    for (const t of seen) df[t] = (df[t] || 0) + 1;
  }
  const idf = {};
  for (const [t, f] of Object.entries(df)) idf[t] = Math.log((N + 1) / (f + 1)) + 1;
  return docs.map(tokens => {
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
    const vec = {};
    for (const [t, count] of Object.entries(tf)) vec[t] = (count / tokens.length) * (idf[t] || 1);
    return vec;
  });
}

function topKeywords(vec, n = 6) {
  return Object.entries(vec).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

function cosineSim(a, b) {
  const setA = new Set(a), setB = new Set(b);
  const inter = [...setA].filter(w => setB.has(w)).length;
  const denom = Math.sqrt(setA.size) * Math.sqrt(setB.size);
  return denom ? inter / denom : 0;
}

function clusterDocs(items, minSim = 0.18) {
  const clusters = [];
  for (let i = 0; i < items.length; i++) {
    const keys = items[i].topKeys;
    let best = null, bestSim = minSim;
    for (const c of clusters) {
      const sim = cosineSim(keys, c.centroidKeys);
      if (sim > bestSim) { bestSim = sim; best = c; }
    }
    if (best) {
      best.docIndexes.push(i);
      const merged = {};
      for (const k of [...best.centroidKeys, ...keys]) merged[k] = (merged[k] || 0) + 1;
      best.centroidKeys = Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
    } else {
      clusters.push({ centroidKeys: keys.slice(0, 8), docIndexes: [i] });
    }
  }
  return clusters;
}

function labelCluster(centroidKeys, rawWords) {
  const { PorterStemmer } = getNLP();
  const label = centroidKeys.slice(0, 3).map(stem => {
    const originals = rawWords.filter(w => PorterStemmer.stem(w) === stem);
    if (!originals.length) return stem;
    const freq = {};
    for (const w of originals) freq[w] = (freq[w] || 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }).join(' / ');
  return label.replace(/\b\w/g, c => c.toUpperCase());
}

function assessSeverity(centroidKeys) {
  for (const k of centroidKeys) { if (HIGH_KEYWORDS.has(k))   return 'high'; }
  for (const k of centroidKeys) { if (MEDIUM_KEYWORDS.has(k)) return 'medium'; }
  return 'low';
}

// ══════════════════════════════════════════════════════════════════════════════
// INCIDENT CLASSIFIER (Taxonomy-based)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Matches an incident description against the 38 official taxonomy types.
 * Returns the best-matching taxonomy entry and a confidence score.
 */
function matchTaxonomy(text) {
  if (!text) return { match: null, score: 0 };
  const docTokens = new Set(preprocess(text));
  if (!docTokens.size) return { match: null, score: 0 };

  let best = null, bestScore = 0;
  for (const cat of getStemmedTaxonomy()) {
    const catSet = new Set(cat.stemmedKeys);
    const inter  = [...docTokens].filter(w => catSet.has(w)).length;
    const score  = inter / Math.sqrt(docTokens.size * catSet.size);
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return { match: best, score: bestScore };
}

function analyzeIncidents(rows) {
  const total = rows.length;
  if (!total) return { categories: [], cashierAttribution: [], executiveSummary: 'No incident records to analyze yet.', total: 0 };

  // Classify each incident
  const classified = rows.map(r => {
    const { match } = matchTaxonomy(r.reason);
    return {
      ...r,
      taxLabel:    match ? match.label    : 'Other / Uncategorised',
      taxDept:     match ? match.department : 'Unknown',
      taxSeverity: match ? worstSeverity(match.severityRange) : 'low',
      taxSeverityRange: match ? match.severityRange : '—',
    };
  });

  // Group by taxonomy label
  const groupMap = {};
  for (const item of classified) {
    const key = item.taxLabel;
    if (!groupMap[key]) groupMap[key] = {
      label: key, department: item.taxDept, severityRange: item.taxSeverityRange,
      severity: item.taxSeverity, count: 0, examples: [], cashiers: {}
    };
    groupMap[key].count++;
    if (groupMap[key].examples.length < 2 && item.reason) {
      const snip = item.reason.slice(0, 90);
      if (!groupMap[key].examples.includes(snip)) groupMap[key].examples.push(snip);
    }
    groupMap[key].cashiers[item.cashier || 'Unknown'] = (groupMap[key].cashiers[item.cashier || 'Unknown'] || 0) + 1;
  }

  const categories = Object.values(groupMap)
    .sort((a, b) => b.count - a.count)
    .map(g => ({
      label:       g.label,
      count:       g.count,
      percentage:  Math.round((g.count / total) * 100),
      examples:    g.examples,
      severity:    g.severity,
      department:  g.department,
      severityRange: g.severityRange,
      topCashiers: Object.entries(g.cashiers).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n),
    }));

  // Cashier attribution
  const cashierMap = {};
  for (const item of classified) {
    const name = item.cashier || 'Unknown';
    if (!cashierMap[name]) cashierMap[name] = { cashier: name, count: 0, reasons: [], catFreq: {} };
    cashierMap[name].count++;
    if (item.reason && cashierMap[name].reasons.length < 3) {
      const snip = item.reason.slice(0, 90);
      if (!cashierMap[name].reasons.includes(snip)) cashierMap[name].reasons.push(snip);
    }
    cashierMap[name].catFreq[item.taxLabel] = (cashierMap[name].catFreq[item.taxLabel] || 0) + 1;
  }

  const cashierAttribution = Object.values(cashierMap)
    .map(row => {
      const topCat = Object.entries(row.catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      return { cashier: row.cashier, count: row.count, topCategory: topCat, reasons: row.reasons };
    })
    .sort((a, b) => b.count - a.count);

  // Summary
  const highCount  = categories.filter(c => c.severity === 'high').length;
  const top        = categories[0];
  const topCashier = cashierAttribution[0];
  const summaryLines = [
    `${total} incident records classified across ${categories.length} categories using the Legacy Clinics Incident Taxonomy.`,
    top ? `Most reported: "${top.label}" (${top.count} records, ${top.percentage}%) — Department: ${top.department}.` : '',
    highCount ? `⚠ ${highCount} high-severity category type${highCount > 1 ? 's' : ''} detected — immediate management review required.` : '✅ No critical severity patterns detected.',
    topCashier ? `Staff member "${topCashier.cashier}" filed the most incident reports (${topCashier.count}) with primary type "${topCashier.topCategory}".` : '',
  ].filter(Boolean).join(' ');

  return { categories, cashierAttribution, executiveSummary: summaryLines, total };
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC ANALYSER for Cancellations & Refunds (TF-IDF clustering)
// ══════════════════════════════════════════════════════════════════════════════
function analyzeGeneric(rows, moduleName) {
  if (!rows || rows.length === 0) {
    return { categories: [], cashierAttribution: [], executiveSummary: 'No records to analyze yet.', total: 0 };
  }
  const processed = rows.map(r => ({ reason: r.reason || '', cashier: r.cashier || 'Unknown', tokens: preprocess(r.reason) }));
  const allRawWords = rows.flatMap(r => getNLP().tokenizer.tokenize((r.reason || '').toLowerCase()).filter(w => w.length > 2 && !STOPWORDS.has(w)));
  const tfidfVecs = buildTFIDF(processed.map(p => p.tokens));
  const items = processed.map((p, i) => ({ ...p, topKeys: topKeywords(tfidfVecs[i], 8) }));
  const clusters = clusterDocs(items);
  clusters.sort((a, b) => b.docIndexes.length - a.docIndexes.length);
  const total = rows.length;

  const categories = clusters.map(c => {
    const docs  = c.docIndexes.map(i => items[i]);
    const label = labelCluster(c.centroidKeys, allRawWords);
    const count = docs.length;
    const pct   = Math.round((count / total) * 100);
    const examples = docs.map(d => d.reason).filter(Boolean).sort((a, b) => a.length - b.length).slice(0, 2).map(s => s.slice(0, 90));
    const cashierFreq = {};
    for (const d of docs) cashierFreq[d.cashier] = (cashierFreq[d.cashier] || 0) + 1;
    const topCashiers = Object.entries(cashierFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    return { label, count, percentage: pct, examples, severity: assessSeverity(c.centroidKeys), topCashiers };
  });

  const cashierMap = {};
  for (const item of items) {
    const name = item.cashier;
    if (!cashierMap[name]) cashierMap[name] = { cashier: name, count: 0, reasons: [], catFreq: {} };
    cashierMap[name].count++;
    if (item.reason && cashierMap[name].reasons.length < 3) {
      const snip = item.reason.slice(0, 90);
      if (!cashierMap[name].reasons.includes(snip)) cashierMap[name].reasons.push(snip);
    }
  }
  for (let ci = 0; ci < clusters.length; ci++) {
    const label = categories[ci]?.label;
    if (!label) continue;
    for (const i of clusters[ci].docIndexes) {
      const name = items[i].cashier;
      if (cashierMap[name]) cashierMap[name].catFreq[label] = (cashierMap[name].catFreq[label] || 0) + 1;
    }
  }
  const cashierAttribution = Object.values(cashierMap)
    .map(row => ({ cashier: row.cashier, count: row.count, topCategory: Object.entries(row.catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—', reasons: row.reasons }))
    .sort((a, b) => b.count - a.count);

  const top = categories[0];
  const topCash = cashierAttribution[0];
  const executiveSummary = [
    top ? `Top ${moduleName} reason: "${top.label}" (${top.count} records, ${top.percentage}%).` : '',
    categories.filter(c => c.severity === 'high').length ? `⚠ ${categories.filter(c => c.severity === 'high').length} high-severity pattern(s) detected.` : '✅ No high-severity patterns.',
    topCash ? `"${topCash.cashier}" has the highest submission count (${topCash.count}) — primarily "${topCash.topCategory}".` : '',
  ].filter(Boolean).join(' ');

  return { categories, cashierAttribution, executiveSummary, total };
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
function analyzeRecords(rows, moduleName) {
  if (moduleName === 'incidents') return analyzeIncidents(rows);
  return analyzeGeneric(rows, moduleName);
}

module.exports = { analyzeRecords, INCIDENT_TAXONOMY };
