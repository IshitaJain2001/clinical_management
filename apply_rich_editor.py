import sys, codecs

# 1. Update PrescriptionMakerTab.jsx
maker_file = r'D:\rizwan\frontend\src\pages\PrescriptionMakerTab.jsx'
with open(maker_file, 'r', encoding='utf-8') as f:
    maker_text = f.read()

# Add import if not present
if "import ClinicalRichEditor from '../components/ClinicalRichEditor';" not in maker_text:
    import_statement = "import ClinicalRichEditor from '../components/ClinicalRichEditor';\n"
    maker_text = import_statement + maker_text

# Replace Diagnosis section
find_diag_section = """          {/* Diagnosis Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#D97706', letterSpacing: '0.05em', marginBottom: '8px' }}>DIAGNOSIS (REQUIRED)</label>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', background: '#F8FAFC' }}>
              {/* Render typed diagnosis as bullet points */}
              {diagnosisText && diagnosisText.trim() !== '' && (
                <ul style={{ paddingLeft: '8px', margin: '0 0 12px 0', fontSize: '14px', color: '#1E293B', fontWeight: 650, lineHeight: 1.6, listStyle: 'none' }}>
                  {diagnosisText.split('\\n').filter(line => line.trim() !== '').map((line, i) => (
                    <li key={i} style={{ marginBottom: '4px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#D97706', fontSize: '8px', marginTop: '6px', flexShrink: 0 }}>●</span>
                      <span>{line.trim()}</span>
                    </li>
                  ))}
                </ul>
              )}
              <textarea 
                data-lenis-prevent
                value={diagnosisText}
                onChange={e => {
                  setDiagnosisText(e.target.value);
                  setSoap(prev => ({ ...prev, assessment: e.target.value }));
                }}
                placeholder="Enter Patient Diagnosis (each line becomes a bullet point)..." 
                style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', color: '#475569', resize: 'none', minHeight: '60px', fontWeight: 500, boxSizing: 'border-box' }}
              />
            </div>
          </div>"""

replace_diag_section = """          {/* Diagnosis Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#D97706', letterSpacing: '0.05em', marginBottom: '8px' }}>DIAGNOSIS (REQUIRED)</label>
            <ClinicalRichEditor
              value={diagnosisText}
              onChange={val => {
                setDiagnosisText(val);
                setSoap(prev => ({ ...prev, assessment: val }));
              }}
              placeholder="Enter Patient Diagnosis (use toolbar for bold, italic, highlight, and bullet points)..."
              borderColor="#CBD5E1"
              focusBorderColor="#D97706"
              accentColor="#D97706"
              minHeight="70px"
            />
          </div>"""

if find_diag_section in maker_text:
    maker_text = maker_text.replace(find_diag_section, replace_diag_section)
    print("Replaced diagnosis double-preview with ClinicalRichEditor in PrescriptionMakerTab.jsx")
else:
    print("Could not find find_diag_section in PrescriptionMakerTab.jsx")

# Replace Notes section
find_notes_section = """            {!notesCollapsed && (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', background: '#F8FAFC' }}>
                {/* Render typed notes as bullet points */}
                {soap.plan && soap.plan.trim() !== '' && (
                  <ul style={{ paddingLeft: '8px', margin: '0 0 16px 0', fontSize: '14px', color: '#1E293B', fontWeight: 600, lineHeight: 1.8, listStyle: 'none' }}>
                    {soap.plan.split('\\n').filter(line => line.trim() !== '').map((line, i) => (
                      <li key={i} style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: '#2563EB', fontSize: '8px', marginTop: '7px', flexShrink: 0 }}>●</span>
                        <span>{line.trim()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <textarea 
                  data-lenis-prevent
                  value={soap.plan}
                  onChange={e => setSoap(prev => ({ ...prev, plan: e.target.value }))}
                  placeholder="Type patient instructions here (each line becomes a bullet point)..." 
                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '13.5px', color: '#475569', resize: 'none', minHeight: '70px', fontWeight: 500, boxSizing: 'border-box' }}
                />
              </div>
            )}"""

replace_notes_section = """            {!notesCollapsed && (
              <div style={{ marginTop: '8px' }}>
                <ClinicalRichEditor
                  value={soap.plan || ''}
                  onChange={val => setSoap(prev => ({ ...prev, plan: val }))}
                  placeholder="Type patient instructions & advice here (use toolbar for bold, italic, highlight, and bullet points)..."
                  borderColor="#CBD5E1"
                  focusBorderColor="#2563EB"
                  accentColor="#2563EB"
                  minHeight="80px"
                />
              </div>
            )}"""

if find_notes_section in maker_text:
    maker_text = maker_text.replace(find_notes_section, replace_notes_section)
    print("Replaced notes double-preview with ClinicalRichEditor in PrescriptionMakerTab.jsx")
else:
    print("Could not find find_notes_section in PrescriptionMakerTab.jsx")

with open(maker_file, 'w', encoding='utf-8') as f:
    f.write(maker_text)

# 2. Update print templates in DoctorDashboard.jsx to render rich formatting
doc_file = r'D:\rizwan\frontend\src\pages\DoctorDashboard.jsx'
with open(doc_file, 'r', encoding='utf-8') as f:
    doc_text = f.read()

find_print_diag = """                    <div style={{ padding: '12px', fontSize: '13px', color: '#1E293B', lineHeight: '1.6', fontWeight: 500 }}>
                      {appointment.diagnosis.split('\\n').map((line, lidx) => (
                        <div key={lidx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                          <span style={{ color: '#800020', fontSize: '10px', marginTop: '4px' }}>•</span>
                          <span>{line.trim()}</span>
                        </div>
                      ))}
                    </div>"""

replace_print_diag = """                    <div style={{ padding: '12px', fontSize: '13px', color: '#1E293B', lineHeight: '1.6', fontWeight: 500 }}>
                      {appointment.diagnosis.includes('<') ? (
                        <div dangerouslySetInnerHTML={{ __html: appointment.diagnosis }} />
                      ) : (
                        appointment.diagnosis.split('\\n').map((line, lidx) => (
                          <div key={lidx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#800020', fontSize: '10px', marginTop: '4px' }}>•</span>
                            <span>{line.trim()}</span>
                          </div>
                        ))
                      )}
                    </div>"""

if find_print_diag in doc_text:
    doc_text = doc_text.replace(find_print_diag, replace_print_diag)
    print("Updated print diagnosis in DoctorDashboard.jsx")

find_print_notes = """                    <div style={{ padding: '12px', fontSize: '13px', color: '#334155', lineHeight: '1.6', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                      {appointment.notes}
                    </div>"""

replace_print_notes = """                    <div style={{ padding: '12px', fontSize: '13px', color: '#334155', lineHeight: '1.6', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                      {appointment.notes.includes('<') ? (
                        <div dangerouslySetInnerHTML={{ __html: appointment.notes }} />
                      ) : (
                        appointment.notes
                      )}
                    </div>"""

if find_print_notes in doc_text:
    doc_text = doc_text.replace(find_print_notes, replace_print_notes)
    print("Updated print notes in DoctorDashboard.jsx")

with open(doc_file, 'w', encoding='utf-8') as f:
    f.write(doc_text)
