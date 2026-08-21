import sys

# 1. Fix backend/routes/patientRoutes.js
pat_routes = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(pat_routes, 'r', encoding='utf-8') as f:
    text = f.read()

find_clean_email = "const cleanEmail = email ? email.toLowerCase().trim() : 'n/a';"
replace_clean_email = "const cleanEmail = (email && email.trim() && email.trim().toLowerCase() !== 'n/a') ? email.toLowerCase().trim() : '';"

if find_clean_email in text:
    text = text.replace(find_clean_email, replace_clean_email)
    print("Fixed cleanEmail in patientRoutes.js")
else:
    print("Could not find find_clean_email in patientRoutes.js")

# In existing email check
find_email_check = "if (cleanEmail && cleanEmail !== 'n/a') {"
replace_email_check = "if (cleanEmail && cleanEmail !== '') {"

if find_email_check in text:
    text = text.replace(find_email_check, replace_email_check)

with open(pat_routes, 'w', encoding='utf-8') as f:
    f.write(text)

# 2. Fix PatientRegistration.jsx so Email input is editable when user logs in via Mobile OTP
reg_file = r'D:\rizwan\frontend\src\pages\PatientRegistration.jsx'
with open(reg_file, 'r', encoding='utf-8') as f:
    reg_text = f.read()

find_email_input = """              {renderField("Email", (
                <div style={{ display: 'flex', width: '100%', gap: '6px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="impressive-input" 
                    style={{ ...inputStyle, background: '#F8FAFC' }} 
                    value={formData.email} 
                    readOnly
                  />
                  <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Verified
                  </span>
                </div>
              ))}"""

replace_email_input = """              {renderField("Email", (
                <div style={{ display: 'flex', width: '100%', gap: '6px', alignItems: 'center' }}>
                  <input 
                    type="email" 
                    className="impressive-input" 
                    style={{ ...inputStyle, background: initialContact.includes('@') ? '#F8FAFC' : 'white' }} 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="patient@example.com"
                    readOnly={initialContact.includes('@')}
                  />
                  {initialContact.includes('@') ? (
                    <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Verified
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      (Optional)
                    </span>
                  )}
                </div>
              ))}"""

if find_email_input in reg_text:
    reg_text = reg_text.replace(find_email_input, replace_email_input)
    print("Fixed Email input field in PatientRegistration.jsx")
else:
    print("Could not find find_email_input in PatientRegistration.jsx")

with open(reg_file, 'w', encoding='utf-8') as f:
    f.write(reg_text)

# 3. Update ReceptionistDashboard.jsx to format email nicely
rec_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(rec_file, 'r', encoding='utf-8') as f:
    rec_text = f.read()

find_modal_email = "<div>✉️ Email: <b style={{ color: '#0F172A' }}>{pat.email || 'N/A'}</b></div>"
replace_modal_email = "<div>✉️ Email: <b style={{ color: (pat.email && pat.email !== 'n/a') ? '#0F172A' : '#94A3B8' }}>{(pat.email && pat.email !== 'n/a') ? pat.email : 'Not Provided'}</b></div>"

if find_modal_email in rec_text:
    rec_text = rec_text.replace(find_modal_email, replace_modal_email)
    print("Updated email display in ReceptionistDashboard.jsx")

with open(rec_file, 'w', encoding='utf-8') as f:
    f.write(rec_text)
