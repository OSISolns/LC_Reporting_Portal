'use strict';
const db = require('../config/db');

class Incident {
  static async create(data, userId) {
    const {
      incidentType, department, areaOfIncident, namesInvolved,
      pidNumber, description, contributingFactors,
      immediateActions, preventionMeasures
    } = data;

    const { rows } = await db.query(
      `INSERT INTO incident_reports (
        incident_type, department, area_of_incident, names_involved,
        pid_number, description, contributing_factors,
        immediate_actions, prevention_measures, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *`,
      [
        incidentType, department, areaOfIncident, namesInvolved,
        pidNumber, description, contributingFactors,
        immediateActions, preventionMeasures, userId
      ]
    );
    return rows[0];
  }

  static getElevatedDepartmentMap() {
    return {
      // Nursing & Inpatient Units
      'chef-nurse': ['Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Maternity', 'ICU', 'Triage'],
      'chef_nurse': ['Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Maternity', 'ICU', 'Triage'],
      'chief_nurse': ['Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Maternity', 'ICU', 'Triage'],
      'chief-nurse': ['Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Maternity', 'ICU', 'Triage'],
      'deputy_chef_nurse': ['Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Maternity', 'ICU', 'Triage'],
      'deputy-chef-nurse': ['Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Maternity', 'ICU', 'Triage'],
      'deputy_chief_nurse': ['Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Maternity', 'ICU', 'Triage'],

      // Laboratory & Sub-sections
      'lab_hod': ['Laboratory', 'Lab', 'Biochemistry', 'Microbiology', 'Hematology', 'Histopathology', 'Molecular', 'Phlebotomy', 'POCT'],
      'lab_manager': ['Laboratory', 'Lab', 'Biochemistry', 'Microbiology', 'Hematology', 'Histopathology', 'Molecular', 'Phlebotomy', 'POCT'],
      'lab_lead': ['Laboratory', 'Lab', 'Biochemistry', 'Microbiology', 'Hematology', 'Histopathology', 'Molecular', 'Phlebotomy', 'POCT'],
      'lab_team_lead': ['Laboratory', 'Lab', 'Biochemistry', 'Microbiology', 'Hematology', 'Histopathology', 'Molecular', 'Phlebotomy', 'POCT'],
      'lab_safety_officer': ['Laboratory', 'Lab'],
      'head_biochemistry': ['Biochemistry', 'Laboratory', 'Lab'],
      'head_microbiology': ['Microbiology', 'Laboratory', 'Lab'],
      'head_hematology': ['Hematology', 'Laboratory', 'Lab'],
      'head_histopathology': ['Histopathology', 'Laboratory', 'Lab'],
      'head_molecular_biology': ['Molecular', 'Laboratory', 'Lab'],
      'head_phlebotomy': ['Phlebotomy', 'Laboratory', 'Lab'],
      'head_poct': ['POCT', 'Laboratory', 'Lab'],

      // Dental Department & Lab
      'dental_hod': ['Dental', 'Dental Clinic', 'Dental Lab', 'Orthodontics'],
      'dental_lab_manager': ['Dental', 'Dental Lab'],

      // Radiology & Imaging
      'imaging_manager': ['Imaging', 'Radiology', 'X-Ray', 'CT', 'Ultrasound', 'MRI'],

      // Physiotherapy
      'physio_manager': ['Physiotherapy', 'Physio', 'Rehabilitation'],

      // Logistics & Facilities & Transport
      'logistics_manager': ['Logistics', 'Facilities', 'Transport', 'Fleet', 'Maintenance'],
      'logistics_officer': ['Logistics', 'Transport', 'Fleet'],

      // Procurement & Store
      'procurement-manager': ['Procurement', 'Store', 'Central Store', 'Inventory'],
      'stock-manager': ['Store', 'Central Store', 'Inventory', 'Stock'],

      // Medical & Clinical Directors
      'medical_director': ['Clinical', 'Medical', 'Medicine', 'Doctor', 'Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Surgery', 'Maternity', 'Pediatric', 'Laboratory', 'Imaging', 'Pharmacy', 'Dental', 'Physiotherapy'],
      'medical-director': ['Clinical', 'Medical', 'Medicine', 'Doctor', 'Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Surgery', 'Maternity', 'Pediatric', 'Laboratory', 'Imaging', 'Pharmacy', 'Dental', 'Physiotherapy'],
      'clinical_director': ['Clinical', 'Medical', 'Medicine', 'Doctor', 'Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Surgery', 'Maternity', 'Pediatric', 'Laboratory', 'Imaging', 'Pharmacy', 'Dental', 'Physiotherapy'],
      'clinical-director': ['Clinical', 'Medical', 'Medicine', 'Doctor', 'Nursing', 'Ward', 'Inpatient', 'OPD', 'Emergency', 'Surgery', 'Maternity', 'Pediatric', 'Laboratory', 'Imaging', 'Pharmacy', 'Dental', 'Physiotherapy'],

      // Sales & Billing
      'sales_manager': ['Sales', 'Cashier', 'Billing', 'Customer Care'],
      'principal_cashier': ['Cashier', 'Billing', 'Finance'],

      // IT Support
      'it_officer': ['IT', 'Information Technology', 'Systems', 'Biomedical']
    };
  }

  static canUserViewIncident(user, incident) {
    if (!user || !incident) return false;
    const role = (user.role || '').toLowerCase();
    
    // 1. Only HSFP and Admin can view all incidents across the hospital
    if (['hsfp', 'admin'].includes(role)) return true;

    // 2. Creator can always view their own incident report
    if (Number(incident.created_by) === Number(user.id)) return true;

    const incDept = (incident.department || '').toLowerCase();
    const incType = (incident.incident_type || '').toLowerCase();
    const creatorRole = (incident.creator_role || '').toLowerCase();

    // 3. Medical Director & Clinical Director: Can view all medical and clinical incident reports
    const MEDICAL_CLINICAL_DIRECTOR_ROLES = [
      'medical_director', 'medical-director',
      'clinical_director', 'clinical-director',
      'deputy_medical_director', 'deputy-medical-director',
      'deputy_clinical_director', 'deputy-clinical-director'
    ];
    if (MEDICAL_CLINICAL_DIRECTOR_ROLES.includes(role)) {
      const CLINICAL_DEPTS = [
        'clinical', 'medical', 'medicine', 'doctor', 'physician', 'consultation', 'specialist',
        'nursing', 'nurse', 'ward', 'inpatient', 'ipd', 'opd', 'outpatient', 'day care',
        'emergency', 'er', 'casualty', 'triage', 'resuscitation', 'ambulance',
        'icu', 'nicu', 'picu', 'hdu', 'critical care',
        'surgery', 'surgical', 'theatre', 'ot', 'recovery', 'pacu', 'anesthesia', 'anaesthesia', 'minor surgery',
        'maternity', 'labour', 'delivery', 'anc', 'pnc', 'midwife', 'midwifery', 'obstetrics', 'gynaecology', 'obgyn',
        'pediatric', 'pediatrics', 'paediatric', 'paediatrics', 'neonatal', 'child health', 'vaccination', 'immunization',
        'laboratory', 'lab', 'biochemistry', 'microbiology', 'hematology', 'histopathology', 'molecular', 'phlebotomy', 'poct', 'pathology', 'blood bank', 'transfusion',
        'imaging', 'radiology', 'x-ray', 'ct', 'ultrasound', 'sonography', 'mri', 'echo',
        'pharmacy', 'dispensary', 'medication',
        'dental', 'dentist', 'orthodontics', 'stomatology',
        'physiotherapy', 'physio', 'rehabilitation', 'rehab',
        'dialysis', 'endoscopy', 'cardiology', 'oncology', 'ophthalmology', 'ent', 'dermatology'
      ];
      const CLINICAL_ROLES = [
        'doctor', 'medical_director', 'medical-director', 'clinical_director', 'clinical-director', 'consultant',
        'nurse', 'rn_midwife', 'chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse',
        'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse',
        'lab_hod', 'lab_manager', 'lab_lead', 'lab_team_lead', 'lab_safety_officer', 'lab_stock_officer',
        'head_biochemistry', 'head_microbiology', 'head_hematology', 'head_histopathology',
        'head_molecular_biology', 'head_phlebotomy', 'head_poct', 'lab_micro_specialist',
        'lab_scientist', 'lab_tech', 'lab',
        'imaging_manager', 'imaging_tech', 'radiologist', 'sono', 'imaging',
        'dental_hod', 'dental_tech', 'dental_lab_manager', 'dental', 'dentist',
        'physio_manager', 'physio', 'physiotherapist'
      ];

      if (CLINICAL_DEPTS.some(d => incDept.includes(d))) return true;
      if (incType === 'patient') return true;
      if (incident.pid_number && String(incident.pid_number).trim() !== '') return true;
      if (creatorRole && CLINICAL_ROLES.includes(creatorRole)) return true;
    }

    // 4. Chef Nurse: Can view all nursing incident reports
    const CHEF_NURSE_ROLES = [
      'chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse',
      'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse'
    ];
    if (CHEF_NURSE_ROLES.includes(role)) {
      const NURSING_DEPTS = [
        'nursing', 'nurse', 'ward', 'inpatient', 'ipd', 'opd', 'outpatient',
        'emergency', 'er', 'maternity', 'labour', 'delivery', 'anc', 'pnc',
        'midwife', 'midwifery', 'icu', 'nicu', 'picu', 'hdu', 'triage',
        'pediatric', 'pediatrics', 'surgical ward', 'medical ward', 'recovery', 'theatre', 'ot'
      ];
      const NURSING_ROLES = [
        'nurse', 'rn_midwife', 'chef-nurse', 'chef_nurse', 'chief_nurse',
        'chief-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse'
      ];
      if (NURSING_DEPTS.some(d => incDept.includes(d))) return true;
      if (creatorRole && NURSING_ROLES.includes(creatorRole)) return true;
    }

    // 5. COO & Deputy COO: Can view all operations-related incident reports
    const COO_ROLES = ['coo', 'deputy_coo', 'deputy-coo'];
    if (COO_ROLES.includes(role)) {
      const OPERATIONS_DEPTS = [
        'operation', 'operations', 'logistics', 'fleet', 'transport',
        'facility', 'facilities', 'maintenance', 'power', 'biomedical',
        'procurement', 'store', 'central store', 'inventory', 'stock',
        'cashier', 'billing', 'sales', 'finance', 'revenue',
        'customer care', 'reception', 'front desk',
        'it', 'information technology', 'systems',
        'security', 'hygiene', 'housekeeping', 'cleaning',
        'administration', 'admin'
      ];
      const OPERATIONS_ROLES = [
        'operations', 'operations_staff', 'logistics_manager', 'logistics_officer',
        'procurement-manager', 'stock-manager', 'cashier', 'principal_cashier',
        'sales_manager', 'customer_care', 'it_officer', 'facilities_manager',
        'fleet_officer', 'coo', 'deputy_coo', 'deputy-coo'
      ];
      if (OPERATIONS_DEPTS.some(d => incDept.includes(d))) return true;
      if (incType === 'equipment') return true;
      if (creatorRole && OPERATIONS_ROLES.includes(creatorRole)) return true;
    }

    // 6. Other department leads with elevated access
    const elevatedMap = Incident.getElevatedDepartmentMap();
    const elevatedDepts = elevatedMap[role] || [];
    if (elevatedDepts.length > 0) {
      if (elevatedDepts.some(d => incDept.includes(d.toLowerCase()))) return true;
    }

    return false;
  }

  static async getAll(filters = {}, user = null) {
    let query = `
      SELECT i.*,
             u.full_name as creator_name,
             ro.name as creator_role,
             r.full_name as reviewer_name
      FROM incident_reports i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN roles ro ON u.role_id = ro.id
      LEFT JOIN users r ON i.reviewed_by = r.id
      WHERE 1=1
    `;
    const params = [];

    // Access control:
    // - HSFP and Admin can view ALL incidents
    // - Medical Director and Clinical Director can view all Medical & Clinical incident reports
    // - Chef Nurse can view all Nursing incident reports
    // - COO and Deputy COO can view all Operations-related incident reports
    // - Elevated managers view their department incidents
    // - Regular staff view only reports they created
    const userRole = (user?.role || '').toLowerCase();
    const canViewAll = user && ['hsfp', 'admin'].includes(userRole);

    if (!canViewAll) {
      const MEDICAL_CLINICAL_DIRECTOR_ROLES = [
        'medical_director', 'medical-director',
        'clinical_director', 'clinical-director',
        'deputy_medical_director', 'deputy-medical-director',
        'deputy_clinical_director', 'deputy-clinical-director'
      ];
      const CHEF_NURSE_ROLES = [
        'chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse',
        'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse'
      ];
      const COO_ROLES = ['coo', 'deputy_coo', 'deputy-coo'];

      if (MEDICAL_CLINICAL_DIRECTOR_ROLES.includes(userRole)) {
        // Medical & Clinical Directors: All Medical & Clinical incident reports + Patient-related incidents + own reports
        const CLINICAL_DEPTS = [
          'Clinical', 'Medical', 'Medicine', 'Doctor', 'Physician', 'Consultation', 'Specialist',
          'Nursing', 'Nurse', 'Ward', 'Inpatient', 'IPD', 'OPD', 'Outpatient', 'Day Care',
          'Emergency', 'ER', 'Casualty', 'Triage', 'Resuscitation', 'Ambulance',
          'ICU', 'NICU', 'PICU', 'HDU', 'Critical Care',
          'Surgery', 'Surgical', 'Theatre', 'OT', 'Recovery', 'PACU', 'Anesthesia', 'Anaesthesia', 'Minor Surgery',
          'Maternity', 'Labour', 'Delivery', 'ANC', 'PNC', 'Midwife', 'Midwifery', 'Obstetrics', 'Gynaecology', 'OBGYN',
          'Pediatric', 'Pediatrics', 'Paediatric', 'Paediatrics', 'Neonatal', 'Child Health', 'Vaccination', 'Immunization',
          'Laboratory', 'Lab', 'Biochemistry', 'Microbiology', 'Hematology', 'Histopathology', 'Molecular', 'Phlebotomy', 'POCT', 'Pathology', 'Blood Bank', 'Transfusion',
          'Imaging', 'Radiology', 'X-Ray', 'CT', 'Ultrasound', 'Sonography', 'MRI', 'Echo',
          'Pharmacy', 'Dispensary', 'Medication',
          'Dental', 'Dentist', 'Orthodontics', 'Stomatology',
          'Physiotherapy', 'Physio', 'Rehabilitation', 'Rehab',
          'Dialysis', 'Endoscopy', 'Cardiology', 'Oncology', 'Ophthalmology', 'ENT', 'Dermatology'
        ];
        const CLINICAL_ROLES = [
          'doctor', 'medical_director', 'medical-director', 'clinical_director', 'clinical-director', 'consultant',
          'nurse', 'rn_midwife', 'chef-nurse', 'chef_nurse', 'chief_nurse', 'chief-nurse',
          'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse',
          'lab_hod', 'lab_manager', 'lab_lead', 'lab_team_lead', 'lab_safety_officer', 'lab_stock_officer',
          'head_biochemistry', 'head_microbiology', 'head_hematology', 'head_histopathology',
          'head_molecular_biology', 'head_phlebotomy', 'head_poct', 'lab_micro_specialist',
          'lab_scientist', 'lab_tech', 'lab',
          'imaging_manager', 'imaging_tech', 'radiologist', 'sono', 'imaging',
          'dental_hod', 'dental_tech', 'dental_lab_manager', 'dental', 'dentist',
          'physio_manager', 'physio', 'physiotherapist'
        ];

        const deptClauses = CLINICAL_DEPTS.map(d => {
          params.push(`%${d}%`);
          return `LOWER(i.department) LIKE LOWER($${params.length})`;
        }).join(' OR ');

        const roleClauses = CLINICAL_ROLES.map(r => {
          params.push(r);
          return `LOWER(ro.name) = LOWER($${params.length})`;
        }).join(' OR ');

        params.push('Patient');
        const patientClause = `LOWER(i.incident_type) = LOWER($${params.length})`;

        const pidClause = `(i.pid_number IS NOT NULL AND TRIM(i.pid_number) != '')`;

        params.push(user.id);
        const ownClause = `i.created_by = $${params.length}`;

        query += ` AND (${deptClauses} OR ${roleClauses} OR ${patientClause} OR ${pidClause} OR ${ownClause})`;
      } else if (CHEF_NURSE_ROLES.includes(userRole)) {
        // Chef Nurse: All Nursing incident reports + own reports
        const NURSING_DEPTS = [
          'Nursing', 'Nurse', 'Ward', 'Inpatient', 'IPD', 'OPD', 'Outpatient',
          'Emergency', 'Maternity', 'Labour', 'Delivery', 'ANC', 'PNC',
          'Midwife', 'Midwifery', 'ICU', 'NICU', 'PICU', 'HDU', 'Triage',
          'Pediatric', 'Pediatrics', 'Surgical Ward', 'Medical Ward', 'Recovery', 'Theatre', 'OT'
        ];
        const NURSING_ROLES = [
          'nurse', 'rn_midwife', 'chef-nurse', 'chef_nurse', 'chief_nurse',
          'chief-nurse', 'deputy_chef_nurse', 'deputy-chef-nurse', 'deputy_chief_nurse'
        ];

        const deptClauses = NURSING_DEPTS.map(d => {
          params.push(`%${d}%`);
          return `LOWER(i.department) LIKE LOWER($${params.length})`;
        }).join(' OR ');

        const roleClauses = NURSING_ROLES.map(r => {
          params.push(r);
          return `LOWER(ro.name) = LOWER($${params.length})`;
        }).join(' OR ');

        params.push(user.id);
        const ownClause = `i.created_by = $${params.length}`;

        query += ` AND (${deptClauses} OR ${roleClauses} OR ${ownClause})`;
      } else if (COO_ROLES.includes(userRole)) {
        // COO & Deputy COO: All Operations-related incident reports + Equipment incidents + own reports
        const OPERATIONS_DEPTS = [
          'Operation', 'Operations', 'Logistics', 'Fleet', 'Transport',
          'Facility', 'Facilities', 'Maintenance', 'Power', 'Biomedical',
          'Procurement', 'Store', 'Central Store', 'Inventory', 'Stock',
          'Cashier', 'Billing', 'Sales', 'Finance', 'Revenue',
          'Customer Care', 'Reception', 'Front Desk',
          'IT', 'Information Technology', 'Systems',
          'Security', 'Hygiene', 'Housekeeping', 'Cleaning',
          'Administration', 'Admin'
        ];
        const OPERATIONS_ROLES = [
          'operations', 'operations_staff', 'logistics_manager', 'logistics_officer',
          'procurement-manager', 'stock-manager', 'cashier', 'principal_cashier',
          'sales_manager', 'customer_care', 'it_officer', 'facilities_manager',
          'fleet_officer', 'coo', 'deputy_coo', 'deputy-coo'
        ];

        const deptClauses = OPERATIONS_DEPTS.map(d => {
          params.push(`%${d}%`);
          return `LOWER(i.department) LIKE LOWER($${params.length})`;
        }).join(' OR ');

        const roleClauses = OPERATIONS_ROLES.map(r => {
          params.push(r);
          return `LOWER(ro.name) = LOWER($${params.length})`;
        }).join(' OR ');

        params.push('Equipment');
        const equipmentClause = `LOWER(i.incident_type) = LOWER($${params.length})`;

        params.push(user.id);
        const ownClause = `i.created_by = $${params.length}`;

        query += ` AND (${deptClauses} OR ${roleClauses} OR ${equipmentClause} OR ${ownClause})`;
      } else {
        const elevatedMap = Incident.getElevatedDepartmentMap();
        const elevatedDepts = elevatedMap[userRole] || [];

        if (elevatedDepts.length > 0) {
          const deptConditions = elevatedDepts.map(d => {
            params.push(`%${d}%`);
            return `LOWER(i.department) LIKE LOWER($${params.length})`;
          }).join(' OR ');

          params.push(user.id);
          query += ` AND (${deptConditions} OR i.created_by = $${params.length})`;
        } else {
          // Regular staff: ONLY their own reports
          params.push(user.id);
          query += ` AND i.created_by = $${params.length}`;
        }
      }
    }

    if (filters.status) {
      params.push(filters.status);
      query += ` AND i.status = $${params.length}`;
    }
    if (filters.type) {
      params.push(filters.type);
      query += ` AND i.incident_type = $${params.length}`;
    }
    if (filters.department) {
      params.push(`%${filters.department}%`);
      query += ` AND LOWER(i.department) LIKE LOWER($${params.length})`;
    }

    query += ` ORDER BY i.created_at DESC LIMIT 100`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    let query = `SELECT i.*,
              u.full_name as creator_name,
              ro.name as creator_role,
              a.full_name as approver_name
       FROM incident_reports i
       LEFT JOIN users u ON i.created_by = u.id
       LEFT JOIN roles ro ON u.role_id = ro.id
       LEFT JOIN users a ON i.approved_by = a.id
       WHERE i.id = $1`;
    const params = [id];

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  static async approve(id, approverId, data) {
    const {
      comments,
      rca_environment,
      rca_staff,
      rca_equipment,
      rca_policy,
      rca_verification_json,
      corrective_actions_json
    } = data;

    const { rows } = await db.query(
      `UPDATE incident_reports
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           hsfp_comments = $2,
           rca_environment = $3,
           rca_staff = $4,
           rca_equipment = $5,
           rca_policy = $6,
           rca_verification_json = $7,
           corrective_actions_json = $8,
           updated_at = NOW()
       WHERE id = $9 AND status = 'pending'
       RETURNING *`,
      [
        approverId,
        comments,
        rca_environment,
        rca_staff,
        rca_equipment,
        rca_policy,
        rca_verification_json,
        corrective_actions_json,
        id
      ]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM incident_reports WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Incident;
