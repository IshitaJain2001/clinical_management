import sys, codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
main_file = r'D:\rizwan\backend\models\Appointment.js'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("['Pending', 'In Progress', 'Completed', 'Cancelled', 'Paid']", "['Pending', 'In Progress', 'Completed', 'Cancelled', 'Paid', 'Confirmed']")

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
print('Added Confirmed to enum in Appointment.js')
