import sys, codecs

# 1. Update frontend/src/utils/api.js to guard patient registration & login from auto-logout
api_file = r'D:\rizwan\frontend\src\utils\api.js'
with open(api_file, 'r', encoding='utf-8') as f:
    api_text = f.read()

find_auto_logout = """      // Only force redirect and logout if not on auth request/login page and not a subscription limit error
      if (!isAuthRequest && window.location.pathname !== '/login' && !isSubscriptionError) {
        const reason = (error.response.data && error.response.data.error === 'Password changed') 
          ? 'password_changed' 
          : 'session_expired';
        handleAutoLogout(reason);
      }"""

replace_auto_logout = """      const isPatientAuthRoute = window.location.pathname.startsWith('/patient-register') || 
                                 window.location.pathname.startsWith('/patient/login') ||
                                 window.location.pathname === '/login';

      // Only force redirect and logout if not on auth request/login page and not a subscription limit error
      if (!isAuthRequest && !isPatientAuthRoute && !isSubscriptionError) {
        const reason = (error.response.data && error.response.data.error === 'Password changed') 
          ? 'password_changed' 
          : 'session_expired';
        handleAutoLogout(reason);
      }"""

if find_auto_logout in api_text:
    api_text = api_text.replace(find_auto_logout, replace_auto_logout)
    with open(api_file, 'w', encoding='utf-8') as f:
        f.write(api_text)
    print("Updated api.js auto-logout guards")
else:
    print("Could not find find_auto_logout in api.js")

# 2. Update frontend/src/pages/PatientPortalLogin.jsx to store token for registration
login_file = r'D:\rizwan\frontend\src\pages\PatientPortalLogin.jsx'
with open(login_file, 'r', encoding='utf-8') as f:
    login_text = f.read()

find_login_new_user = """      if (response.data.isNewUser) {
        // Redirect to patient registration with the temporary token
        navigate('/patient-register', { 
          state: { 
            tempToken: response.data.tempToken, 
            emailOrPhone: response.data.emailOrPhone 
          } 
        });
      }"""

replace_login_new_user = """      if (response.data.isNewUser) {
        // Store temp token so all API calls on /patient-register (doctors, slots, availability) are authorized
        localStorage.setItem('token', response.data.tempToken);
        localStorage.setItem('user', JSON.stringify({ role: 'patient', isNewPatient: true, emailOrPhone: response.data.emailOrPhone }));
        localStorage.setItem('tenantId', 'city_hospital');
        navigate('/patient-register', { 
          state: { 
            tempToken: response.data.tempToken, 
            emailOrPhone: response.data.emailOrPhone 
          } 
        });
      }"""

if find_login_new_user in login_text:
    login_text = login_text.replace(find_login_new_user, replace_login_new_user)
    with open(login_file, 'w', encoding='utf-8') as f:
        f.write(login_text)
    print("Updated PatientPortalLogin.jsx new patient token persistence")
else:
    print("Could not find find_login_new_user in PatientPortalLogin.jsx")

# 3. Update frontend/src/pages/PatientRegistration.jsx to directly open patient dashboard after submission
reg_file = r'D:\rizwan\frontend\src\pages\PatientRegistration.jsx'
with open(reg_file, 'r', encoding='utf-8') as f:
    reg_text = f.read()

find_reg_success = """      setSuccess("Registration completed successfully! Redirecting to login...");
      setTimeout(() => {
        navigate('/patient/login');
      }, 1500);"""

replace_reg_success = """      const responseData = res.data || {};
      const finalToken = responseData.token || tempToken;
      const finalUser = responseData.user || { 
        id: responseData._id || newPatient._id, 
        _id: responseData._id || newPatient._id, 
        name: responseData.name || newPatient.name, 
        role: 'patient', 
        isSetupComplete: true 
      };

      localStorage.setItem('token', finalToken);
      localStorage.setItem('user', JSON.stringify(finalUser));
      localStorage.setItem('tenantId', responseData.tenantId || 'city_hospital');
      window.dispatchEvent(new CustomEvent('curoxa_login_success'));

      setSuccess("Registration completed successfully! Opening your Patient Portal...");
      setTimeout(() => {
        navigate('/patient');
      }, 1000);"""

if find_reg_success in reg_text:
    reg_text = reg_text.replace(find_reg_success, replace_reg_success)
    with open(reg_file, 'w', encoding='utf-8') as f:
        f.write(reg_text)
    print("Updated PatientRegistration.jsx direct dashboard transition")
else:
    print("Could not find find_reg_success in PatientRegistration.jsx")

# 4. Update backend/routes/patientRoutes.js to return JWT token on new patient creation
pat_routes = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(pat_routes, 'r', encoding='utf-8') as f:
    pat_text = f.read()

find_pat_create_res = """    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "patients" });
    }
    res.status(201).json(patient);"""

replace_pat_create_res = """    const io = req.app.get("io");
    if (io && req.tenantId) {
      io.to(req.tenantId).emit("data_changed", { type: "patients" });
    }

    const jwt = require('jsonwebtoken');
    const { getJwtSecret } = require('../config/env');
    let secretKey;
    try { secretKey = getJwtSecret(); } catch(e) { secretKey = process.env.JWT_SECRET || 'secret_key'; }

    const token = jwt.sign({
      id: patient._id,
      staff_id: patient.contact,
      role: 'patient',
      tenantId: patient.tenantId
    }, secretKey, { expiresIn: '24h' });

    res.status(201).json({
      ...patient.toObject(),
      token,
      user: {
        id: patient._id,
        _id: patient._id,
        name: patient.name,
        contact: patient.contact,
        email: patient.email,
        role: 'patient',
        isSetupComplete: true,
        tenantId: patient.tenantId
      }
    });"""

if find_pat_create_res in pat_text:
    pat_text = pat_text.replace(find_pat_create_res, replace_pat_create_res)
    with open(pat_routes, 'w', encoding='utf-8') as f:
        f.write(pat_text)
    print("Updated patientRoutes.js with token response")
else:
    print("Could not find find_pat_create_res in patientRoutes.js")
