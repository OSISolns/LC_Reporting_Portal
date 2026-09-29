import React, { useState, useEffect, useMemo } from 'react';
import {
  Dumbbell, Activity, ClipboardList, Plus, Search, Calendar,
  User, CheckCircle2, Clock, Play, RotateCcw, Award, Flame,
  FileText, Sparkles, ChevronRight, Sliders, AlertCircle, ShieldAlert,
  Send, Layers, RefreshCw, X, Printer, BarChart3, Users, TrendingUp,
  Package, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import ConsumablesLog from '../ConsumablesLog';
import PatientAutocomplete from '../../components/PatientAutocomplete';
import { useAuth } from '../../context/AuthContext';
import { getPhysiotherapists } from '../../api/providers';
import { getUsers } from '../../api/users';
import {
  getPhysioSessions,
  createPhysioSession,
  updatePhysioSessionStatus,
  getPhysioAssessments,
  createPhysioAssessment
} from '../../api/physioApi';

const PHYSIO_ROLES = ['physiotherapist', 'physio', 'physio_manager'];

// Full Anatomical Joint Dataset — grouped by region
const JOINT_REGIONS = [
  {
    region: 'Head & Neck',
    joints: [
      { id: 'TMJ', label: 'Temporomandibular Joint (TMJ)', movements: ['Elevation', 'Depression', 'Protrusion', 'Retrusion', 'Lateral Excursion'] },
      { id: 'C0-C1', label: 'Atlanto-occipital (C0–C1)', movements: ['Flexion', 'Extension', 'Lateral Flexion'] },
      { id: 'C1-C2', label: 'Atlanto-axial (C1–C2)', movements: ['Rotation'] },
      { id: 'Cervical', label: 'Cervical Spine (C2–C7)', movements: ['Flexion', 'Extension', 'Lateral Flexion', 'Rotation'] },
    ]
  },
  {
    region: 'Shoulder Complex',
    joints: [
      { id: 'SC', label: 'Sternoclavicular Joint (SC)', movements: ['Elevation', 'Depression', 'Protraction', 'Retraction', 'Clavicular Rotation'] },
      { id: 'AC', label: 'Acromioclavicular Joint (AC)', movements: ['Elevation', 'Depression', 'Protraction', 'Retraction', 'Scapular Rotation'] },
      { id: 'Scapulothoracic', label: 'Scapulothoracic Articulation', movements: ['Elevation', 'Depression', 'Protraction', 'Retraction', 'Upward Rotation', 'Downward Rotation'] },
      { id: 'Glenohumeral', label: 'Glenohumeral (Shoulder) Joint', movements: ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Internal Rotation', 'External Rotation', 'Horizontal Abduction', 'Horizontal Adduction', 'Circumduction'] },
    ]
  },
  {
    region: 'Elbow & Forearm',
    joints: [
      { id: 'Humeroulnar', label: 'Humeroulnar Joint', movements: ['Flexion', 'Extension'] },
      { id: 'Humeroradial', label: 'Humeroradial Joint', movements: ['Flexion', 'Extension', 'Pronation', 'Supination'] },
      { id: 'ProxRadioulnar', label: 'Proximal Radioulnar Joint', movements: ['Pronation', 'Supination'] },
      { id: 'DistRadioulnar', label: 'Distal Radioulnar Joint', movements: ['Pronation', 'Supination'] },
    ]
  },
  {
    region: 'Wrist & Hand',
    joints: [
      { id: 'Radiocarpal', label: 'Radiocarpal (Wrist) Joint', movements: ['Flexion', 'Extension', 'Radial Deviation', 'Ulnar Deviation', 'Circumduction'] },
      { id: 'Midcarpal', label: 'Midcarpal Joints', movements: ['Flexion', 'Extension', 'Radial Deviation', 'Ulnar Deviation'] },
      { id: 'CMC_2-5', label: 'Carpometacarpal (CMC) Joints 2–5', movements: ['Flexion', 'Extension', 'Gliding'] },
      { id: 'CMC_Thumb', label: '1st CMC – Thumb', movements: ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Opposition', 'Reposition', 'Circumduction'] },
      { id: 'MCP', label: 'Metacarpophalangeal (MCP) Joints', movements: ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Circumduction'] },
      { id: 'IP_Fingers', label: 'Interphalangeal (IP) Joints – Fingers', movements: ['Flexion', 'Extension'] },
      { id: 'IP_Thumb', label: 'Interphalangeal (IP) Joint – Thumb', movements: ['Flexion', 'Extension'] },
    ]
  },
  {
    region: 'Spine',
    joints: [
      { id: 'Thoracic', label: 'Thoracic Spine', movements: ['Flexion', 'Extension', 'Lateral Flexion', 'Rotation'] },
      { id: 'Lumbar', label: 'Lumbar Spine', movements: ['Flexion', 'Extension', 'Lateral Flexion', 'Limited Rotation'] },
      { id: 'Sacral', label: 'Sacral Region', movements: ['Nutation', 'Counternutation'] },
      { id: 'Intervertebral', label: 'Intervertebral Joints', movements: ['Flexion', 'Extension', 'Lateral Flexion', 'Rotation'] },
    ]
  },
  {
    region: 'Pelvis',
    joints: [
      { id: 'SI', label: 'Sacroiliac (SI) Joint', movements: ['Nutation', 'Counternutation', 'Translational Movements'] },
      { id: 'PubicSymphysis', label: 'Pubic Symphysis', movements: ['Gliding', 'Separation', 'Rotation'] },
    ]
  },
  {
    region: 'Hip',
    joints: [
      { id: 'Hip', label: 'Hip (Acetabulofemoral) Joint', movements: ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Internal Rotation', 'External Rotation', 'Circumduction'] },
    ]
  },
  {
    region: 'Knee',
    joints: [
      { id: 'Tibiofemoral', label: 'Tibiofemoral Joint', movements: ['Flexion', 'Extension', 'Medial Rotation', 'Lateral Rotation'] },
      { id: 'Patellofemoral', label: 'Patellofemoral Joint', movements: ['Superior Glide', 'Inferior Glide', 'Medial Glide', 'Lateral Glide', 'Tilt', 'Rotation'] },
    ]
  },
  {
    region: 'Ankle & Foot',
    joints: [
      { id: 'Talocrural', label: 'Talocrural (Ankle) Joint', movements: ['Dorsiflexion', 'Plantarflexion'] },
      { id: 'Subtalar', label: 'Subtalar Joint', movements: ['Inversion', 'Eversion'] },
      { id: 'Talonavicular', label: 'Talonavicular Joint', movements: ['Inversion', 'Eversion', 'Pronation', 'Supination'] },
      { id: 'Calcaneocuboid', label: 'Calcaneocuboid Joint', movements: ['Pronation', 'Supination', 'Gliding', 'Rotation'] },
      { id: 'Midtarsal', label: 'Midtarsal / Transverse Tarsal Joints', movements: ['Pronation', 'Supination'] },
      { id: 'TMT', label: 'Tarsometatarsal (TMT) Joints', movements: ['Gliding'] },
      { id: 'MTP', label: 'Metatarsophalangeal (MTP) Joints', movements: ['Flexion', 'Extension', 'Abduction', 'Adduction'] },
      { id: 'IP_Toes', label: 'Interphalangeal Joints – Toes', movements: ['Flexion', 'Extension'] },
    ]
  },
  {
    region: 'Combined Foot Movements',
    joints: [
      { id: 'Inversion_Complex', label: 'Inversion (Combined)', movements: ['Plantarflexion', 'Adduction', 'Internal Rotation'] },
      { id: 'Eversion_Complex', label: 'Eversion (Combined)', movements: ['Dorsiflexion', 'Abduction', 'External Rotation'] },
      { id: 'Pronation_Complex', label: 'Pronation (Combined)', movements: ['Eversion', 'Abduction', 'Dorsiflexion'] },
      { id: 'Supination_Complex', label: 'Supination (Combined)', movements: ['Inversion', 'Adduction', 'Plantarflexion'] },
    ]
  },
];

// Flat list for backward-compat (e.g. treatment_area selects)
const BODY_REGIONS = JOINT_REGIONS.flatMap(r => r.joints.map(j => ({ id: j.id, label: j.label })));

// Clinical ROM Ranges: { movementName: { min, max, unit, normal } }
// 'normal' = typical healthy adult range end
const ROM_RANGES = {
  // ── Generic movements (shared across many joints) ──
  'Flexion':              { min: 0, max: 180, unit: '°', normal: 120 },
  'Extension':            { min: 0, max: 90,  unit: '°', normal: 30  },
  'Lateral Flexion':      { min: 0, max: 50,  unit: '°', normal: 45  },
  'Rotation':             { min: 0, max: 90,  unit: '°', normal: 80  },
  'Abduction':            { min: 0, max: 180, unit: '°', normal: 180 },
  'Adduction':            { min: 0, max: 50,  unit: '°', normal: 30  },
  'Internal Rotation':    { min: 0, max: 90,  unit: '°', normal: 70  },
  'External Rotation':    { min: 0, max: 90,  unit: '°', normal: 90  },
  'Circumduction':        { min: 0, max: 360, unit: '°', normal: 360 },
  'Pronation':            { min: 0, max: 90,  unit: '°', normal: 80  },
  'Supination':           { min: 0, max: 90,  unit: '°', normal: 80  },
  'Inversion':            { min: 0, max: 40,  unit: '°', normal: 35  },
  'Eversion':             { min: 0, max: 20,  unit: '°', normal: 15  },
  'Dorsiflexion':         { min: 0, max: 30,  unit: '°', normal: 20  },
  'Plantarflexion':       { min: 0, max: 60,  unit: '°', normal: 50  },
  'Nutation':             { min: 0, max: 10,  unit: '°', normal: 4   },
  'Counternutation':      { min: 0, max: 10,  unit: '°', normal: 4   },
  'Gliding':              { min: 0, max: 10,  unit: 'mm', normal: 5  },
  'Opposition':           { min: 0, max: 90,  unit: '°', normal: 90  },
  'Reposition':           { min: 0, max: 90,  unit: '°', normal: 90  },
  'Radial Deviation':     { min: 0, max: 25,  unit: '°', normal: 20  },
  'Ulnar Deviation':      { min: 0, max: 40,  unit: '°', normal: 30  },
  'Elevation':            { min: 0, max: 60,  unit: '°', normal: 60  },
  'Depression':           { min: 0, max: 10,  unit: '°', normal: 5   },
  'Protraction':          { min: 0, max: 20,  unit: '°', normal: 15  },
  'Retraction':           { min: 0, max: 20,  unit: '°', normal: 15  },
  'Upward Rotation':      { min: 0, max: 60,  unit: '°', normal: 60  },
  'Downward Rotation':    { min: 0, max: 60,  unit: '°', normal: 45  },
  'Clavicular Rotation':  { min: 0, max: 50,  unit: '°', normal: 40  },
  'Scapular Rotation':    { min: 0, max: 60,  unit: '°', normal: 60  },
  'Horizontal Abduction': { min: 0, max: 90,  unit: '°', normal: 90  },
  'Horizontal Adduction': { min: 0, max: 135, unit: '°', normal: 135 },
  'Medial Rotation':      { min: 0, max: 40,  unit: '°', normal: 30  },
  'Lateral Rotation':     { min: 0, max: 50,  unit: '°', normal: 40  },
  'Limited Rotation':     { min: 0, max: 10,  unit: '°', normal: 5   },
  'Superior Glide':       { min: 0, max: 15,  unit: 'mm', normal: 10 },
  'Inferior Glide':       { min: 0, max: 15,  unit: 'mm', normal: 10 },
  'Medial Glide':         { min: 0, max: 10,  unit: 'mm', normal: 5  },
  'Lateral Glide':        { min: 0, max: 10,  unit: 'mm', normal: 5  },
  'Tilt':                 { min: 0, max: 20,  unit: '°', normal: 10  },
  'Separation':           { min: 0, max: 5,   unit: 'mm', normal: 2  },
  'Translational Movements': { min: 0, max: 4, unit: 'mm', normal: 2 },
};


// ─── Outcome Measures Library ──────────────────────────────────────────────
const OUTCOME_MEASURES = [
  { category: 'Pain',                    color: 'rose',   measures: ['VAS', 'NPRS (0–10)', 'Verbal Rating Scale (VRS)', 'McGill Pain Questionnaire (MPQ)', 'Brief Pain Inventory (BPI)', 'Pain Catastrophizing Scale (PCS)', 'Central Sensitization Inventory (CSI)', 'DN4', 'PainDETECT', 'LANSS'] },
  { category: 'Neck',                    color: 'sky',    measures: ['Neck Disability Index (NDI)', 'PSFS', 'Northwick Park Neck Pain Questionnaire', 'Copenhagen Neck Functional Disability Scale', 'Neck Bournemouth Questionnaire'] },
  { category: 'Low Back',                color: 'amber',  measures: ['Oswestry Disability Index (ODI)', 'Roland-Morris Disability Questionnaire (RMDQ)', 'Quebec Back Pain Disability Scale', 'Low Back Outcome Score', 'Fear-Avoidance Beliefs Questionnaire (FABQ)', 'STarT Back Screening Tool', 'PSFS'] },
  { category: 'Shoulder',                color: 'blue',   measures: ['DASH', 'Quick DASH', 'SPADI', 'ASES Shoulder Score', 'Constant–Murley Score', 'Oxford Shoulder Score (OSS)', 'Simple Shoulder Test (SST)', 'Shoulder Disability Questionnaire (SDQ)'] },
  { category: 'Elbow',                   color: 'violet', measures: ['Patient-Rated Tennis Elbow Evaluation (PRTEE)', 'Oxford Elbow Score (OES)', 'Mayo Elbow Performance Score (MEPS)', 'DASH / Quick DASH'] },
  { category: 'Wrist & Hand',            color: 'purple', measures: ['DASH / Quick DASH', 'Patient-Rated Wrist Evaluation (PRWE)', 'Patient-Rated Hand Evaluation (PRHE)', 'Michigan Hand Outcomes Questionnaire (MHQ)', 'Boston Carpal Tunnel Questionnaire (BCTQ)', 'Mayo Wrist Score'] },
  { category: 'Hip',                     color: 'orange', measures: ['Harris Hip Score (HHS)', 'Oxford Hip Score (OHS)', 'HOOS', 'HOOS Jr.', 'LEFS', 'WOMAC'] },
  { category: 'Knee',                    color: 'emerald',measures: ['KOOS', 'KOOS Jr.', 'WOMAC', 'Oxford Knee Score (OKS)', 'Lysholm Knee Scoring Scale', 'IKDC', 'Kujala / Anterior Knee Pain Scale', 'Tegner Activity Scale', 'LEFS'] },
  { category: 'Ankle & Foot',            color: 'teal',   measures: ['FAAM', 'FAOS', 'AOFAS Ankle-Hindfoot Score', 'LEFS', 'Foot Function Index (FFI)', 'Manchester-Oxford Foot Questionnaire (MOXFQ)', 'CAIT – Cumberland Ankle Instability Tool'] },
  { category: 'Neurological – Stroke',   color: 'indigo', measures: ['Fugl-Meyer Assessment (FMA)', 'Berg Balance Scale (BBS)', 'Modified Rankin Scale (mRS)', 'Barthel Index', 'FIM', 'NIH Stroke Scale (NIHSS)', 'Modified Ashworth Scale (MAS)', 'Modified Tardieu Scale (MTS)', 'Action Research Arm Test (ARAT)', 'Box and Block Test', 'Nine-Hole Peg Test', '10-Meter Walk Test', '6-Minute Walk Test', 'Timed Up and Go (TUG)', 'FAC'] },
  { category: "Neurological \u2013 Parkinson\u2019s", color: 'indigo', measures: ['MDS-UPDRS', 'Hoehn and Yahr Scale', 'Berg Balance Scale', 'TUG', '10-Meter Walk Test', '6-Minute Walk Test', 'Freezing of Gait Questionnaire (FOG-Q)', 'PDQ-39'] },

  { category: 'Multiple Sclerosis',      color: 'indigo', measures: ['EDSS', 'MSIS-29', 'MSWS-12', 'Timed 25-Foot Walk', '6-Minute Walk Test', '9-Hole Peg Test'] },
  { category: 'Spinal Cord Injury',      color: 'indigo', measures: ['ASIA / ISNCSCI', 'SCIM', 'WISCI II', 'Berg Balance Scale', '10-Meter Walk Test', '6-Minute Walk Test'] },
  { category: 'Balance & Fall Risk',     color: 'yellow', measures: ['Berg Balance Scale (BBS)', 'Timed Up and Go (TUG)', 'Functional Reach Test', 'Four Square Step Test (FSST)', 'Tinetti POMA', 'Dynamic Gait Index (DGI)', 'Functional Gait Assessment (FGA)', 'Mini-BESTest', 'BESTest', 'ABC Scale', 'Falls Efficacy Scale-International (FES-I)'] },
  { category: 'Gait & Mobility',         color: 'green',  measures: ['10-Meter Walk Test (10MWT)', '6-Minute Walk Test (6MWT)', '2-Minute Walk Test', 'Timed Up and Go (TUG)', '5 Times Sit-to-Stand (5xSTS)', '30-Second Sit-to-Stand', 'FAC', 'Rivermead Mobility Index', 'Dynamic Gait Index', 'Functional Gait Assessment'] },
  { category: 'Muscle Strength',         color: 'lime',   measures: ['Manual Muscle Testing (MMT)', 'MRC Scale', 'Hand-held Dynamometry', '1RM', 'Grip Strength (Dynamometer)', '30-Sec Sit-to-Stand', '5xSTS'] },
  { category: 'Cardiopulmonary',         color: 'cyan',   measures: ['6-Minute Walk Test (6MWT)', '2-Minute Walk Test', 'Incremental Shuttle Walk Test (ISWT)', 'Endurance Shuttle Walk Test (ESWT)', 'Borg RPE', 'Modified Borg Dyspnea Scale', 'mMRC Dyspnea Scale', 'COPD Assessment Test (CAT)', 'St George Respiratory Questionnaire (SGRQ)', 'NYHA Functional Classification'] },
  { category: 'Pediatric',               color: 'pink',   measures: ['GMFM-66', 'GMFM-88', 'PDMS-2', 'PEDI', 'PEDI-CAT', 'GMFCS', 'MACS', 'CFCS', 'Mini-MACS', 'FMS', 'Alberta Infant Motor Scale (AIMS)', 'Pediatric Balance Scale', 'HINE'] },
  { category: 'Osteoarthritis',          color: 'orange', measures: ['WOMAC', 'KOOS', 'HOOS', 'Oxford Knee Score', 'Oxford Hip Score', 'LEFS', 'AUSCAN', 'PSFS'] },
  { category: 'Rheumatology',            color: 'red',    measures: ['HAQ-DI', 'RAPID3', 'DAS28', 'BASDAI', 'BASFI', 'ASQoL', 'FIQ'] },
  { category: "Women's Health & Pelvic", color: 'fuchsia',measures: ['PFDI-20', 'PFIQ-7', 'ICIQ', 'ICIQ-UI SF', 'POPDI', 'Female Sexual Function Index (FSFI)', 'Pelvic Girdle Questionnaire (PGQ)', 'ODI'] },
  { category: 'Quality of Life',         color: 'slate',  measures: ['SF-36', 'SF-12', 'EQ-5D-5L', 'WHOQOL-BREF', 'PROMIS', 'Global Rating of Change (GROC)', 'PSFS'] },
  { category: 'ADL / Functional Independence', color:'slate', measures: ['Barthel Index', 'Modified Barthel Index', 'FIM', 'Katz Index', 'Lawton-Brody IADL Scale', 'Rivermead Mobility Index', 'FAM'] },
  { category: 'Spasticity',              color: 'violet', measures: ['Modified Ashworth Scale (MAS)', 'Modified Tardieu Scale (MTS)', 'Tardieu Scale', 'Penn Spasm Frequency Scale', 'SCATS'] },
  { category: 'Sports',                  color: 'emerald',measures: ['IKDC', 'KOOS', 'LEFS', 'FAAM', 'FAOS', 'Lysholm Knee Score', 'Tegner Activity Scale', 'ACL-RSI', 'Tampa Scale (TSK)', 'QuickDASH', 'DASH'] },
  { category: 'Lymphedema / Edema',      color: 'teal',   measures: ['Circumferential Measurement', 'Perometry', 'Water Displacement', 'L-Dex / Bioimpedance (BIS)', 'LLIS', 'Lymph-ICF', 'DASH / QuickDASH', 'LEFS'] },
  { category: 'Burns / Scar',            color: 'amber',  measures: ['Vancouver Scar Scale (VSS)', 'POSAS', 'Burn-Specific Health Scale-Brief (BSHS-B)', 'DASH', 'LEFS'] },
  { category: 'Vestibular / Dizziness',  color: 'sky',    measures: ['Dizziness Handicap Inventory (DHI)', 'ABC Scale', 'Dynamic Gait Index', 'Functional Gait Assessment', 'Berg Balance Scale', 'Modified CTSIB', 'Dynamic Visual Acuity Test', 'TUG'] },
  { category: 'Geriatric',               color: 'slate',  measures: ['Berg Balance Scale', 'TUG', '30-Sec Sit-to-Stand', '5xSTS', 'SPPB', '6-Minute Walk Test', '4-Meter Gait Speed', 'Tinetti POMA', 'Functional Reach Test', 'FES-I', 'ABC Scale', 'Barthel Index', 'Lawton IADL', 'Geriatric Depression Scale (GDS)'] },
  { category: 'Amputee Rehabilitation',  color: 'orange', measures: ['AMP / AMPnoPRO', 'Houghton Scale', 'Prosthesis Evaluation Questionnaire (PEQ)', 'PLUS-M', 'Locomotor Capabilities Index (LCI)', 'TUG', '6-Minute Walk Test', '2-Minute Walk Test'] },
];

// Map joint IDs → relevant outcome measure categories
const JOINT_OUTCOME_MAP = {
  'TMJ':              ['Pain'],
  'C0-C1':            ['Pain', 'Neck'],
  'C1-C2':            ['Pain', 'Neck'],
  'Cervical':         ['Pain', 'Neck', 'Quality of Life'],
  'SC':               ['Pain', 'Shoulder'],
  'AC':               ['Pain', 'Shoulder'],
  'Scapulothoracic':  ['Pain', 'Shoulder'],
  'Glenohumeral':     ['Pain', 'Shoulder', 'Quality of Life'],
  'Humeroulnar':      ['Pain', 'Elbow', 'Quality of Life'],
  'Humeroradial':     ['Pain', 'Elbow'],
  'ProxRadioulnar':   ['Pain', 'Elbow', 'Wrist & Hand'],
  'DistRadioulnar':   ['Pain', 'Wrist & Hand'],
  'Radiocarpal':      ['Pain', 'Wrist & Hand', 'Quality of Life'],
  'Midcarpal':        ['Pain', 'Wrist & Hand'],
  'CMC_2-5':          ['Pain', 'Wrist & Hand'],
  'CMC_Thumb':        ['Pain', 'Wrist & Hand'],
  'MCP':              ['Pain', 'Wrist & Hand'],
  'IP_Fingers':       ['Pain', 'Wrist & Hand'],
  'IP_Thumb':         ['Pain', 'Wrist & Hand'],
  'Thoracic':         ['Pain', 'Low Back', 'Quality of Life'],
  'Lumbar':           ['Pain', 'Low Back', 'Quality of Life'],
  'Sacral':           ['Pain', 'Low Back'],
  'Intervertebral':   ['Pain', 'Low Back'],
  'SI':               ['Pain', 'Low Back', "Women's Health & Pelvic"],
  'PubicSymphysis':   ['Pain', "Women's Health & Pelvic"],
  'Hip':              ['Pain', 'Hip', 'Osteoarthritis', 'Balance & Fall Risk', 'Gait & Mobility', 'Quality of Life'],
  'Tibiofemoral':     ['Pain', 'Knee', 'Osteoarthritis', 'Balance & Fall Risk', 'Gait & Mobility', 'Sports', 'Quality of Life'],
  'Patellofemoral':   ['Pain', 'Knee', 'Balance & Fall Risk', 'Sports'],
  'Talocrural':       ['Pain', 'Ankle & Foot', 'Balance & Fall Risk', 'Gait & Mobility', 'Sports'],
  'Subtalar':         ['Pain', 'Ankle & Foot', 'Balance & Fall Risk'],
  'Talonavicular':    ['Pain', 'Ankle & Foot'],
  'Calcaneocuboid':   ['Pain', 'Ankle & Foot'],
  'Midtarsal':        ['Pain', 'Ankle & Foot'],
  'TMT':              ['Pain', 'Ankle & Foot'],
  'MTP':              ['Pain', 'Ankle & Foot'],
  'IP_Toes':          ['Pain', 'Ankle & Foot'],
  'Inversion_Complex':['Pain', 'Ankle & Foot', 'Balance & Fall Risk'],
  'Eversion_Complex': ['Pain', 'Ankle & Foot', 'Balance & Fall Risk'],
  'Pronation_Complex':['Pain', 'Ankle & Foot'],
  'Supination_Complex':['Pain', 'Ankle & Foot'],
};

// Preset Exercise Library
const PRESET_EXERCISES = [
  { id: 'ex-1', name: 'Quadriceps Isometric Sets', category: 'Knee', defaultSets: 3, defaultReps: 15, defaultHold: 5 },
  { id: 'ex-2', name: 'Codman Shoulder Pendulum', category: 'Shoulder', defaultSets: 3, defaultReps: 10, defaultHold: 0 },
  { id: 'ex-3', name: 'Straight Leg Raises (SLR)', category: 'Lower Limb', defaultSets: 3, defaultReps: 12, defaultHold: 3 },
  { id: 'ex-4', name: 'Lumbar Cat-Cow Mobility', category: 'Spine', defaultSets: 2, defaultReps: 10, defaultHold: 5 },
  { id: 'ex-5', name: 'Resistance Band External Rotation', category: 'Shoulder', defaultSets: 3, defaultReps: 12, defaultHold: 2 },
  { id: 'ex-6', name: 'Wall Sits & Squats', category: 'Knee', defaultSets: 3, defaultReps: 10, defaultHold: 10 },
  { id: 'ex-7', name: 'Ankle Pumps & Alphabet', category: 'Ankle', defaultSets: 3, defaultReps: 20, defaultHold: 0 },
  { id: 'ex-8', name: 'Cervical Retraction (Chin Tucks)', category: 'Spine', defaultSets: 3, defaultReps: 10, defaultHold: 5 }
];


const PhysioHub = () => {
  const { user } = useAuth();
  const isManagerUser = user?.role === 'admin' || user?.role === 'physio_manager' || user?.role === 'manager' || user?.permissions?.includes?.('user_management');

  const [userRole, setUserRole] = useState(isManagerUser ? 'manager' : 'therapist');
  const [activeTab, setActiveTab] = useState(isManagerUser ? 'manager_overview' : 'rehab');
  const [loading, setLoading] = useState(false);

  // Live physio staff from DB
  const [physioStaff, setPhysioStaff] = useState([]);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('All');
  const [selectedTherapistFilter, setSelectedTherapistFilter] = useState('All');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  // New Session Form State
  const [newSession, setNewSession] = useState({
    patient_id: '',
    patient_name: '',
    therapist_name: '',
    session_date: new Date().toISOString().split('T')[0],
    treatment_area: 'Knee',
    progress_notes: ''
  });
  const [selectedExercisesForSession, setSelectedExercisesForSession] = useState([]);

  // Assessments state
  const [assessments, setAssessments] = useState([]);
  const [assessmentSearch, setAssessmentSearch] = useState('');
  const [showNewAssessmentModal, setShowNewAssessmentModal] = useState(false);

  // New Assessment Form State
  const [newAssessment, setNewAssessment] = useState({
    patient_id: '',
    patient_name: '',
    therapist_name: '',
    body_part: 'Tibiofemoral',
    chief_complaint: '',
    rom_measurements: {},
    outcome_measures: [],
    pain_score: 5,
    muscle_grade: 'Grade 4 (Good)',
    functional_goals: '',
    treatment_plan: ''
  });

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, assRes, provRes] = await Promise.all([
        getPhysioSessions().catch(() => ({ success: false, data: [] })),
        getPhysioAssessments().catch(() => ({ success: false, data: [] })),
        getPhysiotherapists().catch(() => null)
      ]);

      const loadedSessions = sessRes?.success ? (sessRes.data || []) : [];
      const loadedAssessments = assRes?.success ? (assRes.data || []) : [];

      setSessions(loadedSessions);
      setAssessments(loadedAssessments);

      // Extract physiotherapists from providers DB table
      const provList = provRes?.data || provRes || [];
      let staff = Array.isArray(provList) ? provList.map(p => p.name).filter(Boolean) : [];

      // Fallback: extract unique therapist names from sessions and assessments if providers table query empty
      if (staff.length === 0) {
        const staffSet = new Set();
        loadedSessions.forEach(s => { if (s.therapist_name) staffSet.add(s.therapist_name); });
        loadedAssessments.forEach(a => { if (a.therapist_name) staffSet.add(a.therapist_name); });
        staff = Array.from(staffSet);
      }

      setPhysioStaff(staff);
    } catch (err) {
      console.error('Failed to fetch physio data:', err);
      toast.error('Failed to load physio records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Helper: get movements list for selected joint
  const getJointMovements = (jointId) => {
    for (const region of JOINT_REGIONS) {
      const joint = region.joints.find(j => j.id === jointId);
      if (joint) return joint.movements;
    }
    return [];
  };

  // Reset ROM measurements when body_part changes
  useEffect(() => {
    const movements = getJointMovements(newAssessment.body_part);
    const fresh = {};
    movements.forEach(m => {
      const range = ROM_RANGES[m];
      fresh[m] = range ? Math.round(range.normal * 0.7) : 0; // default to ~70% normal
    });
    setNewAssessment(prev => ({ ...prev, rom_measurements: fresh }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAssessment.body_part]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesSearch =
        !sessionSearch ||
        s.patient_name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.patient_id?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.treatment_area?.toLowerCase().includes(sessionSearch.toLowerCase());

      const matchesStatus = sessionStatusFilter === 'All' || s.status === sessionStatusFilter;
      const matchesTherapist = selectedTherapistFilter === 'All' || s.therapist_name === selectedTherapistFilter;

      return matchesSearch && matchesStatus && matchesTherapist;
    });
  }, [sessions, sessionSearch, sessionStatusFilter, selectedTherapistFilter]);

  // Session Statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const scheduled = sessions.filter(s => s.status === 'Scheduled').length;
    const inSession = sessions.filter(s => s.status === 'In Session').length;
    const completed = sessions.filter(s => s.status === 'Completed').length;
    return { total: sessions.length, scheduled, inSession, completed };
  }, [sessions]);

  // Therapist Workload Breakdown for Manager View
  const therapistWorkload = useMemo(() => {
    const staffSet = new Set(physioStaff);
    sessions.forEach(s => { if (s.therapist_name) staffSet.add(s.therapist_name); });

    return Array.from(staffSet).map(name => {
      const thSessions = sessions.filter(s => s.therapist_name === name);
      const scheduled = thSessions.filter(s => s.status === 'Scheduled').length;
      const inSession = thSessions.filter(s => s.status === 'In Session').length;
      const completed = thSessions.filter(s => s.status === 'Completed').length;
      const total = thSessions.length;
      const share = sessions.length ? Math.round((total / sessions.length) * 100) : 0;

      return { name, total, scheduled, inSession, completed, share };
    }).sort((a, b) => b.total - a.total);
  }, [physioStaff, sessions]);

  // Handlers for Session status change
  const handleUpdateSessionStatus = async (id, newStatus) => {
    try {
      const res = await updatePhysioSessionStatus(id, { status: newStatus });
      if (res?.success) {
        toast.success(`Session status updated to ${newStatus}`);
        setSessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      }
    } catch (err) {
      toast.error('Failed to update session status.');
    }
  };

  // Submit New Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSession.patient_id || !newSession.session_date) {
      return toast.error('Select a patient from the SUKRAA register and a session date.');
    }

    try {
      const payload = {
        ...newSession,
        exercises_prescribed: selectedExercisesForSession
      };
      const res = await createPhysioSession(payload);
      if (res?.success) {
        toast.success('Rehabilitation session scheduled!');
        setShowNewSessionModal(false);
        setNewSession({
          patient_id: '',
          patient_name: '',
          therapist_name: physioStaff[0] || '',
          session_date: new Date().toISOString().split('T')[0],
          treatment_area: 'Knee',
          progress_notes: ''
        });
        setSelectedExercisesForSession([]);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to schedule rehab session.');
    }
  };

  // Submit New Assessment
  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    if (!newAssessment.patient_id || !newAssessment.body_part) {
      return toast.error('Select a patient from the SUKRAA register and an anatomical body part.');
    }

    try {
      const payload = {
        patient_id:       newAssessment.patient_id,
        patient_name:     newAssessment.patient_name,
        therapist_name:   newAssessment.therapist_name,
        body_part:        newAssessment.body_part,
        chief_complaint:  newAssessment.chief_complaint,
        rom_data:         newAssessment.rom_measurements,
        outcome_measures: newAssessment.outcome_measures,
        pain_score:       newAssessment.pain_score,
        muscle_grade:     newAssessment.muscle_grade,
        functional_goals: newAssessment.functional_goals,
        treatment_plan:   newAssessment.treatment_plan
      };

      const res = await createPhysioAssessment(payload);
      if (res?.success) {
        toast.success('Physio assessment saved!');
        setShowNewAssessmentModal(false);
        setNewAssessment({
          patient_id: '', patient_name: '',
          therapist_name: physioStaff[0] || '',
          body_part: 'Tibiofemoral',
          chief_complaint: '',
          rom_measurements: {},
          outcome_measures: [],
          pain_score: 5,
          muscle_grade: 'Grade 4 (Good)',
          functional_goals: '',
          treatment_plan: ''
        });
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to save assessment.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
              <Dumbbell size={26} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-800">
                  Physiotherapy Workspace
                </h1>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Therapist Workspace
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Physical rehabilitation, joint range-of-motion assessments, exercise programs &amp; supply logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowNewAssessmentModal(true)}
            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> New Assessment
          </button>

          <button
            onClick={() => setShowNewSessionModal(true)}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Calendar size={16} /> Schedule Session
          </button>
        </div>
      </div>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Patient Sessions</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.total}</h3>
          </div>
          <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Scheduled Today</span>
            <h3 className="text-xl font-black text-amber-700 mt-0.5">{stats.scheduled}</h3>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">In Session Now</span>
            <h3 className="text-xl font-black text-indigo-700 mt-0.5">{stats.inSession}</h3>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Play size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Completed Treatments</span>
            <h3 className="text-xl font-black text-emerald-700 mt-0.5">{stats.completed}</h3>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Therapist Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('rehab')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'rehab'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Dumbbell size={16} /> Rehabilitation Worklist
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'assessments'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity size={16} /> ROM & Pain Assessment Logger
        </button>

        <button
          onClick={() => setActiveTab('exercise_builder')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'exercise_builder'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={16} /> Exercise Program Builder
        </button>

        <button
          onClick={() => setActiveTab('consumables')}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-black border-b-2 -mb-px transition-all cursor-pointer ${
            activeTab === 'consumables'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={16} /> Consumables & Stock Log
        </button>
      </div>

      {/* Tab 1: Rehabilitation Worklist */}
      {activeTab === 'rehab' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, ID or treatment area..."
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Filter Status:</span>
              {['All', 'Scheduled', 'In Session', 'Completed'].map(st => (
                <button
                  key={st}
                  onClick={() => setSessionStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sessionStatusFilter === st
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Session Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(sess => {
              let exercises = [];
              try {
                exercises = typeof sess.exercises_prescribed === 'string'
                  ? JSON.parse(sess.exercises_prescribed)
                  : (sess.exercises_prescribed || []);
              } catch (e) {}

              return (
                <div key={sess.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-emerald-300 transition-all space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Patient</span>
                        <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                          <User size={14} className="text-emerald-600" /> {sess.patient_name}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500">ID: {sess.patient_id}</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                        sess.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        sess.status === 'In Session' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {sess.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Area: <span className="text-emerald-700 font-extrabold">{sess.treatment_area}</span></span>
                        <span className="text-[10px] text-slate-400 font-semibold">{sess.session_date}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                        Therapist: <span className="font-bold text-slate-700">{sess.therapist_name}</span>
                      </p>
                    </div>

                    {/* Prescribed Exercises Badges */}
                    {exercises.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Prescribed Exercises ({exercises.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                          {exercises.map((ex, idx) => (
                            <span key={idx} className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                              {ex.name} ({ex.sets}x{ex.reps})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {sess.status === 'Scheduled' && (
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'In Session')}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play size={14} /> Start Session
                      </button>
                    )}

                    {sess.status === 'In Session' && (
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'Completed')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={14} /> Mark Completed
                      </button>
                    )}

                    {sess.status === 'Completed' && (
                      <button
                        onClick={() => handleUpdateSessionStatus(sess.id, 'Scheduled')}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RotateCcw size={14} /> Re-open Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredSessions.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Dumbbell size={32} className="mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-600">No rehabilitation sessions found.</p>
                <p className="text-xs">Click "Schedule Session" above to add a new patient rehab session.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: ROM & Diagnostic Assessment Logger */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-72">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search assessment by patient ID..."
                value={assessmentSearch}
                onChange={e => setAssessmentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <button
              onClick={() => setShowNewAssessmentModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={15} /> Log New ROM Assessment
            </button>
          </div>

          {/* Assessment Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Therapist</th>
                  <th className="px-4 py-3">Joint / Body Part</th>
                  <th className="px-4 py-3 text-center">Flexion / Extension (ROM)</th>
                  <th className="px-4 py-3 text-center">Pain Score</th>
                  <th className="px-4 py-3 text-center">Muscle Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments
                  .filter(a => !assessmentSearch || a.patient_name?.toLowerCase().includes(assessmentSearch.toLowerCase()) || a.patient_id?.includes(assessmentSearch))
                  .map(ass => {
                    let rom = {};
                    try { rom = typeof ass.rom_data === 'string' ? JSON.parse(ass.rom_data) : (ass.rom_data || {}); } catch(e){}

                    return (
                      <tr key={ass.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap text-xs">
                          {new Date(ass.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 text-xs block">{ass.patient_name}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">ID: {ass.patient_id}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700 text-xs">{ass.therapist_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-extrabold uppercase">
                            {ass.body_part}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs font-bold text-slate-800">
                          {(() => {
                            const entries = Object.entries(rom);
                            if (!entries.length) return <span className="text-slate-400">—</span>;
                            // Show up to 3 key movements inline
                            return (
                              <div className="flex flex-col gap-0.5">
                                {entries.slice(0, 3).map(([mov, val]) => {
                                  const range = ROM_RANGES[mov];
                                  const unit = range?.unit || '°';
                                  return <span key={mov} className="text-[10px]">{mov}: <strong>{val}{unit}</strong></span>;
                                })}
                                {entries.length > 3 && (
                                  <span className="text-[9px] text-slate-400">+{entries.length - 3} more</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            ass.pain_score >= 7 ? 'bg-rose-100 text-rose-700' :
                            ass.pain_score >= 4 ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            NPRS {ass.pain_score} / 10
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-xs text-slate-700">
                          {ass.muscle_grade}
                        </td>
                      </tr>
                    );
                  })}

                {assessments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs">
                      No physio assessments recorded yet. Click "Log New ROM Assessment" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Exercise Program Builder */}
      {activeTab === 'exercise_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
              <Dumbbell size={16} className="text-emerald-600" /> Prescribed Exercise Library
            </h4>
            <p className="text-xs text-slate-500">Click exercises to include them in the rehabilitation plan.</p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {PRESET_EXERCISES.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => {
                    if (!selectedExercisesForSession.some(s => s.name === ex.name)) {
                      setSelectedExercisesForSession(prev => [...prev, { name: ex.name, sets: ex.defaultSets, reps: ex.defaultReps, hold: ex.defaultHold }]);
                      toast.success(`Added ${ex.name} to program`);
                    }
                  }}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-400 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{ex.name}</h5>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-1 inline-block">
                      {ex.category}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-500">{ex.defaultSets}x{ex.defaultReps}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-sm">Active Patient Exercise Plan</h4>
                <p className="text-xs text-slate-500">Customized parameters for physical therapy sessions.</p>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                {selectedExercisesForSession.length} Exercises Selected
              </span>
            </div>

            {selectedExercisesForSession.length > 0 ? (
              <div className="space-y-3">
                {selectedExercisesForSession.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h5 className="text-xs font-extrabold text-slate-800">{item.name}</h5>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Sets:</span>
                        <input
                          type="number"
                          value={item.sets}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setSelectedExercisesForSession(prev => prev.map((p, i) => i === idx ? { ...p, sets: val } : p));
                          }}
                          className="w-12 text-center text-xs font-bold bg-white border border-slate-200 rounded px-1 py-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Reps:</span>
                        <input
                          type="number"
                          value={item.reps}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setSelectedExercisesForSession(prev => prev.map((p, i) => i === idx ? { ...p, reps: val } : p));
                          }}
                          className="w-12 text-center text-xs font-bold bg-white border border-slate-200 rounded px-1 py-0.5"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedExercisesForSession(prev => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No exercises added to current prescription program yet. Click items from the library on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Consumables Log Integration */}
      {activeTab === 'consumables' && <ConsumablesLog />}

      {/* Modal: New Rehab Session */}
      {showNewSessionModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewSessionModal(false); }}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-emerald-600" /> Schedule Rehabilitation Session
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Link patient from registry and set treatment objectives.</p>
              </div>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Patient Search (SUKRAA Register) *</label>
                <PatientAutocomplete
                  value={newSession.patient_name}
                  onChange={(val) => {
                    setNewSession(prev => (
                      prev.patient_id && val !== prev.patient_name
                        ? { ...prev, patient_name: val, patient_id: '' }
                        : { ...prev, patient_name: val }
                    ));
                  }}
                  onPatientSelect={(p) => setNewSession(prev => ({
                    ...prev,
                    patient_id: p.pid || '',
                    patient_name: p.full_name || ''
                  }))}
                  placeholder="Search by name, PID or phone number..."
                  inputStyle={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '9px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
                {newSession.patient_id && (
                  <div className="mt-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Linked to Patient ID {newSession.patient_id}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Therapist</label>
                  <select
                    value={newSession.therapist_name}
                    onChange={e => setNewSession({ ...newSession, therapist_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    {physioStaff.map(th => <option key={th} value={th}>{th}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Session Date</label>
                  <input
                    type="date"
                    value={newSession.session_date}
                    onChange={e => setNewSession({ ...newSession, session_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Treatment Area</label>
                <input
                  type="text"
                  placeholder="e.g. Right Knee – Post ACL Reconstruction"
                  value={newSession.treatment_area}
                  onChange={e => setNewSession({ ...newSession, treatment_area: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Progress & Clinical Notes</label>
                <textarea
                  rows={3}
                  placeholder="Clinical goals, session objectives, or exercise notes..."
                  value={newSession.progress_notes}
                  onChange={e => setNewSession({ ...newSession, progress_notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Schedule Session
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Assessment (Landscape Layout) */}
      {showNewAssessmentModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewAssessmentModal(false); }}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
        >
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 w-full max-w-6xl shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header Bar */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                  <Activity size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Log Range of Motion & Pain Assessment
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Record patient goniometer joint degrees, outcome measures, and Oxford muscle strength grades.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewAssessmentModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form in Landscape Grid */}
            <form onSubmit={handleCreateAssessment} className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs font-medium">
              {/* Left Column: Patient & Joint Goniometer Measurements */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Patient Search (SUKRAA Register) *</label>
                  <PatientAutocomplete
                    value={newAssessment.patient_name}
                    onChange={(val) => {
                      setNewAssessment(prev => (
                        prev.patient_id && val !== prev.patient_name
                          ? { ...prev, patient_name: val, patient_id: '' }
                          : { ...prev, patient_name: val }
                      ));
                    }}
                    onPatientSelect={(p) => setNewAssessment(prev => ({
                      ...prev,
                      patient_id: p.pid || '',
                      patient_name: p.full_name || ''
                    }))}
                    placeholder="Search patient by name, PID or phone..."
                    inputStyle={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '9px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                  {newAssessment.patient_id && (
                    <div className="mt-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Linked to Patient ID {newAssessment.patient_id}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Therapist</label>
                    <select
                      value={newAssessment.therapist_name}
                      onChange={e => setNewAssessment({ ...newAssessment, therapist_name: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      {physioStaff.map(th => <option key={th} value={th}>{th}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Body Part / Joint</label>
                    <select
                      value={newAssessment.body_part}
                      onChange={e => setNewAssessment({ ...newAssessment, body_part: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      {JOINT_REGIONS.map(r => (
                        <optgroup key={r.region} label={r.region}>
                          {r.joints.map(j => (
                            <option key={j.id} value={j.id}>{j.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Chief Complaint</label>
                  <input
                    type="text"
                    placeholder="Primary clinical complaint or presentation..."
                    value={newAssessment.chief_complaint}
                    onChange={e => setNewAssessment({ ...newAssessment, chief_complaint: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                {/* Dynamic Goniometer ROM Controls */}
                {(() => {
                  const movements = getJointMovements(newAssessment.body_part);
                  if (!movements.length) return null;
                  return (
                    <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-800">
                          Joint Range of Motion (Goniometer Measurements)
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {movements.length} movement{movements.length > 1 ? 's' : ''} for {newAssessment.body_part}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 pt-1">
                        {movements.map(movement => {
                          const range = ROM_RANGES[movement] || { min: 0, max: 90, unit: '°', normal: 60 };
                          const current = newAssessment.rom_measurements[movement] ?? Math.round(range.normal * 0.7);
                          const pct = range.max > 0 ? Math.round((current / range.normal) * 100) : 0;
                          const isBelow = pct < 75;
                          const isNormal = pct >= 100;
                          return (
                            <div key={movement} className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-semibold text-slate-800">{movement}</label>
                                <span className={`text-[11px] font-bold ${
                                  isNormal ? 'text-emerald-600' : isBelow ? 'text-rose-600' : 'text-amber-600'
                                }`}>
                                  {current}{range.unit}
                                  <span className="text-slate-400 font-normal ml-1">({range.normal}{range.unit})</span>
                                </span>
                              </div>
                              <input
                                type="range"
                                min={range.min}
                                max={range.max}
                                value={current}
                                onChange={e => setNewAssessment(prev => ({
                                  ...prev,
                                  rom_measurements: { ...prev.rom_measurements, [movement]: parseInt(e.target.value, 10) }
                                }))}
                                className={`w-full cursor-pointer h-1.5 rounded-lg bg-slate-200 ${
                                  isNormal ? 'accent-emerald-600' : isBelow ? 'accent-rose-500' : 'accent-amber-500'
                                }`}
                              />
                              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                <span>{range.min}{range.unit}</span>
                                <span className="font-semibold text-slate-600">{pct}% of normal</span>
                                <span>{range.max}{range.unit}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Column: Outcome Measures, Pain Score & Muscle Grade */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Outcome Measures Picker */}
                  {(() => {
                    const relevantCategories = JOINT_OUTCOME_MAP[newAssessment.body_part] || ['Pain', 'Quality of Life'];
                    const suggested = OUTCOME_MEASURES.filter(g => relevantCategories.includes(g.category));
                    const toggleMeasure = (measure) => {
                      setNewAssessment(prev => {
                        const exists = prev.outcome_measures.includes(measure);
                        return {
                          ...prev,
                          outcome_measures: exists
                            ? prev.outcome_measures.filter(m => m !== measure)
                            : [...prev.outcome_measures, measure]
                        };
                      });
                    };
                    const colorMap = {
                      rose: 'bg-rose-50 border-rose-200 text-rose-700',
                      sky: 'bg-sky-50 border-sky-200 text-sky-700',
                      amber: 'bg-amber-50 border-amber-200 text-amber-700',
                      blue: 'bg-blue-50 border-blue-200 text-blue-700',
                      violet: 'bg-violet-50 border-violet-200 text-violet-700',
                      purple: 'bg-purple-50 border-purple-200 text-purple-700',
                      orange: 'bg-orange-50 border-orange-200 text-orange-700',
                      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                      teal: 'bg-teal-50 border-teal-200 text-teal-700',
                      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                      green: 'bg-green-50 border-green-200 text-green-700',
                      lime: 'bg-lime-50 border-lime-200 text-lime-700',
                      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
                      pink: 'bg-pink-50 border-pink-200 text-pink-700',
                      red: 'bg-red-50 border-red-200 text-red-700',
                      fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
                      slate: 'bg-slate-50 border-slate-300 text-slate-700',
                    };
                    return (
                      <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-xs font-bold text-slate-800">
                            Clinical Outcome Measures
                          </span>
                          <div className="flex items-center gap-2">
                            {newAssessment.outcome_measures.length > 0 && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                {newAssessment.outcome_measures.length} selected
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {suggested.length} category suggestions
                            </span>
                          </div>
                        </div>

                        {/* Selected measures summary */}
                        {newAssessment.outcome_measures.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pb-2.5 border-b border-slate-200/60">
                            {newAssessment.outcome_measures.map(m => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => toggleMeasure(m)}
                                className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-semibold rounded-full cursor-pointer hover:bg-rose-600 transition-colors"
                                title="Click to remove"
                              >
                                {m} ×
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Suggested categories for this joint */}
                        <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                          {suggested.map(group => {
                            const chipBase = colorMap[group.color] || colorMap.slate;
                            return (
                              <div key={group.category}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  {group.category}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {group.measures.map(m => {
                                    const isSelected = newAssessment.outcome_measures.includes(m);
                                    return (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => toggleMeasure(m)}
                                        className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                            : `${chipBase} hover:bg-slate-100`
                                        }`}
                                      >
                                        {m}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pain & Muscle Grade Card */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-slate-800">NPRS Pain Score</label>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                          newAssessment.pain_score >= 7 ? 'bg-rose-100 text-rose-700' : newAssessment.pain_score >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {newAssessment.pain_score} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={newAssessment.pain_score}
                        onChange={e => setNewAssessment({ ...newAssessment, pain_score: parseInt(e.target.value, 10) })}
                        className="w-full accent-rose-600 cursor-pointer h-1.5 rounded-lg bg-slate-200 mt-2"
                      />
                      <div className="flex justify-between text-[9px] text-slate-400 mt-1.5 font-medium">
                        <span>0 (No Pain)</span>
                        <span>5 (Moderate)</span>
                        <span>10 (Severe)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">Oxford Muscle Grade</label>
                      <select
                        value={newAssessment.muscle_grade}
                        onChange={e => setNewAssessment({ ...newAssessment, muscle_grade: e.target.value })}
                        className="w-full mt-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      >
                        <option value="Grade 0 (Zero)">Grade 0 (Zero)</option>
                        <option value="Grade 1 (Trace)">Grade 1 (Trace)</option>
                        <option value="Grade 2 (Poor)">Grade 2 (Poor)</option>
                        <option value="Grade 3 (Fair)">Grade 3 (Fair)</option>
                        <option value="Grade 4 (Good)">Grade 4 (Good)</option>
                        <option value="Grade 5 (Normal)">Grade 5 (Normal)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Save Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewAssessmentModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysioHub;
