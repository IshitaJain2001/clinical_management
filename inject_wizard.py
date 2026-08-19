import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
new_block_file = r'D:\rizwan\wizard_form.jsx'

with open(main_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Inject the state hook
inserted = False
for i, line in enumerate(lines):
    if "const [activeTab, setActiveTab] = useState('dash');" in line and not inserted:
        lines.insert(i + 1, "  const [registrationStep, setRegistrationStep] = useState(1);\n")
        inserted = True
        break

main_text = ''.join(lines)

# 2. Replace the tab block
with open(new_block_file, 'r', encoding='utf-8') as f:
    new_block_text = f.read()

start_marker = '{/* REGISTRATION FORM TAB */}'
end_marker = '{/* APPOINTMENTS TAB */}'

start_idx = main_text.find(start_marker)
end_idx = main_text.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = main_text[:start_idx] + new_block_text + '\n        ' + main_text[end_idx:]
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully updated ReceptionistDashboard.jsx with wizard UI!')
else:
    print('Failed to find markers')
