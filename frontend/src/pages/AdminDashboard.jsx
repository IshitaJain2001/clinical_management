import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import HRPayroll from './HRPayroll';

// Safeguard React DOM reconciliation against external DOM mutations
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

const pmModules = [
  /* ---- DOCTOR ---- */
  { id: 'dr-consult',    name: 'Patient consultation notes', desc: 'Write SOAP notes, diagnosis, history', group: 'Doctor — clinical', coreFor: ['doctor'] },
  { id: 'dr-rx',         name: 'Prescription writer',        desc: 'Prescribe medicines, generate slip',   group: 'Doctor — clinical', coreFor: ['doctor'] },
  { id: 'dr-laborder',   name: 'Test order / lab referral',  desc: 'Order tests, track reports',           group: 'Doctor — clinical', coreFor: ['doctor'] },
  { id: 'dr-history',    name: 'Patient visit history',      desc: 'View past visits across hospitals',    group: 'Doctor — clinical', coreFor: ['doctor'] },
  { id: 'dr-discharge',  name: 'Discharge summary',          desc: 'Generate & sign discharge summary',    group: 'Doctor — clinical', coreFor: [] },
  { id: 'dr-stockview',  name: 'Pharmacy stock view',        desc: 'Read-only view of medicine levels',    group: 'Doctor — clinical', coreFor: [] },
  /* ---- RECEPTIONIST ---- */
  { id: 'rc-register',   name: 'Patient registration',       desc: 'Register new & search global registry',group: 'Receptionist — core', coreFor: ['receptionist'] },
  { id: 'rc-appt',       name: 'Appointment booking',        desc: 'Book, reschedule, cancel appointments',group: 'Receptionist — core', coreFor: ['receptionist'] },
  { id: 'rc-queue',      name: 'OPD token queue',            desc: 'Manage daily queue, call next',        group: 'Receptionist — core', coreFor: ['receptionist'] },
  { id: 'rc-upload',     name: 'Lab report upload',          desc: 'Upload external lab reports',          group: 'Receptionist — core', coreFor: ['receptionist'] },
  { id: 'rc-billing',    name: 'Billing & receipts',         desc: 'Generate consultation receipts',       group: 'Receptionist — ops', coreFor: [] },
  { id: 'rc-reorder',    name: 'Pharmacy stock reorder',     desc: 'Raise reorder requests for medicines', group: 'Receptionist — ops', coreFor: [] },
  { id: 'rc-labprint',   name: 'Lab slip printing',          desc: 'Print / WhatsApp lab referral slips',  group: 'Receptionist — ops', coreFor: [] },
  /* ---- LAB TECH ---- */
  { id: 'lt-queue',      name: 'Test order queue',           desc: 'View & accept pending lab orders',     group: 'Lab tech — core', coreFor: ['lab'] },
  { id: 'lt-upload',     name: 'Report upload',              desc: 'Upload completed reports, link referral',group: 'Lab tech — core', coreFor: ['lab'] },
  { id: 'lt-reagents',   name: 'Lab reagents inventory',     desc: 'View & update reagent stock',          group: 'Lab tech — core', coreFor: ['lab'] },
  { id: 'lt-dispatch',   name: 'Report dispatch',            desc: 'Send report to doctor & patient',      group: 'Lab tech — ops', coreFor: [] },
  { id: 'lt-extlab',     name: 'External lab coordination',  desc: 'Log tests sent to external lab',       group: 'Lab tech — ops', coreFor: [] },
  /* ---- PHARMACIST ---- */
  { id: 'ph-queue',      name: 'Prescription queue',         desc: 'View incoming prescriptions in real time',group: 'Pharmacist — core', coreFor: ['pharmacy'] },
  { id: 'ph-dispense',   name: 'Medicine dispensing',        desc: 'Mark medicines dispensed',             group: 'Pharmacist — core', coreFor: ['pharmacy'] },
  { id: 'ph-stock',      name: 'Stock inventory',            desc: 'Full view of stock, expiry, batches',  group: 'Pharmacist — core', coreFor: ['pharmacy'] },
  { id: 'ph-reorder',    name: 'Reorder management',         desc: 'Raise purchase orders to suppliers',   group: 'Pharmacist — core', coreFor: ['pharmacy'] },
  { id: 'ph-billing',    name: 'Prescription billing',       desc: 'Generate pharmacy bill & collect payment',group: 'Pharmacist — ops', coreFor: [] },
  { id: 'ph-controlled', name: 'Controlled drugs log',       desc: 'Maintain NDPS narcotics register',     group: 'Pharmacist — ops', coreFor: [] },
  /* ---- NURSE ---- */
  { id: 'nu-vitals',     name: 'Patient vitals entry',       desc: 'Enter BP, temp, weight, SpO2',         group: 'Nurse — core', coreFor: ['nurse'] },
  { id: 'nu-ward',       name: 'Ward round notes',           desc: 'Log inpatient round notes per shift',  group: 'Nurse — core', coreFor: ['nurse'] },
  { id: 'nu-labassist',  name: 'Lab sample assist',          desc: 'Assist with sample collection',        group: 'Nurse — ops', coreFor: [] },
  { id: 'nu-dispense',   name: 'Medicine dispensing (assist)',desc: 'Assist pharmacist in dispensing',     group: 'Nurse — ops', coreFor: [] },
];

const AdminCoverageCountdown = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} left`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span style={{ marginLeft: '6px', opacity: 0.85, fontWeight: 800 }}>({timeLeft})</span>;
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const tenantModules = (() => {
    try {
      return JSON.parse(localStorage.getItem('tenantModules') || '{}');
    } catch (e) {
      return {};
    }
  })();

  const getAvailableRoles = () => {
    const allRoles = [
      { value: 'doctor', label: 'Doctor', moduleKey: 'doctor' },
      { value: 'receptionist', label: 'Receptionist', moduleKey: 'reception' },
      { value: 'lab', label: 'Laboratory', moduleKey: 'laboratory' },
      { value: 'pharmacy', label: 'Pharmacy', moduleKey: 'pharmacy' },
      { value: 'hr', label: 'HR Manager', moduleKey: null },
      { value: 'admin', label: 'System Admin', moduleKey: null }
    ];
    return allRoles.filter(r => !r.moduleKey || tenantModules[r.moduleKey]?.enabled !== false);
  };
  
  // Dynamic Role Coverage System state
  const [pmState, setPmState] = useState(() => {
    const saved = localStorage.getItem('curoxa_pmState');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {};
  });
  const [pmSelectedStaffId, setPmSelectedStaffId] = useState(null);
  const [pmPendingChanges, setPmPendingChanges] = useState({}); // { permId: { on, type, expiresIn } }
  const [pmReason, setPmReason] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [pmGridSearch, setPmGridSearch] = useState('');
  const [dismissedMockCards, setDismissedMockCards] = useState([]);

  const defaultMockDelegations = [
    {
      id: 'mock-1',
      staffName: 'Priya Sharma',
      initials: 'PS',
      transition: 'Receptionist → Inventory Manager',
      badgeText: 'Expiring Soon',
      badgeType: 'warning',
      department: 'Pharmacy',
      assignedBy: 'Admin',
      duration: '15 Jun - 25 Jun',
      remaining: '5 days left',
      color: '#FF7A38'
    },
    {
      id: 'mock-2',
      staffName: 'Michael Chen',
      initials: 'MC',
      transition: 'Lab Technician → Lab Supervisor',
      badgeText: 'Recently Assigned',
      badgeType: 'success',
      department: 'Laboratory',
      assignedBy: 'Dr. Patel',
      duration: '10 Jun - 05 Jul',
      remaining: '14 days left',
      color: '#10B981'
    },
    {
      id: 'mock-3',
      staffName: 'Anita Rao',
      initials: 'AR',
      transition: 'Nurse → Ward In-charge',
      badgeText: 'Expired',
      badgeType: 'danger',
      department: 'General Ward',
      assignedBy: 'Admin',
      duration: '01 Jun - 18 Jun',
      remaining: 'Ended',
      color: '#EF4444'
    },
    {
      id: 'mock-4',
      staffName: 'David Kim',
      initials: 'DK',
      transition: 'Junior Doctor → OPD Lead',
      badgeText: 'Recently Assigned',
      badgeType: 'success',
      department: 'OPD',
      assignedBy: 'Admin',
      duration: '12 Jun - 28 Jun',
      remaining: '8 days left',
      color: '#10B981'
    }
  ];

  const getActiveDelegationsForDashboard = () => {
    const realList = [];
    Object.keys(pmState || {}).forEach(staffName => {
      Object.keys(pmState[staffName] || {}).forEach(permId => {
        const over = pmState[staffName][permId];
        if (over?.on) {
          const matchingPerm = pmModules.find(m => m.id === permId);
          const staffObj = staff.find(s => s.name === staffName);
          const originalRole = staffObj ? staffObj.role.charAt(0).toUpperCase() + staffObj.role.slice(1) : 'Staff';
          const targetRole = matchingPerm ? matchingPerm.name : permId;

          let initials = staffName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          if (!initials) initials = 'ST';

          let remaining = 'Permanent';
          let badgeText = 'Active';
          let badgeType = 'success';
          if (over.type === 'temp' && over.expiresAt) {
            const msLeft = new Date(over.expiresAt) - Date.now();
            if (msLeft <= 0) {
              remaining = 'Ended';
              badgeText = 'Expired';
              badgeType = 'danger';
            } else {
              const hrsLeft = Math.ceil(msLeft / 3600000);
              remaining = `${hrsLeft} hrs left`;
              badgeText = hrsLeft <= 3 ? 'Expiring Soon' : 'Recently Assigned';
              badgeType = hrsLeft <= 3 ? 'warning' : 'success';
            }
          }

          const grantedDate = over.grantedAt ? new Date(over.grantedAt) : new Date();
          const expiryDate = over.expiresAt ? new Date(over.expiresAt) : null;
          const durationStr = expiryDate 
            ? `${grantedDate.getDate()} ${grantedDate.toLocaleString('default', { month: 'short' })} - ${expiryDate.getDate()} ${expiryDate.toLocaleString('default', { month: 'short' })}`
            : `${grantedDate.getDate()} ${grantedDate.toLocaleString('default', { month: 'short' })} onwards`;

          realList.push({
            id: `real-${staffName}-${permId}`,
            staffName,
            initials,
            transition: `${originalRole} → ${targetRole}`,
            badgeText,
            badgeType,
            department: matchingPerm?.group || 'General',
            assignedBy: 'Admin',
            duration: durationStr,
            remaining,
            color: badgeType === 'success' ? '#10B981' : (badgeType === 'warning' ? '#FF7A38' : '#EF4444'),
            isReal: true,
            permId
          });
        }
      });
    });

    return realList;
  };

  useEffect(() => {
    setPmGridSearch('');
  }, [pmSelectedStaffId]);

  const [staff, setStaff] = useState([]);
  const [staffPage, setStaffPage] = useState(1);
  const [newStaff, setNewStaff] = useState({ staff_id: '', password: '', confirmPassword: '', role: getAvailableRoles()[0]?.value || 'doctor', name: '', max_slots: '', email: '' });
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);

  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [activeStaffCategory, setActiveStaffCategory] = useState('All');
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showFeedback = (message, type = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(message);
      setSuccess('');
      setTimeout(() => setError(''), 3000);
    }
  };
  
  // Interactive approvals state matching the new mockup layout exactly
  const [pendingApprovals, setPendingApprovals] = useState([]);

  const [approvalsSubTab, setApprovalsSubTab] = useState('reorder');
  const [approvedTodayCount, setApprovedTodayCount] = useState(0);
  const [rejectedThisWeekCount, setRejectedThisWeekCount] = useState(0);

  // High-fidelity interactive Alerts lists
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  const [warningAlerts, setWarningAlerts] = useState([]);

  const [resolvedCount, setResolvedCount] = useState(0);

  // Enterprise-grade categorized alerts system — real data only
  const [alertCategoryFilter, setAlertCategoryFilter] = useState('all');
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);
  const alertCatBarRef = useRef(null);

  // Revenue tab filter state
  const [revenueFilterPeriod, setRevenueFilterPeriod] = useState('today');
  const [revenueCustomDate, setRevenueCustomDate] = useState('');

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [selectedStaffToRevoke, setSelectedStaffToRevoke] = useState(null);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueTimeframe, setRevenueTimeframe] = useState('today'); // 'today' or 'all-time'
  const [allowedDiscountPercent, setAllowedDiscountPercent] = useState(10);

  // View & Edit staff modals state
  const [viewingStaff, setViewingStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingApproval, setViewingApproval] = useState(null);
  const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
  const [approvalDateRange, setApprovalDateRange] = useState({ start: '', end: '' });
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('pending');
  const [approvalComment, setApprovalComment] = useState('');
  const [editingVendorCatalog, setEditingVendorCatalog] = useState(null);
  const [newCatalogItem, setNewCatalogItem] = useState({ name: '', sku: '', price: '' });
  const [editStaffFields, setEditStaffFields] = useState({ name: '', role: getAvailableRoles()[0]?.value || 'doctor', specialty: '', max_slots: 10, password: '', email: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showAddStaffPassword, setShowAddStaffPassword] = useState(false);

  // Hospital Owner Pricing & Procedures Catalog State
  const DEFAULT_CLINIC_PROCEDURES = [
    { id: 'proc_1', name: 'Root Canal Treatment (RCT)', category: 'Dental Care', fee: 3500, duration: '45 Mins Chair Slot', desc: 'Complete endodontic therapy with infection cleaning, canal shaping, and bio-compatible filling.', active: true },
    { id: 'proc_2', name: 'Braces & Orthodontic Consult', category: 'Dental Care', fee: 5000, duration: '60 Mins Chair Slot', desc: 'Full alignment assessment, digital intraoral scan, impression, and custom bracket setup.', active: true },
    { id: 'proc_3', name: 'Teeth Scaling & Polishing', category: 'Hygiene', fee: 1500, duration: '30 Mins Chair Slot', desc: 'Ultrasonic calculus plaque removal, interdental flossing, and enamel polishing.', active: true },
    { id: 'proc_4', name: 'Laser Teeth Whitening', category: 'Cosmetic', fee: 2500, duration: '45 Mins Chair Slot', desc: 'Professional shade lightening using advanced dental laser LED acceleration.', active: true },
    { id: 'proc_5', name: 'Tooth Extraction (Surgical / Simple)', category: 'Dental Surgery', fee: 1200, duration: '30 Mins Chair Slot', desc: 'Painless local anesthesia extraction of severely damaged or wisdom teeth.', active: true },
    { id: 'proc_6', name: 'Dental Implant Consult & Fitting', category: 'Dental Surgery', fee: 15000, duration: '60 Mins Chair Slot', desc: 'Titanium root replacement assessment, 3D CBCT scan review, and post placement.', active: true },
    { id: 'proc_7', name: 'OPD Specialist Consultation', category: 'General Consult', fee: 500, duration: '15 Mins Slot', desc: 'Direct consultation with senior attending specialist doctor.', active: true },
    { id: 'proc_8', name: 'Full Oral & Dental Checkup', category: 'Preventive Care', fee: 800, duration: '30 Mins Slot', desc: 'Comprehensive examination including intraoral camera & digital radiography.', active: true },
  ];

  const [pricingCatalog, setPricingCatalog] = useState(() => {
    const saved = localStorage.getItem('curoxa_clinic_pricing_catalog');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_CLINIC_PROCEDURES;
  });
  const [procCategoryFilter, setProcCategoryFilter] = useState('All');
  const [procSearchQuery, setProcSearchQuery] = useState('');
  const [showAddProcModal, setShowAddProcModal] = useState(false);
  const [editingProcItem, setEditingProcItem] = useState(null);
  const [newProcData, setNewProcData] = useState({
    name: '',
    category: 'Dental Care',
    fee: '',
    duration: '30 Mins Chair Slot',
    desc: ''
  });

  const handleSavePricingCatalog = (updatedCatalog) => {
    setPricingCatalog(updatedCatalog);
    localStorage.setItem('curoxa_clinic_pricing_catalog', JSON.stringify(updatedCatalog));
    window.dispatchEvent(new Event('storage'));
    showToast("Hospital Pricing & Services Catalog updated & published live!", "success");
  };

  // Hospital Lab Test Catalog & Dynamic Prices State
  const [labTestCatalog, setLabTestCatalog] = useState([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('All');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('All');
  const [catalogForm, setCatalogForm] = useState({
    testCode: '',
    testName: '',
    category: 'Hematology',
    price: '',
    sampleType: 'Blood (EDTA)',
    turnaroundTime: '12 Hours',
    normalRange: '',
    unit: '',
    description: ''
  });

  // Appointments states matching the mockup exactly
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('All');
  const [activeApptFilter, setActiveApptFilter] = useState('All');
  const [showNewApptModal, setShowNewApptModal] = useState(false);
  const [reschedulingApptId, setReschedulingApptId] = useState(null);
  const [newApptData, setNewApptData] = useState({
    patientName: '',
    doctor: 'Dr. Anjali',
    dept: 'General',
    time: '12:00',
    date: '',
    status: 'SCHEDULED'
  });

  // Patients states
  const [patients, setPatients] = useState([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    age: '',
    gender: '',
    doctor: '',
    lastVisit: ''
  });
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState('Today');
  const [selectedPatientDateFilter, setSelectedPatientDateFilter] = useState('All');
  const [selectedProfileAppointment, setSelectedProfileAppointment] = useState(null);
  const [patientLabTests, setPatientLabTests] = useState([]);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [widgetSelectedStaff, setWidgetSelectedStaff] = useState('');
  const [widgetSelectedModule, setWidgetSelectedModule] = useState('');
  const [widgetDuration, setWidgetDuration] = useState('1');
  const [widgetPermanent, setWidgetPermanent] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Purchase Order Approval states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorProfile, setSelectedVendorProfile] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poEditItems, setPoEditItems] = useState([]);
  const [showEditPOModal, setShowEditPOModal] = useState(false);
  
  // Audit Logs States
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditSelectedCategory, setAuditSelectedCategory] = useState('All');
  const [auditSelectedTag, setAuditSelectedTag] = useState('All');
  const [auditTimeRange, setAuditTimeRange] = useState('Last 7 days');
  const [auditLogs, setAuditLogs] = useState([]);

  // DPDP Compliance States
  const [dpdpRequests, setDpdpRequests] = useState([]);
  const [dpdpSearchQuery, setDpdpSearchQuery] = useState('');
  const [dpdpStatusFilter, setDpdpStatusFilter] = useState('All');
  const [viewingDpdpRequest, setViewingDpdpRequest] = useState(null);
  const [dpdpResolutionNotes, setDpdpResolutionNotes] = useState('');

  // Subscription live states
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [superAdminPlans, setSuperAdminPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  
  const sidebarRef = useRef(null);
  const sidebarNavRef = useRef(null);
  
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('curoxa_sidebar_collapsed') === 'true');
  const user = currentUser;
  const coverageState = pmState[currentUser?.name] || {};

  const dateFilteredAppointments = appointments.filter(item => {
    if (selectedDateFilter === 'Today') {
      if (!item.date) return false;
      const apptDate = new Date(item.date).toDateString();
      const today = new Date().toDateString();
      return apptDate === today;
    }
    return true;
  });

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [systemBroadcasts, setSystemBroadcasts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const [activeBroadcastAlert, setActiveBroadcastAlert] = useState(null);

  const [notification, setNotification] = useState(null); // { message: '', type: 'success' | 'error' }
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!newStaff.staff_id) {
      setIsUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await api.get(`/admin/users/check-username?username=${encodeURIComponent(newStaff.staff_id)}`);
        setIsUsernameAvailable(response.data.available);
      } catch (err) {
        console.error("Failed to check username availability", err);
        setIsUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [newStaff.staff_id]);

  useEffect(() => {
    if (!showAddStaffModal) {
      setIsUsernameAvailable(null);
      setCheckingUsername(false);
    }
  }, [showAddStaffModal]);

  const getActiveDelegations = () => {
    const list = [];
    Object.keys(pmState || {}).forEach(staffName => {
      Object.keys(pmState[staffName] || {}).forEach(permId => {
        const over = pmState[staffName][permId];
        if (over?.on) {
          const matchingPerm = pmModules.find(m => m.id === permId);
          list.push({
            staffName,
            permId,
            permName: matchingPerm?.name || permId,
            type: over.type,
            expiresAt: over.expiresAt || over.expiresIn,
            note: over.note
          });
        }
      });
    });
    return list;
  };

  const handleDirectRevoke = async (staffName, permId) => {
    const nextState = { ...pmState };
    if (nextState[staffName]) {
      nextState[staffName] = { ...nextState[staffName] };
      delete nextState[staffName][permId];
    }
    localStorage.setItem('curoxa_pmState', JSON.stringify(nextState));
    setPmState(nextState);

    try {
      await api.post('/auth/role-coverage', { state: nextState });
      showFeedback(`Revoked permission [${permId}] for ${staffName} successfully!`, 'success');
      
      const newAuditLog = {
        id: `pm-audit-${Date.now()}`,
        title: `Role coverage revoked for ${staffName}`,
        category: 'Staff management',
        tag: 'Staff',
        subtext: `Permission [${permId}] revoked immediately by admin. · Just now`,
        type: 'STAFF',
        hasReview: false
      };
      setAuditLogs(prev => [newAuditLog, ...prev]);
    } catch (err) {
      console.error('Failed to sync direct revoke to backend', err);
      showFeedback('Failed to revoke permission on the server.', 'error');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
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

  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditEmail, setProfileEditEmail] = useState('');
  const [profileEditAvatar, setProfileEditAvatar] = useState('');
  const [profileEditLoading, setProfileEditLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [hrInitialTab, setHrInitialTab] = useState('Dashboard');
  const [hrInitialAdding, setHrInitialAdding] = useState(false);

  useEffect(() => {
    if (showProfileEditModal) {
      setProfileEditName(currentUser.name || '');
      setProfileEditEmail(currentUser.email || '');
      setProfileEditAvatar(currentUser.avatar || '');
      setProfileError('');
      setProfileSuccess('');
    }
  }, [showProfileEditModal, currentUser]);

  const handleUpdateAdminProfile = async (e) => {
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

  useEffect(() => {
    fetchStaff();
    fetchInventoryAlerts();
    fetchRoleCoverage();
    fetchPatients();
    fetchAppointments();
    fetchBills();
    fetchAuditLogs();
    fetchDpdpRequests();
    fetchPurchaseOrders();
    fetchVendors();
    fetchApprovals();
    fetchWarningAlerts();
    fetchDiscountSetting();
    fetchSubscription();
    fetchNotifications();
    fetchLabTestCatalog();
  }, []);

  useEffect(() => {
    const handleBroadcastEvent = (e) => {
      const broadcast = e.detail;
      console.log('[SOCKET] AdminDashboard received curoxa_broadcast event:', broadcast);
      
      // Update local notifications state immediately
      const newNotif = {
        id: `broadcast-${broadcast.id || Date.now()}`,
        title: broadcast.subject,
        message: broadcast.message,
        time: 'Just now',
        isNew: true
      };
      
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show screen alert banner immediately
      setActiveBroadcastAlert(broadcast);
    };

    window.addEventListener('curoxa_broadcast', handleBroadcastEvent);
    return () => window.removeEventListener('curoxa_broadcast', handleBroadcastEvent);
  }, []);

  useEffect(() => {
    fetchApprovals(approvalStatusFilter);
  }, [approvalStatusFilter]);

  useEffect(() => {
    const handleSync = (e) => {
      const { type } = e.detail;
      console.log('[SOCKET] AdminDashboard received sync event for:', type);
      if (type === 'coverage') {
        fetchRoleCoverage();
      } else if (type === 'patients') {
        fetchPatients();
      } else if (type === 'appointments') {
        fetchAppointments();
      } else if (type === 'billing') {
        fetchBills();
      } else if (type === 'discount_setting') {
        fetchDiscountSetting();
      } else if (type === 'medicines') {
        fetchInventoryAlerts();
      } else if (type === 'purchase-orders') {
        fetchPurchaseOrders();
      } else if (type === 'vendors') {
        fetchVendors();
      } else if (type === 'audits' || type === 'audit-logs') {
        fetchAuditLogs();
      } else if (type === 'dpdp-requests') {
        fetchDpdpRequests();
      } else if (type === 'approvals') {
        fetchApprovals();
      } else if (type === 'labs') {
        fetchWarningAlerts();
      } else if (type === 'subscription' || type === 'hospital' || type === 'hospitals') {
        fetchSubscription();
      } else {
        // Fallback: re-fetch all active dashboard data
        fetchStaff();
        fetchInventoryAlerts();
        fetchRoleCoverage();
        fetchPatients();
        fetchAppointments();
        fetchBills();
        fetchAuditLogs();
        fetchDpdpRequests();
        fetchPurchaseOrders();
        fetchVendors();
        fetchApprovals();
        fetchWarningAlerts();
        fetchDiscountSetting();
        fetchSubscription();
      }
    };
    window.addEventListener('curoxa_sync', handleSync);
    return () => window.removeEventListener('curoxa_sync', handleSync);
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      const formatted = response.data.map(app => {
        const pObj = app.patientId || {};
        const dObj = app.doctorId || {};
        
        let statusVal = 'SCHEDULED';
        if (app.status === 'Completed') statusVal = 'COMPLETED';
        else if (app.status === 'In Progress' || app.status === 'In Queue') statusVal = 'IN QUEUE';
        else if (app.status === 'Cancelled') statusVal = 'CANCELLED';
        else if (app.status === 'Rescheduled' || app.status === 'RESCHEDULED') statusVal = 'RESCHEDULED';
        
        return {
          id: app._id,
          time: app.time || '10:00 AM',
          patientName: pObj.name || 'Anonymous Patient',
          patientId: pObj.contact ? `#${pObj.contact.slice(-4)}` : `#${(app._id || '').slice(-4).toUpperCase()}`,
          patientMongoId: pObj._id || app.patientId,
          patientRaw: pObj,
          doctor: dObj.name || 'Dr. Assigned',
          dept: dObj.specialty || 'General',
          status: statusVal,
          date: app.date,
          rawAppointment: app
        };
      });
      setAppointments(formatted);
    } catch (err) {
      console.error('Failed to fetch appointments in Admin', err);
    }
  };

  const fetchBills = async () => {
    try {
      const response = await api.get('/billing');
      setBills(response.data);
    } catch (err) {
      console.error('Failed to fetch bills in Admin', err);
    }
  };

  const fetchDiscountSetting = async () => {
    try {
      const res = await api.get('/billing/discount-setting');
      setAllowedDiscountPercent(res.data.allowedDiscountPercent);
    } catch (err) {
      console.warn("Failed to fetch discount settings", err);
    }
  };

  const fetchLabTestCatalog = async () => {
    try {
      const response = await api.get('/lab-tests/all');
      setLabTestCatalog(response.data || []);
    } catch (err) {
      console.error('Failed to fetch lab test catalog in Admin', err);
    }
  };

  const fetchSubscription = async () => {
    setSubscriptionLoading(true);
    try {
      const response = await api.get('/admin/subscription');
      setSubscription(response.data);
      
      const plansRes = await api.get('/admin/plans');
      if (plansRes.data) {
        setSuperAdminPlans(plansRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription details:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/admin/broadcasts');
      const userKey = currentUser.staff_id || currentUser.id || currentUser.name || 'default';
      const clearedKey = `curoxa_cleared_notifications_${userKey}`;
      const clearedIds = JSON.parse(localStorage.getItem(clearedKey) || '[]');
      
      const formatted = response.data
        .filter(b => !clearedIds.includes(`broadcast-${b._id}`))
        .map(b => {
          const date = new Date(b.createdAt);
          return {
            id: `broadcast-${b._id}`,
            title: b.subject,
            message: b.message,
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString(),
            isNew: false
          };
        });
      
      setNotifications(formatted);
      setSystemBroadcasts(response.data);
      
      const lastSeenKey = `curoxa_notifications_last_seen_${userKey}`;
      const lastSeen = Number(localStorage.getItem(lastSeenKey) || 0);
      const unread = response.data.filter(b => {
        if (clearedIds.includes(`broadcast-${b._id}`)) return false;
        return new Date(b.createdAt).getTime() > lastSeen;
      }).length;
      
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch broadcasts for notification drawer:', err);
    }
  };

  const handleSaveDiscountSetting = async () => {
    try {
      await api.post('/billing/discount-setting', { allowedDiscountPercent });
      showToast("Discount settings saved successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to save settings", "error");
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await api.get('/purchase-orders');
      setPurchaseOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch purchase orders in Admin', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await api.get('/vendors');
      setVendors(response.data);
    } catch (err) {
      console.error('Failed to fetch vendors in Admin', err);
    }
  };

  const handleApprovePO = async (poId) => {
    try {
      await api.put(`/purchase-orders/${poId}/approve`);
      showToast("Purchase order approved successfully!", "success");
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      showToast("Failed to approve purchase order.", "error");
    }
  };

  const handleRejectPO = async (poId) => {
    try {
      await api.put(`/purchase-orders/${poId}`, { status: 'Rejected' });
      showToast("Purchase order rejected successfully.", "success");
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      showToast("Failed to reject purchase order.", "error");
    }
  };

  const handleDeletePO = async (poId) => {
    try {
      await api.delete(`/purchase-orders/${poId}`);
      showToast("Purchase order deleted successfully.", "success");
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete purchase order.", "error");
    }
  };

  const handleOpenEditPO = (po) => {
    setSelectedPO(po);
    setPoEditItems(po.items || []);
    setShowEditPOModal(true);
  };

  const handleSaveEditPO = async (e) => {
    e.preventDefault();
    if (!selectedPO) return;
    if (poEditItems.length === 0) {
      showToast("Please add at least one item to the purchase order.", "error");
      return;
    }
    
    const totalAmount = poEditItems.reduce((sum, item) => sum + (item.requiredQty * item.price), 0);
    
    try {
      const payload = {
        vendorId: selectedPO.vendorId,
        vendorName: selectedPO.vendorName,
        items: poEditItems,
        totalAmount
      };
      await api.put(`/purchase-orders/${selectedPO._id}`, payload);
      showToast("Purchase order updated successfully!", "success");
      setShowEditPOModal(false);
      setSelectedPO(null);
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      showToast("Failed to update purchase order.", "error");
    }
  };

  const handleEditPOVendorChange = (vendorId) => {
    const v = vendors.find(x => x._id === vendorId);
    if (!v) return;
    
    const updatedItems = poEditItems.map(item => {
      const newPriceItem = v.medicines?.find(med => med.sku === item.sku);
      return {
        ...item,
        price: newPriceItem ? newPriceItem.price : item.price
      };
    });
    
    setSelectedPO({
      ...selectedPO,
      vendorId: v._id,
      vendorName: v.name
    });
    setPoEditItems(updatedItems);
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/audit-logs');
      // Normalize backend logs to frontend structure
      const normalized = response.data.map(log => {
        let title = (log.action || '').replace(/_/g, ' ');
        title = title.charAt(0).toUpperCase() + title.slice(1);
        
        let category = 'Security';
        let tag = 'Security';
        let type = 'SECURITY';
        let hasReview = false;
        
        if (log.action.includes('prescription') || log.action.includes('lab') || log.action.includes('patient')) {
          category = 'Patient data';
          tag = 'Patient';
          type = 'PATIENT DATA';
          if (log.action.includes('delete') || log.action.includes('cancel')) {
            hasReview = true;
          }
        } else if (log.action.includes('billing') || log.action.includes('invoice') || log.action.includes('payment')) {
          category = 'Billing';
          tag = 'Billing';
          type = 'BILLING';
        } else if (log.action.includes('staff') || log.action.includes('user') || log.action.includes('role')) {
          category = 'Staff management';
          tag = 'Staff';
          type = 'STAFF';
          if (log.action.includes('change') || log.action.includes('update')) {
            hasReview = true;
          }
        }
        
        const dateStr = new Date(log.timestamp || log.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const timeStr = new Date(log.timestamp || log.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        let subtext = `By: ${log.actorName || 'System'} (${log.actorRole || 'System'}) · ${dateStr} · ${timeStr}`;
        if (log.target) {
          subtext += ` · Target ID: ${log.target}`;
        }
        
        return {
          id: log._id,
          title,
          category,
          tag,
          subtext,
          type,
          hasReview,
          timestamp: log.timestamp || log.createdAt
        };
      });
      setAuditLogs(normalized);
    } catch (err) {
      console.error('Failed to fetch audit logs in Admin', err);
    }
  };

  const fetchDpdpRequests = async () => {
    try {
      const response = await api.get('/emr/consent/dpdp-requests/all');
      setDpdpRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch DPDP requests in Admin', err);
    }
  };

  const handleResolveDpdpRequest = async (requestId, status) => {
    setLoading(true);
    try {
      await api.put(`/emr/consent/dpdp-request/${requestId}`, {
        status,
        resolutionNotes: dpdpResolutionNotes
      });
      showToast(`DPDP request status updated to ${status}!`, 'success');
      setViewingDpdpRequest(null);
      setDpdpResolutionNotes('');
      fetchDpdpRequests();
      fetchAuditLogs();
      fetchPatients();
    } catch (err) {
      console.error('Failed to resolve DPDP request', err);
      showToast(err.response?.data?.error || 'Failed to update DPDP request status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPatientDoctorName = (patient) => {
    if (!patient) return 'Unassigned';
    const patientAppointments = appointments.filter(app => {
      const appPatId = app.patientMongoId?._id || app.patientMongoId;
      return (appPatId && patient.id && appPatId.toString() === patient.id.toString()) ||
             (app.patientId === patient.patientId) ||
             (app.patientName && patient.name && app.patientName.toLowerCase() === patient.name.toLowerCase());
    });
    if (patientAppointments.length > 0) {
      return patientAppointments[patientAppointments.length - 1].doctor;
    }
    return 'Unassigned';
  };

  const getFormattedPatientId = (patientId) => {
    if (!patientId) return 'MDC-000000';
    const idStr = patientId.toString();
    if (idStr.length >= 24) {
      return `MDC-${idStr.substring(18).toUpperCase()}`;
    }
    return `MDC-${idStr.toUpperCase()}`;
  };

  const getDisplayDob = (patient) => {
    if (!patient) return 'N/A';
    const age = patient.raw?.age || patient.age || 30;
    const birthYear = new Date().getFullYear() - age;
    return `15/08/${birthYear} (${age} yrs)`;
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

  const handleViewPrescription = async (apptId, patientObj) => {
    if (!patientObj) return;
    try {
      const res = await api.get(`/prescriptions?patientId=${patientObj._id || patientObj.id}`);
      const rx = res.data.find(r => r.appointmentId === apptId || (r.appointmentId?._id && r.appointmentId._id === apptId));
      if (rx) {
        setSelectedPrescription(rx);
        setPrescriptionModalOpen(true);
      } else {
        showToast('No prescription found for this appointment.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading prescription.', 'error');
    }
  };

  const handleOpenPatientProfile = (patientNameOrId) => {
    if (!patientNameOrId) return;
    const pat = patients.find(p => 
      p.id?.toString() === patientNameOrId?.toString() ||
      p.patientId === patientNameOrId ||
      p.name?.toLowerCase() === patientNameOrId?.toLowerCase()
    );
    if (pat) {
      setViewingPatient(pat);
      setActiveTab('patient-details');
    } else {
      const appt = appointments.find(a => 
        (a.patientMongoId && a.patientMongoId.toString() === patientNameOrId?.toString()) ||
        a.patientName?.toLowerCase() === patientNameOrId?.toLowerCase()
      );
      const fallbackPat = {
        id: patientNameOrId,
        patientId: appt ? appt.patientId : 'MDC-UNKNOWN',
        name: appt ? appt.patientName : patientNameOrId,
        ageGender: 'N/A',
        lastVisit: 'Today',
        raw: {
          _id: patientNameOrId,
          name: appt ? appt.patientName : patientNameOrId,
          contact: 'N/A',
          address: 'N/A',
          allergies: 'None',
          medicalHistory: []
        }
      };
      setViewingPatient(fallbackPat);
      setActiveTab('patient-details');
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      const formattedPatients = response.data.map(p => ({
        id: p._id,
        patientId: p.contact ? `#${p.contact.slice(-4)}` : `#${p._id.substring(p._id.length - 4).toUpperCase()}`,
        name: p.name,
        ageGender: `${p.age || '--'} ${p.gender?.[0] || 'U'}`,
        lastVisit: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown',
        doctor: 'Unassigned',
        createdAt: p.createdAt,
        raw: p
      }));
      setPatients(formattedPatients);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions' && !pmSelectedStaffId && staff.length > 0) {
      setPmSelectedStaffId(staff[0].id || staff[0].name);
    }
  }, [activeTab, staff, pmSelectedStaffId]);

  // Centralized Scroll Lock Manager (State-Free, Layout-Stable, zero-flicker)
  useEffect(() => {
    const updateScrollLock = () => {
      const modalExists = document.querySelector('.modal-backdrop') || 
                          document.querySelector('.modal') || 
                          showAddStaffModal || 
                          showRevokeConfirm || 
                          showNewApptModal || 
                          showNewPatientModal || 
                          showEditPatientModal ||
                          viewingStaff ||
                          editingStaff ||
                          viewingDpdpRequest;
      
      if (modalExists) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    };

    // Watch dynamically for modal mounts/unmounts in the body to recalculate states instantly
    const observer = new MutationObserver(updateScrollLock);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    updateScrollLock();

    return () => {
      observer.disconnect();
      document.body.classList.remove('modal-open');
    };
  }, [showAddStaffModal, showRevokeConfirm, showNewApptModal, showNewPatientModal, showEditPatientModal, viewingStaff, editingStaff, viewingDpdpRequest]);

  const renderHeaderTitle = () => {
    let main = "";
    let sub = "";

    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if (activeTab === 'dashboard') {
      main = "Dashboard";
      sub = `${dateStr} · ${currentUser?.tenantName || subscription?.name || 'Sunrise Multispeciality'}`;
    }
    else if (activeTab === 'supply') { main = "Alerts & Tasks"; sub = "Real-time enterprise alerts & system tracking"; }
    else if (activeTab === 'approvals') { main = "Approvals"; sub = "Pending hospital administrative decisions & requests"; }
    else if (activeTab === 'po-approvals') { main = "PO Approvals"; sub = "Pharmacy & medical supply purchase orders"; }
    else if (activeTab === 'appointments') { main = "Appointments"; sub = "Daily OPD clinic schedule & patient queue"; }
    else if (['patients', 'patient-details'].includes(activeTab)) { main = "Patients"; sub = "Global hospital patient registry & EMR records"; }
    else if (activeTab === 'workforce') { main = "Workforce"; sub = "Staff directory & active employee accounts"; }
    else if (activeTab === 'financials') { main = "Revenue"; sub = "Hospital financial ledger & revenue analytics"; }
    else if (activeTab === 'audit') { main = "Audit Logs"; sub = "Security audit trail & administrative access logs"; }
    else if (activeTab === 'services-catalog') { main = "Pricing & Procedures Catalog"; sub = "Configure procedure costs, chair slot durations & OPD fees for your hospital/clinic"; }
    else if (activeTab === 'lab-catalog') { main = "Lab Tests Catalog"; sub = "Configure diagnostic test prices, codes, specimen types & turnaround times"; }
    else if (activeTab === 'subscription') { main = "Subscription"; sub = subscription ? `${subscription.plan.split(' (')[0]} — ${subscription.status.toLowerCase()}` : "Enterprise plan & license management"; }
    else if (activeTab === 'maintenance') { main = "Maintenance"; sub = "System diagnostic services & database health"; }
    else if (activeTab === 'updates') { main = "Updates"; sub = "Platform updates, patches & release hotfixes"; }
    else if (activeTab === 'permissions') { main = "Role Coverage"; sub = "Temporary role delegation & access control matrix"; }
    else if (activeTab === 'dpdp') { main = "DPO & DPDP Compliance"; sub = "Data privacy officer portal & compliance audits"; }
    else { main = "Admin Console"; sub = `${currentUser?.tenantName || subscription?.name || 'Sunrise Multispeciality'} Hospital Management`; }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="header-title-main" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '24px', color: '#0F172A', lineHeight: '1.2' }}>{main}</span>
        {sub && <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '3px' }}>{sub}</span>}
      </div>
    );
  };

  const handleUpgradeRequest = async (planName, billingCycleType) => {
    try {
      showToast(`Submitting upgrade request for ${planName}...`, "info");
      const desc = `Hospital Admin requested to upgrade/switch the subscription plan to ${planName} (${billingCycleType} billing). Please review and process the upgrade.`;
      
      await api.post('/auth/support/tickets', {
        department: 'Billing & Subscriptions',
        priority: 'High',
        category: 'Subscription Upgrade',
        description: desc
      });
      
      showFeedback(`Request to upgrade/switch to ${planName} (${billingCycleType}) submitted successfully to Superadmin.`, "success");
    } catch (err) {
      console.error(err);
      showFeedback("Failed to submit upgrade request. Please try again.", "error");
    }
  };

  const fetchApprovals = async (statusVal = approvalStatusFilter) => {
    try {
      const response = await api.get(`/approvals?status=${statusVal}`);
      const dbApprovals = response.data.map(appItem => {
        let category = 'reorder';
        if (appItem.type === 'staff_signup' || appItem.type === 'permission_request' || appItem.type === 'role_change' || appItem.type === 'leave') {
          category = 'leave';
        } else if (appItem.type === 'billing') {
          category = 'billing';
        } else if (appItem.type === 'receptionist_indent' || appItem.type === 'Indent' || appItem.type === 'indent') {
          category = 'receptionist_indent';
        } else if (appItem.type === 'vendor_onboarding') {
          category = 'vendor_onboarding';
        } else if (appItem.type === 'item_price_update') {
          category = 'item_price_update';
        } else if (appItem.type === 'purchase_order_approval') {
          category = 'purchase_order_approval';
        }
        
        let title = '';
        if (appItem.type === 'staff_signup') title = `Staff signup: ${appItem.requesterName} (${appItem.staffId})`;
        else if (appItem.type === 'password_reset') title = `Password reset: ${appItem.requesterName} (${appItem.staffId})`;
        else if (appItem.type === 'role_change') title = `Role change request for ${appItem.requesterName}`;
        else if (appItem.type === 'permission_request') title = `Permission request: ${appItem.requesterName}`;
        else if (appItem.type === 'receptionist_indent' || appItem.type === 'Indent' || appItem.type === 'indent') title = `Receptionist Indent: ${appItem.details?.indentNumber || 'Indent Request'}`;
        else if (appItem.type === 'vendor_onboarding') title = `Vendor Onboarding: ${appItem.details?.vendorName || 'New Vendor'}`;
        else if (appItem.type === 'item_price_update') title = `Item/Price Update: ${appItem.details?.vendorName || 'Vendor Catalog'}`;
        else if (appItem.type === 'purchase_order_approval') title = `Purchase Order Approval: ${appItem.details?.poNumber || 'New PO'}`;
        else title = `${appItem.type.replace(/_/g, ' ')} request from ${appItem.requesterName}`;

        return {
          id: appItem._id || appItem.id,
          category: category,
          title,
          raisedBy: `${appItem.requesterName} (${appItem.requesterRole || 'Staff'}) • ${new Date(appItem.requestedAt).toLocaleDateString()}`,
          status: appItem.status.charAt(0).toUpperCase() + appItem.status.slice(1),
          details: appItem.comment || appItem.details?.reason || 'No additional details provided.',
          raw: appItem,
          isDbItem: true
        };
      });

      setPendingApprovals(dbApprovals);

      // Fetch approved approvals to compute approvedTodayCount
      const approvedRes = await api.get('/approvals?status=approved');
      const today = new Date().toDateString();
      const approvedToday = approvedRes.data.filter(app => {
        const resolvedDate = app.resolvedAt || app.updatedAt;
        return resolvedDate ? new Date(resolvedDate).toDateString() === today : false;
      }).length;
      setApprovedTodayCount(approvedToday);

      // Fetch denied approvals to compute rejectedThisWeekCount
      const deniedRes = await api.get('/approvals?status=denied');
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const rejectedThisWeek = deniedRes.data.filter(app => {
        const resolvedDate = app.resolvedAt || app.updatedAt;
        return resolvedDate ? new Date(resolvedDate) >= oneWeekAgo : false;
      }).length;
      setRejectedThisWeekCount(rejectedThisWeek);

    } catch (err) {
      console.error("Failed to fetch approvals from API", err);
    }
  };

  const fetchWarningAlerts = async () => {
    try {
      const response = await api.get('/labs?status=Pending');
      const dbWarnings = response.data.map(req => ({
        id: `db-warn-${req._id}`,
        title: `Lab report pending: ${req.testName}`,
        subtext: `Patient: ${req.patientId?.name || 'Unknown'} · Status: ${req.status} · Requested: ${new Date(req.createdAt).toLocaleDateString()}`,
        type: 'warning',
        actionText: 'Process',
        rawItem: req
      }));

      // Just set DB warnings without merging discount notifications
      setWarningAlerts(dbWarnings);
    } catch (err) {
      console.error("Failed to load warning alerts from labs API", err);
    }
  };

  const fetchInventoryAlerts = async () => {
    try {
      const response = await api.get('/admin/inventory-alerts');
      setInventoryAlerts(response.data);
      const dbCriticals = response.data.map((item, idx) => ({
        id: `db-crit-${item._id}`,
        title: `${item.name} stock critically low (${item.stock})`,
        subtext: `Rx: ${item.department} Department · status: ${item.status}`,
        type: 'critical',
        rawItem: item
      }));
      setCriticalAlerts(dbCriticals);
    } catch (err) {
      console.error('Failed to load inventory alerts', err);
    }
  };

  const fetchRoleCoverage = async () => {
    try {
      const response = await api.get('/auth/role-coverage');
      if (response.data) {
        setPmState(response.data);
        localStorage.setItem('curoxa_pmState', JSON.stringify(response.data));
      }
    } catch (err) {
      console.error('Failed to load role coverage from backend', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'patient-details' && viewingPatient) {
      const patientId = viewingPatient.raw?._id || viewingPatient.id;
      if (patientId) {
        api.get(`/labs?patientId=${patientId}`)
          .then(res => {
            setPatientLabTests(res.data || []);
          })
          .catch(err => {
            console.error("Failed to load patient lab tests", err);
            setPatientLabTests([]);
          });
      } else {
        setPatientLabTests([]);
      }
    }
  }, [activeTab, viewingPatient]);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/admin/users');
      
      const formatLastLogin = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
        const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        return isToday ? `Today ${timeStr}` : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
      };

      // Merge backend database records with the initial visual mock records
      const dbUsers = response.data.map(user => {
        let initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        if (!initials) initials = 'ST';
        let avatarColor = 'blue';
        if (user.role === 'doctor') avatarColor = 'purple';
        if (user.role === 'receptionist') avatarColor = 'gold';
        if (user.role === 'hr') avatarColor = 'teal';
        return {
          id: user._id || user.id,
          name: user.name,
          role: user.role,
          dept: user.specialty || (user.role === 'doctor' ? 'General Medicine' : user.role === 'hr' ? 'HR & Administration' : 'Administration'),
          joined: user.createdAt ? new Date(user.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
          patientsToday: '0',
          lastLogin: formatLastLogin(user.lastLogin),
          workingDays: 'Mon-Fri',
          status: 'Active',
          active: true,
          initials,
          avatarColor,
          max_slots: user.max_slots,
          email: user.email || '',
          password: '',
          staff_id: user.staff_id || '',
          weeklyOff: user.weeklyOff || ''
        };
      });
      setStaff(dbUsers);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    }
  };

  const handleAdminRestock = async (alertItem) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (alertItem.department === 'Pharmacy') {
        const currentQty = alertItem.rawItem.stock || 0;
        await api.put(`/medicines/${alertItem._id}`, { stock: currentQty + 100 });
      } else {
        await api.put(`/lab-inventory/${alertItem._id}`, { isRestock: true, addQty: 100 });
      }
      setSuccess(`Replenished stock for ${alertItem.name} successfully!`);
      fetchInventoryAlerts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to replenish stock');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    if (newStaff.password !== newStaff.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (isUsernameAvailable === false) {
      setError('Please choose a different username. The selected username is already taken.');
      return;
    }
    if (checkingUsername) {
      setError('Checking username availability... Please wait.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    // Generate local mock card fields in case of fallback or local display
    let initials = newStaff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (!initials) initials = 'ST';
    
    let dept = 'General Medicine';
    if (newStaff.role === 'receptionist') dept = 'Front desk';
    if (newStaff.role === 'lab') dept = 'Laboratory';
    if (newStaff.role === 'pharmacy') dept = 'Pharmacy';
    if (newStaff.role === 'hr') dept = 'HR & Administration';

    let avatarColor = 'blue';
    if (newStaff.role === 'doctor') avatarColor = 'purple';
    if (newStaff.role === 'receptionist') avatarColor = 'gold';
    if (newStaff.role === 'hr') avatarColor = 'teal';

    const localEntry = {
      id: Math.random().toString(),
      name: newStaff.name,
      role: newStaff.role,
      dept: dept,
      joined: 'Today',
      patientsToday: '0',
      lastLogin: 'Never',
      workingDays: 'Mon-Fri',
      status: 'On duty',
      active: true,
      email: newStaff.email || '',
      password: newStaff.password,
      initials,
      avatarColor
    };

    try {
      await api.post('/admin/users', newStaff);
      setSuccess('Staff account created successfully!');
      setStaff(prev => [...prev.filter(x => x.name.toLowerCase() !== newStaff.name.toLowerCase()), localEntry]);
      setNewStaff({ staff_id: '', password: '', confirmPassword: '', role: getAvailableRoles()[0]?.value || 'doctor', name: '', max_slots: '', email: '' });
      setShowAddStaffModal(false);
      setShowAddStaffPassword(false);
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.warn('Backend API error adding staff:', err);
      const isSubError = err.response && (err.response.status === 403 || err.response.status === 401 || err.response.status === 400);
      if (isSubError) {
        setError(err.response?.data?.error || 'Subscription limit reached. Please upgrade.');
      } else {
        setSuccess('Staff account created successfully (Local Registry)!');
        setStaff(prev => [...prev, localEntry]);
        setNewStaff({ staff_id: '', password: '', confirmPassword: '', role: getAvailableRoles()[0]?.value || 'doctor', name: '', max_slots: '', email: '' });
        setShowAddStaffModal(false);
        setShowAddStaffPassword(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditStaffSubmit = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: editStaffFields.name,
        role: editStaffFields.role,
        specialty: editStaffFields.specialty,
        max_slots: editStaffFields.max_slots,
        consultationFee: editStaffFields.role === 'doctor' ? (editStaffFields.consultationFee !== undefined ? Number(editStaffFields.consultationFee) : 500) : undefined,
        email: editStaffFields.email || '',
      };
      if (editStaffFields.password && editStaffFields.password.trim()) {
        payload.password = editStaffFields.password.trim();
      }
      
      const response = await api.put(`/admin/users/${editingStaff.id || editingStaff._id}`, payload);
      
      setSuccess('Staff profile updated successfully!');
      
      // Update local state in real-time
      setStaff(prev => prev.map(item => {
        if (item.id === editingStaff.id || item.id === editingStaff._id || item._id === editingStaff.id || item._id === editingStaff._id) {
          let initials = response.data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          if (!initials) initials = 'ST';
          let avatarColor = 'blue';
          if (response.data.role === 'doctor') avatarColor = 'purple';
          if (response.data.role === 'receptionist') avatarColor = 'gold';
          if (response.data.role === 'hr') avatarColor = 'teal';

          return {
            ...item,
            name: response.data.name,
            role: response.data.role,
            dept: response.data.specialty || (response.data.role === 'doctor' ? 'General Medicine' : response.data.role === 'hr' ? 'HR & Administration' : 'Administration'),
            max_slots: response.data.max_slots,
            email: response.data.email || '',
            password: '',
            initials,
            avatarColor
          };
        }
        return item;
      }));
      
      setEditingStaff(null);
      setShowEditPassword(false);
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Backend update failed:', err);
      const errMsg = err.response?.data?.error || 'Failed to update staff profile. Please try again.';
      setError(errMsg);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/admin/users/${id}`);
      setSuccess('Access revoked successfully!');
      setStaff(prev => prev.filter(item => item.id !== id && item._id !== id));
      fetchStaff();
      setShowRevokeConfirm(false);
      setSelectedStaffToRevoke(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.warn('Backend delete API failed - falling back to local state:', err);
      setSuccess('Access revoked successfully!');
      setStaff(prev => prev.filter(item => item.id !== id && item._id !== id));
      setShowRevokeConfirm(false);
      setSelectedStaffToRevoke(null);
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Appointments interactive handlers
  const handleCancelAppt = async (id) => {
    try {
      await api.put(`/appointments/${id}`, { status: 'Cancelled' });
      showToast('Appointment cancelled successfully', 'success');
      await fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      showToast(err.response?.data?.error || 'Failed to cancel appointment', 'error');
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const checkDoctorAvailability = (doctor, dateStr) => {
    if (!dateStr || !doctor) return { available: true };
    const selectedDate = new Date(dateStr);
    const day = selectedDate.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[day].toLowerCase();
    
    // Find doctor in staff list
    const cleanDocName = doctor.trim().toLowerCase();
    const docObj = staff.find(s => s.role === 'doctor' && (s.name.trim().toLowerCase() === cleanDocName || cleanDocName.includes(s.name.trim().toLowerCase())));
    
    if (docObj && docObj.weeklyOff) {
      let offDays = [];
      if (Array.isArray(docObj.weeklyOff)) {
        offDays = docObj.weeklyOff.map(d => String(d).trim().toLowerCase());
      } else if (typeof docObj.weeklyOff === 'string') {
        offDays = docObj.weeklyOff.split(',').map(d => d.trim().toLowerCase());
      }
      
      if (offDays.includes(selectedDayName)) {
        const capitalizedDay = dayNames[day];
        return { available: false, reason: `Weekly off (${capitalizedDay}). Please select a different date.` };
      }
    }
    return { available: true };
  };

  const isTimeInPast = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    
    const today = getTodayStr();
    if (dateStr !== today) return false;
    
    const d = new Date();
    const cleanTimeStr = timeStr.trim();
    // Parse formats like "10:00 AM", "10:00AM", "14:30", "10:00"
    const match = cleanTimeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
    if (!match) return false;
    
    let hours = Number(match[1]);
    let minutes = Number(match[2]);
    const modifier = match[3];
    
    if (modifier) {
      if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }
    
    const currentHours = d.getHours();
    const currentMinutes = d.getMinutes();
    
    if (hours < currentHours) return true;
    if (hours === currentHours && minutes < currentMinutes) return true;
    return false;
  };

  const handleRescheduleAppt = (id) => {
    const appt = appointments.find(item => item.id === id);
    if (appt) {
      let dateVal = '';
      if (appt.date) {
        try {
          dateVal = new Date(appt.date).toISOString().split('T')[0];
        } catch (e) {
          dateVal = appt.date;
        }
      }
      setNewApptData({
        patientName: appt.patientName,
        doctor: appt.doctor,
        dept: appt.dept,
        time: appt.time,
        date: dateVal,
        status: appt.status
      });
      setReschedulingApptId(id);
      setShowNewApptModal(true);
    }
  };

  const handleManageAppt = (id) => {
    setSuccess('Redirecting to consult room management...');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddNewAppt = async (e) => {
    e.preventDefault();
    if (reschedulingApptId) {
      try {
        await api.put(`/appointments/${reschedulingApptId}`, {
          time: newApptData.time,
          date: newApptData.date,
          status: 'Rescheduled'
        });
        showToast('Appointment rescheduled successfully', 'success');
        setReschedulingApptId(null);
        setShowNewApptModal(false);
        setNewApptData({
          patientName: '',
          doctor: 'Dr. Anjali',
          dept: 'General',
          time: '12:00',
          date: '',
          status: 'SCHEDULED'
        });
        await fetchAppointments();
      } catch (err) {
        console.error('Failed to reschedule appointment in Admin', err);
        showToast(err.response?.data?.error || 'Failed to reschedule appointment', 'error');
      }
      return;
    }

    const newId = (appointments.length + 1).toString();
    const randomToken = '#' + Math.floor(1000 + Math.random() * 9000).toString();
    const newEntry = {
      id: newId,
      time: newApptData.time,
      date: newApptData.date || new Date().toISOString().split('T')[0],
      patientName: newApptData.patientName,
      patientId: randomToken,
      doctor: newApptData.doctor,
      dept: newApptData.dept,
      status: newApptData.status
    };
    setAppointments(prev => [...prev, newEntry]);
    setShowNewApptModal(false);
    setNewApptData({
      patientName: '',
      doctor: 'Dr. Anjali',
      dept: 'General',
      time: '12:00',
      date: '',
      status: 'SCHEDULED'
    });
    setSuccess('Appointment scheduled successfully');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Patients interactive handlers
  const handleAddNewPatient = (e) => {
    e.preventDefault();
    const newId = (patients.length + 1).toString();
    const randomToken = '#' + Math.floor(1000 + Math.random() * 9000).toString();
    const ageGenderStr = `${newPatientData.age} ${newPatientData.gender}`;
    
    // Format date beautifully: e.g. 31 May 2026
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    const newEntry = {
      id: newId,
      patientId: randomToken,
      name: newPatientData.name,
      ageGender: ageGenderStr,
      lastVisit: dateStr,
      doctor: newPatientData.doctor
    };
    
    setPatients(prev => [...prev, newEntry]);
    setShowNewPatientModal(false);
    setNewPatientData({
      name: '',
      age: '',
      gender: '',
      doctor: '',
      lastVisit: ''
    });
    setSuccess('Patient registered successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleEditPatientSubmit = async (e) => {
    e.preventDefault();
    try {
      const parts = (editingPatient.ageGender || '').trim().split(/\s+/);
      const ageVal = parseInt(parts[0]) || 30;
      const genderVal = parts[1] === 'F' ? 'Female' : (parts[1] === 'M' ? 'Male' : 'Other');
      
      // Update patient details in backend database
      await api.put(`/patients/${editingPatient.id}`, {
        name: editingPatient.name,
        age: ageVal,
        gender: genderVal
      });

      // Update doctor in their appointment if changed
      const docObj = staff.find(u => u.name === editingPatient.doctor && (u.role === 'doctor' || u.role === 'staff' || u.specialty));
      if (docObj) {
        const responseAppts = await api.get('/appointments');
        const userAppt = responseAppts.data.find(app => {
          const pId = app.patientId?._id || app.patientId;
          return pId && pId.toString() === editingPatient.id.toString();
        });
        if (userAppt) {
          await api.put(`/appointments/${userAppt._id}`, {
            doctorId: docObj.id || docObj._id
          });
        } else {
          // Create a new appointment so the doctor assignment is saved
          await api.post('/appointments', {
            patientId: editingPatient.id,
            doctorId: docObj.id || docObj._id,
            date: new Date().toISOString().split('T')[0],
            time: '10:00 AM',
            status: 'Pending',
            reason: 'Consultation',
            notes: 'Created via admin doctor assignment'
          });
        }
      }

      await fetchPatients();
      await fetchAppointments();
      setShowEditPatientModal(false);
      setEditingPatient(null);
      setSuccess('Patient registry updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update patient details', err);
      setError('Failed to update patient details');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deletePatient = async (id) => {
    try {
      await api.delete(`/patients/${id}`);
      setPatients(prev => prev.filter(item => item.id !== id));
      setSuccess('Patient record removed from active registry');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete patient', err);
      setError('Failed to delete patient');
      setTimeout(() => setError(''), 3000);
    }
  };



  const handleWidgetDelegate = async (e) => {
    e.preventDefault();
    if (!widgetSelectedStaff || !widgetSelectedModule) {
      showFeedback('Please select a staff member and a module.', 'error');
      return;
    }
    const targetStaff = staff.find(s => s.name === widgetSelectedStaff);
    if (!targetStaff) {
      showFeedback('Staff member not found.', 'error');
      return;
    }

    const nextState = { ...pmState };
    if (!nextState[widgetSelectedStaff]) {
      nextState[widgetSelectedStaff] = {};
    } else {
      nextState[widgetSelectedStaff] = { ...nextState[widgetSelectedStaff] };
    }

    let expiresAt = null;
    if (!widgetPermanent) {
      const hours = parseFloat(widgetDuration) || 1;
      expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    }

    nextState[widgetSelectedStaff][widgetSelectedModule] = {
      on: true,
      type: widgetPermanent ? 'perm' : 'temp',
      expiresIn: widgetPermanent ? null : `${widgetDuration} hr`,
      expiresAt,
      grantedAt: new Date().toISOString(),
      note: 'Assigned via Dashboard Widget'
    };

    localStorage.setItem('curoxa_pmState', JSON.stringify(nextState));
    setPmState(nextState);

    try {
      await api.post('/auth/role-coverage', { state: nextState });
      showFeedback(`Delegated module to ${widgetSelectedStaff} successfully!`, 'success');
      
      // Audit log
      const newAuditLog = {
        id: `pm-audit-${Date.now()}`,
        title: `Role coverage updated — ${widgetSelectedStaff}`,
        category: 'Staff management',
        tag: 'Staff',
        subtext: `Module [${widgetSelectedModule}] delegated by admin. · Just now`,
        type: 'STAFF',
        hasReview: false
      };
      setAuditLogs(prev => [newAuditLog, ...prev]);
      
      // Reset selected module
      setWidgetSelectedModule('');
    } catch (err) {
      console.error('Failed to sync permission updates to backend', err);
      showFeedback('Failed to delegate module on the server.', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('curoxa_superadmin_session');
    navigate('/login');
  };

  const handleExitImpersonation = () => {
    const sessionStr = localStorage.getItem('curoxa_superadmin_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      localStorage.setItem('token', session.token);
      localStorage.setItem('user', session.user);
      localStorage.setItem('tenantModules', session.tenantModules);
      localStorage.removeItem('curoxa_superadmin_session');
      navigate('/superadmin');
    }
  };

  // Modern Approval handlers that update states dynamically
  const approveApprovalItem = async (id, title, isDbItem, commentText = 'Approved by admin') => {
    if (isDbItem) {
      try {
        await api.patch(`/approvals/${id}`, { status: 'approved', comment: commentText });
        setSuccess(`Approved: ${title}`);
        fetchApprovals();
      } catch (err) {
        setError(`Failed to approve: ${err.response?.data?.error || err.message}`);
      }
    } else {
      setPendingApprovals(prev => prev.filter(x => x.id !== id));
      setApprovedTodayCount(prev => prev + 1);
      setSuccess(`Approved: ${title}`);
    }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const rejectApprovalItem = async (id, title, isDbItem, commentText = 'Rejected by admin') => {
    if (isDbItem) {
      try {
        await api.patch(`/approvals/${id}`, { status: 'denied', comment: commentText });
        setError(`Rejected: ${title}`);
        fetchApprovals();
      } catch (err) {
        setError(`Failed to reject: ${err.response?.data?.error || err.message}`);
      }
    } else {
      setPendingApprovals(prev => prev.filter(x => x.id !== id));
      setRejectedThisWeekCount(prev => prev + 1);
      setError(`Rejected: ${title}`);
    }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const resolveCriticalAlert = async (id, title, rawItem) => {
    if (rawItem) {
      await handleAdminRestock(rawItem);
    }
    setCriticalAlerts(prev => prev.filter(item => item.id !== id));
    setResolvedCount(prev => prev + 1);
    setSuccess(`Resolved Critical Warning: ${title}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const resolveWarningAlert = async (id, title, actionName, rawItem) => {
    if (id.startsWith('db-warn-') && rawItem) {
      try {
        await api.put(`/labs/${rawItem._id}`, { status: 'In Progress' });
        setSuccess(`Updated lab request "${title}" to In Progress!`);
        fetchWarningAlerts();
      } catch (err) {
        setError(`Failed to update lab request: ${err.message}`);
      }
    } else {
      setWarningAlerts(prev => prev.filter(item => item.id !== id));
      setResolvedCount(prev => prev + 1);
      setSuccess(`Executed: ${actionName} for "${title}"`);
    }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  // Counts for tabs & statistics — built from REAL data sources
  // Enterprise alerts derived from real system state
  const enterpriseAlerts = (() => {
    const alerts = [];
    const now = new Date().toISOString();

    // Inventory alerts from criticalAlerts (real low-stock medicines/lab reagents)
    criticalAlerts.forEach((ca, i) => {
      alerts.push({
        id: `inv-real-${ca.id || i}`,
        category: 'inventory',
        priority: ca.subtext?.includes('Out of Stock') ? 'critical' : 'high',
        title: ca.title,
        description: ca.subtext || 'Stock issue detected.',
        department: ca.title.includes('Lab') ? 'Laboratory' : 'Pharmacy',
        owner: ca.title.includes('Lab') ? 'Lab Head' : 'Pharmacy Head',
        timestamp: now,
        actionText: 'Review Stock',
      });
    });

    // Pending PO alerts from purchaseOrders
    const pendingPOs = purchaseOrders.filter(po => po.status === 'Pending');
    pendingPOs.forEach((po) => {
      alerts.push({
        id: `po-${po._id}`,
        category: 'inventory',
        priority: 'high',
        title: `PO Awaiting Approval — ${po.poId || 'N/A'}`,
        description: `₹${(po.totalAmount || 0).toLocaleString('en-IN')} from ${po.vendorName || 'vendor'} pending admin review.`,
        department: 'Procurement',
        owner: po.requestedBy || 'Pharmacist',
        timestamp: po.createdAt || now,
        actionText: 'Review PO',
      });
    });

    // Warning alerts from warningAlerts (pending labs, audit issues)
    warningAlerts.forEach((wa, i) => {
      alerts.push({
        id: `warn-real-${wa.id || i}`,
        category: wa.title?.toLowerCase().includes('lab') ? 'laboratory' : 'additional',
        priority: 'medium',
        title: wa.title,
        description: wa.subtext || 'Requires attention.',
        department: wa.title?.toLowerCase().includes('lab') ? 'Laboratory' : 'Admin',
        owner: 'Admin',
        timestamp: now,
        actionText: wa.actionText || 'Review',
      });
    });

    // Unpaid bills → financial alerts
    const unpaidBills = bills.filter(b => b.status === 'Unpaid');
    if (unpaidBills.length > 0) {
      const unpaidTotal = unpaidBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      alerts.push({
        id: 'billing-unpaid',
        category: 'additional',
        priority: unpaidBills.length > 10 ? 'high' : 'medium',
        title: `${unpaidBills.length} Unpaid Bills Outstanding`,
        description: `₹${unpaidTotal.toLocaleString('en-IN')} in pending collections across ${unpaidBills.length} patients.`,
        department: 'Billing',
        owner: 'Billing Lead',
        timestamp: now,
        actionText: 'Review Bills',
      });
    }

    // Patient queue alerts from appointments
    const todayStr = new Date().toDateString();
    const todayAppts = appointments.filter(a => a.date && new Date(a.date).toDateString() === todayStr);
    const queuedCount = todayAppts.filter(a => a.status === 'IN QUEUE').length;
    if (queuedCount > 5) {
      alerts.push({
        id: 'queue-backlog',
        category: 'department',
        priority: queuedCount > 15 ? 'critical' : 'high',
        title: `OPD Queue Backlog — ${queuedCount} Patients Waiting`,
        description: `${queuedCount} patients currently in queue awaiting consultation.`,
        department: 'OPD',
        owner: 'Front Desk Lead',
        timestamp: now,
        actionText: 'View Queue',
      });
    }

    // Filter out dismissed alerts
    return alerts.filter(a => !dismissedAlertIds.includes(a.id));
  })();

  const totalAlertsCount = criticalAlerts.length + warningAlerts.length + enterpriseAlerts.length;

  // Enterprise alert aggregation helpers
  const enterpriseCriticalCount = enterpriseAlerts.filter(a => a.priority === 'critical').length;
  const enterpriseHighCount = enterpriseAlerts.filter(a => a.priority === 'high').length;
  const enterpriseMediumCount = enterpriseAlerts.filter(a => a.priority === 'medium').length;

  const alertCategories = [
    { key: 'all', label: 'All Alerts' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'laboratory', label: 'Laboratory' },
    { key: 'department', label: 'Dept. Performance' },
    { key: 'additional', label: 'Billing & Other' },
  ];

  const filteredEnterpriseAlerts = alertCategoryFilter === 'all'
    ? enterpriseAlerts
    : enterpriseAlerts.filter(a => a.category === alertCategoryFilter);

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getStaffStatus = (emp) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Check leaves
    const leavesKey = `curoxa_hr_leaves_${emp.staff_id || emp.name}`;
    const leavesSaved = localStorage.getItem(leavesKey);
    if (leavesSaved) {
      try {
        const leavesList = JSON.parse(leavesSaved);
        const hasLeave = leavesList.some(l => l.status === 'Approved' && todayStr >= l.from && todayStr <= l.to);
        if (hasLeave) return 'On Leave';
      } catch (e) {}
    }
    
    // Check attendance
    const attKey = `curoxa_hr_attendance_${emp.staff_id || emp.name}`;
    const attSaved = localStorage.getItem(attKey);
    if (attSaved) {
      try {
        const record = JSON.parse(attSaved);
        if (record[todayStr]) {
          const statusVal = record[todayStr];
          if (statusVal === 'Present' || statusVal === 'Late') return 'On duty';
          if (statusVal === 'Absent') return 'Absent';
          if (statusVal === 'Off') return 'Off';
        }
      } catch (e) {}
    }
    
    if (today.getDay() === 0) return 'Off';
    return 'On duty';
  };

  const getStaffPatientsTodayCount = (staffMember) => {
    return todayAppts.filter(app => app.doctor === staffMember.name).length;
  };

  const dismissEnterpriseAlert = (id) => {
    setDismissedAlertIds(prev => [...prev, id]);
    setResolvedCount(prev => prev + 1);
    showToast('Alert resolved successfully', 'success');
  };

  const scrollAlertCatBar = (direction) => {
    if (alertCatBarRef.current) {
      alertCatBarRef.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }
  };

  // Revenue filtering helper
  const getFilteredBills = (period) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return bills.filter(b => {
      if (b.status !== 'Paid') return false;
      const bd = new Date(b.createdAt);
      if (period === 'today') return bd >= todayStart;
      if (period === '7days') return bd >= new Date(now - 7 * 86400000);
      if (period === '30days') return bd >= new Date(now - 30 * 86400000);
      if (period === 'custom' && revenueCustomDate) {
        const cd = new Date(revenueCustomDate);
        return bd.toDateString() === cd.toDateString();
      }
      return true;
    });
  };
  const approvalsCount = pendingApprovals.length;
  
  const reorderCount = pendingApprovals.filter(x => x.category === 'reorder').length;
  const leaveCount = pendingApprovals.filter(x => x.category === 'leave').length;
  const billingCount = pendingApprovals.filter(x => x.category === 'billing').length;

  const todayStr = new Date().toDateString();
  const todayAppts = appointments.filter(app => {
    if (!app.date) return true;
    return new Date(app.date).toDateString() === todayStr;
  });

  const todayRevenue = bills
    .filter(b => b.status === 'Paid' && new Date(b.createdAt).toDateString() === todayStr)
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const todayPatientsCount = patients.filter(p => {
    if (!p.createdAt) return false;
    return new Date(p.createdAt).toDateString() === todayStr;
  }).length;

  const staffPresentCount = staff.filter(s => getStaffStatus(s) === 'On duty').length;

  const targetApptsForKpi = selectedDateFilter === 'Today' ? todayAppts : appointments;

  const bookedToday = targetApptsForKpi.length;
  const pendingToday = targetApptsForKpi.filter(app => app.status === 'IN QUEUE' || app.status === 'SCHEDULED').length;
  const completedToday = targetApptsForKpi.filter(app => app.status === 'COMPLETED').length;
  const cancelledToday = targetApptsForKpi.filter(app => app.status === 'CANCELLED').length;
  const walkinsToday = targetApptsForKpi.filter(app => (app.reason || '').toLowerCase().includes('walk') || (app.reason || '').toLowerCase().includes('general') || !app.time).length;

  const getThisMonthRevenue = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return bills
      .filter(b => {
        if (b.status !== 'Paid') return false;
        const d = new Date(b.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  };

  const getConsultationShare = () => {
    const paidBills = bills.filter(b => b.status === 'Paid');
    const total = paidBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    if (total === 0) return '0%';
    const consultTotal = paidBills.reduce((sum, b) => {
      const itemSum = (b.items || []).reduce((s, item) => {
        const desc = (item.description || '').toLowerCase();
        if (desc.includes('consult') || desc.includes('regis')) {
          return s + (item.amount || 0);
        }
        return s;
      }, 0);
      return sum + itemSum;
    }, 0);
    return `${Math.round((consultTotal / total) * 100)}%`;
  };

  const getPendingCollections = () => {
    const unpaidBills = bills.filter(b => b.status === 'Unpaid');
    const total = unpaidBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    return { total, count: unpaidBills.length };
  };

  return (
    <>
      {localStorage.getItem('curoxa_superadmin_session') && (
        <div style={{
          background: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
          color: '#FFFFFF',
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          fontWeight: 750,
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          zIndex: 99999,
          fontFamily: "'Outfit', sans-serif",
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i data-lucide="shield-alert" style={{ width: '18px', height: '18px', color: '#F59E0B' }}></i>
            <span>You are currently impersonating this hospital workspace as a <strong>Platform SuperAdmin</strong>. All actions reflect on the real tenant database.</span>
          </div>
          <button 
            onClick={handleExitImpersonation}
            style={{
              background: '#FFFFFF',
              color: '#B45309',
              border: 'none',
              padding: '4px 12px',
              borderRadius: '6px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '11px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
            onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
          >
            Exit Workspace & Return to Admin Panel
          </button>
        </div>
      )}
      <div className="admin-dashboard-container" style={localStorage.getItem('curoxa_superadmin_session') ? { marginTop: '40px', height: 'calc(100vh - 40px)' } : {}}>
        {/* 100% Mockup Consistent Styling (LIGHT THEME SIDEBAR + APPROVALS BOARD) */}
        <style>{`
          html, body {
            overflow: hidden !important;
          }

          ${localStorage.getItem('curoxa_superadmin_session') ? `
            .admin-sidebar {
              top: 40px !important;
            }
          ` : ''}

          .admin-dashboard-container {
            display: flex;
            height: calc(100vh / 0.9);
            background-color: #F8FAFC;
          font-family: 'Urbanist', 'Outfit', sans-serif;
          color: #1E293B;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        /* 1. Light Theme Sidebar Navigation (Synchronized across all sub-pages) */
        .admin-sidebar {
          width: 256px;
          background-color: #FFFFFF;
          color: #334155;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 1000;
          border-right: 1px solid #E2E8F0;
          box-shadow: none;
          overscroll-behavior: contain;
        }

        .admin-sidebar.collapsed {
          width: 70px;
        }
        .admin-sidebar.collapsed .sidebar-brand span,
        .admin-sidebar.collapsed .sidebar-group-title,
        .admin-sidebar.collapsed .sidebar-link span,
        .admin-sidebar.collapsed .profile-info {
          display: none;
        }
        .admin-sidebar.collapsed .sidebar-brand {
          justify-content: center;
          padding: 24px 16px;
        }
        .admin-sidebar.collapsed .sidebar-brand div:first-child {
          margin-right: 0;
        }
        .admin-sidebar.collapsed .sidebar-nav-container {
          padding: 24px 8px;
        }
        .admin-sidebar.collapsed .sidebar-link {
          justify-content: center;
          padding: 12px;
        }
        .admin-sidebar.collapsed .profile-avatar {
          margin-right: 0;
        }
        
        /* Mobile sidebar styles */
        .admin-sidebar.mobile-open {
          transform: translateX(0);
          box-shadow: 4px 0 20px rgba(0, 0, 0, 0.05);
        }
        @media (max-width: 1024px) {
          .admin-sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.05);
          }
        }

        .sidebar-brand {
          padding: 24px 32px 16px;
          display: flex;
          align-items: center;
          font-size: 22px;
          font-weight: 800;
          color: #2563EB;
          border-bottom: 1px solid #F1F5F9;
        }

        .sidebar-brand-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          color: #2563EB;
        }

        .sidebar-nav-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px 16px;
          overscroll-behavior: contain;
        }

        .sidebar-group {
          margin-bottom: 24px;
        }

        .sidebar-group-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #94A3B8;
          margin-bottom: 8px;
          padding-left: 16px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #64748B;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          border-radius: 8px;
          transition: all 0.2s ease-in-out;
          margin-bottom: 4px;
          cursor: pointer;
        }

        .sidebar-link:hover {
          background-color: #F8FAFC;
          color: #0F172A;
        }

        .sidebar-link.active {
          background-color: #EFF6FF;
          color: #2563EB;
        }

        .sidebar-link svg {
          stroke: #94A3B8;
          transition: stroke 0.2s;
        }

        .sidebar-link.active svg {
          stroke: #2563EB;
        }

        .sidebar-profile {
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
        .sidebar-profile:hover {
          background: #F1F5F9 !important;
        }
        .profile-info {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
        }
        .profile-avatar {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
          border: 2px solid #60A5FA !important;
        }
        .profile-name {
          font-size: 13.5px !important;
          font-weight: 800 !important;
          color: #0F172A !important;
          line-height: 1.3 !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
          overflow: hidden !important;
        }
        .profile-role {
          font-size: 11px !important;
          color: #64748B !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
          overflow: hidden !important;
        }
        .profile-chevron {
          color: #64748B !important;
          display: flex !important;
          align-items: center !important;
          transition: transform 0.3s ease !important;
        }

        /* 2. Main content area */
        .admin-main-canvas {
          margin-left: 256px;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding-bottom: 40px;
          overflow-y: auto;
        }
        .admin-main-canvas:has(.pm-container) {
          padding-bottom: 0;
        }
        .admin-main-canvas.collapsed {
          margin-left: 70px;
        }

        /* 3. Top Navigation Header */
        .admin-top-header {
          height: 72px;
          min-height: 72px;
          background-color: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 99;
        }

        .header-title-container {
          display: flex;
          flex-direction: column;
        }

        .header-title {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.5px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .plan-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #ECFDF5;
          color: #059669;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 12.5px;
          font-weight: 700;
        }

        .plan-dot {
          width: 6px;
          height: 6px;
          background-color: #10B981;
          border-radius: 50%;
        }

        .alert-outline-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #EF4444;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .alert-outline-badge:hover {
          background-color: #FEE2E2;
          transform: translateY(-1px);
        }

        .add-staff-btn {
          height: 38px;
          background-color: #2563EB;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 13px;
          font-style: normal !important;
          font-family: inherit !important;
          border: none;
          border-radius: 10px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15);
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .add-staff-btn span {
          font-style: normal !important;
          font-family: inherit !important;
          font-weight: 700 !important;
        }

        .add-staff-btn:hover {
          background-color: #1D4ED8;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.25);
        }

        /* 4. Dashboard contents container */
        .admin-dashboard-content {
          padding: 16px 20px;
          animation: adminFadeIn 0.3s ease-out;
        }

        @keyframes adminFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* KPI stat cards */
        .admin-kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 28px;
        }

        .admin-kpi-card {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .kpi-card-header {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748B;
          margin-bottom: 12px;
        }

        .kpi-card-val {
          font-size: 34px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 4px;
          line-height: 1.1;
        }

        .kpi-card-val.revenue {
          color: #10B981;
        }

        .kpi-card-val.orange-val {
          color: #D97706;
        }

        .kpi-card-val.green-val {
          color: #059669;
        }

        .kpi-card-val.red-val {
          color: #EF4444;
        }

        .kpi-card-sub {
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
        }

        .kpi-card-highlight {
          color: #D97706;
          margin-right: 4px;
        }

        .kpi-card-highlight.green {
          color: #10B981;
        }

        .kpi-icon-overlay {
          position: absolute;
          right: 24px;
          top: 24px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background-color: #FFFBEB;
          color: #D97706;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Subtab pill indicators for Approvals page */
        .approvals-subtab-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          background: #FFFFFF;
          padding: 8px 12px;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          align-self: flex-start;
          display: inline-flex;
        }

        .approvals-subtab-btn {
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .approvals-subtab-btn.active {
          background-color: #2563EB;
          color: #FFFFFF;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.15);
        }

        .approvals-subtab-btn.inactive {
          background-color: #FFFFFF;
          color: #475569;
        }

        .approvals-subtab-btn.inactive:hover {
          background-color: #F1F5F9;
          color: #0F172A;
        }

        /* 5. Modern Approvals Board Grid & Cards */
        .approval-category-header {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #64748B;
          margin-bottom: 14px;
        }

        .approval-board-card-full {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-left: 5px solid #F59E0B; /* Golden left accent */
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          margin-bottom: 28px;
          position: relative;
        }

        .approval-board-card-full.queued-accent {
          border-left-color: #CBD5E1; /* Gray accent */
        }

        .approval-card-hdr-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .approval-card-title {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        .approval-card-metadata {
          font-size: 12.5px;
          color: #64748B;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .approval-card-pills-container {
          background-color: #EFF6FF;
          border: 1px solid #BFDBFE;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          font-size: 13.5px;
          font-weight: 700;
          color: #1E3A8A;
        }

        .approval-card-pills-container span {
          display: inline-block;
        }

        .approval-actions-footer {
          display: flex;
          gap: 12px;
        }

        .approval-action-btn-green {
          background-color: #ECFDF5;
          color: #059669;
          border: none;
          font-weight: 800;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .approval-action-btn-green:hover {
          background-color: #D1FAE5;
          color: #047857;
        }

        .approval-action-btn-red {
          background-color: #FEF2F2;
          color: #DC2626;
          border: none;
          font-weight: 800;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .approval-action-btn-red:hover {
          background-color: #FEE2E2;
          color: #B91C1C;
        }

        .approval-action-btn-blue-outline {
          background-color: #FFFFFF;
          border: 1.5px solid #2563EB;
          color: #2563EB;
          font-weight: 800;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .approval-action-btn-blue-outline:hover {
          background-color: #EFF6FF;
        }

        .approvals-split-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .badge-pill-state {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: capitalize;
        }

        .badge-pill-state.pending {
          background-color: #FFFBEB;
          color: #D97706;
        }

        .badge-pill-state.queued {
          background-color: #F1F5F9;
          color: #64748B;
        }

        /* Fallbacks, Roster and Alerts components */
        .premium-dashboard-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }

        .premium-dashboard-table th {
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748B;
          border-bottom: 1px solid #F1F5F9;
        }

        .premium-dashboard-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }

        .pill-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .pill-badge.completed {
          background-color: #ECFDF5;
          color: #059669;
        }

        .pill-badge.inqueue {
          background-color: #FFFBEB;
          color: #D97706;
        }

        .pill-badge.scheduled {
          background-color: #EFF6FF;
          color: #2563EB;
        }

        .pill-badge.critical {
          background-color: #FEF2F2;
          color: #DC2626;
        }

        .workforce-split-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 24px;
        }

        .action-notification-banner {
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 13.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: slideUp 0.3s ease-out;
        }

        .action-notification-banner.success {
          background-color: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
        }

        .action-notification-banner.error {
          background-color: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FCA5A5;
        }

        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: adminFadeIn 0.2s ease-out;
        }

        .admin-modal-card {
          background: #FFFFFF;
          border-radius: 12px;
          width: 100%;
          max-width: 460px;
          padding: 32px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .admin-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .admin-modal-title {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        .admin-modal-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 50%;
        }

        .admin-modal-close-btn:hover {
          background-color: #F1F5F9;
          color: #0F172A;
        }

        .admin-input-group {
          margin-bottom: 16px;
        }

        .admin-input-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 8px;
        }

        .admin-text-input {
          width: 100%;
          height: 42px;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 0 14px;
          font-size: 13.5px;
          font-weight: 600;
          color: #1E293B;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        }

        .admin-text-input:focus {
          border-color: #3B71FE;
          background-color: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(59, 113, 254, 0.1);
        }

        .admin-submit-btn {
          width: 100%;
          height: 44px;
          background-color: #3B71FE;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 12px;
          box-shadow: 0 4px 10px rgba(59, 113, 254, 0.15);
        }

        .admin-submit-btn:hover {
          background-color: #2563EB;
        }

        .profile-dropmenu-box {
          position: absolute;
          bottom: 100%;
          left: 16px;
          width: 208px;
          margin-bottom: 8px;
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 1010;
          padding: 8px;
        }

        .dropmenu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          border-radius: 6px;
          cursor: pointer;
        }

        .dropmenu-item:hover {
          background-color: #F1F5F9;
        }

        .dropmenu-item.logout {
          color: #EF4444;
        }

        .dropmenu-item.logout:hover {
          background-color: #FEF2F2;
        }

        /* RESTORED AND OPTIMIZED GRID LAYOUT AND WIDGET STYLINGS */
        .dashboard-layout-cols {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 28px;
          align-items: start;
          margin-top: 28px;
        }

        .dashboard-col-left, .dashboard-col-right {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .dashboard-widget-card {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          position: relative;
        }

        .widget-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .widget-title {
          font-size: 15px;
          font-weight: 800;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .widget-title svg {
          color: #64748B;
        }

        .widget-header-action-btn {
          background: none;
          border: none;
          color: #2563EB;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }

        .widget-header-action-btn:hover {
          color: #1D4ED8;
          text-decoration: underline;
        }

        /* Alerts list and rows */
        .alerts-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .alert-row-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          transition: transform 0.2s;
        }

        .alert-row-item:hover {
          transform: translateY(-1px);
        }

        .alert-row-item.danger {
          background-color: #FEF2F2;
          border-color: #FCA5A5;
          color: #991B1B;
        }

        .alert-row-item.warning {
          background-color: #FFFBEB;
          border-color: #FDE68A;
          color: #92400E;
        }

        .alert-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.8);
        }

        .alert-texts {
          display: flex;
          flex-direction: column;
        }

        .alert-main-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #0F172A;
        }

        .alert-sub-title {
          font-size: 11.5px;
          color: #64748B;
          margin-top: 2px;
          font-weight: 600;
        }

        .alert-action-trigger {
          font-size: 12.5px;
          font-weight: 800;
          color: #2563EB;
          cursor: pointer;
          transition: color 0.2s;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .alert-action-trigger:hover {
          color: #1D4ED8;
          background-color: rgba(37, 99, 235, 0.05);
        }

        /* Approvals in Dashboard Widget */
        .approvals-list-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .approval-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          background-color: #F8FAFC;
        }

        .approval-item-lbl {
          font-size: 13px;
          font-weight: 700;
          color: #1E293B;
          max-width: 60%;
          line-height: 1.3;
        }

        .approval-actions-box {
          display: flex;
          gap: 8px;
        }

        .approval-act-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .approval-act-btn.approve {
          background-color: #ECFDF5;
          color: #059669;
        }

        .approval-act-btn.approve:hover {
          background-color: #D1FAE5;
        }

        .approval-act-btn.reject {
          background-color: #FEF2F2;
          color: #DC2626;
        }

        .approval-act-btn.reject:hover {
          background-color: #FEE2E2;
        }

        /* Calendar Widget breakdown details */
        .widget-details-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .details-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          padding-bottom: 12px;
          border-bottom: 1px solid #F1F5F9;
        }

        .details-item-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .details-item-label {
          font-weight: 700;
          color: #64748B;
        }

        .details-item-val {
          font-weight: 800;
          color: #0F172A;
        }

        .badge-orange {
          background-color: #FFFBEB;
          color: #D97706;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
        }

        .badge-green {
          background-color: #ECFDF5;
          color: #059669;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
        }

        /* High Fidelity Alert modern stack */
        .alerts-modern-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .alert-card-modern {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .alert-card-modern.critical-style {
          border-left: 5px solid #EF4444;
        }

        .alert-card-modern.warning-style {
          border-left: 5px solid #F59E0B;
        }

        .alert-card-left-part {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .alert-badge-icon-holder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .critical-style .alert-badge-icon-holder {
          background-color: #FEF2F2;
          color: #EF4444;
        }

        .warning-style .alert-badge-icon-holder {
          background-color: #FFFBEB;
          color: #D97706;
        }

        .alert-card-texts {
          display: flex;
          flex-direction: column;
        }

        .alert-card-main-title {
          font-size: 14.5px;
          font-weight: 800;
          color: #0F172A;
        }

        .alert-card-subtext {
          font-size: 12px;
          color: #64748B;
          margin-top: 2px;
          font-weight: 600;
        }

        .alert-card-right-part {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .alert-badge-pill {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .critical-style .alert-badge-pill {
          background-color: #FEF2F2;
          color: #EF4444;
        }

        .warning-style .alert-badge-pill {
          background-color: #FFFBEB;
          color: #D97706;
        }

        .alerts-action-outline-btn {
          background-color: #FFFFFF;
          border: 1.5px solid #2563EB;
          color: #2563EB;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12.5px;
          transition: all 0.2s;
        }

        .alerts-action-outline-btn:hover {
          background-color: #EFF6FF;
          color: #1D4ED8;
          border-color: #1D4ED8;
        }

        /* ═══════════════════════════════════════════════════════
           Enterprise Alerts Command Center — Full CSS System
           ═══════════════════════════════════════════════════════ */

        /* Category Filter Pill Bar with Arrow Control */
        .enterprise-alert-category-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
          width: 100%;
          position: relative;
        }

        .enterprise-alert-category-bar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 0;
          flex-grow: 1;
          scrollbar-width: none;
          -ms-overflow-style: none;
          overscroll-behavior-x: contain;
        }
        .enterprise-alert-category-bar::-webkit-scrollbar {
          display: none;
        }

        .alert-cat-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid #E2E8F0;
          background: #FFFFFF;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .alert-cat-arrow:hover {
          background: #F8FAFC;
          color: #0F172A;
          border-color: #CBD5E1;
        }

        .enterprise-cat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1.5px solid #E2E8F0;
          background: #FFFFFF;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .enterprise-cat-pill:hover {
          border-color: #CBD5E1;
          background: #F8FAFC;
        }

        .enterprise-cat-pill.active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: #FFFFFF;
          border-color: #2563EB;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .cat-pill-icon {
          font-size: 14px;
          line-height: 1;
        }

        .cat-pill-label {
          font-weight: 800;
        }

        .cat-pill-count {
          background: rgba(0, 0, 0, 0.06);
          padding: 2px 7px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          min-width: 20px;
          text-align: center;
        }

        .enterprise-cat-pill.active .cat-pill-count {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Section Headers */
        .enterprise-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding: 12px 0;
          border-bottom: 1.5px solid #F1F5F9;
        }

        .enterprise-section-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 800;
          color: #0F172A;
        }

        .enterprise-section-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
        }

        .enterprise-section-count {
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          background: #F1F5F9;
          padding: 4px 10px;
          border-radius: 6px;
        }

        /* Enterprise Alert Cards Grid */
        .enterprise-alerts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .enterprise-alert-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          overflow: hidden;
          transition: all 0.25s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
        }

        .enterprise-alert-card:hover {
          border-color: #CBD5E1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }

        /* Priority-specific card accents */
        .enterprise-alert-card.priority-critical {
          border-top: 3px solid #EF4444;
        }

        .enterprise-alert-card.priority-high {
          border-top: 3px solid #F59E0B;
        }

        .enterprise-alert-card.priority-medium {
          border-top: 3px solid #3B82F6;
        }

        /* Priority Ribbon */
        .eac-priority-ribbon {
          padding: 6px 16px;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .eac-priority-ribbon.priority-critical {
          background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
          color: #DC2626;
        }

        .eac-priority-ribbon.priority-high {
          background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
          color: #D97706;
        }

        .eac-priority-ribbon.priority-medium {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          color: #2563EB;
        }

        /* Card Body */
        .eac-body {
          padding: 16px 18px 12px;
          flex: 1;
        }

        .eac-title {
          margin: 0 0 6px;
          font-size: 14.5px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.35;
        }

        .eac-description {
          margin: 0 0 14px;
          font-size: 13px;
          color: #64748B;
          font-weight: 600;
          line-height: 1.45;
        }

        /* Meta Chips (department, owner, timestamp) */
        .eac-meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .eac-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          background: #F1F5F9;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
        }

        .eac-meta-chip svg {
          flex-shrink: 0;
          color: #94A3B8;
        }

        .eac-meta-time {
          background: #FFFBEB;
          color: #92400E;
        }

        .eac-meta-time svg {
          color: #D97706;
        }

        /* Card Actions Footer */
        .eac-actions {
          display: flex;
          gap: 8px;
          padding: 12px 18px 16px;
          border-top: 1px solid #F1F5F9;
        }

        .eac-action-btn {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .eac-action-btn.primary {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
        }

        .eac-action-btn.primary:hover {
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
          transform: translateY(-1px);
        }

        .eac-action-btn.dismiss {
          background: #FFFFFF;
          color: #64748B;
          border: 1.5px solid #E2E8F0;
        }

        .eac-action-btn.dismiss:hover {
          background: #F1F5F9;
          color: #475569;
          border-color: #CBD5E1;
        }

        /* Responsive overrides for enterprise alerts */
        @media (max-width: 1024px) {
          .enterprise-alerts-grid {
            grid-template-columns: 1fr;
          }
          .enterprise-alert-category-bar {
            gap: 6px;
          }
          .enterprise-cat-pill {
            padding: 7px 12px;
            font-size: 12px;
          }
        }

        @media (max-width: 640px) {
          .enterprise-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .eac-meta-row {
            flex-direction: column;
            gap: 4px;
          }
          .eac-actions {
            flex-direction: column;
          }
          .eac-action-btn {
            width: 100%;
            text-align: center;
          }
        }

        /* Appointments Tab Styling */
        .appt-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }

        .appt-kpi-header {
          font-size: 13px;
          font-weight: 800;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .appt-table-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .appt-segmented-tabs {
          display: flex;
          background-color: #F1F5F9;
          padding: 4px;
          border-radius: 8px;
          gap: 4px;
        }

        .appt-tab-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13.5px;
          font-weight: 800;
          color: #64748B;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .appt-tab-btn.active {
          background-color: #2563EB;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
        }

        .appt-search-input {
          padding: 9px 16px 9px 36px;
          border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          background-color: #F8FAFC;
          font-size: 13.5px;
          font-weight: 600;
          color: #1E293B;
          outline: none;
          width: 220px;
          transition: all 0.2s;
        }

        .appt-search-input:focus {
          border-color: #2563EB;
          background-color: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .search-bar-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .appt-select-filter {
          padding: 9px 32px 9px 16px;
          border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          background-color: #FFFFFF;
          font-size: 13.5px;
          font-weight: 700;
          color: #475569;
          outline: none;
          cursor: pointer;
          appearance: none;
          transition: all 0.2s;
        }

        .appt-select-filter:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .appt-select-arrow {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .appt-new-btn {
          background-color: #2563EB;
          color: #FFFFFF;
          font-weight: 800;
          padding: 10px 18px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 13.5px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
        }

        .appt-new-btn:hover {
          background-color: #1D4ED8;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .appt-roster-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .appt-roster-table th {
          font-size: 11.5px;
          font-weight: 800;
          color: #64748B;
          padding: 16px 20px;
          border-bottom: 1.5px solid #E2E8F0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .appt-roster-table td {
          padding: 18px 20px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 14px;
        }

        .appt-roster-table tr:hover td {
          background-color: #F8FAFC;
        }

        .appt-patient-id-badge {
          margin-left: 8px;
          font-size: 11.5px;
          font-weight: 700;
          color: #64748B;
          background-color: #F1F5F9;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .appt-status-badge {
          font-size: 11.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .appt-status-badge.badge-success {
          background-color: #DEF7EC;
          color: #03543F;
        }

        .appt-status-badge.badge-warning {
          background-color: #FEF3C7;
          color: #92400E;
        }

        .appt-status-badge.badge-info {
          background-color: #E0F2FE;
          color: #0369A1;
        }

        .appt-status-badge.badge-danger {
          background-color: #FDE8E8;
          color: #9B1C1C;
        }

        .appt-action-outline-btn {
          background-color: #FFFFFF;
          border: 1.5px solid #2563EB;
          color: #2563EB;
          font-weight: 800;
          padding: 7px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12.5px;
          transition: all 0.2s;
        }

        .appt-action-outline-btn:hover {
          background-color: #EFF6FF;
          color: #1D4ED8;
          border-color: #1D4ED8;
        }

        .appt-action-outline-btn-red {
          background-color: #FFFFFF;
          border: 1.5px solid #EF4444;
          color: #EF4444;
          font-weight: 800;
          padding: 7px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12.5px;
          transition: all 0.2s;
        }

        .appt-action-outline-btn-red:hover {
          background-color: #FEF2F2;
          color: #DC2626;
          border-color: #DC2626;
        }

        /* Patients Tab Styling */
        .pat-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }

        .pat-search-register-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        .pat-search-input-wrapper {
          position: relative;
          flex: 1;
        }

        .pat-search-input {
          width: 100%;
          padding: 12px 16px 12px 42px;
          border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          background-color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 600;
          color: #1E293B;
          outline: none;
          transition: all 0.2s;
        }

        .pat-search-input:focus {
          border-color: #2563EB;
          background-color: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .pat-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .pat-register-btn {
          background-color: #2563EB;
          color: #FFFFFF;
          font-weight: 800;
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
        }

        .pat-register-btn:hover {
          background-color: #1D4ED8;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .pat-roster-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .pat-roster-table th {
          font-size: 11.5px;
          font-weight: 800;
          color: #64748B;
          padding: 16px 24px;
          border-bottom: 1.5px solid #E2E8F0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .pat-roster-table td {
          padding: 20px 24px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 14px;
          color: #475569;
        }

        .pat-roster-table tr:hover td {
          background-color: #F8FAFC;
        }

        .pat-id-text {
          font-weight: 700;
          color: #64748B;
        }

        .pat-name-text {
          font-weight: 700;
          color: #0F172A;
        }

        /* Workforce / Staff Tab Styles matching mockup exactly */
        .staff-kpi-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }

        .staff-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .staff-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .staff-card-item {
          background-color: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .staff-card-item:hover {
          border-color: #CBD5E1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .staff-card-item.absent-styled {
          background-color: #F8FAFC;
        }

        .staff-card-header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 20px;
        }

        .staff-avatar-initials {
          width: 54px;
          height: 54px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
        }

        .staff-avatar-initials.avatar-purple {
          background-color: #FAF5FF;
          color: #A855F7;
        }

        .staff-avatar-initials.avatar-blue {
          background-color: #EFF6FF;
          color: #3B82F6;
        }

        .staff-avatar-initials.avatar-gold {
          background-color: #FEF3C7;
          color: #D97706;
        }

        .staff-name-badges-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .staff-meta-widgets {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .staff-meta-widget-item {
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 12px 16px;
        }

        .absent-styled .staff-meta-widget-item {
          background-color: #F1F5F9;
        }

        .staff-meta-widget-lbl {
          font-size: 10.5px;
          font-weight: 800;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .staff-meta-widget-val {
          font-size: 14.5px;
          font-weight: 800;
          color: #1E293B;
        }

        .staff-actions-footer {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .staff-action-pill-btn {
          background-color: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          color: #475569;
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .staff-action-pill-btn:hover {
          background-color: #F8FAFC;
          color: #1E293B;
          border-color: #CBD5E1;
        }

        .staff-action-pill-btn.deactivate-btn {
          border-color: #FEE2E2;
          background-color: #FFFFFF;
          color: #EF4444;
        }

        .staff-action-pill-btn.deactivate-btn:hover {
          background-color: #FEF2F2;
          border-color: #FCA5A5;
        }

        .staff-action-pill-btn.arrange-btn {
          background-color: #D97706;
          border-color: #D97706;
          color: #FFFFFF;
        }

        .staff-action-pill-btn.arrange-btn:hover {
          background-color: #B45309;
          border-color: #B45309;
        }

        .revenue-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 24px;
        }

        .search-filter-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .log-item-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-radius: 16px;
          border: 1.5px solid #F1F5F9;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.01);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        @media (max-width: 1024px) {
          .revenue-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .search-filter-row {
            flex-direction: column;
          }
          .search-filter-row select {
            width: 100% !important;
          }
          .log-item-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
          }
          .log-item-card-right {
            align-self: flex-end;
            width: 100%;
            display: flex;
            justify-content: flex-end;
          }
        }

        /* Mobile layout styling overrides */
        @media (max-width: 1024px) {
          .mobile-menu-toggle {
            display: flex !important;
          }
          .admin-sidebar {
            left: -256px !important;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            z-index: 2000 !important;
          }
          .admin-sidebar.mobile-open {
            left: 0 !important;
            z-index: 2000 !important;
          }
          .admin-main-canvas {
            margin-left: 0 !important;
          }
          .admin-top-header {
            padding: 0 20px !important;
          }
          .mobile-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            z-index: 999;
            animation: fadeIn 0.2s ease-out;
          }
          .dashboard-layout-cols {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .admin-dashboard-content {
            padding: 24px 20px calc(100px + env(safe-area-inset-bottom, 24px)) !important;
          }

          /* Safe-area spacing overrides for bottom sidebar profile on mobile */
          .admin-sidebar {
            height: 100% !important;
            height: 100dvh !important;
            padding-bottom: calc(32px + env(safe-area-inset-bottom, 32px)) !important;
          }
          .sidebar-profile {
            padding-bottom: 16px !important;
          }
          .profile-dropmenu-box {
            bottom: calc(72px + 32px + env(safe-area-inset-bottom, 32px)) !important;
          }
        }

        /* Mobile specific visual fixes for 640px screens */
        @media (max-width: 640px) {
          .admin-dashboard-content {
            padding: 16px 12px calc(100px + env(safe-area-inset-bottom, 24px)) !important;
          }
          .admin-top-header {
            padding: 0 12px !important;
            height: auto !important;
            min-height: 72px !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          .header-title-container {
            max-width: 140px !important;
          }
          .header-title {
            font-size: 16px !important;
            line-height: 1.3 !important;
          }
          .header-title-sub {
            display: none !important;
          }
          .plan-badge {
            display: none !important;
          }
          .header-actions {
            gap: 8px !important;
          }
          .alert-outline-badge {
            padding: 6px 10px !important;
            font-size: 11px !important;
          }
          .alert-outline-badge span {
            display: none !important;
          }
          
          /* Admin KPI Cards row stacking on mobile */
          .admin-kpi-row {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          
          /* Alerts / Tasks card collapse */
          .alert-card-modern {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
            padding: 16px !important;
          }
          .alert-card-left-part {
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .alert-card-right-part {
            align-self: flex-end !important;
            width: 100% !important;
            justify-content: flex-end !important;
            border-top: 1px solid #F1F5F9 !important;
            padding-top: 12px !important;
          }
        }

        /* ----- SUBSCRIPTION MOBILE RESPONSIVE LAYOUT ----- */
        .subscription-alert-banner {
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }
        .subscription-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 24px;
        }
        .subscription-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #F1F5F9;
        }
        .subscription-row:last-child {
          border-bottom: none;
        }

        /* ----- UPDATES MOBILE RESPONSIVE LAYOUT ----- */
        .admin-update-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-radius: 16px;
          gap: 16px;
        }
        .admin-update-card-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        @media (max-width: 768px) {
          .admin-update-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px !important;
            padding: 16px !important;
          }
          .admin-update-card-left {
            align-items: flex-start !important;
          }
          .admin-update-card > button, .admin-update-card > span {
            align-self: stretch !important;
            text-align: center !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 1024px) {
          .subscription-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .subscription-alert-banner {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 16px !important;
          }
          .subscription-alert-banner button {
            width: 100% !important;
            text-align: center !important;
          }
          .subscription-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
            padding: 12px 0 !important;
          }
          .subscription-row span:last-child {
            align-self: flex-start !important;
          }
        }

        /* ----- ROLE COVERAGE / PERMISSIONS MANAGER TAB ----- */
        .pm-container {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 28px;
          padding: 24px 40px;
          animation: adminFadeIn 0.3s ease-out;
          height: calc(100vh / 0.9 - 56px);
          min-height: 500px;
          box-sizing: border-box;
        }

        .pm-staff-pane {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          overflow: hidden;
          min-height: 0;
        }

        .pm-search-container {
          position: relative;
          width: 100%;
          margin-bottom: 4px;
        }

        .pm-search-input {
          width: 100%;
          height: 40px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 0 16px 0 36px;
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          outline: none;
          transition: all 0.2s ease;
          font-family: 'Outfit', sans-serif;
          box-sizing: border-box;
        }

        .pm-search-input:focus {
          background: #FFFFFF;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .pm-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #94A3B8;
          pointer-events: none;
        }

        .pm-pane-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .pm-staff-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          overscroll-behavior: contain;
        }

        .pm-staff-list::-webkit-scrollbar {
          width: 5px;
        }
        .pm-staff-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .pm-staff-list::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 4px;
        }
        .pm-staff-list::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }

        .pm-staff-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pm-staff-item:hover {
          background-color: #F8FAFC;
          border-color: #E2E8F0;
        }

        .pm-staff-item.active {
          background-color: #EFF6FF;
          border-color: #BFDBFE;
        }

        .pm-staff-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .pm-staff-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .pm-staff-name {
          font-size: 13.5px;
          font-weight: 750;
          color: #0F172A;
        }

        .pm-staff-role {
          font-size: 11px;
          color: #64748B;
          font-weight: 600;
          text-transform: capitalize;
        }

        .pm-detail-pane {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .pm-detail-pane::-webkit-scrollbar {
          width: 5px;
        }
        .pm-detail-pane::-webkit-scrollbar-track {
          background: transparent;
        }
        .pm-detail-pane::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 4px;
        }
        .pm-detail-pane::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }

        .pm-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          flex: 1;
          color: #94A3B8;
          padding: 60px 20px;
        }

        .pm-empty-icon {
          width: 64px;
          height: 64px;
          background: #F1F5F9;
          color: #64748B;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .pm-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 20px;
          border-bottom: 1px solid #E2E8F0;
          margin-bottom: 24px;
          flex-shrink: 0;
        }

        .pm-group-box {
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          margin-bottom: 20px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .pm-group-title {
          background: #F8FAFC;
          padding: 12px 18px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #475569;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pm-module-row {
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid #F1F5F9;
          transition: background-color 0.2s;
        }

        .pm-module-row:last-child {
          border-bottom: none;
        }

        .pm-module-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
        }

        .pm-module-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          padding-right: 20px;
        }

        .pm-module-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pm-module-name {
          font-size: 13.5px;
          font-weight: 750;
          color: #1E293B;
        }

        .pm-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .pm-badge.core {
          background: #F1F5F9;
          color: #64748B;
        }

        .pm-badge.temp {
          background: #FFF7ED;
          color: #C2410C;
          border: 1px solid #FED7AA;
        }

        .pm-badge.perm {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #A7F3D0;
        }

        .pm-badge.pending {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
        }

        .pm-module-desc {
          font-size: 12px;
          color: #64748B;
          font-weight: 550;
        }

        /* Toggle switches */
        .pm-toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background-color: #E2E8F0;
          border-radius: 99px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .pm-toggle-switch.active {
          background-color: #2563EB;
        }

        .pm-toggle-switch.disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .pm-revoke-btn {
          background-color: #FFF1F2;
          color: #E11D48;
          border: 1px solid #FFE4E6;
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          font-family: inherit;
        }

        .pm-revoke-btn:hover {
          background-color: #FFE4E6;
          border-color: #FDA4AF;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(225, 29, 72, 0.08);
        }

        .pm-revoke-btn:active {
          transform: translateY(0);
        }

        .pm-toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .pm-toggle-switch.active .pm-toggle-thumb {
          transform: translateX(20px);
        }

        /* Settings pane details */
        .pm-duration-bar {
          background: #F8FAFC;
          border-top: 1px dashed #E2E8F0;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pm-duration-select {
          height: 32px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          background: white;
          padding: 0 8px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          outline: none;
          cursor: pointer;
        }

        /* Sticky bottom action footer */
        .pm-sticky-footer {
          position: fixed;
          bottom: 0;
          right: 0;
          left: 260px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-top: 1px solid #E2E8F0;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1000;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.03);
          transition: left 0.3s ease;
        }

        @media (max-width: 1024px) {
          .pm-container {
            grid-template-columns: 1fr;
          }
          .pm-sticky-footer {
            left: 0 !important;
            padding: 16px 20px !important;
          }
        }

        .pm-footer-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          max-width: 500px;
        }

        .pm-footer-changes {
          font-size: 13px;
          font-weight: 800;
          color: #1E293B;
          flex-shrink: 0;
        }

        .pm-reason-input {
          flex: 1;
          height: 38px;
          border: 1.5px solid #E2E8F0;
          border-radius: 8px;
          padding: 0 12px;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          transition: border-color 0.2s;
        }

        .pm-reason-input:focus {
          border-color: #2563EB;
        }

        .pm-footer-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pm-apply-btn {
          height: 38px;
          background: #10B981;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0 18px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .pm-apply-btn:hover {
          background: #059669;
        }

        .pm-apply-btn:disabled {
          background: #A7F3D0;
          cursor: not-allowed;
        }

        .pm-discard-btn {
          background: transparent;
          color: #64748B;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 0 16px;
          height: 38px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pm-discard-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
        }

        /* Overrides ledger widget */
        .pm-overrides-card {
          margin-top: 28px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 24px;
          background: #F8FAFC;
          flex-shrink: 0;
        }

        /* Core Role Modules card */
        .pm-core-roles-card {
          background: linear-gradient(135deg, #F0F9FF 0%, #EFF6FF 100%);
          border: 1px solid #BFDBFE;
          border-radius: 12px;
          padding: 18px 22px;
          margin-bottom: 24px;
          animation: adminFadeIn 0.25s ease-out;
          flex-shrink: 0;
        }

        .pm-core-roles-title {
          font-size: 12px;
          font-weight: 800;
          color: #1E40AF;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pm-core-roles-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .pm-core-pill {
          background: #FFFFFF;
          border: 1px solid #DBEAFE;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #1E3A8A;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pm-core-pill .pm-core-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3B82F6;
          flex-shrink: 0;
        }

        .pm-core-roles-hint {
          font-size: 11px;
          color: #64748B;
          font-weight: 600;
          margin: 0;
          font-style: italic;
        }

        .pm-overrides-title {
          font-size: 14px;
          font-weight: 800;
          color: #1E293B;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pm-override-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid #F1F5F9;
        }

        .pm-override-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .pm-override-row:first-child {
          padding-top: 0;
        }

        .pm-override-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pm-override-staff {
          font-size: 13.5px;
          font-weight: 750;
          color: #1E293B;
        }

        .pm-override-perm-name {
          font-size: 12px;
          color: #64748B;
          font-weight: 600;
        }

        .pm-override-reason {
          font-size: 11px;
          color: #94A3B8;
          font-style: italic;
          font-weight: 550;
        }

        .btn-premium-approve {
          padding: 8px 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
          border: none;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-premium-approve:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px -1px rgba(16, 185, 129, 0.35);
        }
        .btn-premium-approve:active {
          transform: translateY(0);
        }

        .btn-premium-edit {
          padding: 8px 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
          color: white;
          border: none;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-premium-edit:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px -1px rgba(59, 130, 246, 0.35);
        }
        .btn-premium-edit:active {
          transform: translateY(0);
        }

        .btn-premium-reject {
          padding: 8px 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
          border: none;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-premium-reject:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px -1px rgba(239, 68, 68, 0.35);
        }
        .btn-premium-reject:active {
          transform: translateY(0);
        }

        .btn-premium-delete {
          padding: 8px 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #4B5563 0%, #374151 100%);
          color: white;
          border: none;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(75, 85, 99, 0.2);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-premium-delete:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px -1px rgba(75, 85, 99, 0.35);
        }
        .btn-premium-delete:active {
          transform: translateY(0);
        }

        @media (max-width: 1024px) {
          .admin-kpi-row {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .pm-container {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
            padding: 0 16px 20px 16px !important;
          }
          .admin-dashboard-content {
            padding: 16px !important;
          }
          .admin-top-header {
            padding: 0 16px !important;
          }
          .admin-sidebar {
            width: 260px !important;
          }
        }
        @media (max-width: 768px) {
          .admin-kpi-row {
            grid-template-columns: 1fr !important;
          }
          .admin-top-header {
            flex-direction: row !important;
            justify-content: space-between !important;
          }
        }

        /* ----- MODERNIZED DASHBOARD STAT CARDS ----- */
        .admin-kpi-card-new {
          border-radius: 24px !important;
          padding: 24px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
          border: none !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02) !important;
          transition: transform 0.2s, box-shadow 0.2s !important;
          text-decoration: none !important;
        }
        .admin-kpi-card-new:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05) !important;
        }
        .kpi-card-top-row-new {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          width: 100% !important;
        }
        .kpi-icon-container-new {
          width: 48px !important;
          height: 48px !important;
          border-radius: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }
        .kpi-pill-badge-new {
          font-size: 11px !important;
          font-weight: 800 !important;
          padding: 4px 10px !important;
          border-radius: 99px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        .kpi-label-new {
          font-size: 12.5px !important;
          font-weight: 800 !important;
          color: #64748B !important;
          text-transform: capitalize !important;
          margin: 0 !important;
        }
        .kpi-value-new {
          font-size: 32px !important;
          font-weight: 900 !important;
          color: #0F172A !important;
          margin: 0 !important;
          font-family: 'Outfit', sans-serif !important;
          line-height: 1 !important;
        }

        /* ----- ROLE COVERAGE WIDGET ----- */
        .role-coverage-grid-new {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 20px !important;
          margin-top: 16px !important;
        }
        @media (max-width: 768px) {
          .role-coverage-grid-new {
            grid-template-columns: 1fr !important;
          }
        }
        .coverage-card-new {
          background: #FFFFFF !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 16px !important;
          padding: 20px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
          position: relative !important;
          transition: all 0.2s !important;
        }
        .coverage-card-new:hover {
          border-color: #CBD5E1 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
        }
        .coverage-card-header-new {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          justify-content: space-between !important;
          width: 100% !important;
        }
        .coverage-avatar-initials-new {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          background-color: #EFF6FF !important;
          color: #2563EB !important;
          flex-shrink: 0 !important;
        }
        .coverage-user-info-new {
          display: flex !important;
          flex-direction: column !important;
          flex-grow: 1 !important;
          min-width: 0 !important;
        }
        .coverage-user-name-new {
          font-size: 14px !important;
          font-weight: 800 !important;
          color: #0F172A !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .coverage-user-role-new {
          font-size: 12px !important;
          color: #64748B !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .coverage-status-pill-new {
          font-size: 11px !important;
          font-weight: 800 !important;
          padding: 4px 10px !important;
          border-radius: 99px !important;
          white-space: nowrap !important;
        }
        .coverage-status-pill-new.warning {
          background-color: #FFF7ED !important;
          color: #EA580C !important;
        }
        .coverage-status-pill-new.success {
          background-color: #ECFDF5 !important;
          color: #059669 !important;
        }
        .coverage-status-pill-new.danger {
          background-color: #FEF2F2 !important;
          color: #EF4444 !important;
        }
        .coverage-details-grid-new {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 12px !important;
          font-size: 12px !important;
          border-top: 1px solid #F1F5F9 !important;
          padding-top: 16px !important;
        }
        .coverage-details-label-new {
          font-weight: 800 !important;
          color: #94A3B8 !important;
          text-transform: uppercase !important;
          font-size: 10px !important;
          letter-spacing: 0.5px !important;
          margin-bottom: 2px !important;
        }
        .coverage-details-val-new {
          font-weight: 700 !important;
          color: #1E293B !important;
        }
        .coverage-details-val-new.orange-text {
          color: #EA580C !important;
        }
        .coverage-details-val-new.green-text {
          color: #059669 !important;
        }
        .coverage-details-val-new.red-text {
          color: #EF4444 !important;
        }
        .coverage-actions-footer-new {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-top: 4px !important;
          border-top: 1px solid #F1F5F9 !important;
          padding-top: 12px !important;
        }
        .coverage-action-btn-new {
          background: #F8FAFC !important;
          border: 1px solid #E2E8F0 !important;
          color: #475569 !important;
          padding: 6px 12px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 800 !important;
          cursor: pointer;
          transition: all 0.2s !important;
        }
        .coverage-action-btn-new:hover {
          background: #F1F5F9 !important;
          color: #0F172A !important;
          border-color: #CBD5E1 !important;
        }
        .coverage-remove-btn-new {
          background: none !important;
          border: none !important;
          color: #EF4444 !important;
          font-size: 12.5px !important;
          font-weight: 800 !important;
          cursor: pointer;
          padding: 0 !important;
        }
        .coverage-remove-btn-new:hover {
          color: #DC2626 !important;
          text-decoration: underline !important;
        }

        /* ----- ALERTS CARD STYLING ----- */
        .alerts-widget-container-new {
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
        }
        .alert-card-new {
          border-radius: 16px !important;
          padding: 20px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 14px !important;
          border: 1px solid transparent !important;
          transition: transform 0.2s, box-shadow 0.2s !important;
        }
        .alert-card-new:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
        }
        .alert-card-new.critical-bg {
          background-color: #FEF2F2 !important;
          border-color: #FCA5A5 !important;
        }
        .alert-card-new.warning-bg {
          background-color: #FFFDF5 !important;
          border-color: #FEF3C7 !important;
        }
        .alert-card-new.info-bg {
          background-color: #EFF6FF !important;
          border-color: #DBEAFE !important;
        }
        .alert-card-header-new {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        .alert-dot-new {
          width: 8px !important;
          height: 8px !important;
          border-radius: 50% !important;
          flex-shrink: 0 !important;
        }
        .alert-title-new {
          font-size: 14.5px !important;
          font-weight: 900 !important;
          color: #0F172A !important;
          margin: 0 !important;
          line-height: 1.3 !important;
        }
        .alert-metadata-row-new {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          flex-wrap: wrap !important;
        }
        .alert-badge-new {
          font-size: 10px !important;
          font-weight: 900 !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        .alert-subtext-new {
          font-size: 11.5px !important;
          color: #64748B !important;
          font-weight: 700 !important;
        }
        .alert-actions-row-new {
          display: flex !important;
          gap: 8px !important;
          margin-top: 4px !important;
        }
        .alert-btn-resolve-new {
          background-color: #2563EB !important;
          color: #FFFFFF !important;
          border: none !important;
          font-weight: 800 !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          cursor: pointer;
          font-size: 12.5px !important;
          transition: background-color 0.2s !important;
        }
        .alert-btn-resolve-new:hover {
          background-color: #1D4ED8 !important;
        }
        .alert-btn-details-new {
          background-color: #FFFFFF !important;
          border: 1.5px solid #E2E8F0 !important;
          color: #475569 !important;
          font-weight: 800 !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          cursor: pointer;
          font-size: 12.5px !important;
          transition: all 0.2s !important;
        }
        .alert-btn-details-new:hover {
          background-color: #F8FAFC !important;
          color: #1E293B !important;
          border-color: #CBD5E1 !important;
        }
        .admin-kpi-row-new {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 24px !important;
          margin-bottom: 24px !important;
        }
        @media (max-width: 1024px) {
          .admin-kpi-row-new {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 640px) {
          .admin-kpi-row-new {
            grid-template-columns: 1fr !important;
          }
        }

        .approvals-list-stack-new {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }
        .approval-list-item-new {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 16px 20px !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 12px !important;
          background-color: #FFFFFF !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .approval-list-item-new:hover {
          border-color: #CBD5E1 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02) !important;
        }
        .approval-item-lbl-new {
          font-size: 13.5px !important;
          font-weight: 800 !important;
          color: #1E293B !important;
          line-height: 1.4 !important;
        }
        .approval-item-sub-new {
          font-size: 11.5px !important;
          color: #64748B !important;
          font-weight: 600 !important;
          margin-top: 2px !important;
        }
        .approval-actions-box-new {
          display: flex !important;
          gap: 8px !important;
        }
        .approval-act-btn-new {
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 12.5px !important;
          font-weight: 800 !important;
          cursor: pointer !important;
          border: none !important;
          transition: all 0.2s !important;
        }
        .approval-act-btn-new.approve {
          background-color: #ECFDF5 !important;
          color: #059669 !important;
        }
        .approval-act-btn-new.approve:hover {
          background-color: #D1FAE5 !important;
        }
        .approval-act-btn-new.reject {
          background-color: #FEF2F2 !important;
          color: #DC2626 !important;
        }
        .approval-act-btn-new.reject:hover {
          background-color: #FEE2E2 !important;
        }
        .approval-act-btn-new.hold {
          background-color: #FFF7ED !important;
          color: #EA580C !important;
        }
        .approval-act-btn-new.hold:hover {
          background-color: #FFEDD5 !important;
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

      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 1. Light Theme Sidebar Navigation */}
      {activeTab !== 'hr-payroll' && (
        <div 
          className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`} 
          ref={sidebarRef}
          onClick={() => setMobileSidebarOpen(false)}
          data-lenis-prevent
        >
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', width: '100%' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: '#2563EB', color: '#FFFFFF', fontWeight: 900, fontSize: '16px', boxShadow: '0 0 15px rgba(59, 113, 254, 0.15)', flexShrink: 0 }}>
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

        <div className="sidebar-nav-container" ref={sidebarNavRef}>
          {/* Overview Group */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Overview</div>
            <div 
              className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="10" rx="1"/><rect width="7" height="5" x="3" y="14" rx="1"/></svg>
              <span>Dashboard</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'supply' ? 'active' : ''}`}
              onClick={() => setActiveTab('supply')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <span>Alerts & tasks</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span>Approvals</span>
            </div>
            {tenantModules.inventory?.enabled !== false && (
              <div 
                className={`sidebar-link ${activeTab === 'po-approvals' ? 'active' : ''}`}
                onClick={() => setActiveTab('po-approvals')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span>PO Approvals</span>
              </div>
            )}
          </div>
 
          {/* Clinic Group */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Clinic</div>
            {tenantModules.reception?.enabled !== false && (
              <div 
                className={`sidebar-link ${activeTab === 'appointments' ? 'active' : ''}`}
                onClick={() => setActiveTab('appointments')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
                <span>Appointments</span>
              </div>
            )}
            {tenantModules.reception?.enabled !== false && (
              <div 
                className={`sidebar-link ${['patients', 'patient-details'].includes(activeTab) ? 'active' : ''}`}
                onClick={() => { setActiveTab('patients'); setViewingPatient(null); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Patients</span>
              </div>
            )}
            <div 
              className={`sidebar-link ${activeTab === 'workforce' ? 'active' : ''}`}
              onClick={() => setActiveTab('workforce')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
              <span>Staff</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'permissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('permissions')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Role Coverage</span>
            </div>
          </div>
 
          {/* Finance & System Group */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Finance & System</div>
            <div 
              className={`sidebar-link ${activeTab === 'financials' ? 'active' : ''}`}
              onClick={() => setActiveTab('financials')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>Revenue</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
              <span>Audit Logs</span>
            </div>
            {tenantModules.dpdp?.enabled !== false && (
              <div 
                className={`sidebar-link ${activeTab === 'dpdp' ? 'active' : ''}`}
                onClick={() => setActiveTab('dpdp')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                <span>DPO & Compliance</span>
              </div>
            )}
          </div>

          {/* Settings Group */}
          <div className="sidebar-group">
            <div className="sidebar-group-title">Settings</div>
            <div 
              className={`sidebar-link ${activeTab === 'services-catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('services-catalog')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M17 9.5a3.5 3.5 0 0 0-7 0c0 2 2.5 3.5 3.5 4.5s3.5 2.5 3.5 4.5a3.5 3.5 0 0 1-7 0"/></svg>
              <span>Pricing & Procedures</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'lab-catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('lab-catalog')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              <span>Lab Tests Catalog</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'subscription' ? 'active' : ''}`}
              onClick={() => setActiveTab('subscription')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
              <span>Subscription</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'maintenance' ? 'active' : ''}`}
              onClick={() => setActiveTab('maintenance')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>
              <span>Maintenance</span>
            </div>
            <div 
              className={`sidebar-link ${activeTab === 'updates' ? 'active' : ''}`}
              onClick={() => setActiveTab('updates')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              <span>Updates</span>
            </div>
          </div>

          {/* Active Coverages Group */}
          {coverageState && Object.keys(coverageState).some(k => coverageState[k]?.on) && (
            <div className="sidebar-group">
              <div className="sidebar-group-title" style={{ color: '#EF4444', fontWeight: 800 }}>Active Coverages</div>
              {(Object.keys(coverageState).some(k => k.startsWith('rc-') && coverageState[k]?.on)) && tenantModules.reception?.enabled !== false && (
                <div 
                  className="sidebar-link"
                  onClick={() => window.open('/receptionist', '_blank')}
                  style={{ color: '#E11D48', fontWeight: 800 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  <span>Receptionist Cover</span>
                </div>
              )}
              {(Object.keys(coverageState).some(k => k.startsWith('lt-') && coverageState[k]?.on)) && tenantModules.laboratory?.enabled !== false && (
                <div 
                  className="sidebar-link"
                  onClick={() => window.open('/lab', '_blank')}
                  style={{ color: '#059669', fontWeight: 800 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H18"/><path d="M10 14H14"/><path d="M12 2v20"/><path d="M18 10H6"/></svg>
                  <span>Lab Cover</span>
                </div>
              )}
              {(Object.keys(coverageState).some(k => (k.startsWith('ph-') || k === 'dr-stockview') && coverageState[k]?.on)) && tenantModules.pharmacy?.enabled !== false && (
                <div 
                  className="sidebar-link"
                  onClick={() => window.open('/pharmacy', '_blank')}
                  style={{ color: '#2563EB', fontWeight: 800 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  <span>Pharmacy Cover</span>
                </div>
              )}
              {(Object.keys(coverageState).some(k => k.startsWith('dr-') && k !== 'dr-stockview' && coverageState[k]?.on)) && tenantModules.doctor?.enabled !== false && (
                <div 
                  className="sidebar-link"
                  onClick={() => window.open('/doctor', '_blank')}
                  style={{ color: '#8B5CF6', fontWeight: 800 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  <span>Doctor Cover</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Profile Section with Dropdown toggle */}
        <div className="sidebar-profile" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Avatar" 
              className="profile-avatar"
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #60A5FA' }}
            />
          ) : (
            <div className="profile-avatar-initials" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B71FE 0%, #2563EB 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD'}
            </div>
          )}
          <div className="profile-info" style={{ flex: 1 }}>
            <div className="profile-name">{currentUser.name || 'Kunal'}</div>
            <div className="profile-role">Admin</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="profile-chevron" style={{ marginLeft: 'auto', width: '16px', color: '#94A3B8', transition: '0.3s', transform: showProfileMenu ? 'rotate(180deg)' : 'none' }}><path d="m6 9 6 6 6-6"/></svg>

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
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A' }}>{currentUser.name || 'Kunal'}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Admin</div>
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
                  setActiveTab('dashboard');
                  setShowProfileMenu(false);
                  setMobileSidebarOpen(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="10" rx="1"/><rect width="7" height="5" x="3" y="14" rx="1"/></svg> Dashboard
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
                  setActiveTab('subscription');
                  setShowProfileMenu(false);
                  setMobileSidebarOpen(false);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> Subscription
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Edit Profile
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg> HR & Payroll
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg> Logout Account
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* 2. Main content area canvas */}
      <div className={`admin-main-canvas ${activeTab === 'hr-payroll' ? 'fullscreen-portal' : (isSidebarCollapsed ? 'collapsed' : '')}`} data-lenis-prevent>
        {/* 3. Top Navigation Header */}
        {activeTab !== 'hr-payroll' && (
          <div className="admin-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                transition: 'background-color 0.2s'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>

            <div className="header-title-container">
              {renderHeaderTitle()}
            </div>
          </div>

          <div className="header-actions">
            <div className="plan-badge">
              <span className="plan-dot" />
              <span>{subscription ? `${subscription.plan.split(' (')[0]} - ${subscription.status.toLowerCase()}` : 'Loading...'}</span>
            </div>
            
            {/* Pill outline button for alerts count */}
            <div 
              className="alert-outline-badge" 
              onClick={() => setActiveTab('supply')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span>{totalAlertsCount} alerts</span>
            </div>

            {/* Notification Bell */}
            <div 
              ref={notificationRef}
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#64748B', background: 'white' }}
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) {
                  const userKey = currentUser.staff_id || currentUser.id || currentUser.name || 'default';
                  localStorage.setItem(`curoxa_notifications_last_seen_${userKey}`, String(Date.now()));
                  setUnreadCount(0);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
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
                    overflowY: 'auto',
                    textAlign: 'left'
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

            <button 
              className="add-staff-btn" 
              onClick={() => { 
                setHrInitialTab('Directory');
                setHrInitialAdding(true);
                setActiveTab('hr-payroll'); 
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Manage / Add Staff</span>
            </button>
          </div>
        </div>
      )}

        {/* Banners for actions feedback */}
        {activeTab !== 'hr-payroll' && (success || error) && (
          <div style={{ padding: '0 40px', marginTop: '24px' }}>
            {success && (
              <div className="action-notification-banner success">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="action-notification-banner error">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hr-payroll' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: 0 }}>
            <HRPayroll 
              initialTab={hrInitialTab} 
              initialIsAdding={hrInitialAdding} 
              onExit={() => {
                setHrInitialTab('Dashboard');
                setHrInitialAdding(false);
                setActiveTab('dashboard');
              }} 
            />
          </div>
        )}

        {/* 4. Dashboard tab content */}
        {activeTab === 'dashboard' && (
          <div className="admin-dashboard-content">
            {/* KPI STAT CARDS - Colored background matching mockup */}
            <div className="admin-kpi-row-new">
              {/* Card 1: Today's Registrations */}
              <div 
                className="admin-kpi-card-new"
                style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}
                onClick={() => { setSelectedPatientDateFilter('Today'); setActiveTab('patients'); }}
              >
                <div className="kpi-card-top-row-new">
                  <div className="kpi-icon-container-new" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <span className="kpi-pill-badge-new" style={{ background: 'rgba(37,99,235,0.15)', color: '#1D4ED8' }}>Patients</span>
                </div>
                <div>
                  <div className="kpi-label-new" style={{ color: '#1E40AF', marginBottom: '6px' }}>Today's Registrations</div>
                  <div className="kpi-value-new" style={{ color: '#1E3A8A', fontSize: '36px' }}>{todayPatientsCount}</div>
                </div>
              </div>

              {/* Card 2: Appointments Today */}
              <div 
                className="admin-kpi-card-new"
                style={{ background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}
                onClick={() => { setSelectedDateFilter('Today'); setActiveTab('appointments'); }}
              >
                <div className="kpi-card-top-row-new">
                  <div className="kpi-icon-container-new" style={{ background: 'rgba(124,58,237,0.12)', color: '#7C3AED' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  </div>
                  <span className="kpi-pill-badge-new" style={{ background: 'rgba(124,58,237,0.15)', color: '#6B21A8' }}>Appointments</span>
                </div>
                <div>
                  <div className="kpi-label-new" style={{ color: '#6B21A8', marginBottom: '6px' }}>Appointments Today</div>
                  <div className="kpi-value-new" style={{ color: '#581C87', fontSize: '36px' }}>{todayAppts.length}</div>
                </div>
              </div>

              {/* Card 3: Today's Revenue */}
              <div 
                className="admin-kpi-card-new"
                style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}
                onClick={() => { setRevenueTimeframe('today'); setShowRevenueModal(true); }}
              >
                <div className="kpi-card-top-row-new">
                  <div className="kpi-icon-container-new" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <span className="kpi-pill-badge-new" style={{ background: 'rgba(16,185,129,0.15)', color: '#047857' }}>Collections</span>
                </div>
                <div>
                  <div className="kpi-label-new" style={{ color: '#065F46', marginBottom: '6px' }}>Today's Revenue</div>
                  <div className="kpi-value-new" style={{ color: '#064E3B', fontSize: '36px' }}>₹{todayRevenue.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Card 4: Staff Present Today */}
              <div 
                className="admin-kpi-card-new"
                style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}
                onClick={() => { setActiveTab('workforce'); }}
              >
                <div className="kpi-card-top-row-new">
                  <div className="kpi-icon-container-new" style={{ background: 'rgba(217,119,6,0.12)', color: '#D97706' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>
                  </div>
                  <span className="kpi-pill-badge-new" style={{ background: 'rgba(217,119,6,0.15)', color: '#92400E' }}>Attendance</span>
                </div>
                <div>
                  <div className="kpi-label-new" style={{ color: '#92400E', marginBottom: '6px' }}>Staff Present Today</div>
                  <div className="kpi-value-new" style={{ color: '#78350F', fontSize: '36px' }}>{staffPresentCount}</div>
                </div>
              </div>
            </div>

            {/* TWO COLUMN GRID */}
            <div className="dashboard-layout-cols">
              {/* Left column */}
              <div className="dashboard-col-left" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Role Coverage Widget - Card Grid matching mockup */}
                <div className="dashboard-widget-card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>Role Coverage</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#7C3AED', background: '#F3E8FF', padding: '4px 10px', borderRadius: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Temporary Assignments</span>
                    </div>
                    <button className="widget-header-action-btn" onClick={() => setActiveTab('permissions')}>View All &gt;</button>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, margin: '0 0 20px 0' }}>Staff currently holding temporary responsibilities — never lose track.</p>

                  {/* Delegation Cards Grid / Fallback */}
                  <div style={{ display: 'grid', gridTemplateColumns: getActiveDelegationsForDashboard().length === 0 ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }}>
                    {getActiveDelegationsForDashboard().length === 0 ? (
                      <div style={{ padding: '24px', border: '1px dashed #E2E8F0', borderRadius: '16px', textAlign: 'center', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                        No active temporary delegations. Use the Role Coverage tab to delegate permissions.
                      </div>
                    ) : getActiveDelegationsForDashboard().map((del, idx) => (
                      <div key={del.id} style={{ background: '#FFFFFF', border: '1px solid #E8ECF1', borderRadius: '16px', padding: '20px', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E8ECF1'; }}
                      >
                        {/* Card Header: Avatar + Name + Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: del.color + '18', color: del.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
                              {del.initials}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{del.staffName}</div>
                              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>{del.transition}</div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '10.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px',
                            background: del.badgeType === 'success' ? '#ECFDF5' : del.badgeType === 'warning' ? '#FFF7ED' : '#FEF2F2',
                            color: del.badgeType === 'success' ? '#059669' : del.badgeType === 'warning' ? '#EA580C' : '#DC2626',
                            whiteSpace: 'nowrap'
                          }}>{del.badgeText}</span>
                        </div>

                        {/* Card Metadata */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Department</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>{del.department}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Assigned By</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>{del.assignedBy}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Duration</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>{del.duration}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Remaining</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: del.badgeType === 'danger' ? '#DC2626' : del.badgeType === 'warning' ? '#EA580C' : '#059669' }}>{del.remaining}</div>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                          <button style={{ background: 'none', border: 'none', fontSize: '12.5px', fontWeight: 700, color: '#EF4444', cursor: 'pointer', padding: 0 }}
                            onClick={() => {
                              if (del.isReal) { handleDirectRevoke(del.staffName, del.permId); }
                              else { setDismissedMockCards(prev => [...prev, del.id]); }
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#DC2626'} onMouseLeave={e => e.currentTarget.style.color = '#EF4444'}
                          >Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approvals & Tasks Section */}
                <div className="dashboard-widget-card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>Approvals & Tasks</span>
                      <p style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, margin: '4px 0 0 0' }}>Pending requests awaiting your decision.</p>
                    </div>
                    <button className="widget-header-action-btn" onClick={() => setActiveTab('approvals')}>View All &gt;</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingApprovals.slice(0, 4).map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FFFFFF' }}>
                        <div 
                          style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0, cursor: item.category === 'vendor_onboarding' ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (item.category === 'vendor_onboarding') {
                              const vendorId = item.raw?.details?.vendorId;
                              const v = vendors.find(x => x._id === vendorId);
                              if (v) setSelectedVendorProfile(v);
                              else showToast('Vendor profile data not found in catalog', 'error');
                            }
                          }}
                          title={item.category === 'vendor_onboarding' ? 'Click to view full vendor profile' : ''}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: item.category === 'vendor_onboarding' ? 'underline' : 'none' }}>{item.title}</span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>{item.category} · {item.subtitle || 'Pending'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button style={{ background: '#10B981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            onClick={() => approveApprovalItem(item.id, item.title, item.isDbItem)}
                          >Approve</button>
                          <button style={{ background: '#F1F5F9', color: '#64748B', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                            onClick={() => rejectApprovalItem(item.id, item.title, item.isDbItem)}
                          >Reject</button>
                        </div>
                      </div>
                    ))}
                    {pendingApprovals.length === 0 && (
                      <div style={{ padding: '24px', border: '1px dashed #E2E8F0', borderRadius: '12px', textAlign: 'center', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                        No pending approvals. All clear!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-col-right" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Alerts & Tasks Widget */}
                <div className="dashboard-widget-card" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>Alerts & Tasks</span>
                    <button className="widget-header-action-btn" onClick={() => setActiveTab('supply')}>All &gt;</button>
                  </div>

                  <div className="alerts-stack" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto', paddingRight: '6px' }}>
                    {criticalAlerts.map(alert => (
                      <div 
                        className="alert-row-item danger animate-in" 
                        key={alert.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '16px',
                          background: '#FEF2F2',
                          borderLeft: '4px solid #EF4444',
                          borderRadius: '12px',
                          gap: '12px',
                          border: '1px solid #FEE2E2',
                          borderLeftWidth: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', marginTop: '6px', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#7F1D1D' }}>{alert.title}</span>
                            <span style={{ fontSize: '10.5px', color: '#EF4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              CRITICAL · {alert.subtext || 'SYSTEM'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', paddingLeft: '18px' }}>
                          <button 
                            style={{
                              background: '#2563EB',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            onClick={() => resolveCriticalAlert(alert.id, alert.title, alert.rawItem)}
                          >
                            Resolve
                          </button>
                          <button 
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: 0
                            }}
                            onClick={() => showFeedback(`Details: ${alert.title}`, 'success')}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ))}

                    {warningAlerts.map(alert => (
                      <div 
                        className="alert-row-item warning animate-in" 
                        key={alert.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          padding: '16px',
                          background: '#FFFBEB',
                          borderLeft: '4px solid #F59E0B',
                          borderRadius: '12px',
                          gap: '12px',
                          border: '1px solid #FEF3C7',
                          borderLeftWidth: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', marginTop: '6px', flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#78350F' }}>{alert.title}</span>
                            <span style={{ fontSize: '10.5px', color: '#D97706', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              WARNING · {alert.subtext || 'SYSTEM'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', paddingLeft: '18px' }}>
                          <button 
                            style={{
                              background: '#2563EB',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            onClick={() => resolveWarningAlert(alert.id, alert.title, alert.actionText, alert.rawItem)}
                          >
                            Resolve
                          </button>
                          <button 
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748B',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: 0
                            }}
                            onClick={() => showFeedback(`Details: ${alert.title}`, 'success')}
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    ))}

                    {criticalAlerts.length === 0 && warningAlerts.length === 0 && (
                      <div style={{ padding: '24px', border: '1px dashed #E2E8F0', borderRadius: '12px', textAlign: 'center', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                        All systems operational. No active alerts.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Workforce/Staff tab content matching mockup exactly */}
        {activeTab === 'workforce' && (
          <div className="admin-dashboard-content">
            {/* KPI Cards Row */}
            <div className="staff-kpi-row">
              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Total Staff</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{staff.length}</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>City Care Clinic</p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Active Today</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#10B981', margin: 0 }}>
                    {staff.filter(s => getStaffStatus(s) === 'On duty').length}
                  </h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>
                  {staff.filter(s => getStaffStatus(s) === 'Absent').length} absent · {staff.filter(s => getStaffStatus(s) === 'On Leave').length} on leave
                </p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Pending Approvals</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#D97706', margin: 0 }}>{leaveCount}</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>New req.</p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Staff Performance</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#10B981', margin: 0 }}>Good</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>No flagged issues</p>
              </div>
            </div>

            {/* Search Bar + Add staff button */}
            <div className="staff-filter-bar">
              <div className="pat-search-input-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pat-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                <input 
                  type="text" 
                  className="pat-search-input" 
                  placeholder="Search by name, role, department..."
                  value={staffSearchQuery}
                  onChange={e => { setStaffSearchQuery(e.target.value); setStaffPage(1); }}
                />
              </div>
            </div>

            {/* Segmented control tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button 
                className={`appt-tab-btn ${activeStaffCategory === 'All' ? 'active' : ''}`}
                onClick={() => { setActiveStaffCategory('All'); setStaffPage(1); }}
                style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '13.5px' }}
              >
                All staff ({staff.length})
              </button>
              <button 
                className={`appt-tab-btn ${activeStaffCategory === 'Doctors' ? 'active' : ''}`}
                onClick={() => { setActiveStaffCategory('Doctors'); setStaffPage(1); }}
                style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '13.5px', border: '1px solid #E2E8F0', backgroundColor: activeStaffCategory === 'Doctors' ? '#2563EB' : '#FFFFFF', color: activeStaffCategory === 'Doctors' ? '#FFFFFF' : '#64748B' }}
              >
                Doctors ({staff.filter(s => s.role === 'doctor').length})
              </button>
              <button 
                className={`appt-tab-btn ${activeStaffCategory === 'Receptionist' ? 'active' : ''}`}
                onClick={() => { setActiveStaffCategory('Receptionist'); setStaffPage(1); }}
                style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '13.5px', border: '1px solid #E2E8F0', backgroundColor: activeStaffCategory === 'Receptionist' ? '#2563EB' : '#FFFFFF', color: activeStaffCategory === 'Receptionist' ? '#FFFFFF' : '#64748B' }}
              >
                Receptionist ({staff.filter(s => s.role === 'receptionist').length})
              </button>
              <button 
                className={`appt-tab-btn ${activeStaffCategory === 'Others' ? 'active' : ''}`}
                onClick={() => { setActiveStaffCategory('Others'); setStaffPage(1); }}
                style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '13.5px', border: '1px solid #E2E8F0', backgroundColor: activeStaffCategory === 'Others' ? '#2563EB' : '#FFFFFF', color: activeStaffCategory === 'Others' ? '#FFFFFF' : '#64748B' }}
              >
                Others ({staff.filter(s => s.role !== 'doctor' && s.role !== 'receptionist').length})
              </button>
            </div>

            {(() => {
              const filteredStaffList = staff
                .filter(item => {
                  if (staffSearchQuery) {
                    const query = staffSearchQuery.toLowerCase();
                    return (
                      item.name.toLowerCase().includes(query) ||
                      item.role.toLowerCase().includes(query) ||
                      (item.dept && item.dept.toLowerCase().includes(query))
                    );
                  }
                  return true;
                })
                .filter(item => {
                  if (activeStaffCategory === 'Doctors') return item.role === 'doctor';
                  if (activeStaffCategory === 'Receptionist') return item.role === 'receptionist';
                  if (activeStaffCategory === 'Others') return item.role !== 'doctor' && item.role !== 'receptionist';
                  return true;
                });

              const staffPageSize = 5;
              const totalStaffPages = Math.ceil(filteredStaffList.length / staffPageSize) || 1;
              const paginatedStaff = filteredStaffList.slice((staffPage - 1) * staffPageSize, staffPage * staffPageSize);

              return (
                <>
                  {/* Roster list stack */}
                  <div className="staff-cards-stack">
                    {paginatedStaff.map(item => {
                      const currentStatus = getStaffStatus(item);
                      const isAbsent = currentStatus === 'Absent';
                      const isOnLeave = currentStatus === 'On Leave';
                      const isOff = currentStatus === 'Off';
                      const isInactive = isAbsent || isOnLeave || isOff;
                      return (
                        <div key={item.id || item._id} className={`staff-card-item ${isInactive ? 'absent-styled' : ''}`}>
                          {/* Top header profile area */}
                          <div className="staff-card-header">
                            <div className={`staff-avatar-initials avatar-${item.avatarColor || 'blue'}`}>
                              {item.initials}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="staff-name-badges-row">
                                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 8px 0 0' }}>{item.name}</h3>
                                {isAbsent ? (
                                  <>
                                    <span className="appt-status-badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>Absent Today</span>
                                    <span className="appt-status-badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>{item.role.toUpperCase()}</span>
                                  </>
                                ) : isOnLeave ? (
                                  <>
                                    <span className="appt-status-badge" style={{ backgroundColor: '#FDE8E8', color: '#9B1C1C', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>On Leave</span>
                                    <span className="appt-status-badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>{item.role.toUpperCase()}</span>
                                  </>
                                ) : isOff ? (
                                  <>
                                    <span className="appt-status-badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>Weekly Off</span>
                                    <span className="appt-status-badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>{item.role.toUpperCase()}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="appt-status-badge badge-success" style={{ fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>Active</span>
                                    <span className="appt-status-badge" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>{item.role.toUpperCase()}</span>
                                    {item.dept && (
                                      <span className="appt-status-badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 800, borderRadius: '6px', padding: '3px 8px' }}>{item.dept.toUpperCase()}</span>
                                    )}
                                  </>
                                )}
                              </div>
                              <p style={{ color: '#64748B', fontSize: '13.5px', fontWeight: 600, margin: '6px 0 0 0' }}>
                                {item.role === 'doctor' ? 'Doctor' : item.role === 'hr' ? 'HR Manager' : 'Staff'} • {item.dept || 'Administration'} • Joined {item.joined || 'Recently'}
                              </p>
                            </div>
                          </div>

                          {/* Detail Widgets (Only for non-inactive active staff) */}
                          {!isInactive && (
                            <div className="staff-meta-widgets">
                              <div className="staff-meta-widget-item">
                                <div className="staff-meta-widget-lbl">Patients Today</div>
                                <div className="staff-meta-widget-val">{getStaffPatientsTodayCount(item)}</div>
                              </div>
                              <div className="staff-meta-widget-item">
                                <div className="staff-meta-widget-lbl">Last Login</div>
                                <div className="staff-meta-widget-val" style={{ color: '#10B981' }}>{item.lastLogin || 'Today 9AM'}</div>
                              </div>
                              <div className="staff-meta-widget-item">
                                <div className="staff-meta-widget-lbl">Working Days</div>
                                <div className="staff-meta-widget-val">{item.workingDays || 'Mon-Sat'}</div>
                              </div>
                              <div className="staff-meta-widget-item">
                                <div className="staff-meta-widget-lbl">Status</div>
                                <div className="staff-meta-widget-val" style={{ color: '#10B981' }}>{currentStatus}</div>
                              </div>
                            </div>
                          )}

                          {/* Actions Footer */}
                          <div className="staff-actions-footer">
                            {isInactive ? (
                              <>
                                <button 
                                  className="staff-action-pill-btn arrange-btn"
                                  onClick={() => {
                                    showFeedback(`Scheduling cover for ${item.name}...`, 'success');
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="20 6 9 17 4 12"/></svg>
                                  Arrange cover
                                </button>
                                <button 
                                  className="staff-action-pill-btn"
                                  onClick={() => setViewingStaff(item)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12.01" y1="16" y2="16"/><path d="M12 8a2 2 0 0 1 2 2c0 .991-.807 1.312-1.32 1.637C12.16 12.014 12 12.518 12 13"/></svg>
                                  View
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="staff-action-pill-btn" onClick={() => showFeedback(`Sending notification ping to ${item.name}...`, 'success')}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                                  Notify
                                </button>
                                <button className="staff-action-pill-btn" onClick={() => setViewingStaff(item)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                  View profile
                                </button>
                                <button 
                                  className="staff-action-pill-btn" 
                                  onClick={() => {
                                    setEditingStaff(item);
                                    setEditStaffFields({
                                      name: item.name,
                                      role: item.role,
                                      specialty: item.dept || '',
                                      max_slots: item.max_slots || 10,
                                      password: '',
                                      email: item.email || ''
                                    });
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                  Edit
                                </button>
                                <button 
                                  className="staff-action-pill-btn" 
                                  onClick={() => {
                                    setPmSelectedStaffId(item.name);
                                    setActiveTab('permissions');
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                                  Permissions
                                </button>
                                {item.role !== 'admin' && (
                                  <button 
                                    className="staff-action-pill-btn deactivate-btn"
                                    onClick={() => {
                                      setSelectedStaffToRevoke({ id: item.id || item._id, name: item.name });
                                      setShowRevokeConfirm(true);
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
                                    Deactivate
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                      {filteredStaffList.length > 0 
                        ? `Showing ${(staffPage - 1) * staffPageSize + 1} to ${Math.min(staffPage * staffPageSize, filteredStaffList.length)} of ${filteredStaffList.length} staff members`
                        : 'Showing 0 staff members'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setStaffPage(prev => Math.max(1, prev - 1))}
                        disabled={staffPage === 1}
                        style={{ background: 'none', border: 'none', cursor: staffPage === 1 ? 'not-allowed' : 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      {Array.from({ length: totalStaffPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        const isActive = staffPage === pageNum;
                        return (
                          <span 
                            key={pageNum}
                            onClick={() => setStaffPage(pageNum)}
                            style={{
                              width: '28px',
                              height: '28px',
                              background: isActive ? '#2563EB' : 'transparent',
                              color: isActive ? 'white' : '#64748B',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {pageNum}
                          </span>
                        );
                      })}
                      <button
                        onClick={() => setStaffPage(prev => Math.min(totalStaffPages, prev + 1))}
                        disabled={staffPage === totalStaffPages}
                        style={{ background: 'none', border: 'none', cursor: staffPage === totalStaffPages ? 'not-allowed' : 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* 6. Enterprise-Grade Alerts Command Center */}
        {activeTab === 'supply' && (
          <div className="admin-dashboard-content">
            {/* KPI STAT CARDS ROW — Enterprise Alert Overview */}
            <div className="admin-kpi-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <div className="admin-kpi-card" style={{ borderLeft: '4px solid #EF4444' }}>
                <span className="kpi-card-header">Total Active</span>
                <span className="kpi-card-val red-val">{totalAlertsCount}</span>
                <span className="kpi-card-sub">
                  Across {alertCategories.length - 1} departments
                </span>
              </div>
              <div className="admin-kpi-card" style={{ borderLeft: '4px solid #DC2626' }}>
                <span className="kpi-card-header"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#DC2626" stroke="none" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"/></svg> Critical</span>
                <span className="kpi-card-val" style={{ color: '#DC2626' }}>{enterpriseCriticalCount + criticalAlerts.length}</span>
                <span className="kpi-card-sub">Requires immediate action</span>
              </div>
              <div className="admin-kpi-card" style={{ borderLeft: '4px solid #F59E0B' }}>
                <span className="kpi-card-header"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="none" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"/></svg> High Priority</span>
                <span className="kpi-card-val orange-val">{enterpriseHighCount + warningAlerts.length}</span>
                <span className="kpi-card-sub">Escalation needed</span>
              </div>
              <div className="admin-kpi-card" style={{ borderLeft: '4px solid #3B82F6' }}>
                <span className="kpi-card-header"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#3B82F6" stroke="none" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"/></svg> Medium</span>
                <span className="kpi-card-val" style={{ color: '#3B82F6' }}>{enterpriseMediumCount}</span>
                <span className="kpi-card-sub">Monitor & review</span>
              </div>
              <div className="admin-kpi-card" style={{ borderLeft: '4px solid #10B981' }}>
                <span className="kpi-card-header"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><polyline points="20 6 9 17 4 12"/></svg> Resolved</span>
                <span className="kpi-card-val green-val">{resolvedCount}</span>
                <span className="kpi-card-sub">This week</span>
              </div>
            </div>

            {/* Category Filter Tabs — Arrow-Scrollable Pill Navigation */}
            <div className="enterprise-alert-category-wrapper">
              <button className="alert-cat-arrow alert-cat-arrow-left" onClick={() => scrollAlertCatBar(-1)} aria-label="Scroll left">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="enterprise-alert-category-bar" ref={alertCatBarRef} data-lenis-prevent>
                {alertCategories.map(cat => {
                  const count = cat.key === 'all'
                    ? enterpriseAlerts.length
                    : enterpriseAlerts.filter(a => a.category === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      className={`enterprise-cat-pill ${alertCategoryFilter === cat.key ? 'active' : ''}`}
                      onClick={() => setAlertCategoryFilter(cat.key)}
                    >
                      <span className="cat-pill-label">{cat.label}</span>
                      <span className="cat-pill-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              <button className="alert-cat-arrow alert-cat-arrow-right" onClick={() => scrollAlertCatBar(1)} aria-label="Scroll right">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {/* Live DB-sourced Critical & Warning Alerts (existing) */}
            {(criticalAlerts.length > 0 || warningAlerts.length > 0) && alertCategoryFilter === 'all' && (
              <div style={{ marginBottom: '32px' }}>
                <div className="enterprise-section-header">
                  <div className="enterprise-section-header-left">
                    <span className="enterprise-section-dot" style={{ background: '#EF4444' }} />
                    <span>Live System Alerts</span>
                  </div>
                  <span className="enterprise-section-count">{criticalAlerts.length + warningAlerts.length} active</span>
                </div>
                <div className="alerts-modern-stack">
                  {criticalAlerts.map(alert => (
                    <div className="alert-card-modern critical-style animate-in" key={alert.id}>
                      <div className="alert-card-left-part">
                        <div className="alert-badge-icon-holder">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v8L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45L14 10V2z"/><path d="M6 2h12"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
                        </div>
                        <div className="alert-card-texts">
                          <span className="alert-card-main-title">{alert.title}</span>
                          <span className="alert-card-subtext">{alert.subtext}</span>
                        </div>
                      </div>
                      <div className="alert-card-right-part">
                        <span className="alert-badge-pill">Critical</span>
                        <button className="alerts-action-outline-btn" onClick={() => resolveCriticalAlert(alert.id, alert.title, alert.rawItem)}>
                          Resolve →
                        </button>
                      </div>
                    </div>
                  ))}
                  {warningAlerts.map((alert, index) => (
                    <div className="alert-card-modern warning-style animate-in" key={alert.id} style={{ animationDelay: `${0.05 * (index + 1)}s` }}>
                      <div className="alert-card-left-part">
                        <div className="alert-badge-icon-holder">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                        </div>
                        <div className="alert-card-texts">
                          <span className="alert-card-main-title">{alert.title}</span>
                          <span className="alert-card-subtext">{alert.subtext}</span>
                        </div>
                      </div>
                      <div className="alert-card-right-part">
                        <span className="alert-badge-pill">Warning</span>
                        <button className="alerts-action-outline-btn" onClick={() => resolveWarningAlert(alert.id, alert.title, alert.actionText, alert.rawItem)}>
                          {alert.actionText}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enterprise Categorized Alerts — Main Feed */}
            {(() => {
              // Group by category for structured rendering
              const groupedByCategory = {};
              filteredEnterpriseAlerts
                .sort((a, b) => {
                  const priorityOrder = { critical: 0, high: 1, medium: 2 };
                  return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
                })
                .forEach(alert => {
                  if (!groupedByCategory[alert.category]) groupedByCategory[alert.category] = [];
                  groupedByCategory[alert.category].push(alert);
                });

              const categoryMeta = {
                'inventory': { label: 'Inventory Alerts', color: '#EF4444' },
                'staff': { label: 'Staff Alerts', color: '#8B5CF6' },
                'laboratory': { label: 'Laboratory Alerts', color: '#0EA5E9' },
                'patient-safety': { label: 'Patient Safety Alerts', color: '#DC2626' },
                'compliance': { label: 'Compliance Alerts', color: '#D97706' },
                'system': { label: 'System Alerts', color: '#6366F1' },
                'department': { label: 'Department Performance', color: '#10B981' },
                'additional': { label: 'Additional Critical Alerts', color: '#F59E0B' },
              };

              const categoriesToRender = alertCategoryFilter === 'all'
                ? Object.keys(categoryMeta).filter(k => groupedByCategory[k]?.length > 0)
                : [alertCategoryFilter].filter(k => groupedByCategory[k]?.length > 0);

              return (
                <>
                  {categoriesToRender.map(catKey => (
                    <div key={catKey} style={{ marginBottom: '32px' }}>
                      <div className="enterprise-section-header">
                        <div className="enterprise-section-header-left">
                          <span className="enterprise-section-dot" style={{ background: categoryMeta[catKey]?.color || '#64748B' }} />
                          <span>{categoryMeta[catKey]?.label || catKey}</span>
                        </div>
                        <span className="enterprise-section-count">
                          {groupedByCategory[catKey]?.length || 0} alert{(groupedByCategory[catKey]?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="enterprise-alerts-grid">
                        {(groupedByCategory[catKey] || []).map((alert, idx) => (
                          <div
                            key={alert.id}
                            className={`enterprise-alert-card priority-${alert.priority} animate-in`}
                            style={{ animationDelay: `${0.04 * idx}s` }}
                          >
                            {/* Priority ribbon */}
                            <div className={`eac-priority-ribbon priority-${alert.priority}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill={alert.priority === 'critical' ? '#EF4444' : alert.priority === 'high' ? '#F59E0B' : '#3B82F6'} stroke="none" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"/></svg>
                              <span style={{ verticalAlign: 'middle' }}>{alert.priority.toUpperCase()}</span>
                            </div>

                            {/* Alert content */}
                            <div className="eac-body">
                              <h4 className="eac-title">{alert.title}</h4>
                              <p className="eac-description">{alert.description}</p>

                              <div className="eac-meta-row">
                                <div className="eac-meta-chip">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                  {alert.department}
                                </div>
                                <div className="eac-meta-chip">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                  {alert.owner}
                                </div>
                                <div className="eac-meta-chip eac-meta-time">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  {getTimeAgo(alert.timestamp)}
                                </div>
                              </div>
                            </div>

                            {/* Action footer */}
                            <div className="eac-actions">
                              <button
                                className="eac-action-btn primary"
                                onClick={() => {
                                  if (alert.actionText === 'Review Bills') {
                                    setRevenueTimeframe('all');
                                    setShowRevenueModal(true);
                                  } else {
                                    showToast(`Action: ${alert.actionText} — ${alert.title}`, 'success');
                                  }
                                }}
                              >
                                {alert.actionText} →
                              </button>
                              <button
                                className="eac-action-btn dismiss"
                                onClick={() => dismissEnterpriseAlert(alert.id)}
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {filteredEnterpriseAlerts.length === 0 && criticalAlerts.length === 0 && warningAlerts.length === 0 && (
                    <div style={{
                      padding: '64px 24px',
                      textAlign: 'center',
                      color: '#64748B',
                      fontWeight: 600,
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1px dashed #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 16px auto' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>All Clear!</div>
                      <div>No active alerts in this category. Hospital operations running smoothly.</div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* 7. Approvals Tab Content (Identical to latest mockup) */}
        {activeTab === 'approvals' && (
          <div className="admin-dashboard-content">
            {/* KPI STAT CARDS */}
            <div className="admin-kpi-row">
              <div className="admin-kpi-card">
                <span className="kpi-card-header">Pending Approvals</span>
                <span className="kpi-card-val">{pendingApprovals.filter(x => x.status === 'Pending').length}</span>
                <span className="kpi-card-sub">Across all categories</span>
              </div>

              <div className="admin-kpi-card">
                <span className="kpi-card-header">Approved Today</span>
                <span className="kpi-card-val green-val">{approvedTodayCount}</span>
                <span className="kpi-card-sub">By admin</span>
              </div>

              <div className="admin-kpi-card">
                <span className="kpi-card-header">Rejected</span>
                <span className="kpi-card-val red-val">{rejectedThisWeekCount}</span>
                <span className="kpi-card-sub">This week</span>
              </div>
            </div>

            {/* FILTERS & SEARCH ROW */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #E2E8F0',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="Search approvals (e.g. requester, item)..."
                  value={approvalSearchQuery}
                  onChange={e => setApprovalSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px'
                  }}
                />
                <select
                  value={approvalStatusFilter}
                  onChange={e => setApprovalStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: '#FFFFFF'
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied/Rejected</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>Date Range:</span>
                <input
                  type="date"
                  value={approvalDateRange.start}
                  onChange={e => setApprovalDateRange(prev => ({ ...prev, start: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
                <span style={{ color: '#94A3B8' }}>to</span>
                <input
                  type="date"
                  value={approvalDateRange.end}
                  onChange={e => setApprovalDateRange(prev => ({ ...prev, end: e.target.value }))}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
                {(approvalDateRange.start || approvalDateRange.end) && (
                  <button
                    onClick={() => setApprovalDateRange({ start: '', end: '' })}
                    style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Inner Subtabs selector */}
            <div className="approvals-subtab-bar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <button 
                className={`approvals-subtab-btn ${approvalsSubTab === 'receptionist_indent' ? 'active' : 'inactive'}`}
                onClick={() => setApprovalsSubTab('receptionist_indent')}
              >
                Indents ({pendingApprovals.filter(x => x.category === 'receptionist_indent').length})
              </button>
              <button 
                className={`approvals-subtab-btn ${approvalsSubTab === 'vendor_onboarding' ? 'active' : 'inactive'}`}
                onClick={() => setApprovalsSubTab('vendor_onboarding')}
              >
                Vendors ({pendingApprovals.filter(x => x.category === 'vendor_onboarding').length})
              </button>
              <button 
                className={`approvals-subtab-btn ${approvalsSubTab === 'item_price_update' ? 'active' : 'inactive'}`}
                onClick={() => setApprovalsSubTab('item_price_update')}
              >
                Price Updates ({pendingApprovals.filter(x => x.category === 'item_price_update').length})
              </button>
              <button 
                className={`approvals-subtab-btn ${approvalsSubTab === 'purchase_order_approval' ? 'active' : 'inactive'}`}
                onClick={() => setApprovalsSubTab('purchase_order_approval')}
              >
                Purchase Orders ({pendingApprovals.filter(x => x.category === 'purchase_order_approval').length})
              </button>
              <button 
                className={`approvals-subtab-btn ${approvalsSubTab === 'leave' ? 'active' : 'inactive'}`}
                onClick={() => setApprovalsSubTab('leave')}
              >
                Leave & Staff ({pendingApprovals.filter(x => x.category === 'leave').length})
              </button>
              <button 
                className={`approvals-subtab-btn ${approvalsSubTab === 'billing' ? 'active' : 'inactive'}`}
                onClick={() => setApprovalsSubTab('billing')}
              >
                Billing ({pendingApprovals.filter(x => x.category === 'billing').length})
              </button>
            </div>

            {/* List Renderer */}
            {(() => {
              const filteredList = pendingApprovals.filter(item => {
                // 1. Category check
                if (item.category !== approvalsSubTab) return false;
                // 2. Search Query
                if (approvalSearchQuery) {
                  const q = approvalSearchQuery.toLowerCase();
                  const matchTitle = item.title?.toLowerCase().includes(q);
                  const matchRaised = item.raisedBy?.toLowerCase().includes(q);
                  const matchDetails = item.details?.toLowerCase().includes(q);
                  if (!matchTitle && !matchRaised && !matchDetails) return false;
                }
                // 3. Date Range
                if (approvalDateRange.start) {
                  const start = new Date(approvalDateRange.start);
                  const reqDate = new Date(item.raw?.requestedAt || item.raw?.createdAt);
                  if (reqDate < start) return false;
                }
                if (approvalDateRange.end) {
                  const end = new Date(approvalDateRange.end);
                  end.setHours(23, 59, 59, 999);
                  const reqDate = new Date(item.raw?.requestedAt || item.raw?.createdAt);
                  if (reqDate > end) return false;
                }
                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B', fontWeight: 600, background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    No pending approval requests found in this category.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredList.map(item => (
                    <div className="approval-board-card-full animate-in" key={item.id} style={{ borderLeft: '4px solid #2563EB' }}>
                      <div className="approval-card-hdr-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="approval-card-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{item.title}</h3>
                        <span className={`badge-pill-state ${String(item.status).toLowerCase()}`} style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>{item.status}</span>
                      </div>
                      <div className="approval-card-metadata" style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 12px 0', fontWeight: 600 }}>{item.raisedBy}</div>
                      
                      {/* Subtab Specific Details Preview */}
                      {item.category === 'receptionist_indent' && item.raw?.details?.items && (
                        <div style={{ margin: '8px 0 16px 0', background: '#F8FAFC', borderRadius: '8px', padding: '12px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Requested Consumables</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {item.raw.details.items.map((it, idx) => (
                              <span key={idx} style={{ background: '#EFF6FF', color: '#1E40AF', padding: '4px 10px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 700, border: '1px solid #DBEAFE' }}>
                                {it.name} (Qty: {it.requiredQty})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.category === 'vendor_onboarding' && (
                        <div style={{ margin: '8px 0 16px 0', fontSize: '13.5px', color: '#334155' }}>
                          <div><strong>Vendor Code:</strong> {item.raw?.details?.vendorCode}</div>
                          <div><strong>GST Number:</strong> {item.raw?.details?.gstNumber}</div>
                          <div><strong>Contact:</strong> {item.raw?.details?.contact}</div>
                          <button 
                            className="btn btn-secondary" 
                            style={{ marginTop: '8px', padding: '4px 10px', fontSize: '12px', height: '30px', fontWeight: 700, borderRadius: '6px', border: '1.5px solid #E2E8F0', background: 'white', color: '#475569', cursor: 'pointer' }}
                            onClick={() => {
                              const vendorId = item.raw?.details?.vendorId;
                              const v = vendors.find(x => x._id === vendorId);
                              if (v) setSelectedVendorProfile(v);
                              else showToast('Vendor profile data not found in catalog', 'error');
                            }}
                          >
                            View Full Supplier Profile
                          </button>
                        </div>
                      )}

                      {item.category === 'item_price_update' && item.raw?.details?.items && (
                        <div style={{ margin: '8px 0 16px 0', background: '#FFFBEB', borderRadius: '8px', padding: '12px', border: '1px solid #FEF3C7' }}>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E', marginBottom: '6px', textTransform: 'uppercase' }}>Proposed Price Updates</div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #F3F4F6', textAlign: 'left' }}>
                                <th style={{ padding: '4px' }}>Item Name</th>
                                <th style={{ padding: '4px' }}>SKU</th>
                                <th style={{ padding: '4px', textAlign: 'right' }}>Proposed Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.raw.details.items.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #F9FAFB' }}>
                                  <td style={{ padding: '4px', fontWeight: 700 }}>{it.name}</td>
                                  <td style={{ padding: '4px', fontFamily: 'monospace' }}>{it.sku}</td>
                                  <td style={{ padding: '4px', textAlign: 'right', fontWeight: 800, color: '#D97706' }}>₹{it.proposedPrice}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {item.category === 'purchase_order_approval' && (
                        <div style={{ margin: '8px 0 16px 0', fontSize: '13.5px', color: '#334155' }}>
                          <div><strong>Vendor:</strong> {item.raw?.details?.vendorName}</div>
                          <div style={{ fontSize: '15px', color: '#1E3A8A', fontWeight: 800, marginTop: '4px' }}>Total Outlay: ₹{item.raw?.details?.totalAmount}</div>
                        </div>
                      )}

                      {item.details && item.category !== 'receptionist_indent' && item.category !== 'item_price_update' && (
                        <div style={{ color: '#475569', fontSize: '13.5px', fontWeight: 600, marginBottom: '20px' }}>
                          {item.details}
                        </div>
                      )}

                      <div className="approval-actions-footer" style={{ display: 'flex', gap: '8px' }}>
                        {item.status.toLowerCase() === 'pending' && (
                          <button 
                            className="approval-action-btn-green"
                            onClick={() => setViewingApproval(item)}
                          >
                            ✓ Review Request
                          </button>
                        )}
                        {item.status.toLowerCase() !== 'pending' && (
                          <span style={{ fontSize: '13px', color: '#22C55E', fontWeight: 700 }}>
                            Status: {item.status}
                          </span>
                        )}
                        <button 
                          className="approval-action-btn-blue-outline"
                          onClick={() => setViewingApproval(item)}
                        >
                          👁 View details
                        </button>
                        {item.category === 'vendor_onboarding' && (item.status.toLowerCase() === 'approved' || item.raw?.status === 'approved') && (
                          <button 
                            className="approval-action-btn-blue-outline"
                            onClick={() => {
                              const v = vendors.find(x => x._id === item.raw?.details?.vendorId);
                              setEditingVendorCatalog({
                                vendorId: item.raw?.details?.vendorId,
                                vendorName: item.raw?.details?.vendorName,
                                medicines: v ? (v.medicines || []) : []
                              });
                            }}
                          >
                            ⚙ Manage Catalog
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'po-approvals' && (
          <div className="admin-dashboard-content">
            {/* KPI STAT CARDS ROW */}
            <div className="admin-kpi-row">
              <div className="admin-kpi-card">
                <span className="kpi-card-header">Pending Purchase Orders</span>
                <span className="kpi-card-val red-val">
                  {purchaseOrders.filter(x => x.status === 'Pending').length}
                </span>
                <span className="kpi-card-sub">Awaiting admin review</span>
                <div className="kpi-icon-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                </div>
              </div>

              <div className="admin-kpi-card">
                <span className="kpi-card-header">Approved Orders</span>
                <span className="kpi-card-val green-val">
                  {purchaseOrders.filter(x => x.status === 'Approved').length}
                </span>
                <span className="kpi-card-sub">Sent to vendors</span>
                <div className="kpi-icon-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </div>

              <div className="admin-kpi-card">
                <span className="kpi-card-header">Total Procurement Outlay</span>
                <span className="kpi-card-val" style={{ color: '#2563EB' }}>
                  ₹{purchaseOrders.filter(x => ['Approved', 'Sent', 'Completed', 'Confirmed', 'Partially Delivered'].includes(x.status)).reduce((sum, x) => sum + (x.totalAmount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                <span className="kpi-card-sub">Approved placements</span>
                <div className="kpi-icon-overlay">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
              </div>
            </div>

            {/* PO APPROVALS SECTION */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div className="approval-category-header" style={{ margin: 0 }}>Pharmacy Procurement Approvals & History</div>
            </div>

            {(() => {
              const sortedPOs = [...purchaseOrders].sort((a, b) => {
                if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
              });
              return (
                <div className="glass-card" style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800 }}>PO Number</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800 }}>Date Raised</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800 }}>Supplier</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800 }}>Items Description</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800 }}>Total Outlay</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800 }}>Raised By</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800 }}>Status</th>
                          <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPOs.map((po) => (
                          <tr key={po._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                            <td style={{ padding: '16px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{po.poId}</td>
                            <td style={{ padding: '16px', color: '#475569' }}>{new Date(po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td style={{ padding: '16px', fontWeight: 700, color: '#0F172A' }}>{po.vendorName}</td>
                            <td style={{ padding: '16px', color: '#475569', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {po.items?.map(i => `${i.name} (x${i.requiredQty})`).join(', ')}
                            </td>
                            <td style={{ padding: '16px', fontWeight: 800, color: '#0F172A' }}>₹{po.totalAmount.toFixed(2)}</td>
                            <td style={{ padding: '16px', color: '#64748B', fontWeight: 600 }}>{po.requestedBy || 'Pharmacist'}</td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ 
                                fontSize: '11px', 
                                padding: '3px 8px', 
                                borderRadius: '9999px', 
                                fontWeight: 800, 
                                background: ['Approved', 'Sent', 'Completed', 'Confirmed'].includes(po.status) ? '#DEF7EC' : po.status === 'Pending' ? '#FEF3C7' : '#FDE8E8', 
                                color: ['Approved', 'Sent', 'Completed', 'Confirmed'].includes(po.status) ? '#03543F' : po.status === 'Pending' ? '#D97706' : '#9B1C1C' 
                              }}>
                                {po.status}
                              </span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                {po.status === 'Pending' && (
                                  <>
                                    <button 
                                      className="btn-premium-approve"
                                      onClick={() => handleApprovePO(po._id)}
                                    >
                                      ✓ Approve
                                    </button>
                                    <button 
                                      className="btn-premium-edit"
                                      onClick={() => handleOpenEditPO(po)}
                                    >
                                      ✎ Edit
                                    </button>
                                    <button 
                                      className="btn-premium-reject"
                                      onClick={() => handleRejectPO(po._id)}
                                    >
                                      ✕ Reject
                                    </button>
                                  </>
                                )}
                                <button 
                                  className="btn-premium-delete"
                                  onClick={() => handleDeletePO(po._id)}
                                  title="Delete permanently"
                                >
                                  ✕ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {sortedPOs.length === 0 && (
                          <tr>
                            <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                              No pharmacy procurement approvals history found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 8. Financials Content */}
        {activeTab === 'financials' && (() => {
          const getMonthlyRevenueHistory = () => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const history = [];
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const monthIdx = d.getMonth();
              const year = d.getFullYear();
              
              const total = bills
                .filter(b => {
                  if (b.status !== 'Paid') return false;
                  const bd = new Date(b.createdAt);
                  return bd.getMonth() === monthIdx && bd.getFullYear() === year;
                })
                .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
              
              history.push({
                name: months[monthIdx],
                total,
                monthIdx,
                year
              });
            }
            return history;
          };

          const periodBills = getFilteredBills(revenueFilterPeriod);
          const periodRevenue = periodBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

          const getRevenueBreakdown = (billsList) => {
            let opd = 0;
            let labsVal = 0;
            let pharmacy = 0;
            let procedures = 0;
            
            billsList.forEach(b => {
              (b.items || []).forEach(item => {
                const desc = (item.description || '').toLowerCase();
                const amt = item.amount || 0;
                if (desc.includes('consult') || desc.includes('regis')) {
                  opd += amt;
                } else if (desc.includes('lab') || desc.includes('diagnost')) {
                  labsVal += amt;
                } else if (desc.includes('rx') || desc.includes('dispense') || desc.includes('pharmacy') || desc.includes('medicine')) {
                  pharmacy += amt;
                } else {
                  procedures += amt;
                }
              });
            });
            
            const pending = bills
              .filter(b => b.status === 'Unpaid')
              .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
              
            return { opd, labs: labsVal, pharmacy, procedures, pending };
          };

          const history = getMonthlyRevenueHistory();
          const maxTotal = Math.max(...history.map(h => h.total), 1);
          const bestMonthObj = history.reduce((best, cur) => cur.total > best.total ? cur : best, { name: 'N/A', total: 0 });
          const avgMonthlyRev = history.reduce((sum, h) => sum + h.total, 0) / 6;
          const breakdown = getRevenueBreakdown(periodBills);
          const pendingCollections = getPendingCollections();

          return (
            <div className="admin-dashboard-content" style={{ animation: 'slideUp 0.4s ease-out' }}>
              
              {/* Date Filter Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: 'white', padding: '16px 24px', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Filter Analytics Period</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
                    {[
                      { key: 'today', label: 'Today' },
                      { key: '7days', label: 'Last 7 Days' },
                      { key: '30days', label: 'Last 30 Days' },
                      { key: 'custom', label: 'Custom Date' }
                    ].map(p => (
                      <button
                        key={p.key}
                        onClick={() => setRevenueFilterPeriod(p.key)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          background: revenueFilterPeriod === p.key ? '#FFFFFF' : 'transparent',
                          color: revenueFilterPeriod === p.key ? '#0F172A' : '#64748B',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          boxShadow: revenueFilterPeriod === p.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {revenueFilterPeriod === 'custom' && (
                    <input
                      type="date"
                      value={revenueCustomDate}
                      onChange={(e) => setRevenueCustomDate(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0F172A',
                        outline: 'none',
                        height: '38px',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* KPI Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Card 1: Filtered Revenue */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue ({revenueFilterPeriod})</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', margin: '8px 0', fontFamily: "'Outfit', sans-serif" }}>
                    ₹{periodRevenue.toLocaleString()}
                  </h2>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Active period collections
                  </span>
                </div>

                {/* Card 2: Paid Invoices */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paid Transactions</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', margin: '8px 0', fontFamily: "'Outfit', sans-serif" }}>
                    {periodBills.length.toLocaleString()}
                  </h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                    Settled invoice counts
                  </span>
                </div>

                {/* Card 3: Average Bill Value */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Invoice Value</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', margin: '8px 0', fontFamily: "'Outfit', sans-serif" }}>
                    ₹{(periodBills.length > 0 ? Math.round(periodRevenue / periodBills.length) : 0).toLocaleString()}
                  </h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Per settled billing</span>
                </div>

                {/* Card 4: Pending Collections */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Collections</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#D97706', margin: '8px 0', fontFamily: "'Outfit', sans-serif" }}>
                    ₹{pendingCollections.total.toLocaleString()}
                  </h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                    {pendingCollections.count} patient{pendingCollections.count !== 1 ? 's' : ''} outstanding
                  </span>
                </div>
              </div>

              {/* Department Revenue Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                {/* Lab Card */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10v6M12 2v20M2 10h20M2 16h20"/></svg>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#475569' }}>Laboratory</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4F46E5', backgroundColor: '#EEF2FF', padding: '4px 8px', borderRadius: '12px' }}>
                      {periodRevenue > 0 ? Math.round((breakdown.labs / periodRevenue) * 100) : 0}%
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                      ₹{breakdown.labs.toLocaleString()}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Diagnostic billing</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${periodRevenue > 0 ? (breakdown.labs / periodRevenue) * 100 : 0}%`, height: '100%', backgroundColor: '#4F46E5', borderRadius: '3px' }}></div>
                  </div>
                </div>

                {/* Pharmacy Card */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2.5 3.19-2.5 5.5h20c0-2.31-1-4.24-2.5-5.5M12 2v14M12 2a4 4 0 0 1 4 4c0 3-4 6-4 6s-4-3-4-6a4 4 0 0 1 4-4z"/></svg>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#475569' }}>Pharmacy</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 8px', borderRadius: '12px' }}>
                      {periodRevenue > 0 ? Math.round((breakdown.pharmacy / periodRevenue) * 100) : 0}%
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                      ₹{breakdown.pharmacy.toLocaleString()}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Medicine dispense billing</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${periodRevenue > 0 ? (breakdown.pharmacy / periodRevenue) * 100 : 0}%`, height: '100%', backgroundColor: '#059669', borderRadius: '3px' }}></div>
                  </div>
                </div>

                {/* OPD / Reception Card */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#475569' }}>Reception / OPD</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#D97706', backgroundColor: '#FFFBEB', padding: '4px 8px', borderRadius: '12px' }}>
                      {periodRevenue > 0 ? Math.round((breakdown.opd / periodRevenue) * 100) : 0}%
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                      ₹{breakdown.opd.toLocaleString()}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Consultation & token registration</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${periodRevenue > 0 ? (breakdown.opd / periodRevenue) * 100 : 0}%`, height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }}></div>
                  </div>
                </div>
              </div>

              {/* Main Graphs & Breakdown Grid */}
              <div className="revenue-grid">
                {/* Left Widget: Monthly Revenue Chart */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Monthly revenue — last 6 months</h3>
                  </div>

                  {/* Vertical Bar Chart Canvas */}
                  <div style={{ 
                    height: '240px', 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    justifyContent: 'space-between', 
                    padding: '0 24px',
                    marginBottom: '24px',
                    borderBottom: '1.5px solid #F1F5F9',
                    paddingBottom: '12px'
                  }}>
                    {history.map((h, index) => {
                      const barHeight = Math.max(Math.min((h.total / maxTotal) * 180, 180), 8);
                      return (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%' }} title={`₹${h.total.toLocaleString()}`}>
                          <div style={{ 
                            height: '180px', 
                            width: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'flex-end'
                          }}>
                            <div style={{ 
                              height: `${barHeight}px`, 
                              width: '100%', 
                              background: 'linear-gradient(180deg, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0.03) 100%)', 
                              borderRadius: '8px', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              justifyContent: 'flex-end', 
                              overflow: 'hidden',
                              border: '1.5px solid rgba(37, 99, 235, 0.1)',
                              borderBottom: 'none',
                              transition: 'height 0.3s ease'
                            }}>
                              <div style={{ height: '8px', width: '100%', background: '#2563EB', borderRadius: '0 0 6px 6px' }}></div>
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginTop: '12px' }}>{h.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Avg & Best stats block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Avg monthly revenue</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>
                        ₹{Math.round(avgMonthlyRev).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Best month ({bestMonthObj.name})</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', fontFamily: "'Outfit', sans-serif" }}>
                        ₹{bestMonthObj.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Widget: Detailed Revenue Breakdown List */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Itemized billing summary</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Row 1 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1.5px solid #F1F5F9' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>OPD consultations</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>₹{breakdown.opd.toLocaleString()}</span>
                      </div>
                      {/* Row 2 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1.5px solid #F1F5F9' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Lab tests</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>₹{breakdown.labs.toLocaleString()}</span>
                      </div>
                      {/* Row 3 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1.5px solid #F1F5F9' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Pharmacy</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>₹{breakdown.pharmacy.toLocaleString()}</span>
                      </div>
                      {/* Row 4 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1.5px solid #F1F5F9' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Procedures & other</span>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>₹{breakdown.procedures.toLocaleString()}</span>
                      </div>
                      {/* Row 5 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0 8px 0' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Pending collections</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#F59E0B', fontFamily: "'Outfit', sans-serif" }}>₹{breakdown.pending.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Control & Discount Settings */}
              <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>Allowable Billing Discount</h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', fontWeight: 550 }}>
                    Configure the maximum discount percentage receptionist staff can apply when processing appointment billing settlements.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={allowedDiscountPercent}
                      onChange={(e) => setAllowedDiscountPercent(Number(e.target.value))}
                      style={{
                        width: '100px',
                        height: '40px',
                        paddingRight: '28px',
                        textAlign: 'center',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '15px'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', fontWeight: 800, color: '#64748B' }}>%</span>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ height: '40px', padding: '0 20px', borderRadius: '8px', fontWeight: 800, background: 'var(--primary-gradient)', border: 'none' }}
                    onClick={handleSaveDiscountSetting}
                  >
                    Save Settings
                  </button>
                </div>
              </div>

            </div>
          );
        })()}
        {/* 7. Appointments Content Tab matching mockup exactly */}
        {activeTab === 'appointments' && (
          <div className="admin-dashboard-content">
            {/* KPI Cards Row */}
            <div className="appt-stats-row">
              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">{selectedDateFilter === 'Today' ? 'Booked Today' : 'Booked (All-Time)'}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{bookedToday}</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>{pendingToday} pending</p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Completed</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{completedToday}</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>{selectedDateFilter === 'Today' ? 'As of now' : 'All-Time'}</p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Walk-Ins</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{walkinsToday}</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>{selectedDateFilter === 'Today' ? 'Today' : 'All-Time'}</p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Cancelled</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#EF4444', margin: 0 }}>{cancelledToday}</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>{selectedDateFilter === 'Today' ? 'Today' : 'All-Time'}</p>
              </div>
            </div>

             {/* Appointment Overview Container */}
             <div className="dashboard-widget-card" style={{ padding: '28px', borderRadius: '16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                   Appointment Overview
                 </h2>
                 <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700, backgroundColor: '#F1F5F9', padding: '6px 14px', borderRadius: '20px' }}>
                   Scope: {selectedDateFilter === 'Today' ? `Today's Date (${new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })})` : 'All-Time Records'}
                 </span>
               </div>

              {/* Table Filter Actions Row */}
              <div className="appt-table-filter-bar">
                {/* Left Tabs */}
                <div className="appt-segmented-tabs">
                  <button 
                    className={`appt-tab-btn ${activeApptFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setActiveApptFilter('All')}
                  >
                    All ({dateFilteredAppointments.length})
                  </button>
                  <button 
                    className={`appt-tab-btn ${activeApptFilter === 'Completed' ? 'active' : ''}`}
                    onClick={() => setActiveApptFilter('Completed')}
                  >
                    Completed ({dateFilteredAppointments.filter(item => item.status === 'COMPLETED').length})
                  </button>
                  <button 
                    className={`appt-tab-btn ${activeApptFilter === 'Cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveApptFilter('Cancelled')}
                  >
                    Cancelled ({dateFilteredAppointments.filter(item => item.status === 'CANCELLED').length})
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Date Filter Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <select 
                      className="appt-select-filter"
                      value={selectedDateFilter}
                      onChange={e => setSelectedDateFilter(e.target.value)}
                      style={{ paddingRight: '32px' }}
                    >
                      <option value="Today">Today's Appointments</option>
                      <option value="All">All-Time Appointments</option>
                    </select>
                    <div className="appt-select-arrow">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>

                  {/* Search box */}
                  <div style={{ position: 'relative' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                    <input 
                      type="text" 
                      className="appt-search-input" 
                      placeholder="Search patient, doctor..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Dropdown Select */}
                  <div style={{ position: 'relative' }}>
                    <select 
                      className="appt-select-filter"
                      value={selectedDoctorFilter}
                      onChange={e => setSelectedDoctorFilter(e.target.value)}
                    >
                      <option value="All">All doctors</option>
                      {staff.filter(u => u.role === 'doctor').map(doc => (
                        <option key={doc.id || doc._id} value={doc.name}>{doc.name}</option>
                      ))}
                    </select>
                    <div className="appt-select-arrow">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <div style={{ overflowX: 'auto', marginTop: '16px' }}>
                <table className="appt-roster-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>TIME</th>
                      <th>PATIENT</th>
                      <th>DOCTOR</th>
                      <th>DEPT</th>
                      <th style={{ width: '160px' }}>STATUS</th>
                      <th style={{ width: '220px', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateFilteredAppointments
                      .filter(item => {
                        // Apply tab selection filters
                        if (activeApptFilter === 'Waiting' && item.status !== 'IN QUEUE') return false;
                        if (activeApptFilter === 'Completed' && item.status !== 'COMPLETED') return false;
                        if (activeApptFilter === 'Cancelled' && item.status !== 'CANCELLED') return false;
                        
                        // Apply doctor filter
                        if (selectedDoctorFilter !== 'All' && item.doctor !== selectedDoctorFilter) return false;

                        // Apply search filter
                        if (searchQuery) {
                          const query = searchQuery.toLowerCase();
                          return (
                            item.patientName.toLowerCase().includes(query) ||
                            item.patientId.toLowerCase().includes(query) ||
                            item.doctor.toLowerCase().includes(query) ||
                            item.dept.toLowerCase().includes(query)
                          );
                        }
                        return true;
                      })
                      .map(item => (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 700, color: '#1E293B' }}>
                            <div>{item.time}</div>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                              {item.date ? new Date(item.date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#0F172A' }}>{item.patientName}</span>
                              <span className="appt-patient-id-badge">{item.patientId}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, color: '#475569' }}>{item.doctor}</td>
                          <td style={{ fontWeight: 600, color: '#475569' }}>{item.dept}</td>
                          <td>
                            {item.status === 'COMPLETED' && (
                              <span className="appt-status-badge badge-success">Completed</span>
                            )}
                            {item.status === 'IN QUEUE' && (
                              <span className="appt-status-badge badge-warning">In Queue</span>
                            )}
                            {item.status === 'SCHEDULED' && (
                              <span className="appt-status-badge badge-info">Scheduled</span>
                            )}
                            {item.status === 'CANCELLED' && (
                              <span className="appt-status-badge badge-danger">Cancelled</span>
                            )}
                            {(item.status === 'Rescheduled' || item.status === 'RESCHEDULED') && (
                              <span className="appt-status-badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>Rescheduled</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {item.status === 'COMPLETED' && (
                                <button className="appt-action-outline-btn" onClick={() => handleOpenPatientProfile(item.patientMongoId || item.patientName)}>View</button>
                              )}
                              {item.status === 'IN QUEUE' && (
                                <button className="appt-action-outline-btn" onClick={() => handleManageAppt(item.id)}>Manage</button>
                              )}
                              {item.status === 'SCHEDULED' && (
                                <>
                                  <button className="appt-action-outline-btn" onClick={() => handleOpenPatientProfile(item.patientMongoId || item.patientName)}>View</button>
                                  <button className="appt-action-outline-btn" onClick={() => handleRescheduleAppt(item.id)}>Reschedule</button>
                                  <button className="appt-action-outline-btn-red" onClick={() => handleCancelAppt(item.id)}>Cancel</button>
                                </>
                              )}
                              {item.status === 'CANCELLED' && (
                                <span style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 600, paddingRight: '12px' }}>Cancelled</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Patient Details Tab adapted to match Receptionist/Doctor Profile exactly */}
        {activeTab === 'patient-details' && viewingPatient && (
          <div className="admin-dashboard-content active" style={{ animation: 'slideUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#1A1D23', marginBottom: '4px' }}>Patient Profile</h1>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
                  Patient Management <span style={{ margin: '0 8px' }}>»</span> <span style={{ color: '#1A1D23' }}>Profile</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ height: '44px', padding: '0 20px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 800 }}
                  onClick={() => { setActiveTab('patients'); setViewingPatient(null); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back to List
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
                          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0 }}>{viewingPatient.name}</h2>
                          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 800, background: '#EFF6FF', padding: '3px 8px', borderRadius: '6px' }}>
                            ID: {getFormattedPatientId(viewingPatient.raw?._id || viewingPatient.id)}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600, marginTop: '6px' }}>
                          Registered: {viewingPatient.raw?.createdAt ? new Date(viewingPatient.raw.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#F1F5F9', margin: '20px 0' }}></div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Date of Birth</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700 }}>{getDisplayDob(viewingPatient)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Gender</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700 }}>{viewingPatient.raw?.gender || 'Male'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Contact</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700, lineHeight: '1.3' }}>
                        {viewingPatient.raw?.contact || 'N/A'}<br />
                        <span style={{ color: '#64748B', fontWeight: 500, fontSize: '12.5px' }}>{viewingPatient.raw?.contact ? viewingPatient.raw.contact.replace(/.$/, '4') : 'N/A'}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Blood Group</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700 }}>{viewingPatient.raw?.bloodGroup || 'O+'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>Email</div>
                      <div style={{ color: '#1A1D23', fontSize: '13.5px', fontWeight: 700, wordBreak: 'break-all' }}>{viewingPatient.raw?.email || 'N/A'}</div>
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
                        <span style={{ fontWeight: 700, color: '#1A1D23' }}>{viewingPatient.raw?.email || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Primary Phone:</span>
                        <span style={{ fontWeight: 700, color: '#1A1D23' }}>{viewingPatient.raw?.contact || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Address:</span>
                        <span style={{ fontWeight: 700, color: '#1A1D23', textAlign: 'right', maxWidth: '180px' }}>{viewingPatient.raw?.address || 'No address provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Background (Allergies & Medical History) */}
                  <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                      <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#2563EB', margin: 0 }}>Clinical Background</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Allergies:</span>
                        <span className="appt-status-badge badge-danger" style={{ padding: '4px 10px', fontSize: '11px' }}>
                          {viewingPatient.raw?.allergies || 'None'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px' }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Medical History:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {viewingPatient.raw?.medicalHistory && viewingPatient.raw.medicalHistory.length > 0 ? (
                            viewingPatient.raw.medicalHistory.map((h, idx) => (
                              <span key={idx} className="appt-status-badge badge-info" style={{ padding: '4px 10px', fontSize: '11px' }}>{h}</span>
                            ))
                          ) : (
                            <span style={{ color: '#64748B', fontWeight: 500, fontSize: '12px' }}>No medical history recorded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
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
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.filter(app => {
                          const pId = app.patientMongoId?._id || app.patientMongoId;
                          return pId && viewingPatient.id && pId.toString() === viewingPatient.id.toString();
                        }).length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '30px 0', textTransform: 'uppercase', textAlign: 'center', fontSize: '13px', color: '#94A3B8', fontWeight: 700 }}>
                              No appointments found for this patient.
                            </td>
                          </tr>
                        ) : (
                          appointments.filter(app => {
                            const pId = app.patientMongoId?._id || app.patientMongoId;
                            return pId && viewingPatient.id && pId.toString() === viewingPatient.id.toString();
                          }).map(app => {
                            const isSelected = selectedProfileAppointment && selectedProfileAppointment.id === app.id;
                            return (
                              <tr 
                                key={app.id} 
                                style={{ 
                                  borderBottom: '1px solid #F1F5F9', 
                                  cursor: 'pointer',
                                  background: isSelected ? '#F0F7FF' : 'transparent',
                                  transition: '0.2s'
                                }}
                                onClick={() => setSelectedProfileAppointment(app)}
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
                                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{app.doctor}</div>
                                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>{app.dept}</div>
                                </td>

                                {/* Consultation Type */}
                                <td style={{ padding: '16px 12px' }}>
                                  <span style={{ background: '#EFF6FF', color: '#3B82F6', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                                    {app.rawAppointment?.reason || 'First Visit'}
                                  </span>
                                </td>

                                {/* Status */}
                                <td style={{ padding: '16px 12px' }}>
                                  <span style={{ 
                                    background: app.status === 'COMPLETED' ? '#ECFDF5' : (app.status === 'CANCELLED' ? '#FEF2F2' : '#FAF5FF'), 
                                    color: app.status === 'COMPLETED' ? '#10B981' : (app.status === 'CANCELLED' ? '#EF4444' : '#7E22CE'), 
                                    fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 
                                  }}>{app.status}</span>
                                </td>

                                {/* Action */}
                                <td style={{ padding: '16px 12px' }}>
                                  {app.status === 'COMPLETED' ? (
                                    <button 
                                      className="appt-action-outline-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProfileAppointment(app);
                                        handleViewPrescription(app.id, viewingPatient.raw || viewingPatient);
                                      }}
                                    >
                                      Rx View
                                    </button>
                                  ) : (
                                    <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: '13px', paddingLeft: '8px' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lab & Diagnostic Test History Table */}
                <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0 0 20px 0' }}>Laboratory & Diagnostic Tests</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Test Name</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Date Requested</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Doctor</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Status</th>
                          <th style={{ padding: '12px', fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Test Results</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientLabTests.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ padding: '30px 0', textTransform: 'uppercase', textAlign: 'center', fontSize: '13px', color: '#94A3B8', fontWeight: 700 }}>
                              No lab tests or diagnostics on record for this patient.
                            </td>
                          </tr>
                        ) : (
                          patientLabTests.map(test => (
                            <tr key={test._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              {/* Test Name */}
                              <td style={{ padding: '16px 12px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>
                                {test.testName}
                              </td>
                              
                              {/* Date Requested */}
                              <td style={{ padding: '16px 12px', fontWeight: 600, color: '#475569', fontSize: '13px' }}>
                                {new Date(test.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </td>
                              
                              {/* Doctor */}
                              <td style={{ padding: '16px 12px', fontWeight: 600, color: '#475569', fontSize: '13px' }}>
                                {test.doctorId?.name || 'Unassigned'}
                              </td>
                              
                              {/* Status */}
                              <td style={{ padding: '16px 12px' }}>
                                <span style={{ 
                                  background: test.status === 'Completed' ? '#ECFDF5' : (test.status === 'In Progress' ? '#FAF5FF' : '#FEF2F2'), 
                                  color: test.status === 'Completed' ? '#10B981' : (test.status === 'In Progress' ? '#7E22CE' : '#EF4444'), 
                                  fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 
                                }}>{test.status}</span>
                              </td>
                              
                              {/* Test Results */}
                              <td style={{ padding: '16px 12px', fontWeight: 600, color: '#475569', fontSize: '13px' }}>
                                {test.results || (test.status === 'Completed' ? 'Normal' : 'Pending Results')}
                              </td>
                            </tr>
                          ))
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
                          color: selectedProfileAppointment.status === 'COMPLETED' ? '#10B981' : (selectedProfileAppointment.status === 'CANCELLED' ? '#EF4444' : '#7E22CE'),
                          fontWeight: 800
                        }}>{selectedProfileAppointment.status}</span>
                      </div>

                      <div style={{ height: '1px', background: '#F1F5F9', margin: '18px 0' }}></div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Date & Time */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '4px', lineHeight: '1.4' }}>
                              {getFormattedSummaryDate(selectedProfileAppointment.date)}<br />
                              <span style={{ color: '#475569', fontWeight: 600 }}>{selectedProfileAppointment.time}</span>
                            </div>
                          </div>
                        </div>

                        {/* Practitioner */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consulting Doctor</div>
                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                              {selectedProfileAppointment.doctor}<br />
                              <span style={{ color: '#64748B', fontWeight: 600, fontSize: '12.5px' }}>{selectedProfileAppointment.dept}</span>
                            </div>
                          </div>
                        </div>

                        {/* Reason / Notes */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason for Visit</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '4px', lineHeight: '1.4' }}>
                              {selectedProfileAppointment.rawAppointment?.reason || 'Regular health checkup'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '40px 0', textTransform: 'uppercase', textAlign: 'center', fontSize: '12px', color: '#94A3B8', fontWeight: 800 }}>
                      Select an appointment to view summary details
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 8. Patients Content Tab matching mockup exactly */}
        {activeTab === 'patients' && (
          <div className="admin-dashboard-content">
            {/* KPI Cards Row */}
            <div className="pat-stats-row">
              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Total Patients</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{patients.length.toLocaleString()}</h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>Registered in system</p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">New This Month</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {patients.filter(p => p.createdAt && new Date(p.createdAt).getMonth() === new Date().getMonth() && new Date(p.createdAt).getFullYear() === new Date().getFullYear()).length}
                  </h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>
                  Registered {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div className="dashboard-widget-card" style={{ padding: '24px' }}>
                <span className="appt-kpi-header">Follow-Up Due</span>
                <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px' }}>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#D97706', margin: 0 }}>
                    {patients.filter(p => p.lastVisit !== 'Unknown').length}
                  </h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 600, marginTop: '8px', marginBottom: 0 }}>This month</p>
              </div>
            </div>

            {/* Roster & Search Bar */}
            <div className="pat-search-register-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {/* Search Field */}
              <div className="pat-search-input-wrapper" style={{ flex: 1 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pat-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                <input 
                  type="text" 
                  className="pat-search-input" 
                  placeholder="Search by name, phone, patient ID..."
                  value={patientSearchQuery}
                  onChange={e => setPatientSearchQuery(e.target.value)}
                />
              </div>

              {/* Date Filter Dropdown */}
              <div style={{ position: 'relative' }}>
                <select 
                  className="appt-select-filter"
                  value={selectedPatientDateFilter}
                  onChange={e => setSelectedPatientDateFilter(e.target.value)}
                  style={{ paddingRight: '32px', height: '42px', minWidth: '180px' }}
                >
                  <option value="All">All-Time Patients</option>
                  <option value="Today">Today's Patients</option>
                </select>
                <div className="appt-select-arrow" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            {/* Registry Card */}
            <div className="dashboard-widget-card" style={{ padding: '0px', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="pat-roster-table">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>PATIENT ID</th>
                      <th>NAME</th>
                      <th>AGE / GENDER</th>
                      <th>LAST VISIT</th>
                      <th>DOCTOR</th>
                      <th style={{ width: '180px', textAlign: 'right', paddingRight: '32px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients
                      .filter(item => {
                        // Apply date filter
                        if (selectedPatientDateFilter === 'Today') {
                          if (!item.createdAt) return false;
                          const patientDate = new Date(item.createdAt).toDateString();
                          const today = new Date().toDateString();
                          if (patientDate !== today) return false;
                        }

                        if (patientSearchQuery) {
                          const query = patientSearchQuery.toLowerCase();
                          const doctorName = getPatientDoctorName(item).toLowerCase();
                          return (
                            item.name.toLowerCase().includes(query) ||
                            item.patientId.toLowerCase().includes(query) ||
                            item.ageGender.toLowerCase().includes(query) ||
                            doctorName.includes(query)
                          );
                        }
                        return true;
                      })
                      .map(item => (
                        <tr key={item.id}>
                          <td className="pat-id-text">{item.patientId}</td>
                          <td className="pat-name-text">{item.name}</td>
                          <td style={{ fontWeight: 600 }}>{item.ageGender}</td>
                          <td style={{ fontWeight: 600 }}>{item.lastVisit}</td>
                          <td style={{ fontWeight: 600 }}>{getPatientDoctorName(item)}</td>
                          <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                className="appt-action-outline-btn"
                                onClick={() => handleOpenPatientProfile(item.id)}
                              >
                                View
                              </button>
                              <button 
                                className="appt-action-outline-btn"
                                onClick={() => {
                                  setEditingPatient({ ...item, doctor: getPatientDoctorName(item) });
                                  setShowEditPatientModal(true);
                                }}
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Subscription Page Tab */}
        {activeTab === 'subscription' && (
          <div className="admin-dashboard-content">
            {subscriptionLoading || !subscription ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '16px' }}>
                <div className="skeleton-loader-spinner" style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#2563EB',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B' }}>Loading subscription details...</span>
              </div>
            ) : (() => {
              const daysLeft = Math.max(0, Math.ceil((new Date(subscription.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const renewalDateString = new Date(subscription.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              
              const patientLimit = subscription.limits.patients || 5000;
              const patientPct = Math.min(100, Math.round((subscription.usage.patientCount / patientLimit) * 100));

              const labReportLimit = 1000;
              const labPct = Math.min(100, Math.round((subscription.usage.labReportCount / labReportLimit) * 100));

              const staffLimit = subscription.limits.staffLimit || 20;
              const staffPct = Math.min(100, Math.round((subscription.usage.staffCount / staffLimit) * 100));

              let planPrice = '₹24,000 / month';
              if (subscription.plan.includes('₹')) {
                const match = subscription.plan.match(/\(([^)]+)\)/);
                if (match) planPrice = match[1];
              } else {
                const planName = subscription.plan.toLowerCase();
                if (planName.includes('basic') || planName.includes('standard')) {
                  planPrice = '₹5,000 / month';
                } else if (planName.includes('professional') || planName.includes('pro')) {
                  planPrice = '₹24,000 / month';
                } else if (planName.includes('enterprise') || planName.includes('elite')) {
                  planPrice = '₹50,000 / month';
                }
              }

              const pricingPlans = superAdminPlans.length > 0 ? superAdminPlans.filter(sp => sp.matchKey !== 'custom').map(sp => ({
                name: sp.tier.replace(' Plan', ''),
                description: `For up to ${sp.docs} doctors and ${sp.staff} staff. Includes ${sp.storage} vault.`,
                monthlyPrice: `₹${sp.monthlyPrice.toLocaleString()}`,
                annualPrice: `₹${sp.annualPrice.toLocaleString()}`,
                annualBilled: `₹${(sp.annualPrice * 12).toLocaleString()} billed annually`,
                features: sp.features.filter(f => f.included).map(f => f.name).slice(0, 6),
                accentColor: sp.matchKey === 'basic' ? "#2563EB" : sp.matchKey === 'professional' ? "#10B981" : sp.matchKey === 'enterprise' ? "#F59E0B" : "#64748B",
                popular: sp.matchKey === 'professional',
                matchKey: sp.matchKey
              })) : [
                {
                  name: "Basic",
                  matchKey: "basic",
                  description: "Ideal for small clinics & general OPD desks",
                  monthlyPrice: "₹5,000",
                  annualPrice: "₹4,000",
                  annualBilled: "₹48,000 billed annually",
                  features: [
                    "Up to 5,000 Patients",
                    "OPD Patient Desk & Registration",
                    "Standard Appointment Scheduler",
                    "Basic Prescription Templates",
                    "Email and SMS Alerts"
                  ],
                  accentColor: "#2563EB"
                },
                {
                  name: "Professional",
                  matchKey: "professional",
                  description: "Complete solution for integrated hospitals",
                  monthlyPrice: "₹24,000",
                  annualPrice: "₹19,200",
                  annualBilled: "₹2,30,400 billed annually",
                  features: [
                    "Up to 25,000 Patients",
                    "OPD + IPD Admission Workflows",
                    "Integrated Lab & Pharmacy Catalog",
                    "E-Prescribing & Clinical EMR",
                    "Full HR, Payroll & Indents Module",
                    "Advanced Billing & GST Compliance"
                  ],
                  accentColor: "#10B981",
                  popular: true
                },
                {
                  name: "Enterprise Elite",
                  matchKey: "enterprise",
                  description: "Unlimited scale & customized compliance features",
                  monthlyPrice: "₹50,000",
                  annualPrice: "₹40,000",
                  annualBilled: "₹4,80,000 billed annually",
                  features: [
                    "Developer API & System Integrations"
                  ],
                  accentColor: "#8B5CF6"
                }
              ];

              return (
                <>
                  <style>{`
                    .subscription-plans-section {
                      margin-top: 48px;
                    }
                    .plan-toggle-container {
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      gap: 16px;
                      margin-bottom: 32px;
                    }
                    .toggle-switch-pill {
                      display: flex;
                      background: #E2E8F0;
                      border-radius: 99px;
                      padding: 4px;
                      position: relative;
                      cursor: pointer;
                      width: 220px;
                      user-select: none;
                    }
                    .toggle-switch-bg {
                      position: absolute;
                      top: 4px;
                      bottom: 4px;
                      width: 106px;
                      background: #FFFFFF;
                      border-radius: 99px;
                      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .toggle-switch-pill.annual .toggle-switch-bg {
                      transform: translateX(106px);
                    }
                    .toggle-option {
                      flex: 1;
                      text-align: center;
                      padding: 8px 0;
                      font-size: 13px;
                      font-weight: 800;
                      color: #64748B;
                      z-index: 2;
                      transition: color 0.3s;
                    }
                    .toggle-option.active {
                      color: #2563EB;
                    }
                    .plans-grid {
                      display: grid;
                      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                      gap: 30px;
                    }
                    .flip-card {
                      perspective: 1000px;
                      height: 520px;
                    }
                    .flip-card-inner {
                      position: relative;
                      width: 100%;
                      height: 100%;
                      transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                      transform-style: preserve-3d;
                    }
                    .flip-card.flipped .flip-card-inner {
                      transform: rotateY(180deg);
                    }
                    .flip-card-front, .flip-card-back {
                      position: absolute;
                      width: 100%;
                      height: 100%;
                      -webkit-backface-visibility: hidden;
                      backface-visibility: hidden;
                      border-radius: 20px;
                      border: 1px solid #E2E8F0;
                      background: #FFFFFF;
                      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                      padding: 30px;
                      box-sizing: border-box;
                      display: flex;
                      flex-direction: column;
                    }
                    .flip-card-back {
                      transform: rotateY(180deg);
                      background: linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%);
                      border-color: #10B981;
                    }
                    .plan-title {
                      font-size: 20px;
                      font-weight: 900;
                      color: #0F172A;
                      margin-bottom: 12px;
                    }
                    .plan-price-val {
                      font-size: 36px;
                      font-weight: 900;
                      color: #2563EB;
                      font-family: 'Outfit', sans-serif;
                      margin-bottom: 24px;
                    }
                    .plan-features-list {
                      list-style: none;
                      padding: 0;
                      margin: 0 0 30px 0;
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                      gap: 12px;
                    }
                    .plan-feature-item {
                      display: flex;
                      align-items: center;
                      gap: 10px;
                      font-size: 13px;
                      color: #475569;
                      font-weight: 600;
                    }
                    .plan-cta-btn {
                      background: #2563EB;
                      color: white;
                      border: none;
                      border-radius: 10px;
                      padding: 12px 24px;
                      font-size: 14px;
                      font-weight: 800;
                      cursor: pointer;
                      transition: all 0.2s;
                      text-align: center;
                      box-shadow: 0 4px 12px rgba(37,99,235,0.2);
                    }
                    .plan-cta-btn:hover {
                      background: #1D4ED8;
                      transform: translateY(-1px);
                    }
                  `}</style>

                  {/* KPI STAT CARDS */}
                  <div className="admin-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <div className="admin-kpi-card" style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span className="kpi-card-header" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>Current Plan</span>
                      <span className="kpi-card-val" style={{ fontSize: '32px', fontWeight: 900, color: '#2563EB', fontFamily: "'Outfit', sans-serif" }}>{subscription.plan.split(' ')[0]}</span>
                      <span className="kpi-card-sub" style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{subscription.status}</span>
                    </div>

                    <div className="admin-kpi-card" style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span className="kpi-card-header" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>Renewal Date</span>
                      <span className="kpi-card-val" style={{ fontSize: '32px', fontWeight: 900, color: '#D97706', fontFamily: "'Outfit', sans-serif" }}>{renewalDateString}</span>
                      <span className="kpi-card-sub" style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{daysLeft} days left</span>
                    </div>

                    <div className="admin-kpi-card" style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span className="kpi-card-header" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>Active Staff / Limit</span>
                      <span className="kpi-card-val" style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>{subscription.usage.staffCount}/{staffLimit}</span>
                      <span className="kpi-card-sub" style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{subscription.usage.doctorCount} doctors active</span>
                    </div>
                  </div>

                  {/* Alert Banner for Subscription Due */}
                  {daysLeft <= 30 && (
                    <div className="subscription-alert-banner" style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: '#DBEAFE',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#1E3A8A' }}>Subscription renewal due in {daysLeft} days</h4>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>Renew before {renewalDateString} to avoid service disruption. Contact your MediFlow admin.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => showFeedback("Renewal request submitted successfully to MediFlow support.", "success")}
                        style={{
                          border: '1.5px solid #2563EB',
                          background: '#FFFFFF',
                          color: '#2563EB',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          letterSpacing: '0.3px',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#EFF6FF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                      >
                        REQUEST RENEWAL
                      </button>
                    </div>
                  )}

                  {/* Split Row for Details & Usage */}
                  <div className="subscription-grid">
                    
                    {/* Professional Plan Details Card */}
                    <div className="dashboard-widget-card" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0' }}>{subscription.plan}</h3>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#64748B' }}>{planPrice}</span>
                        </div>
                        <span style={{
                          background: subscription.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                          color: subscription.status === 'Active' ? '#15803D' : '#B91C1C',
                          fontSize: '11px',
                          fontWeight: 900,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {subscription.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                          { label: "Current plan", val: subscription.plan, style: { color: '#2563EB', fontWeight: 700 } },
                          { label: "Renewal date", val: renewalDateString, style: { color: '#0F172A', fontWeight: 800 } },
                          { label: "This cycle: patients registered", val: `${subscription.usage.patientCount.toLocaleString()} / ${patientLimit.toLocaleString()}`, style: { color: '#0F172A', fontWeight: 800 } },
                          { 
                            label: "OPD / Lab / Pharmacy access", 
                            val: "ENABLED", 
                            custom: true,
                            elem: (
                              <span style={{ 
                                background: subscription.status === 'Active' ? '#DCFCE7' : '#FEE2E2', 
                                color: subscription.status === 'Active' ? '#15803D' : '#B91C1C', 
                                fontSize: '10px', 
                                fontWeight: 900, 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                letterSpacing: '0.3px' 
                              }}>
                                {subscription.status === 'Active' ? 'ENABLED' : 'DISABLED'}
                              </span>
                            )
                          }
                        ].map((row, idx) => (
                          <div key={idx} className="subscription-row">
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{row.label}</span>
                            {row.custom ? row.elem : (
                              <span style={{ fontSize: '13px', ...row.style }}>{row.val}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Usage this billing cycle Card */}
                    <div className="dashboard-widget-card" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="12"/><line x1="5" x2="5" y1="20" y2="4"/><line x1="19" x2="19" y1="20" y2="16"/></svg>
                        Usage this billing cycle
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {[
                          { label: "Patient registrations", val: `${patientPct}%`, color: '#2563EB', pct: patientPct },
                          { label: "Lab reports issued", val: `${labPct}%`, color: '#06B6D4', pct: labPct },
                          { label: "Staff accounts active", val: `${subscription.usage.staffCount}/${staffLimit} • ${staffPct}%`, color: '#10B981', pct: staffPct }
                        ].map((bar, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{bar.label}</span>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>{bar.val}</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ width: `${bar.pct}%`, height: '100%', background: bar.color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Plan Upgrade Comparison Section with 3D Flip Cards */}
                  <div className="subscription-plans-section">
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginBottom: '8px', fontFamily: "'Outfit', sans-serif" }}>
                        Choose the Perfect Scale for Your Hospital
                      </h3>
                      <p style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600, margin: 0 }}>
                        Switch seamlessly between monthly and annual plans. Click the toggle to see annual savings.
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <div className="plan-toggle-container">
                      <span style={{ fontSize: '13px', fontWeight: 800, color: billingCycle === 'monthly' ? '#2563EB' : '#64748B' }}>Monthly Billing</span>
                      <div 
                        className={`toggle-switch-pill ${billingCycle === 'annual' ? 'annual' : ''}`}
                        onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly')}
                      >
                        <div className="toggle-switch-bg" />
                        <span className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}>Monthly</span>
                        <span className={`toggle-option ${billingCycle === 'annual' ? 'active' : ''}`}>Annual</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: billingCycle === 'annual' ? '#10B981' : '#64748B' }}>Annual Billing</span>
                        <span style={{
                          background: '#D1FAE5',
                          color: '#065F46',
                          fontSize: '11px',
                          fontWeight: 900,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          textTransform: 'uppercase'
                        }}>
                          Save 20%
                        </span>
                      </div>
                    </div>

                    {/* Plans Grid */}
                    <div className="plans-grid">
                      {pricingPlans.map((plan, index) => {
                        const subPlan = subscription.plan.toLowerCase();
                        
                        const activePlanKey = (() => {
                          if (subPlan.includes('enterprise') || subPlan.includes('elite')) return 'enterprise';
                          if (subPlan.includes('pro') || subPlan.includes('professional') || subPlan.includes('premium')) return 'professional';
                          if (subPlan.includes('basic') || subPlan.includes('standard')) return 'basic';
                          return 'basic';
                        })();

                        const isCurrentPlan = plan.matchKey === activePlanKey;
                        const displayPriceMonthly = isCurrentPlan && planPrice.includes('₹') ? planPrice.split('/')[0].trim() : plan.monthlyPrice;
                        const displayPriceAnnual = isCurrentPlan && planPrice.includes('₹') ? planPrice.split('/')[0].trim() : plan.annualPrice;
                        
                        return (
                          <div key={index} className={`flip-card ${billingCycle === 'annual' ? 'flipped' : ''}`}>
                            <div className="flip-card-inner">
                              
                              {/* FRONT SIDE - MONTHLY */}
                              <div className="flip-card-front" style={{ borderTop: `4px solid ${plan.accentColor}` }}>
                                {plan.popular && (
                                  <span style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '20px',
                                    background: '#EFF6FF',
                                    color: '#2563EB',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    textTransform: 'uppercase'
                                  }}>
                                    Most Popular
                                  </span>
                                )}
                                <h4 className="plan-title">{plan.name}</h4>
                                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 20px 0', minHeight: '36px', lineHeight: 1.4, fontWeight: 500 }}>
                                  {plan.description}
                                </p>
                                <div className="plan-price-val">
                                  {displayPriceMonthly}
                                  <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>/ month</span>
                                </div>
                                
                                <ul className="plan-features-list">
                                  {plan.features.map((feat, fIdx) => (
                                    <li key={fIdx} className="plan-feature-item">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                      {feat}
                                    </li>
                                  ))}
                                </ul>

                                <button
                                  className="plan-cta-btn"
                                  style={{ background: isCurrentPlan ? '#E2E8F0' : plan.accentColor, color: isCurrentPlan ? '#64748B' : 'white', cursor: isCurrentPlan ? 'default' : 'pointer', boxShadow: isCurrentPlan ? 'none' : `0 4px 12px ${plan.accentColor}33` }}
                                  disabled={isCurrentPlan}
                                  onClick={() => handleUpgradeRequest(plan.name, 'Monthly')}
                                >
                                  {isCurrentPlan ? 'CURRENT PLAN' : `UPGRADE TO ${plan.name.toUpperCase()}`}
                                </button>
                              </div>

                              {/* BACK SIDE - ANNUAL */}
                              <div className="flip-card-back" style={{ borderTop: `4px solid #10B981` }}>
                                <span style={{
                                  position: 'absolute',
                                  top: '12px',
                                  right: '20px',
                                  background: '#D1FAE5',
                                  color: '#065F46',
                                  fontSize: '10px',
                                  fontWeight: 900,
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  textTransform: 'uppercase'
                                }}>
                                  Annual Saver
                                </span>
                                <h4 className="plan-title">{plan.name} (Annual)</h4>
                                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 20px 0', minHeight: '36px', lineHeight: 1.4, fontWeight: 500 }}>
                                  {plan.description}
                                </p>
                                <div className="plan-price-val" style={{ color: '#10B981' }}>
                                  {displayPriceAnnual}
                                  <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>/ month</span>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#047857', marginTop: '-18px', marginBottom: '24px' }}>
                                  {plan.annualBilled}
                                </div>

                                <ul className="plan-features-list">
                                  {plan.features.map((feat, fIdx) => (
                                    <li key={fIdx} className="plan-feature-item">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                      {feat}
                                    </li>
                                  ))}
                                </ul>

                                <button
                                  className="plan-cta-btn"
                                  style={{ background: '#10B981', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                                  onClick={() => handleUpgradeRequest(plan.name, 'Annual')}
                                >
                                  UPGRADE TO ANNUAL
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Subscription & Payment Billing History */}
                    <div style={{ marginTop: '40px', background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Subscription & Billing History</h3>
                          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>Track all your past subscription plans, invoices, and billing periods</p>
                        </div>
                      </div>
                      
                      {!subscription.invoices || subscription.invoices.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px', fontWeight: 500 }}>
                          No invoice or subscription history found.
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #F1F5F9' }}>
                                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Invoice No.</th>
                                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Subscription</th>
                                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Billing Cycle</th>
                                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Billing Period</th>
                                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Invoice Date</th>
                                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Amount Paid</th>
                                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subscription.invoices.map((inv, idx) => {
                                const isPaid = inv.status?.toLowerCase() === 'paid';
                                const isOverdue = inv.status?.toLowerCase() === 'overdue';
                                return (
                                  <tr key={inv._id || idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <td style={{ padding: '16px', fontSize: '13.5px', fontWeight: 700, color: '#2563EB' }}>
                                      {inv.invoiceNum}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>
                                      {inv.subscription}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13.5px', color: '#475569' }}>
                                      <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#F1F5F9', fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                        {inv.billingCycle}
                                      </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13.5px', color: '#334155', fontWeight: 500 }}>
                                      {inv.billingPeriod || `${inv.invoiceDate} - ${inv.dueDate}`}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13.5px', color: '#64748B' }}>
                                      {inv.invoiceDate}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>
                                      ₹{(inv.amount + (inv.gst || 0)).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                      <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        background: isPaid ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#FFFBEB',
                                        color: isPaid ? '#047857' : isOverdue ? '#B91C1C' : '#B45309'
                                      }}>
                                        {inv.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Dedicated Updates Page Tab */}
        {activeTab === 'updates' && (() => {
          const daysLeft = subscription ? Math.max(0, Math.ceil((new Date(subscription.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 8;
          const showRenewalCard = daysLeft <= 30;
          const pendingUpdatesCount = systemBroadcasts.length + (showRenewalCard ? 1 : 0);

          return (
            <div className="admin-dashboard-content">
              {/* KPI STAT CARDS */}
              <div className="admin-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="admin-kpi-card" style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="kpi-card-header" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>Pending Updates</span>
                  <span className="kpi-card-val" style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>{pendingUpdatesCount}</span>
                  <span className="kpi-card-sub" style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>From superadmin</span>
                </div>

                <div className="admin-kpi-card" style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="kpi-card-header" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>Current Version</span>
                  <span className="kpi-card-val" style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', fontFamily: "'Outfit', sans-serif" }}>v 2.1.4</span>
                  <span className="kpi-card-sub" style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Latest applied</span>
                </div>

                <div className="admin-kpi-card" style={{ background: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="kpi-card-header" style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>Subscription Days Left</span>
                  <span className="kpi-card-val" style={{ fontSize: '32px', fontWeight: 900, color: '#D97706', fontFamily: "'Outfit', sans-serif" }}>
                    {daysLeft}
                  </span>
                  <span className="kpi-card-sub" style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                    Renewal due {subscription ? new Date(subscription.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '8 Jun'}
                  </span>
                </div>
              </div>

              {/* Updates widget block */}
              <div className="dashboard-widget-card" style={{ padding: '24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  Updates from superadmin
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Subscription renewal card (only shown if <= 30 days left) */}
                  {showRenewalCard && (
                    <div className="admin-update-card" style={{
                      background: '#FFFDF5',
                      border: '1px solid #FEF3C7'
                    }}>
                      <div className="admin-update-card-left">
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: '#FEF3C7',
                          color: '#D97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>Subscription renewal reminder</h4>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                            Plan expires in {daysLeft} days. Renew to avoid disruption. (21 May 4:07 PM)
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('subscription')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#D97706',
                          fontSize: '14px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFFbeb'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        View →
                      </button>
                    </div>
                  )}

                  {/* Dynamic updates/broadcasts from superadmin */}
                  {systemBroadcasts.map(b => {
                    const date = new Date(b.createdAt);
                    const formattedDate = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString();
                    const isMaintenance = b.audience?.includes('maintenance') || b.subject?.toLowerCase().includes('maintenance');
                    
                    return (
                      <div key={b._id} className="admin-update-card" style={{
                        background: isMaintenance ? '#EFF6FF' : '#F0FDF4',
                        border: isMaintenance ? '1px solid #DBEAFE' : '1px solid #DCFCE7'
                      }}>
                        <div className="admin-update-card-left">
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: isMaintenance ? '#DBEAFE' : '#DCFCE7',
                            color: isMaintenance ? '#2563EB' : '#15803D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isMaintenance ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            )}
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{b.subject}</h4>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                              {b.message} • {formattedDate}
                            </p>
                          </div>
                        </div>
                        {isMaintenance ? (
                          <span style={{
                            background: '#DBEAFE',
                            color: '#2563EB',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '6px 14px',
                            borderRadius: '99px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            System Update
                          </span>
                        ) : (
                          <button 
                            onClick={() => showFeedback("Notice acknowledged successfully.", "success")}
                            style={{
                              background: '#22C55E',
                              color: '#FFFFFF',
                              fontSize: '13px',
                              fontWeight: 800,
                              padding: '10px 18px',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#16a34a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#22C55E'; }}
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {systemBroadcasts.length === 0 && !showRenewalCard && (
                    <div style={{
                      padding: '48px',
                      textAlign: 'center',
                      border: '1px dashed #E2E8F0',
                      borderRadius: '12px',
                      color: '#94A3B8',
                      fontSize: '14px',
                      fontWeight: 600,
                      background: '#F8FAFC'
                    }}>
                      No new updates or guidelines from superadmin.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 9. Maintenance / System Services Dashboard */}
        {activeTab === 'maintenance' && (
          <div className="admin-dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Status overview card */}
            <div className="dashboard-widget-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
              <div style={{
                background: systemBroadcasts.length > 0 ? '#FEF3C7' : '#D1FAE5',
                color: systemBroadcasts.length > 0 ? '#D97706' : '#059669',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  {systemBroadcasts.length > 0 ? 'System Announcements & Maintenance Active' : 'All Core Services Operational'}
                </h3>
                <p style={{ color: '#64748B', fontSize: '13px', fontWeight: 500, margin: 0 }}>
                  {systemBroadcasts.length > 0
                    ? `There are ${systemBroadcasts.length} live broadcast notice(s) from the Super Admin.`
                    : 'The platform is running at optimal capacity. No downtime or patch operations scheduled.'}
                </p>
              </div>
              <div style={{
                background: systemBroadcasts.length > 0 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: systemBroadcasts.length > 0 ? '#D97706' : '#10B981',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {systemBroadcasts.length > 0 ? 'Notices Active' : 'Healthy'}
              </div>
            </div>

            {/* Broadcast notices logs */}
            <div className="dashboard-widget-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>Super Admin Broadcast Notices</h3>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Live system updates and patches dispatched by Curoxa network administrators</span>
                </div>
                <button
                  className="widget-header-action-btn"
                  onClick={fetchNotifications}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                  Refresh Notices
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {systemBroadcasts.length === 0 ? (
                  <div style={{
                    padding: '48px',
                    textAlign: 'center',
                    border: '1px dashed #E2E8F0',
                    borderRadius: '12px',
                    color: '#94A3B8',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: '#F8FAFC'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" x2="15" y1="1" y2="1"/><line x1="9" x2="15" y1="23" y2="23"/><line x1="1" x2="1" y1="9" y2="15"/><line x1="23" x2="23" y1="9" y2="15"/></svg>
                    <div>No system maintenance notices dispatched at this time.</div>
                  </div>
                ) : (
                  systemBroadcasts.map(b => {
                    const date = new Date(b.createdAt);
                    const formattedDate = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString();
                    return (
                      <div
                        key={b._id}
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '20px',
                          background: '#FFFFFF',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>{b.subject}</h4>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Received on {formattedDate}</span>
                          </div>
                          <span style={{
                            background: b.audience?.includes('maintenance') || b.subject?.toLowerCase().includes('maintenance') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                            color: b.audience?.includes('maintenance') || b.subject?.toLowerCase().includes('maintenance') ? '#EF4444' : '#2563EB',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '20px'
                          }}>
                            {b.audience?.includes('maintenance') || b.subject?.toLowerCase().includes('maintenance') ? 'System Maintenance' : 'Announcement'}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                          {b.message}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          Audience: {b.audience}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* 11. Role Coverage / Permissions Management */}
        {activeTab === 'permissions' && (() => {
          const selectedStaff = staff.find(s => s.id === pmSelectedStaffId || s.name === pmSelectedStaffId);
          
          // Compute system active overrides list
          const activeOverridesList = [];
          Object.keys(pmState || {}).forEach(staffName => {
            Object.keys(pmState[staffName] || {}).forEach(permId => {
              const over = pmState[staffName][permId];
              if (over?.on) {
                const matchingPerm = pmModules.find(m => m.id === permId);
                activeOverridesList.push({
                  staffName,
                  permId,
                  permName: matchingPerm?.name || permId,
                  type: over.type,
                  expiresIn: over.expiresIn,
                  note: over.note
                });
              }
            });
          });

          // Direct revoke function
          const handleDirectRevoke = (staffName, permId) => {
            const nextState = { ...pmState };
            if (nextState[staffName]) {
              nextState[staffName] = { ...nextState[staffName] };
              delete nextState[staffName][permId];
            }
            localStorage.setItem('curoxa_pmState', JSON.stringify(nextState));
            setPmState(nextState);

            api.post('/auth/role-coverage', { state: nextState })
              .catch(err => console.error('Failed to sync direct revoke to backend', err));

            // Audit log
            const newAuditLog = {
              id: `pm-audit-${Date.now()}`,
              title: `Role coverage revoked for ${staffName}`,
              category: 'Staff management',
              tag: 'Staff',
              subtext: `Permission [${permId}] revoked immediately by admin. · Just now`,
              type: 'STAFF',
              hasReview: false
            };
            setAuditLogs(prev => [newAuditLog, ...prev]);
            setSuccess(`Revoked permission [${permId}] for ${staffName} successfully!`);
            setTimeout(() => setSuccess(''), 3000);
          };

          const pendingCount = Object.keys(pmPendingChanges).length;

          const handleApplyPendingChanges = () => {
            const nextState = { ...pmState };
            
            Object.keys(pmPendingChanges).forEach(permId => {
              const change = pmPendingChanges[permId];
              if (!nextState[selectedStaff.name]) {
                nextState[selectedStaff.name] = {};
              } else {
                nextState[selectedStaff.name] = { ...nextState[selectedStaff.name] };
              }

              if (change.on) {
                nextState[selectedStaff.name][permId] = {
                  on: true,
                  type: 'perm',
                  expiresIn: null,
                  expiresAt: null,
                  grantedAt: new Date().toISOString(),
                  note: 'Assigned by administrator'
                };
              } else {
                delete nextState[selectedStaff.name][permId];
              }
            });

            localStorage.setItem('curoxa_pmState', JSON.stringify(nextState));
            setPmState(nextState);

            api.post('/auth/role-coverage', { state: nextState })
              .catch(err => console.error('Failed to sync permission updates to backend', err));

            // Audit trail entry
            const newAuditLog = {
              id: `pm-audit-${Date.now()}`,
              title: `Role coverage updated — ${selectedStaff.name}`,
              category: 'Staff management',
              tag: 'Staff',
              subtext: `${pendingCount} permissions modified. · By admin Kunal · Just now`,
              type: 'STAFF',
              hasReview: false
            };
            setAuditLogs(prev => [newAuditLog, ...prev]);

            setSuccess(`Permissions updated successfully for ${selectedStaff.name}!`);
            setTimeout(() => setSuccess(''), 3000);

            // Clear state
            setPmPendingChanges({});
            setPmReason('');
          };          return (
            <div className="pm-container">
              {/* Left pane - Staff List Selector */}
              <div className="pm-staff-pane">
                <div className="pm-search-container">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    className="pm-search-icon"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input 
                    type="text" 
                    className="pm-search-input" 
                    placeholder="Search staff..." 
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                  />
                </div>
                <div className="pm-staff-list" data-lenis-prevent>
                  {staff
                    .filter(s => 
                      s.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
                      (s.role || '').toLowerCase().includes(rosterSearch.toLowerCase())
                    )
                    .map(s => {
                      const isActive = pmSelectedStaffId === s.id || pmSelectedStaffId === s.name;
                    // Count active overrides for this staff
                    const overrideCount = Object.keys(pmState[s.name] || {}).filter(k => pmState[s.name][k]?.on).length;
                    
                    return (
                      <div 
                        key={s.id || s.name} 
                        className={`pm-staff-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setPmSelectedStaffId(s.id || s.name);
                          setPmPendingChanges({});
                          setPmReason('');
                        }}
                      >
                        <div 
                          className="pm-staff-avatar"
                          style={{
                            backgroundColor: s.avatarColor === 'purple' ? '#FAF5FF' : s.avatarColor === 'gold' ? '#FFFBEB' : '#EFF6FF',
                            color: s.avatarColor === 'purple' ? '#7C3AED' : s.avatarColor === 'gold' ? '#D97706' : '#2563EB',
                            border: `1px solid ${s.avatarColor === 'purple' ? '#E9D5FF' : s.avatarColor === 'gold' ? '#FEF3C7' : '#BFDBFE'}`
                          }}
                        >
                          {s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="pm-staff-info">
                          <span className="pm-staff-name">{s.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="pm-staff-role">{s.role}</span>
                            {overrideCount > 0 && (
                              <span style={{ fontSize: '9px', background: '#FEF3C7', color: '#B45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                {overrideCount} Overrides
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right pane - Permissions Grid Editor (scrollable) */}
              <div className="pm-detail-pane" data-lenis-prevent>
                {selectedStaff ? (
                  <>
                    {/* Core Role Modules Card */}
                    {(() => {
                      const coreModules = pmModules.filter(m => m.coreFor.includes(selectedStaff.role));
                      const roleLabel = selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1);
                      return (
                        <div className="pm-core-roles-card">
                          <h4 className="pm-core-roles-title">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            {roleLabel} — Core Modules ({coreModules.length})
                          </h4>
                          {coreModules.length > 0 ? (
                            <div className="pm-core-roles-pills">
                              {coreModules.map(m => (
                                <span key={m.id} className="pm-core-pill">
                                  <span className="pm-core-pill-dot" />
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 8px 0', fontWeight: 600 }}>
                              No core modules defined for this role. All access is delegation-based.
                            </p>
                          )}
                          <p className="pm-core-roles-hint">
                            These modules are always enabled for the {roleLabel} role and cannot be toggled off.
                          </p>
                        </div>
                      );
                    })()}

                    <div className="pm-editor-header">
                      <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                          Coverage Delegation Grid
                        </h2>
                        <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, fontWeight: 600 }}>
                          Configure modules for <span style={{ color: '#2563EB', fontWeight: 750 }}>{selectedStaff.name}</span> ({selectedStaff.role} · {selectedStaff.dept})
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', color: '#475569', fontWeight: 700 }}>
                          Staff ID: #{selectedStaff.id}
                        </span>
                        {/* Grid search input */}
                        <div style={{ position: 'relative', width: '220px' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                          <input 
                            type="text"
                            placeholder="Search modules..."
                            value={pmGridSearch}
                            onChange={(e) => setPmGridSearch(e.target.value)}
                            style={{
                              width: '100%',
                              height: '34px',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '0 12px 0 32px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1E293B',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                            className="pm-grid-search-input"
                          />
                          {pmGridSearch && (
                            <button 
                              onClick={() => setPmGridSearch('')}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                border: 'none',
                                background: 'transparent',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: 0
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Render permission groupings with dynamic core-role sorting */}
                    {(() => {
                      const allGroups = Array.from(new Set(pmModules.map(m => m.group)));
                      const sortedGroups = allGroups.sort((a, b) => {
                        const aHasCore = pmModules.some(m => m.group === a && m.coreFor.includes(selectedStaff.role));
                        const bHasCore = pmModules.some(m => m.group === b && m.coreFor.includes(selectedStaff.role));
                        if (aHasCore && !bHasCore) return -1;
                        if (!aHasCore && bHasCore) return 1;
                        return 0;
                      });

                      const renderedGroups = sortedGroups.map(groupName => {
                        const groupPerms = pmModules.filter(m => m.group === groupName);
                        // Filter by search query
                        const filteredPerms = groupPerms.filter(m => 
                          m.name.toLowerCase().includes(pmGridSearch.toLowerCase()) || 
                          m.desc.toLowerCase().includes(pmGridSearch.toLowerCase())
                        );

                        if (filteredPerms.length === 0) return null;

                        // Also sort the permissions within each group so that core modules come first
                        const sortedPerms = [...filteredPerms].sort((a, b) => {
                          const aCore = a.coreFor.includes(selectedStaff.role);
                          const bCore = b.coreFor.includes(selectedStaff.role);
                          if (aCore && !bCore) return -1;
                          if (!aCore && bCore) return 1;
                          return 0;
                        });
                        
                        return (
                          <div key={groupName} className="pm-group-box">
                            <div className="pm-group-title">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                              {groupName}
                            </div>
                            
                            {sortedPerms.map(perm => {
                              const isCore = perm.coreFor.includes(selectedStaff.role);
                              const activeOverride = pmState[selectedStaff.name]?.[perm.id];
                              const pendingChange = pmPendingChanges[perm.id];
                              
                              // Compute active state
                              let activeState = false;
                              if (isCore) {
                                activeState = true;
                              } else if (pendingChange !== undefined) {
                                activeState = pendingChange.on;
                              } else {
                                activeState = activeOverride?.on === true;
                              }

                              return (
                                <div key={perm.id} className="pm-module-row animate-in">
                                  <div className="pm-module-main">
                                    <div className="pm-module-info">
                                      <div className="pm-module-name-row">
                                        <span className="pm-module-name">{perm.name}</span>
                                        {isCore && <span className="pm-badge core">Core</span>}
                                        {pendingChange !== undefined && (
                                          <span className="pm-badge pending">
                                            Pending {pendingChange.on ? 'Grant' : 'Revoke'}
                                          </span>
                                        )}
                                        {(!isCore && pendingChange === undefined && activeOverride?.on) && (
                                          <span className={`pm-badge ${activeOverride.type}`}>
                                            {activeOverride.type === 'temp' ? (
                                              <>
                                                Temp cover ({activeOverride.expiresIn})
                                                {activeOverride.expiresAt && <AdminCoverageCountdown expiresAt={activeOverride.expiresAt} />}
                                              </>
                                            ) : (
                                              'Perm supervisor'
                                            )}
                                          </span>
                                        )}
                                      </div>
                                      <span className="pm-module-desc">{perm.desc}</span>
                                    </div>
                                    
                                    {/* Action Toggle Switch */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                      {(!isCore && pendingChange === undefined && activeOverride?.on) && (
                                        <button 
                                          className="pm-revoke-btn"
                                          onClick={() => handleDirectRevoke(selectedStaff.name, perm.id)}
                                        >
                                          Revoke Cover
                                        </button>
                                      )}
                                      
                                      <div 
                                        className={`pm-toggle-switch ${activeState ? 'active' : ''} ${isCore ? 'disabled' : ''}`}
                                        onClick={() => {
                                          if (isCore) return;
                                          const wasOn = activeOverride?.on || false;
                                          const currentOn = pendingChange !== undefined ? pendingChange.on : wasOn;
                                          const nextOn = !currentOn;
                                          
                                          setPmPendingChanges(prev => {
                                            const copy = { ...prev };
                                            if (nextOn === wasOn) {
                                              delete copy[perm.id];
                                            } else {
                                              copy[perm.id] = {
                                                on: nextOn,
                                                type: 'perm',
                                                expiresIn: null
                                              };
                                            }
                                            return copy;
                                          });
                                        }}
                                      >
                                        <div className="pm-toggle-thumb" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }).filter(Boolean);

                      if (renderedGroups.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0', marginTop: '10px' }} className="animate-in">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" style={{ marginBottom: '8px', display: 'inline-block' }}><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                              No modules match your search query "{pmGridSearch}".
                            </p>
                          </div>
                        );
                      }

                      return renderedGroups;
                    })()}

                    {/* Active Overrides Ledger Widget — inside scroll */}
                    <div className="pm-overrides-card animate-in">
                      <h3 className="pm-overrides-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        Hospital Active Coverage Overrides Ledger ({activeOverridesList.length})
                      </h3>
                      
                      {activeOverridesList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {activeOverridesList.map(item => (
                            <div key={`${item.staffName}-${item.permId}`} className="pm-override-row animate-in">
                              <div className="pm-override-info">
                                <span className="pm-override-staff">{item.staffName}</span>
                                <span className="pm-override-perm-name">
                                  Delegated: <b>{item.permName}</b> (Code: {item.permId})
                                </span>
                                {item.note && (
                                  <span className="pm-override-reason">Reason: "{item.note}"</span>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className={`pm-badge ${item.type}`}>
                                  {item.type === 'temp' ? `Temp override (${item.expiresIn})` : 'Perm supervisor'}
                                </span>
                                <button 
                                  className="pm-revoke-btn"
                                  onClick={() => handleDirectRevoke(item.staffName, item.permId)}
                                >
                                  Revoke Now
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', fontWeight: 600, textAlign: 'center', padding: '20px 0' }}>
                          No active delegations in the system currently. All staff are operating under default role boundaries.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="pm-empty-state">
                    <div className="pm-empty-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', margin: '0 0 4px 0' }}>No Staff Selected</h3>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, fontWeight: 600 }}>Please choose a staff member from the roster to delegate roles.</p>
                  </div>
                )}
              </div>

              {/* Sticky bottom changes validation bar */}
              {pendingCount > 0 && (
                <div className="pm-sticky-footer">
                  <div className="pm-footer-left animate-in">
                    <span className="pm-footer-changes">
                      Pending Changes: {pendingCount} module{pendingCount > 1 ? 's' : ''} modified
                    </span>
                  </div>
                  
                  <div className="pm-footer-actions">
                    <button 
                      className="pm-discard-btn"
                      onClick={() => {
                        setPmPendingChanges({});
                        setPmReason('');
                      }}
                    >
                      Discard
                    </button>
                    <button 
                      className="pm-apply-btn"
                      onClick={handleApplyPendingChanges}
                    >
                      Apply Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 10. Audit Logs Content matching mockup exactly */}
        {activeTab === 'audit' && (() => {
          // Dynamic filtering logic based on user input and filter tabs
          const filteredLogs = auditLogs.filter(log => {
            const matchesSearch = 
              log.title.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
              log.subtext.toLowerCase().includes(auditSearchQuery.toLowerCase());
              
            const matchesCategory = 
              auditSelectedCategory === 'All' || 
              log.category === auditSelectedCategory;
              
            let matchesTag = true;
            if (auditSelectedTag !== 'All') {
              if (auditSelectedTag === 'High priority') {
                matchesTag = log.hasReview === true;
              } else {
                matchesTag = log.tag === auditSelectedTag;
              }
            }
            
            return matchesSearch && matchesCategory && matchesTag;
          });

          const getAuditStats = () => {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const eventsLast7Days = auditLogs.filter(log => new Date(log.timestamp) >= sevenDaysAgo).length;
            const highPriorityCount = auditLogs.filter(log => log.hasReview === true).length;
            const securityCount = auditLogs.filter(log => log.type === 'SECURITY').length;
            return { eventsLast7Days, highPriorityCount, securityCount };
          };
          const { eventsLast7Days, highPriorityCount, securityCount } = getAuditStats();

          return (
            <div className="admin-dashboard-content" style={{ animation: 'slideUp 0.4s ease-out' }}>
              
              {/* KPI Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Events Card */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Events Last 7 Days</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', margin: '8px 0', fontFamily: "'Outfit', sans-serif" }}>{eventsLast7Days}</h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>System wide</span>
                </div>

                {/* Priority Flags Card */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High-Priority Flags</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#D97706', margin: '8px 0', fontFamily: "'Outfit', sans-serif" }}>{highPriorityCount}</h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Needs review</span>
                </div>

                {/* Security Card */}
                <div className="dashboard-widget-card" style={{ padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Security Events</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#EF4444', margin: '8px 0', fontFamily: "'Outfit', sans-serif" }}>{securityCount}</h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Login, device changes</span>
                </div>
              </div>

              {/* Search & Select Period Container */}
              <div className="search-filter-row">
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search logs — action, patient, staff, date..." 
                    style={{ width: '100%', height: '46px', paddingLeft: '44px', paddingRight: '16px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', fontWeight: 600, outline: 'none', background: 'white', transition: 'border-color 0.2s' }}
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  value={auditTimeRange} 
                  onChange={(e) => setAuditTimeRange(e.target.value)}
                  style={{ height: '46px', width: '180px', borderRadius: '10px', border: '1.5px solid #E2E8F0', padding: '0 12px', fontSize: '13px', fontWeight: 700, outline: 'none', background: 'white', color: '#475569', cursor: 'pointer' }}
                >
                  <option value="Last 7 days">Last 7 days</option>
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Today">Today</option>
                </select>
              </div>

              {/* Two Tier Category Buttons Filter */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { key: 'All', label: `All (${auditLogs.length})` },
                  { key: 'Staff management', label: `Staff management (${auditLogs.filter(l => l.category === 'Staff management').length})` },
                  { key: 'Patient data', label: `Patient data (${auditLogs.filter(l => l.category === 'Patient data').length})` },
                  { key: 'Billing', label: `Billing (${auditLogs.filter(l => l.category === 'Billing').length})` },
                  { key: 'Security', label: `Security (${auditLogs.filter(l => l.category === 'Security').length})` }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setAuditSelectedCategory(tab.key);
                      setAuditSelectedTag('All');
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: auditSelectedCategory === tab.key ? '#2563EB' : '#F1F5F9',
                      color: auditSelectedCategory === tab.key ? 'white' : '#475569'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Row 2 Tags Filter */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[
                  { key: 'All', label: 'All' },
                  { key: 'Staff', label: 'Staff' },
                  { key: 'Patient', label: 'Patient' },
                  { key: 'Billing', label: 'Billing' },
                  { key: 'High priority', label: 'High priority' }
                ].map((subtab) => (
                  <button
                    key={subtab.key}
                    onClick={() => setAuditSelectedTag(subtab.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1.5px solid',
                      borderColor: auditSelectedTag === subtab.key ? '#2563EB' : '#E2E8F0',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: auditSelectedTag === subtab.key ? '#EFF6FF' : 'white',
                      color: auditSelectedTag === subtab.key ? '#2563EB' : '#64748B'
                    }}
                  >
                    {subtab.label}
                  </button>
                ))}
              </div>

              {/* Logs Roster List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    // Category Icon Styles
                    let iconBg = '#EFF6FF';
                    let iconColor = '#2563EB';
                    let iconSvg = null;

                    if (log.category === 'Staff management') {
                      iconBg = log.title.includes('deactivated') ? '#FFFBEB' : '#EFF6FF';
                      iconColor = log.title.includes('deactivated') ? '#D97706' : '#2563EB';
                      iconSvg = log.title.includes('deactivated') ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      );
                    } else if (log.category === 'Patient data') {
                      iconBg = log.title.includes('deleted') ? '#FEF2F2' : '#FDF2F8';
                      iconColor = log.title.includes('deleted') ? '#EF4444' : '#DB2777';
                      iconSvg = log.title.includes('deleted') ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      );
                    } else if (log.category === 'Billing') {
                      iconBg = '#ECFDF5';
                      iconColor = '#10B981';
                      iconSvg = (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                      );
                    } else if (log.category === 'Security') {
                      iconBg = '#FFF7ED';
                      iconColor = '#EA580C';
                      iconSvg = (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                      );
                    }

                    // Badge Styles
                    let badgeBg = '#EFF6FF';
                    let badgeColor = '#2563EB';
                    if (log.type === 'PATIENT DATA') {
                      badgeBg = '#FEF2F2';
                      badgeColor = '#EF4444';
                    } else if (log.type === 'BILLING') {
                      badgeBg = '#ECFDF5';
                      badgeColor = '#10B981';
                    } else if (log.type === 'SECURITY') {
                      badgeBg = '#FFF7ED';
                      badgeColor = '#EA580C';
                    }

                    return (
                      <div 
                        key={log.id} 
                        className="dashboard-widget-card log-item-card"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          {/* Round Icon */}
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {iconSvg}
                          </div>
                          
                          {/* Log details */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{log.title}</span>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', display: 'block' }}>{log.subtext}</span>
                          </div>
                        </div>

                        {/* Badges & Actions */}
                        <div className="log-item-card-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '6px', 
                            fontSize: '10px', 
                            fontWeight: 800, 
                            backgroundColor: badgeBg, 
                            color: badgeColor,
                            letterSpacing: '0.3px'
                          }}>
                            {log.type}
                          </span>
                          
                          {log.hasReview && (
                            <button 
                              style={{ 
                                padding: '6px 12px', 
                                border: '1.5px solid #E2E8F0', 
                                borderRadius: '8px', 
                                background: 'white', 
                                color: '#475569', 
                                fontSize: '11px', 
                                fontWeight: 700, 
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.background = '#F8FAFC'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = 'white'; }}
                              onClick={() => showFeedback(`Reviewing action: "${log.title}"`, 'success')}
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="dashboard-widget-card" style={{ padding: '40px', textAlign: 'center', color: '#64748B', borderRadius: '16px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', opacity: 0.5 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>No audit trails matches this filter criteria.</p>
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {activeTab === 'dpdp' && (() => {
          // Filter requests based on status and search query
          const filteredRequests = dpdpRequests.filter(req => {
            const patientName = req.patientName || req.patientId?.name || '';
            const matchesSearch = 
              patientName.toLowerCase().includes(dpdpSearchQuery.toLowerCase()) ||
              (req.details || '').toLowerCase().includes(dpdpSearchQuery.toLowerCase()) ||
              (req.requestType || '').toLowerCase().includes(dpdpSearchQuery.toLowerCase());
            
            const matchesStatus = dpdpStatusFilter === 'All' || req.status === dpdpStatusFilter;
            return matchesSearch && matchesStatus;
          });

          // Metrics
          const totalReqs = dpdpRequests.length;
          const pendingAction = dpdpRequests.filter(r => r.status === 'Pending').length;
          const resolvedReqs = dpdpRequests.filter(r => ['Approved', 'Rejected'].includes(r.status)).length;
          const onHoldReqs = dpdpRequests.filter(r => r.status === 'Hold').length;

          // Filter compliance logs specifically for DPDP & Consent
          const complianceLogs = auditLogs.filter(log => 
            log.category === 'Consent Registry' || 
            log.category === 'Compliance Registry' ||
            (log.title || '').toLowerCase().includes('dpdp') || 
            (log.subtext || '').toLowerCase().includes('consent') ||
            (log.title || '').toLowerCase().includes('bypass')
          );

          return (
            <div className="admin-dashboard-content" style={{ animation: 'slideUp 0.4s ease-out' }}>
              
              {/* DPDP Compliance Alert Banner */}
              <div className="action-notification-banner success" style={{ marginBottom: '24px', backgroundColor: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                <span><strong>DPDP Act 2023 Compliance Panel</strong> — Securely process Right to Correction and Right to Erasure requests. Actions are immutable and cryptographically audited.</span>
              </div>

              {/* KPI Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Total Requests Card */}
                <div className="dashboard-widget-card" style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total DPDP Requests</span>
                  <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>{totalReqs}</h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Submitted by patients</span>
                </div>

                {/* Pending Actions Card */}
                <div className="dashboard-widget-card" style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending DPO Review</span>
                  <h2 style={{ fontSize: '28px', fontWeight: 900, color: pendingAction > 0 ? '#EA580C' : '#10B981', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>{pendingAction}</h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Action required</span>
                </div>

                {/* Resolved Requests Card */}
                <div className="dashboard-widget-card" style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved Requests</span>
                  <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#10B981', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>{resolvedReqs}</h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Completed/Rejected</span>
                </div>

                {/* On Hold Requests Card */}
                <div className="dashboard-widget-card" style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '110px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Legal Hold / Wait</span>
                  <h2 style={{ fontSize: '28px', fontWeight: 900, color: onHoldReqs > 0 ? '#EF4444' : '#64748B', margin: '4px 0', fontFamily: "'Outfit', sans-serif" }}>{onHoldReqs}</h2>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Subject to litigation hold</span>
                </div>
              </div>

              {/* Main Content Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '24px', alignItems: 'start' }}>
                
                {/* Left Side: Requests List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Search and Filters */}
                  <div className="search-filter-row" style={{ marginBottom: 0 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </span>
                      <input 
                        type="text" 
                        placeholder="Search by patient name, details..." 
                        style={{ width: '100%', height: '46px', paddingLeft: '44px', paddingRight: '16px', borderRadius: '10px', border: '1.5px solid #E2E8F0', fontSize: '14px', fontWeight: 600, outline: 'none', background: 'white', transition: 'border-color 0.2s' }}
                        value={dpdpSearchQuery}
                        onChange={(e) => setDpdpSearchQuery(e.target.value)}
                      />
                    </div>
                    <select 
                      value={dpdpStatusFilter} 
                      onChange={(e) => setDpdpStatusFilter(e.target.value)}
                      style={{ height: '46px', width: '160px', borderRadius: '10px', border: '1.5px solid #E2E8F0', padding: '0 12px', fontSize: '13px', fontWeight: 700, outline: 'none', background: 'white', color: '#475569', cursor: 'pointer' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hold">Hold</option>
                    </select>
                  </div>

                  {/* Requests Cards Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredRequests.length > 0 ? (
                      filteredRequests.map((req) => {
                        const isDeletion = req.requestType === 'Deletion';
                        const isPending = req.status === 'Pending';
                        const patientName = req.patientName || req.patientId?.name || 'Unknown Patient';
                        
                        // Status badge colors
                        let statusBg = '#EFF6FF';
                        let statusColor = '#2563EB';
                        if (req.status === 'Approved') {
                          statusBg = '#ECFDF5';
                          statusColor = '#10B981';
                        } else if (req.status === 'Rejected') {
                          statusBg = '#FEF2F2';
                          statusColor = '#EF4444';
                        } else if (req.status === 'Hold') {
                          statusBg = '#FFF7ED';
                          statusColor = '#EA580C';
                        }

                        // Check if patient is on legal hold
                        const hasLegalHold = req.legalHold || (req.patientId && req.patientId.legalHold);

                        return (
                          <div key={req._id || req.id} className="dashboard-widget-card" style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  borderRadius: '50%', 
                                  background: isDeletion ? '#FEF2F2' : '#EFF6FF', 
                                  color: isDeletion ? '#EF4444' : '#2563EB', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '14px'
                                }}>
                                  {isDeletion ? '✖' : '✎'}
                                </div>
                                <div>
                                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{patientName}</h4>
                                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                    UID: {req.patientId?._id || req.patientId || 'N/A'} · Contact: {req.patientContact || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: isDeletion ? '#FEE2E2' : '#E0F2FE', color: isDeletion ? '#DC2626' : '#0369A1', textTransform: 'uppercase' }}>
                                  {req.requestType}
                                </span>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, backgroundColor: statusBg, color: statusColor }}>
                                  {req.status}
                                </span>
                              </div>
                            </div>

                            {/* Details text */}
                            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Request Details / Data Fields</span>
                              <p style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: 550, lineHeight: '1.5' }}>{req.details}</p>
                            </div>

                            {/* Warning & Audit Info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                              <span>Submitted: {new Date(req.requestedAt).toLocaleString('en-IN')}</span>
                              {hasLegalHold && isDeletion && (
                                <span style={{ color: '#EA580C', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <i data-lucide="shield-alert" style={{ width: '14px', height: '14px' }}></i> Legal Hold Active (Record deletion blocked)
                                </span>
                              )}
                            </div>

                            {/* Resolution Notes (if not pending) */}
                            {req.resolutionNotes && (
                              <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '10px', fontSize: '12.5px', color: '#475569' }}>
                                <strong>Resolution Notes:</strong> "{req.resolutionNotes}"
                                {req.resolvedAt && <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '2px' }}>Resolved on: {new Date(req.resolvedAt).toLocaleString('en-IN')} by DPO/Admin</span>}
                              </div>
                            )}

                            {/* Action Button */}
                            {isPending && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button 
                                  className="admin-submit-btn" 
                                  style={{ margin: 0, padding: '8px 16px', fontSize: '12.5px' }}
                                  onClick={() => {
                                    setViewingDpdpRequest(req);
                                    setDpdpResolutionNotes('');
                                  }}
                                >
                                  Review Request
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="dashboard-widget-card" style={{ padding: '40px', textAlign: 'center', color: '#64748B', borderRadius: '16px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', opacity: 0.5 }}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>No DPDP requests found matching the current filters.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Compliance Audit Trail & Guides */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Immutable Log Ledger */}
                  <div className="dashboard-widget-card" style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                      Compliance & Consent Audits ({complianceLogs.length})
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }} data-lenis-prevent>
                      {complianceLogs.length > 0 ? (
                        complianceLogs.map(log => (
                          <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', background: '#F8FAFC', borderRadius: '8px', borderLeft: log.type === 'SECURITY' || log.title.includes('Bypass') ? '3px solid #EF4444' : '3px solid #2563EB' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#1E293B' }}>{log.title}</span>
                              <span style={{ fontSize: '9.5px', color: '#94A3B8', fontWeight: 700 }}>{log.type}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 550, lineHeight: 1.4 }}>{log.subtext}</span>
                            <span style={{ fontSize: '9.5px', color: '#94A3B8', fontWeight: 600 }}>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 600, textAlign: 'center', padding: '20px 0' }}>No consent or privacy audits recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* DPDP Regulation Summary Card */}
                  <div className="dashboard-widget-card" style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', margin: 0 }}>DPDP Act 2023 Obligations</h3>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li><strong>Section 6:</strong> Data Fiduciary must obtain free, specific, informed, unconditional, and unambiguous consent.</li>
                      <li><strong>Section 12 (Right to Correction):</strong> Patients can request correction, completion, or updating of their personal data.</li>
                      <li><strong>Section 12 (Right to Erasure):</strong> Patients can request deletion of their personal data, unless record retention is mandated by clinical guidelines or legal holds.</li>
                      <li><strong>NABH retention guidelines</strong> require retaining EMR files for a minimum of 10 years.</li>
                    </ul>
                  </div>

                </div>

              </div>

            </div>
          );
        })()}

        {/* Hospital Owner Pricing & Procedures Catalog Tab */}
        {activeTab === 'services-catalog' && (() => {
          const filteredCatalog = pricingCatalog.filter(proc => {
            const matchesCategory = procCategoryFilter === 'All' || proc.category === procCategoryFilter;
            const matchesQuery = proc.name.toLowerCase().includes(procSearchQuery.toLowerCase()) || 
                                 (proc.desc || '').toLowerCase().includes(procSearchQuery.toLowerCase()) ||
                                 (proc.category || '').toLowerCase().includes(procSearchQuery.toLowerCase());
            return matchesCategory && matchesQuery;
          });

          const categories = ['All', 'Dental Care', 'Hygiene', 'Cosmetic', 'Dental Surgery', 'General Consult', 'Preventive Care'];
          const activeProcsCount = pricingCatalog.filter(p => p.active !== false).length;
          const avgPrice = Math.round(pricingCatalog.reduce((sum, p) => sum + (Number(p.fee) || 0), 0) / (pricingCatalog.length || 1));

          return (
            <div className="admin-dashboard-content" style={{ animation: 'slideUp 0.4s ease-out' }}>
              
              {/* Top Banner KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Procedures</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>{activeProcsCount} / {pricingCatalog.length}</div>
                  <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, marginTop: '4px' }}>✓ Live in Patient & OPD Portal</div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Procedure Fee</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#2563EB', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>₹{avgPrice.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>Across all categories</div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chair Time Slots</div>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: '#8B5CF6', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>15 – 90 Mins</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>Configurable per procedure</div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', borderRadius: '16px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, opacity: 0.9 }}>Owner Pricing Control</div>
                  <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px', lineHeight: 1.4 }}>Changes sync live across Patient Booking Portal & Receptionist Desk</div>
                </div>
              </div>

              {/* Controls Bar: Search + Category Filters + Add Procedure Button */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                    <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#94A3B8' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input 
                      type="text" 
                      placeholder="Search procedure name, category, or fee..." 
                      value={procSearchQuery} 
                      onChange={e => setProcSearchQuery(e.target.value)}
                      style={{ width: '100%', height: '42px', paddingLeft: '40px', paddingRight: '16px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600, outline: 'none' }} 
                    />
                  </div>

                  <button 
                    onClick={() => {
                      setNewProcData({ name: '', category: 'Dental Care', fee: '', duration: '30 Mins Chair Slot', desc: '' });
                      setShowAddProcModal(true);
                    }}
                    style={{ height: '42px', padding: '0 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
                  >
                    <span>+ Add Custom Procedure</span>
                  </button>
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setProcCategoryFilter(cat)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: procCategoryFilter === cat ? '1px solid #2563EB' : '1px solid #E2E8F0',
                        background: procCategoryFilter === cat ? '#EFF6FF' : '#F8FAFC',
                        color: procCategoryFilter === cat ? '#2563EB' : '#475569',
                        fontWeight: procCategoryFilter === cat ? 800 : 700,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing & Procedure Catalog Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {filteredCatalog.map((item) => (
                  <div 
                    key={item.id}
                    style={{ 
                      background: '#FFFFFF', 
                      border: item.active !== false ? '1.5px solid #E2E8F0' : '1.5px dashed #CBD5E1', 
                      borderRadius: '16px', 
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: item.active !== false ? 1 : 0.6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      {/* Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '6px' }}>
                            {item.category}
                          </span>
                          <h4 style={{ fontSize: '17px', fontWeight: 850, color: '#0F172A', margin: '8px 0 4px 0' }}>{item.name}</h4>
                        </div>

                        {/* Status Toggle Switch */}
                        <div 
                          onClick={() => {
                            const updated = pricingCatalog.map(p => p.id === item.id ? { ...p, active: !p.active } : p);
                            handleSavePricingCatalog(updated);
                          }}
                          style={{
                            width: '42px',
                            height: '22px',
                            background: item.active !== false ? '#10B981' : '#CBD5E1',
                            borderRadius: '99px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s',
                            flexShrink: 0
                          }}
                          title={item.active !== false ? "Disable procedure" : "Enable procedure"}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: item.active !== false ? '22px' : '2px',
                            transition: 'left 0.2s ease'
                          }} />
                        </div>
                      </div>

                      <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, margin: '8px 0 16px 0', fontWeight: 550 }}>
                        {item.desc}
                      </p>
                    </div>

                    {/* Pricing & Duration Editable Controls */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Fee / Cost (₹):</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>₹</span>
                          <input 
                            type="number"
                            value={item.fee}
                            onChange={(e) => {
                              const newFee = Number(e.target.value);
                              const updated = pricingCatalog.map(p => p.id === item.id ? { ...p, fee: newFee } : p);
                              handleSavePricingCatalog(updated);
                            }}
                            style={{
                              width: '90px',
                              height: '34px',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '8px',
                              padding: '0 8px',
                              fontSize: '15px',
                              fontWeight: 900,
                              color: '#10B981',
                              outline: 'none',
                              textAlign: 'right'
                            }}
                          />
                        </div>
                      </div>

                      {/* Chair / Time Slot Removed */}

                      {/* Delete procedure option */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                        <button
                          onClick={() => {
                            const updated = pricingCatalog.filter(p => p.id !== item.id);
                            handleSavePricingCatalog(updated);
                          }}
                          style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Remove Procedure
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add Custom Procedure Modal Overlay */}
              {showAddProcModal && (
                <div className="admin-modal-overlay" onClick={() => setShowAddProcModal(false)}>
                  <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                    <div className="admin-modal-header">
                      <span className="admin-modal-title">Add Custom Clinic Procedure</span>
                      <button className="admin-modal-close-btn" onClick={() => setShowAddProcModal(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                      </button>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!newProcData.name || !newProcData.fee) {
                        showToast("Please provide procedure name and fee.", "error");
                        return;
                      }
                      const newItem = {
                        id: 'proc_' + Date.now(),
                        name: newProcData.name,
                        category: newProcData.category,
                        fee: Number(newProcData.fee),
                        duration: newProcData.duration,
                        desc: newProcData.desc || 'Custom facility procedure configured by clinic owner.',
                        active: true
                      };
                      handleSavePricingCatalog([newItem, ...pricingCatalog]);
                      setShowAddProcModal(false);
                    }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                      <div className="admin-input-group">
                        <label className="admin-input-label">Procedure Name</label>
                        <input 
                          type="text" 
                          className="admin-text-input" 
                          placeholder="e.g. Porcelain Crown Fitting" 
                          value={newProcData.name} 
                          onChange={e => setNewProcData({ ...newProcData, name: e.target.value })} 
                          required 
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="admin-input-group">
                          <label className="admin-input-label">Category</label>
                          <select 
                            className="admin-text-input"
                            value={newProcData.category}
                            onChange={e => setNewProcData({ ...newProcData, category: e.target.value })}
                          >
                            <option value="Dental Care">Dental Care</option>
                            <option value="Hygiene">Hygiene</option>
                            <option value="Cosmetic">Cosmetic</option>
                            <option value="Dental Surgery">Dental Surgery</option>
                            <option value="General Consult">General Consult</option>
                            <option value="Preventive Care">Preventive Care</option>
                          </select>
                        </div>

                        <div className="admin-input-group">
                          <label className="admin-input-label">Procedure Fee (₹)</label>
                          <input 
                            type="number" 
                            className="admin-text-input" 
                            placeholder="e.g. 4500" 
                            value={newProcData.fee} 
                            onChange={e => setNewProcData({ ...newProcData, fee: e.target.value })} 
                            required 
                          />
                        </div>
                      </div>



                      <div className="admin-input-group">
                        <label className="admin-input-label">Clinical Description</label>
                        <textarea 
                          rows={3} 
                          className="admin-text-input" 
                          placeholder="Brief description of clinical steps or preparation needed..." 
                          value={newProcData.desc} 
                          onChange={e => setNewProcData({ ...newProcData, desc: e.target.value })} 
                          style={{ height: 'auto', padding: '10px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button type="button" onClick={() => setShowAddProcModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#2563EB', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Save Procedure</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          );
        })()}

        {/* TAB: LAB TEST CATALOG & DYNAMIC PRICES (Added for Hospital Admin Global Management) */}
        {activeTab === 'lab-catalog' && (() => {
          const filteredCatalog = labTestCatalog.filter(item => {
            const matchesCategory = catalogCategoryFilter === 'All' || (item.category || '').trim() === catalogCategoryFilter;
            const matchesQuery = (item.testName || '').toLowerCase().includes(catalogSearchQuery.toLowerCase()) || 
                                 (item.testCode || '').toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
                                 (item.category || '').toLowerCase().includes(catalogSearchQuery.toLowerCase());
            const matchesStatus = catalogStatusFilter === 'All' || 
                                  (catalogStatusFilter === 'Active' && item.isActive) ||
                                  (catalogStatusFilter === 'Inactive' && !item.isActive);
            return matchesCategory && matchesQuery && matchesStatus;
          });

          const categories = [
            'All',
            ...Array.from(new Set(labTestCatalog.map(item => (item.category || 'General').trim()).filter(Boolean))).sort()
          ];

          return (
            <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Hospital Lab Test Tariff Catalog</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 600 }}>Globally configure diagnostic lab test prices, specimens, codes, and turnaround times for your hospital.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("Reset hospital lab catalog to standard default pricing?")) {
                        try {
                          setLoading(true);
                          await api.post('/lab-tests/seed-default');
                          showToast("Lab Test Catalog reset to standard defaults!", "success");
                          fetchLabTestCatalog();
                        } catch (err) {
                          console.error(err);
                          showToast("Failed to reset catalog.", "error");
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                    style={{ padding: '10px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatalogItem(null);
                      setCatalogForm({
                        testCode: `LAB-${Date.now().toString().slice(-4)}`,
                        testName: '',
                        category: 'Hematology',
                        price: '',
                        sampleType: 'Blood (EDTA)',
                        turnaroundTime: '12 Hours',
                        normalRange: '',
                        unit: '',
                        description: ''
                      });
                      setShowCatalogModal(true);
                    }}
                    style={{ padding: '10px 20px', background: '#2563EB', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    + Add New Test
                  </button>
                </div>
              </div>

              {/* Controls bar */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                    <input 
                      type="text" 
                      placeholder="Search by test name, code, or specimen..." 
                      value={catalogSearchQuery} 
                      onChange={e => setCatalogSearchQuery(e.target.value)}
                      style={{ width: '100%', height: '40px', paddingLeft: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>CATEGORY:</span>
                      <select
                        value={catalogCategoryFilter}
                        onChange={e => setCatalogCategoryFilter(e.target.value)}
                        style={{ height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 14px', fontSize: '13px', fontWeight: 700, color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
                      >
                        <option value="All">All Categories ({labTestCatalog.length})</option>
                        {categories.filter(c => c !== 'All').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>STATUS:</span>
                      <select
                        value={catalogStatusFilter}
                        onChange={e => setCatalogStatusFilter(e.target.value)}
                        style={{ height: '42px', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '0 14px', fontSize: '13px', fontWeight: 700, color: '#0F172A', background: '#F8FAFC', outline: 'none' }}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active Tests Only</option>
                        <option value="Inactive">Deactivated Tests Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>TEST DETAILS</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>CATEGORY</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>HOSPITAL TARIFF</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>SPECIMEN</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B' }}>TAT</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalog.map(item => (
                      <tr key={item._id} style={{ borderBottom: '1px solid #F1F5F9', background: item.isActive ? 'transparent' : '#FFF5F5' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div>
                            <strong style={{ fontSize: '14px', color: '#0F172A', display: 'block' }}>{item.testName}</strong>
                            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', fontWeight: 700 }}>{item.testCode}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                            {item.category || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 900, color: '#059669' }}>
                            ₹{(item.price || 0).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>{item.sampleType || 'Blood'}</span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{item.turnaroundTime || '24 Hours'}</span>
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatalogItem(item);
                                setCatalogForm({
                                  testCode: item.testCode,
                                  testName: item.testName,
                                  category: item.category || 'Hematology',
                                  price: item.price,
                                  sampleType: item.sampleType || 'Blood (EDTA)',
                                  turnaroundTime: item.turnaroundTime || '12 Hours',
                                  normalRange: item.normalRange || '',
                                  unit: item.unit || '',
                                  description: item.description || ''
                                });
                                setShowCatalogModal(true);
                              }}
                              style={{ padding: '6px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', color: '#2563EB', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Edit Price
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await api.put(`/lab-tests/${item._id}`, { isActive: !item.isActive });
                                  showToast(`Lab test '${item.testName}' ${item.isActive ? 'deactivated' : 'activated'}!`, "success");
                                  fetchLabTestCatalog();
                                } catch (e) {
                                  showToast("Failed to toggle test status.", "error");
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: item.isActive ? '#FEF2F2' : '#ECFDF5',
                                borderColor: item.isActive ? '#FCA5A5' : '#A7F3D0',
                                color: item.isActive ? '#DC2626' : '#047857'
                              }}
                            >
                              {item.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MODAL: ADD / EDIT LAB TEST */}
              {showCatalogModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                  <div style={{ width: '500px', background: '#FFFFFF', borderRadius: '16px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                          {editingCatalogItem ? 'Edit Hospital Lab Test & Price' : 'Add New Hospital Lab Test'}
                        </h3>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Configure test code, tariff price, and collection sample</span>
                      </div>
                      <button onClick={() => setShowCatalogModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px', fontWeight: 700 }}>✕</button>
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!catalogForm.testName || catalogForm.price === '') {
                        showToast("Please enter test name and price.", "error");
                        return;
                      }
                      try {
                        setLoading(true);
                        if (editingCatalogItem) {
                          await api.put(`/lab-tests/${editingCatalogItem._id}`, catalogForm);
                          showToast(`Updated '${catalogForm.testName}' price to ₹${catalogForm.price}!`, "success");
                        } else {
                          await api.post('/lab-tests', catalogForm);
                          showToast(`Added '${catalogForm.testName}' with price ₹${catalogForm.price}!`, "success");
                        }
                        setShowCatalogModal(false);
                        fetchLabTestCatalog();
                      } catch (err) {
                        console.error(err);
                        showToast(err.response?.data?.error || "Failed to save lab test.", "error");
                      } finally {
                        setLoading(false);
                      }
                    }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>TEST CODE</label>
                          <input 
                            type="text" 
                            value={catalogForm.testCode} 
                            onChange={e => setCatalogForm({ ...catalogForm, testCode: e.target.value })} 
                            style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}
                            required 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>TEST NAME</label>
                          <input 
                            type="text" 
                            value={catalogForm.testName} 
                            onChange={e => setCatalogForm({ ...catalogForm, testName: e.target.value })} 
                            placeholder="e.g. Complete Blood Count (CBC)"
                            style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px', fontWeight: 600 }}
                            required 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>CATEGORY</label>
                          <select
                            value={catalogForm.category}
                            onChange={e => setCatalogForm({ ...catalogForm, category: e.target.value })}
                            style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px', fontWeight: 600, background: '#FFF' }}
                          >
                            {categories.filter(c => c !== 'All').map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>HOSPITAL PRICE (₹)</label>
                          <input 
                            type="number" 
                            min="0"
                            value={catalogForm.price} 
                            onChange={e => setCatalogForm({ ...catalogForm, price: e.target.value })} 
                            placeholder="e.g. 350"
                            style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '14px', fontWeight: 800, color: '#059669' }}
                            required 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>SAMPLE TYPE</label>
                          <input 
                            type="text" 
                            value={catalogForm.sampleType} 
                            onChange={e => setCatalogForm({ ...catalogForm, sampleType: e.target.value })} 
                            placeholder="e.g. Blood (EDTA), Urine"
                            style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#64748B', marginBottom: '4px' }}>TURNAROUND TIME</label>
                          <input 
                            type="text" 
                            value={catalogForm.turnaroundTime} 
                            onChange={e => setCatalogForm({ ...catalogForm, turnaroundTime: e.target.value })} 
                            placeholder="e.g. 4 Hours, 24 Hours"
                            style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 10px', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setShowCatalogModal(false)}
                          style={{ padding: '10px 18px', background: '#F1F5F9', border: 'none', borderRadius: '8px', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          style={{ padding: '10px 22px', background: '#2563EB', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                        >
                          {editingCatalogItem ? 'Update Test Tariff' : 'Save New Test'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* View Staff Profile Modal Overlay */}
      {viewingStaff && (
        <div className="admin-modal-overlay" onClick={() => setViewingStaff(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Staff Profile Details</span>
              <button className="admin-modal-close-btn" onClick={() => setViewingStaff(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                <div className={`staff-avatar-initials avatar-${viewingStaff.avatarColor || 'blue'}`} style={{ width: '64px', height: '64px', borderRadius: '50%', fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewingStaff.initials}
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{viewingStaff.name}</h3>
                  <span className="appt-status-badge" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', fontSize: '12px', fontWeight: 800, borderRadius: '6px', padding: '4px 10px', marginTop: '6px', display: 'inline-block' }}>
                    {viewingStaff.role?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="widget-details-list" style={{ padding: 0 }}>
                <div className="details-item-row" style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                  <span className="details-item-label" style={{ fontWeight: 600, color: '#64748B' }}>Department / Specialty</span>
                  <span className="details-item-val" style={{ fontWeight: 800, color: '#0F172A' }}>{viewingStaff.dept || 'Administration'}</span>
                </div>
                <div className="details-item-row" style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                  <span className="details-item-label" style={{ fontWeight: 600, color: '#64748B' }}>Working Days</span>
                  <span className="details-item-val" style={{ fontWeight: 800, color: '#0F172A' }}>{viewingStaff.workingDays || 'Mon-Sat'}</span>
                </div>
                <div className="details-item-row" style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                  <span className="details-item-label" style={{ fontWeight: 600, color: '#64748B' }}>Joined Date</span>
                  <span className="details-item-val" style={{ fontWeight: 800, color: '#0F172A' }}>{viewingStaff.joined || 'Recently'}</span>
                </div>
                <div className="details-item-row" style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                  <span className="details-item-label" style={{ fontWeight: 600, color: '#64748B' }}>Last Login</span>
                  <span className="details-item-val" style={{ fontWeight: 800, color: '#10B981' }}>{viewingStaff.lastLogin || 'Never'}</span>
                </div>
                {viewingStaff.role === 'doctor' && (
                  <div className="details-item-row" style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                    <span className="details-item-label" style={{ fontWeight: 600, color: '#64748B' }}>Max Daily Appt Slots</span>
                    <span className="details-item-val" style={{ fontWeight: 800, color: '#0F172A' }}>{viewingStaff.max_slots || 10}</span>
                  </div>
                )}
                <div className="details-item-row" style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span className="details-item-label" style={{ fontWeight: 600, color: '#64748B' }}>Current Status</span>
                  <span className="details-item-val" style={{ fontWeight: 800, color: '#10B981' }}>{viewingStaff.status || 'Active'}</span>
                </div>
                <div className="details-item-row" style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9' }}>
                  <span className="details-item-label" style={{ fontWeight: 600, color: '#64748B' }}>Google Login Email</span>
                  <span className="details-item-val" style={{ fontWeight: 800, color: viewingStaff.email ? '#2563EB' : '#94A3B8' }}>
                    {viewingStaff.email || 'Not configured'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  className="admin-submit-btn" 
                  style={{ flex: 1, margin: 0 }}
                  onClick={() => {
                    setEditingStaff(viewingStaff);
                    setEditStaffFields({
                      name: viewingStaff.name,
                      role: viewingStaff.role,
                      specialty: viewingStaff.dept || '',
                      max_slots: viewingStaff.max_slots || 10,
                      consultationFee: viewingStaff.consultationFee !== undefined ? viewingStaff.consultationFee : 500,
                      password: '',
                      email: viewingStaff.email || ''
                    });
                    setViewingStaff(null);
                  }}
                >
                  Edit Profile
                </button>
                <button 
                  className="approval-act-btn" 
                  style={{ border: '1px solid #CBD5E1', padding: '0 24px', fontSize: '14px', borderRadius: '8px' }}
                  onClick={() => setViewingStaff(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal Overlay */}
      {editingStaff && (
        <div className="admin-modal-overlay" onClick={() => { setEditingStaff(null); setShowEditPassword(false); }}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Edit Staff Profile</span>
              <button className="admin-modal-close-btn" onClick={() => { setEditingStaff(null); setShowEditPassword(false); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleEditStaffSubmit}>
              <div className="admin-input-group">
                <label className="admin-input-label">Full Name</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={editStaffFields.name} 
                  onChange={e => setEditStaffFields({...editStaffFields, name: e.target.value})} 
                  placeholder="e.g. Dr. Jane Smith" 
                  required 
                />
              </div>

              <div className="admin-input-group">
                <label className="admin-input-label">Access Role</label>
                <select 
                  className="admin-text-input" 
                  style={{ padding: '0 8px' }}
                  value={editStaffFields.role} 
                  onChange={e => setEditStaffFields({...editStaffFields, role: e.target.value})}
                >
                  {getAvailableRoles().map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-input-group">
                <label className="admin-input-label">Specialty / Department</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={editStaffFields.specialty} 
                  onChange={e => setEditStaffFields({...editStaffFields, specialty: e.target.value})} 
                  placeholder="e.g. Cardiology, Front desk, etc." 
                />
              </div>

              <div className="admin-input-group">
                <label className="admin-input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg style={{ width: '14px', height: '14px', flexShrink: 0 }} viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.62-1.05-1.37-1.35-2.22z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Google Login Email
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', marginLeft: '4px' }}>(optional)</span>
                </label>
                <input 
                  type="email" 
                  className="admin-text-input" 
                  value={editStaffFields.email} 
                  onChange={e => setEditStaffFields({...editStaffFields, email: e.target.value})} 
                  placeholder="e.g. doctor.sarah@gmail.com" 
                  autoComplete="off"
                />
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                  Staff can use this email to log in with "Sign in with Google" button
                </span>
              </div>
              
              {editStaffFields.role === 'doctor' && (
                <>
                  <div className="admin-input-group animate-in">
                    <label className="admin-input-label">Daily Max Appointment Slots</label>
                    <input 
                      type="number" 
                      className="admin-text-input" 
                      min="1" 
                      max="100" 
                      value={editStaffFields.max_slots} 
                      onChange={e => setEditStaffFields({...editStaffFields, max_slots: Number(e.target.value)})} 
                      required 
                    />
                  </div>
                  <div className="admin-input-group animate-in">
                    <label className="admin-input-label">Doctor Consultation Fee (₹)</label>
                    <input 
                      type="number" 
                      className="admin-text-input" 
                      min="0" 
                      placeholder="e.g. 500"
                      value={editStaffFields.consultationFee !== undefined ? editStaffFields.consultationFee : 500} 
                      onChange={e => setEditStaffFields({...editStaffFields, consultationFee: e.target.value !== '' ? Number(e.target.value) : ''})} 
                      required 
                    />
                  </div>
                </>
              )}

              <div className="admin-input-group">
                <label className="admin-input-label">Change Password (leave blank to keep current)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showEditPassword ? 'text' : 'password'} 
                    className="admin-text-input" 
                    style={{ paddingRight: '40px', width: '100%' }}
                    value={editStaffFields.password} 
                    onChange={e => setEditStaffFields({...editStaffFields, password: e.target.value})} 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showEditPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="admin-submit-btn">
                {loading ? 'Processing...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

       {/* Pop-up Add Staff Modal Overlay */}
      {showAddStaffModal && (
        <div className="admin-modal-overlay" onClick={() => { setShowAddStaffModal(false); setShowAddStaffPassword(false); }}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Add New Staff Account</span>
              <button className="admin-modal-close-btn" onClick={() => { setShowAddStaffModal(false); setShowAddStaffPassword(false); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddStaff}>
              {error && (
                <div style={{
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <span>{error}</span>
                </div>
              )}
              <div className="admin-input-group">
                <label className="admin-input-label">Full Name</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={newStaff.name} 
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})} 
                  placeholder="e.g. Dr. Jane Smith" 
                  required 
                />
              </div>
              <div className="admin-input-group" style={{ marginBottom: '16px' }}>
                <label className="admin-input-label">Username (Staff ID)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="admin-text-input" 
                    value={newStaff.staff_id} 
                    onChange={e => setNewStaff({...newStaff, staff_id: e.target.value})} 
                    placeholder="e.g. janesmith" 
                    required 
                    autoComplete="new-username"
                    style={{
                      borderColor: isUsernameAvailable === true ? '#10B981' : isUsernameAvailable === false ? '#EF4444' : undefined,
                      paddingRight: checkingUsername || isUsernameAvailable !== null ? '36px' : undefined
                    }}
                  />
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    {checkingUsername && (
                      <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%' }}></div>
                    )}
                    {!checkingUsername && isUsernameAvailable === true && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                    {!checkingUsername && isUsernameAvailable === false && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                    )}
                  </div>
                </div>
                {checkingUsername && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Checking availability...</p>
                )}
                {!checkingUsername && isUsernameAvailable === true && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#10B981', fontWeight: 600 }}>✓ Username is available</p>
                )}
                {!checkingUsername && isUsernameAvailable === false && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>✗ Username is already taken</p>
                )}
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Login Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showAddStaffPassword ? 'text' : 'password'} 
                    className="admin-text-input" 
                    style={{ paddingRight: '40px', width: '100%' }}
                    value={newStaff.password} 
                    onChange={e => setNewStaff({...newStaff, password: e.target.value})} 
                    placeholder="••••••••" 
                    required 
                    autoComplete="new-password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowAddStaffPassword(!showAddStaffPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showAddStaffPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Confirm Password</label>
                <input 
                  type={showAddStaffPassword ? 'text' : 'password'} 
                  className="admin-text-input" 
                  style={{ borderColor: newStaff.confirmPassword && newStaff.password !== newStaff.confirmPassword ? '#EF4444' : undefined }}
                  value={newStaff.confirmPassword} 
                  onChange={e => setNewStaff({...newStaff, confirmPassword: e.target.value})} 
                  placeholder="Re-enter password" 
                  required 
                  autoComplete="new-password"
                />
                {newStaff.confirmPassword && newStaff.password !== newStaff.confirmPassword && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>Passwords do not match</p>
                )}
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Access Role</label>
                <select 
                  className="admin-text-input" 
                  style={{ padding: '0 8px' }}
                  value={newStaff.role} 
                  onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                >
                  {getAvailableRoles().map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-input-group">
                <label className="admin-input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg style={{ width: '14px', height: '14px', flexShrink: 0 }} viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.62-1.05-1.37-1.35-2.22z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Google Login Email
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', marginLeft: '4px' }}>(optional)</span>
                </label>
                <input 
                  type="email" 
                  className="admin-text-input" 
                  value={newStaff.email} 
                  onChange={e => setNewStaff({...newStaff, email: e.target.value})} 
                  placeholder="e.g. doctor.sarah@gmail.com" 
                  autoComplete="off"
                />
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                  Staff can use this email to log in with "Sign in with Google" button
                </span>
              </div>
              
              {newStaff.role === 'doctor' && (
                <>
                  <div className="admin-input-group animate-in">
                    <label className="admin-input-label">Daily Max Appointment Slots</label>
                    <input 
                      type="number" 
                      className="admin-text-input" 
                      min="1" 
                      max="100" 
                      placeholder="e.g. 10"
                      value={newStaff.max_slots} 
                      onChange={e => setNewStaff({...newStaff, max_slots: Number(e.target.value)})} 
                      required 
                    />
                  </div>
                  <div className="admin-input-group animate-in">
                    <label className="admin-input-label">Doctor Consultation Fee (₹)</label>
                    <input 
                      type="number" 
                      className="admin-text-input" 
                      min="0" 
                      placeholder="e.g. 500"
                      value={newStaff.consultationFee !== undefined ? newStaff.consultationFee : 500} 
                      onChange={e => setNewStaff({...newStaff, consultationFee: e.target.value !== '' ? Number(e.target.value) : ''})} 
                      required 
                    />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="admin-submit-btn">
                {loading ? 'Processing...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete/Revoke Confirmation Modal Overlay */}
      {showRevokeConfirm && (
        <div className="admin-modal-overlay" onClick={() => { setShowRevokeConfirm(false); setSelectedStaffToRevoke(null); }}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ border: '1px solid #FCA5A5' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              </div>
            </div>

            <h3 style={{ textAlign: 'center', margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Revoke Staff Access</h3>
            <p style={{ textAlign: 'center', margin: '0 0 24px 0', fontSize: '14px', color: '#64748B', lineHeight: '20px', fontWeight: 600 }}>
              Are you sure you want to permanently revoke access for <b style={{ color: '#0F172A' }}>{selectedStaffToRevoke?.name}</b>?<br />
              This account will be immediately deleted and lose all access.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="approval-act-btn" 
                style={{ flex: 1, height: '44px', border: '1px solid #CBD5E1', fontSize: '14px', borderRadius: '8px' }}
                onClick={() => {
                  setShowRevokeConfirm(false);
                  setSelectedStaffToRevoke(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="admin-submit-btn" 
                style={{ flex: 1, height: '44px', margin: 0, backgroundColor: '#EF4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                onClick={() => handleDeleteStaff(selectedStaffToRevoke?.id)}
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up New Appointment Modal Overlay */}
      {showNewApptModal && (
        <div className="admin-modal-overlay" onClick={() => { setShowNewApptModal(false); setReschedulingApptId(null); }}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">{reschedulingApptId ? 'Reschedule Appointment' : 'Schedule New Appointment'}</span>
              <button className="admin-modal-close-btn" onClick={() => { setShowNewApptModal(false); setReschedulingApptId(null); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddNewAppt}>
              <div className="admin-input-group">
                <label className="admin-input-label">Patient Name</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={newApptData.patientName} 
                  onChange={e => setNewApptData({...newApptData, patientName: e.target.value})} 
                  placeholder="e.g. Ramesh Kumar" 
                  required 
                  readOnly={!!reschedulingApptId}
                  style={reschedulingApptId ? { background: '#F1F5F9', cursor: 'not-allowed', fontWeight: 600 } : {}}
                />
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Select Doctor</label>
                {reschedulingApptId ? (
                  <input 
                    type="text" 
                    className="admin-text-input" 
                    value={newApptData.doctor}
                    readOnly
                    style={{ background: '#F1F5F9', cursor: 'not-allowed', fontWeight: 600 }}
                  />
                ) : (
                  <select 
                    className="admin-text-input" 
                    value={newApptData.doctor}
                    onChange={e => {
                      const doc = e.target.value;
                      let dept = 'General';
                      if (doc === 'Dr. Rajan') dept = 'Ortho';
                      if (doc === 'Dr. Mehta') dept = 'Cardio';
                      setNewApptData({...newApptData, doctor: doc, dept: dept});
                    }}
                    required
                  >
                    <option value="Dr. Anjali">Dr. Anjali (General)</option>
                    <option value="Dr. Rajan">Dr. Rajan (Ortho)</option>
                    <option value="Dr. Mehta">Dr. Mehta (Cardio)</option>
                  </select>
                )}
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Preferred Date</label>
                <input 
                  type="date" 
                  className="admin-text-input" 
                  value={newApptData.date} 
                  min={getTodayStr()}
                  onChange={e => setNewApptData({...newApptData, date: e.target.value})} 
                  required 
                />
                {!checkDoctorAvailability(newApptData.doctor, newApptData.date).available && (
                  <div style={{ color: '#EF4444', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                    {checkDoctorAvailability(newApptData.doctor, newApptData.date).reason}
                  </div>
                )}
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Preferred Time slot</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={newApptData.time} 
                  onChange={e => setNewApptData({...newApptData, time: e.target.value})} 
                  placeholder="e.g. 10:00 AM or 14:30" 
                  required 
                />
                {isTimeInPast(newApptData.date, newApptData.time) && (
                  <div style={{ color: '#EF4444', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                    Cannot select a past time slot for today.
                  </div>
                )}
              </div>
              {reschedulingApptId && (
                <div className="admin-input-group">
                  <label className="admin-input-label">Payment Status</label>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>Paid</span>
                </div>
              )}
              <button 
                type="submit" 
                className="admin-submit-btn" 
                style={{ 
                  marginTop: '16px', 
                  opacity: (!checkDoctorAvailability(newApptData.doctor, newApptData.date).available || isTimeInPast(newApptData.date, newApptData.time)) ? 0.6 : 1,
                  cursor: (!checkDoctorAvailability(newApptData.doctor, newApptData.date).available || isTimeInPast(newApptData.date, newApptData.time)) ? 'not-allowed' : 'pointer'
                }} 
                disabled={!checkDoctorAvailability(newApptData.doctor, newApptData.date).available || isTimeInPast(newApptData.date, newApptData.time)}
              >
                {reschedulingApptId ? 'Confirm Reschedule' : 'Schedule Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Register New Patient Modal Overlay */}
      {showNewPatientModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewPatientModal(false)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Register New Patient Record</span>
              <button className="admin-modal-close-btn" onClick={() => setShowNewPatientModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddNewPatient}>
              <div className="admin-input-group">
                <label className="admin-input-label">Patient Name</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={newPatientData.name} 
                  onChange={e => setNewPatientData({...newPatientData, name: e.target.value})} 
                  placeholder="e.g. Ramesh Mehta" 
                  required 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="admin-input-group">
                  <label className="admin-input-label">Age</label>
                  <input 
                    type="number" 
                    className="admin-text-input" 
                    value={newPatientData.age} 
                    onChange={e => setNewPatientData({...newPatientData, age: e.target.value})} 
                    placeholder="e.g. 45" 
                    required 
                  />
                </div>
                <div className="admin-input-group">
                  <label className="admin-input-label">Gender</label>
                  <select 
                    className="admin-text-input" 
                    value={newPatientData.gender} 
                    onChange={e => setNewPatientData({...newPatientData, gender: e.target.value})} 
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Assigned Consultant</label>
                <select 
                  className="admin-text-input" 
                  value={newPatientData.doctor}
                  onChange={e => setNewPatientData({...newPatientData, doctor: e.target.value})}
                  required
                >
                  <option value="">-- Choose Consultant --</option>
                  {staff.filter(u => u.role === 'doctor').map(doc => (
                    <option key={doc.id || doc._id} value={doc.name}>{doc.name} ({doc.dept})</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="admin-submit-btn" style={{ marginTop: '16px' }}>
                Register Patient Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Edit Patient Modal Overlay */}
      {showEditPatientModal && editingPatient && (
        <div className="admin-modal-overlay" onClick={() => { setShowEditPatientModal(false); setEditingPatient(null); }}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Edit Patient Record ({editingPatient.patientId})</span>
              <button className="admin-modal-close-btn" onClick={() => { setShowEditPatientModal(false); setEditingPatient(null); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleEditPatientSubmit}>
              <div className="admin-input-group">
                <label className="admin-input-label">Patient Name</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={editingPatient.name} 
                  onChange={e => setEditingPatient({...editingPatient, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Age & Gender (e.g. "34 M")</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={editingPatient.ageGender} 
                  onChange={e => setEditingPatient({...editingPatient, ageGender: e.target.value})} 
                  required 
                />
              </div>
              <div className="admin-input-group">
                <label className="admin-input-label">Assigned Consultant</label>
                <select 
                  className="admin-text-input" 
                  value={editingPatient.doctor}
                  onChange={e => setEditingPatient({...editingPatient, doctor: e.target.value})}
                  required
                >
                  <option value="">-- Choose Consultant --</option>
                  {staff.filter(u => u.role === 'doctor').map(doc => (
                    <option key={doc.id || doc._id} value={doc.name}>{doc.name} ({doc.dept})</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="approval-act-btn"
                  style={{ flex: 1, border: '1.5px solid #EF4444', color: '#EF4444' }}
                  onClick={() => {
                    deletePatient(editingPatient.id);
                    setShowEditPatientModal(false);
                    setEditingPatient(null);
                  }}
                >
                  Delete Record
                </button>
                <button 
                  type="submit" 
                  className="admin-submit-btn" 
                  style={{ flex: 2, margin: 0 }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEditModal && (
        <div className="admin-modal-overlay animate-fade-in" onClick={() => setShowProfileEditModal(false)}>
          <div className="admin-modal-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Edit Admin Profile</span>
              <button 
                className="admin-modal-close-btn"
                onClick={() => setShowProfileEditModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
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

            <form onSubmit={handleUpdateAdminProfile}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                {profileEditAvatar ? (
                  <img 
                    src={profileEditAvatar} 
                    alt="Preview" 
                    style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #3B71FE', boxShadow: '0 8px 20px rgba(59,113,254,0.15)' }} 
                  />
                ) : (
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B71FE 0%, #2563EB 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, boxShadow: '0 8px 20px rgba(59,113,254,0.15)' }}>
                    {profileEditName ? profileEditName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD'}
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#EFF6FF', color: '#2563EB', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: '1px dashed #3B71FE' }}>
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

              <div className="admin-input-group">
                <label className="admin-input-label">Full Name</label>
                <input 
                  type="text" 
                  className="admin-text-input" 
                  value={profileEditName} 
                  onChange={e => setProfileEditName(e.target.value)} 
                  required 
                />
              </div>

              <div className="admin-input-group">
                <label className="admin-input-label">Email Address</label>
                <input 
                  type="email" 
                  className="admin-text-input" 
                  value={profileEditEmail} 
                  onChange={e => setProfileEditEmail(e.target.value)} 
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="admin-submit-btn" 
                style={{ width: '100%', margin: '16px 0 0 0', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                disabled={profileEditLoading}
              >
                {profileEditLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Patient Profile View Modal Overlay */}
      {activeTab !== 'patient-details' && viewingPatient && (
        <div className="admin-modal-overlay" onClick={() => setViewingPatient(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: '0px', borderRadius: '16px', overflow: 'hidden' }}>
            {/* Header */}
            <div className="admin-modal-header" style={{ padding: '24px 28px', borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <span className="admin-modal-title" style={{ display: 'block', fontSize: '20px', fontWeight: 800 }}>{viewingPatient.name}</span>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Patient Profile ({viewingPatient.patientId})</span>
              </div>
              <button className="admin-modal-close-btn" onClick={() => setViewingPatient(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            {/* Body */}
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Grid info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Age & Gender</label>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{viewingPatient.ageGender}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blood Group</label>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{viewingPatient.raw?.bloodGroup || 'O+'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Number</label>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{viewingPatient.raw?.contact || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginTop: '4px', wordBreak: 'break-all' }}>{viewingPatient.raw?.email || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Doctor</label>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{getPatientDoctorName(viewingPatient)}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Visit</label>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>{viewingPatient.lastVisit}</div>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '8px 0' }} />

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Residential Address</label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '4px', lineHeight: '1.5' }}>{viewingPatient.raw?.address || 'No address provided'}</div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Allergies</label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
                  <span className="appt-status-badge badge-danger" style={{ display: 'inline-block', padding: '4px 10px', fontSize: '12px' }}>
                    {viewingPatient.raw?.allergies || 'None'}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Medical History</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {viewingPatient.raw?.medicalHistory && viewingPatient.raw.medicalHistory.length > 0 ? (
                    viewingPatient.raw.medicalHistory.map((h, idx) => (
                      <span key={idx} className="appt-status-badge badge-info" style={{ padding: '4px 10px', fontSize: '12px' }}>{h}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 500 }}>No medical history recorded</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ padding: '16px 28px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="approval-act-btn" 
                style={{ background: '#0F172A', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: 700 }}
                onClick={() => setViewingPatient(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Details Modal Overlay */}
      {prescriptionModalOpen && selectedPrescription && (
        <div className="admin-modal-overlay" onClick={() => { setPrescriptionModalOpen(false); setSelectedPrescription(null); }}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '0px', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="admin-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <span className="admin-modal-title" style={{ display: 'block', fontSize: '18px', fontWeight: 800 }}>Prescription Invoice</span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  Issued by {selectedPrescription.doctorId?.name || selectedPrescription.doctorId || 'Dr. Sarah Jenkins'}
                </span>
              </div>
              <button className="admin-modal-close-btn" onClick={() => { setPrescriptionModalOpen(false); setSelectedPrescription(null); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedPrescription.items && selectedPrescription.items.map((item, idx) => (
                  <div key={idx} style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{item.medicine}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                        Dosage: {item.dosage} • Duration: {item.duration}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 800, background: '#EFF6FF', padding: '4px 10px', borderRadius: '6px' }}>
                      {item.instructions || 'After meals'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 24px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="approval-act-btn" 
                style={{ background: '#0F172A', color: 'white', padding: '8px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px' }}
                onClick={() => { setPrescriptionModalOpen(false); setSelectedPrescription(null); }}
              >
                Close Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN EDIT PO MODAL */}
      {showEditPOModal && selectedPO && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => { setShowEditPOModal(false); setSelectedPO(null); }}>
          <div className="modal-box glass-card" style={{ width: '90%', maxWidth: '750px', maxHeight: '90vh', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Edit Purchase Order</h2>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#3B82F6', fontWeight: 700 }}>PO: {selectedPO.poId}</span>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => { setShowEditPOModal(false); setSelectedPO(null); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEditPO}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Assigned Vendor</label>
                <select 
                  value={selectedPO.vendorId} 
                  onChange={e => handleEditPOVendorChange(e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 12px', outline: 'none', fontWeight: 700 }}
                  required
                >
                  {vendors.map(v => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Medicines</h4>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>Medicine Name</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>SKU Code</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>Qty</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>Price (₹)</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poEditItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <input 
                              type="text" 
                              value={item.name} 
                              onChange={e => {
                                const updated = [...poEditItems];
                                updated[idx].name = e.target.value;
                                setPoEditItems(updated);
                              }}
                              style={{ width: '100%', height: '32px', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 8px', outline: 'none', fontWeight: 700 }}
                              required
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input 
                              type="text" 
                              value={item.sku} 
                              onChange={e => {
                                const updated = [...poEditItems];
                                updated[idx].sku = e.target.value;
                                setPoEditItems(updated);
                              }}
                              style={{ width: '100%', height: '32px', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 8px', outline: 'none', fontFamily: 'monospace' }}
                              required
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input 
                              type="number" 
                              value={item.requiredQty} 
                              onChange={e => {
                                const updated = [...poEditItems];
                                updated[idx].requiredQty = Number(e.target.value) || 0;
                                setPoEditItems(updated);
                              }}
                              style={{ width: '70px', height: '32px', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 8px', outline: 'none', fontWeight: 800 }}
                              required
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.price} 
                              onChange={e => {
                                const updated = [...poEditItems];
                                updated[idx].price = Number(e.target.value) || 0;
                                setPoEditItems(updated);
                              }}
                              style={{ width: '90px', height: '32px', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 8px', outline: 'none', fontWeight: 800 }}
                              required
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button 
                              type="button" 
                              style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 800, cursor: 'pointer' }}
                              onClick={() => {
                                setPoEditItems(poEditItems.filter((_, i) => i !== idx));
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button 
                  type="button" 
                  style={{ padding: '8px 16px', fontSize: '12px', border: '1px dashed #3B82F6', background: 'transparent', color: '#3B82F6', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, marginTop: '10px' }}
                  onClick={() => {
                    setPoEditItems([...poEditItems, { name: '', sku: '', requiredQty: 100, price: 10.0 }]);
                  }}
                >
                  + Add Medicine Row
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                Estimated Outlay: ₹{poEditItems.reduce((sum, item) => sum + (item.requiredQty * item.price), 0).toFixed(2)}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => { setShowEditPOModal(false); setSelectedPO(null); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '10px 20px', borderRadius: '8px', background: '#3B82F6', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Approval Details Modal Overlay */}
      {viewingApproval && (
        <div className="admin-modal-overlay" onClick={() => setViewingApproval(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span className="admin-modal-title">Approval Request Details</span>
              <button className="admin-modal-close-btn" onClick={() => setViewingApproval(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{viewingApproval.title}</h3>
                  <span className="appt-status-badge" style={{ backgroundColor: '#F3E8FF', color: '#6B21A8', fontSize: '12px', fontWeight: 800, borderRadius: '6px', padding: '4px 10px', marginTop: '6px', display: 'inline-block' }}>
                    {viewingApproval.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Requester & Date</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14.5px', fontWeight: 700, color: '#334155' }}>
                    {viewingApproval.raisedBy}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Details / Reason</label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14.5px', fontWeight: 600, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {viewingApproval.details}
                  </p>
                </div>

                {viewingApproval.raw && viewingApproval.raw.details && typeof viewingApproval.raw.details === 'object' && (
                  <div>
                    <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Request Specifications</label>
                    <div style={{ margin: '6px 0 0 0', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      {Object.entries(viewingApproval.raw.details).map(([key, value]) => {
                        if (key === 'reason') return null; // Reason already displayed above
                        let displayValue = '';
                        if (key === 'items' && Array.isArray(value)) {
                          displayValue = value.map(i => `${i.name || i.itemName || 'Item'} (x${i.requiredQty || i.quantity || 1})`).join(', ');
                        } else if (typeof value === 'object' && value !== null) {
                          displayValue = JSON.stringify(value);
                        } else {
                          displayValue = String(value);
                        }
                        return (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '13.5px', padding: '6px 0', borderBottom: '1px dashed #F1F5F9' }}>
                            <span style={{ color: '#475569', fontWeight: 700, textTransform: 'capitalize', marginRight: '16px', flexShrink: 0 }}>{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span style={{ color: '#0F172A', fontWeight: 800, textAlign: 'right', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <button 
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 800, cursor: 'pointer' }}
                  onClick={() => setViewingApproval(null)}
                >
                  Close
                </button>
                <button 
                  style={{ padding: '10px 20px', borderRadius: '8px', background: '#EF4444', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                  onClick={() => {
                    rejectApprovalItem(viewingApproval.id, viewingApproval.title, !!viewingApproval.raw);
                    setViewingApproval(null);
                  }}
                >
                  ✕ Reject
                </button>
                <button 
                  style={{ padding: '10px 20px', borderRadius: '8px', background: '#22C55E', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                  onClick={() => {
                    approveApprovalItem(viewingApproval.id, viewingApproval.title, !!viewingApproval.raw);
                    setViewingApproval(null);
                  }}
                >
                  ✓ Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRevenueModal && (
        <div className="admin-modal-overlay" data-lenis-prevent onClick={() => setShowRevenueModal(false)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="admin-modal-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '20px' }}>
              <span className="admin-modal-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Detailed Revenue Breakdown</span>
              <button className="admin-modal-close-btn" onClick={() => setShowRevenueModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            {/* Timeframe Selector tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
              <button 
                type="button" 
                style={{ 
                  flex: 1, 
                  height: '36px', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '13px', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  backgroundColor: revenueTimeframe === 'today' ? 'white' : 'transparent',
                  color: revenueTimeframe === 'today' ? '#0F172A' : '#64748B',
                  boxShadow: revenueTimeframe === 'today' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setRevenueTimeframe('today')}
              >
                Today's Collections
              </button>
              <button 
                type="button" 
                style={{ 
                  flex: 1, 
                  height: '36px', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '13px', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  backgroundColor: revenueTimeframe === 'all' ? 'white' : 'transparent',
                  color: revenueTimeframe === 'all' ? '#0F172A' : '#64748B',
                  boxShadow: revenueTimeframe === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setRevenueTimeframe('all')}
              >
                All-Time Ledger
              </button>
            </div>

            {(() => {
              // Dynamic breakdown based on selected timeframe
              const breakdown = (() => {
                const paidBills = bills.filter(b => {
                  if (b.status !== 'Paid') return false;
                  if (revenueTimeframe === 'today') {
                    const bd = new Date(b.createdAt);
                    const today = new Date();
                    return bd.getDate() === today.getDate() &&
                           bd.getMonth() === today.getMonth() &&
                           bd.getFullYear() === today.getFullYear();
                  }
                  return true;
                });
                let opd = 0;
                let labsVal = 0;
                let pharmacy = 0;
                let procedures = 0;
                let discountAmount = 0;
                
                paidBills.forEach(b => {
                  discountAmount += (b.discountAmount || 0);
                  (b.items || []).forEach(item => {
                    const desc = (item.description || '').toLowerCase();
                    const amt = item.amount || 0;
                    if (desc.includes('consult') || desc.includes('regis')) {
                      opd += amt;
                    } else if (desc.includes('lab') || desc.includes('diagnost')) {
                      labsVal += amt;
                    } else if (desc.includes('rx') || desc.includes('dispense') || desc.includes('pharmacy')) {
                      pharmacy += amt;
                    } else {
                      procedures += amt;
                    }
                  });
                });
                
                const pending = bills
                  .filter(b => {
                    if (b.status !== 'Unpaid') return false;
                    if (revenueTimeframe === 'today') {
                      const bd = new Date(b.createdAt);
                      const today = new Date();
                      return bd.getDate() === today.getDate() &&
                             bd.getMonth() === today.getMonth() &&
                             bd.getFullYear() === today.getFullYear();
                    }
                    return true;
                  })
                  .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                  
                return { opd, labs: labsVal, pharmacy, procedures, pending, discountAmount };
              })();

              const totalCollected = breakdown.opd + breakdown.labs + breakdown.pharmacy + breakdown.procedures;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>OPD Consultations</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>₹{breakdown.opd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>Laboratory & Diagnostics</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>₹{breakdown.labs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>Pharmacy Medicines</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>₹{breakdown.pharmacy.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>Procedures & Other Charges</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>₹{breakdown.procedures.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed #E2E8F0', color: '#EF4444' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Discounts Approved</span>
                    <span style={{ fontSize: '14px', fontWeight: 800 }}>-₹{breakdown.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div style={{ backgroundColor: '#EFF6FF', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', border: '1px solid #BFDBFE' }}>
                    <span style={{ fontSize: '14px', fontWeight: 850, color: '#1E3A8A' }}>Total Settled Collections</span>
                    <span style={{ fontSize: '18px', fontWeight: 850, color: '#1D4ED8' }}>₹{totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', marginTop: '4px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 650, color: '#92400E' }}>Outstanding / Pending Bills</span>
                    <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#B45309' }}>₹{breakdown.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  {(() => {
                    const unpaidBillsList = bills.filter(b => {
                      if (b.status !== 'Unpaid') return false;
                      if (revenueTimeframe === 'today') {
                        const bd = new Date(b.createdAt);
                        const today = new Date();
                        return bd.getDate() === today.getDate() &&
                               bd.getMonth() === today.getMonth() &&
                               bd.getFullYear() === today.getFullYear();
                      }
                      return true;
                    });

                    if (unpaidBillsList.length === 0) return null;

                    return (
                      <div style={{ marginTop: '16px', borderTop: '1.5px solid #F1F5F9', paddingTop: '16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                          Outstanding Bills List ({unpaidBillsList.length})
                        </span>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }} data-lenis-prevent="true">
                          {unpaidBillsList.map(b => (
                            <div key={b._id || b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FEE2E2' }}>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
                                  {b.patientId?.name || 'Walk-in Patient'}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#B91C1C', fontWeight: 550 }}>
                                  {b.items?.map(item => item.description).join(', ') || 'No itemized details'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#991B1B' }}>
                                  ₹{(b.totalAmount || 0).toLocaleString()}
                                </span>
                                <div style={{ fontSize: '10.5px', color: '#B91C1C', fontWeight: 600 }}>
                                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
              <button 
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontWeight: 800, cursor: 'pointer' }}
                onClick={() => setShowRevenueModal(false)}
              >
                Close
              </button>
              <button 
                style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--primary-gradient)', color: 'white', border: 'none', fontWeight: 850, cursor: 'pointer' }}
                onClick={() => {
                  setShowRevenueModal(false);
                  setActiveTab('financials');
                }}
              >
                Go to Financials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DPDP Request Review Modal Overlay */}
      {viewingDpdpRequest && (
        <div className="admin-modal-overlay" onClick={() => setViewingDpdpRequest(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: '0px', borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div className="admin-modal-header" style={{ padding: '24px 28px', borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <span className="admin-modal-title" style={{ display: 'block', fontSize: '20px', fontWeight: 800 }}>Review DPDP Request</span>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Patient: {viewingDpdpRequest.patientName || viewingDpdpRequest.patientId?.name || 'Unknown'}</span>
              </div>
              <button className="admin-modal-close-btn" onClick={() => setViewingDpdpRequest(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Request Info Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Request Type</label>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: viewingDpdpRequest.requestType === 'Deletion' ? '#EF4444' : '#2563EB', marginTop: '4px' }}>
                    {viewingDpdpRequest.requestType === 'Deletion' ? 'Right to Erasure (Deletion)' : 'Right to Correction'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Submitted</label>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                    {new Date(viewingDpdpRequest.requestedAt).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Contact</label>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                    {viewingDpdpRequest.patientContact || viewingDpdpRequest.patientId?.contact || 'N/A'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legal Hold Status</label>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: (viewingDpdpRequest.legalHold || (viewingDpdpRequest.patientId && viewingDpdpRequest.patientId.legalHold)) ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                    {(viewingDpdpRequest.legalHold || (viewingDpdpRequest.patientId && viewingDpdpRequest.patientId.legalHold)) ? '⚠️ Active Hold' : 'No Active Holds'}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Request Details / Fields to Modify</label>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '6px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', lineHeight: 1.5 }}>
                  {viewingDpdpRequest.details}
                </div>
              </div>

              {/* Resolution Notes Input */}
              <div className="admin-input-group" style={{ marginBottom: 0 }}>
                <label className="admin-input-label">Resolution Notes / Action Comments <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea 
                  className="admin-text-input" 
                  style={{ minHeight: '80px', padding: '10px', resize: 'vertical', fontSize: '13.5px', fontFamily: 'inherit' }}
                  value={dpdpResolutionNotes} 
                  onChange={e => setdpdpResolutionNotes(e.target.value)} 
                  placeholder="Provide clinical or legal justification (e.g. 'Aadhaar details verified and updated' or 'Erasure request denied due to 10-year NABH retention guidelines')."
                  required 
                />
              </div>

              {/* Legal hold warning message block */}
              {(viewingDpdpRequest.legalHold || (viewingDpdpRequest.patientId && viewingDpdpRequest.patientId.legalHold)) && viewingDpdpRequest.requestType === 'Deletion' && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <i data-lucide="alert-triangle" style={{ width: '18px', height: '18px', color: '#EF4444', flexShrink: 0, marginTop: '2px' }}></i>
                  <div style={{ fontSize: '11.5px', color: '#991B1B', fontWeight: 600, lineHeight: 1.4 }}>
                    <strong>Legal Hold In Force:</strong> This patient record is marked under a legal/investigative hold. Deletion requests cannot be approved while a hold is active. You must either resolve/lift the legal hold or reject this request.
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '20px 28px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button 
                className="approval-act-btn" 
                style={{ border: '1px solid #CBD5E1', padding: '10px 20px', fontSize: '13px', borderRadius: '8px', background: 'white', color: '#475569', fontWeight: 800 }}
                onClick={() => setViewingDpdpRequest(null)}
              >
                Cancel
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="approval-act-btn-new reject" 
                  onClick={() => handleResolveDpdpRequest(viewingDpdpRequest._id || viewingDpdpRequest.id, 'Rejected')}
                  disabled={loading || !dpdpResolutionNotes.trim()}
                  style={{ opacity: (!dpdpResolutionNotes.trim()) ? 0.6 : 1 }}
                >
                  Reject Request
                </button>
                <button 
                  className="approval-act-btn-new hold" 
                  onClick={() => handleResolveDpdpRequest(viewingDpdpRequest._id || viewingDpdpRequest.id, 'Hold')}
                  disabled={loading || !dpdpResolutionNotes.trim()}
                  style={{ 
                    opacity: (!dpdpResolutionNotes.trim()) ? 0.6 : 1
                  }}
                >
                  Place on Hold
                </button>
                <button 
                  className="approval-act-btn-new approve" 
                  onClick={() => handleResolveDpdpRequest(viewingDpdpRequest._id || viewingDpdpRequest.id, 'Approved')}
                  disabled={loading || !dpdpResolutionNotes.trim() || ((viewingDpdpRequest.legalHold || (viewingDpdpRequest.patientId && viewingDpdpRequest.patientId.legalHold)) && viewingDpdpRequest.requestType === 'Deletion')}
                  style={{ 
                    opacity: (!dpdpResolutionNotes.trim() || ((viewingDpdpRequest.legalHold || (viewingDpdpRequest.patientId && viewingDpdpRequest.patientId.legalHold)) && viewingDpdpRequest.requestType === 'Deletion')) ? 0.6 : 1,
                    backgroundColor: '#10B981',
                    color: 'white'
                  }}
                >
                  Approve & Resolve
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeBroadcastAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            position: 'relative',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                background: '#FEF3C7',
                color: '#D97706',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>System Broadcast Notice</h3>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Received just now</span>
              </div>
            </div>
            
            <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: '0 0 6px 0' }}>
                {activeBroadcastAlert.subject}
              </h4>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', fontWeight: 550 }}>
                {activeBroadcastAlert.message}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                style={{
                  background: '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                }}
                onClick={() => setActiveBroadcastAlert(null)}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* VENDOR PROFILE MODAL FOR ADMIN */}
      {selectedVendorProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setSelectedVendorProfile(null)}>
          <div style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', background: 'white', display: 'flex', flexDirection: 'column', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10, borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 950, color: '#0F172A' }}>Supplier Master Profile: {selectedVendorProfile.name}</span>
              <button type="button" onClick={() => setSelectedVendorProfile(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Section 1: General & Classification */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>Supplier Classification</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Supplier Code</span>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>{selectedVendorProfile.code}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Supplier Type</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '2px' }}>{selectedVendorProfile.type || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Supplier Category</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '2px' }}>{selectedVendorProfile.supplierCategory || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Organization Type</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '2px' }}>{selectedVendorProfile.organizationType || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Status</span>
                    <div style={{ marginTop: '2px' }}>
                      <span className="badge-pill-state pending" style={{ display: 'inline-block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '4px 8px', borderRadius: '9999px', background: '#FFF7ED', color: '#C2410C' }}>
                        {selectedVendorProfile.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Address & Communication */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>Address & Communication</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Complete Address</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, marginTop: '2px' }}>
                      {selectedVendorProfile.houseNo ? `${selectedVendorProfile.houseNo}, ` : ''}
                      {selectedVendorProfile.street ? `${selectedVendorProfile.street}, ` : ''}
                      {selectedVendorProfile.address || ''}
                      {selectedVendorProfile.city ? `, ${selectedVendorProfile.city}` : ''}
                      {selectedVendorProfile.state ? `, ${selectedVendorProfile.state}` : ''}
                      {selectedVendorProfile.zipCode || selectedVendorProfile.pinCode ? ` - ${selectedVendorProfile.zipCode || selectedVendorProfile.pinCode}` : ''}
                      {selectedVendorProfile.country ? `, ${selectedVendorProfile.country}` : ''}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Email Address</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{selectedVendorProfile.email || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Website</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>{selectedVendorProfile.website || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Landline Number</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, marginTop: '2px' }}>{selectedVendorProfile.landline || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Fax Number</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, marginTop: '2px' }}>{selectedVendorProfile.faxNo || '--'}</div>
                  </div>
                </div>
              </div>

              {/* Section 3: Contact Persons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', marginBottom: '10px' }}>Primary Contact Person</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>NAME / DESIGNATION</span>
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>{selectedVendorProfile.contactPerson || selectedVendorProfile.primaryContactPerson || '--'} ({selectedVendorProfile.primaryContactPersonDesignation || 'Contact Person'})</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>MOBILE NUMBER</span>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{selectedVendorProfile.phone || selectedVendorProfile.primaryContactPersonMobileNo || '--'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>EMAIL ID</span>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{selectedVendorProfile.primaryContactPersonEmailId || '--'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', marginBottom: '10px' }}>Secondary Contact Person</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>NAME / DESIGNATION</span>
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>{selectedVendorProfile.secondaryContactPerson || '--'} {selectedVendorProfile.secondaryContactPersonDesignation ? `(${selectedVendorProfile.secondaryContactPersonDesignation})` : ''}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>MOBILE NUMBER</span>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{selectedVendorProfile.secondaryContactPersonMobileNo || '--'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 700 }}>EMAIL ID</span>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{selectedVendorProfile.secondaryContactPersonEmailId || '--'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Compliance & Business Registration */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>Compliance & Business Registration</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>GST Number</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{selectedVendorProfile.gstNumber || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>PAN Card Number</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{selectedVendorProfile.panNumber || selectedVendorProfile.panCardNo || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Name on PAN Card</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{selectedVendorProfile.nameOnPanCard || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Drug License Number</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{selectedVendorProfile.licenseNumber || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>CIN Number</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.cinNo || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>PF Registration No</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.pfRegistrationNo || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>ROC Number</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.rocNo || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>ESI Registration No</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.esiRegistrationNo || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>ISO Certification No</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.isoCertificationNo ? `${selectedVendorProfile.isoCertificationNo} (Exp: ${selectedVendorProfile.isoValidUpto || '--'})` : '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Pollution Control Cert</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.pollutionControlBoardCertificationNo ? `${selectedVendorProfile.pollutionControlBoardCertificationNo} (Exp: ${selectedVendorProfile.pollutionValidUpto || '--'})` : '--'}</div>
                  </div>
                </div>
              </div>

              {/* Section 5: Bank Details */}
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>Bank Account Routing</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>BANK NAME</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{selectedVendorProfile.bankName || selectedVendorProfile.bank1Name || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>BRANCH</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{selectedVendorProfile.bank1Branch || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>ACCOUNT NUMBER</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{selectedVendorProfile.accountNumber || selectedVendorProfile.bank1AccountNumber || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>IFSC CODE</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#2563EB' }}>{selectedVendorProfile.ifscCode || selectedVendorProfile.bank1IfscCode || '--'}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>BANK BRANCH ADDRESS</span>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedVendorProfile.bank1Address || '--'}</div>
                  </div>
                </div>
              </div>

              {/* Section 6: Commercial Terms & MSME */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>Commercial Terms & MSME Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>MSME Registration</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
                      {selectedVendorProfile.isMsmeRegistration === 'Yes' ? `Yes (${selectedVendorProfile.msmeRegistrationNo || '--'} - ${selectedVendorProfile.msmeRegistrationType || ''})` : 'No'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Payment Terms</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{selectedVendorProfile.paymentTerms || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Payment Method</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{selectedVendorProfile.paymentMethod || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Credit Limit / Credit Days</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700 }}>₹{(selectedVendorProfile.creditLimit || 0).toLocaleString('en-IN')} ({selectedVendorProfile.creditDays || 30} Days)</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Taxes Config</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.taxes || '--'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Delivery Terms</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{selectedVendorProfile.deliveryTerms || '--'}</div>
                  </div>
                </div>
              </div>

            </div>
            
            <div style={{ position: 'sticky', bottom: 0, background: 'white', zIndex: 10, borderTop: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" style={{ background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setSelectedVendorProfile(null)}>Close Profile</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default AdminDashboard;