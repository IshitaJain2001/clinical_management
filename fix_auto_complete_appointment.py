import sys, codecs

doc_file = r'D:\rizwan\frontend\src\pages\DoctorDashboard.jsx'
with open(doc_file, 'r', encoding='utf-8') as f:
    doc_text = f.read()

find_lock_block = """    // Set target print items and show settings modal
    setPrintSettingsTarget({
      rx: null,
      item: {
        items: validMedicines,
        tests: validLabs,
        diagnosis: diagnosisText ? diagnosisText.trim() : '',
        date: new Date().toLocaleDateString('en-IN'),
        doctor: user.name,
        originalApp: { regNo: activeAppointmentId ? activeAppointmentId.substring(0, 8).toUpperCase() : 'NEW' }
      },
      callback: (finalSettings) => {
        executeSaveAndLockPrescription(finalSettings);
      }
    });
    setTempPrintSettings(printSettings);
    setShowPrintSettingsModal(true);"""

replace_lock_block = """    // Immediately execute save and lock without requiring print modal
    executeSaveAndLockPrescription(printSettings);"""

if find_lock_block in doc_text:
    doc_text = doc_text.replace(find_lock_block, replace_lock_block)
    print("Updated handleLockPrescription to save and mark Completed immediately without requiring print!")
else:
    print("Could not find find_lock_block in DoctorDashboard.jsx")

# Also ensure that after saving, data_changed socket / sync event is fired
find_save_encounter_end = """        await api.put(`/appointments/${appToUpdate}`, { 
          status: 'Completed', 
          diagnosis: cleanDiagnosisText,
          notes: soap.plan || soap.assessment || ''
        });"""

replace_save_encounter_end = """        await api.put(`/appointments/${appToUpdate}`, { 
          status: 'Completed', 
          diagnosis: cleanDiagnosisText,
          notes: soap.plan || soap.assessment || ''
        });
        window.dispatchEvent(new CustomEvent('curoxa_sync', { detail: { type: 'appointments' } }));"""

if find_save_encounter_end in doc_text:
    doc_text = doc_text.replace(find_save_encounter_end, replace_save_encounter_end)
    print("Added curoxa_sync event on appointment completion!")

with open(doc_file, 'w', encoding='utf-8') as f:
    f.write(doc_text)
