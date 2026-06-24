const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const db = require('../src/config/db');

const seedData = [
  {
    "keyword": "malaria",
    "results": [
      { "code": "1F45", "desc": "Malaria without parasitological confirmation" },
      { "code": "1F4Z", "desc": "Malaria, unspecified" },
      { "code": "1F42.Z", "desc": "Plasmodium malariae malaria without complication" },
      { "code": "1F44", "desc": "Other parasitologically confirmed malaria" },
      { "code": "KA64.Y", "desc": "Other specified parasitic diseases in the fetus or newborn" },
      { "code": "1F40.Z", "desc": "Malaria due to Plasmodium falciparum, unspecified" },
      { "code": "1F43", "desc": "Malaria due to Plasmodium ovale" },
      { "code": "1F41.Z", "desc": "Plasmodium vivax malaria without complication" },
      { "code": "QC42.Y", "desc": "Other specified personal history of infectious or parasitic diseases" },
      { "code": "KA64.1", "desc": "Congenital falciparum malaria" }
    ]
  },
  {
    "keyword": "cholera",
    "results": [
      { "code": "1A00", "desc": "Cholera" },
      { "code": "QC90.00", "desc": "Exposure to cholera" },
      { "code": "1A00&XN8P1", "desc": "Cholera due to Vibrio cholerae O1, biovar cholerae" },
      { "code": "QD01.Y", "desc": "Other specified carrier of intestinal infectious agents" },
      { "code": "NE61", "desc": "Harmful effects of or exposure to noxious substances, chiefly nonmedicinal as to source, not elsewhere classified" },
      { "code": "NE60", "desc": "Harmful effects of drugs, medicaments or biological substances, not elsewhere classified" },
      { "code": "1A00&XN62R", "desc": "Cholera due to Vibrio cholerae O1, biovar eltor" },
      { "code": "QA08.0", "desc": "Special screening examination for intestinal infectious diseases" },
      { "code": "QC00.0", "desc": "Need for immunization against cholera alone" },
      { "code": "1A00&XN8KD", "desc": "Cholera due to Vibrio cholerae O139" }
    ]
  },
  {
    "keyword": "typhoid",
    "results": [
      { "code": "1A07.Z", "desc": "Typhoid fever, unspecified" },
      { "code": "1A07.Y", "desc": "Other specified typhoid fever" },
      { "code": "QD00", "desc": "Carrier of salmonella typhi" },
      { "code": "1A07.Y/FA11.Y", "desc": "Typhoid arthritis" },
      { "code": "1A07.Y/1D01.0Z", "desc": "Typhoid meningitis" },
      { "code": "1A07.Y/CA40.0Z", "desc": "Typhoid pneumonia" },
      { "code": "1A07.0", "desc": "Typhoid peritonitis" },
      { "code": "NE60", "desc": "Harmful effects of drugs, medicaments or biological substances, not elsewhere classified" },
      { "code": "1A07.Y/BC42.1", "desc": "Typhoid myocarditis" },
      { "code": "1A07.Y/BB40", "desc": "Typhoid endocarditis" }
    ]
  },
  {
    "keyword": "hypertension",
    "results": [
      { "code": "BA00.Z", "desc": "Essential hypertension, unspecified" },
      { "code": "9C61.01", "desc": "Ocular hypertension" },
      { "code": "BB01.Z", "desc": "Pulmonary hypertension, unspecified" },
      { "code": "JA23", "desc": "Gestational hypertension" },
      { "code": "BA04.Y", "desc": "Other specified secondary hypertension" },
      { "code": "DB98.7Z", "desc": "Portal hypertension, unspecified" },
      { "code": "BA03", "desc": "Hypertensive crisis" },
      { "code": "BA00.2", "desc": "Isolated systolic hypertension" },
      { "code": "BA00.1", "desc": "Isolated diastolic hypertension" },
      { "code": "BA00.Y", "desc": "Other specified essential hypertension" }
    ]
  },
  {
    "keyword": "diabetes",
    "results": [
      { "code": "5A14", "desc": "Diabetes mellitus, type unspecified" },
      { "code": "JA63.2", "desc": "Diabetes mellitus arising in pregnancy" },
      { "code": "5A13.4", "desc": "Diabetes mellitus due to drug or chemical" },
      { "code": "5C64.3", "desc": "Disorders of phosphorus metabolism or phosphatases" },
      { "code": "5A11", "desc": "Type 2 diabetes mellitus" },
      { "code": "LD2H.Y", "desc": "Other specified syndromic genetic deafness" },
      { "code": "5A10", "desc": "Type 1 diabetes mellitus" },
      { "code": "BD54", "desc": "Diabetic foot ulcer" },
      { "code": "5A24", "desc": "Uncontrolled or unstable diabetes mellitus" },
      { "code": "5A61.5", "desc": "Central diabetes insipidus" }
    ]
  },
  {
    "keyword": "influenza",
    "results": [
      { "code": "1E32", "desc": "Influenza, virus not identified" },
      { "code": "QC01.8", "desc": "Need for immunization against influenza" },
      { "code": "1A40.Z", "desc": "Infectious gastroenteritis or colitis without specification of infectious agent" },
      { "code": "1E30", "desc": "Influenza due to identified seasonal influenza virus" },
      { "code": "1E31&XN4TT", "desc": "Influenza due to infection with Influenza A/H5N1 virus" },
      { "code": "1E31&XN297", "desc": "Influenza due to infection with Influenza A/H1N1 virus" },
      { "code": "NE60", "desc": "Harmful effects of drugs, medicaments or biological substances, not elsewhere classified" },
      { "code": "1E32/AB0Z", "desc": "Influenzal otitis media" },
      { "code": "AB0Y&XN1P6", "desc": "Otitis due to haemophilus influenzae" },
      { "code": "1D01.00", "desc": "Meningitis due to Haemophilus influenzae" }
    ]
  },
  {
    "keyword": "bronchitis",
    "results": [
      { "code": "CA20.Z", "desc": "Bronchitis, unspecified" },
      { "code": "CA42.Z", "desc": "Acute bronchitis, unspecified" },
      { "code": "CA20.Y", "desc": "Other specified bronchitis" },
      { "code": "CA20.1Z", "desc": "Chronic bronchitis, unspecified" },
      { "code": "CA22.1", "desc": "Certain specified chronic obstructive pulmonary disease" },
      { "code": "CA81.0", "desc": "Bronchitis or pneumonitis due to chemicals, gases, fumes or vapours" },
      { "code": "CA42.Y", "desc": "Other specified acute bronchitis" },
      { "code": "CA20.1Y", "desc": "Other specified chronic bronchitis" },
      { "code": "CA20.11", "desc": "Mucopurulent chronic bronchitis" },
      { "code": "CA40.Z", "desc": "Pneumonia, organism unspecified" }
    ]
  },
  {
    "keyword": "gastroenteritis",
    "results": [
      { "code": "1A40.0", "desc": "Gastroenteritis or colitis without specification of origin" },
      { "code": "1A40.Z", "desc": "Infectious gastroenteritis or colitis without specification of infectious agent" },
      { "code": "1A2Z", "desc": "Viral intestinal infections, unspecified" },
      { "code": "DA42.82", "desc": "Chemical gastritis" },
      { "code": "1A09.0", "desc": "Salmonella enteritis" },
      { "code": "DA42.Z", "desc": "Gastritis, unspecified" },
      { "code": "1E32", "desc": "Influenza, virus not identified" },
      { "code": "1A06", "desc": "Gastroenteritis due to Campylobacter" },
      { "code": "1A32", "desc": "Cryptosporidiosis" },
      { "code": "1C1A.Y", "desc": "Other specified listeriosis" }
    ]
  },
  {
    "keyword": "appendicitis",
    "results": [
      { "code": "DB10.Z", "desc": "Appendicitis, unspecified" },
      { "code": "DB10.Y", "desc": "Other specified appendicitis" },
      { "code": "DB10.0", "desc": "Acute appendicitis" },
      { "code": "DB10.02", "desc": "Acute appendicitis without localised or generalised peritonitis" },
      { "code": "DB10.1", "desc": "Chronic appendicitis" },
      { "code": "1B12.7/DB10.Z", "desc": "Tuberculous appendicitis" },
      { "code": "DB10.01", "desc": "Acute appendicitis with localised peritonitis" },
      { "code": "DB10.Y&XT1L", "desc": "Subacute appendicitis" },
      { "code": "DB10.00", "desc": "Acute appendicitis with generalised peritonitis" }
    ]
  },
  {
    "keyword": "pregnancy",
    "results": [
      { "code": "JA80.Z", "desc": "Maternal care related to unspecified multiple gestation" },
      { "code": "JA01.1", "desc": "Tubal pregnancy" },
      { "code": "QA40", "desc": "Pregnancy examination or test" },
      { "code": "JA61.Y", "desc": "Other specified venous complications in pregnancy" },
      { "code": "JA01.Y", "desc": "Other specified ectopic pregnancy" },
      { "code": "JA40.Y", "desc": "Other specified haemorrhage in early pregnancy" },
      { "code": "JA01.Z", "desc": "Ectopic pregnancy, unspecified" },
      { "code": "JA01.0", "desc": "Abdominal pregnancy" },
      { "code": "JA61.0", "desc": "Varicose veins of lower extremity in pregnancy" },
      { "code": "JA02.Z", "desc": "Molar pregnancy, unspecified" }
    ]
  },
  {
    "keyword": "anemia",
    "results": [
      { "code": "3A9Z", "desc": "Anaemias or other erythrocyte disorders, unspecified" },
      { "code": "KA8Y", "desc": "Other specified haemorrhagic or haematological disorders of fetus or newborn" },
      { "code": "JB64.0", "desc": "Anaemia complicating pregnancy, childbirth or the puerperium" },
      { "code": "3A70.11", "desc": "Aplastic anaemia due to other external agents" },
      { "code": "3A70.Z", "desc": "Aplastic anaemia, unspecified" },
      { "code": "3A90", "desc": "Anaemia due to acute disease" },
      { "code": "3A71.Z", "desc": "Anaemia due to chronic disease, unspecified" },
      { "code": "1F68.1", "desc": "Necatoriasis" },
      { "code": "2A30", "desc": "Refractory anaemia" },
      { "code": "3A72.Z", "desc": "Sideroblastic anaemia, unspecified" }
    ]
  },
  {
    "keyword": "pneumonia",
    "results": [
      { "code": "CA40.Z", "desc": "Pneumonia, organism unspecified" },
      { "code": "CA40.Y", "desc": "Other specified pneumonia" },
      { "code": "KB24", "desc": "Congenital pneumonia" },
      { "code": "CA40.1Z", "desc": "Viral pneumonia, unspecified" },
      { "code": "CA40.0Z", "desc": "Bacterial pneumonia, unspecified" },
      { "code": "NF0A.Y", "desc": "Other early complication of trauma, not elsewhere classified" },
      { "code": "CA82.0", "desc": "Acute pulmonary manifestations due to radiation" },
      { "code": "CB03.Z", "desc": "Idiopathic interstitial pneumonitis, unspecified" },
      { "code": "CA40.07", "desc": "Pneumonia due to Streptococcus pneumoniae" },
      { "code": "CA40.0Y", "desc": "Pneumonia due to other specified bacteria" }
    ]
  },
  {
    "keyword": "asthma",
    "results": [
      { "code": "CA23", "desc": "Asthma" },
      { "code": "CA23.3", "desc": "Unspecified asthma" },
      { "code": "CA23.32", "desc": "Unspecified asthma, uncomplicated" },
      { "code": "CA23.0", "desc": "Allergic asthma" },
      { "code": "CA23.31", "desc": "Unspecified asthma with status asthmaticus" },
      { "code": "CA60.1", "desc": "Coal worker pneumoconiosis" },
      { "code": "CA23.30", "desc": "Unspecified asthma with exacerbation" },
      { "code": "CA22.1", "desc": "Certain specified chronic obstructive pulmonary disease" },
      { "code": "CA23.1", "desc": "Non-allergic asthma" },
      { "code": "CA70.Y", "desc": "Other specified hypersensitivity pneumonitis due to organic dust" }
    ]
  },
  {
    "keyword": "migraine",
    "results": [
      { "code": "8A80.Z", "desc": "Migraine, unspecified" },
      { "code": "8A80.Y", "desc": "Other specified migraine" },
      { "code": "8A80.2", "desc": "Chronic migraine" },
      { "code": "8A80.1Z", "desc": "Migraine with aura, unspecified" },
      { "code": "8A80.0", "desc": "Migraine without aura" },
      { "code": "8A80.3Y", "desc": "Other specified complications related to migraine" },
      { "code": "GA34.40", "desc": "Premenstrual tension syndrome" },
      { "code": "8A80.30", "desc": "Status migrainosus" },
      { "code": "DD93.Y", "desc": "Other functional digestive disorders of infants, neonates or toddlers" },
      { "code": "AB31.1", "desc": "Vestibular migraine" }
    ]
  },
  {
    "keyword": "tonsillitis",
    "results": [
      { "code": "CA03.Z", "desc": "Acute tonsillitis, unspecified" },
      { "code": "CA0F.Y", "desc": "Other specified chronic diseases of tonsils or adenoids" },
      { "code": "CA03.Y", "desc": "Other specified acute tonsillitis" },
      { "code": "CA0F.0", "desc": "Hypertrophy of tonsils" },
      { "code": "CA03.0", "desc": "Streptococcal tonsillitis" },
      { "code": "NA0Z&XA3V90", "desc": "Injury of tonsil" },
      { "code": "1C1H.0", "desc": "Other Vincent infections" },
      { "code": "2B69.Z", "desc": "Malignant neoplasms of tonsil, unspecified" },
      { "code": "2E90.4", "desc": "Benign neoplasm of tonsil" },
      { "code": "CA0F.1", "desc": "Hypertrophy of adenoids" }
    ]
  },
  {
    "keyword": "dengue",
    "results": [
      { "code": "1D2Z", "desc": "Dengue fever, unspecified" },
      { "code": "1D22", "desc": "Severe dengue" },
      { "code": "1D21", "desc": "Dengue with warning signs" },
      { "code": "1D20", "desc": "Dengue without warning signs" },
      { "code": "QA08.5", "desc": "Special screening examination for other viral diseases" },
      { "code": "QA02.1", "desc": "Observation for suspected Dengue, ruled out" }
    ]
  },
  {
    "keyword": "covid",
    "results": [
      { "code": "RA02", "desc": "Post COVID-19 condition" },
      { "code": "RA01", "desc": "COVID-19" },
      { "code": "RA01.0", "desc": "COVID-19, virus identified" },
      { "code": "RA01.1", "desc": "COVID-19, virus not identified" },
      { "code": "QA08.5", "desc": "Special screening examination for other viral diseases" },
      { "code": "QC42.0", "desc": "Personal history of COVID-19" },
      { "code": "QC01.9", "desc": "Need for immunization against COVID-19" },
      { "code": "RA03", "desc": "Multisystem inflammatory syndrome associated with COVID-19" },
      { "code": "RA01.0/CA40.1Z", "desc": "COVID-19 with pneumonia, SARS-CoV-2 identified" },
      { "code": "RA01.1/CA40.1Z", "desc": "COVID-19 with pneumonia, SARS-CoV-2 not identified" }
    ]
  },
  {
    "keyword": "uti",
    "results": [
      { "code": "GC08.Z", "desc": "Urinary tract infection, site and agent not specified" },
      { "code": "GC08.0", "desc": "Urinary tract infection, site not specified, due to Escherichia coli" },
      { "code": "GC08.Y&XN5L6", "desc": "Urinary tract infection, site not specified, due to Pseudomonas aeruginosa" }
    ]
  },
  {
    "keyword": "urinary tract infection",
    "results": [
      { "code": "GC08.Z", "desc": "Urinary tract infection, site and agent not specified" },
      { "code": "JA62.Y", "desc": "Infections of genitourinary tract in pregnancy, other specified site" },
      { "code": "KA65.2", "desc": "Neonatal urinary tract infection" },
      { "code": "1H0Z", "desc": "Infection, unspecified" },
      { "code": "JA62.Z", "desc": "Infection of genitourinary tract in pregnancy, site unspecified" },
      { "code": "JA62.3", "desc": "Infections of other parts of urinary tract in pregnancy" },
      { "code": "GC2Z", "desc": "Diseases of the urinary system, unspecified" },
      { "code": "JB40.Y", "desc": "Other specified infections in the puerperium" },
      { "code": "LB31.Z", "desc": "Structural developmental anomalies of urinary tract, unspecified" },
      { "code": "1A40.Z", "desc": "Infectious gastroenteritis or colitis without specification of infectious agent" }
    ]
  },
  {
    "keyword": "tuberculosis",
    "results": [
      { "code": "1B1Z", "desc": "Tuberculosis, unspecified" },
      { "code": "1B1Y", "desc": "Other specified tuberculosis" },
      { "code": "KA61.0", "desc": "Congenital tuberculosis" },
      { "code": "1B12.40", "desc": "Tuberculosis of bones or joints" },
      { "code": "1B10.Z", "desc": "Respiratory tuberculosis, without mention of bacteriological or histological confirmation" },
      { "code": "1B12.7", "desc": "Tuberculosis of the digestive system" },
      { "code": "1B13.1", "desc": "Acute miliary tuberculosis of multiple sites" },
      { "code": "1B12.8", "desc": "Cutaneous tuberculosis" },
      { "code": "QC90.1", "desc": "Contact with or exposure to tuberculosis" },
      { "code": "1B13.Z", "desc": "Miliary tuberculosis, unspecified" }
    ]
  }
];

async function run() {
  try {
    console.log('🧹 Clearing icd11_cache table...');
    await db.query('DELETE FROM icd11_cache');
    console.log('✅ icd11_cache table cleared.');

    console.log('🌱 Seeding icd11_cache table with updated WHO ICD-11 codes...');
    for (const item of seedData) {
      await db.query(
        'INSERT OR REPLACE INTO icd11_cache (keyword, results) VALUES (?, ?)',
        [item.keyword, JSON.stringify(item.results)]
      );
      console.log(`- Seeded: "${item.keyword}"`);
    }
    console.log('🎉 Seeding successfully completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

run();
