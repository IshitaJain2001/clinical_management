import React, { useState } from 'react';
import api from '../utils/api';

export default function PrescriptionMakerTab({
  selectedPatient,
  activeAppointment,
  pastPrescriptions = [],
  appointments = [],
  allLabs = [],
  vitals,
  soap,
  setSoap,
  medicines,
  setMedicines,
  addMedicineRow,
  removeMedicineRow,
  updateMedicineRow,
  diagnosisText,
  setDiagnosisText,
  sendToPharmacy,
  setSendToPharmacy,
  handleLockPrescription,
  setShowTimelineModal,
  labs = [],
  setLabs,
  addLog,
  user,
  isSavingPrescription = false,
  dbMedicines = [],
  pharmacyInventoryDb = [],
  medicineDefaults = {},
  consentGiven = true,
  emergencyBypassActive = false,
  setShowBreakGlassModal,
  toggleEmergencyBypass,
  printSettings = { template: 'standard', topSpacer: 38, bottomSpacer: 28, fontSize: 100, digitalPreset: 'none' },
  setPrintSettings = () => {},
  adminTemplates = []
}) {
  // Sidebar drawer visibility and width states
  const [showAssignLabDrawer, setShowAssignLabDrawer] = useState(false);
  const [labDrawerWidth, setLabDrawerWidth] = useState(480);
  const [showMedicationDrawer, setShowMedicationDrawer] = useState(false);
  const [medicationDrawerWidth, setMedicationDrawerWidth] = useState(480);

  const [localMedicines, setLocalMedicines] = useState([]);

  // Drawer form states for adding a medicine
  const [drawerMedName, setDrawerMedName] = useState('');
  const [drawerMedDose, setDrawerMedDose] = useState('');
  const [drawerMedFreq, setDrawerMedFreq] = useState('Once a Day');
  const [drawerMedDuration, setDrawerMedDuration] = useState('5 Days');
  const [drawerMedTiming, setDrawerMedTiming] = useState('After Food');
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [showMedSuggestions, setShowMedSuggestions] = useState(false);

  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00 AM');
  const [activeMedFocus, setActiveMedFocus] = useState(null);
  const [isHoveringSuggestions, setIsHoveringSuggestions] = useState(false);
  const [showLayoutPopover, setShowLayoutPopover] = useState(false);

  const [noteTemplates, setNoteTemplates] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('curoxa_rx_note_templates')) || [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('curoxa_rx_note_templates', JSON.stringify(noteTemplates));
  }, [noteTemplates]);

  const startResizingLabDrawer = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    const startWidth = labDrawerWidth;
    const startX = mouseDownEvent.clientX;

    const doDrag = (mouseMoveEvent) => {
      const deltaX = startX - mouseMoveEvent.clientX;
      const newWidth = Math.max(380, Math.min(window.innerWidth - 100, startWidth + deltaX));
      setLabDrawerWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const startResizingMedicationDrawer = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    const startWidth = medicationDrawerWidth;
    const startX = mouseDownEvent.clientX;

    const doDrag = (mouseMoveEvent) => {
      const deltaX = startX - mouseMoveEvent.clientX;
      const newWidth = Math.max(380, Math.min(window.innerWidth - 100, startWidth + deltaX));
      setMedicationDrawerWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  // Body scroll lock effect
  React.useEffect(() => {
    if (showAssignLabDrawer || showMedicationDrawer) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showAssignLabDrawer, showMedicationDrawer]);

  // Dynamic Lucide Icons re-renderer inside Prescription Maker
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 50);
    return () => clearTimeout(timer);
  });
  
  // Drawer clinical state fields
  const [selectedLabsList, setSelectedLabsList] = useState([]); // empty — no pre-seeded fake tests
  const [searchQuery, setSearchQuery] = useState('');
  const [labPriority, setLabPriority] = useState('Routine');
  const [labInstructions, setLabInstructions] = useState('Patient fasting required');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [labToast, setLabToast] = useState(null); // { type: 'success'|'error', message: string }
  const [labSending, setLabSending] = useState(false);

  // Available EMR diagnostic lab tests
  const availableTests = [
    'CBC', 'Vitamin D', 'HbA1c', 'LFT', 'KFT', 'Lipid Profile', 'TSH', 
    'Thyroid Panel', 'Urine Routine', 'Vitamin B12', 'Fasting Blood Sugar',
    'Post Prandial Blood Sugar', 'Serum Calcium', 'Iron Studies', 'X-Ray Chest'
  ];

  const handleAddLab = (testName) => {
    if (testName && !selectedLabsList.includes(testName)) {
      setSelectedLabsList([...selectedLabsList, testName]);
      addLog(`Added Lab test tag: ${testName}`);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleRemoveLab = (testName) => {
    setSelectedLabsList(selectedLabsList.filter(item => item !== testName));
    addLog(`Removed Lab test tag: ${testName}`);
  };

  const handleAssignAndSend = async () => {
    if (selectedLabsList.length === 0) {
      setLabToast({ type: 'error', message: 'Please select at least one laboratory test.' });
      setTimeout(() => setLabToast(null), 4000);
      return;
    }
    if (!selectedPatient?._id) {
      setLabToast({ type: 'error', message: 'No patient selected. Please select a patient first.' });
      setTimeout(() => setLabToast(null), 4000);
      return;
    }

    setLabSending(true);
    try {
      // Update parent EMR state so lock-prescription also captures these
      setLabs(selectedLabsList);
      addLog(`Lab orders assigned to prescription: ${selectedLabsList.join(', ')} | Priority: ${labPriority}`);

      setShowAssignLabDrawer(false);
      setLabToast({ type: 'success', message: `${selectedLabsList.length} lab test${selectedLabsList.length > 1 ? 's' : ''} assigned to prescription.` });
      setTimeout(() => setLabToast(null), 5000);
    } catch (err) {
      console.error('Lab order failed:', err);
      const detail = err.message || 'Unknown error';
      setLabToast({ type: 'error', message: `Failed to assign lab orders: ${detail}` });
      setTimeout(() => setLabToast(null), 6000);
    } finally {
      setLabSending(false);
    }
  };

  const latestCompletedPrescription = pastPrescriptions && pastPrescriptions.length > 0 
    ? [...pastPrescriptions]
        .filter(p => {
          const ptId = (p.patientId && typeof p.patientId === 'object') ? p.patientId._id : p.patientId;
          return ptId && ptId.toString() === selectedPatient?._id?.toString();
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  const prevAppt = latestCompletedPrescription && latestCompletedPrescription.appointmentId
    ? appointments.find(a => a._id.toString() === latestCompletedPrescription.appointmentId.toString() || a._id === latestCompletedPrescription.appointmentId)
    : null;
  const prevLabs = latestCompletedPrescription && latestCompletedPrescription.appointmentId
    ? allLabs.filter(l => l.appointmentId && (l.appointmentId.toString() === latestCompletedPrescription.appointmentId.toString() || l.appointmentId === latestCompletedPrescription.appointmentId))
    : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px', padding: '12px', background: '#F8FAFC', minHeight: 'calc(100vh - 100px)' }} className="mobile-stack">

      {/* In-UI Toast Notification — replaces native alert() */}
      {labToast && (
        <div style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          zIndex: 99999,
          background: labToast.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1.5px solid ${labToast.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
          borderLeft: `5px solid ${labToast.type === 'success' ? '#16A34A' : '#EF4444'}`,
          borderRadius: '12px',
          padding: '16px 22px',
          maxWidth: '380px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          animation: 'slideInToast 0.3s ease-out'
        }}>
          <i
            data-lucide={labToast.type === 'success' ? 'check-circle-2' : 'x-circle'}
            style={{ width: '20px', height: '20px', color: labToast.type === 'success' ? '#16A34A' : '#EF4444', flexShrink: 0, marginTop: '1px' }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: labToast.type === 'success' ? '#15803D' : '#B91C1C', marginBottom: '2px' }}>
              {labToast.type === 'success' ? 'Lab Orders Sent' : 'Error'}
            </div>
            <div style={{ fontSize: '12px', color: '#374151', fontWeight: 600, lineHeight: '1.5' }}>{labToast.message}</div>
          </div>
        </div>
      )}
      
      {/* Left Column (Patient Context) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Patient Profile Card */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', background: '#ffffff', boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#2563EB' }}>
                {(selectedPatient?.name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>{selectedPatient?.name || '—'}</h3>
                {selectedPatient?.gender && (
                  <span style={{ color: selectedPatient.gender === 'Female' ? '#EC4899' : '#2563EB', fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedPatient.gender === 'Female' ? '♀' : '♂'}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                {selectedPatient?.age ? `${selectedPatient.age} Y` : ''}{selectedPatient?.gender ? `, ${selectedPatient.gender}` : ''}{selectedPatient?.contact ? ` | ${selectedPatient.contact}` : ''}
              </p>
              {(selectedPatient?.uhid || selectedPatient?._id) && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
                  ID: {selectedPatient?.uhid || selectedPatient?._id}
                </p>
              )}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '12px 0' }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>CONSULTATION DETAILS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Date & Time</span>
                <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 750 }}>
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Visit Type</span>
                <span style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: '11px', fontWeight: 900, padding: '4px 8px', borderRadius: '6px' }}>
                  {selectedPatient?.visitType || 'OPD'}
                </span>
              </div>
              {selectedPatient?.bloodGroup && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Blood Group</span>
                  <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 800 }}>{selectedPatient.bloodGroup}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Symptoms Card — editable via SOAP subjective */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', background: '#ffffff', boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#C2410C', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i data-lucide="thermometer" style={{ width: '16px', height: '16px', color: '#C2410C' }}></i> Symptoms
          </h4>
          {soap.subjective && soap.subjective.trim() !== '' ? (
            <ul style={{ paddingLeft: '8px', margin: 0, color: '#334155', fontSize: '14px', lineHeight: 1.6, fontWeight: 600, listStyle: 'none' }}>
              {soap.subjective.split('\n').filter(l => l.trim()).map((line, i) => (
                <li key={i} style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#C2410C', fontSize: '8px', marginTop: '7px', flexShrink: 0 }}>●</span>
                  <span>{line.trim()}</span>
                </li>
              ))}
            </ul>
          ) : activeAppointment?.reason ? (
            <ul style={{ paddingLeft: '8px', margin: 0, color: '#334155', fontSize: '14px', lineHeight: 1.6, fontWeight: 600, listStyle: 'none' }}>
              <li style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#C2410C', fontSize: '8px', marginTop: '7px', flexShrink: 0 }}>●</span>
                <span>{activeAppointment.reason}</span>
              </li>
            </ul>
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', fontStyle: 'italic' }}>No symptoms recorded — type in the SOAP Subjective field</span>
          )}
        </div>

        {/* Vitals Card */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', background: '#ffffff', boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i data-lucide="activity" style={{ width: '16px', height: '16px', color: '#059669' }}></i> Vitals
          </h4>
          {(vitals.bpSys || vitals.bpDia || vitals.pulse || vitals.temp || vitals.weight || vitals.height || vitals.spo2 || vitals.sugar || vitals.resp) ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              {(vitals.bpSys || vitals.bpDia) && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>BP</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.bpSys || '--'}/{vitals.bpDia || '--'} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>mmHg</span>
                  </div>
                </div>
              )}
              {vitals.pulse && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Pulse</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.pulse} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>bpm</span>
                  </div>
                </div>
              )}
              {vitals.temp && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Temperature</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.temp} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>°F</span>
                  </div>
                </div>
              )}
              {vitals.weight && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Weight</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.weight} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>kg</span>
                  </div>
                </div>
              )}
              {vitals.height && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Height</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.height} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>cm</span>
                  </div>
                </div>
              )}
              {vitals.spo2 && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>SpO2</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.spo2} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>%</span>
                  </div>
                </div>
              )}
              {vitals.sugar && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Blood Sugar</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.sugar} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>mg/dL</span>
                  </div>
                </div>
              )}
              {vitals.resp && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Respiration</span>
                  <div style={{ fontSize: '15px', color: '#1E293B', fontWeight: 800, marginTop: '2px' }}>
                    {vitals.resp} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>/min</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', fontStyle: 'italic' }}>No vitals recorded yet</span>
          )}
        </div>

        {/* Allergies Card */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', background: '#ffffff', boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <i data-lucide="alert-circle" style={{ width: '16px', height: '16px', color: '#DC2626' }}></i> Allergies
          </h4>
          {selectedPatient?.allergies && selectedPatient.allergies.trim() !== '' ? (
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>{selectedPatient.allergies}</span>
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#16A34A' }}>No known allergies</span>
          )}
        </div>

        {/* Current Medications Card */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', background: '#ffffff', boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <i data-lucide="pill" style={{ width: '16px', height: '16px', color: '#D97706' }}></i> Current Medications
          </h4>
          {selectedPatient?.currentMedications && selectedPatient.currentMedications.trim() !== '' ? (
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{selectedPatient.currentMedications}</span>
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', fontStyle: 'italic' }}>No current medications on file</span>
          )}
        </div>

        {/* Previous Visit Card */}
        {latestCompletedPrescription && (
          <div style={{ border: '1.5px solid #BBF7D0', borderRadius: '16px', padding: '16px', background: '#F0FDF4', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <i data-lucide="history" style={{ width: '16px', height: '16px', color: '#16A34A' }}></i> Previous Visit
            </h4>
            
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
              DATE: {new Date(latestCompletedPrescription.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>

            {prevAppt?.diagnosis && (
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, display: 'block' }}>Diagnosis</span>
                <span style={{ fontSize: '13px', color: '#1E293B', fontWeight: 750 }}>{prevAppt.diagnosis}</span>
              </div>
            )}

            {latestCompletedPrescription.items && latestCompletedPrescription.items.length > 0 && (
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, display: 'block' }}>Active Meds ({latestCompletedPrescription.items.length})</span>
                <div style={{ maxHeight: '80px', overflowY: 'auto', paddingRight: '4px', marginTop: '4px' }}>
                  {latestCompletedPrescription.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: '#334155', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>💊 {item.medicine}</span>
                      <span style={{ color: '#64748B', fontSize: '11px' }}>{item.dosage}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prevLabs && prevLabs.length > 0 && (
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 650, display: 'block' }}>Assigned Labs</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {prevLabs.map((l, idx) => (
                    <span key={idx} style={{ fontSize: '10px', background: '#E0F2FE', color: '#0369A1', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                      🧪 {l.testName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                // Set notes/SOAP
                setSoap(prev => ({
                  ...prev,
                  subjective: latestCompletedPrescription.soapSubjective || latestCompletedPrescription.notes || prev.subjective || '',
                  objective: latestCompletedPrescription.soapObjective || prev.objective || '',
                  assessment: latestCompletedPrescription.soapAssessment || prev.assessment || '',
                  plan: latestCompletedPrescription.soapPlan || prev.plan || ''
                }));
                // Set medicines
                if (latestCompletedPrescription.items && latestCompletedPrescription.items.length > 0) {
                  setMedicines(latestCompletedPrescription.items.map(item => ({
                    medicine: item.medicine,
                    dosage: item.dosage,
                    instructions: item.instructions,
                    duration: item.duration
                  })));
                }
                setLabToast({ type: 'success', message: 'Previous prescription template loaded!' });
                setTimeout(() => setLabToast(null), 3000);
              }}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 12px',
                background: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                transition: '0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#059669'}
              onMouseLeave={e => e.currentTarget.style.background = '#10B981'}
            >
              <i data-lucide="copy" style={{ width: '13px', height: '13px' }}></i> Load as Template
            </button>
          </div>
        )}

      </div>

      {/* Right Column (Prescription Sheet or Consent Lock Screen) */}
      {!consentGiven && !emergencyBypassActive ? (
        <div style={{
          border: '1.5px solid #FCA5A5',
          borderRadius: '16px',
          padding: '40px 24px',
          background: '#FFF5F5',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '450px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.1)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#991B1B', marginBottom: '12px', fontFamily: "'Outfit', sans-serif" }}>
            EMR Record Lock (DPDP Act 2023)
          </h3>
          <p style={{ color: '#7F1D1D', fontWeight: 600, fontSize: '14px', maxWidth: '440px', lineHeight: '1.6', marginBottom: '32px' }}>
            This patient has restricted EMR processing consent or withdrawn their treatment consent registry. You cannot view or modify clinical records under normal workflow.
          </p>
          
          <button
            onClick={() => setShowBreakGlassModal(true)}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '15px',
              padding: '14px 28px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#B91C1C'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#DC2626'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 2 22 22 22"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Execute Break-Glass Protocol
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Emergency Bypass Warning Banner */}
          {emergencyBypassActive && (
            <div style={{
              background: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'slideUp 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="animate-pulse" style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
                  🚨 BREAK-GLASS EMERGENCY OVERRIDE SESSION ACTIVE
                </span>
              </div>
              <button
                onClick={() => {
                  toggleEmergencyBypass(false);
                }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #FCA5A5',
                  color: '#EF4444',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Deactivate
              </button>
            </div>
          )}
        
        {/* Main Prescription Card */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', background: '#ffffff', boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i data-lucide="file-text" style={{ width: '20px', height: '20px', color: '#1E293B' }}></i> Prescription
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Custom Live Template Popover Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowLayoutPopover(!showLayoutPopover)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 800, color: '#800020', transition: 'all 0.2s ease', outline: 'none'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Print Layout:</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {(() => {
                      const selectedTpl = adminTemplates.find(t => t._id === printSettings.template) || adminTemplates.find(t => t.isStandard) || adminTemplates[0];
                      return selectedTpl ? `📋 ${selectedTpl.name}` : '📋 Default Template';
                    })()}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748B' }}>▼</span>
                </button>

                {showLayoutPopover && (
                  <>
                    {/* Click-outside backdrop to close popover */}
                    <div 
                      onClick={() => setShowLayoutPopover(false)} 
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '340px', background: '#FFFFFF', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', padding: '12px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
                        Select Print Template Design
                      </div>
                      
                      {adminTemplates && adminTemplates.length > 0 ? (
                        adminTemplates.map(tpl => {
                          const isSelected = printSettings.template === tpl._id || (printSettings.template === 'standard' && tpl.isStandard);
                          return (
                            <div 
                              key={tpl._id}
                              onClick={() => {
                                setPrintSettings(prev => ({ ...prev, template: tpl._id }));
                                setShowLayoutPopover(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px',
                                borderRadius: '12px',
                                border: isSelected ? '2px solid #800020' : '1px solid #E2E8F0',
                                background: isSelected ? '#FFF5F6' : '#FFFFFF',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: isSelected ? '#FCE7F3' : '#F1F5F9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: isSelected ? '1px solid #FDA4AF' : '1px solid #E2E8F0',
                                flexShrink: 0
                              }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#800020' : '#64748B'} strokeWidth="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 850, fontSize: '12px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</span>
                                  {tpl.isStandard && (
                                    <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: '8px', fontWeight: 800, padding: '0.5px 3.5px', borderRadius: '3px', flexShrink: 0 }}>Std</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '9.5px', color: '#64748B', marginTop: '1px', fontWeight: 500 }}>
                                  L:{tpl.xLeft} | R:{tpl.xRight} | T:{tpl.yTop} | B:{tpl.yBottom} (mm)
                                </div>
                              </div>
                              {isSelected && (
                                <span style={{ color: '#800020', fontWeight: 900, fontSize: '11px' }}>✓</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                          No templates configured. Default layout active.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => {
                    setDrawerMedName('');
                    setDrawerMedDose('');
                    setDrawerMedFreq('Once a Day');
                    setDrawerMedDuration('5 Days');
                    setDrawerMedTiming('After Food');
                    setMedSearchQuery('');
                    setShowMedicationDrawer(true);
                  }}
                  style={{ border: '1px solid #D1FAE5', background: '#ECFDF5', color: '#059669', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#D1FAE5'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ECFDF5'}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>+</span> Add Medication
                </button>

                <button 
                  onClick={() => setShowAssignLabDrawer(true)}
                  style={{ border: '1px solid #DBEAFE', background: '#EFF6FF', color: '#2563EB', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
                  onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>+</span> Assign Lab test
                </button>
              </div>
            </div>
          </div>

          {/* Diagnosis Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#D97706', letterSpacing: '0.05em', marginBottom: '8px' }}>DIAGNOSIS (REQUIRED)</label>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', background: '#F8FAFC' }}>
              {/* Render typed diagnosis as bullet points */}
              {diagnosisText && diagnosisText.trim() !== '' && (
                <ul style={{ paddingLeft: '8px', margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B', fontWeight: 650, lineHeight: 1.6, listStyle: 'none' }}>
                  {diagnosisText.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                    <li key={i} style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#D97706', fontSize: '8px', marginTop: '6px', flexShrink: 0 }}>●</span>
                      <span>{line.trim()}</span>
                    </li>
                  ))}
                </ul>
              )}
              <textarea 
                data-lenis-prevent
                value={diagnosisText}
                onChange={e => {
                  setDiagnosisText(e.target.value);
                  setSoap(prev => ({ ...prev, assessment: e.target.value }));
                }}
                placeholder="Enter Patient Diagnosis (each line becomes a bullet point)..." 
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', color: '#475569', resize: 'none', minHeight: '60px', fontWeight: 500, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {/* Medications Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '12px' }}>MEDICATIONS</label>
            
            {medicines && medicines.filter(m => m.name && m.name.trim() !== '').length > 0 ? (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflowX: activeMedFocus ? 'visible' : 'auto', minHeight: activeMedFocus ? '320px' : 'auto' }}>
                <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '30px' }}>#</th>
                      <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', minWidth: '150px' }}>MEDICINE</th>
                      <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '90px' }}>DOSAGE</th>
                      <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '120px' }}>FREQUENCY</th>
                      <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '80px' }}>DURATION</th>
                      <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '120px' }}>INSTRUCTIONS</th>
                      <th style={{ padding: '10px 8px', width: '30px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.filter(m => m.name && m.name.trim() !== '').map((med, idx) => {
                      const filteredList = medicines.filter(m => m.name && m.name.trim() !== '');
                      return (
                        <tr key={med.id || idx} style={{ borderBottom: idx === filteredList.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                          <td style={{ padding: '8px 6px', fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 6px', position: 'relative', zIndex: activeMedFocus === med.id ? 99 : 1 }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                value={med.name} 
                                onChange={e => {
                                  const val = e.target.value;
                                  updateMedicineRow(med.id, 'name', val);
                                  // Auto-fill from defaults on exact match
                                  const matchKey = Object.keys(medicineDefaults).find(k => k.toLowerCase() === val.toLowerCase().trim());
                                  if (matchKey) {
                                    const def = medicineDefaults[matchKey];
                                    setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, dose: def.dose || m.dose, freq: def.freq || m.freq, duration: def.duration || m.duration, timing: def.timing || m.timing } : m));
                                  }
                                }}
                                onFocus={() => setActiveMedFocus(med.id)}
                                onBlur={() => {
                                  setTimeout(() => {
                                    if (!isHoveringSuggestions) {
                                      setActiveMedFocus(null);
                                    }
                                  }, 150);
                                }}
                                placeholder="Type medicine name..." 
                                style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13.5px', fontWeight: 705, color: '#1E293B', outline: 'none', background: '#ffffff', boxSizing: 'border-box' }} 
                              />
                              {med.name && (
                                <span 
                                  onClick={() => updateMedicineRow(med.id, 'name', '')}
                                  style={{ position: 'absolute', right: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#94A3B8' }}
                                >
                                  ×
                                </span>
                              )}
                            </div>
                            {/* Medicine Autocomplete Dropdown */}
                            {activeMedFocus === med.id && (() => {
                              const typedVal = (med.name || '').trim().toLowerCase();
                              const allNames = Array.from(new Set([
                                ...dbMedicines.map(m => m.name),
                                ...Object.keys(medicineDefaults).map(k => k.charAt(0).toUpperCase() + k.slice(1))
                              ]));
                              const filtered = typedVal 
                                ? allNames.filter(n => n.toLowerCase().includes(typedVal) && n.toLowerCase() !== typedVal).slice(0, 8)
                                : allNames.slice(0, 8);
                              if (filtered.length === 0) return null;
                              return (
                                <div 
                                  data-lenis-prevent
                                  onMouseEnter={() => setIsHoveringSuggestions(true)}
                                  onMouseLeave={() => setIsHoveringSuggestions(false)}
                                  style={{ 
                                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, 
                                    width: '360px', maxWidth: '90vw', zIndex: 1200, padding: '6px',
                                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)', 
                                    background: 'white', borderRadius: '14px', 
                                    border: '1px solid #E2E8F0',
                                    maxHeight: '240px', overflowY: 'auto',
                                    overscrollBehavior: 'contain'
                                  }}
                                >
                                  <div style={{ padding: '6px 10px 8px', fontSize: '10px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>
                                    PHARMACY INVENTORY — {filtered.length} MATCH{filtered.length !== 1 ? 'ES' : ''}
                                  </div>
                                  {filtered.map((mName, sIdx) => {
                                    const dbMatch = dbMedicines.find(m => m.name.toLowerCase() === mName.toLowerCase());
                                    const stockStatus = dbMatch?.status || null;
                                    const stockColor = stockStatus === 'In Stock' ? '#16A34A' : stockStatus === 'Low Stock' ? '#D97706' : stockStatus === 'Out of Stock' ? '#DC2626' : '#64748B';
                                    const stockBg = stockStatus === 'In Stock' ? '#F0FDF4' : stockStatus === 'Low Stock' ? '#FFFBEB' : stockStatus === 'Out of Stock' ? '#FEF2F2' : '#F8FAFC';
                                    
                                    // Smart preset lookup (longest key first)
                                    const matchedDefaultKey = Object.keys(medicineDefaults)
                                      .sort((a, b) => b.length - a.length)
                                      .find(k => mName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(mName.toLowerCase()));
                                    const hasPreset = !!matchedDefaultKey;

                                    const selectSuggestion = (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('[DEBUG Autocomplete] Selecting suggestion:', mName, 'for row ID:', med.id);
                                      if (matchedDefaultKey) {
                                        const def = medicineDefaults[matchedDefaultKey];
                                        setMedicines(prev => prev.map(m => m.id === med.id ? { 
                                          ...m, 
                                          name: mName, 
                                          dose: def.dose || m.dose, 
                                          freq: def.freq || m.freq, 
                                          duration: def.duration || m.duration, 
                                          timing: def.timing || m.timing 
                                        } : m));
                                      } else {
                                        updateMedicineRow(med.id, 'name', mName);
                                      }
                                      setActiveMedFocus(null);
                                      setIsHoveringSuggestions(false);
                                    };

                                    return (
                                      <div 
                                        key={sIdx} 
                                        onMouseDown={selectSuggestion}
                                        onClick={selectSuggestion}
                                        style={{ 
                                          padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', 
                                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                          fontSize: '13px', gap: '8px', transition: 'all 0.15s ease', background: 'transparent'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, pointerEvents: 'none' }}>
                                          <i data-lucide="pill" style={{ width: '14px', height: '14px', color: '#64748B', flexShrink: 0 }}></i>
                                          <span style={{ fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mName}</span>
                                          {dbMatch?.category && (
                                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{dbMatch.category}</span>
                                          )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, pointerEvents: 'none' }}>
                                          {hasPreset && (
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #BFDBFE', whiteSpace: 'nowrap' }}>AUTO-FILL</span>
                                          )}
                                          {stockStatus && (
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: stockColor, background: stockBg, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${stockColor}22`, whiteSpace: 'nowrap' }}>
                                              {dbMatch?.stock !== undefined ? `${dbMatch.stock} ${dbMatch.unit || 'pcs'}` : stockStatus}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <select 
                              value={med.dose} 
                              onChange={e => updateMedicineRow(med.id, 'dose', e.target.value)} 
                              style={{ 
                                width: '100%', 
                                padding: '8px 24px 8px 8px', 
                                borderRadius: '8px', 
                                border: '1px solid #E2E8F0', 
                                fontSize: '13.5px', 
                                fontWeight: 600, 
                                color: '#1E293B', 
                                outline: 'none', 
                                background: '#ffffff', 
                                boxSizing: 'border-box', 
                                cursor: 'pointer',
                                appearance: 'none',
                                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                backgroundSize: '14px'
                              }}
                            >
                              <option value="500 mg">500 mg</option>
                              <option value="250 mg">250 mg</option>
                              <option value="625 mg">625 mg</option>
                              <option value="100 mg">100 mg</option>
                              <option value="50 mg">50 mg</option>
                              <option value="10 mg">10 mg</option>
                              <option value="5 mg">5 mg</option>
                              <option value="1 Tab">1 Tab</option>
                              <option value="2 Tabs">2 Tabs</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <select 
                              value={med.freq} 
                              onChange={e => updateMedicineRow(med.id, 'freq', e.target.value)} 
                              style={{ 
                                width: '100%', 
                                padding: '8px 24px 8px 8px', 
                                borderRadius: '8px', 
                                border: '1px solid #E2E8F0', 
                                fontSize: '13.5px', 
                                fontWeight: 600, 
                                color: '#1E293B', 
                                outline: 'none', 
                                background: '#ffffff', 
                                boxSizing: 'border-box', 
                                cursor: 'pointer',
                                appearance: 'none',
                                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                backgroundSize: '14px'
                              }}
                            >
                              <option value="Twice a Day">Twice a Day</option>
                              <option value="Once a Day">Once a Day</option>
                              <option value="Thrice a Day">Thrice a Day</option>
                              <option value="Four Times a Day">Four Times a Day</option>
                              <option value="1 Tab TDS">1 Tab TDS</option>
                              <option value="1 Tab BD">1 Tab BD</option>
                              <option value="1 Tab OD">1 Tab OD</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <select 
                              value={med.duration} 
                              onChange={e => updateMedicineRow(med.id, 'duration', e.target.value)} 
                              style={{ 
                                width: '100%', 
                                padding: '8px 24px 8px 8px', 
                                borderRadius: '8px', 
                                border: '1px solid #E2E8F0', 
                                fontSize: '13.5px', 
                                fontWeight: 600, 
                                color: '#1E293B', 
                                outline: 'none', 
                                background: '#ffffff', 
                                boxSizing: 'border-box', 
                                cursor: 'pointer',
                                appearance: 'none',
                                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                backgroundSize: '14px'
                              }}
                            >
                              <option value="5 Days">5 Days</option>
                              <option value="3 Days">3 Days</option>
                              <option value="7 Days">7 Days</option>
                              <option value="10 Days">10 Days</option>
                              <option value="14 Days">14 Days</option>
                              <option value="30 Days">30 Days</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <select 
                              value={med.timing} 
                              onChange={e => updateMedicineRow(med.id, 'timing', e.target.value)} 
                              style={{ 
                                width: '100%', 
                                padding: '8px 24px 8px 8px', 
                                borderRadius: '8px', 
                                border: '1px solid #E2E8F0', 
                                fontSize: '13.5px', 
                                fontWeight: 600, 
                                color: '#1E293B', 
                                outline: 'none', 
                                background: '#ffffff', 
                                boxSizing: 'border-box', 
                                cursor: 'pointer',
                                appearance: 'none',
                                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                backgroundSize: '14px'
                              }}
                            >
                              <option value="After Food">After Food</option>
                              <option value="Before Food">Before Food</option>
                              <option value="With Food">With Food</option>
                              <option value="Empty Stomach">Empty Stomach</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <button 
                              onClick={() => removeMedicineRow(med.id)} 
                              style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <i data-lucide="trash-2" style={{ width: '15px', height: '15px', color: '#EF4444' }}></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    
                    <tr>
                      <td colSpan="7" style={{ padding: '16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                        <button 
                          onClick={() => {
                            setDrawerMedName('');
                            setDrawerMedDose('');
                            setDrawerMedFreq('Once a Day');
                            setDrawerMedDuration('5 Days');
                            setDrawerMedTiming('After Food');
                            setMedSearchQuery('');
                            setShowMedicationDrawer(true);
                          }} 
                          style={{ border: 'none', background: 'none', color: '#2563EB', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0 }}
                        >
                          <span style={{ fontSize: '16px', color: '#2563EB', fontWeight: 'bold', marginRight: '4px' }}>+</span> Add Medicine
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1.5px dashed #E2E8F0' }}>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>No medications added yet.</p>
                <p style={{ margin: '4px 0 16px 0', fontSize: '11px', color: '#94A3B8' }}>Please prescribe medications from the sidebar drawer.</p>
                <button 
                  onClick={() => {
                    setDrawerMedName('');
                    setDrawerMedDose('');
                    setDrawerMedFreq('Once a Day');
                    setDrawerMedDuration('5 Days');
                    setDrawerMedTiming('After Food');
                    setMedSearchQuery('');
                    setShowMedicationDrawer(true);
                  }}
                  style={{ border: 'none', background: '#10B981', color: 'white', fontSize: '13px', fontWeight: 700, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>+</span> Add Medication
                </button>
              </div>
            )}
          </div>

          {/* Lab Tests Section */}
          {labs && labs.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#2563EB', letterSpacing: '0.05em', marginBottom: '12px' }}>ASSIGNED LAB TESTS</label>
              
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>TEST NAME</th>
                      <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labs.map((testName, idx) => (
                      <tr key={idx} style={{ borderBottom: idx === labs.length - 1 ? 'none' : '1px solid #E2E8F0' }}>
                        <td style={{ padding: '10px 12px', fontSize: '13.5px', fontWeight: 700, color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>{testName}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => {
                              const updated = labs.filter((_, i) => i !== idx);
                              setLabs(updated);
                              setSelectedLabsList(updated);
                            }} 
                            style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <i data-lucide="trash-2" style={{ width: '15px', height: '15px', color: '#EF4444' }}></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes for Patient */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', margin: 0 }}>NOTES FOR PATIENT</label>
            </div>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', background: '#F8FAFC' }}>
              {/* Render typed notes as bullet points */}
              {soap.plan && soap.plan.trim() !== '' && (
                <ul style={{ paddingLeft: '8px', margin: '0 0 16px 0', fontSize: '14px', color: '#1E293B', fontWeight: 600, lineHeight: 1.8, listStyle: 'none' }}>
                  {soap.plan.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                    <li key={i} style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#2563EB', fontSize: '8px', marginTop: '7px', flexShrink: 0 }}>●</span>
                      <span>{line.trim()}</span>
                    </li>
                  ))}
                </ul>
              )}
              <textarea 
                data-lenis-prevent
                value={soap.plan}
                onChange={e => setSoap(prev => ({ ...prev, plan: e.target.value }))}
                placeholder="Type patient instructions here (each line becomes a bullet point)..." 
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', color: '#475569', resize: 'none', minHeight: '70px', fontWeight: 500, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Follow-Up Section */}
          <div style={{ marginTop: '24px' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: followUpEnabled ? '16px' : '0' }}
              onClick={() => setFollowUpEnabled(!followUpEnabled)}
            >
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px',
                border: followUpEnabled ? '2px solid #2563EB' : '2px solid #CBD5E1',
                background: followUpEnabled ? '#2563EB' : '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease', flexShrink: 0
              }}>
                {followUpEnabled && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Schedule Follow-Up Appointment</span>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748B', marginTop: '1px' }}>Tick to appoint a follow-up visit if necessary</span>
              </div>
            </div>

            {followUpEnabled && (
              <div style={{ display: 'flex', gap: '24px', animation: 'slideUp 0.25s ease-out' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '8px' }}>FOLLOW-UP DATE</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="date" 
                      value={followUpDate}
                      min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}
                      onChange={e => setFollowUpDate(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '14px', fontWeight: 600, color: '#1E293B', outline: 'none', background: '#ffffff', boxSizing: 'border-box' }} 
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: '8px' }}>FOLLOW-UP TIME</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select 
                      value={followUpTime}
                      onChange={e => setFollowUpTime(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '14px', fontWeight: 600, color: '#1E293B', outline: 'none', background: '#ffffff', boxSizing: 'border-box', cursor: 'pointer', appearance: 'none', paddingRight: '40px' }} 
                    >
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="01:00 PM">01:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                    </select>
                    <div style={{ position: 'absolute', right: '16px', pointerEvents: 'none', display: 'flex', alignItems: 'center', color: '#64748B' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Action Footer */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', background: '#ffffff', boxShadow: '0 1.5px 4px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="checkbox" 
              id="sendPharmacyCheck" 
              checked={sendToPharmacy} 
              onChange={e => setSendToPharmacy(e.target.checked)} 
              style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }} 
            />
            <div>
              <label htmlFor="sendPharmacyCheck" style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B', cursor: 'pointer' }}>Send prescription to pharmacy</label>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Curoxa Pharmacy, Main Branch</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => {
                setDiagnosisText('');
                setMedicines([]);
              }}
              style={{ border: 'none', background: 'none', color: '#64748B', fontSize: '14px', fontWeight: 700, cursor: 'pointer', padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button 
              onClick={handleLockPrescription}
              disabled={isSavingPrescription}
              style={{ background: isSavingPrescription ? '#94A3B8' : '#2563EB', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: isSavingPrescription ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)', transition: '0.2s' }}
              onMouseEnter={e => !isSavingPrescription && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => !isSavingPrescription && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {isSavingPrescription ? 'Sending...' : 'Send Prescription'}
            </button>
          </div>
        </div>

        </div>
      )}

      {/* Modern High-Fidelity Sliding Lab Drawer (Matches user specification image 100%) */}
      {showAssignLabDrawer && (
        <>
          {/* Blur Backdrop */}
          <div 
            onClick={() => setShowAssignLabDrawer(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              transition: 'opacity 0.2s ease-out'
            }}
          />

          {/* Drawer Container */}
          <div 
            data-lenis-prevent
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: `${labDrawerWidth}px`,
              maxWidth: '95vw',
              background: '#ffffff',
              boxShadow: '-10px 0 40px rgba(15, 23, 42, 0.08)',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: "'Urbanist', sans-serif"
            }}
          >
            {/* Draggable handle on left edge */}
            <div 
              onMouseDown={startResizingLabDrawer}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                zIndex: 10,
                background: 'transparent',
                transition: 'background 0.2s',
                borderLeft: '2.5px solid #CBD5E1'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            />
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1E3A8A' }}>Assign Laboratory Test</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  {selectedPatient?.name || 'N/A'} | {selectedPatient?.uhid || 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => setShowAssignLabDrawer(false)}
                style={{ border: 'none', background: 'none', fontSize: '22px', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                ×
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Test Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '10px' }}>LABORATORY TEST SELECTION</label>
                
                <div style={{ position: 'relative' }}>
                  <i data-lucide="search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748B' }}></i>
                  <input 
                    type="text" 
                    placeholder="Search tests (e.g. Blood, Urine...)" 
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    style={{
                      width: '100%',
                      padding: '14px 16px 14px 44px',
                      borderRadius: '12px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#1E293B',
                      background: '#ffffff',
                      transition: 'border-color 0.2s'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        handleAddLab(searchQuery.trim());
                      }
                    }}
                  />

                  {/* Test Suggestions Overlay */}
                  {showSuggestions && searchQuery.trim() && (
                    <div 
                      data-lenis-prevent
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        zIndex: 10,
                        marginTop: '6px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '6px'
                      }}
                    >
                      {availableTests
                        .filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(t => (
                          <div 
                            key={t}
                            onClick={() => handleAddLab(t)}
                            style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 650, color: '#334155', transition: '0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {t}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Selected Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                  {selectedLabsList.map(lab => (
                    <span 
                      key={lab} 
                      style={{ 
                        background: '#EEF2FF', 
                        color: '#4F46E5', 
                        border: '1.5px solid #DBEAFE', 
                        fontSize: '12px', 
                        fontWeight: 750, 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}
                    >
                      {lab}
                      <span 
                        onClick={() => handleRemoveLab(lab)}
                        style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#4F46E5', display: 'inline-flex', alignItems: 'center' }}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '12px' }}>PRIORITY</label>
                <div style={{ display: 'flex', gap: '24px' }}>
                  {['Routine', 'Urgent', 'Emergency'].map(option => (
                    <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                      <input 
                        type="radio" 
                        name="labPriority" 
                        value={option}
                        checked={labPriority === option}
                        onChange={() => setLabPriority(option)}
                        style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '10px' }}>INSTRUCTIONS</label>
                <textarea 
                  data-lenis-prevent
                  value={labInstructions}
                  onChange={e => setLabInstructions(e.target.value)}
                  placeholder="Patient instructions (e.g. Fasting required)"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '14px',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: '#1E293B',
                    minHeight: '90px',
                    resize: 'none'
                  }}
                />
              </div>

              {/* TAT Info Card (Purple Glassmorphic Layout Matching Mockup) */}
              <div 
                style={{
                  background: '#F5F3FF',
                  border: '1px solid #DDD6FE',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <i data-lucide="info" style={{ width: '16px', height: '16px', color: '#7C3AED', marginTop: '3px' }}></i>
                  <p style={{ margin: 0, fontSize: '13px', color: '#5B21B6', fontWeight: 700, lineHeight: 1.4 }}>
                    Average TAT for these tests is 24 hours.
                  </p>
                </div>

                {/* Corridor Clinical Image */}
                <div 
                  style={{
                    position: 'relative',
                    height: '110px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(124, 58, 237, 0.15)'
                  }}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500&auto=format&fit=crop&q=80" 
                    alt="Clinical Laboratory" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  {/* Overlay Badge */}
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span 
                      style={{
                        background: '#ffffff',
                        color: '#1E293B',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 800,
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i data-lucide="map-pin" style={{ width: '13px', height: '13px', color: '#4F46E5' }}></i> Main Lab (Floor 2)
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '24px 32px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={handleAssignAndSend}
                disabled={labSending}
                style={{
                  width: '100%',
                  background: labSending ? '#93C5FD' : '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: labSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: labSending ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.25)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => { if (!labSending) e.currentTarget.style.background = '#1D4ED8'; }}
                onMouseLeave={e => { if (!labSending) e.currentTarget.style.background = '#2563EB'; }}
              >
                <i data-lucide={labSending ? 'loader-2' : 'send'} style={{ width: '16px', height: '16px' }} />
                {labSending ? 'Sending to Laboratory...' : 'Assign & Send to Laboratory'}
              </button>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                Digital order will be sent instantly to the laboratory system.
              </p>
            </div>

          </div>

        </>
      )}

      {/* Modern High-Fidelity Sliding Medications Drawer */}
      {showMedicationDrawer && (
        <>
          {/* Blur Backdrop */}
          <div 
            onClick={() => setShowMedicationDrawer(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.3)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              transition: 'opacity 0.2s ease-out'
            }}
          />

          {/* Drawer Container */}
          <div 
            data-lenis-prevent
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: `${medicationDrawerWidth}px`,
              maxWidth: '95vw',
              background: '#ffffff',
              boxShadow: '-10px 0 40px rgba(15, 23, 42, 0.08)',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: "'Urbanist', sans-serif"
            }}
          >
            {/* Draggable handle on left edge */}
            <div 
              onMouseDown={startResizingMedicationDrawer}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                zIndex: 10,
                background: 'transparent',
                transition: 'background 0.2s',
                borderLeft: '2.5px solid #CBD5E1'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#2563EB'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            />

            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1E3A8A' }}>Prescribe Medications</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  {selectedPatient?.name || 'N/A'} | {selectedPatient?.uhid || 'N/A'}
                </p>
              </div>
              <button 
                onClick={() => setShowMedicationDrawer(false)}
                style={{ border: 'none', background: 'none', fontSize: '22px', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                ×
              </button>
            </div>

            {/* Content Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Medicine Search */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '8px' }}>SEARCH & SELECT MEDICINE</label>
                
                <div style={{ position: 'relative' }}>
                  <i data-lucide="search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: '#64748B' }}></i>
                  <input 
                    type="text" 
                    placeholder="Search medicine to add (e.g. Paracetamol...)" 
                    value={medSearchQuery}
                    onChange={(e) => {
                      setMedSearchQuery(e.target.value);
                      setShowMedSuggestions(true);
                    }}
                    onFocus={() => setShowMedSuggestions(true)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 38px',
                      borderRadius: '10px',
                      border: '1.5px solid #E2E8F0',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#1E293B',
                      background: '#ffffff'
                    }}
                  />

                  {/* Suggestions List */}
                  {showMedSuggestions && medSearchQuery.trim() && (
                    <div 
                      data-lenis-prevent
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                        zIndex: 10,
                        marginTop: '4px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        padding: '4px'
                      }}
                    >
                      {(() => {
                        const dbList = (pharmacyInventoryDb && pharmacyInventoryDb.length > 0 ? pharmacyInventoryDb : dbMedicines) || [];
                        const defaultKeys = Object.keys(medicineDefaults || {}).map(k => ({
                          name: k.charAt(0).toUpperCase() + k.slice(1),
                          qty: 100,
                          isDefault: true
                        }));
                        const merged = [...dbList];
                        defaultKeys.forEach(dk => {
                          if (!merged.some(m => m.name && m.name.toLowerCase() === dk.name.toLowerCase())) {
                            merged.push(dk);
                          }
                        });
                        return merged.filter(m => m.name && m.name.toLowerCase().includes(medSearchQuery.toLowerCase()));
                      })().map(m => (
                        <div 
                          key={m._id || m.id || m.name}
                          onClick={() => {
                            const nameLower = m.name.toLowerCase().trim();
                            const preset = medicineDefaults[nameLower] || {};
                            const newItem = {
                              id: Date.now() + Math.random(),
                              medicine: m.name,
                              dosage: preset.dose || '1 Tab',
                              frequency: preset.freq || 'Once a Day',
                              duration: preset.duration || '5 Days',
                              timing: preset.timing || 'After Food'
                            };
                            setLocalMedicines([...localMedicines, newItem]);
                            setMedSearchQuery('');
                            setShowMedSuggestions(false);
                          }}
                          style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 650, color: '#334155', transition: '0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          💊 {m.name} {m.isDefault ? (
                            <span style={{ color: '#2563EB', fontSize: '10px' }}>(Preset)</span>
                          ) : m.qty <= 0 ? (
                            <span style={{ color: '#EF4444', fontSize: '10px' }}>(Out of Stock)</span>
                          ) : (
                            <span style={{ color: '#16A34A', fontSize: '10px' }}>({m.qty} In Stock)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Local List of Pending Medications to customize */}
              {localMedicines.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#1E3A8A', letterSpacing: '0.05em', margin: 0 }}>SELECTED MEDICATIONS ({localMedicines.length})</label>
                  
                  {localMedicines.map((med, index) => (
                    <div key={med.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                      
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: '12px' }}>#{index + 1}</span>
                          <span style={{ fontSize: '14px', fontWeight: 900, color: '#1E293B' }}>💊 {med.medicine}</span>
                        </div>
                        <button 
                          onClick={() => {
                            setLocalMedicines(localMedicines.filter(item => item.id !== med.id));
                          }}
                          style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '18px', fontWeight: 800, padding: 0 }}
                        >
                          ×
                        </button>
                      </div>

                      {/* Customize Inline Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>DOSAGE</label>
                          <input 
                            type="text"
                            value={med.dosage}
                            onChange={(e) => {
                              const updated = localMedicines.map(item => item.id === med.id ? { ...item, dosage: e.target.value } : item);
                              setLocalMedicines(updated);
                            }}
                            placeholder="e.g. 1 Tab, 5 ml..."
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, color: '#1E293B' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>FREQUENCY</label>
                          <select 
                            value={med.frequency}
                            onChange={(e) => {
                              const updated = localMedicines.map(item => item.id === med.id ? { ...item, frequency: e.target.value } : item);
                              setLocalMedicines(updated);
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, color: '#1E293B', background: 'white' }}
                          >
                            <option value="Once a Day">Once a Day (1-0-0)</option>
                            <option value="Twice a Day">Twice a Day (1-0-1)</option>
                            <option value="Thrice a Day">Thrice a Day (1-1-1)</option>
                            <option value="Four Times a Day">Four Times a Day</option>
                            <option value="As Needed (SOS)">As Needed (SOS)</option>
                            <option value="At Bedtime">At Bedtime (0-0-1)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>DURATION</label>
                          <select 
                            value={med.duration}
                            onChange={(e) => {
                              const updated = localMedicines.map(item => item.id === med.id ? { ...item, duration: e.target.value } : item);
                              setLocalMedicines(updated);
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, color: '#1E293B', background: 'white' }}
                          >
                            <option value="5 Days">5 Days</option>
                            <option value="3 Days">3 Days</option>
                            <option value="7 Days">7 Days</option>
                            <option value="10 Days">10 Days</option>
                            <option value="14 Days">14 Days</option>
                            <option value="30 Days">30 Days</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>INSTRUCTIONS</label>
                          <select 
                            value={med.timing}
                            onChange={(e) => {
                              const updated = localMedicines.map(item => item.id === med.id ? { ...item, timing: e.target.value } : item);
                              setLocalMedicines(updated);
                            }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, color: '#1E293B', background: 'white' }}
                          >
                            <option value="After Food">After Food</option>
                            <option value="Before Food">Before Food</option>
                            <option value="With Food">With Food</option>
                            <option value="Empty Stomach">Empty Stomach</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '12px', border: '1.5px dashed #E2E8F0' }}>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>No medicines selected yet.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>Use the search box above to find and add medicines.</p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: '24px 32px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowMedicationDrawer(false)}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (localMedicines.length === 0) {
                    setLabToast({ type: 'error', message: 'Please select at least one medicine.' });
                    setTimeout(() => setLabToast(null), 3000);
                    return;
                  }
                  localMedicines.forEach(med => {
                    addMedicineRow({
                      name: med.medicine,
                      dose: med.dosage,
                      freq: med.frequency,
                      duration: med.duration,
                      timing: med.timing
                    });
                  });
                  setLocalMedicines([]);
                  setShowMedicationDrawer(false);
                  setLabToast({ type: 'success', message: `Successfully added ${localMedicines.length} medications.` });
                  setTimeout(() => setLabToast(null), 3000);
                }}
                style={{
                  background: '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 28px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                }}
              >
                Add All to Prescription
              </button>
            </div>
          </div>
        </>
      )}

      {/* CSS Animation injection inline */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
