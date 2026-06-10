# Turso Database Overview

## Table: staff_performance_scores (0 rows)

## Table: staff_performance_ratings (0 rows)

## Table: shift_nurse_close (0 rows)

## Table: shift_viplounge_close (0 rows)

## Table: departments (12 rows)
| id | name |
| --- | --- |
| 40 | GYNECOLOGY |
| 41 | GENERAL MEDECINE |
| 42 | INT |

## Table: providers (52 rows)
| id | name | title | department_id | is_active |
| --- | --- | --- | --- | --- |
| 20 | Dr Gakindi | Dr | 40 | 1 |
| 21 | Dr SITINI BERTIN | Dr | 40 | 1 |
| 22 | Dr NKUBITO | Dr | 40 | 1 |

## Table: daily_report_metrics (0 rows)

## Table: daily_procedure_logs (0 rows)

## Table: icd11_cache (20 rows)
| id | keyword | results | created_at |
| --- | --- | --- | --- |
| 1 | malaria | [{"code":"1A20","desc":"Plasmodium falciparum mala | 2026-06-10 07:14:22 |
| 2 | cholera | [{"code":"1A00","desc":"Cholera"},{"code":"1A00.0" | 2026-06-10 07:14:22 |
| 3 | typhoid | [{"code":"1A07","desc":"Typhoid fever"},{"code":"1 | 2026-06-10 07:14:23 |

## Table: nursing_monthly_stock (0 rows)

## Table: nursing_stock_change_logs (0 rows)

## Table: vendors (13 rows)
| id | name | contact | contract_terms | is_active |
| --- | --- | --- | --- | --- |
| 1 | SOFTLINE | NULL | NULL | 1 |
| 2 | KIPHARMA | NULL | NULL | 1 |
| 3 | Rugero Med Ltd | NULL | NULL | 1 |

## Table: master_inventory (60 rows)
| id | name | sku | unit_of_measure | category |
| --- | --- | --- | --- | --- |
| 1 | DVD | lc-DVD-XXXX-XXX-0001 | Unit | imaging_department |
| 2 | Contrast 100ml/Omnipaque | lc-CON-XXXX-XXX-0002 | Unit | imaging_department |
| 3 | CONTRAST OMNISCAN 0.5mmol/20ml | lc-CON-XXXX-XXX-0003 | Unit | imaging_department |

## Table: stock_batches (0 rows)

## Table: department_stock (0 rows)

## Table: requisitions (0 rows)

## Table: requisition_items (0 rows)

## Table: uoms (10 rows)
| id | name | abbreviation | description |
| --- | --- | --- | --- |
| 1 | Piece | pc | Single item or piece |
| 2 | Box | bx | Box of multiple items |
| 3 | Pack | pk | Pack or package |

## Table: roles (15 rows)
| id | name | display_name |
| --- | --- | --- |
| 1 | admin | System Administrator |
| 2 | coo | Chief Operating Officer |
| 3 | deputy_coo | Deputy COO |

## Table: users (44 rows)
| id | full_name | username | email | password_hash | role_id | is_active | created_at | updated_at | must_change_password | failed_attempts | lockout_until |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AKALIZA Bayingana Patience | lc_patience | bayingana@legacyclinics.rw | $2a$10$cathqBzfPVwR4uK4W0F08.O9i551yc7ih7gfMhfWVwK | 9 | 1 | 2026-06-10 07:14:54 | 2026-06-10 07:14:54 | 0 | 0 | NULL |
| 2 | AKIMANA Chanelle | lc_chanelle | chanelle@legacyclinics.rw | $2a$10$cathqBzfPVwR4uK4W0F08.O9i551yc7ih7gfMhfWVwK | 9 | 1 | 2026-06-10 07:14:54 | 2026-06-10 07:14:54 | 0 | 0 | NULL |
| 3 | GAKUBA Denyse | lc_denyse | gakuba@legacyclinics.rw | $2a$10$cathqBzfPVwR4uK4W0F08.O9i551yc7ih7gfMhfWVwK | 9 | 1 | 2026-06-10 07:14:55 | 2026-06-10 07:14:55 | 0 | 0 | NULL |

## Table: system_settings (1 rows)
| key | value |
| --- | --- |
| supplier_portal_active | false |

## Table: incident_reports (0 rows)

## Table: cancellation_requests (0 rows)

## Table: supplier_submissions (0 rows)

## Table: audit_logs (370 rows)
| id | user_id | user_name | user_role | action | entity_type | entity_id | details | ip_address | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 414 | 25 | UWAMAHORO Yvette | customer_care | SECURITY_VIOLATION_UI | ui_route | NULL | {"path":"/unauthorized"} | ::ffff:127.0.0.1 | 2026-05-11 10:31:44 |
| 415 | 25 | UWAMAHORO Yvette | customer_care | SECURITY_VIOLATION_UI | ui_route | NULL | {"path":"/unauthorized"} | ::ffff:127.0.0.1 | 2026-05-11 10:31:44 |
| 416 | 31 | Valery NIYOMUGABO | admin | LOGIN | user | 5 | {"username":"lc_valery"} | ::ffff:127.0.0.1 | 2026-05-11 10:33:40 |

## Table: supplier_submission_items (0 rows)

## Table: supplier_portal_sessions (0 rows)

## Table: permission_modules (8 rows)
| id | name | display_name | actions | created_at |
| --- | --- | --- | --- | --- |
| 1 | cancellations | Cancellation Requests | ["view","create","edit","approve","reject"] | 2026-06-10 07:15:42 |
| 2 | refunds | Refund Requests | ["view","create","edit","approve","reject"] | 2026-06-10 07:15:43 |
| 3 | results_transfer | Results Transfer | ["view","create","edit","approve","reject"] | 2026-06-10 07:15:43 |

## Table: role_permissions (414 rows)
| id | role_name | module | action | granted | updated_by | updated_at |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | admin | cancellations | view | 1 | NULL | 2026-06-10 07:15:47 |
| 2 | admin | cancellations | create | 1 | NULL | 2026-06-10 07:15:47 |
| 3 | admin | cancellations | edit | 1 | NULL | 2026-06-10 07:15:48 |

## Table: user_permission_overrides (0 rows)

## Table: internal_feedbacks (0 rows)

## Table: refund_requests (0 rows)

## Table: shift_equipment_logs (0 rows)

## Table: shift_cashier_open (0 rows)

## Table: shift_cashier_close (0 rows)

## Table: shift_helpdesk_close (0 rows)

## Table: shift_callcenter_close (0 rows)

## Table: sukraa_patients (0 rows)

## Table: sukraa_sync_log (0 rows)

## Table: shift_sessions (0 rows)

## Table: notifications (0 rows)

## Table: results_transfers (0 rows)


