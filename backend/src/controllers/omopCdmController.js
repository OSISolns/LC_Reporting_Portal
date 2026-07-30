'use strict';

const OmopCdmService = require('../services/omopCdmService');
const { logAction } = require('../middleware/audit');

// ── GET /api/imaging/omop/status ──────────────────────────────────────────────
exports.getStatus = async (req, res, next) => {
  try {
    const scripts = OmopCdmService.getScriptPaths();
    const etlResult = await OmopCdmService.extractImagingDataForOmop();

    res.json({
      success: true,
      data: {
        omop_version: 'v5.4',
        target_dialect: 'PostgreSQL',
        scripts_available: true,
        postgres_env: {
          configured: !!(process.env.PGHOST || process.env.PG_URI || process.env.DATABASE_URL),
          host: process.env.PGHOST || 'localhost',
          database: process.env.PGDATABASE || 'omop_cdm',
        },
        etl_summary: etlResult.summary,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/imaging/omop/init-schema ─────────────────────────────────────────
exports.initSchema = async (req, res, next) => {
  try {
    const { connectionString, host, port, user, password, database, schema = 'cdm' } = req.body || {};
    const connectionInput = connectionString || (host ? { host, port, user, password, database } : null);
    const result = await OmopCdmService.initializeSchemaOnPostgres(connectionInput, schema);
    await logAction(req, 'OMOP_INIT_SCHEMA', 'omop_cdm', 0, { schema });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to initialize PostgreSQL OMOP CDM schema: ${err.message}`,
    });
  }
};

// ── POST /api/imaging/omop/sync ────────────────────────────────────────────────
exports.syncData = async (req, res, next) => {
  try {
    const { connectionString, host, port, user, password, database, schema = 'cdm' } = req.body || {};
    const connectionInput = connectionString || (host ? { host, port, user, password, database } : null);
    const result = await OmopCdmService.syncImagingToPostgres(connectionInput, schema);
    await logAction(req, 'OMOP_SYNC_DATA', 'omop_cdm', 0, { schema, count: result.summary?.total_procedures });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to sync Imaging data to PostgreSQL OMOP CDM: ${err.message}`,
    });
  }
};

// ── GET /api/imaging/omop/export-sql ──────────────────────────────────────────
exports.exportSql = async (req, res, next) => {
  try {
    const schema = req.query.schema || 'cdm';
    const result = await OmopCdmService.generateOmopInsertSql(schema);

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="OMOP_CDM_v5.4_Imaging_Export.sql"`);
    res.send(result.sql);
  } catch (err) { next(err); }
};
