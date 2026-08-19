import re
import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = """                              {renderField("Symptoms", 
                                <input type="text" className="impressive-input" style={inputStyle} placeholder="Type & press Enter..." value={symptomSearchQuery} onChange={e => setSymptomSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && symptomSearchQuery.trim()) { toggleSymptom(symptomSearchQuery.trim()); setSymptomSearchQuery(''); } }} disabled={!!reschedulingAppointment} />
                              )}"""

replacement = """                              {renderField("Symptoms", 
                                <div className="custom-dropdown-container" style={{ width: '100%', position: 'relative' }}>
                                  <div className="custom-dropdown-trigger impressive-input" onClick={() => !reschedulingAppointment && setSymptomDropdownOpen(!symptomDropdownOpen)} style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: reschedulingAppointment ? 'not-allowed' : 'pointer', padding: '0 8px', height: 'auto', minHeight: '26px', opacity: reschedulingAppointment ? 0.6 : 1 }}>
                                      <div className="selected-items" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '2px 0' }} data-lenis-prevent>
                                          {selectedSymptoms.length > 0 ? (
                                              selectedSymptoms.map(s => (
                                                <div key={s} className="symptom-tag" style={{ background: '#F1F5F9', color: '#334155', padding: '2px 6px', fontSize: '10.5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #E2E8F0', fontWeight: 600 }}>
                                                    {s}
                                                    <span 
                                                      onClick={(e) => { e.stopPropagation(); !reschedulingAppointment && toggleSymptom(s); }}
                                                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <i data-lucide="x" style={{ pointerEvents: 'none', width: '12px', height: '12px' }}></i>
                                                    </span>
                                                </div>
                                              ))
                                          ) : (
                                              <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 500 }}>Select symptoms...</span>
                                          )}
                                      </div>
                                      <i data-lucide="chevron-down" style={{ width: '14px', height: '14px', color: '#94A3B8', transition: '0.3s', transform: symptomDropdownOpen ? 'rotate(180deg)' : 'none' }}></i>
                                  </div>
                                  {symptomDropdownOpen && (
                                      <div className="dropdown-options-box show" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #CBD5E1', borderRadius: '4px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} data-lenis-prevent>
                                          {availableSymptoms.map(s => (
                                              <div key={s} className="option-item" onClick={() => { toggleSymptom(s); setSymptomDropdownOpen(false); }} style={{ padding: '6px 12px', fontSize: '11.5px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', fontWeight: 600, color: '#334155' }} onMouseOver={e => e.target.style.background = '#F8FAFC'} onMouseOut={e => e.target.style.background = 'white'}>
                                                {s}
                                              </div>
                                          ))}
                                      </div>
                                  )}
                                </div>
                              )}"""

if target in text:
    text = text.replace(target, replacement)
    
    # We also need to remove the "Added Symptoms:" loop below this, because they are now displayed inside the dropdown box!
    # Wait, the user might want them to be displayed as "Added Symptoms" below like before, or inside the box?
    # In `initial.jsx`, the selected symptoms were inside the dropdown box (`<div className="selected-items">`).
    # Let's remove the "Added Symptoms:" loop from the gridColumn: '1 / -1' below.
    target_added = """<div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap', minHeight: '24px', alignItems: 'center' }}>
                          {selectedSymptoms.length > 0 && <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginRight: '8px' }}>Added Symptoms:</span>}
                          {selectedSymptoms.map(s => (
                            <div key={s} style={{ background: '#F1F5F9', color: '#334155', padding: '4px 10px', fontSize: '11px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                              {s} <span onClick={() => !reschedulingAppointment && toggleSymptom(s)} style={{ cursor: 'pointer', color: '#94A3B8', fontWeight: 'bold' }}>✕</span>
                            </div>
                          ))}
                        </div>"""
    
    if target_added in text:
        text = text.replace(target_added, "")
    
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Dropdown restored.")
else:
    print("Could not find the target Symptoms field.")
