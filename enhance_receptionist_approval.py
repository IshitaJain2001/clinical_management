import sys

rec_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(rec_file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update getFilteredAppointments to handle 'Pending Approval' filter
find_filter = """      // 1. Type Filter
      if (apptTypeFilter !== 'All' && item.type !== apptTypeFilter) return false;"""

replace_filter = """      // 1. Type & Status Filter
      if (apptTypeFilter === 'Pending Approval') {
        const isPending = item.status === 'Pending Approval' || item.status === 'Pending' || item.rawItem?.status === 'Pending Approval' || item.rawItem?.status === 'Pending';
        if (!isPending) return false;
      } else if (apptTypeFilter !== 'All' && item.type !== apptTypeFilter) {
        return false;
      }"""

if find_filter in text:
    text = text.replace(find_filter, replace_filter)
    print("Updated getFilteredAppointments filter logic")

# 2. Update Filter Pills in Appointments Tab
find_pills = """                  {[
                    { key: 'All', label: 'All Bookings', count: counts.All, color: '#3B82F6', bg: '#EFF6FF' },
                    { key: 'Appointment', label: 'Appointments (OPD)', count: counts.Appointment, color: '#2563EB', bg: '#EFF6FF' },
                    { key: 'Lab Test', label: 'Lab Tests', count: counts['Lab Test'], color: '#10B981', bg: '#ECFDF5' },
                    { key: 'Clinical Service', label: 'Clinical Services', count: counts['Clinical Service'], color: '#8B5CF6', bg: '#F5F3FF' }
                  ].map(pill => ("""

replace_pills = """                  const pendingReqCount = unifiedList.filter(item => item.status === 'Pending Approval' || item.status === 'Pending' || item.rawItem?.status === 'Pending Approval' || item.rawItem?.status === 'Pending').length;

                  return (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'All', label: 'All Bookings', count: counts.All, color: '#3B82F6', bg: '#EFF6FF' },
                        { key: 'Pending Approval', label: 'Online Requests (Pending)', count: pendingReqCount, color: '#EA580C', bg: '#FFF7ED' },
                        { key: 'Appointment', label: 'Appointments (OPD)', count: counts.Appointment, color: '#2563EB', bg: '#EFF6FF' },
                        { key: 'Lab Test', label: 'Lab Tests', count: counts['Lab Test'], color: '#10B981', bg: '#ECFDF5' },
                        { key: 'Clinical Service', label: 'Clinical Services', count: counts['Clinical Service'], color: '#8B5CF6', bg: '#F5F3FF' }
                      ].map(pill => ("""

find_full_pills_block = """              const unifiedList = getUnifiedAppointmentsList();
              const counts = { All: unifiedList.length, Appointment: 0, 'Lab Test': 0, 'Clinical Service': 0 };
              unifiedList.forEach(item => {
                if (counts[item.type] !== undefined) counts[item.type]++;
              });

              return (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'All', label: 'All Bookings', count: counts.All, color: '#3B82F6', bg: '#EFF6FF' },
                    { key: 'Appointment', label: 'Appointments (OPD)', count: counts.Appointment, color: '#2563EB', bg: '#EFF6FF' },
                    { key: 'Lab Test', label: 'Lab Tests', count: counts['Lab Test'], color: '#10B981', bg: '#ECFDF5' },
                    { key: 'Clinical Service', label: 'Clinical Services', count: counts['Clinical Service'], color: '#8B5CF6', bg: '#F5F3FF' }
                  ].map(pill => ("""

replace_full_pills_block = """              const unifiedList = getUnifiedAppointmentsList();
              const counts = { All: unifiedList.length, Appointment: 0, 'Lab Test': 0, 'Clinical Service': 0 };
              unifiedList.forEach(item => {
                if (counts[item.type] !== undefined) counts[item.type]++;
              });
              const pendingReqCount = unifiedList.filter(item => item.status === 'Pending Approval' || item.status === 'Pending' || item.rawItem?.status === 'Pending Approval' || item.rawItem?.status === 'Pending').length;

              return (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'All', label: 'All Bookings', count: counts.All, color: '#3B82F6', bg: '#EFF6FF' },
                    { key: 'Pending Approval', label: 'Online Requests (Pending)', count: pendingReqCount, color: '#EA580C', bg: '#FFF7ED' },
                    { key: 'Appointment', label: 'Appointments (OPD)', count: counts.Appointment, color: '#2563EB', bg: '#EFF6FF' },
                    { key: 'Lab Test', label: 'Lab Tests', count: counts['Lab Test'], color: '#10B981', bg: '#ECFDF5' },
                    { key: 'Clinical Service', label: 'Clinical Services', count: counts['Clinical Service'], color: '#8B5CF6', bg: '#F5F3FF' }
                  ].map(pill => ("""

if find_full_pills_block in text:
    text = text.replace(find_full_pills_block, replace_full_pills_block)
    print("Updated pills block with Online Requests filter")

# 3. Add Online Request Approval card inside Appointment Details Modal
find_modal_top = """              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {(() => {
                  const originalStatus = appointments.find(a => a._id === selectedAppointment._id)?.status || selectedAppointment.status;"""

replace_modal_top = """              {/* Online Request Approval Action Box */}
              {(() => {
                const currentStatus = appointments.find(a => a._id === selectedAppointment._id)?.status || selectedAppointment.status;
                if (currentStatus === 'Pending' || currentStatus === 'Pending Approval') {
                  return (
                    <div style={{ background: '#EFF6FF', border: '1.5px solid #3B82F6', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ background: '#2563EB', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>ACTION REQUIRED</span>
                          Online Request (Pending Approval)
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                          Approve this request to generate the bill invoice and notify the patient to complete payment.
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-success"
                          style={{ background: '#10B981', color: 'white', fontWeight: 800, padding: '8px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={async () => {
                            try {
                              await api.put('/appointments/' + selectedAppointment._id + '/approve');
                              showToast('Appointment Approved! Payment request sent to patient.', 'success');
                              setDetailsModalOpen(false);
                              fetchData();
                            } catch(e) {
                              showToast(e.response?.data?.error || 'Failed to approve', 'error');
                            }
                          }}
                        >
                          ✓ Approve & Request Payment
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ background: '#EF4444', color: 'white', fontWeight: 800, padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: 'none' }}
                          onClick={async () => {
                            try {
                              await api.put('/appointments/' + selectedAppointment._id + '/reject');
                              showToast('Appointment request rejected.', 'info');
                              setDetailsModalOpen(false);
                              fetchData();
                            } catch(e) {
                              showToast('Failed to reject', 'error');
                            }
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {(() => {
                  const originalStatus = appointments.find(a => a._id === selectedAppointment._id)?.status || selectedAppointment.status;"""

if find_modal_top in text:
    text = text.replace(find_modal_top, replace_modal_top)
    print("Added approval action box inside Details Modal")

# 4. Also add Approval buttons in Patient Profile -> Appointments tab
find_pat_tab_row = """                                {/* Status */}
                                <td style={{ padding: '16px 12px' }}>
                                  <span style={{ 
                                    background: app.status === 'Completed' ? '#ECFDF5' : (app.status === 'Cancelled' ? '#FEF2F2' : '#FAF5FF'), 
                                    color: app.status === 'Completed' ? '#10B981' : (app.status === 'Cancelled' ? '#EF4444' : '#7E22CE'), 
                                    fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 
                                  }}>{app.status}</span>
                                </td>"""

replace_pat_tab_row = """                                {/* Status & Approval Action */}
                                <td style={{ padding: '16px 12px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                    <span style={{ 
                                      background: app.status === 'Completed' ? '#ECFDF5' : (app.status === 'Cancelled' ? '#FEF2F2' : (app.status === 'Pending Approval' || app.status === 'Pending' ? '#FFF7ED' : '#FAF5FF')), 
                                      color: app.status === 'Completed' ? '#10B981' : (app.status === 'Cancelled' ? '#EF4444' : (app.status === 'Pending Approval' || app.status === 'Pending' ? '#EA580C' : '#7E22CE')), 
                                      fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 
                                    }}>{app.status}</span>

                                    {(app.status === 'Pending' || app.status === 'Pending Approval') && (
                                      <button
                                        type="button"
                                        className="btn btn-success"
                                        style={{ padding: '4px 10px', fontSize: '10.5px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer' }}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            await api.put('/appointments/' + app._id + '/approve');
                                            showToast('Appointment Approved! Payment request generated.', 'success');
                                            fetchData();
                                          } catch(err) {
                                            showToast(err.response?.data?.error || 'Failed to approve', 'error');
                                          }
                                        }}
                                      >
                                        ✓ Approve
                                      </button>
                                    )}
                                  </div>
                                </td>"""

if find_pat_tab_row in text:
    text = text.replace(find_pat_tab_row, replace_pat_tab_row)
    print("Added approve action in Patient Profile appointments tab")

with open(rec_file, 'w', encoding='utf-8') as f:
    f.write(text)

print("Finished updating ReceptionistDashboard.jsx")
