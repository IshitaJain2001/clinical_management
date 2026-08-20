import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = """                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>Discount (%)</div>
                            <div style={{ width: '12px', fontSize: '12px', color: '#94A3B8' }}>:</div>
                            <input type="number" min="0" max={allowedDiscountPercent} value={bookingDiscountPercent || ''} onChange={e => setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))} style={{ height: '28px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', width: '80px', textAlign: 'right', background: 'white' }} />
                          </div>"""

replacement = """                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>Discount (%)</div>
                            <div style={{ width: '12px', fontSize: '12px', color: '#94A3B8' }}>:</div>
                            <input type="number" min="0" max={allowedDiscountPercent} value={bookingDiscountPercent || ''} onChange={e => { setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value)))); if(!Number(e.target.value)) setBookingDiscountReason(''); }} style={{ height: '28px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', width: '80px', textAlign: 'right', background: 'white' }} />
                          </div>
                          
                          {Number(bookingDiscountPercent) > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}>
                              <div style={{ width: '100px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>Reason <span style={{ color: '#EF4444' }}>*</span></div>
                              <div style={{ width: '12px', fontSize: '12px', color: '#94A3B8' }}>:</div>
                              <input type="text" placeholder="Required" value={bookingDiscountReason} onChange={e => setBookingDiscountReason(e.target.value)} style={{ height: '28px', fontSize: '12px', padding: '0 8px', border: '1px solid #CBD5E1', borderRadius: '4px', flex: 1, background: 'white' }} />
                            </div>
                          )}"""

if target in text:
    text = text.replace(target, replacement)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Added Discount Reason input.")
else:
    print("Could not find the target.")
