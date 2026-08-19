import sys

file_path = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Billing margin
text = text.replace("marginBottom: '48px'", "marginBottom: '8px'")

# Confirm & Pay button height
text = text.replace("height: '54px'", "height: '28px'")

# Payment method padding
text = text.replace("padding: '10px 16px'", "padding: '4px 8px'")

# Discount padding/margin
text = text.replace("marginTop: '12px', borderTop: '1px dashed #CBD5E1', paddingTop: '12px'", "marginTop: '4px', borderTop: '1px dashed #CBD5E1', paddingTop: '4px'")

# Total margin/padding
text = text.replace("marginTop: '8px', paddingTop: '8px'", "marginTop: '4px', paddingTop: '4px'")

# Discount input height
text = text.replace("height: '32px'", "height: '22px'")

# minHeight 380px -> 150px
text = text.replace("minHeight: '380px'", "minHeight: '150px'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
