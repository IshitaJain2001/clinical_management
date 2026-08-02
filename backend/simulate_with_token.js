const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const run = async () => {
  try {
    const secret = 'super_secure_rotated_entropy_key_987234691_curoxa';
    // Admin user rizwan: 6a6e1d2ec9af15f8e82085bf
    // Tenant: med-clini-186
    const payload = {
      id: '6a6e1d2ec9af15f8e82085bf',
      role: 'admin',
      tenantId: 'med-clini-186'
    };
    const token = jwt.sign(payload, secret);
    console.log("GENERATED JWT TOKEN:", token);

    const res = await fetch('http://localhost:5000/api/appointments/6a6e2383c9af15f8e8208781', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': 'med-clini-186'
      },
      body: JSON.stringify({
        time: '11:00 AM',
        date: '2026-08-03',
        status: 'Rescheduled'
      })
    });
    
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("RESPONSE TEXT:", text);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
};
run();
