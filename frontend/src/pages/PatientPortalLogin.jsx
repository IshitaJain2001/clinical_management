import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ShieldCheck, ArrowRight, UserPlus, FileText } from 'lucide-react';

const PatientPortalLogin = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!emailOrPhone) {
      setError('Please enter your email or phone number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/auth/patient-portal/send-otp', {
        emailOrPhone
      });
      setSuccess('OTP sent successfully!');
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/patient-portal/verify-otp', {
        emailOrPhone,
        otp
      });
      
      if (response.data.isNewUser) {
        // Redirect to patient registration with the temporary token
        navigate('/patient-register', { 
          state: { 
            tempToken: response.data.tempToken, 
            emailOrPhone: response.data.emailOrPhone 
          } 
        });
      } else {
        // Existing user, log them in
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/patient');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC', fontFamily: 'Urbanist, sans-serif' }}>
      <div style={{ background: 'white', padding: '16px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck color="white" size={24} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            Curoxa <span style={{ color: '#2563EB' }}>Patient Portal</span>
          </h1>
        </div>
        <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid #CBD5E1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
          Staff Login
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: 'white', width: '100%', maxWidth: '440px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Welcome back
            </h2>
            <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' }}>
              Enter your mobile number or email to access your medical records, prescriptions, and appointments.
            </p>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>
                {success}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Mobile Number or Email</label>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="e.g. +44 20 7946 0192 or john@example.com"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', background: '#2563EB', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Enter 6-digit OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    placeholder="000000"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '24px', letterSpacing: '8px', textAlign: 'center', fontWeight: 'bold', outline: 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', background: '#10B981', color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                    Use a different number/email
                  </button>
                </div>
              </form>
            )}
          </div>
          
          <div style={{ background: '#F8FAFC', padding: '24px 32px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={16} color="#2563EB" /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>New Patient?</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Just enter your details above to register automatically.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} color="#16A34A" /></div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Access Records</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>View your lab reports and prescriptions securely.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientPortalLogin;
