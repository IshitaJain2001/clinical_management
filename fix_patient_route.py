import sys, codecs

# 1. Update frontend/src/App.jsx
app_file = r'D:\rizwan\frontend\src\App.jsx'
with open(app_file, 'r', encoding='utf-8') as f:
    app_text = f.read()

find_patient_check = """  // Patient route has its own role target
  if (targetRole === 'patient' && user.role !== 'patient') {
    return <Navigate to="/login" replace />;
  }"""

replace_patient_check = """  // Patient route can be accessed by any user who logged in via Patient Portal, or admins/staff inspecting it
  if (targetRole === 'patient') {
    return children;
  }"""

if find_patient_check in app_text:
    app_text = app_text.replace(find_patient_check, replace_patient_check)
    print("Updated patient route check in App.jsx")
else:
    print("Could not find find_patient_check in App.jsx")

find_direct_role = "const hasDirectRole = user.role === targetRole || user.role === 'admin' || (targetRole === 'inventory' && (user.role === 'pharmacy' || user.role === 'admin'));"
replace_direct_role = "const hasDirectRole = targetRole === 'patient' || user.role === targetRole || user.role === 'admin' || (targetRole === 'inventory' && (user.role === 'pharmacy' || user.role === 'admin'));"

if find_direct_role in app_text:
    app_text = app_text.replace(find_direct_role, replace_direct_role)
    print("Updated hasDirectRole in App.jsx")
else:
    print("Could not find find_direct_role in App.jsx")

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_text)

# 2. Update frontend/src/pages/PatientPortalLogin.jsx
portal_login_file = r'D:\rizwan\frontend\src\pages\PatientPortalLogin.jsx'
with open(portal_login_file, 'r', encoding='utf-8') as f:
    portal_text = f.read()

find_login_store = """        // Existing user, log them in
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/patient');"""

replace_login_store = """        // Existing user, log them in
        const loggedUser = response.data.user || {};
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(loggedUser));
        localStorage.setItem('tenantId', loggedUser.tenantId || 'city_hospital');
        window.dispatchEvent(new CustomEvent('curoxa_login_success'));
        navigate('/patient');"""

if find_login_store in portal_text:
    portal_text = portal_text.replace(find_login_store, replace_login_store)
    with open(portal_login_file, 'w', encoding='utf-8') as f:
        f.write(portal_text)
    print("Updated PatientPortalLogin.jsx")
else:
    print("Could not find find_login_store in PatientPortalLogin.jsx")
