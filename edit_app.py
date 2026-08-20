import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
main_file = r'D:\rizwan\frontend\src\App.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

import_idx = text.find("import Login from './pages/Login';")
if import_idx != -1:
    text = text[:import_idx] + "import PatientPortalLogin from './pages/PatientPortalLogin';\nimport PatientRegistration from './pages/PatientRegistration';\n" + text[import_idx:]
    
route_idx = text.find("<Route path=\"/login\" element={<Login />} />")
if route_idx != -1:
    text = text[:route_idx] + "<Route path=\"/patient/login\" element={<PatientPortalLogin />} />\n        <Route path=\"/patient-register\" element={<PatientRegistration />} />\n        " + text[route_idx:]

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Routes added to App.jsx')
