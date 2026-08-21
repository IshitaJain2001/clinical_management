import sys, codecs

# 1. Update backend/routes/patientRoutes.js
patient_routes_file = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(patient_routes_file, 'r', encoding='utf-8') as f:
    routes_text = f.read()

find_put_block = """    if (!patient) return res.status(404).json({ error: 'Patient not found' });"""

replace_put_block = """    if (!patient) {
      // Auto-provision patient record if user exists and is completing onboarding
      const userObj = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }) ||
                      await User.findOne({ _id: req.user.id, tenantId: req.tenantId }) ||
                      await User.findOne({ staff_id: req.user.staff_id, tenantId: req.tenantId });
      if (userObj) {
        const count = await Patient.countDocuments({ tenantId: req.tenantId });
        let nextSeq = count + 1;
        let formattedId = `pat-${String(nextSeq).padStart(2, '0')}`;
        let exists = await Patient.exists({ tenantId: req.tenantId, patientId: formattedId });
        while (exists) {
          nextSeq++;
          formattedId = `pat-${String(nextSeq).padStart(2, '0')}`;
          exists = await Patient.exists({ tenantId: req.tenantId, patientId: formattedId });
        }

        patient = new Patient({
          patientId: formattedId,
          name: name || userObj.name || 'Patient',
          age: parseInt(age) || 25,
          gender: gender || 'Male',
          contact: contact ? contact.trim() : (userObj.phone || userObj.staff_id),
          email: userObj.email || (contact && contact.includes('@') ? contact : ''),
          address: address || '',
          bloodGroup: bloodGroup || 'O+',
          allergies: allergies || '',
          currentMedications: currentMedications || '',
          medicalHistory: medicalHistory || [],
          avatar: avatar || userObj.avatar || '',
          tenantId: req.tenantId
        });
        await patient.save();

        userObj.staff_id = patient.contact;
        userObj.name = patient.name;
        userObj.isSetupComplete = true;
        await userObj.save();

        const io = req.app.get("io");
        if (io && req.tenantId) {
          io.to(req.tenantId).emit("data_changed", { type: "patients" });
        }

        return res.json(patient);
      }
      return res.status(404).json({ error: 'Patient not found' });
    }"""

if find_put_block in routes_text:
    routes_text = routes_text.replace(find_put_block, replace_put_block, 1)
    with open(patient_routes_file, 'w', encoding='utf-8') as f:
        f.write(routes_text)
    print("Updated patientRoutes.js with auto-provision on onboarding!")
else:
    print("Could not find find_put_block in patientRoutes.js")

# 2. Update frontend/src/pages/PatientDashboard.jsx to prevent polling form wipe
dashboard_file = r'D:\rizwan\frontend\src\pages\PatientDashboard.jsx'
with open(dashboard_file, 'r', encoding='utf-8') as f:
    dash_text = f.read()

find_fetch_profile = """    // Fetch Profile Independently
    try {
      const profileRes = await api.get(`/patients/${currentUser.id}`);
      setPatientProfile(profileRes.data);
      patientDbId = profileRes.data._id;
      const isOnboarding = !currentUser.isSetupComplete;
      const cleanAddress = (isOnboarding && profileRes.data.address === 'Registered via Google Sign-In') ? '' : (profileRes.data.address || '');
      const cleanContact = (isOnboarding && profileRes.data.contact && profileRes.data.contact.includes('@')) ? '' : (profileRes.data.contact || '');
      const cleanAge = (isOnboarding && profileRes.data.age === 30) ? '' : (profileRes.data.age || '');
      const cleanGender = (isOnboarding && profileRes.data.gender === 'Other') ? '' : (profileRes.data.gender || 'Male');
      const cleanBloodGroup = isOnboarding ? '' : (profileRes.data.bloodGroup || 'O+');
      const cleanAllergies = (isOnboarding && profileRes.data.allergies === 'None') ? '' : (profileRes.data.allergies || '');

      setEditProfileData({
        name: profileRes.data.name || '',
        age: cleanAge,
        gender: cleanGender,
        contact: cleanContact,
        address: cleanAddress,
        bloodGroup: cleanBloodGroup,
        allergies: cleanAllergies,
        medicalHistory: Array.isArray(profileRes.data.medicalHistory) ? profileRes.data.medicalHistory.join(', ') : '',
        avatar: profileRes.data.avatar || ''
      });
    } catch (profileErr) {
      console.warn("Failed to load full patient profile details", profileErr);
    }"""

replace_fetch_profile = """    // Fetch Profile Independently
    try {
      const profileRes = await api.get(`/patients/${currentUser.id}`);
      setPatientProfile(profileRes.data);
      patientDbId = profileRes.data._id;
      const isOnboarding = !currentUser.isSetupComplete;
      
      // Do NOT overwrite user typed fields during background polling if currently onboarding
      if (!isOnboarding || !editProfileData.contact) {
        const cleanAddress = (isOnboarding && profileRes.data.address === 'Registered via Google Sign-In') ? '' : (profileRes.data.address || '');
        const cleanContact = (isOnboarding && profileRes.data.contact && profileRes.data.contact.includes('@')) ? '' : (profileRes.data.contact || '');
        const cleanAge = (isOnboarding && profileRes.data.age === 30) ? '' : (profileRes.data.age || '');
        const cleanGender = (isOnboarding && profileRes.data.gender === 'Other') ? '' : (profileRes.data.gender || 'Male');
        const cleanBloodGroup = isOnboarding ? '' : (profileRes.data.bloodGroup || 'O+');
        const cleanAllergies = (isOnboarding && profileRes.data.allergies === 'None') ? '' : (profileRes.data.allergies || '');

        setEditProfileData(prev => ({
          name: prev.name || profileRes.data.name || '',
          age: prev.age || cleanAge,
          gender: prev.gender || cleanGender,
          contact: prev.contact || cleanContact,
          address: prev.address || cleanAddress,
          bloodGroup: prev.bloodGroup || cleanBloodGroup,
          allergies: prev.allergies || cleanAllergies,
          medicalHistory: prev.medicalHistory || (Array.isArray(profileRes.data.medicalHistory) ? profileRes.data.medicalHistory.join(', ') : ''),
          avatar: prev.avatar || profileRes.data.avatar || ''
        }));
      }
    } catch (profileErr) {
      console.warn("Failed to load full patient profile details", profileErr);
    }"""

if find_fetch_profile in dash_text:
    dash_text = dash_text.replace(find_fetch_profile, replace_fetch_profile)
    print("Updated fetchData profile logic in PatientDashboard.jsx")
else:
    print("Could not find find_fetch_profile in PatientDashboard.jsx")

find_complete_handler = """      const formattedHistory = editProfileData.medicalHistory.split(',').map(item => item.trim()).filter(Boolean);
      const res = await api.put(`/patients/${currentUser.id}`, { ...editProfileData, medicalHistory: formattedHistory });
      setPatientProfile(res.data);
      
      const updatedUser = { ...currentUser, name: res.data.name, isSetupComplete: true, avatar: res.data.avatar || '' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      showToast("Profile completed successfully! Welcome to your dashboard.", "success");"""

replace_complete_handler = """      const formattedHistory = (editProfileData.medicalHistory || '').split(',').map(item => item.trim()).filter(Boolean);
      const res = await api.put(`/patients/${currentUser.id}`, { ...editProfileData, medicalHistory: formattedHistory });
      setPatientProfile(res.data);
      
      const updatedUser = { ...currentUser, id: res.data._id || currentUser.id, name: res.data.name, isSetupComplete: true, avatar: res.data.avatar || '' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      showToast("Profile completed successfully! Welcome to your dashboard.", "success");"""

if find_complete_handler in dash_text:
    dash_text = dash_text.replace(find_complete_handler, replace_complete_handler)
    print("Updated handleCompleteOnboarding in PatientDashboard.jsx")
else:
    print("Could not find find_complete_handler in PatientDashboard.jsx")

with open(dashboard_file, 'w', encoding='utf-8') as f:
    f.write(dash_text)
