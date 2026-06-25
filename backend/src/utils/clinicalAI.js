'use strict';

// ── Rich Medication Knowledge Base ────────────────────────────────────────────
const DRUG_DB = [
  // Analgesics / Antipyretics
  { names: ['paracetamol','acetaminophen','panadol'], dose: '1g', route: 'PO/IV', frequency: 'QID', category: 'Analgesic/Antipyretic', notes: 'Max 4g/day. Avoid in liver disease.' },
  { names: ['ibuprofen'], dose: '400mg', route: 'PO', frequency: 'TDS', category: 'NSAID', notes: 'Take with food. Avoid in renal impairment.' },
  { names: ['diclofenac','voltaren'], dose: '75mg', route: 'IM/PO', frequency: 'BD', category: 'NSAID', notes: 'Avoid in GI ulcers. Monitor renal function.' },
  { names: ['tramadol'], dose: '50mg', route: 'PO/IV', frequency: 'TDS', category: 'Opioid Analgesic', notes: 'Risk of seizures. Avoid in epilepsy.' },
  { names: ['morphine'], dose: '10mg', route: 'IV/SC/IM', frequency: 'Q4H PRN', category: 'Opioid', notes: 'Monitor respiratory rate. Have naloxone ready.' },
  { names: ['pethidine','meperidine'], dose: '50-100mg', route: 'IM', frequency: 'Q4H PRN', category: 'Opioid', notes: 'Short-term use only.' },

  // Antibiotics
  { names: ['amoxicillin'], dose: '500mg', route: 'PO', frequency: 'TDS', category: 'Antibiotic', notes: 'Penicillin-class. Check allergy.' },
  { names: ['amoxicillin-clavulanate','augmentin','co-amoxiclav'], dose: '625mg', route: 'PO', frequency: 'TDS', category: 'Antibiotic', notes: 'Take with food to reduce GI upset.' },
  { names: ['ceftriaxone'], dose: '1g', route: 'IV/IM', frequency: 'OD', category: 'Antibiotic (3rd gen Cephalosporin)', notes: 'Reconstitute with lidocaine for IM use.' },
  { names: ['cefuroxime'], dose: '750mg', route: 'IV', frequency: 'TDS', category: 'Antibiotic (2nd gen Cephalosporin)', notes: 'Infuse over 30 mins.' },
  { names: ['metronidazole','flagyl'], dose: '500mg', route: 'PO/IV', frequency: 'TDS', category: 'Antibiotic/Antiprotozoal', notes: 'Avoid alcohol. Metallic taste common.' },
  { names: ['ciprofloxacin','ciprobay'], dose: '500mg', route: 'PO/IV', frequency: 'BD', category: 'Antibiotic (Quinolone)', notes: 'Avoid antacids. Tendon rupture risk.' },
  { names: ['azithromycin','zithromax'], dose: '500mg', route: 'PO', frequency: 'OD', category: 'Antibiotic (Macrolide)', notes: '3-5 day course. Single daily dose.' },
  { names: ['doxycycline'], dose: '100mg', route: 'PO', frequency: 'BD', category: 'Antibiotic (Tetracycline)', notes: 'Take with water. Avoid dairy. Photosensitivity.' },
  { names: ['gentamicin'], dose: '5mg/kg', route: 'IV', frequency: 'OD', category: 'Antibiotic (Aminoglycoside)', notes: 'Monitor renal function and drug levels.' },

  // Antifungals
  { names: ['fluconazole','diflucan'], dose: '150mg', route: 'PO', frequency: 'Single dose', category: 'Antifungal', notes: 'Single dose for vaginal candidiasis.' },

  // Antihypertensives / Cardiac
  { names: ['amlodipine'], dose: '5mg', route: 'PO', frequency: 'OD', category: 'Calcium Channel Blocker', notes: 'Take in the morning.' },
  { names: ['enalapril'], dose: '5mg', route: 'PO', frequency: 'OD', category: 'ACE Inhibitor', notes: 'Monitor BP and potassium. Watch for dry cough.' },
  { names: ['losartan'], dose: '50mg', route: 'PO', frequency: 'OD', category: 'ARB', notes: 'Monitor renal function and potassium.' },
  { names: ['atenolol'], dose: '50mg', route: 'PO', frequency: 'OD', category: 'Beta Blocker', notes: 'Do not stop abruptly.' },
  { names: ['metoprolol'], dose: '25-50mg', route: 'PO', frequency: 'BD', category: 'Beta Blocker', notes: 'Take with food.' },
  { names: ['furosemide','lasix'], dose: '40mg', route: 'PO/IV', frequency: 'OD', category: 'Loop Diuretic', notes: 'Monitor electrolytes. Early morning dosing.' },
  { names: ['hydralazine'], dose: '10-20mg', route: 'IV', frequency: 'Q4-6H PRN', category: 'Vasodilator', notes: 'For hypertensive emergencies.' },
  { names: ['nifedipine'], dose: '10mg', route: 'PO/SL', frequency: 'TDS', category: 'Calcium Channel Blocker', notes: 'SL for acute BP control.' },

  // Fluids / IV
  { names: ['normal saline','0.9% nacl','0.9% saline','nacl 0.9%'], dose: '1000ml', route: 'IV', frequency: 'As prescribed', category: 'IV Fluid', notes: 'Standard isotonic crystalloid.' },
  { names: ['ringer lactate','lactated ringer','ringers lactate'], dose: '1000ml', route: 'IV', frequency: 'As prescribed', category: 'IV Fluid', notes: 'Preferred for resuscitation.' },
  { names: ['dextrose 5%','d5w','5% dextrose'], dose: '1000ml', route: 'IV', frequency: 'As prescribed', category: 'IV Fluid', notes: 'Hypotonic. Not for resuscitation.' },
  { names: ['dextrose 50%','d50','50% dextrose'], dose: '50ml', route: 'IV', frequency: 'STAT', category: 'IV Fluid (Concentrated)', notes: 'For hypoglycemia. Administer slowly.' },

  // GI
  { names: ['omeprazole','losec'], dose: '20mg', route: 'PO/IV', frequency: 'OD', category: 'PPI', notes: 'Best taken 30 min before meal.' },
  { names: ['pantoprazole'], dose: '40mg', route: 'PO/IV', frequency: 'OD', category: 'PPI', notes: 'Administer before breakfast.' },
  { names: ['ranitidine','zantac'], dose: '150mg', route: 'PO', frequency: 'BD', category: 'H2 Blocker', notes: 'Take before meals.' },
  { names: ['metoclopramide','maxolon'], dose: '10mg', route: 'PO/IV/IM', frequency: 'TDS', category: 'Antiemetic', notes: 'Risk of extrapyramidal effects.' },
  { names: ['ondansetron','zofran'], dose: '4-8mg', route: 'PO/IV', frequency: 'TDS PRN', category: 'Antiemetic (5-HT3 antagonist)', notes: 'Preferred antiemetic. QT prolongation risk.' },
  { names: ['oral rehydration solution','ors'], dose: '200ml', route: 'PO', frequency: 'After each stool', category: 'Rehydration', notes: 'For diarrhea management.' },

  // Respiratory
  { names: ['salbutamol','albuterol','ventolin'], dose: '2.5mg', route: 'Nebulisation', frequency: 'Q4-6H PRN', category: 'Bronchodilator', notes: 'Monitor HR. Can cause tremor.' },
  { names: ['ipratropium','atrovent'], dose: '0.5mg', route: 'Nebulisation', frequency: 'TDS', category: 'Anticholinergic Bronchodilator', notes: 'Often combined with salbutamol.' },
  { names: ['prednisolone'], dose: '30-60mg', route: 'PO', frequency: 'OD', category: 'Corticosteroid', notes: 'Take with food. Do not stop abruptly.' },
  { names: ['dexamethasone'], dose: '8mg', route: 'IV/IM', frequency: 'OD', category: 'Corticosteroid', notes: 'Monitor blood glucose.' },

  // Anticoagulants
  { names: ['heparin'], dose: '5000 units', route: 'SC', frequency: 'BD/TDS', category: 'Anticoagulant', notes: 'Monitor APTT. Have protamine ready.' },
  { names: ['enoxaparin','clexane'], dose: '40mg', route: 'SC', frequency: 'OD', category: 'LMWH', notes: 'Inject into abdomen. Monitor platelets.' },

  // Antidiabetics
  { names: ['metformin'], dose: '500mg', route: 'PO', frequency: 'BD/TDS', category: 'Antidiabetic (Biguanide)', notes: 'Take with meals. Avoid in renal impairment.' },
  { names: ['insulin actrapid','regular insulin','insulin short-acting'], dose: 'As prescribed', route: 'SC/IV', frequency: 'As prescribed', category: 'Insulin', notes: 'Monitor blood glucose closely.' },
  { names: ['insulin glargine','lantus','insulin long-acting'], dose: 'As prescribed', route: 'SC', frequency: 'OD', category: 'Insulin (Long-acting)', notes: 'Same time each day. Do not mix.' },

  // OB/GYN
  { names: ['oxytocin','syntocinon'], dose: '10 units', route: 'IV/IM', frequency: 'STAT', category: 'Uterotonic', notes: 'For PPH management. Monitor contractions.' },
  { names: ['misoprostol','cytotec'], dose: '400-800mcg', route: 'SL/PV/PR', frequency: 'STAT', category: 'Prostaglandin/Uterotonic', notes: 'Check protocol for route and dose.' },
  { names: ['magnesium sulphate','mgso4','magnesium sulfate'], dose: '4g', route: 'IV', frequency: 'Loading dose, then 1-2g/hr', category: 'Anticonvulsant (Eclampsia)', notes: 'Monitor respiratory rate and reflexes. Antidote: calcium gluconate.' },
  { names: ['folic acid'], dose: '5mg', route: 'PO', frequency: 'OD', category: 'Vitamin', notes: 'Start before conception ideally.' },
  { names: ['ferrous sulphate'], dose: '200mg', route: 'PO', frequency: 'TDS', category: 'Iron Supplement', notes: 'Take on empty stomach if tolerated.' },

  // Antiparasitic / Malaria
  { names: ['artemether-lumefantrine','coartem','al'], dose: '4 tabs', route: 'PO', frequency: 'BD x3 days', category: 'Antimalarial', notes: 'Take with fatty food for better absorption.' },
  { names: ['artesunate','iv artesunate'], dose: '2.4mg/kg', route: 'IV', frequency: 'At 0, 12, 24h then OD', category: 'Antimalarial (Severe)', notes: 'For severe malaria. Monitor glucose.' },
  { names: ['quinine'], dose: '600mg', route: 'PO/IV', frequency: 'TDS', category: 'Antimalarial', notes: 'Monitor QT interval. Risk of hypoglycemia.' },

  // Anticonvulsants
  { names: ['diazepam','valium'], dose: '10mg', route: 'IV/PR', frequency: 'STAT', category: 'Benzodiazepine/Anticonvulsant', notes: 'For seizure termination. Monitor airway.' },
  { names: ['phenytoin','phenobarbitone'], dose: '15-20mg/kg', route: 'IV', frequency: 'Loading dose', category: 'Anticonvulsant', notes: 'Slow infusion. Monitor cardiac rhythm.' },

  // Vitamin / Supplements
  { names: ['vitamin c','ascorbic acid'], dose: '500mg', route: 'PO', frequency: 'OD', category: 'Vitamin', notes: 'Safe in pregnancy.' },
  { names: ['vitamin b complex'], dose: '1 tab', route: 'PO', frequency: 'OD', category: 'Vitamin', notes: 'Take with or after food.' },

  // Misc
  { names: ['hydrocortisone'], dose: '100mg', route: 'IV', frequency: 'Q8H', category: 'Corticosteroid', notes: 'For adrenal crisis or anaphylaxis.' },
  { names: ['adrenaline','epinephrine'], dose: '0.5mg (0.5ml of 1:1000)', route: 'IM', frequency: 'STAT', category: 'Vasopressor/Anaphylaxis', notes: 'Anterolateral thigh. Repeat after 5 mins if needed.' },
  { names: ['chlorphenamine','piriton'], dose: '4mg', route: 'PO/IM', frequency: 'TDS', category: 'Antihistamine', notes: 'Causes drowsiness.' },
  { names: ['loratadine','claritin'], dose: '10mg', route: 'PO', frequency: 'OD', category: 'Antihistamine (Non-drowsy)', notes: 'Preferred daytime antihistamine.' },
  { names: ['calcium gluconate'], dose: '10ml of 10%', route: 'IV', frequency: 'STAT', category: 'Electrolyte/Antidote', notes: 'Antidote for hypermagnesemia and hypocalcemia.' },
  { names: ['potassium chloride','kcl'], dose: '20mmol', route: 'IV (diluted)', frequency: 'Over 2h', category: 'Electrolyte', notes: 'NEVER give undiluted IV push. Monitor ECG.' },
];

// ── Frequency Reference ───────────────────────────────────────────────────────
const FREQUENCY_LEGEND = [
  { abbr: 'STAT',   meaning: 'Immediately (single emergency dose)' },
  { abbr: 'OD / Daily', meaning: 'Once every 24 hours' },
  { abbr: 'BD / BID', meaning: 'Twice daily — approximately 12h apart (e.g., 08:00 & 20:00)' },
  { abbr: 'TDS / TID', meaning: 'Three times daily — approximately 8h apart (e.g., 08:00, 14:00, 20:00)' },
  { abbr: 'QID / QDS', meaning: 'Four times daily — approximately 6h apart' },
  { abbr: 'Q4H',    meaning: 'Every 4 hours (6 times/day)' },
  { abbr: 'Q6H',    meaning: 'Every 6 hours (4 times/day)' },
  { abbr: 'Q8H',    meaning: 'Every 8 hours (3 times/day)' },
  { abbr: 'PRN',    meaning: 'As needed / when required' },
  { abbr: 'AC',     meaning: 'Before meals (ante cibum)' },
  { abbr: 'PC',     meaning: 'After meals (post cibum)' },
  { abbr: 'HS / QHS', meaning: 'At bedtime / hour of sleep' },
  { abbr: 'SL',     meaning: 'Under the tongue (sublingual)' },
  { abbr: 'Loading dose', meaning: 'Initial high dose to quickly achieve therapeutic levels' },
];

// ── ICD-11 Live API Client (WHO) ─────────────────────────────────────────────
const https = require('https');
const querystring = require('querystring');
const db = require('../config/db');

// Token cache — avoid hammering the WHO token endpoint on every request
let _icd11Token = null;
let _icd11TokenExpiresAt = 0;

/**
 * Obtain (or return cached) OAuth2 bearer token from the WHO identity server.
 * Tokens are valid for 1 hour; we refresh 60 s before expiry.
 */
async function getICD11Token() {
  const now = Date.now();
  if (_icd11Token && now < _icd11TokenExpiresAt - 60_000) return _icd11Token;

  const clientId     = process.env.ICD11_CLIENT_ID;
  const clientSecret = process.env.ICD11_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('ICD11_CLIENT_ID / ICD11_CLIENT_SECRET are not set in environment variables.');
  }

  const body = querystring.stringify({
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         'icdapi_access',
    grant_type:    'client_credentials',
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'icdaccessmanagement.who.int',
      path:     '/connect/token',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (!json.access_token) return reject(new Error('WHO token endpoint: no access_token in response'));
          _icd11Token = json.access_token;
          _icd11TokenExpiresAt = now + (json.expires_in || 3600) * 1000;
          resolve(_icd11Token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Search WHO ICD-11 MMS (Mortality & Morbidity Statistics) release.
 * Checks the local SQLite icd11_cache table first. If a match is found,
 * it returns the cached results instantly. Otherwise, it queries the live WHO API
 * and caches the new results.
 * If offline or the API fails, it does a partial match lookup in the cache table.
 */
async function suggestICD11(query) {
  if (!query || query.length < 2) return [];

  const needle = query.toLowerCase().trim();

  // 1. Check for exact match in the local cache
  try {
    const cachedRow = await db.query('SELECT results FROM icd11_cache WHERE keyword = $1', [needle]);
    if (cachedRow && cachedRow.rows.length > 0) {
      console.log(`🎯 ICD-11 Cache HIT for: "${needle}"`);
      return JSON.parse(cachedRow.rows[0].results);
    }
  } catch (err) {
    console.error('⚠️ Error reading from icd11_cache:', err.message);
  }

  // 2. Cache Miss: Attempt to query the live WHO ICD-11 API
  let results = [];
  let apiSuccess = false;
  try {
    const token = await getICD11Token();
    const qs = querystring.stringify({
      q:                      query,
      subtreeFilterUsage:     'includeDefs',
      includeKeywordResult:   true,
      useFlexisearch:         true,
      flatResults:            true,
      highlightingEnabled:    false,
      medicalCodingMode:      true,
      releaseId:              '2024-01',
      linearizationname:      'mms',
    });

    results = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'id.who.int',
        path:     `/icd/release/11/2024-01/mms/search?${qs}`,
        method:   'GET',
        headers:  {
          Authorization:          `Bearer ${token}`,
          Accept:                 'application/json',
          'Accept-Language':      'en',
          'API-Version':          'v2',
        },
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              return reject(new Error(`WHO API returned status ${res.statusCode}`));
            }
            const json = JSON.parse(raw);
            const entities = json.destinationEntities || [];
            const parsed = entities.slice(0, 10).map((e) => ({
              code: e.theCode  || e.id || '',
              desc: e.title?.['@value'] || e.title || 'Unknown',
            }));
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('WHO API request timeout'));
      });

      req.on('error', reject);
      req.end();
    });

    apiSuccess = true;
  } catch (err) {
    console.warn(`⚠️ WHO ICD-11 API call failed or timed out: ${err.message}. Falling back to local partial cache search.`);
  }

  // 3. If API query succeeded and returned results, cache them in the SQLite db
  if (apiSuccess && results && results.length > 0) {
    try {
      await db.query(
        'INSERT OR REPLACE INTO icd11_cache (keyword, results) VALUES ($1, $2)',
        [needle, JSON.stringify(results)]
      );
      console.log(`💾 Cached ${results.length} results for keyword: "${needle}"`);
    } catch (cacheErr) {
      console.error('⚠️ Failed to save results to icd11_cache:', cacheErr.message);
    }
    return results;
  }

  // 4. Fallback: If API failed or returned empty, perform a partial match inside the local cache
  try {
    console.log(`🔍 Searching local database cache for keywords matching: "%${needle}%"`);
    const partialRows = await db.query(
      'SELECT keyword, results FROM icd11_cache WHERE keyword LIKE $1 OR results LIKE $2 LIMIT 10',
      [`%${needle}%`, `%${needle}%`]
    );

    if (partialRows && partialRows.rows.length > 0) {
      const combinedResults = new Map();
      for (const row of partialRows.rows) {
        try {
          const parsedResults = JSON.parse(row.results);
          for (const item of parsedResults) {
            if (item.code && item.desc) {
              combinedResults.set(item.code, item.desc);
            }
          }
        } catch (_) {}
      }

      const finalSuggestions = Array.from(combinedResults.entries()).map(([code, desc]) => ({
        code,
        desc
      })).slice(0, 10);

      if (finalSuggestions.length > 0) {
        console.log(`✨ Found ${finalSuggestions.length} local suggestions matching "${needle}"`);
        return finalSuggestions;
      }
    }
  } catch (dbErr) {
    console.error('⚠️ Database partial cache search failed:', dbErr.message);
  }

  return [];
}

// Legacy alias — controllers still import suggestICD10 by name
const suggestICD10 = suggestICD11;

// ── Medication Lookup ─────────────────────────────────────────────────────────
function lookupMedication(medName) {
  if (!medName) return null;
  const needle = medName.toLowerCase().trim();
  for (const drug of DRUG_DB) {
    for (const alias of drug.names) {
      if (needle.includes(alias) || alias.includes(needle)) return drug;
    }
  }
  return null;
}

// ── Suggest medications from names ───────────────────────────────────────────
function suggestMedications(medications) {
  return medications.map(med => {
    const found = lookupMedication(med);
    if (found) {
      return { name: med, dose: found.dose, route: found.route, frequency: found.frequency, category: found.category, notes: found.notes, matched: true };
    }
    // Fallback heuristics
    const n = med.toLowerCase();
    let dose = '1 dose', route = 'PO', frequency = 'OD';
    if (n.includes('iv') || n.includes('inj') || n.includes('infus')) route = 'IV';
    if (n.includes('saline') || n.includes('lactate') || n.includes('dextrose')) { route = 'IV'; dose = '1000ml'; frequency = 'As prescribed'; }
    if (n.includes('neb') || n.includes('inhaler')) { route = 'Nebulisation'; frequency = 'Q4-6H PRN'; }
    if (n.includes('mg')) { const m = n.match(/(\d+mg)/); if (m) dose = m[1]; }
    return { name: med, dose, route, frequency, category: 'General', notes: 'Please verify dose and route with prescriber.', matched: false };
  });
}

// ── Vitals Assessment ─────────────────────────────────────────────────────────
function assessVitals(vitals) {
  const findings = [];
  const alerts = [];

  const temp = parseFloat(vitals.temp);
  if (!isNaN(temp)) {
    if (temp >= 39.0) { findings.push(`High-grade fever (${temp}°C)`); alerts.push('FEVER'); }
    else if (temp >= 37.5) { findings.push(`Low-grade fever (${temp}°C)`); }
    else if (temp < 36.0) { findings.push(`Hypothermia (${temp}°C)`); alerts.push('HYPOTHERMIA'); }
    else { findings.push(`Afebrile (${temp}°C)`); }
  }

  const hr = parseInt(vitals.pulse);
  if (!isNaN(hr)) {
    if (hr > 120) { findings.push(`Severe tachycardia (HR: ${hr} bpm)`); alerts.push('TACHYCARDIA'); }
    else if (hr > 100) { findings.push(`Tachycardia (HR: ${hr} bpm)`); }
    else if (hr < 50) { findings.push(`Severe bradycardia (HR: ${hr} bpm)`); alerts.push('BRADYCARDIA'); }
    else if (hr < 60) { findings.push(`Bradycardia (HR: ${hr} bpm)`); }
    else { findings.push(`Regular rate and rhythm (HR: ${hr} bpm)`); }
  }

  const rr = parseInt(vitals.rr);
  if (!isNaN(rr)) {
    if (rr > 25) { findings.push(`Significant tachypnoea (RR: ${rr} breaths/min)`); alerts.push('RESP_DISTRESS'); }
    else if (rr > 20) { findings.push(`Tachypnoea (RR: ${rr} breaths/min)`); }
    else if (rr < 10) { findings.push(`Bradypnoea (RR: ${rr} breaths/min)`); alerts.push('RESP_DISTRESS'); }
    else { findings.push(`Eupnoeic (RR: ${rr} breaths/min)`); }
  }

  if (vitals.bp && vitals.bp.includes('/')) {
    const [sys, dia] = vitals.bp.split('/').map(v => parseInt(v.trim()));
    if (!isNaN(sys) && !isNaN(dia)) {
      if (sys >= 180 || dia >= 110) { findings.push(`Hypertensive crisis (BP: ${vitals.bp} mmHg)`); alerts.push('HTN_CRISIS'); }
      else if (sys >= 140 || dia >= 90) { findings.push(`Hypertension (BP: ${vitals.bp} mmHg)`); }
      else if (sys < 90 || dia < 60) { findings.push(`Hypotension (BP: ${vitals.bp} mmHg)`); alerts.push('HYPOTENSION'); }
      else { findings.push(`Normotensive (BP: ${vitals.bp} mmHg)`); }
    }
  }

  const spo2 = parseInt(vitals.spo2);
  if (!isNaN(spo2)) {
    if (spo2 < 90) { findings.push(`Severe hypoxaemia on RA (SpO2: ${spo2}%)`); alerts.push('HYPOXIA'); }
    else if (spo2 < 95) { findings.push(`Mild hypoxaemia (SpO2: ${spo2}%) — consider supplemental O2`); }
    else { findings.push(`Saturating well on RA (SpO2: ${spo2}%)`); }
  }

  return { findings, alerts };
}

// ── Generate Assessment Comments ─────────────────────────────────────────────
function generateAssessmentComments(vitals, context = {}) {
  const { findings, alerts } = assessVitals(vitals);
  if (!findings.length) return null;

  const { allergy_1, allergy_2, prev_illness_med, prev_illness_surg } = vitals;
  const allergies = [allergy_1, allergy_2].filter(Boolean);

  let text = `Patient assessed. Vital signs: ${findings.join('; ')}. `;

  if (alerts.includes('HTN_CRISIS')) text += 'PRIORITY: Hypertensive crisis — urgent antihypertensive intervention required. Monitor closely. ';
  if (alerts.includes('HYPOXIA')) text += 'PRIORITY: Supplemental oxygen initiated. Respiratory assessment ongoing. ';
  if (alerts.includes('HYPOTENSION')) text += 'PRIORITY: Hypotension noted — IV access secured, fluids considered per protocol. ';
  if (alerts.includes('FEVER')) text += 'Antipyretic administered per protocol. Sepsis workup considered. ';
  if (allergies.length) text += `Known allergies: ${allergies.join(', ')} — medications cross-checked. `;
  if (prev_illness_med) text += `PMH (Medical): ${prev_illness_med}. `;
  if (prev_illness_surg) text += `PMH (Surgical): ${prev_illness_surg}. `;
  text += 'Patient monitored closely. Will reassess per nursing protocol.';

  return text;
}

// ── Generate Progress Note ────────────────────────────────────────────────────
function generateProgressNote(vitals, medications, existingComments) {
  const { findings } = assessVitals(vitals);
  let note = '';
  if (findings.length) note += `Patient presents with: ${findings.join(', ')}. `;
  else note += 'Patient assessed. ';

  if (existingComments) note += `Assessment: ${existingComments} `;
  if (medications && medications.length) {
    const meds = medications.filter(m => m.name?.trim());
    if (meds.length) note += `Medications administered as per MAR: ${meds.map(m => `${m.name}${m.dose ? ' ' + m.dose : ''}${m.route ? ' ' + m.route : ''}`).join('; ')}. `;
  }
  note += 'Patient tolerating treatment. Observations ongoing. Will review and escalate if condition changes.';
  return note;
}

// ── Generate SBAR ─────────────────────────────────────────────────────────────
function generateSBAR({ identification, triage, progress_notes, medication_mar }) {
  const { findings, alerts } = assessVitals(triage);
  const name = `${identification.first_name || ''} ${identification.last_name || ''}`.trim() || 'Patient';
  const activeMeds = (medication_mar?.interventions || []).filter(m => m.name?.trim());
  const latestNote = [...(progress_notes || [])].reverse().find(n => n.note?.trim());
  const allergies = [triage.allergy_1, triage.allergy_2].filter(Boolean);

  const priorityFlag = alerts.length ? `⚠ ALERT: ${alerts.join(', ')} detected. ` : '';

  const s = `SITUATION:\n${priorityFlag}${name} (${identification.gender || 'Unknown gender'}, DOB: ${identification.dob || 'N/A'}) is currently under nursing observation. ` +
    (findings.length ? `Current vitals: ${findings.join('; ')}.` : 'Vitals pending.');

  const b = `\n\nBACKGROUND:\nPatient ID: ${identification.pid || 'N/A'}. ` +
    (allergies.length ? `Known allergies: ${allergies.join(', ')}. ` : 'No known allergies documented. ') +
    (triage.prev_illness_med ? `Medical history: ${triage.prev_illness_med}. ` : '') +
    (triage.prev_illness_surg ? `Surgical history: ${triage.prev_illness_surg}. ` : '') +
    (triage.weight ? `Weight: ${triage.weight}kg. ` : '') +
    (identification.insurance ? `Insurance: ${identification.insurance}.` : '');

  const a = `\n\nASSESSMENT:\n` +
    (triage.general_comments ? `${triage.general_comments} ` : 'Clinical assessment in progress. ') +
    (latestNote ? `Latest clinical note: "${latestNote.note}". ` : '') +
    (activeMeds.length ? `Active medications (${activeMeds.length}): ${activeMeds.map(m => `${m.name} ${m.dose || ''} ${m.route || ''} ${m.frequency || ''}`).join('; ')}.` : 'No active medications recorded in MAR.');

  const r = `\n\nRECOMMENDATION:\n` +
    (alerts.includes('HTN_CRISIS') ? 'URGENT: Escalate to physician for hypertensive crisis management. ' : '') +
    (alerts.includes('HYPOXIA') ? 'URGENT: Ensure O2 therapy and escalate to physician. ' : '') +
    (alerts.includes('HYPOTENSION') ? 'URGENT: IV fluid resuscitation and physician review. ' : '') +
    (activeMeds.length ? `Continue current MAR. ` : '') +
    'Monitor vitals Q1-4H as per acuity. Document all changes. Escalate if deterioration noted.';

  return s + b + a + r;
  return s + b + a + r;
}

// ── Generate Special Instructions / Dispense ───────────────────────────────────
function generateInstructions(medications) {
  return medications.map((med, index) => {
    if (!med.name) return { index, instructions: '' };
    
    let instructions = '';
    const found = lookupMedication(med.name);
    
    if (found && found.notes) {
      instructions += found.notes + ' ';
    } else {
      // General heuristic
      const n = med.name.toLowerCase();
      if (n.includes('syrup') || n.includes('susp')) instructions += 'Shake well before use. ';
      else if (n.includes('cream') || n.includes('ointment')) instructions += 'Apply thinly to affected area. For external use only. ';
      else if (n.includes('drop') && (n.includes('eye') || n.includes('ear'))) instructions += 'Discard 28 days after opening. ';
    }

    // Try to calculate dispense quantity
    if (med.frequency && med.duration) {
      const f = med.frequency.toUpperCase();
      const d = med.duration.toLowerCase();
      
      let timesPerDay = 1;
      if (f.includes('BD') || f.includes('BID')) timesPerDay = 2;
      else if (f.includes('TDS') || f.includes('TID')) timesPerDay = 3;
      else if (f.includes('QID') || f.includes('QDS')) timesPerDay = 4;
      else if (f.includes('Q4H')) timesPerDay = 6;
      else if (f.includes('Q6H')) timesPerDay = 4;
      else if (f.includes('Q8H')) timesPerDay = 3;
      
      let days = 0;
      const dayMatch = d.match(/(\d+)\s*day/);
      if (dayMatch) days = parseInt(dayMatch[1]);
      else if (d.includes('1 month')) days = 30;
      else if (d.includes('3 month')) days = 90;
      
      if (days > 0 && timesPerDay > 0) {
        // Only append dispense if it's likely a tablet/capsule (PO route)
        const route = (med.route || '').toUpperCase();
        if (route.includes('PO') && !med.name.toLowerCase().includes('syrup') && !med.name.toLowerCase().includes('susp')) {
          const total = timesPerDay * days;
          instructions += `Dispense ${total} tabs/caps.`;
        }
      }
    }

    return { index, instructions: instructions.trim() };
  });
}

// ── Rich ICD-11 Diagnosis Details Database ────────────────────────────────────
const ICD11_DETAILS_DB = {
  "1F45": {
    category: "Infectious Diseases / Parasitic",
    symptoms: "Fever, chills, sweat, headache, muscle pain, fatigue.",
    guidelines: "Confirm with rapid diagnostic test (RDT) or microscopy. Prescribe Artemether-lumefantrine (Coartem) per protocol. Monitor for severe features."
  },
  "1F4Z": {
    category: "Infectious Diseases / Parasitic",
    symptoms: "Fever, rigors, headache, splenomegaly.",
    guidelines: "Determine species if possible. Administer antimalarials. Monitor hydration and blood sugar levels."
  },
  "1A00": {
    category: "Infectious Diseases / Bacterial Intestinal",
    symptoms: "Profuse watery diarrhea ('rice-water stool'), vomiting, rapid dehydration, muscle cramps.",
    guidelines: "Immediate rehydration is critical. Administer ORS for mild/moderate cases, Ringer's Lactate IV for severe dehydration. Antibiotics (e.g. Azithromycin) only in severe cases."
  },
  "1A07.Z": {
    category: "Infectious Diseases / Bacterial",
    symptoms: "Prolonged high fever, abdominal discomfort, headache, rose spots, constipation or diarrhea.",
    guidelines: "Prescribe Ceftriaxone or Ciprofloxacin. Monitor for complications such as intestinal perforation or hemorrhage. Advise hygiene and handwashing."
  },
  "BA00.Z": {
    category: "Cardiovascular Diseases / Vascular",
    symptoms: "Often asymptomatic ('silent killer'), headache, shortness of breath, dizziness.",
    guidelines: "Confirm with multiple readings. Initiate lifestyle modifications (low salt, exercise). Prescribe antihypertensives (e.g. Amlodipine, Enalapril) as per protocol."
  },
  "BA03": {
    category: "Cardiovascular Diseases / Vascular",
    symptoms: "Severe headache, chest pain, dyspnea, neurological deficits, systolic BP >= 180 mmHg or diastolic BP >= 120 mmHg.",
    guidelines: "Medical emergency. Securing IV access. Gradual reduction of BP using intravenous agents (e.g. Hydralazine). Monitor vital signs Q15M."
  },
  "5A14": {
    category: "Endocrine, Nutritional or Metabolic Diseases / Diabetes",
    symptoms: "Polyuria, polydipsia, polyphagia, unexplained weight loss, fatigue, blurry vision.",
    guidelines: "Check HbA1c and fasting blood glucose. Initiate lifestyle and dietary counselling. Initiate oral hypoglycemics (Metformin) or insulin as indicated."
  },
  "5A11": {
    category: "Endocrine, Nutritional or Metabolic Diseases / Diabetes",
    symptoms: "Gradual onset, polyuria, polydipsia, fatigue, recurrent infections.",
    guidelines: "First line: Metformin + lifestyle adjustments. Regular diabetic foot screening. Monitor renal function (eGFR, microalbuminuria)."
  },
  "5A10": {
    category: "Endocrine, Nutritional or Metabolic Diseases / Diabetes",
    symptoms: "Acute onset, polyuria, polydipsia, weight loss, diabetic ketoacidosis (DKA) risk.",
    guidelines: "Requires lifelong insulin therapy. Education on carbohydrate counting and insulin administration. Check blood glucose before meals and bedtime."
  },
  "1E32": {
    category: "Respiratory Diseases / Viral Infection",
    symptoms: "Sudden onset of fever, cough, sore throat, runny nose, body aches, fatigue.",
    guidelines: "Symptomatic care: Rest, hydration, paracetamol for fever. Antivirals (Oseltamivir) for high-risk patients if initiated within 48 hours."
  },
  "CA20.Z": {
    category: "Respiratory Diseases / Bronchial",
    symptoms: "Cough (productive or non-productive), wheezing, low fever, chest tightness.",
    guidelines: "Hydration, bronchodilators (e.g. Salbutamol) if wheezing. Avoid routine antibiotics unless bacterial infection is suspected."
  },
  "1A40.0": {
    category: "Gastrointestinal Diseases / Intestinal Infection",
    symptoms: "Nausea, vomiting, watery diarrhea, abdominal cramps, low-grade fever.",
    guidelines: "Prevent dehydration. Administer ORS. Zinc supplementation for children. Advise bland diet and avoidance of dairy/fatty foods."
  },
  "DB10.Z": {
    category: "Gastrointestinal Diseases / Acute Surgical",
    symptoms: "Periumbilical pain migrating to the right lower quadrant (McBurney's point), fever, anorexia, nausea, vomiting.",
    guidelines: "Keep patient NPO (Nil Per Os). Urgent surgical consult for appendectomy. Secure IV access and administer IV fluids. Avoid laxatives or heat applications."
  },
  "JA80.Z": {
    category: "Obstetrics / Pregnancy Care",
    symptoms: "Multiple gestational sacs on ultrasound, rapid uterine growth, severe morning sickness.",
    guidelines: "High-risk pregnancy. Increase frequency of antenatal visits. Monitor blood pressure, urine protein, and fetal growth closely. Ensure adequate iron and folic acid intake."
  },
  "3A9Z": {
    category: "Diseases of the Blood / Anemia",
    symptoms: "Fatigue, pallor (conjunctival, palmar), weakness, shortness of breath, dizziness.",
    guidelines: "Order complete blood count (CBC) and ferritin levels. Prescribe Ferrous Sulphate or iron supplements. Dietary counseling on iron-rich foods."
  },
  "CA40.Z": {
    category: "Respiratory Diseases / Lung Infection",
    symptoms: "Cough with sputum, fever, shaking chills, shortness of breath, sharp chest pain on deep breathing.",
    guidelines: "Empiric antibiotics (e.g. Amoxicillin or Ceftriaxone). Assess oxygen saturation (SpO2); administer supplemental O2 if SpO2 < 92%. Monitor respiratory rate."
  },
  "CA23": {
    category: "Respiratory Diseases / Chronic Airway",
    symptoms: "Wheezing, shortness of breath, chest tightness, coughing, symptoms worse at night/early morning.",
    guidelines: "Assess severity. Administer inhaled short-acting beta-agonists (Salbutamol). Add inhaled corticosteroids (ICS) for maintenance. Provide an asthma action plan."
  },
  "8A80.Z": {
    category: "Neurological Diseases / Headache",
    symptoms: "Unilateral, throbbing headache, duration 4-72 hours, nausea, vomiting, photophobia/phonophobia.",
    guidelines: "Prescribe NSAIDs (Ibuprofen) or triptans. Advise patient to rest in a dark, quiet room. Identify and avoid triggers (stress, certain foods)."
  },
  "CA03.Z": {
    category: "Diseases of the Ear, Nose or Throat / Tonsils",
    symptoms: "Sore throat, pain on swallowing, fever, red swollen tonsils, cervical lymphadenopathy.",
    guidelines: "Differentiate between viral and bacterial (Centor criteria). Prescribe Amoxicillin if bacterial. Symptomatic care: warm fluids, throat lozenges, paracetamol."
  },
  "1D2Z": {
    category: "Infectious Diseases / Viral Vector-Borne",
    symptoms: "Sudden high fever, severe headache ('breakbone fever'), retro-orbital pain, muscle/joint pain, rash.",
    guidelines: "Symptomatic treatment with Paracetamol. Avoid NSAIDs (Ibuprofen, Aspirin) due to bleeding risk. Monitor hematocrit and platelet count for signs of severe dengue."
  },
  "RA01": {
    category: "Infectious Diseases / Viral Respiratory",
    symptoms: "Fever, cough, fatigue, shortness of breath, loss of taste or smell, sore throat.",
    guidelines: "Follow local isolation guidelines. Monitor oxygen saturation. Supportive care: rest, hydration, antipyretics. Escalate if respiratory distress develops."
  },
  "GC08.Z": {
    category: "Genitourinary Diseases / Urinary tract",
    symptoms: "Dysuria (burning on urination), frequency, urgency, suprapubic pain, cloudy/foul-smelling urine.",
    guidelines: "Perform urine dipstick or urinalysis. Prescribe antibiotics (e.g. Nitrofurantoin, Ciprofloxacin). Encourage high oral fluid intake."
  },
  "1B1Z": {
    category: "Infectious Diseases / Mycobacterial",
    symptoms: "Chronic cough (>2 weeks), hemoptysis (coughing blood), night sweats, unexplained weight loss, fever.",
    guidelines: "Collect sputum for GeneXpert or AFB smear. Initiate standard 4-drug anti-TB regimen (RHZE) under DOTS supervision. Screen close contacts."
  }
};

/**
 * Retrieve all unique cached/seeded ICD-11 codes.
 */
async function getAllCachedICD11() {
  try {
    const res = await db.query('SELECT results FROM icd11_cache');
    const codesMap = new Map();
    if (res && res.rows) {
      for (const row of res.rows) {
        try {
          const list = JSON.parse(row.results);
          for (const item of list) {
            if (item.code && item.desc) {
              codesMap.set(item.code.toUpperCase().trim(), item.desc.trim());
            }
          }
        } catch (_) {}
      }
    }
    const list = Array.from(codesMap.entries()).map(([code, desc]) => ({ code, desc }));
    list.sort((a, b) => a.code.localeCompare(b.code));
    return list;
  } catch (err) {
    console.error('Failed to fetch cached ICD11 codes:', err);
    return [];
  }
}

/**
 * Resolve details of a specific ICD-11 code.
 */
async function lookupICD11CodeDetails(code) {
  if (!code) return null;
  const cleanCode = code.toUpperCase().trim();

  // 1. Search in our static database for high-quality rich details
  let matchedDetails = null;
  const detailKey = Object.keys(ICD11_DETAILS_DB).find(k => cleanCode.startsWith(k) || k.startsWith(cleanCode));
  if (detailKey) {
    matchedDetails = ICD11_DETAILS_DB[detailKey];
  }

  // 2. Fetch the description from local cache / live API search
  let desc = 'Unknown Diagnosis';
  let definition = null;
  let source = 'Local System';

  try {
    const res = await db.query('SELECT results FROM icd11_cache WHERE results LIKE $1', [`%${cleanCode}%`]);
    if (res && res.rows.length > 0) {
      for (const row of res.rows) {
        const parsed = JSON.parse(row.results);
        const match = parsed.find(item => item.code.toUpperCase() === cleanCode);
        if (match) {
          desc = match.desc;
          source = 'Local Cache';
          break;
        }
      }
    }
  } catch (err) {
    console.error('Error searching local cache by code:', err.message);
  }

  // Try live WHO API if it is configured
  try {
    const token = await getICD11Token();
    const liveDetails = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'id.who.int',
        path:     `/icd/release/11/2024-01/mms/codeinfo/${cleanCode}`,
        method:   'GET',
        headers:  {
          Authorization:          `Bearer ${token}`,
          Accept:                 'application/json',
          'Accept-Language':      'en',
          'API-Version':          'v2',
        },
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              return reject(new Error(`WHO API returned status ${res.statusCode}`));
            }
            const json = JSON.parse(raw);
            resolve({
              desc: json.title?.['@value'] || json.title || desc,
              definition: json.definition?.['@value'] || null,
              source: 'WHO Live API'
            });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('timeout', () => { req.destroy(); reject(new Error('WHO API timeout')); });
      req.on('error', reject);
      req.end();
    });

    if (liveDetails) {
      desc = liveDetails.desc;
      definition = liveDetails.definition;
      source = liveDetails.source;
    }
  } catch (err) {
    // Ignore and use local/cache details
  }

  const details = matchedDetails || {
    category: "General Clinical Diagnosis",
    symptoms: "Presents per patient's clinical chief complaint.",
    guidelines: "Consult standard clinical guidelines for this classification. Review patient history and observations."
  };

  return {
    code: cleanCode,
    desc,
    definition,
    category: details.category,
    symptoms: details.symptoms,
    guidelines: details.guidelines,
    source
  };
}

module.exports = { 
  suggestMedications, 
  generateAssessmentComments, 
  generateProgressNote, 
  generateSBAR, 
  generateInstructions, 
  suggestICD10, 
  suggestICD11, 
  getICD11Token, 
  getAllCachedICD11,
  lookupICD11CodeDetails,
  FREQUENCY_LEGEND, 
  DRUG_DB 
};
