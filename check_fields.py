with open(r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

fields = ['"Patient Name"', '"Gender"', '"Age (Yrs)"', '"Title"']
for field in fields:
    idx = text.find(field)
    if idx != -1:
        print(f"--- {field} ---")
        print(text[idx:idx+250])
