import sys

file_path = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = 5600
end_idx = 7200

for i in range(start_idx, min(end_idx, len(lines))):
    line = lines[i]
    # Further compress heights
    line = line.replace("height: '22px'", "height: '20px'")
    line = line.replace("height: '26px'", "height: '20px'")
    line = line.replace("minHeight: '22px'", "minHeight: '20px'")
    line = line.replace("height: '42px'", "height: '24px'")
    
    # Further compress padding/margin
    line = line.replace("marginBottom: '6px'", "marginBottom: '2px'")
    line = line.replace("marginBottom: '8px'", "marginBottom: '2px'")
    line = line.replace("marginBottom: '12px'", "marginBottom: '4px'")
    line = line.replace("marginBottom: '16px'", "marginBottom: '4px'")
    line = line.replace("marginBottom: '20px'", "marginBottom: '4px'")
    line = line.replace("marginBottom: '24px'", "marginBottom: '4px'")
    line = line.replace("marginBottom: '28px'", "marginBottom: '8px'")
    line = line.replace("marginBottom: '32px'", "marginBottom: '8px'")
    line = line.replace("marginBottom: '40px'", "marginBottom: '8px'")
    
    line = line.replace("marginTop: '6px'", "marginTop: '2px'")
    line = line.replace("marginTop: '16px'", "marginTop: '4px'")
    line = line.replace("marginTop: '24px'", "marginTop: '8px'")
    
    line = line.replace("padding: '6px'", "padding: '2px'")
    line = line.replace("padding: '8px'", "padding: '4px'")
    line = line.replace("padding: '10px'", "padding: '4px'")
    line = line.replace("padding: '12px'", "padding: '4px'")
    line = line.replace("padding: '16px'", "padding: '6px'")
    line = line.replace("padding: '20px'", "padding: '8px'")
    line = line.replace("padding: '24px'", "padding: '8px'")
    line = line.replace("padding: '32px'", "padding: '12px'")
    line = line.replace("padding: '40px'", "padding: '12px'")
    
    line = line.replace("padding: '16px 24px'", "padding: '8px 12px'")
    line = line.replace("padding: '12px 16px'", "padding: '4px 8px'")
    line = line.replace("padding: '10px 14px'", "padding: '4px 8px'")
    line = line.replace("padding: '8px 12px'", "padding: '2px 4px'")
    line = line.replace("padding: '4px 12px'", "padding: '2px 6px'")
    line = line.replace("padding: '16px 20px'", "padding: '6px 10px'")
    
    line = line.replace("gap: '6px'", "gap: '2px'")
    line = line.replace("gap: '8px'", "gap: '4px'")
    line = line.replace("gap: '12px'", "gap: '4px'")
    line = line.replace("gap: '16px'", "gap: '6px'")
    line = line.replace("gap: '20px'", "gap: '8px'")
    line = line.replace("gap: '4px 6px'", "gap: '2px 4px'")
    
    # Fonts
    line = line.replace("fontSize: '11px'", "fontSize: '10px'")
    line = line.replace("fontSize: '12px'", "fontSize: '10px'")
    line = line.replace("fontSize: '13px'", "fontSize: '11px'")
    line = line.replace("fontSize: '14px'", "fontSize: '12px'")
    line = line.replace("fontSize: '16px'", "fontSize: '14px'")
    line = line.replace("fontSize: '20px'", "fontSize: '16px'")
    line = line.replace("fontSize: '24px'", "fontSize: '18px'")
    
    lines[i] = line

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
