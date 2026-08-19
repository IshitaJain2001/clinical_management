with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

symptoms_idx = text.find('renderField("Symptoms"')
if symptoms_idx != -1:
    print(text[symptoms_idx-50:symptoms_idx+1500])
else:
    print("Not found")
