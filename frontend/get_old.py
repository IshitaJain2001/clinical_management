import subprocess

subprocess.run(['git', 'show', '4fb602f:frontend/src/pages/ReceptionistDashboard.jsx'], stdout=open('old3.jsx', 'wb'))
text = open('old3.jsx', 'rb').read().decode('utf-8')
idx = text.find('renderField("Symptoms"')
if idx != -1:
    print(text[idx-200:idx+1500])
else:
    print('Not found')
