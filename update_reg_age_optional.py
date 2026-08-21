import sys

reg_file = r'D:\rizwan\frontend\src\pages\PatientRegistration.jsx'
with open(reg_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_validation = """    if (!formData.name || !formData.age || !formData.gender || !formData.contact) {
      setError("Please fill in mandatory patient details (Full Name, Age, Gender, and Mobile Number).");
      return;
    }"""

replace_validation = """    const hasAnyAge = Boolean(
      (formData.age !== '' && !isNaN(formData.age) && Number(formData.age) >= 0) ||
      (formData.ageMonths !== '' && !isNaN(formData.ageMonths) && Number(formData.ageMonths) >= 0) ||
      (formData.ageDays !== '' && !isNaN(formData.ageDays) && Number(formData.ageDays) >= 0)
    );

    if (!formData.name || !hasAnyAge || !formData.gender || !formData.contact) {
      setError("Please fill in mandatory patient details (Full Name, Age [Years, Months, or Days], Gender, and Mobile Number).");
      return;
    }"""

if find_validation in text:
    text = text.replace(find_validation, replace_validation)

find_payload = """      const patientPayload = {
        name: `${formData.title ? formData.title + ' ' : ''}${formData.name.trim()}`,
        age: parseInt(formData.age, 10) || 30,
        gender: formData.gender,"""

replace_payload = """      const patientPayload = {
        name: `${formData.title ? formData.title + ' ' : ''}${formData.name.trim()}`,
        age: parseInt(formData.age, 10) || 0,
        ageMonths: parseInt(formData.ageMonths, 10) || 0,
        ageDays: parseInt(formData.ageDays, 10) || 0,
        gender: formData.gender,"""

if find_payload in text:
    text = text.replace(find_payload, replace_payload)

with open(reg_file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated PatientRegistration.jsx age flexibility and payload")
