import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

old_line = '{renderField("Patient Name", <input type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />)}'

new_line = """{renderField("Patient Name", 
                              <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                                <select 
                                  style={{ ...inputStyle, width: '75px', padding: '0 4px', cursor: isExistingPatient ? 'not-allowed' : 'pointer', background: isExistingPatient ? '#F8FAFC' : '#F1F5F9' }} 
                                  value={formData.title || ''} 
                                  onChange={e => {
                                    const selectedTitle = e.target.value;
                                    let autoGender = formData.gender;
                                    if (selectedTitle === 'Mr.') autoGender = 'Male';
                                    else if (selectedTitle === 'Mrs.' || selectedTitle === 'Miss') autoGender = 'Female';
                                    else if (selectedTitle === 'Prefer not to say') autoGender = 'Other';
                                    setFormData({...formData, title: selectedTitle, gender: autoGender});
                                  }} 
                                  disabled={isExistingPatient}
                                >
                                  <option value="">Title</option>
                                  <option value="Mr.">Mr.</option>
                                  <option value="Mrs.">Mrs.</option>
                                  <option value="Miss">Miss</option>
                                  <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                                <input type="text" style={{...inputStyle, flex: 1}} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />
                              </div>
                            )}"""

if old_line in text:
    text = text.replace(old_line, new_line)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS! Added Title dropdown before Patient Name.')
else:
    print('Failed to find old line.')
