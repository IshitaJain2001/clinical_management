import sys
main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Title
old_title = """{renderField("Title", 
                              <select 
                                style={selectStyle} 
                                value={formData.title || ''}"""
new_title = """{renderField("Title", 
                              <select 
                                className={`impressive-select ${!formData.title && isFormStarted ? 'required-empty' : ''}`}
                                style={selectStyle} 
                                value={formData.title || ''}"""
text = text.replace(old_title, new_title)

# Fix Patient Name
old_name = """{renderField("Patient Name", <input type="text" className="impressive-input" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />, true)}"""
new_name = """{renderField("Patient Name", <input type="text" className={`impressive-input ${!formData.name && isFormStarted ? 'required-empty' : ''}`} style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} readOnly={isExistingPatient} />, true)}"""
text = text.replace(old_name, new_name)

# Fix Gender
old_gender = """{renderField("Gender", <select className="impressive-select" style={selectStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={isExistingPatient}>"""
new_gender = """{renderField("Gender", <select className={`impressive-select ${!formData.gender && isFormStarted ? 'required-empty' : ''}`} style={selectStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={isExistingPatient}>"""
text = text.replace(old_gender, new_gender)

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Applied logic to Title, Name, Gender.')
