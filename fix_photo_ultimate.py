import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('const [formData')
if 'const [patientPhoto' not in text:
    text = text[:idx] + 'const [patientPhoto, setPatientPhoto] = useState(null);\n  ' + text[idx:]

target_start = text.find("<div style={{ width: '100%', height: '160px', borderRadius: '8px', border: '2px dashed #CBD5E1'")
target_end = text.find("Upload Document</button>", target_start) + len("Upload Document</button>")

if target_start != -1 and target_end != -1:
    old_block = text[target_start:target_end]
    new_block = """<input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <input type="file" id="patientCameraUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <div style={{ width: '100%', height: '160px', borderRadius: '8px', border: '2px dashed #CBD5E1', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                      {patientPhoto ? (
                        <img src={patientPhoto} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                            <i data-lucide="camera" style={{ width: '24px', height: '24px', color: '#94A3B8' }}></i>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>No Image Available</span>
                        </>
                      )}
                    </div>
                    
                    <button type="button" onClick={() => document.getElementById('patientCameraUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>
                    <button type="button" onClick={() => document.getElementById('patientPhotoUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>"""
    
    text = text[:target_start] + new_block + text[target_end:]
    
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS! UI injected accurately.")
else:
    print("Failed to find boundaries.")
