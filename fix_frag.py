import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix top fragment
old_top = ") : (\n              // ==========================================\n              // ACTUAL DENSE FORM LAYOUT\n              // ==========================================\n\n<style>{`"
new_top = ") : (\n              <>\n              {/* ========================================== */}\n              {/* ACTUAL DENSE FORM LAYOUT */}\n              {/* ========================================== */}\n\n<style>{`"
if old_top in text:
    text = text.replace(old_top, new_top)
    print('Fixed top fragment')
else:
    # try just replacing the bare style
    old_bare = ") : (\n              // ==========================================\n              // ACTUAL DENSE FORM LAYOUT\n              // ==========================================\n\n<style>{`"
    # Actually wait, maybe there is no \n\n?
    print('Could not find old_top exactly')
    # Let's just find ) : (
    
old_bottom = "                 </div>\n              </div>\n            )}\n          </div>\n        )}\n        {/* APPOINTMENTS TAB */}"
new_bottom = "                 </div>\n              </div>\n              </>\n            )}\n          </div>\n        )}\n        {/* APPOINTMENTS TAB */}"

if old_bottom in text:
    text = text.replace(old_bottom, new_bottom)
    print('Fixed bottom fragment')

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
