'use strict';

const mammoth = require('mammoth');
const cheerio = require('cheerio');
const db = require('../config/db');

/**
 * Data Cleansing Function
 * Scrubs phone numbers and Team Lead (TL) identifiers from staff roster strings.
 * 
 * Inline Regex Explanations:
 * 1. /\(\s*T\.?L\.?\s*:?\s*[\d\s\-]+\)/gi
 *    - \(\s* : Matches opening parenthesis and any optional leading whitespace.
 *    - T\.?L\.? : Matches 'TL', 'T.L', 'T.L.', 'TL.', case-insensitive ('gi' flags).
 *    - \s*:?\s* : Matches optional colon and surrounding spaces (e.g. 'TL:', 'T.L: ', 'TL :').
 *    - [\d\s\-]+ : Matches the phone digits, spaces, and hyphens inside the parenthesis.
 *    - \) : Matches closing parenthesis.
 *    Replaces patterns like "(T.L:0788670200)", "(TL: 0783021075)", "(TL:0 788535627)".
 * 
 * 2. /\b(?:\+?250|0)[67]\d[\d\s\-]{6,12}\b/g
 *    - \b : Word boundary ensuring we don't match middle of words.
 *    - (?:\+?250|0) : Non-capturing group matching Rwandan country code '+250', '250', or local leading '0'.
 *    - [67]\d : Matches '78', '79', '72', '73', '68' etc (Rwandan mobile prefixes).
 *    - [\d\s\-]{6,12} : Matches remaining 6 to 12 digits, spaces, or hyphens.
 *    - \b : Word boundary.
 *    Replaces raw standalone 10-digit or formatted phone numbers (e.g. 0788670200, +250788670200).
 * 
 * 3. /\(\s*[\d\s\-]{8,}\s*\)/g
 *    - Matches any leftover parenthesised number sequences containing 8+ digits/hyphens/spaces.
 */
function scrubSensitiveData(text) {
  if (!text) return '';
  
  return text
    // 1. Remove Team Lead markers with phone numbers e.g. (T.L:0788670200) or (TL: 078 302 1075)
    .replace(/\(\s*T\.?L\.?\s*:?\s*[\d\s\-]+\)/gi, '')
    // 2. Remove standalone phone numbers e.g. 0788670200 or +250788670200
    .replace(/\b(?:\+?250|0)[67]\d[\d\s\-]{6,12}\b/g, '')
    // 3. Remove residual parenthesised phone numbers e.g. (0788123456)
    .replace(/\(\s*[\d\s\-]{8,}\s*\)/g, '')
    // Clean up multiple spaces and trim
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Checks if the uploaded document is a valid duty roster.
 */
function isDutyRoster(rawDocText, $) {
  if (!rawDocText || typeof rawDocText !== 'string' || rawDocText.trim().length < 10) {
    return false;
  }

  const lowerText = rawDocText.toLowerCase();

  // Explicit title / roster keyword indicators
  const hasRosterTitle = /\b(duty\s*roster|staff\s*roster|doctor'?s?\s*schedule|duty\s*schedule|shift\s*roster|roster)\b/i.test(lowerText);

  // Check matching clinical / paramedical units
  const matchedUnits = ALLOWED_UNITS.filter(u => lowerText.includes(u));
  const hasEnt = ENT_REGEX.test(lowerText);
  const totalMatchedUnits = matchedUnits.length + (hasEnt ? 1 : 0);

  // Roster table / shift indicators
  const hasShiftKeywords = /\b(morning\s*\/\s*time|evening\s*\/\s*time|dept\s*\/\s*unit|doctors?\s*\/\s*providers?|morning|evening|paramedical\s+staff|clinical\s+plaza)\b/i.test(lowerText);

  // Check for table structure
  const hasTable = $ && $('table').length > 0;

  // A document is a duty roster if it matches roster title/keywords, OR has table with shift/unit terms, OR matches clinical units with shift terms
  if (hasRosterTitle || (hasTable && (hasShiftKeywords || totalMatchedUnits >= 1)) || (totalMatchedUnits >= 2 && hasShiftKeywords)) {
    return true;
  }

  return false;
}

/**
 * Extracts the date indicated on the roster document.
 * Returns a JS Date object if found, or null if no valid date pattern was identified.
 */
function extractRosterDate(rawDocText) {
  if (!rawDocText) return null;

  const currentYear = new Date().getFullYear();
  const monthNamesFull = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const parseMonth = (str) => {
    if (!str) return -1;
    const rawMonth = str.toLowerCase().trim();
    if (/^\d{1,2}$/.test(rawMonth)) {
      const idx = parseInt(rawMonth, 10) - 1;
      return (idx >= 0 && idx <= 11) ? idx : -1;
    }
    const cleanMonth = rawMonth.replace(/[^a-z]/g, '');
    let idx = monthNamesFull.findIndex(m => m.startsWith(cleanMonth) || cleanMonth.startsWith(m));
    if (idx === -1) {
      idx = monthNamesShort.findIndex(m => cleanMonth.startsWith(m));
    }
    return idx;
  };

  // Pattern 1: Day [of] Month [Year] e.g. "9th of August 2026", "9th/August/2026", "9th August", "09/08/2026", "9/8"
  const dayFirstRegex = /(?:^|\D)(\d{1,2})(?:st|nd|rd|th)?\s*(?:[\/\s\.-]|of)+\s*([A-Za-z]+|\d{1,2})(?:\s*(?:[\/\s\.-]|of|,)+\s*(\d{2,4}))?\b/gi;
  let match;

  while ((match = dayFirstRegex.exec(rawDocText)) !== null) {
    const day = parseInt(match[1], 10);
    const monthIdx = parseMonth(match[2]);
    let year = match[3] ? parseInt(match[3], 10) : currentYear;
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && monthIdx >= 0 && monthIdx <= 11 && year >= 2020 && year <= 2100) {
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Pattern 2: Month Day [Year] e.g. "August 9th, 2026", "August 9, 2026", "August 9th", "August 9"
  const monthFirstRegex = /(?:^|\D)([A-Za-z]+)\s*(?:[\/\s\.-]|of)+\s*(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:[\/\s\.-]|of|,)+\s*(\d{2,4}))?\b/gi;

  while ((match = monthFirstRegex.exec(rawDocText)) !== null) {
    const monthIdx = parseMonth(match[1]);
    const day = parseInt(match[2], 10);
    let year = match[3] ? parseInt(match[3], 10) : currentYear;
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && monthIdx >= 0 && monthIdx <= 11 && year >= 2020 && year <= 2100) {
      const d = new Date(year, monthIdx, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Calculates the Doctor's Schedule date for the exact date indicated on the roster.
 * Formats as: "9th/August/2026. SUNDAY"
 */
function getScheduleDateFormatted(rosterDate) {
  let targetDate;
  if (rosterDate && !isNaN(rosterDate.getTime())) {
    targetDate = new Date(rosterDate);
  } else {
    targetDate = new Date();
  }

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayName = days[targetDate.getDay()];
  const dayNum = targetDate.getDate();
  const monthName = months[targetDate.getMonth()];
  const year = targetDate.getFullYear();

  const getOrdinal = (n) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${dayNum}${getOrdinal(dayNum)}/${monthName}/${year}. ${dayName}`;
}

/**
 * White-listed clinical & essential units to extract (matching reference matrix)
 */
const ALLOWED_UNITS = [
  'gynecology', 'gynaecology', 'gyn',
  'pediatrics', 'paediatrics', 'ped',
  'neurology', 'neuro-surgery', 'neurosurgery', 'neuro',
  'internal medicine', 'internal',
  'ortho', 'orthopedic', 'orthopedics', 'orthopaedic', 'orthopaedics',
  'cardiology', 'cardio',
  'dermatology', 'derm',
  'gp', 'general practitioner',
  'fm', 'family medicine', 'family',
  'clinical psychology', 'psychology',
  'urology', 'uro',
  'general surgeon', 'surgery',
  'eeg',
  'dentist', 'dentists', 'dental surgeon', 'dental surgeons',
  'dental therapist', 'dental therapists', 'therapist', 'therapists', 'the therapists',
  'physiotherapy', 'physio'
];

// ENT needs a separate exact-word check to avoid matching 'Department', 'patient', 'content' etc.
const ENT_REGEX = /\bent\b/i;

// Physician-to-Unit override map for merged DOCX table cell resilience
const PHYSICIAN_UNIT_OVERRIDES = {
  'kansayisa': 'Orthopedics',
  'umuhoza': 'Pediatrics',
  'hakizimana': 'ENT',
  'ganza': 'Cardiology',
  'karekezi': 'Neuro-Surgery',
  'gihana': 'Family Medicine',
  'ngabo': 'General Practitioner',
  'nsengiyumva': 'Clinical Psychology',
  'mazimpaka': 'EEG',
  'ingabire': 'Physiotherapy',
  'uwamahoro': 'Physiotherapy',
  'nsengimana': 'Physiotherapy',
  'naze': 'Physiotherapy',
  'anamali': 'Dental Surgeons',
  'nyiraneza': 'Dental Surgeons',
  'rutaganda': 'Dental Therapists',
  'ndayisenga': 'Dental Therapists',
};

function getPhysicianUnitOverride(staffList) {
  if (!staffList || !Array.isArray(staffList)) return null;
  for (const shift of staffList) {
    for (const name of shift.staff || []) {
      const lower = name.toLowerCase();
      for (const [key, unitName] of Object.entries(PHYSICIAN_UNIT_OVERRIDES)) {
        if (lower.includes(key)) {
          return unitName;
        }
      }
    }
  }
  return null;
}

/**
 * Standardizes unit names according to official Legacy Clinics Department/Unit matrix
 */
function normalizeUnitName(rawStr) {
  const lower = rawStr.toLowerCase().trim();

  // Clinical Plaza units
  if (lower.includes('gyn')) return 'Gynecology';
  if (lower.includes('ped')) return 'Pediatrics';
  if (lower.includes('internal')) return 'Internal Medicine';
  if (lower.includes('ortho')) return 'Orthopedics';
  if (lower.includes('cardio')) return 'Cardiology';
  if (lower.includes('derm')) return 'Dermatology';
  if (lower.includes('neuro')) return 'Neuro-Surgery';
  if (lower.includes('psycholog')) return 'Clinical Psychology';
  if (lower === 'gp' || lower.includes('general practitioner')) return 'General Practitioner';
  if (lower === 'fm' || lower.includes('family')) return 'Family Medicine';
  if (lower.includes('uro')) return 'Urology';
  
  // Dental units
  if (lower.includes('dental surgeon') || lower.includes('dentist')) return 'Dental Surgeons';
  if (lower.includes('dental therapist')) return 'Dental Therapists';

  // ENT uses word-boundary regex so it never matches 'department', 'patients', 'dentist' etc.
  if (ENT_REGEX.test(lower)) return 'ENT';
  if (lower.includes('surgeon') || lower.includes('surgery')) return 'General Surgeon';
  if (lower.includes('eeg')) return 'EEG';

  // Physiotherapy & Therapists
  if (lower.includes('physio') || lower.includes('physiotherapy')) return 'Physiotherapy';
  if (lower.includes('therapist')) return 'Dental Therapists';

  return rawStr.trim();
}

/**
 * Main Controller function to process uploaded DOCX file
 */
exports.parseRoster = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload a valid .docx file.' });
    }

    // Convert docx buffer to HTML using Mammoth
    const { value: html } = await mammoth.convertToHtml({ buffer: req.file.buffer });

    // Parse HTML with Cheerio
    const $ = cheerio.load(html);
    const rawDocText = $.text() || '';

    // ── 1. Check if document is a valid Duty Roster ──────────────────────────
    if (!isDutyRoster(rawDocText, $)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Document: The uploaded file is not a duty roster. Please upload a valid duty roster document.'
      });
    }

    // ── 2. Extract date on roster & generate Doctor's Schedule for EXACT ROSTER DATE ───
    const rosterDate = extractRosterDate(rawDocText);
    if (!rosterDate) {
      return res.status(400).json({
        success: false,
        message: 'Roster Date Missing: Could not identify a valid date on the uploaded duty roster document (e.g. 9th/August/2026 or 9th of August). Please ensure the roster specifies a date.'
      });
    }

    const targetScheduleDateStr = getScheduleDateFormatted(rosterDate);

    // ── 3. Avoid Duplicate Roster Uploads for Target Schedule Date ───────────
    const overwrite = req.body?.overwrite === true || req.body?.overwrite === 'true' || req.query?.overwrite === 'true';

    const { rows: existing } = await db.query(
      `SELECT id, file_name, created_at, created_by_name FROM doctor_schedules WHERE roster_date = ?`,
      [targetScheduleDateStr]
    );

    if (existing && existing.length > 0 && !overwrite) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        existingId: existing[0].id,
        message: `Duplicate Refused: A doctor schedule for ${targetScheduleDateStr} was already uploaded on ${new Date(existing[0].created_at).toLocaleString()} by ${existing[0].created_by_name || 'Admin'} (${existing[0].file_name}).`
      });
    }

    if (existing && existing.length > 0 && overwrite) {
      await db.query(`DELETE FROM doctor_schedules WHERE roster_date = ?`, [targetScheduleDateStr]);
    }
    
    const parsedData = [];
    let currentSection = 'clinical'; // 'clinical' | 'paramedical' | 'admin'

    $('table tr').each((_, tr) => {
      const rowText = $(tr).text().trim();

      // ── Track section boundaries ───────────────────────────────────────────
      // "Paramedical Staffs" header: note the section change but keep processing
      // rows — EEG, Physiotherapy, Dental live inside the paramedical block and
      // must be captured via the ALLOWED_UNITS whitelist below.
      if (/paramedical\s+staffs?/i.test(rowText) && !/\bfrom\b/i.test(rowText)) {
        currentSection = 'paramedical';
        return; // skip the section header row itself
      }
      // Administration Staff: hard-skip everything that follows
      if (/admin(?:istration)?\s+staff/i.test(rowText) && !/\bfrom\b/i.test(rowText)) {
        currentSection = 'admin';
        return;
      }

      // Hard-skip all Admin section rows (no clinical units appear there)
      if (currentSection === 'admin') return;

      // ── Skip table header/label rows ──────────────────────────────────────
      // Detect rows whose cells contain column-header keywords from the DOCX table.
      // These are never clinical data rows and must not be parsed.
      if (
        /morning\s*\/\s*time|evening\s*\/\s*time/i.test(rowText) ||
        /\bdoctors?\s*\/\s*providers?\b|\bdate\s*&\s*day\b/i.test(rowText) ||
        /^\s*dept\s*\/\s*unit\s*$/i.test(rowText)
      ) {
        return;
      }

      const cells = $(tr).find('td');
      if (cells.length < 2) return;

      // Extract text content from each cell
      const cellTexts = [];
      cells.each((_, td) => {
        // Collect paragraphs or HTML line breaks as distinct lines
        const htmlContent = $(td).html() || '';
        const lines = htmlContent
          .split(/<br\s*\/?>|<p[^>]*>|<\/p>/i)
          .map(str => $('<div>' + str + '</div>').text().trim())
          .filter(Boolean);
        
        if (lines.length > 0) {
          cellTexts.push(lines);
        } else {
          cellTexts.push([$(td).text().trim()]);
        }
      });

      // Locate unit column — skip cells that are shift-data cells (contain 'From …')
      // e.g. "(From Ped 7am-3pm)" in a Phlebotomy morning column must not be
      // mistaken for a Pediatrics unit cell.
      let unitCellIdx = -1;
      let matchedUnit = '';

      for (let i = 0; i < cellTexts.length; i++) {
        const fullCellStr = cellTexts[i].join(' ');
        const lowerCellStr = fullCellStr.toLowerCase();

        // If the cell contains a shift-time indicator it is a data cell, not a unit name
        if (/\bfrom\b/i.test(fullCellStr)) continue;

        // Check ENT with word-boundary regex first (avoids 'Department', 'patients', etc.)
        if (ENT_REGEX.test(fullCellStr)) {
          unitCellIdx = i;
          matchedUnit = 'ENT';
        } else {
          for (const allowed of ALLOWED_UNITS) {
            if (lowerCellStr.includes(allowed)) {
              unitCellIdx = i;
              matchedUnit = normalizeUnitName(fullCellStr);
              break;
            }
          }
        }
        if (unitCellIdx !== -1) break;
      }

      if (unitCellIdx === -1) return; // Skip if no recognized unit in row

      // Morning lines (unitCellIdx + 1) and Evening lines (unitCellIdx + 2)
      const morningLines = cellTexts[unitCellIdx + 1] || [];
      const eveningLines = cellTexts[unitCellIdx + 2] || [];

      // Paramedical staff names that should never be listed under doctor schedules
      const PARAMEDICAL_STAFF_NAMES = [
        'egide', 'lab scientist', 'lab scientists', 'phlebotomy', 'phlebotomist', 'radiographer', 'radiographers', 'nurse', 'nurses'
      ];

      const processShiftLines = (lines) => {
        const results = [];
        let currentShiftTime = '';
        let staffNames = [];

        for (const rawLine of lines) {
          const cleansed = scrubSensitiveData(rawLine);
          if (!cleansed) continue;

          // Skip paramedical staff members (e.g. Egide) from doctor schedules
          if (PARAMEDICAL_STAFF_NAMES.some(p => cleansed.toLowerCase().includes(p))) {
            continue;
          }

          // Check if line indicates shift time e.g. (From 9am-5pm)
          if (/^\(?[Ff]rom\s+[\d:a-zA-Z\s\-]+(?:\)|$)/i.test(cleansed) || /^\(?\d+[:0-9]*[ap]m\s*-\s*\d+[:0-9]*[ap]m\)?/i.test(cleansed)) {
            if (currentShiftTime && staffNames.length > 0) {
              results.push({ time: currentShiftTime, staff: [...staffNames] });
              staffNames = [];
            }
            currentShiftTime = cleansed.startsWith('(') ? cleansed : `(${cleansed})`;
          } else if (/not\s+available/i.test(cleansed)) {
            results.push({ time: '', staff: ['Not Available'] });
          } else {
            staffNames.push(cleansed);
          }
        }

        if (currentShiftTime && staffNames.length > 0) {
          results.push({ time: currentShiftTime, staff: [...staffNames] });
        } else if (staffNames.length > 0 && !currentShiftTime) {
          results.push({ time: '', staff: [...staffNames] });
        }

        return results;
      };

      const morningParsed = processShiftLines(morningLines);
      const eveningParsed = processShiftLines(eveningLines);

      if (morningParsed.length > 0 || eveningParsed.length > 0) {
        const overrideUnit = getPhysicianUnitOverride(morningParsed) || getPhysicianUnitOverride(eveningParsed);
        const finalUnit = overrideUnit || matchedUnit;

        parsedData.push({
          unit: finalUnit,
          morning: morningParsed,
          evening: eveningParsed
        });
      }
    });

    // ── Consolidate Duplicate Units & Sort by Official Reference Order ───────
    const OFFICIAL_UNIT_ORDER = [
      'Gynecology',
      'Pediatrics',
      'Internal Medicine',
      'ENT',
      'Orthopedics',
      'Cardiology',
      'Neuro-Surgery',
      'General Practitioner',
      'Clinical Psychology',
      'Urology',
      'Family Medicine',
      'Physiotherapy',
      'EEG',
      'Dental Surgeons',
      'Dental Therapists',
    ];

    const consolidatedMap = new Map();
    parsedData.forEach(item => {
      if (consolidatedMap.has(item.unit)) {
        const existing = consolidatedMap.get(item.unit);
        existing.morning.push(...item.morning);
        existing.evening.push(...item.evening);
      } else {
        consolidatedMap.set(item.unit, {
          unit: item.unit,
          morning: [...item.morning],
          evening: [...item.evening]
        });
      }
    });

    const finalParsedUnits = Array.from(consolidatedMap.values());
    finalParsedUnits.sort((a, b) => {
      const idxA = OFFICIAL_UNIT_ORDER.indexOf(a.unit);
      const idxB = OFFICIAL_UNIT_ORDER.indexOf(b.unit);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.unit.localeCompare(b.unit);
    });

    // Build WhatsApp Markdown Output
    // Extract day name and date separately for the table header
    const parts = targetScheduleDateStr.split('. ');
    const dateStr = parts[0] || targetScheduleDateStr;
    const dayName = parts[1] || '';

    let whatsappOutput = `Date & Day\n${targetScheduleDateStr}\n\n`;

    if (finalParsedUnits.length === 0) {
      whatsappOutput += `No matching clinical roster data found in the uploaded document.`;
    } else {
      finalParsedUnits.forEach(item => {
        whatsappOutput += `*${item.unit}*\n`;

        if (item.morning.length === 0 && item.evening.length === 0) {
          whatsappOutput += `Not Available\n\n`;
          return;
        }

        item.morning.forEach(shift => {
          const timePart = shift.time ? `${shift.time}` : '';
          const staffPart = shift.staff.join('\n');
          whatsappOutput += timePart ? `${timePart}\n${staffPart}\n` : `${staffPart}\n`;
        });

        item.evening.forEach(shift => {
          const timePart = shift.time ? `${shift.time}` : '';
          const staffPart = shift.staff.join('\n');
          whatsappOutput += timePart ? `${timePart}\n${staffPart}\n` : `${staffPart}\n`;
        });

        whatsappOutput += `\n`;
      });
    }

    // ── Save to DB History ─────────────────────────────────────────────────────
    let savedId = null;
    try {
      const fileName = req.file?.originalname || 'Duty_Roster.docx';
      const fileBase64 = req.file?.buffer ? req.file.buffer.toString('base64') : '';
      const uName = req.user ? (req.user.full_name || req.user.username || 'Admin') : 'System Admin';

      if (fileBase64) {
        const insertRes = await db.query(
          `INSERT INTO doctor_schedules (file_name, roster_date, parsed_json, file_base64, created_by_name)
           VALUES (?, ?, ?, ?, ?) RETURNING id`,
          [fileName, targetScheduleDateStr, JSON.stringify(finalParsedUnits), fileBase64, uName]
        );
        savedId = insertRes.rows?.[0]?.id || null;
      }
    } catch (dbErr) {
      console.warn('⚠️ Failed to save parsed roster to DB history:', dbErr.message);
    }

    return res.json({
      success: true,
      message: 'Roster parsed successfully',
      id: savedId,
      // Structured data for the table UI
      parsedUnits: finalParsedUnits,
      dateStr,
      dayName,
      tomorrowDate: targetScheduleDateStr,
      // WhatsApp plain text fallback
      output: whatsappOutput.trim(),
    });

  } catch (error) {
    console.error('Error parsing roster DOCX:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to parse roster file: ' + error.message
    });
  }
};

/**
 * GET /api/roster/history
 * Returns historical parsed doctor schedules.
 */
exports.getScheduleHistory = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, file_name, roster_date, parsed_json, created_at, created_by_name
       FROM doctor_schedules
       ORDER BY id DESC LIMIT 50`
    );

    const history = (rows || []).map(r => {
      let unitCount = 0;
      let doctorCount = 0;
      let parsedUnits = [];
      try {
        parsedUnits = JSON.parse(r.parsed_json || '[]');
        unitCount = parsedUnits.length;
        parsedUnits.forEach(u => {
          (u.morning || []).forEach(s => {
            if (s.staff?.[0] !== 'Not Available') doctorCount += (s.staff || []).length;
          });
          (u.evening || []).forEach(s => {
            if (s.staff?.[0] !== 'Not Available') doctorCount += (s.staff || []).length;
          });
        });
      } catch (e) {}

      return {
        id: r.id,
        file_name: r.file_name,
        roster_date: r.roster_date,
        parsedUnits,
        created_at: r.created_at,
        created_by_name: r.created_by_name || 'Admin',
        unitCount,
        doctorCount,
      };
    });

    return res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/roster/history/:id
 * Deletes a single archived doctor schedule.
 */
exports.deleteScheduleHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Schedule ID is required.' });
    }

    const { rows } = await db.query(`SELECT file_name, roster_date FROM doctor_schedules WHERE id = ?`, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Archived schedule not found.' });
    }

    await db.query(`DELETE FROM doctor_schedules WHERE id = ?`, [id]);

    return res.json({
      success: true,
      message: `Archived schedule for ${rows[0].roster_date} (${rows[0].file_name}) deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/roster/history/bulk-delete
 * Deletes multiple archived doctor schedules.
 */
exports.bulkDeleteScheduleHistory = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of schedule IDs is required.' });
    }

    const placeholders = ids.map(() => '?').join(', ');
    await db.query(`DELETE FROM doctor_schedules WHERE id IN (${placeholders})`, ids);

    return res.json({
      success: true,
      message: `Successfully deleted ${ids.length} archived schedule(s).`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/roster/download/:id
 * Streams the original .docx file stored as base64 in the database.
 */
exports.downloadScheduleDocx = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT file_name, file_base64 FROM doctor_schedules WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0 || !rows[0].file_base64) {
      return res.status(404).json({ success: false, message: 'Schedule file not found in database.' });
    }

    const fileBuf = Buffer.from(rows[0].file_base64, 'base64');
    const safeName = (rows[0].file_name || 'Doctor_Roster.docx').replace(/[^a-zA-Z0-9_.-]/g, '_');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.send(fileBuf);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/roster/analyze-ai
 * Lumina AI schedule comparison & vulnerability audit.
 */
exports.analyzeSchedulesWithAI = async (req, res, next) => {
  try {
    const { scheduleId1, scheduleId2 } = req.body;
    let s1 = null, s2 = null;

    if (scheduleId1 && scheduleId2) {
      const { rows: r1 } = await db.query(`SELECT * FROM doctor_schedules WHERE id = ?`, [scheduleId1]);
      const { rows: r2 } = await db.query(`SELECT * FROM doctor_schedules WHERE id = ?`, [scheduleId2]);
      s1 = r1[0];
      s2 = r2[0];
    } else if (scheduleId2) {
      const { rows: r2 } = await db.query(`SELECT * FROM doctor_schedules WHERE id = ?`, [scheduleId2]);
      s2 = r2[0];
      const { rows: r1 } = await db.query(`SELECT * FROM doctor_schedules WHERE id < ? ORDER BY id DESC LIMIT 1`, [scheduleId2]);
      s1 = r1[0];
    } else {
      const { rows } = await db.query(`SELECT * FROM doctor_schedules ORDER BY id DESC LIMIT 2`);
      s2 = rows[0]; // Newer
      s1 = rows[1]; // Older
    }

    if (!s2) {
      return res.status(400).json({ success: false, message: 'At least one past schedule is required for Lumina AI analysis.' });
    }

    const u1 = s1 ? JSON.parse(s1.parsed_json || '[]') : [];
    const u2 = JSON.parse(s2.parsed_json || '[]');

    const extractDoctorMap = (units) => {
      const map = {};
      units.forEach(u => {
        (u.morning || []).forEach(sh => {
          (sh.staff || []).forEach(name => {
            if (!name || name === 'Not Available') return;
            if (!map[name]) map[name] = [];
            map[name].push({ unit: u.unit, shift: 'Morning', time: sh.time || 'Standard' });
          });
        });
        (u.evening || []).forEach(sh => {
          (sh.staff || []).forEach(name => {
            if (!name || name === 'Not Available') return;
            if (!map[name]) map[name] = [];
            map[name].push({ unit: u.unit, shift: 'Evening', time: sh.time || 'Standard' });
          });
        });
      });
      return map;
    };

    const docMap1 = extractDoctorMap(u1);
    const docMap2 = extractDoctorMap(u2);

    const docNames1 = new Set(Object.keys(docMap1));
    const docNames2 = new Set(Object.keys(docMap2));

    const addedDoctors = [...docNames2].filter(d => !docNames1.has(d));
    const removedDoctors = [...docNames1].filter(d => !docNames2.has(d));
    const retainedDoctors = [...docNames2].filter(d => docNames1.has(d));

    const modifiedShifts = [];
    retainedDoctors.forEach(doc => {
      const s1Shifts = docMap1[doc].map(x => `${x.unit} (${x.shift}: ${x.time})`).sort().join(', ');
      const s2Shifts = docMap2[doc].map(x => `${x.unit} (${x.shift}: ${x.time})`).sort().join(', ');
      if (s1Shifts !== s2Shifts) {
        modifiedShifts.push({
          doctor: doc,
          previous: s1Shifts,
          current: s2Shifts,
        });
      }
    });

    const departmentCoverage = u2.map(u => {
      const mCount = (u.morning || []).reduce((acc, s) => acc + (s.staff?.[0] === 'Not Available' ? 0 : s.staff.length), 0);
      const eCount = (u.evening || []).reduce((acc, s) => acc + (s.staff?.[0] === 'Not Available' ? 0 : s.staff.length), 0);
      return {
        unit: u.unit,
        morningDoctors: mCount,
        eveningDoctors: eCount,
        totalStaff: mCount + eCount,
        vulnerability: mCount === 0 || eCount === 0 ? 'CRITICAL_UNCOVERED' : (mCount === 1 || eCount === 1 ? 'SINGLE_PHYSICIAN' : 'ADEQUATE')
      };
    });

    const totalDocCount = docNames2.size;
    const prevDocCount = docNames1.size;

    const narrative = [
      `### 🤖 Lumina AI Roster Audit Executive Briefing`,
      `**Schedule Under Analysis:** ${s2.roster_date} (${s2.file_name})` + (s1 ? ` compared with baseline ${s1.roster_date}` : ''),
      ``,
      `#### 📊 Staffing Summary`,
      `- **Total Doctors Scheduled:** ${totalDocCount} physicians across ${u2.length} clinical departments.` + (s1 ? ` (Net change: ${totalDocCount >= prevDocCount ? '+' : ''}${totalDocCount - prevDocCount} doctors)` : ''),
      `- **New Doctors Added:** ${addedDoctors.length > 0 ? addedDoctors.join(', ') : 'None'}`,
      `- **Doctors Off/Removed:** ${removedDoctors.length > 0 ? removedDoctors.join(', ') : 'None'}`,
      `- **Shift/Unit Swaps Detected:** ${modifiedShifts.length} physician(s) with updated schedules.`,
      ``,
      `#### ⚠️ Risk & Vulnerability Warnings`,
    ];

    const criticals = departmentCoverage.filter(d => d.vulnerability === 'CRITICAL_UNCOVERED');
    const singlePoints = departmentCoverage.filter(d => d.vulnerability === 'SINGLE_PHYSICIAN');

    if (criticals.length > 0) {
      narrative.push(`- 🔴 **Uncovered Shifts Alert:** ${criticals.map(c => `*${c.unit}* (Morning: ${c.morningDoctors}, Evening: ${c.eveningDoctors})`).join(', ')}`);
    }
    if (singlePoints.length > 0) {
      narrative.push(`- 🟡 **Single Physician Coverage:** ${singlePoints.map(c => `*${c.unit}*`).join(', ')} operate with only 1 physician on duty.`);
    }
    if (criticals.length === 0 && singlePoints.length === 0) {
      narrative.push(`- 🟢 **Optimal Coverage:** All units have robust multi-physician staffing for morning and evening coverage.`);
    }

    return res.json({
      success: true,
      data: {
        schedule1: s1 ? { id: s1.id, date: s1.roster_date, fileName: s1.file_name } : null,
        schedule2: { id: s2.id, date: s2.roster_date, fileName: s2.file_name },
        addedDoctors,
        removedDoctors,
        modifiedShifts,
        departmentCoverage,
        aiExecutiveSummary: narrative.join('\n'),
      }
    });

  } catch (err) {
    next(err);
  }
};

