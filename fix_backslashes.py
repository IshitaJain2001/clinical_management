import sys
main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# I injected \'required-empty\' : \'\'
# Let's just remove \' and replace with '
text = text.replace("\\'required-empty\\' : \\'\\'", "'required-empty' : ''")

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('SUCCESS! Fixed backslashes.')
