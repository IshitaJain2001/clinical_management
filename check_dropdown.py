main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('renderField("Symptoms"')
if idx != -1:
    print(text[idx-200:idx+1500])
else:
    print('Not found')
