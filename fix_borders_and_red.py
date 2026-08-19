import sys
import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update isFormStarted to only trigger when downstream fields are typed
old_is_started = "const isFormStarted = Boolean(formData.name || formData.contact || formData.age || formData.title);"
new_is_started = "const isFormStarted = Boolean(formData.age || formData.title || formData.gender || formData.doctorId || formData.address);"
text = text.replace(old_is_started, new_is_started)

# 2. Add impressive-input / impressive-select to EVERY input/select in the dense form
# Find the start of dense form
start_idx = text.find('{/* ACTUAL DENSE FORM LAYOUT */}')
if start_idx != -1:
    end_idx = text.find('{/* APPOINTMENTS TAB */}')
    form_block = text[start_idx:end_idx]
    
    # Add impressive-input to all inputs that don't have it
    def fix_inputs(match):
        m = match.group(0)
        if 'impressive-input' not in m and 'type="checkbox"' not in m and 'type="radio"' not in m and 'type="file"' not in m:
            if 'className=' in m:
                # Add to existing className
                m = re.sub(r'className="([^"]*)"', r'className="\1 impressive-input"', m)
                m = re.sub(r'className={`([^`]*)`}', r'className={`\1 impressive-input`}', m)
            else:
                # Insert className before style
                m = m.replace('style=', 'className="impressive-input" style=')
        return m

    # Add impressive-select to all selects that don't have it
    def fix_selects(match):
        m = match.group(0)
        if 'impressive-select' not in m:
            if 'className=' in m:
                m = re.sub(r'className="([^"]*)"', r'className="\1 impressive-select"', m)
                m = re.sub(r'className={`([^`]*)`}', r'className={`\1 impressive-select`}', m)
            else:
                m = m.replace('style=', 'className="impressive-select" style=')
        return m

    form_block = re.sub(r'<input[^>]+>', fix_inputs, form_block)
    form_block = re.sub(r'<select[^>]+>', fix_selects, form_block)
    
    # Re-apply to text
    text = text[:start_idx] + form_block + text[end_idx:]

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated form logic and classes.")
