import sys

# 1. Update backend/routes/appointmentRoutes.js to populate full patient fields
routes_file = r'D:\rizwan\backend\routes\appointmentRoutes.js'
with open(routes_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_pop = ".populate('patientId', 'name contact age gender')"
replace_pop = ".populate('patientId', 'name contact age ageMonths ageDays gender email address bloodGroup allergies currentMedications medicalHistory avatar referredBy patientId')"

if find_pop in text:
    text = text.replace(find_pop, replace_pop)
    with open(routes_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated populate in appointmentRoutes.js")
else:
    print("Could not find find_pop in appointmentRoutes.js")

# 2. Update ReceptionistDashboard.jsx to cross-reference patientsList for complete details
rec_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(rec_file, 'r', encoding='utf-8') as f:
    rec_text = f.read()

find_open_modal = """  const openOnlineRequestReviewModal = (app) => {
    setSelectedOnlineRequest(app);
    setShowOnlineReviewModal(true);
  };"""

replace_open_modal = """  const openOnlineRequestReviewModal = (app) => {
    // Merge full patient object from patientsList if available
    const pId = app.patientId?._id || app.patientId;
    const fullPatient = patientsList.find(p => String(p._id) === String(pId)) || app.patientId;
    setSelectedOnlineRequest({
      ...app,
      patientId: fullPatient
    });
    setShowOnlineReviewModal(true);
  };"""

if find_open_modal in rec_text:
    rec_text = rec_text.replace(find_open_modal, replace_open_modal)
    print("Updated openOnlineRequestReviewModal in ReceptionistDashboard.jsx")

find_modal_pat_var = "const pat = selectedOnlineRequest.patientId || {};"
replace_modal_pat_var = """const pId = selectedOnlineRequest.patientId?._id || selectedOnlineRequest.patientId;
                const pat = (patientsList && patientsList.find(p => String(p._id) === String(pId))) || selectedOnlineRequest.patientId || {};"""

if find_modal_pat_var in rec_text:
    rec_text = rec_text.replace(find_modal_pat_var, replace_modal_pat_var)
    print("Updated pat resolution in review modal")

with open(rec_file, 'w', encoding='utf-8') as f:
    f.write(rec_text)
