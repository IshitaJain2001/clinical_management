import sys

# 1. Update backend/routes/appointmentRoutes.js
routes_file = r'D:\rizwan\backend\routes\appointmentRoutes.js'
with open(routes_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_fee = "const consultFee = Number(doctorObj?.consultationFee) || 500;"
replace_fee = "const consultFee = (doctorObj && doctorObj.consultationFee !== undefined && doctorObj.consultationFee !== null && !isNaN(doctorObj.consultationFee)) ? Number(doctorObj.consultationFee) : 0;"

if find_fee in text:
    text = text.replace(find_fee, replace_fee)
    with open(routes_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated dynamic doctor consultationFee in appointmentRoutes.js")
else:
    print("Could not find find_fee in appointmentRoutes.js")

# 2. Update frontend/src/pages/PatientDashboard.jsx
dash_file = r'D:\rizwan\frontend\src\pages\PatientDashboard.jsx'
with open(dash_file, 'r', encoding='utf-8') as f:
    dash_text = f.read()

find_dash_fee = "const docFee = Number(appt.doctorId?.consultationFee) || 500;"
replace_dash_fee = "const docFee = (appt.doctorId && appt.doctorId.consultationFee !== undefined && appt.doctorId.consultationFee !== null && !isNaN(appt.doctorId.consultationFee)) ? Number(appt.doctorId.consultationFee) : 0;"

if find_dash_fee in dash_text:
    dash_text = dash_text.replace(find_dash_fee, replace_dash_fee)
    with open(dash_file, 'w', encoding='utf-8') as f:
        f.write(dash_text)
    print("Updated dynamic doctor consultationFee in PatientDashboard.jsx")
else:
    print("Could not find find_dash_fee in PatientDashboard.jsx")
