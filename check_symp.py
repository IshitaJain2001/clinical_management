import sys
import re
with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('renderField("Symptoms"')
if idx != -1:
    print(text[idx-200:idx+600])
else:
    print('Not found')
