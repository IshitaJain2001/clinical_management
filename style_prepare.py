import sys

with open(r'D:\rizwan\dense_form_dump.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Main container background/shadow and custom CSS
old_container = """<div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', overflow: 'hidden', border: '1px solid #E2E8F0' }}>"""
new_container = """
<style>{`
  .impressive-input { transition: all 0.2s ease-in-out; border: 1px solid #CBD5E1; }
  .impressive-input:focus:not([readonly]) { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important; outline: none; background: white !important; }
  .impressive-input:hover:not([readonly]):not(:focus) { border-color: #94A3B8; }
  
  .impressive-select { transition: all 0.2s ease-in-out; border: 1px solid #CBD5E1; }
  .impressive-select:focus:not([disabled]) { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important; outline: none; }
  
  .impressive-btn-main { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important; box-shadow: 0 4px 14px rgba(37,99,235,0.3) !important; transition: all 0.2s; }
  .impressive-btn-main:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.4) !important; background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%) !important; }
  .impressive-btn-main:active { transform: translateY(1px); box-shadow: 0 2px 4px rgba(37,99,235,0.3) !important; }
  
  .vitals-box { background: linear-gradient(to right, #FFF1F2, #FFF7ED) !important; border-color: #FECDD3 !important; }
  .billing-box { background: linear-gradient(to right, #F0FDF4, #ECFDF5) !important; border-color: #A7F3D0 !important; }
  
  .slot-btn { transition: all 0.2s ease; }
  .slot-btn:hover:not(.slot-full) { border-color: #3B82F6 !important; transform: scale(1.02); }
`}</style>
<div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
"""
text = text.replace(old_container, new_container)

# 2. Header Gradient
old_header = """<div style={{ background: '#F8FAFC', padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>"""
new_header = """<div style={{ background: 'linear-gradient(90deg, #F0F9FF 0%, #FFFFFF 100%)', padding: '12px 16px', borderBottom: '1px solid #E2E8F0', borderLeft: '4px solid #3B82F6', display: 'flex', alignItems: 'center', gap: '8px' }}>"""
text = text.replace(old_header, new_header)

# 3. Input Styles mapping
text = text.replace('className="form-control"', 'className="form-control impressive-input"')
old_inputStyle = """const inputStyle = { width: '100%', height: '26px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A', outline: 'none' };"""
new_inputStyle = """const inputStyle = { width: '100%', height: '28px', fontSize: '13px', padding: '0 8px', borderRadius: '6px', background: isExistingPatient ? '#F8FAFC' : 'white', color: '#0F172A' };"""
text = text.replace(old_inputStyle, new_inputStyle)

text = text.replace('<input type="text" style={inputStyle}', '<input type="text" className="impressive-input" style={inputStyle}')
text = text.replace('<input type="number" style={inputStyle}', '<input type="number" className="impressive-input" style={inputStyle}')
text = text.replace('<input type="date" style={inputStyle}', '<input type="date" className="impressive-input" style={inputStyle}')
text = text.replace('<input type="text" style={{...inputStyle', '<input type="text" className="impressive-input" style={{...inputStyle')

text = text.replace('<select style={selectStyle}', '<select className="impressive-select" style={selectStyle}')
text = text.replace('<select\n                                style={selectStyle}', '<select className="impressive-select"\n                                style={selectStyle}')

# 4. Vitals background
old_vitals_header = """<div style={{ gridColumn: '1 / -1', display: 'flex', gap: '24px', alignItems: 'center', marginTop: '4px', background: '#F8FAFC', padding: '10px 16px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>"""
new_vitals_header = """<div className="vitals-box" style={{ gridColumn: '1 / -1', display: 'flex', gap: '24px', alignItems: 'center', marginTop: '4px', padding: '10px 16px', borderRadius: '8px', border: '1px solid' }}>"""
text = text.replace(old_vitals_header, new_vitals_header)

# 5. Billing background
old_billing = """<div style={{ marginTop: 'auto', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>"""
new_billing = """<div className="billing-box" style={{ marginTop: 'auto', border: '1px solid', borderRadius: '10px', padding: '16px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>"""
text = text.replace(old_billing, new_billing)

# Net Amount pop
old_net_amount = """<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}><span>Net Amount</span><span style={{ color: '#10B981' }}>₹{finalTotalVal.toFixed(2)}</span></div>"""
new_net_amount = """<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#0F172A', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', padding: '8px 12px', borderRadius: '6px', color: 'white', margin: '-4px -8px' }}><span>Net Amount</span><span>₹{finalTotalVal.toFixed(2)}</span></div>"""
text = text.replace(old_net_amount, new_net_amount)

# 6. Main Action Button
old_submit = """<button type="button" onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading} style={{ width: '100%', padding: '14px 0', fontSize: '14px', fontWeight: 800, background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)', transition: 'all 0.2s' }} onMouseOver={e => !loading && (e.target.style.background = '#1D4ED8')} onMouseOut={e => !loading && (e.target.style.background = '#2563EB')}>
                      <i data-lucide="check-circle" style={{ width: '16px' }}></i> {loading ? 'Saving...' : (reschedulingAppointment ? 'Reschedule' : 'Register Patient')}
                    </button>"""
new_submit = """<button type="button" className="impressive-btn-main" onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading} style={{ width: '100%', padding: '14px 0', fontSize: '15px', fontWeight: 900, color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <i data-lucide="check-circle" style={{ width: '18px' }}></i> {loading ? 'Saving...' : (reschedulingAppointment ? 'Reschedule' : 'Register Patient')}
                    </button>"""
text = text.replace(old_submit, new_submit)

with open(r'D:\rizwan\dense_form_dump_updated.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Prepared eye-catching styles in dense_form_dump_updated.jsx!')
