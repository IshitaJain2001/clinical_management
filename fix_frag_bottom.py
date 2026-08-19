import sys

main_file = r'D:\rizwan\frontend\src\pages\ReceptionistDashboard.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

old_b = """                </div>
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS TAB */}"""

new_b = """                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* APPOINTMENTS TAB */}"""

if old_b in text:
    text = text.replace(old_b, new_b)
    with open(main_file, 'w', encoding='utf-8') as f:
        f.write(text)
    print('SUCCESS! Fixed bottom marker.')
else:
    print('Failed string replace.')
