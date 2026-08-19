import sys
import re

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix top marker
pattern_top = r'\) : \(\s*// ==========================================\s*// ACTUAL DENSE FORM LAYOUT\s*// ==========================================\s*<style>\{`'
replacement_top = ') : (\n              <>\n              {/* ========================================== */}\n              {/* ACTUAL DENSE FORM LAYOUT */}\n              {/* ========================================== */}\n              \n<style>{`'

if re.search(pattern_top, text):
    text = re.sub(pattern_top, replacement_top, text)
    print('SUCCESS! Fixed top marker.')
else:
    print('Failed regex top.')

# Fix bottom marker
pattern_bottom = r'                 </div>\s*</div>\s*\}\)\s*</div>\s*\}\)\s*\{\/\* APPOINTMENTS TAB \*\/\}'
replacement_bottom = """                 </div>
              </div>
              </>
            )}
          </div>
        )}
        {/* APPOINTMENTS TAB */}"""

if re.search(pattern_bottom, text):
    text = re.sub(pattern_bottom, replacement_bottom, text)
    print('SUCCESS! Fixed bottom marker.')
else:
    print('Failed regex bottom.')

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
