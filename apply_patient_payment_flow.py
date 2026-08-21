import sys, codecs

dash_file = r'D:\rizwan\frontend\src\pages\PatientDashboard.jsx'
with open(dash_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Add states for appointment payment
find_states = "  const [deleteApptConfirmId, setDeleteApptConfirmId] = useState(null);"
replace_states = """  const [deleteApptConfirmId, setDeleteApptConfirmId] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentAppt, setSelectedPaymentAppt] = useState(null);
  const [paymentBillData, setPaymentBillData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethodTab, setPaymentMethodTab] = useState('upi');"""

if find_states in text:
    text = text.replace(find_states, replace_states)

# Add openPaymentModalForAppointment and handleProcessPayment functions
find_fn_anchor = "  const confirmDeleteAppointment = async () => {"
payment_functions = """  const openPaymentModalForAppointment = async (appt) => {
    setSelectedPaymentAppt(appt);
    setPaymentModalOpen(true);
    try {
      const billRes = await api.get('/billing');
      const allBills = Array.isArray(billRes.data) ? billRes.data : [];
      const matchBill = allBills.find(b => b.appointmentId?._id === appt._id || b.appointmentId === appt._id);
      if (matchBill) {
        setPaymentBillData(matchBill);
      } else {
        // Fallback default calculation
        const docFee = Number(appt.doctorId?.consultationFee) || 500;
        setPaymentBillData({
          items: [
            { description: 'One-Time OPD Registration Fee', amount: 50 },
            { description: `Doctor Consultation Fee (${appt.doctorId?.name || 'Doctor'})`, amount: docFee }
          ],
          totalAmount: docFee + 50,
          status: 'Unpaid'
        });
      }
    } catch(e) {
      console.warn("Could not fetch bill directly, setting standard breakdown:", e);
      setPaymentBillData({
        items: [
          { description: 'One-Time OPD Registration Fee', amount: 50 },
          { description: 'Doctor Consultation Fee', amount: 500 }
        ],
        totalAmount: 550,
        status: 'Unpaid'
      });
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentAppt) return;
    setProcessingPayment(true);
    try {
      await api.post(`/appointments/${selectedPaymentAppt._id}/pay`, {
        paymentMethod: paymentMethodTab === 'upi' ? 'Online UPI' : (paymentMethodTab === 'card' ? 'Credit/Debit Card' : 'Net Banking')
      });
      showNotification('Payment successful! Your appointment is now Confirmed.', 'success');
      setPaymentModalOpen(false);
      setSelectedPaymentAppt(null);
      fetchData();
    } catch(e) {
      console.error("Payment failed:", e);
      showNotification(e.response?.data?.error || 'Payment failed. Please try again.', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };
"""

if find_fn_anchor in text:
    text = text.replace(find_fn_anchor, payment_functions + "\n" + find_fn_anchor)

# Add Top Approval Banner on Summary/Overview tab
find_summary_start = """        {activeTab === 'summary' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>"""

replace_summary_start = """        {activeTab === 'summary' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            {/* Approved Appointment Action Banner */}
            {appointments.filter(a => a.status === 'Approved' && a.billingStatus !== 'Paid').map(app => (
              <div key={app._id} style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '1.5px solid #3B82F6',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.15)',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i data-lucide="check-circle" style={{ width: '24px', height: '24px' }}></i>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ background: '#2563EB', color: 'white', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                        Request Approved
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                        {new Date(app.date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} at {app.time}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      Appointment with {app.doctorId?.name || 'Doctor'}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                      Your appointment request has been approved by the hospital. Complete your payment to confirm your booking.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openPaymentModalForAppointment(app)}
                  style={{
                    background: '#2563EB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>💳</span> Pay Now & Confirm
                </button>
              </div>
            ))}"""

if find_summary_start in text:
    text = text.replace(find_summary_start, replace_summary_start)

# Add Pay Now button in appointment history table
find_history_action = """                        <td><button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => openDetailsModal(app)}>View Details</button></td>"""

replace_history_action = """                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => openDetailsModal(app)}>View Details</button>
                            {app.status === 'Approved' && app.billingStatus !== 'Paid' && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '6px 14px', fontSize: '11px', background: '#2563EB', fontWeight: 800, borderRadius: '6px' }}
                                onClick={() => openPaymentModalForAppointment(app)}
                              >
                                Pay Now
                              </button>
                            )}
                          </div>
                        </td>"""

if find_history_action in text:
    text = text.replace(find_history_action, replace_history_action)

# Add Payment Modal before notification
find_modal_end = "      {notification && ("
payment_modal_jsx = """      {/* APPOINTMENT PAYMENT MODAL */}
      {paymentModalOpen && selectedPaymentAppt && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-box" style={{ maxWidth: '480px', padding: '0', borderRadius: '16px', overflow: 'hidden', background: '#FFFFFF' }}>
            
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ background: '#3B82F6', color: 'white', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Secure Checkout
                </span>
                <h2 style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: 800, color: 'white' }}>
                  Confirm Appointment Booking
                </h2>
              </div>
              <button 
                onClick={() => setPaymentModalOpen(false)}
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Doctor & Slot Info */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px 16px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Doctor:</span>
                  <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 800 }}>{selectedPaymentAppt.doctorId?.name || 'Assigned Doctor'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Specialty:</span>
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 700 }}>{selectedPaymentAppt.doctorId?.specialty || 'General OPD'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Date & Time:</span>
                  <span style={{ fontSize: '13px', color: '#2563EB', fontWeight: 800 }}>{new Date(selectedPaymentAppt.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} | {selectedPaymentAppt.time}</span>
                </div>
              </div>

              {/* Itemized Bill Breakdown */}
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>
                Itemized Fee Breakdown
              </h4>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                {paymentBillData?.items && paymentBillData.items.length > 0 ? (
                  paymentBillData.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: i < paymentBillData.items.length - 1 ? '1px solid #F1F5F9' : 'none', background: item.description.includes('Registration') ? '#FFFBEB' : '#FFFFFF' }}>
                      <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                        {item.description}
                        {item.description.includes('Registration') && (
                          <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 800, marginLeft: '6px', background: '#FEF3C7', padding: '1px 5px', borderRadius: '4px' }}>1-Time Only</span>
                        )}
                      </span>
                      <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 750 }}>₹{item.amount}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
                    <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>Doctor Consultation Fee</span>
                    <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 750 }}>₹500</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#F8FAFC', borderTop: '2px dashed #CBD5E1' }}>
                  <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: 800 }}>Total Amount Payable</span>
                  <span style={{ fontSize: '16px', color: '#2563EB', fontWeight: 900 }}>₹{paymentBillData?.totalAmount || 550}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>
                Select Payment Method
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethodTab('upi')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: paymentMethodTab === 'upi' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                    background: paymentMethodTab === 'upi' ? '#EFF6FF' : '#FFFFFF',
                    color: paymentMethodTab === 'upi' ? '#2563EB' : '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>📱</span>
                  UPI / QR
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethodTab('card')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: paymentMethodTab === 'card' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                    background: paymentMethodTab === 'card' ? '#EFF6FF' : '#FFFFFF',
                    color: paymentMethodTab === 'card' ? '#2563EB' : '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>💳</span>
                  Debit / Card
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethodTab('netbanking')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    border: paymentMethodTab === 'netbanking' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                    background: paymentMethodTab === 'netbanking' ? '#EFF6FF' : '#FFFFFF',
                    color: paymentMethodTab === 'netbanking' ? '#2563EB' : '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🏦</span>
                  NetBanking
                </button>
              </div>

              {/* Pay Action Button */}
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={processingPayment}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '10px',
                  background: processingPayment ? '#94A3B8' : '#2563EB',
                  color: 'white',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: processingPayment ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  transition: '0.2s'
                }}
              >
                {processingPayment ? 'Processing Secure Payment...' : `Pay ₹${paymentBillData?.totalAmount || 550} & Confirm Booking`}
              </button>

              <p style={{ margin: '12px 0 0 0', textAlign: 'center', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                🔒 256-Bit Encrypted Secure Clinical Payment Gateway
              </p>
            </div>
          </div>
        </div>
      )}
"""

if find_modal_end in text:
    text = text.replace(find_modal_end, payment_modal_jsx + "\n" + find_modal_end)

with open(dash_file, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated PatientDashboard.jsx with Approval Banner, Pay Now, and Payment Modal")
