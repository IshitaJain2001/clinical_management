import sys, codecs

# 1. Update frontend/src/utils/api.js
api_file = r'D:\rizwan\frontend\src\utils\api.js'
with open(api_file, 'r', encoding='utf-8') as f:
    api_text = f.read()

find_api_error = "if (error.response && (error.response.status === 401 || error.response.status === 403)) {"
replace_api_error = "if (error.response && error.response.status === 401) {"

if find_api_error in api_text:
    api_text = api_text.replace(find_api_error, replace_api_error)
    with open(api_file, 'w', encoding='utf-8') as f:
        f.write(api_text)
    print("Updated api.js successfully!")
else:
    print("Could not find error handler in api.js")

# 2. Update backend/routes/authRoutes.js
auth_file = r'D:\rizwan\backend\routes\authRoutes.js'
with open(auth_file, 'r', encoding='utf-8') as f:
    auth_text = f.read()

find_auth_block = """      const jwt = require('jsonwebtoken');
      const tokenPayload = {
        id: user._id,
        staff_id: user.staff_id,
        role: user.role,
        tenantId: user.tenantId
      };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });

      return res.json({ 
        message: 'Login successful', 
        token, 
        user: { ...user.toObject(), password_hash: undefined },
        isNewUser: false
      });"""

replace_auth_block = """      const jwt = require('jsonwebtoken');
      const { getJwtSecret } = require('../config/env');
      let secretKey;
      try { secretKey = getJwtSecret(); } catch(e) { secretKey = process.env.JWT_SECRET || 'secret_key'; }

      let targetId = user._id;
      let patientDoc = null;
      if (user.role === 'patient') {
        patientDoc = await Patient.findOne({
          $or: [
            { contact: user.staff_id },
            { email: user.email }
          ]
        });
        if (patientDoc) {
          targetId = patientDoc._id;
        }
      }

      const tokenPayload = {
        id: targetId,
        userId: user._id,
        staff_id: user.staff_id,
        role: user.role,
        tenantId: user.tenantId
      };
      const token = jwt.sign(tokenPayload, secretKey, { expiresIn: '24h' });

      const returnUserObj = {
        ...user.toObject(),
        id: targetId,
        password_hash: undefined
      };

      return res.json({ 
        message: 'Login successful', 
        token, 
        user: returnUserObj,
        isNewUser: false
      });"""

if find_auth_block in auth_text:
    auth_text = auth_text.replace(find_auth_block, replace_auth_block)
    print("Updated existing user token generation in authRoutes.js")
else:
    print("Could not find find_auth_block in authRoutes.js")

find_temp_token = "const tempToken = jwt.sign({ emailOrPhone: input, isNewPatient: true, role: 'patient' }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });"
replace_temp_token = """let tempSecret;
      try { tempSecret = getJwtSecret(); } catch(e) { tempSecret = process.env.JWT_SECRET || 'secret_key'; }
      const tempToken = jwt.sign({ emailOrPhone: input, isNewPatient: true, role: 'patient' }, tempSecret, { expiresIn: '1h' });"""

if find_temp_token in auth_text:
    auth_text = auth_text.replace(find_temp_token, replace_temp_token)
    print("Updated tempToken generation in authRoutes.js")
else:
    print("Could not find find_temp_token in authRoutes.js")

with open(auth_file, 'w', encoding='utf-8') as f:
    f.write(auth_text)
