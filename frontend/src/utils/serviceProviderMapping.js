/**
 * Utilities for mapping clinical services to provider specializations
 */

// Service code/name keywords mapped to provider specialization keywords
const SERVICE_SPECIALIZATION_MAP = {
  GP: ['general practitioner', 'family physician', 'gp', 'general medicine'],
  Gyno: ['obstetrician', 'gynaecologist', 'gynecology', 'obsgyn', 'gyn'],
  Cardio: ['cardiologist', 'cardiology', 'cardio'],
  Dental: ['dental surgeon', 'dentistry', 'orthodontist', 'dental'],
  Imaging: ['radiologist', 'radiology', 'sonographer', 'imaging'],
  'Internal Medicine': ['internist', 'internal medicine', 'hematologist'],
  ENT: ['ent', 'ear, nose', 'otolaryngolog'],
  Orthopedy: ['orthopedic surgeon', 'orthopedics', 'orthopedy'],
  Pediatrics: ['pediatrician', 'pediatrics', 'peds'],
  Physio: ['physio', 'physiotherap', 'rehabilitation'],
  Chiropractic: ['chiropract', 'chiropractic', 'chiropractitioner'],
  Dermatology: ['dermatologist', 'dermatology'],
  Ophthalmology: ['ophthalmology', 'eye clinic', 'ophthalmologist'],
  'General Surgery': ['general surgeon', 'surgery', 'surgical'],
  Neurology: ['neurologist', 'neurology', 'neurosurgery'],
  Urology: ['urologist', 'urology'],
  Gastroenterology: ['gastroenterologist', 'gastroenterology'],
  Psychology: ['clinical psychologist', 'psychologist', 'psychiatrist', 'mental health'],
  Nutrition: ['nutritionist', 'dietitian', 'nutrition'],
  Oncology: ['oncologist', 'oncology'],
  Laboratory: ['pathologist', 'laboratory', 'scientist', 'lab'],
  Pharmacy: ['pharmacist', 'pharmacy'],
  Nursing: ['nurse', 'midwife', 'nursing']
};

/**
 * Filter or split providers based on selected clinical service
 */
export function getGroupedProvidersForService(serviceName, providers = []) {
  if (!serviceName || !providers.length) {
    return {
      matching: providers,
      others: [],
      hasFilter: false
    };
  }

  const normalizedService = serviceName.trim().toLowerCase();
  
  // Find key in SERVICE_SPECIALIZATION_MAP
  let targetKeywords = [];
  for (const [key, keywords] of Object.entries(SERVICE_SPECIALIZATION_MAP)) {
    if (key.toLowerCase() === normalizedService || normalizedService.includes(key.toLowerCase())) {
      targetKeywords = keywords;
      break;
    }
  }

  if (!targetKeywords.length) {
    // Fallback: match by service text itself
    targetKeywords = [normalizedService];
  }

  const matching = [];
  const others = [];

  for (const prov of providers) {
    const spec = (prov.specialization_name || prov.specialization || '').toLowerCase();
    const title = (prov.title || '').toLowerCase();
    const name = (prov.name || '').toLowerCase();

    const isMatch = targetKeywords.some(kw => 
      spec.includes(kw) || title.includes(kw) || name.includes(kw)
    );

    if (isMatch) {
      matching.push(prov);
    } else {
      others.push(prov);
    }
  }

  return {
    matching,
    others,
    hasFilter: matching.length > 0
  };
}

/**
 * Given a provider object, deduce the best matching service value
 */
export function guessServiceFromProvider(provider) {
  if (!provider) return null;
  const spec = (provider.specialization_name || provider.specialization || '').toLowerCase();
  
  for (const [serviceKey, keywords] of Object.entries(SERVICE_SPECIALIZATION_MAP)) {
    if (keywords.some(kw => spec.includes(kw))) {
      return serviceKey;
    }
  }
  return null;
}

/**
 * Format provider name cleanly without duplicating titles like "Dr DR ..." or "Dr Dr ..."
 */
export function formatProviderFullName(provider) {
  if (!provider) return '';
  let name = typeof provider === 'string' ? provider.trim() : (provider.name || '').trim();
  const title = (provider && typeof provider === 'object' && provider.title) ? provider.title.trim() : '';

  // Clean any duplicated titles in the string, e.g. "Dr DR ...", "Dr Dr ...", "Miss Miss ..."
  name = name.replace(/^(dr\.?|doctor|prof\.?|professor|mr\.?|mrs\.?|ms\.?|miss\.?)\s+(dr\.?|doctor|prof\.?|professor|mr\.?|mrs\.?|ms\.?|miss\.?)\s+/i, (match, p1) => `${p1} `);

  // Check if name already starts with a title (Dr, Dr., Doctor, Prof, Mr, Mrs, Ms, Miss, etc.)
  const alreadyHasTitle = /^(dr\.?|doctor|prof\.?|professor|mr\.?|mrs\.?|ms\.?|miss\.?)\b/i.test(name);
  if (!alreadyHasTitle && title) {
    return `${title} ${name}`;
  }
  return name;
}

/**
 * Format provider for dropdown options with specialization suffix
 */
export function formatProviderOptionLabel(provider) {
  if (!provider) return '';
  const fullName = formatProviderFullName(provider);
  const spec = (provider.specialization_name || provider.specialization || '').trim();
  return spec ? `${fullName} — ${spec}` : fullName;
}
