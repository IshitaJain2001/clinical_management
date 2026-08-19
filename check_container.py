with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('No Image Available')
print(repr(text[idx-300:idx+300]))
