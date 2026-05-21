-- ============================================================
-- Patient Feedbacks Migration
-- Creates table to capture Patient Feedback Forms locally
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_feedbacks (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_info            TEXT,                                                 -- Telephone/Email (Imeli)
  feedback_date           TEXT,                                                 -- Date (Italiki)
  
  -- Areas of Improvement Checklist
  reception_call_center   INTEGER DEFAULT 0,                                    -- Reception/call center (Aho bakirira abantu)
  nursing                 INTEGER DEFAULT 0,                                    -- Nursing (Mubaforomo)
  doctors_room            INTEGER DEFAULT 0,                                    -- Doctor's room (Icyumba cya Muganga)
  reception_cashier       INTEGER DEFAULT 0,                                    -- Reception / Cashier (Aho barihira)
  call_center             INTEGER DEFAULT 0,                                    -- Call center
  tabara_service          INTEGER DEFAULT 0,                                    -- Tabara service (Abasunika Igare)
  laboratory              INTEGER DEFAULT 0,                                    -- Laboratory (Aho batangira ibizami)
  cafetaria               INTEGER DEFAULT 0,                                    -- Cafetaria (Muri restora)
  imaging                 INTEGER DEFAULT 0,                                    -- Imaging (M'ucyumba gifotora)
  
  concern_description     TEXT NOT NULL,                                        -- Description of concern (Complaint, suggestion, compliment)
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_date ON patient_feedbacks(feedback_date);
