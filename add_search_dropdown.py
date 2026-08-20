import re
import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = """                                  {symptomDropdownOpen && (
                                      <div className="dropdown-options-box show" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #CBD5E1', borderRadius: '4px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} data-lenis-prevent>
                                          {availableSymptoms.map(s => ("""

replacement = """                                  {symptomDropdownOpen && (
                                      <div className="dropdown-options-box show" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #CBD5E1', borderRadius: '4px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} data-lenis-prevent>
                                          <div style={{ padding: '6px', position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #F1F5F9' }}>
                                              <input type="text" autoFocus placeholder="Search symptoms..." value={symptomSearchQuery} onChange={e => setSymptomSearchQuery(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter' && symptomSearchQuery.trim()) { toggleSymptom(symptomSearchQuery.trim()); setSymptomSearchQuery(''); setSymptomDropdownOpen(false); } }} style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '6px 8px', fontSize: '11.5px', outline: 'none', background: '#F8FAFC' }} />
                                          </div>
                                          {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).map(s => ("""

if target in text:
    text = text.replace(target, replacement)
    
    # We also need to clear symptomSearchQuery when the dropdown is closed
    target2 = """onClick={() => !reschedulingAppointment && setSymptomDropdownOpen(!symptomDropdownOpen)}"""
    replacement2 = """onClick={() => { if (!reschedulingAppointment) { setSymptomDropdownOpen(!symptomDropdownOpen); if (symptomDropdownOpen) setSymptomSearchQuery(''); } }}"""
    
    if target2 in text:
        text = text.replace(target2, replacement2)
        with open(main_file, 'w', encoding='utf-8') as f:
            f.write(text)
        print("SUCCESS: Dropdown search input added.")
    else:
        print("Could not find the dropdown trigger to update onClick.")
else:
    print("Could not find the target dropdown options box.")
