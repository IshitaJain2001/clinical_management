import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { ShieldCheck, ArrowLeft, Upload, Camera, FileText } from 'lucide-react';

const PatientRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tempToken = location.state?.tempToken;
  const initialContact = location.state?.emailOrPhone || '';

  // EXACT SAME FIELDS AS RECEPTIONIST DASHBOARD
  const [formData, setFormData] = useState({
    name: '', 
    age: '', 
    gender: '', 
    contact: initialContact.includes('@') ? '' : initialContact, 
    email: initialContact.includes('@') ? initialContact : '', 
    bloodGroup: '', 
    address: '', 
    medicalHistory: '', 
    referredBy: '', 
    allergies: 'None', 
    currentMedications: ''
  });

  const [dpdpConsent, setDpdpConsent] = useState({ emrCreation: true, dataSharing: false });
  const [patientPhoto, setPatientPhoto] = useState(null);
  const [patientDocuments, setPatientDocuments] = useState([]);
  const [newDocType, setNewDocType] = useState('Aadhar / Voter Card');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tempToken) {
      navigate('/patient/login');
    }
  }, [tempToken, navigate]);

  const handleDocumentUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPatientDocuments(prev => [...prev, {
          title: newDocType,
          fileName: file.name,
          fileData: reader.result,
          fileType: file.type,
          category: 'Identity Proof',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Self'
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.age || !formData.gender || !formData.contact) {
      setError("Please fill in all mandatory fields (Name, Age, Gender, Mobile Number).");
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Exactly the same API payload as ReceptionistDashboard
      const payload = {
        name: formData.name,
        age: parseInt(formData.age) || 30,
        gender: formData.gender,
        contact: formData.contact,
        email: formData.email,
        bloodGroup: formData.bloodGroup || 'O+',
        address: formData.address || '',
        medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(item => item.trim()) : [],
        allergies: formData.allergies || 'None',
        currentMedications: formData.currentMedications || '',
        dpdpConsent: dpdpConsent,
        patientDocuments: patientDocuments,
        referredBy: formData.referredBy || '',
        avatar: patientPhoto || ''
      };

      // Call API using temp token for authorization
      // Wait, normal POST /patients is used by receptionist. 
      // We need to pass the token. The api interceptor will automatically attach localStorage token if it exists.
      // But we don't want to overwrite localStorage yet if we are using tempToken.
      const res = await api.post('/patients', payload, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });

      // If successful, the backend should return the new patient details.
      // Now we need to actually "login" the patient.
      // We can use the verify OTP endpoint internally or just have the backend return a permanent token on registration.
      // Wait! The easiest way is to let the user login normally after registration, OR we update the `/patients` POST route to return a token if called with `isNewPatient`.
      // Let's redirect to login for them to do a final login, or just store the returned user if we modify backend.
      
      // Since we just created the patient, let's automatically log them in via the verify-otp backend bypass or redirect to login.
      alert('Registration successful! Please log in.');
      navigate('/patient/login');
      
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px', fontFamily: 'Urbanist, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', padding: '24px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <ShieldCheck size={28} />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Complete Your Profile</h1>
          </div>
          <p style={{ margin: 0, opacity: 0.9 }}>Register as a new patient to access your portal</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          {error && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '12px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #FECACA', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Exactly the same fields as receptionist */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Full Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="John Doe" required />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Age *</label>
                <input type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="Years" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Gender *</label>
                <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', background: 'white' }} required>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Mobile Number *</label>
              <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="+91 9876543210" required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Email Address</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="john@example.com" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Blood Group</label>
              <select value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', background: 'white' }}>
                <option value="">Unknown</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Complete Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="House/Flat No, Street, City" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Allergies (if any)</label>
              <input type="text" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="E.g. Penicillin, Peanuts (or 'None')" />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Current Medications</label>
              <input type="text" value={formData.currentMedications} onChange={e => setFormData({...formData, currentMedications: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="List any ongoing medications..." />
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#334155', fontSize: '14px' }}>Medical History (Comma separated)</label>
              <input type="text" value={formData.medicalHistory} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #CBD5E1', borderRadius: '6px' }} placeholder="E.g. Diabetes, Hypertension..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
            {/* Photo Upload */}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>Profile Photo</h4>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {patientPhoto ? <img src={patientPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera color="#94A3B8" />}
                </div>
                <div>
                  <input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/*" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPatientPhoto(reader.result);
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                  <button type="button" onClick={() => document.getElementById('patientPhotoUpload').click()} style={{ background: 'white', border: '1px solid #CBD5E1', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Upload Photo
                  </button>
                </div>
              </div>
            </div>

            {/* DPDP Consent */}
            <div style={{ flex: 1, background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B' }}>DPDP Act 2023 Consent</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', marginBottom: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} />
                Consent for creating EMR & receiving transaction alerts
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} />
                Consent for clinical research & data sharing (Anonymized)
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', background: '#2563EB', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Registering...' : 'Register Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PatientRegistration;
