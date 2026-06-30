'use strict';
const db = require('../config/db');

// --- Support Tickets ---

exports.getTickets = async (req, res) => {
  try {
    const isITStaff = req.user.role === 'admin' || req.user.role === 'it_officer';
    let query = "SELECT * FROM it_tickets ORDER BY created_at DESC";
    let params = [];

    if (!isITStaff) {
      // Filter tickets for current user by user_id OR reporter matches their name/username
      query = `
        SELECT * FROM it_tickets 
        WHERE user_id = $1 
           OR reporter = $2 
           OR reporter = $3 
        ORDER BY created_at DESC
      `;
      params = [req.user.id, req.user.fullName || '', req.user.username || ''];
    }

    const { rows } = await db.query(query, params);
    res.json({ success: true, tickets: rows });
  } catch (error) {
    console.error('Error fetching IT tickets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { title, description, reporter, category, priority, working_station } = req.body;

    if (!title || !reporter || !category) {
      return res.status(400).json({ success: false, message: 'Title, reporter, and category are required' });
    }

    // Get max ID to generate next ticket number
    const { rows: maxRow } = await db.query("SELECT MAX(id) as maxId FROM it_tickets");
    const nextId = (Number(maxRow[0]?.maxId) || 0) + 1;
    const ticketNumber = `TKT-${String(nextId).padStart(3, '0')}`;

    const { rows: inserted } = await db.query(
      `INSERT INTO it_tickets (ticket_number, title, description, reporter, category, status, priority, user_id, working_station) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [ticketNumber, title, description || '', reporter, category, 'Open', priority || 'Medium', req.user.id, working_station || '']
    );

    res.status(201).json({ success: true, ticket: inserted[0] });
  } catch (error) {
    console.error('Error creating IT ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, title, description, reporter, category, working_station } = req.body;

    const { rows: existing } = await db.query("SELECT * FROM it_tickets WHERE id = $1", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const isITStaff = req.user.role === 'admin' || req.user.role === 'it_officer';

    await db.query(
      `UPDATE it_tickets 
       SET status = COALESCE($1, status), 
           priority = COALESCE($2, priority),
           title = COALESCE($3, title),
           description = COALESCE($4, description),
           reporter = COALESCE($5, reporter),
           category = COALESCE($6, category),
           working_station = COALESCE($7, working_station),
           it_intervention = CASE WHEN $8 = 1 THEN 1 ELSE it_intervention END
       WHERE id = $9`,
      [status, priority, title, description, reporter, category, working_station, isITStaff ? 1 : 0, id]
    );

    res.json({ success: true, message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Error updating IT ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
};

// --- Asset Directory ---

exports.getAssets = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM it_assets ORDER BY asset_tag ASC");
    res.json({ success: true, assets: rows });
  } catch (error) {
    console.error('Error fetching IT assets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assets' });
  }
};

exports.createAsset = async (req, res) => {
  try {
    const { name, assigned_to, department, status } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Asset name is required' });
    }

    // Get max ID to generate next asset tag
    const { rows: maxRow } = await db.query("SELECT MAX(id) as maxId FROM it_assets");
    const nextId = (Number(maxRow[0]?.maxId) || 0) + 1;
    const assetTag = `AST-EQP-${String(nextId).padStart(2, '0')}`;

    const { rows: inserted } = await db.query(
      "INSERT INTO it_assets (asset_tag, name, assigned_to, department, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [assetTag, name, assigned_to || '', department || '', status || 'Active']
    );

    res.status(201).json({ success: true, asset: inserted[0] });
  } catch (error) {
    console.error('Error creating IT asset:', error);
    res.status(500).json({ success: false, message: 'Failed to create asset' });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, name, assigned_to, department } = req.body;

    const { rows: existing } = await db.query("SELECT * FROM it_assets WHERE id = $1", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    await db.query(
      `UPDATE it_assets 
       SET status = COALESCE($1, status), 
           name = COALESCE($2, name),
           assigned_to = COALESCE($3, assigned_to),
           department = COALESCE($4, department)
       WHERE id = $5`,
      [status, name, assigned_to, department, id]
    );

    res.json({ success: true, message: 'Asset updated successfully' });
  } catch (error) {
    console.error('Error updating IT asset:', error);
    res.status(500).json({ success: false, message: 'Failed to update asset' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query("SELECT * FROM it_tickets WHERE id = $1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const isITStaff = req.user.role === 'admin' || req.user.role === 'it_officer';
    const ticket = rows[0];

    if (!isITStaff) {
      if (ticket.status === 'Resolved' && ticket.it_intervention === 1) {
        return res.status(403).json({ 
          success: false, 
          message: 'Cannot cancel a ticket that was resolved with IT intervention.' 
        });
      }
    }

    await db.query("DELETE FROM it_tickets WHERE id = $1", [id]);
    res.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting IT ticket:', error);
    res.status(500).json({ success: false, message: 'Failed to delete ticket' });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query("SELECT * FROM it_assets WHERE id = $1", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    await db.query("DELETE FROM it_assets WHERE id = $1", [id]);
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting IT asset:', error);
    res.status(500).json({ success: false, message: 'Failed to delete asset' });
  }
};
