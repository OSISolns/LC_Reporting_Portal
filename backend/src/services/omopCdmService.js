'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const db = require('../config/db');

// ── Path to official OHDSI CDM v5.4 PostgreSQL DDL & Constraint Scripts ──────
const OHDSI_PG_DIR = path.join(__dirname, '../database/omop_cdm/OHDSI_CDM_Repo/inst/ddl/5.4/postgresql');

// ── Standard OMOP CDM Concept Mappings for Imaging ───────────────────────────
const MODALITY_CONCEPT_MAP = {
  CR: { procedure_concept_id: 4132049, label: 'Plain X-Ray / Digital Radiography', device_concept_id: 4132049 },
  DX: { procedure_concept_id: 4132049, label: 'Digital Radiography', device_concept_id: 4132049 },
  CT: { procedure_concept_id: 4164807, label: 'Computed Tomography (CT)', device_concept_id: 4164807 },
  MR: { procedure_concept_id: 4013636, label: 'Magnetic Resonance Imaging (MRI)', device_concept_id: 4013636 },
  US: { procedure_concept_id: 4181534, label: 'Diagnostic Ultrasound (US)', device_concept_id: 4181534 },
  MG: { procedure_concept_id: 4007871, label: 'Diagnostic Mammography (MG)', device_concept_id: 4007871 },
  PT: { procedure_concept_id: 4305490, label: 'Positron Emission Tomography (PET)', device_concept_id: 4305490 },
};

// Default concept fallback (Unmapped / General Procedure)
const DEFAULT_PROCEDURE_CONCEPT_ID = 4000000;
const RADIOLOGY_NOTE_CONCEPT_ID = 44814645; // OMOP Concept: Radiology Report
const EHR_ORDER_CONCEPT_ID = 38000275;      // OMOP Concept: EHR order

class OmopCdmService {
  /**
   * Get a PostgreSQL pool instance based on env vars, connection object, or connection string
   */
  static getPgPool(connectionInput) {
    if (typeof connectionInput === 'string' && connectionInput.trim()) {
      return new Pool({ connectionString: connectionInput });
    }
    if (typeof connectionInput === 'object' && connectionInput) {
      return new Pool({
        host: connectionInput.host || process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(connectionInput.port || process.env.PGPORT || process.env.DB_PORT || '5432', 10),
        user: connectionInput.user || process.env.PGUSER || process.env.DB_USER || 'postgres',
        password: connectionInput.password !== undefined ? connectionInput.password : (process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres'),
        database: connectionInput.database || process.env.PGDATABASE || process.env.DB_NAME || 'omop_cdm',
      });
    }
    return new Pool({
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',
      database: process.env.PGDATABASE || process.env.DB_NAME || 'omop_cdm',
    });
  }

  /**
   * Check if official OHDSI PostgreSQL DDL scripts exist
   */
  static getScriptPaths() {
    return {
      ddl: path.join(OHDSI_PG_DIR, 'OMOPCDM_postgresql_5.4_ddl.sql'),
      primaryKeys: path.join(OHDSI_PG_DIR, 'OMOPCDM_postgresql_5.4_primary_keys.sql'),
      indices: path.join(OHDSI_PG_DIR, 'OMOPCDM_postgresql_5.4_indices.sql'),
      constraints: path.join(OHDSI_PG_DIR, 'OMOPCDM_postgresql_5.4_constraints.sql'),
    };
  }

  /**
   * Initialize OMOP CDM PostgreSQL schema (Tables, Primary Keys, Indexes, Constraints)
   */
  static async initializeSchemaOnPostgres(connectionInput, schemaName = 'cdm') {
    const pool = this.getPgPool(connectionInput);
    const client = await pool.connect();
    const scripts = this.getScriptPaths();

    try {
      // Create target schema if not exists
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
      await client.query(`SET search_path TO ${schemaName}, public;`);

      // Read script files
      const ddlSql = fs.readFileSync(scripts.ddl, 'utf8');
      const pkSql = fs.readFileSync(scripts.primaryKeys, 'utf8');
      const idxSql = fs.readFileSync(scripts.indices, 'utf8');
      const constSql = fs.readFileSync(scripts.constraints, 'utf8');

      // 1. Execute DDL (Create Tables)
      console.log(`[OMOP CDM] Executing DDL in schema '${schemaName}'...`);
      await client.query(ddlSql);

      // 2. Execute Primary Keys
      console.log(`[OMOP CDM] Executing Primary Keys...`);
      await client.query(pkSql).catch(err => console.warn('[OMOP CDM] PK Notice:', err.message));

      // 3. Execute Indexes
      console.log(`[OMOP CDM] Executing Indexes...`);
      await client.query(idxSql).catch(err => console.warn('[OMOP CDM] Indexes Notice:', err.message));

      // 4. Execute Foreign Key Constraints
      console.log(`[OMOP CDM] Executing Foreign Keys...`);
      await client.query(constSql).catch(err => console.warn('[OMOP CDM] Constraints Notice:', err.message));

      return {
        success: true,
        message: `OMOP CDM v5.4 PostgreSQL schema initialized successfully in schema '${schemaName}'.`,
      };
    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Extract local Imaging Portal records and transform to OMOP CDM data structures
   */
  static async extractImagingDataForOmop() {
    // 1. Fetch Imaging Studies
    const { rows: studies } = await db.query(`
      SELECT s.*, 
             u.full_name AS technician_name
        FROM imaging_studies s
        LEFT JOIN users u ON s.performed_by = u.id
       ORDER BY s.id ASC
    `);

    // 2. Fetch Imaging Reports
    const { rows: reports } = await db.query(`
      SELECT r.*,
             u.full_name AS radiologist_name
        FROM imaging_reports r
        LEFT JOIN users u ON r.radiologist_id = u.id
    `);
    const reportMap = Object.fromEntries(reports.map(r => [r.study_id, r]));

    // 3. Fetch DICOM records
    let dicoms = [];
    try {
      const { rows } = await db.query(`SELECT * FROM imaging_series`);
      dicoms = rows || [];
    } catch {
      dicoms = [];
    }

    // 4. Transform to OMOP CDM Model Entities
    const persons = [];
    const procedureOccurrences = [];
    const deviceExposures = [];
    const notes = [];
    const measurements = [];

    const personMap = new Map();

    studies.forEach((study, idx) => {
      const pidStr = String(study.patient_id || '999999');
      // Create consistent numeric Person ID for OMOP
      const personId = Math.abs(pidStr.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) || (idx + 1000);

      if (!personMap.has(personId)) {
        personMap.set(personId, {
          person_id: personId,
          gender_concept_id: 8507, // 8507 = Male / 8532 = Female default placeholder
          year_of_birth: 1985,
          month_of_birth: 1,
          day_of_birth: 1,
          birth_datetime: '1985-01-01 00:00:00',
          race_concept_id: 38003585,
          ethnicity_concept_id: 38003564,
          location_id: null,
          provider_id: null,
          care_site_id: null,
          person_source_value: study.patient_name ? `${study.patient_name} (PID #${study.patient_id})` : pidStr,
          gender_source_value: 'Unspecified',
          race_source_value: 'African',
          ethnicity_source_value: 'Not Hispanic or Latino',
        });
        persons.push(personMap.get(personId));
      }

      const modInfo = MODALITY_CONCEPT_MAP[study.modality] || {
        procedure_concept_id: DEFAULT_PROCEDURE_CONCEPT_ID,
        label: study.modality || 'Imaging Study',
        device_concept_id: 4132049
      };

      const rawDate = study.acquired_at || study.scheduled_at || study.created_at || new Date();
      const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
      const isoStr = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      const studyDate = isoStr.slice(0, 10);
      const studyDatetime = isoStr.replace('T', ' ').slice(0, 19);

      // OMOP procedure_occurrence
      const procedureId = study.id;
      procedureOccurrences.push({
        procedure_occurrence_id: procedureId,
        person_id: personId,
        procedure_concept_id: modInfo.procedure_concept_id,
        procedure_date: studyDate,
        procedure_datetime: studyDatetime,
        procedure_end_date: studyDate,
        procedure_end_datetime: studyDatetime,
        procedure_type_concept_id: EHR_ORDER_CONCEPT_ID, // EHR Order / Diagnostic Study
        modifier_concept_id: 0,
        quantity: 1,
        provider_id: null,
        visit_occurrence_id: null,
        visit_detail_id: null,
        procedure_source_value: `${study.modality} - ${study.accession_number || ('IMG-' + study.id)}`,
        procedure_source_concept_id: modInfo.procedure_concept_id,
        modifier_source_value: study.sub_unit || 'Radiology Main',
      });

      // OMOP device_exposure (Imaging Modality Hardware)
      deviceExposures.push({
        device_exposure_id: study.id,
        person_id: personId,
        device_concept_id: modInfo.device_concept_id,
        device_exposure_start_date: studyDate,
        device_exposure_start_datetime: studyDatetime,
        device_exposure_end_date: studyDate,
        device_exposure_end_datetime: studyDatetime,
        device_type_concept_id: 44818707, // EHR Detail
        unique_device_id: `MODALITY-${study.modality}-${study.sub_unit || '01'}`,
        production_id: null,
        quantity: 1,
        provider_id: null,
        visit_occurrence_id: null,
        visit_detail_id: null,
        device_source_value: `${study.modality} Modality Workstation`,
        device_source_concept_id: modInfo.device_concept_id,
        unit_concept_id: null,
        unit_source_value: null,
      });

      // OMOP note (Radiology Report Narrative & Impression)
      const report = reportMap[study.id];
      if (report && (report.impression || report.findings_narrative || report.technique)) {
        const fullNoteText = [
          report.technique ? `TECHNIQUE: ${report.technique}` : '',
          report.findings_narrative ? `FINDINGS: ${report.findings_narrative}` : '',
          report.impression ? `IMPRESSION: ${report.impression}` : '',
          report.recommendations ? `RECOMMENDATIONS: ${report.recommendations}` : '',
        ].filter(Boolean).join('\n\n');

        notes.push({
          note_id: report.id || study.id,
          person_id: personId,
          note_date: studyDate,
          note_datetime: studyDatetime,
          note_type_concept_id: RADIOLOGY_NOTE_CONCEPT_ID, // Radiology Report Concept
          note_class_concept_id: 44814645,
          note_title: `Radiology Report - ${study.modality} (${study.accession_number || study.id})`,
          note_text: fullNoteText,
          encoding_concept_id: 0,
          language_concept_id: 4180186, // English
          provider_id: null,
          visit_occurrence_id: null,
          visit_detail_id: null,
          note_source_value: report.status || 'finalized',
          note_event_id: procedureId,
          note_event_field_concept_id: 1147314, // procedure_occurrence.procedure_occurrence_id
        });
      }

      // OMOP measurement (Quantitative DICOM metadata & series counts)
      const studyDicoms = dicoms.filter(d => d.study_id === study.id);
      measurements.push({
        measurement_id: study.id,
        person_id: personId,
        measurement_concept_id: 4218816, // Diagnostic imaging series count
        measurement_date: studyDate,
        measurement_datetime: studyDatetime,
        measurement_time: '00:00:00',
        measurement_type_concept_id: 44818707,
        operator_concept_id: 0,
        value_as_number: studyDicoms.length || 1,
        value_as_concept_id: 0,
        unit_concept_id: 0,
        range_low: null,
        range_high: null,
        provider_id: null,
        visit_occurrence_id: null,
        visit_detail_id: null,
        measurement_source_value: `PACS DICOM Series Count: ${studyDicoms.length}`,
        measurement_source_concept_id: 0,
        unit_source_value: 'series',
        value_source_value: String(studyDicoms.length),
      });
    });

    return {
      summary: {
        total_patients: persons.length,
        total_procedures: procedureOccurrences.length,
        total_devices: deviceExposures.length,
        total_notes: notes.length,
        total_measurements: measurements.length,
      },
      data: {
        persons,
        procedureOccurrences,
        deviceExposures,
        notes,
        measurements,
      },
    };
  }

  /**
   * Generate executable SQL INSERT script for PostgreSQL OMOP CDM
   */
  static async generateOmopInsertSql(schemaName = 'cdm') {
    const { summary, data } = await this.extractImagingDataForOmop();
    const sqlLines = [];

    sqlLines.push(`-- ============================================================================`);
    sqlLines.push(`-- OHDSI OMOP Common Data Model (CDM v5.4) - Imaging Portal Export`);
    sqlLines.push(`-- Generated At: ${new Date().toISOString()}`);
    sqlLines.push(`-- Schema: ${schemaName}`);
    sqlLines.push(`-- Summary: ${summary.total_patients} Patients, ${summary.total_procedures} Imaging Procedures, ${summary.total_notes} Radiology Reports`);
    sqlLines.push(`-- ============================================================================`);
    sqlLines.push(``);
    sqlLines.push(`SET search_path TO ${schemaName}, public;`);
    sqlLines.push(``);

    // 1. PERSON Inserts
    if (data.persons.length > 0) {
      sqlLines.push(`-- ── PERSON Table ─────────────────────────────────────────────────────────────`);
      data.persons.forEach(p => {
        const valStr = [
          p.person_id,
          p.gender_concept_id,
          p.year_of_birth,
          p.month_of_birth,
          p.day_of_birth,
          `'${p.birth_datetime}'`,
          p.race_concept_id,
          p.ethnicity_concept_id,
          'NULL', 'NULL', 'NULL',
          `'${p.person_source_value.replace(/'/g, "''")}'`,
          `'${p.gender_source_value}'`,
          0,
          `'${p.race_source_value}'`,
          0,
          `'${p.ethnicity_source_value}'`,
          0
        ].join(', ');
        sqlLines.push(`INSERT INTO ${schemaName}.person (person_id, gender_concept_id, year_of_birth, month_of_birth, day_of_birth, birth_datetime, race_concept_id, ethnicity_concept_id, location_id, provider_id, care_site_id, person_source_value, gender_source_value, gender_source_concept_id, race_source_value, race_source_concept_id, ethnicity_source_value, ethnicity_source_concept_id) VALUES (${valStr}) ON CONFLICT (person_id) DO NOTHING;`);
      });
      sqlLines.push(``);
    }

    // 2. PROCEDURE_OCCURRENCE Inserts
    if (data.procedureOccurrences.length > 0) {
      sqlLines.push(`-- ── PROCEDURE_OCCURRENCE Table (Imaging Exams) ───────────────────────────────`);
      data.procedureOccurrences.forEach(proc => {
        const valStr = [
          proc.procedure_occurrence_id,
          proc.person_id,
          proc.procedure_concept_id,
          `'${proc.procedure_date}'`,
          `'${proc.procedure_datetime}'`,
          `'${proc.procedure_end_date}'`,
          `'${proc.procedure_end_datetime}'`,
          proc.procedure_type_concept_id,
          proc.modifier_concept_id,
          proc.quantity,
          'NULL', 'NULL', 'NULL',
          `'${proc.procedure_source_value.replace(/'/g, "''")}'`,
          proc.procedure_source_concept_id,
          `'${proc.modifier_source_value}'`
        ].join(', ');
        sqlLines.push(`INSERT INTO ${schemaName}.procedure_occurrence (procedure_occurrence_id, person_id, procedure_concept_id, procedure_date, procedure_datetime, procedure_end_date, procedure_end_datetime, procedure_type_concept_id, modifier_concept_id, quantity, provider_id, visit_occurrence_id, visit_detail_id, procedure_source_value, procedure_source_concept_id, modifier_source_value) VALUES (${valStr}) ON CONFLICT (procedure_occurrence_id) DO NOTHING;`);
      });
      sqlLines.push(``);
    }

    // 3. DEVICE_EXPOSURE Inserts
    if (data.deviceExposures.length > 0) {
      sqlLines.push(`-- ── DEVICE_EXPOSURE Table (Imaging Modalities) ───────────────────────────────`);
      data.deviceExposures.forEach(dev => {
        const valStr = [
          dev.device_exposure_id,
          dev.person_id,
          dev.device_concept_id,
          `'${dev.device_exposure_start_date}'`,
          `'${dev.device_exposure_start_datetime}'`,
          `'${dev.device_exposure_end_date}'`,
          `'${dev.device_exposure_end_datetime}'`,
          dev.device_type_concept_id,
          `'${dev.unique_device_id}'`,
          'NULL',
          dev.quantity,
          'NULL', 'NULL', 'NULL',
          `'${dev.device_source_value}'`,
          dev.device_source_concept_id,
          'NULL', 'NULL'
        ].join(', ');
        sqlLines.push(`INSERT INTO ${schemaName}.device_exposure (device_exposure_id, person_id, device_concept_id, device_exposure_start_date, device_exposure_start_datetime, device_exposure_end_date, device_exposure_end_datetime, device_type_concept_id, unique_device_id, production_id, quantity, provider_id, visit_occurrence_id, visit_detail_id, device_source_value, device_source_concept_id, unit_concept_id, unit_source_value) VALUES (${valStr}) ON CONFLICT (device_exposure_id) DO NOTHING;`);
      });
      sqlLines.push(``);
    }

    // 4. NOTE Inserts (Radiology Reports)
    if (data.notes.length > 0) {
      sqlLines.push(`-- ── NOTE Table (Radiology Reports) ───────────────────────────────────────────`);
      data.notes.forEach(n => {
        const cleanText = (n.note_text || '').replace(/'/g, "''");
        const valStr = [
          n.note_id,
          n.person_id,
          `'${n.note_date}'`,
          `'${n.note_datetime}'`,
          n.note_type_concept_id,
          n.note_class_concept_id,
          `'${n.note_title.replace(/'/g, "''")}'`,
          `'${cleanText}'`,
          n.encoding_concept_id,
          n.language_concept_id,
          'NULL', 'NULL', 'NULL',
          `'${n.note_source_value}'`,
          n.note_event_id,
          n.note_event_field_concept_id
        ].join(', ');
        sqlLines.push(`INSERT INTO ${schemaName}.note (note_id, person_id, note_date, note_datetime, note_type_concept_id, note_class_concept_id, note_title, note_text, encoding_concept_id, language_concept_id, provider_id, visit_occurrence_id, visit_detail_id, note_source_value, note_event_id, note_event_field_concept_id) VALUES (${valStr}) ON CONFLICT (note_id) DO NOTHING;`);
      });
      sqlLines.push(``);
    }

    return {
      summary,
      sql: sqlLines.join('\n'),
    };
  }

  /**
   * Sync local Imaging Portal records directly into a target PostgreSQL OMOP CDM schema
   */
  static async syncImagingToPostgres(connectionInput, schemaName = 'cdm') {
    const { summary, sql } = await this.generateOmopInsertSql(schemaName);
    const pool = this.getPgPool(connectionInput);
    const client = await pool.connect();

    try {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
      await client.query(`SET search_path TO ${schemaName}, public;`);
      await client.query(sql);

      return {
        success: true,
        message: `Synchronized ${summary.total_procedures} Imaging Studies & ${summary.total_notes} Radiology Reports into PostgreSQL OMOP CDM schema '${schemaName}'.`,
        summary,
      };
    } finally {
      client.release();
      await pool.end();
    }
  }
}

module.exports = OmopCdmService;
