main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

target = 'className="dropdown-options-box show"'
idx = text.find(target)
if idx != -1:
    print(text[idx-50:idx+600])
