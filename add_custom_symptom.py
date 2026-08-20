import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = """                                          {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).map(s => (
                                              <div key={s} className="option-item" onClick={() => { toggleSymptom(s); setSymptomDropdownOpen(false); }} style={{ padding: '6px 12px', fontSize: '11.5px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#334155' }} onMouseOver={e => e.target.style.background = '#F8FAFC'} onMouseOut={e => e.target.style.background = 'white'}>
                                                {s}
                                              </div>
                                          ))}"""

replacement = """                                          {(() => {
                                              const filtered = availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase()));
                                              return (
                                                  <>
                                                      {filtered.map(s => (
                                                          <div key={s} className="option-item" onClick={() => { toggleSymptom(s); setSymptomDropdownOpen(false); }} style={{ padding: '6px 12px', fontSize: '11.5px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#334155' }} onMouseOver={e => e.target.style.background = '#F8FAFC'} onMouseOut={e => e.target.style.background = 'white'}>
                                                            {s}
                                                          </div>
                                                      ))}
                                                      {filtered.length === 0 && symptomSearchQuery.trim() !== '' && (
                                                          <div className="option-item" onClick={() => { toggleSymptom(symptomSearchQuery.trim()); setSymptomSearchQuery(''); setSymptomDropdownOpen(false); }} style={{ padding: '6px 12px', fontSize: '11.5px', cursor: 'pointer', color: '#0F172A', fontWeight: 600, fontStyle: 'italic' }}>
                                                              Press Enter to add "{symptomSearchQuery}"
                                                          </div>
                                                      )}
                                                      {filtered.length === 0 && symptomSearchQuery.trim() === '' && (
                                                          <div style={{ padding: '6px 12px', fontSize: '11.5px', color: '#94A3B8' }}>No symptoms found.</div>
                                                      )}
                                                  </>
                                              );
                                          })()}"""

if target in text:
    text = text.replace(target, replacement)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Added custom symptom add option.")
else:
    print("Could not find the map target.")
