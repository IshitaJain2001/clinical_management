with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('renderField("Mobile No."')
if start_idx != -1:
    print(text[start_idx:start_idx+1000])
else:
    print('Not found')
