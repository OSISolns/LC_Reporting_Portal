'use strict';
const Provider = require('../models/provider');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const { logAction } = require('../middleware/audit');

exports.getAllProviders = async (req, res, next) => {
  try {
    const { search, specializationId, activeOnly } = req.query;
    const providers = await Provider.getAll({
      search,
      specializationId,
      activeOnly: activeOnly === 'true' || activeOnly === '1'
    });
    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
};

exports.getSpecializations = async (req, res, next) => {
  try {
    const specializations = await Provider.getSpecializations();
    res.json({ success: true, data: specializations });
  } catch (err) {
    next(err);
  }
};

exports.createProvider = async (req, res, next) => {
  try {
    const { name, title, specializationId, specialization, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Provider name is required.' });
    }

    const provider = await Provider.create({
      name,
      title,
      specializationId,
      specialization,
      isActive: isActive !== undefined ? isActive : 1
    });

    await logAction(req, 'CREATE', 'provider', provider.id, { name: provider.name, title: provider.title, specialization: provider.specialization });

    res.status(201).json({
      success: true,
      message: 'Provider created successfully.',
      data: provider
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const provider = await Provider.update(id, req.body);

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    await logAction(req, 'UPDATE', 'provider', provider.id, { name: provider.name, is_active: provider.is_active });

    res.json({
      success: true,
      message: 'Provider updated successfully.',
      data: provider
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adminPassword } = req.body;

    if (!adminPassword) {
      return res.status(400).json({ success: false, message: 'Administrative password required to confirm deletion.' });
    }

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized request.' });
    }

    const isMatch = await bcrypt.compare(adminPassword, currentUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid administrative password. Deletion aborted.' });
    }

    const deletedProvider = await Provider.delete(id);
    if (!deletedProvider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    await logAction(req, 'DELETE', 'provider', id, { name: deletedProvider.name });

    res.json({
      success: true,
      message: 'Provider deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
