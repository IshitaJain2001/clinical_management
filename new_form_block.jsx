        {/* REGISTRATION FORM TAB */}
        {activeTab === 'registration-form' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', paddingBottom: '40px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Registration and appointment</h1>
            </div>

            {isExistingPatient === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px', marginBottom: '40px' }}>
                <div className="glass-card" style={{ width: '560px', padding: '40px', borderRadius: '16px', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i data-lucide="user" style={{ width: '26px', height: '26px' }}></i>
                    </div>
                    <div>
                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Registered Patient</h2>
                      <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500 }}>Search and select an existing patient to book an appointment.</p>
                    </div>
                  </div>
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <input type="text" className="form-control" placeholder="Search by Patient ID or Phone Number" style={{ height: '46px', paddingRight: '48px', paddingLeft: '16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} value={searchPatientQuery} onChange={e => setSearchPatientQuery(e.target.value)} />
                    <i data-lucide="search" style={{ position: 'absolute', right: '16px', top: '13px', color: '#94A3B8', width: '20px', height: '20px' }}></i>
                  </div>
                  {searchPatientQuery.trim().length > 0 && (
                    <div data-lenis-prevent style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC', marginBottom: '20px' }}>
                      {patientsList.filter(p => { const q = searchPatientQuery.toLowerCase(); return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q); }).length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setSelectedPatient(null); const isNumeric = /^\d+$/.test(searchPatientQuery.trim()); setFormData({ name: !isNumeric ? searchPatientQuery : '', age: '', gender: '', contact: isNumeric ? searchPatientQuery : '', email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: '' }); setIsExistingPatient(false); setSearchPatientQuery(''); }}>
                          <div style={{ marginBottom: '4px' }}>No matching patients found.</div>
                          <div style={{ color: '#10B981', fontWeight: 700 }}>Click here to register a new patient &rarr;</div>
                        </div>
                      ) : (
                        patientsList.filter(p => { const q = searchPatientQuery.toLowerCase(); return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q); }).map(p => (
                          <div key={p._id} style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => { setSelectedPatient(p); setFormData({ name: p.name, age: p.age, gender: p.gender, contact: p.contact, email: p.email || '', bloodGroup: p.bloodGroup || 'O+', address: p.address || '', medicalHistory: p.medicalHistory ? p.medicalHistory.join(', ') : '', doctorId: formData.doctorId, allergies: p.allergies || 'None', currentMedications: p.currentMedications || '' }); setIsExistingPatient(true); }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '14px', color: '#1A1D23' }}>{p.name}</div>
                              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>#{p._id.substring(18).toUpperCase()} • {p.gender} • {p.age} Yrs</div>
                              <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, marginTop: '6px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); setFormData({ name: '', age: '', gender: '', contact: p.contact, email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: '' }); setIsExistingPatient(false); setSearchPatientQuery(''); }}>+ Register Family</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>{p.contact}</div>
                              <span style={{ fontSize: '11px', background: '#EFF6FF', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginTop: '4px' }}>Select</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* SECTION 1: Patient Information */}
                <div className="glass-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>1</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Patient Information</h2>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px' }}>
                    {/* Full Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Full Name <span style={{color: '#EF4444'}}>*</span></label>
                      <input type="text" placeholder="e.g. Ramesh Mehta" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />
                    </div>
                    
                    {/* Gender */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Gender <span style={{color: '#EF4444'}}>*</span></label>
                      <select style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={isExistingPatient}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Age */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Age (Yrs) <span style={{color: '#EF4444'}}>*</span></label>
                      <input type="number" placeholder="e.g. 45" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} readOnly={isExistingPatient} />
                    </div>

                    {/* Mobile */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Mobile Number <span style={{color: '#EF4444'}}>*</span></label>
                      <input type="text" placeholder="e.g. 9876543210" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.contact} onChange={e => { const val = e.target.value.replace(/\D/g, '').substring(0, 10); setFormData({...formData, contact: val}); }} readOnly={isExistingPatient} />
                    </div>

                    {/* Blood Group / Referred By */}
                    {bookingType === 'lab' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Referred By</label>
                        <input type="text" placeholder="e.g. Dr. Shah or Self" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.referredBy || ''} onChange={e => setFormData({...formData, referredBy: e.target.value})} readOnly={isExistingPatient} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Blood Group</label>
                        <select style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} disabled={isExistingPatient}>
                          <option value="">Select</option>
                          <option value="O+">O +ve</option><option value="O-">O -ve</option><option value="A+">A +ve</option><option value="A-">A -ve</option><option value="B+">B +ve</option><option value="B-">B -ve</option><option value="AB+">AB +ve</option><option value="AB-">AB -ve</option>
                        </select>
                      </div>
                    )}

                    {/* Email */}
                    {bookingType !== 'lab' && bookingType !== 'service' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Email</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" placeholder="patient@email.com" style={{ height: '38px', flex: 1, fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: (isExistingPatient || otpVerified) ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} readOnly={isExistingPatient || otpVerified} />
                          {!isExistingPatient && !otpVerified && (
                            <button type="button" style={{ height: '38px', padding: '0 16px', borderRadius: '6px', background: '#3B82F6', color: 'white', border: 'none', fontWeight: 600, cursor: sendingOtp ? 'not-allowed' : 'pointer' }} onClick={handleSendOtp} disabled={sendingOtp}>{sendingOtp ? '...' : 'Verify'}</button>
                          )}
                          {!isExistingPatient && otpVerified && (
                            <div style={{ height: '38px', display: 'flex', alignItems: 'center', padding: '0 12px', background: '#ECFDF5', color: '#10B981', borderRadius: '6px', fontWeight: 600, fontSize: '13px' }}><i data-lucide="check-circle" style={{width:'16px', marginRight:'6px'}}></i> Verified</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    {bookingType !== 'lab' && bookingType !== 'service' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Residential Address</label>
                        <input type="text" placeholder="e.g. Flat 101, Green Park, Main Road" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} readOnly={isExistingPatient} />
                      </div>
                    )}

                    {/* Medical History */}
                    {bookingType !== 'lab' && bookingType !== 'service' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Medical History</label>
                          <input type="text" placeholder="e.g. Hypertension, Diabetes" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.medicalHistory} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} readOnly={isExistingPatient} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Allergies</label>
                          <input type="text" placeholder="e.g. Penicillin" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', color: '#0F172A', fontWeight: 500 }} value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Current Medications</label>
                          <input type="text" placeholder="e.g. Metformin 500mg" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', color: '#0F172A', fontWeight: 500 }} value={formData.currentMedications} onChange={e => setFormData({...formData, currentMedications: e.target.value})} />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* OTP Verification Block */}
                  {!isExistingPatient && otpSent && !otpVerified && (
                    <div style={{ background: '#FEF2F2', border: '1px dashed #FCA5A5', borderRadius: '8px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B', margin: 0 }}>Enter OTP sent to {formData.email}:</label>
                      <input type="text" maxLength={6} placeholder="######" style={{ width: '120px', height: '38px', textAlign: 'center', fontSize: '16px', fontWeight: 700, letterSpacing: '4px', borderRadius: '6px', border: '1px solid #FCA5A5' }} value={verificationOtp} onChange={e => setVerificationOtp(e.target.value.replace(/\D/g, ''))} />
                      <button type="button" style={{ height: '38px', borderRadius: '6px', fontWeight: 600, padding: '0 20px', background: '#10B981', color: 'white', border: 'none', cursor: otpVerifying ? 'not-allowed' : 'pointer' }} onClick={handleVerifyOtp} disabled={otpVerifying}>{otpVerifying ? 'Verifying...' : 'Verify OTP'}</button>
                      <button type="button" style={{ background: 'transparent', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }} onClick={handleSendOtp}>Resend</button>
                    </div>
                  )}
                </div>

                {/* SECTION 2: Registration & Visit Details */}
                {bookingType === 'opd' && (
                  <div className="glass-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F3FF', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>2</div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Registration & Visit Details</h2>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6', background: '#F5F3FF', padding: '6px 12px', borderRadius: '20px', border: '1px solid #DDD6FE' }}>Multi-Appointment Enabled</span>
                    </div>

                    {additionalApptsList.length > 0 && (
                      <div style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Queued Appointments for Patient ({additionalApptsList.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {additionalApptsList.map((appt, idx) => (
                            <div key={appt.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>{idx + 1}</div>
                                <div><div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{appt.doctorName}</div><div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{appt.date} • {appt.time.split('(Limit')[0].trim()} • Fee: ₹{appt.fee}</div></div>
                              </div>
                              <button type="button" onClick={() => setAdditionalApptsList(additionalApptsList.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}><i data-lucide="trash-2" style={{ width: '16px' }}></i></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px', marginBottom: '24px' }}>
                      {/* Symptoms */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Symptoms <span style={{color: '#EF4444'}}>*</span></label>
                        <div className="custom-dropdown-container" ref={symptomDropdownRef}>
                          <div className="custom-dropdown-trigger" onClick={() => !reschedulingAppointment && setSymptomDropdownOpen(!symptomDropdownOpen)} style={{ minHeight: '38px', padding: '4px 12px', background: reschedulingAppointment ? '#F8FAFC' : 'white', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: reschedulingAppointment ? 'not-allowed' : 'pointer' }}>
                            <div className="selected-items" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', width: '100%' }}>
                              {selectedSymptoms.map(s => (
                                <div key={s} className="symptom-tag" style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {s} <span onClick={(e) => { e.stopPropagation(); if (!reschedulingAppointment) toggleSymptom(s); }} style={{ cursor: 'pointer', display: 'flex' }}><i data-lucide="x" style={{ width: '12px', height: '12px' }}></i></span>
                                </div>
                              ))}
                              <input type="text" placeholder={selectedSymptoms.length === 0 ? "Search symptoms..." : ""} value={symptomSearchQuery} onChange={e => { setSymptomSearchQuery(e.target.value); if (!symptomDropdownOpen) setSymptomDropdownOpen(true); }} onClick={e => { e.stopPropagation(); setSymptomDropdownOpen(true); }} disabled={!!reschedulingAppointment} style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: '120px', fontSize: '14px', padding: '4px 0' }} />
                            </div>
                            <i data-lucide="chevron-down" style={{ width: '18px', color: '#94A3B8' }}></i>
                          </div>
                          {symptomDropdownOpen && (
                            <div className="dropdown-options-box show" style={{ border: '1px solid #CBD5E1', borderRadius: '6px', marginTop: '4px', background: 'white', zIndex: 10, padding: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                              {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).map(s => (
                                <div key={s} className="option-item" onClick={() => { toggleSymptom(s); setSymptomSearchQuery(''); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }}>{s}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Doctor */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Select Doctor <span style={{color: '#EF4444'}}>*</span></label>
                        <select style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: reschedulingAppointment ? '#F8FAFC' : 'white', color: '#0F172A', fontWeight: 500 }} value={formData.doctorId} onChange={e => { setFormData({...formData, doctorId: e.target.value}); setSelectedSlot(''); }} disabled={!!reschedulingAppointment}>
                          <option value="">-- Choose Doctor --</option>
                          {doctors.map(doc => (<option key={doc._id} value={doc._id}>{doc.name}</option>))}
                        </select>
                      </div>

                      {/* Date */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Appointment Date <span style={{color: '#EF4444'}}>*</span></label>
                        <input type="date" style={{ height: '38px', fontSize: '14px', padding: '0 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: 'white', color: '#0F172A', fontWeight: 500 }} value={bookingDate} min={getLocalDateString()} onChange={e => { setBookingDate(e.target.value); setSelectedSlot(''); }} />
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#0F172A' }}>Available Time Slots</label>
                      {formData.doctorId && bookingDate && !receptionDoctorAvailability.available && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '14px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="x-circle" style={{ width: '16px', color: '#DC2626' }}></i></div>
                          <div><div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>Doctor Unavailable</div><div style={{ fontSize: '12px', color: '#B91C1C' }}>{receptionDoctorAvailability.reason === 'Weekly Off' ? `Weekly off (${receptionDoctorAvailability.weeklyOff || 'this day'}). Please select a different date.` : `On ${receptionDoctorAvailability.leaveType || ''} leave. Please select a different date.`}</div></div>
                        </div>
                      )}
                      {(!formData.doctorId || !bookingDate) ? (
                        <div style={{ padding: '20px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '8px', textAlign: 'center', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Please select a Doctor and Appointment Date to view available slots.</div>
                      ) : receptionDoctorAvailability.available && (
                        <div className="slot-scroll-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
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
                                    const appDateStr = new Date(app.date).toDateString();
                                    if (appDateStr !== targetDateStr) return false;
                                    return cleanTimeSlotStr(app.time) === targetTimeClean;
                                }).length;
                            }
                            const isFull = bookedCount >= limit;
                            const isSelected = selectedSlot === time;
                            const displayTime = time.split(/\(Limit:/i)[0].trim();
                            return (
                                <div key={time} className={`time-slot ${isSelected ? 'selected' : ''} ${isFull ? 'full' : ''}`} onClick={() => { if (!isFull) setSelectedSlot(time); }} style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, cursor: isFull ? 'not-allowed' : 'pointer', background: isSelected ? '#3B82F6' : (isFull ? '#F1F5F9' : 'white'), color: isSelected ? 'white' : (isFull ? '#94A3B8' : '#334155'), transition: 'all 0.2s' }}>
                                    {displayTime} {isFull && <span style={{ fontSize: '11px', color: '#EF4444', display: 'block', marginTop: '2px' }}>(Full)</span>}
                                </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SECTION 3: Additional Details & Billing */}
                <div className="glass-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>3</div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Additional Details & Billing</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                    {/* Vitals and Documents row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                      {/* Vitals */}
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', background: '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setVitalsCollapsed(!vitalsCollapsed)}>
                          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i data-lucide="activity" style={{ width: '16px', color: '#2563EB' }}></i> Patient Vitals <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>(Optional)</span>
                          </h3>
                          <i data-lucide={vitalsCollapsed ? "chevron-down" : "chevron-up"} style={{ width: '18px', color: '#64748B' }}></i>
                        </div>
                        {!vitalsCollapsed && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>TEMP (°F)</label>
                              <input type="number" step="0.1" style={{ height: '32px', fontSize: '13px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>PULSE (bpm)</label>
                              <input type="number" style={{ height: '32px', fontSize: '13px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>BP SYS (mmHg)</label>
                              <input type="number" style={{ height: '32px', fontSize: '13px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalBpSys} onChange={e => setVitalBpSys(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>BP DIA (mmHg)</label>
                              <input type="number" style={{ height: '32px', fontSize: '13px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalBpDia} onChange={e => setVitalBpDia(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>WEIGHT (kg)</label>
                              <input type="number" step="0.1" style={{ height: '32px', fontSize: '13px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalWeight} onChange={e => setVitalWeight(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>HEIGHT (cm)</label>
                              <input type="number" style={{ height: '32px', fontSize: '13px', padding: '0 8px', borderRadius: '4px', border: '1px solid #CBD5E1' }} value={vitalHeight} onChange={e => setVitalHeight(e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Documents */}
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', background: '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setDocsCollapsed(!docsCollapsed)}>
                          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i data-lucide="folder-plus" style={{ width: '16px', color: '#8B5CF6' }}></i> Documents <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>(Optional)</span>
                          </h3>
                          <i data-lucide={docsCollapsed ? "chevron-down" : "chevron-up"} style={{ width: '18px', color: '#64748B' }}></i>
                        </div>
                        {!docsCollapsed && (
                          <div style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <select className="form-control" value={newDocType} onChange={e => setNewDocType(e.target.value)} style={{ width: '100%', height: '32px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '13px' }}>
                                <option value="Aadhar / Voter Card">Aadhar / Voter Card</option><option value="Ultrasound Report">Ultrasound Report</option><option value="Consent Form (e.g. HIV)">Consent Form (e.g. HIV)</option><option value="Patient Photo">Patient Photo</option><option value="Other">Other</option>
                              </select>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="file" id="patient-doc-upload" className="form-control" style={{ flex: 1, padding: '4px', height: '32px', fontSize: '12px', borderRadius: '4px' }} />
                                <button type="button" onClick={() => { const fileInput = document.getElementById('patient-doc-upload'); if (fileInput.files.length > 0) { setPatientDocuments([...patientDocuments, { type: newDocType, name: fileInput.files[0].name, size: (fileInput.files[0].size / 1024).toFixed(1) + ' KB' }]); fileInput.value = ''; } else { showToast('Please select a file to upload', 'error'); } }} style={{ padding: '0 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', height: '32px' }}>Add</button>
                              </div>
                            </div>
                            {patientDocuments.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                {patientDocuments.map((doc, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><i data-lucide="file-text" style={{ width: '14px', color: '#64748B' }}></i><div><div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{doc.name}</div><div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>{doc.type}</div></div></div>
                                    <button type="button" onClick={() => setPatientDocuments(patientDocuments.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><i data-lucide="trash-2" style={{ width: '14px' }}></i></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patient Consent */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', background: '#F8FAFC' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i data-lucide="shield-check" style={{ width: '16px', color: '#64748B' }}></i> Patient Consent
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>Consent for EMR Records Creation (Mandatory for Consultation)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>Consent for De-identified Data Sharing (Research / Analytics)</span>
                        </label>
                      </div>
                    </div>

                    {/* Billing & Payment */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '16px' }}>
                      <div className="billing-summary" style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', background: '#F8FAFC' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Billing Summary</h3>
                        {(() => {
                          const subtotalVal = getBillingItems().reduce((sum, item) => sum + item.amount, 0) + ((!isExistingPatient && getBillingItems().length > 0) ? 50 : 0);
                          const discAmt = (subtotalVal * Number(bookingDiscountPercent || 0)) / 100;
                          const finalTotalVal = Math.max(0, subtotalVal - discAmt);
                          return (
                            <div>
                              {getBillingItems().map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#475569' }}><span>{item.description}</span><span style={{ fontWeight: 600 }}>₹{Number(item.amount).toFixed(2)}</span></div>
                              ))}
                              {!isExistingPatient && getBillingItems().length > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#475569' }}><span>Registration Fee</span><span style={{ fontWeight: 600 }}>₹50.00</span></div>}
                              
                              <div style={{ marginTop: '16px', borderTop: '1px dashed #CBD5E1', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Discount (%)</label>
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '90px' }}>
                                    <input type="number" min="0" max={allowedDiscountPercent} value={bookingDiscountPercent || ''} onChange={e => setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))} style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 24px 0 8px', fontSize: '13px', fontWeight: 600, textAlign: 'right' }} />
                                    <span style={{ position: 'absolute', right: '8px', fontWeight: 600, color: '#64748B', fontSize: '12px' }}>%</span>
                                  </div>
                                </div>
                                {bookingDiscountPercent > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                    <input type="text" placeholder="Discount Reason (e.g. Senior Citizen)" value={bookingDiscountReason} onChange={e => setBookingDiscountReason(e.target.value)} style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #FCA5A5', padding: '0 12px', fontSize: '12px', background: '#FFF5F5', color: '#991B1B' }} required />
                                  </div>
                                )}
                              </div>
                              {bookingDiscountPercent > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#DC2626', fontWeight: 600 }}><span>Discount Applied ({bookingDiscountPercent}%)</span><span>-₹{discAmt.toFixed(2)}</span></div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginTop: '16px', borderTop: '2px solid #E2E8F0', paddingTop: '16px', fontWeight: 800, color: '#0F172A' }}>
                                <span>Total Amount</span><span>₹{finalTotalVal.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#0F172A' }}>Payment Method</label>
                          {reschedulingAppointment ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ECFDF5', color: '#065F46', padding: '12px 20px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', border: '1px solid #A7F3D0' }}>Paid (Original Payment Preserved)</div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                              {['Cash', 'UPI', 'Other'].map(method => (
                                <div key={method} onClick={() => setBookingPaymentMethod(method)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', cursor: 'pointer', border: bookingPaymentMethod === method ? '2px solid #2563EB' : '1px solid #CBD5E1', background: bookingPaymentMethod === method ? '#EFF6FF' : 'white', color: bookingPaymentMethod === method ? '#2563EB' : '#475569', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}>
                                  {method}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Final Submit Button */}
                        <div style={{ marginTop: 'auto' }}>
                          <button className="btn btn-primary" style={{ width: '100%', height: '54px', fontWeight: 800, fontSize: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading}>
                            <i data-lucide={reschedulingAppointment ? "calendar-days" : (bookingType === 'lab' ? "flask-conical" : bookingType === 'service' ? "sparkles" : "qr-code")}></i> 
                            {loading ? 'Processing...' : (reschedulingAppointment ? 'Confirm Reschedule' : 'Confirm & Register')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
