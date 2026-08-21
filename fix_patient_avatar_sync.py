import sys

# 1. Update backend/routes/patientRoutes.js
pat_routes = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(pat_routes, 'r', encoding='utf-8') as f:
    text = f.read()

find_user_create = """      if (!existingUser) {
        await User.create({
          tenantId: req.tenantId,
          staff_id: cleanContact,
          name: name,
          email: cleanEmail !== 'n/a' ? cleanEmail : undefined,
          phone: cleanContact,
          role: 'patient',
          password_hash: 'not-applicable', // Patient logs in via OTP
          status: 'Active'
        });
      }"""

replace_user_create = """      if (!existingUser) {
        await User.create({
          tenantId: req.tenantId,
          staff_id: cleanContact,
          name: name,
          email: cleanEmail !== 'n/a' ? cleanEmail : undefined,
          phone: cleanContact,
          avatar: avatar || '',
          role: 'patient',
          password_hash: 'not-applicable', // Patient logs in via OTP
          status: 'Active'
        });
      } else if (avatar && !existingUser.avatar) {
        existingUser.avatar = avatar;
        await existingUser.save();
      }"""

if find_user_create in text:
    text = text.replace(find_user_create, replace_user_create)

find_return_user = """      user: {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        contact: patient.contact,
        email: patient.email,
        role: 'patient',
        isSetupComplete: true,
        tenantId: patient.tenantId
      }"""

replace_return_user = """      user: {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        contact: patient.contact,
        email: patient.email,
        avatar: patient.avatar || avatar || '',
        role: 'patient',
        isSetupComplete: true,
        tenantId: patient.tenantId
      }"""

if find_return_user in text:
    text = text.replace(find_return_user, replace_return_user)

with open(pat_routes, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated patientRoutes.js avatar persistence")

# 2. Update backend/routes/authRoutes.js
auth_routes = r'D:\rizwan\backend\routes\authRoutes.js'
with open(auth_routes, 'r', encoding='utf-8') as f:
    auth_text = f.read()

find_auth_user = """        user: { 
          ...user.toObject(), 
          id: targetId, 
          role: 'patient', 
          actualStaffRole: user.role,
          name: patientDoc ? patientDoc.name : user.name,
          password_hash: undefined 
        },"""

replace_auth_user = """        user: { 
          ...user.toObject(), 
          id: targetId, 
          role: 'patient', 
          actualStaffRole: user.role,
          name: patientDoc ? patientDoc.name : user.name,
          avatar: (patientDoc && patientDoc.avatar) ? patientDoc.avatar : (user.avatar || ''),
          password_hash: undefined 
        },"""

if find_auth_user in auth_text:
    auth_text = auth_text.replace(find_auth_user, replace_auth_user)
    with open(auth_routes, 'w', encoding='utf-8') as f:
        f.write(auth_text)
    print("Updated authRoutes.js avatar in verify-otp")

# 3. Update frontend/src/pages/PatientDashboard.jsx
dash_file = r'D:\rizwan\frontend\src\pages\PatientDashboard.jsx'
with open(dash_file, 'r', encoding='utf-8') as f:
    dash_text = f.read()

find_fetch_profile = """        setEditProfileData(prev => ({
          name: prev.name || profileRes.data.name || '',
          age: prev.age || cleanAge,
          gender: prev.gender || cleanGender,
          contact: prev.contact || cleanContact,
          address: prev.address || cleanAddress,
          bloodGroup: prev.bloodGroup || cleanBloodGroup,
          allergies: prev.allergies || cleanAllergies,
          medicalHistory: prev.medicalHistory || (Array.isArray(profileRes.data.medicalHistory) ? profileRes.data.medicalHistory.join(', ') : ''),
          avatar: prev.avatar || profileRes.data.avatar || ''
        }));"""

replace_fetch_profile = """        const loadedAvatar = profileRes.data.avatar || '';
        setEditProfileData(prev => ({
          name: prev.name || profileRes.data.name || '',
          age: prev.age || cleanAge,
          gender: prev.gender || cleanGender,
          contact: prev.contact || cleanContact,
          address: prev.address || cleanAddress,
          bloodGroup: prev.bloodGroup || cleanBloodGroup,
          allergies: prev.allergies || cleanAllergies,
          medicalHistory: prev.medicalHistory || (Array.isArray(profileRes.data.medicalHistory) ? profileRes.data.medicalHistory.join(', ') : ''),
          avatar: loadedAvatar || prev.avatar || ''
        }));

        if (loadedAvatar) {
          setCurrentUser(prev => ({ ...prev, avatar: loadedAvatar, name: profileRes.data.name || prev.name }));
          try {
            const stored = JSON.parse(localStorage.getItem('user') || '{}');
            stored.avatar = loadedAvatar;
            stored.name = profileRes.data.name || stored.name;
            localStorage.setItem('user', JSON.stringify(stored));
          } catch(e) {}
        }"""

if find_fetch_profile in dash_text:
    dash_text = dash_text.replace(find_fetch_profile, replace_fetch_profile)

# Check avatar rendering in sidebar
find_avatar_render = """        {/* User Profile at bottom of Sidebar */}
        <div className="sidebar-user" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Avatar" 
              className="user-avatar" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #BFDBFE' }}
            />
          ) : ("""

replace_avatar_render = """        {/* User Profile at bottom of Sidebar */}
        <div className="sidebar-user" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
          {(currentUser.avatar || editProfileData.avatar) ? (
            <img 
              src={currentUser.avatar || editProfileData.avatar} 
              alt="Avatar" 
              className="user-avatar" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #BFDBFE', flexShrink: 0, marginRight: '10px' }}
            />
          ) : ("""

if find_avatar_render in dash_text:
    dash_text = dash_text.replace(find_avatar_render, replace_avatar_render)

with open(dash_file, 'w', encoding='utf-8') as f:
    f.write(dash_text)
print("Updated PatientDashboard.jsx avatar sync and sidebar display")
