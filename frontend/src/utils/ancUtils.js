// ── ANC & Midwifery Statutory Indicators & Clinical Utilities (MoH Rwanda HMIS) ──

export const INDICATOR_COLUMNS = [
  { key: 'ind_1_new_reg', num: 1, label: 'ANC New Reg', desc: 'ANC New Registration in the health facility' },
  { key: 'ind_2_under_15', num: 2, label: '< 15 yrs', desc: 'Pregnant woman under 15 years old' },
  { key: 'ind_3_15_19', num: 3, label: '15-19 yrs', desc: 'Pregnant woman aged 15 to 19 years (Adolescent)' },
  { key: 'ind_4_20_24', num: 4, label: '20-24 yrs', desc: 'Pregnant woman aged 20 to 24 years' },
  { key: 'ind_5_25_plus', num: 5, label: '≥ 25 yrs', desc: 'Pregnant woman aged 25 years or older' },
  { key: 'ind_6_first_trim', num: 6, label: '1st Trim (≤12w)', desc: '1st standard visit completed in 1st trimester (≤12 weeks)' },
  { key: 'ind_7_with_partner', num: 7, label: 'With Partner', desc: '1st standard visit accompanied by male partner' },
  { key: 'ind_8_four_visits', num: 8, label: '4 Standard Visits', desc: '4 standard ANC visits completed before delivery' },
  { key: 'ind_9_high_risk_detected', num: 9, label: 'High Risk Det.', desc: 'High risk pregnancy detected during consultation' },
  { key: 'ind_10_high_risk_referred', num: 10, label: 'High Risk Ref.', desc: 'High risk pregnancy referred to higher level / specialist' },
  { key: 'ind_11_tt1', num: 11, label: 'TT 1', desc: 'Tetanus Toxoid / Td dose 1 administered' },
  { key: 'ind_12_tt2_to_5', num: 12, label: 'TT 2-5', desc: 'Tetanus Toxoid / Td doses 2 through 5 administered' },
  { key: 'ind_13_tt_protected', num: 13, label: 'TT Protected', desc: 'Newborn fully protected against neonatal tetanus at birth' },
  { key: 'ind_14_iron_folic', num: 14, label: 'Iron + Folate', desc: 'Iron and Folic Acid supplements provided / prescribed' },
  { key: 'ind_15_severe_anaemia', num: 15, label: 'Sev. Anaemia (<7)', desc: 'Severe anaemia detected (Hb < 7 g/dL)' },
  { key: 'ind_16_syphilis_tested', num: 16, label: 'Syph. Tested', desc: 'Tested for Syphilis (RPR / Rapid Treponemal test)' },
  { key: 'ind_17_syphilis_positive', num: 17, label: 'Syph. Positive', desc: 'Syphilis test confirmed positive' },
  { key: 'ind_18_syphilis_treated', num: 18, label: 'Syph. Treated', desc: 'Syphilis positive treated according to MoH guidelines' },
  { key: 'ind_19_hiv_tested', num: 19, label: 'HIV Tested', desc: 'Tested for HIV during ANC consultation' },
  { key: 'ind_20_hiv_positive', num: 20, label: 'HIV Positive', desc: 'HIV test confirmed positive' },
  { key: 'ind_21_hiv_result_received', num: 21, label: 'HIV Res. Recv.', desc: 'HIV positive patient received post-test counselling & results' },
  { key: 'ind_22_hiv_arv_started', num: 22, label: 'ARVs (PMTCT)', desc: 'HIV positive patient initiated or continued on ARVs for PMTCT' },
  { key: 'ind_23_partner_hiv_tested', num: 23, label: 'Part. HIV Test', desc: 'Male partner tested for HIV' },
  { key: 'ind_24_partner_hiv_positive', num: 24, label: 'Part. HIV Pos.', desc: 'Male partner tested positive for HIV' },
  { key: 'ind_25_malaria_screened', num: 25, label: 'Malaria / LLIN', desc: 'Malaria screened / LLIN insecticide-treated net provided' },
  { key: 'ind_26_ultrasound_other', num: 26, label: 'Obst. Ultrasound', desc: 'Obstetric ultrasound performed / other danger signs' }
];

export const calculateAgeFromDob = (dobVal) => {
  if (!dobVal || typeof dobVal !== 'string') return '';
  const clean = dobVal.trim();
  if (!clean) return '';

  let birthDate = null;

  if (clean.includes('-')) {
    const parts = clean.split(/[-T ]/);
    if (parts[0]?.length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      birthDate = new Date(y, m, d);
    } else if (parts[2]?.length === 4) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      birthDate = new Date(y, m, d);
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[2]?.length === 4) {
        // DD/MM/YYYY
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        birthDate = new Date(y, m, d);
      } else if (parts[0]?.length === 4) {
        // YYYY/MM/DD
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        birthDate = new Date(y, m, d);
      }
    }
  }

  if (!birthDate || isNaN(birthDate.getTime())) {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) birthDate = parsed;
  }

  if (!birthDate || isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? String(age) : '';
};

export const formatDobForDateInput = (dobVal) => {
  if (!dobVal || typeof dobVal !== 'string') return '';
  const clean = dobVal.trim();
  if (clean.includes('-') && clean.split('-')[0].length === 4) {
    return clean.substring(0, 10);
  }
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[2]?.length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0]?.length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  return '';
};

// ── Statutory MoH Indicators Clinical Categorization ──
export const INDICATOR_CATEGORIES = [
  {
    id: 'booking',
    name: 'Booking & Visits Schedule',
    desc: 'Registration, 1st trimester early timing, partner accompaniment & completion',
    badge: 'Protocol',
    keys: ['ind_1_new_reg', 'ind_6_first_trim', 'ind_7_with_partner', 'ind_8_four_visits']
  },
  {
    id: 'age',
    name: 'Maternal Age Tier',
    desc: 'Auto-synchronized from Date of Birth / calculated Age',
    badge: 'Demographics',
    keys: ['ind_2_under_15', 'ind_3_15_19', 'ind_4_20_24', 'ind_5_25_plus']
  },
  {
    id: 'risk',
    name: 'High Risk & Severe Anaemia',
    desc: 'Critical risk identification, severe anaemia (<7 g/dL) & referral tracking',
    badge: 'Risk & Referral',
    isAlert: true,
    keys: ['ind_9_high_risk_detected', 'ind_10_high_risk_referred', 'ind_15_severe_anaemia']
  },
  {
    id: 'preventive',
    name: 'Immunization & Micronutrients',
    desc: 'Tetanus toxoid / Td doses, newborn protection, iron + folic acid & malaria LLIN',
    badge: 'Prophylaxis',
    keys: ['ind_11_tt1', 'ind_12_tt2_to_5', 'ind_13_tt_protected', 'ind_14_iron_folic', 'ind_25_malaria_screened']
  },
  {
    id: 'pmtct',
    name: 'Infectious Screening & PMTCT',
    desc: 'Maternal & partner testing for HIV & Syphilis, test results & ARV initiation',
    badge: 'HIV & STI',
    keys: [
      'ind_16_syphilis_tested', 'ind_17_syphilis_positive', 'ind_18_syphilis_treated',
      'ind_19_hiv_tested', 'ind_20_hiv_positive', 'ind_21_hiv_result_received',
      'ind_22_hiv_arv_started', 'ind_23_partner_hiv_tested', 'ind_24_partner_hiv_positive'
    ]
  },
  {
    id: 'ultrasound',
    name: 'Obstetric Ultrasound & Danger Signs',
    desc: 'Fetal viability imaging, presentation & active screening of obstetric danger signs',
    badge: 'Evaluation',
    keys: ['ind_26_ultrasound_other']
  }
];

export const QUICK_DANGER_SIGNS = [
  'Vaginal bleeding',
  'Severe headache / visual blur',
  'Decreased fetal movements',
  'Epigastric pain',
  'High fever / chills',
  'Sudden facial / hands oedema',
  'Preterm rupture of membranes (PROM)',
  'Severe vomiting / dehydration'
];

export const HIGH_RISK_INDICATOR_KEYS = [
  'ind_9_high_risk_detected',
  'ind_10_high_risk_referred',
  'ind_15_severe_anaemia',
  'ind_17_syphilis_positive',
  'ind_20_hiv_positive',
  'ind_24_partner_hiv_positive'
];

export const analyzeBloodPressure = (bp) => {
  if (!bp || typeof bp !== 'string') return null;
  const match = bp.match(/(\d{2,3})\s*[\/|\\]\s*(\d{2,3})/);
  if (!match) return null;
  const sys = parseInt(match[1], 10);
  const dia = parseInt(match[2], 10);
  if (isNaN(sys) || isNaN(dia)) return null;

  if (sys >= 140 || dia >= 90) {
    return {
      status: 'high',
      label: `High BP (${sys}/${dia} mmHg)`,
      desc: 'Hypertension alert. Check for Pre-eclampsia & Proteinuria',
      color: 'bg-amber-50 text-amber-900 border-amber-300'
    };
  }
  if (sys < 90 || dia < 60) {
    return {
      status: 'low',
      label: `Low BP (${sys}/${dia} mmHg)`,
      desc: 'Hypotension alert. Ensure hydration & monitor dizziness',
      color: 'bg-blue-50 text-blue-800 border-blue-200'
    };
  }
  return {
    status: 'normal',
    label: `Normal BP (${sys}/${dia} mmHg)`,
    desc: 'Normotensive blood pressure range',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  };
};

export const analyzeGestationalAge = (gaVal) => {
  if (!gaVal) return null;
  const weeks = parseFloat(gaVal);
  if (isNaN(weeks) || weeks <= 0) return null;

  if (weeks <= 12) {
    return {
      trimester: 'Trimester 1',
      targetMet: true,
      label: `Trimester 1 (${weeks}w) · Early Booking Target Met (≤12w)`,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300'
    };
  } else if (weeks <= 27) {
    return {
      trimester: 'Trimester 2',
      targetMet: false,
      label: `Trimester 2 (${weeks}w) · Mid-Gestation Routine Care`,
      badgeColor: 'bg-sky-50 text-sky-800 border-sky-300'
    };
  } else {
    return {
      trimester: 'Trimester 3',
      targetMet: false,
      label: `Trimester 3 (${weeks}w) · Late Gestation (Monitor Danger Signs)`,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300'
    };
  }
};
