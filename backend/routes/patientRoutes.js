const express = require('express');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(verifyToken);

// Get all patients (scoped to tenant)
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new patient (scoped to tenant)
router.post('/', async (req, res) => {
  const { name, age, gender, contact, email, address, bloodGroup, allergies, medicalHistory, avatar, otp } = req.body;
  try {
    if (!contact || contact.trim() === '') {
      return res.status(400).json({ error: "Contact/Phone number is mandatory for patient registration." });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : 'n/a';
    const cleanContact = contact.trim();

    // Check if email is already registered to another patient (case-insensitive)
    if (cleanEmail && cleanEmail !== 'n/a') {
      const existingEmailPatient = await Patient.findOne({
        tenantId: req.tenantId,
        email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (existingEmailPatient) {
        return res.status(400).json({ error: "This email address is already registered to another patient." });
      }
    }
    // Check if contact/phone number is already registered to another patient (case-insensitive)
    const existingContactPatient = await Patient.findOne({
      tenantId: req.tenantId,
      contact: { $regex: new RegExp(`^${cleanContact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existingContactPatient) {
      return res.status(400).json({ error: "This phone number is already linked to another patient account." });
    }

    if (otp) {
      try {
        const RegistrationOtp = require('../models/RegistrationOtp');
        const otpRecord = await RegistrationOtp.findOne({ email: cleanEmail, otp_code: otp });
        if (otpRecord) {
          await RegistrationOtp.deleteOne({ _id: otpRecord._id }).catch(() => {});
        }
      } catch (otpErr) {
        console.warn("OTP check warning:", otpErr);
      }
    }

    const patient = await Patient.create({
      tenantId: req.tenantId,
      name,
      age: parseInt(age) || 30,
      gender,
      contact: cleanContact,
      email: cleanEmail,
      address,
      bloodGroup,
      allergies,
      medicalHistory: Array.isArray(medicalHistory) ? medicalHistory : (medicalHistory ? [medicalHistory] : []),
      avatar
    });
    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "patients" });
    }
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get a single patient (scoped to tenant)
router.get('/:id', async (req, res) => {
  try {
    let patient = null;
    try { patient = await Patient.findOne({ _id: req.params.id, tenantId: req.tenantId }); } catch(e) {}
    if (!patient) {
      try {
        const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (user && user.role === 'patient') {
          patient = await Patient.findOne({ contact: user.staff_id, tenantId: req.tenantId });
        }
      } catch(e) {}
    }
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update patient details (profile & settings, scoped to tenant)
router.put('/:id', async (req, res) => {
  const { name, age, gender, contact, address, bloodGroup, allergies, medicalHistory, avatar } = req.body;
  try {
    let patient = null;
    try { patient = await Patient.findOne({ _id: req.params.id, tenantId: req.tenantId }); } catch(e) {}
    if (!patient) {
      try {
        const userObj = await User.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (userObj && userObj.role === 'patient') {
          patient = await Patient.findOne({ contact: userObj.staff_id, tenantId: req.tenantId });
        }
      } catch(e) {}
    }
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // SECURITY: Ensure ownership (only the user themselves or an admin may update details)
    const user = await User.findOne({ staff_id: patient.contact, tenantId: req.tenantId });
    const isOwner = (req.user.id === patient._id.toString()) || (user && req.user.id === user._id.toString());
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: Cannot edit another user\'s profile' });
    }

    // Check email uniqueness if email is provided in update
    const targetEmail = req.body.email;
    if (targetEmail && targetEmail.trim() !== '' && targetEmail.trim().toLowerCase() !== 'n/a') {
      const cleanEmail = targetEmail.toLowerCase().trim();
      const existingEmailPatient = await Patient.findOne({
        tenantId: req.tenantId,
        _id: { $ne: patient._id },
        email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (existingEmailPatient) {
        return res.status(400).json({ error: "This email address is already registered to another patient." });
      }
      patient.email = cleanEmail;
    }

    // Check contact/phone uniqueness if contact is updated
    if (contact && contact.trim() !== '' && contact.trim() !== patient.contact) {
      const cleanContact = contact.trim();
      const existingContactPatient = await Patient.findOne({
        tenantId: req.tenantId,
        _id: { $ne: patient._id },
        contact: { $regex: new RegExp(`^${cleanContact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      if (existingContactPatient) {
        return res.status(400).json({ error: "This phone number is already linked to another patient account." });
      }
      patient.contact = cleanContact;
    } else if (contact) {
      patient.contact = contact.trim();
    }

    const oldContact = patient.contact;

    // Update Patient details
    patient.name = name || patient.name;
    patient.age = parseInt(age) || patient.age;
    patient.gender = gender || patient.gender;
    patient.address = address !== undefined ? address : patient.address;
    patient.bloodGroup = bloodGroup || patient.bloodGroup;
    patient.allergies = allergies !== undefined ? allergies : patient.allergies;
    patient.medicalHistory = medicalHistory || patient.medicalHistory;
    patient.avatar = avatar !== undefined ? avatar : patient.avatar;

    await patient.save();

    // Sync with User authentication table
    if (user) {
      user.name = patient.name;
      user.staff_id = patient.contact;
      user.avatar = patient.avatar;
      user.isSetupComplete = true;
      await user.save();
    }

    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "patients" });
    }

    res.json(patient);
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update patient password (scoped to tenant)
router.put('/:id/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const bcrypt = require('bcrypt');

  try {
    let patient = null;
    try { patient = await Patient.findOne({ _id: req.params.id, tenantId: req.tenantId }); } catch(e) {}
    
    let userObj = null;
    try { userObj = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }); } catch(e) {}

    if (!patient && userObj && userObj.role === 'patient') {
      try { patient = await Patient.findOne({ contact: userObj.staff_id, tenantId: req.tenantId }); } catch(e) {}
    }

    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const user = await User.findOne({ staff_id: patient.contact, tenantId: req.tenantId }).select("+password_hash");
    if (!user) return res.status(404).json({ error: 'Authentication user not found' });

    // SECURITY: Ensure ownership (only the user themselves or an admin may update their password)
    const isOwner = (req.user.id === patient._id.toString()) || (req.user.id === user._id.toString());
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: Cannot change password for another user' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    user.password_version = (user.password_version || 0) + 1;
    await user.save();

    // Broadcast session revocation event via socket
    const io = req.app.get("io");
    if (io) {
      io.emit("session_revoked", { userId: user._id.toString(), staffId: user.staff_id });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a patient (scoped to tenant)
router.delete('/:id', async (req, res) => {
  try {
    let patient = null;
    try { patient = await Patient.findOne({ _id: req.params.id, tenantId: req.tenantId }); } catch(e) {}
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // SECURITY: Ensure only admin (or user themselves) can delete a profile
    const user = await User.findOne({ staff_id: patient.contact, tenantId: req.tenantId });
    const isOwner = (req.user.id === patient._id.toString()) || (user && req.user.id === user._id.toString());
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: Cannot delete another user\'s profile' });
    }

    await Patient.findOneAndDelete({ _id: patient._id, tenantId: req.tenantId });
    
    // Also delete corresponding User account
    await User.findOneAndDelete({ staff_id: patient.contact, tenantId: req.tenantId });
    
    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "patients" });
    }

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
