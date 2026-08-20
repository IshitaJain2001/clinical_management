import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = """                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => handleOpenPatientProfile(p)}>
                                    <div style={{ width: '32px', height: '22px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                                      {getInitials(p.name)}
                                    </div>
                                    <span style={{ fontWeight: 700, color: '#1A1D23' }}>{p.name}</span>
                                </div>
                            </td>"""

replacement = """                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => handleOpenPatientProfile(p)}>
                                    <span style={{ fontWeight: 700, color: '#1A1D23' }}>{p.name} {p.age ? `(${p.age} Yrs)` : ''}</span>
                                </div>
                            </td>"""

if target in text:
    text = text.replace(target, replacement)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Initials removed and age added.")
else:
    print("Could not find the target to replace.")
