import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("color: '#0F172A', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'", "background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'")

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
