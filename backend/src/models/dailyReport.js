'use strict';
const db = require('../config/db');

class DailyReport {
  /**
   * Fetch configuration including all departments, providers, and predefined procedure keys.
   */
  static async getConfig() {
    const { rows: departments } = await db.query(
      'SELECT id, name FROM departments ORDER BY id ASC'
    );
    const { rows: providers } = await db.query(
      `SELECT p.id, p.name, p.title, p.specialization, p.specialization_id, s.name as specialization_name,
              coalesce(s.name, p.specialization) as department_name
       FROM providers p
       LEFT JOIN specializations s ON p.specialization_id = s.id
       WHERE p.is_active = 1
       ORDER BY
         CASE WHEN p.specialization = 'PHYSIO' THEN 1 ELSE 0 END ASC,
         p.specialization ASC,
         p.id ASC`
    );
    
    // Default procedure metrics tracked in daily logs
    const defaultProcedureMetrics = [
      'Minor',
      'VAT',
      'EEG',
      'Hep. B',
      'VACCIN (CHILDREN)',
      'TMT',
      'ECG',
      'CASE DONE UNDER SEDATION',
      'TRANSFER with Ambulance',
      'Procedure by Surgeons',
      'Observation',
      'Incidence',
      'GYNECO. Assistants'
    ];

    return { departments, providers, defaultProcedureMetrics };
  }

  /**
   * Fetch daily report data for a specific date (both metrics and logs).
   */
  static async getByDate(reportDate) {
    const { rows: metrics } = await db.query(
      `SELECT id, report_date, provider_id, specialization_id, patient_count, follow_up_count 
       FROM daily_report_metrics 
       WHERE report_date = $1`,
      [reportDate]
    );

    const { rows: logs } = await db.query(
      `SELECT id, report_date, metric_name, metric_value 
       FROM daily_procedure_logs 
       WHERE report_date = $1`,
      [reportDate]
    );

    return { reportDate, metrics, logs };
  }

  /**
   * Save a bulk daily report.
   */
  static async saveDaily(reportDate, metrics, logs) {
    const statements = [
      {
        sql: 'DELETE FROM daily_report_metrics WHERE report_date = $1',
        args: [reportDate]
      },
      {
        sql: 'DELETE FROM daily_procedure_logs WHERE report_date = $1',
        args: [reportDate]
      }
    ];

    // Bulk insert new metrics
    for (const item of metrics) {
      statements.push({
        sql: `INSERT INTO daily_report_metrics (report_date, provider_id, specialization_id, patient_count, follow_up_count) 
              VALUES ($1, $2, $3, $4, $5)`,
        args: [reportDate, item.provider_id, item.specialization_id, parseInt(item.patient_count, 10) || 0, parseInt(item.follow_up_count, 10) || 0]
      });
    }

    // Bulk insert new logs
    for (const log of logs) {
      statements.push({
        sql: `INSERT INTO daily_procedure_logs (report_date, metric_name, metric_value) 
              VALUES ($1, $2, $3)`,
        args: [reportDate, log.metric_name, String(log.metric_value || '0')]
      });
    }

    await db.batch(statements);
    return { success: true };
  }

  /**
   * Fetch monthly report data.
   */
  static async getMonthlyData(year, month) {
    const formattedMonth = String(month).padStart(2, '0');
    const start = `${year}-${formattedMonth}-01`;
    const end = `${year}-${formattedMonth}-31`; // LibSQL handles date comparison perfectly

    const { rows: metrics } = await db.query(
      `SELECT m.id, m.report_date, m.provider_id, m.specialization_id, m.patient_count, m.follow_up_count,
              p.name as provider_name, p.title as provider_title,
              p.specialization as provider_specialization,
              p.specialization_id as original_specialization_id, s.name as specialization_name,
              sp.name as department_name
       FROM daily_report_metrics m
       JOIN providers p ON m.provider_id = p.id
       LEFT JOIN specializations s ON p.specialization_id = s.id
       LEFT JOIN specializations sp ON m.specialization_id = sp.id
       WHERE m.report_date >= $1 AND m.report_date <= $2
       ORDER BY m.report_date ASC`,
      [start, end]
    );

    const { rows: logs } = await db.query(
      `SELECT id, report_date, metric_name, metric_value 
       FROM daily_procedure_logs 
       WHERE report_date >= $1 AND report_date <= $2
       ORDER BY report_date ASC`,
      [start, end]
    );

    const config = await this.getConfig();

    return {
      year,
      month: formattedMonth,
      metrics,
      logs,
      departments: config.departments,
      providers: config.providers,
      defaultProcedureMetrics: config.defaultProcedureMetrics
    };
  }

  /**
   * Fetch weekly report data based on start and end dates.
   */
  static async getWeeklyData(startDate, endDate) {
    const { rows: metrics } = await db.query(
      `SELECT m.id, m.report_date, m.provider_id, m.specialization_id, m.patient_count, m.follow_up_count,
              p.name as provider_name, p.title as provider_title,
              p.specialization as provider_specialization,
              p.specialization_id as original_specialization_id, s.name as specialization_name,
              sp.name as department_name
       FROM daily_report_metrics m
       JOIN providers p ON m.provider_id = p.id
       LEFT JOIN specializations s ON p.specialization_id = s.id
       LEFT JOIN specializations sp ON m.specialization_id = sp.id
       WHERE m.report_date >= $1 AND m.report_date <= $2
       ORDER BY m.report_date ASC`,
      [startDate, endDate]
    );

    const { rows: logs } = await db.query(
      `SELECT id, report_date, metric_name, metric_value 
       FROM daily_procedure_logs 
       WHERE report_date >= $1 AND report_date <= $2
       ORDER BY report_date ASC`,
      [startDate, endDate]
    );

    const config = await this.getConfig();

    return {
      startDate,
      endDate,
      metrics,
      logs,
      departments: config.departments,
      providers: config.providers,
      defaultProcedureMetrics: config.defaultProcedureMetrics
    };
  }
}

module.exports = DailyReport;
