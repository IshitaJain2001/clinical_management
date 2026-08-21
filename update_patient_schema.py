import sys

pat_model = r'D:\rizwan\backend\models\Patient.js'
with open(pat_model, 'r', encoding='utf-8') as f:
    text = f.read()

find_age = "  age: { type: Number, required: true },"
replace_age = """  age: { type: Number, default: 0 },
  ageMonths: { type: Number, default: 0 },
  ageDays: { type: Number, default: 0 },"""

if find_age in text:
    text = text.replace(find_age, replace_age)
    with open(pat_model, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Updated Patient.js model with ageMonths and ageDays")
else:
    print("Could not find age field in Patient.js")
