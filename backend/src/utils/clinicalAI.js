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

// ── ICD-10 Knowledge Base (Privacy-focused) ──────────────────────────────────
const ICD10_DB = [
  { code: 'A00.0', desc: 'Cholera due to Vibrio cholerae 01, biovar cholerae', keywords: ['cholera'] },
  { code: 'A01.00', desc: 'Typhoid fever, unspecified', keywords: ['typhoid', 'enteric fever'] },
  { code: 'A03.9', desc: 'Shigellosis, unspecified', keywords: ['shigellosis', 'dysentery'] },
  { code: 'A06.0', desc: 'Acute amebic dysentery', keywords: ['amebic', 'dysentery'] },
  { code: 'A09', desc: 'Infectious gastroenteritis and colitis, unspecified', keywords: ['gastroenteritis', 'diarrhea', 'food poisoning'] },
  { code: 'A15.0', desc: 'Tuberculosis of lung', keywords: ['tuberculosis', 'tb', 'lung'] },
  { code: 'A30.9', desc: 'Leprosy, unspecified', keywords: ['leprosy', 'hansen'] },
  { code: 'A33', desc: 'Tetanus neonatorum', keywords: ['tetanus', 'neonatal'] },
  { code: 'A34', desc: 'Obstetrical tetanus', keywords: ['tetanus', 'obstetrical', 'maternal'] },
  { code: 'A35', desc: 'Other tetanus', keywords: ['tetanus', 'lockjaw'] },
  { code: 'A39.9', desc: 'Meningococcal infection, unspecified', keywords: ['meningitis', 'meningococcal'] },
  { code: 'A75.9', desc: 'Typhus fever, unspecified', keywords: ['typhus'] },
  { code: 'A82.9', desc: 'Rabies, unspecified', keywords: ['rabies', 'hydrophobia'] },
  { code: 'A90', desc: 'Dengue fever [classical dengue]', keywords: ['dengue', 'breakbone'] },
  { code: 'A91', desc: 'Dengue hemorrhagic fever', keywords: ['dengue', 'dengue hemorrhagic', 'dhf'] },
  { code: 'A92.0', desc: 'Chikungunya virus disease', keywords: ['chikungunya'] },
  { code: 'A95.9', desc: 'Yellow fever, unspecified', keywords: ['yellow fever'] },
  { code: 'A97.0', desc: 'Dengue without warning signs', keywords: ['dengue'] },
  { code: 'A97.1', desc: 'Dengue with warning signs', keywords: ['dengue'] },
  { code: 'A97.2', desc: 'Severe Dengue', keywords: ['dengue', 'severe'] },
  { code: 'B01.9', desc: 'Varicella without complication', keywords: ['chickenpox', 'varicella'] },
  { code: 'B05.9', desc: 'Measles without complication', keywords: ['measles', 'rubeola'] },
  { code: 'B06.9', desc: 'Rubella without complication', keywords: ['rubella', 'german measles'] },
  { code: 'B15.9', desc: 'Hepatitis A without hepatic coma', keywords: ['hepatitis a', 'hep a'] },
  { code: 'B16.9', desc: 'Acute hepatitis B without delta-agent and without hepatic coma', keywords: ['hepatitis b', 'hep b'] },
  { code: 'B17.10', desc: 'Acute hepatitis C without hepatic coma', keywords: ['hepatitis c', 'hep c'] },
  { code: 'B18.2', desc: 'Chronic viral hepatitis C', keywords: ['hepatitis c', 'hep c'] },
  { code: 'B20', desc: 'Human immunodeficiency virus [HIV] disease', keywords: ['hiv', 'aids', 'immunodeficiency'] },
  { code: 'B24', desc: 'Unspecified human immunodeficiency virus [HIV] disease', keywords: ['hiv', 'positive', 'immunosuppressed'] },
  { code: 'B50.9', desc: 'Plasmodium falciparum malaria, unspecified', keywords: ['malaria', 'falciparum', 'pf'] },
  { code: 'B51.9', desc: 'Plasmodium vivax malaria without complication', keywords: ['malaria', 'vivax', 'pv'] },
  { code: 'B52.9', desc: 'Plasmodium malariae malaria without complication', keywords: ['malaria', 'pm'] },
  { code: 'B53.0', desc: 'Plasmodium ovale malaria', keywords: ['malaria', 'ovale', 'po'] },
  { code: 'B54', desc: 'Unspecified malaria', keywords: ['malaria', 'fever'] },
  { code: 'B58.9', desc: 'Toxoplasmosis, unspecified', keywords: ['toxoplasmosis', 'toxo'] },
  { code: 'B65.9', desc: 'Schistosomiasis, unspecified', keywords: ['schistosomiasis', 'bilharzia'] },
  { code: 'B73.00', desc: 'Onchocerciasis, unspecified', keywords: ['onchocerciasis', 'river blindness'] },
  { code: 'B74.9', desc: 'Filariasis, unspecified', keywords: ['filariasis', 'elephantiasis'] },
  { code: 'B76.9', desc: 'Hookworm disease, unspecified', keywords: ['hookworm', 'ancylostomiasis'] },
  { code: 'B77.9', desc: 'Ascariasis, unspecified', keywords: ['ascariasis', 'roundworm'] },
  { code: 'B78.9', desc: 'Strongyloidiasis, unspecified', keywords: ['strongyloidiasis', 'threadworm'] },
  { code: 'B79', desc: 'Trichuriasis', keywords: ['trichuriasis', 'whipworm'] },
  { code: 'B80', desc: 'Enterobiasis', keywords: ['enterobiasis', 'pinworm'] },
  { code: 'E11.9', desc: 'Type 2 diabetes mellitus without complications', keywords: ['diabetes', 'sugar', 'dm2', 't2dm'] },
  { code: 'E46', desc: 'Unspecified protein-calorie malnutrition', keywords: ['malnutrition', 'kwashiorkor', 'marasmus'] },
  { code: 'E86.0', desc: 'Dehydration', keywords: ['dehydration', 'hypovolemia'] },
  { code: 'I10', desc: 'Essential (primary) hypertension', keywords: ['hypertension', 'blood pressure', 'htn', 'hbp'] },
  { code: 'J02.9', desc: 'Acute pharyngitis, unspecified', keywords: ['sore throat', 'pharyngitis', 'throat pain'] },
  { code: 'J03.9', desc: 'Acute tonsillitis, unspecified', keywords: ['tonsillitis', 'tonsils'] },
  { code: 'J06.9', desc: 'Acute upper respiratory infection, unspecified', keywords: ['cold', 'flu', 'urti', 'cough', 'sniffles'] },
  { code: 'J09.X2', desc: 'Influenza due to identified novel influenza A virus', keywords: ['flu', 'influenza', 'h1n1'] },
  { code: 'J10.1', desc: 'Influenza due to other identified influenza virus with other respiratory manifestations', keywords: ['flu', 'influenza'] },
  { code: 'J11.1', desc: 'Influenza due to unidentified influenza virus with other respiratory manifestations', keywords: ['flu', 'influenza'] },
  { code: 'J18.9', desc: 'Pneumonia, unspecified organism', keywords: ['pneumonia', 'chest infection', 'lrti'] },
  { code: 'J20.9', desc: 'Acute bronchitis, unspecified', keywords: ['bronchitis'] },
  { code: 'J44.9', desc: 'Chronic obstructive pulmonary disease, unspecified', keywords: ['copd', 'emphysema', 'chronic bronchitis'] },
  { code: 'J45.909', desc: 'Unspecified asthma, uncomplicated', keywords: ['asthma', 'wheezing', 'sob', 'shortness of breath'] },
  { code: 'K21.9', desc: 'Gastro-esophageal reflux disease without esophagitis', keywords: ['gerd', 'heartburn', 'acid reflux', 'indigestion'] },
  { code: 'K29.70', desc: 'Gastritis, unspecified, without bleeding', keywords: ['gastritis', 'stomach pain', 'ulcer', 'epigastric'] },
  { code: 'K35.80', desc: 'Unspecified acute appendicitis', keywords: ['appendicitis'] },
  { code: 'L02.91', desc: 'Cutaneous abscess, unspecified', keywords: ['abscess', 'boil'] },
  { code: 'L03.90', desc: 'Cellulitis, unspecified', keywords: ['cellulitis'] },
  { code: 'M54.5', desc: 'Low back pain', keywords: ['back pain', 'lumbago', 'sciatica', 'backache'] },
  { code: 'N39.0', desc: 'Urinary tract infection, site not specified', keywords: ['uti', 'urinary', 'dysuria', 'burning urine'] },
  { code: 'O03.9', desc: 'Spontaneous abortion, unspecified', keywords: ['abortion', 'miscarriage'] },
  { code: 'O04.9', desc: 'Complications following (induced) termination of pregnancy', keywords: ['abortion', 'top', 'miscarriage', 'bleeding'] },
  { code: 'O09.90', desc: 'Supervision of high risk pregnancy', keywords: ['pregnancy', 'antenatal', 'anc', 'gravida'] },
  { code: 'O80', desc: 'Encounter for full-term uncomplicated delivery', keywords: ['delivery', 'labor', 'childbirth'] },
  { code: 'R05', desc: 'Cough', keywords: ['cough', 'hacking', 'dry cough'] },
  { code: 'R07.9', desc: 'Chest pain, unspecified', keywords: ['chest pain', 'angina', 'heart pain'] },
  { code: 'R50.9', desc: 'Fever, unspecified', keywords: ['fever', 'temperature', 'hot', 'pyrexia'] },
  { code: 'R51', desc: 'Headache', keywords: ['headache', 'migraine', 'head pain'] },
  { code: 'T14.90', desc: 'Injury, unspecified', keywords: ['injury', 'trauma', 'wound'] },
  { code: 'Z00.00', desc: 'Encounter for general adult medical examination', keywords: ['checkup', 'routine', 'medical', 'physical'] },
  { code: 'Z11.3', desc: 'Encounter for screening for infections with a predominantly sexual mode of transmission', keywords: ['std screening', 'sti test', 'sexual health'] }
];

function suggestICD10(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  
  // Scoring algorithm
  const results = ICD10_DB.map(item => {
    let score = 0;
    if (item.code.toLowerCase() === q) score += 100;
    else if (item.code.toLowerCase().includes(q)) score += 50;
    
    if (item.desc.toLowerCase().includes(q)) score += 30;
    
    item.keywords.forEach(kw => {
      if (kw === q) score += 40;
      else if (kw.includes(q) || q.includes(kw)) score += 20;
    });
    
    return { ...item, score };
  });

  // Filter and sort by highest score
  const matches = results.filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  return matches.slice(0, 10).map(m => ({ code: m.code, desc: m.desc }));
}

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
}

module.exports = { suggestMedications, generateAssessmentComments, generateProgressNote, generateSBAR, suggestICD10, FREQUENCY_LEGEND, DRUG_DB, ICD10_DB };
