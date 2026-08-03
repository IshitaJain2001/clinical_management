import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
  // Mode toggling (SignUp disabled)
  const isSignUp = false;

  // Sign In states
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP Login states
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Multi-Tenant SaaS states
  const [tenantId, setTenantId] = useState('city_hospital');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Google Login modal simulation
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalTab, setGoogleModalTab] = useState('instructions');

  // Google OAuth Config Check
  const rawGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleClientId = rawGoogleClientId ? rawGoogleClientId.trim() : '';
  const isGoogleConfigured = googleClientId && googleClientId !== 'YOUR_GOOGLE_CLIENT_ID' && !googleClientId.startsWith('YOUR_');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showServerSplash, setShowServerSplash] = useState(false);
  const [showPasswordChangedModal, setShowPasswordChangedModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('curoxa_superadmin_session');
    const reason = localStorage.getItem('logout_reason');
    if (reason === 'password_changed') {
      setShowPasswordChangedModal(true);
      localStorage.removeItem('logout_reason');
    } else if (reason === 'session_expired' || reason === 'backend_disconnected') {
      localStorage.removeItem('logout_reason');
    }
  }, []);

  // Forgot Password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Request OTP, 2 = Verify & Reset
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    let user = {};
    try {
      const storedUser = localStorage.getItem('user');
      user = (storedUser && storedUser !== 'undefined') ? JSON.parse(storedUser) : {};
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
    }
    
    if (token && user && user.role) {
      switch (user.role) {
        case 'admin': navigate('/admin'); break;
        case 'superadmin':
        case 'super_admin': navigate('/super-admin'); break;
        case 'doctor': navigate('/doctor'); break;
        case 'receptionist': navigate('/receptionist'); break;
        case 'patient': navigate('/patient'); break;
        case 'lab': navigate('/lab'); break;
        case 'pharmacy': navigate('/pharmacy'); break;
        case 'hr': navigate('/hr'); break;
        default: break;
      }
    }
  }, [navigate]);

  // Pre-warm: fetch medicines + doctors in the background so the
  // first dashboard load (especially doctor's Rx) is instant.
  useEffect(() => {
    const prewarm = async () => {
      try {
        const [meds, docs] = await Promise.allSettled([
          api.get('/medicines'),
          api.get('/auth/doctors')
        ]);
        if (meds.status === 'fulfilled' && typeof sessionStorage !== 'undefined') {
          try { sessionStorage.setItem('meds:cache', JSON.stringify(meds.value.data)); } catch (_) {}
        }
        if (docs.status === 'fulfilled' && typeof sessionStorage !== 'undefined') {
          try { sessionStorage.setItem('doctors:cache', JSON.stringify(docs.value.data)); } catch (_) {}
        }
      } catch (_) {
        // Pre-warm is best-effort
      }
    };
    prewarm();
  }, []);

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [isSignUp, showPassword, showConfirmPassword, showGoogleModal, showForgotModal]);

  // Dynamic Password Strength Calculator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, text: 'No Password', color: '#CBD5E1', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd) && pwd.length >= 8) score++;

    if (score === 0 || score === 1) return { score: 1, text: 'Weak', color: '#EF4444', width: '33%' };
    if (score === 2) return { score: 2, text: 'Medium', color: '#F59E0B', width: '66%' };
    if (score === 3) return { score: 3, text: 'Strong', color: '#10B981', width: '100%' };
    return { score: 1, text: 'Weak', color: '#EF4444', width: '33%' };
  };

  const handleGoogleCredentialResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/google-login', {
        credential: response.credential
      });
      const { token, user, tenantModules, plan } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenantId', user.tenantId || 'city_hospital');
      localStorage.setItem('tenantModules', JSON.stringify(tenantModules || {}));
      localStorage.setItem('plan', plan || '');

      window.dispatchEvent(new CustomEvent('curoxa_login_success'));
      setSuccess('Logged in via Google successfully!');
      setTimeout(() => {
        switch (user.role) {
          case 'admin': navigate('/admin'); break;
          case 'superadmin':
          case 'super_admin': navigate('/super-admin'); break;
          case 'doctor': navigate('/doctor'); break;
          case 'receptionist': navigate('/receptionist'); break;
          case 'patient': navigate('/patient'); break;
          case 'lab': navigate('/lab'); break;
          case 'pharmacy': navigate('/pharmacy'); break;
          case 'hr': navigate('/hr'); break;
          default: navigate('/'); break;
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Google Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSignUp && isGoogleConfigured && typeof google !== 'undefined') {
      const timer = setTimeout(() => {
        const btnContainer = document.getElementById("googleSignInButton");
        if (btnContainer) {
          try {
            google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleGoogleCredentialResponse,
              cancel_on_tap_outside: false
            });

            // Measure parent container to render button with exact pixel width (responsive matching)
            const containerWidth = btnContainer.offsetWidth || 320;
            const viewportLimit = window.innerWidth - 80;
            const clampedWidth = Math.max(200, Math.min(400, Math.min(containerWidth, viewportLimit)));

            google.accounts.id.renderButton(
              btnContainer,
              { 
                theme: "outline", 
                size: "large", 
                width: clampedWidth, 
                text: "signin_with",
                shape: "rectangular"
              }
            );
          } catch (err) {
            console.error("Google login rendering error:", err);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSignUp, isGoogleConfigured, loginMethod]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowServerSplash(true);

    try {
      const response = await api.post('/auth/login', {
        staff_id: staffId,
        password: password
      });

      const { token, user, tenantModules, plan } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenantId', user.tenantId || 'city_hospital');
      localStorage.setItem('tenantModules', JSON.stringify(tenantModules || {}));
      localStorage.setItem('plan', plan || '');

      window.dispatchEvent(new CustomEvent('curoxa_login_success'));

      // Redirect based on role
      switch (user.role) {
        case 'admin': navigate('/admin'); break;
        case 'superadmin':
        case 'super_admin': navigate('/super-admin'); break;
        case 'doctor': navigate('/doctor'); break;
        case 'receptionist': navigate('/receptionist'); break;
        case 'patient': navigate('/patient'); break;
        case 'lab': navigate('/lab'); break;
        case 'pharmacy': navigate('/pharmacy'); break;
        case 'hr': navigate('/hr'); break;
        default: navigate('/'); break;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during login');
    } finally {
      setShowServerSplash(false);
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/send-login-otp', {
        emailOrPhone: emailOrPhone
      });
      setSuccess('One-Time Password has been generated and sent.');
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    setShowServerSplash(true);
    try {
      const response = await api.post('/auth/login-with-otp', {
        emailOrPhone: emailOrPhone,
        otp: loginOtp
      });

      const { token, user, tenantModules, plan } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenantId', user.tenantId || 'city_hospital');
      localStorage.setItem('tenantModules', JSON.stringify(tenantModules || {}));
      localStorage.setItem('plan', plan || '');

      window.dispatchEvent(new CustomEvent('curoxa_login_success'));

      setSuccess('Verification successful!');
      setTimeout(() => {
        // Redirect based on role
        switch (user.role) {
          case 'admin': navigate('/admin'); break;
          case 'superadmin':
          case 'super_admin': navigate('/super-admin'); break;
          case 'doctor': navigate('/doctor'); break;
          case 'receptionist': navigate('/receptionist'); break;
          case 'patient': navigate('/patient'); break;
          case 'lab': navigate('/lab'); break;
          case 'pharmacy': navigate('/pharmacy'); break;
          case 'hr': navigate('/hr'); break;
          default: navigate('/'); break;
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP');
    } finally {
      setShowServerSplash(false);
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        email: forgotEmail
      });
      setForgotSuccess(response.data.message ? `${response.data.message} (Please check your Spam/Junk folder if not received.)` : 'OTP sent successfully! Please check your inbox (and your Spam/Junk folder if not received).');
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotNewPassword
      });
      setForgotSuccess(response.data.message || 'Password reset successfully!');
      setTimeout(() => {
        setShowForgotModal(false);
      }, 2000);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="login-container">
      {/* Scoped CSS Injector for Layout and Media Queries */}
      <style>{`
        html {
          overflow-y: auto !important;
        }
        .login-container {
          display: flex;
          width: 100%;
          height: calc(100vh / 0.9);
          background: #F8FAFC;
          color: #0F172A;
          font-family: 'Urbanist', sans-serif;
          overflow: hidden;
        }
        
        .left-pane {
          width: 55%;
          background: radial-gradient(circle at 30% 30%, #FFFFFF 0%, #DBEAFE 100%);
          border-right: 1px solid #BFDBFE;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 60px;
          position: relative;
          overflow: hidden;
        }
        
        .right-pane {
          width: 45%;
          background: #F8FAFC;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          position: relative;
          box-sizing: border-box;
        }
        
        @media (max-width: 1024px) {
          .login-container {
            height: auto !important;
            min-height: 100vh !important;
            min-height: 100dvh !important;
            overflow: auto !important;
          }
          .left-pane {
            display: none !important;
          }
          .right-pane {
            width: 100% !important;
            padding: 24px 16px !important;
            background: #F8FAFC;
            box-sizing: border-box !important;
          }
          .instagram-card {
            padding: 24px 20px !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .instagram-card-secondary {
            max-width: 100% !important;
            width: 100% !important;
          }
          .footer-links {
            position: relative !important;
            bottom: auto !important;
            margin-top: 40px !important;
            padding-bottom: 20px !important;
          }
          .responsive-modal {
            padding: 20px 16px !important;
            width: 95vw !important;
            max-width: 440px !important;
          }
          .responsive-splash-card {
            padding: 28px 20px !important;
            width: 90vw !important;
            max-width: 340px !important;
          }
        }
        
        .instagram-card {
          width: 100%;
          max-width: 380px;
          background: #FFFFFF;
          border: 1px solid #BFDBFE;
          border-radius: 12px;
          padding: 32px 28px;
          box-shadow: 0 20px 25px -5px rgba(59, 113, 254, 0.05), 0 10px 10px -5px rgba(59, 113, 254, 0.03);
          box-sizing: border-box;
          transition: box-shadow 0.4s, border-color 0.4s, max-width 0.3s;
        }

        .instagram-card.signup-mode {
          max-width: 520px;
        }
        
        .instagram-card-secondary {
          width: 100%;
          max-width: 380px;
          background: #FFFFFF;
          border: 1px solid #BFDBFE;
          border-radius: 12px;
          padding: 20px;
          margin-top: 12px;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(59, 113, 254, 0.02);
          box-sizing: border-box;
          transition: box-shadow 0.4s, border-color 0.4s, max-width 0.3s;
        }

        .instagram-card-secondary.signup-mode {
          max-width: 520px;
        }

        .ig-input-group {
          position: relative;
          margin-bottom: 12px;
        }

        .ig-input {
          width: 100%;
          height: 42px;
          background: #FFFFFF !important;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          padding: 9px 12px;
          font-size: 13px;
          color: #0F172A !important;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        
        .ig-input:focus {
          border-color: #3B71FE;
          box-shadow: 0 0 0 3px rgba(59, 113, 254, 0.15);
        }

        .ig-input::placeholder {
          color: #94A3B8;
          font-size: 12px;
        }

        .ig-btn-primary {
          width: 100%;
          height: 40px;
          background: linear-gradient(135deg, #3B71FE 0%, #2563EB 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, transform 0.1s;
        }

        .ig-btn-primary:hover:not(:disabled) {
          background: #1D4ED8;
        }

        .ig-btn-primary:active:not(:disabled) {
          transform: scale(0.98);
        }

        .ig-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ig-btn-google {
          width: 100%;
          height: 40px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          color: #1E293B;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .ig-btn-google:hover {
          background: #F8FAFC;
        }

        .neon-gradient-text {
          background: linear-gradient(135deg, #2563EB 0%, #93C5FD 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 800;
        }

        .mockup-image-container {
          position: relative;
          margin: 0 auto;
          width: 100%;
          max-width: 440px;
          height: auto;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .mockup-img {
          width: 100%;
          height: auto;
          max-height: 42vh;
          object-fit: contain;
          filter: drop-shadow(0 20px 25px rgba(59, 113, 254, 0.15));
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); boxShadow: '0 0 30px rgba(59, 113, 254, 0.3)'; }
          50% { transform: scale(1.05); boxShadow: '0 0 40px rgba(59, 113, 254, 0.5)'; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .footer-links {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          font-size: 11px;
          color: #94A3B8;
        }

        .footer-links a {
          color: #94A3B8;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-links a:hover {
          color: #64748B;
        }

        /* Custom Scrollbar for signup form */
        .signup-scroll-area {
          overscroll-behavior: contain !important;
        }

        .signup-scroll-area::-webkit-scrollbar {
          width: 6px;
        }
        
        .signup-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .signup-scroll-area::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 4px;
        }
        
        .signup-scroll-area::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }

        /* Grid layout for signup */
        .signup-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .signup-full {
          grid-column: span 2;
        }

        /* Lucide icons adjustment */
        .ig-icon-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%) !important;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #94A3B8;
          padding: 0;
          display: flex;
          align-items: center;
          box-shadow: none !important;
          filter: none !important;
          transition: color 0.2s ease !important;
        }

        .ig-icon-btn:hover {
          color: #64748B;
          transform: translateY(-50%) !important;
          box-shadow: none !important;
          filter: none !important;
        }

        .ig-icon-btn:active {
          transform: translateY(-50%) !important;
          box-shadow: none !important;
          filter: none !important;
        }
      `}</style>

      {/* Left Column: Media Presentation */}
      <div className="left-pane">
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: '#2563EB', color: '#FFFFFF', fontWeight: 900, fontSize: '20px', boxShadow: '0 0 20px rgba(59, 113, 254, 0.2)' }}>
            C
          </div>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#2563EB', letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>Curoxa</span>
        </div>

        {/* Visual Content Block */}
        <div style={{ margin: 'auto 0' }}>
          <h1 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 900, color: '#0F172A', lineHeight: '1.2', margin: '0 0 16px 0', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
            Track and manage <span className="neon-gradient-text">everyday clinical moments</span> for your patients.
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', fontWeight: 500, margin: '0 0 40px 0', lineHeight: '1.5', maxWidth: '440px' }}>
            Empower your healthcare operations with structured laboratory management, real-time analytics, and secure client communication workflows.
          </p>

          <div className="mockup-image-container">
            <img 
              src="/curoxa_login_promo.png" 
              alt="Curoxa App Mockup" 
              className="mockup-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Footer Brand copyright */}
        <div>
          <p style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>© 2026 Curoxa Healthcare Systems. All rights reserved.</p>
        </div>
      </div>

      {/* Server Wake-Up Splash Overlay */}
      {showServerSplash && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="responsive-splash-card" style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px 48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            maxWidth: '360px',
            width: '90%'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3B71FE 0%, #2563EB 100%)',
              color: 'white',
              fontWeight: 900,
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(59, 113, 254, 0.3)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>M</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '6px', fontFamily: "'Outfit', sans-serif" }}>Logging in…</div>
              <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, lineHeight: '1.5' }}>Authenticating your credentials and securing your session…</div>
            </div>
            <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        </div>
      )}

      {showPasswordChangedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="responsive-splash-card" style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            maxWidth: '400px',
            width: '90%',
            position: 'relative'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEF2F2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.1)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', fontFamily: "'Outfit', sans-serif" }}>Password Changed</h3>
              <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, lineHeight: '1.6', margin: 0 }}>
                Your account password has been updated. You have been logged out for security. Please log in again using your new password.
              </p>
            </div>
            <button 
              onClick={() => setShowPasswordChangedModal(false)}
              style={{
                width: '100%',
                height: '44px',
                background: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              Understand & Sign In
            </button>
          </div>
        </div>
      )}

      {/* Right Column: Authentication Panel */}
      <div className="right-pane">
        {/* Main Instagram Auth Card */}
        <div className="instagram-card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: '#2563EB', color: '#FFFFFF', fontWeight: 900, fontSize: '20px', marginBottom: '12px', boxShadow: '0 0 20px rgba(59, 113, 254, 0.2)' }}>
              C
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              Log in to Curoxa
            </h2>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.06)', color: '#EF4444', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', border: '1px solid rgba(239, 68, 68, 0.15)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span style={{ flexGrow: 1 }}>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ background: 'rgba(16, 185, 129, 0.06)', color: '#10B981', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', border: '1px solid rgba(16, 185, 129, 0.15)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} style={{ flexShrink: 0 }} />
              <span style={{ flexGrow: 1 }}>{success}</span>
            </div>
          )}

          {loginMethod === 'password' ? (
            /* PASSWORD SIGN IN FORM */
            <form onSubmit={handleLogin}>
              <div className="ig-input-group">
                <input 
                  type="text" 
                  className="ig-input" 
                  placeholder="Staff ID / Contact Number"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value.toLowerCase())}
                  required
                />
              </div>
              
              <div className="ig-input-group" style={{ marginBottom: '16px' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="ig-input" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="ig-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button
                  type="button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotEmail('');
                    setForgotOtp('');
                    setForgotNewPassword('');
                    setForgotConfirmPassword('');
                    setForgotStep(1);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              
              <button 
                type="submit" 
                className="ig-btn-primary" 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>

              <div style={{ position: 'relative', margin: '20px 0 16px 0', textAlign: 'center' }}>
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
              )}
            </form>
          ) : (
            /* OTP SIGN IN FORM */
            <form onSubmit={!otpSent ? handleSendOtp : handleVerifyLoginOtp}>
              {!otpSent ? (
                <>
                  <div className="ig-input-group" style={{ marginBottom: '16px' }}>
                    <input 
                      type="text" 
                      className="ig-input" 
                      placeholder="Email or Mobile Number"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value.toLowerCase())}
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="ig-btn-primary" 
                    disabled={loading}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="ig-input-group">
                    <input 
                      type="text" 
                      className="ig-input" 
                      value={emailOrPhone}
                      disabled
                      style={{ background: '#F1F5F9', color: '#64748B' }}
                    />
                  </div>

                  <div className="ig-input-group" style={{ marginBottom: '16px' }}>
                    <input 
                      type="text" 
                      className="ig-input" 
                      placeholder="Enter 6-Digit OTP"
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value)}
                      required
                      maxLength="6"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="ig-btn-primary" 
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify & Log In'}
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: '#64748B',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      onClick={() => setOtpSent(false)}
                    >
                      Change Contact Info
                    </button>

                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: '#2563EB',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  </div>
                </>
              )}

              <div style={{ position: 'relative', margin: '20px 0 16px 0', textAlign: 'center' }}>
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
              )}
            </form>
          )}
        </div>

        {/* Toggle secondary box */}
        <div className="instagram-card-secondary">
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
            {loginMethod === 'password' ? (
              <>
                Prefer login without password?{' '}
                <button 
                  type="button" 
                  style={{ background: 'transparent', border: 'none', padding: 0, color: '#2563EB', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => {
                    setLoginMethod('otp');
                    setError('');
                    setSuccess('');
                    setOtpSent(false);
                  }}
                >
                  Use OTP Login
                </button>
              </>
            ) : (
              <>
                Know your password?{' '}
                <button 
                  type="button" 
                  style={{ background: 'transparent', border: 'none', padding: 0, color: '#2563EB', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => {
                    setLoginMethod('password');
                    setError('');
                    setSuccess('');
                  }}
                >
                  Use Password Login
                </button>
              </>
            )}
          </span>
        </div>

        {/* Support Links in Instagram footer format */}
        <div className="footer-links">
          <a href="#about" onClick={(e) => e.preventDefault()}>About</a>
          <span>•</span>
          <a href="#services" onClick={(e) => e.preventDefault()}>Services</a>
          <span>•</span>
          <a href="#careers" onClick={(e) => e.preventDefault()}>Careers</a>
          <span>•</span>
          <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
          <span>•</span>
          <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
          <span>•</span>
          <a href="#help" onClick={(e) => e.preventDefault()}>Help</a>
          <span>•</span>
          <a href="#status" onClick={(e) => e.preventDefault()}>System Status</a>
        </div>
      </div>

      {/* Google OAuth & Simulation Modal */}
      {showGoogleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="responsive-modal" style={{ width: '460px', maxWidth: '95vw', padding: '24px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header / Google Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <svg style={{ width: '28px', height: '28px', flexShrink: 0 }} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.62-1.05-1.37-1.35-2.22z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>Google Sign-In Options</h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Configure real login or use developer simulation</p>
              </div>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '16px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: googleModalTab === 'instructions' ? '2px solid #2563EB' : 'none',
                  color: googleModalTab === 'instructions' ? '#2563EB' : '#64748B',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setGoogleModalTab('instructions')}
              >
                Setup Instructions
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: googleModalTab === 'simulator' ? '2px solid #2563EB' : 'none',
                  color: googleModalTab === 'simulator' ? '#2563EB' : '#64748B',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => setGoogleModalTab('simulator')}
              >
                Local Simulator
              </button>
            </div>

            {/* Content area */}
            <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '320px', paddingRight: '4px', marginBottom: '16px' }} className="signup-scroll-area" data-lenis-prevent>
              {googleModalTab === 'instructions' ? (
                /* INSTRUCTIONS TAB */
                <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                  <div style={{ background: '#EFF6FF', color: '#1E40AF', padding: '10px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '11px', border: '1px solid #DBEAFE', fontWeight: 600 }}>
                    💡 Set the Google Client ID in your environment config files to enable real user authentication.
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>Step 1: Go to Google Cloud Console</strong>
                      <span>Open <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'underline' }}>Google Cloud Console</a> and create or select a project.</span>
                    </div>

                    <div>
                      <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>Step 2: Configure OAuth Consent Screen</strong>
                      <span>Go to APIs & Services &gt; OAuth Consent Screen, set User Type to External, enter application information, and publish the app.</span>
                    </div>

                    <div>
                      <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>Step 3: Create OAuth Client ID Credentials</strong>
                      <span>Go to Credentials &gt; Create Credentials &gt; OAuth client ID. Select "Web application". Add Authorized JavaScript origins: <code>http://localhost:5173</code> (or your deployment URL).</span>
                    </div>

                    <div>
                      <strong style={{ color: '#0F172A', display: 'block', marginBottom: '2px' }}>Step 4: Update Environment variables (.env)</strong>
                      <div style={{ background: '#F1F5F9', padding: '8px 10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '11px', border: '1px solid #E2E8F0', marginTop: '4px' }}>
                        <div><strong>Frontend (.env)</strong></div>
                        <div style={{ color: '#475569' }}>VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com</div>
                        <div style={{ marginTop: '6px' }}><strong>Backend (.env)</strong></div>
                        <div style={{ color: '#475569' }}>GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SIMULATOR TAB */
                <div>
                  <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, margin: '0 0 14px 0', textAlign: 'center' }}>
                    Select a simulated account to test the system's OAuth behavior locally:
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { name: 'Super Admin (SaaS Portal)', email: 'super.admin@curoxa.com', avatar: 'SU' },
                      { name: 'System Administrator (Admin)', email: 'admin', avatar: 'SA' },
                      { name: 'Dr. Sarah Jenkins (Doctor)', email: 'sarah.jenkins@gmail.com', avatar: 'SJ' },
                      { name: 'Receptionist Rita (Receptionist)', email: 'rita.receptionist@gmail.com', avatar: 'RR' },
                      { name: 'John Doe (New Patient)', email: 'john.doe@gmail.com', avatar: 'JD' },
                      { name: 'Jane Smith (Existing Patient)', email: 'jane.smith@gmail.com', avatar: 'JS' }
                    ].map(account => (
                      <div 
                        key={account.email} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '10px 14px', 
                          borderRadius: '8px', 
                          border: '1px solid #E2E8F0', 
                          cursor: 'pointer', 
                          transition: '0.2s',
                          background: '#F8FAFC'
                        }}
                        onClick={async () => {
                          setShowGoogleModal(false);
                          setLoading(true);
                          try {
                            const res = await api.post('/auth/google-login', {
                              credential: `simulated_token_${account.email}`
                            });
                            
                            const { token, user, tenantModules, plan } = res.data;
                            localStorage.setItem('token', token);
                            localStorage.setItem('user', JSON.stringify(user));
                            localStorage.setItem('tenantId', user.tenantId || 'city_hospital');
                            localStorage.setItem('tenantModules', JSON.stringify(tenantModules || {}));
                            localStorage.setItem('plan', plan || '');
                            
                            window.dispatchEvent(new CustomEvent('curoxa_login_success'));
                            setSuccess('Logged in via simulated Google Sign-In!');
                            setTimeout(() => {
                              switch (user.role) {
                                case 'admin': navigate('/admin'); break;
                                case 'superadmin':
                                case 'super_admin': navigate('/super-admin'); break;
                                case 'doctor': navigate('/doctor'); break;
                                case 'receptionist': navigate('/receptionist'); break;
                                case 'patient': navigate('/patient'); break;
                                case 'lab': navigate('/lab'); break;
                                case 'pharmacy': navigate('/pharmacy'); break;
                                default: navigate('/'); break;
                              }
                            }, 1000);
                          } catch (gErr) {
                            setError(gErr.response?.data?.error || 'Simulated Google Authentication failed');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#EFF6FF';
                          e.currentTarget.style.borderColor = '#2563EB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#F8FAFC';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                          {account.avatar}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{account.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{account.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              className="ig-btn-google" 
              style={{ width: '100%', height: '38px', color: '#64748B', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
              onClick={() => setShowGoogleModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="responsive-modal" style={{ width: '400px', maxWidth: '95vw', padding: '28px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '10px', background: '#2563EB', color: '#FFFFFF', fontWeight: 900, fontSize: '20px', marginBottom: '12px', boxShadow: '0 0 20px rgba(59, 113, 254, 0.2)' }}>
                M
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1E293B', fontFamily: "'Outfit', sans-serif" }}>Reset Password</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                {forgotStep === 1 ? 'Enter your email to receive an OTP' : 'Enter the OTP and your new password'}
              </p>
            </div>

            {forgotError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', color: '#EF4444', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '11px', border: '1px solid rgba(239, 68, 68, 0.15)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span style={{ flexGrow: 1 }}>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', color: '#10B981', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '11px', border: '1px solid rgba(16, 185, 129, 0.15)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={14} style={{ flexShrink: 0 }} />
                <span style={{ flexGrow: 1 }}>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestOtp}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'block' }}>Email ID</label>
                  <input
                    type="email"
                    className="ig-input"
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    type="button" 
                    className="ig-btn-google" 
                    style={{ flex: 1, height: '38px', color: '#64748B', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="ig-btn-primary" 
                    style={{ flex: 1.5, height: '38px', fontSize: '12px' }}
                    disabled={loading}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtpAndReset}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'block' }}>One-Time Password (OTP)</label>
                  <input
                    type="text"
                    className="ig-input"
                    placeholder="6-digit OTP code"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    required
                    maxLength="6"
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'block' }}>New Password</label>
                  <input
                    type="password"
                    className="ig-input"
                    placeholder="Enter new password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}"
                    title="Must contain at least one number and one uppercase and lowercase letter, one special character, and at least 8 or more characters."
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'block' }}>Confirm New Password</label>
                  <input
                    type="password"
                    className="ig-input"
                    placeholder="Confirm new password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}"
                    title="Must contain at least one number and one uppercase and lowercase letter, one special character, and at least 8 or more characters."
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button 
                    type="button" 
                    className="ig-btn-google" 
                    style={{ flex: 1, height: '38px', color: '#64748B', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 700 }}
                    onClick={() => setForgotStep(1)}
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="ig-btn-primary" 
                    style={{ flex: 1.5, height: '38px', fontSize: '12px' }}
                    disabled={loading}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
