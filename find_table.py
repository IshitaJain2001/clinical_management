main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('<table className="patients-table">')
if idx == -1: idx = text.find('PATIENT ID')
if idx != -1:
    with open('D:/rizwan/table_code.txt', 'w', encoding='utf-8') as f2:
        f2.write(text[idx-100:idx+2500])
