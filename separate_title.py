import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """{renderField("Patient Name", 
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

new_block = """{renderField("Title", 
                              <select 
                                style={selectStyle} 
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
                                <option value="">--Select--</option>
                                <option value="Mr.">Mr.</option>
                                <option value="Mrs.">Mrs.</option>
                                <option value="Miss">Miss</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                              </select>
                            )}
                            {renderField("Patient Name", <input type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />)}"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS! Separated Title into its own aligned field.')
else:
    print('Failed to find old block.')
