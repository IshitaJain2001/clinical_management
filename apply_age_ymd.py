import sys, codecs

# 1. Update backend/routes/patientRoutes.js
pat_routes = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(pat_routes, 'r', encoding='utf-8') as f:
    text = f.read()

find_create = "const { name, age, gender, contact, email, address, bloodGroup, allergies, currentMedications, medicalHistory, avatar } = req.body;"
replace_create = "const { name, age, ageMonths, ageDays, gender, contact, email, address, bloodGroup, allergies, currentMedications, medicalHistory, avatar } = req.body;"

if find_create in text:
    text = text.replace(find_create, replace_create)

find_patient_create = """    const patient = await Patient.create({
      tenantId: req.tenantId,
      patientId: formattedId,
      name,
      age: parseInt(age) || 30,
      gender,"""

replace_patient_create = """    const patient = await Patient.create({
      tenantId: req.tenantId,
      patientId: formattedId,
      name,
      age: parseInt(age) || 0,
      ageMonths: parseInt(ageMonths) || 0,
      ageDays: parseInt(ageDays) || 0,
      gender,"""

if find_patient_create in text:
    text = text.replace(find_patient_create, replace_patient_create)

find_auto_create = """        patient = new Patient({
          patientId: formattedId,
          name: name || userObj.name || 'Patient',
          age: parseInt(age) || 25,
          gender: gender || 'Male',"""

replace_auto_create = """        patient = new Patient({
          patientId: formattedId,
          name: name || userObj.name || 'Patient',
          age: parseInt(age) || 0,
          ageMonths: parseInt(ageMonths) || 0,
          ageDays: parseInt(ageDays) || 0,
          gender: gender || 'Male',"""

if find_auto_create in text:
    text = text.replace(find_auto_create, replace_auto_create)

find_put_destructure = "const { name, age, gender, contact, address, bloodGroup, allergies, currentMedications, medicalHistory, avatar } = req.body;"
replace_put_destructure = "const { name, age, ageMonths, ageDays, gender, contact, address, bloodGroup, allergies, currentMedications, medicalHistory, avatar } = req.body;"

if find_put_destructure in text:
    text = text.replace(find_put_destructure, replace_put_destructure)

find_put_update = """    if (name) patient.name = name;
    if (age) patient.age = parseInt(age);"""

replace_put_update = """    if (name) patient.name = name;
    if (age !== undefined) patient.age = parseInt(age) || 0;
    if (ageMonths !== undefined) patient.ageMonths = parseInt(ageMonths) || 0;
    if (ageDays !== undefined) patient.ageDays = parseInt(ageDays) || 0;"""

if find_put_update in text:
    text = text.replace(find_put_update, replace_put_update)

with open(pat_routes, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated patientRoutes.js")

# 2. Update frontend/src/pages/PatientRegistration.jsx
reg_file = r'D:\rizwan\frontend\src\pages\PatientRegistration.jsx'
with open(reg_file, 'r', encoding='utf-8') as f:
    reg_text = f.read()

find_reg_state = """  const [formData, setFormData] = useState({
    title: '',
    name: '',
    age: '',
    gender: '',"""

replace_reg_state = """  const [formData, setFormData] = useState({
    title: '',
    name: '',
    age: '',
    ageMonths: '',
    ageDays: '',
    gender: '',"""

if find_reg_state in reg_text:
    reg_text = reg_text.replace(find_reg_state, replace_reg_state)

find_reg_payload = """      const patientPayload = {
        title: formData.title,
        name: formData.name.trim(),
        age: parseInt(formData.age) || 0,
        gender: formData.gender,"""

replace_reg_payload = """      const patientPayload = {
        title: formData.title,
        name: formData.name.trim(),
        age: parseInt(formData.age) || 0,
        ageMonths: parseInt(formData.ageMonths) || 0,
        ageDays: parseInt(formData.ageDays) || 0,
        gender: formData.gender,"""

if find_reg_payload in reg_text:
    reg_text = reg_text.replace(find_reg_payload, replace_reg_payload)

find_reg_age_field = """              {renderField("Age (Yrs)", (
                <input 
                  type="number" 
                  className="impressive-input" 
                  style={inputStyle} 
                  value={formData.age} 
                  onChange={e => setFormData({...formData, age: e.target.value})} 
                  placeholder="Age in years"
                />
              ), true)}"""

replace_reg_age_field = """              {renderField("Age", (
                <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="120"
                    placeholder="Yrs" 
                    className="impressive-input" 
                    style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center' }} 
                    value={formData.age} 
                    onChange={e => setFormData({...formData, age: e.target.value})} 
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Y</span>

                  <input 
                    type="number" 
                    min="0" 
                    max="11"
                    placeholder="Mths" 
                    className="impressive-input" 
                    style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center' }} 
                    value={formData.ageMonths} 
                    onChange={e => setFormData({...formData, ageMonths: e.target.value})} 
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>M</span>

                  <input 
                    type="number" 
                    min="0" 
                    max="30"
                    placeholder="Days" 
                    className="impressive-input" 
                    style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center' }} 
                    value={formData.ageDays} 
                    onChange={e => setFormData({...formData, ageDays: e.target.value})} 
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>D</span>
                </div>
              ), true)}"""

if find_reg_age_field in reg_text:
    reg_text = reg_text.replace(find_reg_age_field, replace_reg_age_field)

with open(reg_file, 'w', encoding='utf-8') as f:
    f.write(reg_text)
print("Updated PatientRegistration.jsx")

# 3. Update frontend/src/pages/ReceptionistDashboard.jsx
rec_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(rec_file, 'r', encoding='utf-8') as f:
    rec_text = f.read()

find_rec_state = "    name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: ''"
replace_rec_state = "    name: '', age: '', ageMonths: '', ageDays: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '', allergies: 'None', currentMedications: ''"

if find_rec_state in rec_text:
    rec_text = rec_text.replace(find_rec_state, replace_rec_state)

find_rec_age_field = """                            {renderField("Age (Yrs)", <input type="number" className={`impressive-input ${!formData.age && isFormStarted ? 'required-empty' : ''}`} style={inputStyle} value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} readOnly={isExistingPatient} />)}"""

replace_rec_age_field = """                            {renderField("Age", (
                              <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max="120"
                                  placeholder="Yrs" 
                                  className={`impressive-input ${!formData.age && !formData.ageMonths && !formData.ageDays && isFormStarted ? 'required-empty' : ''}`} 
                                  style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center' }} 
                                  value={formData.age} 
                                  onChange={e => setFormData({...formData, age: e.target.value})} 
                                  readOnly={isExistingPatient} 
                                />
                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Y</span>

                                <input 
                                  type="number" 
                                  min="0" 
                                  max="11"
                                  placeholder="Mths" 
                                  className="impressive-input" 
                                  style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center' }} 
                                  value={formData.ageMonths || ''} 
                                  onChange={e => setFormData({...formData, ageMonths: e.target.value})} 
                                  readOnly={isExistingPatient} 
                                />
                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>M</span>

                                <input 
                                  type="number" 
                                  min="0" 
                                  max="30"
                                  placeholder="Days" 
                                  className="impressive-input" 
                                  style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center' }} 
                                  value={formData.ageDays || ''} 
                                  onChange={e => setFormData({...formData, ageDays: e.target.value})} 
                                  readOnly={isExistingPatient} 
                                />
                                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>D</span>
                              </div>
                            ))}"""

if find_rec_age_field in rec_text:
    rec_text = rec_text.replace(find_rec_age_field, replace_rec_age_field)

# Ensure Receptionist form submission includes ageMonths and ageDays
find_rec_payload = """          age: parseInt(formData.age) || 30,
          gender: formData.gender,"""

replace_rec_payload = """          age: parseInt(formData.age) || 0,
          ageMonths: parseInt(formData.ageMonths) || 0,
          ageDays: parseInt(formData.ageDays) || 0,
          gender: formData.gender,"""

if find_rec_payload in rec_text:
    rec_text = rec_text.replace(find_rec_payload, replace_rec_payload)

with open(rec_file, 'w', encoding='utf-8') as f:
    f.write(rec_text)
print("Updated ReceptionistDashboard.jsx")

# 4. Update PatientDashboard.jsx
pat_dash = r'D:\rizwan\frontend\src\pages\PatientDashboard.jsx'
with open(pat_dash, 'r', encoding='utf-8') as f:
    dash_text = f.read()

find_dash_state = "  const [editProfileData, setEditProfileData] = useState({ name: '', age: '', gender: '', contact: '', address: '', bloodGroup: '', allergies: '', medicalHistory: '' });"
replace_dash_state = "  const [editProfileData, setEditProfileData] = useState({ name: '', age: '', ageMonths: '', ageDays: '', gender: '', contact: '', address: '', bloodGroup: '', allergies: '', medicalHistory: '' });"

if find_dash_state in dash_text:
    dash_text = dash_text.replace(find_dash_state, replace_dash_state)

find_onboard_age = """                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'block' }}>Age (Years) *</label>
                  <input type="number" className="form-control" style={{ height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', paddingLeft: '12px', fontSize: '13px', fontWeight: 600 }} value={editProfileData.age} onChange={e => setEditProfileData({...editProfileData, age: e.target.value})} required min="1" max="120" />
                </div>"""

replace_onboard_age = """                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'block' }}>Age (Years / Months / Days) *</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="number" className="form-control" style={{ height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 8px', fontSize: '13px', fontWeight: 600, textAlign: 'center', flex: 1 }} value={editProfileData.age} onChange={e => setEditProfileData({...editProfileData, age: e.target.value})} placeholder="Yrs" min="0" max="120" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>Y</span>
                    <input type="number" className="form-control" style={{ height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 8px', fontSize: '13px', fontWeight: 600, textAlign: 'center', flex: 1 }} value={editProfileData.ageMonths || ''} onChange={e => setEditProfileData({...editProfileData, ageMonths: e.target.value})} placeholder="M" min="0" max="11" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>M</span>
                    <input type="number" className="form-control" style={{ height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 8px', fontSize: '13px', fontWeight: 600, textAlign: 'center', flex: 1 }} value={editProfileData.ageDays || ''} onChange={e => setEditProfileData({...editProfileData, ageDays: e.target.value})} placeholder="D" min="0" max="30" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>D</span>
                  </div>
                </div>"""

if find_onboard_age in dash_text:
    dash_text = dash_text.replace(find_onboard_age, replace_onboard_age)

with open(pat_dash, 'w', encoding='utf-8') as f:
    f.write(dash_text)
print("Updated PatientDashboard.jsx")
