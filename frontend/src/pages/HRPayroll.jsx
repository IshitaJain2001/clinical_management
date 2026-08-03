import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Icons
import { 
  LayoutDashboard, Users, Network, CalendarClock, CircleDollarSign, 
  FileText, Settings, Bell, Clock, 
  Menu, X, Building2, UserCheck
} from 'lucide-react';

// Subviews
import DashboardView from '../components/hr/DashboardView';
import EmployeeDirectoryView from '../components/hr/EmployeeDirectoryView';
import EmployeeProfileView from '../components/hr/EmployeeProfileView';
import AttendanceLeaveView from '../components/hr/AttendanceLeaveView';

import ReportsView from '../components/hr/ReportsView';
import HRPayrollStaff from './HRPayrollStaff';
import SettingsView from '../components/hr/SettingsView';

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


// Inline permission helper (no external constants file needed)
function createDefaultPermission(overrides) {
  return { view: true, create: false, edit: false, delete: false, approve: false, export: false, assign: false, ...overrides };
}
function createPermissionsMap(overrides) {
  const categories = ['Appointments','Patient Management','Billing','EMR','Laboratory','Pharmacy','Inventory','Purchase','Reports','Staff Management','Revenue','Audit Logs','Settings'];
  const result = {};
  categories.forEach(cat => { result[cat] = createDefaultPermission(overrides?.[cat]); });
  return result;
}

export default function HRPayroll({ onExit, initialTab = 'Dashboard', initialIsAdding = false }) {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrHR = currentUser.role === 'admin' || currentUser.role === 'hr';

  if (!isAdminOrHR) {
    return <HRPayrollStaff onExit={onExit} />;
  }

  // Navigation states
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    return isAdminOrHR ? 'Dashboard' : 'MyProfile';
  });
  const [openAddStaffModal, setOpenAddStaffModal] = useState(initialIsAdding);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialIsAdding !== undefined) setOpenAddStaffModal(initialIsAdding);
  }, [initialTab, initialIsAdding]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('curoxa_sidebar_collapsed') === 'true';
  });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Core global data states
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Role Coverage states
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

  // Toast feedback states
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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
    setPmGridSearch('');
  }, [pmSelectedStaffId]);

  // Recruitment Sourcing states loaded dynamically from localStorage
  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem('curoxa_hr_jobs');
    return saved ? JSON.parse(saved) : [
      { id: 'JOB-2026-001', title: 'Senior ICU Nurse', department: 'Critical Care / ICU', location: 'ICU Wing B', employmentType: 'Full-Time', experienceRequired: '5+ Years', vacancies: 3, status: 'Open', applicantsCount: 4, postedDate: '2026-07-01' },
      { id: 'JOB-2026-002', title: 'Emergency Resident', department: 'Emergency Medicine', location: 'ER Ground Floor', employmentType: 'Full-Time', experienceRequired: '3-5 Years', vacancies: 2, status: 'Open', applicantsCount: 6, postedDate: '2026-07-04' },
      { id: 'JOB-2026-003', title: 'Senior Lab Pathologist', department: 'Pathology & Lab', location: 'Main Lab Wing A', employmentType: 'Full-Time', experienceRequired: '8+ Years', vacancies: 1, status: 'Open', applicantsCount: 2, postedDate: '2026-07-06' }
    ];
  });

  const [candidates, setCandidates] = useState(() => {
    const saved = localStorage.getItem('curoxa_hr_candidates');
    return saved ? JSON.parse(saved) : [
      { id: 'CAND-101', name: 'Rebecca Green', email: 'rebecca.green@example.com', phone: '9876543210', jobTitle: 'Senior ICU Nurse', status: 'Applied', source: 'Indeed', appliedDate: '2026-07-02' },
      { id: 'CAND-102', name: 'John Doe', email: 'john.doe@example.com', phone: '9876543211', jobTitle: 'Emergency Resident', status: 'Shortlisted', source: 'LinkedIn', appliedDate: '2026-07-05' },
      { id: 'CAND-103', name: 'Jane Smith', email: 'jane.smith@example.com', phone: '9876543212', jobTitle: 'Senior Lab Pathologist', status: 'Offered', source: 'Direct Reference', appliedDate: '2026-07-07' }
    ];
  });

  // Real-time local digital clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!currentUser.role) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showProfileDropdown) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.sidebar-profile') && !e.target.closest('.absolute')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showProfileDropdown]);

  useEffect(() => {
    if (!localStorage.getItem('curoxa_hr_jobs')) {
      localStorage.setItem('curoxa_hr_jobs', JSON.stringify(jobs));
    }
    if (!localStorage.getItem('curoxa_hr_candidates')) {
      localStorage.setItem('curoxa_hr_candidates', JSON.stringify(candidates));
    }
  }, [jobs, candidates]);

  // Format time functions
  const formatTimeStr = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: false }) + ' UTC';
  };

  const formatDateStr = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Fetch registered users from backend and merge with rich local profile properties
  const fetchData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await api.get('/admin/users');
      const backendUsers = res.data;

      // Resolve admin's name dynamically to use as default reporting manager
      const adminUser = backendUsers.find(u => u.role === 'admin');
      const defaultManagerName = adminUser ? `${adminUser.name} (Administrator)` : (currentUser.role === 'admin' ? `${currentUser.name} (Administrator)` : 'Ishita Jain (Administrator)');
      const defaultManagerId = adminUser ? (adminUser.staff_id || adminUser._id) : (currentUser.role === 'admin' ? (currentUser.staff_id || currentUser.id) : 'EMP-2026-100');

      // Map backend users to Employee interface
      const mappedBackendEmployees = backendUsers.map(user => {
        const userId = user._id || user.id || user.staff_id;

        return {
          id: userId,
          staff_id: user.staff_id || userId,
          name: user.name,
          email: user.email || '',
          phone: user.phone || '',
          photoUrl: user.avatar || '',
          gender: user.gender || '',
          dob: user.dob || '',
          bloodGroup: user.bloodGroup || '',
          address: user.address || '',
          emergencyContact: user.emergencyContact || { name: '', relation: '', phone: '' },
          aadhaar: user.aadhaar || '',
          pan: user.pan || '',
          department: user.department || user.specialty || (user.role === 'doctor' ? 'General Medicine' : user.role === 'hr' ? 'Hospital Administration' : 'Administration'),
          designation: user.designation || (user.role === 'doctor' ? 'Consultant Practitioner' : user.role === 'hr' ? 'HR Manager' : user.role.charAt(0).toUpperCase() + user.role.slice(1)),
          employmentType: user.employmentType || 'Full-Time',
          joiningDate: user.joiningDate || (user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          reportingManagerId: user.reportingManagerId || defaultManagerId,
          reportingManagerName: user.reportingManagerName || defaultManagerName,
          workLocation: user.workLocation || 'Main Wing - Sunrise Clinic',
          shiftName: user.shiftName || 'Day Rotation',
          grade: user.grade || 'G3',
          status: user.status || 'Active',
          role: user.role || 'doctor',
          noticePeriodDays: user.noticePeriodDays !== undefined ? user.noticePeriodDays : 30,
          experienceYears: user.experienceYears !== undefined ? user.experienceYears : 5,
          assignedRoles: user.assignedRoles || [user.role.charAt(0).toUpperCase() + user.role.slice(1)],
          permissions: user.permissions || createPermissionsMap(),
          bankDetails: user.bankDetails || {
            accountHolder: user.name,
            accountNumber: '',
            bankName: '',
            ifsc: ''
          },
          ctcAnnual: user.ctcAnnual !== undefined && user.ctcAnnual !== null && !isNaN(user.ctcAnnual) ? Number(user.ctcAnnual) : 0,
          pfEnrolled: user.pfEnrolled !== undefined ? user.pfEnrolled : true,
          esiEnrolled: user.esiEnrolled !== undefined ? user.esiEnrolled : false,
          taxBracket: user.taxBracket || '20% Bracket',
          leaveBalance: user.leaveBalance || {
            sick: 12,
            casual: 10,
            annual: 15,
            maternity: 90,
            paternity: 14,
            compOff: 5,
            lwp: 0
          },
          doctorSlots: user.doctorSlots || [],
          weeklyOff: user.weeklyOff || [],
          carriedForwardLeaves: user.carriedForwardLeaves || 0,
          monthlyLeaveAllocation: user.monthlyLeaveAllocation || { sick: 1, casual: 1, annual: 1.25 }
        };
      });
      setEmployees(mappedBackendEmployees);

      // Fetch leaves
      const resLeaves = await api.get('/hr/leaves');
      setLeaveRequests(resLeaves.data);

      // Fetch attendance
      const resAttendance = await api.get('/hr/attendance');
      setAttendanceRecords(resAttendance.data);

      // Fetch assets
      const resAssets = await api.get('/hr/assets');
      setAssets(resAssets.data);

      // Fetch role coverage
      await fetchRoleCoverage();
    } catch (err) {
      console.error('Failed to load HR dashboard data:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // State manipulation callbacks
  const handleAddEmployee = async (empData) => {
    try {
      await api.post('/admin/users', {
        staff_id: empData.staff_id || `EMP-${Date.now()}`,
        password: empData.password || 'Welcome@123',
        role: empData.assignedRoles?.[0]?.toLowerCase() || 'doctor',
        name: empData.name,
        email: empData.email,
        specialty: empData.specialty || empData.department || '',
        max_slots: 10,
        phone: empData.phone,
        avatar: empData.photoUrl,
        gender: empData.gender,
        dob: empData.dob,
        bloodGroup: empData.bloodGroup,
        address: empData.address,
        emergencyContact: empData.emergencyContact,
        aadhaar: empData.aadhaar,
        pan: empData.pan,
        department: empData.department,
        designation: empData.designation,
        employmentType: empData.employmentType,
        joiningDate: empData.joiningDate,
        reportingManagerId: empData.reportingManagerId,
        reportingManagerName: empData.reportingManagerName,
        workLocation: empData.workLocation,
        shiftName: empData.shiftName,
        grade: empData.grade,
        status: empData.status || 'Active',
        noticePeriodDays: empData.noticePeriodDays,
        assignedRoles: empData.assignedRoles,
        permissions: empData.permissions,
        bankDetails: empData.bankDetails,
        ctcAnnual: empData.ctcAnnual,
        pfEnrolled: empData.pfEnrolled,
        esiEnrolled: empData.esiEnrolled,
        taxBracket: empData.taxBracket,
        leaveBalance: empData.leaveBalance,
        doctorSlots: empData.doctorSlots || [],
        weeklyOff: empData.weeklyOff || 'Sunday'
      });

      await fetchData(false);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateEmployee = async (id, updatedData) => {
    try {
      const existingEmployee = employees.find(emp => emp.id === id) || {};
      const mergedData = { ...existingEmployee, ...updatedData };

      const payload = {
        name: mergedData.name,
        email: mergedData.email,
        role: mergedData.assignedRoles?.[0]?.toLowerCase() || 'doctor',
        specialty: mergedData.department,
        status: mergedData.status,
        phone: mergedData.phone,
        avatar: mergedData.photoUrl,
        gender: mergedData.gender,
        dob: mergedData.dob,
        bloodGroup: mergedData.bloodGroup,
        address: mergedData.address,
        emergencyContact: mergedData.emergencyContact,
        aadhaar: mergedData.aadhaar,
        pan: mergedData.pan,
        department: mergedData.department,
        designation: mergedData.designation,
        employmentType: mergedData.employmentType,
        joiningDate: mergedData.joiningDate,
        reportingManagerId: mergedData.reportingManagerId,
        reportingManagerName: mergedData.reportingManagerName,
        workLocation: mergedData.workLocation,
        shiftName: mergedData.shiftName,
        grade: mergedData.grade,
        noticePeriodDays: mergedData.noticePeriodDays,
        experienceYears: mergedData.experienceYears,
        assignedRoles: mergedData.assignedRoles,
        permissions: mergedData.permissions,
        bankDetails: mergedData.bankDetails,
        ctcAnnual: mergedData.ctcAnnual,
        pfEnrolled: mergedData.pfEnrolled,
        esiEnrolled: mergedData.esiEnrolled,
        taxBracket: mergedData.taxBracket,
        leaveBalance: mergedData.leaveBalance,
        doctorSlots: mergedData.doctorSlots,
        weeklyOff: mergedData.weeklyOff,
        carriedForwardLeaves: mergedData.carriedForwardLeaves,
        monthlyLeaveAllocation: mergedData.monthlyLeaveAllocation,
        documents: mergedData.documents,
        consultationFee: mergedData.consultationFee !== undefined && mergedData.consultationFee !== '' ? Number(mergedData.consultationFee) : undefined
      };
      if (mergedData.password) {
        payload.password = mergedData.password;
      }
      await api.put(`/admin/users/${id}`, payload);
      await fetchData(false);
    } catch (err) {
      console.error(err);
      showFeedback(err.response?.data?.error || err.message || 'Failed to update employee details', 'error');
    }
  };

  const handleDeactivateEmployee = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      await fetchData(false);
    } catch (err) {
      console.error(err);
      showFeedback('Failed to deactivate employee', 'error');
    }
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
    } catch (err) {
      console.error('Failed to sync direct revoke to backend', err);
      showFeedback('Failed to revoke permission on the server.', 'error');
    }
  };

  const handleApplyPendingChanges = () => {
    const selectedStaff = employees.find(s => s.id === pmSelectedStaffId || s.name === pmSelectedStaffId);
    if (!selectedStaff) return;
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
          note: 'Assigned by HR administrator'
        };
      } else {
        delete nextState[selectedStaff.name][permId];
      }
    });

    localStorage.setItem('curoxa_pmState', JSON.stringify(nextState));
    setPmState(nextState);

    api.post('/auth/role-coverage', { state: nextState })
      .then(() => {
        showFeedback(`Permissions updated successfully for ${selectedStaff.name}!`, 'success');
      })
      .catch(err => {
        console.error('Failed to sync permission updates to backend', err);
        showFeedback('Failed to sync permission updates to backend', 'error');
      });

    // Clear state
    setPmPendingChanges({});
    setPmReason('');
  };

  const handleApproveLeave = async (id, comments) => {
    try {
      const match = leaveRequests.find(req => req._id === id || req.id === id);
      if (!match) return;

      const updatedStatus = { status: 'Approved', approvedBy: currentUser.name || 'HR Manager', approvedDate: new Date().toISOString().split('T')[0] };
      const res = await api.put(`/hr/leaves/${match._id || id}`, updatedStatus);
      
      setLeaveRequests(prev => prev.map(item => ((item._id === id || item.id === id) ? res.data : item)));

      const emp = employees.find(e => e.id === match.employeeId);
      if (emp && emp.email) {
        try {
          await api.post('/hr/notify-leave', {
            employeeName: emp.name,
            employeeEmail: emp.email,
            leaveType: match.leaveType,
            fromDate: match.fromDate || match.startDate,
            toDate: match.toDate || match.endDate,
            days: match.days || match.totalDays,
            status: 'Approved',
            approverName: currentUser.name || 'HR Manager'
          });
        } catch (emailErr) {
          console.warn('Email notification failed:', emailErr.message);
        }
      }
    } catch (err) {
      console.error('Failed to approve leave:', err);
      showFeedback('Failed to approve leave request', 'error');
    }
  };

  const handleRejectLeave = async (id, comments) => {
    try {
      const match = leaveRequests.find(req => req._id === id || req.id === id);
      if (!match) return;

      const updatedStatus = { status: 'Rejected', approvedBy: currentUser.name || 'HR Manager', approvedDate: new Date().toISOString().split('T')[0] };
      const res = await api.put(`/hr/leaves/${match._id || id}`, updatedStatus);
      
      setLeaveRequests(prev => prev.map(item => ((item._id === id || item.id === id) ? res.data : item)));

      const emp = employees.find(e => e.id === match.employeeId);
      if (emp && emp.email) {
        try {
          await api.post('/hr/notify-leave', {
            employeeName: emp.name,
            employeeEmail: emp.email,
            leaveType: match.leaveType,
            fromDate: match.fromDate || match.startDate,
            toDate: match.toDate || match.endDate,
            days: match.days || match.totalDays,
            status: 'Rejected',
            approverName: currentUser.name || 'HR Manager'
          });
        } catch (emailErr) {
          console.warn('Email notification failed:', emailErr.message);
        }
      }
    } catch (err) {
      console.error('Failed to reject leave:', err);
      showFeedback('Failed to reject leave request', 'error');
    }
  };

  const handleApproveAttendanceCorrection = async (id) => {
    try {
      const record = attendanceRecords.find(r => r._id === id || r.id === id);
      if (!record) return;

      const updated = {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        date: record.date,
        clockIn: record.correctionPunchIn || record.clockIn || '09:00',
        clockOut: record.correctionPunchOut || record.clockOut || '17:00',
        status: 'Present',
        workHours: 8.0,
        correctionRequested: false,
        correctionStatus: 'Approved'
      };

      await api.post('/hr/attendance', updated);
      await fetchData(false);
    } catch (err) {
      console.error('Failed to approve attendance correction', err);
    }
  };

  const handleRejectAttendanceCorrection = async (id) => {
    try {
      const record = attendanceRecords.find(r => r._id === id || r.id === id);
      if (!record) return;

      const updated = {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        date: record.date,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        status: record.status || 'Absent',
        workHours: record.workHours || 0,
        correctionRequested: false,
        correctionStatus: 'Rejected'
      };

      await api.post('/hr/attendance', updated);
      await fetchData(false);
    } catch (err) {
      console.error('Failed to reject attendance correction', err);
    }
  };

  const handleSaveAttendance = async (updatedRecord) => {
    try {
      await api.post('/hr/attendance', updatedRecord);
      await fetchData(false);
    } catch (err) {
      console.error('Failed to save attendance override', err);
    }
  };

  // Find currently logged-in employee profile for self-service views
  const currentEmployee = employees.find(e => 
    e.id === currentUser._id || 
    e.id === currentUser.id || 
    e.id === currentUser.staff_id || 
    e.staff_id === currentUser.staff_id ||
    e.email?.toLowerCase() === currentUser.email?.toLowerCase()
  ) || (currentUser ? {
    id: currentUser.staff_id || currentUser.id || 'staff',
    name: currentUser.name || 'Staff User',
    email: currentUser.email || 'staff@hospital.com',
    phone: currentUser.phone || '9988776655',
    designation: currentUser.role === 'admin' ? 'Administrator' : 'Staff Practitioner',
    department: currentUser.role === 'admin' ? 'Administration' : 'Clinical Operations',
    role: currentUser.role || 'staff',
    assignedRoles: [currentUser.role || 'staff'],
    joiningDate: '2026-01-01',
    grade: 'L6',
    status: 'Active',
    experienceYears: 5,
    reportingManagerName: 'Administration',
    shiftName: 'General Shift',
    dob: '1990-01-01',
    gender: 'Male',
    bloodGroup: 'O+',
    aadhaar: 'XXXX-XXXX-1234',
    pan: 'ABCDE1234F',
    address: 'Hospital Campus',
    emergencyContact: { name: 'Support Desk', relation: 'Office', phone: '100' },
    leaveBalance: { sick: 10, casual: 10, annual: 15, compOff: 0, maternity: 0, lwp: 0 }
  } : null);
  const matchedEmployee = currentEmployee || employees[0] || null;

  const handleSelectEmployee = (id) => {
    setSelectedEmployeeId(id);
    setActiveTab('Directory'); // focus directory context when selected
  };

  const handleGoBack = () => {
    if (onExit) {
      onExit();
    } else {
      if (currentUser.role === 'admin') navigate('/admin');
      else if (currentUser.role === 'doctor') navigate('/doctor');
      else if (currentUser.role === 'receptionist') navigate('/receptionist');
      else if (currentUser.role === 'lab') navigate('/lab');
      else if (currentUser.role === 'pharmacy') navigate('/pharmacy');
      else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
        window.dispatchEvent(new CustomEvent('curoxa_logout'));
        navigate('/login');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    window.dispatchEvent(new CustomEvent('curoxa_logout'));
    navigate('/login');
  };

  // Configure sidebar navigation items based on role clearances
  const sidebarItems = isAdminOrHR 
    ? [
        { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'Directory', label: 'Staff Directory', icon: Users },
        { id: 'Attendance', label: 'Attendance & Leaves', icon: CalendarClock },
        { id: 'RoleCoverage', label: 'Role Coverage', icon: UserCheck },
        { id: 'Reports', label: 'Audits & Reports', icon: FileText },
        { id: 'Settings', label: 'Configurations', icon: Settings }
      ]
    : [
        { id: 'MyProfile', label: 'My Profile', icon: Users }
      ];

  const isProfileWorkspace = !isAdminOrHR || selectedEmployeeId !== null;
  const profileTargetEmployee = isProfileWorkspace 
    ? (selectedEmployeeId ? employees.find(e => e.id === selectedEmployeeId) : matchedEmployee)
    : null;

  return (
    <div className="text-slate-800 flex relative overflow-hidden font-sans" style={{ 
      background: '#F8FAFC',
      color: '#1E293B',
      height: 'calc(100vh / 0.9)'
    }}>
      <style>{`
        html, body {
          overflow: hidden !important;
          height: calc(100vh / 0.9) !important;
        }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`sidebar flex flex-col justify-between z-40 shrink-0 fixed top-0 left-0 ${
          isSidebarCollapsed ? 'collapsed' : ''
        }`}
        style={{ 
          width: isSidebarCollapsed ? '70px' : '256px', 
          background: '#FFFFFF', 
          transition: 'width 0.2s ease', 
          borderRight: '1px solid #E2E8F0',
          bottom: 0,
          height: 'calc(100vh / 0.9)'
        }}
      >
        <div className="space-y-6 relative z-10">
          
          {/* Brand/Logo header */}
          <div className="sidebar-logo p-5 border-b border-slate-100 flex items-center justify-between relative">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: '#2563EB' }}>
                <Building2 className="w-5 h-5" />
              </div>
              {!isSidebarCollapsed && (
                <div className="logo-text">
                  <h2 className="font-display font-black text-blue-600 text-sm leading-none tracking-tight">CUROXA</h2>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mt-1" style={{ color: '#64748B' }}>Hospital HR</span>
                </div>
              )}
            </div>
            <button 
              className="sidebar-collapse-toggle desktop-only-flex"
              onClick={(e) => {
                e.stopPropagation();
                const nextVal = !isSidebarCollapsed;
                setIsSidebarCollapsed(nextVal);
                localStorage.setItem('curoxa_sidebar_collapsed', String(nextVal));
              }}
              style={{
                transform: isSidebarCollapsed ? 'rotate(180deg)' : 'none'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {sidebarItems.map((item) => {
              const IconComp = item.icon;
              const isSelected = activeTab === item.id && !selectedEmployeeId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedEmployeeId(null);
                    setActiveTab(item.id);
                    setOpenAddStaffModal(false);
                  }}
                  className={`nav-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${isSelected ? 'active' : ''}`}
                  style={{
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    color: isSelected ? '#2563EB' : '#64748B',
                    borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#64748B';
                    }
                  }}
                >
                  <IconComp className="w-4 h-4 shrink-0" style={{ color: isSelected ? '#2563EB' : '#475569' }} />
                  <span className="nav-link-text truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile capsule bottom */}
        <div className="p-4 relative z-10" style={{ borderTop: '1px solid #F1F5F9' }}>
          {showProfileDropdown && (
            <div className="absolute bottom-full mb-2 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex flex-col gap-1 z-50 animate-fadeIn">
              <button 
                onClick={() => {
                  setShowProfileDropdown(false);
                  const targetId = matchedEmployee?.id || currentUser.staff_id || currentUser._id || currentUser.id;
                  if (targetId) {
                    setSelectedEmployeeId(targetId);
                  }
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg flex items-center gap-2 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                My Profile
              </button>
              {currentUser.role === 'admin' && (
                <button 
                  onClick={() => {
                    setShowProfileDropdown(false);
                    handleGoBack();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded-lg flex items-center gap-2 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                  Switch to Admin
                </button>
              )}
              <button 
                onClick={() => {
                  setShowProfileDropdown(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Logout
              </button>
            </div>
          )}
          <div 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className={`sidebar-profile flex items-center p-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors select-none ${
              isSidebarCollapsed ? 'justify-center' : 'gap-3 overflow-hidden'
            }`} 
            style={{ 
              background: showProfileDropdown ? '#F1F5F9' : '#F8FAFC', 
              border: '1px solid #E2E8F0' 
            }}
          >
            {matchedEmployee?.photoUrl ? (
              <img 
                src={matchedEmployee.photoUrl} 
                alt={currentUser.name} 
                className="profile-avatar w-9 h-9 rounded-xl object-cover"
                style={{ border: '2px solid #60A5FA' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-xs shrink-0 select-none" style={{ background: '#2563EB' }}>
                {(currentUser.name || 'Staff').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="profile-info text-left overflow-hidden">
                <h4 className="profile-name font-bold text-xs text-slate-900 truncate leading-tight">{currentUser.name || 'Staff User'}</h4>
                <p className="profile-role text-[9px] font-semibold truncate uppercase mt-0.5" style={{ color: '#64748B' }}>{currentUser.role || 'Practitioner'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN WORKING CANVAS */}
      <main 
        className="flex-1 flex flex-col min-w-0 relative z-10"
        style={{ 
          marginLeft: isSidebarCollapsed ? '70px' : '256px', 
          transition: 'margin-left 0.2s ease',
          height: 'calc(100vh / 0.9)',
          overflow: 'hidden'
        }}
      >
        
        {/* Upper Header strip */}
        <header className="top-nav" style={{ 
          marginLeft: 0,
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0'
        }}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const nextVal = !isSidebarCollapsed;
                setIsSidebarCollapsed(nextVal);
                localStorage.setItem('curoxa_sidebar_collapsed', String(nextVal));
              }}
              className="p-1.5 rounded-lg" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
            >
              <Menu className="w-4 h-4" style={{ color: '#475569' }} />
            </button>
            <div className="hidden sm:block text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#64748B' }}>
                HR Module
              </span>
              <span className="font-semibold text-xs" style={{ color: '#0F172A' }}>
                Workforce Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Clock widget */}
            <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 font-semibold text-xs font-mono" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155' }}>
              <Clock className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span>{formatDateStr(currentTime)} &bull; {formatTimeStr(currentTime)}</span>
            </div>

            <button 
              onClick={() => showFeedback('No unread operational notifications.', 'success')}
              className="p-2 rounded-lg relative" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569' }}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <button 
              onClick={handleGoBack}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 shrink-0"
              style={{ border: '1px solid #EF4444', color: '#EF4444', background: '#FEF2F2' }}
            >
              Exit HR
            </button>
          </div>
        </header>

        {/* Dynamic content workspace canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative" data-lenis-prevent style={{ background: '#F8FAFC' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" style={{ borderColor: '#3B82F6' }}></div>
            </div>
          ) : (
            <div 
              key={isProfileWorkspace ? `profile-${profileTargetEmployee?.id}` : `tab-${activeTab}`}
              style={{ animation: 'adminFadeIn 0.15s ease-out' }}
            >
              {isProfileWorkspace ? (
                <EmployeeProfileView 
                  employee={profileTargetEmployee}
                  allLeaveRequests={leaveRequests}
                  allAttendanceRecords={attendanceRecords}
                  allAssets={assets}
                  onBack={isAdminOrHR ? () => setSelectedEmployeeId(null) : null}
                  onUpdateEmployee={handleUpdateEmployee}
                  isAdminOrHR={isAdminOrHR}
                />
              ) : (
                <>
                  {activeTab === 'Dashboard' && (
                    <DashboardView 
                      employees={employees}
                      leaveRequests={leaveRequests}
                      attendanceRecords={attendanceRecords}
                      notifications={notifications}
                      onApproveLeave={handleApproveLeave}
                      onRejectLeave={handleRejectLeave}
                      onApproveAttendance={handleApproveAttendanceCorrection}
                      onRejectAttendance={handleRejectAttendanceCorrection}
                      onSelectEmployee={handleSelectEmployee}
                      onNavigate={(tab, openModal = false) => {
                        setSelectedEmployeeId(null);
                        setActiveTab(tab);
                        setOpenAddStaffModal(openModal);
                      }}
                      jobs={jobs}
                      candidates={candidates}
                    />
                  )}

                  {activeTab === 'Directory' && (
                    <EmployeeDirectoryView 
                      employees={employees}
                      leaveRequests={leaveRequests}
                      onSelectEmployee={handleSelectEmployee}
                      onAddEmployee={handleAddEmployee}
                      onUpdateEmployee={handleUpdateEmployee}
                      onDeactivateEmployee={handleDeactivateEmployee}
                      initialIsAdding={openAddStaffModal}
                    />
                  )}


                  {activeTab === 'Attendance' && (
                    <AttendanceLeaveView 
                      employees={employees}
                      leaveRequests={leaveRequests}
                      attendanceRecords={attendanceRecords}
                      onApproveLeave={handleApproveLeave}
                      onRejectLeave={handleRejectLeave}
                      onApproveAttendance={handleApproveAttendanceCorrection}
                      onRejectAttendance={handleRejectAttendanceCorrection}
                      onSaveAttendance={handleSaveAttendance}
                    />
                  )}



                  {activeTab === 'Reports' && (
                    <ReportsView 
                      employees={employees}
                      attendanceRecords={attendanceRecords}
                      leaveRequests={leaveRequests}
                    />
                  )}

                  {activeTab === 'Settings' && (
                    <SettingsView />
                  )}

                  {activeTab === 'RoleCoverage' && (() => {
                    const selectedStaff = employees.find(s => s.id === pmSelectedStaffId || s.name === pmSelectedStaffId);
                    
                    // Compute active overrides ledger data
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

                    const pendingCount = Object.keys(pmPendingChanges).length;

                    return (
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
                            {employees
                              .filter(s => 
                                s.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
                                (s.role || '').toLowerCase().includes(rosterSearch.toLowerCase())
                              )
                              .map(s => {
                                const isActive = pmSelectedStaffId === s.id || pmSelectedStaffId === s.name;
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
                                        backgroundColor: '#EFF6FF',
                                        color: '#2563EB',
                                        border: '1px solid #BFDBFE'
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

                        {/* Right pane - Permissions Matrix Grid Editor (scrollable) */}
                        <div className="pm-detail-pane" data-lenis-prevent>
                          {selectedStaff ? (
                            <>
                              {/* Core Role Modules Card */}
                              {(() => {
                                const coreModules = pmModules.filter(m => m.coreFor.includes(selectedStaff.role));
                                const roleLabel = selectedStaff.role ? selectedStaff.role.charAt(0).toUpperCase() + selectedStaff.role.slice(1) : 'Staff';
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
                                    Configure modules for <span style={{ color: '#2563EB', fontWeight: 750 }}>{selectedStaff.name}</span> ({selectedStaff.role} · {selectedStaff.department})
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
                                  const filteredPerms = groupPerms.filter(m => 
                                    m.name.toLowerCase().includes(pmGridSearch.toLowerCase()) || 
                                    m.desc.toLowerCase().includes(pmGridSearch.toLowerCase())
                                  );

                                  if (filteredPerms.length === 0) return null;

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
                                        
                                        let activeState = false;
                                        if (isCore) {
                                          activeState = true;
                                        } else if (pendingChange !== undefined) {
                                          activeState = pendingChange.on;
                                        } else {
                                          activeState = activeOverride?.on === true;
                                        }

                                        return (
                                          <div key={perm.id} className="pm-module-row">
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
                                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #E2E8F0', marginTop: '10px' }}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" style={{ marginBottom: '8px', display: 'inline-block' }}><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                                      <p style={{ margin: 0, fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                                        No modules match your search query "{pmGridSearch}".
                                      </p>
                                    </div>
                                  );
                                }

                                return renderedGroups;
                              })()}

                              {/* Active Overrides Ledger Widget */}
                              <div className="pm-overrides-card animate-in">
                                <h3 className="pm-overrides-title">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                                  Hospital Active Coverage Overrides Ledger ({activeOverridesList.length})
                                </h3>
                                
                                {activeOverridesList.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {activeOverridesList.map(item => (
                                      <div key={`${item.staffName}-${item.permId}`} className="pm-override-row">
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>
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
                </>
              )}
            </div>
          )}
        </div>
      </main>
      {/* Toast Feedback Messages */}
      {success && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg font-semibold text-xs z-50 flex items-center gap-2 animate-slideUp">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {success}
        </div>
      )}
      {error && (
        <div className="fixed bottom-6 right-6 bg-red-600 text-white px-5 py-3 rounded-xl shadow-lg font-semibold text-xs z-50 flex items-center gap-2 animate-slideUp">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          {error}
        </div>
      )}

      {/* Styled PARITY CSS FOR PERMISSIONS MANAGER */}
      <style>{`
        /* ----- ROLE COVERAGE / PERMISSIONS MANAGER TAB ----- */
        .pm-container {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 28px;
          padding: 0;
          animation: adminFadeIn 0.3s ease-out;
          height: calc(100vh / 0.9 - 104px);
          min-height: 500px;
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
          left: 256px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-top: 1px solid #E2E8F0;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 1000;
          box-shadow: 0 -10px 30px rgba(0,0,0,0.03);
          transition: left 0.2s ease;
        }

        .sidebar.collapsed ~ main .pm-sticky-footer {
          left: 70px;
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
      `}</style>
    </div>
  );
}
