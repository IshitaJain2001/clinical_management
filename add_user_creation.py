import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
main_file = r'D:\rizwan\backend\routes\patientRoutes.js'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('const io = req.app.get("io");')
if idx != -1:
    new_code = """
    // Automatically create a User account for the patient so they can login to the portal
    try {
      const User = require('../models/User');
      const existingUser = await User.findOne({ tenantId: req.tenantId, staff_id: cleanContact });
      if (!existingUser) {
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
      }
    } catch (userErr) {
      console.warn("Failed to create User record for patient:", userErr);
    }
"""
    text = text[:idx] + new_code + '\n    ' + text[idx:]
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Added User creation to POST /patients')
else:
    print('Could not find injection point')
