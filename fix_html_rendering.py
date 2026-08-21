import sys, codecs

# 1. Update DoctorDashboard.jsx
doc_file = r'D:\rizwan\frontend\src\pages\DoctorDashboard.jsx'
with open(doc_file, 'r', encoding='utf-8') as f:
    doc_text = f.read()

find_get_diag = """              function getDiagnosisHTML() {
                if (!diagnosis || diagnosis === '\\u2014') return '';
                const lines = diagnosis.split('\\\\n').filter(l => l.trim() !== '');
                if (lines.length === 1) {
                  return '<div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">' +
                    '<div style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 900; color: #800020; border-bottom: 1.5px solid #800020; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Diagnosis</div>' +
                    '<div style="font-size: 11px; font-weight: 700; color: #1E293B; padding-left: 2px;">' + diagnosis + '</div>' +
                  '</div>';
                }
                const bulletList = lines.map(line => {
                  return '<li style="margin-bottom: 4px; display: flex; align-items: flex-start; gap: 8px;">' +
                    '<span style="color: #800020; font-size: 8px; margin-top: 5px; flex-shrink: 0;">\\u25CF</span>' +
                    '<span>' + line.trim() + '</span>' +
                    '</li>';
                }).join('');
                return '<div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">' +
                  '<div style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 900; color: #800020; border-bottom: 1.5px solid #800020; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Diagnosis</div>' +
                  '<ul style="padding-left: 2px; margin: 0; font-size: 11px; font-weight: 700; color: #1E293B; list-style: none; line-height: 1.5;">' + bulletList + '</ul>' +
                '</div>';
              }"""

replace_get_diag = """              function getDiagnosisHTML() {
                if (!diagnosis || diagnosis === '\\u2014') return '';
                if (diagnosis.includes('<') && diagnosis.includes('>')) {
                  return '<div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">' +
                    '<div style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 900; color: #800020; border-bottom: 1.5px solid #800020; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Diagnosis</div>' +
                    '<div style="font-size: 11px; color: #1E293B; padding-left: 2px; line-height: 1.5;">' + diagnosis + '</div>' +
                  '</div>';
                }
                const lines = diagnosis.split('\\\\n').filter(l => l.trim() !== '');
                if (lines.length === 1) {
                  return '<div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">' +
                    '<div style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 900; color: #800020; border-bottom: 1.5px solid #800020; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Diagnosis</div>' +
                    '<div style="font-size: 11px; font-weight: 700; color: #1E293B; padding-left: 2px;">' + diagnosis + '</div>' +
                  '</div>';
                }
                const bulletList = lines.map(line => {
                  return '<li style="margin-bottom: 4px; display: flex; align-items: flex-start; gap: 8px;">' +
                    '<span style="color: #800020; font-size: 8px; margin-top: 5px; flex-shrink: 0;">\\u25CF</span>' +
                    '<span>' + line.trim() + '</span>' +
                    '</li>';
                }).join('');
                return '<div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">' +
                  '<div style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 900; color: #800020; border-bottom: 1.5px solid #800020; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Diagnosis</div>' +
                  '<ul style="padding-left: 2px; margin: 0; font-size: 11px; font-weight: 700; color: #1E293B; list-style: none; line-height: 1.5;">' + bulletList + '</ul>' +
                '</div>';
              }"""

if find_get_diag in doc_text:
    doc_text = doc_text.replace(find_get_diag, replace_get_diag)
    print("Updated getDiagnosisHTML in DoctorDashboard.jsx")
else:
    print("Could not find find_get_diag in DoctorDashboard.jsx")

find_soap_notes_html = """              function getSoapNotesHTML() {
                if (!soapNotes || soapNotes === '\\u2014') return '';
                return '<div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">' +
                  '<div style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 900; color: #800020; border-bottom: 1.5px solid #800020; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Clinical SOAP Notes</div>' +
                  '<div style="font-size: 10.5px; font-weight: 600; color: #475569; white-space: pre-wrap; padding-left: 2px; line-height: 1.4;">' + soapNotes + '</div>' +
                '</div>';
              }"""

replace_soap_notes_html = """              function getSoapNotesHTML() {
                if (!soapNotes || soapNotes === '\\u2014') return '';
                const renderedNotes = (soapNotes.includes('<') && soapNotes.includes('>')) ? soapNotes : soapNotes.replace(/\\n/g, '<br/>');
                return '<div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">' +
                  '<div style="font-family: Outfit, sans-serif; font-size: 12px; font-weight: 900; color: #800020; border-bottom: 1.5px solid #800020; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Clinical Notes / Advice</div>' +
                  '<div style="font-size: 10.5px; color: #475569; padding-left: 2px; line-height: 1.4;">' + renderedNotes + '</div>' +
                '</div>';
              }"""

if find_soap_notes_html in doc_text:
    doc_text = doc_text.replace(find_soap_notes_html, replace_soap_notes_html)
    print("Updated getSoapNotesHTML in DoctorDashboard.jsx")

find_diagnosis_card = """                        {/* Diagnosis */}
                        {diagnosisVal && (
                          <div style={{ fontSize: '9.5px' }}>
                            <span style={{ color: '#64748B', fontWeight: 700, display: 'block', fontSize: '7.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Diagnosis</span>
                            {diagnosisVal.includes('\\n') ? (
                              <ul style={{ paddingLeft: '2px', margin: 0, listStyle: 'none' }}>
                                {diagnosisVal.split('\\n').filter(line => line.trim() !== '').map((line, i) => (
                                  <li key={i} style={{ marginBottom: '2px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ color: '#800020', fontSize: '6px', marginTop: '4px', flexShrink: 0 }}>●</span>
                                    <span style={{ color: '#1E293B', fontWeight: 700 }}>{line.trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <b style={{ color: '#1E293B' }}>{diagnosisVal}</b>
                            )}
                          </div>
                        )}"""

replace_diagnosis_card = """                        {/* Diagnosis */}
                        {diagnosisVal && (
                          <div style={{ fontSize: '9.5px' }}>
                            <span style={{ color: '#64748B', fontWeight: 700, display: 'block', fontSize: '7.5px', textTransform: 'uppercase', marginBottom: '2px' }}>Diagnosis</span>
                            {diagnosisVal.includes('<') && diagnosisVal.includes('>') ? (
                              <div style={{ color: '#1E293B', fontWeight: 600, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: diagnosisVal }} />
                            ) : diagnosisVal.includes('\\n') ? (
                              <ul style={{ paddingLeft: '2px', margin: 0, listStyle: 'none' }}>
                                {diagnosisVal.split('\\n').filter(line => line.trim() !== '').map((line, i) => (
                                  <li key={i} style={{ marginBottom: '2px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                    <span style={{ color: '#800020', fontSize: '6px', marginTop: '4px', flexShrink: 0 }}>●</span>
                                    <span style={{ color: '#1E293B', fontWeight: 700 }}>{line.trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <b style={{ color: '#1E293B' }}>{diagnosisVal}</b>
                            )}
                          </div>
                        )}"""

if find_diagnosis_card in doc_text:
    doc_text = doc_text.replace(find_diagnosis_card, replace_diagnosis_card)
    print("Updated diagnosisVal card rendering in DoctorDashboard.jsx")
else:
    print("Could not find find_diagnosis_card in DoctorDashboard.jsx")

with open(doc_file, 'w', encoding='utf-8') as f:
    f.write(doc_text)

# 2. Update PatientDashboard.jsx
pat_file = r'D:\rizwan\frontend\src\pages\PatientDashboard.jsx'
with open(pat_file, 'r', encoding='utf-8') as f:
    pat_text = f.read()

find_pat_diag = """              <div style="padding: 10px; font-size: 11.5px; color: #1E293B; line-height: 1.5; font-weight: 500;">
                ${rx.diagnosis ? rx.diagnosis.split('\\n').map(line => `
                  <div style="display: flex; gap: 8px; margin-bottom: 4px; align-items: flex-start;">
                    <span style="color: #800020; font-size: 8px; margin-top: 3px;">•</span>
                    <span>${line.trim()}</span>
                  </div>
                `).join('') : `
                  <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <span style="color: #800020; font-size: 8px; margin-top: 3px;">•</span>
                    <span>General clinical observation & routine consultation.</span>
                  </div>
                `}
              </div>"""

replace_pat_diag = """              <div style="padding: 10px; font-size: 11.5px; color: #1E293B; line-height: 1.5; font-weight: 500;">
                ${rx.diagnosis ? (
                  (rx.diagnosis.includes('<') && rx.diagnosis.includes('>')) ? rx.diagnosis : rx.diagnosis.split('\\n').map(line => `
                    <div style="display: flex; gap: 8px; margin-bottom: 4px; align-items: flex-start;">
                      <span style="color: #800020; font-size: 8px; margin-top: 3px;">•</span>
                      <span>${line.trim()}</span>
                    </div>
                  `).join('')
                ) : `
                  <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <span style="color: #800020; font-size: 8px; margin-top: 3px;">•</span>
                    <span>General clinical observation & routine consultation.</span>
                  </div>
                `}
              </div>"""

if find_pat_diag in pat_text:
    pat_text = pat_text.replace(find_pat_diag, replace_pat_diag)
    with open(pat_file, 'w', encoding='utf-8') as f:
        f.write(pat_text)
    print("Updated diagnosis rendering in PatientDashboard.jsx")
else:
    print("Could not find find_pat_diag in PatientDashboard.jsx")
