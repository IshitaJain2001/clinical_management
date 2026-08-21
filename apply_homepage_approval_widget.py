import sys

rec_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(rec_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Add states for online request review modal
find_states = "  const [detailsModalOpen, setDetailsModalOpen] = useState(false);"
replace_states = """  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [showOnlineReviewModal, setShowOnlineReviewModal] = useState(false);
  const [selectedOnlineRequest, setSelectedOnlineRequest] = useState(null);"""

if find_states in text:
    text = text.replace(find_states, replace_states)

# Add handler function
find_fn = "  const openDetailsModal = (app) => {"
replace_fn = """  const openOnlineRequestReviewModal = (app) => {
    setSelectedOnlineRequest(app);
    setShowOnlineReviewModal(true);
  };

  const openDetailsModal = (app) => {"""

if find_fn in text:
    text = text.replace(find_fn, replace_fn)

# Only show approval buttons in appointments table if it is an Online booking requiring approval
find_table_approve = """{primaryApp.type === 'Appointment' && (primaryApp.status === 'Pending' || primaryApp.status === 'Pending Approval') && ("""
replace_table_approve = """{primaryApp.type === 'Appointment' && (primaryApp.status === 'Pending Approval' || (primaryApp.rawItem?.source === 'Online' && primaryApp.status === 'Pending')) && ("""

if find_table_approve in text:
    text = text.replace(find_table_approve, replace_table_approve)
    print("Scoped table approval buttons to Online requests only")

# Add Online Patient Requests Widget on Dashboard Homepage (activeTab === 'dash')
find_dash_header = """            {/* High-fidelity Dashboard Title Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>"""

online_requests_widget = """            {/* Online Patient Booking Requests Awaiting Approval */}
            {(() => {
              const pendingOnlineRequests = appointments.filter(a => 
                a.status === 'Pending Approval' || 
                (a.source === 'Online' && (a.status === 'Pending Approval' || a.status === 'Pending'))
              );
              if (pendingOnlineRequests.length === 0) return null;

              return (
                <div style={{
                  background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                  border: '1.5px solid #FDBA74',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  marginBottom: '24px',
                  boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.12)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#EA580C', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#9A3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          Online Patient Registration Requests
                          <span style={{ background: '#EA580C', color: 'white', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 900 }}>
                            {pendingOnlineRequests.length} Pending Approval
                          </span>
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#C2410C', fontWeight: 600 }}>
                          Patients registered through online portal. Click any card to review the complete submitted form & approve.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grid of Pending Requests */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                    {pendingOnlineRequests.map(app => {
                      const pat = app.patientId || {};
                      const doc = app.doctorId || {};
                      const ageDisplay = [
                        pat.age ? `${pat.age} Yrs` : null,
                        pat.ageMonths ? `${pat.ageMonths} M` : null,
                        pat.ageDays ? `${pat.ageDays} D` : null
                      ].filter(Boolean).join(' ') || 'Age N/A';

                      return (
                        <div
                          key={app._id}
                          onClick={() => openOnlineRequestReviewModal(app)}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: '12px',
                            padding: '16px 18px',
                            border: '1px solid #FED7AA',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 18px rgba(234, 88, 12, 0.18)';
                            e.currentTarget.style.borderColor = '#FB923C';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.03)';
                            e.currentTarget.style.borderColor = '#FED7AA';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {pat.avatar ? (
                              <img src={pat.avatar} alt="Patient" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FB923C', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
                                {getInitials(pat.name || 'Patient')}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {pat.name || 'Anonymous Patient'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                                {pat.contact || 'No Contact'} • {pat.gender || 'N/A'}, {ageDisplay}
                              </div>
                            </div>
                          </div>

                          <div style={{ background: '#FFF7ED', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                            <div style={{ color: '#9A3412', fontWeight: 700 }}>
                              Doctor: <span style={{ color: '#0F172A', fontWeight: 800 }}>Dr. {doc.name || 'Assigned Doctor'} ({doc.specialty || 'General'})</span>
                            </div>
                            <div style={{ color: '#9A3412', fontWeight: 600, marginTop: '2px' }}>
                              Slot: <span style={{ color: '#EA580C', fontWeight: 800 }}>{getFormattedDate(app.date)} at {app.time}</span>
                            </div>
                            {app.reason && (
                              <div style={{ color: '#64748B', fontWeight: 600, marginTop: '4px', fontSize: '11px' }}>
                                Reason: <span style={{ color: '#334155' }}>{app.reason}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                            <span style={{ fontSize: '11px', color: '#EA580C', fontWeight: 800 }}>
                              ⚡ Click to Review Full Form
                            </span>
                            <button
                              type="button"
                              style={{ background: '#2563EB', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openOnlineRequestReviewModal(app);
                              }}
                            >
                              Review & Approve ➔
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
"""

if find_dash_header in text:
    text = text.replace(find_dash_header, online_requests_widget + "\n" + find_dash_header)
    print("Added Online Requests widget on Homepage")

# Add Complete Full Form Review Modal Component
full_form_modal = """      {/* COMPLETE ONLINE PATIENT REGISTRATION FORM REVIEW MODAL */}
      {showOnlineReviewModal && selectedOnlineRequest && (
        <div className="details-modal-overlay" onClick={() => setShowOnlineReviewModal(false)} style={{ zIndex: 99999 }}>
          <div 
            className="details-modal-card" 
            onClick={e => e.stopPropagation()} 
            style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '0', borderRadius: '16px', background: '#FFFFFF' }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#EA580C', color: 'white', fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    Online Registration Review
                  </span>
                  <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                    Submitted via Patient Portal
                  </span>
                </div>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '20px', fontWeight: 800, color: 'white' }}>
                  {selectedOnlineRequest.patientId?.name || 'Patient Registration Form'}
                </h2>
              </div>
              <button 
                onClick={() => setShowOnlineReviewModal(false)}
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {(() => {
                const pat = selectedOnlineRequest.patientId || {};
                const doc = selectedOnlineRequest.doctorId || {};
                const docFee = (doc.consultationFee !== undefined && doc.consultationFee !== null && !isNaN(doc.consultationFee)) ? Number(doc.consultationFee) : 0;
                
                return (
                  <div>
                    {/* Patient Photo & Primary Header Info */}
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: '#F8FAFC', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                      {pat.avatar ? (
                        <img 
                          src={pat.avatar} 
                          alt="Patient Photo" 
                          style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '3px solid #2563EB', flexShrink: 0 }} 
                        />
                      ) : (
                        <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 900, flexShrink: 0 }}>
                          {getInitials(pat.name || 'Patient')}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>{pat.name || 'N/A'}</div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                          <div>📱 Contact: <b style={{ color: '#0F172A' }}>{pat.contact || 'N/A'}</b></div>
                          <div>✉️ Email: <b style={{ color: '#0F172A' }}>{pat.email || 'N/A'}</b></div>
                          <div>🩸 Blood: <b style={{ color: '#EF4444' }}>{pat.bloodGroup || 'O+'}</b></div>
                        </div>
                      </div>
                    </div>

                    {/* Form Sections */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      
                      {/* Section 1: Demographics */}
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          1. Personal & Demographic Details
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                          <div><span style={{ color: '#64748B', fontWeight: 600 }}>Gender:</span> <b style={{ color: '#0F172A' }}>{pat.gender || 'N/A'}</b></div>
                          <div>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Age:</span> <b style={{ color: '#0F172A' }}>
                              {[
                                pat.age ? `${pat.age} Years` : null,
                                pat.ageMonths ? `${pat.ageMonths} Months` : null,
                                pat.ageDays ? `${pat.ageDays} Days` : null
                              ].filter(Boolean).join(', ') || 'Not specified'}
                            </b>
                          </div>
                          <div><span style={{ color: '#64748B', fontWeight: 600 }}>Address:</span> <b style={{ color: '#0F172A' }}>{pat.address || 'Not Provided'}</b></div>
                          <div><span style={{ color: '#64748B', fontWeight: 600 }}>Referred By:</span> <b style={{ color: '#0F172A' }}>{pat.referredBy || 'Self'}</b></div>
                        </div>
                      </div>

                      {/* Section 2: Clinical Details */}
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          2. Clinical Symptoms & History
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                          <div><span style={{ color: '#64748B', fontWeight: 600 }}>Reported Symptoms:</span> <b style={{ color: '#EA580C' }}>{selectedOnlineRequest.reason || 'General Consultation'}</b></div>
                          <div><span style={{ color: '#64748B', fontWeight: 600 }}>Allergies:</span> <b style={{ color: pat.allergies && pat.allergies !== 'None' ? '#DC2626' : '#16A34A' }}>{pat.allergies || 'None'}</b></div>
                          <div><span style={{ color: '#64748B', fontWeight: 600 }}>Current Medications:</span> <b style={{ color: '#0F172A' }}>{pat.currentMedications || 'None'}</b></div>
                          <div><span style={{ color: '#64748B', fontWeight: 600 }}>Medical History:</span> <b style={{ color: '#0F172A' }}>{Array.isArray(pat.medicalHistory) ? pat.medicalHistory.join(', ') : (pat.medicalHistory || 'None')}</b></div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Requested Appointment & Dynamic Bill Breakdown */}
                    <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        3. Requested Consultation & Dynamic Fee Breakdown
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>Doctor: <b style={{ color: '#0F172A' }}>Dr. {doc.name || 'Doctor'} ({doc.specialty || 'General'})</b></div>
                          <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600, marginTop: '4px' }}>Date & Slot: <b style={{ color: '#0F172A' }}>{getFormattedDate(selectedOnlineRequest.date)} at {selectedOnlineRequest.time}</b></div>
                        </div>
                        <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                            <span>One-Time OPD Reg. Fee:</span>
                            <span style={{ fontWeight: 800, color: '#D97706' }}>₹50 (1-Time)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                            <span>Dr. {doc.name || 'Doctor'} Fee:</span>
                            <span style={{ fontWeight: 800, color: '#0F172A' }}>₹{docFee}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#0F172A', fontWeight: 900, borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                            <span>Total Invoice Payable:</span>
                            <span style={{ color: '#16A34A' }}>₹{docFee + 50}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '18px' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '0 20px', height: '42px', borderRadius: '8px', background: '#F1F5F9', color: '#475569', fontWeight: 800, border: '1px solid #CBD5E1', cursor: 'pointer' }}
                        onClick={() => setShowOnlineReviewModal(false)}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '0 20px', height: '42px', borderRadius: '8px', background: '#FEE2E2', color: '#DC2626', fontWeight: 800, border: '1px solid #FCA5A5', cursor: 'pointer' }}
                        onClick={async () => {
                          try {
                            await api.put('/appointments/' + selectedOnlineRequest._id + '/reject');
                            showToast('Appointment request rejected.', 'info');
                            setShowOnlineReviewModal(false);
                            fetchData();
                          } catch(e) {
                            showToast('Failed to reject request', 'error');
                          }
                        }}
                      >
                        ✕ Reject Request
                      </button>

                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '0 26px', height: '42px', borderRadius: '8px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                        onClick={async () => {
                          try {
                            await api.put('/appointments/' + selectedOnlineRequest._id + '/approve');
                            showToast('Appointment Approved! Payment request (with dynamic fee) sent to patient.', 'success');
                            setShowOnlineReviewModal(false);
                            fetchData();
                          } catch(e) {
                            showToast(e.response?.data?.error || 'Failed to approve', 'error');
                          }
                        }}
                      >
                        ✓ Approve & Request Payment (₹{docFee + 50})
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
"""

find_modal_anchor = "{/* COVERAGE LAB MODALS */}"
if find_modal_anchor in text:
    text = text.replace(find_modal_anchor, full_form_modal + "\n      " + find_modal_anchor)
    print("Added Full Form Review Modal in ReceptionistDashboard.jsx")

with open(rec_file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Completed updating ReceptionistDashboard.jsx for Homepage approval widget and full form review modal")
