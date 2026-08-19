main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("background: \\'linear-gradient", "background: 'linear-gradient")

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed syntax error!')
