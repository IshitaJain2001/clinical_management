          </div>
        )}

        {/* REGISTRATION FORM TAB */}
        {activeTab === 'registration-form' && (
           <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Registration and appointment</h1>
              </div>

              {isExistingPatient === null ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px', marginBottom: '8px' }}>
                  <div className="glass-card" style={{ width: '560px', padding: '12px', borderRadius: '16px', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)' }}>
                    
                    {/* Header: User Icon + Title + Subtitle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ 
                        width: '52px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        background: '#EFF6FF', 
                        color: '#3B82F6', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <i data-lucide="user" style={{ width: '26px', height: '20px' }}></i>
                      </div>
                      <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', fontFamily: "'Inter', sans-serif" }}>Registered Patient</h2>
                        <p style={{ fontSize: '10px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>
                          Search and select an existing patient to book an appointment.
                        </p>
                      </div>
                    </div>

                    {/* Search Field with magnifying glass on the right */}
                    <div style={{ position: 'relative', marginBottom: '2px' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Search by Patient ID or Phone Number" 
                        style={{ 
                          height: '20px', 
                          paddingRight: '48px', 
                          paddingLeft: '16px',
                          borderRadius: '2px', 
                          fontSize: '10px', 
                          fontWeight: 600,
                          border: '1px solid #CBD5E1',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                        value={searchPatientQuery}
                        onChange={e => setSearchPatientQuery(e.target.value)}
                      />
                      <i data-lucide="search" style={{ position: 'absolute', right: '16px', top: '16px', color: '#94A3B8', width: '20px', height: '20px' }}></i>
                    </div>

                    {/* Search Autocomplete List */}
                    {searchPatientQuery.trim().length > 0 && (
                      <div data-lenis-prevent style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '2px', background: '#F8FAFC', marginBottom: '2px' }}>
                        {patientsList.filter(p => {
                          const q = searchPatientQuery.toLowerCase();
                          return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
                        }).length === 0 ? (
                          <div 
                            style={{ padding: '4px', textAlign: 'center', color: '#64748B', fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
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
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ marginBottom: '4px' }}>No matching patients found.</div>
                            <div style={{ color: '#10B981', fontWeight: 700 }}>Click here to register a new patient &rarr;</div>
                          </div>
                        ) : (
                          patientsList.filter(p => {
                            const q = searchPatientQuery.toLowerCase();
                            return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
                          }).map(p => (
                            <div 
                              key={p._id} 
                              style={{ padding: '4px 8px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '0.2s' }}
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
                              className="patient-search-row"
                            >
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '10px', color: '#1A1D23' }}>{p.name}</div>
                                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                                  #{p._id.substring(18).toUpperCase()} • {p.gender} • {p.age} Yrs
                                </div>
                                <div 
                                  style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, marginTop: '2px', display: 'inline-block', cursor: 'pointer' }}
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
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)' }}>{p.contact}</div>
                                <span style={{ fontSize: '10px', background: '#EFF6FF', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginTop: '4px' }}>Select</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}



                  </div>
                </div>
              ) : (
                 <div className="glass-card" style={{ padding: '2px', marginBottom: '2px' }}>
                  


                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>1</div>
                                   {/* Expanded Fields Form (Dense Layout) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content 1fr max-content 1fr', gap: '2px 4px', alignItems: 'center', marginBottom: '2px', background: '#F8FAFC', padding: '2px', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                      
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Full Name <span style={{ color: '#EF4444' }}>*</span> :</div>
                      <input 
                        type="text" 
                        placeholder="e.g. Ramesh Mehta" 
                        style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        readOnly={isExistingPatient} 
                      />

                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Gender <span style={{ color: '#EF4444' }}>*</span> :</div>
                      <select 
                        style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'pointer', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                        value={formData.gender} 
                        onChange={e => setFormData({...formData, gender: e.target.value})} 
                        disabled={isExistingPatient}
                      >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                      </select>

                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Age <span style={{ color: '#EF4444' }}>*</span> :</div>
                      <input 
                        type="number" 
                        placeholder="e.g. 45" 
                        style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                        value={formData.age} 
                        onChange={e => setFormData({...formData, age: e.target.value})} 
                        readOnly={isExistingPatient}
                      />

                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Mobile <span style={{ color: '#EF4444' }}>*</span> :</div>
                      <input 
                        type="text" 
                        placeholder="e.g. 9876543210" 
                        style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: 500, border: '1px solid #E2E8F0', width: '100%', boxSizing: 'border-box' }} 
                        value={formData.contact} 
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                          setFormData({...formData, contact: val});
                        }} 
                        readOnly={isExistingPatient}
                      />

                      {bookingType === 'lab' ? (
                        <>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Referred By :</div>
                          <input 
                            type="text" 
                            placeholder="e.g. Dr. Shah or Self" 
                            style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                            value={formData.referredBy || ''} 
                            onChange={e => setFormData({...formData, referredBy: e.target.value})} 
                            readOnly={isExistingPatient}
                          />
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Blood Grp :</div>
                          <select 
                            style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'pointer', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                            value={formData.bloodGroup} 
                            onChange={e => setFormData({...formData, bloodGroup: e.target.value})} 
                            disabled={isExistingPatient}
                          >
                              <option value="">Select</option>
                              <option value="O+">O +ve</option>
                              <option value="O-">O -ve</option>
                              <option value="A+">A +ve</option>
                              <option value="A-">A -ve</option>
                              <option value="B+">B +ve</option>
                              <option value="B-">B -ve</option>
                              <option value="AB+">AB +ve</option>
                              <option value="AB-">AB -ve</option>
                          </select>
                        </>
                      )}

                      {bookingType !== 'lab' && bookingType !== 'service' && (
                        <>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Email :</div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                placeholder="r.mehta@gmail.com" 
                                style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: (isExistingPatient || otpVerified) ? '#F1F5F9' : 'white', cursor: (isExistingPatient || otpVerified) ? 'not-allowed' : 'text', fontWeight: 500, border: '1px solid #CBD5E1', flex: 1, minWidth: '0', boxSizing: 'border-box' }} 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                readOnly={isExistingPatient || otpVerified}
                              />
                              {!isExistingPatient && !otpVerified && (
                                  <button 
                                      type="button" 
                                      style={{ height: '20px', whiteSpace: 'nowrap', borderRadius: '2px', fontWeight: 600, padding: '0 8px', background: '#3B82F6', color: 'white', border: 'none', cursor: sendingOtp ? 'not-allowed' : 'pointer', fontSize: '10px' }}
                                      onClick={handleSendOtp}
                                      disabled={sendingOtp}
                                  >
                                      {sendingOtp ? '...' : 'OTP'}
                                  </button>
                              )}
                              {!isExistingPatient && otpVerified && (
                                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '10px' }}>Verified</span>
                              )}
                          </div>
                        </>
                      )}
                      
                      {bookingType !== 'lab' && bookingType !== 'service' && (
                        <>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Address :</div>
                          <input 
                            type="text"
                            placeholder="Flat 101, Main Road" 
                            style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', gridColumn: 'span 3', boxSizing: 'border-box' }} 
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            readOnly={isExistingPatient}
                          />

                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Medical History :</div>
                          <input 
                            type="text"
                            placeholder="e.g. Hypertension" 
                            style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                            value={formData.medicalHistory}
                            onChange={e => setFormData({...formData, medicalHistory: e.target.value})}
                            readOnly={isExistingPatient}
                          />

                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Allergies :</div>
                          <input 
                            type="text"
                            placeholder="e.g. Penicillin" 
                            style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: 'white', cursor: 'text', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                            value={formData.allergies}
                            onChange={e => setFormData({...formData, allergies: e.target.value})}
                          />

                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#333', textAlign: 'right' }}>Medications :</div>
                          <input 
                            type="text"
                            placeholder="e.g. Metformin 500mg" 
                            style={{ height: '20px', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', background: 'white', cursor: 'text', fontWeight: 500, border: '1px solid #CBD5E1', width: '100%', boxSizing: 'border-box' }} 
                            value={formData.currentMedications}
                            onChange={e => setFormData({...formData, currentMedications: e.target.value})}
                          />
                        </>
                      )}

                      {!isExistingPatient && otpSent && !otpVerified && (
                          <div style={{ gridColumn: '1 / -1', background: '#FEF2F2', border: '1px dashed #FCA5A5', borderRadius: '2px', padding: '2px', display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 700, color: '#991B1B', margin: 0 }}>
                                  Enter OTP sent to {formData.email}:
                              </label>
                              <input 
                                  type="text" 
                                  maxLength={6}
                                  placeholder="######" 
                                  style={{ width: '80px', height: '20px', textAlign: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', borderRadius: '2px', border: '1px solid #FCA5A5', boxSizing: 'border-box' }}
                                  value={verificationOtp}
                                  onChange={e => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                              />
                              <button 
                                  type="button" 
                                  style={{ height: '20px', borderRadius: '2px', fontWeight: 600, padding: '0 8px', background: '#10B981', color: 'white', border: 'none', cursor: otpVerifying ? 'not-allowed' : 'pointer', fontSize: '10px' }}
                                  onClick={handleVerifyOtp}
                                  disabled={otpVerifying}
                              >
                                  {otpVerifying ? '...' : 'Verify'}
                              </button>
                              <button 
                                  type="button" 
                                  style={{ background: 'transparent', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={handleSendOtp}
                              >
                                  Resend
                              </button>
                          </div>
                      )}

                  </div>

                  {/* Patient Vitals (Optional) during Registration / Appointment Booking */}
                  <div style={{ marginTop: '2px', marginBottom: '2px' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setVitalsCollapsed(!vitalsCollapsed)}
                    >
                      <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </div>
                      <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1A1D23', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Patient Vitals <span style={{ color: '#64748B', fontSize: '10px', fontWeight: 600 }}>(Optional)</span>
                        <span style={{ fontSize: '10px', color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>
                          {vitalsCollapsed ? 'Show' : 'Hide'}
                        </span>
                      </h2>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#2563EB" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: vitalsCollapsed ? 'none' : 'rotate(180deg)' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    
                    {!vitalsCollapsed && (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px', borderRadius: '4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>Temperature (°F)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            className="form-control" 
                            placeholder="e.g. 98.6"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalTemp} 
                            onChange={e => setVitalTemp(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>Heart Rate / Pulse (bpm)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 72"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalPulse} 
                            onChange={e => setVitalPulse(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>BP Systolic (mmHg)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 120"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalBpSys} 
                            onChange={e => setVitalBpSys(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>BP Diastolic (mmHg)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 80"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalBpDia} 
                            onChange={e => setVitalBpDia(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>Respiration (breaths/min)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 16"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalResp} 
                            onChange={e => setVitalResp(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>SpO2 (%)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 98"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalSpo2} 
                            onChange={e => setVitalSpo2(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>Weight (kg)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            className="form-control" 
                            placeholder="e.g. 70"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalWeight} 
                            onChange={e => setVitalWeight(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>Height (cm)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 175"
                            style={{ height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalHeight} 
                            onChange={e => setVitalHeight(e.target.value)} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {!isExistingPatient && bookingType !== 'lab' && bookingType !== 'service' && (
                    <div style={{ marginTop: '2px', marginBottom: '2px' }}>
                      {/* Document Uploads Header */}
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setDocsCollapsed(!docsCollapsed)}
                      >
                          <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: '#8B5CF6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                            <i data-lucide="folder-plus" style={{ width: '16px', height: '16px' }}></i>
                          </div>
                          <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1A1D23', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Add Additional Documents <span style={{ color: '#64748B', fontSize: '10px', fontWeight: 600 }}>(Optional)</span>
                            <span style={{ fontSize: '10px', color: '#8B5CF6', background: '#F5F3FF', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', fontWeight: 700 }}>
                              {docsCollapsed ? 'Show' : 'Hide'}
                            </span>
                          </h2>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="18" 
                            height="18" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="#8B5CF6" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: docsCollapsed ? 'none' : 'rotate(180deg)' }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                      </div>

                      {!docsCollapsed && (
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '2px', borderRadius: '4px', marginBottom: '2px' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', marginBottom: '2px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Document Type</label>
                              <select 
                                className="form-control" 
                                value={newDocType} 
                                onChange={e => setNewDocType(e.target.value)}
                                style={{ width: '100%', height: '20px', borderRadius: '2px', border: '1px solid #CBD5E1', fontSize: '10px', fontWeight: 700, padding: '0 12px' }}
                              >
                                <option value="Aadhar / Voter Card">Aadhar / Voter Card</option>
                                <option value="Ultrasound Report">Ultrasound Report</option>
                                <option value="Consent Form (e.g. HIV)">Consent Form (e.g. HIV)</option>
                                <option value="Patient Photo">Patient Photo</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div style={{ flex: 2 }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Upload File</label>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                <input 
                                  type="file" 
                                  id="patient-doc-upload"
                                  className="form-control"
                                  style={{ flex: 1, padding: '4px', height: '20px', fontSize: '10px', borderRadius: '2px', background: 'white' }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const fileInput = document.getElementById('patient-doc-upload');
                                    if (fileInput.files.length > 0) {
                                      setPatientDocuments([...patientDocuments, { type: newDocType, name: fileInput.files[0].name, size: (fileInput.files[0].size / 1024).toFixed(1) + ' KB' }]);
                                      fileInput.value = '';
                                    } else {
                                      showToast('Please select a file to upload', 'error');
                                    }
                                  }}
                                  style={{ padding: '0 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '2px', fontWeight: 700, cursor: 'pointer', height: '20px' }}
                                >
                                  Add Document
                                </button>
                              </div>
                            </div>
                          </div>

                          {patientDocuments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {patientDocuments.map((doc, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <i data-lucide="file-text" style={{ width: '18px', color: '#64748B' }}></i>
                                    <div>
                                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#0F172A' }}>{doc.name}</div>
                                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B' }}>{doc.type} • {doc.size}</div>
                                    </div>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => setPatientDocuments(patientDocuments.filter((_, i) => i !== idx))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                                  >
                                    <i data-lucide="trash-2" style={{ width: '16px' }}></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}



                  {bookingType === 'opd' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>2</div>
                          <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Visit & Appointment Details</h2>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '6px 12px', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
                          Multi-Appointment Enabled
                        </span>
                      </div>

                      {/* Queued Appointments List for Same Patient */}
                      {additionalApptsList.length > 0 && (
                        <div style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '4px', padding: '4px', marginBottom: '2px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                            Queued Appointments for Patient ({additionalApptsList.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {additionalApptsList.map((appt, idx) => (
                              <div key={appt.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A' }}>{appt.doctorName}</div>
                                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>{appt.date} • {appt.time.split('(Limit')[0].trim()} • Fee: ₹{appt.fee}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setAdditionalApptsList(additionalApptsList.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                  title="Remove this appointment"
                                >
                                  <i data-lucide="trash-2" style={{ width: '16px' }}></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px', marginBottom: '2px' }}>
                          <div className="form-group" style={{ marginBottom: '4px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Symptoms <span style={{ color: '#EF4444' }}>*</span></label>
                              <div className="custom-dropdown-container" ref={symptomDropdownRef}>
                                  <div className="custom-dropdown-trigger" onClick={() => !reschedulingAppointment && setSymptomDropdownOpen(!symptomDropdownOpen)} style={{ minHeight: '20px', height: 'auto', padding: '2px 6px', flexWrap: 'wrap', ...(reschedulingAppointment ? { cursor: 'not-allowed', background: '#F1F5F9' } : {}) }}>
                                      <div className="selected-items" data-lenis-prevent style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', width: '100%', gap: '2px' }}>
                                          {selectedSymptoms.map(s => (
                                            <div key={s} className="symptom-tag" style={{ margin: '2px 0' }}>
                                                {s}
                                                <span 
                                                  onClick={(e) => { e.stopPropagation(); if (!reschedulingAppointment) toggleSymptom(s); }}
                                                  style={{ cursor: reschedulingAppointment ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
                                                >
                                                    <i data-lucide="x" style={{ pointerEvents: 'none', width: '14px', height: '14px' }}></i>
                                                </span>
                                            </div>
                                          ))}
                                          <input
                                            type="text"
                                            placeholder={selectedSymptoms.length === 0 ? "Select / Search symptoms..." : ""}
                                            value={symptomSearchQuery}
                                            onChange={e => {
                                              setSymptomSearchQuery(e.target.value);
                                              if (!symptomDropdownOpen) setSymptomDropdownOpen(true);
                                            }}
                                            onClick={e => {
                                              e.stopPropagation();
                                              setSymptomDropdownOpen(true);
                                            }}
                                            disabled={!!reschedulingAppointment}
                                            style={{
                                              border: 'none',
                                              outline: 'none',
                                              background: 'transparent',
                                              flex: 1,
                                              minWidth: '120px',
                                              height: '30px',
                                              fontSize: '12.5px',
                                              fontWeight: 600,
                                              color: '#0F172A',
                                              padding: 0,
                                              margin: 0,
                                              cursor: reschedulingAppointment ? 'not-allowed' : 'text'
                                            }}
                                          />
                                      </div>
                                      <i data-lucide="chevron-down" style={{ width: '18px', color: '#94A3B8', transition: '0.3s', transform: symptomDropdownOpen ? 'rotate(180deg)' : 'none' }}></i>
                                  </div>
                                  {symptomDropdownOpen && (
                                      <div className="dropdown-options-box show" data-lenis-prevent style={{ padding: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                          {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).map(s => (
                                              <div key={s} className="option-item" onClick={() => { toggleSymptom(s); setSymptomSearchQuery(''); }} style={{ padding: '2px 4px', cursor: 'pointer', borderRadius: '4px' }}>{s}</div>
                                          ))}
                                          {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).length === 0 && (
                                              <div style={{ padding: '4px', fontSize: '10px', color: '#64748B', textAlign: 'center' }}>No matching symptoms</div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: '4px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Select Doctor <span style={{ color: '#EF4444' }}>*</span></label>
                              <select className="form-control" style={{ height: '20px', borderRadius: '2px', background: reschedulingAppointment ? '#F1F5F9' : 'white', cursor: reschedulingAppointment ? 'not-allowed' : 'pointer', fontWeight: reschedulingAppointment ? 700 : 500 }} value={formData.doctorId} onChange={e => { setFormData({...formData, doctorId: e.target.value}); setSelectedSlot(''); }} disabled={!!reschedulingAppointment}>
                                  <option value="">-- Choose Doctor --</option>
                                  {doctors.map(doc => (
                                      <option key={doc._id} value={doc._id}>{doc.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: '4px' }}>
                              <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Appointment Date <span style={{ color: '#EF4444' }}>*</span></label>
                              <input 
                                  type="date" 
                                  className="form-control" 
                                  style={{ height: '20px', borderRadius: '2px', background: 'white', border: '1px solid #CBD5E1', padding: '0 12px', fontWeight: 600 }} 
                                  value={bookingDate} 
                                  min={getLocalDateString()} 
                                  onChange={e => {
                                      setBookingDate(e.target.value);
                                      setSelectedSlot(''); // Reset slot choice when date changes
                                  }} 
                              />
                          </div>
                      </div>

                      <div style={{ marginBottom: '2px' }}>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '2px', color: '#64748B' }}>Select Slot / Queue</label>
                          
                          {/* Doctor unavailability banner */}
                          {formData.doctorId && bookingDate && !receptionDoctorAvailability.available && (
                            <div style={{ 
                              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', 
                              padding: '14px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '2px'
                            }}>
                              <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#991B1B' }}>Doctor Unavailable</div>
                                <div style={{ fontSize: '10px', color: '#B91C1C', marginTop: '2px' }}>
                                  {receptionDoctorAvailability.reason === 'Weekly Off' 
                                    ? `Weekly off (${receptionDoctorAvailability.weeklyOff || 'this day'}). Please select a different date.`
                                    : `On ${receptionDoctorAvailability.leaveType || ''} leave. Please select a different date.`}
                                </div>
                              </div>
                            </div>
                          )}

                          {(!formData.doctorId || !bookingDate) ? (
                            <div style={{ padding: '4px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '2px', textAlign: 'center', color: '#64748B', fontSize: '10px', fontWeight: 600 }}>
                              Please select a Doctor and Appointment Date to view available slots.
                            </div>
                          ) : receptionDoctorAvailability.available && (
                            <div className="slot-scroll-wrapper">
                              <button
                                className="slot-scroll-arrow left"
                                style={{ display: 'none' }}
                                onClick={() => {
                                  const grid = document.getElementById('reception-time-grid');
                                  if (grid) grid.scrollBy({ left: -340, behavior: 'smooth' });
                                }}
                                aria-label="Scroll slots left"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                              </button>

                              <div id="reception-time-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 0' }}>
                                {(receptionDoctorAvailability.slots || DEFAULT_RECEPTION_SLOTS).map(time => {
                                  let limit = 5;
                                  const match = time.match(/\(Limit:\s*(\d+)\)/i);
                                  if (match) {
                                      limit = parseInt(match[1], 10);
                                  }

                                  const cleanTimeSlotStr = (str) => {
                                      if (!str) return '';
                                      return str.split(/\(Limit:/i)[0].replace(/\s+/g, ' ').trim().toLowerCase();
                                  };

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
                                      <div 
                                          key={time} 
                                          className={`time-chip ${isFull ? 'booked' : (isSelected ? 'selected' : 'available')}`} 
                                          style={isFull ? {
                                              background: '#F1F5F9',
                                              color: '#94A3B8',
                                              border: '1.5px solid #CBD5E1',
                                              cursor: 'not-allowed',
                                              opacity: 0.6
                                          } : {}}
                                          onClick={() => {
                                              if (!isFull) {
                                                  setSelectedSlot(time);
                                              }
                                          }}
                                      >
                                          <div style={{ fontSize: '10px', fontWeight: 700 }}>{displayTime}</div>
                                          <div className="slot-label" style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>
                                              {isFull ? 'Fully Booked' : (isSelected ? 'Selected' : 'Available')} ({bookedCount}/{limit})
                                          </div>
                                      </div>
                                  );
                              })}
                            </div>
                            <button
                              className="slot-scroll-arrow right"
                              style={{ display: 'none' }}
                              onClick={() => {
                                const grid = document.getElementById('reception-time-grid');
                                if (grid) grid.scrollBy({ left: 340, behavior: 'smooth' });
                              }}
                              aria-label="Scroll slots right"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                          </div>
                          )}
                      </div>

                      {/* Add Another Doctor Appointment Button */}
                      <div style={{ marginBottom: '36px', display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!formData.doctorId) {
                              showToast("Please pick a Doctor first before queueing additional appointment.", "error");
                              return;
                            }
                            if (!selectedSlot) {
                              showToast("Please pick a Time Slot first.", "error");
                              return;
                            }
                            const docObj = doctors.find(d => String(d._id) === String(formData.doctorId));
                            const isDoctorAlreadyQueued = additionalApptsList.some(
                              appt => String(appt.doctorId) === String(formData.doctorId)
                            );
                            if (isDoctorAlreadyQueued) {
                              showToast(`An appointment with ${docObj ? docObj.name : 'this doctor'} is already queued. You cannot book multiple appointments with the same doctor in a single form.`, "error");
                              return;
                            }
                            if (isExistingPatient && selectedPatient) {
                              const alreadyHasApptInDb = appointments.some(appt => {
                                const pId = appt.patientId && typeof appt.patientId === 'object' ? appt.patientId._id : appt.patientId;
                                const dId = appt.doctorId && typeof appt.doctorId === 'object' ? appt.doctorId._id : appt.doctorId;
                                const samePatient = String(pId) === String(selectedPatient._id);
                                const sameDoctor = String(dId) === String(formData.doctorId);
                                const sameDay = new Date(appt.date).toDateString() === new Date(bookingDate).toDateString();
                                const notCancelled = appt.status !== 'Cancelled';
                                return samePatient && sameDoctor && sameDay && notCancelled;
                              });
                              if (alreadyHasApptInDb) {
                                showToast(`This patient already has an appointment booked with ${docObj ? docObj.name : 'this doctor'} on this day.`, "error");
                                return;
                              }
                            }
                            setAdditionalApptsList([
                              ...additionalApptsList,
                              {
                                id: Date.now(),
                                doctorId: formData.doctorId,
                                doctorName: docObj ? docObj.name : 'Doctor',
                                date: bookingDate,
                                time: selectedSlot,
                                reason: selectedSymptoms.join(', ') || 'General Checkup',
                                fee: docObj ? (docObj.consultationFee || 500) : 500
                              }
                            ]);
                            setFormData(prev => ({ ...prev, doctorId: '' }));
                            setSelectedSlot('');
                            showToast("Doctor consultation added to queue! Pick another doctor for second appointment.", "success");
                          }}
                          style={{
                            background: '#EFF6FF',
                            border: '1.5px solid #3B82F6',
                            color: '#2563EB',
                            borderRadius: '2px',
                            padding: '4px 8px',
                            fontWeight: 800,
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          + Add Another Doctor Appointment (Same Patient)
                        </button>

                        {(formData.doctorId || selectedSlot) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, doctorId: '' }));
                              setSelectedSlot('');
                              showToast("Current selection cleared.", "info");
                            }}
                            style={{
                              background: '#F8FAFC',
                              border: '1.5px solid #CBD5E1',
                              color: '#64748B',
                              borderRadius: '2px',
                              padding: '4px 8px',
                              fontWeight: 800,
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Clear Selection
                          </button>
                        )}
                      </div>
                    </>
                  ) : bookingType === 'lab' ? (
                    <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '4px', padding: '2px', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            <i data-lucide="flask-conical" style={{ width: '20px', height: '20px' }}></i>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#065F46' }}>Direct Lab Test Selection (Walk-In OPD)</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#047857' }}>Select single or multiple diagnostic lab tests for this patient order.</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#047857', background: '#DCFCE7', padding: '6px 12px', borderRadius: '20px', border: '1px solid #A7F3D0' }}>
                          {selectedLabTestsList.length} Test(s) Added
                        </span>
                      </div>

                      {/* Search & Add Lab Test Row */}
                      <div style={{ marginBottom: '2px' }}>
                        <div className="form-group" style={{ position: 'relative', margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#065F46', marginBottom: '2px', display: 'block' }}>Search Pathology / Diagnostic Lab Test</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#059669', width: '16px', height: '16px', pointerEvents: 'none' }}></i>
                            <input 
                              type="text" 
                              className="form-control"
                              placeholder="Search and select lab test (e.g. CBC, Lipid, Thyroid, X-Ray)..."
                              style={{ height: '20px', paddingLeft: '44px', paddingRight: '40px', borderRadius: '2px', background: 'white', fontWeight: 700, fontSize: '10px', border: '1.5px solid #A7F3D0' }}
                              value={labTestSearchQuery}
                              onFocus={() => setShowLabTestDropdown(true)}
                              onChange={e => {
                                setLabTestSearchQuery(e.target.value);
                                setShowLabTestDropdown(true);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowLabTestDropdown(!showLabTestDropdown)}
                              style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <i data-lucide={showLabTestDropdown ? "chevron-up" : "chevron-down"} style={{ width: '18px', height: '18px' }}></i>
                            </button>
                          </div>

                          {/* Live Search Suggestions Dropdown */}
                          {showLabTestDropdown && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '2px',
                                background: '#FFFFFF',
                                border: '1.5px solid #A7F3D0',
                                borderRadius: '4px',
                                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                                zIndex: 9999,
                                maxHeight: '260px',
                                overflowY: 'auto'
                              }}
                            >
                              {(() => {
                                const query = (labTestSearchQuery || '').toLowerCase().trim();
                                const filtered = hospitalLabTests.filter(t => 
                                  (t.testName || '').toLowerCase().includes(query) ||
                                  (t.category || '').toLowerCase().includes(query) ||
                                  (t.testCode || '').toLowerCase().includes(query)
                                );

                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '4px', textAlign: 'center', color: '#94A3B8', fontSize: '10px', fontWeight: 600 }}>
                                      No registered hospital lab tests matching "{labTestSearchQuery}"
                                    </div>
                                  );
                                }

                                return filtered.map((test, idx) => {
                                  const isAlreadyAdded = selectedLabTestsList.some(item => item.testName === test.testName);
                                  return (
                                    <div
                                      key={test._id || idx}
                                      onClick={() => {
                                        if (!isAlreadyAdded) {
                                          setSelectedLabTestsList([...selectedLabTestsList, { testName: test.testName, testCode: test.testCode, category: test.category, price: Number(test.price || 0) }]);
                                        }
                                        setLabTestSearchQuery('');
                                        setShowLabTestDropdown(false);
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        cursor: isAlreadyAdded ? 'default' : 'pointer',
                                        opacity: isAlreadyAdded ? 0.6 : 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #F1F5F9',
                                        background: isAlreadyAdded ? '#F8FAFC' : 'transparent',
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = '#F0FDF4'; }}
                                      onMouseLeave={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: '10px', color: '#0F172A' }}>
                                          {test.testName} {isAlreadyAdded && <span style={{ color: '#059669', fontSize: '10px', fontWeight: 700 }}>(Added)</span>}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#059669', fontWeight: 700, marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                          <span style={{ background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>{test.category || 'Pathology'}</span>
                                          {test.testCode && <span style={{ color: '#64748B' }}>Code: {test.testCode}</span>}
                                        </div>
                                      </div>
                                      <div style={{ fontWeight: 900, fontSize: '10px', color: '#059669', background: '#ECFDF5', padding: '6px 12px', borderRadius: '2px', border: '1px solid #A7F3D0' }}>
                                        ₹{Number(test.price || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Added Selected Lab Tests Pills & Summary */}
                      {selectedLabTestsList.length > 0 ? (
                        <div style={{ background: '#FFFFFF', border: '1.5px solid #A7F3D0', borderRadius: '4px', padding: '4px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#065F46', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Selected Tests for Lab Order ({selectedLabTestsList.length})</span>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#059669' }}>
                              Subtotal: ₹{selectedLabTestsList.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {selectedLabTestsList.map((test, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '22px', height: '20px', borderRadius: '50%', background: '#059669', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>{idx + 1}</span>
                                  <div>
                                    <span style={{ fontWeight: 800, fontSize: '10px', color: '#065F46' }}>{test.testName}</span>
                                    {test.category && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#047857', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{test.category}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <span style={{ fontWeight: 900, fontSize: '10px', color: '#059669' }}>₹{Number(test.price || 0).toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLabTestsList(selectedLabTestsList.filter((_, i) => i !== idx))}
                                    style={{ background: '#FEE2E2', border: 'none', color: '#EF4444', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '4px', background: '#FFFFFF', border: '1.5px dashed #A7F3D0', borderRadius: '4px', textAlign: 'center', color: '#047857', fontSize: '10px', fontWeight: 600 }}>
                          No lab tests added yet. Search and select tests above to build the lab order.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: '4px', padding: '2px', marginBottom: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            <i data-lucide="sparkles" style={{ width: '20px', height: '20px' }}></i>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#5B21B6' }}>Direct Clinical Procedure / Service (Dental, Walk-In)</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#6D28D9' }}>Select single or multiple dental, physiotherapy, or clinical specialty procedures for this patient.</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#6D28D9', background: '#EDE9FE', padding: '6px 12px', borderRadius: '20px', border: '1px solid #DDD6FE' }}>
                          {selectedServicesList.length} Procedure(s) Added
                        </span>
                      </div>

                      {/* Search & Add Clinical Service Row */}
                      <div style={{ marginBottom: '2px' }}>
                        <div className="form-group" style={{ position: 'relative', margin: 0 }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: '#5B21B6', marginBottom: '2px', display: 'block' }}>Search Clinical Service / Dental Procedure</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#7C3AED', width: '16px', height: '16px', pointerEvents: 'none' }}></i>
                            <input 
                              type="text" 
                              className="form-control"
                              placeholder="Search and select dental/clinical procedure (e.g. Root Canal, Scaling, Extraction, Braces)..."
                              style={{ height: '20px', paddingLeft: '44px', paddingRight: '40px', borderRadius: '2px', background: 'white', fontWeight: 700, fontSize: '10px', border: '1.5px solid #C4B5FD' }}
                              value={serviceSearchQuery}
                              onFocus={() => setShowServiceDropdown(true)}
                              onChange={e => {
                                setServiceSearchQuery(e.target.value);
                                setShowServiceDropdown(true);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                              style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: '#7C3AED', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <i data-lucide={showServiceDropdown ? "chevron-up" : "chevron-down"} style={{ width: '18px', height: '18px' }}></i>
                            </button>
                          </div>

                          {/* Live Search Suggestions Dropdown for Clinical Services */}
                          {showServiceDropdown && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '2px',
                                background: '#FFFFFF',
                                border: '1.5px solid #C4B5FD',
                                borderRadius: '4px',
                                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                                zIndex: 9999,
                                maxHeight: '260px',
                                overflowY: 'auto'
                              }}
                            >
                              {(() => {
                                const query = (serviceSearchQuery || '').toLowerCase().trim();
                                const filtered = hospitalClinicalServices.filter(s => 
                                  (s.serviceName || '').toLowerCase().includes(query) ||
                                  (s.department || '').toLowerCase().includes(query) ||
                                  (s.serviceCode || '').toLowerCase().includes(query)
                                );

                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '4px', textAlign: 'center', color: '#94A3B8', fontSize: '10px', fontWeight: 600 }}>
                                      No registered clinical services matching "{serviceSearchQuery}"
                                    </div>
                                  );
                                }

                                return filtered.map((srv, idx) => {
                                  const isAlreadyAdded = selectedServicesList.some(item => item.serviceName === srv.serviceName);
                                  return (
                                    <div
                                      key={srv._id || idx}
                                      onClick={() => {
                                        if (!isAlreadyAdded) {
                                          setSelectedServicesList([...selectedServicesList, { serviceName: srv.serviceName, serviceCode: srv.serviceCode, department: srv.department, price: Number(srv.price || 0) }]);
                                        }
                                        setServiceSearchQuery('');
                                        setShowServiceDropdown(false);
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        cursor: isAlreadyAdded ? 'default' : 'pointer',
                                        opacity: isAlreadyAdded ? 0.6 : 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #F1F5F9',
                                        background: isAlreadyAdded ? '#F8FAFC' : 'transparent',
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = '#F5F3FF'; }}
                                      onMouseLeave={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: '10px', color: '#0F172A' }}>
                                          {srv.serviceName} {isAlreadyAdded && <span style={{ color: '#7C3AED', fontSize: '10px', fontWeight: 700 }}>(Added)</span>}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 700, marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                          <span style={{ background: '#EDE9FE', padding: '2px 8px', borderRadius: '4px' }}>{srv.department || 'Dental'}</span>
                                          {srv.serviceCode && <span style={{ color: '#64748B' }}>Code: {srv.serviceCode}</span>}
                                        </div>
                                      </div>
                                      <div style={{ fontWeight: 900, fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '6px 12px', borderRadius: '2px', border: '1px solid #C4B5FD' }}>
                                        ₹{Number(srv.price || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Added Selected Services Pills & Summary */}
                      {selectedServicesList.length > 0 ? (
                        <div style={{ background: '#FFFFFF', border: '1.5px solid #DDD6FE', borderRadius: '4px', padding: '4px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#5B21B6', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Selected Clinical Procedures ({selectedServicesList.length})</span>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#7C3AED' }}>
                              Subtotal: ₹{selectedServicesList.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {selectedServicesList.map((srv, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '22px', height: '20px', borderRadius: '50%', background: '#7C3AED', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>{idx + 1}</span>
                                  <div>
                                    <span style={{ fontWeight: 800, fontSize: '10px', color: '#5B21B6' }}>{srv.serviceName}</span>
                                    {srv.department && <span style={{ marginLeft: '8px', fontSize: '10px', color: '#6D28D9', background: '#EDE9FE', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{srv.department}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <span style={{ fontWeight: 900, fontSize: '10px', color: '#7C3AED' }}>₹{Number(srv.price || 0).toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedServicesList(selectedServicesList.filter((_, i) => i !== idx))}
                                    style={{ background: '#FEE2E2', border: 'none', color: '#EF4444', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '4px', background: '#FFFFFF', border: '1.5px dashed #DDD6FE', borderRadius: '4px', textAlign: 'center', color: '#6D28D9', fontSize: '10px', fontWeight: 600 }}>
                          No clinical procedures added yet. Search and select procedures above.
                        </div>
                      )}
                    </div>
                  )}

                  {!isExistingPatient && bookingType !== 'lab' && bookingType !== 'service' && (
                    <>
                      {/* DPDP Consent Module */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: '#64748B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>
                            <i data-lucide="shield-check" style={{ width: '16px', height: '16px' }}></i>
                          </div>
                          <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Patient Consent</h2>
                      </div>
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px', borderRadius: '4px', marginBottom: '2px' }}>
                        <div style={{ fontSize: '10px', color: '#475569', marginBottom: '2px', fontWeight: 600 }}>
                          Patient consent is required for EMR creation and medical data processing. The patient has the right to withdraw this consent at any time.
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', marginBottom: '10px' }}>
                          <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#1E293B' }}>Consent for EMR Records Creation (Mandatory for Consultation)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>Consent for De-identified Data Sharing (Research / Analytics)</span>
                        </label>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                      <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '10px' }}>3</div>
                      <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Billing & Payment Summary</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '40px', marginBottom: '8px' }}>
                      {(() => {
                        const subtotalVal = getBillingItems().reduce((sum, item) => sum + item.amount, 0) + ((!isExistingPatient && getBillingItems().length > 0) ? 50 : 0);
                        const discAmt = (subtotalVal * Number(bookingDiscountPercent || 0)) / 100;
                        const finalTotalVal = Math.max(0, subtotalVal - discAmt);

                        return (
                          <div className="billing-summary">
                              {getBillingItems().map((item, i) => (
                                <div key={i} className="billing-row">
                                  <span>{item.description}</span>
                                  <span>₹{Number(item.amount).toFixed(2)}</span>
                                </div>
                              ))}
                              {!isExistingPatient && getBillingItems().length > 0 && <div className="billing-row"><span>Registration Fee</span> <span>₹50.00</span></div>}
                              
                              {/* Discount Input & Reason Fields */}
                              <div style={{ marginTop: '4px', borderTop: '1px dashed #CBD5E1', paddingTop: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', margin: 0, textTransform: 'uppercase' }}>Discount (%)</label>
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '90px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max={allowedDiscountPercent}
                                      placeholder="0"
                                      value={bookingDiscountPercent || ''}
                                      onChange={e => setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))}
                                      style={{ width: '100%', height: '22px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 20px 0 8px', fontSize: '10px', fontWeight: 800, textAlign: 'right' }}
                                    />
                                    <span style={{ position: 'absolute', right: '8px', fontWeight: 800, color: '#64748B', fontSize: '10px' }}>%</span>
                                  </div>
                                </div>
                                <span style={{ display: 'block', fontSize: '10.5px', color: '#64748B', textAlign: 'right', marginTop: '-4px', marginBottom: '4px', fontWeight: 600 }}>
                                  Max limit: {allowedDiscountPercent}%
                                </span>

                                {bookingDiscountPercent > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>Discount Reason <span style={{ color: '#EF4444' }}>*</span></label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Senior Citizen / Staff Relative"
                                      value={bookingDiscountReason}
                                      onChange={e => setBookingDiscountReason(e.target.value)}
                                      style={{ width: '100%', height: '22px', borderRadius: '6px', border: '1px solid #FCA5A5', padding: '0 8px', fontSize: '10px', fontWeight: 600, background: '#FFF5F5', color: '#991B1B' }}
                                      required
                                    />
                                  </div>
                                )}
                              </div>

                              {bookingDiscountPercent > 0 && (
                                <div className="billing-row" style={{ color: '#DC2626', fontWeight: 700 }}>
                                  <span>Discount Applied ({bookingDiscountPercent}%)</span>
                                  <span>-₹{discAmt.toFixed(2)}</span>
                                </div>
                              )}

                              <div className="billing-total" style={{ borderTop: '2px solid #2563EB', marginTop: '4px', paddingTop: '4px' }}>
                                <span>Total Amount</span> 
                                <span>
                                  ₹{finalTotalVal.toFixed(2)}
                                </span>
                              </div>
                          </div>
                        );
                      })()}
                      
                      <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, marginBottom: '2px', color: '#64748B' }}>Payment Method / Status</label>
                          {reschedulingAppointment ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#D1FAE5', color: '#065F46', padding: '12px 20px', borderRadius: '2px', fontWeight: 800, fontSize: '10px', border: '1px solid #A7F3D0' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                  Paid (Original Payment Preserved)
                              </div>
                          ) : (
                              <div className="payment-grid" style={{ marginBottom: '2px' }}>
                                  {['Cash', 'UPI', 'Other'].map(method => {
                                      const getIcon = () => {
                                          if (method === 'Cash') {
                                              return (
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                      <rect x="2" y="6" width="20" height="12" rx="2" />
                                                      <circle cx="12" cy="12" r="2" />
                                                      <path d="M6 12h.01M18 12h.01" />
                                                  </svg>
                                              );
                                          }
                                          if (method === 'UPI') {
                                              return (
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                                      <line x1="12" y1="18" x2="12.01" y2="18" />
                                                  </svg>
                                              );
                                          }
                                          return (
                                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                  <circle cx="12" cy="12" r="10" />
                                                  <line x1="12" y1="8" x2="12" y2="16" />
                                                  <line x1="8" y1="12" x2="16" y2="12" />
                                              </svg>
                                          );
                                      };
                                      return (
                                          <div 
                                              key={method} 
                                              className={`pay-btn ${bookingPaymentMethod === method ? 'active' : ''}`} 
                                              onClick={() => setBookingPaymentMethod(method)}
                                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px 8px', borderRadius: '2px', cursor: 'pointer', transition: '0.2s' }}
                                          >
                                              {getIcon()}
                                              <span style={{ fontWeight: 800 }}>{method}</span>
                                              {bookingPaymentMethod === method && (
                                                  <svg 
                                                      xmlns="http://www.w3.org/2000/svg" 
                                                      width="14" 
                                                      height="14" 
                                                      viewBox="0 0 24 24" 
                                                      fill="none" 
                                                      stroke="currentColor" 
                                                      strokeWidth="3" 
                                                      strokeLinecap="round" 
                                                      strokeLinejoin="round" 
                                                      style={{ marginLeft: 'auto', color: '#10B981' }}
                                                  >
                                                      <polyline points="20 6 9 17 4 12" />
                                                  </svg>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ width: '400px', height: '28px', fontWeight: 800, fontSize: '12px', borderRadius: '2px', justifyContent: 'center', gap: '4px' }} onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading}>
                          <i data-lucide={reschedulingAppointment ? "calendar-days" : (bookingType === 'lab' ? "flask-conical" : bookingType === 'service' ? "sparkles" : "qr-code")}></i> 
                          {loading 
                            ? (reschedulingAppointment ? 'Rescheduling Appointment...' : (bookingType === 'lab' ? 'Creating Lab Order...' : bookingType === 'service' ? 'Creating Service Order...' : 'Registering & Booking...')) 
                            : (reschedulingAppointment ? 'Confirm Reschedule' : (bookingType === 'lab' ? 'Confirm Lab Test & Pay' : bookingType === 'service' ? 'Confirm Service & Pay' : 'Confirm & Pay'))}
                      </button>
                  </div>
                </div>
              )}
           </div>
        )}


        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            
            {/* Header: Title + Button Group */}
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1D23' }}>Appointments</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '20px', padding: '0 16px', borderRadius: '2px', fontWeight: 700, fontSize: '11px' }} 
                  onClick={() => switchTab('registration-form')}
                >
                  <i data-lucide="plus" style={{ width: '16px', height: '16px' }}></i> Create Appointment
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    width: '38px', 
                    height: '20px', 
                    padding: 0,
                    borderRadius: '2px', 
                    background: showDateFilter ? '#2563EB' : '#EFF6FF', 
                    color: showDateFilter ? '#FFFFFF' : '#2563EB', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    setShowDateFilter(!showDateFilter);
                    setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
                  }}
                  title="Filter appointments by date"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                </button>
              </div>
            </div>

            {/* Sliding Date Range Filter Panel */}
            {showDateFilter && (
              <div className="glass-card" style={{ padding: '4px', marginBottom: '4px', animation: 'slideDown 0.3s ease-out', border: '1px solid #BFDBFE', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '10px', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i data-lucide="calendar-days" style={{ width: '18px', color: 'var(--primary)' }}></i> Select Appointment Date Range
                  </h4>
                  {(startDate || endDate) && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '10px', padding: '4px 10px', background: 'transparent', color: '#EF4444', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>From Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ height: '40px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px' }} 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', marginBottom: '2px', display: 'block', textTransform: 'uppercase' }}>To Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ height: '40px', borderRadius: '2px', border: '1px solid #CBD5E1', padding: '0 12px' }} 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                    />
                  </div>

                  {/* Preset Shortcuts */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ height: '40px', fontSize: '10px', fontWeight: 700, padding: '0 16px', borderRadius: '2px', border: '1px solid #E2E8F0', background: 'white' }} 
                      onClick={() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        setStartDate(todayStr);
                        setEndDate(todayStr);
                      }}
                    >
                      Today
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ height: '40px', fontSize: '10px', fontWeight: 700, padding: '0 16px', borderRadius: '2px', border: '1px solid #E2E8F0', background: 'white' }} 
                      onClick={() => {
                        const today = new Date();
                        const past7 = new Date();
                        past7.setDate(today.getDate() - 7);
                        setStartDate(past7.toISOString().split('T')[0]);
                        setEndDate(today.toISOString().split('T')[0]);
                      }}
                    >
                      Last 7 Days
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ height: '40px', fontSize: '10px', fontWeight: 700, padding: '0 16px', borderRadius: '2px', border: '1px solid #E2E8F0', background: 'white' }} 
                      onClick={() => {
                        const today = new Date();
                        const past30 = new Date();
                        past30.setDate(today.getDate() - 30);
                        setStartDate(past30.toISOString().split('T')[0]);
                        setEndDate(today.toISOString().split('T')[0]);
                      }}
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>

                {/* Filter matches info */}
                <div style={{ marginTop: '14px', fontSize: '10px', color: '#475569', fontWeight: 600 }}>
                  Found <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{getFilteredAppointments().length}</span> matching appointments.
                </div>
              </div>
            )}

            {(() => {
              const unifiedList = getUnifiedAppointmentsList();
              const counts = { All: unifiedList.length, Appointment: 0, 'Lab Test': 0, 'Clinical Service': 0 };
              unifiedList.forEach(item => {
                if (counts[item.type] !== undefined) counts[item.type]++;
              });

              return (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'All', label: 'All Bookings', count: counts.All, color: '#3B82F6', bg: '#EFF6FF' },
                    { key: 'Appointment', label: 'Appointments (OPD)', count: counts.Appointment, color: '#2563EB', bg: '#EFF6FF' },
                    { key: 'Lab Test', label: 'Lab Tests', count: counts['Lab Test'], color: '#10B981', bg: '#ECFDF5' },
                    { key: 'Clinical Service', label: 'Clinical Services', count: counts['Clinical Service'], color: '#8B5CF6', bg: '#F5F3FF' }
                  ].map(pill => (
                    <button
                      key={pill.key}
                      onClick={() => setApptTypeFilter(pill.key)}
                      style={{
                        padding: '8px 16px',
