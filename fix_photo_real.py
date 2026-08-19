import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('const [formData')
if 'const [patientPhoto' not in text:
    text = text[:idx] + 'const [patientPhoto, setPatientPhoto] = useState(null);\n  ' + text[idx:]

target_div = "<div style={{ width: '100%', height: '160px', borderRadius: '8px', border: '2px dashed #CBD5E1', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative', overflow: 'hidden' }}>"

replacement_div = """<input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <input type="file" id="patientCameraUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <div style={{ width: '100%', height: '160px', borderRadius: '8px', border: '2px dashed #CBD5E1', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                      {patientPhoto ? (
                        <img src={patientPhoto} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : ("""

if target_div in text:
    text = text.replace(target_div, replacement_div)
    # We also need to close the ternary operator `)}` for patientPhoto AFTER the "No Image Available" block.
    # The end of the "No Image Available" block is the `</div>` that closes this `target_div`.
    # Let's find "No Image Available</span>\n\n                    </div>"
    text = text.replace("No Image Available</span>\n\n                    </div>", "No Image Available</span>\n\n                    </>\n                      )}\n                    </div>")
    
    # And replace the buttons!
    text = text.replace("""<button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>""",
                    """<button type="button" onClick={() => document.getElementById('patientCameraUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>""")

    text = text.replace("""<button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>""",
                    """<button type="button" onClick={() => document.getElementById('patientPhotoUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>""")

    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS!")
else:
    print("Could not find target_div")
