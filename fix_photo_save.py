import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update onChange to convert to base64
target_upload1 = """<input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />"""
repl_upload1 = """<input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" onChange={(e) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onloadend = () => { setPatientPhoto(reader.result); }; reader.readAsDataURL(file); } }} />"""

target_upload2 = """<input type="file" id="patientCameraUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />"""
repl_upload2 = """<input type="file" id="patientCameraUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const reader = new FileReader(); reader.onloadend = () => { setPatientPhoto(reader.result); }; reader.readAsDataURL(file); } }} />"""

# 2. Add avatar to patient creation
target_payload = """        const patientRes = await api.post('/patients', {
          name: formData.name,
          age: parseInt(formData.age) || 30,
          gender: formData.gender,
          contact: formData.contact,
          email: formData.email,
          bloodGroup: formData.bloodGroup || 'O+',
          address: formData.address || '',
          medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(item => item.trim()) : [],
          allergies: formData.allergies || 'None',
          currentMedications: formData.currentMedications || '',
          otp: verificationOtp,
          dpdpConsent: dpdpConsent,
          patientDocuments: patientDocuments,
          referredBy: formData.referredBy || ''
        });"""

repl_payload = """        const patientRes = await api.post('/patients', {
          name: formData.name,
          age: parseInt(formData.age) || 30,
          gender: formData.gender,
          contact: formData.contact,
          email: formData.email,
          bloodGroup: formData.bloodGroup || 'O+',
          address: formData.address || '',
          medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(item => item.trim()) : [],
          allergies: formData.allergies || 'None',
          currentMedications: formData.currentMedications || '',
          otp: verificationOtp,
          dpdpConsent: dpdpConsent,
          patientDocuments: patientDocuments,
          referredBy: formData.referredBy || '',
          avatar: patientPhoto || ''
        });"""

# 3. Add avatar to patient update (if existing patient)
target_update = """          await api.put(`/patients/${selectedPatient._id}`, {
            name: selectedPatient.name,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            contact: selectedPatient.contact,
            currentMedications: formData.currentMedications || selectedPatient.currentMedications || '',
            allergies: formData.allergies !== undefined ? formData.allergies : (selectedPatient.allergies || 'None'),
            medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(item => item.trim()) : selectedPatient.medicalHistory
          });"""

repl_update = """          await api.put(`/patients/${selectedPatient._id}`, {
            name: selectedPatient.name,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            contact: selectedPatient.contact,
            currentMedications: formData.currentMedications || selectedPatient.currentMedications || '',
            allergies: formData.allergies !== undefined ? formData.allergies : (selectedPatient.allergies || 'None'),
            medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(item => item.trim()) : selectedPatient.medicalHistory,
            ...(patientPhoto && patientPhoto.startsWith('data:image') ? { avatar: patientPhoto } : {})
          });"""

# Apply replacements
if target_upload1 in text:
    text = text.replace(target_upload1, repl_upload1)
    print("Fixed upload 1")
if target_upload2 in text:
    text = text.replace(target_upload2, repl_upload2)
    print("Fixed upload 2")
if target_payload in text:
    text = text.replace(target_payload, repl_payload)
    print("Fixed payload")
if target_update in text:
    text = text.replace(target_update, repl_update)
    print("Fixed update")

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print("SUCCESS: Photo logic saved.")
