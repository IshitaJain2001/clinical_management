import re
with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('renderField("Symptoms"')
print(text[idx-200:idx+800])
