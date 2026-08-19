        {/* REGISTRATION FORM TAB */}
        {activeTab === 'registration-form' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.3s ease-out', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#F1F5F9', padding: '12px', overflow: 'hidden', boxSizing: 'border-box' }}>
            
            {isExistingPatient === null ? (
              // ==========================================
              // INITIAL SEARCH SCREEN (Before Form Opens)
              // ==========================================
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, background: 'white', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '560px', padding: '40px', borderRadius: '16px', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
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
              // ==========================================
              // ACTUAL DENSE FORM LAYOUT
              // ==========================================
              <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                
                {/* Header / Title Bar */}
                <div style={{ background: '#F8FAFC', padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i data-lucide="clipboard-list" style={{ width: '16px', height: '16px' }}></i>
                  </div>
                  <h1 style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A', margin: 0 }}>New Registration & Appointment</h1>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>System Online</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flex: 1, minHeight: 0, background: '#FFFFFF' }}>
                  
                  {/* Main Form Area (Left) */}
                  <div style={{ flex: 1, padding: '16px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                    
                    {/* Patient Info Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)', gap: '8px 24px' }}>
                      {(() => {
                        const Field = ({ label, children }) => (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>{label}</div>
                            <div style={{ width: '12px', fontSize: '11.5px', color: '#94A3B8' }}>:</div>
                            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                          </div>
                        );
                        const inputStyle = { width: '100%', height: '26px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', outline: 'none' };
                        const selectStyle = { ...inputStyle, padding: '0 4px', cursor: isExistingPatient ? 'not-allowed' : 'pointer' };

                        return (
                          <>
                            <Field label="Mobile No."><input type="text" style={inputStyle} value={formData.contact} onChange={e => { const val = e.target.value.replace(/\D/g, '').substring(0, 10); setFormData({...formData, contact: val}); }} readOnly={isExistingPatient} /></Field>
                            <Field label="Patient Name"><input type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} /></Field>
                            <Field label="Gender">
                              <select style={selectStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={isExistingPatient}>
                                <option value="">--Select--</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                              </select>
                            </Field>

                            <Field label="Age (Yrs)"><input type="number" style={inputStyle} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} readOnly={isExistingPatient} /></Field>
                            <Field label="Email">
                              <input type="text" style={{...inputStyle, background: (isExistingPatient || otpVerified) ? '#F8FAFC' : 'white'}} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} readOnly={isExistingPatient || otpVerified} />
                              {!isExistingPatient && !otpVerified && <button type="button" onClick={handleSendOtp} style={{ height: '26px', fontSize: '11px', marginLeft: '6px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '0 10px', fontWeight: 600, cursor: 'pointer' }}>Verify</button>}
                            </Field>
                            {bookingType === 'lab' ? (
                              <Field label="Referred By"><input type="text" style={inputStyle} value={formData.referredBy || ''} onChange={e => setFormData({...formData, referredBy: e.target.value})} readOnly={isExistingPatient} /></Field>
                            ) : (
                              <Field label="Blood Group">
                                <select style={selectStyle} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} disabled={isExistingPatient}>
                                  <option value="">--Select--</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                                </select>
                              </Field>
                            )}

                            <div style={{ gridColumn: 'span 2' }}>
                              <Field label="Address"><input type="text" style={inputStyle} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} readOnly={isExistingPatient} /></Field>
                            </div>
                            <Field label="Medical Hist."><input type="text" style={inputStyle} value={formData.medicalHistory} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} readOnly={isExistingPatient} /></Field>
                            
                            <Field label="Allergies"><input type="text" style={{...inputStyle, background: 'white'}} value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} /></Field>
                            <div style={{ gridColumn: 'span 2' }}>
                              <Field label="Current Meds."><input type="text" style={{...inputStyle, background: 'white'}} value={formData.currentMedications} onChange={e => setFormData({...formData, currentMedications: e.target.value})} /></Field>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }}></div>

                    {/* Visit & Appointment Details */}
                    {bookingType === 'opd' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)', gap: '8px 24px' }}>
                        {(() => {
                          const Field = ({ label, children }) => (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ width: '100px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>{label}</div>
                              <div style={{ width: '12px', fontSize: '11.5px', color: '#94A3B8' }}>:</div>
                              <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                            </div>
                          );
                          const inputStyle = { width: '100%', height: '26px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', background: 'white', color: '#0F172A', outline: 'none' };

                          return (
                            <>
                              <Field label="Symptoms">
                                <input type="text" style={inputStyle} placeholder="Type & press Enter..." value={symptomSearchQuery} onChange={e => setSymptomSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && symptomSearchQuery.trim()) { toggleSymptom(symptomSearchQuery.trim()); setSymptomSearchQuery(''); } }} disabled={!!reschedulingAppointment} />
                              </Field>
                              <Field label="Doctor">
                                <select style={inputStyle} value={formData.doctorId} onChange={e => { setFormData({...formData, doctorId: e.target.value}); setSelectedSlot(''); }} disabled={!!reschedulingAppointment}>
                                  <option value="">-- Choose Doctor --</option>
                                  {doctors.map(doc => (<option key={doc._id} value={doc._id}>{doc.name}</option>))}
                                </select>
                              </Field>
                              <Field label="Date">
                                <input type="date" style={inputStyle} value={bookingDate} min={getLocalDateString()} onChange={e => { setBookingDate(e.target.value); setSelectedSlot(''); }} disabled={!!reschedulingAppointment} />
                              </Field>
                            </>
                          );
                        })()}

                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap', minHeight: '24px', alignItems: 'center' }}>
                          {selectedSymptoms.length > 0 && <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginRight: '8px' }}>Added Symptoms:</span>}
                          {selectedSymptoms.map(s => (
                            <div key={s} style={{ background: '#F1F5F9', color: '#334155', padding: '4px 10px', fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                              {s} <span onClick={() => !reschedulingAppointment && toggleSymptom(s)} style={{ cursor: 'pointer', color: '#94A3B8', fontWeight: 'bold' }}>×</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', border: '1px dashed #CBD5E1', borderRadius: '8px', padding: '12px', background: '#F8FAFC', minHeight: '60px' }}>
                          <div style={{ width: '100px', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginTop: '6px' }}>Available Slots</div>
                          <div style={{ width: '12px', fontSize: '11.5px', color: '#94A3B8', marginTop: '6px' }}>:</div>
                          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(!formData.doctorId || !bookingDate) ? (
                              <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontStyle: 'italic' }}>Please select a doctor and date to view slots</span>
                            ) : !receptionDoctorAvailability.available ? (
                              <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600, marginTop: '4px' }}><i data-lucide="alert-circle" style={{ width: '14px', verticalAlign: 'middle', marginRight: '4px' }}></i>Doctor Unavailable ({receptionDoctorAvailability.reason || 'Leave'})</span>
                            ) : (
                              (receptionDoctorAvailability.slots || DEFAULT_RECEPTION_SLOTS).map(time => {
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
                                    <div key={time} onClick={() => { if (!isFull) setSelectedSlot(time); }} style={{ padding: '6px 12px', borderRadius: '6px', border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1', fontSize: '11.5px', fontWeight: 600, cursor: isFull ? 'not-allowed' : 'pointer', background: isSelected ? '#EFF6FF' : (isFull ? '#F1F5F9' : 'white'), color: isSelected ? '#1D4ED8' : (isFull ? '#94A3B8' : '#334155'), transition: 'all 0.15s ease' }}>
                                        {displayTime} {isFull && <span style={{ color: '#DC2626', marginLeft: '4px', fontSize: '10px' }}>(Full)</span>}
                                    </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ height: '1px', background: '#E2E8F0', margin: '4px 0' }}></div>

                    {/* Vitals and Consent */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)', gap: '8px 24px' }}>
                      {(() => {
                        const Field = ({ label, children }) => (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>{label}</div>
                            <div style={{ width: '12px', fontSize: '11.5px', color: '#94A3B8' }}>:</div>
                            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                          </div>
                        );
                        const inputStyle = { width: '100%', height: '26px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', background: 'white' };

                        return (
                          <>
                            <Field label="Temp (°F)"><input type="number" step="0.1" style={inputStyle} value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} /></Field>
                            <Field label="Pulse (bpm)"><input type="number" style={inputStyle} value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} /></Field>
                            <Field label="Weight (kg)"><input type="number" step="0.1" style={inputStyle} value={vitalWeight} onChange={e => setVitalWeight(e.target.value)} /></Field>
                            <Field label="BP Sys"><input type="number" style={inputStyle} value={vitalBpSys} onChange={e => setVitalBpSys(e.target.value)} /></Field>
                            <Field label="BP Dia"><input type="number" style={inputStyle} value={vitalBpDia} onChange={e => setVitalBpDia(e.target.value)} /></Field>
                            <Field label="Height (cm)"><input type="number" style={inputStyle} value={vitalHeight} onChange={e => setVitalHeight(e.target.value)} /></Field>
                            
                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '24px', alignItems: 'center', marginTop: '4px', background: '#F8FAFC', padding: '10px 16px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Patient Consent:</span>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#475569', fontWeight: 500 }}>
                                <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} style={{ width: '14px', height: '14px', accentColor: '#2563EB' }} /> EMR Records Creation
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#475569', fontWeight: 500 }}>
                                <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} style={{ width: '14px', height: '14px', accentColor: '#2563EB' }} /> Data Sharing (Research)
                              </label>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Bottom Billing Table Area */}
                    <div style={{ marginTop: 'auto', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                        
                        {/* Payment Details */}
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '12px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>Currency</div>
                            <div style={{ width: '12px', fontSize: '12px', color: '#94A3B8' }}>:</div>
                            <select style={{ height: '28px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', width: '120px', background: 'white' }}><option>INR (₹)</option></select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>Payment Mode</div>
                            <div style={{ width: '12px', fontSize: '12px', color: '#94A3B8' }}>:</div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              {['Cash', 'UPI', 'Other'].map(method => (
                                <label key={method} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500, color: '#475569' }}>
                                  <input type="radio" checked={bookingPaymentMethod === method} onChange={() => setBookingPaymentMethod(method)} name="paymode" style={{ accentColor: '#2563EB' }} /> {method}
                                </label>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>Discount (%)</div>
                            <div style={{ width: '12px', fontSize: '12px', color: '#94A3B8' }}>:</div>
                            <input type="number" min="0" max={allowedDiscountPercent} value={bookingDiscountPercent || ''} onChange={e => setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))} style={{ height: '28px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', width: '80px', textAlign: 'right', background: 'white' }} />
                          </div>
                        </div>

                        {/* Totals Summary */}
                        {(() => {
                          const subtotalVal = getBillingItems().reduce((sum, item) => sum + item.amount, 0) + ((!isExistingPatient && getBillingItems().length > 0) ? 50 : 0);
                          const discAmt = (subtotalVal * Number(bookingDiscountPercent || 0)) / 100;
                          const finalTotalVal = Math.max(0, subtotalVal - discAmt);
                          return (
                            <div style={{ width: '280px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '6px' }}><span>Gross Amount</span><span style={{ fontWeight: 600 }}>₹{subtotalVal.toFixed(2)}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#EF4444', marginBottom: '8px' }}><span>Discount Amount</span><span style={{ fontWeight: 600 }}>-₹{discAmt.toFixed(2)}</span></div>
                              <div style={{ borderTop: '1px dashed #CBD5E1', margin: '8px 0' }}></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}><span>Net Amount</span><span style={{ color: '#10B981' }}>₹{finalTotalVal.toFixed(2)}</span></div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>

                  {/* Action Sidebar (Right) */}
                  <div style={{ width: '220px', background: '#F8FAFC', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid #E2E8F0' }}>
                    
                    <div style={{ width: '100%', height: '160px', borderRadius: '8px', border: '2px dashed #CBD5E1', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                        <i data-lucide="camera" style={{ width: '24px', height: '24px', color: '#94A3B8' }}></i>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>No Image Available</span>
                    </div>
                    
                    <button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>
                    <button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>
                    
                    <div style={{ flex: 1 }}></div>

                    {!isExistingPatient && otpSent && !otpVerified && (
                      <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '8px', border: '1px solid #FECACA', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B', marginBottom: '6px' }}>Verify Mobile/Email OTP</div>
                        <input type="text" maxLength={6} placeholder="######" style={{ width: '100%', height: '30px', textAlign: 'center', border: '1px solid #FCA5A5', borderRadius: '4px', fontSize: '14px', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '8px' }} value={verificationOtp} onChange={e => setVerificationOtp(e.target.value.replace(/\D/g, ''))} />
                        <button type="button" onClick={handleVerifyOtp} disabled={otpVerifying} style={{ width: '100%', background: '#EF4444', color: 'white', border: 'none', padding: '8px 0', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>{otpVerifying ? 'Verifying...' : 'Submit OTP'}</button>
                      </div>
                    )}

                    <button type="button" onClick={() => { setSelectedPatient(null); setIsExistingPatient(null); setFormData({name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: ''}); }} style={{ width: '100%', padding: '10px 0', fontSize: '12px', fontWeight: 600, background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#E2E8F0'} onMouseOut={e => e.target.style.background = '#F1F5F9'}>Clear / Cancel</button>
                    
                    <button type="button" onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading} style={{ width: '100%', padding: '14px 0', fontSize: '14px', fontWeight: 800, background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)', transition: 'all 0.2s' }} onMouseOver={e => !loading && (e.target.style.background = '#1D4ED8')} onMouseOut={e => !loading && (e.target.style.background = '#2563EB')}>
                      <i data-lucide="check-circle" style={{ width: '16px' }}></i> {loading ? 'Saving...' : (reschedulingAppointment ? 'Reschedule' : 'Register Patient')}
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
