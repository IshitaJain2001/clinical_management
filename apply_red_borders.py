import sys
import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add .required-empty CSS
old_style = ".impressive-input:hover:not([readonly]):not(:focus) { border-color: #94A3B8; }"
new_style = ".impressive-input:hover:not([readonly]):not(:focus) { border-color: #94A3B8; }\n  .required-empty { border-color: #EF4444 !important; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important; }"
text = text.replace(old_style, new_style)

# 2. Add isFormStarted variable inside the render function
# Just before renderField
old_render_def = "const renderField = (label, children, isReq=false) => ("
new_render_def = "const isFormStarted = Boolean(formData.name || formData.contact || formData.age || formData.title);\n                        const renderField = (label, children, isReq=false) => ("
if new_render_def not in text:
    text = text.replace(old_render_def, new_render_def)

# 3. Add dynamic class logic to specific inputs.
# Mobile No.
text = re.sub(
    r'(<input type="text" className="impressive-input" style=\{inputStyle\} value=\{formData\.contact\})',
    r'<input type="text" className={`impressive-input ${!formData.contact && isFormStarted ? \'required-empty\' : \'\'}`} style={inputStyle} value={formData.contact}',
    text
)

# Patient Name
text = re.sub(
    r'(<input type="text" className="impressive-input" style=\{inputStyle\} value=\{formData\.name\})',
    r'<input type="text" className={`impressive-input ${!formData.name && isFormStarted ? \'required-empty\' : \'\'}`} style={inputStyle} value={formData.name}',
    text
)

# Age
text = re.sub(
    r'(<input type="number" className="impressive-input" style=\{inputStyle\} value=\{formData\.age\})',
    r'<input type="number" className={`impressive-input ${!formData.age && isFormStarted ? \'required-empty\' : \'\'}`} style={inputStyle} value={formData.age}',
    text
)

# Gender
text = re.sub(
    r'(<select className="impressive-select" style=\{selectStyle\} value=\{formData\.gender\})',
    r'<select className={`impressive-select ${!formData.gender && isFormStarted ? \'required-empty\' : \'\'}`} style={selectStyle} value={formData.gender}',
    text
)

# Title
# The title select currently looks like this:
# <select className="impressive-select"\n                                style={selectStyle} \n                                value={formData.title || ''} 
text = re.sub(
    r'(<select className="impressive-select"\s+style=\{selectStyle\}\s+value=\{formData\.title \|\| \'\'\})',
    r'<select className={`impressive-select ${!formData.title && isFormStarted ? \'required-empty\' : \'\'}`} style={selectStyle} value={formData.title || \'\'}',
    text
)

# Make sure all inputs have impressive-input class if they don't already (user said "you have left many")
# Symptoms, Doctor, Date, Time, File, Address, Medical Hist, Allergies, Current Meds
# They all use inputStyle. Let's globally replace style={inputStyle} with impressive-input for input and select tags.
# But we already did a replace in previous steps, some might be missing.
missing_input_pattern = r'<input(?![^>]*className)[^>]*style=\{([^>]*inputStyle[^>]*)\}'
# We can't do simple regex for all. Let's find inputs missing className="impressive-input" and inject it.
def inject_impressive_input(match):
    return match.group(0).replace('style=', 'className="impressive-input" style=')

text = re.sub(r'<input\s+(?:type="[^"]+"\s+)?style=\{(?:inputStyle|\{\.\.\.inputStyle.*?})\}.*?>', inject_impressive_input, text)
text = re.sub(r'<select\s+style=\{selectStyle\}.*?>', lambda m: m.group(0).replace('style=', 'className="impressive-select" style='), text)

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Applied red borders and fixed missing input styles.')
