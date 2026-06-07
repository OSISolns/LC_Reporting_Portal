// ─── Shift role definitions ──────────────────────────────────────────────────
export const SHIFT_ROLES = [
  { value: 'cashier', label: 'Cashier', icon: 'CreditCard' },
  { value: 'helpdesk', label: 'Helpdesk', icon: 'Monitor' },
  { value: 'call_center', label: 'Call Center Agent', icon: 'Phone' },
  { value: 'nurse', label: 'Registered Nurse', icon: 'Stethoscope' },
  { value: 'vip_lounge', label: 'VIP Lounge', icon: 'Crown' },
];

// ─── Equipment per role ──────────────────────────────────────────────────────
export const EQUIPMENT_BY_ROLE = {
  cashier: ['PC', 'MoMo Phone', 'Receipt Printer', 'Barcode Printer', 'Desk Phone'],
  helpdesk: ['PC', 'Receipt Printer', 'Barcode Printer', 'Desk Phone'],
  call_center: ['PC', 'Headset'],
  nurse: ['PC', 'Thermometer', 'Stethoscope', 'BP Machine', 'Pulse Oximeter'],
  vip_lounge: ['PC', 'Desk Phone'],
};

export const EQUIPMENT_STATUS_OPTIONS = ['Working', 'Needs Repair', 'Broken/Missing'];

// ─── Insurance options ───────────────────────────────────────────────────────
export const INSURANCE_OPTIONS = [
  'AGAHOZO SHALOM YOUTH VILLAGE',
  'AMREF Flying Doctors',
  'Angola Embassy',
  'ASA MICROFINANCE',
  'ASSEMBLE INSURANCE TANZANIA LTD',
  'AXA Assistance',
  'BNR',
  'BRITAM Insurance',
  'BRUSSELS',
  'BUPA',
  'CHINA ROAD',
  'CLA Christian Life Assembly',
  'DAVIS&SHIRTLIFF RWANDA LTD',
  'Deva',
  'DREAM MEDICAL CENTER',
  'EDEN CARE INSURANCE',
  'Equity Bank Rwanda',
  'ERNEST & YOUNG',
  'Excella School',
  'FPR',
  'Heritage Insurance Company',
  'Hope & Homes for Children',
  'INYANGE INDUSTRIE LTD',
  'IOM',
  'ITM AFRICA LTD',
  'JUBILEE DENTAL CLINIC',
  'KICS',
  'King Faisal Hospital',
  'La Croix du Sud',
  'LAWYERS OF HOPE',
  'LEGACY CLINICS',
  'MAGERWA',
  'MIS/UR INSURANCE',
  'MMI',
  'MSH International Insurance',
  'PEACE Plan',
  'PINEDA DENTAL',
  'Polyclinique du Plateau',
  'PRICE WATER HOUSE (PWC)',
  'PRIME INSURANCE LTD',
  'Private Sector Federation',
  'Radiant Insurance Company',
  'Rwanda Bar Association',
  'Rwanda Events Group',
  'RWANDA MILITARY HOSPITAL',
  'Rwanda Social Security Board',
  'Rwanda Trading Company',
  'RWANDAIR MEDICAL',
  'AFRICA MEDILINK',
  'ALLIANZ',
  'ASCOMA',
  'ASSEMBLE TZ',
  'CIC GENERAL',
  'CIGNA',
  'HENNER',
  'SAHAM INSURANCE',
  'SEE FAR HOUSING',
  'SGF Special Guarantee Fund',
  'SINELAC',
  'SONARWA',
  'SANLAM',
  'SWISS EMBASSY',
  'OLD MUTUAL',
  'UBF(Ubuzima Bwiza Fundation)',
  'UNHCR',
  'BROWN PLANTATION RWANDA (BPR)',
  'UR CMHSBD LTD',
  'Urwego Opportunity',
  'VINE PHARMACY',
  'BUGAMBIRA MINING LTD'
];

// ─── Bank/terminal options ───────────────────────────────────────────────────
export const BANK_TERMINAL_OPTIONS = ['BK', 'BPR', 'Equity', 'Cogebanque', 'Ecobank', 'I&M'];

// ─── Call reason options ─────────────────────────────────────────────────────
export const CALL_REASON_OPTIONS = [
  'Appointment Booking', 'Appointment Cancellation', 'Lab Results Inquiry',
  'Directions / Location', 'Service Complaint', 'Billing Inquiry',
  'Insurance Query', 'Prescription Inquiry', 'Emergency Guidance', 'Other',
];

// ─── Reviewer roles (must match backend) ─────────────────────────────────────
export const REVIEWER_ROLES = ['principal_cashier', 'sales_manager', 'deputy_coo', 'coo', 'admin', 'it_officer', 'pa', 'operations_staff'];

// ─── Staff roles that can open shifts ────────────────────────────────────────
export const STAFF_SHIFT_ROLES = ['cashier', 'customer_care', 'operations_staff', 'nurse'];

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

