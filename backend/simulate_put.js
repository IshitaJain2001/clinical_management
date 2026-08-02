const run = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/appointments/6a6e2383c9af15f8e8208781', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
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
    console.error("FAILED ERROR:", err.message);
  }
};
run();
