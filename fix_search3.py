import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '{isExistingPatient === null ? ('
end_marker = '              // ==========================================\n              // ACTUAL DENSE FORM LAYOUT'

start_idx = text.find(start_marker)
end_idx = text.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    # We find the `) : (` right before `// ACTUAL DENSE FORM LAYOUT`
    before_actual_dense = text.rfind(') : (', start_idx, end_idx)
    end_idx = before_actual_dense

    new_search_block = """{isExistingPatient === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
                <div style={{ width: '600px', padding: '40px', borderRadius: '16px', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                  
                  {/* Header: User Icon + Title + Subtitle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i data-lucide="user" style={{ width: '32px', height: '32px' }}></i>
                    </div>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', fontFamily: "'Inter', sans-serif" }}>Registered Patient</h2>
                      <p style={{ fontSize: '14px', color: '#64748B', margin: 0, fontWeight: 500 }}>Search and select an existing patient to book an appointment.</p>
                    </div>
                  </div>

                  {/* Search Field with magnifying glass on the right */}
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Search by Patient ID or Phone Number"
                      style={{
                        height: '56px',
                        paddingRight: '56px',
                        paddingLeft: '20px',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        border: '2px solid #CBD5E1',
                        width: '100%',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        color: '#0F172A'
                      }}
                      onFocus={e => e.target.style.borderColor = '#3B82F6'}
                      onBlur={e => e.target.style.borderColor = '#CBD5E1'}
                      value={searchPatientQuery}
                      onChange={e => setSearchPatientQuery(e.target.value)}
                    />
                    <i data-lucide="search" style={{ position: 'absolute', right: '20px', top: '18px', color: '#94A3B8', width: '20px', height: '20px' }}></i>
                  </div>

                  {/* Search Autocomplete List */}
                  {searchPatientQuery.trim().length > 0 && (
                    <div data-lenis-prevent style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', marginTop: '8px' }}>
                      {patientsList.filter(p => {
                        const q = searchPatientQuery.toLowerCase();
                        return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
                      }).length === 0 ? (
                        <div
                          style={{ padding: '24px', textAlign: 'center', color: '#64748B', cursor: 'pointer', transition: '0.2s', background: '#F8FAFC' }}
                          onClick={() => {
                            setSelectedPatient(null);
                            const isNumeric = /^\d+$/.test(searchPatientQuery.trim());
                            setFormData({
                              name: !isNumeric ? searchPatientQuery : '',
                              age: '',
                              gender: '',
                              contact: isNumeric ? searchPatientQuery : '',
                              email: '',
                              doctorId: formData.doctorId,
                              bloodGroup: '',
                              address: '',
                              medicalHistory: '',
                              referredBy: '',
                              allergies: 'None',
                              currentMedications: ''
                            });
                            setIsExistingPatient(false);
                            setSearchPatientQuery('');
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F0FDF4'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
                        >
                          <div style={{ marginBottom: '8px', fontSize: '15px', fontWeight: 600 }}>No matching patients found.</div>
                          <div style={{ color: '#10B981', fontWeight: 700, fontSize: '16px' }}>Click here to register a new patient &rarr;</div>
                        </div>
                      ) : (
                        patientsList.filter(p => {
                          const q = searchPatientQuery.toLowerCase();
                          return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
                        }).map(p => (
                          <div
                            key={p._id}
                            style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '0.2s' }}
                            onClick={() => {
                              setSelectedPatient(p);
                              setFormData({
                                name: p.name,
                                age: p.age,
                                gender: p.gender,
                                contact: p.contact,
                                email: p.email || '',
                                bloodGroup: p.bloodGroup || 'O+',
                                address: p.address || '',
                                medicalHistory: p.medicalHistory ? p.medicalHistory.join(', ') : '',
                                doctorId: formData.doctorId,
                                allergies: p.allergies || 'None',
                                currentMedications: p.currentMedications || ''
                              });
                              setIsExistingPatient(true);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A' }}>{p.name}</div>
                              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                                #{p._id.substring(18).toUpperCase()} • {p.gender} • {p.age} Yrs
                              </div>
                              <div
                                style={{ fontSize: '13px', color: '#10B981', fontWeight: 800, marginTop: '6px', display: 'inline-block', cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(null);
                                  setFormData({
                                    name: '',
                                    age: '',
                                    gender: '',
                                    contact: p.contact,
                                    email: '',
                                    doctorId: formData.doctorId,
                                    bloodGroup: '',
                                    address: '',
                                    medicalHistory: '',
                                    referredBy: '',
                                    allergies: 'None',
                                    currentMedications: ''
                                  });
                                  setIsExistingPatient(false);
                                  setSearchPatientQuery('');
                                }}
                              >
                                + Register Family
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#3B82F6' }}>{p.contact}</div>
                              <span style={{ fontSize: '12px', background: '#EFF6FF', color: '#2563EB', padding: '4px 12px', borderRadius: '6px', fontWeight: 800, display: 'inline-block', marginTop: '6px' }}>
                                Select
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
"""
    new_text = text[:start_idx] + new_search_block + text[end_idx:]
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('SUCCESS! Fully rewrote initial search screen and fixed syntax error!')
else:
    print('Failed to find start or end markers')
