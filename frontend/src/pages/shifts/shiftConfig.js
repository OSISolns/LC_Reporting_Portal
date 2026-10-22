// ─── Shift role definitions ──────────────────────────────────────────────────
export const SHIFT_ROLES = [
  { value: 'cashier', label: 'Cashier', icon: 'CreditCard' },
  { value: 'customer_care', label: 'Customer Care Officer', icon: 'PhoneCall' },
  { value: 'rama_rssb', label: 'RAMA/RSSB Billing Station', icon: 'FileSpreadsheet' },
  { value: 'helpdesk', label: 'Helpdesk', icon: 'Monitor' },
  { value: 'call_center', label: 'Call Center Agent', icon: 'Phone' },
  { value: 'nurse', label: 'Registered Nurse', icon: 'Stethoscope' },
  { value: 'rn_midwife', label: 'RN / Midwife', icon: 'Stethoscope' },
  { value: 'vip_lounge', label: 'VIP Lounge', icon: 'Crown' },
];

export const CASHIER_STATIONS = [
  {
    id: 'Ground-Floor',
    name: 'Ground-Floor',
    label: 'Ground-Floor',
    description: 'Ground Floor Main Cashier Counter',
    services: 'Billing',
    equipment: ['PC', 'MoMo Phone', 'Receipt Printer', 'Barcode Printer', 'Desk Phone', 'Paid Stamp']
  },
  {
    id: 'First-Floor',
    name: 'First-Floor',
    label: 'First-Floor',
    description: 'First Floor Specialist Clinic Cashier',
    services: 'Billing',
    equipment: ['PC', 'MoMo Phone', 'Receipt Printer', 'Barcode Printer', 'Desk Phone', 'Paid Stamp']
  },
  {
    id: 'Paediatrics',
    name: 'Paediatrics',
    label: 'Paediatrics',
    description: 'Paediatrics Ward',
    services: 'Billing',
    equipment: ['PC', 'MoMo Phone', 'Receipt Printer', 'Barcode Printer', 'Desk Phone']
  }
];

export const HELPDESK_STATIONS = [
  {
    id: 'Ground-Floor',
    name: 'Ground-Floor',
    label: 'Ground-Floor',
    description: 'Ground Floor Main Helpdesk / Triage Counter',
    services: 'Helpdesk & Reception',
    equipment: ['PC', 'Receipt Printer', 'Desk Phone', 'Waiting No. Stamp']
  },
  {
    id: 'First-Floor',
    name: 'First-Floor',
    label: 'First-Floor',
    description: 'First Floor Specialist Clinic Helpdesk',
    services: 'Helpdesk & Patient Guidance',
    equipment: ['PC', 'Receipt Printer', 'Desk Phone', 'Waiting No. Stamp']
  }
];

export const NURSING_WARDS = [
  {
    id: 'STATION_1',
    name: 'STATION 1',
    label: 'STATION 1 (Vital Signs & Orientation)',
    description: 'General vital signs check, triage & patient orientation',
    services: 'Vital Signs Check & Orientation',
    equipment: ['PC', 'BP Machine', 'Pulse Oximeter', 'Digital Thermometer', 'Stethoscope', 'Weight & Height Scale', 'Orientation Folder']
  },
  {
    id: 'STATION_2',
    name: 'STATION 2',
    label: 'STATION 2 (Cardiology)',
    description: 'Cardiology clinic — Vital signs, 12-Lead ECG, Treadmill Stress Test (TMT)',
    services: 'Cardiology Vitals, ECG, TMT',
    equipment: ['PC', '12-Lead ECG Machine', 'TMT Stress Test System', 'Cardiac Monitor', 'BP Machine', 'Pulse Oximeter', 'Stethoscope', 'Emergency Tray']
  },
  {
    id: 'MINOR_SURGERY',
    name: 'MINOR SURGERY',
    label: 'MINOR SURGERY',
    description: 'Minor surgical procedures, suturing & wound care',
    services: 'Minor Surgeries & Wound Dressing',
    equipment: ['PC', 'Minor Surgery Instrument Tray', 'Surgical Light', 'Autoclave Sterilizer', 'Electrocautery Unit', 'Antiseptic & Dressing Kit']
  },
  {
    id: 'PAEDIATRICS',
    name: 'PAEDIATRICS',
    label: 'PAEDIATRICS (Vitals & Vaccinations)',
    description: 'Paediatric vital signs, growth tracking, paediatric & adult vaccinations',
    services: 'Paediatric Vitals & Vaccinations (Minors & Adults)',
    equipment: ['PC', 'Paediatric Infrared Thermometer', 'Paediatric Pulse Oximeter', 'Paediatric BP Cuffs', 'Infant Length & Weight Scale', 'Vaccine Cold Storage / Refrigerator', 'Safety Needle Box']
  }
];

// ─── Equipment per role ──────────────────────────────────────────────────────
export const EQUIPMENT_BY_ROLE = {
  cashier: ['PC', 'MoMo Phone', 'Receipt Printer', 'Barcode Printer', 'Desk Phone'],
  customer_care: ['PC', 'Receipt Printer', 'Desk Phone', 'Waiting No. Stamp'],
  rama_rssb: ['PC', 'Receipt Printer', 'Barcode Printer', 'MoMo Phone', 'Desk Phone'],
  helpdesk: ['PC', 'Receipt Printer', 'Desk Phone', 'Waiting No. Stamp'],
  call_center: ['PC', 'Headset', 'Desk Phone'],
  nurse: ['PC', 'Thermometer', 'Stethoscope', 'BP Machine', 'Pulse Oximeter'],
  rn_midwife: ['PC', 'Thermometer', 'Stethoscope', 'BP Machine', 'Pulse Oximeter', 'Doppler / Foetal Stethoscope', 'Measuring Tape'],
  vip_lounge: ['PC', 'Desk Phone'],
};

export const EQUIPMENT_STATUS_OPTIONS = ['Working', 'Needs Repair', 'Broken', 'Missing'];

export const getItemStatusOptions = (itemName) => {
  if (itemName === 'Waiting No. Stamp' || itemName === 'Paid Stamp' || (itemName && itemName.toLowerCase().includes('stamp'))) {
    return ['Available', 'Missing'];
  }
  return EQUIPMENT_STATUS_OPTIONS;
};

export const getDefaultItemStatus = (itemName) => {
  return getItemStatusOptions(itemName)[0];
};

import { INSURANCES } from '../refunds/constants';

// ─── Insurance options (system canonical insurances) ─────────────────────────
export const INSURANCE_OPTIONS = INSURANCES;

// ─── Bank/terminal options ───────────────────────────────────────────────────
export const BANK_TERMINAL_OPTIONS = ['Bank Of Kigali', 'Equity Bank', 'Ecobank', 'BPR', 'I&M Bank'];

// ─── MoMo Pay Codes ──────────────────────────────────────────────────────────
export const MOMO_PAY_CODES = ['333100', '333200', '036201', '035884', '035885', '036200', 'Other'];

// ─── Call reason options ─────────────────────────────────────────────────────
export const CALL_REASON_OPTIONS = [
  'Appointment Booking', 'Appointment Cancellation', 'Lab Results Inquiry',
  'Directions / Location', 'Service Complaint', 'Billing Inquiry',
  'Insurance Query', 'Prescription Inquiry', 'Emergency Guidance', 'Other',
];

// ─── Reviewer roles (must match backend) ─────────────────────────────────────
export const REVIEWER_ROLES = ['principal_cashier', 'sales_manager', 'deputy_coo', 'coo', 'admin', 'it_officer', 'pa', 'operations_staff', 'chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse'];

// ─── Staff roles that can open shifts ────────────────────────────────────────
export const STAFF_SHIFT_ROLES = ['cashier', 'customer_care', 'operations_staff', 'nurse', 'rn_midwife', 'rama_rssb'];

// ─── VIP Position Dropdown Options ──────────────────────────────────────────
export const VIP_POSITIONS_CONFIG = {
  'Government & State': [
    'The Right Honourable Prime Minister',
    'Speaker of the Chamber of Deputies',
    'President of the Senate',
    'Chief Justice',
    'Minister',
    'Minister of State',
    'Permanent Secretary',
    'Provincial Governor',
    'Mayor of the City of Kigali',
    'District Mayor',
    'Senator',
    'Member of Parliament',
    'Supreme Court Justice',
    'Judge of the Court of Appeal'
  ],
  'Military & Security Organs': [
    'Chief of Defence Staff',
    'General',
    'Lieutenant General',
    'Major General',
    'Brigadier General',
    'Colonel',
    'Inspector General of Police',
    'Deputy Inspector General of Police',
    'Commissioner of Police',
    'Director General of NISS'
  ],
  'Diplomatic & International': [
    'Ambassador',
    'High Commissioner',
    'UN Resident Coordinator',
    'Country Director',
    'Head of Mission'
  ],
  'Corporate & Institutional': [
    'Governor of the National Bank of Rwanda',
    'Chief Executive Officer',
    'Managing Director',
    'Director General',
    'Vice Chancellor'
  ]
};

export const PREDEFINED_VIP_POSITIONS = Object.values(VIP_POSITIONS_CONFIG).flat();

