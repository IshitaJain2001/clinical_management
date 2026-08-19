import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the user icon size
text = text.replace("""<div style={{
                      width: '52px',
                      height: '20px',
                      borderRadius: '50%',""", """<div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',""")

text = text.replace("""<i data-lucide="user" style={{ width: '26px', height: '20px' }}></i>""", """<i data-lucide="user" style={{ width: '26px', height: '26px' }}></i>""")

# Fix the input size
text = text.replace("""<input
                      type="text"
                      className="form-control"
                      placeholder="Search by Patient ID or Phone Number"
                      style={{
                        height: '20px',
                        paddingRight: '48px',
                        paddingLeft: '16px',
                        borderRadius: '2px',
                        fontSize: '10px',""", """<input
                      type="text"
                      className="form-control"
                      placeholder="Search by Patient ID or Phone Number"
                      style={{
                        height: '46px',
                        paddingRight: '48px',
                        paddingLeft: '16px',
                        borderRadius: '8px',
                        fontSize: '14px',""")

# Fix magnifying glass icon placement
text = text.replace("""<i data-lucide="search" style={{ position: 'absolute', right: '16px', top: '16px', color: '#94A3B8', width: '20px', height: '20px' }}></i>""", """<i data-lucide="search" style={{ position: 'absolute', right: '16px', top: '13px', color: '#94A3B8', width: '20px', height: '20px' }}></i>""")

# Fix subtitle font size
text = text.replace("""<p style={{ fontSize: '10px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>""", """<p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>""")

# Ensure results are legible
text = text.replace("""style={{ padding: '4px', textAlign: 'center', color: '#64748B', fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}""", """style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}""")

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed search card styling!')
