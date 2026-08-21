import sys

# 1. Update PatientRegistration.jsx
reg_file = r'D:\rizwan\frontend\src\pages\PatientRegistration.jsx'
with open(reg_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_init = """  const tempToken = location.state?.tempToken;
  const initialContact = location.state?.emailOrPhone || '';"""

replace_init = """  let savedEmailOrPhone = '';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    savedEmailOrPhone = u.emailOrPhone || u.email || '';
  } catch(e) {}

  const tempToken = location.state?.tempToken || localStorage.getItem('token');
  const initialContact = location.state?.emailOrPhone || savedEmailOrPhone || '';"""

if find_init in text:
    text = text.replace(find_init, replace_init)

find_email_payload = "email: formData.email ? formData.email.trim().toLowerCase() : '',"
replace_email_payload = "email: (formData.email || (initialContact.includes('@') ? initialContact : '')).trim().toLowerCase(),"

if find_email_payload in text:
    text = text.replace(find_email_payload, replace_email_payload)

with open(reg_file, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated PatientRegistration.jsx email retention")

# 2. Update backend/routes/patientRoutes.js with fallback to req.user.emailOrPhone
pat_routes = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(pat_routes, 'r', encoding='utf-8') as f:
    pat_text = f.read()

find_clean_email = "const cleanEmail = (email && email.trim() && email.trim().toLowerCase() !== 'n/a') ? email.toLowerCase().trim() : '';"
replace_clean_email = """const fallbackOtpEmail = (req.user && req.user.emailOrPhone && req.user.emailOrPhone.includes('@')) ? req.user.emailOrPhone.toLowerCase().trim() : '';
    const cleanEmail = (email && email.trim() && email.trim().toLowerCase() !== 'n/a') ? email.toLowerCase().trim() : fallbackOtpEmail;"""

if find_clean_email in pat_text:
    pat_text = pat_text.replace(find_clean_email, replace_clean_email)
    print("Updated patientRoutes.js cleanEmail with fallbackOtpEmail")

with open(pat_routes, 'w', encoding='utf-8') as f:
    f.write(pat_text)
