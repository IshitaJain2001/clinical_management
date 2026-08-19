import sys
import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

old_def = """const renderField = (label, children) => (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>{label}</div>
                            <div style={{ width: '12px', fontSize: '11.5px', color: '#94A3B8' }}>:</div>
                            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                          </div>
                        );"""

new_def = """const renderField = (label, children, isReq=false) => (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '100px', fontSize: '11.5px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center' }}>
                              {label}
                              {isReq && <span style={{ color: '#EF4444', fontSize: '16px', marginLeft: '3px', marginTop: '4px' }}>*</span>}
                            </div>
                            <div style={{ width: '12px', fontSize: '11.5px', color: '#94A3B8' }}>:</div>
                            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>{children}</div>
                          </div>
                        );"""

if old_def in text:
    text = text.replace(old_def, new_def)
    print('Updated renderField definition.')

# Let's replace the specific calls:
# {renderField("Mobile No.", <input ... />)} => {renderField("Mobile No.", <input ... />, true)}
text = re.sub(r'(\{renderField\("Mobile No\.",\s*<input[^>]+/>)\)', r'\1, true)', text)
text = re.sub(r'(\{renderField\("Patient Name",\s*<input[^>]+/>)\)', r'\1, true)', text)
text = re.sub(r'(\{renderField\("Gender",\s*<select[\s\S]*?</select>)\n\s*\)', r'\1, true\n                            )', text)
text = re.sub(r'(\{renderField\("Age \(Yrs\)",\s*<input[^>]+/>)\)', r'\1, true)', text)

# Title is tricky because it's multiline.
title_pattern = r'(\{renderField\("Title",[\s\S]*?</select>)\n\s*\)'
text = re.sub(title_pattern, r'\1, true\n                            )', text)

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Done injecting required markers.')
