import sys

# 1. Update backend/routes/patientRoutes.js
pat_routes = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(pat_routes, 'r', encoding='utf-8') as f:
    text = f.read()

find_destructure = "const { name, age, gender, contact, email, address, bloodGroup, allergies, currentMedications, medicalHistory, avatar, otp } = req.body;"
replace_destructure = "const { name, age, ageMonths, ageDays, gender, contact, email, address, bloodGroup, allergies, currentMedications, medicalHistory, avatar, otp } = req.body;"

if find_destructure in text:
    text = text.replace(find_destructure, replace_destructure)
    print("Fixed destructuring in patientRoutes.js")
else:
    print("Could not find find_destructure in patientRoutes.js")

# In case auto-provisioning has any missing variables
find_auto_age = """        patient = new Patient({
          patientId: formattedId,
          name: name || userObj.name || 'Patient',
          age: parseInt(age) || 0,
          ageMonths: parseInt(ageMonths) || 0,
          ageDays: parseInt(ageDays) || 0,"""

replace_auto_age = """        patient = new Patient({
          patientId: formattedId,
          name: name || userObj.name || 'Patient',
          age: parseInt(age) || 0,
          ageMonths: parseInt(req.body.ageMonths) || 0,
          ageDays: parseInt(req.body.ageDays) || 0,"""

if find_auto_age in text:
    text = text.replace(find_auto_age, replace_auto_age)

with open(pat_routes, 'w', encoding='utf-8') as f:
    f.write(text)

# 2. Update PatientRegistration.jsx validation to accept ANY one of Years, Months, or Days
reg_file = r'D:\rizwan\frontend\src\pages\PatientRegistration.jsx'
with open(reg_file, 'r', encoding='utf-8') as f:
    reg_text = f.read()

find_reg_submit = """    if (!formData.name || !formData.contact || !formData.gender || !formData.title) {
      setError('Please fill in all mandatory personal details marked with *');
      return;
    }"""

replace_reg_submit = """    const hasAnyAge = Boolean(
      (formData.age !== '' && !isNaN(formData.age) && Number(formData.age) >= 0) ||
      (formData.ageMonths !== '' && !isNaN(formData.ageMonths) && Number(formData.ageMonths) >= 0) ||
      (formData.ageDays !== '' && !isNaN(formData.ageDays) && Number(formData.ageDays) >= 0)
    );

    if (!formData.name || !formData.contact || !formData.gender || !formData.title || !hasAnyAge) {
      setError('Please fill in all mandatory personal details (Title, Name, Contact, Gender, and Age in Y/M/D)');
      return;
    }"""

if find_reg_submit in reg_text:
    reg_text = reg_text.replace(find_reg_submit, replace_reg_submit)
    print("Updated age flexibility validation in PatientRegistration.jsx")

with open(reg_file, 'w', encoding='utf-8') as f:
    f.write(reg_text)

# 3. Update ReceptionistDashboard.jsx validation
rec_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(rec_file, 'r', encoding='utf-8') as f:
    rec_text = f.read()

find_rec_val = """          if (!formData.name || !formData.age || !formData.contact || !formData.gender) {
            showToast("Please fill in all mandatory fields (Name, Age, Contact, Gender)", "error");
            return;
          }"""

replace_rec_val = """          const hasAnyAge = Boolean(formData.age || formData.ageMonths || formData.ageDays);
          if (!formData.name || !hasAnyAge || !formData.contact || !formData.gender) {
            showToast("Please fill in all mandatory fields (Name, Age in Y/M/D, Contact, Gender)", "error");
            return;
          }"""

if find_rec_val in rec_text:
    rec_text = rec_text.replace(find_rec_val, replace_rec_val)
    print("Updated ReceptionistDashboard.jsx age validation")

with open(rec_file, 'w', encoding='utf-8') as f:
    f.write(rec_text)
