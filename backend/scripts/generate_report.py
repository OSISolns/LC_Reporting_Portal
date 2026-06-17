import re
import os

# Data extracted by subagent
raw_data = """
- June 9, 2026: 413 Completed
  - NSENGIMANA EMMANUEL (PHYSIOTHERAPIST): 17
  - Dr Kanyamuhunga Aimable (Pediatrician): 89
  - DR HABYARIMANA OSWALD (Internist): 67
  - Dr NSHUTI SHEMA DAVID (Internist): 25
  - DR BUTOYI ALPHONSE (Obstetrician & Gynaecologist): 47
  - Dr  GAPIRA GANZA JEAN MARIE VIANNEY (Cardiologist): 23
  - DR ANAMALI ROGER (DENTAL SURGEON): 12
  - DR KWESIGA STEPHEN (Orthopedic Surgeon): 26
  - Kalisa Gilbert (Dentistry): 3
  - Dr.BEDE BANA (DENTAL SURGEON): 4
  - NAZE THIERRY (PHYSIOTHERAPIST): 13
  - Dr Desire Rubanguka (General Surgeon): 15
  - DR NYIRIMODOKA ALEXANDRE (Urologist): 12
  - Dr. NKERAGUTABARA Gihana Jacques (Family Physcian): 21
  - Dr BIZIMANA YVES LAURENT (General Practitioner): 11
  - MUTESI LEAH (PHYSIOTHERAPIST): 9
  - NGABO NTAGANDA FABRICE (General Practitioner): 1
  - INGABIRE JEAN PAUL (PHYSIOTHERAPIST): 6
  - DR HAKIZIMANA ARISTOTE (Consultant ENT): 10
  - DR MUGESERA ERNEST (DENTAL SURGEON): 2
- June 10, 2026: 428 Completed
  - UWAMAHORO SARAH (PHYSIOTHERAPIST): 17
  - Dr BAZATSINDA ANTHONY (Internist): 59
  - Dr Kansayisa Marie Grace (Orthopedic Surgeon): 19
  - DR BUTOYI ALPHONSE (Obstetrician & Gynaecologist): 45
  - MUTESI LEAH (PHYSIOTHERAPIST): 11
  - Dr NSHUTI SHEMA DAVID (Internist): 42
  - Dr Kabayiza Jean Claude (Pediatrician): 73
  - Dr. KAREKEZI CLAIRE (Neurologist): 7
  - DR HAKIZIMANA ARISTOTE (Consultant ENT): 27
  - Dr  GAPIRA GANZA JEAN MARIE VIANNEY (Cardiologist): 19
  - DR ANAMALI ROGER (DENTAL SURGEON): 23
  - Dr Nyiraneza Esperance (DENTAL SURGEON): 3
  - Eric Rutaganda (Dentistry): 6
  - Dr BIZIMANA YVES LAURENT (General Practitioner): 26
  - Dr Afrika Gasana (Urologist): 13
  - Kalisa Gilbert (Dentistry): 3
  - Dr. NKERAGUTABARA Gihana Jacques (Family Physcian): 20
  - NAZE THIERRY (PHYSIOTHERAPIST): 9
  - Dr. INGABIRE Allen Jean De La Croix (Orthopedic Surgeon): 4
  - Mr NSENGIYUMVA INNOCENT (CLINICAL PSYCHOLOGIST): 2
- June 11, 2026: 479 Completed
  - NAZE THIERRY (PHYSIOTHERAPIST): 12
  - Dr Rutaganda Eric (Internist): 61
  - DR BUTOYI ALPHONSE (Obstetrician & Gynaecologist): 53
  - DR MUTUNGIREHE SYLVESTRE (Neurologist): 38
  - Dr  GAPIRA GANZA JEAN MARIE VIANNEY (Cardiologist): 26
  - DR MUKARUZIGA AGNES (Pediatrician): 63
  - DR SEBATUNZI OSEE (Internist): 65
  - DR MUGESERA ERNEST (DENTAL SURGEON): 10
  - Dr. NKERAGUTABARA Gihana Jacques (Family Physcian): 21
  - DR KWESIGA STEPHEN (Orthopedic Surgeon): 35
  - MUKARUGWIZA FRANCINE (PHYSIOTHERAPIST): 9
  - Dr DUSHIMIYIMANA JMV (Consultant ENT): 22
  - Dr Nyiraneza Esperance (DENTAL SURGEON): 7
  - Kalisa Gilbert (Dentistry): 6
  - Dr.BEDE BANA (DENTAL SURGEON): 5
  - KARIMWABO JEAN CLAUDE (PHYSIOTHERAPIST): 4
  - UWAMAHORO SARAH (PHYSIOTHERAPIST): 4
  - Eric Rutaganda (Dentistry): 1
  - MUTESI LEAH (PHYSIOTHERAPIST): 6
  - Dr BIZIMANA YVES LAURENT (General Practitioner): 29
  - Mr NSENGIYUMVA INNOCENT (CLINICAL PSYCHOLOGIST): 2
- June 12, 2026: 344 Completed
  - MUKARUGWIZA FRANCINE (PHYSIOTHERAPIST): 7
  - INGABIRE JEAN PAUL (PHYSIOTHERAPIST): 19
  - DR BUTOYI ALPHONSE (Obstetrician & Gynaecologist): 22
  - Dr Ntirushwa David (Obstetrician & Gynaecologist): 26
  - Dr Kanyamuhunga Aimable (Pediatrician): 77
  - Dr  GAPIRA GANZA JEAN MARIE VIANNEY (Cardiologist): 31
  - DR ANAMALI ROGER (DENTAL SURGEON): 16
  - MUTESI LEAH (PHYSIOTHERAPIST): 8
  - Dr NSHUTI SHEMA DAVID (Internist): 56
  - DR MBABAZI MAGUY (Internist): 31
  - Dr Nyiraneza Esperance (DENTAL SURGEON): 5
  - Eric Rutaganda (Dentistry): 7
  - Dr. KAREKEZI CLAIRE (Neurologist): 3
  - Dr. NKERAGUTABARA Gihana Jacques (Family Physcian): 1
  - Dr. INGABIRE Allen Jean De La Croix (Orthopedic Surgeon): 5
  - Dr BIZIMANA YVES LAURENT (General Practitioner): 12
  - KARIMWABO JEAN CLAUDE (PHYSIOTHERAPIST): 8
  - Kalisa Gilbert (Dentistry): 8
  - Mr NSENGIYUMVA INNOCENT (CLINICAL PSYCHOLOGIST): 2
- June 13, 2026: 500 Completed
  - NAZE THIERRY (PHYSIOTHERAPIST): 12
  - MUKARUGWIZA FRANCINE (PHYSIOTHERAPIST): 9
  - Dr BAZATSINDA ANTHONY (Internist): 40
  - DR ANAMALI ROGER (DENTAL SURGEON): 21
  - Kalisa Gilbert (Dentistry): 12
  - DR BUTOYI ALPHONSE (Obstetrician & Gynaecologist): 19
  - Dr Kabayiza Jean Claude (Pediatrician): 94
  - DR MUTUNGIREHE SYLVESTRE (Neurologist): 65
  - DR MUGESERA ERNEST (DENTAL SURGEON): 15
  - DR DUFATANYE DARIUS (Cardiologist): 28
  - DR KWESIGA STEPHEN (Orthopedic Surgeon): 27
  - DR SITINI BERTIN (Obstetrician & Gynaecologist): 29
  - DR HAKIZIMANA ARISTOTE (Consultant ENT): 26
  - DR SEBATUNZI OSEE (Internist): 52
  - Dr Kanyamuhunga Aimable (Pediatrician): 32
  - ISHIMWE  GILBERT (Dentistry): 5
  - Dr. NKERAGUTABARA Gihana Jacques (Family Physcian): 8
  - UWAMAHORO SARAH (PHYSIOTHERAPIST): 6
- June 14, 2026: 449 Completed
  - INGABIRE JEAN PAUL (PHYSIOTHERAPIST): 17
  - Dr Rutaganda Eric (Internist): 71
  - DR NYIRIMODOKA ALEXANDRE (Urologist): 33
  - KARIMWABO JEAN CLAUDE (PHYSIOTHERAPIST): 14
  - Dr NKUBITO GATERA VALENS (Obstetrician & Gynaecologist): 27
  - DR HABYARIMANA OSWALD (Internist): 42
  - Dr Kanyamuhunga Aimable (Pediatrician): 81
  - DR MUGESERA ERNEST (DENTAL SURGEON): 8
  - Dr  GAPIRA GANZA JEAN MARIE VIANNEY (Cardiologist): 1
  - DR DUFATANYE DARIUS (Cardiologist): 22
  - Dr Ntirushwa David (Obstetrician & Gynaecologist): 22
  - Dr DUSHIMIYIMANA JMV (Consultant ENT): 13
  - DR MUTUNGIREHE SYLVESTRE (Neurologist): 32
  - DR ANAMALI ROGER (DENTAL SURGEON): 31
  - Dr Kansayisa Marie Grace (Orthopedic Surgeon): 15
  - ISHIMWE  GILBERT (Dentistry): 6
  - Dr BIZIMANA YVES LAURENT (General Practitioner): 13
  - Dr.BEDE BANA (DENTAL SURGEON): 1
"""

procedure_data = """
- BELOW ELBOW CAST: 1
- BLOOD SAMPLE COLLECTION /PRELEVEMENT ENFANT: 128
- BLOOD SAMPLE COLLECTION/PRELEVEMENT ADULTE: 345
- DEPOT PROVERANT: 1
- I.MINJECTION: 3
- INSERTION OF IMPLANT/INSERTION DE NORPLAN: 2
- Insertion of IUD COPPER: 8
- IV INFUSION/PERFUSION ADULTE: 7
- IV INFUSION/PERFUSION ENFANT: 3
- MANUAL VACUUM ASPIRATION (MVA): 2
- MEDICAL CERTIFICATE: 2
- MEDICAL REPORT: 7
- NEBULISATION/ADULTE: 3
- NEBULISATION/ENFANT: 28
- ORAL TOILET: 1
- POP REMOVAL/ABLATION PLATRE( CAST REMOVAL): 3
- REMOVAL OF IMPLANT/ABLATION DE NORPLAN: 1
- REMOVAL OF INGROWING NAIL/ONGLE INCARNEE: 1
- Removal of IUD/ABLATION IUD: 1
- REMOVAL OF SUTURES/ABLATION FILS: 1
- SEDATION AND ANALGESIA: 2
- TOP UP: 5
- TOP UP FOR ALPHA FETO PROTEIN: 2
- VACCINATION: 28
- WIDE AWAKE LOCAL ANESTHESIA (WALAT): 3
"""

days = ['June 9, 2026', 'June 10, 2026', 'June 11, 2026', 'June 12, 2026', 'June 13, 2026', 'June 14, 2026']

doctor_map = {}
daily_records = {day: {} for day in days}

# Parse raw_data
current_day = None
for line in raw_data.strip().split('\n'):
    if not line:
        continue
    day_match = re.match(r'-\s*(June\s+\d+,\s+\d{4}):', line)
    if day_match:
        current_day = day_match.group(1)
    else:
        doc_match = re.match(r'\s*-\s*(.*?)\s*\((.*?)\):\s*(\d+)', line)
        if doc_match:
            doc_name = doc_match.group(1).strip()
            dept = doc_match.group(2).strip()
            count = int(doc_match.group(3))
            
            # Clean and standardize names
            doc_name = re.sub(r'\s+', ' ', doc_name)
            clean_name = doc_name
            if not clean_name.upper().startswith('DR') and not clean_name.upper().startswith('MR') and not clean_name.upper().startswith('MISS'):
                clean_name = f"Dr. {clean_name}"
            # Standardize prefixes
            clean_name = clean_name.replace('Dr ', 'Dr. ').replace('Dr.BEDE', 'Dr. Bede').replace('Dr.  ', 'Dr. ')
            clean_name = clean_name.replace('Dr. NKERAGUTABARA Gihana Jacques', 'Dr. Gihana Jacques')
            clean_name = clean_name.replace('Dr. BIZIMANA YVES LAURENT', 'Dr. Yves Laurent Bizimana')
            clean_name = clean_name.replace('Dr Kanyamuhunga Aimable', 'Dr. Aimable Kanyamuhunga')
            clean_name = clean_name.replace('Dr Kabayiza Jean Claude', 'Dr. Jean Claude Kabayiza')
            clean_name = clean_name.replace('Dr Ntirushwa David', 'Dr. David Ntirushwa')
            clean_name = clean_name.replace('Dr. NKUBITO GATERA VALENS', 'Dr. Valens Nkubito Gatera')
            clean_name = clean_name.replace('Dr. KAREKEZI CLAIRE', 'Dr. Claire Karekezi')
            clean_name = clean_name.replace('Dr Kansayisa Marie Grace', 'Dr. Marie Grace Kansayisa')
            clean_name = clean_name.replace('Dr Desire Rubanguka', 'Dr. Desire Rubanguka')
            clean_name = clean_name.replace('Dr Afrika Gasana', 'Dr. Gasana Africa')
            
            # Standardize further
            clean_name = clean_name.replace('Dr. NKERAGUTABARA Gihana Jacques', 'Dr. Gihana Jacques')
            clean_name = clean_name.replace('Dr. BIZIMANA YVES LAURENT', 'Dr. Yves L. Bizimana')
            clean_name = clean_name.replace('Dr. Aimable Kanyamuhunga', 'Dr. Aimable K.')
            clean_name = clean_name.replace('Dr. Jean Claude Kabayiza', 'Dr. Kabayiza J.C.')
            clean_name = clean_name.replace('Dr. Valens Nkubito Gatera', 'Dr. Valens Nkubito')
            clean_name = clean_name.replace('Dr. Claire Karekezi', 'Dr. Claire Karekezi')
            clean_name = clean_name.replace('Dr. Marie Grace Kansayisa', 'Dr. Marie Grace Kansayisa')
            clean_name = clean_name.replace('Dr. Desire Rubanguka', 'Dr. Desire Rubanguka')
            clean_name = clean_name.replace('Dr. Gasana Africa', 'Dr. Gasana Africa')
            clean_name = clean_name.replace('Dr. Gihana Jacques', 'Dr. Gihana Jacques')
            
            # title case but preserve special strings
            clean_name = clean_name.title()
            clean_name = clean_name.replace('Dr. ', 'Dr. ').replace('Mr. ', 'Mr. ').replace('Miss. ', 'Miss ')
            clean_name = clean_name.replace('Jc', 'JC').replace('Ent', 'ENT').replace('Vianney', 'Vianney').replace('Jmv', 'JMV')
            clean_name = clean_name.replace('Dr. Bede Bana', 'Dr. Bede Bana')
            clean_name = clean_name.replace('Dr. Anamali Roger', 'Dr. Roger Anamali')
            clean_name = clean_name.replace('Dr. Habyarimana Oswald', 'Dr. Oswald Habyarimana')
            clean_name = clean_name.replace('Dr. Nshuti Shema David', 'Dr. Shema David Nshuti')
            clean_name = clean_name.replace('Dr. Butoyi Alphonse', 'Dr. Alphonse Butoyi')
            clean_name = clean_name.replace('Dr. Gapira Ganza Jean Marie Vianney', 'Dr. Jean Marie Vianney Ganza')
            clean_name = clean_name.replace('Dr. Kwesiga Stephen', 'Dr. Stephen Kwesiga')
            clean_name = clean_name.replace('Dr. Nyirimodoka Alexandre', 'Dr. Alexandre Nyirimodoka')
            clean_name = clean_name.replace('Dr. Hakizimana Aristote', 'Dr. Aristote Hakizimana')
            clean_name = clean_name.replace('Dr. Mugesera Ernest', 'Dr. Ernest Mugesera')
            clean_name = clean_name.replace('Dr. Bazatsinda Anthony', 'Dr. Anthony Bazatsinda')
            clean_name = clean_name.replace('Dr. Sebatunzi Osee', 'Dr. Osee Sebatunzi')
            clean_name = clean_name.replace('Dr. Dushimiyimana Jmv', 'Dr. JMV Dushimiyimana')
            clean_name = clean_name.replace('Dr. Sitini Bertin', 'Dr. Bertin Sitini')
            clean_name = clean_name.replace('Dr. Dufatanye Darius', 'Dr. Darius Dufatanye')
            clean_name = clean_name.replace('Dr. Mukaruziga Agnes', 'Dr. Agnes Mukaruziga')
            clean_name = clean_name.replace('Dr. Mutungirehe Sylvestre', 'Dr. Sylvestre Mutungirehe')
            clean_name = clean_name.replace('Dr. Mbabazi Maguy', 'Dr. Maguy Mbabazi')
            clean_name = clean_name.replace('Dr. Nkeragutabara Gihana Jacques', 'Dr. Gihana Jacques')
            clean_name = clean_name.replace('Dr. Bizimana Yves Laurent', 'Dr. Yves L. Bizimana')
            clean_name = clean_name.replace('Dr. Kanyamuhunga Aimable', 'Dr. Aimable K.')
            clean_name = clean_name.replace('Dr. Kabayiza Jean Claude', 'Dr. Kabayiza J.C.')
            clean_name = clean_name.replace('Dr. Nkubito Gatera Valens', 'Dr. Valens Nkubito')
            
            # Map departments to standard names
            dept_map = {
                'PHYSIOTHERAPIST': 'Physiotherapy',
                'Pediatrician': 'Pediatrics',
                'Internist': 'Internal Medicine',
                'Obstetrician & Gynaecologist': 'Gynecology',
                'Cardiologist': 'Internal Medicine',
                'DENTAL SURGEON': 'Dental',
                'Dentistry': 'Dental',
                'Orthopedic Surgeon': 'Orthopedics',
                'General Surgeon': 'Surgery',
                'Urologist': 'Urology',
                'Family Physcian': 'General Medicine',
                'General Practitioner': 'General Medicine',
                'Consultant ENT': 'ENT',
                'Neurologist': 'Neurology',
                'CLINICAL PSYCHOLOGIST': 'Mental Health'
            }
            clean_dept = dept_map.get(dept, dept)
            
            doctor_map[clean_name] = clean_dept
            daily_records[current_day][clean_name] = count

# Build the main completions table
md_content = """# Institutional Monthly Operational Matrix Report

## Period: June 9, 2026 to June 14, 2026
This document contains the patient completions and procedure statistics for the period from June 9, 2026 to June 14, 2026, extracted from the Patient Waiting Status system.

### Patient Completions by Doctor and Department

| Staff Specialist | Specialty / Department | June 9 | June 10 | June 11 | June 12 | June 13 | June 14 | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
"""

# Sort doctors by department, then by name
sorted_docs = sorted(doctor_map.keys(), key=lambda x: (doctor_map[x], x))

department_totals = {day: {} for day in days}
all_doc_totals = {day: 0 for day in days}

for doc in sorted_docs:
    dept = doctor_map[doc]
    row_counts = []
    doc_total = 0
    for day in days:
        cnt = daily_records[day].get(doc, 0)
        row_counts.append(str(cnt) if cnt > 0 else "-")
        doc_total += cnt
        all_doc_totals[day] += cnt
        
        # Track department totals
        department_totals[day][dept] = department_totals[day].get(dept, 0) + cnt
        
    md_content += f"| {doc} | {dept} | " + " | ".join(row_counts) + f" | {doc_total} |\n"

# Add daily totals row
daily_totals_str = " | ".join([str(all_doc_totals[day]) for day in days])
total_sum = sum(all_doc_totals.values())
md_content += f"| **TOTAL COMPLETED PATIENTS** | | " + daily_totals_str + f" | **{total_sum}** |\n\n"

# Add department summary table
md_content += "### Summary of Completions by Specialty / Department\n\n"
md_content += "| Specialty / Department | June 9 | June 10 | June 11 | June 12 | June 13 | June 14 | Total |\n"
md_content += "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n"

all_depts = sorted(list(set(doctor_map.values())))
for dept in all_depts:
    dept_counts = []
    dept_total = 0
    for day in days:
        cnt = department_totals[day].get(dept, 0)
        dept_counts.append(str(cnt) if cnt > 0 else "-")
        dept_total += cnt
    md_content += f"| {dept} | " + " | ".join(dept_counts) + f" | {dept_total} |\n"

md_content += f"| **TOTAL** | " + daily_totals_str + f" | **{total_sum}** |\n\n"

# Add procedures section
md_content += "### Nursing and Ward Procedures (June 9 to June 14, 2026)\n\n"
md_content += "| Procedure Name | Total Count |\n"
md_content += "| :--- | :---: |\n"

procedures = []
for line in procedure_data.strip().split('\n'):
    if not line:
        continue
    proc_match = re.match(r'\s*-\s*(.*?):\s*(\d+)', line)
    if proc_match:
        proc_name = proc_match.group(1).strip()
        cnt = int(proc_match.group(2))
        procedures.append((proc_name, cnt))

# Sort procedures by count descending
procedures = sorted(procedures, key=lambda x: x[1], reverse=True)
total_procedures = sum([p[1] for p in procedures])

for proc_name, cnt in procedures:
    md_content += f"| {proc_name} | {cnt} |\n"

md_content += f"| **TOTAL PROCEDURES** | **{total_procedures}** |\n\n"

# Write report to file
report_path = "/home/noble/Documents/LC_APPS/LC_Reporting_Portal/june_9_14_completions_report.md"
with open(report_path, "w") as f:
    f.write(md_content)

print(f"Report successfully written to: {report_path}")
print("Totals match:", total_sum == 2613)
