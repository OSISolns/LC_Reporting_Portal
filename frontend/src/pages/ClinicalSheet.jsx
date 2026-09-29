import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import {
  ArrowLeft, Save, Printer, Plus, Loader2, FileText,
  Sparkles, X, ChevronRight, BookOpen, Stethoscope, ClipboardList, MessageSquare,
  ShieldCheck, ShieldX, Shield, QrCode, Copy, CheckCircle, Calendar, Clock,
  UserCheck, Activity, Layers, CheckSquare, HeartPulse, Target, RefreshCw, Eye, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { INSURANCES } from './refunds/constants';
import Modal from '../components/Modal';

// 12 Activities of Living (UK NMC Nursing Process Standard)
const ACTIVITIES_OF_LIVING = [
  '1. Maintaining a safe environment',
  '2. Communication',
  '3. Breathing',
  '4. Eating & drinking',
  '5. Elimination',
  '6. Personal cleansing & dressing',
  '7. Controlling body temperature',
  '8. Mobilising',
  '9. Working & playing',
  '10. Expressing sexuality',
  '11. Sleeping',
  '12. Dying / Palliative care'
];

// 30-minute interval time options for dropdowns
const TIME_OPTIONS = (() => {
  const opts = [{ value: '', label: '-- Time --' }];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      opts.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return opts;
})();

const PHYSICAL_EXAM_PRESETS = {
  head_neck: {
    title: 'Head, Neck & HEENT',
    guideline: 'Evaluate cranial symmetry, eyes (PERRLA), ears, nose, oral cavity/mucosa, cervical lymph nodes, scalp integrity, and neck range of motion.',
    options: [
      { label: '-- Select Head, Neck & HEENT Finding --', value: '' },
      { label: 'Normal / Symmetrical, PERRLA, Neck Supple (Baseline)', value: 'Normal head symmetry, PERRLA, moist oral mucosa, neck supple, no cervical lymphadenopathy' },
      { label: 'PERRLA, No Cervical Lymphadenopathy', value: 'PERRLA intact, no cervical lymphadenopathy noted' },
      { label: 'Facial Asymmetry / Cranial Nerve Deficit', value: 'Facial asymmetry noted, cranial nerve evaluation pending' },
      { label: 'Pupils Sluggish / Unequal (Anisocoria)', value: 'Pupils sluggish to light, non-reactive or unequal (anisocoria)' },
      { label: 'Dry Mucous Membranes / Dehydration Signs', value: 'Oral mucous membranes dry, poor skin turgor on forehead/neck' },
      { label: 'Cervical Lymphadenopathy / Neck Stiffness', value: 'Cervical lymphadenopathy present, neck stiffness noted' }
    ],
    chips: [
      { label: 'Normal Baseline', value: 'Normal head symmetry, PERRLA, neck supple, no lymphadenopathy' },
      { label: 'PERRLA & Supple', value: 'PERRLA intact, neck supple' },
      { label: 'Dry Mucosa', value: 'Oral mucous membranes dry' },
      { label: 'Sluggish Pupils', value: 'Pupils sluggish to light' }
    ]
  },
  neurological: {
    title: 'Neurological & Mental Status',
    guideline: 'Assess level of consciousness (AVPU/GCS), orientation x4 (person, place, time, situation), speech clarity, memory, and motor reflexes.',
    options: [
      { label: '-- Select Neurological & Mental Status Finding --', value: '' },
      { label: 'Alert & Oriented x4, GCS 15, Speech Clear (Baseline)', value: 'Alert & oriented x4 (person, place, time, situation), GCS 15/15, clear speech, normal motor reflexes' },
      { label: 'Alert but Disoriented to Time/Place', value: 'Alert but disoriented to time and place, responds to verbal prompts' },
      { label: 'Somnolent / Lethargic (Rousable to Voice)', value: 'Somnolent, easily rousable to verbal stimuli, confused speech' },
      { label: 'Stuporous / Responds to Pain Only', value: 'Stuporous, responds to painful stimuli only, localized motor response' },
      { label: 'Dysarthria / Slurred Speech / Aphasia', value: 'Slurred speech (dysarthria) / expressive aphasia noted' },
      { label: 'Motor Reflex Hypo/Hyperreflexia or Tremors', value: 'Motor reflexes altered, intention tremors noted in upper limbs' }
    ],
    chips: [
      { label: 'A&O x4 (Baseline)', value: 'Alert & oriented x4, GCS 15/15, clear speech, normal reflexes' },
      { label: 'Alert & Confused', value: 'Alert but disoriented to time/place' },
      { label: 'Lethargic / Somnolent', value: 'Somnolent, rousable to voice' },
      { label: 'Slurred Speech', value: 'Slurred speech noted' }
    ]
  },
  cardiovascular: {
    title: 'Cardiovascular & Circulation',
    guideline: 'Auscultate S1/S2 heart sounds, rhythm, apical pulse rate, presence of murmurs/gallops, capillary refill (< 2s), and peripheral pulse volume (0-4+).',
    options: [
      { label: '-- Select Cardiovascular & Circulation Finding --', value: '' },
      { label: 'S1/S2 Normal, Regular Rhythm, Cap Refill < 2s (Baseline)', value: 'S1 & S2 heart sounds normal, regular rate & rhythm, no murmurs, capillary refill < 2s, radial/pedal pulses 2+' },
      { label: 'Regular Rate & Rhythm, Strong Pulses', value: 'Heart rate & rhythm regular, peripheral pulses 2+ strong bilaterally' },
      { label: 'Irregular Rhythm / Tachycardia / Bradycardia', value: 'Irregular cardiac rhythm, telemetry monitoring advised' },
      { label: 'Systolic / Diastolic Murmur Auscultated', value: 'Systolic murmur auscultated over mitral apex area' },
      { label: 'Delayed Capillary Refill (> 2 seconds)', value: 'Capillary refill delayed > 2 seconds in lower extremities' },
      { label: 'Diminished Peripheral Pulses (1+ / Thready)', value: 'Peripheral pulses 1+ weak/thready bilaterally' }
    ],
    chips: [
      { label: 'Normal Baseline', value: 'S1 & S2 normal, regular rhythm, cap refill < 2s, pulses 2+' },
      { label: 'Regular Rhythm', value: 'Heart rate & rhythm regular, pulses strong' },
      { label: 'Irregular Rhythm', value: 'Irregular cardiac rhythm auscultated' },
      { label: 'Cap Refill > 2s', value: 'Capillary refill delayed > 2 seconds' }
    ]
  },
  respiratory: {
    title: 'Respiratory System & Lungs',
    guideline: 'Auscultate anterior & posterior lung fields (vesicular/clear, crackles, wheezes, rhonchi), breathing pattern, respiratory effort, chest symmetry, and oxygen support.',
    options: [
      { label: '-- Select Respiratory System Finding --', value: '' },
      { label: 'Clear Breath Sounds Bilaterally, Unassisted (Baseline)', value: 'Clear vesicular breath sounds bilaterally in all lung fields, unassisted breathing on room air, equal chest expansion' },
      { label: 'Clear Breath Sounds on Nasal Cannula O2', value: 'Clear breath sounds bilaterally, maintaining SpO2 on nasal cannula oxygen' },
      { label: 'Fine / Coarse Crackles (Basilar)', value: 'Crackles / rales present at lung bases on auscultation' },
      { label: 'Expiratory / Inspiratory Wheezing', value: 'Expiratory wheezing present bilaterally throughout lung fields' },
      { label: 'Rhonchi / Secretions in Upper Airways', value: 'Coarse rhonchi / upper airway secretions noted, coughing encouraged' },
      { label: 'Shortness of Breath / Intercostal Retractions', value: 'Dyspnea / tachypnea with intercostal retractions and accessory muscle use' }
    ],
    chips: [
      { label: 'Clear Bilaterally', value: 'Clear breath sounds bilaterally, unassisted on room air' },
      { label: 'Basilar Crackles', value: 'Fine crackles at lung bases' },
      { label: 'Wheezing', value: 'Expiratory wheezing bilaterally' },
      { label: 'Shortness of Breath', value: 'Shortness of breath with accessory muscle use' }
    ]
  },
  abdomen: {
    title: 'Gastrointestinal & Abdomen',
    guideline: 'Inspect abdominal contour, auscultate bowel sounds in 4 quadrants (RUQ, LUQ, RLQ, LLQ), percussion tone, palpate for softness, tenderness, or rigidity.',
    options: [
      { label: '-- Select Abdomen & GI Finding --', value: '' },
      { label: 'Soft, Non-Tender, Active Bowel Sounds x4 (Baseline)', value: 'Abdomen soft, non-tender, non-distended, active bowel sounds in all 4 quadrants' },
      { label: 'Active Bowel Sounds in All 4 Quadrants', value: 'Active normoactive bowel sounds present in RUQ, LUQ, RLQ, LLQ' },
      { label: 'Hyperactive Bowel Sounds x4 Quadrants', value: 'Hyperactive bowel sounds present in all 4 quadrants' },
      { label: 'Hypoactive / Sluggish Bowel Sounds', value: 'Hypoactive or sluggish bowel sounds in lower quadrants' },
      { label: 'Abdominal Distension / Mild Tenderness', value: 'Abdomen distended with mild localized tenderness on palpation' },
      { label: 'Rigid / Guarding / Rebound Tenderness', value: 'Abdominal rigidity with involuntary guarding and rebound pain' }
    ],
    chips: [
      { label: 'Normal Baseline', value: 'Abdomen soft, non-tender, active bowel sounds x4' },
      { label: 'Active x4', value: 'Active bowel sounds present in all 4 quadrants' },
      { label: 'Hypoactive', value: 'Hypoactive bowel sounds' },
      { label: 'Distended', value: 'Abdomen mild distension, non-rigid' }
    ]
  },
  genitourinary: {
    title: 'Genitourinary & Renal System',
    guideline: 'Assess voiding pattern, urinary frequency/dysuria, urine clarity/color, catheter presence (Foley/Condom), output volume, and costovertebral angle (CVA) tenderness.',
    options: [
      { label: '-- Select Genitourinary & Renal Finding --', value: '' },
      { label: 'Voiding Spontaneously, Clear Amber Urine (Baseline)', value: 'Voiding spontaneously, urine clear amber/yellow, no dysuria or urgency, no CVA tenderness' },
      { label: 'Foley Catheter Intact, Draining Clear Urine', value: 'Foley catheter patent & intact to gravity bag, draining clear straw-colored urine' },
      { label: 'Concentrated / Straw / Cloudy Urine', value: 'Urine dark amber / cloudy with sediment, hydration encouraged' },
      { label: 'Dysuria / Frequency / Urgency Reported', value: 'Patient reports dysuria, burning sensation, and urinary frequency' },
      { label: 'Costovertebral Angle (CVA) Tenderness', value: 'Flank costovertebral angle (CVA) tenderness present on percussion' },
      { label: 'Oliguria / Low Urine Output (< 30ml/hr)', value: 'Low urine output / oliguria noted (< 30 mL/hr)' }
    ],
    chips: [
      { label: 'Normal Baseline', value: 'Voiding spontaneously, clear amber urine, no dysuria' },
      { label: 'Foley Draining Clear', value: 'Foley catheter patent, draining clear urine' },
      { label: 'Cloudy / Sediment', value: 'Urine cloudy with sediment' },
      { label: 'Dysuria Reported', value: 'Dysuria and urinary frequency reported' }
    ]
  },
  skin_integumentary: {
    title: 'Integumentary System (Skin & Wounds)',
    guideline: 'Assess skin color, temperature, moisture, turgor, integrity, rashes, pressure injury risk (Braden scale), surgical wounds, or dressings.',
    options: [
      { label: '-- Select Skin & Integumentary Finding --', value: '' },
      { label: 'Skin Warm, Dry, Intact, Good Turgor (Baseline)', value: 'Skin warm, dry, intact without rashes or breakdown, prompt turgor elasticity' },
      { label: 'Warm & Dry, Surgical Dressing Intact', value: 'Skin warm and dry, surgical dressing clean, dry, and intact' },
      { label: 'Pale / Diaphoretic / Clammy Skin', value: 'Skin pale, cool, and diaphoretic / clammy' },
      { label: 'Flushed / Warm / Febrile Skin', value: 'Skin warm, flushed, dry to touch' },
      { label: 'Erythema / Rash / Skin Breakdown', value: 'Localized erythema / rash noted, skin intact' },
      { label: 'Stage 1-4 Pressure Injury / Wound Present', value: 'Pressure injury / skin erosion present, wound care protocol active' }
    ],
    chips: [
      { label: 'Normal Baseline', value: 'Skin warm, dry, intact, good turgor, no rashes' },
      { label: 'Dressing Intact', value: 'Surgical dressing clean, dry, and intact' },
      { label: 'Cool & Clammy', value: 'Skin cool, pale, and clammy' },
      { label: 'Rash / Erythema', value: 'Erythema / rash present' }
    ]
  },
  extremities: {
    title: 'Musculoskeletal & Extremities',
    guideline: 'Assess active range of motion (ROM), muscle strength (5/5), joint deformities/edema, extremity warmth, gait stability, and peripheral pitting edema (1+ to 4+).',
    options: [
      { label: '-- Select Musculoskeletal & Extremities Finding --', value: '' },
      { label: 'Full Active ROM, Strength 5/5, No Edema (Baseline)', value: 'Full active range of motion in upper & lower limbs, muscle strength 5/5 bilaterally, no joint swelling or edema' },
      { label: 'Intact Strength & ROM, Bilateral Pulses Intact', value: 'Motor strength 5/5 intact, full range of motion, peripheral pulses intact' },
      { label: 'Peripheral Pitting Edema (1+ to 4+)', value: 'Bilateral lower extremity pitting edema noted (2+ pedal edema)' },
      { label: 'Reduced Strength / Hemiparesis / Weakness', value: 'Reduced motor strength (3/5) / unilateral limb weakness noted' },
      { label: 'Joint Swelling / Deformity / Limited ROM', value: 'Joint pain, stiffness, and restricted range of motion' },
      { label: 'Unsteady Gait / High Fall Risk', value: 'Unsteady gait, assistance required for ambulation, fall risk precautions active' }
    ],
    chips: [
      { label: 'Normal Baseline', value: 'Full active ROM, muscle strength 5/5 bilaterally, no edema' },
      { label: 'Pitting Edema 2+', value: 'Lower extremity pitting edema (2+)' },
      { label: 'Limb Weakness', value: 'Reduced motor strength / limb weakness' },
      { label: 'Unsteady Gait', value: 'Unsteady gait, ambulation assistance needed' }
    ]
  }
};

const InsuranceField = ({ register, control }) => {
  const currentValue = useWatch({ control, name: 'identification.insurance' });
  const isInList = !currentValue || INSURANCES.includes(currentValue);
  return (
    <div className="row-flex">
      <span className="form-label w-44">Health insurance <span className="text-red-500 font-bold ml-0.5">*</span></span>
      <select {...register('identification.insurance')} className="form-input">
        <option value="">Select Insurance / Payer</option>
        {!isInList && <option value={currentValue}>{currentValue}</option>}
        {INSURANCES.map(ins => (
          <option key={ins} value={ins}>{ins}</option>
        ))}
      </select>
    </div>
  );
};

const ClinicalSheet = ({ embeddedPatientId, embeddedQueueId, isEmbedded, embeddedTab, onSaveSuccess }) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNurse = ['nurse', 'chef-nurse'].includes(user?.role);
  const queryParams = new URLSearchParams(location.search);

  const patientId = embeddedPatientId || params.patientId;
  const queue_id = embeddedQueueId || queryParams.get('queue_id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [historyObservations, setHistoryObservations] = useState([]);
  const [viewMode, setViewMode] = useState('continuous'); // 'continuous' | 'form'
  const [activeFormStep, setActiveFormStep] = useState(1); // 1: Assessment, 2: Diagnosis, 3: Planning, 4: Implementation, 5: Evaluation

  // AI Loaders & Drawer
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCommentsLoading, setAiCommentsLoading] = useState(false);
  const [aiSbarLoading, setAiSbarLoading] = useState(false);
  const [aiProgressNoteLoading, setAiProgressNoteLoading] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [frequencies, setFrequencies] = useState([]);
  const [medSuggestions, setMedSuggestions] = useState([]);
  const [medSugLoading, setMedSugLoading] = useState(false);

  // Authenticity Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [docInfo, setDocInfo] = useState(null);
  const [docInfoLoading, setDocInfoLoading] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Missing Fields Modal
  const [missingModalOpen, setMissingModalOpen] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState([]);
  const [examChecklistModalOpen, setExamChecklistModalOpen] = useState(false);

  // Date/Time Range PDF Export Modal
  const [rangePdfModalOpen, setRangePdfModalOpen] = useState(false);
  const [pdfFromDate, setPdfFromDate] = useState('');
  const [pdfFromTime, setPdfFromTime] = useState('');
  const [pdfToDate, setPdfToDate] = useState('');
  const [pdfToTime, setPdfToTime] = useState('');
  const [attendedPersonnel, setAttendedPersonnel] = useState({ doctors: [], nurses: [], total_records: 0 });
  const [fetchingPersonnel, setFetchingPersonnel] = useState(false);
  const [providersList, setProvidersList] = useState([]);
  const [observationDates, setObservationDates] = useState([]);
  const [loadingObsDates, setLoadingObsDates] = useState(false);

  const [sheetStatus, setSheetStatus] = useState('Draft');
  const [hasReported, setHasReported] = useState(false);
  const [hasReceived, setHasReceived] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState('');

  const triggerAutosave = (fieldPath, value) => {
    if (fieldPath && value !== undefined) {
      setValue(fieldPath, value, { shouldDirty: true, shouldValidate: true });
    }
    setTimeout(async () => {
      try {
        const currentValues = control._formValues;
        await api.post(`/clinical/observations/${patientId}`, { ...currentValues, queue_id, patient_id: patientId, status: isCompleted ? sheetStatus : 'Draft' });
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setAutosaveStatus(`Autosaved at ${nowTime}`);
      } catch (err) {
        console.error('Autosave background error:', err);
      }
    }, 300);
  };

  const isPrescriber = ['doctor', 'consultant', 'medical_director', 'admin', 'pa'].includes(user?.role);
  const isCompleted = ['Completed', 'Verified'].includes(sheetStatus);

  const isNoteAuthor = (noteItem) => {
    if (!noteItem) return true;
    if (!noteItem.note?.trim() && !noteItem.datetime && !noteItem.signature && !noteItem.author_id) {
      return true;
    }
    if (!user) return false;
    if (noteItem.author_id) {
      return String(noteItem.author_id) === String(user.id);
    }
    if (noteItem.author_username) {
      return noteItem.author_username.toLowerCase() === (user.username || '').toLowerCase();
    }
    if (noteItem.signature) {
      const userFullName = (user.fullName || user.full_name || user.name || '').trim().toLowerCase();
      const sig = (noteItem.signature || '').trim().toLowerCase();
      if (userFullName && sig && (sig.includes(userFullName) || userFullName.includes(sig))) {
        return true;
      }
    }
    return false;
  };

  const validateClinicalSheetForCompletion = (data) => {
    const missing = [];
    const ident = data?.identification || {};
    const triage = data?.triage || {};
    const notes = data?.progress_notes || [];
    const mar = data?.medication_mar || {};
    const sbar = data?.sbar || {};

    if (!ident.last_name?.trim()) missing.push('Patient Last Name');
    if (!ident.first_name?.trim()) missing.push('Patient First Name');
    if (!ident.dob?.trim()) missing.push('Date of Birth (DoB)');
    if (!ident.gender?.trim()) missing.push('Gender');
    if (!ident.pid?.trim()) missing.push('Patient ID (PID)');
    if (!ident.insurance?.trim()) missing.push('Health Insurance');
    if (!ident.diagnosis?.trim()) missing.push('Clinical Diagnosis');
    if (!ident.medical_note?.trim()) missing.push('Medical Note');

    const hasNursingAssessment = Boolean(
      triage.prev_illness_med?.trim() ||
      triage.prev_illness_surg?.trim() ||
      triage.allergy_1?.trim() ||
      triage.allergy_2?.trim()
    );
    if (!hasNursingAssessment) missing.push('Nursing Assessment (Medical/Surgical History or Allergies)');

    const missingVitals = [];
    if (!triage.temp?.toString().trim()) missingVitals.push('Temp');
    if (!triage.pulse?.toString().trim()) missingVitals.push('Pulse');
    if (!triage.rr?.toString().trim()) missingVitals.push('Resp Rate');
    if (!triage.bp?.toString().trim()) missingVitals.push('Blood Pressure');
    if (!triage.weight?.toString().trim()) missingVitals.push('Weight');
    if (!triage.spo2?.toString().trim()) missingVitals.push('SpO2');
    if (missingVitals.length > 0) {
      missing.push(`Vitals (${missingVitals.join(', ')})`);
    }

    if (!triage.general_comments?.trim()) missing.push('General Comment');

    const hasValidNote = notes.some(n => n.note?.trim());
    if (!hasValidNote) missing.push('Progress / Clinical Notes');

    if (!sbar.content?.trim()) missing.push('SBAR (Handover Content)');

    const interventions = mar.interventions || [];
    const hasMedication = interventions.some(i => i.name?.trim() && i.dose?.trim() && i.frequency?.trim());
    if (!hasMedication) missing.push('MAR (Prescription Interventions: Name, Dose, Frequency, Route)');

    const adminLogs = mar.admin_logs || [];
    const hasAdminLog = adminLogs.some(l => l.time?.trim() && l.initials?.trim()) || Boolean(mar.admin_initials?.trim());
    if (!hasAdminLog) missing.push('MAR Administration (Time & Administered by Initials)');

    return missing;
  };

  const { register, control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      identification: {
        last_name: '',
        first_name: '',
        occupation: '',
        national_id: '',
        dob: '',
        gender: '',
        pid: '',
        appt_date_no: 'Walk-in / No Appointment',
        insurance: '',
        diagnosis: '',
        medical_note: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rn: ''
      },
      triage: {
        prev_illness_med: '',
        prev_illness_surg: '',
        allergy_1: '',
        allergy_2: '',
        temp: '',
        pulse: '',
        rr: '',
        bp: '',
        weight: '',
        spo2: '',
        general_comments: '',
        nursing_process: {
          step1_assessment: {
            subjective: { symptoms: '', pain_description: '', pain_score: '' },
            pqrst_pain: { provoke: '', quality: '', region: '', severity: '', time: '' },
            sample_history: { signs: '', allergies: '', meds: '', pmh: '', last_intake: '', events: '' },
            risk_scores: { morse_fall: '', braden_scale: '', avpu_gcs: '', ciwa_cage: '', height: '', bmi: '' }
          },
          step2_diagnosis: {
            activities_of_living: [],
            nursing_diagnosis_statement: '',
            patient_needs_goals_impact: ''
          },
          step3_planning: {
            smart_goals: { specific: '', measurable: '', attainable: '', realistic: '', timely: '' },
            care_plan_interventions: ''
          },
          step4_implementation: {
            care_plan_executed: '',
            multidisciplinary_notes: ''
          },
          step5_evaluation: {
            goal_achievement_status: 'Ongoing',
            vital_physical_trend: '',
            care_plan_modification: ''
          }
        }
      },
      progress_notes: [
        { datetime: '', note: '', signature: '' }
      ],
      medication_mar: {
        interventions: [
          { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' }
        ],
        prescriber: '',
        admin_logs: [
          { time: '', initials: '' }
        ],
        admin_initials: '',
        admin_names: ''
      },
      sbar: {
        content: '',
        reported_by: '',
        reported_sign_time: '',
        received_by: '',
        received_sign_time: ''
      }
    }
  });

  const selectedActivities = watch('triage.nursing_process.step2_diagnosis.activities_of_living') || [];

  const toggleActivityOfLiving = (act) => {
    const current = [...selectedActivities];
    const idx = current.indexOf(act);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(act);
    }
    setValue('triage.nursing_process.step2_diagnosis.activities_of_living', current, { shouldDirty: true });
  };

  const { fields: progressFields, append: appendProgress, remove: removeProgress } = useFieldArray({
    control, name: "progress_notes"
  });

  const { fields: logFields, append: appendLog } = useFieldArray({
    control, name: "medication_mar.admin_logs"
  });

  const fetchAttendedPersonnel = async (fromDate = pdfFromDate, toDate = pdfToDate, fromTime = pdfFromTime, toTime = pdfToTime) => {
    if (!patientId) return;
    try {
      setFetchingPersonnel(true);
      const res = await api.get(`/clinical/observations/${patientId}/attended-personnel`, {
        params: { from_date: fromDate, to_date: toDate, from_time: fromTime, to_time: toTime }
      });
      if (res.data?.success) {
        setAttendedPersonnel(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch attended personnel:", err);
    } finally {
      setFetchingPersonnel(false);
    }
  };

  const applyRangePreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'shift') {
      setPdfFromDate(todayStr);
      setPdfFromTime('07:00');
      setPdfToDate(todayStr);
      setPdfToTime('19:00');
      fetchAttendedPersonnel(todayStr, todayStr, '07:00', '19:00');
    } else if (preset === '24h') {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const yStr = yesterday.toISOString().split('T')[0];
      setPdfFromDate(yStr);
      setPdfFromTime('00:00');
      setPdfToDate(todayStr);
      setPdfToTime('23:59');
      fetchAttendedPersonnel(yStr, todayStr, '00:00', '23:59');
    } else if (preset === '7d') {
      const d7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const d7Str = d7.toISOString().split('T')[0];
      setPdfFromDate(d7Str);
      setPdfFromTime('00:00');
      setPdfToDate(todayStr);
      setPdfToTime('23:59');
      fetchAttendedPersonnel(d7Str, todayStr, '00:00', '23:59');
    } else if (preset === 'all') {
      setPdfFromDate('');
      setPdfFromTime('');
      setPdfToDate('');
      setPdfToTime('');
      fetchAttendedPersonnel('', '', '', '');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const formatDobForInput = (dobVal) => {
        if (!dobVal) return '';
        if (dobVal.includes('-') && dobVal.split('-')[0].length === 4) {
          return dobVal.substring(0, 10);
        }
        if (dobVal.includes('/')) {
          const parts = dobVal.split('/');
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
        return dobVal;
      };

      try {
        setLoading(true);
        const [patientRes, vitalsRes, sheetRes, allObsRes, inventoryRes, providersRes, obsDatesRes] = await Promise.all([
          api.get(`/patients/${patientId}`),
          api.get(`/patients/${patientId}/vitals`).catch(() => ({ data: null })),
          api.get(`/clinical/observations/${patientId}?queue_id=${queue_id}`).catch(() => ({ data: null })),
          api.get(`/clinical/observations/${patientId}/all`).catch(() => ({ data: { data: [] } })),
          api.get('/clinical/inventory/items').catch(() => ({ data: { data: [] } })),
          api.get('/providers/active').catch(() => api.get('/providers?activeOnly=true')).catch(() => ({ data: { data: [] } })),
          api.get(`/clinical/observations/${patientId}/dates`).catch(() => ({ data: { data: [] } }))
        ]);

        const patientObj = patientRes.data?.data || patientRes.data || {};
        setPatient(patientObj);

        if (allObsRes.data?.success && Array.isArray(allObsRes.data.data)) {
          setHistoryObservations(allObsRes.data.data);
        }

        if (inventoryRes.data && inventoryRes.data.data) {
          setInventoryItems(inventoryRes.data.data);
        }

        if (providersRes.data?.data && Array.isArray(providersRes.data.data)) {
          setProvidersList(providersRes.data.data);
        }

        if (obsDatesRes.data?.data && Array.isArray(obsDatesRes.data.data)) {
          setObservationDates(obsDatesRes.data.data);
          if (obsDatesRes.data.data.length > 0) {
            const latestDate = obsDatesRes.data.data[0].date;
            setPdfFromDate(latestDate);
            setPdfToDate(latestDate);
          }
        }

        const fullName = patientObj.full_name || '';
        const nameParts = fullName.trim().split(/\s+/);
        const lastName = nameParts[0] || '';
        const firstName = nameParts.slice(1).join(' ') || '';

        let targetSheet = sheetRes.data?.data || null;

        if (!targetSheet && allObsRes.data?.data?.length > 0) {
          const sorted = [...allObsRes.data.data].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
          targetSheet = sorted[0];
        }

        if (targetSheet) {
          const sheetIdent = targetSheet.identification || {};
          const mergedIdent = {
            ...sheetIdent,
            last_name: sheetIdent.last_name || lastName || patientObj.last_name || '',
            first_name: sheetIdent.first_name || firstName || patientObj.first_name || '',
            occupation: sheetIdent.occupation || patientObj.occupation || '',
            national_id: sheetIdent.national_id || patientObj.national_id || '',
            dob: sheetIdent.dob || formatDobForInput(patientObj.dob) || '',
            gender: sheetIdent.gender || patientObj.gender || '',
            pid: sheetIdent.pid || patientId,
            insurance: sheetIdent.insurance || patientObj.referrer_name || patientObj.insurance || patientObj.insurance_provider || '',
            date: sheetIdent.date || new Date().toISOString().split('T')[0],
            time: sheetIdent.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rn: (sheetIdent.rn && sheetIdent.rn !== 'N/A' && sheetIdent.rn.trim() !== '') ? sheetIdent.rn : (targetSheet.created_by_name || targetSheet.created_by_username || user?.fullName || user?.name || user?.username || 'Duty RN Staff'),
            attending_doctor: sheetIdent.attending_doctor || patientObj.doctor_name || patientObj.attending_doctor || ''
          };

          const sTriage = targetSheet.triage || {};
          const existingNp = sTriage.nursing_process || targetSheet.nursing_process || {};

          const emptyI = { name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' };
          const emptyL = { time: '', initials: '' };
          const sInterventions = targetSheet.medication_mar?.interventions || [];
          const sLogs = targetSheet.medication_mar?.admin_logs || [];

          reset({
            ...targetSheet,
            identification: mergedIdent,
            triage: {
              ...sTriage,
              nursing_process: {
                step1_assessment: {
                  subjective: { symptoms: '', pain_description: '', pain_score: '' },
                  pqrst_pain: { provoke: '', quality: '', region: '', severity: '', time: '' },
                  sample_history: { signs: '', allergies: '', meds: '', pmh: '', last_intake: '', events: '' },
                  risk_scores: { morse_fall: '', braden_scale: '', avpu_gcs: '', ciwa_cage: '', height: '', bmi: '' },
                  ...existingNp.step1_assessment
                },
                step2_diagnosis: existingNp.step2_diagnosis || { activities_of_living: [], nursing_diagnosis_statement: '', patient_needs_goals_impact: '' },
                step3_planning: existingNp.step3_planning || { smart_goals: { specific: '', measurable: '', attainable: '', realistic: '', timely: '' }, care_plan_interventions: '' },
                step4_implementation: existingNp.step4_implementation || { care_plan_executed: '', multidisciplinary_notes: '' },
                step5_evaluation: existingNp.step5_evaluation || { goal_achievement_status: 'Ongoing', vital_physical_trend: '', care_plan_modification: '' }
              }
            },
            medication_mar: {
              ...targetSheet.medication_mar,
              interventions: [
                ...sInterventions,
                ...Array(Math.max(0, 4 - sInterventions.length)).fill(emptyI)
              ].slice(0, Math.max(4, sInterventions.length)),
              admin_logs: [
                ...sLogs,
                ...Array(Math.max(0, 8 - sLogs.length)).fill(emptyL)
              ]
            }
          });
          setSheetStatus(targetSheet.status || 'Draft');
          setHasReported(!!targetSheet.sbar?.reported_by);
          setHasReceived(!!targetSheet.sbar?.received_by);
        } else {
          const latestVitals = (vitalsRes.data?.data || vitalsRes.data || [])[0] || {};
          reset({
            identification: {
              last_name: lastName || patientObj.last_name || '',
              first_name: firstName || patientObj.first_name || '',
              occupation: patientObj.occupation || '',
              national_id: patientObj.national_id || '',
              dob: formatDobForInput(patientObj.dob),
              gender: patientObj.gender || '',
              pid: patientId,
              appt_date_no: 'Walk-in / No Appointment',
              insurance: patientObj.referrer_name || patientObj.insurance || patientObj.insurance_provider || '',
              diagnosis: '',
              medical_note: '',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              rn: user?.fullName || user?.name || user?.username || 'Duty RN Staff'
            },
            triage: {
              prev_illness_med: '',
              prev_illness_surg: '',
              allergy_1: patientObj.allergies || '',
              allergy_2: '',
              temp: latestVitals.temperature || '',
              pulse: latestVitals.pulse || '',
              rr: latestVitals.respiratory_rate || '',
              bp: latestVitals.blood_pressure || '',
              weight: latestVitals.weight || '',
              spo2: latestVitals.spo2 || '',
              general_comments: '',
              nursing_process: {
                step1_assessment: {
                  subjective: { symptoms: '', pain_description: '', pain_score: '' },
                  pqrst_pain: { provoke: '', quality: '', region: '', severity: '', time: '' },
                  sample_history: { signs: '', allergies: '', meds: '', pmh: '', last_intake: '', events: '' },
                  risk_scores: { morse_fall: '', braden_scale: '', avpu_gcs: '', ciwa_cage: '', height: '', bmi: '' }
                },
                step2_diagnosis: { activities_of_living: [], nursing_diagnosis_statement: '', patient_needs_goals_impact: '' },
                step3_planning: { smart_goals: { specific: '', measurable: '', attainable: '', realistic: '', timely: '' }, care_plan_interventions: '' },
                step4_implementation: { care_plan_executed: '', multidisciplinary_notes: '' },
                step5_evaluation: { goal_achievement_status: 'Ongoing', vital_physical_trend: '', care_plan_modification: '' }
              }
            },
            progress_notes: [
              { datetime: '', note: '', signature: '' }
            ],
            medication_mar: {
              interventions: Array(4).fill({ name: '', dose: '', frequency: '', route: '', start_time: '', end_time: '' }),
              prescriber: '',
              admin_logs: Array(8).fill({ time: '', initials: '' }),
              admin_initials: '',
              admin_names: ''
            },
            sbar: {
              content: '',
              reported_by: '',
              reported_sign_time: '',
              received_by: '',
              received_sign_time: ''
            }
          });
        }
      } catch (error) {
        toast.error("Failed to load patient data.");
      } finally {
        setLoading(false);
      }
    };
    if (patientId) fetchData();
  }, [patientId, queue_id, reset, user]);

  // Real-time synchronization interval for doctor & nursing observation updates (4-second auto-pull)
  useEffect(() => {
    if (!patientId) return;
    const interval = setInterval(() => {
      api.get(`/clinical/observations/${patientId}/all`).then(res => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setHistoryObservations(res.data.data);
        }
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [patientId]);

  const enrichProgressNotes = (notes) => {
    if (!Array.isArray(notes)) return [];
    return notes.map(n => {
      if (n && (n.note?.trim() || n.datetime || n.signature)) {
        return {
          ...n,
          author_id: n.author_id || user?.id,
          author_username: n.author_username || user?.username,
          author_name: n.author_name || user?.fullName || user?.full_name || user?.name || '',
          signature: n.signature || user?.fullName || user?.full_name || user?.name || ''
        };
      }
      return n;
    });
  };

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      const nowStr = new Date().toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      if (!data.sbar) data.sbar = {};
      if (!data.sbar.reported_by) {
        const baseName = user?.fullName || user?.name || '';
        data.sbar.reported_by = baseName ? `${baseName} (${nowStr})` : '';
      }
      if (!data.sbar.reported_sign_time) {
        data.sbar.reported_sign_time = nowStr;
      }

      data.progress_notes = enrichProgressNotes(data.progress_notes);
      data.status = isCompleted ? sheetStatus : 'Draft';

      await api.post(`/clinical/observations/${patientId}`, { ...data, queue_id, patient_id: patientId });
      setHasReported(true);
      toast.success("Nursing observations & care plan saved!");

      const allRes = await api.get(`/clinical/observations/${patientId}/all`).catch(() => ({ data: { data: [] } }));
      if (allRes.data?.success && Array.isArray(allObsRes.data.data)) {
        setHistoryObservations(allObsRes.data.data);
      }
      reset(data);
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleDeclareCompleted = async () => {
    try {
      const currentValues = control._formValues;
      const missing = validateClinicalSheetForCompletion(currentValues);
      if (missing.length > 0) {
        setMissingFieldsList(missing);
        setMissingModalOpen(true);
        toast.error("Cannot declare completed: required sections/fields are missing.");
        return;
      }

      setSaving(true);
      const nowStr = new Date().toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      if (!currentValues.sbar) currentValues.sbar = {};
      const baseReported = currentValues.sbar.reported_by || user?.fullName || user?.name || '';
      const reportedBy = baseReported && !baseReported.includes('(') ? `${baseReported} (${nowStr})` : baseReported;
      const reportedSignTime = currentValues.sbar.reported_sign_time || nowStr;

      const verifierName = user?.fullName || user?.name || 'Nurse';
      const receivedBy = `${verifierName} (${nowStr})`;
      const receivedSignTime = nowStr;

      const dataToSave = {
        ...currentValues,
        progress_notes: enrichProgressNotes(currentValues.progress_notes),
        status: 'Completed',
        queue_id,
        patient_id: patientId,
        sbar: {
          ...currentValues.sbar,
          reported_by: reportedBy,
          reported_sign_time: reportedSignTime,
          received_by: receivedBy,
          received_sign_time: receivedSignTime
        }
      };

      await api.post(`/clinical/observations/${patientId}`, dataToSave);
      setSheetStatus('Completed');
      setHasReported(true);
      setHasReceived(true);
      reset(dataToSave);
      toast.success("Clinical Sheet declared COMPLETED successfully!");
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to declare sheet completed");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRangePdfModal = async () => {
    setRangePdfModalOpen(true);
    try {
      setLoadingObsDates(true);
      const res = await api.get(`/clinical/observations/${patientId}/dates`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setObservationDates(res.data.data);
        if (res.data.data.length > 0) {
          const latest = res.data.data[0].date;
          setPdfFromDate(latest);
          setPdfToDate(latest);
          fetchAttendedPersonnel(latest, latest, pdfFromTime, pdfToTime);
        } else {
          fetchAttendedPersonnel(pdfFromDate, pdfToDate, pdfFromTime, pdfToTime);
        }
      } else {
        fetchAttendedPersonnel(pdfFromDate, pdfToDate, pdfFromTime, pdfToTime);
      }
    } catch (err) {
      console.error("Failed to load observation dates:", err);
      fetchAttendedPersonnel(pdfFromDate, pdfToDate, pdfFromTime, pdfToTime);
    } finally {
      setLoadingObsDates(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading("Generating Continuous PDF...", { id: 'pdf-toast' });
      const paramsObj = { queue_id };
      if (pdfFromDate) paramsObj.from_date = pdfFromDate;
      if (pdfToDate) paramsObj.to_date = pdfToDate;
      if (pdfFromTime) paramsObj.from_time = pdfFromTime;
      if (pdfToTime) paramsObj.to_time = pdfToTime;

      const response = await api.get(`/clinical/observations/${patientId}/pdf`, {
        params: paramsObj,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Continuous_ClinicalSheet_${patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Continuous PDF Downloaded", { id: 'pdf-toast' });
      setRangePdfModalOpen(false);
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF", { id: 'pdf-toast' });
    }
  };

  const handleShowVerify = async () => {
    setVerifyModalOpen(true);
    setVerifyResult(null);
    setVerifyInput('');
    if (docInfo) return;
    try {
      setDocInfoLoading(true);
      const res = await api.get(`/clinical/observations/${patientId}/checksum?queue_id=${queue_id}`);
      if (res.data?.success) setDocInfo(res.data);
    } catch (err) {
      toast.error("Could not load document checksum");
      setDocInfo(null);
    } finally {
      setDocInfoLoading(false);
    }
  };

  const handleVerify = async () => {
    const raw = verifyInput.trim();
    if (!raw) { toast.error('Enter a document code to verify.'); return; }
    const parts = raw.split('|');
    const checksumToVerify = parts.length === 2 ? parts[1].trim() : parts[0].trim();
    if (!checksumToVerify) { toast.error('Could not parse checksum.'); return; }
    try {
      setVerifying(true);
      setVerifyResult(null);
      const res = await api.get(
        `/clinical/observations/${patientId}/verify?queue_id=${queue_id}&checksum=${encodeURIComponent(checksumToVerify)}`
      );
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult({ verified: false, message: 'Verification failed.', error: true });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyChecksum = () => {
    if (!docInfo) return;
    navigator.clipboard.writeText(`${docInfo.docRef}|${docInfo.checksum}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFrequencies = async () => {
    if (frequencies.length) return;
    try {
      const res = await api.get('/ai/clinical/frequencies');
      if (res.data?.success) setFrequencies(res.data.data);
    } catch (_) { }
  };

  const openAiDrawer = () => { setAiDrawerOpen(true); loadFrequencies(); };

  const handleMedSuggest = async () => {
    const interventions = control._formValues.medication_mar?.interventions || [];
    const medicationNames = interventions.map(i => i.name).filter(n => n?.trim());
    if (!medicationNames.length) { toast.error('Enter at least one medication name first.'); return; }
    setMedSugLoading(true);
    try {
      const res = await api.post('/ai/clinical/medications', { medications: medicationNames });
      if (res.data?.success) {
        setMedSuggestions(res.data.data);
        toast.success('AI suggestions ready!');
      }
    } catch { toast.error('Failed to get suggestions.'); }
    finally { setMedSugLoading(false); }
  };

  const applyMedSuggestion = (sug, colIdx) => {
    const current = [...(control._formValues.medication_mar?.interventions || [])];
    if (current[colIdx]) {
      if (!current[colIdx].dose) current[colIdx].dose = sug.dose;
      if (!current[colIdx].route) current[colIdx].route = sug.route;
      if (!current[colIdx].frequency) current[colIdx].frequency = sug.frequency;
      reset({ ...control._formValues, medication_mar: { ...control._formValues.medication_mar, interventions: current } });
      toast.success(`Applied: ${sug.name}`);
    }
  };

  const handleApplyAI = async () => {
    try {
      const interventions = control._formValues.medication_mar?.interventions || [];
      const medicationNames = interventions.map(i => i.name).filter(n => n?.trim());
      if (!medicationNames.length) { toast.error('Enter at least one medication name first.'); return; }
      setAiLoading(true);
      const res = await api.post('/ai/clinical/medications', { medications: medicationNames });
      if (res.data?.success) {
        const suggestions = res.data.data;
        const current = [...interventions];
        let si = 0;
        current.forEach(item => {
          if (item.name?.trim()) {
            const sug = suggestions[si++];
            if (sug) {
              if (!item.dose) item.dose = sug.dose;
              if (!item.route) item.route = sug.route;
              if (!item.frequency) item.frequency = sug.frequency;
            }
          }
        });
        reset({ ...control._formValues, medication_mar: { ...control._formValues.medication_mar, interventions: current } });
        toast.success('AI doses & routes applied!');
      }
    } catch { toast.error('Failed to fetch AI suggestions.'); }
    finally { setAiLoading(false); }
  };

  const handleAIGenerateComments = async () => {
    setAiCommentsLoading(true);
    try {
      const vitals = control._formValues.triage || {};
      const res = await api.post('/ai/clinical/assessment', { vitals });
      if (res.data?.success) {
        reset({ ...control._formValues, triage: { ...control._formValues.triage, general_comments: res.data.data.comment } });
        toast.success('AI assessment generated');
      }
    } catch (err) {
      toast.error('Failed to generate assessment.');
    } finally { setAiCommentsLoading(false); }
  };

  const handleAIGenerateSBAR = async () => {
    setAiSbarLoading(true);
    try {
      const values = control._formValues;
      const res = await api.post('/ai/clinical/sbar', {
        identification: values.identification,
        triage: values.triage,
        progress_notes: values.progress_notes,
        medication_mar: values.medication_mar,
      });
      if (res.data?.success) {
        reset({ ...values, sbar: { ...values.sbar, content: res.data.data.sbar } });
        toast.success('AI SBAR generated');
      }
    } catch { toast.error('Failed to generate SBAR.'); }
    finally { setAiSbarLoading(false); }
  };

  const handleAIGenerateProgressNote = async () => {
    setAiProgressNoteLoading(true);
    try {
      const values = control._formValues;
      const res = await api.post('/ai/clinical/note', {
        vitals: values.triage,
        medications: values.medication_mar?.interventions,
        existingComments: values.triage?.general_comments,
      });
      if (res.data?.success) {
        const note = res.data.data.note;
        const currentNotes = [...(values.progress_notes || [])];
        const emptyIdx = currentNotes.findIndex(n => !n.note?.trim() && !n.datetime && !n.signature);
        const entry = { datetime: new Date().toISOString().slice(0, 16), note, signature: user?.fullName || 'AI Assisted' };
        if (emptyIdx >= 0) currentNotes[emptyIdx] = entry;
        else currentNotes.push(entry);
        reset({ ...values, progress_notes: currentNotes });
        toast.success('AI clinical note generated');
      }
    } catch { toast.error('Failed to generate note.'); }
    finally { setAiProgressNoteLoading(false); }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className={isEmbedded ? "font-sans pb-4" : "min-h-screen bg-slate-50 font-sans pb-10"}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          .sheet-container { box-shadow: none; border: none; padding: 0; width: 100%; max-width: 100%; }
        }
        .form-input { border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 12px; outline: none; width: 100%; color: #0f172a; background-color: #f8fafc; border-radius: 4px; }
        .form-input:focus { border-color: #1b669d; background-color: #ffffff; box-shadow: 0 0 0 2px rgba(27, 102, 157, 0.15); }
        .form-label { font-size: 12px; color: #334155; font-weight: 600; white-space: nowrap; margin-right: 4px; }
        .row-flex { display: flex; align-items: center; margin-bottom: 2px; }
        .section-header { background-color: #1b669d; color: #ffffff; padding: 7px 14px; font-weight: 800; font-size: 13px; margin-top: 14px; margin-bottom: 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.04em; border-left: 5px solid #134771; }
        .grid-layout { display: grid; grid-template-columns: auto 1fr; gap: 4px; align-items: center; }

        /* Anti-tampering Fine-Line Security Patterns */
        .anti-tamper-bg {
          position: relative;
          background-color: #ffffff;
          background-image: 
            radial-gradient(#1b669d 0.4px, transparent 0.4px), 
            radial-gradient(#64748b 0.4px, #ffffff 0.4px);
          background-size: 16px 16px;
          background-position: 0 0, 8px 8px;
        }

        .anti-tamper-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          overflow: hidden;
        }

        .anti-tamper-watermark-text {
          transform: rotate(-25deg);
          font-size: 28px;
          font-weight: 900;
          color: rgba(27, 102, 157, 0.035);
          letter-spacing: 0.25em;
          text-transform: uppercase;
          white-space: nowrap;
          word-spacing: 1.5em;
        }

        .security-stripe {
          background: repeating-linear-gradient(
            45deg,
            rgba(27, 102, 157, 0.025),
            rgba(27, 102, 157, 0.025) 12px,
            rgba(241, 245, 249, 0.6) 12px,
            rgba(241, 245, 249, 0.6) 24px
          );
        }
      `}</style>

      {/* Top Navigation Bar */}
      {!isEmbedded && (
        <div className="bg-slate-100 border-b p-3 flex justify-between items-center no-print">
          <button onClick={() => navigate(-1)} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded border shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-200 p-1 rounded-lg border border-slate-300">
            <button
              onClick={() => setViewMode('continuous')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-md transition-all ${viewMode === 'continuous' ? 'bg-white text-[#1b669d] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Activity className="h-3.5 w-3.5 text-[#1b669d]" /> Continuous Flowsheet ({historyObservations.length})
            </button>
            <button
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-md transition-all ${viewMode === 'form' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <Layers className="h-3.5 w-3.5 text-slate-700" /> 5-Step Nursing Process Form
            </button>
          </div>

          <div className="flex gap-2">
            {viewMode === 'form' && !isCompleted && (
              <>
                <button onClick={handleSubmit(onSubmit)} disabled={saving} className="flex items-center text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-4 py-1.5 rounded shadow-sm">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save Draft
                </button>
                <button onClick={handleDeclareCompleted} disabled={saving} className="flex items-center text-sm font-bold text-white bg-[#1b669d] hover:bg-[#155180] px-4 py-1.5 rounded shadow-sm">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />} Declare Completed
                </button>
              </>
            )}

            <button onClick={handleOpenRangePdfModal} className="flex items-center text-sm font-bold text-white bg-[#1b669d] hover:bg-[#155180] px-4 py-1.5 rounded shadow-sm">
              <FileText className="h-4 w-4 mr-2" /> Export PDF (Range)
            </button>

            <button onClick={handleShowVerify} className="flex items-center text-sm font-medium text-[#1b669d] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded border border-blue-200 shadow-sm">
              <ShieldCheck className="h-4 w-4 mr-1.5 text-[#1b669d]" /> Authenticate
            </button>
          </div>
        </div>
      )}

      {/* Main Container with Anti-Tamper Mesh & Solid Legacy Clinics Blue Banners */}
      <div className={isEmbedded ? "sheet-container anti-tamper-bg bg-white w-full p-4 relative" : "sheet-container anti-tamper-bg bg-white mx-auto mt-6 border border-slate-300 shadow-sm max-w-[1200px] p-8 pb-12 rounded-xl relative"}>
        
        {/* Anti-Tamper Copy-Evident Background Watermark */}
        <div className="anti-tamper-watermark">
          <span className="anti-tamper-watermark-text">
            OFFICIAL MEDICAL RECORD • DO NOT ALTER • AUDIT ENCRYPTED SECURITY PATTERN • OFFICIAL MEDICAL RECORD • DO NOT ALTER
          </span>
        </div>

        {/* Header Title Banner with Solid Legacy Clinics Blue (No Gradient) */}
        <div className="bg-[#1b669d] text-white p-4 rounded-xl mb-6 shadow-md border border-[#175685] flex justify-between items-center relative z-10 overflow-hidden">
          <div>
            <div className="flex items-center gap-2">
              <HeartPulse className="h-6 w-6 text-blue-100" />
              <h1 className="text-lg font-black tracking-wide text-white">PATIENT OBSERVATION RECORDS SHEET</h1>
            </div>
            <p className="text-[11px] text-blue-100 mt-0.5 font-medium tracking-wide">Continuous Nursing Process & Legal Clinical Flowsheet</p>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold bg-[#155180] text-blue-100 border border-blue-300/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="h-3 w-3 text-blue-200" /> AUDIT SEAL SECURED
              </span>
              <span className="text-xs font-mono font-bold bg-[#134771] text-white border border-blue-300/40 px-3 py-1 rounded-md">
                PID: {patientId}
              </span>
            </div>
            <p className="text-[11px] text-blue-50 font-semibold">
              {patient?.full_name || `${watch('identification.last_name')} ${watch('identification.first_name')}`}
            </p>
            {(watch('identification.attending_doctor') || patient?.attending_doctor || patient?.doctor_name) && (
              <span className="text-[10px] font-bold bg-[#155180] text-blue-100 border border-blue-300/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                <UserCheck className="h-3 w-3 text-blue-200" /> Dr. {(watch('identification.attending_doctor') || patient?.attending_doctor || patient?.doctor_name || '').replace(/^Dr\.\s*/i, '')}
              </span>
            )}
          </div>
        </div>

        {/* CONTINUOUS FLOWSHEET TIMELINE VIEW */}
        {viewMode === 'continuous' && (
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-center bg-blue-50/80 border border-blue-200 p-4 rounded-xl">
              <div>
                <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-700" /> Continuous Patient Flowsheet History
                </h2>
                <p className="text-xs text-slate-600">Chronological timeline of all nursing process entries and vital sign observations.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('form')}
                  className="bg-[#1b669d] hover:bg-[#155180] text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Nursing Entry
                </button>
                <button
                  onClick={handleOpenRangePdfModal}
                  className="bg-[#175685] hover:bg-[#12446a] text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <FileText className="h-4 w-4" /> Export Custom Range PDF
                </button>
              </div>
            </div>

            {historyObservations.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No Historical Observations Recorded Yet</p>
                <p className="text-xs text-slate-400 mb-4">Click below to record the first 5-step nursing process entry for this patient.</p>
                <button
                  onClick={() => setViewMode('form')}
                  className="bg-[#1b669d] hover:bg-[#155180] text-white text-xs font-bold px-4 py-2 rounded-lg inline-flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" /> Start 5-Step Nursing Process
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {historyObservations.map((obs, idx) => {
                  const obsIden = obs.identification || {};
                  const obsTriage = obs.triage || {};
                  const obsMar = obs.medication_mar || {};
                  const obsNotes = obs.progress_notes || [];
                  const np = obsTriage.nursing_process || obs.nursing_process || {};
                  const step1 = np.step1_assessment || {};
                  const step2 = np.step2_diagnosis || {};
                  const step3 = np.step3_planning || {};
                  const step4 = np.step4_implementation || {};
                  const step5 = np.step5_evaluation || {};

                  return (
                    <div key={obs.id || idx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-slate-300 transition-all">
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="bg-[#1b669d] text-white text-xs font-black px-2.5 py-1 rounded-md">
                            #{historyObservations.length - idx}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900">
                              {obsIden.date || ''} {obsIden.time || ''}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">(Queue ID: #{obs.queue_id || 'N/A'})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 font-medium">
                            Attending RN: <strong>{(obsIden.rn && obsIden.rn !== 'N/A' && obsIden.rn.trim() !== '') ? obsIden.rn : (obs.created_by_name || obs.created_by_username || user?.fullName || user?.name || user?.username || 'Duty RN Staff')}</strong>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${['Completed', 'Verified'].includes(obs.status) ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-slate-200 text-slate-800'
                            }`}>
                            {obs.status || 'Draft'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3 text-xs">
                        {/* 1. Assessment */}
                        <div className="border-l-4 border-[#1b669d] pl-3 py-1">
                          <p className="font-bold text-[#1b669d] uppercase text-[10px] tracking-wider mb-1">Step 1: Nursing Assessment (Subjective & Vitals)</p>
                          <p className="text-slate-700"><strong>Symptoms:</strong> {step1.subjective?.symptoms || obsIden.medical_note || 'Patient assessed.'}</p>
                          <div className="grid grid-cols-6 gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center font-mono">
                            <div><p className="text-[9px] text-slate-500">TEMP</p><p className="font-bold text-slate-900">{obsTriage.temp || '-'}</p></div>
                            <div><p className="text-[9px] text-slate-500">PULSE</p><p className="font-bold text-slate-900">{obsTriage.pulse || '-'}</p></div>
                            <div><p className="text-[9px] text-slate-500">RESP</p><p className="font-bold text-slate-900">{obsTriage.rr || '-'}</p></div>
                            <div><p className="text-[9px] text-slate-500">BP</p><p className="font-bold text-slate-900">{obsTriage.bp || '-'}</p></div>
                            <div><p className="text-[9px] text-slate-500">WEIGHT</p><p className="font-bold text-slate-900">{obsTriage.weight || '-'}</p></div>
                            <div><p className="text-[9px] text-slate-500">SPO2</p><p className="font-bold text-slate-900">{obsTriage.spo2 || '-'}</p></div>
                          </div>
                          {step1.physical_exam && Object.values(step1.physical_exam).some(v => !!v) && (
                            <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1">
                              <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Physical Exam Systems Findings:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(step1.physical_exam).map(([sysKey, val]) => {
                                  if (!val) return null;
                                  const title = PHYSICAL_EXAM_PRESETS[sysKey]?.title || sysKey.replace('_', ' ');
                                  return (
                                    <span key={sysKey} className="bg-sky-50 text-sky-900 border border-sky-200 px-2 py-0.5 rounded text-[10px]">
                                      <strong>{title}:</strong> {val}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. Diagnosis */}
                        <div className="border-l-4 border-[#175685] pl-3 py-1 bg-sky-50/50 rounded-r-lg">
                          <p className="font-bold text-[#175685] uppercase text-[10px] tracking-wider mb-1">Step 2: Nursing Diagnosis & 12 Activities of Living</p>
                          <p className="font-bold text-blue-950 text-xs">{step2.nursing_diagnosis_statement || obsIden.diagnosis || 'Standard Observation Care'}</p>
                          {step2.activities_of_living && step2.activities_of_living.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {step2.activities_of_living.map(act => (
                                <span key={act} className="bg-blue-100 text-blue-900 text-[10px] px-2 py-0.5 rounded font-medium border border-blue-200">
                                  {act}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 3. Planning */}
                        <div className="border-l-4 border-[#1b669d] pl-3 py-1">
                          <p className="font-bold text-[#1b669d] uppercase text-[10px] tracking-wider mb-1">Step 3: Planning & SMART Goals</p>
                          <p className="text-slate-700"><strong>Goal:</strong> {step3.smart_goals?.specific || 'Maintain vital stability.'}</p>
                          <p className="text-slate-600 text-[11px] mt-0.5"><strong>Planned Interventions:</strong> {step3.care_plan_interventions || 'Regular vitals monitoring & prescribed treatment.'}</p>
                        </div>

                        {/* 4. Implementation */}
                        <div className="border-l-4 border-[#175685] pl-3 py-1 bg-blue-50/40 rounded-r-lg">
                          <p className="font-bold text-[#175685] uppercase text-[10px] tracking-wider mb-1">Step 4: Implementation & MAR Log</p>
                          <p className="text-slate-700"><strong>Executed Care:</strong> {step4.care_plan_executed || 'Interventions initiated.'}</p>
                          {obsMar.interventions && obsMar.interventions.some(i => i.name) && (
                            <div className="mt-1.5 font-mono text-[11px] bg-white p-2 border border-slate-200 rounded">
                              <p className="font-bold text-slate-900 mb-1">Prescribed MAR Medications:</p>
                              {obsMar.interventions.filter(i => i.name).map((i, idx) => (
                                <div key={idx} className="flex justify-between border-b border-slate-100 py-0.5 last:border-0">
                                  <span>{i.name} ({i.dose})</span>
                                  <span className="text-slate-500">{i.route} • {i.frequency}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 5. Evaluation */}
                        <div className="border-l-4 border-blue-900 pl-3 py-1">
                          <p className="font-bold text-blue-950 uppercase text-[10px] tracking-wider mb-1">Step 5: Evaluation & Trend Progress</p>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">Goal Achievement:</span>
                            <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200">
                              {step5.goal_achievement_status || 'Ongoing'}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-1"><strong>Physical/Vital Trend:</strong> {step5.vital_physical_trend || obsTriage.general_comments || 'Monitored.'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5-STEP SEQUENTIAL NURSING PROCESS FORM */}
        {viewMode === 'form' && (
          <div className="relative z-10">
            {/* Step Wizard Tabs Header */}
            <div className="mb-6 bg-slate-100 p-1.5 rounded-xl flex border border-slate-200 no-print">
              {[
                { step: 1, label: '1. Assessment', icon: Stethoscope },
                { step: 2, label: '2. Diagnosis', icon: CheckSquare },
                { step: 3, label: '3. Planning', icon: Target },
                { step: 4, label: '4. Implementation', icon: ClipboardList },
                { step: 5, label: '5. Evaluation', icon: RefreshCw },
              ].map(s => {
                const Icon = s.icon;
                const isActive = activeFormStep === s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setActiveFormStep(s.step)}
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${isActive
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <fieldset disabled={sheetStatus === 'Verified'} className="border-0 p-0 m-0 min-w-0 disabled:opacity-100">

                {/* STEP 1: ASSESSMENT */}
                {activeFormStep === 1 && (
                  <div className="space-y-4">
                    <div className="section-header flex justify-between items-center pr-2">
                      <span>Step 1: Nursing Assessment (Initial Safety, Vitals & Physical Exam)</span>
                      <button
                        type="button"
                        onClick={() => setExamChecklistModalOpen(true)}
                        className="text-[10px] bg-[#1b669d] hover:bg-[#155180] text-white font-bold px-2.5 py-1 rounded shadow-sm flex items-center gap-1 transition-all"
                      >
                        <BookOpen className="h-3 w-3" /> Printable Physical Exam Checklist
                      </button>
                    </div>

                    {/* Safety Verification & Two Identifiers Banner */}
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-950">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-700" />
                        <span className="font-bold text-blue-950">Initial Safety Steps:</span>
                        <span className="text-slate-700">Hand hygiene performed & Two Unique Identifiers verified (Name & DoB)</span>
                      </div>
                    </div>

                    {/* Patient Identification Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <p className="text-xs font-black uppercase text-slate-800 tracking-wider">Demographics & Insurance</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="row-flex"><span className="form-label w-36">Last name <span className="text-red-500 font-bold ml-0.5">*</span></span><input {...register('identification.last_name')} className="form-input" /></div>
                        <div className="row-flex"><span className="form-label w-36">First name <span className="text-red-500 font-bold ml-0.5">*</span></span><input {...register('identification.first_name')} className="form-input" /></div>
                        <div className="row-flex"><span className="form-label w-36">Date of birth <span className="text-red-500 font-bold ml-0.5">*</span></span><input {...register('identification.dob')} type="date" className="form-input" /></div>
                        <div className="row-flex"><span className="form-label w-36">Gender <span className="text-red-500 font-bold ml-0.5">*</span></span><input {...register('identification.gender')} className="form-input" /></div>
                        <div className="row-flex"><span className="form-label w-36">National ID</span><input {...register('identification.national_id')} className="form-input" /></div>
                        <InsuranceField register={register} control={control} />
                        <div className="row-flex col-span-2 pt-1 border-t border-slate-200">
                          <span className="form-label w-36 font-bold text-blue-900 flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-blue-700" /> Attending Doctor
                          </span>
                          <div className="flex-1 flex gap-2">
                            <select 
                              {...register('identification.attending_doctor')} 
                              disabled={isCompleted} 
                              className="form-input font-bold text-blue-900 bg-blue-50/50 border-blue-200 cursor-pointer"
                              title="Attending physician selected from database providers table."
                            >
                              <option value="">-- Select Attending Doctor (Providers DB) --</option>
                              {watch('identification.attending_doctor') && 
                               !providersList.some(p => p.name === watch('identification.attending_doctor') || `Dr. ${p.name}` === watch('identification.attending_doctor')) && (
                                <option value={watch('identification.attending_doctor')}>
                                  {watch('identification.attending_doctor')} (Assigned)
                                </option>
                              )}
                              {providersList.map((prov) => {
                                const formattedName = (prov.name || '').startsWith('Dr') ? prov.name : `Dr. ${prov.name}`;
                                const specLabel = prov.specialization ? ` — ${prov.specialization}` : '';
                                return (
                                  <option key={prov.id} value={formattedName}>
                                    {formattedName}{specLabel}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                        <div className="row-flex col-span-2 pt-1 border-t border-slate-200">
                          <span className="form-label w-36 font-bold text-blue-900 flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-blue-700" /> Attending RN
                          </span>
                          <div className="flex-1 flex gap-2">
                            <input 
                              {...register('identification.rn')} 
                              disabled={isCompleted} 
                              className="form-input font-bold text-blue-900 bg-blue-50/50 border-blue-200"
                              placeholder="Registered Nurse name (e.g. RN Jane Doe)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Four Assessment Techniques Guide */}
                    <div className="p-3 bg-slate-100/90 border border-slate-200 rounded-xl space-y-1 text-xs">
                      <p className="font-black text-blue-950 uppercase text-[10px] tracking-wider mb-1">Four Standard Assessment Techniques & Sequence</p>
                      <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
                        <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-900">1. Inspection</div>
                        <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-900">2. Auscultation</div>
                        <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-900">3. Percussion</div>
                        <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-900">4. Palpation</div>
                      </div>
                      <p className="text-[10px] text-slate-600 italic mt-1">
                        * Standard order: Inspection → Palpation → Percussion → Auscultation. <strong>For Abdomen:</strong> Order changes to <strong>Inspection → Auscultation → Percussion → Palpation</strong> to avoid altering bowel sounds.
                      </p>
                    </div>

                    {/* Head-to-Toe Physical Evaluation Card */}
                    <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-800 tracking-wider">Head-to-Toe Physical Evaluation</p>
                          <p className="text-[11px] text-slate-500 font-medium">Hover over any assessment domain or field to view clinical guidelines</p>
                        </div>
                        {autosaveStatus && (
                          <span className="text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-blue-700" /> {autosaveStatus}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(PHYSICAL_EXAM_PRESETS).map(([key, domain]) => (
                          <div key={key} className="group relative space-y-1.5 bg-white p-3 border border-slate-200 rounded-lg shadow-2xs hover:border-slate-400 transition-colors">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-800 block">{domain.title}</label>
                              <span className="text-[10px] text-slate-400 font-normal italic opacity-0 group-hover:opacity-100 transition-opacity">Hover for guidance</span>
                            </div>
                            
                            {/* Hover Guideline Card */}
                            <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md">
                              <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline & Suggestions:</span>
                              {domain.guideline}
                            </div>

                            <select
                              disabled={isCompleted}
                              title={`Clinical Guideline: ${domain.guideline}`}
                              className="form-input text-xs font-medium bg-slate-50 border-slate-300 cursor-pointer"
                              onChange={(e) => {
                                if (e.target.value) {
                                  setValue(`triage.nursing_process.step1_assessment.physical_exam.${key}`, e.target.value);
                                  triggerAutosave(`triage.nursing_process.step1_assessment.physical_exam.${key}`, e.target.value);
                                }
                              }}
                            >
                              {domain.options.map((opt, i) => (
                                <option key={i} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>

                            <div className="flex flex-wrap gap-1 pt-1">
                              {domain.chips.map((chip, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  disabled={isCompleted}
                                  title={`Click to select preset: ${chip.value}`}
                                  onClick={() => {
                                    setValue(`triage.nursing_process.step1_assessment.physical_exam.${key}`, chip.value);
                                    triggerAutosave(`triage.nursing_process.step1_assessment.physical_exam.${key}`, chip.value);
                                  }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                                >
                                  {chip.label}
                                </button>
                              ))}
                            </div>

                            <input
                              {...register(`triage.nursing_process.step1_assessment.physical_exam.${key}`)}
                              disabled={isCompleted}
                              title={`Clinical Guideline: Enter custom ${domain.title} observations or additional clinical notes.`}
                              placeholder={`Custom ${domain.title} observations...`}
                              onChange={(e) => {
                                register(`triage.nursing_process.step1_assessment.physical_exam.${key}`).onChange(e);
                                triggerAutosave();
                              }}
                              className="form-input text-xs mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* StatPearls P-Q-R-S-T Pain Assessment & S-A-M-P-L-E History Card */}
                    <div className="p-4 bg-[#1b669d]/5 border border-[#1b669d]/30 rounded-xl space-y-3">
                      <div className="flex justify-between items-center border-b border-[#1b669d]/20 pb-2">
                        <p className="text-xs font-black uppercase text-[#155180] tracking-wider">
                          P-Q-R-S-T Pain Assessment & S-A-M-P-L-E Admission History (StatPearls Protocol)
                        </p>
                        <span className="text-[10px] font-bold bg-[#155180] text-white px-2 py-0.5 rounded shadow-2xs">
                          Evidence-Based Assessment Standard
                        </span>
                      </div>

                      {/* P-Q-R-S-T Pain Systematic Assessment */}
                      <div className="bg-white p-3 border border-slate-200 rounded-lg space-y-2">
                        <p className="font-bold text-[#155180] text-xs uppercase tracking-wide">P-Q-R-S-T Systematic Pain Assessment</p>
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">P - Provokes / Relieves</label>
                            <input
                              {...register('triage.nursing_process.step1_assessment.pqrst_pain.provoke')}
                              disabled={isCompleted}
                              placeholder="Triggers & relievers..."
                              className="form-input text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Q - Quality & Character</label>
                            <select
                              {...register('triage.nursing_process.step1_assessment.pqrst_pain.quality')}
                              disabled={isCompleted}
                              className="form-input text-xs"
                            >
                              <option value="">Select Quality</option>
                              <option value="Dull / Aching">Dull / Aching</option>
                              <option value="Sharp / Stabbing">Sharp / Stabbing</option>
                              <option value="Throbbing / Pulsating">Throbbing / Pulsating</option>
                              <option value="Burning / Searing">Burning / Searing</option>
                              <option value="Pressure / Tightness">Pressure / Tightness</option>
                              <option value="Cramping / Colicky">Cramping / Colicky</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">R - Region & Radiation</label>
                            <input
                              {...register('triage.nursing_process.step1_assessment.pqrst_pain.region')}
                              disabled={isCompleted}
                              placeholder="Location & radiation..."
                              className="form-input text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">S - Severity (0-10)</label>
                            <input
                              {...register('triage.nursing_process.step1_assessment.pqrst_pain.severity')}
                              disabled={isCompleted}
                              type="number"
                              min="0"
                              max="10"
                              placeholder="0 - 10"
                              className="form-input text-xs font-bold text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">T - Time & Duration</label>
                            <input
                              {...register('triage.nursing_process.step1_assessment.pqrst_pain.time')}
                              disabled={isCompleted}
                              placeholder="Onset & timing..."
                              className="form-input text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* S-A-M-P-L-E Admission History */}
                      <div className="bg-white p-3 border border-slate-200 rounded-lg space-y-2">
                        <p className="font-bold text-[#155180] text-xs uppercase tracking-wide">S-A-M-P-L-E Admission History</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">S - Signs & Symptoms</label>
                            <input {...register('triage.nursing_process.step1_assessment.sample_history.signs')} disabled={isCompleted} placeholder="Chief presentation..." className="form-input text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">A - Allergies & Reactions</label>
                            <input {...register('triage.nursing_process.step1_assessment.sample_history.allergies')} disabled={isCompleted} placeholder="Allergens & reaction type..." className="form-input text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">M - Reconciled Medications</label>
                            <input {...register('triage.nursing_process.step1_assessment.sample_history.meds')} disabled={isCompleted} placeholder="Pharmacy med list & OTC..." className="form-input text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">P - Past Medical & Surgical</label>
                            <input {...register('triage.nursing_process.step1_assessment.sample_history.pmh')} disabled={isCompleted} placeholder="Chronic conditions & surgeries..." className="form-input text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">L - Last Oral Intake</label>
                            <input {...register('triage.nursing_process.step1_assessment.sample_history.last_intake')} disabled={isCompleted} placeholder="Time & nature of meal..." className="form-input text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">E - Preceding Events</label>
                            <input {...register('triage.nursing_process.step1_assessment.sample_history.events')} disabled={isCompleted} placeholder="Events prior to admission..." className="form-input text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* StatPearls Evidence-Based Clinical Risk Screening Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <p className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Evidence-Based Clinical Risk Screening & Admission Scores
                      </p>
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        {/* Morse Fall Risk */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <label className="font-bold text-slate-800 text-[11px] block">Morse Fall Risk Score</label>
                          <select
                            {...register('triage.nursing_process.step1_assessment.risk_scores.morse_fall')}
                            disabled={isCompleted}
                            className="form-input text-xs font-bold"
                          >
                            <option value="">Select Fall Risk</option>
                            <option value="Low Risk (0 - 24)">Low Risk (Score 0 - 24)</option>
                            <option value="Moderate Risk (25 - 44)">Moderate Risk (Score 25 - 44)</option>
                            <option value="High Risk (45+)">High Risk (Score 45+)</option>
                          </select>
                        </div>

                        {/* Braden Pressure Injury Risk */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <label className="font-bold text-slate-800 text-[11px] block">Braden Pressure Injury Scale</label>
                          <select
                            {...register('triage.nursing_process.step1_assessment.risk_scores.braden_scale')}
                            disabled={isCompleted}
                            className="form-input text-xs font-bold"
                          >
                            <option value="">Select Braden Risk</option>
                            <option value="No Risk (19 - 23)">No Risk (19 - 23)</option>
                            <option value="Mild Risk (15 - 18)">Mild Risk (15 - 18)</option>
                            <option value="Moderate Risk (13 - 14)">Moderate Risk (13 - 14)</option>
                            <option value="High Risk (10 - 12)">High Risk (10 - 12)</option>
                            <option value="Very High Risk (9 or lower)">Very High Risk (Score 9 or lower)</option>
                          </select>
                        </div>

                        {/* Level of Consciousness (AVPU / GCS) */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <label className="font-bold text-slate-800 text-[11px] block">LOC (AVPU & GCS 3-15)</label>
                          <select
                            {...register('triage.nursing_process.step1_assessment.risk_scores.avpu_gcs')}
                            disabled={isCompleted}
                            className="form-input text-xs font-bold"
                          >
                            <option value="">Select LOC Level</option>
                            <option value="Alert (GCS 15/15)">Alert (GCS 15/15)</option>
                            <option value="Responds to Voice (GCS 12-14)">Responds to Voice (GCS 12-14)</option>
                            <option value="Responds to Pain (GCS 8-11)">Responds to Pain (GCS 8-11)</option>
                            <option value="Unresponsive (GCS under 8)">Unresponsive (GCS under 8)</option>
                          </select>
                        </div>

                        {/* Psychosocial / CIWA / CAGE */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                          <label className="font-bold text-slate-800 text-[11px] block">Psychosocial & Safety Screen</label>
                          <select
                            {...register('triage.nursing_process.step1_assessment.risk_scores.ciwa_cage')}
                            disabled={isCompleted}
                            className="form-input text-xs font-bold"
                          >
                            <option value="">Select Psychosocial Screen</option>
                            <option value="Standard / No Precautions">Standard / No Precautions</option>
                            <option value="Sitter / Video Monitor Needed">Sitter / Video Monitor Needed</option>
                            <option value="Fall & Confusion Precautions">Fall & Confusion Precautions</option>
                            <option value="CIWA Alcohol Withdrawal Screen Active">CIWA Alcohol Withdrawal Screen Active</option>
                            <option value="Suicide Risk Precautions Initiated">Suicide Risk Precautions Initiated</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Subjective Data Card */}
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                      <p className="text-xs font-black uppercase text-blue-900 tracking-wider">Subjective Information (Patient Interview & Symptoms)</p>
                      <div className="group relative">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Patient Reported Symptoms & Chief Complaint</label>
                        <textarea
                          {...register('triage.nursing_process.step1_assessment.subjective.symptoms')}
                          disabled={isCompleted}
                          title="Clinical Guideline: Document onset, duration, chief complaint, exacerbating factors, & symptom character in patient's own words."
                          className="form-input min-h-[50px] resize-none"
                        />
                        <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                          <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                          Document onset, duration, chief complaint, exacerbating factors, and symptom character in patient's own words.
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="group relative">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Pain Details (Location, Quality, Triggers)</label>
                          <input
                            {...register('triage.nursing_process.step1_assessment.subjective.pain_description')}
                            disabled={isCompleted}
                            title="Clinical Guideline: Record PQRST - Provoking factors, Quality (sharp/dull/burning), Region & Timing."
                            className="form-input"
                          />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                            <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                            Record PQRST - Provoking factors, Quality (sharp/dull/burning), Region, and Timing.
                          </div>
                        </div>
                        <div className="group relative">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Pain Score (0 - 10 scale)</label>
                          <input
                            {...register('triage.nursing_process.step1_assessment.subjective.pain_score')}
                            disabled={isCompleted}
                            type="number"
                            min="0"
                            max="10"
                            title="Clinical Guideline: Rate severity on a 0 (No Pain) to 10 (Worst Pain Imaginable) numerical scale."
                            className="form-input"
                          />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                            <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                            Rate severity on a 0 (No Pain) to 10 (Worst Pain Imaginable) numerical rating scale.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Objective Data & Vitals */}
                    <div className="p-4 bg-slate-50 border rounded-xl space-y-3">
                      <p className="text-xs font-black uppercase text-slate-700 tracking-wider">Objective Tangible Data & Vitals</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="group relative">
                          <input {...register('triage.prev_illness_med')} disabled={isCompleted} title="Clinical Guideline: Note chronic conditions and past medical diagnoses." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Medical History: </span> Note chronic conditions & past medical diagnoses.
                          </div>
                        </div>
                        <div className="group relative">
                          <input {...register('triage.prev_illness_surg')} disabled={isCompleted} title="Clinical Guideline: Note past surgical operations and procedures." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Surgical History: </span> Note past surgical operations & procedures.
                          </div>
                        </div>
                        <div className="group relative">
                          <input {...register('triage.allergy_1')} disabled={isCompleted} title="Clinical Guideline: Record primary allergen and specific reaction (e.g. Penicillin - Anaphylaxis)." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Known Allergy #1: </span> Primary allergen & reaction type.
                          </div>
                        </div>
                        <div className="group relative">
                          <input {...register('triage.allergy_2')} disabled={isCompleted} title="Clinical Guideline: Record secondary allergen and specific reaction." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Known Allergy #2: </span> Secondary allergen & reaction type.
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-6 gap-2 pt-2">
                        <div><label className="text-[10px] font-bold text-slate-600 block mb-1">Temp (°C) *</label><input {...register('triage.temp')} disabled={isCompleted} className="form-input text-center font-bold" /></div>
                        <div><label className="text-[10px] font-bold text-slate-600 block mb-1">Pulse (bpm) *</label><input {...register('triage.pulse')} disabled={isCompleted} className="form-input text-center font-bold" /></div>
                        <div><label className="text-[10px] font-bold text-slate-600 block mb-1">Resp Rate *</label><input {...register('triage.rr')} disabled={isCompleted} className="form-input text-center font-bold" /></div>
                        <div><label className="text-[10px] font-bold text-slate-600 block mb-1">BP (mmHg) *</label><input {...register('triage.bp')} disabled={isCompleted} className="form-input text-center font-bold" /></div>
                        <div><label className="text-[10px] font-bold text-slate-600 block mb-1">Weight (kg) *</label><input {...register('triage.weight')} disabled={isCompleted} className="form-input text-center font-bold" /></div>
                        <div><label className="text-[10px] font-bold text-slate-600 block mb-1">SpO2 (%) *</label><input {...register('triage.spo2')} disabled={isCompleted} className="form-input text-center font-bold" /></div>
                      </div>

                      <div className="group relative pt-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-slate-700">Triage Summary & General Comments *</label>
                          <button type="button" onClick={handleAIGenerateComments} disabled={aiCommentsLoading || isCompleted} className="text-[10px] bg-[#1b669d] hover:bg-[#155180] text-white font-bold px-2.5 py-0.5 rounded flex items-center shadow-2xs transition-all">
                            {aiCommentsLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} AI Assess Vitals
                          </button>
                        </div>
                        <textarea {...register('triage.general_comments')} disabled={isCompleted} title="Clinical Guideline: Synthesize overall clinical impression, distress level, vitals stability, and urgent care priorities." className="form-input min-h-[50px] resize-none" />
                        <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                          <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                          Synthesize overall clinical impression, distress level, vitals stability, and urgent care priorities.
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button type="button" onClick={() => setActiveFormStep(2)} className="bg-[#1b669d] hover:bg-[#155180] text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all">
                        Next: Step 2 Diagnosis <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: DIAGNOSIS */}
                {activeFormStep === 2 && (
                  <div className="space-y-4">
                    <div className="section-header">Step 2: Nursing Diagnosis & 12 Activities of Living</div>

                    <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-xl space-y-3">
                      <p className="text-xs font-black uppercase text-blue-950 tracking-wider">Select Impacted Activities of Living </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ACTIVITIES_OF_LIVING.map(act => {
                          const isSelected = selectedActivities.includes(act);
                          return (
                            <button
                              key={act}
                              type="button"
                              onClick={() => toggleActivityOfLiving(act)}
                              disabled={isCompleted}
                              className={`p-2 rounded-lg text-left text-xs font-medium border transition-all ${isSelected
                                ? 'bg-blue-900 text-white border-blue-950 shadow-sm font-bold'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                                }`}
                            >
                              {act}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <p className="text-xs font-black uppercase text-slate-800 tracking-wider">Nursing Diagnosis Statement & Patient Impact</p>

                      <div className="group relative">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Nursing Diagnosis Statement *</label>
                        <input
                          {...register('triage.nursing_process.step2_diagnosis.nursing_diagnosis_statement')}
                          disabled={isCompleted}
                          title="Clinical Guideline: NANDA format: Problem related to Etiology as evidenced by Symptoms."
                          className="form-input font-bold text-blue-950"
                        />
                        <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                          <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                          State human response related to etiology as evidenced by signs/symptoms (NANDA standard).
                        </div>
                      </div>

                      <div className="group relative">
                        <label className="text-xs font-bold text-slate-700 block mb-1">ICD-11 / Clinical Medical Diagnosis</label>
                        <input
                          {...register('identification.diagnosis')}
                          disabled={!isPrescriber || isCompleted}
                          title="Clinical Guideline: Primary medical diagnosis as determined by attending physician."
                          className="form-input"
                        />
                        <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                          <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                          Primary ICD-11 or clinical medical diagnosis determined by attending medical staff.
                        </div>
                      </div>

                      <div className="group relative">
                        <label className="text-xs font-bold text-slate-700 block mb-1">Impact on Patient Situation, Baseline Condition & Goals</label>
                        <textarea
                          {...register('triage.nursing_process.step2_diagnosis.patient_needs_goals_impact')}
                          disabled={isCompleted}
                          title="Clinical Guideline: Detail how condition impairs daily activities, mobility, or physiological stability."
                          className="form-input min-h-[50px] resize-none"
                        />
                        <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                          <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                          Detail how the diagnosis impairs daily living, patient independence, or physiological stability.
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button type="button" onClick={() => setActiveFormStep(1)} className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg">
                        Back: Step 1
                      </button>
                      <button type="button" onClick={() => setActiveFormStep(3)} className="bg-[#1b669d] hover:bg-[#155180] text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all">
                        Next: Step 3 Planning <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: PLANNING */}
                {activeFormStep === 3 && (
                  <div className="space-y-4">
                    <div className="section-header">Step 3: Planning & Formulation of SMART Care Goals</div>

                    <div className="p-4 bg-slate-100/90 border border-slate-200 rounded-xl space-y-3">
                      <p className="text-xs font-black uppercase text-slate-900 tracking-wider">SMART Care Goals (Specific, Measurable, Attainable, Realistic, Timely)</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="group relative">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Specific Goal</label>
                          <input {...register('triage.nursing_process.step3_planning.smart_goals.specific')} disabled={isCompleted} title="Clinical Guideline: Define precise target outcome." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Specific: </span> Define precise desired physiological/functional outcome.
                          </div>
                        </div>
                        <div className="group relative">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Measurable Target Metric</label>
                          <input {...register('triage.nursing_process.step3_planning.smart_goals.measurable')} disabled={isCompleted} title="Clinical Guideline: Define quantifiable metric (e.g. SpO2 >= 95%, Pain <= 2/10)." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Measurable: </span> Quantifiable target metric or scale value.
                          </div>
                        </div>
                        <div className="group relative">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Attainable Action</label>
                          <input {...register('triage.nursing_process.step3_planning.smart_goals.attainable')} disabled={isCompleted} title="Clinical Guideline: Actionable interventions within nursing scope." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Attainable: </span> Actionable nursing intervention within resources.
                          </div>
                        </div>
                        <div className="group relative">
                          <label className="text-xs font-bold text-slate-700 block mb-1">Timely Target Window</label>
                          <input {...register('triage.nursing_process.step3_planning.smart_goals.timely')} disabled={isCompleted} title="Clinical Guideline: Timeframe to achieve goal (e.g. within 2 hours, by end of shift)." className="form-input" />
                          <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-1.5 rounded-md border border-sky-800 shadow-md mt-0.5">
                            <span className="font-bold text-blue-300">Timely: </span> Specific target timeframe or shift deadline.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="group relative p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Written Course of Interventions & Guidelines</label>
                      <textarea
                        {...register('triage.nursing_process.step3_planning.care_plan_interventions')}
                        disabled={isCompleted}
                        title="Clinical Guideline: Outline nursing care protocols, positioning, monitoring frequency, and patient education."
                        className="form-input min-h-[60px] resize-none"
                      />
                      <div className="hidden group-hover:block transition-all bg-sky-950 text-sky-50 text-[11px] p-2 rounded-md border border-sky-800 shadow-md mt-1">
                        <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline:</span>
                        Outline planned nursing care protocols, positioning, monitoring schedules, and family education.
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button type="button" onClick={() => setActiveFormStep(2)} className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg">
                        Back: Step 2
                      </button>
                      <button type="button" onClick={() => setActiveFormStep(4)} className="bg-[#1b669d] hover:bg-[#155180] text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all">
                        Next: Step 4 Implementation <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: IMPLEMENTATION */}
                {activeFormStep === 4 && (
                  <div className="space-y-4">
                    <div className="section-header flex justify-between items-center pr-2">
                      <span>Step 4: Implementation & MAR Administration</span>
                      <button type="button" onClick={handleApplyAI} disabled={aiLoading || isCompleted} className="text-[10px] bg-[#175685] hover:bg-[#12446a] text-white font-bold px-2.5 py-1 rounded flex items-center transition-all">
                        {aiLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Suggest Doses
                      </button>
                    </div>

                    <div className="p-4 bg-blue-50/30 border border-blue-200 rounded-xl space-y-2">
                      <label className="text-xs font-bold text-blue-950 block">Care Interventions Executed</label>
                      <textarea
                        {...register('triage.nursing_process.step4_implementation.care_plan_executed')}
                        disabled={isCompleted}
                        className="form-input min-h-[50px] resize-none"
                        placeholder="e.g. Nebuliser salbutamol administered, patient positioned upright with 3 pillows..."
                      />
                    </div>

                    {/* MAR Medication Table */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700">Medication Administration Record (MAR)</p>
                      <datalist id="inventory-list">
                        {inventoryItems.map((item, i) => <option key={i} value={item} />)}
                      </datalist>
                      <table className="w-full border-collapse border border-slate-300 text-xs text-center">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-slate-300 p-1 w-24">Field</th>
                            <th className="border border-slate-300 p-1">Medication 1</th>
                            <th className="border border-slate-300 p-1">Medication 2</th>
                            <th className="border border-slate-300 p-1">Medication 3</th>
                            <th className="border border-slate-300 p-1">Medication 4</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Name', 'Dose', 'Frequency', 'Route', 'Start Time', 'End Time'].map((rowLabel, rIdx) => {
                            const keys = ['name', 'dose', 'frequency', 'route', 'start_time', 'end_time'];
                            const isTimeRow = rIdx === 4 || rIdx === 5;
                            return (
                              <tr key={rowLabel}>
                                <td className="border border-slate-300 p-1 font-bold bg-slate-50 text-left">{rowLabel}</td>
                                {[0, 1, 2, 3].map((colIdx) => (
                                  <td key={colIdx} className="border border-slate-300 p-1">
                                    {rIdx === 0 ? (
                                      <input disabled={isCompleted} {...register(`medication_mar.interventions.${colIdx}.${keys[rIdx]}`)} list="inventory-list" className="w-full border-none outline-none text-center bg-transparent font-medium" placeholder="Type medication name..." />
                                    ) : isTimeRow ? (
                                      <select disabled={isCompleted} {...register(`medication_mar.interventions.${colIdx}.${keys[rIdx]}`)} className="w-full border-none outline-none text-center bg-transparent text-[11px] font-medium">
                                        {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                      </select>
                                    ) : (
                                      <input disabled={isCompleted} {...register(`medication_mar.interventions.${colIdx}.${keys[rIdx]}`)} className="w-full border-none outline-none text-center bg-transparent font-medium" placeholder="Type detail..." />
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="flex gap-4 pt-2">
                        <table className="border-collapse border border-slate-300 text-xs text-center w-[250px]">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-slate-300 p-1">Given Time</th>
                              <th className="border border-slate-300 p-1">Initials</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logFields.map((field, idx) => (
                              <tr key={field.id}>
                                <td className="border border-slate-300 p-0">
                                  <select {...register(`medication_mar.admin_logs.${idx}.time`)} className="w-full border-none outline-none text-center h-5 text-[10px]">
                                    {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                </td>
                                <td className="border border-slate-300 p-0"><input {...register(`medication_mar.admin_logs.${idx}.initials`)} className="w-full border-none outline-none text-center h-5 text-[10px]" /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex-1 space-y-2">
                          <input {...register('medication_mar.admin_initials')} placeholder="Administering Initials" className="form-input" />
                          <input {...register('medication_mar.admin_names')} placeholder="Administering Nurse Full Names" className="form-input" />
                          <button type="button" onClick={() => appendLog({ time: '', initials: '' })} className="text-blue-700 text-xs font-bold flex items-center">
                            <Plus className="h-3 w-3 mr-1" /> Add Admin Log Row
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button type="button" onClick={() => setActiveFormStep(3)} className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg">
                        Back: Step 3
                      </button>
                      <button type="button" onClick={() => setActiveFormStep(5)} className="bg-[#1b669d] hover:bg-[#155180] text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 transition-all">
                        Next: Step 5 Evaluation <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 5: EVALUATION */}
                {activeFormStep === 5 && (
                  <div className="space-y-4">
                    <div className="section-header">Step 5: Evaluation & Outcome Re-Assessment</div>

                    <div className="p-4 bg-slate-100/90 border border-slate-200 rounded-xl space-y-3">
                      <p className="text-xs font-black uppercase text-slate-900 tracking-wider">Evaluate Outcome vs SMART Goals</p>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Goal Achievement Status *</label>
                        <select
                          {...register('triage.nursing_process.step5_evaluation.goal_achievement_status')}
                          disabled={isCompleted}
                          className="form-input font-bold text-blue-950"
                        >
                          <option value="Met">Met — Target achieved fully</option>
                          <option value="Partially Met">Partially Met — Progress observed</option>
                          <option value="Unmet">Unmet — No significant improvement</option>
                          <option value="Ongoing">Ongoing — Active intervention continuing</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Physical Observation & Vital Trend Improvement *</label>
                        <textarea
                          {...register('triage.nursing_process.step5_evaluation.vital_physical_trend')}
                          disabled={isCompleted}
                          className="form-input min-h-[60px] resize-none"
                          placeholder="e.g. SpO2 improved from 87% to 92%, reduced coughing & respiratory secretions, patient calmer..."
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Care Plan Modifications / Future Re-Assessment</label>
                        <textarea
                          {...register('triage.nursing_process.step5_evaluation.care_plan_modification')}
                          disabled={isCompleted}
                          className="form-input min-h-[50px] resize-none"
                          placeholder="e.g. Continue nebuliser q6h, re-evaluate vitals at 18:00..."
                        />
                      </div>
                    </div>

                    {/* Additional Notes & SBAR Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-2xs">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                            <ClipboardList className="h-4 w-4 text-blue-600" /> Clinical Progress Notes & Handover SBAR
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">Record chronologically ordered nursing progress entries and handover notes</p>
                        </div>
                      </div>

                      {/* Progress Notes Section */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            Clinical Progress Notes <span className="text-red-500 font-bold">*</span>
                          </span>
                          <button 
                            type="button" 
                            onClick={handleAIGenerateProgressNote} 
                            disabled={aiProgressNoteLoading || isCompleted} 
                            className="text-[11px] bg-blue-900 hover:bg-slate-900 text-white font-bold px-3 py-1 rounded-md shadow-2xs flex items-center gap-1 transition-all disabled:opacity-50"
                          >
                            {aiProgressNoteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-blue-200" />} AI Note Assistant
                          </button>
                        </div>

                        {/* Quick Preset Note Chips */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mr-1">Quick Presets:</span>
                          {[
                            { label: 'Vitals & Stable', text: 'Patient assessed. Vital signs stable and within normal parameters. Patient comfortable in bed.' },
                            { label: 'Meds Administered', text: 'Prescribed medications administered per MAR protocol. No adverse reactions observed.' },
                            { label: 'Dressing & Wound', text: 'Wound dressing inspected; clean, dry, and intact with no signs of infection or drainage.' },
                            { label: 'MD Notified', text: 'Attending physician notified of current patient clinical status and assessment findings.' }
                          ].map((preset, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              disabled={isCompleted}
                              onClick={() => {
                                const currentNotes = control._formValues.progress_notes || [];
                                const lastIdx = currentNotes.length - 1;
                                const newEntry = { 
                                  datetime: new Date().toISOString().slice(0, 16), 
                                  note: preset.text, 
                                  signature: user?.fullName || 'RN' 
                                };
                                if (lastIdx >= 0 && !currentNotes[lastIdx]?.note?.trim()) {
                                  currentNotes[lastIdx] = newEntry;
                                  reset({ ...control._formValues, progress_notes: [...currentNotes] });
                                } else {
                                  appendProgress(newEntry);
                                }
                                triggerAutosave();
                              }}
                              className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer"
                            >
                              + {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Progress Note Entries List */}
                        <div className="space-y-3">
                          {progressFields.map((field, idx) => (
                            <div key={field.id} className="group relative bg-white p-3 border border-slate-200 rounded-lg shadow-2xs space-y-2 hover:border-slate-300 transition-colors">
                              {/* Header Row: Date/Time + Signature + Delete */}
                              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-[11px] font-bold text-slate-600">Date & Time:</span>
                                  <input
                                    {...register(`progress_notes.${idx}.datetime`)}
                                    type="datetime-local"
                                    disabled={isCompleted}
                                    className="form-input text-xs font-semibold bg-slate-50 border-slate-300 rounded px-2 py-0.5 w-44"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-[11px] font-bold text-slate-600">Nurse Signature:</span>
                                    <input
                                      {...register(`progress_notes.${idx}.signature`)}
                                      disabled={isCompleted}
                                      className="form-input text-xs font-medium bg-slate-50 border-slate-300 rounded px-2 py-0.5 w-40"
                                      title="Clinical Guideline: Nurse signature and credentials (e.g. Jane Doe, RN)."
                                    />
                                  </div>

                                  {progressFields.length > 1 && !isCompleted && (
                                    <button
                                      type="button"
                                      onClick={() => removeProgress(idx)}
                                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                      title="Delete Progress Note Entry"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Textarea Narrative */}
                              <div className="relative">
                                <textarea
                                  {...register(`progress_notes.${idx}.note`)}
                                  disabled={isCompleted}
                                  title="Clinical Guideline: Document objective observations, nursing interventions performed, and patient outcome."
                                  onChange={(e) => {
                                    register(`progress_notes.${idx}.note`).onChange(e);
                                    triggerAutosave();
                                  }}
                                  className="form-input min-h-[55px] resize-none text-xs leading-relaxed"
                                />
                                {/* Hover Guideline Card */}
                                <div className="hidden group-hover:block transition-all bg-slate-900 text-white text-[11px] p-2 rounded-md border border-slate-700 shadow-md mt-1">
                                  <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline & Suggestions:</span>
                                  Document time-stamped narrative nursing observations, patient responses to treatment, and clinical handovers.
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            disabled={isCompleted}
                            onClick={() => appendProgress({ datetime: new Date().toISOString().slice(0, 16), note: '', signature: user?.fullName || '' })}
                            className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/40 text-blue-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Plus className="h-4 w-4" /> Add Additional Clinical Progress Note Entry
                          </button>
                        </div>
                      </div>

                      {/* Handover SBAR Section */}
                      <div className="pt-3 border-t border-slate-200 group relative">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            SBAR Hand Over Summary <span className="text-red-500 font-bold">*</span>
                          </span>
                          <button 
                            type="button" 
                            onClick={handleAIGenerateSBAR} 
                            disabled={aiSbarLoading || isCompleted} 
                            className="text-[11px] bg-blue-900 hover:bg-slate-900 text-white font-bold px-3 py-1 rounded-md shadow-2xs flex items-center gap-1 transition-all disabled:opacity-50"
                          >
                            {aiSbarLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-blue-200" />} AI SBAR Assistant
                          </button>
                        </div>
                        <textarea
                          {...register('sbar.content')}
                          disabled={isCompleted}
                          title="Clinical Guideline: Structure handover using SBAR format: Situation, Background, Assessment, Recommendation."
                          onChange={(e) => {
                            register('sbar.content').onChange(e);
                            triggerAutosave();
                          }}
                          className="form-input min-h-[85px] resize-none text-xs leading-relaxed"
                        />
                        <div className="hidden group-hover:block transition-all bg-slate-900 text-white text-[11px] p-2 rounded-md border border-slate-700 shadow-md mt-1">
                          <span className="font-bold text-blue-300 block mb-0.5">Clinical Guideline & Suggestions:</span>
                          Structure shift handovers using SBAR format — Situation (current state), Background (history), Assessment (findings), and Recommendation (next actions).
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <button type="button" onClick={() => setActiveFormStep(4)} className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg">
                        Back: Step 4
                      </button>

                      <div className="flex gap-2">
                        {!isCompleted && (
                          <>
                            <button type="button" onClick={handleSubmit(onSubmit)} disabled={saving} className="bg-white border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg">
                              Save Draft
                            </button>
                            <button type="button" onClick={handleDeclareCompleted} disabled={saving} className="bg-blue-900 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-md">
                              <CheckCircle className="h-4 w-4" /> Declare Completed
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </fieldset>
            </form>
          </div>
        )}
      </div>

      {/* DATE & TIME RANGE PDF EXPORT MODAL */}
      {rangePdfModalOpen && (
        <Modal
          isOpen={rangePdfModalOpen}
          onClose={() => setRangePdfModalOpen(false)}
          title="Export Continuous Patient Clinical Sheet (PDF)"
          maxWidth="580px"
        >
          <div className="space-y-4 text-xs">
            {/* Visual Indicator of Observation Dates */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-blue-700" /> Patient Observation Dates ({observationDates.length})
                </p>
                <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md">
                  Export Restricted to Observation Dates
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Click an observation date below to set the timeframe. Only dates when the patient was placed under observation can be exported.
              </p>

              {/* Date Indicators Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {loadingObsDates ? (
                  <div className="flex items-center gap-2 text-slate-500 italic py-1 text-[11px]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching patient observation dates...
                  </div>
                ) : observationDates.length > 0 ? (
                  observationDates.map((item, idx) => {
                    const isSelected = pdfFromDate === item.date && pdfToDate === item.date;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPdfFromDate(item.date);
                          setPdfToDate(item.date);
                          fetchAttendedPersonnel(item.date, item.date, pdfFromTime, pdfToTime);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-left text-[11px] font-bold transition-all flex items-center gap-2 shadow-2xs ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-900 ring-2 ring-blue-300'
                            : 'bg-white text-slate-800 border-blue-200 hover:bg-blue-100/60'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-blue-600'}`} />
                        <span>🗓️ {item.formatted}</span>
                        <span className={`text-[10px] font-normal ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          ({item.recordCount} record{item.recordCount > 1 ? 's' : ''})
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] font-medium flex items-center gap-2 w-full">
                    <span>⚠️ No recorded observation dates found for this patient.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-4 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1.5 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-blue-700" /> From Date & Time
                </label>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={pdfFromDate} 
                    onChange={e => {
                      setPdfFromDate(e.target.value);
                      fetchAttendedPersonnel(e.target.value, pdfToDate, pdfFromTime, pdfToTime);
                    }} 
                    className="form-input flex-1 font-medium" 
                  />
                  <input type="time" value={pdfFromTime} onChange={e => setPdfFromTime(e.target.value)} className="form-input w-24 font-medium" />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-800 block mb-1.5 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-blue-700" /> To Date & Time
                </label>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={pdfToDate} 
                    onChange={e => {
                      setPdfToDate(e.target.value);
                      fetchAttendedPersonnel(pdfFromDate, e.target.value, pdfFromTime, pdfToTime);
                    }} 
                    className="form-input flex-1 font-medium" 
                  />
                  <input type="time" value={pdfToTime} onChange={e => setPdfToTime(e.target.value)} className="form-input w-24 font-medium" />
                </div>
              </div>
            </div>

            {/* Validation Warning if selected date has no observation records */}
            {(() => {
              if (observationDates.length === 0) return null;
              const validDates = observationDates.map(d => d.date);
              const hasMatch = validDates.some(vd => {
                if (pdfFromDate && pdfToDate) return vd >= pdfFromDate && vd <= pdfToDate;
                if (pdfFromDate) return vd >= pdfFromDate;
                if (pdfToDate) return vd <= pdfToDate;
                return true;
              });

              if (!hasMatch) {
                return (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-[11px] font-semibold flex items-start gap-2">
                    <span className="text-base">🚫</span>
                    <div>
                      <p className="font-bold text-red-950">Export Restricted to Observation Dates</p>
                      <p className="text-[10px] text-red-800 mt-0.5">
                        No observation records were logged for this patient on the selected date range ({pdfFromDate || 'Start'} to {pdfToDate || 'End'}). Please click one of the observation date indicators above to export valid patient records.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Attended Personnel Live Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Attended Medical Personnel Roster Preview</span>
                <button type="button" onClick={() => fetchAttendedPersonnel()} className="text-[10px] text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {fetchingPersonnel ? <Loader2 className="h-3 w-3 animate-spin text-slate-600" /> : <RefreshCw className="h-3 w-3 text-slate-600" />} Refresh Roster
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="font-bold text-slate-700 text-[11px] mb-1.5">Attended Doctors ({attendedPersonnel.doctors.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {attendedPersonnel.doctors.length > 0 ? (
                      attendedPersonnel.doctors.map((d, i) => (
                        <span key={i} className="bg-sky-50 text-sky-900 text-[10px] font-bold px-2.5 py-1 rounded-md border border-sky-200">{d}</span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">None detected in range</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-[11px] mb-1.5">Registered Nurses ({attendedPersonnel.nurses.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {attendedPersonnel.nurses.length > 0 ? (
                      attendedPersonnel.nurses.map((n, i) => (
                        <span key={i} className="bg-emerald-50 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-200">{n}</span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">None detected in range</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
              <button type="button" onClick={() => setRangePdfModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button 
                type="button" 
                onClick={handleDownloadPdf} 
                disabled={
                  observationDates.length > 0 && 
                  !observationDates.some(vd => {
                    if (pdfFromDate && pdfToDate) return vd.date >= pdfFromDate && vd.date <= pdfToDate;
                    if (pdfFromDate) return vd.date >= pdfFromDate;
                    if (pdfToDate) return vd.date <= pdfToDate;
                    return true;
                  })
                }
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 shadow-sm"
              >
                <FileText className="h-4 w-4" /> Download PDF Document
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DOCUMENT VERIFICATION MODAL */}
      {verifyModalOpen && (
        <Modal
          isOpen={verifyModalOpen}
          onClose={() => setVerifyModalOpen(false)}
          title="Document Authentication & Verification"
          maxWidth="500px"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
              {docInfoLoading ? (
                <div className="w-16 h-16 flex items-center justify-center text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : docInfo?.qrCodeDataUrl ? (
                <img src={docInfo.qrCodeDataUrl} alt="QR Code" className="w-16 h-16 border rounded bg-white shadow-sm" />
              ) : (
                <div className="w-16 h-16 bg-white border rounded flex items-center justify-center text-slate-400"><QrCode className="h-8 w-8 opacity-50" /></div>
              )}
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Document SHA-256 Checksum</p>
                <div className="flex items-center justify-between bg-white border rounded text-xs px-3 py-1.5 font-mono text-slate-700 shadow-inner">
                  {docInfoLoading ? 'Loading...' : (docInfo?.checksum || 'N/A')}
                  {docInfo?.checksum && (
                    <button onClick={handleCopyChecksum} className="text-slate-400 hover:text-emerald-600">
                      {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-slate-600 mb-2">Scan QR code or enter document checksum to verify authenticity.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. LC-CLN-00001|A1B2C3D4..."
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-xs font-mono"
                />
                <button onClick={handleVerify} disabled={verifying || !verifyInput.trim()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authenticate'}
                </button>
              </div>
            </div>

            {verifyResult && (
              <div className={`p-3 rounded-xl border ${verifyResult.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                <p className="font-bold">{verifyResult.message}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MISSING FIELDS MODAL */}
      {missingModalOpen && (
        <Modal
          isOpen={missingModalOpen}
          onClose={() => setMissingModalOpen(false)}
          title="Cannot Declare Completed"
          maxWidth="500px"
        >
          <div className="p-2 text-xs space-y-3">
            <p className="font-bold text-rose-700">Missing Required Clinical Information ({missingFieldsList.length}):</p>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {missingFieldsList.map((item, idx) => (
                <li key={idx} className="bg-rose-50 text-rose-800 p-2 rounded border border-rose-100 font-medium">
                  • {item}
                </li>
              ))}
            </ul>
            <div className="flex justify-end pt-2">
              <button onClick={() => setMissingModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg">
                Continue Editing
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PRINTABLE PHYSICAL EXAMINATION CHECKLIST MODAL */}
      {examChecklistModalOpen && (
        <Modal
          isOpen={examChecklistModalOpen}
          onClose={() => setExamChecklistModalOpen(false)}
          title="Printable Nursing Physical Examination Guide & Checklist"
          maxWidth="680px"
        >
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center bg-[#1b669d] text-white p-3.5 rounded-xl">
              <div>
                <p className="font-black text-xs text-blue-100">NURSING PHYSICAL & MENTAL EXAMINATION GUIDE</p>
                <p className="text-[11px] text-blue-100/90">Systematic Evaluation Standards • Clinical Practice Format</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-[#155180] hover:bg-[#134771] text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs shadow-sm no-print"
              >
                <Printer className="h-3.5 w-3.5" /> Print Checklist
              </button>
            </div>

            {/* Initial Safety Steps */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
              <p className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider">1. Initial Safety Steps</p>
              <ul className="space-y-1 text-emerald-800 text-[11px]">
                <li className="flex items-center gap-2">✔ <strong>Hand Hygiene:</strong> Clean hands before entering room & between patient tasks.</li>
                <li className="flex items-center gap-2">✔ <strong>Identify Patient:</strong> Use two unique identifiers (Full Name & Date of Birth).</li>
                <li className="flex items-center gap-2">✔ <strong>Vital Signs Baseline:</strong> Measure BP, Pulse, Resp Rate, SpO2, and Temp.</li>
              </ul>
            </div>

            {/* Four Assessment Techniques */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
              <p className="font-bold text-indigo-900 uppercase text-[10px] tracking-wider">2. Four Standard Assessment Techniques</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded border border-indigo-200">
                  <p className="font-bold text-indigo-900">Inspection (1st Order)</p>
                  <p className="text-slate-600 text-[10px]">Observe color, size, shape, symmetry with visual examination.</p>
                </div>
                <div className="bg-white p-2 rounded border border-indigo-200">
                  <p className="font-bold text-indigo-900">Auscultation</p>
                  <p className="text-slate-600 text-[10px]">Listen to internal body sounds (heart, breath, 4-quadrant bowel sounds).</p>
                </div>
                <div className="bg-white p-2 rounded border border-indigo-200">
                  <p className="font-bold text-indigo-900">Percussion</p>
                  <p className="text-slate-600 text-[10px]">Tap body parts to evaluate underlying fluid, air, or dullness.</p>
                </div>
                <div className="bg-white p-2 rounded border border-indigo-200">
                  <p className="font-bold text-indigo-900">Palpation</p>
                  <p className="text-slate-600 text-[10px]">Touch hands to feel temperature, moisture, tenderness, & pulses.</p>
                </div>
              </div>
              <p className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 font-medium">
                <strong>Abdomen Special Rule:</strong> Sequence changes to <strong>Inspection → Auscultation → Percussion → Palpation</strong> so palpation does not alter bowel sounds.
              </p>
            </div>

            {/* Head to Toe Flow - 8 Systems */}
            <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
              <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">3. Head-to-Toe 8-System Clinical Evaluation</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">1. Head, Neck & HEENT:</span> PERRLA pupils, cranial symmetry, oral mucosa, neck lymph nodes, neck supple.
                </div>
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">2. Neurological & Mental:</span> AVPU level, GCS (15/15), orientation x4, speech clarity, motor reflexes.
                </div>
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">3. Cardiovascular:</span> S1/S2 heart sounds, apical pulse, regular rhythm, cap refill (&lt;2s), pulses (2+).
                </div>
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">4. Respiratory (PIPPA):</span> Clear breath sounds bilaterally, chest expansion, work of breathing, O2 support.
                </div>
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">5. Gastrointestinal:</span> Bowel sounds x4 (LRQ clockwise), contour, soft non-tender palpation, bowel habit.
                </div>
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">6. Genitourinary & Renal:</span> Spontaneous voiding, urine clarity/color, Foley catheter patent, CVA tenderness.
                </div>
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">7. Skin & Integumentary:</span> Color, temperature, turgor, Braden score, pressure injuries, surgical dressing intact.
                </div>
                <div className="border-b pb-1">
                  <span className="font-bold text-slate-900 block">8. Musculoskeletal:</span> Full active ROM, muscle strength (5/5), joint edema, pitting edema (1-4+), gait.
                </div>
              </div>
            </div>

            {/* Evidence-Based Tools & Frameworks */}
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1.5 text-[11px]">
              <p className="font-bold text-[#155180] uppercase text-[10px] tracking-wider">4. StatPearls Evidence-Based Assessment Frameworks</p>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="bg-white p-2 rounded border border-sky-100">
                  <span className="font-bold text-[#155180] block">P-Q-R-S-T Pain Tool:</span> Provokes/relieves, Quality (dull/sharp/burning), Region/radiation, Severity (0-10), Time/duration.
                </div>
                <div className="bg-white p-2 rounded border border-sky-100">
                  <span className="font-bold text-[#155180] block">S-A-M-P-L-E History:</span> Signs/symptoms, Allergies, Medications, Past history, Last intake, Events preceding visit.
                </div>
                <div className="bg-white p-2 rounded border border-sky-100">
                  <span className="font-bold text-[#155180] block">Admission Risk Scores:</span> Morse Fall Risk Score, Braden Scale Pressure Injury Risk, AVPU / GCS.
                </div>
                <div className="bg-white p-2 rounded border border-sky-100">
                  <span className="font-bold text-[#155180] block">SBAR Communication:</span> Situation, Background, Assessment, Recommendation for rapid handover.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setExamChecklistModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs"
              >
                Close Guide
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI ASSISTANT BUTTON */}
      <button
        onClick={openAiDrawer}
        className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1b669d] hover:bg-[#155180] text-white px-4 py-3 rounded-full shadow-2xl transition-all"
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-bold">Assistant</span>
      </button>

      {/* AI ASSISTANT DRAWER */}
      {aiDrawerOpen && createPortal(
        <div className="no-print fixed inset-0 z-50 flex justify-end" onClick={() => setAiDrawerOpen(false)}>
          <div className="relative w-[380px] h-full bg-white shadow-2xl flex flex-col overflow-hidden border-l" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 bg-[#1b669d] text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <p className="font-bold text-sm">AI Clinical Assistant</p>
              </div>
              <button onClick={() => setAiDrawerOpen(false)} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <button onClick={handleAIGenerateComments} disabled={aiCommentsLoading} className="w-full text-left p-3 border rounded-xl hover:bg-slate-50 font-bold text-xs flex justify-between items-center">
                <span>Assess Vitals & Generate Comment</span>
                {aiCommentsLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#1b669d]" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>

              <button onClick={handleAIGenerateProgressNote} disabled={aiProgressNoteLoading} className="w-full text-left p-3 border rounded-xl hover:bg-slate-50 font-bold text-xs flex justify-between items-center">
                <span>Generate Clinical Progress Note</span>
                {aiProgressNoteLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#1b669d]" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>

              <button onClick={handleAIGenerateSBAR} disabled={aiSbarLoading} className="w-full text-left p-3 border rounded-xl hover:bg-slate-50 font-bold text-xs flex justify-between items-center">
                <span>Generate SBAR Handover Report</span>
                {aiSbarLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#1b669d]" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>

              <div className="pt-2">
                <button onClick={handleMedSuggest} disabled={medSugLoading} className="w-full bg-[#1b669d] hover:bg-[#155180] text-white p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm">
                  {medSugLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Suggest Doses, Routes & Freq
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default ClinicalSheet;
