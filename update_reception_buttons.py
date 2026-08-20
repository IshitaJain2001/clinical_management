import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

find_str = """                                  {primaryApp.type === 'Appointment' && (primaryApp.status === 'Pending' || primaryApp.status === 'Scheduled' || primaryApp.status === 'Paid') && (
                                    <button"""
replace_str = """                                  {primaryApp.type === 'Appointment' && primaryApp.status === 'Pending' && (
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
                                  )}
                                  {primaryApp.type === 'Appointment' && (primaryApp.status === 'Scheduled' || primaryApp.status === 'Paid' || primaryApp.status === 'Confirmed') && (
                                    <button"""
                                    
if find_str in text:
    text = text.replace(find_str, replace_str)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Updated ReceptionistDashboard buttons')
else:
    print('Could not find injection point')
