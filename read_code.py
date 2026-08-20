main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = 'className="dropdown-options-box show"'
idx = text.find(target)
if idx != -1:
    with open('D:/rizwan/out_code2.txt', 'w', encoding='utf-8') as f2:
        f2.write(text[idx-50:idx+1500])
