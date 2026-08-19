import sys
import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('const [formData')
if 'const [patientPhoto' not in text:
    text = text[:idx] + 'const [patientPhoto, setPatientPhoto] = useState(null);\n  ' + text[idx:]

pattern = r'<div style=\{\{\s*width:\s*\'100\%\',\s*height:\s*\'160px\',\s*borderRadius:\s*\'8px\',\s*border:\s*\'2px dashed #CBD5E1\'[^>]*>.*?(<div style=\{\{\s*width:\s*\'64px\'[^>]*>.*?<i data-lucide="camera".*?</i>.*?</div>.*?<span[^>]*>No Image Available</span>.*?</div>)'

def replace_fn(match):
    original_container = match.group(0)
    inner_block = match.group(1)
    # prepend inputs
    inputs = """<input type="file" id="patientPhotoUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />
                    <input type="file" id="patientCameraUpload" style={{ display: 'none' }} accept="image/png, image/jpeg" capture="environment" onChange={(e) => { if (e.target.files && e.target.files[0]) { setPatientPhoto(URL.createObjectURL(e.target.files[0])); } }} />\n                    """
    
    # replace inner block with ternary
    new_inner = """{patientPhoto ? (
                        <img src={patientPhoto} alt="Patient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          """ + inner_block + """
                        </>
                      )}"""
    return inputs + original_container.replace(inner_block, new_inner)

if re.search(pattern, text, re.DOTALL):
    text = re.sub(pattern, replace_fn, text, flags=re.DOTALL)
    
    # And replace the buttons!
    text = text.replace("""<button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>""",
                    """<button type="button" onClick={() => document.getElementById('patientCameraUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="camera" style={{ width: '14px' }}></i> Capture Photo</button>""")

    text = text.replace("""<button type="button" style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>""",
                    """<button type="button" onClick={() => document.getElementById('patientPhotoUpload').click()} style={{ width: '100%', padding: '8px 0', fontSize: '12px', fontWeight: 600, background: 'white', color: '#3B82F6', border: '1px solid #BFDBFE', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.target.style.background = '#EFF6FF'} onMouseOut={e => e.target.style.background = 'white'}><i data-lucide="upload" style={{ width: '14px' }}></i> Upload Document</button>""")

    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS!")
else:
    print("Failed to find pattern")
