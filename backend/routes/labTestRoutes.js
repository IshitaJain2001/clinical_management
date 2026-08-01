const express = require('express');
const router = express.Router();
const LabTest = require('../models/LabTest');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

// Default Standard Lab Test Catalog to seed for new hospitals
const DEFAULT_LAB_TESTS = [
  { testCode: 'LAB-CBC-01', testName: 'Complete Blood Count (CBC)', category: 'Hematology', price: 350, sampleType: 'Blood (EDTA)', turnaroundTime: '4 Hours', normalRange: 'WBC 4k-11k, Hb 12-16 g/dL', unit: 'Mixed' },
  { testCode: 'LAB-LIP-02', testName: 'Lipid Profile Complete', category: 'Biochemistry', price: 850, sampleType: 'Blood (Serum)', turnaroundTime: '12 Hours', normalRange: 'Cholesterol < 200 mg/dL', unit: 'mg/dL' },
  { testCode: 'LAB-LFT-03', testName: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 900, sampleType: 'Blood (Serum)', turnaroundTime: '12 Hours', normalRange: 'Bilirubin 0.2-1.2 mg/dL', unit: 'U/L & mg/dL' },
  { testCode: 'LAB-KFT-04', testName: 'Kidney Function Test (KFT / RFT)', category: 'Biochemistry', price: 850, sampleType: 'Blood (Serum)', turnaroundTime: '12 Hours', normalRange: 'Urea 15-40, Creatinine 0.6-1.2', unit: 'mg/dL' },
  { testCode: 'LAB-THY-05', testName: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 1100, sampleType: 'Blood (Serum)', turnaroundTime: '24 Hours', normalRange: 'TSH 0.4-4.0 uIU/mL', unit: 'uIU/mL' },
  { testCode: 'LAB-HBA1C-06', testName: 'HbA1c (Glycated Hemoglobin)', category: 'Biochemistry', price: 600, sampleType: 'Blood (EDTA)', turnaroundTime: '6 Hours', normalRange: '< 5.7% Normal, > 6.5% Diabetic', unit: '%' },
  { testCode: 'LAB-FBS-07', testName: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', price: 150, sampleType: 'Blood (Fluoride)', turnaroundTime: '2 Hours', normalRange: '70-99 mg/dL', unit: 'mg/dL' },
  { testCode: 'LAB-PPBS-08', testName: 'Post Prandial Blood Sugar (PPBS)', category: 'Biochemistry', price: 150, sampleType: 'Blood (Fluoride)', turnaroundTime: '2 Hours', normalRange: '< 140 mg/dL', unit: 'mg/dL' },
  { testCode: 'LAB-URINE-09', testName: 'Urine Routine & Microscopy', category: 'Pathology', price: 250, sampleType: 'Urine (Midstream)', turnaroundTime: '2 Hours', normalRange: 'Pus cells 0-5, Protein Nil', unit: '/HPF' },
  { testCode: 'LAB-VITD-10', testName: 'Vitamin D3 (25-Hydroxy)', category: 'Biochemistry', price: 1400, sampleType: 'Blood (Serum)', turnaroundTime: '24 Hours', normalRange: '30-100 ng/mL', unit: 'ng/mL' },
  { testCode: 'LAB-VITB12-11', testName: 'Vitamin B12 Level', category: 'Biochemistry', price: 1200, sampleType: 'Blood (Serum)', turnaroundTime: '24 Hours', normalRange: '200-900 pg/mL', unit: 'pg/mL' },
  { testCode: 'LAB-COVID-12', testName: 'COVID-19 RT-PCR Test', category: 'Microbiology', price: 800, sampleType: 'Nasopharyngeal Swab', turnaroundTime: '12 Hours', normalRange: 'Negative / Ct Value', unit: 'Qualitative' },
  { testCode: 'LAB-DENGUE-13', testName: 'Dengue NS1 Antigen & IgG/IgM', category: 'Serology', price: 750, sampleType: 'Blood (Serum)', turnaroundTime: '4 Hours', normalRange: 'Non-Reactive', unit: 'Qualitative' },
  { testCode: 'LAB-WIDAL-14', testName: 'Typhoid Widal Antigen Test', category: 'Serology', price: 350, sampleType: 'Blood (Serum)', turnaroundTime: '4 Hours', normalRange: 'Titre < 1:80', unit: 'Titre' },
  { testCode: 'LAB-CXR-15', testName: 'Chest X-Ray PA View', category: 'Radiology', price: 450, sampleType: 'Radiograph', turnaroundTime: '1 Hour', normalRange: 'Normal Lung Fields & Cardiac Size', unit: 'Imaging' },
  { testCode: 'LAB-ECG-16', testName: '12-Lead Electrocardiogram (ECG)', category: 'Cardiology', price: 300, sampleType: 'Diagnostic Trace', turnaroundTime: '30 Mins', normalRange: 'Normal Sinus Rhythm', unit: 'BPM & Tracing' },
  { testCode: 'LAB-USG-17', testName: 'Ultrasound Abdomen & Pelvis', category: 'Radiology', price: 1200, sampleType: 'USG Scan', turnaroundTime: '2 Hours', normalRange: 'Normal Visceral Architecture', unit: 'Imaging' },
  { testCode: 'LAB-MRI-18', testName: 'MRI Brain (Plain)', category: 'Radiology', price: 4500, sampleType: 'MRI Scan', turnaroundTime: '6 Hours', normalRange: 'Normal Brain Parenchyma', unit: 'Imaging' },
  { testCode: 'LAB-CT-19', testName: 'CT Scan Head (NCCT)', category: 'Radiology', price: 3200, sampleType: 'CT Scan', turnaroundTime: '4 Hours', normalRange: 'No Focal Lesion or Bleed', unit: 'Imaging' }
];

// Helper to seed catalog if empty
const seedCatalogIfEmpty = async (tenantId) => {
  const count = await LabTest.countDocuments({ tenantId });
  if (count === 0) {
    const docs = DEFAULT_LAB_TESTS.map(item => ({ ...item, tenantId }));
    await LabTest.insertMany(docs);
  }
};

// Get active lab tests for receptionist appointment dropdown
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const tests = await LabTest.find({ tenantId, isActive: true }).sort({ category: 1, testName: 1 });
    res.json(tests);
  } catch (err) {
    console.error('Error fetching lab tests:', err);
    res.status(500).json({ error: 'Failed to fetch lab tests' });
  }
});

// Get all lab tests (including inactive) for hospital lab staff/admin management
router.get('/all', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const tests = await LabTest.find({ tenantId }).sort({ category: 1, testName: 1 });
    res.json(tests);
  } catch (err) {
    console.error('Error fetching all lab tests:', err);
    res.status(500).json({ error: 'Failed to fetch lab test catalog' });
  }
});

// Create a new lab test item & price
router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const { testCode, testName, category, price, sampleType, turnaroundTime, normalRange, unit, description } = req.body;

    if (!testName || price === undefined) {
      return res.status(400).json({ error: 'Test name and price are required.' });
    }

    const code = testCode ? testCode.trim().toUpperCase() : `LAB-${Date.now().toString().slice(-6)}`;
    const existing = await LabTest.findOne({ tenantId, testCode: code });
    if (existing) {
      return res.status(400).json({ error: `Test code '${code}' already exists for this hospital.` });
    }

    const test = await LabTest.create({
      tenantId,
      testCode: code,
      testName,
      category: category || 'General',
      price: Number(price) || 0,
      sampleType: sampleType || 'Blood',
      turnaroundTime: turnaroundTime || '24 Hours',
      normalRange: normalRange || '',
      unit: unit || '',
      description: description || '',
      isActive: true
    });

    const io = req.app.get("io");
    if (io && tenantId) {
      io.to(tenantId).emit("data_changed", { type: "lab_catalog" });
    }

    res.status(201).json(test);
  } catch (err) {
    console.error('Error creating lab test:', err);
    res.status(400).json({ error: err.message || 'Failed to create lab test' });
  }
});

// Update an existing lab test item / price / status
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { returnDocument: 'after' }
    );
    if (!test) {
      return res.status(404).json({ error: 'Lab test not found' });
    }

    const io = req.app.get("io");
    if (io && tenantId) {
      io.to(tenantId).emit("data_changed", { type: "lab_catalog" });
    }

    res.json(test);
  } catch (err) {
    console.error('Error updating lab test:', err);
    res.status(400).json({ error: err.message || 'Failed to update lab test' });
  }
});

// Delete a lab test
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    const test = await LabTest.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!test) {
      return res.status(404).json({ error: 'Lab test not found' });
    }

    const io = req.app.get("io");
    if (io && tenantId) {
      io.to(tenantId).emit("data_changed", { type: "lab_catalog" });
    }

    res.json({ message: 'Lab test removed successfully' });
  } catch (err) {
    console.error('Error deleting lab test:', err);
    res.status(500).json({ error: err.message || 'Failed to delete lab test' });
  }
});

// Reset / Seed default catalog
router.post('/seed-default', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'city_hospital';
    await LabTest.deleteMany({ tenantId });
    const docs = DEFAULT_LAB_TESTS.map(item => ({ ...item, tenantId }));
    const seeded = await LabTest.insertMany(docs);
    res.json({ message: 'Standard Lab Test Catalog seeded successfully', count: seeded.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
