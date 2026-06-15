# Backup Database Overview (reporting-1.db)

## Table: roles (20 rows)
| id |    name    |      display_name       |
|----|------------|-------------------------|
| 1  | admin      | System Administrator    |
| 2  | coo        | Chief Operating Officer |
| 3  | deputy_coo | Deputy COO              |

## Table: users (79 rows)
| id |         full_name          |  username   |            email             |                        password_hash                         | role_id | is_active |     created_at      |        updated_at        | failed_attempts | lockout_until | must_change_password |
|----|----------------------------|-------------|------------------------------|--------------------------------------------------------------|---------|-----------|---------------------|--------------------------|-----------------|---------------|----------------------|
| 1  | AKALIZA Bayingana Patience | lc_patience | bayingana@legacyclinics.rw   | $2a$10$38d..DJuo1dMhyw./JkXw.vciZ6HU7bbhiX.8m3WddodisMxc1XGO | 9       | 1         | 2026-04-14 15:22:42 | 2026-06-06T20:03:52.332Z | 0               |               | 1                    |
| 3  | GAKUBA Denyse              | lc_denyse   | gakuba@legacyclinics.rw      | $2a$10$WeVMYGvnugit11YovnHcleibJ2BeXaVBihpqaSU2PBtp.dU4zGdpK | 9       | 1         | 2026-04-14 15:22:44 | 2026-05-12T08:13:15.293Z | 0               |               | 1                    |
| 4  | HABIYAMBERE Olivier        | lc_olivier  | habiyambere@legacyclinics.rw | $2a$10$WeVMYGvnugit11YovnHcleibJ2BeXaVBihpqaSU2PBtp.dU4zGdpK | 9       | 1         | 2026-04-14 15:22:45 | 2026-04-14 15:22:45      | 0               |               | 1                    |

## Table: incident_reports (0 rows)

## Table: cancellation_requests (0 rows)

## Table: audit_logs (1769 rows)
|  id  | user_id | action | entity_type | entity_id |         details          | ip_address |     created_at      |        user_name         | user_role |
|------|---------|--------|-------------|-----------|--------------------------|------------|---------------------|--------------------------|-----------|
| 1072 | 6       | LOGIN  | user        | 6         | {"username":"lc_sofia"}  | 127.0.0.1  | 2026-05-22 09:08:31 | MUKUNDENTE Sofia Joyeuse | coo       |
| 1073 | 5       | LOGIN  | user        | 5         | {"username":"lc_valery"} | 127.0.0.1  | 2026-05-22 09:27:41 | NIYOMUGABO Valery        | admin     |
| 1074 | 6       | LOGIN  | user        | 6         | {"username":"lc_sofia"}  | 127.0.0.1  | 2026-05-22 09:41:10 | MUKUNDENTE Sofia Joyeuse | coo       |

## Table: refund_requests (1 rows)
| id | patient_full_name |  pid_number  |  sid_number  | telephone_number | insurance_payer | momo_code | total_amount_paid | amount_to_be_refunded | amount_paid_by | original_receipt_number | initial_transaction_date | reason_for_refund  | status  | rejection_comment | created_by | verified_by | approved_by | rejected_by |     created_at      | verified_at | approved_at | rejected_at |     updated_at      | billed_by | is_mock |
|----|-------------------|--------------|--------------|------------------|-----------------|-----------|-------------------|-----------------------|----------------|-------------------------|--------------------------|--------------------|---------|-------------------|------------|-------------|-------------|-------------|---------------------|-------------|-------------|-------------|---------------------|-----------|---------|
| 18 | Bob Smith (Mock)  | PID-MOCK-003 | SID-MOCK-003 |                  |                 |           | 100000.0          | 100000.0              |                |                         |                          | Test refund reason | pending |                   | 175        |             |             |             | 2026-06-10 06:22:28 |             |             |             | 2026-06-10 06:22:28 |           | 1       |

## Table: results_transfers (0 rows)

## Table: notifications (687 rows)
| id  | user_id |               title               |                                 message                                 | type  |    link     | is_read |     created_at      |
|-----|---------|-----------------------------------|-------------------------------------------------------------------------|-------|-------------|---------|---------------------|
| 603 | 5       | Security Alert: UI Bypass Attempt | Test Nurse  (nurse) attempted to bypass UI navigation to: /unauthorized | error | /audit-logs | 1       | 2026-05-22 12:00:04 |
| 604 | 5       | Security Alert: UI Bypass Attempt | Test Nurse  (nurse) attempted to bypass UI navigation to: /unauthorized | error | /audit-logs | 1       | 2026-05-22 12:00:04 |
| 605 | 130     | Security Alert: UI Bypass Attempt | Test Nurse  (nurse) attempted to bypass UI navigation to: /unauthorized | error | /audit-logs | 0       | 2026-05-22 12:00:04 |

## Table: permission_modules (11 rows)
| id |         name         |     display_name     |                   actions                   |     created_at      |
|----|----------------------|----------------------|---------------------------------------------|---------------------|
| 6  | audit_logs           | Audit Logs           | ["view"]                                    | 2026-04-20 10:00:09 |
| 7  | reports              | Reports & Insights   | ["view","download"]                         | 2026-04-20 10:00:10 |
| 95 | clinical_observation | Clinical Observation | ["view","create","edit","review","approve"] | 2026-05-14 06:34:16 |

## Table: role_permissions (768 rows)
|  id  |     role_name     |    module     | action | granted | updated_by |        updated_at        |
|------|-------------------|---------------|--------|---------|------------|--------------------------|
| 3959 | quality_assurance | cancellations | view   | 1       | 1          | 2026-05-12T09:22:43.952Z |
| 3960 | quality_assurance | cancellations | create | 0       | 1          | 2026-05-12T09:22:43.952Z |
| 3961 | quality_assurance | cancellations | edit   | 0       | 1          | 2026-05-12T09:22:43.953Z |

## Table: user_permission_overrides (0 rows)

## Table: staff_performance_scores (3 rows)
| id | user_id | score | warnings |     created_at      |     updated_at      |
|----|---------|-------|----------|---------------------|---------------------|
| 18 | 41      | 100.0 | 0        | 2026-05-22 12:27:42 | 2026-05-22 12:27:42 |
| 19 | 1       | 100.0 | 0        | 2026-05-29 11:31:44 | 2026-05-29 11:31:44 |
| 20 | 30      | 100.0 | 0        | 2026-06-01 14:07:56 | 2026-06-01 14:07:56 |

## Table: staff_performance_ratings (1 rows)
| id | staff_user_id | rated_by | request_type | request_id |  reason   | severity | points_deducted | note |     created_at      |
|----|---------------|----------|--------------|------------|-----------|----------|-----------------|------|---------------------|
| 5  | 41            | 42       | cancellation | 43         | Test test | 1        | 0.0             |      | 2026-05-29 08:36:51 |

## Table: safety_reports (0 rows)

## Table: clinical_observations (0 rows)

## Table: sukraa_patients (272879 rows)
| id |   pid    |               full_name                | age  |    dob     | gender |   phone   | insurance | extra_1 | extra_2 | source |        synced_at         |        created_at        |        updated_at        |
|----|----------|----------------------------------------|------|------------|--------|-----------|-----------|---------|---------|--------|--------------------------|--------------------------|--------------------------|
| 1  | 26008787 | NIYOKWIZERWA ISAAC                     | 28 Y | 01/01/1998 | Male   | 788838806 |           |         |         | sukraa | 2026-05-21T09:06:11.973Z | 2026-05-21T08:58:15.463Z | 2026-05-21T09:06:11.973Z |
| 2  | 26000064 | BABY IRIZI  NKAKA AALIYAH(MUTONI MARY) | 6 M  | 19/11/2025 | Female | 785364104 |           |         |         | sukraa | 2026-05-21T09:06:11.973Z | 2026-05-21T08:58:15.463Z | 2026-05-21T09:06:11.973Z |
| 3  | 26004775 | GISA N KENDRICK AYAAN                  | 3 M  | 29/01/2026 | Male   | 789818024 |           |         |         | sukraa | 2026-05-21T09:06:11.974Z | 2026-05-21T08:58:15.463Z | 2026-05-21T09:06:11.974Z |

## Table: sukraa_sync_log (3 rows)
| id |        started_at        |       completed_at       | records_added | records_updated | status  | error_message |
|----|--------------------------|--------------------------|---------------|-----------------|---------|---------------|
| 1  | 2026-05-21T08:55:37.887Z |                          | 0             | 0               | running |               |
| 2  | 2026-05-21T08:58:11.265Z | 2026-05-21T10:30:16.240Z | 272876        | 0               | done    |               |
| 3  | 2026-05-21T09:06:07.904Z | 2026-05-21T11:05:38.655Z | 272880        | 0               | done    |               |

## Table: internal_feedbacks (2 rows)
| id | contact_info | feedback_date | reception_call_center | nursing | doctors_room | reception_cashier | call_center | tabara_service | laboratory | cafetaria | imaging |                                                     concern_description                                                      |        created_at        | laboratory_results | other |   other_details   |
|----|--------------|---------------|-----------------------|---------|--------------|-------------------|-------------|----------------|------------|-----------|---------|------------------------------------------------------------------------------------------------------------------------------|--------------------------|--------------------|-------|-------------------|
| 14 |              | 2026-05-19    | 0                     | 0       | 0            | 0                 | 0           | 0              | 0          | 0         | 0       | Muri operations office hari A/C imena amazi kuburyo umuntu ashobora kuyanyereramo akavunika! Bikosowe byaba ari byiza cyane. | 2026-05-26T11:21:26.244Z | 0                  | 1     | Operations Office |
| 15 |              | 2026-05-28    | 0                     | 0       | 0            | 0                 | 0           | 0              | 0          | 0         | 0       | Operations                                                                                                                   | 2026-05-28T08:02:27.834Z | 0                  | 1     | Operations        |

## Table: nursing_monthly_stock (262 rows)
|  id  | month_year |     item_name      | day | session | stock_in_hands | consumed | balance | responsible_name |        created_at        |        updated_at        | expiration_date |  status   |     category     |
|------|------------|--------------------|-----|---------|----------------|----------|---------|------------------|--------------------------|--------------------------|-----------------|-----------|------------------|
| 6742 | 2026-06    | Masque Neb Enfant  | 2   | PM      | 38             | 2        | 36      |                  | 2026-06-02T16:59:54.456Z | 2026-06-10T09:31:39.190Z | 05/2028         | Available | medical_supplies |
| 6743 | 2026-06    | Salbutamol         | 2   | PM      | 50             | 6        | 44      |                  | 2026-06-02T16:59:54.456Z | 2026-06-10T09:31:39.193Z | 02/2028         | Available | medications      |
| 6744 | 2026-06    | NS (Normal Saline) | 2   | PM      | 40             | 2        | 38      |                  | 2026-06-02T16:59:54.456Z | 2026-06-10T09:31:39.191Z | 02/2028         | Available | antiseptics      |

## Table: patient_vitals (1 rows)
| id | patient_id | temperature | pulse | respiratory_rate | blood_pressure | weight | spo2 | general_comments |        created_at        |
|----|------------|-------------|-------|------------------|----------------|--------|------|------------------|--------------------------|
| 1  | 17013099   | 39          | 88    | 16               | 120/80         | 126    | 98   | Good testing     | 2026-05-25T13:45:24.396Z |

## Table: departments (16 rows)
| id  |       name       |
|-----|------------------|
| 109 | GYNECOLOGY       |
| 110 | GENERAL MEDECINE |
| 111 | INTERNAL MEDECINE|

## Table: providers (52 rows)
| id  |       name       | title | department_id | is_active |
|-----|------------------|-------|---------------|-----------|
| 420 | Dr Gakindi       | Dr    | 109           | 1         |
| 421 | Dr SITINI BERTIN | Dr    | 109           | 1         |
| 422 | Dr NKUBITO       | Dr    | 109           | 1         |

## Table: daily_report_metrics (3267 rows)
| id | report_date | provider_id | department_id | patient_count |
|----|-------------|-------------|---------------|---------------|
| 50 | 2026-03-01  | 420         | 109           | 0             |
| 51 | 2026-03-01  | 421         | 109           | 18            |
| 52 | 2026-03-01  | 422         | 109           | 0             |

## Table: daily_procedure_logs (1098 rows)
| id | report_date |   metric_name    | metric_value |
|----|-------------|------------------|--------------|
| 1  | 2026-05-27  | Minor Procedures | 0            |
| 2  | 2026-05-27  | VAT              | 0            |
| 3  | 2026-05-27  | EEG              | 0            |

## Table: icd11_cache (26 rows)
| id | keyword |                                                                                                                         results                                                                                                                          |     created_at      |
|----|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| 1  | malaria | [{"code":"1A20","desc":"Plasmodium falciparum malaria"},{"code":"1A21","desc":"Plasmodium vivax malaria"},{"code":"1A22","desc":"Plasmodium malariae malaria"},{"code":"1A23","desc":"Plasmodium ovale malaria"},{"code":"1A25","desc":"Mixed malaria"}] | 2026-06-02 11:06:20 |
| 2  | cholera | [{"code":"1A00","desc":"Cholera"},{"code":"1A00.0","desc":"Cholera due to Vibrio cholerae 01, biovar cholerae"},{"code":"1A00.1","desc":"Cholera due to Vibrio cholerae 01, biovar eltor"}]                                                              | 2026-06-02 11:06:21 |
| 3  | typhoid | [{"code":"1A07","desc":"Typhoid fever"},{"code":"1A07.y","desc":"Other specified typhoid fever"}]                                                                                                                                                        | 2026-06-02 11:06:21 |

## Table: nursing_stock_change_logs (418 rows)
| id | month_year |     item_name      | day | session | old_stock | new_stock | old_consumed | new_consumed | updated_by |     updated_at      |
|----|------------|--------------------|-----|---------|-----------|-----------|--------------|--------------|------------|---------------------|
| 2  | 2026-06    | Masque Neb Enfant  | 2   | PM      | 0         | 38        | 0            | 2            | lc_susan   | 2026-06-02 16:59:54 |
| 3  | 2026-06    | Salbutamol         | 2   | PM      | 0         | 50        | 0            | 6            | lc_susan   | 2026-06-02 16:59:54 |
| 4  | 2026-06    | NS (Normal Saline) | 2   | PM      | 0         | 40        | 0            | 1            | lc_susan   | 2026-06-02 16:59:54 |

## Table: vendors (33 rows)
| id |      name      | contact | contract_terms | is_active |
|----|----------------|---------|----------------|-----------|
| 1  | SOFTLINE       |         |                | 1         |
| 2  | KIPHARMA       |         |                | 1         |
| 3  | Rugero Med Ltd |         |                | 1         |

## Table: master_inventory (919 rows)
| id |      name      |         sku          | unit_of_measure |     category     |
|----|----------------|----------------------|-----------------|------------------|
| 1  | Aquabloc 15cm  | lc-AQU-XXXX-XXX-0001 | pc              | medical_supplies |
| 3  | Adrenaline     | lc-ADR-XXXX-XXX-0002 | pc              | medications      |
| 5  | Adrenaline 1mg | lc-ADR-XXXX-XXX-0003 | pc              | medications      |

## Table: stock_batches (81 rows)
| id | item_id | vendor_id |   batch_number   | expiry_date | purchase_price |        created_at        | quantity |
|----|---------|-----------|------------------|-------------|----------------|--------------------------|----------|
| 1  | 1205    | 14        | BCH-NUR-ABA-1205 | 31/07/2025  | 1200.0         | 2026-06-03T15:41:55.320Z | 70       |
| 2  | 1215    | 2         | BCH-NUR-KIP-1215 | 30/05/2026  | 1400.0         | 2026-06-03T15:41:57.488Z | 55       |
| 3  | 1191    | 15        | BCH-NUR-LEM-1191 | 31/08/2022  | 350.0          | 2026-06-03T15:42:00.458Z | 300      |

## Table: department_stock (79 rows)
| id | department_id | item_id | batch_id | quantity | min_stock_level |
|----|---------------|---------|----------|----------|-----------------|
| 7  | 121           | 1205    | 1        | 70       | 10              |
| 8  | 121           | 1215    | 2        | 55       | 10              |
| 9  | 121           | 1191    | 3        | 300      | 10              |

## Table: requisitions (4 rows)
| id | department_id |  status  | urgency |     created_at      |        updated_at        | notes | rejection_reason |
|----|---------------|----------|---------|---------------------|--------------------------|-------|------------------|
| 1  | 109           | Approved | High    | 2026-06-02 20:30:23 | 2026-06-03T14:25:50.714Z |       |                  |
| 2  | 109           | Approved | High    | 2026-06-02 20:30:23 | 2026-06-03T14:41:45.892Z |       |                  |
| 3  | 111           | Rejected | High    | 2026-06-03 14:47:34 | 2026-06-07T13:19:55.312Z | Test  | test             |

## Table: requisition_items (0 rows)

## Table: uoms (12 rows)
| id | name  | abbreviation |      description      |
|----|-------|--------------|-----------------------|
| 1  | Piece | pc           | Single item or piece  |
| 2  | Box   | bx           | Box of multiple items |
| 3  | Pack  | pk           | Pack or package       |

## Table: shift_sessions (0 rows)

## Table: shift_equipment_logs (0 rows)

## Table: shift_cashier_open (0 rows)

## Table: shift_cashier_close (0 rows)

## Table: shift_helpdesk_close (0 rows)

## Table: shift_callcenter_close (0 rows)

## Table: shift_nurse_close (0 rows)

## Table: shift_viplounge_close (0 rows)

## Table: system_settings (4 rows)
|            key            | value |
|---------------------------|-------|
| supplier_portal_active    | false |
| supplier_portal_token     |       |
| supplier_portal_vendor_id |       |

## Table: supplier_submissions (1 rows)
| id | supplier_name |     uploaded_at     | status  |
|----|---------------|---------------------|---------|
| 1  | SOFTLINE      | 2026-06-07 15:04:13 | pending |

## Table: supplier_submission_items (1 rows)
| id | submission_id |      name      | sku |  category   | unit_of_measure | batch_number | expiry_date | purchase_price | quantity | vendor_name |
|----|---------------|----------------|-----|-------------|-----------------|--------------|-------------|----------------|----------|-------------|
| 1  | 1             | Sterile Gloves |     | medications | Box             | BCH-STE-TEST | 2029-06-30  | 10.5           | 100      | SOFTLINE    |

## Table: supplier_portal_sessions (1 rows)
| id | vendor_id | vendor_name |    token     |                                                                 items                                                                  |     created_at      | is_active |
|----|-----------|-------------|--------------|----------------------------------------------------------------------------------------------------------------------------------------|---------------------|-----------|
| 1  | 2         | KIPHARMA    | C08BWG7YZFTJ | [{"name":"CT Syringe (1 pair)","sku":"lc-CTX-BCH-IMA--IMA-0005","category":"medical_supplies","unit_of_measure":"Box","quantity":500}] | 2026-06-08 06:52:48 | 0         |

