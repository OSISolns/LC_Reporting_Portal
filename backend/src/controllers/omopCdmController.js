'use strict';

const OmopCdmService = require('../services/omopCdmService');
const { logAction } = require('../middleware/audit');

// ── GET /api/imaging/omop/status ──────────────────────────────────────────────
exports.getStatus = async (req, res, next) => {
  try {
    const etlResult = await OmopCdmService.extractImagingDataForOmop();
    const cachedSummary = await OmopCdmService.getLocalSummary();

    res.json({
      success: true,
      data: {
        omop_version: 'v5.4',
        mode: 'local_db_cache',
        etl_summary: etlResult.summary,
        cached_summary: cachedSummary,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/imaging/omop/init-schema ─────────────────────────────────────────
exports.initSchema = async (req, res, next) => {
  try {
    const result = await OmopCdmService.initializeLocalSchema();
    await logAction(req, 'OMOP_INIT_SCHEMA', 'omop_cdm', 0, {});
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to initialize local OMOP CDM cache schema: ${err.message}`,
    });
  }
};

// ── POST /api/imaging/omop/sync ────────────────────────────────────────────────
exports.syncData = async (req, res, next) => {
  try {
    const result = await OmopCdmService.syncToLocalDb();
    await logAction(req, 'OMOP_SYNC_DATA', 'omop_cdm', 0, { count: result.summary?.total_procedures });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to sync Imaging data to local OMOP CDM cache: ${err.message}`,
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
