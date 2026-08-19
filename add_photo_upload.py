import sys

with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add state for patientPhoto
idx = text.find('const [formData')
if 'const [patientPhoto' not in text:
    text = text[:idx] + 'const [patientPhoto, setPatientPhoto] = useState(null);\n  ' + text[idx:]

# 2. Update image display and buttons
old_ui = """<div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i data-lucide="camera" style={{ width: '20px' }}></i>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>No Image Available</div>
                    </div>
                    <button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>
                    <button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>"""

new_ui = """<input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <input type="file" id="patientCameraUpload" style={{ display: 'none' }} accept="image/*" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', overflow: 'hidden' }}>
                      {patientPhoto ? (
                        <img src={patientPhoto} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i data-lucide="camera" style={{ width: '20px' }}></i>
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>No Image Available</div>
                        </>
                      )}
                    </div>
                    <button type="button" onClick={() => document.getElementById('patientCameraUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>
                    <button type="button" onClick={() => document.getElementById('patientPhotoUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>"""

if old_ui in text:
    text = text.replace(old_ui, new_ui)
    with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS! Replaced UI.')
else:
    print('Failed to find old UI.')
