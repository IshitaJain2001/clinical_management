        {/* REGISTRATION FORM TAB */}
        {activeTab === 'registration-form' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.2s ease-out', height: 'calc(100vh - 50px)', display: 'flex', flexDirection: 'column', background: '#F0F4F8', padding: '4px', overflow: 'hidden' }}>
            
            {/* Header / Title Bar */}
            <div style={{ background: '#E2E8F0', padding: '4px 8px', border: '1px solid #CBD5E1', borderBottom: 'none', display: 'flex', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>
              New Registration
            </div>

            <div style={{ background: 'white', border: '1px solid #CBD5E1', display: 'flex', flex: 1, minHeight: 0 }}>
              
              {/* Main Form Area (Left) */}
              <div style={{ flex: 1, padding: '8px', borderRight: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                
                {/* Search / Existing Patient Row */}
                {isExistingPatient === null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFBEB', padding: '4px 8px', border: '1px solid #FDE68A', marginBottom: '8px' }}>
                    <div style={{ width: '120px', fontSize: '11px', fontWeight: 600 }}>Search Patient</div>
                    <div style={{ width: '10px', fontSize: '11px' }}>:</div>
                    <input type="text" placeholder="Mobile / ID..." style={{ width: '200px', height: '20px', fontSize: '11px', padding: '0 4px', border: '1px solid #94A3B8' }} value={searchPatientQuery} onChange={e => setSearchPatientQuery(e.target.value)} />
                    {searchPatientQuery.trim().length > 0 && (
                      <div style={{ position: 'absolute', top: '100px', left: '160px', width: '400px', maxHeight: '150px', overflowY: 'auto', background: 'white', border: '1px solid #000', zIndex: 100 }}>
                        {patientsList.filter(p => { const q = searchPatientQuery.toLowerCase(); return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q); }).length === 0 ? (
                          <div style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', background: '#FEF2F2', color: '#991B1B' }} onClick={() => { setSelectedPatient(null); const isNumeric = /^\d+$/.test(searchPatientQuery.trim()); setFormData({ name: !isNumeric ? searchPatientQuery : '', age: '', gender: '', contact: isNumeric ? searchPatientQuery : '', email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: '' }); setIsExistingPatient(false); setSearchPatientQuery(''); }}>No match. Click to register new patient.</div>
                        ) : (
                          patientsList.filter(p => { const q = searchPatientQuery.toLowerCase(); return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q); }).map(p => (
                            <div key={p._id} style={{ padding: '4px 8px', fontSize: '11px', borderBottom: '1px solid #EEE', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} onClick={() => { setSelectedPatient(p); setFormData({ name: p.name, age: p.age, gender: p.gender, contact: p.contact, email: p.email || '', bloodGroup: p.bloodGroup || 'O+', address: p.address || '', medicalHistory: p.medicalHistory ? p.medicalHistory.join(', ') : '', doctorId: formData.doctorId, allergies: p.allergies || 'None', currentMedications: p.currentMedications || '' }); setIsExistingPatient(true); }}>
                              <span>{p.name} ({p.contact})</span>
                              <span style={{ color: '#2563EB' }}>Select</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Patient Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)', gap: '4px 16px' }}>
                  
                  {/* Field Helper Component */}
                  {(() => {
                    const Field = ({ label, children }) => (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>{label}</div>
                        <div style={{ width: '10px', fontSize: '11px', color: '#334155' }}>:</div>
                        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                      </div>
                    );
                    
                    const inputStyle = { width: '100%', height: '20px', fontSize: '11px', padding: '0 4px', border: '1px solid #94A3B8', borderRadius: '0', background: isExistingPatient ? '#F1F5F9' : 'white' };
                    const selectStyle = { ...inputStyle, padding: '0 2px' };

                    return (
                      <>
                        <Field label="Mobile No.">
                          <input type="text" style={inputStyle} value={formData.contact} onChange={e => { const val = e.target.value.replace(/\D/g, '').substring(0, 10); setFormData({...formData, contact: val}); }} readOnly={isExistingPatient} />
                        </Field>
                        <Field label="Patient Name">
                          <input type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />
                        </Field>
                        <Field label="Gender">
                          <select style={selectStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={isExistingPatient}>
                            <option value="">--Select--</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                          </select>
                        </Field>

                        <Field label="Age">
                          <input type="number" style={inputStyle} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} readOnly={isExistingPatient} />
                        </Field>
                        <Field label="Email">
                          <input type="text" style={{...inputStyle, background: (isExistingPatient || otpVerified) ? '#F1F5F9' : 'white'}} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} readOnly={isExistingPatient || otpVerified} />
                          {!isExistingPatient && !otpVerified && <button type="button" onClick={handleSendOtp} style={{ height: '20px', fontSize: '10px', marginLeft: '4px', background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>Verify</button>}
                        </Field>
                        {bookingType === 'lab' ? (
                          <Field label="Referred By">
                            <input type="text" style={inputStyle} value={formData.referredBy || ''} onChange={e => setFormData({...formData, referredBy: e.target.value})} readOnly={isExistingPatient} />
                          </Field>
                        ) : (
                          <Field label="Blood Group">
                            <select style={selectStyle} value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} disabled={isExistingPatient}>
                              <option value="">--Select--</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                            </select>
                          </Field>
                        )}

                        <Field label="Address">
                          <input type="text" style={{...inputStyle, gridColumn: 'span 2'}} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} readOnly={isExistingPatient} />
                        </Field>
                        <Field label="Medical Hist.">
                          <input type="text" style={inputStyle} value={formData.medicalHistory} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} readOnly={isExistingPatient} />
                        </Field>
                        <Field label="Allergies">
                          <input type="text" style={{...inputStyle, background: 'white'}} value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} />
                        </Field>

                        <Field label="Current Meds.">
                          <input type="text" style={{...inputStyle, background: 'white'}} value={formData.currentMedications} onChange={e => setFormData({...formData, currentMedications: e.target.value})} />
                        </Field>
                      </>
                    );
                  })()}
                </div>

                {/* Separator */}
                <div style={{ height: '1px', background: '#CBD5E1', margin: '4px 0' }}></div>

                {/* Visit & Appointment Details */}
                {bookingType === 'opd' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)', gap: '4px 16px' }}>
                    {(() => {
                      const Field = ({ label, children }) => (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '90px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>{label}</div>
                          <div style={{ width: '10px', fontSize: '11px', color: '#334155' }}>:</div>
                          <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                        </div>
                      );
                      const inputStyle = { width: '100%', height: '20px', fontSize: '11px', padding: '0 4px', border: '1px solid #94A3B8', borderRadius: '0', background: 'white' };

                      return (
                        <>
                          <Field label="Symptoms">
                            <input type="text" style={inputStyle} placeholder="Type & click to add..." value={symptomSearchQuery} onChange={e => setSymptomSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && symptomSearchQuery.trim()) { toggleSymptom(symptomSearchQuery.trim()); setSymptomSearchQuery(''); } }} disabled={!!reschedulingAppointment} />
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

                    {/* Selected Symptoms Display */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '4px', flexWrap: 'wrap', minHeight: '20px', padding: '2px 0' }}>
                      {selectedSymptoms.map(s => (
                        <div key={s} style={{ background: '#DBEAFE', color: '#1E3A8A', padding: '2px 6px', fontSize: '10px', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {s} <span onClick={() => !reschedulingAppointment && toggleSymptom(s)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>×</span>
                        </div>
                      ))}
                    </div>

                    {/* Slots Area */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', border: '1px solid #CBD5E1', padding: '4px', background: '#F8FAFC', minHeight: '40px' }}>
                      <div style={{ width: '90px', fontSize: '11px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>Available Slots</div>
                      <div style={{ width: '10px', fontSize: '11px', color: '#334155', marginTop: '2px' }}>:</div>
                      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(!formData.doctorId || !bookingDate) ? (
                          <span style={{ fontSize: '11px', color: '#64748B' }}>Select Doctor and Date</span>
                        ) : !receptionDoctorAvailability.available ? (
                          <span style={{ fontSize: '11px', color: '#DC2626' }}>Doctor Unavailable ({receptionDoctorAvailability.reason || 'Leave'})</span>
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
                                <div key={time} onClick={() => { if (!isFull) setSelectedSlot(time); }} style={{ padding: '2px 6px', border: '1px solid', borderColor: isSelected ? '#2563EB' : '#CBD5E1', fontSize: '10px', cursor: isFull ? 'not-allowed' : 'pointer', background: isSelected ? '#3B82F6' : (isFull ? '#E2E8F0' : 'white'), color: isSelected ? 'white' : (isFull ? '#94A3B8' : '#0F172A') }}>
                                    {displayTime} {isFull && <span style={{ color: '#DC2626' }}>(F)</span>}
                                </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Vitals and Consent (super dense) */}
                <div style={{ height: '1px', background: '#CBD5E1', margin: '4px 0' }}></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr) minmax(250px, 1fr)', gap: '4px 16px' }}>
                  {(() => {
                    const Field = ({ label, children }) => (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>{label}</div>
                        <div style={{ width: '10px', fontSize: '11px', color: '#334155' }}>:</div>
                        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                      </div>
                    );
                    const inputStyle = { width: '100%', height: '20px', fontSize: '11px', padding: '0 4px', border: '1px solid #94A3B8', borderRadius: '0', background: 'white' };

                    return (
                      <>
                        <Field label="Temp (F)"><input type="number" step="0.1" style={inputStyle} value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} /></Field>
                        <Field label="Pulse"><input type="number" style={inputStyle} value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} /></Field>
                        <Field label="Weight (kg)"><input type="number" step="0.1" style={inputStyle} value={vitalWeight} onChange={e => setVitalWeight(e.target.value)} /></Field>
                        <Field label="BP Sys"><input type="number" style={inputStyle} value={vitalBpSys} onChange={e => setVitalBpSys(e.target.value)} /></Field>
                        <Field label="BP Dia"><input type="number" style={inputStyle} value={vitalBpDia} onChange={e => setVitalBpDia(e.target.value)} /></Field>
                        <Field label="Height (cm)"><input type="number" style={inputStyle} value={vitalHeight} onChange={e => setVitalHeight(e.target.value)} /></Field>
                        
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>Consent:</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} /> EMR Creation
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} /> Data Sharing
                          </label>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Bottom Billing Table Area */}
                <div style={{ marginTop: 'auto', borderTop: '2px solid #3B82F6', paddingTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    
                    {/* Payment Details */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '4px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>Currency</div>
                        <div style={{ width: '10px', fontSize: '11px', color: '#334155' }}>:</div>
                        <select style={{ height: '20px', fontSize: '11px', padding: '0 2px', border: '1px solid #94A3B8', width: '100px' }}><option>INR</option></select>
                        <span style={{ fontSize: '11px', marginLeft: '12px', color: '#DC2626', fontWeight: 'bold' }}>1 INR = 1 ₹</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>PaymentMode</div>
                        <div style={{ width: '10px', fontSize: '11px', color: '#334155' }}>:</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['Cash', 'UPI', 'Other'].map(method => (
                            <label key={method} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                              <input type="radio" checked={bookingPaymentMethod === method} onChange={() => setBookingPaymentMethod(method)} name="paymode" /> {method}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '90px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>Discount (%)</div>
                        <div style={{ width: '10px', fontSize: '11px', color: '#334155' }}>:</div>
                        <input type="number" min="0" max={allowedDiscountPercent} value={bookingDiscountPercent || ''} onChange={e => setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))} style={{ height: '20px', fontSize: '11px', padding: '0 4px', border: '1px solid #94A3B8', width: '60px', textAlign: 'right' }} />
                      </div>
                    </div>

                    {/* Totals Summary */}
                    {(() => {
                      const subtotalVal = getBillingItems().reduce((sum, item) => sum + item.amount, 0) + ((!isExistingPatient && getBillingItems().length > 0) ? 50 : 0);
                      const discAmt = (subtotalVal * Number(bookingDiscountPercent || 0)) / 100;
                      const finalTotalVal = Math.max(0, subtotalVal - discAmt);
                      return (
                        <div style={{ width: '250px', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '4px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Gross Amount</span><span>₹{subtotalVal.toFixed(2)}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount Amt.</span><span>-₹{discAmt.toFixed(2)}</span></div>
                          <div style={{ borderTop: '1px solid #CBD5E1', margin: '2px 0' }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>Net Amount</span><span>₹{finalTotalVal.toFixed(2)}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>

              {/* Action Sidebar (Right) */}
              <div style={{ width: '180px', background: '#F8FAFC', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ width: '100%', height: '140px', border: '1px solid #CBD5E1', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <i data-lucide="user" style={{ width: '60px', height: '60px', color: '#CBD5E1' }}></i>
                  <span style={{ fontSize: '10px', color: '#64748B', marginTop: '8px' }}>Image Not Available</span>
                </div>
                
                <button type="button" style={{ width: '100%', padding: '6px 0', fontSize: '11px', fontWeight: 600, background: '#3B82F6', color: 'white', border: 'none', cursor: 'pointer' }}>Capture Photo</button>
                <button type="button" style={{ width: '100%', padding: '6px 0', fontSize: '11px', fontWeight: 600, background: '#3B82F6', color: 'white', border: 'none', cursor: 'pointer' }}>Upload Document</button>
                
                <div style={{ flex: 1 }}></div>

                {!isExistingPatient && otpSent && !otpVerified && (
                  <div style={{ background: '#FEF2F2', padding: '6px', border: '1px solid #FCA5A5', fontSize: '10px', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: '#991B1B', marginBottom: '4px' }}>Verify OTP:</div>
                    <input type="text" maxLength={6} style={{ width: '100%', height: '22px', textAlign: 'center', border: '1px solid #FCA5A5', marginBottom: '4px' }} value={verificationOtp} onChange={e => setVerificationOtp(e.target.value.replace(/\D/g, ''))} />
                    <button type="button" onClick={handleVerifyOtp} disabled={otpVerifying} style={{ width: '100%', background: '#10B981', color: 'white', border: 'none', padding: '4px 0', cursor: 'pointer' }}>{otpVerifying ? '...' : 'Verify'}</button>
                  </div>
                )}

                <button type="button" onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading} style={{ width: '100%', padding: '12px 0', fontSize: '13px', fontWeight: 700, background: '#10B981', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {loading ? 'Wait...' : (reschedulingAppointment ? 'Save Reschedule' : 'Save Registration')}
                </button>
                <button type="button" onClick={() => { setSelectedPatient(null); setIsExistingPatient(null); setFormData({name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: ''}); }} style={{ width: '100%', padding: '6px 0', fontSize: '11px', fontWeight: 600, background: '#CBD5E1', color: '#1E293B', border: 'none', cursor: 'pointer' }}>Clear / Cancel</button>
              </div>

            </div>
          </div>
        )}
