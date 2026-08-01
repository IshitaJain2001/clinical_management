const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, default: 'city_hospital', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  temperature: { type: Number },
  pulse: { type: Number },
  respiration: { type: Number },
  bpSys: { type: Number },
  bpDia: { type: Number },
  height: { type: Number },
  weight: { type: Number },
  bmi: { type: Number },
  spo2: { type: Number },
  painScore: { type: Number },
  bloodSugar: { type: Number },
  sugarType: { type: String, enum: ['Fasting', 'Post-prandial', 'Random'], default: 'Random' },
  ecgFile: { type: String, default: '' },
  isAbnormal: { type: Boolean, default: false }
}, { timestamps: true });

vitalSchema.pre('save', function (next) {
  // Auto-calculate BMI
  if (this.weight && this.height) {
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }

  // Check for abnormalities
  let abnormal = false;
  if (this.temperature && (this.temperature > 99.5 || this.temperature < 95)) abnormal = true;
  if (this.pulse && (this.pulse > 100 || this.pulse < 55)) abnormal = true;
  if (this.respiration && (this.respiration > 22 || this.respiration < 12)) abnormal = true;
  if (this.bpSys && (this.bpSys > 140 || this.bpSys < 90)) abnormal = true;
  if (this.bpDia && (this.bpDia > 90 || this.bpDia < 55)) abnormal = true;
  if (this.spo2 && this.spo2 < 95) abnormal = true;

  this.isAbnormal = abnormal;
  next();
});

vitalSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Vital', vitalSchema);
