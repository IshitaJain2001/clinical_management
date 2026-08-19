with open(r'D:\rizwan\frontend\initial.jsx', 'rb') as f:
    text = f.read().decode('utf-16-le')

idx = text.find('renderField("Symptoms"')
if idx != -1:
    with open(r'D:\rizwan\out.txt', 'w', encoding='utf-8') as fw:
        fw.write(text[idx:idx+1500])
