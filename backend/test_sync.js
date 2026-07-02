const { syncClinicalUsagesToInventory } = require('./src/controllers/clinicalController');
(async () => {
  try {
    await syncClinicalUsagesToInventory();
    console.log('Success');
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit();
})();
