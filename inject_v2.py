import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
new_block_file = r'D:\rizwan\appealing_legacy_v2.jsx'

with open(main_file, 'r', encoding='utf-8') as f:
    main_text = f.read()

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
    print('Successfully updated ReceptionistDashboard.jsx with separated search UI!')
else:
    print('Failed to find markers')
