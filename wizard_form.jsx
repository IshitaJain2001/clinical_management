        {/* REGISTRATION FORM TAB */}
        {activeTab === 'registration-form' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Registration and appointment</h1>
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
                        <div style={{ padding: '12px', textAlign: 'center', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setSelectedPatient(null); const isNumeric = /^\d+$/.test(searchPatientQuery.trim()); setFormData({ name: !isNumeric ? searchPatientQuery : '', age: '', gender: '', contact: isNumeric ? searchPatientQuery : '', email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: '' }); setIsExistingPatient(false); setSearchPatientQuery(''); setRegistrationStep(1); }}>
                          <div style={{ marginBottom: '4px' }}>No matching patients found.</div>
                          <div style={{ color: '#10B981', fontWeight: 700 }}>Click here to register a new patient &rarr;</div>
                        </div>
                      ) : (
                        patientsList.filter(p => { const q = searchPatientQuery.toLowerCase(); return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q); }).map(p => (
                          <div key={p._id} style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { setSelectedPatient(p); setFormData({ name: p.name, age: p.age, gender: p.gender, contact: p.contact, email: p.email || '', bloodGroup: p.bloodGroup || 'O+', address: p.address || '', medicalHistory: p.medicalHistory ? p.medicalHistory.join(', ') : '', doctorId: formData.doctorId, allergies: p.allergies || 'None', currentMedications: p.currentMedications || '' }); setIsExistingPatient(true); setRegistrationStep(1); }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '13px', color: '#1A1D23' }}>{p.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>#{p._id.substring(18).toUpperCase()} • {p.gender} • {p.age} Yrs</div>
                              <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, marginTop: '4px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); setFormData({ name: '', age: '', gender: '', contact: p.contact, email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: '' }); setIsExistingPatient(false); setSearchPatientQuery(''); setRegistrationStep(1); }}>+ Register Family</div>
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
              <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                
                {/* Stepper Header */}
                <div style={{ display: 'flex', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', flexShrink: 0 }}>
                  {[1, 2, 3].map(step => (
                    <div key={step} style={{ flex: 1, display: 'flex', alignItems: 'center', opacity: registrationStep === step ? 1 : 0.5, cursor: registrationStep > step ? 'pointer' : 'default' }} onClick={() => { if (registrationStep > step) setRegistrationStep(step); }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: registrationStep >= step ? '#3B82F6' : '#CBD5E1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', zIndex: 2 }}>{step}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: registrationStep >= step ? '#0F172A' : '#64748B', marginLeft: '8px', zIndex: 2 }}>
                        {step === 1 ? 'Patient Info' : step === 2 ? 'Visit Details' : 'Billing & Extras'}
                      </div>
                      {step !== 3 && <div style={{ flex: 1, height: '2px', background: registrationStep > step ? '#3B82F6' : '#E2E8F0', margin: '0 16px' }} />}
                    </div>
                  ))}
                </div>

                {/* Scrollable Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  
                  {/* SECTION 1: Patient Information */}
                  {registrationStep === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Full Name <span style={{color: '#EF4444'}}>*</span></label>
                          <input type="text" placeholder="e.g. Ramesh Mehta" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Gender <span style={{color: '#EF4444'}}>*</span></label>
                          <select style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A' }} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={isExistingPatient}>
                            <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Age (Yrs) <span style={{color: '#EF4444'}}>*</span></label>
                          <input type="number" placeholder="e.g. 45" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A' }} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} readOnly={isExistingPatient} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Mobile Number <span style={{color: '#EF4444'}}>*</span></label>
                          <input type="text" placeholder="e.g. 9876543210" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A' }} value={formData.contact} onChange={e => { const val = e.target.value.replace(/\D/g, '').substring(0, 10); setFormData({...formData, contact: val}); }} readOnly={isExistingPatient} />
                        </div>
                        {bookingType === 'lab' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Referred By</label>
                            <input type="text" placeholder="e.g. Dr. Shah or Self" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.referredBy || ''} onChange={e => setFormData({...formData, referredBy: e.target.value})} readOnly={isExistingPatient} />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Blood Group</label>
                            <select style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} disabled={isExistingPatient}>
                              <option value="">Select</option><option value="O+">O +ve</option><option value="O-">O -ve</option><option value="A+">A +ve</option><option value="A-">A -ve</option><option value="B+">B +ve</option><option value="B-">B -ve</option><option value="AB+">AB +ve</option><option value="AB-">AB -ve</option>
                            </select>
                          </div>
                        )}
                        {bookingType !== 'lab' && bookingType !== 'service' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Email</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input type="text" placeholder="patient@email.com" style={{ height: '34px', flex: 1, minWidth: 0, fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: (isExistingPatient || otpVerified) ? '#F8FAFC' : 'white' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} readOnly={isExistingPatient || otpVerified} />
                              {!isExistingPatient && !otpVerified && (
                                <button type="button" style={{ height: '34px', padding: '0 12px', borderRadius: '6px', background: '#3B82F6', color: 'white', border: 'none', fontWeight: 600, fontSize: '12px' }} onClick={handleSendOtp} disabled={sendingOtp}>{sendingOtp ? '...' : 'Verify'}</button>
                              )}
                              {!isExistingPatient && otpVerified && (
                                <div style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', background: '#ECFDF5', color: '#10B981', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>Verified</div>
                              )}
                            </div>
                          </div>
                        )}

                        {bookingType !== 'lab' && bookingType !== 'service' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Residential Address</label>
                            <input type="text" placeholder="e.g. Flat 101, Green Park, Main Road" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} readOnly={isExistingPatient} />
                          </div>
                        )}

                        {bookingType !== 'lab' && bookingType !== 'service' && (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Medical History</label>
                              <input type="text" placeholder="e.g. Hypertension, Diabetes" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white' }} value={formData.medicalHistory} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} readOnly={isExistingPatient} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Allergies</label>
                              <input type="text" placeholder="e.g. Penicillin" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white' }} value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Current Medications</label>
                              <input type="text" placeholder="e.g. Metformin 500mg" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white' }} value={formData.currentMedications} onChange={e => setFormData({...formData, currentMedications: e.target.value})} />
                            </div>
                          </>
                        )}
                        
                        {!isExistingPatient && otpSent && !otpVerified && (
                          <div style={{ gridColumn: '1 / -1', background: '#FEF2F2', border: '1px dashed #FCA5A5', borderRadius: '6px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B', margin: 0 }}>Enter OTP sent to {formData.email}:</label>
                            <input type="text" maxLength={6} placeholder="######" style={{ width: '100px', height: '34px', textAlign: 'center', fontSize: '14px', fontWeight: 700, letterSpacing: '2px', borderRadius: '4px', border: '1px solid #FCA5A5' }} value={verificationOtp} onChange={e => setVerificationOtp(e.target.value.replace(/\D/g, ''))} />
                            <button type="button" style={{ height: '34px', borderRadius: '4px', fontWeight: 600, padding: '0 16px', background: '#10B981', color: 'white', border: 'none', cursor: otpVerifying ? 'not-allowed' : 'pointer', fontSize: '12px' }} onClick={handleVerifyOtp} disabled={otpVerifying}>{otpVerifying ? '...' : 'Verify'}</button>
                            <button type="button" style={{ background: 'transparent', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onClick={handleSendOtp}>Resend</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: Registration & Visit Details */}
                  {registrationStep === 2 && bookingType === 'opd' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Symptoms <span style={{color: '#EF4444'}}>*</span></label>
                          <div className="custom-dropdown-container" ref={symptomDropdownRef}>
                            <div className="custom-dropdown-trigger" onClick={() => !reschedulingAppointment && setSymptomDropdownOpen(!symptomDropdownOpen)} style={{ minHeight: '34px', padding: '4px 10px', background: reschedulingAppointment ? '#F8FAFC' : 'white', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: reschedulingAppointment ? 'not-allowed' : 'pointer' }}>
                              <div className="selected-items" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', width: '100%' }}>
                                {selectedSymptoms.map(s => (
                                  <div key={s} style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {s} <span onClick={(e) => { e.stopPropagation(); if (!reschedulingAppointment) toggleSymptom(s); }} style={{ cursor: 'pointer', display: 'flex' }}><i data-lucide="x" style={{ width: '10px', height: '10px' }}></i></span>
                                  </div>
                                ))}
                                <input type="text" placeholder={selectedSymptoms.length === 0 ? "Search..." : ""} value={symptomSearchQuery} onChange={e => { setSymptomSearchQuery(e.target.value); if (!symptomDropdownOpen) setSymptomDropdownOpen(true); }} onClick={e => { e.stopPropagation(); setSymptomDropdownOpen(true); }} disabled={!!reschedulingAppointment} style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: '80px', fontSize: '13px', padding: '2px 0' }} />
                              </div>
                            </div>
                            {symptomDropdownOpen && (
                              <div className="dropdown-options-box show" style={{ border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px', background: 'white', zIndex: 10, padding: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                                {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).map(s => (
                                  <div key={s} onClick={() => { toggleSymptom(s); setSymptomSearchQuery(''); }} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '12px', borderRadius: '4px' }}>{s}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Select Doctor <span style={{color: '#EF4444'}}>*</span></label>
                          <select style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: reschedulingAppointment ? '#F8FAFC' : 'white', color: '#0F172A' }} value={formData.doctorId} onChange={e => { setFormData({...formData, doctorId: e.target.value}); setSelectedSlot(''); }} disabled={!!reschedulingAppointment}>
                            <option value="">-- Choose Doctor --</option>
                            {doctors.map(doc => (<option key={doc._id} value={doc._id}>{doc.name}</option>))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Appointment Date <span style={{color: '#EF4444'}}>*</span></label>
                          <input type="date" style={{ height: '34px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', color: '#0F172A' }} value={bookingDate} min={getLocalDateString()} onChange={e => { setBookingDate(e.target.value); setSelectedSlot(''); }} />
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>Available Time Slots</label>
                        {formData.doctorId && bookingDate && !receptionDoctorAvailability.available && (
                          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="x-circle" style={{ width: '14px', color: '#DC2626' }}></i></div>
                            <div><div style={{ fontSize: '12px', fontWeight: 800, color: '#991B1B' }}>Doctor Unavailable</div><div style={{ fontSize: '11px', color: '#B91C1C' }}>{receptionDoctorAvailability.reason === 'Weekly Off' ? `Weekly off (${receptionDoctorAvailability.weeklyOff || 'this day'}). Please select a different date.` : `On ${receptionDoctorAvailability.leaveType || ''} leave. Please select a different date.`}</div></div>
                          </div>
                        )}
                        {(!formData.doctorId || !bookingDate) ? (
                          <div style={{ padding: '16px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', textAlign: 'center', color: '#64748B', fontSize: '12px', fontWeight: 600 }}>Select a Doctor and Date to view slots.</div>
                        ) : receptionDoctorAvailability.available && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', overflowY: 'auto', maxHeight: '180px', alignContent: 'flex-start' }}>
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
                                  <div key={time} onClick={() => { if (!isFull) setSelectedSlot(time); }} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 600, cursor: isFull ? 'not-allowed' : 'pointer', background: isSelected ? '#3B82F6' : (isFull ? '#F1F5F9' : 'white'), color: isSelected ? 'white' : (isFull ? '#94A3B8' : '#334155') }}>
                                      {displayTime} {isFull && <span style={{ fontSize: '10px', color: '#EF4444', display: 'block' }}>(Full)</span>}
                                  </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SECTION 3: Additional Details & Billing */}
                  {registrationStep === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Vitals */}
                        <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', background: '#F8FAFC' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i data-lucide="activity" style={{ width: '14px', color: '#2563EB' }}></i> Patient Vitals <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>(Optional)</span>
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input type="number" step="0.1" placeholder="TEMP (°F)" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} />
                            <input type="number" placeholder="PULSE (bpm)" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} />
                            <input type="number" placeholder="BP SYS (mmHg)" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalBpSys} onChange={e => setVitalBpSys(e.target.value)} />
                            <input type="number" placeholder="BP DIA (mmHg)" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalBpDia} onChange={e => setVitalBpDia(e.target.value)} />
                            <input type="number" step="0.1" placeholder="WEIGHT (kg)" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalWeight} onChange={e => setVitalWeight(e.target.value)} />
                            <input type="number" placeholder="HEIGHT (cm)" style={{ height: '30px', fontSize: '12px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalHeight} onChange={e => setVitalHeight(e.target.value)} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Consent */}
                          <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', background: '#F8FAFC' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i data-lucide="shield-check" style={{ width: '14px', color: '#64748B' }}></i> Patient Consent
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} style={{ width: '14px', height: '14px' }} />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>EMR Creation (Mandatory)</span>
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} style={{ width: '14px', height: '14px' }} />
                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>Data Sharing (Research)</span>
                              </label>
                            </div>
                          </div>

                          {/* Billing & Payment */}
                          <div style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', background: '#F8FAFC', flex: 1 }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>Billing Summary</h3>
                            {(() => {
                              const subtotalVal = getBillingItems().reduce((sum, item) => sum + item.amount, 0) + ((!isExistingPatient && getBillingItems().length > 0) ? 50 : 0);
                              const discAmt = (subtotalVal * Number(bookingDiscountPercent || 0)) / 100;
                              const finalTotalVal = Math.max(0, subtotalVal - discAmt);
                              return (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '10px', borderTop: '2px solid #E2E8F0', paddingTop: '10px', fontWeight: 800, color: '#0F172A' }}>
                                    <span>Total Amount</span><span>₹{finalTotalVal.toFixed(2)}</span>
                                  </div>
                                  <div style={{ marginTop: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#475569' }}>Payment Method</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                      {['Cash', 'UPI', 'Other'].map(method => (
                                        <div key={method} onClick={() => setBookingPaymentMethod(method)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '4px', cursor: 'pointer', border: bookingPaymentMethod === method ? '2px solid #2563EB' : '1px solid #CBD5E1', background: bookingPaymentMethod === method ? '#EFF6FF' : 'white', color: bookingPaymentMethod === method ? '#2563EB' : '#475569', fontWeight: 600, fontSize: '12px' }}>{method}</div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
                  <button type="button" onClick={() => { if (registrationStep > 1) setRegistrationStep(registrationStep - 1); else { setSelectedPatient(null); setIsExistingPatient(null); setFormData({name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: ''}); } }} style={{ height: '38px', padding: '0 20px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i data-lucide="arrow-left" style={{ width: '16px' }}></i> Back
                  </button>
                  {registrationStep < 3 ? (
                    <button type="button" onClick={() => setRegistrationStep(registrationStep + 1)} style={{ height: '38px', padding: '0 24px', borderRadius: '6px', border: 'none', background: '#2563EB', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Next <i data-lucide="arrow-right" style={{ width: '16px' }}></i>
                    </button>
                  ) : (
                    <button type="button" onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading} style={{ height: '38px', padding: '0 24px', borderRadius: '6px', border: 'none', background: '#10B981', color: 'white', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i data-lucide={reschedulingAppointment ? "calendar-days" : "check-circle"} style={{ width: '16px' }}></i> {loading ? 'Processing...' : (reschedulingAppointment ? 'Confirm Reschedule' : 'Complete Registration')}
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
