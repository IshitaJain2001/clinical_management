import sys
import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'<div style=\{\{[^>]+>.*?<i data-lucide="camera"[^>]+></i>.*?</div>\s*<span[^>]+>No Image Available</span>\s*</div>'

new_ui = """<input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <input type="file" id="patientCameraUpload" style={{ display: 'none' }} accept="image/*" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <div style={{ border: '1px dashed #CBD5E1', borderRadius: '8px', height: '140px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', overflow: 'hidden' }}>
                      {patientPhoto ? (
                        <img src={patientPhoto} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i data-lucide="camera" style={{ width: '24px', height: '24px', color: '#94A3B8' }}></i>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>No Image Available</span>
                        </>
                      )}
                    </div>"""

if re.search(pattern, text, re.DOTALL):
    text = re.sub(pattern, new_ui, text, flags=re.DOTALL)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS! Replaced container.')
else:
    print('Failed to find old container with regex.')
