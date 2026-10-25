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

    // 3. Users with elevated access can view incident reports from their departments
    const elevatedMap = Incident.getElevatedDepartmentMap();
    const elevatedDepts = elevatedMap[role] || [];
    if (elevatedDepts.length > 0) {
      const incDept = (incident.department || '').toLowerCase();
      return elevatedDepts.some(d => incDept.includes(d.toLowerCase()));
    }

    return false;
  }

  static async getAll(filters = {}, user = null) {
    let query = `
      SELECT i.*, u.full_name as creator_name, r.full_name as reviewer_name
      FROM incident_reports i
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN users r ON i.reviewed_by = r.id
      WHERE 1=1
    `;
    const params = [];

    // Access control:
    // - Only HSFP and Admin can view ALL incidents
    // - Users with elevated access can view incident reports from their departments
    // - Everyone else can only view reports they created
    const userRole = (user?.role || '').toLowerCase();
    const canViewAll = user && ['hsfp', 'admin'].includes(userRole);

    if (!canViewAll) {
      const elevatedMap = Incident.getElevatedDepartmentMap();
      const elevatedDepts = elevatedMap[userRole] || [];

      if (elevatedDepts.length > 0) {
        // Elevated department access: Department incidents OR self-reported
        const deptConditions = elevatedDepts.map(d => {
          params.push(`%${d}%`);
          return `i.department ILIKE $${params.length}`;
        }).join(' OR ');

        params.push(user.id);
        query += ` AND (${deptConditions} OR i.created_by = $${params.length})`;
      } else {
        // Regular staff: ONLY their own reports
        params.push(user.id);
        query += ` AND i.created_by = $${params.length}`;
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
      query += ` AND i.department ILIKE $${params.length}`;
    }

    query += ` ORDER BY i.created_at DESC LIMIT 100`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findById(id) {
    let query = `SELECT i.*,
              u.full_name as creator_name,
              a.full_name as approver_name
       FROM incident_reports i
       LEFT JOIN users u ON i.created_by = u.id
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
