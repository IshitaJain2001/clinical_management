import sys

file_path = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = 5600
end_idx = 7000

for i in range(start_idx, min(end_idx, len(lines))):
    line = lines[i]
    # Replace heights
    line = line.replace("height: '26px'", "height: '22px'")
    line = line.replace("height: '42px'", "height: '26px'")
    line = line.replace("minHeight: '26px'", "minHeight: '22px'")
    # Replace margins/paddings
    line = line.replace("marginBottom: '16px'", "marginBottom: '6px'")
    line = line.replace("marginBottom: '20px'", "marginBottom: '6px'")
    line = line.replace("marginBottom: '12px'", "marginBottom: '6px'")
    line = line.replace("marginBottom: '8px'", "marginBottom: '4px'")
    line = line.replace("marginTop: '16px'", "marginTop: '6px'")
    line = line.replace("padding: '12px'", "padding: '6px'")
    line = line.replace("padding: '16px'", "padding: '8px'")
    line = line.replace("padding: '10px'", "padding: '6px'")
    line = line.replace("gap: '12px'", "gap: '6px'")
    line = line.replace("gap: '8px 12px'", "gap: '4px 6px'")
    # Replace fonts
    line = line.replace("fontSize: '13px'", "fontSize: '11px'")
    line = line.replace("fontSize: '12px'", "fontSize: '11px'")
    
    lines[i] = line

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
