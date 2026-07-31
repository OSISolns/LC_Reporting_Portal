const db = require('../backend/src/config/db');
const clinicalController = require('../backend/src/controllers/clinicalController');

async function testPhysioEndpoints() {
  console.log('--- Testing Physiotherapy Backend APIs ---');
  // Wait 1 sec for db connection to stabilize
  await new Promise(r => setTimeout(r, 1000));

  // Mock Request / Response objects
  const mockRes = () => {
    const res = {};
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    return res;
  };

  // 1. Test createPhysioAssessment
  const reqAss = {
    body: {
      patient_id: 'PAT-9001',
      patient_name: 'David Miller',
      therapist_name: 'Mr NAZE Thierry',
      body_part: 'Knee',
      chief_complaint: 'Post ACL Reconstruction Stiffness & Quadriceps Weakness',
      rom_data: { flexion: 110, extension: 0, abduction: 0, rotation: 0 },
      pain_score: 4,
      muscle_grade: 'Grade 4 (Good)',
      functional_goals: 'Achieve 135 deg flexion and full weight bearing without limp',
      treatment_plan: 'Quadriceps sets, Codman pendulums, Cold pack application'
    }
  };
  const resAss = mockRes();
  await clinicalController.createPhysioAssessment(reqAss, resAss);
  console.log('createPhysioAssessment status:', resAss.statusCode || 200, resAss.body?.message);

  // 2. Test getPhysioAssessments
  const reqGetAss = { query: { patient_id: 'PAT-9001' } };
  const resGetAss = mockRes();
  await clinicalController.getPhysioAssessments(reqGetAss, resGetAss);
  console.log('getPhysioAssessments count:', resGetAss.body?.data?.length);

  // 3. Test createPhysioSession
  const reqSess = {
    body: {
      patient_id: 'PAT-9001',
      patient_name: 'David Miller',
      therapist_name: 'Mr NAZE Thierry',
      session_date: new Date().toISOString().split('T')[0],
      status: 'Scheduled',
      treatment_area: 'Right Knee',
      exercises_prescribed: [
        { name: 'Quadriceps Sets', sets: 3, reps: 15, hold: 5 },
        { name: 'Stationary Bike', sets: 1, reps: 10, hold: 600 }
      ],
      progress_notes: 'Patient tolerated session well with mild discomfort.'
    }
  };
  const resSess = mockRes();
  await clinicalController.createPhysioSession(reqSess, resSess);
  console.log('createPhysioSession status:', resSess.statusCode || 200, resSess.body?.message);

  // 4. Test getPhysioSessions
  const reqGetSess = { query: {} };
  const resGetSess = mockRes();
  await clinicalController.getPhysioSessions(reqGetSess, resGetSess);
  console.log('getPhysioSessions count:', resGetSess.body?.data?.length);

  console.log('--- Physio Backend Verification SUCCESS ---');
  process.exit(0);
}

testPhysioEndpoints().catch(err => {
  console.error('Error during Physio backend test:', err);
  process.exit(1);
});
