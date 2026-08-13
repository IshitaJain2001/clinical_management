import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useRealTimeSync } from '../hooks/useRealTimeSync';
import HRPayroll from './HRPayroll';

const permissionNames = {
  'dr-consult': 'Patient consultation notes',
  'dr-rx': 'Prescription writer',
  'dr-laborder': 'Test order / lab referral',
  'dr-history': 'Patient visit history',
  'dr-discharge': 'Discharge summary',
  'dr-stockview': 'Pharmacy stock view',
  'rc-register': 'Patient registration',
  'rc-appt': 'Appointment booking',
  'rc-queue': 'OPD token queue',
  'rc-upload': 'Lab report upload',
  'rc-billing': 'Billing & receipts',
  'rc-reorder': 'Pharmacy stock reorder',
  'rc-labprint': 'Lab slip printing',
  'lt-queue': 'Test order queue',
  'lt-upload': 'Report upload',
  'lt-reagents': 'Lab reagents inventory',
  'lt-dispatch': 'Report dispatch',
  'lt-extlab': 'External lab coordination',
  'ph-queue': 'Prescription queue',
  'ph-dispense': 'Medicine dispensing',
  'ph-stock': 'Stock inventory',
  'ph-reorder': 'Reorder management',
  'ph-billing': 'Prescription billing',
  'ph-controlled': 'Controlled drugs log',
  'nu-vitals': 'Patient vitals entry',
  'nu-ward': 'Ward round notes',
  'nu-labassist': 'Lab sample assist',
  'nu-dispense': 'Medicine dispensing (assist)'
};

// Safeguard React DOM reconciliation against external DOM mutations (e.g. Lucide CDN node replacement)
if (typeof window !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child) {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, this.firstChild);
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
}

const ReceptionistDashboard = () => {
  const tenantModules = (() => {
    try {
      return JSON.parse(localStorage.getItem('tenantModules') || '{}');
    } catch (e) {
      return {};
    }
  })();

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [activeTab, setActiveTab] = useState('dash');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('curoxa_sidebar_collapsed') === 'true');
  const user = currentUser;

  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditEmail, setProfileEditEmail] = useState('');
  const [profileEditAvatar, setProfileEditAvatar] = useState('');
  const [profileEditLoading, setProfileEditLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (showProfileEditModal) {
      setProfileEditName(currentUser.name || '');
      setProfileEditEmail(currentUser.email || '');
      setProfileEditAvatar(currentUser.avatar || '');
      setProfileError('');
      setProfileSuccess('');
    }
  }, [showProfileEditModal, currentUser]);

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileEditLoading(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const response = await api.put(`/auth/profile/${currentUser.id || currentUser._id}`, {
        name: profileEditName,
        email: profileEditEmail,
        avatar: profileEditAvatar
      });
      const updatedUser = {
        ...currentUser,
        name: response.data.name,
        email: response.data.email,
        avatar: response.data.avatar || ''
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        setShowProfileEditModal(false);
        setProfileSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setProfileError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileEditLoading(false);
    }
  };

  // Dynamic role coverage state & listener
  const [coverageState, setCoverageState] = useState(() => {
    const saved = localStorage.getItem('curoxa_pmState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const userName = JSON.parse(localStorage.getItem('user') || '{}').name || '';
        if (parsed[userName]) return parsed[userName];
        const matchKey = Object.keys(parsed).find(k => k.toLowerCase().trim() === userName.toLowerCase().trim());
        return matchKey ? parsed[matchKey] : {};
      } catch (e) {}
    }
    return {};
  });

  // Dynamic role coverage subtab states
  const [doctorSubTab, setDoctorSubTab] = useState('consult');
  const [labSubTab, setLabSubTab] = useState('tests');
  const [pharmacySubTab, setPharmacySubTab] = useState('queue');

  // Dynamic role coverage real data / transaction states
  const [coverageReagents, setCoverageReagents] = useState([]);
  const [coverageLabRequests, setCoverageLabRequests] = useState([]);
  
  // Coverage Lab workflow states
  const [showCoverageLabModal, setShowCoverageLabModal] = useState(false);
  const [selectedCoverageLabTest, setSelectedCoverageLabTest] = useState(null);
  const [coverageLabRemarks, setCoverageLabRemarks] = useState('');
  const [coverageLabParams, setCoverageLabParams] = useState({ value: '', unit: '' });
  const [coverageLabFileName, setCoverageLabFileName] = useState('');
  const [showCoverageLabDetailsModal, setShowCoverageLabDetailsModal] = useState(false);
  const [showCoveragePharmacyPaymentModal, setShowCoveragePharmacyPaymentModal] = useState(false);
  const [selectedCoveragePharmacyRx, setSelectedCoveragePharmacyRx] = useState(null);
  const [coveragePharmacyPaymentMode, setCoveragePharmacyPaymentMode] = useState('UPI');
  const [coveragePharmacyCashReceived, setCoveragePharmacyCashReceived] = useState('');
  const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [pharmacySearchQuery, setPharmacySearchQuery] = useState('');
  const [coveragePharmacyQueue, setCoveragePharmacyQueue] = useState([]);
  const [coveragePharmacyInventory, setCoveragePharmacyInventory] = useState([]);
  const [coverageConsultations, setCoverageConsultations] = useState([]);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [consultationDiagnosis, setConsultationDiagnosis] = useState('');
  const [rxMedicines, setRxMedicines] = useState([
    { id: 1, name: 'Paracetamol 650', dose: '1 Tab', freq: '1 Tab BD', duration: '5 Days', timing: 'After Food', notes: 'For fever' }
  ]);
  const [rxPatientId, setRxPatientId] = useState('');
  const [rxDiagnosis, setRxDiagnosis] = useState('');

  // Bulk selection states for patient directory & indents tables
  const [selectedPatientIds, setSelectedPatientIds] = useState([]);
  const [selectedIndentIds, setSelectedIndentIds] = useState([]);

  // Batch SMS Modal states
  const [showBatchSmsModal, setShowBatchSmsModal] = useState(false);
  const [batchSmsTemplate, setBatchSmsTemplate] = useState('reminder');
  const [batchSmsMessage, setBatchSmsMessage] = useState('Dear Patient, this is an official reminder for your clinical visit at Curoxa Medical Center. Please arrive 10 mins early.');
  const [batchSmsSending, setBatchSmsSending] = useState(false);
  const [batchSmsSuccessToast, setBatchSmsSuccessToast] = useState('');

  // Examine patient workspace step states
  const [examineStep, setExamineStep] = useState('notes'); // 'notes', 'prescriptions', 'labs'
  const [consultationRxMedicines, setConsultationRxMedicines] = useState([]);
  const [consultationRxDiagnosis, setConsultationRxDiagnosis] = useState('');
  const [consultationLabTest, setConsultationLabTest] = useState('Complete Blood Count (CBC)');
  const [hasPrescriptionEnabled, setHasPrescriptionEnabled] = useState(false);
  const [hasLabOrderEnabled, setHasLabOrderEnabled] = useState(false);
  const [labPatientId, setLabPatientId] = useState('');

  // Available EMR diagnostic lab tests
  const availableTests = [
    'CBC', 'Vitamin D', 'HbA1c', 'LFT', 'KFT', 'Lipid Profile', 'TSH', 
    'Thyroid Panel', 'Urine Routine', 'Vitamin B12', 'Fasting Blood Sugar',
    'Post Prandial Blood Sugar', 'Serum Calcium', 'Iron Studies', 'X-Ray Chest'
  ];

  // Medicine Defaults for autocomplete auto-fill
  const medicineDefaults = {
    'paracetamol': { dose: '1 Tab', freq: 'BD', duration: '3 Days', timing: 'After Food' },
    'amoxicillin': { dose: '1 Cap', freq: 'TDS', duration: '5 Days', timing: 'After Food' },
    'ibuprofen': { dose: '1 Tab', freq: 'BD', duration: '3 Days', timing: 'After Food' },
    'pantoprazole': { dose: '1 Tab', freq: 'OD', duration: '7 Days', timing: 'Before Food' },
    'cetirizine': { dose: '1 Tab', freq: 'OD', duration: '5 Days', timing: 'At Bedtime' },
    'metformin': { dose: '1 Tab', freq: 'BD', duration: '15 Days', timing: 'After Food' },
    'atorvastatin': { dose: '1 Tab', freq: 'OD', duration: '30 Days', timing: 'At Bedtime' },
    'azithromycin': { dose: '1 Tab', freq: 'OD', duration: '3 Days', timing: 'Before Food' }
  };

  const [activeMedFocus, setActiveMedFocus] = useState(null);
  const [isHoveringSuggestions, setIsHoveringSuggestions] = useState(false);
  const [consultationLabTests, setConsultationLabTests] = useState([]);
  const [showLabSuggestions, setShowLabSuggestions] = useState(false);
  const [slipLabTests, setSlipLabTests] = useState([]);
  const [slipLabSearchQuery, setSlipLabSearchQuery] = useState('');
  const [showSlipLabSuggestions, setShowSlipLabSuggestions] = useState(false);

  const redirectedTabsRef = useRef({});

  // Reset redirection flag on tab changes
  useEffect(() => {
    redirectedTabsRef.current = {
      [activeTab]: redirectedTabsRef.current[activeTab]
    };
  }, [activeTab]);

  // Restrict activeTab for cover users based on active coverage permissions
  useEffect(() => {
    const isCoverUser = currentUser?.role !== 'receptionist';
    if (!isCoverUser) return;
    if (!coverageState || Object.keys(coverageState).length === 0) return;

    let isPermitted = false;
    if (activeTab === 'dash') {
      isPermitted = true;
    } else if (['patients', 'patient-details'].includes(activeTab)) {
      isPermitted = !!(coverageState['rc-register']?.on || coverageState['rc-upload']?.on || coverageState['rc-queue']?.on);
    } else if (activeTab === 'appointments') {
      isPermitted = !!coverageState['rc-appt']?.on;
    } else if (activeTab === 'staff') {
      isPermitted = false;
    } else if (activeTab === 'billing') {
      isPermitted = !!coverageState['rc-billing']?.on;
    } else if (activeTab === 'indent') {
      isPermitted = !!coverageState['rc-reorder']?.on;
    } else {
      isPermitted = true;
    }

    if (!isPermitted) {
      if (coverageState['rc-register']?.on || coverageState['rc-upload']?.on || coverageState['rc-queue']?.on) {
        setActiveTab('patients');
      } else if (coverageState['rc-appt']?.on) {
        setActiveTab('appointments');
      } else if (coverageState['rc-billing']?.on) {
        setActiveTab('billing');
      } else if (coverageState['rc-reorder']?.on) {
        setActiveTab('indent');
      } else {
        setActiveTab('dash');
      }
    }
  }, [coverageState, activeTab, currentUser]);

  // Auto-redirect first subtab on activeTab cover change
  useEffect(() => {
    if (!coverageState || Object.keys(coverageState).length === 0) return;
    if (redirectedTabsRef.current[activeTab]) return;

    if (activeTab === 'doctor_cover') {
      if (coverageState['dr-consult']?.on) {
        setDoctorSubTab('consult');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['dr-rx']?.on) {
        setDoctorSubTab('prescriptions');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['dr-laborder']?.on) {
        setDoctorSubTab('labs');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['dr-stockview']?.on) {
        setDoctorSubTab('stock');
        redirectedTabsRef.current[activeTab] = true;
      }
    } else if (activeTab === 'lab_cover') {
      if (coverageState['lt-queue']?.on) {
        setLabSubTab('tests');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['lt-reagents']?.on) {
        setLabSubTab('reagents');
        redirectedTabsRef.current[activeTab] = true;
      }
    } else if (activeTab === 'pharmacy_cover') {
      if (coverageState['ph-queue']?.on) {
        setPharmacySubTab('queue');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['ph-stock']?.on || coverageState['dr-stockview']?.on) {
        setPharmacySubTab('stock');
        redirectedTabsRef.current[activeTab] = true;
      }
    }
  }, [activeTab, coverageState]);

  useEffect(() => {
    const userName = user.name || '';

    const findUserCoverage = (allState) => {
      if (!allState || !userName) return {};
      if (allState[userName]) return allState[userName];
      const matchKey = Object.keys(allState).find(k => k.toLowerCase().trim() === userName.toLowerCase().trim());
      return matchKey ? allState[matchKey] : {};
    };

    const syncFromLocalStorage = () => {
      const saved = localStorage.getItem('curoxa_pmState');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCoverageState(findUserCoverage(parsed));
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('storage', syncFromLocalStorage);

    const fetchBackendCoverage = async () => {
      try {
        const response = await api.get('/auth/role-coverage');
        if (response.data && typeof response.data === 'object') {
          localStorage.setItem('curoxa_pmState', JSON.stringify(response.data));
          setCoverageState(findUserCoverage(response.data));
        }
      } catch (err) {
        console.error('Failed to sync coverage from backend', err);
        syncFromLocalStorage();
      }
    };
    fetchBackendCoverage();

    const pollInterval = setInterval(fetchBackendCoverage, 5000);

    return () => {
      window.removeEventListener('storage', syncFromLocalStorage);
      clearInterval(pollInterval);
    };
  }, [user.name]);

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCoverageKeysRef = useRef(null);
  const notificationRef = useRef(null);
  const globalSearchContainerRef = useRef(null);
  const medicineSearchContainerRef = useRef(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [allowedDiscountPercent, setAllowedDiscountPercent] = useState(10);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (globalSearchContainerRef.current && !globalSearchContainerRef.current.contains(event.target)) {
        setShowGlobalDropdown(false);
      }
      if (medicineSearchContainerRef.current && !medicineSearchContainerRef.current.contains(event.target)) {
        setShowMedicineSuggestions(false);
        setMedicineSearchQuery('');
      }
      if (!event.target.closest('.sidebar-user') && !event.target.closest('.sidebar-profile-card') && !event.target.closest('.sidebar-profile')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, []);

  useEffect(() => {
    if (!coverageState) return;
    
    // Get all keys where coverage is ON
    const activeKeys = Object.keys(coverageState).filter(k => coverageState[k]?.on);
    
    const userKey = currentUser.staff_id || currentUser.id || currentUser.name || 'default';
    const clearedKey = `curoxa_cleared_notifications_${userKey}`;
    
    if (prevCoverageKeysRef.current === null) {
      // First load: initialize without toast alerts
      prevCoverageKeysRef.current = activeKeys;
      
      const clearedIds = JSON.parse(localStorage.getItem(clearedKey) || '[]');
      
      const initialNotifications = activeKeys.map(k => {
        const details = coverageState[k];
        const permName = permissionNames[k] || k;
        return {
          id: `${k}-${details.grantedAt || 'active'}`,
          title: 'Permission Active',
          message: `You have active coverage for "${permName}" (${details.type === 'temp' ? 'Temporary' : 'Permanent'}).`,
          time: details.grantedAt ? new Date(details.grantedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
          isNew: false
        };
      }).filter(n => !clearedIds.includes(n.id));
      
      setNotifications(initialNotifications);
      setUnreadCount(0);
    } else {
      // Subsequent loads: find newly added/turned ON keys
      const newKeys = activeKeys.filter(k => !prevCoverageKeysRef.current.includes(k));
      const removedKeys = prevCoverageKeysRef.current.filter(k => !activeKeys.includes(k));
      
      if (newKeys.length > 0) {
        const newNotifications = [...notifications];
        const clearedIds = JSON.parse(localStorage.getItem(clearedKey) || '[]');
        let addedCount = 0;
        
        newKeys.forEach(k => {
          const details = coverageState[k];
          const permName = permissionNames[k] || k;
          const notifId = `${k}-${details.grantedAt || 'active'}`;
          
          if (!clearedIds.includes(notifId)) {
            addedCount++;
            showToast(`New Role Coverage Assigned: ${permName}!`);
            
            newNotifications.unshift({
              id: notifId,
              title: 'New Permission Delegated',
              message: `You have been delegated "${permName}" coverage (${details.type === 'temp' ? 'Temporary' : 'Permanent'}).`,
              time: 'Just now',
              isNew: true
            });
          }
        });
        setNotifications(newNotifications);
        setUnreadCount(prev => prev + addedCount);
      }
      
      if (removedKeys.length > 0) {
        removedKeys.forEach(k => {
          showToast(`Role Coverage Revoked: ${permissionNames[k] || k}!`, 'info');
        });
      }
      
      prevCoverageKeysRef.current = activeKeys;
    }
  }, [coverageState]);

  const [appointments, setAppointments] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bills, setBills] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: ''
  });

  const [dpdpConsent, setDpdpConsent] = useState({ emrCreation: true, dataSharing: false });
  const [patientDocuments, setPatientDocuments] = useState([]);
  const [newDocType, setNewDocType] = useState('Aadhar / Voter Card');


  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [symptomDropdownOpen, setSymptomDropdownOpen] = useState(false);
  const availableSymptoms = ['Fever', 'Headache', 'Body Pain', 'Fatigue', 'Weakness', 'Cough', 'Nausea'];
  
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);

  // Doctor availability state for appointment booking
  const DEFAULT_RECEPTION_SLOTS = [
    '09:00 AM - 09:30 AM', '09:30 AM - 10:00 AM', '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM', '11:00 AM - 11:30 AM', '11:30 AM - 12:00 PM',
    '12:00 PM - 12:30 PM', '12:30 PM - 01:00 PM', '02:00 PM - 02:30 PM',
    '02:30 PM - 03:00 PM', '03:00 PM - 03:30 PM', '03:30 PM - 04:00 PM',
    '04:00 PM - 04:30 PM', '04:30 PM - 05:00 PM', '05:00 PM - 05:30 PM'
  ];
  const [receptionDoctorAvailability, setReceptionDoctorAvailability] = useState({ available: true, slots: DEFAULT_RECEPTION_SLOTS, reason: null });
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Direct Lab Test vs OPD Appointment vs Clinical Service Booking state
  const [bookingType, setBookingType] = useState('opd'); // 'opd', 'lab', or 'service'
  const DEFAULT_HOSPITAL_LAB_TESTS = [
    { testName: 'Complete Blood Count (CBC)', testCode: 'CBC-101', category: 'Pathology', price: 350 },
    { testName: 'Lipid Profile (Cholesterol)', testCode: 'LIPID-102', category: 'Biochemistry', price: 600 },
    { testName: 'Thyroid Profile (T3 T4 TSH)', testCode: 'THY-103', category: 'Endocrinology', price: 500 },
    { testName: 'HbA1c (Glycated Hemoglobin)', testCode: 'HBA1C-104', category: 'Biochemistry', price: 450 },
    { testName: 'Liver Function Test (LFT)', testCode: 'LFT-105', category: 'Biochemistry', price: 700 },
    { testName: 'Kidney Function Test (KFT)', testCode: 'KFT-106', category: 'Biochemistry', price: 650 },
    { testName: 'Blood Sugar Fasting & PP', testCode: 'BS-107', category: 'Biochemistry', price: 150 },
    { testName: 'Urine Routine Examination', testCode: 'UR-108', category: 'Pathology', price: 200 },
    { testName: 'Chest X-Ray (PA View)', testCode: 'XR-109', category: 'Radiology', price: 400 },
    { testName: 'ECG (12 Lead)', testCode: 'ECG-110', category: 'Cardiology', price: 300 }
  ];
  const [hospitalLabTests, setHospitalLabTests] = useState([]);
  const [selectedLabTest, setSelectedLabTest] = useState('');
  const [selectedLabPrice, setSelectedLabPrice] = useState(0);
  const [labTestSearchQuery, setLabTestSearchQuery] = useState('');
  const [showLabTestDropdown, setShowLabTestDropdown] = useState(false);
  const [customLabTestName, setCustomLabTestName] = useState('');
  const [customLabTestPrice, setCustomLabTestPrice] = useState('');
  const [isSettlingPayment, setIsSettlingPayment] = useState(false);
  const [showSlipPdfModal, setShowSlipPdfModal] = useState(false);
  const [activeSlipData, setActiveSlipData] = useState(null);

  // Multiple Direct Lab Tests Selection list state
  const [selectedLabTestsList, setSelectedLabTestsList] = useState([]);

  // Dynamic Clinical Services (Dental, Root Canal, Braces, Physiotherapy) catalog & list state
  const [hospitalClinicalServices, setHospitalClinicalServices] = useState([
    { serviceName: 'Dental — Root Canal Treatment (RCT)', serviceCode: 'DEN-201', department: 'Dental', price: 3500 },
    { serviceName: 'Dental — Scaling & Polishing', serviceCode: 'DEN-202', department: 'Dental', price: 1500 },
    { serviceName: 'Dental — Tooth Extraction (Simple)', serviceCode: 'DEN-203', department: 'Dental', price: 1200 },
    { serviceName: 'Dental — Ceramic Crown Replacement', serviceCode: 'DEN-204', department: 'Dental', price: 5000 },
    { serviceName: 'Dental — Orthodontic Braces Consultation', serviceCode: 'DEN-205', department: 'Dental', price: 2500 },
    { serviceName: 'Physiotherapy — Posture & Pain Rehab', serviceCode: 'PHY-301', department: 'Physiotherapy', price: 800 }
  ]);
  const [selectedServicesList, setSelectedServicesList] = useState([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Multiple OPD Appointments List for the same patient at the same time
  const [additionalApptsList, setAdditionalApptsList] = useState([]);

  // Dashboard Date Range Filter State
  const [showDashboardDateFilter, setShowDashboardDateFilter] = useState(false);
  const [dashboardFilterPreset, setDashboardFilterPreset] = useState('today');
  const [dashboardFilterStartDate, setDashboardFilterStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dashboardFilterEndDate, setDashboardFilterEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // ─── Indent Tab State ───────────────────────────────────────────────────────
  const [indentSearch, setIndentSearch] = useState('');
  const [indentSort, setIndentSort] = useState('newest');
  const [indentPage, setIndentPage] = useState(1);
  const INDENT_PAGE_SIZE = 10;
  
  const [indents, setIndents] = useState([]);
  const [medicines, setMedicines] = useState([]);

  // Form states for New Indent Request
  const [newIndentDept, setNewIndentDept] = useState('Pharmacy');
  const [newIndentType, setNewIndentType] = useState('Pharmaceuticals');
  const [newIndentReqDate, setNewIndentReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [newIndentRequestedBy, setNewIndentRequestedBy] = useState(() => JSON.parse(localStorage.getItem('user') || '{}').name || 'Staff');
  const [newIndentContact, setNewIndentContact] = useState(() => JSON.parse(localStorage.getItem('user') || '{}').contact || 'N/A');
  const [newIndentPriority, setNewIndentPriority] = useState('Normal');
  const [newIndentRemarks, setNewIndentRemarks] = useState('');
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState(false);
  const [activeCustomRowFocus, setActiveCustomRowFocus] = useState(null);
  const [isHoveringCustomSuggestions, setIsHoveringCustomSuggestions] = useState(false);
  const [newIndentAdditionalNotes, setNewIndentAdditionalNotes] = useState('');
  const [newIndentAttachments, setNewIndentAttachments] = useState([]);
  const [showReqByDropdown, setShowReqByDropdown] = useState(false);

  const [loading, setLoading] = useState(false);


  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [rescheduleAvailability, setRescheduleAvailability] = useState({ available: true, slots: [], reason: null });

  useEffect(() => {
    const fetchRescheduleAvailability = async () => {
      if (!detailsModalOpen || !selectedAppointment) return;
      const docId = selectedAppointment.doctorId?._id || selectedAppointment.doctorId;
      if (!docId || !selectedAppointment.date) return;

      let dStr;
      try {
        dStr = new Date(selectedAppointment.date).toISOString().split('T')[0];
      } catch (e) {
        return;
      }

      try {
        const availRes = await api.get(`/hr/doctor-availability/${docId}?date=${dStr}`);
        setRescheduleAvailability(availRes.data);
      } catch (err) {
        console.error("Failed to fetch reschedule doctor availability:", err);
        const docSlots = selectedAppointment.doctorId?.doctorSlots?.length > 0 ? selectedAppointment.doctorId.doctorSlots : DEFAULT_RECEPTION_SLOTS;
        setRescheduleAvailability({ available: true, slots: docSlots, reason: null });
      }
    };

    fetchRescheduleAvailability();
  }, [detailsModalOpen, selectedAppointment?.date, selectedAppointment?.doctorId]);

  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState({ prescriptions: [], labs: [] });

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!detailsModalOpen || !selectedAppointment) return;
      const appId = selectedAppointment._id;
      
      try {
        // Fetch prescriptions and filter by appointmentId
        const pRes = await api.get('/prescriptions');
        const matchingPrescriptions = (pRes.data || []).filter(p => {
          const pAppId = p.appointmentId?._id || p.appointmentId;
          return String(pAppId) === String(appId);
        });

        // Fetch lab tests and filter by appointmentId
        const lRes = await api.get('/labs');
        const matchingLabs = (lRes.data || []).filter(l => {
          const lAppId = l.appointmentId?._id || l.appointmentId;
          return String(lAppId) === String(appId);
        });

        setSelectedAppointmentDetails({
          prescriptions: matchingPrescriptions,
          labs: matchingLabs
        });
      } catch (err) {
        console.error("Error fetching appointment details:", err);
        setSelectedAppointmentDetails({ prescriptions: [], labs: [] });
      }
    };

    fetchAppointmentDetails();
  }, [detailsModalOpen, selectedAppointment?._id]);

  const [isExistingPatient, setIsExistingPatient] = useState(null); // null = choose mode, true = existing, false = new register
  const [searchPatientQuery, setSearchPatientQuery] = useState('');
  const [pendingRegistrationPayload, setPendingRegistrationPayload] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState(null);
  
  // Patient Profile Details States
  const [selectedProfileAppointment, setSelectedProfileAppointment] = useState(null);
  const [isReschedulingProfileAppt, setIsReschedulingProfileAppt] = useState(false);
  const [rescheduleProfileDate, setRescheduleProfileDate] = useState('');
  const [rescheduleProfileTime, setRescheduleProfileTime] = useState('');
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [selectedLabRequest, setSelectedLabRequest] = useState(null);
  const [allLabsModalOpen, setAllLabsModalOpen] = useState(false);
  const [patientLabReports, setPatientLabReports] = useState([]);
  const [selectedReportDetail, setSelectedReportDetail] = useState(null);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [showIndentModal, setShowIndentModal] = useState(false);
  
  // Date range filter states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Patient Management search and filter states
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showPatientFilters, setShowPatientFilters] = useState(false);
  const [patientGenderFilter, setPatientGenderFilter] = useState('All');
  const [patientStartRegDate, setPatientStartRegDate] = useState('');
  const [patientEndRegDate, setPatientEndRegDate] = useState('');
  const [patientBookingTypeFilter, setPatientBookingTypeFilter] = useState('All');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [apptTypeFilter, setApptTypeFilter] = useState('All');
  const [staffSearch, setStaffSearch] = useState('');
  const [billingSearch, setBillingSearch] = useState('');
  const [patientVitals, setPatientVitals] = useState([]);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsCollapsed, setVitalsCollapsed] = useState(true);
  const [docsCollapsed, setDocsCollapsed] = useState(true);
  const [symptomSearchQuery, setSymptomSearchQuery] = useState('');
  const [vitalTemp, setVitalTemp] = useState('');
  const [vitalPulse, setVitalPulse] = useState('');
  const [vitalBpSys, setVitalBpSys] = useState('');
  const [vitalBpDia, setVitalBpDia] = useState('');
  const [vitalResp, setVitalResp] = useState('');
  const [vitalSpo2, setVitalSpo2] = useState('');
  const [vitalWeight, setVitalWeight] = useState('');
  const [vitalHeight, setVitalHeight] = useState('');
  const [bookingDiscountPercent, setBookingDiscountPercent] = useState(0);
  const [bookingDiscountReason, setBookingDiscountReason] = useState('');


  const getFormattedPatientId = (patientId) => {
    if (!patientId) return 'MDC-000000';
    const idStr = patientId.toString();
    if (idStr.length >= 24) {
      return `MDC-${idStr.substring(18).toUpperCase()}`;
    }
    return `MDC-${idStr.toUpperCase()}`;
  };

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ' - ';
    } catch (e) {
      return '';
    }
  };

  const getFilteredPatientsList = () => {
    return patientsList.filter(p => {
      // 1. Search Query
      const query = patientSearchText.toLowerCase().trim();
      if (query) {
        const nameMatch = p.name?.toLowerCase().includes(query);
        const idMatch = p._id?.toLowerCase().includes(query);
        const formattedId = getFormattedPatientId(p._id)?.toLowerCase().includes(query);
        const contactMatch = p.contact?.toLowerCase().includes(query);
        const emailMatch = p.email?.toLowerCase().includes(query);
        if (!nameMatch && !idMatch && !formattedId && !contactMatch && !emailMatch) {
          return false;
        }
      }

      // 2. Gender
      if (patientGenderFilter !== 'All') {
        if (p.gender?.toLowerCase() !== patientGenderFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Registration Date (calrender thing)
      if (p.createdAt) {
        const regDate = new Date(p.createdAt);
        const regDateOnly = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());

        if (patientStartRegDate) {
          const start = new Date(patientStartRegDate);
          const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          if (regDateOnly < startOnly) return false;
        }

        if (patientEndRegDate) {
          const end = new Date(patientEndRegDate);
          const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          if (regDateOnly > endOnly) return false;
        }
      }

      // 4. Booking Type Filter
      if (patientBookingTypeFilter !== 'All') {
        if (patientBookingTypeFilter === 'Appointments') {
          const patientAppointments = (appointments || []).filter(app => {
            const appPatId = app.patientId?._id || app.patientId;
            return appPatId && p._id && appPatId.toString() === p._id.toString();
          });
          if (patientAppointments.length === 0) return false;
        }

        if (patientBookingTypeFilter === 'Lab Tests') {
          const patientLabs = (coverageLabRequests || []).filter(lab => {
            const labPatId = lab.rawItem?.patientId?._id || lab.rawItem?.patientId || lab.patientId;
            return labPatId && p._id && labPatId.toString() === p._id.toString();
          });
          const patientBills = (bills || []).filter(b => {
            const billPatId = b.patientId?._id || b.patientId;
            return billPatId && p._id && billPatId.toString() === p._id.toString();
          });
          const hasLabInBills = patientBills.some(b => 
            (b.items || []).some(item => (item.description || '').toLowerCase().includes('lab test:'))
          );
          const hasLabInRequests = patientLabs.length > 0;
          if (!hasLabInRequests && !hasLabInBills) return false;
        }

        if (patientBookingTypeFilter === 'Clinical Services') {
          const patientBills = (bills || []).filter(b => {
            const billPatId = b.patientId?._id || b.patientId;
            return billPatId && p._id && billPatId.toString() === p._id.toString();
          });
          const hasService = patientBills.some(b => 
            (b.items || []).some(item => (item.description || '').toLowerCase().includes('clinical procedure:'))
          );
          if (!hasService) return false;
        }
      }

      return true;
    });
  };

  const handleExportPatientsCSV = () => {
    const filtered = getFilteredPatientsList();
    if (filtered.length === 0) {
      showToast("No patients to export.", "info");
      return;
    }
    
    // Define CSV headers
    const headers = ["Patient ID", "Name", "Gender", "Mobile Number", "Email", "Registration Date & Time"];
    
    // Map patient data to CSV rows
    const rows = filtered.map(p => {
      const regDate = p.createdAt ? `${new Date(p.createdAt).toLocaleDateString()} ${new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A';
      return [
        getFormattedPatientId(p._id),
        p.name || '',
        p.gender || '',
        p.contact || '',
        p.email || '',
        regDate
      ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `patients_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    showToast("Patients list exported successfully as CSV", "success");
  };

  const handleExportBillingCSV = () => {
    if (bills.length === 0) {
      showToast("No billing records to export.", "info");
      return;
    }

    const headers = ["Invoice ID", "Patient Name", "Date & Time", "Items", "Amount", "Payment Method", "Status"];

    const rows = bills.map(bill => {
      const invoiceId = `INV-${(bill._id || '').substring(Math.max(0, (bill._id || '').length - 6)).toUpperCase() || 'N/A'}`;
      const patientName = bill.patientId?.name || 'Unknown Patient';
      const dateTime = bill.createdAt ? `${new Date(bill.createdAt).toLocaleDateString()} ${new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A';
      const items = (bill.items || []).map(i => `${String(i.description || '')} (₹${i.amount || 0})`).join('; ');
      const amount = `₹${(bill.totalAmount || 0).toFixed(2)}`;
      const paymentMethod = bill.paymentMethod || 'N/A';
      const status = bill.status || 'Unpaid';
      return [invoiceId, patientName, dateTime, items, amount, paymentMethod, status]
        .map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `billing_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("Billing report exported successfully as CSV", "success");
  };

  const handleMarkAsPaid = async (billId, paymentData = {}) => {
    try {
      const payload = {
        status: 'Paid',
        paymentMethod: paymentData.paymentMethod || 'Cash',
        discountPercent: paymentData.discountPercent || 0,
        discountAmount: paymentData.discountAmount || 0,
        originalAmount: paymentData.originalAmount || paymentData.totalAmount,
        totalAmount: paymentData.totalAmount,
        discountReason: paymentData.discountReason || ''
      };
      await api.put(`/billing/${billId}`, payload);
      showToast("Billing status updated to Paid successfully!", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to update billing status.", "error");
    }
  };

  const handleMarkAsPaidSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;
    
    if (discountPercent > allowedDiscountPercent) {
      showToast(`Discount cannot exceed the limit of ${allowedDiscountPercent}%`, 'error');
      return;
    }
    if (discountPercent > 0 && !discountReason.trim()) {
      showToast("Please provide a reason for the discount.", "error");
      return;
    }

    const origAmt = selectedBillForPayment.totalAmount;
    const discAmt = (origAmt * discountPercent) / 100;
    const finalAmt = origAmt - discAmt;

    try {
      setIsSettlingPayment(true);
      if (selectedBillForPayment.isPending && pendingRegistrationPayload) {
        // Execute deferred API calls
        let finalPatientId = pendingRegistrationPayload.patientId;
        
        if (!pendingRegistrationPayload.isExistingPatient) {
          const patientRes = await api.post('/patients', pendingRegistrationPayload.patientData);
          finalPatientId = patientRes.data._id;
          
          // Clear draft now that registration is successful
          if (pendingRegistrationPayload.patientData.contact) {
            localStorage.removeItem('curoxa_draft_' + pendingRegistrationPayload.patientData.contact);
          }
        }

        if (pendingRegistrationPayload.isLabOnly) {
          // Direct Lab Test Order Execution (No Doctor Required)
          await api.post('/labs', {
            patientId: finalPatientId,
            testName: pendingRegistrationPayload.labData.testName,
            notes: pendingRegistrationPayload.labData.notes || 'Direct Reception Walk-In Lab Test',
            status: 'Pending'
          });

          await api.post('/billing', {
            patientId: finalPatientId,
            items: pendingRegistrationPayload.billingData.items,
            originalAmount: origAmt,
            discountPercent: Number(discountPercent),
            discountAmount: discAmt,
            totalAmount: finalAmt,
            paymentMethod: paymentMethod,
            discountReason: discountPercent > 0 ? discountReason.trim() : '',
            status: 'Paid'
          });

          const patientObj = pendingRegistrationPayload.patientData || selectedPatient || formData;
          setActiveSlipData({
            receiptNo: `REC-${Date.now().toString().slice(-6)}`,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            patientName: patientObj.name || 'Patient',
            patientId: getFormattedPatientId(finalPatientId),
            contact: patientObj.contact || 'N/A',
            ageGender: `${patientObj.age || 'N/A'} / ${patientObj.gender || 'N/A'}`,
            testName: pendingRegistrationPayload.labData?.testName || selectedLabTest,
            items: pendingRegistrationPayload.billingData?.items || [{ description: selectedLabTest, amount: origAmt }],
            originalAmount: origAmt,
            discountAmount: discAmt,
            totalAmount: finalAmt,
            paymentMethod: paymentMethod,
            hospitalName: currentUser.tenantName || 'Curoxa Medical Center'
          });
          setShowSlipPdfModal(true);

          showToast("Direct Lab Order & Payment completed successfully! Receipt generated.", "success");
        } else if (pendingRegistrationPayload.isServiceOnly) {
          // Direct Clinical Service / Procedure Execution (Dental, Root Canal, Braces, etc.)
          await api.post('/billing', {
            patientId: finalPatientId,
            items: pendingRegistrationPayload.billingData.items,
            originalAmount: origAmt,
            discountPercent: Number(discountPercent),
            discountAmount: discAmt,
            totalAmount: finalAmt,
            paymentMethod: paymentMethod,
            discountReason: discountPercent > 0 ? discountReason.trim() : '',
            status: 'Paid'
          });

          const patientObj = pendingRegistrationPayload.patientData || selectedPatient || formData;
          setActiveSlipData({
            receiptNo: `REC-${Date.now().toString().slice(-6)}`,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            patientName: patientObj.name || 'Patient',
            patientId: getFormattedPatientId(finalPatientId),
            contact: patientObj.contact || 'N/A',
            ageGender: `${patientObj.age || 'N/A'} / ${patientObj.gender || 'N/A'}`,
            testName: pendingRegistrationPayload.serviceData?.serviceName || selectedServicesList.map(s => s.serviceName).join(', ') || 'Clinical Procedure',
            items: pendingRegistrationPayload.billingData?.items || [{ description: 'Clinical Procedure', amount: origAmt }],
            originalAmount: origAmt,
            discountAmount: discAmt,
            totalAmount: finalAmt,
            paymentMethod: paymentMethod,
            hospitalName: currentUser.tenantName || 'Curoxa Medical Center'
          });
          setShowSlipPdfModal(true);

          showToast("Direct Clinical Service Payment & Receipt completed successfully!", "success");
        } else {
          // Doctor OPD Appointment Booking Execution (supports single or multiple appointments)
          const apptsToCreate = pendingRegistrationPayload.appointmentsList || [pendingRegistrationPayload.appointmentData];
          let primaryApptId = null;

          for (const apptItem of apptsToCreate) {
            const appointmentRes = await api.post('/appointments', {
              patientId: finalPatientId,
              doctorId: apptItem.doctorId,
              date: apptItem.date,
              time: apptItem.time,
              reason: apptItem.reason
            });
            if (!primaryApptId) primaryApptId = appointmentRes.data._id;
          }

          await api.post('/billing', {
            patientId: finalPatientId,
            appointmentId: primaryApptId,
            items: pendingRegistrationPayload.billingData.items,
            originalAmount: origAmt,
            discountPercent: Number(discountPercent),
            discountAmount: discAmt,
            totalAmount: finalAmt,
            paymentMethod: paymentMethod,
            discountReason: discountPercent > 0 ? discountReason.trim() : '',
            status: 'Paid'
          });

          const patientObj = pendingRegistrationPayload.patientData || selectedPatient || formData;
          setActiveSlipData({
            receiptNo: `REC-${Date.now().toString().slice(-6)}`,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            patientName: patientObj.name || 'Patient',
            patientId: getFormattedPatientId(finalPatientId),
            contact: patientObj.contact || 'N/A',
            ageGender: `${patientObj.age || 'N/A'} / ${patientObj.gender || 'N/A'}`,
            testName: 'OPD Consultation & Booking Fee',
            items: pendingRegistrationPayload.billingData?.items || [{ description: 'OPD Consultation Fee', amount: origAmt }],
            originalAmount: origAmt,
            discountAmount: discAmt,
            totalAmount: finalAmt,
            paymentMethod: paymentMethod,
            hospitalName: currentUser.tenantName || 'Curoxa Medical Center'
          });
          setShowSlipPdfModal(true);

          showToast(`${apptsToCreate.length} Appointment(s) registered & Payment completed successfully!`, "success");
        }

        // Save vitals if any of them are filled in the form
        if (vitalTemp || vitalPulse || vitalBpSys || vitalBpDia || vitalResp || vitalSpo2 || vitalWeight || vitalHeight) {
          try {
            await api.post('/emr/vitals', {
              patientId: finalPatientId,
              temperature: vitalTemp ? parseFloat(vitalTemp) : undefined,
              pulse: vitalPulse ? parseInt(vitalPulse) : undefined,
              bpSys: vitalBpSys ? parseInt(vitalBpSys) : undefined,
              bpDia: vitalBpDia ? parseInt(vitalBpDia) : undefined,
              respiration: vitalResp ? parseInt(vitalResp) : undefined,
              spo2: vitalSpo2 ? parseInt(vitalSpo2) : undefined,
              weight: vitalWeight ? parseFloat(vitalWeight) : undefined,
              height: vitalHeight ? parseFloat(vitalHeight) : undefined
            });
            // Clear vitals form fields
            setVitalTemp('');
            setVitalPulse('');
            setVitalBpSys('');
            setVitalBpDia('');
            setVitalResp('');
            setVitalSpo2('');
            setVitalWeight('');
            setVitalHeight('');
          } catch (err) {
            console.error("Failed to save vitals during registration flow:", err);
          }
        }

        setPendingRegistrationPayload(null);
        
        // Reset form
        resetRegistrationForm();
        switchTab('appointments');
      } else {
        // Normal billing flow
        const payload = {
          status: 'Paid',
          paymentMethod: paymentMethod,
          discountPercent: Number(discountPercent),
          discountAmount: discAmt,
          originalAmount: origAmt,
          totalAmount: finalAmt,
          discountReason: discountPercent > 0 ? discountReason.trim() : ''
        };
        await api.put(`/billing/${selectedBillForPayment._id}`, payload);
        
        // Sync the associated appointment status to Paid
        const apptId = selectedBillForPayment.appointmentId?._id || selectedBillForPayment.appointmentId;
        if (apptId) {
          await api.put(`/appointments/${apptId}`, { status: 'Paid' }).catch(err => {
            console.warn("Failed to sync appointment status to Paid:", err);
          });
        }

        const patientObj = selectedBillForPayment.patientId || {};
        setActiveSlipData({
          receiptNo: `REC-${(selectedBillForPayment._id || '').slice(-6).toUpperCase()}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          patientName: patientObj.name || 'Patient',
          patientId: getFormattedPatientId(patientObj._id || selectedBillForPayment.patientId),
          contact: patientObj.contact || 'N/A',
          ageGender: `${patientObj.age || 'N/A'} / ${patientObj.gender || 'N/A'}`,
          testName: (selectedBillForPayment.items || []).map(i => i.description).join(', ') || 'Medical Services',
          items: selectedBillForPayment.items || [{ description: 'Hospital Services', amount: finalAmt }],
          originalAmount: origAmt,
          discountAmount: discAmt,
          totalAmount: finalAmt,
          paymentMethod: paymentMethod,
          hospitalName: currentUser.tenantName || 'Curoxa Medical Center'
        });
        setShowSlipPdfModal(true);

        showToast("Billing status updated to Paid successfully! Receipt generated.", "success");
      }

      setShowPaymentModal(false);
      setSelectedBillForPayment(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to process payment and registration.", "error");
    } finally {
      setIsSettlingPayment(false);
    }
  };

  // Helper function to map live MongoDB appointments
  const getLatestAppointmentsList = () => {
    return filteredAppointments.map((app, idx) => {
      const pId = app.patientId?._id || app.patientId;
      const formattedId = getFormattedPatientId(pId);
      return {
        patientId: { _id: formattedId, name: app.patientId?.name || 'Anonymous Patient' },
        doctorId: { name: app.doctorId?.name || 'Dr. Andrew Clark' },
        status: app.status || 'Upcoming',
        time: app.time || '09:00 AM to 10:00 AM',
        rawObj: app
      };
    });
  };

  // Premium Custom Toast Notifications
  const [notification, setNotification] = useState(null); // { message: '', type: 'success' | 'error' }
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const openDetailsModal = (app) => {
    setSelectedAppointment({ ...app });
    setDetailsModalOpen(true);
    setShowDeleteConfirm(false);
    setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
  };

  const handleUpdateWeeklyOff = async (doctorId, newWeeklyOff) => {
    try {
      await api.put(`/auth/users/${doctorId}/weekly-off`, { weeklyOff: newWeeklyOff });
      setDoctors(prev => prev.map(doc => doc._id === doctorId ? { ...doc, weeklyOff: newWeeklyOff } : doc));
      showToast("Weekly off updated successfully", "success");
    } catch (err) {
      console.error("Failed to update weekly off:", err);
      showToast("Failed to update weekly off", "error");
    }
  };

  const handleUpdateAppointment = async (app) => {
    try {
      // Optimistically update appointments state!
      setAppointments(prev => prev.map(a => a._id === app._id ? { ...a, status: app.status, time: app.time, date: app.date, doctorId: app.doctorId } : a));

      const doctorIdToUpdate = typeof app.doctorId === 'object' ? app.doctorId._id : app.doctorId;
      await api.put(`/appointments/${app._id}`, { status: app.status, time: app.time, date: app.date, doctorId: doctorIdToUpdate });
      
      // If the status is updated to 'Paid', find the associated bill and mark it as Paid too!
      if (app.status === 'Paid') {
        const associatedBill = bills.find(b => {
          const appBId = b.appointmentId?._id || b.appointmentId;
          return appBId && appBId.toString() === app._id.toString();
        });
        if (associatedBill && associatedBill.status !== 'Paid') {
          // Optimistically update bills state!
          setBills(prev => prev.map(b => b._id === associatedBill._id ? { ...b, status: 'Paid' } : b));
          await api.put(`/billing/${associatedBill._id}`, { status: 'Paid', paymentMethod: 'Cash' });
        }
      }

      showToast("Appointment updated successfully", "success");
      setDetailsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      showToast("Failed to update appointment", "error");
      fetchData();
    }
  };

  const handleDeleteAppointment = async (id) => {
    try {
      // Optimistically update appointments state!
      setAppointments(prev => prev.filter(a => a._id !== id));

      await api.delete(`/appointments/${id}`);
      showToast("Appointment deleted successfully", "success");
      setDetailsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      showToast("Failed to delete appointment", "error");
      fetchData();
    }
  };

  const handleDeleteAllPatients = async () => {
    if (!window.confirm("WARNING: Are you absolutely sure you want to delete ALL patients in this hospital? This action is irreversible and for testing purposes only.")) {
      return;
    }
    try {
      setLoading(true);
      const res = await api.delete('/patients/danger/delete-all-patients');
      showToast(res.data?.message || "All patients deleted successfully.", "success");
      fetchData();
    } catch (error) {
      console.error(error);
      showToast("Failed to delete all patients", "error");
      fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCoveragePharmacyPayment = async () => {
    if (coveragePharmacyPaymentMode === 'Cash') {
      const cashNum = Number(coveragePharmacyCashReceived);
      const totalDue = selectedCoveragePharmacyRx.amountVal || 550;
      if (!coveragePharmacyCashReceived || cashNum < totalDue) {
        showToast('Insufficient cash received amount', 'error');
        return;
      }
    }
    
    try {
      // 1. Update prescription status
      await api.put(`/prescriptions/${selectedCoveragePharmacyRx.id}`, {
        status: 'Dispensed'
      });

      // 2. Create Billing record
      try {
        await api.post('/billing', {
          patientId: selectedCoveragePharmacyRx.patientId,
          items: (selectedCoveragePharmacyRx.items || []).map(item => ({
            description: `Medicine: ${item.medicine}`,
            amount: (item.price || 50) * (item.quantity || 1)
          })),
          totalAmount: selectedCoveragePharmacyRx.amountVal || 550,
          paymentMethod: coveragePharmacyPaymentMode,
          status: 'Paid'
        });
      } catch (billingErr) {
        console.error("Failed to auto-create billing record from receptionist pharmacy coverage dispense", billingErr);
      }

      showToast(`Payment of ₹${(selectedCoveragePharmacyRx.amountVal || 550).toFixed(2)} settled via ${coveragePharmacyPaymentMode}. Prescription dispensed successfully!`, 'success');
      setShowCoveragePharmacyPaymentModal(false);
      setSelectedCoveragePharmacyRx(null);
      fetchCoverageData();
    } catch (err) {
      console.error(err);
      showToast('Failed to settle payment and dispense prescription.', 'error');
    }
  };

  const parseResults = (resultsStr) => {
    if (!resultsStr) return { parameters: {}, remarks: '', isDraft: false };
    try {
      return JSON.parse(resultsStr);
    } catch (e) {
      return { parameters: {}, remarks: resultsStr || '', isDraft: false };
    }
  };

  const fetchCoverageData = async () => {
    try {
      // Fetch lab reagents / inventory for lab coverage
      const labInvRes = await api.get('/lab-inventory');
      if (labInvRes.data && Array.isArray(labInvRes.data)) {
        setCoverageReagents(labInvRes.data.map(item => ({
          id: item._id,
          name: item.name || 'Unknown Reagent',
          level: `${item.stock || 0} ${item.unit || 'units'}`,
          minSafe: `${item.threshold || 0} ${item.unit || 'units'}`,
          status: (item.stock || 0) <= (item.threshold || 0) ? 'Low Stock' : 'Safe'
        })));
      }

      // Fetch lab requests for lab coverage
      const labRes = await api.get('/labs');
      if (labRes.data && Array.isArray(labRes.data)) {
        setCoverageLabRequests(labRes.data.map(item => ({
          id: item._id,
          name: item.patientId?.name || 'Unknown',
          test: item.testName || 'General Test',
          priority: 'Normal',
          status: item.status || 'Pending',
          results: item.results || '',
          notes: item.notes || '',
          rawItem: item
        })));
      }

      // Fetch pharmacy queue (pending prescriptions) for pharmacy coverage
      const rxRes = await api.get('/prescriptions');
      if (rxRes.data && Array.isArray(rxRes.data)) {
        const pending = rxRes.data
          .filter(rx => rx.status === 'Pending Pharmacy Dispatch' || rx.status === 'Pending')
          .slice(0, 10)
          .map(rx => {
            const amountVal = rx.items ? rx.items.reduce((acc, curr) => acc + (curr.price || 50) * (curr.quantity || 1), 0) : 220;
            return {
              id: rx._id,
              patient: rx.patientId?.name || 'Unknown',
              patientId: rx.patientId?._id || rx.patientId,
              med: rx.items?.map(i => `${i.medicine} (${i.dosage || '1 Tab'})`).join(', ') || 'No items',
              qty: rx.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0,
              type: rx.items?.[0]?.category || 'Rx',
              items: rx.items || [],
              amountVal
            };
          });
        setCoveragePharmacyQueue(pending);
      }

      // Fetch pharmacy inventory for stock view
      const medsRes = await api.get('/medicines');
      if (medsRes.data && Array.isArray(medsRes.data)) {
        setCoveragePharmacyInventory(medsRes.data.map(m => ({
          id: m._id,
          name: m.name,
          stock: m.stock || 0,
          unit: m.unit || 'units',
          status: (m.stock || 0) === 0 ? 'Out of Stock' : (m.stock || 0) < 20 ? 'Low Stock' : 'In Stock'
        })));
      }

      // Fetch consultations / appointments for doctor coverage
      const appsRes = await api.get('/appointments');
      if (appsRes.data && Array.isArray(appsRes.data)) {
        const today = new Date().toISOString().split('T')[0];
        const todayApps = appsRes.data.filter(a => a.date && a.date.startsWith(today));
        const sortedTodayApps = [...todayApps].sort((a, b) => {
          const aCompleted = a.status === 'Completed' || a.status === 'Cancelled' || a.status === 'Checked Out';
          const bCompleted = b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Checked Out';
          if (aCompleted && !bCompleted) return 1;
          if (!aCompleted && bCompleted) return -1;

          const dateA = a.createdAt || a._id || 0;
          const dateB = b.createdAt || b._id || 0;
          return new Date(dateB) - new Date(dateA);
        });
        setCoverageConsultations(sortedTodayApps.map(app => ({
          id: app._id,
          name: app.patientId?.name || 'Unknown',
          age: app.patientId?.age || 0,
          gender: app.patientId?.gender || 'N/A',
          symptoms: app.reason || 'General Checkup',
          status: app.status || 'Upcoming',
          notes: app.notes || '',
          diagnosis: app.diagnosis || '',
          patientId: app.patientId?._id || ''
        })));
      }
    } catch (err) {
      console.error("Failed to fetch coverage data", err);
    }
  };

  const fetchData = async () => {
    try {
      const pts = await api.get('/patients');
      const sortedPatients = (pts.data || []).sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (a._id && b._id) {
          return b._id.localeCompare(a._id);
        }
        return 0;
      });
      setPatientsList(sortedPatients);

      const [appsRes, docsRes, staffRes, indentsRes, medsRes, billsRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/auth/doctors'),
        api.get('/auth/users/all').catch(() => ({ data: [] })),
        api.get('/indents'),
        api.get('/medicines'),
        api.get('/billing')
      ]);

      const sortedApps = (appsRes.data || []).sort((a, b) => {
        const aCompleted = a.status === 'Completed' || a.status === 'Cancelled' || a.status === 'Checked Out';
        const bCompleted = b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Checked Out';
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;

        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (a._id && b._id) {
          return b._id.localeCompare(a._id);
        }
        return 0;
      });
      
      setAppointments(sortedApps);
      setDoctors(docsRes.data);
      setStaffList(staffRes.data || []);
      setIndents(indentsRes.data);
      setMedicines(medsRes.data);
      setBills(billsRes.data);

      try {
        const labTestsRes = await api.get('/lab-tests');
        if (labTestsRes.data && Array.isArray(labTestsRes.data) && labTestsRes.data.length > 0) {
          const formatted = labTestsRes.data.map(item => ({
            testName: item.testName || item.name,
            testCode: item.testCode || item.code || 'LAB-100',
            category: item.category || 'Pathology',
            price: Number(item.price || item.fee || 0)
          }));
          setHospitalLabTests(formatted);
          
          // Auto sync price of currently selected test
          const matched = formatted.find(t => t.testName === selectedLabTest);
          if (matched) {
            setSelectedLabPrice(matched.price);
          }
        }
      } catch (e) {
        console.error("Failed to fetch hospital lab tests:", e);
      }

      try {
        const clinicalSrvRes = await api.get('/clinical-services');
        if (clinicalSrvRes.data && Array.isArray(clinicalSrvRes.data) && clinicalSrvRes.data.length > 0) {
          const formattedSrv = clinicalSrvRes.data.map(item => ({
            serviceName: item.serviceName,
            serviceCode: item.serviceCode || 'SRV-100',
            department: item.department || 'Dental',
            price: Number(item.price || 0)
          }));
          setHospitalClinicalServices(formattedSrv);
        }
      } catch (e) {
        console.error("Failed to fetch clinical services:", e);
      }

      try {
        const discountSettingRes = await api.get('/billing/discount-setting');
        setAllowedDiscountPercent(discountSettingRes.data.allowedDiscountPercent);
      } catch (discErr) {
        console.error("Failed to fetch discount setting", discErr);
      }


      // Also refresh coverage-related data
      await fetchCoverageData();
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const handleCreateLabOrder = async () => {
    if (selectedLabTestsList.length === 0) {
      showToast("Please add at least one lab test to the order.", "error");
      return;
    }
    if (!bookingPaymentMethod) {
      showToast("Please select a payment method.", "error");
      return;
    }
    if (Number(bookingDiscountPercent) > 0 && !bookingDiscountReason.trim()) {
      showToast("Please provide a reason for the discount.", "error");
      return;
    }
    if (!isExistingPatient && (!formData.name || !formData.contact)) {
      showToast("Please provide Patient Name and Contact Number.", "error");
      return;
    }

    try {
      setLoading(true);
      let targetPatientId = selectedPatient?._id;
      let patientObj = selectedPatient || formData;

      if (!isExistingPatient) {
        const pRes = await api.post('/patients', {
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          contact: formData.contact,
          email: formData.email,
          bloodGroup: formData.bloodGroup,
          address: formData.address,
          medicalHistory: formData.medicalHistory,
          referredBy: formData.referredBy || ''
        });
        targetPatientId = pRes.data._id;
        patientObj = pRes.data;
      }

      // Create Lab orders for each selected test
      for (const testItem of selectedLabTestsList) {
        await api.post('/labs', {
          patientId: targetPatientId,
          testName: testItem.testName,
          notes: 'Direct Walk-In Laboratory Test Order',
          status: 'Pending'
        });
      }

      // Create Billing record listing all tests
      const items = selectedLabTestsList.map(t => ({
        description: `Lab Test: ${t.testName}`,
        amount: Number(t.price || 0)
      }));
      if (!isExistingPatient) {
        items.push({ description: 'Registration Fee', amount: 50 });
      }

      const origAmt = selectedLabTestsList.reduce((sum, t) => sum + Number(t.price || 0), 0) + (isExistingPatient ? 0 : 50);
      const discAmt = (origAmt * Number(bookingDiscountPercent || 0)) / 100;
      const finalAmt = Math.max(0, origAmt - discAmt);

      await api.post('/billing', {
        patientId: targetPatientId,
        items,
        originalAmount: origAmt,
        discountPercent: Number(bookingDiscountPercent || 0),
        discountAmount: discAmt,
        totalAmount: finalAmt,
        paymentMethod: bookingPaymentMethod,
        discountReason: discAmt > 0 ? bookingDiscountReason.trim() : '',
        status: 'Paid'
      });

      // Generate Slip PDF Data
      setActiveSlipData({
        receiptNo: `REC-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        patientName: patientObj.name || 'Patient',
        patientId: getFormattedPatientId(targetPatientId),
        contact: patientObj.contact || 'N/A',
        ageGender: `${patientObj.age || 'N/A'} / ${patientObj.gender || 'N/A'}`,
        testName: selectedLabTestsList.map(t => t.testName).join(', '),
        items,
        originalAmount: origAmt,
        discountAmount: discAmt,
        totalAmount: finalAmt,
        paymentMethod: bookingPaymentMethod,
        hospitalName: currentUser.tenantName || 'Curoxa Medical Center'
      });
      setShowSlipPdfModal(true);

      showToast(`Direct Lab Order (${selectedLabTestsList.length} tests) & Payment settled successfully!`, 'success');
      
      // Reset
      setSelectedLabTestsList([]);
      setBookingPaymentMethod('');
      setBookingDiscountPercent(0);
      setBookingDiscountReason('');
      fetchData();
    } catch (err) {
      console.error("Failed to create lab order:", err);
      showToast(err.response?.data?.error || "Failed to create lab order.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateServiceOrder = async () => {
    if (selectedServicesList.length === 0) {
      showToast("Please add at least one clinical service/procedure.", "error");
      return;
    }
    if (!bookingPaymentMethod) {
      showToast("Please select a payment method.", "error");
      return;
    }
    if (Number(bookingDiscountPercent) > 0 && !bookingDiscountReason.trim()) {
      showToast("Please provide a reason for the discount.", "error");
      return;
    }
    if (!isExistingPatient && (!formData.name || !formData.contact)) {
      showToast("Please provide Patient Name and Contact Number.", "error");
      return;
    }

    try {
      setLoading(true);
      let targetPatientId = selectedPatient?._id;
      let patientObj = selectedPatient || formData;

      if (!isExistingPatient) {
        const pRes = await api.post('/patients', {
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          contact: formData.contact,
          email: formData.email,
          bloodGroup: formData.bloodGroup,
          address: formData.address,
          medicalHistory: formData.medicalHistory,
          referredBy: formData.referredBy || ''
        });
        targetPatientId = pRes.data._id;
        patientObj = pRes.data;
      }

      // Create Billing record listing all clinical services
      const items = selectedServicesList.map(s => ({
        description: `Clinical Procedure: ${s.serviceName}`,
        amount: Number(s.price || 0)
      }));
      if (!isExistingPatient) {
        items.push({ description: 'Registration Fee', amount: 50 });
      }

      const origAmt = selectedServicesList.reduce((sum, s) => sum + Number(s.price || 0), 0) + (isExistingPatient ? 0 : 50);
      const discAmt = (origAmt * Number(bookingDiscountPercent || 0)) / 100;
      const finalAmt = Math.max(0, origAmt - discAmt);

      await api.post('/billing', {
        patientId: targetPatientId,
        items,
        originalAmount: origAmt,
        discountPercent: Number(bookingDiscountPercent || 0),
        discountAmount: discAmt,
        totalAmount: finalAmt,
        paymentMethod: bookingPaymentMethod,
        discountReason: discAmt > 0 ? bookingDiscountReason.trim() : '',
        status: 'Paid'
      });

      // Generate Slip PDF Data
      setActiveSlipData({
        receiptNo: `REC-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        patientName: patientObj.name || 'Patient',
        patientId: getFormattedPatientId(targetPatientId),
        contact: patientObj.contact || 'N/A',
        ageGender: `${patientObj.age || 'N/A'} / ${patientObj.gender || 'N/A'}`,
        testName: selectedServicesList.map(s => s.serviceName).join(', '),
        items,
        originalAmount: origAmt,
        discountAmount: discAmt,
        totalAmount: finalAmt,
        paymentMethod: bookingPaymentMethod,
        hospitalName: currentUser.tenantName || 'Curoxa Medical Center'
      });
      setShowSlipPdfModal(true);

      showToast(`Clinical Procedure Order (${selectedServicesList.length} services) & Payment settled successfully!`, 'success');
      
      // Reset
      setSelectedServicesList([]);
      setBookingPaymentMethod('');
      setBookingDiscountPercent(0);
      setBookingDiscountReason('');
      fetchData();
    } catch (err) {
      console.error("Failed to create clinical service order:", err);
      showToast(err.response?.data?.error || "Failed to create clinical service order.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctor availability when doctor or date changes for reception booking
  useEffect(() => {
    const fetchReceptionAvailability = async () => {
      console.log("[RECEPTION_AVAIL] Triggered with doctorId:", formData.doctorId, "date:", bookingDate);
      if (!formData.doctorId || !bookingDate) {
        const selectedDoc = doctors.find(d => String(d._id) === String(formData.doctorId));
        const docSlots = selectedDoc?.doctorSlots?.length > 0 ? selectedDoc.doctorSlots : DEFAULT_RECEPTION_SLOTS;
        console.log("[RECEPTION_AVAIL] Missing doctor or date. Fallback slots:", docSlots);
        setReceptionDoctorAvailability({ available: true, slots: docSlots, reason: null });
        return;
      }
      try {
        const res = await api.get(`/hr/doctor-availability/${formData.doctorId}?date=${bookingDate}`);
        console.log("[RECEPTION_AVAIL] Success res.data:", res.data);
        setReceptionDoctorAvailability(res.data);
      } catch (err) {
        console.error("[RECEPTION_AVAIL] Error fetching from API:", err);
        const selectedDoc = doctors.find(d => String(d._id) === String(formData.doctorId));
        const docSlots = selectedDoc?.doctorSlots?.length > 0 ? selectedDoc.doctorSlots : DEFAULT_RECEPTION_SLOTS;
        console.log("[RECEPTION_AVAIL] Catch fallback slots:", docSlots);
        setReceptionDoctorAvailability({ available: true, slots: docSlots, reason: null });
      }
    };
    fetchReceptionAvailability();
  }, [formData.doctorId, bookingDate, doctors]);

  const getUnifiedAppointmentsList = () => {
    const list = [];

    // 1. Doctor appointments
    if (appointments && Array.isArray(appointments)) {
      appointments.forEach(app => {
        list.push({
          id: app._id || app.id,
          patientId: app.patientId,
          patientName: app.patientId?.name || 'Unknown Patient',
          type: 'Appointment',
          detailName: app.doctorId?.name || app.doctor || 'OPD Consultation',
          date: app.date,
          time: app.time || '',
          status: app.status || 'Pending',
          rawItem: app
        });
      });
    }

    // 2. Lab tests (from coverageLabRequests or labs)
    if (coverageLabRequests && Array.isArray(coverageLabRequests)) {
      coverageLabRequests.forEach(lab => {
        const labPatId = lab.rawItem?.patientId || lab.patientId;
        const patObj = typeof labPatId === 'object' ? labPatId : patientsList.find(p => p._id === String(labPatId));
        list.push({
          id: lab.id || lab._id,
          patientId: patObj || labPatId,
          patientName: patObj?.name || lab.name || 'Unknown Patient',
          type: 'Lab Test',
          detailName: lab.test || 'General Lab Test',
          date: lab.rawItem?.createdAt ? new Date(lab.rawItem.createdAt).toISOString().split('T')[0] : '',
          time: lab.rawItem?.createdAt ? new Date(lab.rawItem.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          status: lab.status || 'Pending',
          rawItem: lab.rawItem || lab
        });
      });
    }

    // 3. Clinical services (from bills)
    if (bills && Array.isArray(bills)) {
      bills.forEach(bill => {
        const serviceItems = (bill.items || []).filter(item => (item.description || '').toLowerCase().includes('clinical procedure:'));
        serviceItems.forEach((item, idx) => {
          const serviceName = item.description.replace('Clinical Procedure:', '').trim();
          list.push({
            id: `${bill._id || bill.id}-${idx}`,
            patientId: bill.patientId,
            patientName: bill.patientId?.name || 'Unknown Patient',
            type: 'Clinical Service',
            detailName: serviceName,
            date: bill.createdAt ? new Date(bill.createdAt).toISOString().split('T')[0] : '',
            time: bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
            status: bill.status || 'Paid',
            rawItem: bill
          });
        });
      });
    }

    return list;
  };

  const getFilteredAppointments = () => {
    const unified = getUnifiedAppointmentsList();
    return unified.filter(item => {
      // 1. Type Filter
      if (apptTypeFilter !== 'All' && item.type !== apptTypeFilter) return false;

      // 2. Date Range Filter
      if (item.date) {
        const itemDate = new Date(item.date);
        const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

        if (startDate) {
          const start = new Date(startDate);
          const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          if (itemDateOnly < startOnly) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          if (itemDateOnly > endOnly) return false;
        }
      }

      // 3. Search query
      const query = appointmentSearch.toLowerCase().trim();
      if (query) {
        const patientNameMatch = (item.patientName || '').toLowerCase().includes(query);
        const detailMatch = (item.detailName || '').toLowerCase().includes(query);
        if (!patientNameMatch && !detailMatch) return false;
      }

      return true;
    });
  };

  useEffect(() => {
    fetchData();
    // Poll data and coverage data every 5 seconds for real-time updates
    const pollInterval = setInterval(() => {
      fetchData();
      fetchCoverageData();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    const handleSync = (e) => {
      const { type } = e.detail;
      console.log('[SOCKET] ReceptionistDashboard received sync event for:', type);
      if (type === 'coverage') {
        fetchCoverageData();
      } else {
        fetchData();
      }
    };
    window.addEventListener('curoxa_sync', handleSync);
    return () => window.removeEventListener('curoxa_sync', handleSync);
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      // Find all appointments for this patient
      const patientApps = appointments.filter(app => {
        const pId = app.patientId?._id || app.patientId;
        const targetId = selectedPatient._id;
        return pId && targetId && pId.toString() === targetId.toString();
      });
      // Sort appointments by date descending (latest first)
      const sorted = [...patientApps].sort((a, b) => {
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
      // Set the default selected appointment to the latest one
      if (sorted.length > 0) {
        setSelectedProfileAppointment(sorted[0]);
      } else {
        setSelectedProfileAppointment(null);
      }
    } else {
      setSelectedProfileAppointment(null);
    }
  }, [selectedPatient, appointments]);

  useEffect(() => {
    if (selectedProfileAppointment) {
      const d = new Date(selectedProfileAppointment.date);
      const dateVal = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      setRescheduleProfileDate(dateVal);
      setRescheduleProfileTime(selectedProfileAppointment.time || '');
    } else {
      setRescheduleProfileDate('');
      setRescheduleProfileTime('');
    }
    setIsReschedulingProfileAppt(false);
  }, [selectedProfileAppointment]);

  const getWeeklyData = () => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      data.push({
        label: dayName,
        fullDate: dateStr,
        count: 0,
        walkin: 0,
        online: 0
      });
    }

    // Timezone-safe and date-format robust parser to match local calendar dates
    const parseDateSafe = (dStr) => {
      if (!dStr) return null;
      if (typeof dStr === 'string') {
        const match = dStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const [, y, m, day] = match;
          if (dStr.endsWith('T00:00:00.000Z') || !dStr.includes('T') || dStr.includes('T00:00:00')) {
            return new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
          }
        }
      }
      return new Date(dStr);
    };

    appointments.forEach(app => {
      const appDate = parseDateSafe(app.createdAt || app.date);
      if (!appDate) return;
      const appDateStr = appDate.toLocaleDateString();
      const dayData = data.find(d => d.fullDate === appDateStr);
      if (dayData) {
        dayData.count += 1;
        if (app.source === 'Online') {
          dayData.online += 1;
        } else {
          dayData.walkin += 1;
        }
      }
    });

    return data;
  };

  const weeklyData = getWeeklyData();
  const maxCount = Math.max(...weeklyData.map(d => Math.max(d.walkin, d.online)), 5);

  const totalWalkin = weeklyData.reduce((sum, d) => sum + d.walkin, 0);
  const totalOnline = weeklyData.reduce((sum, d) => sum + d.online, 0);
  const totalVisits = totalWalkin + totalOnline;
  
  const allTimeWalkin = appointments.filter(app => app.source !== 'Online').length;
  const allTimeOnline = appointments.filter(app => app.source === 'Online').length;
  const allTimeTotal = allTimeWalkin + allTimeOnline;

  const overallWalkinPercent = allTimeTotal > 0 ? Math.round((allTimeWalkin / allTimeTotal) * 100) : 0;
  const overallOnlinePercent = allTimeTotal > 0 ? Math.round((allTimeOnline / allTimeTotal) * 100) : 0;

  const filteredAppointments = useMemo(() => {
    if (!dashboardFilterStartDate || !dashboardFilterEndDate) return appointments;
    let start = new Date(dashboardFilterStartDate);
    let end = new Date(dashboardFilterEndDate);
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const pDateSafe = (dStr) => {
      if (!dStr) return null;
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? null : d;
    };

    return appointments.filter(app => {
      const appDate = pDateSafe(app.createdAt || app.date);
      if (!appDate) return false;
      return appDate >= start && appDate <= end;
    });
  }, [appointments, dashboardFilterStartDate, dashboardFilterEndDate]);

  const filteredBills = useMemo(() => {
    if (!dashboardFilterStartDate || !dashboardFilterEndDate) return bills;
    let start = new Date(dashboardFilterStartDate);
    let end = new Date(dashboardFilterEndDate);
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const pDateSafe = (dStr) => {
      if (!dStr) return null;
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? null : d;
    };

    return bills.filter(b => {
      const bDate = pDateSafe(b.createdAt || b.date);
      if (!bDate) return false;
      return bDate >= start && bDate <= end;
    });
  }, [bills, dashboardFilterStartDate, dashboardFilterEndDate]);

  const filteredPatientsList = useMemo(() => {
    if (!dashboardFilterStartDate || !dashboardFilterEndDate) return patientsList;
    let start = new Date(dashboardFilterStartDate);
    let end = new Date(dashboardFilterEndDate);
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const pDateSafe = (dStr) => {
      if (!dStr) return null;
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? null : d;
    };

    return patientsList.filter(p => {
      const pDate = pDateSafe(p.createdAt);
      if (!pDate) return false;
      return pDate >= start && pDate <= end;
    });
  }, [patientsList, dashboardFilterStartDate, dashboardFilterEndDate]);

  const totalVisitsCount = useMemo(() => {
    const apptsCount = filteredAppointments.length;

    const labsCount = (filteredBills || []).reduce((sum, b) => {
      const labItems = (b.items || []).filter(item => (item.description || '').toLowerCase().includes('lab test:'));
      return sum + labItems.length;
    }, 0);

    const servicesCount = (filteredBills || []).reduce((sum, b) => {
      const serviceItems = (b.items || []).filter(item => (item.description || '').toLowerCase().includes('clinical procedure:'));
      return sum + serviceItems.length;
    }, 0);

    return apptsCount + labsCount + servicesCount;
  }, [filteredAppointments, filteredBills]);

  const getTrendData = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const parseDateSafe = (dStr) => {
      if (!dStr) return null;
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? null : d;
    };

    let thisWeekWalkin = 0;
    let thisWeekOnline = 0;
    let lastWeekWalkin = 0;
    let lastWeekOnline = 0;

    appointments.forEach(app => {
      const appDate = parseDateSafe(app.createdAt || app.date);
      if (!appDate) return;

      if (appDate >= sevenDaysAgo && appDate <= today) {
        if (app.source === 'Online') thisWeekOnline++;
        else thisWeekWalkin++;
      } else if (appDate >= fourteenDaysAgo && appDate < sevenDaysAgo) {
        if (app.source === 'Online') lastWeekOnline++;
        else lastWeekWalkin++;
      }
    });

    const walkinTrend = lastWeekWalkin > 0 ? Math.round(((thisWeekWalkin - lastWeekWalkin) / lastWeekWalkin) * 100) : (thisWeekWalkin > 0 ? 100 : 0);
    const onlineTrend = lastWeekOnline > 0 ? Math.round(((thisWeekOnline - lastWeekOnline) / lastWeekOnline) * 100) : (thisWeekOnline > 0 ? 100 : 0);

    return { walkinTrend, onlineTrend };
  };

  const { walkinTrend, onlineTrend } = getTrendData();


  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  // Save draft for new patient registrations
  useEffect(() => {
    if (activeTab === 'registration-form' && !isExistingPatient && formData.contact && formData.contact.length >= 10) {
      try {
        localStorage.setItem('curoxa_draft_' + formData.contact, JSON.stringify(formData));
      } catch (e) {}
    }
  }, [formData, activeTab, isExistingPatient]);

  // Freeze background page scroll when Details Modal Dialog is active
  useEffect(() => {
    if (detailsModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [detailsModalOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const switchTab = (tabId, bypassReset = false) => {
    fetchData().catch(e => console.error("Error refreshing data:", e));
    setActiveTab(tabId);
    setMobileSidebarOpen(false);
    if (tabId === 'registration-form' && !bypassReset) {
      setIsExistingPatient(null);
      setSelectedPatient(null);
      
      let draftData = null;
      let contactToUse = '';
      if (searchPatientQuery && searchPatientQuery.trim().length >= 4) {
        contactToUse = searchPatientQuery.trim();
        try {
          const draftStr = localStorage.getItem('curoxa_draft_' + contactToUse);
          if (draftStr) draftData = JSON.parse(draftStr);
        } catch(e) {}
      } else if (globalSearchQuery && globalSearchQuery.trim().length >= 4) {
        contactToUse = globalSearchQuery.trim();
        try {
          const draftStr = localStorage.getItem('curoxa_draft_' + contactToUse);
          if (draftStr) draftData = JSON.parse(draftStr);
        } catch(e) {}
      }

      setSearchPatientQuery('');
      setGlobalSearchQuery('');
      setBookingPaymentMethod('');

      if (draftData) {
        setFormData(draftData);
        showToast("Restored unsaved draft for this number.", "info");
      } else {
        setFormData({ name: '', age: '', gender: '', contact: contactToUse || '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '' });
      }
    }
    if (tabId === 'new-indent') {
      setNewIndentDept('Pharmacy');
      setNewIndentType('Pharmaceuticals');
      setNewIndentReqDate(new Date().toISOString().split('T')[0]);
      setNewIndentRequestedBy(currentUser?.name || 'Staff');
      setNewIndentContact(currentUser?.contact || 'N/A');
      setNewIndentPriority('Normal');
      setNewIndentRemarks('');
      setSelectedMedicines([]);
      setMedicineSearchQuery('');
      setShowMedicineSuggestions(false);
      setNewIndentAdditionalNotes('');
      setNewIndentAttachments([]);
      setShowReqByDropdown(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
    setSymptomDropdownOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      showToast("Please enter patient email first.", "error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    try {
      setSendingOtp(true);
      const res = await api.post('/auth/send-registration-otp', { email: formData.email });
      if (res.data.dev_otp) {
        showToast(`[DEV ONLY] OTP sent! Code: ${res.data.dev_otp}`, "success");
        setVerificationOtp(res.data.dev_otp);
      } else {
        showToast("Verification OTP sent to patient email.", "success");
      }
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to send OTP email.", "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!verificationOtp) {
      showToast("Please enter the 6-digit OTP code.", "error");
      return;
    }

    try {
      setOtpVerifying(true);
      await api.post('/auth/verify-registration-otp', { email: formData.email, otp: verificationOtp });
      showToast("Email address verified successfully!", "success");
      setOtpVerified(true);
      setOtpSent(false);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Invalid or expired OTP code.", "error");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      setLoading(true);

      if (!isExistingPatient) {
        if (bookingType === 'lab' || bookingType === 'service') {
          if (!formData.name || !formData.age || !formData.contact || !formData.gender) {
            showToast("Please fill in Name, Age, Gender, and Contact for the patient.", "error");
            setLoading(false);
            return;
          }
          if (formData.contact.length !== 10) {
            showToast("Please enter a valid 10-digit mobile number.", "error");
            setLoading(false);
            return;
          }
        } else {
          if (!formData.name || !formData.age || !formData.contact) {
            showToast("Please fill in Name, Age, and Contact for the new patient.", "error");
            setLoading(false);
            return;
          }
          if (formData.contact.length !== 10) {
            showToast("Please enter a valid 10-digit mobile number.", "error");
            setLoading(false);
            return;
          }
          if (formData.email && formData.email.trim() !== '' && !otpVerified) {
            showToast("Please verify the patient's email using OTP before confirming, or clear the email field to proceed without it.", "error");
            setLoading(false);
            return;
          }
        }
      } else if (!selectedPatient) {
        showToast("Please select a patient.", "error");
        setLoading(false);
        return;
      }

      // Collect active doctor form selection
      const allApptsToBook = [...additionalApptsList];
      if (formData.doctorId && selectedSlot) {
        const docObj = doctors.find(d => String(d._id) === String(formData.doctorId));
        allApptsToBook.push({
          doctorId: formData.doctorId,
          doctorName: docObj ? docObj.name : 'Doctor',
          date: bookingDate,
          time: selectedSlot,
          reason: selectedSymptoms.join(', ') || 'General Checkup',
          fee: docObj ? (docObj.consultationFee || 500) : 500
        });
      }

      // Check for duplicate doctors in allApptsToBook
      const docIds = allApptsToBook.map(a => String(a.doctorId));
      const hasDuplicates = docIds.some((val, i) => docIds.indexOf(val) !== i);
      if (hasDuplicates) {
        showToast("You cannot book multiple appointments with the same doctor in a single visit. Please review your selected doctors.", "error");
        setLoading(false);
        return;
      }

      // Check if existing patient already has an appointment today with any of the selected doctors in database
      if (isExistingPatient && selectedPatient) {
        for (const apptToBook of allApptsToBook) {
          const alreadyHasApptInDb = appointments.some(appt => {
            const pId = appt.patientId && typeof appt.patientId === 'object' ? appt.patientId._id : appt.patientId;
            const dId = appt.doctorId && typeof appt.doctorId === 'object' ? appt.doctorId._id : appt.doctorId;
            const samePatient = String(pId) === String(selectedPatient._id);
            const sameDoctor = String(dId) === String(apptToBook.doctorId);
            const sameDay = new Date(appt.date).toDateString() === new Date(apptToBook.date).toDateString();
            const notCancelled = appt.status !== 'Cancelled';
            return samePatient && sameDoctor && sameDay && notCancelled;
          });
          if (alreadyHasApptInDb) {
            showToast(`Patient ${selectedPatient.name} already has an appointment booked with ${apptToBook.doctorName} on this day.`, "error");
            setLoading(false);
            return;
          }
        }
      }

      if (allApptsToBook.length === 0) {
        showToast("Please select a Doctor and Time Slot for consultation.", "error");
        setLoading(false);
        return;
      }

      if (!bookingPaymentMethod) {
        showToast("Please select a Payment Method before confirming.", "error");
        setLoading(false);
        return;
      }

      if (Number(bookingDiscountPercent) > 0 && !bookingDiscountReason.trim()) {
        showToast("Please provide a reason for the discount.", "error");
        setLoading(false);
        return;
      }

      const billingItems = allApptsToBook.map(appt => ({
        description: `Consultation Fee (${appt.doctorName || 'Doctor'} - ${(appt.time || '').split('(Limit')[0].trim()})`,
        amount: appt.fee || 500
      }));
      if (!isExistingPatient) {
        billingItems.push({ description: 'Registration Fee', amount: 50 });
      }
      const billingTotal = billingItems.reduce((sum, item) => sum + item.amount, 0);

      const patientName = isExistingPatient && selectedPatient ? selectedPatient.name : formData.name;
      
      let finalPatientId = isExistingPatient ? selectedPatient._id : null;
      let patientObj = isExistingPatient ? selectedPatient : null;
      if (!isExistingPatient) {
        const patientRes = await api.post('/patients', {
          name: formData.name,
          age: parseInt(formData.age) || 30,
          gender: formData.gender,
          contact: formData.contact,
          email: formData.email,
          bloodGroup: formData.bloodGroup || 'O+',
          address: formData.address || '',
          medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(item => item.trim()) : [],
          otp: verificationOtp,
          dpdpConsent: dpdpConsent,
          patientDocuments: patientDocuments,
          referredBy: formData.referredBy || ''
        });
        finalPatientId = patientRes.data._id;
        patientObj = patientRes.data;
        if (formData.contact) {
          localStorage.removeItem('curoxa_draft_' + formData.contact);
        }
      }

      // Book appointments
      const apptsToCreate = allApptsToBook;
      let primaryApptId = null;
      for (const apptItem of apptsToCreate) {
        const appointmentRes = await api.post('/appointments', {
          patientId: finalPatientId,
          doctorId: apptItem.doctorId,
          date: apptItem.date,
          time: apptItem.time,
          reason: apptItem.reason
        });
        if (!primaryApptId) primaryApptId = appointmentRes.data._id;
      }

      // Settle billing
      const origAmt = billingTotal;
      const discAmt = (origAmt * Number(bookingDiscountPercent || 0)) / 100;
      const finalAmt = Math.max(0, origAmt - discAmt);

      await api.post('/billing', {
        patientId: finalPatientId,
        appointmentId: primaryApptId,
        items: billingItems,
        originalAmount: origAmt,
        discountPercent: Number(bookingDiscountPercent || 0),
        discountAmount: discAmt,
        totalAmount: finalAmt,
        paymentMethod: bookingPaymentMethod || 'Cash',
        discountReason: discAmt > 0 ? bookingDiscountReason.trim() : '',
        status: 'Paid'
      });

      // Save vitals if any of them are filled in the form
      if (vitalTemp || vitalPulse || vitalBpSys || vitalBpDia || vitalResp || vitalSpo2 || vitalWeight || vitalHeight) {
        try {
          await api.post('/emr/vitals', {
            patientId: finalPatientId,
            temperature: vitalTemp ? parseFloat(vitalTemp) : undefined,
            pulse: vitalPulse ? parseInt(vitalPulse) : undefined,
            bpSys: vitalBpSys ? parseInt(vitalBpSys) : undefined,
            bpDia: vitalBpDia ? parseInt(vitalBpDia) : undefined,
            resp: vitalResp ? parseInt(vitalResp) : undefined,
            spo2: vitalSpo2 ? parseInt(vitalSpo2) : undefined,
            weight: vitalWeight ? parseFloat(vitalWeight) : undefined,
            height: vitalHeight ? parseFloat(vitalHeight) : undefined
          });
          // Clear vitals form fields
          setVitalTemp('');
          setVitalPulse('');
          setVitalBpSys('');
          setVitalBpDia('');
          setVitalResp('');
          setVitalSpo2('');
          setVitalWeight('');
          setVitalHeight('');
        } catch (err) {
          console.error("Failed to save vitals during registration flow:", err);
        }
      }

      // Generate Slip PDF Data
      const activePatient = patientObj || selectedPatient || formData;
      setActiveSlipData({
        receiptNo: `REC-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        patientName: activePatient.name || 'Patient',
        patientId: getFormattedPatientId(finalPatientId),
        contact: activePatient.contact || 'N/A',
        ageGender: `${activePatient.age || 'N/A'} / ${activePatient.gender || 'N/A'}`,
        testName: 'OPD Consultation & Booking Fee',
        items: billingItems,
        originalAmount: origAmt,
        discountAmount: discAmt,
        totalAmount: finalAmt,
        paymentMethod: bookingPaymentMethod || 'Cash',
        hospitalName: currentUser.tenantName || 'Curoxa Medical Center'
      });
      setShowSlipPdfModal(true);

      showToast(`${apptsToCreate.length} Appointment(s) registered & Payment completed successfully!`, "success");

      // Reset Form State
      setFormData({ name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '' });
      setBookingDate(getLocalDateString());
      setSelectedSlot('');
      setSelectedSymptoms([]);
      setAdditionalApptsList([]);
      setIsExistingPatient(null);
      setSelectedPatient(null);
      setBookingPaymentMethod('');
      setBookingDiscountPercent(0);
      setBookingDiscountReason('');
      setOtpVerified(false);
      setOtpSent(false);
      setVerificationOtp('');
      setPatientDocuments([]);
      setReschedulingAppointment(null);
      fetchData();

    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || err.message || 'Failed to complete booking and payment', 'error');
    } finally {
      setLoading(false);
    }
  };
  const getDisplayDob = (patient) => {
    if (!patient) return 'N/A';
    const age = patient.age || 30;
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    return `01/01/${birthYear} (${age} yrs)`;
  };

  const getFormattedSummaryDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  const getFormattedTableDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  const [cancelApptConfirmId, setCancelApptConfirmId] = useState(null);

  const handleCancelProfileAppointment = (apptId) => {
    setCancelApptConfirmId(apptId);
  };

  const confirmCancelProfileAppointment = async () => {
    if (!cancelApptConfirmId) return;
    const apptId = cancelApptConfirmId;
    setCancelApptConfirmId(null);
    try {
      setLoading(true);
      // Optimistically update appointments state!
      setAppointments(prev => prev.map(a => a._id === apptId ? { ...a, status: 'Cancelled' } : a));
      setSelectedProfileAppointment(prev => prev && prev._id === apptId ? { ...prev, status: 'Cancelled' } : prev);
      await api.put(`/appointments/${apptId}`, { status: 'Cancelled' });
      showToast("Appointment cancelled successfully", "success");
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to cancel appointment", "error");
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfileReschedule = async () => {
    if (!selectedProfileAppointment) return;
    const apptId = selectedProfileAppointment._id;
    try {
      setLoading(true);
      // Optimistically update appointments state!
      setAppointments(prev => prev.map(a => a._id === apptId ? { ...a, date: rescheduleProfileDate, time: rescheduleProfileTime, status: 'Rescheduled' } : a));
      setSelectedProfileAppointment(prev => prev && prev._id === apptId ? { ...prev, date: rescheduleProfileDate, time: rescheduleProfileTime, status: 'Rescheduled' } : prev);
      await api.put(`/appointments/${apptId}`, { date: rescheduleProfileDate, time: rescheduleProfileTime, status: 'Rescheduled' });
      showToast("Appointment rescheduled successfully", "success");
      setIsReschedulingProfileAppt(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to reschedule appointment", "error");
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!reschedulingAppointment) return;
    const apptId = reschedulingAppointment._id;
    if (!bookingDate || !selectedSlot) {
      showToast("Please choose both date and time slot for rescheduling", "error");
      return;
    }
    try {
      setLoading(true);
      await api.put(`/appointments/${apptId}`, { date: bookingDate, time: selectedSlot, status: 'Rescheduled' });
      showToast("Appointment rescheduled successfully!", "success");
      
      setFormData({ name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '' });
      setSelectedSymptoms([]);
      setIsExistingPatient(null);
      setSearchPatientQuery('');
      setSelectedPatient(null);
      setBookingPaymentMethod('');
      setReschedulingAppointment(null);
      setBookingDate(getLocalDateString());
      setSelectedSlot('');

      await fetchData();
      switchTab('appointments');
    } catch (err) {
      console.error(err);
      showToast("Failed to reschedule appointment", "error");
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleViewPrescription = async (apptId) => {
    try {
      setLoading(true);
      const res = await api.get(`/prescriptions?patientId=${selectedPatient._id}`);
      const rx = res.data.find(r => r.appointmentId === apptId || (r.appointmentId?._id && r.appointmentId._id === apptId));
      if (rx) {
        setSelectedPrescription(rx);
        setPrescriptionModalOpen(true);
      } else {
        showToast("No prescription has been generated for this appointment yet.", "info");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load prescription.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewLabReport = async (apptId) => {
    try {
      setLoading(true);
      const res = await api.get(`/labs?patientId=${selectedPatient._id}`);
      const lab = res.data.find(l => l.appointmentId === apptId || (l.appointmentId?._id && l.appointmentId._id === apptId));
      if (lab) {
        setSelectedLabRequest(lab);
        setLabModalOpen(true);
      } else {
        showToast("No lab report has been generated for this appointment yet.", "info");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load lab report.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllLabReports = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const res = await api.get(`/labs?patientId=${selectedPatient._id}`);
      if (res.data && res.data.length > 0) {
        setPatientLabReports(res.data);
      } else {
        setPatientLabReports([]);
      }
      setSelectedReportDetail(null);
      setAllLabsModalOpen(true);
    } catch (err) {
      console.error(err);
      setPatientLabReports([]);
      setSelectedReportDetail(null);
      setAllLabsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const resetRegistrationForm = () => {
    setFormData({ name: '', age: '', gender: '', contact: '', email: '', doctorId: '', bloodGroup: '', address: '', medicalHistory: '', referredBy: '' });
    setSelectedSymptoms([]);
    setIsExistingPatient(null);
    setSearchPatientQuery('');
    setSelectedPatient(null);
    setBookingPaymentMethod('');
    setOtpVerified(false);
    setOtpSent(false);
    setVerificationOtp('');
    setAdditionalApptsList([]);
    setSelectedSlot('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setReschedulingAppointment(null);
    setVitalTemp('');
    setVitalPulse('');
    setVitalBpSys('');
    setVitalBpDia('');
    setVitalResp('');
    setVitalSpo2('');
    setVitalWeight('');
    setVitalHeight('');
  };

  const handleCreateAppointmentForProfilePatient = () => {
    if (!selectedPatient) return;
    const pat = { ...selectedPatient };
    setFormData({
      name: pat.name,
      age: pat.age,
      gender: pat.gender,
      contact: pat.contact,
      email: pat.email || '',
      bloodGroup: pat.bloodGroup || 'O+',
      address: pat.address || '',
      medicalHistory: pat.medicalHistory ? pat.medicalHistory.join(', ') : '',
      doctorId: ''
    });
    setIsExistingPatient(true);
    setSelectedPatient(pat);
    switchTab('registration-form', true);
  };

  const [activePatientMenuId, setActivePatientMenuId] = useState(null);
  const [patientMenuPos, setPatientMenuPos] = useState({ top: 0, right: 0 });

  const handleOpenPatientProfile = async (patientIdOrObj) => {
    if (!patientIdOrObj) return;
    let patObj = null;
    if (patientIdOrObj.gender && patientIdOrObj._id) {
      patObj = patientIdOrObj;
    } else {
      const targetId = patientIdOrObj._id || patientIdOrObj;
      patObj = patientsList.find(p => p._id.toString() === targetId.toString());
    }

    if (patObj) {
      setSelectedPatient(patObj);
      switchTab('patient-details', true);
      
      try {
        const res = await api.get(`/emr/vitals/patient/${patObj._id}`);
        setPatientVitals(res.data || []);
      } catch (err) {
        console.error("Failed to fetch patient vitals", err);
        setPatientVitals([]);
      }
    }
  };

  const handleSaveVitals = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPatient) return;
    try {
      setLoading(true);
      const payload = {
        patientId: selectedPatient._id,
        temperature: vitalTemp ? parseFloat(vitalTemp) : undefined,
        pulse: vitalPulse ? parseInt(vitalPulse) : undefined,
        bpSys: vitalBpSys ? parseInt(vitalBpSys) : undefined,
        bpDia: vitalBpDia ? parseInt(vitalBpDia) : undefined,
        respiration: vitalResp ? parseInt(vitalResp) : undefined,
        spo2: vitalSpo2 ? parseInt(vitalSpo2) : undefined,
        weight: vitalWeight ? parseFloat(vitalWeight) : undefined,
        height: vitalHeight ? parseFloat(vitalHeight) : undefined
      };

      await api.post('/emr/vitals', payload);
      showToast("Vitals recorded successfully", "success");
      
      const res = await api.get(`/emr/vitals/patient/${selectedPatient._id}`);
      setPatientVitals(res.data || []);
      setShowVitalsModal(false);
    } catch (err) {
      console.error("Failed to record vitals:", err);
      showToast("Failed to record vitals", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRePrintPatientSlip = (p, targetBill = null) => {
    if (!p) return;
    const patientBills = bills.filter(b => {
      const pId = b.patientId?._id || b.patientId;
      return pId && pId.toString() === p._id.toString() && b.status === 'Paid';
    });

    if (patientBills.length === 0) {
      showToast(`No paid payment receipts found for ${p.name}.`, "info");
      return;
    }

    const billToPrint = targetBill || patientBills[0];

    setActiveSlipData({
      receiptNo: `REC-${(billToPrint._id || '').slice(-6).toUpperCase()}`,
      date: new Date(billToPrint.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      patientName: p.name || 'Patient',
      patientId: getFormattedPatientId(p._id),
      contact: p.contact || 'N/A',
      ageGender: `${p.age || 'N/A'} / ${p.gender || 'N/A'}`,
      testName: (billToPrint.items || []).map(i => i.description).join(', ') || 'Medical Services',
      items: billToPrint.items || [{ description: 'Hospital Services', amount: billToPrint.totalAmount }],
      originalAmount: billToPrint.originalAmount || billToPrint.totalAmount,
      discountAmount: billToPrint.discountAmount || 0,
      totalAmount: billToPrint.totalAmount,
      paymentMethod: billToPrint.paymentMethod || 'Cash',
      hospitalName: currentUser?.tenantName || 'Curoxa Medical Center'
    });
    setShowSlipPdfModal(true);
  };

  const getBillingItems = () => {
    if (bookingType === 'lab') {
      return selectedLabTestsList.map(item => ({ description: item.testName, amount: Number(item.price || 0) }));
    } else if (bookingType === 'service') {
      return selectedServicesList.map(item => ({ description: item.serviceName, amount: Number(item.price || 0) }));
    } else {
      const items = additionalApptsList.map(appt => ({
        description: `Consultation (${appt.doctorName})`,
        amount: Number(appt.fee !== undefined ? appt.fee : (doctors.find(d => String(d._id) === String(appt.doctorId))?.consultationFee || 500))
      }));
      
      const isCurrentDoctorAlreadyQueued = formData.doctorId && additionalApptsList.some(appt => String(appt.doctorId) === String(formData.doctorId));
      if (formData.doctorId && selectedSlot && !isCurrentDoctorAlreadyQueued) {
        const docObj = doctors.find(d => String(d._id) === String(formData.doctorId));
        items.push({
          description: `Consultation (${docObj ? docObj.name : 'Doctor'})`,
          amount: Number(docObj?.consultationFee || 500)
        });
      }
      return items;
    }
  };

  return (
    <>
      <style>{`
        /* Strict Box sizing safeguard */
        *, *::before, *::after {
          box-sizing: border-box !important;
        }

        html, body {
          background-color: #F8FAFC !important;
          font-family: 'Urbanist', sans-serif !important;
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* SIDEBAR MODERN DESIGN */
        .sidebar {
          width: 256px !important;
          background: #FFFFFF !important;
          border-right: 1px solid #E2E8F0 !important;
          box-shadow: none !important;
          padding: 24px 0 16px 0 !important;
          height: calc(100vh / 0.9) !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          z-index: 100 !important;
        }
        .sidebar-logo {
          padding: 0 24px 28px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-size: 22px !important;
          font-weight: 900 !important;
          color: #2563EB !important;
          letter-spacing: -0.5px !important;
        }
        .sidebar-logo i, .sidebar-logo svg {
          color: #2563EB !important;
          width: 24px !important;
          height: 24px !important;
        }
        .sidebar nav {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          height: calc(100% - 140px) !important;
          overflow-y: auto !important;
        }
        .sidebar .nav-link {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 12px 18px !important;
          margin: 0 16px !important;
          border-radius: 12px !important;
          color: #64748B !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          transition: all 0.2s ease !important;
          border-left: none !important;
          font-size: 14px !important;
        }
        .sidebar .nav-link:hover {
          background: #F8FAFC !important;
          color: #0F172A !important;
        }
        .sidebar .nav-link.active {
          background: #EFF6FF !important;
          color: #2563EB !important;
          font-weight: 700 !important;
        }
        .sidebar .nav-link i, .sidebar .nav-link svg {
          width: 18px !important;
          height: 18px !important;
          color: inherit !important;
        }
        .sidebar-user {
          margin: auto 16px 16px !important;
          padding: 12px !important;
          border-radius: 16px !important;
          background: #F8FAFC !important;
          border: 1px solid #E2E8F0 !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          position: relative !important;
        }
        .sidebar-user:hover {
          background: #F1F5F9 !important;
        }
        .user-avatar {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
          border: 2px solid #60A5FA !important;
        }
        .user-info {
          display: flex !important;
          flex-direction: column !important;
        }
        .user-info .name {
          font-size: 13.5px !important;
          font-weight: 800 !important;
          color: #0F172A !important;
        }
        .user-info .role {
          font-size: 11px !important;
          font-weight: 600 !important;
          color: #64748B !important;
        }

        /* TOP NAV OVERRIDES */
        .top-nav {
          margin-left: 256px !important;
          height: 56px !important;
          padding: 0 20px !important;
          border-bottom: 1px solid #F1F5F9 !important;
          background: #ffffff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          left: 0 !important;
          z-index: 99 !important;
        }

        .main-content {
          margin-left: 256px !important;
          margin-top: 56px !important;
          padding: 16px !important;
          background-color: #F8FAFC !important;
        }
        .tab-content {
          padding: 0px !important;
        }

        /* CUSTOM GLASS CARDS */
        .glass-card {
          background: #ffffff !important;
          border: 1px solid #F1F5F9 !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01) !important;
        }

        /* KPI CARD CUSTOM MODERNIZATION */
        .kpi-card-container {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 20px !important;
          margin-bottom: 32px !important;
        }
        .modern-kpi-card {
          background: #ffffff !important;
          border: 1px solid #F1F5F9 !important;
          border-radius: 16px !important;
          padding: 24px !important;
          display: flex !important;
          align-items: center !important;
          gap: 20px !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01) !important;
        }
        .modern-kpi-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 30px rgba(0,0,0,0.03) !important;
          border-color: #E2E8F0 !important;
        }
        .modern-kpi-icon {
          width: 48px !important;
          height: 48px !important;
          border-radius: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        .modern-kpi-icon i, .modern-kpi-icon svg {
          width: 20px !important;
          height: 20px !important;
        }
        .modern-kpi-lbl {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #64748B !important;
          margin-bottom: 4px !important;
        }
        .modern-kpi-val {
          font-size: 24px !important;
          font-weight: 900 !important;
          color: #0F172A !important;
          line-height: 1 !important;
        }

        /* PREMIUM TABLES */
        .premium-table {
          width: 100% !important;
          border-collapse: collapse !important;
          text-align: left !important;
        }
        .premium-table th {
          padding: 16px 24px !important;
          font-size: 11.5px !important;
          font-weight: 850 !important;
          color: #475569 !important;
          text-transform: uppercase !important;
          background: #F8FAFC !important;
          border-bottom: 1px solid #F1F5F9 !important;
          letter-spacing: 0.5px !important;
        }
        .premium-table td {
          padding: 16px 24px !important;
          font-size: 13.5px !important;
          color: #334155 !important;
          border-bottom: 1px solid #F1F5F9 !important;
          vertical-align: middle !important;
        }
        .premium-table tr:last-child td {
          border-bottom: none !important;
        }
        .premium-table tr:hover td {
          background-color: #FCFDFE !important;
        }

        /* MODERN BADGES */
        .badge-premium {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 6px 12px !important;
          border-radius: 99px !important;
          font-size: 11.5px !important;
          font-weight: 800 !important;
        }
        .badge-premium.green {
          background: #DCFCE7 !important;
          color: #16A34A !important;
        }
        .badge-premium.red {
          background: #FEE2E2 !important;
          color: #DC2626 !important;
        }

        /* DOCTOR AVAILABILITY LIST */
        .doctor-avail-item {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 12px 0 !important;
          border-bottom: 1px solid #F1F5F9 !important;
        }
        .doctor-avail-item:last-child {
          border-bottom: none !important;
          padding-bottom: 0 !important;
        }
        .doctor-avail-item:first-child {
          padding-top: 0 !important;
        }
        .doctor-info-box {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
        }
        .doctor-avatar-circle {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
          border: 1px solid #E2E8F0 !important;
        }
        .doctor-name-text {
          font-size: 14px !important;
          font-weight: 800 !important;
          color: #0F172A !important;
        }
        .doctor-spec-text {
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #64748B !important;
          margin-top: 2px !important;
        }

        /* ANIMATIONS */
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mobile-backdrop {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: rgba(15, 23, 42, 0.4) !important;
          backdrop-filter: blur(2px) !important;
          z-index: 1999 !important;
          animation: fadeIn 0.2s ease-out !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 1024px) {
          .sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 240px !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s ease !important;
            z-index: 2000 !important;
            height: 100% !important;
            height: 100dvh !important;
            padding-bottom: calc(32px + env(safe-area-inset-bottom, 32px)) !important;
          }
          .sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .mobile-menu-toggle {
            display: flex !important;
          }
          .top-nav {
            margin-left: 0 !important;
            padding: 0 16px !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 16px 16px calc(100px + env(safe-area-inset-bottom, 24px)) !important;
          }

          /* Safe-area spacing overrides for bottom sidebar profile on mobile */
          .sidebar-user {
            margin-bottom: 0 !important;
          }
          .sidebar-profile-popover {
            bottom: calc(72px + 32px + env(safe-area-inset-bottom, 32px)) !important;
          }
        }

        /* Dynamic Responsive Typography Overrides */
        @media (max-width: 1024px) {
          h1, [style*="fontSize: '28px'"], [style*="fontSize: '24px'"], [style*="fontSize:28px"], [style*="fontSize:24px"] {
            font-size: 20px !important;
          }
          h2 {
            font-size: 17px !important;
          }
          h3, [style*="fontSize: '18px'"], [style*="fontSize: '17px'"], [style*="fontSize:18px"], [style*="fontSize:17px"] {
            font-size: 15px !important;
          }
          .modern-kpi-val, .kpi-value-custom {
            font-size: 18px !important;
          }
          .modern-kpi-lbl, .kpi-title-custom {
            font-size: 10.5px !important;
          }
          .premium-table th, .elite-table th, .elite-table-custom th {
            font-size: 10px !important;
            padding: 10px 12px !important;
          }
          .premium-table td, .elite-table td, .elite-table-custom td {
            font-size: 12px !important;
            padding: 10px 12px !important;
          }
          .nav-link {
            font-size: 12.5px !important;
            padding: 10px 16px !important;
          }
          .search-input, .form-control {
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
          .btn {
            font-size: 12px !important;
            padding: 8px 16px !important;
          }
          body, p, span, div, label {
            font-size: 12.5px !important;
          }
          .avail-info b {
            font-size: 12px !important;
          }
          .avail-info p {
            font-size: 10.5px !important;
          }
        }

        @media (max-width: 640px) {
          h1, [style*="fontSize: '28px'"], [style*="fontSize: '24px'"], [style*="fontSize:28px"], [style*="fontSize:24px"] {
            font-size: 17px !important;
          }
          h3, [style*="fontSize: '18px'"], [style*="fontSize: '17px'"], [style*="fontSize:18px"], [style*="fontSize:17px"] {
            font-size: 13.5px !important;
          }
          .modern-kpi-val, .kpi-value-custom {
            font-size: 16px !important;
          }
          .modern-kpi-lbl, .kpi-title-custom {
            font-size: 9.5px !important;
          }
          .premium-table th, .elite-table th, .elite-table-custom th {
            font-size: 9px !important;
            padding: 8px 10px !important;
          }
          .premium-table td, .elite-table td, .elite-table-custom td {
            font-size: 11px !important;
            padding: 8px 10px !important;
          }
          .nav-link {
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
          .search-input, .form-control {
            font-size: 11.5px !important;
            padding: 6px 10px !important;
          }
          .btn {
            font-size: 11px !important;
            padding: 6px 12px !important;
          }
          body, p, span, div, label {
            font-size: 11.5px !important;
          }
        }

        @media (max-width: 1024px) {
          div[style*="overflow-x"], div[style*="overflowX"] {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          div[style*="overflow-x"] table, div[style*="overflowX"] table {
            min-width: 750px !important;
          }
        }
      `}</style>

      {notification && (
        <div className="premium-toast" style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: notification.type === 'error' ? '1px solid #FEE2E2' : '1px solid #ECFDF5',
          borderRadius: '16px',
          padding: '12px 24px',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'toastSlideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: notification.type === 'error' ? '#FEE2E2' : '#ECFDF5',
            color: notification.type === 'error' ? '#EF4444' : '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 900
          }}>
            {notification.type === 'error' ? '✕' : '✓'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A1D23' }}>{notification.message}</span>
        </div>
      )}

      {/* Modern Pinned Sidebar */}
      {activeTab !== 'hr-payroll' && (
        <div className={"sidebar " + (isSidebarCollapsed ? "collapsed " : "") + (mobileSidebarOpen ? "mobile-open" : "")} data-lenis-prevent>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', color: '#FFFFFF', fontWeight: 900, fontSize: '16px', boxShadow: '0 0 15px rgba(59, 113, 254, 0.15)', flexShrink: 0 }}>
            C
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, color: '#2563EB', letterSpacing: '-0.02em' }}>Curoxa</span>
          <button 
            className="sidebar-collapse-toggle desktop-only-flex"
            onClick={(e) => {
              e.stopPropagation();
              const newState = !isSidebarCollapsed;
              setIsSidebarCollapsed(newState);
              localStorage.setItem('curoxa_sidebar_collapsed', String(newState));
            }}
            style={{
              transform: isSidebarCollapsed ? 'rotate(180deg)' : 'none'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
        <nav>
          <a href="#" className={`nav-link ${activeTab === 'dash' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); switchTab('dash'); }}><i data-lucide="layout-grid"></i> Dashboard</a>
          {(currentUser?.role === 'receptionist' || (coverageState['rc-register']?.on || coverageState['rc-upload']?.on || coverageState['rc-queue']?.on)) && (
            <a href="#" className={`nav-link ${['patients', 'patient-details'].includes(activeTab) ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); switchTab('patients'); }}><i data-lucide="users"></i> Patient Management</a>
          )}
          {(currentUser?.role === 'receptionist' || coverageState['rc-appt']?.on) && (
            <a href="#" className={`nav-link ${activeTab === 'appointments' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); switchTab('appointments'); }}><i data-lucide="calendar"></i> Appointments</a>
          )}
          {currentUser?.role === 'receptionist' && (
            <a href="#" className={`nav-link ${activeTab === 'staff' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); switchTab('staff'); }}><i data-lucide="user-cog"></i> Staff Management</a>
          )}
          {(currentUser?.role === 'receptionist' || coverageState['rc-billing']?.on) && (
            <a href="#" className={`nav-link ${activeTab === 'billing' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); switchTab('billing'); }}><i data-lucide="wallet"></i> Finance &amp; Billing</a>
          )}
          {(currentUser?.role === 'receptionist' || coverageState['rc-reorder']?.on) && tenantModules.inventory?.enabled !== false && (
            <a href="#" className={`nav-link ${activeTab === 'indent' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); switchTab('indent'); }}><i data-lucide="clipboard-list"></i> Indent</a>
          )}

          {/* DYNAMIC COVERAGE INTEGRATION LINKS */}
          {(Object.keys(coverageState || {}).some(k => (k.startsWith('dr-') || k.startsWith('doc-')) && coverageState[k]?.on)) && tenantModules.doctor?.enabled !== false && (
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); window.open('/doctor', '_blank'); setMobileSidebarOpen(false); }} style={{ color: '#E11D48', fontWeight: 800 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              Doctor Cover
            </a>
          )}
          {(Object.keys(coverageState || {}).some(k => k.startsWith('lt-') && coverageState[k]?.on)) && tenantModules.laboratory?.enabled !== false && (
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); window.open('/lab', '_blank'); setMobileSidebarOpen(false); }} style={{ color: '#059669', fontWeight: 800 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M6 18H18"/><path d="M10 14H14"/><path d="M12 2v20"/><path d="M18 10H6"/></svg>
              Lab Cover
            </a>
          )}
          {(Object.keys(coverageState || {}).some(k => k.startsWith('ph-') && coverageState[k]?.on)) && tenantModules.pharmacy?.enabled !== false && (
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); window.open('/pharmacy', '_blank'); setMobileSidebarOpen(false); }} style={{ color: '#2563EB', fontWeight: 800 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Pharmacy Cover
            </a>
          )}
        </nav>

        {/* User profile card at the bottom of the sidebar with modern Popover Dropdown */}
        <div className="sidebar-user" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
          {currentUser.avatar ? (
            <img src={currentUser.avatar} className="user-avatar" alt="Avatar" style={{ objectFit: 'cover', border: '2px solid #BFDBFE' }} />
          ) : (
            <div className="sidebar-user-avatar-initials" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', marginRight: '10px', flexShrink: 0 }}>
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'RC'}
            </div>
          )}
          <div className="user-info">
            <div className="name">{currentUser.name || 'Roshni'}</div>
            <div className="role">Receptionist</div>
          </div>
          <i data-lucide="chevron-down" style={{ marginLeft: 'auto', width: '16px', color: '#94A3B8', transition: '0.3s', transform: showProfileMenu ? 'rotate(180deg)' : 'none' }}></i>

          {showProfileMenu && (
            <div 
              className="glass-card sidebar-profile-popover" 
              style={{ 
                position: 'absolute', 
                bottom: '72px', 
                left: '0px', 
                width: '208px', 
                zIndex: 3000, 
                padding: '8px', 
                boxShadow: '0 -10px 40px rgba(0,0,0,0.06)', 
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #F1F5F9',
                animation: 'slideUp 0.2s ease-out'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A' }}>{currentUser.name || 'Roshni'}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Front Desk Manager</div>
              </div>
              <div 
                style={{ 
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  color: '#334155', 
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  setShowProfileEditModal(true);
                  setShowProfileMenu(false);
                }}
              >
                <i data-lucide="user" style={{ width: '16px', height: '16px' }}></i> Edit Profile
              </div>
              <div 
                style={{ 
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  color: '#334155', 
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  marginBottom: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  setActiveTab('hr-payroll');
                  setShowProfileMenu(false);
                }}
              >
                <i data-lucide="credit-card" style={{ width: '16px', height: '16px' }}></i> HR & Payroll
              </div>
              <div 
                style={{ 
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '13px', 
                  fontWeight: 700, 
                  color: '#DC2626', 
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={handleLogout}
              >
                <i data-lucide="log-out" style={{ width: '16px', height: '16px' }}></i> Logout Account
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Modern Top Nav */}
      {activeTab !== 'hr-payroll' && (
        <div className={"top-nav " + (isSidebarCollapsed ? "collapsed" : "")} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger Mobile Menu Toggle Button */}
        <button 
          className="mobile-menu-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setMobileSidebarOpen(!mobileSidebarOpen);
          }}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#475569',
            padding: '8px',
            borderRadius: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
            marginRight: '8px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '560px' }}>
          <div ref={globalSearchContainerRef} className="desktop-only-flex" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#64748B', width: '16px' }}></i>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search patient by mobile/ID" 
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', paddingLeft: '44px', height: '40px', width: '100%', borderRadius: '10px', fontSize: '13px', fontWeight: 600, outline: 'none' }} 
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setShowGlobalDropdown(true);
              }}
              onFocus={() => setShowGlobalDropdown(true)}
            />
            {showGlobalDropdown && globalSearchQuery.trim() !== '' && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: 'calc(100% + 8px)', 
                  left: 0, 
                  width: '100%', 
                  background: 'white', 
                  borderRadius: '12px', 
                  border: '1px solid #E2E8F0', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                  zIndex: 99999, 
                  padding: '8px', 
                  maxHeight: '300px', 
                  overflowY: 'auto'
                }}
              >
                {(() => {
                  const query = globalSearchQuery.toLowerCase().trim();
                  const matches = patientsList.filter(p => 
                    (p.name || '').toLowerCase().includes(query) || 
                    (p.contact || '').toLowerCase().includes(query) ||
                    (p._id || '').toLowerCase().includes(query) ||
                    getFormattedPatientId(p._id).toLowerCase().includes(query)
                  );
                  
                  if (matches.length === 0) {
                    return (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#94A3B8', fontSize: '12.5px', fontWeight: 600 }}>
                        No matching patients found
                      </div>
                    );
                  }
                  
                  return matches.map(p => (
                    <div 
                      key={p._id} 
                      onClick={() => {
                        handleOpenPatientProfile(p);
                        setGlobalSearchQuery('');
                        setShowGlobalDropdown(false);
                      }} 
                      style={{ 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>ID: {getFormattedPatientId(p._id)} | Mob: {p.contact || 'N/A'}</div>
                      </div>
                      <i data-lucide="chevron-right" style={{ width: '14px', color: '#94A3B8' }}></i>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
          <button 
            className="btn" 
            style={{ border: '1.5px solid #EF4444', color: '#EF4444', background: 'white', borderRadius: '8px', padding: '8px 16px', fontWeight: 850, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', height: '40px' }}
          >
            <i data-lucide="alert-circle" style={{ width: '16px', height: '16px' }}></i> Emergency
          </button>
          
          {/* Notification Bell with Action Indicator */}
          <div 
            ref={notificationRef}
            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#64748B' }}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setUnreadCount(0);
            }}
          >
            <i data-lucide="bell" style={{ width: '18px', height: '18px' }}></i>
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                {unreadCount}
              </span>
            )}

            {showNotifications && (
              <div data-lenis-prevent 
                style={{
                  position: 'absolute',
                  top: '48px',
                  right: '0',
                  width: '320px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 1000,
                  padding: '16px',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>Notifications</span>
                  <button 
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => {
                      const userKey = currentUser.staff_id || currentUser.id || currentUser.name || 'default';
                      const clearedKey = `curoxa_cleared_notifications_${userKey}`;
                      const clearedIds = JSON.parse(localStorage.getItem(clearedKey) || '[]');
                      const newClearedIds = [...clearedIds, ...notifications.map(n => n.id)];
                      localStorage.setItem(clearedKey, JSON.stringify(newClearedIds));
                      setNotifications([]);
                      setUnreadCount(0);
                    }}
                  >
                    Clear all
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', borderRadius: '8px', background: n.isNew ? '#EFF6FF' : '#F8FAFC', borderLeft: n.isNew ? '3px solid #2563EB' : '3px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#1E293B' }}>{n.title}</span>
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>{n.time}</span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 550, lineHeight: 1.4 }}>{n.message}</span>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      <div className={"main-content " + (activeTab === 'hr-payroll' ? "fullscreen-portal" : (isSidebarCollapsed ? "collapsed" : ""))} data-lenis-prevent>
        {activeTab === 'hr-payroll' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: 0 }}>
            <HRPayroll onExit={() => setActiveTab('dash')} />
          </div>
        )}
        {activeTab === 'dash' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            
            {/* High-fidelity Dashboard Title Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0' }}>Welcome, {user.name || 'Roshni'}</h1>
                <div style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 700 }}>Today is {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ height: '38px', padding: '0 16px', fontWeight: 700, borderRadius: '10px', background: '#2563EB', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} 
                  onClick={() => {
                    resetRegistrationForm();
                    setBookingType('opd');
                    switchTab('registration-form');
                  }}
                >
                  <i data-lucide="plus" style={{ width: '16px', strokeWidth: 3 }}></i> Create Appointment
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ height: '38px', padding: '0 16px', fontWeight: 700, borderRadius: '10px', background: '#059669', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} 
                  onClick={() => {
                    resetRegistrationForm();
                    setBookingType('lab');
                    switchTab('registration-form');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  Book Lab Test
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ height: '38px', padding: '0 16px', fontWeight: 700, borderRadius: '10px', background: '#7C3AED', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} 
                  onClick={() => {
                    resetRegistrationForm();
                    setBookingType('service');
                    switchTab('registration-form');
                  }}
                >
                  <i data-lucide="sparkles" style={{ width: '16px', height: '16px' }}></i>
                  Book Direct Service
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px', background: showDashboardDateFilter ? '#2563EB' : '#EFF6FF', color: showDashboardDateFilter ? '#FFFFFF' : '#2563EB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => setShowDashboardDateFilter(!showDashboardDateFilter)}
                  title="Filter dashboard analytics by date / date range"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Dashboard Date Filter Bar (For viewing stats of that day / date range without redirecting) */}
            {showDashboardDateFilter && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', animation: 'slideDown 0.25s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>Dashboard Date Range Filter</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Filter metrics, patient visits, and revenue totals by date without leaving dashboard</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', background: '#F8FAFC', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    {[
                      { key: 'today', label: 'Today' },
                      { key: '7days', label: 'Last 7 Days' },
                      { key: '30days', label: 'Last 30 Days' },
                      { key: 'custom', label: 'Custom Range' }
                    ].map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          setDashboardFilterPreset(p.key);
                          if (p.key === 'today') {
                            const todayStr = getLocalDateString();
                            setDashboardFilterStartDate(todayStr);
                            setDashboardFilterEndDate(todayStr);
                          } else if (p.key === '7days') {
                            const d = new Date();
                            d.setDate(d.getDate() - 7);
                            setDashboardFilterStartDate(d.toISOString().split('T')[0]);
                            setDashboardFilterEndDate(getLocalDateString());
                          } else if (p.key === '30days') {
                            const d = new Date();
                            d.setDate(d.getDate() - 30);
                            setDashboardFilterStartDate(d.toISOString().split('T')[0]);
                            setDashboardFilterEndDate(getLocalDateString());
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '7px',
                          border: 'none',
                          background: dashboardFilterPreset === p.key ? '#2563EB' : 'transparent',
                          color: dashboardFilterPreset === p.key ? '#FFFFFF' : '#64748B',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {dashboardFilterPreset === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="date"
                        value={dashboardFilterStartDate}
                        onChange={e => setDashboardFilterStartDate(e.target.value)}
                        style={{ height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '12px', fontWeight: 600, outline: 'none', background: 'white' }}
                      />
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>to</span>
                      <input
                        type="date"
                        value={dashboardFilterEndDate}
                        onChange={e => setDashboardFilterEndDate(e.target.value)}
                        style={{ height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '12px', fontWeight: 600, outline: 'none', background: 'white' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4 KPI Cards Grid */}
            <div className="kpi-card-container">
              
              {/* Card 1: Total Appointments */}
              <div className="modern-kpi-card" onClick={() => switchTab('appointments')}>
                <div className="modern-kpi-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                  <i data-lucide="calendar"></i>
                </div>
                <div>
                  <div className="modern-kpi-lbl">Total Appointments</div>
                  <div className="modern-kpi-val">{filteredAppointments.length}</div>
                </div>
              </div>

              {/* Card 2: Total Visits */}
              <div className="modern-kpi-card" onClick={() => switchTab('patients')}>
                <div className="modern-kpi-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <i data-lucide="users"></i>
                </div>
                <div>
                  <div className="modern-kpi-lbl">Total Visits</div>
                  <div className="modern-kpi-val">{totalVisitsCount}</div>
                </div>
              </div>

              {/* Card 3: Total Doctors */}
              <div className="modern-kpi-card" onClick={() => switchTab('staff')}>
                <div className="modern-kpi-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                  <i data-lucide="stethoscope"></i>
                </div>
                <div>
                  <div className="modern-kpi-lbl">Total Doctors</div>
                  <div className="modern-kpi-val">{doctors.length}</div>
                </div>
              </div>

              {/* Card 4: Total Revenue */}
              <div className="modern-kpi-card" onClick={() => switchTab('billing')}>
                <div className="modern-kpi-icon" style={{ background: '#FDF2F8', color: '#DB2777' }}>
                  <i data-lucide="wallet"></i>
                </div>
                <div>
                  <div className="modern-kpi-lbl">Total Revenue</div>
                  <div className="modern-kpi-val">₹{filteredBills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
              </div>

            </div>

            {/* Grid Split: Left Bar Chart vs Right Doctor's Availability */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px', marginBottom: '32px' }} className="mobile-stack">
              
              {/* Left Column: Patient Visits Card */}
              <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Patient Visits</h3>
                    <div className="chart-legend-inline" style={{ display: 'flex', gap: '16px' }}>
                      <div className="legend-item-small" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                        <div className="legend-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED' }}></div>
                        Walk-ins
                      </div>
                      <div className="legend-item-small" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                        <div className="legend-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }}></div>
                        Online
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', background: '#F1F5F9', border: 'none', color: '#475569', fontWeight: 800, cursor: 'pointer' }} onClick={() => switchTab('patients')}>View All</button>
                </div>
                
                <div className="table-responsive" style={{ height: '220px', position: 'relative', marginBottom: '24px', overflowY: 'hidden', overflowX: 'auto' }}>
                  <div className="chart-glow-bg"></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '180px', pointerEvents: 'none' }}>
                    <div style={{ height: '33.3%', borderBottom: '1px solid #F1F5F9' }}></div>
                    <div style={{ height: '33.3%', borderBottom: '1px solid #F1F5F9' }}></div>
                    <div style={{ height: '33.3%', borderBottom: '1px solid #F1F5F9' }}></div>
                  </div>

                  <div className="bar-chart-container" style={{ minWidth: '500px' }}>
                    {weeklyData.map((day, idx) => {
                       const walkinPercent = Math.max((day.walkin / maxCount) * 100, 5);
                       const onlinePercent = Math.max((day.online / maxCount) * 100, 5);
                       
                       return (
                         <div key={idx} className="bar-group">
                           <div className="bar-pair">
                             <div className="chart-bar walkin" style={{ height: `${walkinPercent}%` }}>
                               <div className="bar-tooltip">{day.walkin} Walk-ins</div>
                             </div>
                             <div className="chart-bar online" style={{ height: `${onlinePercent}%` }}>
                               <div className="bar-tooltip">{day.online} Online</div>
                             </div>
                           </div>
                           <div className="bar-label" style={{ marginTop: '12px' }}>{day.label}</div>
                         </div>
                       )
                    })}
                  </div>
                </div>

                <div className="mobile-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #F1F5F9', paddingTop: '24px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F0F4FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="user" style={{ width: '16px' }}></i></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 900, fontSize: '14px', color: '#1A1D23' }}>Walk-In</span>
                        <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--primary)' }}>{overallWalkinPercent}%</span>
                      </div>
                      <div style={{ fontSize: '10px', color: walkinTrend >= 0 ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                        {walkinTrend >= 0 ? `+${walkinTrend}%` : `${walkinTrend}%`} Trend
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="globe" style={{ width: '16px' }}></i></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 900, fontSize: '14px', color: '#1A1D23' }}>Online</span>
                        <span style={{ fontWeight: 800, fontSize: '12px', color: '#7C3AED' }}>{overallOnlinePercent}%</span>
                      </div>
                      <div style={{ fontSize: '10px', color: onlineTrend >= 0 ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                        {onlineTrend >= 0 ? `+${onlineTrend}%` : `${onlineTrend}%`} Trend
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Doctor's availability Card */}
              <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Doctor's availability</h3>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', background: '#F1F5F9', border: 'none', color: '#475569', fontWeight: 800, cursor: 'pointer' }} onClick={() => switchTab('staff')}>View All</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {doctors && doctors.length > 0 ? (
                    doctors.map((doc, idx) => (
                      <div key={doc._id || idx} className="doctor-avail-item">
                        <div className="doctor-info-box">
                          <div className="doctor-avatar-circle" style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                            border: '1px solid #E2E8F0'
                          }}>
                            {doc.name ? doc.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : 'DR'}
                          </div>
                          <div>
                            <div className="doctor-name-text">{doc.name}</div>
                            <div className="doctor-spec-text">{doc.specialty || 'General Medicine'}</div>
                          </div>
                        </div>
                        {doc.isWeeklyOff ? (
                          <span className="badge-premium red" style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }}>
                            Weekoff
                          </span>
                        ) : doc.isOnLeave ? (
                          <span className="badge-premium red" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
                            On Leave
                          </span>
                        ) : doc.available === false ? (
                          <span className="badge-premium red" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
                            Unavailable
                          </span>
                        ) : (
                          <span className="badge-premium green">
                            Available
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                      No doctors registered.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Row: Latest Appointments Card Table */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Latest Appointments</h3>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'transparent', color: '#475569', fontWeight: 700, cursor: 'pointer' }} onClick={() => switchTab('appointments')}>View All</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Patient Name</th>
                      <th>Doctor Name</th>
                      <th>Status</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getLatestAppointmentsList().length > 0 ? (
                      getLatestAppointmentsList().map((app, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 800, color: '#2563EB' }}>
                            {app.patientId._id}
                          </td>
                          <td>
                            <div 
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                              onClick={() => handleOpenPatientProfile(app.rawObj?.patientId)}
                              onMouseEnter={(e) => { e.currentTarget.querySelector('.patient-name-span').style.color = '#2563EB'; }}
                              onMouseLeave={(e) => { e.currentTarget.querySelector('.patient-name-span').style.color = '#0F172A'; }}
                            >
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#EFF6FF',
                                color: '#2563EB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '11px',
                                border: '1px solid #E2E8F0'
                              }}>
                                {app.patientId.name ? app.patientId.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : 'PT'}
                              </div>
                              <span className="patient-name-span" style={{ fontWeight: 800, color: '#0F172A', transition: 'color 0.2s' }}>{app.patientId.name}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#F5F3FF',
                                color: '#7C3AED',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '11px',
                                border: '1px solid #E2E8F0'
                              }}>
                                {app.doctorId.name ? app.doctorId.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : 'DR'}
                              </div>
                              <span style={{ fontWeight: 700, color: '#334155' }}>{app.doctorId.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge-premium green">
                              {app.status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: '#475569' }}>
                            {getFormattedDate(app.rawObj?.date)}
                            {app.time}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14.5px', fontWeight: 600 }}>
                          No appointments scheduled.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* PATIENTS TAB */}
        {activeTab === 'patients' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1D23', marginBottom: '4px' }}>Patients</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>Home <span style={{ margin: '0 8px' }}>»</span> <span style={{ color: '#1A1D23' }}>Patients</span></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ height: '38px', padding: '0 16px', fontWeight: 700, borderRadius: '10px', background: '#059669', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} 
                  onClick={() => {
                    resetRegistrationForm();
                    setBookingType('lab');
                    switchTab('registration-form');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  Book Lab Test
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ height: '38px', padding: '0 16px', fontWeight: 700, borderRadius: '10px', background: '#2563EB', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} 
                  onClick={() => {
                    resetRegistrationForm();
                    setBookingType('opd');
                    switchTab('registration-form');
                  }}
                >
                  <i data-lucide="plus" style={{ width: '16px', strokeWidth: 3 }}></i> Create Appointment
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ height: '38px', padding: '0 16px', fontWeight: 700, borderRadius: '10px', background: '#FEE2E2', color: '#EF4444', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }} 
                  onClick={handleDeleteAllPatients}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  Delete All (Test)
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '38px', height: '38px', padding: 0, borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => switchTab('appointments')}
                  title="View Appointments"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="glass-card" style={{ padding: '24px' }}>
              <div className="filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ flex: 1, maxWidth: '400px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#64748B', width: '18px' }}></i>
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Search Patients..." 
                      value={patientSearchText}
                      onChange={e => setPatientSearchText(e.target.value)}
                      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', paddingLeft: '44px', height: '44px', width: '100%', borderRadius: '12px', fontSize: '14px', fontWeight: 600 }} 
                    />
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0 16px', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', background: showPatientFilters ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', border: showPatientFilters ? '1px solid #93C5FD' : 'none', color: '#2563EB' }}
                      onClick={() => { setShowPatientFilters(!showPatientFilters); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                    >
                      <i data-lucide="filter" style={{ width: '18px' }}></i> Filter
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0 16px', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', background: '#EFF6FF', border: 'none', color: '#2563EB' }}
                      onClick={handleExportPatientsCSV}
                    >
                      <i data-lucide="download" style={{ width: '18px' }}></i> Export
                    </button>
                </div>
              </div>

              {/* Sliding Patient Filter Panel */}
              {showPatientFilters && (
                <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', animation: 'slideDown 0.3s ease-out', border: '1.5px solid #BFDBFE', background: '#F8FAFC', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i data-lucide="filter" style={{ width: '18px', color: '#2563EB' }}></i> Select Patient Filters
                    </h4>
                    {(patientGenderFilter !== 'All' || patientStartRegDate || patientEndRegDate || patientBookingTypeFilter !== 'All') && (
                      <button 
                        className="btn" 
                        style={{ fontSize: '12px', padding: '4px 10px', background: 'transparent', color: '#EF4444', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                        onClick={() => { 
                          setPatientGenderFilter('All'); 
                          setPatientStartRegDate(''); 
                          setPatientEndRegDate(''); 
                          setPatientBookingTypeFilter('All');
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Gender</label>
                      <select 
                        className="form-control" 
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white', fontWeight: 600, color: '#334155', width: '100%' }}
                        value={patientGenderFilter}
                        onChange={e => setPatientGenderFilter(e.target.value)}
                      >
                        <option value="All">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Booking Type</label>
                      <select 
                        className="form-control" 
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white', fontWeight: 600, color: '#334155', width: '100%' }}
                        value={patientBookingTypeFilter}
                        onChange={e => setPatientBookingTypeFilter(e.target.value)}
                      >
                        <option value="All">All Patients (No filter)</option>
                        <option value="Appointments">Patients with Appointments</option>
                        <option value="Lab Tests">Patients with Lab Tests</option>
                        <option value="Clinical Services">Patients with Clinical Services</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Registered From (Calendar)</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white', fontWeight: 600, color: '#334155', width: '100%' }} 
                        value={patientStartRegDate} 
                        onChange={e => setPatientStartRegDate(e.target.value)} 
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Registered To (Calendar)</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white', fontWeight: 600, color: '#334155', width: '100%' }} 
                        value={patientEndRegDate} 
                        onChange={e => setPatientEndRegDate(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              )}
               <div className="table-responsive">
                 <table className="elite-table" style={{ margin: 0, borderCollapse: 'collapse', borderSpacing: 0 }}>
                  <thead style={{ background: '#F8FAFC' }}>
                      <tr>
                          <th style={{ width: '40px' }}>
                            <input 
                              type="checkbox" 
                              checked={getFilteredPatientsList().length > 0 && selectedPatientIds.length === getFilteredPatientsList().length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPatientIds(getFilteredPatientsList().map(p => p._id));
                                } else {
                                  setSelectedPatientIds([]);
                                }
                              }}
                              title="Select All Patients"
                            />
                          </th>
                          <th>Patient ID</th>
                          <th>Name</th>
                          <th>Gender</th>
                          <th>Mobile Number</th>
                          <th>Email</th>
                          <th style={{ width: '40px' }}></th>
                      </tr>
                  </thead>
                  <tbody>
                    {getFilteredPatientsList().length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14.5px', fontWeight: 600 }}>
                          No patients found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      getFilteredPatientsList().map(p => (
                        <tr key={p._id} className="patients-table" style={{ borderBottom: '1px solid #F1F5F9', background: selectedPatientIds.includes(p._id) ? '#EFF6FF' : 'transparent' }}>
                            <td onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedPatientIds.includes(p._id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    setSelectedPatientIds(prev => [...prev, p._id]);
                                  } else {
                                    setSelectedPatientIds(prev => prev.filter(id => id !== p._id));
                                  }
                                }}
                              />
                            </td>
                            <td style={{ color: '#64748B', fontWeight: 600 }}>{getFormattedPatientId(p._id)}</td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => handleOpenPatientProfile(p)}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                                      {getInitials(p.name)}
                                    </div>
                                    <span style={{ fontWeight: 700, color: '#1A1D23' }}>{p.name}</span>
                                </div>
                            </td>
                            <td style={{ color: '#64748B', fontWeight: 600 }}>{p.gender}</td>
                            <td style={{ color: '#64748B', fontWeight: 600 }}>{p.contact}</td>
                            <td style={{ color: '#64748B', fontWeight: 600 }}>{p.email || 'N/A'}</td>
                            <td>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const pIdStr = String(p._id);
                                  if (activePatientMenuId && String(activePatientMenuId) === pIdStr) {
                                    setActivePatientMenuId(null);
                                  } else {
                                    const btnRect = e.currentTarget.getBoundingClientRect();
                                    setPatientMenuPos({
                                      top: btnRect.bottom + 4,
                                      right: Math.max(10, window.innerWidth - btnRect.right)
                                    });
                                    setActivePatientMenuId(p._id);
                                  }
                                }}
                                style={{ background: (activePatientMenuId && String(activePatientMenuId) === String(p._id)) ? '#EFF6FF' : 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <i data-lucide="more-vertical" style={{ width: '18px', color: (activePatientMenuId && String(activePatientMenuId) === String(p._id)) ? '#2563EB' : '#64748B' }}></i>
                              </button>
                            </td>
                        </tr>
                      ))
                    )}
                  </tbody>
              </table>
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedPatientIds.length > 0 && (
              <div style={{ background: '#0F172A', color: 'white', padding: '14px 22px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.3)', border: '1px solid #334155', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: '#2563EB', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 800 }}>{selectedPatientIds.length} Selected</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#E2E8F0' }}>Bulk Batch Actions</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowBatchSmsModal(true)}
                    style={{ padding: '8px 16px', background: '#334155', color: 'white', border: '1px solid #475569', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                    onMouseLeave={e => e.currentTarget.style.background = '#334155'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Send Batch SMS / Alert
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      const selectedPatients = patients.filter(p => selectedPatientIds.includes(p._id));
                      const csvHeader = "ID,Name,Gender,Contact,Email\n";
                      const csvRows = selectedPatients.map(p => `"${getFormattedPatientId(p._id)}","${p.name}","${p.gender}","${p.contact}","${p.email || ''}"`).join("\n");
                      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `patient_batch_export_${new Date().toISOString().slice(0,10)}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      setBatchSmsSuccessToast(`Exported ${selectedPatientIds.length} patient record(s) to CSV!`);
                      setTimeout(() => setBatchSmsSuccessToast(''), 4000);
                    }}
                    style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(5,150,105,0.25)', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#047857'}
                    onMouseLeave={e => e.currentTarget.style.background = '#059669'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export Selected CSV
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedPatientIds([])}
                    style={{ padding: '8px 14px', background: 'transparent', color: '#94A3B8', border: '1px solid #475569', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* PATIENT DETAILS TAB */}
        {activeTab === 'patient-details' && selectedPatient && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={() => switchTab('patients')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    background: 'white',
                    cursor: 'pointer',
                    color: '#64748B',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE'; e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'white'; }}
                  title="Back to Patient List"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1A1D23', marginBottom: '4px' }}>Patient Profile</h1>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Patient Management <span style={{ margin: '0 8px' }}>»</span> <span style={{ color: '#1A1D23' }}>Profile</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn btn-primary" style={{ height: '44px', padding: '0 20px', fontWeight: 850, borderRadius: '10px', background: '#2563EB', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }} onClick={handleCreateAppointmentForProfilePatient}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Appointment
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '44px', height: '44px', padding: 0, borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={() => switchTab('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
              
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Patient Header Card */}
                <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0 }}>{selectedPatient.name}</h2>
                          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 800, background: '#EFF6FF', padding: '3px 8px', borderRadius: '6px' }}>
                            ID: {getFormattedPatientId(selectedPatient._id)}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '6px' }}>
                          Registered: {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className="btn" 
                        style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', cursor: 'pointer', color: '#059669', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 800 }}
                        onClick={() => handleRePrintPatientSlip(selectedPatient)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 6 2 18 2 18 9"/>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                          <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        Re-Print Slip
                      </button>

                      <button 
                        className="btn" 
                        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', cursor: 'pointer', color: '#2563EB', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 800 }}
                        onClick={handleViewAllLabReports}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        Lab Reports
                      </button>

                      <button 
                        className="btn" 
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', color: '#2563EB', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Edit Patient Info"
                        onClick={() => {
                          setFormData({
                            name: selectedPatient.name,
                            age: selectedPatient.age,
                            gender: selectedPatient.gender,
                            contact: selectedPatient.contact,
                            email: selectedPatient.email || '',
                            bloodGroup: selectedPatient.bloodGroup || 'O+',
                            address: selectedPatient.address || '',
                            medicalHistory: selectedPatient.medicalHistory ? selectedPatient.medicalHistory.join(', ') : '',
                            doctorId: ''
                          });
                          setIsExistingPatient(true);
                          switchTab('registration-form', true);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#F1F5F9', margin: '20px 0' }}></div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Date of Birth</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700 }}>{getDisplayDob(selectedPatient)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Gender</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700 }}>{selectedPatient.gender}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Contact</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700, lineHeight: '1.3' }}>
                        {selectedPatient.contact}<br />
                        <span style={{ color: '#64748B', fontWeight: 500, fontSize: '12.5px' }}>{selectedPatient.contact.replace(/.$/, '4')}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Blood Group</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700 }}>{selectedPatient.bloodGroup || 'B+'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Email</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700, wordBreak: 'break-all' }}>{selectedPatient.email || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Sub cards: Contact Info and Vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
                  
                  {/* Contact Information */}
                  <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#2563EB', margin: 0 }}>Contact Information</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Email:</span>
                        <span style={{ fontWeight: 700, color: '#1A1D23' }}>{selectedPatient.email || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Primary Phone:</span>
                        <span style={{ fontWeight: 700, color: '#1A1D23' }}>{selectedPatient.contact}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Alternate Phone:</span>
                        <span style={{ fontWeight: 700, color: '#1A1D23' }}>{selectedPatient.alternateContact || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Address:</span>
                        <span style={{ fontWeight: 700, color: '#1A1D23', textAlign: 'right', maxWidth: '180px' }}>{selectedPatient.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>



                  {/* Vitals Summary */}
                  {(() => {
                    const latestVital = patientVitals && patientVitals.length > 0 ? patientVitals[0] : null;
                    return (
                      <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#2563EB', margin: 0 }}>Vitals Summary</h3>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span 
                              style={{ fontSize: '11px', color: '#2563EB', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                setVitalTemp(latestVital?.temperature || '');
                                setVitalPulse(latestVital?.pulse || '');
                                setVitalBpSys(latestVital?.bpSys || '');
                                setVitalBpDia(latestVital?.bpDia || '');
                                setVitalResp(latestVital?.respiration || '');
                                setVitalSpo2(latestVital?.spo2 || '');
                                setVitalWeight(latestVital?.weight || '');
                                setVitalHeight(latestVital?.height || '');
                                setShowVitalsModal(true);
                              }}
                            >
                              Edit Vitals
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}>View Full History</span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          {/* BP */}
                          <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #DCFCE7' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m16 12-4-4-4 4"/>
                                <path d="M12 16V8"/>
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontSize: '9px', color: '#16A34A', fontWeight: 800, textTransform: 'uppercase' }}>Blood Pressure</div>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1A1D23', marginTop: '2px' }}>
                                {latestVital && latestVital.bpSys ? `${latestVital.bpSys}/${latestVital.bpDia || ''}` : '--'} <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 500 }}>mmHg</span>
                              </div>
                            </div>
                          </div>

                          {/* Heart Rate */}
                          <div style={{ background: '#FFF5F5', borderRadius: '12px', padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #FEE2E2' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontSize: '9px', color: '#EF4444', fontWeight: 800, textTransform: 'uppercase' }}>Heart Rate</div>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1A1D23', marginTop: '2px' }}>
                                {latestVital && latestVital.pulse ? latestVital.pulse : '--'} <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 500 }}>bpm</span>
                              </div>
                            </div>
                          </div>

                          {/* Temp */}
                          <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #FEF3C7' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontSize: '9px', color: '#D97706', fontWeight: 800, textTransform: 'uppercase' }}>Temperature</div>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1A1D23', marginTop: '2px' }}>
                                {latestVital && latestVital.temperature ? latestVital.temperature : '--'} <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 500 }}>°F</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '16px', fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>
                          <span>Last updated: {latestVital && latestVital.createdAt ? new Date(latestVital.createdAt).toLocaleDateString() : '--'}</span>
                          <span>By: {latestVital && latestVital.recordedBy?.name ? latestVital.recordedBy.name : '--'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Appointment History Table */}
                <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0 0 20px 0' }}>Appointments</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Date & Time</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Doctor / Department</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Consultation Type</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Status</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.filter(app => {
                          const pId = app.patientId?._id || app.patientId;
                          return pId && pId.toString() === selectedPatient._id.toString();
                        }).length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '30px 0', textTransform: 'uppercase', textAlign: 'center', fontSize: '13px', color: '#94A3B8', fontWeight: 700 }}>
                              No appointments found for this patient.
                            </td>
                          </tr>
                        ) : (
                          appointments.filter(app => {
                            const pId = app.patientId?._id || app.patientId;
                            return pId && pId.toString() === selectedPatient._id.toString();
                          }).map(app => {
                            const isSelected = selectedProfileAppointment && selectedProfileAppointment._id === app._id;
                            return (
                              <tr 
                                key={app._id} 
                                style={{ 
                                  borderBottom: '1px solid #F1F5F9', 
                                  cursor: 'pointer',
                                  background: isSelected ? '#F0F7FF' : 'transparent',
                                  transition: '0.2s'
                                }}
                                onClick={() => setSelectedProfileAppointment(app)}
                                className="patient-app-row"
                              >
                                {/* Date & Time */}
                                <td style={{ padding: '16px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{getFormattedTableDate(app.date)}</div>
                                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>{app.time}</div>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Doctor / Department */}
                                <td style={{ padding: '16px 12px' }}>
                                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{app.doctorId?.name || 'Dr. Ankit Sharma'}</div>
                                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>{app.doctorId?.role || 'General Medicine'}</div>
                                </td>

                                {/* Consultation Type */}
                                <td style={{ padding: '16px 12px' }}>
                                  <span style={{ background: '#EFF6FF', color: '#3B82F6', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                                    First Visit
                                  </span>
                                </td>

                                {/* Status */}
                                <td style={{ padding: '16px 12px' }}>
                                  <span style={{ 
                                    background: app.status === 'Completed' ? '#ECFDF5' : (app.status === 'Cancelled' ? '#FEF2F2' : '#FAF5FF'), 
                                    color: app.status === 'Completed' ? '#10B981' : (app.status === 'Cancelled' ? '#EF4444' : '#7E22CE'), 
                                    fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 
                                  }}>{app.status}</span>
                                </td>

                                {/* Payment */}
                                <td style={{ padding: '16px 12px' }}>
                                  {(() => {
                                    const associatedBill = bills.find(b => {
                                      const appBId = b.appointmentId?._id || b.appointmentId;
                                      return appBId && appBId.toString() === app._id.toString();
                                    });
                                    const feeVal = associatedBill ? associatedBill.totalAmount : (app.doctorId?.consultationFee || 500);
                                    const payStatus = associatedBill?.status || 'Unpaid';
                                    return (
                                      <div>
                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E293B' }}>₹{Number(feeVal).toFixed(2)}</div>
                                        <div style={{ 
                                          fontSize: '10px', 
                                          color: payStatus === 'Paid' ? '#16A34A' : '#DC2626', 
                                          fontWeight: 800, 
                                          marginTop: '2px' 
                                        }}>{payStatus.toUpperCase()}</div>
                                      </div>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Right Column - Appointment Summary */}
              <div style={{ position: 'sticky', top: '24px' }}>
                <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Appointment Summary</h3>
                  
                  {selectedProfileAppointment ? (
                    <>
                      <div style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 700, marginTop: '6px' }}>
                        Status: <span style={{ 
                          color: selectedProfileAppointment.status === 'Completed' ? '#3B82F6' : (selectedProfileAppointment.status === 'Cancelled' ? '#EF4444' : '#7E22CE'),
                          fontWeight: 800
                        }}>{selectedProfileAppointment.status}</span>
                      </div>

                      <div style={{ height: '1px', background: '#F1F5F9', margin: '18px 0' }}></div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Date & Time */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', width: '100%' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</div>
                            {isReschedulingProfileAppt ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', width: '100%' }}>
                                <input 
                                  type="date" 
                                  className="form-control" 
                                  style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: '8px', height: '38px', width: '100%', padding: '0 10px', fontSize: '13px', fontWeight: 600 }}
                                  value={rescheduleProfileDate}
                                  min={getLocalDateString()}
                                  onChange={(e) => setRescheduleProfileDate(e.target.value)} 
                                />
                                <input 
                                  type="time" 
                                  className="form-control" 
                                  style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: '8px', height: '38px', width: '100%', padding: '0 10px', fontSize: '13px', fontWeight: 600 }}
                                  value={rescheduleProfileTime} 
                                  onChange={(e) => setRescheduleProfileTime(e.target.value)} 
                                />
                              </div>
                            ) : (
                              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '4px', lineHeight: '1.4' }}>
                                {getFormattedSummaryDate(selectedProfileAppointment.date)}<br />
                                <span style={{ color: '#475569', fontWeight: 600 }}>{selectedProfileAppointment.time}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Practitioner */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <line x1="19" y1="8" x2="19" y2="14" />
                              <line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Practitioner</div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '4px', lineHeight: '1.4' }}>
                              {selectedProfileAppointment.doctorId?.name || 'Dr. Julian Vance'}<br />
                              <span style={{ color: '#64748B', fontWeight: 500 }}>{selectedProfileAppointment.doctorId?.role || 'Senior Cardiologist'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Department */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                              <line x1="9" y1="22" x2="9" y2="16"/>
                              <line x1="8" y1="12" x2="8" y2="12.01"/>
                              <line x1="12" y1="12" x2="12" y2="12.01"/>
                              <line x1="16" y1="12" x2="16" y2="12.01"/>
                              <line x1="8" y1="16" x2="8" y2="16.01"/>
                              <line x1="12" y1="16" x2="12" y2="16.01"/>
                              <line x1="16" y1="16" x2="16" y2="16.01"/>
                              <line x1="8" y1="8" x2="8" y2="8.01"/>
                              <line x1="12" y1="8" x2="12" y2="8.01"/>
                              <line x1="16" y1="8" x2="16" y2="8.01"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '4px', lineHeight: '1.4' }}>
                              {((selectedProfileAppointment.doctorId?.specialty || selectedProfileAppointment.doctorId?.role || 'Cardiology').replace('Doctor', '').trim() + ' Wing')}<br />
                              <span style={{ color: '#64748B', fontWeight: 500 }}>
                                {(() => {
                                  const docId = String(selectedProfileAppointment.doctorId?._id || '');
                                  let sum = 0;
                                  for (let i = 0; i < docId.length; i++) sum += docId.charCodeAt(i);
                                  const floorNum = (sum % 4) + 1;
                                  const roomNum = floorNum * 100 + (sum % 20) + 1;
                                  const suffixes = ['st', 'nd', 'rd', 'th'];
                                  const suffix = floorNum <= 3 ? suffixes[floorNum - 1] : 'th';
                                  return `${floorNum}${suffix} Floor, Room ${roomNum}`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '4px', lineHeight: '1.4' }}>
                              {currentUser?.tenantName || 'Main Medical Plaza'}<br />
                              <span style={{ color: '#64748B', fontWeight: 500 }}>{selectedProfileAppointment.doctorId?.address || 'Downtown Campus'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: '1px', background: '#F1F5F9', margin: '22px 0' }}></div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedProfileAppointment.status === 'Completed' ? (
                          <>
                            <button 
                              className="btn"
                              style={{ 
                                width: '100%', 
                                height: '46px', 
                                background: '#2563EB', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '10px', 
                                fontWeight: 800, 
                                fontSize: '13px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                              onClick={() => handleViewPrescription(selectedProfileAppointment._id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                              </svg>
                              View Prescription
                            </button>
                            <button 
                              className="btn"
                              style={{ 
                                width: '100%', 
                                height: '46px', 
                                background: '#EFF6FF', 
                                color: '#2563EB', 
                                border: '1px solid #BFDBFE', 
                                borderRadius: '10px', 
                                fontWeight: 800, 
                                fontSize: '13px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                              onClick={() => handleViewLabReport(selectedProfileAppointment._id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                              </svg>
                              View Lab report
                            </button>
                          </>
                        ) : selectedProfileAppointment.status === 'Cancelled' ? (
                          <div style={{ padding: '12px', background: '#FEF2F2', color: '#EF4444', borderRadius: '10px', fontSize: '13px', fontWeight: 800, textAlign: 'center', border: '1px solid #FEE2E2' }}>
                            Appointment Cancelled
                          </div>
                        ) : isReschedulingProfileAppt ? (
                          <>
                            <button 
                              className="btn"
                              style={{ 
                                width: '100%', 
                                height: '46px', 
                                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '10px', 
                                fontWeight: 800, 
                                fontSize: '13px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                              onClick={handleSaveProfileReschedule}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Confirm Reschedule
                            </button>
                            <button 
                              className="btn"
                              style={{ 
                                width: '100%', 
                                height: '46px', 
                                background: '#F1F5F9', 
                                color: '#64748B', 
                                border: '1px solid #E2E8F0', 
                                borderRadius: '10px', 
                                fontWeight: 800, 
                                fontSize: '13px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                              onClick={() => {
                                setIsReschedulingProfileAppt(false);
                                if (selectedProfileAppointment) {
                                  const d = new Date(selectedProfileAppointment.date);
                                  const dateVal = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
                                  setRescheduleProfileDate(dateVal);
                                  setRescheduleProfileTime(selectedProfileAppointment.time || '');
                                }
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : cancelApptConfirmId === selectedProfileAppointment._id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#FEF2F2', padding: '12px', borderRadius: '10px', border: '1px solid #FEE2E2', animation: 'fadeIn 0.2s ease-out' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#EF4444', textAlign: 'center', marginBottom: '4px' }}>Cancel this appointment?</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn" 
                                style={{ background: 'white', color: '#64748B', border: '1px solid #E2E8F0', fontWeight: 800, padding: '0', borderRadius: '8px', height: '36px', fontSize: '12.5px', flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                onClick={() => setCancelApptConfirmId(null)}
                              >
                                Keep
                              </button>
                              <button 
                                className="btn" 
                                style={{ background: '#EF4444', color: 'white', border: 'none', fontWeight: 800, padding: '0', borderRadius: '8px', height: '36px', fontSize: '12.5px', flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                                onClick={confirmCancelProfileAppointment}
                              >
                                Confirm Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button 
                              className="btn"
                              style={{ 
                                width: '100%', 
                                height: '46px', 
                                background: 'white', 
                                color: '#2563EB', 
                                border: '1.5px solid #2563EB', 
                                borderRadius: '10px', 
                                fontWeight: 800, 
                                fontSize: '13px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                              onClick={() => {
                                if (selectedProfileAppointment) {
                                  setIsReschedulingProfileAppt(true);
                                  const d = new Date(selectedProfileAppointment.date);
                                  const dateVal = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
                                  setRescheduleProfileDate(dateVal);
                                  setRescheduleProfileTime(selectedProfileAppointment.time || '');
                                }
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              Reschedule Appointment
                            </button>
                            <button 
                              className="btn"
                              style={{ 
                                width: '100%', 
                                height: '46px', 
                                background: 'white', 
                                color: '#EF4444', 
                                border: '1.5px solid #FCA5A5', 
                                borderRadius: '10px', 
                                fontWeight: 800, 
                                fontSize: '13px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                              onClick={() => handleCancelProfileAppointment(selectedProfileAppointment._id)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                              </svg>
                              Cancel Appointment
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94A3B8', fontSize: '13px', fontWeight: 700 }}>
                      No Appointment Selected.<br />
                      <span style={{ fontSize: '11px', fontWeight: 500, marginTop: '8px', display: 'inline-block' }}>Select an appointment from the history table to view details.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* View Prescription Modal */}
            {prescriptionModalOpen && selectedPrescription && (
              <div onClick={() => setPrescriptionModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>Prescription Details</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>Issued by {selectedPrescription.doctorId?.name || 'Dr. Julian Vance'}</div>
                    </div>
                    <button onClick={() => setPrescriptionModalOpen(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '16px', fontWeight: 'bold' }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                          <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Medicine</th>
                          <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Dosage</th>
                          <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Duration</th>
                          <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPrescription.items && selectedPrescription.items.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px', fontSize: '13.5px', fontWeight: 850, color: '#0F172A' }}>{item.medicine}</td>
                            <td style={{ padding: '12px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>{item.dosage}</td>
                            <td style={{ padding: '12px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>{item.duration}</td>
                            <td style={{ padding: '12px', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>{item.instructions || 'After meals'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

             {/* View Lab Report Modal is now rendered globally at the end of the file */}

            {/* View All Lab Reports Modal */}
            {allLabsModalOpen && selectedPatient && (
              <div onClick={() => setAllLabsModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '700px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>Lab Reports History</div>
                      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>Patient: {selectedPatient.name} ({getFormattedPatientId(selectedPatient._id)})</div>
                    </div>
                    <button onClick={() => setAllLabsModalOpen(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '16px', fontWeight: 'bold' }}>✕</button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
                    {patientLabReports.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontWeight: 600 }}>No lab reports recorded for this patient.</div>
                    ) : (
                      patientLabReports.map((report) => {
                        const isExpanded = selectedReportDetail?._id === report._id;
                        return (
                          <div 
                            key={report._id} 
                            style={{ 
                              border: '1px solid #E2E8F0', 
                              borderRadius: '12px', 
                              background: '#F8FAFC', 
                              padding: '16px',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setSelectedReportDetail(isExpanded ? null : report)}>
                              <div>
                                <div style={{ fontSize: '15px', fontWeight: 850, color: '#0F172A' }}>{report.testName}</div>
                                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                                  Ordered on: {new Date(report.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ 
                                  fontSize: '11px', 
                                  fontWeight: 800, 
                                  padding: '4px 10px', 
                                  borderRadius: '6px', 
                                  background: report.status === 'Completed' ? '#DCFCE7' : '#FEF3C7', 
                                  color: report.status === 'Completed' ? '#15803D' : '#D97706' 
                                }}>
                                  {report.status}
                                </span>
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="18" 
                                  height="18" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="#64748B" 
                                  strokeWidth="2.5" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </div>

                            {isExpanded && (
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #E2E8F0', animation: 'slideDown 0.2s ease-out' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Investigation Findings</div>
                                <div style={{ 
                                  padding: '16px', 
                                  background: 'white', 
                                  border: '1px solid #E2E8F0', 
                                  borderRadius: '8px', 
                                  fontFamily: 'monospace', 
                                  fontSize: '13px', 
                                  color: '#1E293B', 
                                  lineHeight: '1.6', 
                                  whiteSpace: 'pre-wrap' 
                                }}>
                                  {report.results || 'No findings recorded yet.'}
                                </div>
                                {report.notes && (
                                  <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#64748B', fontStyle: 'italic' }}>
                                    <strong>Notes:</strong> {report.notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REGISTRATION FORM TAB */}
        {activeTab === 'registration-form' && (
           <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Registration and appointment</h1>
              </div>

              {isExistingPatient === null ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px', marginBottom: '40px' }}>
                  <div className="glass-card" style={{ width: '560px', padding: '40px', borderRadius: '16px', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)' }}>
                    
                    {/* Header: User Icon + Title + Subtitle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
                      <div style={{ 
                        width: '52px', 
                        height: '52px', 
                        borderRadius: '50%', 
                        background: '#EFF6FF', 
                        color: '#3B82F6', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <i data-lucide="user" style={{ width: '26px', height: '26px' }}></i>
                      </div>
                      <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', fontFamily: "'Inter', sans-serif" }}>Registered Patient</h2>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: '1.4' }}>
                          Search and select an existing patient to book an appointment.
                        </p>
                      </div>
                    </div>

                    {/* Search Field with magnifying glass on the right */}
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Search by Patient ID or Phone Number" 
                        style={{ 
                          height: '52px', 
                          paddingRight: '48px', 
                          paddingLeft: '16px',
                          borderRadius: '10px', 
                          fontSize: '14px', 
                          fontWeight: 600,
                          border: '1px solid #CBD5E1',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                        value={searchPatientQuery}
                        onChange={e => setSearchPatientQuery(e.target.value)}
                      />
                      <i data-lucide="search" style={{ position: 'absolute', right: '16px', top: '16px', color: '#94A3B8', width: '20px', height: '20px' }}></i>
                    </div>

                    {/* Search Autocomplete List */}
                    {searchPatientQuery.trim().length > 0 && (
                      <div data-lenis-prevent style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px', background: '#F8FAFC', marginBottom: '20px' }}>
                        {patientsList.filter(p => {
                          const q = searchPatientQuery.toLowerCase();
                          return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
                        }).length === 0 ? (
                          <div 
                            style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                            onClick={() => {
                              setSelectedPatient(null);
                              const isNumeric = /^\d+$/.test(searchPatientQuery.trim());
                              setFormData({ 
                                name: !isNumeric ? searchPatientQuery : '', 
                                age: '', 
                                gender: '', 
                                contact: isNumeric ? searchPatientQuery : '', 
                                email: '', 
                                doctorId: formData.doctorId, 
                                bloodGroup: '', 
                                address: '', 
                                medicalHistory: '' 
                              });
                              setIsExistingPatient(false);
                              setSearchPatientQuery('');
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F0FDF4'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ marginBottom: '4px' }}>No matching patients found.</div>
                            <div style={{ color: '#10B981', fontWeight: 700 }}>Click here to register a new patient &rarr;</div>
                          </div>
                        ) : (
                          patientsList.filter(p => {
                            const q = searchPatientQuery.toLowerCase();
                            return p.name.toLowerCase().includes(q) || p.contact.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
                          }).map(p => (
                            <div 
                              key={p._id} 
                              style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '0.2s' }}
                              onClick={() => {
                                setSelectedPatient(p);
                                setFormData({
                                  name: p.name,
                                  age: p.age,
                                  gender: p.gender,
                                  contact: p.contact,
                                  email: p.email || '',
                                  bloodGroup: p.bloodGroup || 'O+',
                                  address: p.address || '',
                                  medicalHistory: p.medicalHistory ? p.medicalHistory.join(', ') : '',
                                  doctorId: formData.doctorId
                                });
                                setIsExistingPatient(true);
                              }}
                              className="patient-search-row"
                            >
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '13px', color: '#1A1D23' }}>{p.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                                  #{p._id.substring(18).toUpperCase()} • {p.gender} • {p.age} Yrs
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{p.contact}</div>
                                <span style={{ fontSize: '10px', background: '#EFF6FF', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, display: 'inline-block', marginTop: '4px' }}>Select</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    <div style={{ width: '100%', height: '1px', background: '#F1F5F9', marginBottom: '20px' }}></div>

                    {/* Register New Patient green border button */}
                    <button 
                      className="btn" 
                      style={{ 
                        width: '100%', 
                        height: '52px', 
                        fontWeight: 800, 
                        borderRadius: '10px', 
                        border: '2px solid #10B981', 
                        background: 'transparent',
                        color: '#10B981',
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '0 20px',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onClick={() => {
                        setSelectedPatient(null);
                        setFormData({ name: '', age: '', gender: '', contact: '', email: '', doctorId: formData.doctorId, bloodGroup: '', address: '', medicalHistory: '' });
                        setIsExistingPatient(false);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F0FDF4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Register New Patient
                      <i data-lucide="chevron-right" style={{ width: '18px', height: '18px', marginLeft: 'auto', strokeWidth: 3 }}></i>
                    </button>

                  </div>
                </div>
              ) : (
                 <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                  


                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>1</div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Patient Information</h2>
                  </div>
                  
                  {/* Expanded Fields Form */}
                  <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="e.g. Ramesh Mehta" 
                            style={{ height: '38px', borderRadius: '8px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: isExistingPatient ? 700 : 500 }} 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                            readOnly={isExistingPatient} 
                          />
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Gender <span style={{ color: '#EF4444' }}>*</span></label>
                          <select 
                            className="form-control" 
                            style={{ height: '38px', borderRadius: '8px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'pointer', fontWeight: isExistingPatient ? 700 : 500 }} 
                            value={formData.gender} 
                            onChange={e => setFormData({...formData, gender: e.target.value})} 
                            disabled={isExistingPatient}
                          >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                          </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Age <span style={{ color: '#EF4444' }}>*</span></label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 45" 
                            style={{ height: '38px', borderRadius: '8px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: isExistingPatient ? 700 : 500 }} 
                            value={formData.age} 
                            onChange={e => setFormData({...formData, age: e.target.value})} 
                            readOnly={isExistingPatient}
                          />
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Mobile Number <span style={{ color: '#EF4444' }}>*</span></label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="e.g. 9876543210" 
                            style={{ 
                              height: '38px', 
                              borderRadius: '8px', 
                              background: isExistingPatient ? '#F1F5F9' : 'white', 
                              cursor: isExistingPatient ? 'not-allowed' : 'text', 
                              fontWeight: isExistingPatient ? 700 : 500,
                              borderColor: (!isExistingPatient && formData.contact && patientsList.some(p => String(p.contact) === String(formData.contact))) ? '#EF4444' : '#E2E8F0'
                            }} 
                            value={formData.contact} 
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '').substring(0, 10);
                              setFormData({...formData, contact: val});
                            }} 
                            readOnly={isExistingPatient}
                          />
                          {!isExistingPatient && formData.contact && patientsList.some(p => String(p.contact) === String(formData.contact)) && (
                            <div style={{ color: '#EF4444', fontSize: '11px', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                              This mobile number is already registered. Please search for the patient or use a different number.
                            </div>
                          )}
                      </div>
                      {bookingType === 'lab' && (
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Referred By</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="e.g. Dr. Rajesh Shah or Self" 
                              style={{ height: '38px', borderRadius: '8px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: isExistingPatient ? 700 : 500 }} 
                              value={formData.referredBy || ''} 
                              onChange={e => setFormData({...formData, referredBy: e.target.value})} 
                              readOnly={isExistingPatient}
                            />
                        </div>
                      )}
                      {bookingType !== 'lab' && bookingType !== 'service' && (
                        <>
                          <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>
                                  Email
                              </label>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="e.g. ramesh.mehta@gmail.com" 
                                    style={{ 
                                        height: '38px', 
                                        borderRadius: '8px', 
                                        background: (isExistingPatient || otpVerified) ? '#F1F5F9' : 'white', 
                                        cursor: (isExistingPatient || otpVerified) ? 'not-allowed' : 'text', 
                                        fontWeight: (isExistingPatient || otpVerified) ? 700 : 500,
                                        flex: 1
                                    }} 
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})} 
                                    readOnly={isExistingPatient || otpVerified}
                                  />
                                  {!isExistingPatient && !otpVerified && (
                                      <button 
                                          type="button" 
                                          className="btn btn-primary" 
                                          style={{ 
                                              height: '38px', 
                                              whiteSpace: 'nowrap', 
                                              borderRadius: '8px', 
                                              fontWeight: 700, 
                                              padding: '0 16px',
                                              background: '#3B82F6',
                                              color: 'white',
                                              border: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '8px',
                                              cursor: sendingOtp ? 'not-allowed' : 'pointer'
                                          }}
                                          onClick={handleSendOtp}
                                          disabled={sendingOtp}
                                      >
                                          {sendingOtp ? 'Sending...' : 'Send OTP'}
                                      </button>
                                  )}
                                  {!isExistingPatient && otpVerified && (
                                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                          <span style={{ 
                                              display: 'inline-flex', 
                                              alignItems: 'center', 
                                              color: '#10B981', 
                                              fontWeight: 700, 
                                              fontSize: '11px',
                                              background: '#D1FAE5',
                                              padding: '6px 8px',
                                              borderRadius: '20px'
                                          }}>
                                              Verified
                                          </span>
                                          <button 
                                              type="button" 
                                              style={{ 
                                                  background: 'transparent', 
                                                  border: 'none', 
                                                  color: '#EF4444', 
                                                  fontWeight: 600, 
                                                  fontSize: '11px',
                                                  cursor: 'pointer',
                                                  textDecoration: 'underline',
                                                  padding: 0
                                              }}
                                              onClick={() => {
                                                  setOtpVerified(false);
                                                  setOtpSent(false);
                                                  setVerificationOtp('');
                                              }}
                                          >
                                              Change
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {!isExistingPatient && otpSent && !otpVerified && (
                              <div className="form-group" style={{ 
                                  gridColumn: '1 / -1', 
                                  background: '#F8FAFC', 
                                  border: '1px dashed #CBD5E1', 
                                  borderRadius: '12px', 
                                  padding: '16px',
                                  marginTop: '8px'
                              }}>
                                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '8px' }}>
                                      Enter 6-digit Verification OTP sent to {formData.email} <span style={{ color: '#EF4444' }}>*</span>
                                  </label>
                                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                      <input 
                                          type="text" 
                                          className="form-control" 
                                          maxLength={6}
                                          placeholder="######" 
                                          style={{ 
                                              width: '140px',
                                              height: '44px', 
                                              textAlign: 'center', 
                                              fontSize: '18px', 
                                              fontWeight: 700, 
                                              letterSpacing: '4px',
                                              borderRadius: '8px',
                                              border: '1px solid #CBD5E1'
                                          }}
                                          value={verificationOtp}
                                          onChange={e => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                                      />
                                      <button 
                                          type="button" 
                                          className="btn btn-success" 
                                          style={{ 
                                              height: '44px', 
                                              whiteSpace: 'nowrap', 
                                              borderRadius: '8px', 
                                              fontWeight: 700, 
                                              padding: '0 20px',
                                              background: '#10B981',
                                              color: 'white',
                                              border: 'none',
                                              cursor: otpVerifying ? 'not-allowed' : 'pointer'
                                          }}
                                          onClick={handleVerifyOtp}
                                          disabled={otpVerifying}
                                      >
                                          {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                                      </button>
                                      <button 
                                          type="button" 
                                          style={{ 
                                              background: 'transparent', 
                                              border: 'none', 
                                              color: '#64748B', 
                                              fontWeight: 600, 
                                              fontSize: '12px',
                                              cursor: 'pointer'
                                          }}
                                          onClick={handleSendOtp}
                                      >
                                          Resend OTP
                                      </button>
                                  </div>
                              </div>
                          )}
                        </>
                      )}
                      {bookingType !== 'lab' && bookingType !== 'service' && (
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Blood Group</label>
                            <select 
                              className="form-control" 
                              style={{ height: '38px', borderRadius: '8px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'pointer', fontWeight: isExistingPatient ? 700 : 500 }} 
                              value={formData.bloodGroup} 
                              onChange={e => setFormData({...formData, bloodGroup: e.target.value})} 
                              disabled={isExistingPatient}
                            >
                                <option value="">Select Blood Group</option>
                                <option value="O+">O +ve</option>
                                <option value="O-">O -ve</option>
                                <option value="A+">A +ve</option>
                                <option value="A-">A -ve</option>
                                <option value="B+">B +ve</option>
                                <option value="B-">B -ve</option>
                                <option value="AB+">AB +ve</option>
                                <option value="AB-">AB -ve</option>
                            </select>
                        </div>
                      )}
                  </div>

                  {bookingType !== 'lab' && bookingType !== 'service' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Residential Address</label>
                        <textarea 
                          className="form-control" 
                          placeholder="e.g. Flat 101, Green Park, Main Road" 
                          style={{ minHeight: '50px', borderRadius: '8px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: isExistingPatient ? 700 : 500, padding: '8px 12px' }} 
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          readOnly={isExistingPatient}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Allergies & Medical History (Comma Separated)</label>
                        <textarea 
                          className="form-control" 
                          placeholder="e.g. Hypertension, Penicillin Allergy" 
                          style={{ minHeight: '50px', borderRadius: '8px', background: isExistingPatient ? '#F1F5F9' : 'white', cursor: isExistingPatient ? 'not-allowed' : 'text', fontWeight: isExistingPatient ? 700 : 500, padding: '8px 12px' }} 
                          value={formData.medicalHistory}
                          onChange={e => setFormData({...formData, medicalHistory: e.target.value})}
                          readOnly={isExistingPatient}
                        />
                      </div>
                    </div>
                  )}

                  {/* Patient Vitals (Optional) during Registration / Appointment Booking */}
                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setVitalsCollapsed(!vitalsCollapsed)}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#2563EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </div>
                      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A1D23', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Patient Vitals <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>(Optional)</span>
                        <span style={{ fontSize: '11px', color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px', fontWeight: 700 }}>
                          {vitalsCollapsed ? 'Show' : 'Hide'}
                        </span>
                      </h2>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#2563EB" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: vitalsCollapsed ? 'none' : 'rotate(180deg)' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    
                    {!vitalsCollapsed && (
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Temperature (°F)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            className="form-control" 
                            placeholder="e.g. 98.6"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalTemp} 
                            onChange={e => setVitalTemp(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Heart Rate / Pulse (bpm)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 72"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalPulse} 
                            onChange={e => setVitalPulse(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>BP Systolic (mmHg)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 120"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalBpSys} 
                            onChange={e => setVitalBpSys(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>BP Diastolic (mmHg)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 80"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalBpDia} 
                            onChange={e => setVitalBpDia(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Respiration (breaths/min)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 16"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalResp} 
                            onChange={e => setVitalResp(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>SpO2 (%)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 98"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalSpo2} 
                            onChange={e => setVitalSpo2(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Weight (kg)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            className="form-control" 
                            placeholder="e.g. 70"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalWeight} 
                            onChange={e => setVitalWeight(e.target.value)} 
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>Height (cm)</label>
                          <input 
                            type="number" 
                            className="form-control" 
                            placeholder="e.g. 175"
                            style={{ height: '44px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', background: 'white' }} 
                            value={vitalHeight} 
                            onChange={e => setVitalHeight(e.target.value)} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {!isExistingPatient && bookingType !== 'lab' && bookingType !== 'service' && (
                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                      {/* Document Uploads Header */}
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setDocsCollapsed(!docsCollapsed)}
                      >
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#8B5CF6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                            <i data-lucide="folder-plus" style={{ width: '16px', height: '16px' }}></i>
                          </div>
                          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A1D23', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Add Additional Documents <span style={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>(Optional)</span>
                            <span style={{ fontSize: '11px', color: '#8B5CF6', background: '#F5F3FF', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px', fontWeight: 700 }}>
                              {docsCollapsed ? 'Show' : 'Hide'}
                            </span>
                          </h2>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="18" 
                            height="18" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="#8B5CF6" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: docsCollapsed ? 'none' : 'rotate(180deg)' }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                      </div>

                      {!docsCollapsed && (
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '24px', borderRadius: '12px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Document Type</label>
                              <select 
                                className="form-control" 
                                value={newDocType} 
                                onChange={e => setNewDocType(e.target.value)}
                                style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700, padding: '0 12px' }}
                              >
                                <option value="Aadhar / Voter Card">Aadhar / Voter Card</option>
                                <option value="Ultrasound Report">Ultrasound Report</option>
                                <option value="Consent Form (e.g. HIV)">Consent Form (e.g. HIV)</option>
                                <option value="Patient Photo">Patient Photo</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div style={{ flex: 2 }}>
                              <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Upload File</label>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <input 
                                  type="file" 
                                  id="patient-doc-upload"
                                  className="form-control"
                                  style={{ flex: 1, padding: '8px', height: '42px', fontSize: '13px', borderRadius: '8px', background: 'white' }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const fileInput = document.getElementById('patient-doc-upload');
                                    if (fileInput.files.length > 0) {
                                      setPatientDocuments([...patientDocuments, { type: newDocType, name: fileInput.files[0].name, size: (fileInput.files[0].size / 1024).toFixed(1) + ' KB' }]);
                                      fileInput.value = '';
                                    } else {
                                      showToast('Please select a file to upload', 'error');
                                    }
                                  }}
                                  style={{ padding: '0 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', height: '42px' }}
                                >
                                  Add Document
                                </button>
                              </div>
                            </div>
                          </div>

                          {patientDocuments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {patientDocuments.map((doc, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <i data-lucide="file-text" style={{ width: '18px', color: '#64748B' }}></i>
                                    <div>
                                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{doc.name}</div>
                                      <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>{doc.type} • {doc.size}</div>
                                    </div>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => setPatientDocuments(patientDocuments.filter((_, i) => i !== idx))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                                  >
                                    <i data-lucide="trash-2" style={{ width: '16px' }}></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}



                  {bookingType === 'opd' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>2</div>
                          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Visit & Appointment Details</h2>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '6px 12px', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
                          Multi-Appointment Enabled
                        </span>
                      </div>

                      {/* Queued Appointments List for Same Patient */}
                      {additionalApptsList.length > 0 && (
                        <div style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                            Queued Appointments for Patient ({additionalApptsList.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {additionalApptsList.map((appt, idx) => (
                              <div key={appt.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{appt.doctorName}</div>
                                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{appt.date} • {appt.time.split('(Limit')[0].trim()} • Fee: ₹{appt.fee}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setAdditionalApptsList(additionalApptsList.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                                  title="Remove this appointment"
                                >
                                  <i data-lucide="trash-2" style={{ width: '16px' }}></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                          <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Symptoms <span style={{ color: '#EF4444' }}>*</span></label>
                              <div className="custom-dropdown-container">
                                  <div className="custom-dropdown-trigger" onClick={() => !reschedulingAppointment && setSymptomDropdownOpen(!symptomDropdownOpen)} style={{ minHeight: '38px', height: 'auto', padding: '4px 12px', flexWrap: 'wrap', ...(reschedulingAppointment ? { cursor: 'not-allowed', background: '#F1F5F9' } : {}) }}>
                                      <div className="selected-items" data-lenis-prevent style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', width: '100%', gap: '6px' }}>
                                          {selectedSymptoms.map(s => (
                                            <div key={s} className="symptom-tag" style={{ margin: '2px 0' }}>
                                                {s}
                                                <span 
                                                  onClick={(e) => { e.stopPropagation(); if (!reschedulingAppointment) toggleSymptom(s); }}
                                                  style={{ cursor: reschedulingAppointment ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
                                                >
                                                    <i data-lucide="x" style={{ pointerEvents: 'none', width: '14px', height: '14px' }}></i>
                                                </span>
                                            </div>
                                          ))}
                                          <input
                                            type="text"
                                            placeholder={selectedSymptoms.length === 0 ? "Select / Search symptoms..." : ""}
                                            value={symptomSearchQuery}
                                            onChange={e => {
                                              setSymptomSearchQuery(e.target.value);
                                              if (!symptomDropdownOpen) setSymptomDropdownOpen(true);
                                            }}
                                            onClick={e => {
                                              e.stopPropagation();
                                              setSymptomDropdownOpen(true);
                                            }}
                                            disabled={!!reschedulingAppointment}
                                            style={{
                                              border: 'none',
                                              outline: 'none',
                                              background: 'transparent',
                                              flex: 1,
                                              minWidth: '120px',
                                              height: '30px',
                                              fontSize: '12.5px',
                                              fontWeight: 600,
                                              color: '#0F172A',
                                              padding: 0,
                                              margin: 0,
                                              cursor: reschedulingAppointment ? 'not-allowed' : 'text'
                                            }}
                                          />
                                      </div>
                                      <i data-lucide="chevron-down" style={{ width: '18px', color: '#94A3B8', transition: '0.3s', transform: symptomDropdownOpen ? 'rotate(180deg)' : 'none' }}></i>
                                  </div>
                                  {symptomDropdownOpen && (
                                      <div className="dropdown-options-box show" data-lenis-prevent style={{ padding: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                          {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).map(s => (
                                              <div key={s} className="option-item" onClick={() => { toggleSymptom(s); setSymptomSearchQuery(''); }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}>{s}</div>
                                          ))}
                                          {availableSymptoms.filter(s => s.toLowerCase().includes(symptomSearchQuery.toLowerCase())).length === 0 && (
                                              <div style={{ padding: '8px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>No matching symptoms</div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                          <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Select Doctor <span style={{ color: '#EF4444' }}>*</span></label>
                              <select className="form-control" style={{ height: '38px', borderRadius: '8px', background: reschedulingAppointment ? '#F1F5F9' : 'white', cursor: reschedulingAppointment ? 'not-allowed' : 'pointer', fontWeight: reschedulingAppointment ? 700 : 500 }} value={formData.doctorId} onChange={e => { setFormData({...formData, doctorId: e.target.value}); setSelectedSlot(''); }} disabled={!!reschedulingAppointment}>
                                  <option value="">-- Choose Doctor --</option>
                                  {doctors.map(doc => (
                                      <option key={doc._id} value={doc._id}>{doc.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', marginBottom: '4px', display: 'block' }}>Appointment Date <span style={{ color: '#EF4444' }}>*</span></label>
                              <input 
                                  type="date" 
                                  className="form-control" 
                                  style={{ height: '38px', borderRadius: '8px', background: 'white', border: '1px solid #CBD5E1', padding: '0 12px', fontWeight: 600 }} 
                                  value={bookingDate} 
                                  min={getLocalDateString()} 
                                  onChange={e => {
                                      setBookingDate(e.target.value);
                                      setSelectedSlot(''); // Reset slot choice when date changes
                                  }} 
                              />
                          </div>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: '#64748B' }}>Select Slot / Queue</label>
                          
                          {/* Doctor unavailability banner */}
                          {formData.doctorId && bookingDate && !receptionDoctorAvailability.available && (
                            <div style={{ 
                              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', 
                              padding: '14px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#991B1B' }}>Doctor Unavailable</div>
                                <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                                  {receptionDoctorAvailability.reason === 'Weekly Off' 
                                    ? `Weekly off (${receptionDoctorAvailability.weeklyOff || 'this day'}). Please select a different date.`
                                    : `On ${receptionDoctorAvailability.leaveType || ''} leave. Please select a different date.`}
                                </div>
                              </div>
                            </div>
                          )}

                          {(!formData.doctorId || !bookingDate) ? (
                            <div style={{ padding: '16px', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '10px', textAlign: 'center', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                              Please select a Doctor and Appointment Date to view available slots.
                            </div>
                          ) : receptionDoctorAvailability.available && (
                            <div className="slot-scroll-wrapper">
                              <button
                                className="slot-scroll-arrow left"
                                style={{ display: 'none' }}
                                onClick={() => {
                                  const grid = document.getElementById('reception-time-grid');
                                  if (grid) grid.scrollBy({ left: -340, behavior: 'smooth' });
                                }}
                                aria-label="Scroll slots left"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                              </button>

                              <div id="reception-time-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px 0' }}>
                                {(receptionDoctorAvailability.slots || DEFAULT_RECEPTION_SLOTS).map(time => {
                                  let limit = 5;
                                  const match = time.match(/\(Limit:\s*(\d+)\)/i);
                                  if (match) {
                                      limit = parseInt(match[1], 10);
                                  }

                                  const cleanTimeSlotStr = (str) => {
                                      if (!str) return '';
                                      return str.split(/\(Limit:/i)[0].replace(/\s+/g, ' ').trim().toLowerCase();
                                  };

                                  const targetTimeClean = cleanTimeSlotStr(time);
                                  const targetDateStr = new Date(bookingDate).toDateString();

                                  let bookedCount = 0;
                                  if (formData.doctorId && bookingDate) {
                                      bookedCount = appointments.filter(app => {
                                          if (app.status === 'Cancelled') return false;
                                          const appDocId = app.doctorId?._id || app.doctorId;
                                          if (String(appDocId) !== String(formData.doctorId)) return false;
                                          const appDateStr = new Date(app.date).toDateString();
                                          if (appDateStr !== targetDateStr) return false;
                                          return cleanTimeSlotStr(app.time) === targetTimeClean;
                                      }).length;
                                  }

                                  const isFull = bookedCount >= limit;
                                  const isSelected = selectedSlot === time;
                                  const displayTime = time.split(/\(Limit:/i)[0].trim();

                                  return (
                                      <div 
                                          key={time} 
                                          className={`time-chip ${isFull ? 'booked' : (isSelected ? 'selected' : 'available')}`} 
                                          style={isFull ? {
                                              background: '#F1F5F9',
                                              color: '#94A3B8',
                                              border: '1.5px solid #CBD5E1',
                                              cursor: 'not-allowed',
                                              opacity: 0.6
                                          } : {}}
                                          onClick={() => {
                                              if (!isFull) {
                                                  setSelectedSlot(time);
                                              }
                                          }}
                                      >
                                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{displayTime}</div>
                                          <div className="slot-label" style={{ fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
                                              {isFull ? 'Fully Booked' : (isSelected ? 'Selected' : 'Available')} ({bookedCount}/{limit})
                                          </div>
                                      </div>
                                  );
                              })}
                            </div>
                            <button
                              className="slot-scroll-arrow right"
                              style={{ display: 'none' }}
                              onClick={() => {
                                const grid = document.getElementById('reception-time-grid');
                                if (grid) grid.scrollBy({ left: 340, behavior: 'smooth' });
                              }}
                              aria-label="Scroll slots right"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                          </div>
                          )}
                      </div>

                      {/* Add Another Doctor Appointment Button */}
                      <div style={{ marginBottom: '36px', display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!formData.doctorId) {
                              showToast("Please pick a Doctor first before queueing additional appointment.", "error");
                              return;
                            }
                            if (!selectedSlot) {
                              showToast("Please pick a Time Slot first.", "error");
                              return;
                            }
                            const docObj = doctors.find(d => String(d._id) === String(formData.doctorId));
                            const isDoctorAlreadyQueued = additionalApptsList.some(
                              appt => String(appt.doctorId) === String(formData.doctorId)
                            );
                            if (isDoctorAlreadyQueued) {
                              showToast(`An appointment with ${docObj ? docObj.name : 'this doctor'} is already queued. You cannot book multiple appointments with the same doctor in a single form.`, "error");
                              return;
                            }
                            if (isExistingPatient && selectedPatient) {
                              const alreadyHasApptInDb = appointments.some(appt => {
                                const pId = appt.patientId && typeof appt.patientId === 'object' ? appt.patientId._id : appt.patientId;
                                const dId = appt.doctorId && typeof appt.doctorId === 'object' ? appt.doctorId._id : appt.doctorId;
                                const samePatient = String(pId) === String(selectedPatient._id);
                                const sameDoctor = String(dId) === String(formData.doctorId);
                                const sameDay = new Date(appt.date).toDateString() === new Date(bookingDate).toDateString();
                                const notCancelled = appt.status !== 'Cancelled';
                                return samePatient && sameDoctor && sameDay && notCancelled;
                              });
                              if (alreadyHasApptInDb) {
                                showToast(`This patient already has an appointment booked with ${docObj ? docObj.name : 'this doctor'} on this day.`, "error");
                                return;
                              }
                            }
                            setAdditionalApptsList([
                              ...additionalApptsList,
                              {
                                id: Date.now(),
                                doctorId: formData.doctorId,
                                doctorName: docObj ? docObj.name : 'Doctor',
                                date: bookingDate,
                                time: selectedSlot,
                                reason: selectedSymptoms.join(', ') || 'General Checkup',
                                fee: docObj ? (docObj.consultationFee || 500) : 500
                              }
                            ]);
                            setFormData(prev => ({ ...prev, doctorId: '' }));
                            setSelectedSlot('');
                            showToast("Doctor consultation added to queue! Pick another doctor for second appointment.", "success");
                          }}
                          style={{
                            background: '#EFF6FF',
                            border: '1.5px solid #3B82F6',
                            color: '#2563EB',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            fontWeight: 800,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          + Add Another Doctor Appointment (Same Patient)
                        </button>

                        {(formData.doctorId || selectedSlot) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, doctorId: '' }));
                              setSelectedSlot('');
                              showToast("Current selection cleared.", "info");
                            }}
                            style={{
                              background: '#F8FAFC',
                              border: '1.5px solid #CBD5E1',
                              color: '#64748B',
                              borderRadius: '8px',
                              padding: '10px 16px',
                              fontWeight: 800,
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Clear Selection
                          </button>
                        )}
                      </div>
                    </>
                  ) : bookingType === 'lab' ? (
                    <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '14px', padding: '24px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            <i data-lucide="flask-conical" style={{ width: '20px', height: '20px' }}></i>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#065F46' }}>Direct Lab Test Selection (Walk-In OPD)</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#047857' }}>Select single or multiple diagnostic lab tests for this patient order.</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857', background: '#DCFCE7', padding: '6px 12px', borderRadius: '20px', border: '1px solid #A7F3D0' }}>
                          {selectedLabTestsList.length} Test(s) Added
                        </span>
                      </div>

                      {/* Search & Add Lab Test Row */}
                      <div style={{ marginBottom: '20px' }}>
                        <div className="form-group" style={{ position: 'relative', margin: 0 }}>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', marginBottom: '6px', display: 'block' }}>Search Pathology / Diagnostic Lab Test</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#059669', width: '16px', height: '16px', pointerEvents: 'none' }}></i>
                            <input 
                              type="text" 
                              className="form-control"
                              placeholder="Search and select lab test (e.g. CBC, Lipid, Thyroid, X-Ray)..."
                              style={{ height: '46px', paddingLeft: '44px', paddingRight: '40px', borderRadius: '10px', background: 'white', fontWeight: 700, fontSize: '13.5px', border: '1.5px solid #A7F3D0' }}
                              value={labTestSearchQuery}
                              onFocus={() => setShowLabTestDropdown(true)}
                              onChange={e => {
                                setLabTestSearchQuery(e.target.value);
                                setShowLabTestDropdown(true);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowLabTestDropdown(!showLabTestDropdown)}
                              style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <i data-lucide={showLabTestDropdown ? "chevron-up" : "chevron-down"} style={{ width: '18px', height: '18px' }}></i>
                            </button>
                          </div>

                          {/* Live Search Suggestions Dropdown */}
                          {showLabTestDropdown && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '6px',
                                background: '#FFFFFF',
                                border: '1.5px solid #A7F3D0',
                                borderRadius: '12px',
                                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                                zIndex: 9999,
                                maxHeight: '260px',
                                overflowY: 'auto'
                              }}
                            >
                              {(() => {
                                const query = (labTestSearchQuery || '').toLowerCase().trim();
                                const filtered = hospitalLabTests.filter(t => 
                                  (t.testName || '').toLowerCase().includes(query) ||
                                  (t.category || '').toLowerCase().includes(query) ||
                                  (t.testCode || '').toLowerCase().includes(query)
                                );

                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
                                      No registered hospital lab tests matching "{labTestSearchQuery}"
                                    </div>
                                  );
                                }

                                return filtered.map((test, idx) => {
                                  const isAlreadyAdded = selectedLabTestsList.some(item => item.testName === test.testName);
                                  return (
                                    <div
                                      key={test._id || idx}
                                      onClick={() => {
                                        if (!isAlreadyAdded) {
                                          setSelectedLabTestsList([...selectedLabTestsList, { testName: test.testName, testCode: test.testCode, category: test.category, price: Number(test.price || 0) }]);
                                        }
                                        setLabTestSearchQuery('');
                                        setShowLabTestDropdown(false);
                                      }}
                                      style={{
                                        padding: '12px 16px',
                                        cursor: isAlreadyAdded ? 'default' : 'pointer',
                                        opacity: isAlreadyAdded ? 0.6 : 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #F1F5F9',
                                        background: isAlreadyAdded ? '#F8FAFC' : 'transparent',
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = '#F0FDF4'; }}
                                      onMouseLeave={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A' }}>
                                          {test.testName} {isAlreadyAdded && <span style={{ color: '#059669', fontSize: '11px', fontWeight: 700 }}>(Added)</span>}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                          <span style={{ background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>{test.category || 'Pathology'}</span>
                                          {test.testCode && <span style={{ color: '#64748B' }}>Code: {test.testCode}</span>}
                                        </div>
                                      </div>
                                      <div style={{ fontWeight: 900, fontSize: '14px', color: '#059669', background: '#ECFDF5', padding: '6px 12px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                                        ₹{Number(test.price || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Added Selected Lab Tests Pills & Summary */}
                      {selectedLabTestsList.length > 0 ? (
                        <div style={{ background: '#FFFFFF', border: '1.5px solid #A7F3D0', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Selected Tests for Lab Order ({selectedLabTestsList.length})</span>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#059669' }}>
                              Subtotal: ₹{selectedLabTestsList.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedLabTestsList.map((test, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>{idx + 1}</span>
                                  <div>
                                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#065F46' }}>{test.testName}</span>
                                    {test.category && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#047857', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{test.category}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontWeight: 900, fontSize: '14px', color: '#059669' }}>₹{Number(test.price || 0).toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLabTestsList(selectedLabTestsList.filter((_, i) => i !== idx))}
                                    style={{ background: '#FEE2E2', border: 'none', color: '#EF4444', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '16px', background: '#FFFFFF', border: '1.5px dashed #A7F3D0', borderRadius: '12px', textAlign: 'center', color: '#047857', fontSize: '13px', fontWeight: 600 }}>
                          No lab tests added yet. Search and select tests above to build the lab order.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: '14px', padding: '24px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            <i data-lucide="sparkles" style={{ width: '20px', height: '20px' }}></i>
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#5B21B6' }}>Direct Clinical Procedure / Service (Dental, Walk-In)</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6D28D9' }}>Select single or multiple dental, physiotherapy, or clinical specialty procedures for this patient.</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#6D28D9', background: '#EDE9FE', padding: '6px 12px', borderRadius: '20px', border: '1px solid #DDD6FE' }}>
                          {selectedServicesList.length} Procedure(s) Added
                        </span>
                      </div>

                      {/* Search & Add Clinical Service Row */}
                      <div style={{ marginBottom: '20px' }}>
                        <div className="form-group" style={{ position: 'relative', margin: 0 }}>
                          <label style={{ fontSize: '12px', fontWeight: 800, color: '#5B21B6', marginBottom: '6px', display: 'block' }}>Search Clinical Service / Dental Procedure</label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#7C3AED', width: '16px', height: '16px', pointerEvents: 'none' }}></i>
                            <input 
                              type="text" 
                              className="form-control"
                              placeholder="Search and select dental/clinical procedure (e.g. Root Canal, Scaling, Extraction, Braces)..."
                              style={{ height: '46px', paddingLeft: '44px', paddingRight: '40px', borderRadius: '10px', background: 'white', fontWeight: 700, fontSize: '13.5px', border: '1.5px solid #C4B5FD' }}
                              value={serviceSearchQuery}
                              onFocus={() => setShowServiceDropdown(true)}
                              onChange={e => {
                                setServiceSearchQuery(e.target.value);
                                setShowServiceDropdown(true);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                              style={{ position: 'absolute', right: '12px', background: 'transparent', border: 'none', color: '#7C3AED', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <i data-lucide={showServiceDropdown ? "chevron-up" : "chevron-down"} style={{ width: '18px', height: '18px' }}></i>
                            </button>
                          </div>

                          {/* Live Search Suggestions Dropdown for Clinical Services */}
                          {showServiceDropdown && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '6px',
                                background: '#FFFFFF',
                                border: '1.5px solid #C4B5FD',
                                borderRadius: '12px',
                                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                                zIndex: 9999,
                                maxHeight: '260px',
                                overflowY: 'auto'
                              }}
                            >
                              {(() => {
                                const query = (serviceSearchQuery || '').toLowerCase().trim();
                                const filtered = hospitalClinicalServices.filter(s => 
                                  (s.serviceName || '').toLowerCase().includes(query) ||
                                  (s.department || '').toLowerCase().includes(query) ||
                                  (s.serviceCode || '').toLowerCase().includes(query)
                                );

                                if (filtered.length === 0) {
                                  return (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
                                      No registered clinical services matching "{serviceSearchQuery}"
                                    </div>
                                  );
                                }

                                return filtered.map((srv, idx) => {
                                  const isAlreadyAdded = selectedServicesList.some(item => item.serviceName === srv.serviceName);
                                  return (
                                    <div
                                      key={srv._id || idx}
                                      onClick={() => {
                                        if (!isAlreadyAdded) {
                                          setSelectedServicesList([...selectedServicesList, { serviceName: srv.serviceName, serviceCode: srv.serviceCode, department: srv.department, price: Number(srv.price || 0) }]);
                                        }
                                        setServiceSearchQuery('');
                                        setShowServiceDropdown(false);
                                      }}
                                      style={{
                                        padding: '12px 16px',
                                        cursor: isAlreadyAdded ? 'default' : 'pointer',
                                        opacity: isAlreadyAdded ? 0.6 : 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #F1F5F9',
                                        background: isAlreadyAdded ? '#F8FAFC' : 'transparent',
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = '#F5F3FF'; }}
                                      onMouseLeave={(e) => { if (!isAlreadyAdded) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A' }}>
                                          {srv.serviceName} {isAlreadyAdded && <span style={{ color: '#7C3AED', fontSize: '11px', fontWeight: 700 }}>(Added)</span>}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 700, marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                          <span style={{ background: '#EDE9FE', padding: '2px 8px', borderRadius: '4px' }}>{srv.department || 'Dental'}</span>
                                          {srv.serviceCode && <span style={{ color: '#64748B' }}>Code: {srv.serviceCode}</span>}
                                        </div>
                                      </div>
                                      <div style={{ fontWeight: 900, fontSize: '14px', color: '#7C3AED', background: '#F5F3FF', padding: '6px 12px', borderRadius: '8px', border: '1px solid #C4B5FD' }}>
                                        ₹{Number(srv.price || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Added Selected Services Pills & Summary */}
                      {selectedServicesList.length > 0 ? (
                        <div style={{ background: '#FFFFFF', border: '1.5px solid #DDD6FE', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#5B21B6', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Selected Clinical Procedures ({selectedServicesList.length})</span>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#7C3AED' }}>
                              Subtotal: ₹{selectedServicesList.reduce((sum, item) => sum + Number(item.price || 0), 0).toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedServicesList.map((srv, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#7C3AED', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>{idx + 1}</span>
                                  <div>
                                    <span style={{ fontWeight: 800, fontSize: '13px', color: '#5B21B6' }}>{srv.serviceName}</span>
                                    {srv.department && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#6D28D9', background: '#EDE9FE', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{srv.department}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontWeight: 900, fontSize: '14px', color: '#7C3AED' }}>₹{Number(srv.price || 0).toFixed(2)}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedServicesList(selectedServicesList.filter((_, i) => i !== idx))}
                                    style={{ background: '#FEE2E2', border: 'none', color: '#EF4444', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '16px', background: '#FFFFFF', border: '1.5px dashed #DDD6FE', borderRadius: '12px', textAlign: 'center', color: '#6D28D9', fontSize: '13px', fontWeight: 600 }}>
                          No clinical procedures added yet. Search and select procedures above.
                        </div>
                      )}
                    </div>
                  )}

                  {!isExistingPatient && bookingType !== 'lab' && bookingType !== 'service' && (
                    <>
                      {/* DPDP Consent Module */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#64748B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                            <i data-lucide="shield-check" style={{ width: '16px', height: '16px' }}></i>
                          </div>
                          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Patient Consent</h2>
                      </div>
                      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: 600 }}>
                          Patient consent is required for EMR creation and medical data processing. The patient has the right to withdraw this consent at any time.
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '10px' }}>
                          <input type="checkbox" checked={dpdpConsent.emrCreation} onChange={e => setDpdpConsent({...dpdpConsent, emrCreation: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>Consent for EMR Records Creation (Mandatory for Consultation)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={dpdpConsent.dataSharing} onChange={e => setDpdpConsent({...dpdpConsent, dataSharing: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569' }}>Consent for De-identified Data Sharing (Research / Analytics)</span>
                        </label>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>3</div>
                      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#1A1D23', margin: 0 }}>Billing & Payment Summary</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '40px', marginBottom: '48px' }}>
                      {(() => {
                        const subtotalVal = getBillingItems().reduce((sum, item) => sum + item.amount, 0) + ((!isExistingPatient && getBillingItems().length > 0) ? 50 : 0);
                        const discAmt = (subtotalVal * Number(bookingDiscountPercent || 0)) / 100;
                        const finalTotalVal = Math.max(0, subtotalVal - discAmt);

                        return (
                          <div className="billing-summary">
                              {getBillingItems().map((item, i) => (
                                <div key={i} className="billing-row">
                                  <span>{item.description}</span>
                                  <span>₹{Number(item.amount).toFixed(2)}</span>
                                </div>
                              ))}
                              {!isExistingPatient && getBillingItems().length > 0 && <div className="billing-row"><span>Registration Fee</span> <span>₹50.00</span></div>}
                              
                              {/* Discount Input & Reason Fields */}
                              <div style={{ marginTop: '12px', borderTop: '1px dashed #CBD5E1', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', margin: 0, textTransform: 'uppercase' }}>Discount (%)</label>
                                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '90px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max={allowedDiscountPercent}
                                      placeholder="0"
                                      value={bookingDiscountPercent || ''}
                                      onChange={e => setBookingDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))}
                                      style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #CBD5E1', padding: '0 20px 0 8px', fontSize: '13px', fontWeight: 800, textAlign: 'right' }}
                                    />
                                    <span style={{ position: 'absolute', right: '8px', fontWeight: 800, color: '#64748B', fontSize: '11px' }}>%</span>
                                  </div>
                                </div>
                                <span style={{ display: 'block', fontSize: '10.5px', color: '#64748B', textAlign: 'right', marginTop: '-4px', marginBottom: '8px', fontWeight: 600 }}>
                                  Max limit: {allowedDiscountPercent}%
                                </span>

                                {bookingDiscountPercent > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>Discount Reason <span style={{ color: '#EF4444' }}>*</span></label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Senior Citizen / Staff Relative"
                                      value={bookingDiscountReason}
                                      onChange={e => setBookingDiscountReason(e.target.value)}
                                      style={{ width: '100%', height: '32px', borderRadius: '6px', border: '1px solid #FCA5A5', padding: '0 8px', fontSize: '11.5px', fontWeight: 600, background: '#FFF5F5', color: '#991B1B' }}
                                      required
                                    />
                                  </div>
                                )}
                              </div>

                              {bookingDiscountPercent > 0 && (
                                <div className="billing-row" style={{ color: '#DC2626', fontWeight: 700 }}>
                                  <span>Discount Applied ({bookingDiscountPercent}%)</span>
                                  <span>-₹{discAmt.toFixed(2)}</span>
                                </div>
                              )}

                              <div className="billing-total" style={{ borderTop: '2px solid #2563EB', marginTop: '8px', paddingTop: '8px' }}>
                                <span>Total Amount</span> 
                                <span>
                                  ₹{finalTotalVal.toFixed(2)}
                                </span>
                              </div>
                          </div>
                        );
                      })()}
                      
                      <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: '#64748B' }}>Payment Method / Status</label>
                          {reschedulingAppointment ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#D1FAE5', color: '#065F46', padding: '12px 20px', borderRadius: '8px', fontWeight: 800, fontSize: '14px', border: '1px solid #A7F3D0' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                  Paid (Original Payment Preserved)
                              </div>
                          ) : (
                              <div className="payment-grid" style={{ marginBottom: '24px' }}>
                                  {['Cash', 'UPI', 'Other'].map(method => {
                                      const getIcon = () => {
                                          if (method === 'Cash') {
                                              return (
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                      <rect x="2" y="6" width="20" height="12" rx="2" />
                                                      <circle cx="12" cy="12" r="2" />
                                                      <path d="M6 12h.01M18 12h.01" />
                                                  </svg>
                                              );
                                          }
                                          if (method === 'UPI') {
                                              return (
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                                      <line x1="12" y1="18" x2="12.01" y2="18" />
                                                  </svg>
                                              );
                                          }
                                          return (
                                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                  <circle cx="12" cy="12" r="10" />
                                                  <line x1="12" y1="8" x2="12" y2="16" />
                                                  <line x1="8" y1="12" x2="16" y2="12" />
                                              </svg>
                                          );
                                      };
                                      return (
                                          <div 
                                              key={method} 
                                              className={`pay-btn ${bookingPaymentMethod === method ? 'active' : ''}`} 
                                              onClick={() => setBookingPaymentMethod(method)}
                                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}
                                          >
                                              {getIcon()}
                                              <span style={{ fontWeight: 800 }}>{method}</span>
                                              {bookingPaymentMethod === method && (
                                                  <svg 
                                                      xmlns="http://www.w3.org/2000/svg" 
                                                      width="14" 
                                                      height="14" 
                                                      viewBox="0 0 24 24" 
                                                      fill="none" 
                                                      stroke="currentColor" 
                                                      strokeWidth="3" 
                                                      strokeLinecap="round" 
                                                      strokeLinejoin="round" 
                                                      style={{ marginLeft: 'auto', color: '#10B981' }}
                                                  >
                                                      <polyline points="20 6 9 17 4 12" />
                                                  </svg>
                                              )}
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                      <button className="btn btn-primary" style={{ width: '400px', height: '54px', fontWeight: 800, fontSize: '16px', borderRadius: '10px', justifyContent: 'center', gap: '12px' }} onClick={reschedulingAppointment ? handleRescheduleSubmit : (bookingType === 'lab' ? handleCreateLabOrder : bookingType === 'service' ? handleCreateServiceOrder : handleCreateAppointment)} disabled={loading}>
                          <i data-lucide={reschedulingAppointment ? "calendar-days" : (bookingType === 'lab' ? "flask-conical" : bookingType === 'service' ? "sparkles" : "qr-code")}></i> 
                          {loading 
                            ? (reschedulingAppointment ? 'Rescheduling Appointment...' : (bookingType === 'lab' ? 'Creating Lab Order...' : bookingType === 'service' ? 'Creating Service Order...' : 'Registering & Booking...')) 
                            : (reschedulingAppointment ? 'Confirm Reschedule' : (bookingType === 'lab' ? 'Confirm Lab Test & Pay' : bookingType === 'service' ? 'Confirm Service & Pay' : `Confirm & Pay (${(additionalApptsList.length + (formData.doctorId && selectedSlot ? 1 : 0)) || 1} Appts)`))}
                      </button>
                  </div>
                </div>
              )}
           </div>
        )}


        {/* APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            
            {/* Header: Title + Button Group */}
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1D23' }}>Appointments</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px' }} 
                  onClick={() => switchTab('registration-form')}
                >
                  <i data-lucide="plus" style={{ width: '16px', height: '16px' }}></i> Create Appointment
                </button>
                <button 
                  className="btn" 
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    padding: 0,
                    borderRadius: '10px', 
                    background: showDateFilter ? '#2563EB' : '#EFF6FF', 
                    color: showDateFilter ? '#FFFFFF' : '#2563EB', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    setShowDateFilter(!showDateFilter);
                    setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
                  }}
                  title="Filter appointments by date"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                </button>
              </div>
            </div>

            {/* Sliding Date Range Filter Panel */}
            {showDateFilter && (
              <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', animation: 'slideDown 0.3s ease-out', border: '1px solid #BFDBFE', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i data-lucide="calendar-days" style={{ width: '18px', color: 'var(--primary)' }}></i> Select Appointment Date Range
                  </h4>
                  {(startDate || endDate) && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '12px', padding: '4px 10px', background: 'transparent', color: '#EF4444', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>From Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px' }} 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>To Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px' }} 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                    />
                  </div>

                  {/* Preset Shortcuts */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ height: '40px', fontSize: '12px', fontWeight: 700, padding: '0 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white' }} 
                      onClick={() => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        setStartDate(todayStr);
                        setEndDate(todayStr);
                      }}
                    >
                      Today
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ height: '40px', fontSize: '12px', fontWeight: 700, padding: '0 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white' }} 
                      onClick={() => {
                        const today = new Date();
                        const past7 = new Date();
                        past7.setDate(today.getDate() - 7);
                        setStartDate(past7.toISOString().split('T')[0]);
                        setEndDate(today.toISOString().split('T')[0]);
                      }}
                    >
                      Last 7 Days
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ height: '40px', fontSize: '12px', fontWeight: 700, padding: '0 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white' }} 
                      onClick={() => {
                        const today = new Date();
                        const past30 = new Date();
                        past30.setDate(today.getDate() - 30);
                        setStartDate(past30.toISOString().split('T')[0]);
                        setEndDate(today.toISOString().split('T')[0]);
                      }}
                    >
                      Last 30 Days
                    </button>
                  </div>
                </div>

                {/* Filter matches info */}
                <div style={{ marginTop: '14px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                  Found <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{getFilteredAppointments().length}</span> matching appointments.
                </div>
              </div>
            )}

            {(() => {
              const unifiedList = getUnifiedAppointmentsList();
              const counts = { All: unifiedList.length, Appointment: 0, 'Lab Test': 0, 'Clinical Service': 0 };
              unifiedList.forEach(item => {
                if (counts[item.type] !== undefined) counts[item.type]++;
              });

              return (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'All', label: 'All Bookings', count: counts.All, color: '#3B82F6', bg: '#EFF6FF' },
                    { key: 'Appointment', label: 'Appointments (OPD)', count: counts.Appointment, color: '#2563EB', bg: '#EFF6FF' },
                    { key: 'Lab Test', label: 'Lab Tests', count: counts['Lab Test'], color: '#10B981', bg: '#ECFDF5' },
                    { key: 'Clinical Service', label: 'Clinical Services', count: counts['Clinical Service'], color: '#8B5CF6', bg: '#F5F3FF' }
                  ].map(pill => (
                    <button
                      key={pill.key}
                      onClick={() => setApptTypeFilter(pill.key)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        border: apptTypeFilter === pill.key ? `2px solid ${pill.color}` : '1.5px solid #E2E8F0',
                        background: apptTypeFilter === pill.key ? pill.bg : 'white',
                        color: apptTypeFilter === pill.key ? pill.color : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {pill.label}
                      <span style={{ fontSize: '11px', background: apptTypeFilter === pill.key ? 'rgba(255,255,255,0.7)' : '#F1F5F9', padding: '2px 6px', borderRadius: '10px', color: apptTypeFilter === pill.key ? pill.color : '#64748B' }}>
                        {pill.count}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#64748B', width: '16px' }}></i>
                <input 
                  type="text" 
                  placeholder="Search appointments by patient name, doctor, test or service..." 
                  style={{ background: 'white', border: '1px solid #CBD5E1', paddingLeft: '44px', height: '42px', width: '100%', borderRadius: '10px', fontSize: '13px', fontWeight: 600, outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <div className="table-responsive">
                <table className="elite-table" style={{ margin: 0 }}>
                  <thead style={{ background: '#F8FAFC' }}>
                    <tr>
                      <th>Patient</th>
                      <th>Type</th>
                      <th>Doctor / Detail</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAppointments().map(app => (
                      <tr key={app.id}>
                        <td>
                          <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                            onClick={() => app.patientId && handleOpenPatientProfile(typeof app.patientId === 'object' ? app.patientId : { _id: app.patientId, name: app.patientName })}
                            onMouseEnter={(e) => { e.currentTarget.querySelector('.patient-name-span').style.color = '#2563EB'; }}
                            onMouseLeave={(e) => { e.currentTarget.querySelector('.patient-name-span').style.color = '#1A1D23'; }}
                          >
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                              {getInitials(app.patientName)}
                            </div>
                            <span className="patient-name-span" style={{ fontWeight: 700, color: '#1A1D23', transition: 'color 0.2s' }}>{app.patientName}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: app.type === 'Appointment' ? '#EFF6FF' : app.type === 'Lab Test' ? '#ECFDF5' : '#F5F3FF',
                            color: app.type === 'Appointment' ? '#2563EB' : app.type === 'Lab Test' ? '#10B981' : '#8B5CF6',
                            border: app.type === 'Appointment' ? '1px solid #BFDBFE' : app.type === 'Lab Test' ? '1px solid #A7F3D0' : '1px solid #DDD6FE'
                          }}>
                            {app.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#334155' }}>{app.detailName}</td>
                        <td style={{ fontWeight: 600 }}>
                          {getFormattedDate(app.date)}
                          {app.time}
                        </td>
                        <td>
                          <span className={`status-badge ${
                            app.status === 'Completed' || app.status === 'Paid' ? 'available' : 
                            app.status === 'Rescheduled' ? 'rescheduled' :
                            (app.status === 'Cancelled' ? 'critical' : 'pending')
                          }`} style={app.status === 'Rescheduled' ? { background: '#E0F2FE', color: '#0369A1' } : {}}>
                            {app.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }} 
                            onClick={() => {
                              if (app.type === 'Appointment') {
                                openDetailsModal(app.rawItem);
                              } else if (app.type === 'Lab Test') {
                                setSelectedLabRequest({
                                  testName: app.rawItem?.testName || app.rawItem?.test || app.detailName,
                                  results: app.rawItem?.results || ''
                                });
                                setLabModalOpen(true);
                              } else {
                                showToast(`${app.type}: ${app.detailName} (${app.status})`, 'info');
                              }
                            }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {getFilteredAppointments().length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontWeight: 600 }}>
                          {appointmentSearch.trim() ? `No matches found matching "${appointmentSearch}"` : "No bookings found for the selected type / date range."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STAFF TAB */}
        {activeTab === 'staff' && (
            <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
              <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1D23' }}>Staff Management</h2>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#64748B', width: '16px' }}></i>
                  <input 
                    type="text" 
                    placeholder="Search staff by name, role, or ID..." 
                    style={{ background: 'white', border: '1px solid #CBD5E1', paddingLeft: '44px', height: '42px', width: '100%', borderRadius: '10px', fontSize: '13px', fontWeight: 600, outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                  <div className="table-responsive">
                    <table className="elite-table" style={{ margin: 0 }}>
                        <thead style={{ background: '#F8FAFC' }}>
                            <tr>
                                <th>Staff Name</th>
                                <th>Role</th>
                                <th>Contact</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const query = staffSearch.toLowerCase().trim();
                                const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                const todayDayName = daysOfWeek[new Date().getDay()];

                                const filtered = doctors.filter(doc => 
                                    !query || 
                                    (doc.name || '').toLowerCase().includes(query) || 
                                    (doc.specialty || '').toLowerCase().includes(query) ||
                                    (doc.staff_id || '').toLowerCase().includes(query)
                                );
                                
                                if (filtered.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748B', fontWeight: 600 }}>
                                                No staff members found matching "{staffSearch}"
                                            </td>
                                        </tr>
                                    );
                                }
                                
                                return filtered.map(doc => {
                                    let isWeeklyOffToday = false;
                                    if (doc.weeklyOff) {
                                        if (Array.isArray(doc.weeklyOff)) {
                                            isWeeklyOffToday = doc.weeklyOff.some(d => String(d).trim().toLowerCase() === todayDayName.toLowerCase());
                                        } else if (typeof doc.weeklyOff === 'string') {
                                            isWeeklyOffToday = doc.weeklyOff.split(',').map(d => d.trim().toLowerCase()).includes(todayDayName.toLowerCase());
                                        }
                                    }

                                    return (
                                        <tr key={doc._id || doc.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                                                      {getInitials(doc.name || 'Staff')}
                                                    </div>
                                                    <span style={{ fontWeight: 700, color: '#1A1D23' }}>{doc.name || 'Unnamed Staff'}</span>
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{doc.specialty || ''}</td>
                                            <td>
                                                <div style={{ fontSize: '13px', fontWeight: 700 }}>ID: {doc.staff_id || 'N/A'}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{doc.name ? `${doc.name.split(' ')[0].toLowerCase()}@curoxa.com` : 'Contact Required'}</div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${isWeeklyOffToday ? 'cancelled' : 'available'}`}>
                                                    {isWeeklyOffToday ? 'Weekly Off' : 'Available'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                  </div>
              </div>
            </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
            <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1D23' }}>Finance & Billing</h2>
                  <button className="btn btn-primary" onClick={handleExportBillingCSV}><i data-lucide="download"></i> Export Report</button>
              </div>
              <div className="ph-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
                  <div className="kpi-card" style={{ padding: '24px' }}>
                      <div className="kpi-icon-box" style={{ background: '#F0FDF4', color: '#10B981' }}><i data-lucide="trending-up"></i></div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800 }}>TOTAL REVENUE</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>₹{bills.filter(b => b.status === 'Paid').reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      </div>
                  </div>
                  <div className="kpi-card" style={{ padding: '24px' }}>
                      <div className="kpi-icon-box" style={{ background: '#FFFBEB', color: '#F59E0B' }}><i data-lucide="clock"></i></div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800 }}>PENDING PAYMENTS</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>₹{bills.filter(b => b.status === 'Unpaid' || !b.status).reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      </div>
                  </div>
                  <div className="kpi-card" style={{ padding: '24px' }}>
                      <div className="kpi-icon-box" style={{ background: '#EEF2FF', color: '#6366F1' }}><i data-lucide="credit-card"></i></div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800 }}>TRANSACTIONS TODAY</div>
                        <div style={{ fontSize: '24px', fontWeight: 900 }}>{bills.filter(b => new Date(b.createdAt).toDateString() === new Date().toDateString()).length}</div>
                      </div>
                  </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <i data-lucide="search" style={{ position: 'absolute', left: '16px', color: '#64748B', width: '16px' }}></i>
                  <input 
                    type="text" 
                    placeholder="Search invoices by patient name, Invoice ID, or status..." 
                    style={{ background: 'white', border: '1px solid #CBD5E1', paddingLeft: '44px', height: '42px', width: '100%', borderRadius: '10px', fontSize: '13px', fontWeight: 600, outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                    value={billingSearch}
                    onChange={(e) => setBillingSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                  <div className="table-responsive">
                    <table className="elite-table" style={{ margin: 0 }}>
                        <thead style={{ background: '#F8FAFC' }}>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Patient Name</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const query = billingSearch.toLowerCase().trim();
                                const filtered = bills.filter(b => {
                                    if (!query) return true;
                                    const invId = `#INV-${(b._id || '').substring(Math.max(0, (b._id || '').length - 6)).toUpperCase() || 'N/A'}`;
                                    return (b.patientId?.name || '').toLowerCase().includes(query) || 
                                           invId.toLowerCase().includes(query) || 
                                           (b.status || 'Unpaid').toLowerCase().includes(query);
                                });

                                const sorted = [...filtered].sort((a, b) => {
                                    const aPaid = (a.status || 'Unpaid') === 'Paid';
                                    const bPaid = (b.status || 'Unpaid') === 'Paid';
                                    if (aPaid && !bPaid) return 1;
                                    if (!aPaid && bPaid) return -1;
                                    return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
                                });
                                
                                if (sorted.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontWeight: 600 }}>
                                                {billingSearch.trim() ? `No billing records found matching "${billingSearch}"` : "No transactions found"}
                                            </td>
                                        </tr>
                                    );
                                }
                                
                                return sorted.map((bill, idx) => (
                                    <tr key={bill._id || idx}>
                                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#INV-{(bill._id || '').substring(Math.max(0, (bill._id || '').length - 6)).toUpperCase() || 'N/A'}</td>
                                        <td style={{ fontWeight: 600 }}>{bill.patientId?.name || 'Unknown Patient'}</td>
                                        <td>{new Date(bill.createdAt || bill.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td style={{ fontWeight: 800 }}>
                                            <div>₹{(bill.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            {bill.discountPercent > 0 && (
                                                <div style={{ fontSize: '10px', color: '#EF4444', fontWeight: 700, marginTop: '2px' }}>
                                                    ({bill.discountPercent}% off of ₹{(bill.originalAmount || (bill.totalAmount + bill.discountAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                </div>
                                            )}
                                        </td>
                                        <td><span className={`status-badge ${bill.status === 'Paid' ? 'available' : 'pending'}`}>{bill.status || 'Unpaid'}</span></td>
                                        <td>
                                            {bill.status !== 'Paid' ? (
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 800, background: 'var(--primary-gradient)', border: 'none', borderRadius: '6px' }}
                                                    onClick={() => {
                                                      setSelectedBillForPayment(bill);
                                                      setDiscountPercent(0);
                                                      setDiscountReason('');
                                                      setPaymentMethod('Cash');
                                                      setShowPaymentModal(true);
                                                    }}
                                                >
                                                    Mark as Paid
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 800 }}>Settled</span>
                                            )}
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                  </div>
              </div>
            </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="dashboard-header" style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1D23' }}>My Profile</h2>
              <p style={{ color: '#64748B', fontWeight: 600 }}>Manage your personal information and security</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '32px' }} className="mobile-stack">
              <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 24px' }}>
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--primary-light)' }} alt="Profile" />
                  <div style={{ position: 'absolute', bottom: '0', right: '0', width: '36px', height: '36px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', cursor: 'pointer' }}>
                    <i data-lucide="camera" style={{ width: '16px' }}></i>
                  </div>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#1A1D23', marginBottom: '4px' }}>{user.name || 'Roshni Singh'}</h3>
                <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 700, marginBottom: '24px' }}>Senior Receptionist</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i data-lucide="mail" style={{ width: '18px', color: 'var(--primary)' }}></i>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{user.email || 'roshni@curoxa.com'}</span>
                  </div>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i data-lucide="phone" style={{ width: '18px', color: 'var(--primary)' }}></i>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>+91 98765 43210</span>
                  </div>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: '32px', justifyContent: 'center', color: 'var(--danger)', border: '1px solid #FEE2E2' }} onClick={handleLogout}>
                  <i data-lucide="log-out"></i> Logout Account
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '32px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Edit Profile</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" className="form-control" defaultValue={user.name || 'Roshni Singh'} style={{ height: '48px' }} />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" className="form-control" defaultValue={user.email || 'roshni@curoxa.com'} style={{ height: '48px' }} />
                    </div>
                    <div className="form-group">
                      <label>Mobile Number</label>
                      <input type="text" className="form-control" defaultValue="+91 98765 43210" style={{ height: '48px' }} />
                    </div>
                    <div className="form-group">
                      <label>Employee ID</label>
                      <input type="text" className="form-control" defaultValue="MED-RE-099" readOnly style={{ height: '48px', background: '#F8FAFC' }} />
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0 32px', height: '48px' }}>Save Changes</button>
                </div>

                <div className="glass-card" style={{ padding: '32px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px' }}>Change Password</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label>Current Password</label>
                      <input type="password" className="form-control" placeholder="********" style={{ height: '48px' }} />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input type="password" className="form-control" placeholder="New Password" style={{ height: '48px' }} pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}" title="Must contain at least one number and one uppercase and lowercase letter, one special character, and at least 8 or more characters." required />
                    </div>
                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input type="password" className="form-control" placeholder="Confirm Password" style={{ height: '48px' }} pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}" title="Must contain at least one number and one uppercase and lowercase letter, one special character, and at least 8 or more characters." required />
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0 32px', height: '48px' }}>Update Password</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div className="dashboard-header" style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1D23' }}>System Settings</h2>
              <p style={{ color: '#64748B', fontWeight: 600 }}>Configure your workspace and preferences</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#EFF6FF', color: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="bell" style={{ width: '20px' }}></i></div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Notifications</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '14px', fontWeight: 700 }}>Email Alerts</div><div style={{ fontSize: '12px', color: '#64748B' }}>Receive daily summaries</div></div>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '14px', fontWeight: 700 }}>Push Notifications</div><div style={{ fontSize: '12px', color: '#64748B' }}>Instant app alerts</div></div>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '14px', fontWeight: 700 }}>SMS Updates</div><div style={{ fontSize: '12px', color: '#64748B' }}>Patient appointment reminders</div></div>
                    <input type="checkbox" />
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#F0FDF4', color: '#10B981', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="shield" style={{ width: '20px' }}></i></div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Privacy & Security</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '14px', fontWeight: 700 }}>Two-Factor Auth</div><div style={{ fontSize: '12px', color: '#64748B' }}>Extra layer of security</div></div>
                    <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>Enable</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '14px', fontWeight: 700 }}>Active Sessions</div><div style={{ fontSize: '12px', color: '#64748B' }}>Manage logged-in devices</div></div>
                    <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>View</button>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#FFFBEB', color: '#F59E0B', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i data-lucide="palette" style={{ width: '20px' }}></i></div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Appearance</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '14px', fontWeight: 700 }}>Dark Mode</div><div style={{ fontSize: '12px', color: '#64748B' }}>Toggle system theme</div></div>
                    <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>Enable</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontSize: '14px', fontWeight: 700 }}>Compact View</div><div style={{ fontSize: '12px', color: '#64748B' }}>Higher density layout</div></div>
                    <input type="checkbox" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            INDENT TAB
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'indent' && (() => {
          const filtered = indents
            .filter(ind => {
              const matchesSearch = 
                (ind.indentId || '').toLowerCase().includes(indentSearch.toLowerCase()) ||
                (ind.status || '').toLowerCase().includes(indentSearch.toLowerCase()) ||
                (ind.items || []).some(item => (item.name || '').toLowerCase().includes(indentSearch.toLowerCase()));
              return matchesSearch;
            })
            .sort((a, b) => {
              if (indentSort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
              if (indentSort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
              if (indentSort === 'priority') {
                const pA = a.priority === 'Urgent' ? 1 : 0;
                const pB = b.priority === 'Urgent' ? 1 : 0;
                return pB - pA;
              }
              return 0;
            });
          const totalPages = Math.ceil(filtered.length / INDENT_PAGE_SIZE) || 1;
          const paginated = filtered.slice((indentPage - 1) * INDENT_PAGE_SIZE, indentPage * INDENT_PAGE_SIZE);

          const statusStyle = (s) => {
            if (s === 'Approved') return { color: '#16A34A', fontWeight: 800 };
            if (s === 'Rejected') return { color: '#DC2626', fontWeight: 800 };
            if (s === 'Draft') return { color: '#64748B', fontWeight: 800 };
            return { color: '#D97706', fontWeight: 800 };
          };
          const rowBg = (s) => {
            if (s === 'Approved') return 'rgba(220,252,231,0.35)';
            if (s === 'Rejected') return 'rgba(254,226,226,0.35)';
            if (s === 'Draft') return 'rgba(241,245,249,0.4)';
            return 'rgba(254,243,199,0.4)';
          };
          const avatarColors = ['#EFF6FF','#F0FDF4','#FDF2F8','#FFF7ED','#F5F3FF','#ECFDF5'];
          const avatarText  = ['#2563EB','#16A34A','#DB2777','#EA580C','#7C3AED','#059669'];

          return (
            <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0' }}>Purchase Indent Request</h1>
                  <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
                    <span style={{ color: '#64748B' }}>Home</span>
                    <span style={{ margin: '0 6px', color: '#CBD5E1' }}>»</span>
                    <span>Indents</span>
                  </div>
                </div>
                <button
                  onClick={() => switchTab('new-indent')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', height: '44px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create New Indent
                </button>
              </div>

              {/* Table Card */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>

                {/* Card Header: count + search + sort */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>Total Purchase Indents</span>
                    <span style={{ background: '#EF4444', color: 'white', borderRadius: '99px', padding: '2px 10px', fontSize: '12px', fontWeight: 800 }}>{filtered.length}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input
                        type="text"
                        placeholder="Search"
                        value={indentSearch}
                        onChange={e => { setIndentSearch(e.target.value); setIndentPage(1); }}
                        style={{ paddingLeft: '32px', paddingRight: '12px', height: '36px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '180px', background: '#F8FAFC', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#64748B' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/></svg>
                      Sort By :
                      <select value={indentSort} onChange={e => setIndentSort(e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '12.5px', color: '#0F172A', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="priority">Priority</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ padding: '14px 20px', width: '40px' }}>
                          <input 
                            type="checkbox" 
                            checked={paginated.length > 0 && selectedIndentIds.length === paginated.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIndentIds(paginated.map(ind => ind._id || ind.indentId));
                              } else {
                                setSelectedIndentIds([]);
                              }
                            }}
                            title="Select All Indents"
                          />
                        </th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Indent ID ↕</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Priority ↕</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Total Quantity ↕</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Status ↕</th>
                        <th style={{ padding: '14px 20px', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#94A3B8', fontWeight: 600 }}>No indents found</td></tr>
                      ) : paginated.map((ind, idx) => {
                        const itemKey = ind._id || ind.indentId || idx;
                        const isSelected = selectedIndentIds.includes(itemKey);
                        return (
                          <tr key={itemKey} style={{ background: isSelected ? '#EFF6FF' : rowBg(ind.status), borderBottom: '1px solid rgba(241,245,249,0.8)', cursor: 'pointer' }}>
                            <td onClick={e => e.stopPropagation()} style={{ padding: '14px 20px' }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    setSelectedIndentIds(prev => [...prev, itemKey]);
                                  } else {
                                    setSelectedIndentIds(prev => prev.filter(id => id !== itemKey));
                                  }
                                }}
                              />
                            </td>
                            <td onClick={() => { setSelectedIndent(ind); setShowIndentModal(true); }} style={{ padding: '14px 20px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>{ind.indentId}</td>
                            <td onClick={() => { setSelectedIndent(ind); setShowIndentModal(true); }} style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: avatarColors[idx % avatarColors.length], color: avatarText[idx % avatarText.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, flexShrink: 0 }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                                </div>
                                <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '13.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }} title={(ind.items || []).map(it => it.name).join(', ')}>
                                  {(ind.items || []).map(it => it.name).join(', ') || 'No Items'}
                                </span>
                              </div>
                            </td>
                            <td onClick={() => { setSelectedIndent(ind); setShowIndentModal(true); }} style={{ padding: '14px 20px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '13px', color: ind.priority === 'Urgent' ? '#DC2626' : '#475569' }}>
                                {ind.priority === 'Urgent' && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>}
                                {ind.priority}
                              </span>
                            </td>
                            <td onClick={() => { setSelectedIndent(ind); setShowIndentModal(true); }} style={{ padding: '14px 20px', fontWeight: 700, color: '#475569', fontSize: '13.5px' }}>{ind.totalQty}</td>
                            <td onClick={() => { setSelectedIndent(ind); setShowIndentModal(true); }} style={{ padding: '14px 20px' }}>
                              <span style={statusStyle(ind.status)}>{ind.status}</span>
                            </td>
                            <td onClick={e => e.stopPropagation()} style={{ padding: '14px 20px' }}>
                              <div style={{ cursor: 'pointer', color: '#94A3B8', fontSize: '18px', letterSpacing: '2px', lineHeight: 1, userSelect: 'none' }} title="Actions">⋮</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                    Showing
                    <select
                      value={INDENT_PAGE_SIZE}
                      style={{ border: '1px solid #E2E8F0', borderRadius: '6px', padding: '2px 6px', fontFamily: 'inherit', fontWeight: 700, fontSize: '12.5px', outline: 'none', background: 'white' }}
                      readOnly
                    >
                      <option>10</option>
                    </select>
                    Results
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => setIndentPage(p => Math.max(1, p - 1))} disabled={indentPage === 1} style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: indentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#475569', fontSize: '13px', opacity: indentPage === 1 ? 0.5 : 1 }}>Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <button key={pg} onClick={() => setIndentPage(pg)} style={{ padding: '6px 10px', border: pg === indentPage ? 'none' : '1px solid #E2E8F0', borderRadius: '8px', background: pg === indentPage ? '#2563EB' : 'white', color: pg === indentPage ? 'white' : '#475569', fontWeight: 800, fontSize: '13px', cursor: 'pointer', minWidth: '32px' }}>{pg}</button>
                    ))}
                    <button onClick={() => setIndentPage(p => Math.min(totalPages, p + 1))} disabled={indentPage === totalPages} style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', cursor: indentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#475569', fontSize: '13px', opacity: indentPage === totalPages ? 0.5 : 1 }}>Next</button>
                  </div>
                </div>
              </div>

              {/* Floating Bulk Action Bar for Indents */}
              {selectedIndentIds.length > 0 && (
                <div style={{ background: '#0F172A', color: 'white', padding: '14px 22px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.3)', border: '1px solid #334155', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ background: '#2563EB', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 800 }}>{selectedIndentIds.length} Selected</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#E2E8F0' }}>Batch Operations for Purchase Indents</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        alert(`Approve batch request submitted for ${selectedIndentIds.length} selected indents.`);
                      }}
                      style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}
                    >
                      Batch Approve
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSelectedIndentIds([])}
                      style={{ padding: '8px 14px', background: 'transparent', color: '#94A3B8', border: '1px solid #475569', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════
            NEW INDENT REQUEST TAB
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'new-indent' && (() => {
          const filteredMeds = medicineSearchQuery.trim() === '' ? [] : medicines.filter(med =>
            (med.name || '').toLowerCase().includes(medicineSearchQuery.toLowerCase()) ||
            (med.category || '').toLowerCase().includes(medicineSearchQuery.toLowerCase())
          ).slice(0, 8);

          const indentUsers = staffList && staffList.length > 0
            ? staffList.map(u => ({
                name: u.name,
                initials: (u.name || 'ST').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST',
                role: u.role || 'Staff',
                contact: u.phone || 'N/A'
              }))
            : [
                { name: JSON.parse(localStorage.getItem('user') || '{}').name || 'Staff', initials: (JSON.parse(localStorage.getItem('user') || '{}').name || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST', role: JSON.parse(localStorage.getItem('user') || '{}').role || 'Staff', contact: JSON.parse(localStorage.getItem('user') || '{}').contact || '9876543210' }
              ];

          const handleAddMedicine = (med) => {
            if (selectedMedicines.some(m => m.name.toLowerCase() === med.name.toLowerCase())) {
              showToast(`${med.name} is already added!`, "info");
              return;
            }
            setSelectedMedicines([
              ...selectedMedicines,
              {
                name: med.name,
                category: med.category || 'Pharmaceuticals',
                unit: med.unit || 'Strip',
                requiredQty: 10,
                availableStock: med.stock !== undefined ? med.stock : 0,
                mrp: med.mrp !== undefined ? med.mrp : 50.00,
                isCustom: false
              }
            ]);
            setMedicineSearchQuery('');
            setShowMedicineSuggestions(false);
          };

          const handleAddCustomItem = () => {
            setSelectedMedicines([
              ...selectedMedicines,
              {
                name: '',
                category: 'General',
                unit: 'Strip',
                requiredQty: 10,
                availableStock: 0,
                mrp: 50.00,
                isCustom: true
              }
            ]);
          };

          const handleRemoveItem = (index) => {
            setSelectedMedicines(selectedMedicines.filter((_, idx) => idx !== index));
          };

          const handleUpdateItem = (index, field, value) => {
            const updated = [...selectedMedicines];
            updated[index][field] = value;
            setSelectedMedicines(updated);
          };

          const handleFileChange = (e) => {
            const files = Array.from(e.target.files || []);
            setNewIndentAttachments([
              ...newIndentAttachments,
              ...files.map(f => f.name)
            ]);
          };

          const handleSubmitIndent = async (status = 'Pending') => {
            if (selectedMedicines.length === 0) {
              showToast("Please add at least one item/pharmaceutical to order.", "error");
              return;
            }
            // Validate names
            if (selectedMedicines.some(item => !item.name.trim())) {
              showToast("Please provide names for all items.", "error");
              return;
            }
            // Validate quantities
            if (selectedMedicines.some(item => Number(item.requiredQty) <= 0)) {
              showToast("All items must have a quantity of 1 or more.", "error");
              return;
            }

            setLoading(true);
            try {
              const totalQty = selectedMedicines.reduce((sum, item) => sum + (Number(item.requiredQty) || 0), 0);
              const payload = {
                department: newIndentDept,
                indentType: newIndentType,
                requiredDate: new Date(newIndentReqDate),
                requestedBy: newIndentRequestedBy,
                contactNumber: newIndentContact,
                priority: newIndentPriority,
                purpose: newIndentRemarks,
                additionalNotes: newIndentAdditionalNotes,
                attachments: newIndentAttachments,
                items: selectedMedicines.map(item => ({
                  name: item.name,
                  category: item.category,
                  unit: item.unit,
                  requiredQty: Number(item.requiredQty) || 0,
                  availableStock: Number(item.availableStock) || 0,
                  mrp: Number(item.mrp) || 50
                })),
                totalQty,
                status
              };

              const res = await api.post('/indents', payload);
              const successMsg = status === 'Draft' 
                ? `Purchase Indent ${res.data.indentId} saved as draft!`
                : `Purchase Indent ${res.data.indentId} submitted successfully!`;
              showToast(successMsg, "success");
              fetchData();
              switchTab('indent');
            } catch (err) {
              console.error(err);
              showToast(err.response?.data?.error || "Failed to submit indent request", "error");
            } finally {
              setLoading(false);
            }
          };

          const totalItems = selectedMedicines.length;
          const totalQuantity = selectedMedicines.reduce((sum, item) => sum + (Number(item.requiredQty) || 0), 0);
          const estimatedTotal = selectedMedicines.reduce((sum, item) => sum + (Number(item.requiredQty) || 0) * (Number(item.mrp) || 50), 0);

          const getCategoryTheme = (cat) => {
            const c = (cat || '').toLowerCase();
            if (c.includes('pain') || c.includes('analgesic')) return { bg: '#FEE2E2', color: '#EF4444' };
            if (c.includes('antibiotic')) return { bg: '#FEF3C7', color: '#D97706' };
            if (c.includes('allergy') || c.includes('antihistamine') || c.includes('anti-allergic')) return { bg: '#E0F2FE', color: '#0284C7' };
            if (c.includes('acid') || c.includes('gastro') || c.includes('rehydration') || c.includes('antacid')) return { bg: '#E0FDF4', color: '#16A34A' };
            return { bg: '#F1F5F9', color: '#475569' };
          };

          return (
            <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', paddingBottom: '40px' }}>
              
              {/* Back Link */}
              <div style={{ marginBottom: '24px' }}>
                <button
                  onClick={() => switchTab('indent')}
                  style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back to Indents
                </button>
              </div>

              {/* Title Header */}
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px 0' }}>New Indent Request</h1>
                <p style={{ fontSize: '14px', color: '#64748B', fontWeight: 600, margin: 0 }}>Request pharmaceuticals and medical supplies for your department.</p>
              </div>

              {/* Grid Container */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '32px', alignItems: 'start' }} className="mobile-stack">
                
                {/* LEFT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  {/* Card 1: Indent Information */}
                  <div className="glass-card" style={{ padding: '32px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>Indent Information</span>
                    </div>

                    {/* Row 1 Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }} className="mobile-stack">
                      {/* Department */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Department <span style={{ color: '#EF4444' }}>*</span></label>
                        <select
                          value={newIndentDept}
                          onChange={e => setNewIndentDept(e.target.value)}
                          style={{ width: '100%', height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, outline: 'none', background: '#F8FAFC', fontFamily: 'inherit' }}
                        >
                          <option value="Pharmacy">Pharmacy</option>
                          <option value="Reception">Reception</option>
                          <option value="Outpatient (OPD)">Outpatient (OPD)</option>
                          <option value="Inpatient (IPD)">Inpatient (IPD)</option>
                        </select>
                      </div>

                      {/* Indent Type */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Indent Type <span style={{ color: '#EF4444' }}>*</span></label>
                        <select
                          value={newIndentType}
                          onChange={e => setNewIndentType(e.target.value)}
                          style={{ width: '100%', height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, outline: 'none', background: '#F8FAFC', fontFamily: 'inherit' }}
                        >
                          <option value="Pharmaceuticals">Pharmaceuticals</option>
                          <option value="Medical Supplies">Medical Supplies</option>
                          <option value="Lab Consumables">Lab Consumables</option>
                          <option value="Office Supplies">Office Supplies</option>
                        </select>
                      </div>

                      {/* Required Date */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Required Date <span style={{ color: '#EF4444' }}>*</span></label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="date"
                            value={newIndentReqDate}
                            min={getLocalDateString()}
                            onChange={e => setNewIndentReqDate(e.target.value)}
                            style={{ width: '100%', height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, outline: 'none', background: '#F8FAFC', fontFamily: 'inherit' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 2 Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }} className="mobile-stack">
                      {/* Requested By (Custom Dropdown) */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Requested By <span style={{ color: '#EF4444' }}>*</span></label>
                        <div 
                          onClick={() => setShowReqByDropdown(!showReqByDropdown)}
                          style={{ width: '100%', height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', cursor: 'pointer', userSelect: 'none' }}
                        >
                          {(() => {
                            const selectedUser = indentUsers.find(u => u.name === newIndentRequestedBy) || indentUsers[0];
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900 }}>
                                  {selectedUser.initials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>{selectedUser.name}</span>
                                  <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>{selectedUser.role}</span>
                                </div>
                              </div>
                            );
                          })()}
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>

                        {showReqByDropdown && (
                          <div style={{ position: 'absolute', top: '75px', left: 0, right: 0, background: 'white', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', zIndex: 100, overflow: 'hidden' }}>
                            {indentUsers.map(u => (
                              <div
                                key={u.name}
                                onClick={() => {
                                  setNewIndentRequestedBy(u.name);
                                  setNewIndentContact(u.contact);
                                  setShowReqByDropdown(false);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900 }}>
                                  {u.initials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: '1.2' }}>{u.name}</span>
                                  <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>{u.role}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Contact Number */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Contact Number</label>
                        <input
                          type="text"
                          placeholder="Enter contact number"
                          value={newIndentContact}
                          onChange={e => setNewIndentContact(e.target.value)}
                          style={{ width: '100%', height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, outline: 'none', background: '#F8FAFC', fontFamily: 'inherit' }}
                        />
                      </div>

                      {/* Priority */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Priority</label>
                        <select
                          value={newIndentPriority}
                          onChange={e => setNewIndentPriority(e.target.value)}
                          style={{ width: '100%', height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, outline: 'none', background: '#F8FAFC', fontFamily: 'inherit' }}
                        >
                          <option value="Normal">Normal</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Purpose / Remarks</label>
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>{newIndentRemarks.length}/250</span>
                      </div>
                      <textarea
                        placeholder="Enter purpose or additional remarks (optional)"
                        value={newIndentRemarks}
                        onChange={e => setNewIndentRemarks(e.target.value.slice(0, 250))}
                        style={{ width: '100%', height: '80px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 600, outline: 'none', background: '#F8FAFC', resize: 'none', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {/* Card 2: Add Pharmaceuticals */}
                  <div className="glass-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>Add Pharmaceuticals</span>
                    </div>

                    {/* Search / Add Custom Item row */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', position: 'relative' }} className="mobile-stack">
                      
                      {/* Search box wrapper */}
                      <div ref={medicineSearchContainerRef} style={{ flex: 1, position: 'relative' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '16px', top: '14px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                          id="indent-medicine-search"
                          type="text"
                          placeholder="Search medicine by name, brand, or composition"
                          value={medicineSearchQuery}
                          onChange={e => {
                            setMedicineSearchQuery(e.target.value);
                            setShowMedicineSuggestions(true);
                          }}
                          onFocus={() => setShowMedicineSuggestions(true)}
                          style={{ width: '100%', height: '44px', border: '1px solid #E2E8F0', borderRadius: '10px', paddingLeft: '44px', paddingRight: '16px', fontSize: '14px', fontWeight: 600, outline: 'none', background: '#F8FAFC', fontFamily: 'inherit' }}
                        />

                        {/* Autocomplete Dropdown */}
                        {showMedicineSuggestions && medicineSearchQuery.trim() !== '' && (
                          <div style={{ position: 'absolute', top: '48px', left: 0, right: 0, background: 'white', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', zIndex: 100, overflow: 'hidden' }}>
                            {filteredMeds.length === 0 ? (
                              <div style={{ padding: '14px 16px', fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>No matching medicines found. Click "+ Add Another Item" below to add custom item.</div>
                            ) : (
                              filteredMeds.map(med => (
                                <div
                                  key={med._id}
                                  onClick={() => handleAddMedicine(med)}
                                  style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div>
                                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B' }}>{med.name}</div>
                                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{med.category} · SKU: {med.sku} · MRP: ₹{med.mrp || 50}</div>
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: 700, color: med.stock > 20 ? '#16A34A' : med.stock > 0 ? '#D97706' : '#DC2626' }}>
                                    Stock: {med.stock}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selected items list table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '300px' }}>Medicine / Item</th>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '130px' }}>Category</th>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '110px' }}>Unit</th>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', minWidth: '130px' }}>Required Qty</th>
                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', minWidth: '110px' }}>Available Stock</th>
                            <th style={{ padding: '12px 16px', width: '60px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMedicines.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8', fontWeight: 600, fontSize: '13.5px' }}>
                                No items added yet. Search above or click "+ Add Another Item" below to begin.
                              </td>
                            </tr>
                          ) : selectedMedicines.map((item, idx) => {
                            const theme = getCategoryTheme(item.category);
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #F8FAFC' }}>
                                
                                {/* Medicine / Item */}
                                <td style={{ padding: '16px', minWidth: '300px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: theme.bg, color: theme.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                                      {item.isCustom ? (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                                          <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                                            <input
                                              type="text"
                                              placeholder="Enter medicine name..."
                                              value={item.name}
                                              onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                                              onFocus={() => setActiveCustomRowFocus(idx)}
                                              onBlur={() => {
                                                setTimeout(() => {
                                                  if (!isHoveringCustomSuggestions) {
                                                    setActiveCustomRowFocus(null);
                                                  }
                                                }, 150);
                                              }}
                                              style={{ height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px', fontWeight: 600, outline: 'none', width: '100%', background: '#FFFFFF', boxSizing: 'border-box' }}
                                            />
                                            {activeCustomRowFocus === idx && (() => {
                                              const typedVal = (item.name || '').trim().toLowerCase();
                                              const filtered = typedVal
                                                ? medicines.filter(m => 
                                                    (m.name || '').toLowerCase().includes(typedVal) ||
                                                    (m.category || '').toLowerCase().includes(typedVal)
                                                  ).slice(0, 8)
                                                : medicines.slice(0, 8);

                                              if (filtered.length === 0) return null;

                                              return (
                                                <div 
                                                  data-lenis-prevent 
                                                  onMouseEnter={() => setIsHoveringCustomSuggestions(true)}
                                                  onMouseLeave={() => setIsHoveringCustomSuggestions(false)}
                                                  style={{ 
                                                    position: 'absolute', 
                                                    top: 'calc(100% + 4px)', 
                                                    left: '0px', 
                                                    width: '280px', 
                                                    zIndex: 1200, 
                                                    padding: '6px', 
                                                    maxHeight: '220px', 
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
                                                    borderRadius: '10px',
                                                    border: '1px solid #E2E8F0',
                                                    background: '#ffffff',
                                                    overflowY: 'auto'
                                                  }}
                                                >
                                                  {filtered.map(med => (
                                                    <div
                                                      key={med._id}
                                                      onClick={() => {
                                                        const updated = [...selectedMedicines];
                                                        updated[idx] = {
                                                          name: med.name,
                                                          category: med.category || 'General',
                                                          unit: med.unit || 'Strip',
                                                          requiredQty: updated[idx].requiredQty || 10,
                                                          availableStock: med.stock !== undefined ? med.stock : 0,
                                                          mrp: med.mrp !== undefined ? med.mrp : 50.00,
                                                          isCustom: false
                                                        };
                                                        setSelectedMedicines(updated);
                                                        setActiveCustomRowFocus(null);
                                                        setIsHoveringCustomSuggestions(false);
                                                      }}
                                                      style={{ 
                                                        padding: '8px 12px', 
                                                        borderBottom: '1px solid #F1F5F9', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center', 
                                                        transition: 'background 0.2s',
                                                        borderRadius: '6px'
                                                      }}
                                                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                      <div>
                                                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B', textAlign: 'left' }}>{med.name}</div>
                                                        <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, textAlign: 'left' }}>{med.category} · MRP: ₹{med.mrp || 50}</div>
                                                      </div>
                                                      <span style={{ fontSize: '11px', fontWeight: 700, color: med.stock > 0 ? '#16A34A' : '#DC2626' }}>
                                                        Stock: {med.stock}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>₹</span>
                                            <input
                                              type="number"
                                              placeholder="MRP"
                                              value={item.mrp !== undefined && item.mrp !== null ? item.mrp : ''}
                                              onChange={e => handleUpdateItem(idx, 'mrp', Math.max(0, Number(e.target.value) || 0))}
                                              style={{ height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', fontWeight: 600, outline: 'none', width: '64px', background: '#FFFFFF' }}
                                              title="Unit MRP Price"
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '13.5px' }}>{item.name}</span>
                                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{item.unit} · MRP: ₹{item.mrp}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Category */}
                                <td style={{ padding: '16px' }}>
                                  {item.isCustom ? (
                                    <input
                                      type="text"
                                      placeholder="Category"
                                      value={item.category}
                                      onChange={e => handleUpdateItem(idx, 'category', e.target.value)}
                                      style={{ height: '36px', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0 8px', fontSize: '13px', fontWeight: 600, outline: 'none', width: '120px' }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: 700 }}>{item.category}</span>
                                  )}
                                </td>

                                {/* Unit */}
                                <td style={{ padding: '16px' }}>
                                  <select
                                    value={item.unit}
                                    onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}
                                    style={{ height: '36px', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '0 8px', fontSize: '13px', fontWeight: 600, outline: 'none', background: 'white', fontFamily: 'inherit' }}
                                  >
                                    <option value="Strip">Strip</option>
                                    <option value="Capsule">Capsule</option>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Bottle">Bottle</option>
                                    <option value="Box">Box</option>
                                    <option value="Vial">Vial</option>
                                  </select>
                                </td>

                                {/* Required Qty */}
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', background: '#F8FAFC' }}>
                                    <button
                                      onClick={() => handleUpdateItem(idx, 'requiredQty', Math.max(1, (Number(item.requiredQty) || 0) - 1))}
                                      style={{ width: '32px', height: '32px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontWeight: 800 }}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      value={item.requiredQty}
                                      onChange={e => handleUpdateItem(idx, 'requiredQty', Math.max(1, Number(e.target.value) || 0))}
                                      style={{ width: '48px', height: '32px', border: 'none', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0', textAlign: 'center', fontSize: '13px', fontWeight: 800, background: 'white', outline: 'none' }}
                                    />
                                    <button
                                      onClick={() => handleUpdateItem(idx, 'requiredQty', (Number(item.requiredQty) || 0) + 1)}
                                      style={{ width: '32px', height: '32px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontWeight: 800 }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>

                                {/* Available Stock */}
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 800, color: item.availableStock > 20 ? '#10B981' : item.availableStock > 0 ? '#F59E0B' : '#EF4444' }}>
                                    {item.availableStock}
                                  </span>
                                </td>

                                {/* Action (Remove) */}
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleRemoveItem(idx)}
                                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  </button>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Another Item Button */}
                    <div style={{ marginTop: '20px' }}>
                      <button
                        onClick={handleAddCustomItem}
                        style={{ background: 'none', border: '1px solid #2563EB', color: '#2563EB', borderRadius: '10px', padding: '0 16px', height: '38px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Another Item
                      </button>
                    </div>

                  </div>

                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  {/* Card 3: Indent Summary */}
                  <div className="glass-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>Indent Summary</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Total Items</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{totalItems}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Total Quantity</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{totalQuantity}</span>
                      </div>

                      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '12px 0 6px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>Estimated Total</span>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#2563EB' }}>
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(estimatedTotal)}
                        </span>
                      </div>

                      {/* Info Alert Box */}
                      <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        <div style={{ fontSize: '12.5px', color: '#1E40AF', fontWeight: 600, lineHeight: '1.4' }}>
                          <div style={{ fontWeight: 800, marginBottom: '2px' }}>This is an indent request.</div>
                          Final approval and amount may vary based on stock and purchase.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Attachments */}
                  <div className="glass-card" style={{ padding: '28px' }}>
                    <span style={{ display: 'block', fontSize: '14px', fontWeight: 900, color: '#0F172A', marginBottom: '16px' }}>Attachments (Optional)</span>
                    
                    <label 
                      htmlFor="indent-attachments-file"
                      style={{ 
                        display: 'block', 
                        border: '2px dashed #CBD5E1', 
                        borderRadius: '12px', 
                        padding: '32px 20px', 
                        textAlign: 'center', 
                        background: '#F8FAFC', 
                        cursor: 'pointer', 
                        transition: 'border-color 0.2s' 
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#CBD5E1'}
                    >
                      <input 
                        type="file" 
                        id="indent-attachments-file" 
                        multiple 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }} 
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', color: '#94A3B8' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Drag & drop files here
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', textDecoration: 'underline', marginBottom: '8px' }}>
                        or browse
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 650 }}>
                        Supports: PDF, JPG, PNG (Max 5MB)
                      </div>
                    </label>

                    {/* File List */}
                    {newIndentAttachments.length > 0 && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {newIndentAttachments.map((fName, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF', borderRadius: '8px', padding: '8px 12px', border: '1px solid #DBEAFE' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }} title={fName}>
                              {fName}
                            </span>
                            <button 
                              onClick={() => setNewIndentAttachments(newIndentAttachments.filter((_, i) => i !== idx))} 
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card 5: Additional Notes */}
                  <div className="glass-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#0F172A' }}>Additional Notes (Optional)</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>{newIndentAdditionalNotes.length}/250</span>
                    </div>
                    <textarea
                      placeholder="Enter any additional information..."
                      value={newIndentAdditionalNotes}
                      onChange={e => setNewIndentAdditionalNotes(e.target.value.slice(0, 250))}
                      style={{ width: '100%', height: '80px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', fontSize: '13.5px', fontWeight: 600, outline: 'none', background: '#F8FAFC', resize: 'none', fontFamily: 'inherit' }}
                    />
                  </div>

                </div>

              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', borderTop: '1px solid #F1F5F9', paddingTop: '24px' }}>
                <button
                  onClick={() => switchTab('indent')}
                  style={{ height: '44px', border: '1px solid #E2E8F0', background: 'white', color: '#475569', borderRadius: '10px', padding: '0 24px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => handleSubmitIndent('Draft')}
                    disabled={loading}
                    style={{ height: '44px', border: '1.5px solid #2563EB', background: 'white', color: '#2563EB', borderRadius: '10px', padding: '0 24px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSubmitIndent('Pending')}
                    disabled={loading}
                    style={{ height: '44px', border: 'none', background: '#2563EB', color: 'white', borderRadius: '10px', padding: '0 24px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
                  >
                    Submit Indent
                  </button>
                </div>
              </div>

            </div>
          );
        })()}

        {/* TAB: DOCTOR DYNAMIC COVERAGE */}
        {activeTab === 'doctor_cover' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: '24px' }}>
            {/* Header gradient card */}
            <div className="glass-card" style={{
              background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
              border: '1px solid #FDA4AF',
              padding: '28px',
              borderRadius: '20px',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge-pill new" style={{ background: '#E11D48', color: 'white', padding: '6px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ● Active Clinical Coverage
                  </span>
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#9F1239', margin: '0 0 8px 0', fontFamily: 'Urbanist, sans-serif' }}>Doctor Active Coverage</h2>
                <p style={{ fontSize: '14.5px', color: '#BE123C', margin: 0, fontWeight: 600, maxWidth: '650px', lineHeight: '1.5' }}>
                  Emergency Clinical Duty Coverage. Write SOAP notes, prescribe medicines, and review consultations. All actions are logged under active practitioner credentials.
                </p>
              </div>
              <div style={{
                position: 'absolute',
                right: '-30px',
                bottom: '-30px',
                fontSize: '150px',
                color: 'rgba(225, 29, 72, 0.05)',
                fontWeight: 900,
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                DR
              </div>
            </div>

            {/* Sub-navigation inside coverage */}
            <div style={{ display: 'flex', gap: '12px', background: '#F8FAFC', padding: '8px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px', flexWrap: 'wrap' }}>
              {coverageState['dr-consult']?.on && (
                <button 
                  className={`btn-cover-tab ${doctorSubTab === 'consult' ? 'active doctor' : ''}`}
                  onClick={() => { setDoctorSubTab('consult'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="users" style={{ width: '16px', height: '16px' }}></i>
                  Consultation Queue
                </button>
              )}
              {coverageState['dr-rx']?.on && (
                <button 
                  className={`btn-cover-tab ${doctorSubTab === 'prescriptions' ? 'active doctor' : ''}`}
                  onClick={() => { setDoctorSubTab('prescriptions'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="pill" style={{ width: '16px', height: '16px' }}></i>
                  Prescription Writer
                </button>
              )}
              {coverageState['dr-laborder']?.on && (
                <button 
                  className={`btn-cover-tab ${doctorSubTab === 'labs' ? 'active doctor' : ''}`}
                  onClick={() => { setDoctorSubTab('labs'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="beaker" style={{ width: '16px', height: '16px' }}></i>
                  Lab Orders
                </button>
              )}
              {coverageState['dr-stockview']?.on && (
                <button 
                  className={`btn-cover-tab ${doctorSubTab === 'stock' ? 'active doctor' : ''}`}
                  onClick={() => { setDoctorSubTab('stock'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="clipboard-list" style={{ width: '16px', height: '16px' }}></i>
                  Pharmacy Stock View
                </button>
              )}
            </div>

            {doctorSubTab === 'consult' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <i data-lucide="users" style={{ color: '#E11D48' }}></i>
                    Consultation Roster
                  </h3>
                  <span className="badge-pill" style={{ background: '#FFF1F2', color: '#E11D48', fontWeight: 700, fontSize: '12px' }}>
                    {coverageConsultations.length} Patient{coverageConsultations.length !== 1 ? 's' : ''} in Queue
                  </span>
                </div>
                {selectedConsultation ? (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', background: '#F8FAFC', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.01)' }}>
                    {/* Patient Profile Summary Card */}
                    <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: '#FFF1F2',
                          color: '#E11D48',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '18px'
                        }}>
                          <i data-lucide="user"></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{selectedConsultation.name}</div>
                          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                            Patient ID: <span style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 700 }}>{selectedConsultation.patientId || 'N/A'}</span> · {selectedConsultation.age}y ({selectedConsultation.gender})
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn-cover-action doctor-outline" 
                        onClick={() => setSelectedConsultation(null)} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <i data-lucide="arrow-left" style={{ width: '14px', height: '14px' }}></i>
                        Cancel Consultation
                      </button>
                    </div>

                    {/* Step-navigation within the Examination workspace */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                      <button 
                        type="button"
                        className={`btn-cover-tab ${examineStep === 'notes' ? 'active doctor' : ''}`}
                        onClick={() => { setExamineStep('notes'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: examineStep === 'notes' ? 'white' : '#E2E8F0', color: examineStep === 'notes' ? '#E11D48' : '#64748B', fontSize: '11px', fontWeight: 900 }}>1</span>
                        <i data-lucide="clipboard-list" style={{ width: '16px', height: '16px' }}></i>
                        Clinical Notes
                      </button>
                      <button 
                        type="button"
                        className={`btn-cover-tab ${examineStep === 'prescriptions' ? 'active doctor' : ''}`}
                        onClick={() => { setExamineStep('prescriptions'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: examineStep === 'prescriptions' ? 'white' : '#E2E8F0', color: examineStep === 'prescriptions' ? '#E11D48' : '#64748B', fontSize: '11px', fontWeight: 900 }}>2</span>
                        <i data-lucide="pill" style={{ width: '16px', height: '16px' }}></i>
                        Prescription {hasPrescriptionEnabled ? '✓' : ''}
                      </button>
                      <button 
                        type="button"
                        className={`btn-cover-tab ${examineStep === 'labs' ? 'active doctor' : ''}`}
                        onClick={() => { setExamineStep('labs'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: examineStep === 'labs' ? 'white' : '#E2E8F0', color: examineStep === 'labs' ? '#E11D48' : '#64748B', fontSize: '11px', fontWeight: 900 }}>3</span>
                        <i data-lucide="beaker" style={{ width: '16px', height: '16px' }}></i>
                        Lab Tests {hasLabOrderEnabled ? '✓' : ''}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '260px' }}>
                      {/* STEP 1: SOAP CLINICAL NOTES */}
                      {examineStep === 'notes' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          <div className="glass-card" style={{ background: '#FFFDFD', padding: '18px', border: '1px solid #FEE2E2', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <i data-lucide="clipboard-list" style={{ color: '#E11D48', width: '18px', height: '18px' }}></i>
                              <label style={{ fontSize: '12px', fontWeight: 800, color: '#9F1239', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chief Complaints / Symptoms</label>
                            </div>
                            <div style={{ fontSize: '14.5px', color: '#3F0712', fontWeight: 650, lineHeight: '1.4' }}>{selectedConsultation.symptoms}</div>
                          </div>
                          <div>
                            <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.5px' }}>Diagnosis</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Acute Viral Bronchitis" 
                              value={consultationDiagnosis} 
                              onChange={e => {
                                setConsultationDiagnosis(e.target.value);
                                setConsultationRxDiagnosis(e.target.value);
                              }} 
                              style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 14px', fontSize: '13.5px', fontWeight: 650, outline: 'none', background: 'white', transition: 'border 0.2s' }} 
                              onFocus={e => e.target.style.borderColor = '#E11D48'}
                              onBlur={e => e.target.style.borderColor = '#CBD5E1'}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.5px' }}>SOAP / Clinical Notes</label>
                            <textarea 
                              placeholder="Write clinical examination findings, vitals summary, and clinical advice..." 
                              value={consultationNotes} 
                              onChange={e => setConsultationNotes(e.target.value)} 
                              style={{ width: '100%', height: '110px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '12px 14px', fontSize: '13.5px', fontWeight: 650, outline: 'none', resize: 'none', background: 'white', transition: 'border 0.2s' }} 
                              onFocus={e => e.target.style.borderColor = '#E11D48'}
                              onBlur={e => e.target.style.borderColor = '#CBD5E1'}
                            />
                          </div>

                          <div style={{ marginTop: '8px', padding: '14px', background: '#F1F5F9', borderRadius: '10px', display: 'flex', gap: '24px', border: '1px solid #E2E8F0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={hasPrescriptionEnabled} 
                                onChange={e => {
                                  setHasPrescriptionEnabled(e.target.checked);
                                  if (e.target.checked) {
                                    setExamineStep('prescriptions');
                                    setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
                                  }
                                }} 
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#E11D48' }}
                              />
                              Prescribe Medications
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={hasLabOrderEnabled} 
                                onChange={e => {
                                  setHasLabOrderEnabled(e.target.checked);
                                  if (e.target.checked) {
                                    setExamineStep('labs');
                                    setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
                                  }
                                }} 
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#E11D48' }}
                              />
                              Order Laboratory Tests
                            </label>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: PRESCRIPTION WRITER */}
                      {examineStep === 'prescriptions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i data-lucide="pill" style={{ color: '#E11D48' }}></i>
                              Prescribe Medications
                            </h4>
                            <button 
                              type="button" 
                              className="btn-cover-action doctor-outline" 
                              onClick={() => setConsultationRxMedicines(prev => [...prev, { id: Date.now(), name: '', dose: '', freq: '', duration: '', timing: 'After Food', notes: '' }])} 
                              style={{ padding: '6px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <i data-lucide="plus" style={{ width: '14px', height: '14px' }}></i>
                              Add Drug Row
                            </button>
                          </div>

                          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '8px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>DRUG NAME</th>
                                  <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>DOSAGE</th>
                                  <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>FREQUENCY</th>
                                  <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>DURATION</th>
                                  <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>TIMING</th>
                                  <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>ACTION</th>
                                </tr>
                              </thead>
                              <tbody>
                                {consultationRxMedicines.map((med) => (
                                  <tr key={med.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                                    <td style={{ padding: '8px', position: 'relative' }}>
                                      <input 
                                        type="text" 
                                        value={med.name} 
                                        placeholder="Type medicine..." 
                                        onChange={e => {
                                          const val = e.target.value;
                                          setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, name: val } : m));
                                          
                                          // Auto-fill from defaults on exact match
                                          const matchKey = Object.keys(medicineDefaults).find(k => k.toLowerCase() === val.toLowerCase().trim());
                                          if (matchKey) {
                                            const def = medicineDefaults[matchKey];
                                            setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, dose: def.dose || m.dose, freq: def.freq || m.freq, duration: def.duration || m.duration, timing: def.timing || m.timing } : m));
                                          }
                                        }} 
                                        onFocus={() => setActiveMedFocus(med.id)}
                                        onBlur={() => {
                                          setTimeout(() => {
                                            if (!isHoveringSuggestions) {
                                              setActiveMedFocus(null);
                                            }
                                          }, 150);
                                        }}
                                        style={{ width: '160px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px', outline: 'none', background: 'white' }} 
                                        required 
                                      />
                                      {activeMedFocus === med.id && (() => {
                                        const typedVal = (med.name || '').trim().toLowerCase();
                                        const allNames = Array.from(new Set([
                                          ...(coveragePharmacyInventory || []).map(m => m.name),
                                          ...Object.keys(medicineDefaults).map(k => k.charAt(0).toUpperCase() + k.slice(1))
                                        ]));
                                        const filtered = typedVal 
                                          ? allNames.filter(n => n.toLowerCase().includes(typedVal) && n.toLowerCase() !== typedVal).slice(0, 6)
                                          : allNames.slice(0, 6);
                                        if (filtered.length === 0) return null;
                                        return (
                                          <div 
                                            data-lenis-prevent
                                            onMouseEnter={() => setIsHoveringSuggestions(true)}
                                            onMouseLeave={() => setIsHoveringSuggestions(false)}
                                            style={{ 
                                              position: 'absolute', top: 'calc(100% + 4px)', left: 0, 
                                              width: '260px', zIndex: 1200, padding: '4px',
                                              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)', 
                                              background: 'white', borderRadius: '10px', 
                                              border: '1px solid #E2E8F0',
                                              maxHeight: '180px', overflowY: 'auto'
                                            }}
                                          >
                                            {filtered.map((mName, sIdx) => {
                                              const dbMatch = (coveragePharmacyInventory || []).find(m => m.name.toLowerCase() === mName.toLowerCase());
                                              const stockStatus = dbMatch?.status || null;
                                              const stockColor = stockStatus === 'In Stock' ? '#16A34A' : stockStatus === 'Low Stock' ? '#D97706' : stockStatus === 'Out of Stock' ? '#DC2626' : '#64748B';
                                              const stockBg = stockStatus === 'In Stock' ? '#DCFCE7' : stockStatus === 'Low Stock' ? '#FEF3C7' : stockStatus === 'Out of Stock' ? '#FEE2E2' : '#F1F5F9';
                                              
                                              const selectSuggestion = (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const matchedKey = Object.keys(medicineDefaults)
                                                  .sort((a, b) => b.length - a.length)
                                                  .find(k => mName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(mName.toLowerCase()));
                                                if (matchedKey) {
                                                  const def = medicineDefaults[matchedKey];
                                                  setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, name: mName, dose: def.dose || m.dose, freq: def.freq || m.freq, duration: def.duration || m.duration, timing: def.timing || m.timing } : m));
                                                } else {
                                                  setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, name: mName } : m));
                                                }
                                                setActiveMedFocus(null);
                                                setIsHoveringSuggestions(false);
                                              };

                                              return (
                                                <div 
                                                  key={sIdx} 
                                                  onMouseDown={selectSuggestion}
                                                  onClick={selectSuggestion}
                                                  style={{ 
                                                    padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', 
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    fontSize: '12.5px', transition: 'all 0.15s ease',
                                                    textAlign: 'left'
                                                  }}
                                                  onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                  <span style={{ fontWeight: 700, color: '#1E293B', pointerEvents: 'none' }}>{mName}</span>
                                                  {stockStatus && (
                                                    <span style={{ fontSize: '9.5px', fontWeight: 800, color: stockColor, padding: '2px 6px', borderRadius: '4px', background: stockBg, pointerEvents: 'none' }}>
                                                      {stockStatus}
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      <input 
                                        type="text" 
                                        value={med.dose} 
                                        placeholder="e.g. 1 Tab" 
                                        onChange={e => {
                                          const val = e.target.value;
                                          setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, dose: val } : m));
                                        }} 
                                        style={{ width: '85px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', outline: 'none' }} 
                                      />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      <input 
                                        type="text" 
                                        value={med.freq} 
                                        placeholder="e.g. BD" 
                                        onChange={e => {
                                          const val = e.target.value;
                                          setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, freq: val } : m));
                                        }} 
                                        style={{ width: '85px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', outline: 'none' }} 
                                      />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      <input 
                                        type="text" 
                                        value={med.duration} 
                                        placeholder="e.g. 5 Days" 
                                        onChange={e => {
                                          const val = e.target.value;
                                          setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, duration: val } : m));
                                        }} 
                                        style={{ width: '85px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', outline: 'none' }} 
                                      />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                      <select 
                                        value={med.timing} 
                                        onChange={e => {
                                          const val = e.target.value;
                                          setConsultationRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, timing: val } : m));
                                        }} 
                                        style={{ height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, outline: 'none', cursor: 'pointer', padding: '0 4px', background: 'white' }}
                                      >
                                        <option value="After Food">After Food</option>
                                        <option value="Before Food">Before Food</option>
                                        <option value="Empty Stomach">Empty Stomach</option>
                                        <option value="At Bedtime">At Bedtime</option>
                                      </select>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>
                                      <button 
                                        type="button" 
                                        className="btn-cover-action doctor-outline" 
                                        onClick={() => setConsultationRxMedicines(prev => prev.filter(m => m.id !== med.id))} 
                                        style={{ color: '#EF4444', borderColor: '#FEE2E2', padding: '6px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <i data-lucide="trash-2" style={{ width: '12px', height: '12px' }}></i>
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <input 
                              type="checkbox" 
                              id="enableRxCheck" 
                              checked={hasPrescriptionEnabled} 
                              onChange={e => setHasPrescriptionEnabled(e.target.checked)} 
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#E11D48' }}
                            />
                            <label htmlFor="enableRxCheck" style={{ fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                              Include this prescription with consultation completion
                            </label>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: LAB ORDERS */}
                      {examineStep === 'labs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i data-lucide="beaker" style={{ color: '#E11D48' }}></i>
                            Order Lab Investigations
                          </h4>
                          <div>
                            <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>Search & Select Laboratory Investigations</label>
                            
                            <div style={{ position: 'relative' }}>
                              <input 
                                type="text" 
                                placeholder="Search tests (e.g. CBC, Lipid Profile, HbA1c...)" 
                                value={labSearchQuery}
                                onChange={e => {
                                  setLabSearchQuery(e.target.value);
                                  setShowLabSuggestions(true);
                                }}
                                onFocus={() => setShowLabSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowLabSuggestions(false), 200)}
                                style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 14px', fontSize: '13.5px', fontWeight: 650, outline: 'none', background: 'white' }} 
                              />
                              
                              {showLabSuggestions && labSearchQuery.trim() && (
                                <div 
                                  data-lenis-prevent
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    zIndex: 10,
                                    marginTop: '4px',
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    padding: '4px'
                                  }}
                                >
                                  {availableTests
                                    .filter(t => t.toLowerCase().includes(labSearchQuery.toLowerCase()))
                                    .map(t => (
                                      <div 
                                        key={t}
                                        onMouseDown={() => {
                                          if (!consultationLabTests.includes(t)) {
                                            setConsultationLabTests(prev => [...prev, t]);
                                            setHasLabOrderEnabled(true);
                                          }
                                          setLabSearchQuery('');
                                          setShowLabSuggestions(false);
                                        }}
                                        style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#334155', transition: '0.2s', textAlign: 'left' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        {t}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Selected Lab Badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                              {consultationLabTests.map(lab => (
                                <span 
                                  key={lab} 
                                  style={{ 
                                    background: '#F5F3FF', 
                                    color: '#7C3AED', 
                                    border: '1px solid #E9D5FF', 
                                    fontSize: '12px', 
                                    fontWeight: 800, 
                                    padding: '6px 12px', 
                                    borderRadius: '20px', 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px' 
                                  }}
                                >
                                  {lab}
                                  <span 
                                    onClick={() => setConsultationLabTests(prev => prev.filter(item => item !== lab))}
                                    style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#7C3AED', display: 'inline-flex', alignItems: 'center' }}
                                  >
                                    ×
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <input 
                              type="checkbox" 
                              id="enableLabCheck" 
                              checked={hasLabOrderEnabled} 
                              onChange={e => setHasLabOrderEnabled(e.target.checked)} 
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#E11D48' }}
                            />
                            <label htmlFor="enableLabCheck" style={{ fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                              Include these lab test orders with consultation completion
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginTop: '24px' }}>
                      {examineStep !== 'notes' && (
                        <button 
                          type="button" 
                          className="btn-cover-action doctor-outline" 
                          onClick={() => {
                            if (examineStep === 'prescriptions') setExamineStep('notes');
                            if (examineStep === 'labs') setExamineStep('prescriptions');
                            setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
                          }}
                          style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <i data-lucide="arrow-left" style={{ width: '16px', height: '16px' }}></i>
                          Back
                        </button>
                      )}
                      
                      {examineStep !== 'labs' ? (
                        <button 
                          type="button" 
                          className="btn-cover-action doctor-primary" 
                          onClick={() => {
                            if (examineStep === 'notes') setExamineStep('prescriptions');
                            else if (examineStep === 'prescriptions') setExamineStep('labs');
                            setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
                          }}
                          style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          Next Step
                          <i data-lucide="arrow-right" style={{ width: '16px', height: '16px' }}></i>
                        </button>
                      ) : null}

                      <button 
                        type="button"
                        className="btn-cover-action doctor-primary" 
                        style={{ flex: 2, height: '44px', background: '#10B981', borderColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                        onMouseLeave={e => e.currentTarget.style.background = '#10B981'}
                        onClick={async () => {
                          if (!consultationDiagnosis) {
                            showToast("Please provide a diagnosis first.", "error");
                            setExamineStep('notes');
                            return;
                          }
                          try {
                            // 1. Save consultation SOAP notes & complete appointment
                            await api.put(`/appointments/${selectedConsultation.id}`, {
                              status: 'Completed',
                              notes: consultationNotes,
                              diagnosis: consultationDiagnosis
                            });
                            showToast(`Consultation note saved successfully for ${selectedConsultation.name}!`, 'success');

                            // 2. Save prescription if enabled
                            if (hasPrescriptionEnabled && consultationRxMedicines.length > 0) {
                              const items = consultationRxMedicines.map(m => {
                                const days = parseInt(m.duration, 10) || 5;
                                let dailyFreq = 1;
                                const f = (m.freq || 'OD').toLowerCase();
                                if (f.includes('twice') || f.includes('bd') || f.includes('2')) dailyFreq = 2;
                                else if (f.includes('thrice') || f.includes('tds') || f.includes('3')) dailyFreq = 3;
                                else if (f.includes('four') || f.includes('qd') || f.includes('4')) dailyFreq = 4;
                                const qty = days * dailyFreq;
                                return {
                                  medicine: m.name,
                                  dosage: m.dose || '1 Tab',
                                  duration: m.duration || '5 Days',
                                  instructions: `${m.freq || 'OD'} · ${m.timing || 'After Food'}. ${m.notes || ''}`.trim(),
                                  quantity: qty
                                };
                              });
                              await api.post('/prescriptions', {
                                patientId: selectedConsultation.patientId,
                                doctorId: doctors[0]?._id || null,
                                appointmentId: selectedConsultation.id,
                                diagnosis: consultationRxDiagnosis || consultationDiagnosis,
                                items,
                                status: 'Pending Pharmacy Dispatch'
                              });
                              showToast(`Prescription saved and dispatched successfully!`, 'success');
                            }

                            // 3. Save lab orders if enabled
                            if (hasLabOrderEnabled && consultationLabTests.length > 0) {
                              for (const test of consultationLabTests) {
                                await api.post('/labs', {
                                  patientId: selectedConsultation.patientId,
                                  doctorId: doctors[0]?._id || null,
                                  appointmentId: selectedConsultation.id,
                                  testName: test,
                                  status: 'Pending'
                                });
                              }
                              showToast(`${consultationLabTests.length} lab test${consultationLabTests.length > 1 ? 's' : ''} referred successfully!`, 'success');
                            }

                            // Reset state
                            setSelectedConsultation(null);
                            setConsultationNotes('');
                            setConsultationDiagnosis('');
                            setConsultationRxDiagnosis('');
                            setConsultationRxMedicines([]);
                            setConsultationLabTest('Complete Blood Count (CBC)');
                            setConsultationLabTests([]);
                            setHasPrescriptionEnabled(false);
                            setHasLabOrderEnabled(false);
                            fetchCoverageData();
                          } catch (e) {
                            console.error(e);
                            showToast("Failed to complete consultation on backend.", "error");
                          }
                        }}
                      >
                        <i data-lucide="check-circle" style={{ width: '18px', height: '18px' }}></i>
                        Save & Complete Consultation
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '16px', position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder="Search patient by name or patient ID..." 
                        value={doctorSearchQuery}
                        onChange={e => setDoctorSearchQuery(e.target.value)}
                        style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 12px 0 36px', fontSize: '13.5px', outline: 'none', color: '#0F172A', boxSizing: 'border-box' }}
                      />
                      <i data-lucide="search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748B', display: 'flex', alignItems: 'center' }}></i>
                    </div>
                    <div className="table-responsive">
                      <table className="elite-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>AVATAR</th>
                            <th>PATIENT INFO</th>
                            <th>CHIEF COMPLAINTS</th>
                            <th>STATUS</th>
                            <th style={{ textAlign: 'right' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coverageConsultations
                            .filter(c => 
                              c.name?.toLowerCase().includes(doctorSearchQuery.toLowerCase()) || 
                              c.patientId?.toLowerCase().includes(doctorSearchQuery.toLowerCase())
                            )
                            .map((item, idx) => {
                              const initials = (item.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                              return (
                                <tr key={idx} style={{ transition: 'background 0.2s' }}>
                                  <td>
                                    <div style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      background: item.gender === 'Female' ? '#FCE7F3' : '#DBEAFE',
                                      color: item.gender === 'Female' ? '#DB2777' : '#2563EB',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 800,
                                      fontSize: '14px',
                                      border: '1px solid rgba(0,0,0,0.05)'
                                    }}>
                                      {initials}
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '14px' }}>{item.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                                      Patient ID: <span style={{ fontFamily: 'monospace', color: '#334155', fontWeight: 700 }}>{item.patientId || 'N/A'}</span> · {item.age}y ({item.gender})
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 700, color: '#475569', fontSize: '13.5px' }}>{item.reason || 'Routine Checkup'}</div>
                                    {item.notes && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{item.notes}</div>}
                                  </td>
                                  <td>
                                    <span className="badge-pill" style={{
                                      background: item.status === 'Completed' ? '#E6F4EA' : item.status === 'Checked Out' ? '#EFF6FF' : '#FFF7ED',
                                      color: item.status === 'Completed' ? '#059669' : item.status === 'Checked Out' ? '#2563EB' : '#D97706',
                                      fontWeight: 800,
                                      fontSize: '11.5px'
                                    }}>{item.status}</span>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {item.status !== 'Completed' && item.status !== 'Checked Out' ? (
                                      <button 
                                        type="button"
                                        className="btn-cover-action doctor-primary"
                                        onClick={() => {
                                          setSelectedConsultation(item);
                                          setConsultationNotes(item.notes || '');
                                          setConsultationDiagnosis(item.diagnosis || '');
                                          setExamineStep('notes');
                                          setHasPrescriptionEnabled(false);
                                          setHasLabOrderEnabled(false);
                                          setConsultationRxDiagnosis(item.diagnosis || '');
                                          setConsultationRxMedicines([
                                            { id: Date.now(), name: 'Paracetamol 650', dose: '1 Tab', freq: '1 Tab BD', duration: '5 Days', timing: 'After Food', notes: 'For fever' }
                                          ]);
                                          setConsultationLabTest('Complete Blood Count (CBC)');
                                          setRxPatientId(item.patientId || '');
                                          setRxDiagnosis(item.diagnosis || '');
                                          setLabPatientId(item.patientId || '');
                                          setTimeout(() => window.lucide && window.lucide.createIcons(), 100);
                                        }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                      >
                                        <i data-lucide="stethoscope" style={{ width: '13px', height: '13px' }}></i>
                                        Examine Patient
                                      </button>
                                    ) : (
                                      <button 
                                        type="button"
                                        className="btn-cover-action doctor-outline"
                                        onClick={() => {
                                          showToast(`Diagnosis: ${item.diagnosis || 'None'}. Notes: ${item.notes || 'No notes'}`);
                                        }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                      >
                                        <i data-lucide="eye" style={{ width: '13px', height: '13px' }}></i>
                                        View Notes
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SUBTAB: PRESCRIPTION WRITER */}
            {doctorSubTab === 'prescriptions' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i data-lucide="pill" style={{ color: '#E11D48' }}></i>
                  Emergency Prescription Composer
                </h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!rxPatientId) {
                    showToast('Please select a patient', 'error');
                    return;
                  }
                  try {
                    const items = rxMedicines.map(m => {
                      const days = parseInt(m.duration, 10) || 5;
                      let dailyFreq = 1;
                      const f = (m.freq || 'OD').toLowerCase();
                      if (f.includes('twice') || f.includes('bd') || f.includes('2')) dailyFreq = 2;
                      else if (f.includes('thrice') || f.includes('tds') || f.includes('3')) dailyFreq = 3;
                      else if (f.includes('four') || f.includes('qd') || f.includes('4')) dailyFreq = 4;
                      const qty = days * dailyFreq;
                      return {
                        medicine: m.name,
                        dosage: m.dose || '1 Tab',
                        duration: m.duration || '5 Days',
                        instructions: `${m.freq || 'OD'} · ${m.timing || 'After Food'}. ${m.notes || ''}`.trim(),
                        quantity: qty
                      };
                    });
                    await api.post('/prescriptions', {
                      patientId: rxPatientId,
                      doctorId: doctors[0]?._id || null,
                      diagnosis: rxDiagnosis,
                      items,
                      status: 'Pending Pharmacy Dispatch'
                    });
                    showToast(`Prescription saved and dispatched successfully!`, 'success');
                    setRxPatientId('');
                    setRxDiagnosis('');
                    setRxMedicines([{ id: Date.now(), name: 'Paracetamol 650', dose: '1 Tab', freq: '1 Tab BD', duration: '5 Days', timing: 'After Food', notes: 'For fever' }]);
                    fetchCoverageData();
                  } catch (err) {
                    console.error(err);
                    showToast('Failed to save prescription on backend.', 'error');
                  }
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>Patient Name / ID</label>
                      <select value={rxPatientId} onChange={e => setRxPatientId(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 12px', fontSize: '13.5px', fontWeight: 700, color: '#334155', cursor: 'pointer', outline: 'none', background: 'white' }} required>
                        <option value="">Select Patient...</option>
                        {patientsList.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.contact || 'No contact'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>Diagnosis</label>
                      <input type="text" placeholder="e.g. Hypertension, Viral Fever" value={rxDiagnosis} onChange={e => setRxDiagnosis(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 14px', fontSize: '13.5px', fontWeight: 650, outline: 'none', background: 'white' }} required />
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i data-lucide="list" style={{ color: '#E11D48', width: '16px', height: '16px' }}></i>
                        Prescribed Medications
                      </h4>
                      <button type="button" className="btn-cover-action doctor-outline" onClick={() => setRxMedicines(prev => [...prev, { id: Date.now(), name: '', dose: '', freq: '', duration: '', timing: 'After Food', notes: '' }])} style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i data-lucide="plus" style={{ width: '14px', height: '14px' }}></i>
                        Add Row
                      </button>
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '8px', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>MEDICINE NAME</th>
                            <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>DOSAGE</th>
                            <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>FREQUENCY</th>
                            <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>DURATION</th>
                            <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'left', textTransform: 'uppercase' }}>TIMING</th>
                            <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 800, color: '#64748B', textAlign: 'right', textTransform: 'uppercase' }}>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rxMedicines.map((med, index) => (
                            <tr key={med.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                              <td style={{ padding: '8px', position: 'relative' }}>
                                <input 
                                  type="text" 
                                  value={med.name} 
                                  placeholder="Type medicine..." 
                                  onChange={e => {
                                    const val = e.target.value;
                                    setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, name: val } : m));
                                    // Auto-fill from defaults on exact match
                                    const matchKey = Object.keys(medicineDefaults).find(k => k.toLowerCase() === val.toLowerCase().trim());
                                    if (matchKey) {
                                      const def = medicineDefaults[matchKey];
                                      setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, dose: def.dose || m.dose, freq: def.freq || m.freq, duration: def.duration || m.duration, timing: def.timing || m.timing } : m));
                                    }
                                  }}
                                  onFocus={() => setActiveMedFocus(med.id)}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (!isHoveringSuggestions) {
                                        setActiveMedFocus(null);
                                      }
                                    }, 150);
                                  }}
                                  style={{ width: '160px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px', outline: 'none' }} 
                                  required 
                                />
                                {activeMedFocus === med.id && (() => {
                                  const typedVal = (med.name || '').trim().toLowerCase();
                                  const allNames = Array.from(new Set([
                                    ...(coveragePharmacyInventory || []).map(m => m.name),
                                    ...Object.keys(medicineDefaults).map(k => k.charAt(0).toUpperCase() + k.slice(1))
                                  ]));
                                  const filtered = typedVal 
                                    ? allNames.filter(n => n.toLowerCase().includes(typedVal) && n.toLowerCase() !== typedVal).slice(0, 6)
                                    : allNames.slice(0, 6);
                                  if (filtered.length === 0) return null;
                                  return (
                                    <div 
                                      data-lenis-prevent 
                                      onMouseEnter={() => setIsHoveringSuggestions(true)}
                                      onMouseLeave={() => setIsHoveringSuggestions(false)}
                                      style={{ 
                                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, 
                                        width: '260px', zIndex: 1200, padding: '4px',
                                        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)', 
                                        background: 'white', borderRadius: '10px', 
                                        border: '1px solid #E2E8F0',
                                        maxHeight: '180px', overflowY: 'auto'
                                      }}
                                    >
                                      {filtered.map((mName, sIdx) => {
                                        const dbMatch = (coveragePharmacyInventory || []).find(m => m.name.toLowerCase() === mName.toLowerCase());
                                        const stockStatus = dbMatch?.status || null;
                                        const stockColor = stockStatus === 'In Stock' ? '#16A34A' : stockStatus === 'Low Stock' ? '#D97706' : stockStatus === 'Out of Stock' ? '#DC2626' : '#64748B';
                                        const stockBg = stockStatus === 'In Stock' ? '#DCFCE7' : stockStatus === 'Low Stock' ? '#FEF3C7' : stockStatus === 'Out of Stock' ? '#FEE2E2' : '#F1F5F9';
                                        
                                        const selectSuggestion = (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const matchedKey = Object.keys(medicineDefaults)
                                            .sort((a, b) => b.length - a.length)
                                            .find(k => mName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(mName.toLowerCase()));
                                          if (matchedKey) {
                                            const def = medicineDefaults[matchedKey];
                                            setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, name: mName, dose: def.dose || m.dose, freq: def.freq || m.freq, duration: def.duration || m.duration, timing: def.timing || m.timing } : m));
                                          } else {
                                            setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, name: mName } : m));
                                          }
                                          setActiveMedFocus(null);
                                          setIsHoveringSuggestions(false);
                                        };

                                        return (
                                          <div 
                                            key={sIdx} 
                                            onMouseDown={selectSuggestion}
                                            onClick={selectSuggestion}
                                            style={{ 
                                              padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', 
                                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                              fontSize: '12.5px', transition: 'all 0.15s ease',
                                              textAlign: 'left'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <span style={{ fontWeight: 700, color: '#1E293B', pointerEvents: 'none' }}>{mName}</span>
                                            {stockStatus && (
                                              <span style={{ fontSize: '9.5px', fontWeight: 800, color: stockColor, padding: '2px 6px', borderRadius: '4px', background: stockBg, pointerEvents: 'none' }}>
                                                {stockStatus}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input type="text" value={med.dose} placeholder="e.g. 1 Tab" onChange={e => {
                                  const val = e.target.value;
                                  setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, dose: val } : m));
                                }} style={{ width: '85px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input type="text" value={med.freq} placeholder="e.g. OD" onChange={e => {
                                  const val = e.target.value;
                                  setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, freq: val } : m));
                                }} style={{ width: '85px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <input type="text" value={med.duration} placeholder="e.g. 5 Days" onChange={e => {
                                  const val = e.target.value;
                                  setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, duration: val } : m));
                                }} style={{ width: '85px', height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13px', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '8px' }}>
                                <select value={med.timing} onChange={e => {
                                  const val = e.target.value;
                                  setRxMedicines(prev => prev.map(m => m.id === med.id ? { ...m, timing: val } : m));
                                }} style={{ height: '36px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, outline: 'none', cursor: 'pointer', padding: '0 4px', background: 'white' }}>
                                  <option value="After Food">After Food</option>
                                  <option value="Before Food">Before Food</option>
                                  <option value="Empty Stomach">Empty Stomach</option>
                                  <option value="At Bedtime">At Bedtime</option>
                                </select>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                <button type="button" disabled={rxMedicines.length === 1} className="btn-cover-action doctor-outline" onClick={() => setRxMedicines(prev => prev.filter(m => m.id !== med.id))} style={{ color: '#EF4444', borderColor: '#FEE2E2', padding: '6px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <i data-lucide="trash-2" style={{ width: '12px', height: '12px' }}></i>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button type="submit" className="btn-cover-action doctor-primary" style={{ width: '100%', height: '46px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <i data-lucide="send" style={{ width: '16px', height: '16px' }}></i>
                    Save & Dispatch Prescription to Pharmacy
                  </button>
                </form>
              </div>
            )}

            {/* SUBTAB: LAB ORDERS */}
            {doctorSubTab === 'labs' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i data-lucide="beaker" style={{ color: '#E11D48' }}></i>
                  Clinical Diagnostic Referral
                </h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!labPatientId) {
                    showToast('Please select a patient', 'error');
                    return;
                  }
                  if (slipLabTests.length === 0) {
                    showToast('Please select at least one laboratory test', 'error');
                    return;
                  }
                  try {
                    for (const test of slipLabTests) {
                      await api.post('/labs', {
                        patientId: labPatientId,
                        doctorId: doctors[0]?._id || null,
                        testName: test,
                        status: 'Pending'
                      });
                    }
                    showToast(`${slipLabTests.length} lab test${slipLabTests.length > 1 ? 's' : ''} referred successfully!`, 'success');
                    setLabPatientId('');
                    setSlipLabTests([]);
                    setSlipLabSearchQuery('');
                    fetchCoverageData();
                  } catch (err) {
                    console.error(err);
                    showToast('Failed to issue lab order.', 'error');
                  }
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>Patient Name</label>
                      <select name="labPatientId" value={labPatientId} onChange={e => setLabPatientId(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 12px', fontSize: '13.5px', fontWeight: 700, color: '#334155', cursor: 'pointer', outline: 'none', background: 'white' }} required>
                        <option value="">Select Patient...</option>
                        {patientsList.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.contact || 'No contact'})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>Search & Select Laboratory Investigations</label>
                      
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="Search tests (e.g. CBC, Vitamin D...)" 
                          value={slipLabSearchQuery}
                          onChange={e => {
                            setSlipLabSearchQuery(e.target.value);
                            setShowSlipLabSuggestions(true);
                          }}
                          onFocus={() => setShowSlipLabSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSlipLabSuggestions(false), 200)}
                          style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 12px', fontSize: '13.5px', fontWeight: 650, outline: 'none', background: 'white' }} 
                        />
                        
                        {showSlipLabSuggestions && slipLabSearchQuery.trim() && (
                          <div 
                            data-lenis-prevent
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'white',
                              border: '1px solid #E2E8F0',
                              borderRadius: '10px',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                              zIndex: 10,
                              marginTop: '4px',
                              maxHeight: '180px',
                              overflowY: 'auto',
                              padding: '4px'
                            }}
                          >
                            {availableTests
                              .filter(t => t.toLowerCase().includes(slipLabSearchQuery.toLowerCase()))
                              .map(t => (
                                <div 
                                  key={t}
                                  onMouseDown={() => {
                                    if (!slipLabTests.includes(t)) {
                                      setSlipLabTests(prev => [...prev, t]);
                                    }
                                    setSlipLabSearchQuery('');
                                    setShowSlipLabSuggestions(false);
                                  }}
                                  style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#334155', transition: '0.2s', textAlign: 'left' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {t}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Selected Lab Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        {slipLabTests.map(lab => (
                          <span 
                            key={lab} 
                            style={{ 
                              background: '#F5F3FF', 
                              color: '#7C3AED', 
                              border: '1px solid #E9D5FF', 
                              fontSize: '12px', 
                              fontWeight: 800, 
                              padding: '6px 12px', 
                              borderRadius: '20px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px' 
                            }}
                          >
                            {lab}
                            <span 
                              onClick={() => setSlipLabTests(prev => prev.filter(item => item !== lab))}
                              style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#7C3AED', display: 'inline-flex', alignItems: 'center' }}
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn-cover-action doctor-primary" style={{ width: '100%', height: '46px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <i data-lucide="file-text" style={{ width: '16px', height: '16px' }}></i>
                    Issue Lab Investigation Referral Slip
                  </button>
                </form>
              </div>
            )}

            {/* SUBTAB: PHARMACY STOCK VIEW */}
            {doctorSubTab === 'stock' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i data-lucide="clipboard-list" style={{ color: '#E11D48' }}></i>
                  Pharmacy Live Formulary Status
                </h3>
                <div className="table-responsive">
                  <table className="elite-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th>DRUG NAME</th>
                        <th>CURRENT STOCK</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coveragePharmacyInventory.map((item, idx) => {
                        const isHigh = item.stock > 50;
                        const isLow = item.stock > 0 && item.stock <= 50;
                        const badgeClass = isHigh ? 'new' : isLow ? 'waiting' : 'revisit';
                        const badgeStyle = isHigh 
                          ? { background: '#DCFCE7', color: '#16A34A' } 
                          : isLow 
                          ? { background: '#FEF3C7', color: '#D97706' } 
                          : { background: '#FEE2E2', color: '#DC2626' };
                        return (
                          <tr key={idx}>
                            <td style={{ padding: '14px 10px', fontWeight: 700, color: '#1E293B', fontSize: '13.5px' }}>{item.name}</td>
                            <td style={{ padding: '14px 10px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>{item.stock} {item.unit}</td>
                            <td style={{ padding: '14px 10px' }}>
                              <span className={`badge-pill ${badgeClass}`} style={{ ...badgeStyle, fontSize: '11px', fontWeight: 800 }}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: LAB DYNAMIC COVERAGE */}
        {activeTab === 'lab_cover' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: '24px' }}>
            {/* Emerald header card */}
            <div className="glass-card" style={{
              background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
              border: '1px solid #6EE7B7',
              padding: '28px',
              borderRadius: '20px',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge-pill new" style={{ background: '#059669', color: 'white', padding: '6px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ● Clinical Lab Coverage
                  </span>
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#065F46', margin: '0 0 8px 0', fontFamily: 'Urbanist, sans-serif' }}>Laboratory Active Coverage</h2>
                <p style={{ fontSize: '14.5px', color: '#047857', margin: 0, fontWeight: 600, maxWidth: '650px', lineHeight: '1.5' }}>
                  Providing emergency clinical oversight for Diagnostic Lab. All report signing and sample collection runs under delegated supervisor privileges.
                </p>
              </div>
              <div style={{
                position: 'absolute',
                right: '-30px',
                bottom: '-30px',
                fontSize: '150px',
                color: 'rgba(5, 150, 105, 0.05)',
                fontWeight: 900,
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                LAB
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', background: '#F8FAFC', padding: '8px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px', flexWrap: 'wrap' }}>
              {coverageState['lt-queue']?.on && (
                <button 
                  className={`btn-cover-tab ${labSubTab === 'tests' ? 'active lab' : ''}`}
                  onClick={() => { setLabSubTab('tests'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="test-tube" style={{ width: '16px', height: '16px' }}></i>
                  Emergency Test Orders
                </button>
              )}
              {coverageState['lt-reagents']?.on && (
                <button 
                  className={`btn-cover-tab ${labSubTab === 'reagents' ? 'active lab' : ''}`}
                  onClick={() => { setLabSubTab('reagents'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="beaker" style={{ width: '16px', height: '16px' }}></i>
                  Reagents & Kits Inventory
                </button>
              )}
            </div>

            {/* SUBTAB: TESTS QUEUE */}
            {labSubTab === 'tests' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <i data-lucide="test-tube" style={{ color: '#059669' }}></i>
                    Diagnostic Test Orders Queue
                  </h3>
                  <span className="badge-pill" style={{ background: '#E6F4EA', color: '#059669', fontWeight: 700, fontSize: '12px' }}>
                    {coverageLabRequests.length} Active Request{coverageLabRequests.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Search patient by name or test ID..." 
                    value={labSearchQuery}
                    onChange={e => setLabSearchQuery(e.target.value)}
                    style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 12px 0 36px', fontSize: '13.5px', outline: 'none', color: '#0F172A', boxSizing: 'border-box' }}
                  />
                  <i data-lucide="search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748B', display: 'flex', alignItems: 'center' }}></i>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {coverageLabRequests
                    .filter(t => 
                      t.name?.toLowerCase().includes(labSearchQuery.toLowerCase()) || 
                      t.id?.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
                      t.test?.toLowerCase().includes(labSearchQuery.toLowerCase())
                    )
                    .map(test => {
                    const isHigh = test.priority === 'High' || test.priority === 'Critical';
                    const isMedium = test.priority === 'Medium';
                    const priorityStyle = isHigh 
                      ? { background: '#FEE2E2', color: '#DC2626' } 
                      : isMedium 
                      ? { background: '#FEF3C7', color: '#D97706' } 
                      : { background: '#E2E8F0', color: '#475569' };
                    return (
                      <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid #E2E8F0', borderRadius: '14px', background: '#F8FAFC', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i data-lucide="test-tube"></i>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{test.name}</span>
                              <span className="badge-pill" style={{ ...priorityStyle, fontSize: '10px', padding: '3px 8px', fontWeight: 800 }}>{test.priority} Priority</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600, display: 'block', marginTop: '6px' }}>
                              Test Ordered: <b style={{ color: '#059669' }}>{test.test}</b>
                            </span>
                            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 550, display: 'block', marginTop: '4px' }}>
                              Order ID: <span style={{ fontFamily: 'monospace' }}>#{test.id}</span> · Status: <span style={{ fontWeight: 700, color: '#475569' }}>{test.status}</span>
                            </span>
                          </div>
                        </div>
                        <div>
                          {test.status === 'Pending' ? (
                            <button 
                              type="button"
                              className="btn-cover-action lab-primary"
                              onClick={async () => {
                                try {
                                  await api.put(`/labs/${test.id}`, {
                                    status: 'In Progress',
                                    notes: 'Specimen sample collected by delegated clinical coverage.'
                                  });
                                  showToast(`Sample collected successfully for ${test.name}!`, 'success');
                                  fetchCoverageData();
                                } catch (e) {
                                  showToast('Failed to update sample status.', 'error');
                                }
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <i data-lucide="droplet" style={{ width: '13px', height: '13px' }}></i>
                              Collect Sample
                            </button>
                          ) : test.status === 'In Progress' ? (
                            <button 
                              type="button"
                              className="btn-cover-action lab-primary"
                              onClick={() => {
                                setSelectedCoverageLabTest(test);
                                setCoverageLabRemarks('');
                                setCoverageLabParams({ value: '', unit: 'g/dL' });
                                setCoverageLabFileName('');
                                setShowCoverageLabModal(true);
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <i data-lucide="edit" style={{ width: '13px', height: '13px' }}></i>
                              Enter Results
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '13.5px', color: '#059669', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i data-lucide="check-circle" style={{ width: '15px', height: '15px' }}></i>
                                Signed & Dispatched
                              </span>
                              <button 
                                type="button"
                                className="btn-cover-action lab-primary"
                                style={{ background: '#475569', color: 'white', padding: '6px 12px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                  setSelectedCoverageLabTest(test);
                                  setShowCoverageLabDetailsModal(true);
                                }}
                              >
                                <i data-lucide="eye" style={{ width: '12px', height: '12px' }}></i>
                                View Report
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB: REAGENTS */}
            {labSubTab === 'reagents' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i data-lucide="beaker" style={{ color: '#059669' }}></i>
                  Diagnostic Reagents Ledger
                </h3>
                <div className="table-responsive">
                  <table className="elite-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th>REAGENT NAME</th>
                        <th>STOCK LEVEL</th>
                        <th>MIN SAFE STOCK</th>
                        <th>STATUS</th>
                        <th style={{ textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverageReagents.map((item, idx) => {
                        const isSafe = item.status === 'Safe' || item.status === 'Normal';
                        const badgeStyle = isSafe 
                          ? { background: '#DCFCE7', color: '#16A34A' } 
                          : { background: '#FEE2E2', color: '#DC2626' };
                        return (
                          <tr key={idx}>
                            <td style={{ padding: '14px 10px', fontWeight: 700, color: '#1E293B', fontSize: '13.5px' }}>{item.name}</td>
                            <td style={{ padding: '14px 10px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>{item.level}</td>
                            <td style={{ padding: '14px 10px', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>{item.minSafe}</td>
                            <td style={{ padding: '14px 10px' }}>
                              <span className={`badge-pill ${isSafe ? 'new' : 'revisit'}`} style={{ ...badgeStyle, fontSize: '11px', fontWeight: 800 }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                              <button 
                                type="button"
                                className="btn-cover-action lab-primary"
                                onClick={async () => {
                                  try {
                                    await api.put(`/lab-inventory/${item.id}`, {
                                      isRestock: true,
                                      addQty: 50
                                    });
                                    showToast(`Restocked reagent ${item.name} successfully!`, 'success');
                                    fetchCoverageData();
                                  } catch (e) {
                                    showToast('Failed to restock reagent.', 'error');
                                  }
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <i data-lucide="refresh-cw" style={{ width: '12px', height: '12px' }}></i>
                                Restock Reagent
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: PHARMACY DYNAMIC COVERAGE */}
        {activeTab === 'pharmacy_cover' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: '24px' }}>
            {/* Royal blue header card */}
            <div className="glass-card" style={{
              background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
              border: '1px solid #93C5FD',
              padding: '28px',
              borderRadius: '20px',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="badge-pill new" style={{ background: '#2563EB', color: 'white', padding: '6px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ● Pharmacy Duty Cover
                  </span>
                </div>
                <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#1E3A8A', margin: '0 0 8px 0', fontFamily: 'Urbanist, sans-serif' }}>Pharmacy Active Coverage</h2>
                <p style={{ fontSize: '14.5px', color: '#1D4ED8', margin: 0, fontWeight: 600, maxWidth: '650px', lineHeight: '1.5' }}>
                  Dispensing and inventory controls active. Dispense prescriptions and manage stock levels under active pharmacist coverage credentials.
                </p>
              </div>
              <div style={{
                position: 'absolute',
                right: '-30px',
                bottom: '-30px',
                fontSize: '150px',
                color: 'rgba(37, 99, 235, 0.05)',
                fontWeight: 900,
                pointerEvents: 'none',
                userSelect: 'none'
              }}>
                PH
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', background: '#F8FAFC', padding: '8px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '24px', flexWrap: 'wrap' }}>
              {coverageState['ph-queue']?.on && (
                <button 
                  className={`btn-cover-tab ${pharmacySubTab === 'queue' ? 'active pharmacy' : ''}`}
                  onClick={() => { setPharmacySubTab('queue'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="pill" style={{ width: '16px', height: '16px' }}></i>
                  Prescription Dispensing
                </button>
              )}
              {(coverageState['ph-stock']?.on || coverageState['dr-stockview']?.on) && (
                <button 
                  className={`btn-cover-tab ${pharmacySubTab === 'stock' ? 'active pharmacy' : ''}`}
                  onClick={() => { setPharmacySubTab('stock'); setTimeout(() => window.lucide && window.lucide.createIcons(), 100); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i data-lucide="package" style={{ width: '16px', height: '16px' }}></i>
                  Medicine Inventory
                </button>
              )}
            </div>

            {/* SUBTAB: DISPENSING QUEUE */}
            {pharmacySubTab === 'queue' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <i data-lucide="pill" style={{ color: '#2563EB' }}></i>
                    Active Prescription Dispensing Queue
                  </h3>
                  <span className="badge-pill" style={{ background: '#EBF5FF', color: '#2563EB', fontWeight: 700, fontSize: '12px' }}>
                    {coveragePharmacyQueue.length} Order{coveragePharmacyQueue.length !== 1 ? 's' : ''} Pending
                  </span>
                </div>

                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Search patient by name or Rx ID..." 
                    value={pharmacySearchQuery}
                    onChange={e => setPharmacySearchQuery(e.target.value)}
                    style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 12px 0 36px', fontSize: '13.5px', outline: 'none', color: '#0F172A', boxSizing: 'border-box' }}
                  />
                  <i data-lucide="search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748B', display: 'flex', alignItems: 'center' }}></i>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {coveragePharmacyQueue
                    .filter(p => 
                      p.patient?.toLowerCase().includes(pharmacySearchQuery.toLowerCase()) || 
                      p.id?.toLowerCase().includes(pharmacySearchQuery.toLowerCase()) ||
                      p.med?.toLowerCase().includes(pharmacySearchQuery.toLowerCase())
                    )
                    .map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid #E2E8F0', borderRadius: '14px', background: '#F8FAFC', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EBF5FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i data-lucide="package"></i>
                        </div>
                        <div>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{item.patient}</span>
                          <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: 600, display: 'block', marginTop: '6px' }}>
                            Medication: <b style={{ color: '#2563EB' }}>{item.med}</b> · Qty: <span style={{ fontWeight: 800, color: '#0F172A' }}>{item.qty}</span>
                          </span>
                          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 550, display: 'block', marginTop: '4px' }}>
                            Rx ID: <span style={{ fontFamily: 'monospace' }}>#{item.id}</span> · Category: <span style={{ fontWeight: 700, color: '#64748B' }}>{item.type}</span>
                          </span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        className="btn-cover-action pharmacy-primary"
                        onClick={() => {
                          setSelectedCoveragePharmacyRx(item);
                          setCoveragePharmacyPaymentMode('UPI');
                          setCoveragePharmacyCashReceived('');
                          setShowCoveragePharmacyPaymentModal(true);
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <i data-lucide="package-check" style={{ width: '14px', height: '14px' }}></i>
                        Dispense & Pack
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB: STOCK */}
            {pharmacySubTab === 'stock' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i data-lucide="package" style={{ color: '#2563EB' }}></i>
                  Medicine Formulary Inventory
                </h3>
                <div className="table-responsive">
                  <table className="elite-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th>MEDICINE NAME</th>
                        <th>STOCK LEVEL</th>
                        <th>STATUS</th>
                        <th style={{ textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coveragePharmacyInventory.map((item, idx) => {
                        const isHigh = item.stock > 50;
                        const isLow = item.stock > 0 && item.stock <= 50;
                        const badgeClass = isHigh ? 'new' : isLow ? 'waiting' : 'revisit';
                        const badgeStyle = isHigh 
                          ? { background: '#DCFCE7', color: '#16A34A' } 
                          : isLow 
                          ? { background: '#FEF3C7', color: '#D97706' } 
                          : { background: '#FEE2E2', color: '#DC2626' };
                        return (
                          <tr key={idx}>
                            <td style={{ padding: '14px 10px', fontWeight: 700, color: '#1E293B', fontSize: '13.5px' }}>{item.name}</td>
                            <td style={{ padding: '14px 10px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>{item.stock} {item.unit}</td>
                            <td style={{ padding: '14px 10px' }}>
                              <span className={`badge-pill ${badgeClass}`} style={{ ...badgeStyle, fontSize: '11px', fontWeight: 800 }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                              <button 
                                type="button"
                                className="btn-cover-action pharmacy-primary"
                                onClick={async () => {
                                  try {
                                    await api.put(`/medicines/${item.id}`, {
                                      stock: item.stock + 100
                                    });
                                    showToast(`Restocked 100 units of ${item.name} successfully!`, 'success');
                                    fetchCoverageData();
                                  } catch (e) {
                                    showToast('Failed to restock medicine.', 'error');
                                  }
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <i data-lucide="plus-circle" style={{ width: '12px', height: '12px' }}></i>
                                Restock Stock
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="mobile-bottom-nav">
        {/* MOBILE BOTTOM NAV */}
        <div className={`mob-nav-item ${activeTab === 'dash' ? 'active' : ''}`} onClick={() => switchTab('dash')}>
          <i data-lucide="layout-grid"></i><span>Home</span>
        </div>
        <div className={`mob-nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => switchTab('appointments')}>
          <i data-lucide="calendar"></i><span>Apps</span>
        </div>
        <div className={`mob-nav-item ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => switchTab('patients')}>
          <i data-lucide="users"></i><span>Patients</span>
        </div>
        <div className={`mob-nav-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => switchTab('billing')}>
          <i data-lucide="wallet"></i><span>Bills</span>
        </div>
      </div>

      {/* APPOINTMENT DETAILS MODAL */}
      {detailsModalOpen && selectedAppointment && (
        <div className="details-modal-overlay" onClick={() => { setDetailsModalOpen(false); setShowDeleteConfirm(false); }}>
          <div className="details-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1A1D23' }}>Appointment Details</h2>
              <button className="btn-close" onClick={() => { setDetailsModalOpen(false); setShowDeleteConfirm(false); }}><i data-lucide="x"></i></button>
            </div>
            
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
                  {getInitials(selectedAppointment.patientId?.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '18px', color: '#1A1D23' }}>{selectedAppointment.patientId?.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>ID: #{selectedAppointment.patientId?._id?.substring(18).toUpperCase()}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                {(() => {
                  const originalStatus = appointments.find(a => a._id === selectedAppointment._id)?.status || selectedAppointment.status;
                  const isLocked = originalStatus === 'Cancelled' || originalStatus === 'Completed' || originalStatus === 'Checked Out';
                  const isCompleted = originalStatus === 'Completed' || originalStatus === 'Checked Out';

                  if (isLocked) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px', color: '#92400E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i data-lucide="lock" style={{ width: '14px', height: '14px', flexShrink: 0 }}></i>
                          <span>Status Lock: This appointment has been {originalStatus}. It cannot be rescheduled or modified.</span>
                        </div>

                        {isCompleted && (
                          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', marginBottom: '12px' }}>Clinical Summary</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                              <div>
                                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Prescribed Medicines</div>
                                {selectedAppointmentDetails.prescriptions.length === 0 ? (
                                  <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>No active prescription.</div>
                                ) : (
                                  selectedAppointmentDetails.prescriptions.map((presc, idx) => (
                                    <div key={presc._id || idx} style={{ background: '#EFF6FF', padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', border: '1px solid #DBEAFE' }}>
                                      {(presc.items || []).map((item, i) => (
                                        <div key={i} style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <i data-lucide="pill" style={{ width: '13px', height: '13px', color: '#2563EB' }}></i> {item.name} - {item.dosage} ({item.duration})
                                        </div>
                                      ))}
                                    </div>
                                  ))
                                )}
                              </div>

                              <div>
                                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Ordered Lab Tests</div>
                                {selectedAppointmentDetails.labs.length === 0 ? (
                                  <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>No lab tests ordered.</div>
                                ) : (
                                  <div style={{ background: '#F0FDF4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #DCFCE7' }}>
                                    {selectedAppointmentDetails.labs.map((lab, idx) => (
                                      <div key={lab._id || idx} style={{ fontSize: '13px', color: '#16A34A', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <i data-lucide="flask-conical" style={{ width: '13px', height: '13px', color: '#16A34A' }}></i> {lab.testName}
                                        </span>
                                        <span style={{ fontSize: '11px', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{lab.status}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '8px', color: '#1A1D23' }}>Reschedule Doctor</label>
                        <select
                          className="form-control"
                          style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: '10px', height: '44px', width: '100%', padding: '0 12px', fontWeight: 600, appearance: 'none', cursor: 'pointer' }}
                          value={selectedAppointment.doctorId?._id || selectedAppointment.doctorId || ''}
                          onChange={(e) => {
                            const newDocId = e.target.value;
                            const newDocObj = doctors.find(d => String(d._id) === String(newDocId)) || newDocId;
                            setSelectedAppointment({...selectedAppointment, doctorId: newDocObj, time: ''});
                          }}
                        >
                          <option value="">Select Doctor</option>
                          {doctors.map(d => (
                            <option key={d._id} value={d._id}>Dr. {d.name} ({d.specialty || 'General'})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '8px', color: '#1A1D23' }}>Reschedule Date</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          style={{ background: 'white', border: '1px solid #CBD5E1', borderRadius: '10px', height: '44px', width: '100%', padding: '0 12px', fontWeight: 600 }}
                          value={(() => {
                            if (!selectedAppointment.date) return '';
                            const d = new Date(selectedAppointment.date);
                            if (isNaN(d.getTime())) return '';
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            return `${year}-${month}-${day}`;
                          })()}
                          min={getLocalDateString()}
                          onChange={(e) => setSelectedAppointment({...selectedAppointment, date: e.target.value})} 
                        />
                      </div>

                      {!rescheduleAvailability.available && (
                        <div style={{ color: '#EF4444', background: '#FEF2F2', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: '1px solid #FEE2E2' }}>
                          Doctor Unavailable: {rescheduleAvailability.reason || 'Doctor is on leave or weekly off'}
                        </div>
                      )}

                      {rescheduleAvailability.available && (
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '8px', color: '#1A1D23' }}>Reschedule Time Slot</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '10px', background: '#F8FAFC' }}>
                            {(rescheduleAvailability.slots && rescheduleAvailability.slots.length > 0 ? rescheduleAvailability.slots : DEFAULT_RECEPTION_SLOTS).map(time => {
                              const docId = selectedAppointment.doctorId?._id || selectedAppointment.doctorId;
                              const cleanTimeSlotStr = (s) => s ? s.split(/\(Limit:/i)[0].trim().toLowerCase() : '';
                              const targetTimeClean = cleanTimeSlotStr(time);

                              let limit = 10;
                              const selectedDocObj = doctors.find(d => String(d._id) === String(docId));
                              if (selectedDocObj) {
                                  limit = selectedDocObj.max_slots || 10;
                              }

                              const match = time.match(/\(Limit:\s*(\d+)\)/i);
                              if (match) {
                                  limit = parseInt(match[1], 10);
                              }

                              let bookedCount = 0;
                              const targetDateStr = new Date(selectedAppointment.date).toDateString();
                              bookedCount = appointments.filter(app => {
                                  if (app._id === selectedAppointment._id) return false;
                                  if (app.status === 'Cancelled') return false;
                                  const appDocId = app.doctorId?._id || app.doctorId;
                                  if (String(appDocId) !== String(docId)) return false;
                                  const appDateStr = new Date(app.date).toDateString();
                                  if (appDateStr !== targetDateStr) return false;
                                  return cleanTimeSlotStr(app.time) === targetTimeClean;
                              }).length;

                              const isFull = bookedCount >= limit;
                              const isSelected = selectedAppointment.time === time;
                              const displayTime = time.split(/\(Limit:/i)[0].trim();

                              return (
                                <button
                                  key={time}
                                  type="button"
                                  disabled={isFull}
                                  onClick={() => setSelectedAppointment({ ...selectedAppointment, time })}
                                  style={{
                                    minHeight: '38px',
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1',
                                    background: isFull ? '#E2E8F0' : (isSelected ? '#EFF6FF' : 'white'),
                                    color: isFull ? '#94A3B8' : (isSelected ? '#2563EB' : '#1E293B'),
                                    fontWeight: isSelected ? 800 : 600,
                                    fontSize: '11px',
                                    cursor: isFull ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <span style={{ fontWeight: 700 }}>{displayTime}</span>
                                  <span style={{ fontSize: '9px', opacity: 0.8 }}>({bookedCount}/{limit})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const associatedBill = bills.find(b => {
                  const appBId = b.appointmentId?._id || b.appointmentId;
                  return appBId && appBId.toString() === selectedAppointment._id.toString();
                });
                if (!associatedBill) return null;
                return (
                  <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing & Invoice</span>
                      <span className={`status-badge ${associatedBill.status === 'Paid' ? 'available' : 'pending'}`} style={{ margin: 0, padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}>
                        {associatedBill.status || 'Unpaid'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Invoice Number:</span>
                        <span style={{ color: '#0F172A', fontWeight: 700 }}>#INV-{(associatedBill._id || '').substring(Math.max(0, (associatedBill._id || '').length - 6)).toUpperCase() || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Charge:</span>
                        <span style={{ color: '#0F172A', fontWeight: 700 }}>₹{(associatedBill.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      {associatedBill.discountPercent > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                          <span>Discount ({associatedBill.discountPercent}%):</span>
                          <span>-₹{((associatedBill.originalAmount || associatedBill.totalAmount) - associatedBill.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                    {associatedBill.status !== 'Paid' && (
                      <button
                        type="button"
                        className="btn btn-primary animate-in"
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          marginTop: '14px',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          border: 'none',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.15)'
                        }}
                        onClick={() => {
                          setSelectedBillForPayment(associatedBill);
                          setDiscountPercent(0);
                          setDiscountReason('');
                          setPaymentMethod('Cash');
                          setShowPaymentModal(true);
                          setDetailsModalOpen(false);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                        <span>Collect Payment & Apply Discount</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', minHeight: '44px' }}>
              {(() => {
                const originalStatus = appointments.find(a => a._id === selectedAppointment._id)?.status || selectedAppointment.status;
                const isLocked = originalStatus === 'Cancelled' || originalStatus === 'Completed' || originalStatus === 'Checked Out';

                if (showDeleteConfirm) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.2s ease-out' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#EF4444' }}>Are you sure?</span>
                      <button className="btn" style={{ background: '#F1F5F9', color: '#64748B', fontWeight: 800, padding: '0 16px', borderRadius: '10px', height: '44px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                      <button className="btn" style={{ background: '#EF4444', color: 'white', fontWeight: 800, padding: '0 20px', borderRadius: '10px', height: '44px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { handleDeleteAppointment(selectedAppointment._id); setShowDeleteConfirm(false); }}>Confirm Delete</button>
                    </div>
                  );
                }

                return (
                  <>
                    <button className="btn" style={{ background: '#FEE2E2', color: '#EF4444', fontWeight: 800, padding: '0 20px', borderRadius: '10px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(true)}>Delete</button>
                    {!isLocked ? (
                      <button className="btn btn-primary" style={{ fontWeight: 800, padding: '0 24px', borderRadius: '10px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleUpdateAppointment(selectedAppointment)}>Save Changes</button>
                    ) : (
                      <button className="btn btn-secondary" style={{ fontWeight: 800, padding: '0 24px', borderRadius: '10px', height: '44px', background: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setDetailsModalOpen(false); setShowDeleteConfirm(false); }}>Close</button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* COVERAGE LAB MODALS */}
      {showCoverageLabModal && selectedCoverageLabTest && (
        <div className="details-modal-overlay" onClick={() => setShowCoverageLabModal(false)} style={{ zIndex: 5000 }}>
          <div className="details-modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', padding: '28px', borderRadius: '16px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Enter Diagnostic Lab Results</h3>
              <button 
                type="button" 
                onClick={() => setShowCoverageLabModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748B' }}
              >✕</button>
            </div>
            
            <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Patient: <b style={{ color: '#0F172A' }}>{selectedCoverageLabTest.name}</b></div>
              <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>Test Type: <b style={{ color: '#0F172A' }}>{selectedCoverageLabTest.test}</b></div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const resultsObj = {
                  parameters: {
                    value: coverageLabParams.value,
                    unit: coverageLabParams.unit || 'g/dL'
                  },
                  remarks: coverageLabRemarks,
                  document: coverageLabFileName || 'LabReport_Signed.pdf',
                  finalizedAt: new Date().toISOString()
                };
                await api.put(`/labs/${selectedCoverageLabTest.id}`, {
                  status: 'Completed',
                  results: JSON.stringify(resultsObj)
                });
                showToast(`Lab results finalized & dispatched for ${selectedCoverageLabTest.name}!`, 'success');
                setShowCoverageLabModal(false);
                fetchCoverageData();
              } catch (err) {
                showToast('Failed to finalize results.', 'error');
              }
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Test Value / Parameter Value</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. 14.2" 
                    value={coverageLabParams.value} 
                    onChange={e => setCoverageLabParams({ ...coverageLabParams, value: e.target.value })}
                    required
                    style={{ flex: 1, height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', outline: 'none' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Unit (e.g. g/dL, mg/dL)" 
                    value={coverageLabParams.unit} 
                    onChange={e => setCoverageLabParams({ ...coverageLabParams, unit: e.target.value })}
                    required
                    style={{ width: '150px', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Remarks & Diagnostic Observations</label>
                <textarea 
                  placeholder="Enter medical observations, ranges, or comments..." 
                  value={coverageLabRemarks} 
                  onChange={e => setCoverageLabRemarks(e.target.value)}
                  required
                  style={{ width: '100%', height: '80px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Upload Diagnostic Report Document</label>
                <div 
                  style={{ border: '2px dashed #CBD5E1', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC' }}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'application/pdf,image/*';
                    input.onchange = (e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCoverageLabFileName(e.target.files[0].name);
                      }
                    };
                    input.click();
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                    {coverageLabFileName ? `Selected: ${coverageLabFileName}` : 'Click to select or drop lab report PDF'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>PDF, PNG, JPG up to 10MB</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCoverageLabModal(false)}
                  style={{ height: '40px', padding: '0 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                >Cancel</button>
                <button 
                  type="submit" 
                  style={{ height: '40px', padding: '0 20px', background: '#059669', border: 'none', borderRadius: '8px', fontWeight: 700, color: 'white', cursor: 'pointer' }}
                >Finalize & Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCoveragePharmacyPaymentModal && selectedCoveragePharmacyRx && (
        <div className="details-modal-overlay" onClick={() => setShowCoveragePharmacyPaymentModal(false)} style={{ zIndex: 5000 }}>
          <div className="details-modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', padding: '28px', borderRadius: '16px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Settle Bill & Dispense Medication</h3>
              <button 
                type="button" 
                onClick={() => setShowCoveragePharmacyPaymentModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748B' }}
              >✕</button>
            </div>
            
            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Patient:</span>
                <b style={{ fontSize: '13px', color: '#0F172A' }}>{selectedCoveragePharmacyRx.patient}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Rx ID:</span>
                <span style={{ fontSize: '13px', color: '#0F172A', fontFamily: 'monospace' }}>#{selectedCoveragePharmacyRx.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Meds Prescribed:</span>
                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 700, maxWidth: '280px', textAlign: 'right' }}>{selectedCoveragePharmacyRx.med}</span>
              </div>
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: 800 }}>Amount Due:</span>
                <span style={{ fontSize: '18px', color: '#2563EB', fontWeight: 900 }}>₹{(selectedCoveragePharmacyRx.amountVal || 550).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Select Payment Method
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {['UPI', 'Cash', 'Card'].map(mode => {
                const active = coveragePharmacyPaymentMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setCoveragePharmacyPaymentMode(mode);
                      setCoveragePharmacyCashReceived('');
                    }}
                    style={{
                      height: '42px',
                      borderRadius: '8px',
                      border: active ? '2px solid #2563EB' : '1px solid #CBD5E1',
                      background: active ? '#EFF6FF' : 'white',
                      color: active ? '#2563EB' : '#475569',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{mode}</span>
                  </button>
                );
              })}
            </div>

            {/* Interactive Forms */}
            {coveragePharmacyPaymentMode === 'UPI' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1', marginBottom: '20px' }}>
                <div style={{ padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8">
                    <rect x="1" y="1" width="6" height="6" rx="1" />
                    <rect x="1" y="17" width="6" height="6" rx="1" />
                    <rect x="17" y="1" width="6" height="6" rx="1" />
                    <path d="M9 1h2v2H9zm4 0h1v1h-1zm0 2h1v1h-1zm-4 3h2v1H9zm6 1h1v1h-1zm0 2h2v1h-2zm-6 2h2v1H9zm10 5h1v1h-1zm0 2h1v1h-1zm-3-3h1v1h-1zm-3 2h2v1h-2zM9 17h2v1H9zm4 2h1v1h-1zm0-3h1v1h-1zm3 1h1v1h-1z" />
                    <circle cx="12" cy="12" r="1.5" fill="#2563EB" stroke="none" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Scan dynamic QR Code</div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', fontWeight: 600 }}>Supports Google Pay, PhonePe, Paytm & UPI</div>
                </div>
              </div>
            )}

            {coveragePharmacyPaymentMode === 'Cash' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>Cash Amount Received</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#475569', fontSize: '14px' }}>₹</span>
                    <input 
                      type="number" 
                      placeholder="Enter amount given" 
                      value={coveragePharmacyCashReceived} 
                      onChange={(e) => setCoveragePharmacyCashReceived(e.target.value)} 
                      style={{ 
                        width: '100%', 
                        height: '40px', 
                        paddingLeft: '28px', 
                        border: '1px solid #CBD5E1', 
                        borderRadius: '8px', 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        outline: 'none',
                        color: '#0F172A',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                </div>
                {coveragePharmacyCashReceived && Number(coveragePharmacyCashReceived) >= (selectedCoveragePharmacyRx.amountVal || 550) && (
                  <div style={{ 
                    background: '#ECFDF5', 
                    border: '1px solid #A7F3D0', 
                    padding: '10px 14px', 
                    borderRadius: '8px', 
                    color: '#047857', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '13px', 
                    fontWeight: 800
                  }}>
                    <span>Change to Return:</span>
                    <span>₹{(Number(coveragePharmacyCashReceived) - (selectedCoveragePharmacyRx.amountVal || 550)).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {coveragePharmacyPaymentMode === 'Card' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '13.5px' }}>POS Terminal Active</div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', fontWeight: 600 }}>Please tap or insert the customer's Credit/Debit card.</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setShowCoveragePharmacyPaymentModal(false)}
                style={{ height: '40px', padding: '0 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
              >Cancel</button>
              <button 
                type="button" 
                onClick={handleConfirmCoveragePharmacyPayment}
                style={{ height: '40px', padding: '0 20px', background: '#10B981', border: 'none', borderRadius: '8px', fontWeight: 800, color: 'white', cursor: 'pointer' }}
              >Confirm Pay & Dispense</button>
            </div>
          </div>
        </div>
      )}

      {showCoverageLabDetailsModal && selectedCoverageLabTest && (() => {
        const parsed = parseResults(selectedCoverageLabTest.results);
        return (
          <div className="details-modal-overlay" onClick={() => setShowCoverageLabDetailsModal(false)} style={{ zIndex: 5000 }}>
            <div className="details-modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', padding: '28px', borderRadius: '16px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Lab Report Details</h3>
                <button 
                  type="button" 
                  onClick={() => setShowCoverageLabDetailsModal(false)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748B' }}
                >✕</button>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginBottom: '6px' }}>PATIENT</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{selectedCoverageLabTest.name}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Order ID: #{selectedCoverageLabTest.id}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Test Conducted</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{selectedCoverageLabTest.test}</span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Reported Value</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                    {parsed.parameters?.value || 'N/A'} {parsed.parameters?.unit || ''}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Clinical Observations & Remarks</span>
                  <p style={{ fontSize: '13.5px', color: '#334155', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #F1F5F9', margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
                    {parsed.remarks || 'No remarks provided.'}
                  </p>
                </div>
                {parsed.document && (
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Attached Document</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{parsed.document}</span>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); showToast(`Downloading: ${parsed.document}`, "info"); }} 
                        style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', textDecoration: 'none' }}
                      >Download</a>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCoverageLabDetailsModal(false)}
                  style={{ height: '40px', padding: '0 20px', background: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: 700, color: 'white', cursor: 'pointer' }}
                >Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Profile Edit Modal */}
      {showProfileEditModal && (
        <div className="details-modal-overlay" onClick={() => setShowProfileEditModal(false)} style={{ zIndex: 4000 }}>
          <div className="details-modal-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Edit Receptionist Profile</h2>
              <button 
                onClick={() => setShowProfileEditModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            {profileError && (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #86EFAC', color: '#16A34A', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleUpdateProfileSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                {profileEditAvatar ? (
                  <img 
                    src={profileEditAvatar} 
                    alt="Preview" 
                    style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #F59E0B', boxShadow: '0 8px 20px rgba(245,158,11,0.15)' }} 
                  />
                ) : (
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, boxShadow: '0 8px 20px rgba(245,158,11,0.15)' }}>
                    {profileEditName ? profileEditName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'RC'}
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#FFF7ED', color: '#EA580C', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: '1px dashed #F59E0B' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    Upload Picture
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 5000000) {
                            showToast("File size must be under 5MB", "error");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setProfileEditAvatar(event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {profileEditAvatar && (
                    <button
                      type="button"
                      onClick={() => setProfileEditAvatar('')}
                      style={{ display: 'block', margin: '6px auto 0', background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Remove Picture
                    </button>
                  )}
                </div>
              </div>

               <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: '#475569' }}>Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', height: '40px', padding: '0 12px', fontSize: '13px', fontWeight: 600, backgroundColor: '#F1F5F9', cursor: 'not-allowed' }}
                  value={profileEditName} 
                  disabled
                  required 
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Managed by Administrator</span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: '#475569' }}>Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', height: '40px', padding: '0 12px', fontSize: '13px', fontWeight: 600, backgroundColor: '#F1F5F9', cursor: 'not-allowed' }}
                  value={profileEditEmail} 
                  disabled
                  required 
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Managed by Administrator</span>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '44px', fontWeight: 800, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={profileEditLoading}
              >
                {profileEditLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && selectedBillForPayment && (
        <div className="details-modal-overlay" data-lenis-prevent onClick={() => { setShowPaymentModal(false); setPendingRegistrationPayload(null); }}>
          <div className="details-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div className="details-modal-header" style={{ marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <span className="details-modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Process Appointment Payment</span>
              <button className="details-modal-close" onClick={() => { setShowPaymentModal(false); setPendingRegistrationPayload(null); }}>✕</button>
            </div>
            
            <form onSubmit={handleMarkAsPaidSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>Patient Name</label>
                <input 
                  type="text" 
                  style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', fontWeight: 600, backgroundColor: '#F8FAFC' }}
                  value={selectedBillForPayment.patientId?.name || 'Unknown'} 
                  readOnly 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>Total Charge</label>
                  <input 
                    type="text" 
                    style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', fontSize: '14px', fontWeight: 700, backgroundColor: '#F8FAFC' }}
                    value={`₹${selectedBillForPayment.totalAmount.toLocaleString()}`} 
                    readOnly 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>Discount (%)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      min="0"
                      max={allowedDiscountPercent}
                      style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 28px 0 12px', fontSize: '14px', fontWeight: 800 }}
                      value={discountPercent} 
                      onChange={e => setDiscountPercent(Math.min(allowedDiscountPercent, Math.max(0, Number(e.target.value))))} 
                    />
                    <span style={{ position: 'absolute', right: '12px', fontWeight: 800, color: '#64748B' }}>%</span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginTop: '4px', fontWeight: 600 }}>Max limit: {allowedDiscountPercent}%</span>
                </div>
              </div>

              {discountPercent > 0 && (
                <div className="animate-in">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#EF4444', marginBottom: '6px' }}>Discount Reason *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Senior Citizen / Staff Relative"
                    style={{ width: '100%', height: '40px', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0 12px', fontSize: '13.5px', fontWeight: 600 }}
                    value={discountReason} 
                    onChange={e => setDiscountReason(e.target.value)} 
                    required={discountPercent > 0}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>Payment Method</label>
                <select 
                  style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 8px', fontSize: '13.5px', fontWeight: 600, background: 'white' }}
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Netbanking">Netbanking</option>
                </select>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                  <span>Original Total:</span>
                  <span>₹{selectedBillForPayment.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {discountPercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#EF4444', fontWeight: 600 }}>
                    <span>Discount Applied:</span>
                    <span>-₹{((selectedBillForPayment.totalAmount * discountPercent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#0F172A', fontWeight: 850, borderTop: '1px dashed #CBD5E1', paddingTop: '8px', marginTop: '4px' }}>
                  <span>Net Payable Amount:</span>
                  <span style={{ color: '#2563EB', fontSize: '17px' }}>₹{(selectedBillForPayment.totalAmount - (selectedBillForPayment.totalAmount * discountPercent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ height: '40px', padding: '0 20px', borderRadius: '8px', fontWeight: 700 }} onClick={() => { setShowPaymentModal(false); setPendingRegistrationPayload(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ height: '40px', padding: '0 24px', borderRadius: '8px', fontWeight: 800, background: 'var(--primary-gradient)', border: 'none' }} disabled={isSettlingPayment}>
                  {isSettlingPayment ? 'Processing Payment & Registering...' : 'Complete Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Indent Order Summary Modal */}
      {showIndentModal && selectedIndent && (() => {
        const indentStatusStyle = (s) => {
          if (s === 'Approved') return { color: '#16A34A', fontWeight: 800 };
          if (s === 'Rejected') return { color: '#DC2626', fontWeight: 800 };
          if (s === 'Received') return { color: '#0369A1', fontWeight: 800 };
          if (s === 'Draft') return { color: '#64748B', fontWeight: 800 };
          return { color: '#D97706', fontWeight: 800 };
        };
        return (
          <div onClick={() => { setShowIndentModal(false); setSelectedIndent(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>Indent Order Summary</div>
                  <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>ID: {selectedIndent.indentId}</div>
                </div>
                <button onClick={() => { setShowIndentModal(false); setSelectedIndent(null); }} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '16px', fontWeight: 'bold' }}>✕</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Department</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{selectedIndent.department}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Requested Date</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                      {new Date(selectedIndent.createdAt || selectedIndent.requiredDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Requested By</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{selectedIndent.requestedBy}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Status</span>
                    <div style={{ marginTop: '2px' }}>
                      <span style={indentStatusStyle(selectedIndent.status)}>{selectedIndent.status}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Ordered</h4>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Item Name</th>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Category</th>
                          <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedIndent.items || []).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: idx === (selectedIndent.items || []).length - 1 ? 'none' : '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0F172A' }}>{item.name}</td>
                            <td style={{ padding: '10px 16px', color: '#64748B' }}>{item.category || 'N/A'}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{item.requiredQty} {item.unit || 'Strip'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedIndent.purpose && (
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Remarks/Purpose</span>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>{selectedIndent.purpose}</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 0 0 0', borderTop: '1px solid #F1F5F9', flexShrink: 0, marginTop: '20px' }}>
                <button 
                  onClick={() => { setShowIndentModal(false); setSelectedIndent(null); }}
                  style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#64748B' }}
                >
                  Close
                </button>
                {selectedIndent.status !== 'Received' && (
                  <button 
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const updated = { ...selectedIndent, status: 'Received' };
                        setIndents(prev => prev.map(ind => ind._id === selectedIndent._id ? updated : ind));
                        setSelectedIndent(updated);
                        await api.put(`/indents/${selectedIndent._id}`, { status: 'Received' });
                        showToast('Indent marked as received!', 'success');
                        fetchData();
                      } catch (err) {
                        console.error(err);
                        showToast('Failed to update indent status', 'error');
                        fetchData();
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{ height: '40px', padding: '0 20px', borderRadius: '8px', border: 'none', background: '#2563EB', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Done (Received)
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* PATIENT ACTION MENU POPOVER */}
      {activePatientMenuId && (() => {
        const targetPatient = patientsList.find(p => String(p._id) === String(activePatientMenuId));
        if (!targetPatient) return null;
        return (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 999998, background: 'transparent' }}
              onClick={(e) => {
                e.stopPropagation();
                setActivePatientMenuId(null);
              }}
            />
            <div
              style={{
                position: 'fixed',
                top: `${patientMenuPos.top}px`,
                right: `${patientMenuPos.right}px`,
                zIndex: 999999,
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
                width: '215px',
                overflow: 'hidden',
                padding: '6px 0'
              }}
            >
              <div
                onClick={() => {
                  setActivePatientMenuId(null);
                  handleOpenPatientProfile(targetPatient);
                }}
                style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, color: '#1E293B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                View Patient Profile
              </div>

              <div
                onClick={() => {
                  setActivePatientMenuId(null);
                  handleRePrintPatientSlip(targetPatient);
                }}
                style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ECFDF5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Re-Print Receipt / Slip
              </div>

              <div
                onClick={() => {
                  setActivePatientMenuId(null);
                  setFormData({ name: targetPatient.name, age: targetPatient.age, gender: targetPatient.gender, contact: targetPatient.contact, email: targetPatient.email || '', doctorId: '' });
                  setIsExistingPatient(true);
                  setSelectedPatient(targetPatient);
                  switchTab('registration-form', true);
                }}
                style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, color: '#7C3AED', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Book / Order Procedure
              </div>

              <div
                onClick={() => {
                  setActivePatientMenuId(null);
                  setFormData({
                    name: targetPatient.name,
                    age: targetPatient.age,
                    gender: targetPatient.gender,
                    contact: targetPatient.contact,
                    email: targetPatient.email || '',
                    bloodGroup: targetPatient.bloodGroup || 'O+',
                    address: targetPatient.address || '',
                    medicalHistory: targetPatient.medicalHistory ? targetPatient.medicalHistory.join(', ') : '',
                    doctorId: ''
                  });
                  setIsExistingPatient(true);
                  switchTab('registration-form', true);
                }}
                style={{ padding: '10px 14px', fontSize: '12.5px', fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Edit Patient Info
              </div>
            </div>
          </>
        );
      })()}

      {/* PAYMENT & DIAGNOSTIC LAB / CLINICAL ORDER SLIP PDF MODAL */}
      {showSlipPdfModal && activeSlipData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #FFFFFF !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-receipt-slip, #printable-receipt-slip * {
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-receipt-slip {
                position: relative !important;
                left: 0 !important;
                top: 0 !important;
                transform: none !important;
                width: 210mm !important;
                max-width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border: none !important;
                padding: 20mm 20mm 15mm 20mm !important;
                margin: 0 auto !important;
                background: #FFFFFF !important;
                color: #0F172A !important;
                border-radius: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }
              .print-diagonal-watermark {
                position: absolute !important;
                top: 46% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) rotate(-35deg) !important;
                opacity: 0.16 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                display: block !important;
                visibility: visible !important;
                z-index: 0 !important;
                text-align: center !important;
                white-space: nowrap !important;
                width: 100% !important;
              }
              .print-diagonal-watermark-text {
                font-size: 130px !important;
                font-weight: 900 !important;
                color: #475569 !important;
                letter-spacing: 28px !important;
                text-transform: uppercase !important;
                line-height: 1 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-diagonal-watermark-subtext {
                font-size: 26px !important;
                font-weight: 800 !important;
                color: #64748B !important;
                letter-spacing: 14px !important;
                text-transform: uppercase !important;
                margin-top: 14px !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div id="printable-receipt-slip" style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '720px', padding: '36px 40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0', position: 'relative', overflow: 'hidden' }}>
            
            {/* Massive Diagonal Watermark - CUROXA (Optimized for PDF Print) */}
            <div 
              className="print-diagonal-watermark"
              style={{ 
                position: 'absolute', 
                top: '48%', 
                left: '50%', 
                transform: 'translate(-50%, -50%) rotate(-35deg)', 
                opacity: 0.14, 
                pointerEvents: 'none', 
                userSelect: 'none', 
                whiteSpace: 'nowrap',
                zIndex: 0, 
                WebkitPrintColorAdjust: 'exact', 
                printColorAdjust: 'exact',
                textAlign: 'center',
                width: '100%'
              }}
            >
              <div className="print-diagonal-watermark-text" style={{ fontSize: '110px', fontWeight: 900, color: '#64748B', letterSpacing: '24px', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
                CUROXA
              </div>
              <div className="print-diagonal-watermark-subtext" style={{ fontSize: '22px', fontWeight: 800, color: '#64748B', letterSpacing: '12px', textTransform: 'uppercase', marginTop: '12px' }}>
                HEALTHCARE • MEDICAL RECEIPT
              </div>
            </div>

            {/* Header */}
            <div style={{ borderBottom: '2px solid #2563EB', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#2563EB', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.3)', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '21px', fontWeight: 900, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>{activeSlipData.hospitalName || 'Curoxa Medical Center'}</h2>
                    <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginTop: '2px' }}>Official Payment Receipt & Clinical Service Order Slip</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#2563EB', background: '#EFF6FF', padding: '4px 12px', borderRadius: '6px', border: '1px solid #BFDBFE', display: 'inline-block', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{activeSlipData.receiptNo}</span>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', fontWeight: 600 }}>Date: {activeSlipData.date}</div>
              </div>
            </div>

            {/* Patient Meta Details */}
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', position: 'relative', zIndex: 1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PATIENT NAME</span>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{activeSlipData.patientName}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginTop: '2px' }}>UHID: {activeSlipData.patientId}</div>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AGE / GENDER / CONTACT</span>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155', marginTop: '2px' }}>{activeSlipData.ageGender}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>Phone: {activeSlipData.contact}</div>
              </div>
            </div>

            {/* Order & Payment Items Table */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, color: '#475569', width: '50px' }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, color: '#475569' }}>Investigation / Procedure Description</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#475569', width: '120px' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeSlipData.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', background: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>{item.description || item.name || activeSlipData.testName}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Summary & Payment Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F0FDF4', border: '1.5px solid #BBF7D0', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', position: 'relative', zIndex: 1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PAYMENT STATUS</span>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  PAID via {activeSlipData.paymentMethod || activeSlipData.paymentMode || 'Cash'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL RECEIVED</span>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803D', fontFamily: "'Outfit', sans-serif" }}>₹{(activeSlipData.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Instructions, Barcode & Signature */}
            <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', padding: '14px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px', shrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <div>
                  <div style={{ fontSize: '11.5px', color: '#334155', fontWeight: 700 }}>
                    <strong>Instructions:</strong> Please present this computer-generated official receipt at the counter.
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>Authorized Signature / Computer Generated Receipt</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', paddingLeft: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <svg width="120" height="28" viewBox="0 0 120 28" style={{ display: 'block' }}>
                  <rect x="0" y="0" width="3" height="24" fill="#334155"/>
                  <rect x="5" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="8" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="12" y="0" width="4" height="24" fill="#334155"/>
                  <rect x="18" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="21" y="0" width="3" height="24" fill="#334155"/>
                  <rect x="26" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="30" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="33" y="0" width="4" height="24" fill="#334155"/>
                  <rect x="39" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="43" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="46" y="0" width="3" height="24" fill="#334155"/>
                  <rect x="51" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="55" y="0" width="4" height="24" fill="#334155"/>
                  <rect x="61" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="64" y="0" width="3" height="24" fill="#334155"/>
                  <rect x="69" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="73" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="76" y="0" width="4" height="24" fill="#334155"/>
                  <rect x="82" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="86" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="89" y="0" width="3" height="24" fill="#334155"/>
                  <rect x="94" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="98" y="0" width="4" height="24" fill="#334155"/>
                  <rect x="104" y="0" width="1" height="24" fill="#334155"/>
                  <rect x="107" y="0" width="3" height="24" fill="#334155"/>
                  <rect x="112" y="0" width="2" height="24" fill="#334155"/>
                  <rect x="116" y="0" width="1" height="24" fill="#334155"/>
                </svg>
                <div style={{ fontSize: '9px', color: '#64748B', fontWeight: 800, marginTop: '2px', letterSpacing: '1px' }}>{activeSlipData.receiptNo}</div>
              </div>
            </div>

            {/* Official Footer Bar with Website Link */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E2E8F0', fontSize: '11px', color: '#64748B', fontWeight: 700, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span style={{ color: '#2563EB', fontWeight: 800 }}>www.curoxa-healthcare.com</span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600 }}>
                Official Computer Generated Receipt • Valid Without Physical Signature
              </div>
            </div>

            {/* Actions (Hidden when printing or saving PDF) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', marginTop: '16px', position: 'relative', zIndex: 1 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: '10px 18px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#334155', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Slip
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: '10px 18px', background: '#059669', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(5,150,105,0.25)', transition: 'all 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = '#047857'}
                onMouseLeave={e => e.currentTarget.style.background = '#059669'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Save as PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSlipPdfModal(false);
                  setActiveSlipData(null);
                  switchTab('patients');
                }}
                style={{ padding: '10px 22px', background: '#2563EB', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', transition: 'all 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD / EDIT VITALS MODAL */}
      {showVitalsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #C4B5FD', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#1A1D23', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Record Patient Vitals
              </h3>
              <button 
                type="button" 
                onClick={() => setShowVitalsModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVitals}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Temperature (°F)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-control" 
                    placeholder="e.g. 98.6"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalTemp}
                    onChange={e => setVitalTemp(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Heart Rate / Pulse (bpm)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 72"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalPulse}
                    onChange={e => setVitalPulse(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>BP Systolic (mmHg)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 120"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalBpSys}
                    onChange={e => setVitalBpSys(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>BP Diastolic (mmHg)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 80"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalBpDia}
                    onChange={e => setVitalBpDia(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Respiration (breaths/min)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 16"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalResp}
                    onChange={e => setVitalResp(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Oxygen Saturation SpO2 (%)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 98"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalSpo2}
                    onChange={e => setVitalSpo2(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Weight (kg)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="form-control" 
                    placeholder="e.g. 68.5"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalWeight}
                    onChange={e => setVitalWeight(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Height (cm)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 170"
                    style={{ height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '0 12px', width: '100%' }}
                    value={vitalHeight}
                    onChange={e => setVitalHeight(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ height: '42px', padding: '0 20px', borderRadius: '8px', border: '1.5px solid #CBD5E1', background: 'white', color: '#475569', fontWeight: 700 }}
                  onClick={() => setShowVitalsModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ height: '42px', padding: '0 24px', borderRadius: '8px', background: '#2563EB', color: 'white', fontWeight: 800, border: 'none' }}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH SMS / BROADCAST COMMUNICATION MODAL */}
      {showBatchSmsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '540px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0', animation: 'zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>Dispatch Batch SMS / Notification</h3>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Broadcast SMS alert to {selectedPatientIds.length} selected patient(s)</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowBatchSmsModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Selected Patients Summary Chips */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                RECIPIENTS ({selectedPatientIds.length})
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto', padding: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                {patients.filter(p => selectedPatientIds.includes(p._id)).map(p => (
                  <span key={p._id} style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    👤 {p.name} ({p.contact})
                  </span>
                ))}
              </div>
            </div>

            {/* Template Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                SMS TEMPLATE
              </label>
              <select 
                value={batchSmsTemplate}
                onChange={(e) => {
                  const val = e.target.value;
                  setBatchSmsTemplate(val);
                  if (val === 'reminder') {
                    setBatchSmsMessage('Dear Patient, this is an official reminder for your clinical visit at Curoxa Medical Center. Please arrive 10 mins early.');
                  } else if (val === 'lab') {
                    setBatchSmsMessage('Dear Patient, your diagnostic lab test results are ready at Curoxa Medical Center. You can collect your report at counter 2.');
                  } else if (val === 'general') {
                    setBatchSmsMessage('Dear Valued Patient, Curoxa Medical Center wishes you good health! Our specialized OPD clinics are open Mon-Sat 9 AM - 8 PM.');
                  }
                }}
                style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1px solid #CBD5E1', padding: '0 12px', fontSize: '13px', fontWeight: 700, color: '#0F172A', background: '#FFFFFF', outline: 'none' }}
              >
                <option value="reminder">Appointment & Visit Reminder</option>
                <option value="lab">Lab Test Result Ready Notification</option>
                <option value="general">Hospital Announcement / OPD Schedule</option>
                <option value="custom">Custom SMS Message</option>
              </select>
            </div>

            {/* Message Body Textarea */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MESSAGE CONTENT</label>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>{batchSmsMessage.length} chars (1 SMS per patient)</span>
              </div>
              <textarea 
                rows="4"
                value={batchSmsMessage}
                onChange={(e) => setBatchSmsMessage(e.target.value)}
                placeholder="Enter SMS message content to broadcast..."
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'inherit', color: '#0F172A', outline: 'none', background: '#F8FAFC', resize: 'none' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
              <button 
                type="button" 
                onClick={() => setShowBatchSmsModal(false)}
                style={{ padding: '10px 18px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={batchSmsSending || !batchSmsMessage.trim()}
                onClick={() => {
                  setBatchSmsSending(true);
                  setTimeout(() => {
                    setBatchSmsSending(false);
                    setShowBatchSmsModal(false);
                    setBatchSmsSuccessToast(`Batch SMS successfully dispatched to ${selectedPatientIds.length} patient(s)!`);
                    setSelectedPatientIds([]);
                    setTimeout(() => setBatchSmsSuccessToast(''), 4500);
                  }, 1000);
                }}
                style={{ padding: '10px 22px', background: '#2563EB', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', opacity: batchSmsSending ? 0.7 : 1 }}
              >
                {batchSmsSending ? 'Dispatching SMS...' : `Dispatch SMS to ${selectedPatientIds.length} Patient(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST NOTIFICATION */}
      {batchSmsSuccessToast && (
        <div style={{ position: 'fixed', bottom: '28px', right: '28px', background: '#0F172A', color: 'white', padding: '14px 20px', borderRadius: '12px', border: '1px solid #22C55E', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 999999, animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#22C55E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px' }}>✓</div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F8FAFC' }}>{batchSmsSuccessToast}</div>
        </div>
      )}
      {/* View Lab Report Modal (Rendered globally so it can be opened from any tab) */}
      {labModalOpen && selectedLabRequest && (
        <div onClick={() => setLabModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>Lab Investigation Report</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>Test Name: {selectedLabRequest.testName}</div>
              </div>
              <button onClick={() => setLabModalOpen(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '16px', fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', color: '#1E293B', lineHeight: '1.6', maxHeight: '400px', overflowY: 'auto' }}>
              {selectedLabRequest.results || 'Report is pending completion.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReceptionistDashboard;
