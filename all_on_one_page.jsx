        {/* REGISTRATION FORM TAB */}
        {activeTab === 'registration-form' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Registration and appointment</h1>
            </div>

            {isExistingPatient === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <div className="glass-card" style={{ width: '560px', padding: '32px', borderRadius: '12px', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i data-lucide="user" style={{ width: '24px', height: '24px' }}></i>
                    </div>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Registered Patient</h2>
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500 }}>Search and select an existing patient to book an appointment.</p>
                    </div>
                  </div>
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <input type="text" className="form-control" placeholder="Search by Patient ID or Phone Number" style={{ height: '42px', paddingRight: '48px', paddingLeft: '16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} value={searchPatientQuery} onChange={e => setSearchPatientQuery(e.target.value)} />
                    <i data-lucide="search" style={{ position: 'absolute', right: '16px', top: '11px', color: '#94A3B8', width: '20px', height: '20px' }}></i>
                  </div>
                  {searchPatientQuery.trim().length > 0 && (
                    <div data-lenis-prevent style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC' }}>
                      {patientsList.filter(p => { const q = searchPatientQuery.toLowerCase(); return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q); }).length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setSelectedPatient(null); const isNumeric = /^\d+$/.test(searchPatientQuery.trim()); setFormData({ name: !isNumeric ? searchPatientQuery : '', age: '', gender: '', contact: isNumeric ? searchPatientQuery : '', email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: '' }); setIsExistingPatient(false); setSearchPatientQuery(''); }}>
                          <div style={{ marginBottom: '4px' }}>No matching patients found.</div>
                          <div style={{ color: '#10B981', fontWeight: 700 }}>Click here to register a new patient &rarr;</div>
                        </div>
                      ) : (
                        patientsList.filter(p => { const q = searchPatientQuery.toLowerCase(); return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q); }).map(p => (
                          <div key={p._id} style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { setSelectedPatient(p); setFormData({ name: p.name, age: p.age, gender: p.gender, contact: p.contact, email: p.email || '', bloodGroup: p.bloodGroup || 'O+', address: p.address || '', medicalHistory: p.medicalHistory ? p.medicalHistory.join(', ') : '', doctorId: formData.doctorId, allergies: p.allergies || 'None', currentMedications: p.currentMedications || '' }); setIsExistingPatient(true); }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '13px', color: '#1A1D23' }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>#{p._id.substring(18).toUpperCase()} • {p.gender} • {p.age} Yrs</div>
                              <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, marginTop: '4px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); setFormData({ name: '', age: '', gender: '', contact: p.contact, email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: '' }); setIsExistingPatient(false); setSearchPatientQuery(''); }}>+ Register Family</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{p.contact}</div>
                              <span style={{ fontSize: '10px', background: '#EFF6FF', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginTop: '4px' }}>Select</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', minHeight: 0 }}>
                
                {/* COLUMN 1: Patient Information */}
                <div className="glass-card" style={{ background: 'white', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px 16px', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><i data-lucide="user" style={{ width: '14px', color: '#3B82F6' }}></i> 1. Patient Info</h2>
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Full Name <span style={{color: '#EF4444'}}>*</span></label>
                        <input type="text" placeholder="Ramesh Mehta" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Gender <span style={{color: '#EF4444'}}>*</span></label>
                          <select style={{ height: '30px', fontSize: '12px', padding: '0 6px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={isExistingPatient}>
                            <option value="">--</option><option value="Male">M</option><option value="Female">F</option><option value="Other">O</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Age <span style={{color: '#EF4444'}}>*</span></label>
                          <input type="number" placeholder="Yrs" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} readOnly={isExistingPatient} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Mobile <span style={{color: '#EF4444'}}>*</span></label>
                        <input type="text" placeholder="9876543210" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.contact} onChange={e => { const val = e.target.value.replace(/\D/g, '').substring(0, 10); setFormData({...formData, contact: val}); }} readOnly={isExistingPatient} />
                      </div>
                      {bookingType === 'lab' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Referred By</label>
                          <input type="text" placeholder="Dr. Shah" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.referredBy || ''} onChange={e => setFormData({...formData, referredBy: e.target.value})} readOnly={isExistingPatient} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Blood Grp</label>
                          <select style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} disabled={isExistingPatient}>
                            <option value="">--</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {bookingType !== 'lab' && bookingType !== 'service' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Email</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" placeholder="patient@email.com" style={{ height: '30px', flex: 1, minWidth: 0, fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: (isExistingPatient || otpVerified) ? '#F8FAFC' : 'white' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} readOnly={isExistingPatient || otpVerified} />
                            {!isExistingPatient && !otpVerified && (
                              <button type="button" style={{ height: '30px', padding: '0 10px', borderRadius: '4px', background: '#3B82F6', color: 'white', border: 'none', fontWeight: 600, fontSize: '11px' }} onClick={handleSendOtp} disabled={sendingOtp}>{sendingOtp ? '...' : 'Verify'}</button>
                            )}
                            {!isExistingPatient && otpVerified && (
                              <div style={{ height: '30px', display: 'flex', alignItems: 'center', padding: '0 8px', background: '#ECFDF5', color: '#10B981', borderRadius: '4px', fontWeight: 600, fontSize: '11px' }}>Verified</div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Residential Address</label>
                          <input type="text" placeholder="Flat 101, Main Road" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} readOnly={isExistingPatient} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Medical History</label>
                            <input type="text" placeholder="Hypertension" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.medicalHistory} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} readOnly={isExistingPatient} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Allergies</label>
                            <input type="text" placeholder="Penicillin" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: 'white' }} value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Current Medications</label>
                          <input type="text" placeholder="Metformin 500mg" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: 'white' }} value={formData.currentMedications} onChange={e => setFormData({...formData, currentMedications: e.target.value})} />
                        </div>
                      </>
                    )}
                    
                    {!isExistingPatient && otpSent && !otpVerified && (
                      <div style={{ background: '#FEF2F2', border: '1px dashed #FCA5A5', borderRadius: '4px', padding: '8px', display: 'flex', gap: '6px', alignItems: 'center', marginTop: 'auto' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#991B1B', margin: 0 }}>OTP:</label>
                        <input type="text" maxLength={6} placeholder="######" style={{ width: '60px', height: '28px', textAlign: 'center', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', borderRadius: '4px', border: '1px solid #FCA5A5' }} value={verificationOtp} onChange={e => setVerificationOtp(e.target.value.replace(/\D/g, ''))} />
                        <button type="button" style={{ height: '28px', borderRadius: '4px', fontWeight: 600, padding: '0 10px', background: '#10B981', color: 'white', border: 'none', cursor: otpVerifying ? 'not-allowed' : 'pointer', fontSize: '11px' }} onClick={handleVerifyOtp} disabled={otpVerifying}>{otpVerifying ? '...' : 'Verify'}</button>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <button type="button" onClick={() => { setSelectedPatient(null); setIsExistingPatient(null); setFormData({name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: ''}); }} style={{ height: '30px', width: '100%', borderRadius: '4px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <i data-lucide="arrow-left" style={{ width: '14px' }}></i> Back to Search
                    </button>
                  </div>
                </div>

                {/* COLUMN 2: Visit Details */}
                <div className="glass-card" style={{ background: 'white', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px 16px', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><i data-lucide="calendar" style={{ width: '14px', color: '#8B5CF6' }}></i> 2. Visit Details</h2>
                  </div>
                  {bookingType === 'opd' && (
                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Symptoms <span style={{color: '#EF4444'}}>*</span></label>
                        <div className="custom-dropdown-container" ref={symptomDropdownRef}>
                          <div className="custom-dropdown-trigger" onClick={() => !reschedulingAppointment && setSymptomDropdownOpen(!symptomDropdownOpen)} style={{ minHeight: '30px', padding: '2px 8px', background: reschedulingAppointment ? '#F8FAFC' : 'white', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: reschedulingAppointment ? 'not-allowed' : 'pointer' }}>
                            <div className="selected-items" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', width: '100%' }}>
                              {selectedSymptoms.map(s => (
                                <div key={s} style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {s} <span onClick={(e) => { e.stopPropagation(); if (!reschedulingAppointment) toggleSymptom(s); }} style={{ cursor: 'pointer', display: 'flex' }}><i data-lucide="x" style={{ width: '10px', height: '10px' }}></i></span>
                                </div>
                              ))}
                              <input type="text" placeholder={selectedSymptoms.length === 0 ? "Search..." : ""} value={symptomSearchQuery} onChange={e => { setSymptomSearchQuery(e.target.value); if (!symptomDropdownOpen) setSymptomDropdownOpen(true); }} onClick={e => { e.stopPropagation(); setSymptomDropdownOpen(true); }} disabled={!!reschedulingAppointment} style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: '60px', fontSize: '12px', padding: '2px 0' }} />
                            </div>
                          </div>
                          {symptomDropdownOpen && (
                            <div className="dropdown-options-box show" style={{ border: '1px solid #CBD5E1', borderRadius: '4px', marginTop: '2px', background: 'white', zIndex: 10, padding: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                              {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).map(s => (
                                <div key={s} onClick={() => { toggleSymptom(s); setSymptomSearchQuery(''); }} style={{ padding: '6px 8px', cursor: 'pointer', fontSize: '11px', borderRadius: '2px' }}>{s}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Select Doctor <span style={{color: '#EF4444'}}>*</span></label>
                        <select style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: reschedulingAppointment ? '#F8FAFC' : 'white', color: '#0F172A' }} value={formData.doctorId} onChange={e => { setFormData({...formData, doctorId: e.target.value}); setSelectedSlot(''); }} disabled={!!reschedulingAppointment}>
                          <option value="">-- Choose Doctor --</option>
                          {doctors.map(doc => (<option key={doc._id} value={doc._id}>{doc.name}</option>))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>Appointment Date <span style={{color: '#EF4444'}}>*</span></label>
                        <input type="date" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1', background: 'white', color: '#0F172A' }} value={bookingDate} min={getLocalDateString()} onChange={e => { setBookingDate(e.target.value); setSelectedSlot(''); }} />
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#0F172A' }}>Available Slots</label>
                        {formData.doctorId && bookingDate && !receptionDoctorAvailability.available && (
                          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="x-circle" style={{ width: '12px', color: '#DC2626' }}></i></div>
                            <div><div style={{ fontSize: '11px', fontWeight: 800, color: '#991B1B' }}>Unavailable</div><div style={{ fontSize: '10px', color: '#B91C1C' }}>{receptionDoctorAvailability.reason === 'Weekly Off' ? `Weekly off` : `On ${receptionDoctorAvailability.leaveType || ''} leave.`}</div></div>
                          </div>
                        )}
                        {(!formData.doctorId || !bookingDate) ? (
                          <div style={{ padding: '12px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '4px', textAlign: 'center', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>Select Doctor and Date.</div>
                        ) : receptionDoctorAvailability.available && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start' }}>
                            {(receptionDoctorAvailability.slots || DEFAULT_RECEPTION_SLOTS).map(time => {
                              let limit = 5;
                              const match = time.match(/\(Limit:\s*(\d+)\)/i);
                              if (match) limit = parseInt(match[1], 10);
                              const cleanTimeSlotStr = (str) => { if (!str) return ''; return str.split(/\(Limit:/i)[0].replace(/\s+/g, ' ').trim().toLowerCase(); };
                              const targetTimeClean = cleanTimeSlotStr(time);
                              const targetDateStr = new Date(bookingDate).toDateString();
                              let bookedCount = 0;
                              if (formData.doctorId && bookingDate) {
                                  bookedCount = appointments.filter(app => {
                                      if (app.status === 'Cancelled') return false;
                                      const appDocId = app.doctorId?._id || app.doctorId;
                                      if (String(appDocId) !== String(formData.doctorId)) return false;
                                      if (new Date(app.date).toDateString() !== targetDateStr) return false;
                                      return cleanTimeSlotStr(app.time) === targetTimeClean;
                                  }).length;
                              }
                              const isFull = bookedCount >= limit;
                              const isSelected = selectedSlot === time;
                              const displayTime = time.split(/\(Limit:/i)[0].trim();
                              return (
                                  <div key={time} onClick={() => { if (!isFull) setSelectedSlot(time); }} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '11px', fontWeight: 600, cursor: isFull ? 'not-allowed' : 'pointer', background: isSelected ? '#3B82F6' : (isFull ? '#F1F5F9' : 'white'), color: isSelected ? 'white' : (isFull ? '#94A3B8' : '#334155') }}>
                                      {displayTime} {isFull && <span style={{ fontSize: '9px', color: '#EF4444', display: 'inline-block', marginLeft: '4px' }}>(Full)</span>}
                                  </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {additionalApptsList.length > 0 && (
                        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', padding: '8px', marginTop: '8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Queued Appts ({additionalApptsList.length})</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {additionalApptsList.map((appt, idx) => (
                              <div key={appt.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                                <div><div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>{appt.doctorName}</div><div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>{appt.date} • {appt.time.split('(Limit')[0].trim()}</div></div>
                                <button type="button" onClick={() => setAdditionalApptsList(additionalApptsList.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><i data-lucide="trash-2" style={{ width: '12px' }}></i></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* COLUMN 3: Billing & Extras */}
                <div className="glass-card" style={{ background: 'white', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  <div style={{ background: '#F8FAFC', padding: '10px 16px', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
                    <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><i data-lucide="credit-card" style={{ width: '14px', color: '#10B981' }}></i> 3. Billing & Extras</h2>
                  </div>
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    
                    {/* Vitals */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '8px', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setVitalsCollapsed(!vitalsCollapsed)}>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Patient Vitals (Opt)</h3>
                        <i data-lucide={vitalsCollapsed ? "chevron-down" : "chevron-up"} style={{ width: '14px', color: '#64748B' }}></i>
                      </div>
                      {!vitalsCollapsed && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
                          <input type="number" step="0.1" placeholder="Temp °F" style={{ height: '26px', fontSize: '11px', padding: '0 6px', borderRadius: '2px', border: '1px solid #CBD5E1' }} value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} />
                          <input type="number" placeholder="Pulse" style={{ height: '26px', fontSize: '11px', padding: '0 6px', borderRadius: '2px', border: '1px solid #CBD5E1' }} value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} />
                          <input type="number" placeholder="BP Sys" style={{ height: '26px', fontSize: '11px', padding: '0 6px', borderRadius: '2px', border: '1px solid #CBD5E1' }} value={vitalBpSys} onChange={e => setVitalBpSys(e.target.value)} />
                          <input type="number" placeholder="BP Dia" style={{ height: '26px', fontSize: '11px', padding: '0 6px', borderRadius: '2px', border: '1px solid #CBD5E1' }} value={vitalBpDia} onChange={e => setVitalBpDia(e.target.value)} />
                          <input type="number" step="0.1" placeholder="Wt kg" style={{ height: '26px', fontSize: '11px', padding: '0 6px', borderRadius: '2px', border: '1px solid #CBD5E1' }} value={vitalWeight} onChange={e => setVitalWeight(e.target.value)} />
                          <input type="number" placeholder="Ht cm" style={{ height: '26px', fontSize: '11px', padding: '0 6px', borderRadius: '2px', border: '1px solid #CBD5E1' }} value={vitalHeight} onChange={e => setVitalHeight(e.target.value)} />
                        </div>
                      )}
                    </div>

                    {/* Consent */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '8px', background: '#F8FAFC' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>Patient Consent</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} style={{ width: '12px', height: '12px' }} />
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#1E293B' }}>EMR Creation (Mandatory)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} style={{ width: '12px', height: '12px' }} />
                          <span style={{ fontSize: '10px', fontWeight: 500, color: '#475569' }}>Data Sharing (Research)</span>
                        </label>
                      </div>
                    </div>

                    {/* Billing Summary */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '4px', padding: '8px', background: '#F8FAFC', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>Billing Summary</h3>
                      {(() => {
                        const subtotalVal = getBillingItems().reduce((sum, item) => sum + item.amount, 0) + ((!isExistingPatient && getBillingItems().length > 0) ? 50 : 0);
                        const discAmt = (subtotalVal * Number(bookingDiscountPercent || 0)) / 100;
                        const finalTotalVal = Math.max(0, subtotalVal - discAmt);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ flex: 1 }}>
                              {getBillingItems().map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#475569' }}><span>{item.description}</span><span style={{ fontWeight: 600 }}>₹{Number(item.amount).toFixed(2)}</span></div>
                              ))}
                              {!isExistingPatient && getBillingItems().length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', color: '#475569' }}><span>Reg Fee</span><span style={{ fontWeight: 600 }}>₹50.00</span></div>}
                            </div>
                            
                            <div style={{ marginTop: '8px', borderTop: '1px dashed #CBD5E1', paddingTop: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Discount (%)</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '70px' }}>
                                  <input type="number" min="0" max={allowedDiscountPercent} value={bookingDiscountPercent || ''} onChange={e => setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))} style={{ width: '100%', height: '24px', borderRadius: '4px', border: '1px solid #CBD5E1', padding: '0 16px 0 6px', fontSize: '11px', fontWeight: 600, textAlign: 'right' }} />
                                  <span style={{ position: 'absolute', right: '6px', fontWeight: 600, color: '#64748B', fontSize: '10px' }}>%</span>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '8px', borderTop: '2px solid #E2E8F0', paddingTop: '8px', fontWeight: 800, color: '#0F172A' }}>
                              <span>Total</span><span>₹{finalTotalVal.toFixed(2)}</span>
                            </div>
                            
                            <div style={{ marginTop: '12px' }}>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Pay Method</label>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                {['Cash', 'UPI', 'Other'].map(method => (
                                  <div key={method} onClick={() => setBookingPaymentMethod(method)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '4px', cursor: 'pointer', border: bookingPaymentMethod === method ? '1.5px solid #2563EB' : '1px solid #CBD5E1', background: bookingPaymentMethod === method ? '#EFF6FF' : 'white', color: bookingPaymentMethod === method ? '#2563EB' : '#475569', fontWeight: 600, fontSize: '11px' }}>{method}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', marginTop: 'auto' }}>
                    <button type="button" onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading} style={{ width: '100%', height: '42px', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', fontWeight: 800, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <i data-lucide={reschedulingAppointment ? "calendar-days" : "check-circle"} style={{ width: '16px' }}></i> {loading ? 'Processing...' : (reschedulingAppointment ? 'Confirm Reschedule' : 'Confirm & Register')}
                    </button>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}
