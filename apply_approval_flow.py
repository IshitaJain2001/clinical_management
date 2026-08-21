import sys, codecs

# 1. Update PatientRegistration.jsx to set status 'Pending Approval'
pat_reg = r'D:\rizwan\frontend\src\pages\PatientRegistration.jsx'
with open(pat_reg, 'r', encoding='utf-8') as f:
    text = f.read()

find_app_create = """          await api.post('/appointments', {
            patientId: newPatient._id,
            doctorId: formData.doctorId,
            date: bookingDate,
            time: selectedSlot,
            reason: selectedSymptoms.length > 0 ? selectedSymptoms.join(', ') : 'General Consultation',
            status: 'Pending',
            source: 'Online'
          }, {"""

replace_app_create = """          await api.post('/appointments', {
            patientId: newPatient._id,
            doctorId: formData.doctorId,
            date: bookingDate,
            time: selectedSlot,
            reason: selectedSymptoms.length > 0 ? selectedSymptoms.join(', ') : 'General Consultation',
            status: 'Pending Approval',
            source: 'Online'
          }, {"""

if find_app_create in text:
    text = text.replace(find_app_create, replace_app_create)
    with open(pat_reg, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated PatientRegistration.jsx with status: Pending Approval")
else:
    print("Could not find find_app_create in PatientRegistration.jsx")

# 2. Update ReceptionistDashboard.jsx to add Approval & Request Payment button
rec_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(rec_file, 'r', encoding='utf-8') as f:
    rec_text = f.read()

find_rec_actions = """                                  {primaryApp.type === 'Appointment' && primaryApp.status === 'Pending' && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        className="btn btn-success"
                                        style={{ padding: '6px 12px', fontSize: '12px', background: '#10B981', borderColor: '#10B981', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '4px' }}
                                        onClick={async () => {
                                          try {
                                            await api.put('/appointments/' + primaryApp.rawItem._id, { status: 'Confirmed' });
                                            // Quick local patch
                                            primaryApp.rawItem.status = 'Confirmed';
                                            primaryApp.status = 'Confirmed';
                                            document.getElementById('refresh_appt_btn_' + primaryApp.rawItem._id)?.click();
                                            alert('Appointment Approved!');
                                          } catch(e) {
                                            alert('Failed to approve');
                                          }
                                        }}
                                      >Approve</button>
                                      <button
                                        className="btn btn-danger"
                                        style={{ padding: '6px 12px', fontSize: '12px', background: '#EF4444', borderColor: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '4px' }}
                                        onClick={async () => {
                                          try {
                                            await api.put('/appointments/' + primaryApp.rawItem._id, { status: 'Cancelled' });
                                            primaryApp.rawItem.status = 'Cancelled';
                                            primaryApp.status = 'Cancelled';
                                            alert('Appointment Rejected');
                                          } catch(e) {
                                            alert('Failed to reject');
                                          }
                                        }}
                                      >Reject</button>
                                    </div>
                                  )}"""

replace_rec_actions = """                                  {primaryApp.type === 'Appointment' && (primaryApp.status === 'Pending' || primaryApp.status === 'Pending Approval') && (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <button
                                        className="btn btn-success"
                                        style={{ padding: '6px 12px', fontSize: '12px', background: '#10B981', borderColor: '#10B981', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                        onClick={async () => {
                                          try {
                                            const res = await api.put('/appointments/' + primaryApp.rawItem._id + '/approve');
                                            showToast('Appointment Approved! Payment request generated (with 1-time Reg Fee if applicable).', 'success');
                                            fetchData();
                                          } catch(e) {
                                            showToast(e.response?.data?.error || 'Failed to approve', 'error');
                                          }
                                        }}
                                      >
                                        Approve & Request Payment
                                      </button>
                                      <button
                                        className="btn btn-danger"
                                        style={{ padding: '6px 12px', fontSize: '12px', background: '#EF4444', borderColor: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                        onClick={async () => {
                                          try {
                                            await api.put('/appointments/' + primaryApp.rawItem._id + '/reject');
                                            showToast('Appointment request rejected', 'info');
                                            fetchData();
                                          } catch(e) {
                                            showToast(e.response?.data?.error || 'Failed to reject', 'error');
                                          }
                                        }}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}"""

if find_rec_actions in rec_text:
    rec_text = rec_text.replace(find_rec_actions, replace_rec_actions)
    with open(rec_file, 'w', encoding='utf-8') as f:
        f.write(rec_text)
    print("Updated ReceptionistDashboard.jsx with Approve & Request Payment action")
else:
    print("Could not find find_rec_actions in ReceptionistDashboard.jsx")
