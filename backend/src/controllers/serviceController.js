'use strict';
const Service = require('../models/service');

exports.getAllServices = async (req, res, next) => {
  try {
    const { search, category, department, activeOnly } = req.query;
    const services = await Service.getAll({
      search,
      category,
      department,
      activeOnly: activeOnly === undefined ? true : (activeOnly === 'true' || activeOnly === '1')
    });
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
};

exports.getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
};
