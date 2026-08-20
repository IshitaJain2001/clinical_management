import sys, codecs

main_file = r'D:\rizwan\frontend\src\pages\Login.jsx'
with open(main_file, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace block 1 (in password form)
find_block_1 = """              <div style={{ position: 'relative', margin: '20px 0 16px 0', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#E2E8F0', zIndex: 1 }}></div>
                <span style={{ position: 'relative', background: '#FFFFFF', padding: '0 10px', fontSize: '11px', color: '#94A3B8', fontWeight: 700, zIndex: 2 }}>OR</span>
              </div>

              {isGoogleConfigured ? (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <div id="googleSignInButton" style={{ width: '100%' }}></div>
                </div>
              ) : (
                <button 
                  type="button" 
                  className="ig-btn-google"
                  onClick={() => {
                    setGoogleModalTab('instructions');
                    setShowGoogleModal(true);
                  }}
                >
                  <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.62-1.05-1.37-1.35-2.22z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Log in with Google
                </button>
              )}"""

replace_block = """              <div style={{ position: 'relative', margin: '20px 0 16px 0', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#E2E8F0', zIndex: 1 }}></div>
                <span style={{ position: 'relative', background: '#FFFFFF', padding: '0 10px', fontSize: '11px', color: '#94A3B8', fontWeight: 700, zIndex: 2 }}>PATIENT PORTAL</span>
              </div>

              <button 
                type="button" 
                className="ig-btn-google"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#F0FDF4',
                  borderColor: '#BBF7D0',
                  color: '#166534',
                  fontWeight: 700,
                  fontSize: '13px',
                  width: '100%',
                  height: '42px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/patient/login')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Patient Portal (Login with Email / OTP)
              </button>"""

if find_block_1 in text:
    text = text.replace(find_block_1, replace_block)
    print("Replaced block 1 in Login.jsx")
else:
    print("Could not find block 1 in Login.jsx")

# Also replace in OTP form if second occurrence exists
if find_block_1 in text:
    text = text.replace(find_block_1, replace_block)
    print("Replaced block 2 in Login.jsx")

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(text)
