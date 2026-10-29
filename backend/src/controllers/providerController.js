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

exports.getLinkableUsers = async (req, res, next) => {
  try {
    const users = await Provider.getLinkableUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

exports.createProvider = async (req, res, next) => {
  try {
    const { name, title, specializationId, specialization, isActive, userId, user_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Provider name is required.' });
    }

    const provider = await Provider.create({
      name,
      title,
      specializationId,
      specialization,
      isActive: isActive !== undefined ? isActive : 1,
      userId: userId !== undefined ? userId : user_id
    });

    await logAction(req, 'CREATE', 'provider', provider.id, { 
      name: provider.name, 
      title: provider.title, 
      specialization: provider.specialization,
      user_id: provider.user_id 
    });

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

    await logAction(req, 'UPDATE', 'provider', provider.id, { 
      name: provider.name, 
      is_active: provider.is_active,
      user_id: provider.user_id 
    });

    res.json({
      success: true,
      message: 'Provider updated successfully.',
      data: provider
    });
  } catch (err) {
    next(err);
  }
};

exports.linkUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, user_id } = req.body;
    const targetUserId = userId !== undefined ? userId : user_id;

    const provider = await Provider.linkUser(id, targetUserId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    await logAction(req, 'LINK_USER', 'provider', provider.id, {
      name: provider.name,
      user_id: provider.user_id,
      user_username: provider.user_username
    });

    res.json({
      success: true,
      message: targetUserId ? 'Provider linked to user successfully.' : 'Provider unlinked from user successfully.',
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

    const authCheck = await User.verifyAdminPassword(adminPassword, req.user.id);
    if (!authCheck.isValid) {
      return res.status(authCheck.status || 401).json({ success: false, message: authCheck.message });
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

exports.getPhysiotherapists = async (req, res, next) => {
  try {
    const physiotherapists = await Provider.getPhysiotherapists();
    res.json({ success: true, data: physiotherapists });
  } catch (err) {
    next(err);
  }
};
