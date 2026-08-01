import React, { useState, useEffect } from 'react';
import { 
  User, Shield, CalendarDays, Wallet, Trophy, FileLock, ClipboardList, 
  MapPin, Clock, Phone, Mail, FileText, CheckCircle, AlertCircle, Printer, Plus, AlertTriangle,
  ShieldCheck, X, Settings, Check, Trash2, Trash, Edit3
} from 'lucide-react';

const ALL_TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM'
];

function createDefaultPermission(overrides) {
  return { view: true, create: false, edit: false, delete: false, approve: false, export: false, assign: false, ...overrides };
}

function createPermissionsMap(overrides) {
  const categories = ['Appointments','Patient Management','Billing','EMR','Laboratory','Pharmacy','Inventory','Purchase','Reports','Staff Management','Revenue','Audit Logs','Settings'];
  const result = {};
  categories.forEach(cat => { result[cat] = createDefaultPermission(overrides?.[cat]); });
  return result;
}

const DEFAULT_ROLE_TEMPLATES = [
  { roleName: 'Super Admin', isTemplate: true, permissions: createPermissionsMap({ Appointments: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, 'Patient Management': { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Billing: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, EMR: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Laboratory: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Pharmacy: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Inventory: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Purchase: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Reports: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, 'Staff Management': { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Revenue: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, 'Audit Logs': { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Settings: { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true } }) },
  { roleName: 'Doctor', isTemplate: true, permissions: createPermissionsMap({ Appointments: { view:true,create:true,edit:true,approve:true,export:true }, 'Patient Management': { view:true,create:true,edit:true,export:true }, EMR: { view:true,create:true,edit:true,approve:true,export:true }, Laboratory: { view:true }, Pharmacy: { view:true }, Reports: { view:true,export:true } }) },
  { roleName: 'Nurse', isTemplate: true, permissions: createPermissionsMap({ Appointments: { view:true,create:true,edit:true }, 'Patient Management': { view:true,create:true,edit:true }, EMR: { view:true,edit:true }, Laboratory: { view:true }, Inventory: { view:true,edit:true } }) },
  { roleName: 'Pharmacist', isTemplate: true, permissions: createPermissionsMap({ Pharmacy: { view:true,create:true,edit:true,approve:true,export:true }, Inventory: { view:true,create:true,edit:true }, Reports: { view:true,export:true } }) },
  { roleName: 'HR', isTemplate: true, permissions: createPermissionsMap({ 'Staff Management': { view:true,create:true,edit:true,delete:true,approve:true,export:true,assign:true }, Reports: { view:true,create:true,edit:true,export:true }, Settings: { view:true,edit:true } }) },
  { roleName: 'Finance', isTemplate: true, permissions: createPermissionsMap({ Billing: { view:true,create:true,edit:true,approve:true,export:true }, Revenue: { view:true,create:true,approve:true,export:true }, Reports: { view:true,create:true,export:true } }) }
];

export default function EmployeeProfileView({
  employee,
  allLeaveRequests = [],
  allAttendanceRecords = [],
  allAssets = [],
  onBack,
  onUpdateEmployee,
  isAdminOrHR = false
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [damageReportAssetId, setDamageReportAssetId] = useState(null);
  const [damageComments, setDamageComments] = useState('');

  // Settings edit states (synchronized with employee prop)
  const [assignedRoles, setAssignedRoles] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [reportingManagerName, setReportingManagerName] = useState('');
  const [shiftName, setShiftName] = useState('');
  const [carriedForwardLeaves, setCarriedForwardLeaves] = useState(0);
  const [monthlyLeaveAllocation, setMonthlyLeaveAllocation] = useState({ sick: 1, casual: 1, annual: 1.25 });
  const [employeeDocuments, setEmployeeDocuments] = useState([]);

  // Upload/Preview states for documents tab
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('certifications');
  const [newDocFile, setNewDocFile] = useState(null);
  const [newDocData, setNewDocData] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Doctor slots state
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [newSlotStartTime, setNewSlotStartTime] = useState('');
  const [newSlotEndTime, setNewSlotEndTime] = useState('');
  const [newSlotLimit, setNewSlotLimit] = useState(3);

  // Personal Info Edit State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalFormData, setPersonalFormData] = useState({
    dob: '', gender: '', bloodGroup: '', aadhaar: '', pan: '', address: '',
    emergencyContact: { name: '', relation: '', phone: '' }
  });

  // Professional Info Edit State
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [professionalFormData, setProfessionalFormData] = useState({
    department: '', designation: '', employmentType: '', reportingManagerName: '',
    shiftName: '', workLocation: '', noticePeriodDays: 30, weeklyOff: '', experienceYears: 0
  });

  // Salary Info Edit State
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [salaryFormData, setSalaryFormData] = useState({
    ctcAnnual: 0, pfEnrolled: true, esiEnrolled: true
  });

  // Sync states when employee changes
  useEffect(() => {
    if (employee) {
      setAssignedRoles([...(employee.assignedRoles || [])]);
      setPermissions(JSON.parse(JSON.stringify(employee.permissions || createPermissionsMap())));
      setReportingManagerName(employee.reportingManagerName || '');
      setShiftName(employee.shiftName || 'General Shift');
      setCarriedForwardLeaves(employee.carriedForwardLeaves || 0);
      setMonthlyLeaveAllocation(employee.monthlyLeaveAllocation || { sick: 1, casual: 1, annual: 1.25 });
      setEmployeeDocuments(employee.documents || []);
      setSelectedSlots(employee.doctorSlots || []);
      setPersonalFormData({
        dob: employee.dob || '',
        gender: employee.gender || '',
        bloodGroup: employee.bloodGroup || '',
        aadhaar: employee.aadhaar || '',
        pan: employee.pan || '',
        address: employee.address || '',
        emergencyContact: employee.emergencyContact || { name: '', relation: '', phone: '' }
      });
      setProfessionalFormData({
        role: employee.role || 'doctor',
        assignedRoles: employee.assignedRoles || ['Doctor'],
        department: employee.department || '',
        designation: employee.designation || '',
        employmentType: employee.employmentType || 'Full-Time',
        reportingManagerName: employee.reportingManagerName || '',
        shiftName: employee.shiftName || 'General Shift',
        workLocation: employee.workLocation || 'City Care Clinic',
        noticePeriodDays: employee.noticePeriodDays || 30,
        weeklyOff: employee.weeklyOff || '',
        experienceYears: employee.experienceYears || 0,
        consultationFee: employee.consultationFee !== undefined ? employee.consultationFee : 500
      });
      setSalaryFormData({
        ctcAnnual: employee.ctcAnnual !== undefined && employee.ctcAnnual !== null ? employee.ctcAnnual : 0,
        pfEnrolled: employee.pfEnrolled !== false,
        esiEnrolled: employee.esiEnrolled !== false
      });
    }
  }, [employee]);

  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewDocFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setNewDocData({
        fileName: file.name,
        fileType: file.type,
        fileData: evt.target.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSavePersonal = async () => {
    try {
      if (onUpdateEmployee) {
        await onUpdateEmployee(employee.id, personalFormData);
        showToast('Personal information updated successfully', 'success');
        setIsEditingPersonal(false);
      }
    } catch (err) {
      showToast('Failed to update personal information', 'error');
    }
  };

  const handleSaveProfessional = async () => {
    try {
      if (onUpdateEmployee) {
        await onUpdateEmployee(employee.id, professionalFormData);
        showToast('Professional information updated successfully', 'success');
        setIsEditingProfessional(false);
      }
    } catch (err) {
      showToast('Failed to update professional information', 'error');
    }
  };

  const handleSaveSalary = async () => {
    try {
      if (onUpdateEmployee) {
        const updatedCtc = parseInt(salaryFormData.ctcAnnual) || 0;
        await onUpdateEmployee(employee.id, {
          ctcAnnual: updatedCtc,
          pfEnrolled: salaryFormData.pfEnrolled,
          esiEnrolled: salaryFormData.esiEnrolled
        });
        showToast('Salary structure updated successfully', 'success');
        setIsEditingSalary(false);
      }
    } catch (err) {
      showToast('Failed to update salary details', 'error');
    }
  };

  // Local document state for simulation
  const [documentsList, setDocumentsList] = useState([]);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
        <User className="w-12 h-12 text-slate-300 mb-3" />
        <p className="font-bold text-sm">Profile Data Not Found</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">This user is not registered in the HR database. Only staff members with active HR profiles can view workspace metrics.</p>
        {onBack && (
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
            Back to Directory
          </button>
        )}
      </div>
    );
  }

  // Derived records
  const leaves = allLeaveRequests.filter(l => l.employeeId === employee.id);
  const attendance = allAttendanceRecords.filter(a => a.employeeId === employee.id);
  const assets = allAssets.filter(as => as.allocatedToEmployeeId === employee.id);

  // Generate salary slips dynamically based on joining date
  const getEmployeeSalarySlips = () => {
    if (employee.salarySlips && employee.salarySlips.length > 0) {
      return employee.salarySlips;
    }

    const joinDateObj = employee.joiningDate ? new Date(employee.joiningDate) : new Date();
    if (isNaN(joinDateObj.getTime())) return [];

    const now = new Date();
    const slips = [];

    const joinYear = joinDateObj.getFullYear();
    const joinMonth = joinDateObj.getMonth();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let tempDate = new Date(joinYear, joinMonth, 1);
    while (tempDate <= now) {
      const y = tempDate.getFullYear();
      const m = tempDate.getMonth();

      const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
      const isCompletedMonth = (y < currentYear || (y === currentYear && m < currentMonth)) ||
                               (y === currentYear && m === currentMonth && now.getDate() >= lastDayOfMonth);

      if (isCompletedMonth) {
        const monthName = tempDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const ctc = employee.ctcAnnual || 480000;
        const basic = Math.round(ctc * 0.45 / 12);
        const hra = Math.round(ctc * 0.20 / 12);
        const conveyance = 1500;
        const medicalAllowance = 1250;
        const specialAllowance = Math.round(ctc * 0.15 / 12);
        const bonus = (employee.designation || '').toLowerCase().includes('chief') ? 1200 : 0;
        
        const pfDeduction = employee.pfEnrolled ? Math.min(1800, Math.round(basic * 0.12)) : 0;
        const esiDeduction = employee.esiEnrolled ? Math.round(basic * 0.0075) : 0;
        const professionalTax = 200;
        const incomeTax = Math.round(ctc * 0.18 / 12);

        const totalEarnings = basic + hra + conveyance + medicalAllowance + specialAllowance + bonus;
        const totalDeductions = pfDeduction + esiDeduction + professionalTax + incomeTax;
        const netPayable = totalEarnings - totalDeductions;

        const dateFormatted = `${y}-${String(m + 1).padStart(2, '0')}-${lastDayOfMonth}`;

        slips.unshift({
          id: `PAY-${employee.id}-${String(m + 1).padStart(2, '0')}${String(y).slice(-2)}`,
          employeeId: employee.id,
          employeeName: employee.name,
          designation: employee.designation,
          department: employee.department,
          month: monthName,
          basic,
          hra,
          conveyance,
          medicalAllowance,
          specialAllowance,
          bonus,
          pfDeduction,
          esiDeduction,
          professionalTax,
          incomeTax,
          totalEarnings,
          totalDeductions,
          netPayable,
          status: 'Paid',
          processedDate: dateFormatted
        });
      }

      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    return slips;
  };

  const salarySlips = getEmployeeSalarySlips();

  const handleVerifyDoc = (index) => {
    const updated = [...documentsList];
    updated[index].status = 'Verified';
    setDocumentsList(updated);
  };

  const handleSubmitDamageReport = (e) => {
    e.preventDefault();
    if (!damageReportAssetId) return;
    showToast(`Damage report submitted successfully for Asset ${damageReportAssetId}. Support desk notified.`, 'success');
    setDamageReportAssetId(null);
    setDamageComments('');
  };

  return (
    <div className="space-y-6" id="employee-profile-workspace">
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'error' ? '#FEF2F2' : '#EFF6FF',
          border: toast.type === 'error' ? '1px solid #FCA5A5' : '1px solid #BFDBFE',
          borderRadius: '8px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: toast.type === 'error' ? '#EF4444' : '#2563EB'
          }}></div>
          <span style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: toast.type === 'error' ? '#991B1B' : '#1E40AF'
          }}>{toast.message}</span>
        </div>
      )}
      
      {/* Back button and profile title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="px-2 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-colors text-xs"
            >
              &larr; Back to Directory
            </button>
          )}
          <div>
            <h1 className="text-lg font-display font-bold text-slate-900">Hospital Employee Workspace</h1>
            <p className="text-slate-400 text-xs">Direct personnel configuration and performance metrics logging.</p>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            {employee.photoUrl ? (
              <img 
                src={employee.photoUrl} 
                alt={employee.name} 
                className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-50 shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-blue-50 border-4 border-slate-50 text-blue-600 font-bold flex items-center justify-center text-2xl shadow-md select-none shrink-0">
                {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h2 className="text-xl font-display font-bold text-slate-900">{employee.name}</h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-md text-[10px] uppercase font-mono">
                  {employee.id}
                </span>
              </div>
              <p className="text-slate-600 font-medium text-xs flex items-center justify-center sm:justify-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {employee.designation} &bull; {employee.department}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                {employee.assignedRoles.map(role => (
                  <span key={role} className="px-2 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded text-[10px] inline-flex items-center gap-0.5">
                    <Shield className="w-3 h-3 text-slate-400" />
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 w-full sm:w-32 text-center sm:text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">JOINING DATE</span>
              <span className="text-xs font-semibold text-slate-800">{employee.joiningDate}</span>
            </div>
            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 w-full sm:w-32 text-center sm:text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">GRADE TIER</span>
              <span className="text-xs font-semibold text-slate-800">{employee.grade}</span>
            </div>
            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 w-full sm:w-32 text-center sm:text-left">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">EMPLOYEE STATUS</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
              }`}>
                {employee.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Inspired by Keka) */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap bg-white px-6 rounded-xl border border-slate-100 shadow-sm scrollbar-none">
        {(() => {
          const isDoctor = employee.role === 'doctor' || 
                           (employee.assignedRoles && employee.assignedRoles.some(r => r.toLowerCase() === 'doctor')) ||
                           (employee.designation && employee.designation.toLowerCase().includes('doctor'));
          const tabsList = [
            { id: 'Overview', label: 'Overview', icon: ClipboardList },
            { id: 'Personal', label: 'Personal Information', icon: User },
            { id: 'Professional', label: 'Professional Info', icon: MapPin },
            { id: 'Attendance', label: 'Attendance logs', icon: Clock },
            { id: 'Leave', label: 'Leave & Balance', icon: CalendarDays },
            { id: 'Payroll', label: 'Salary & Payslips', icon: Wallet },
            { id: 'Performance', label: 'Goals & Reviews', icon: Trophy },
            { id: 'Documents', label: 'Verification Docs', icon: FileLock },
          ];

          if (isDoctor) {
            tabsList.push({ id: 'Slots', label: 'Appointment Slots', icon: Clock });
          }
          return tabsList.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          });
        })()}
      </div>

      {/* Profile Tab Contents */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[300px]">
        
        {/* TAB 1: Overview */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              
              {/* Overview brief */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Professional Bio</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {employee.name} serves as a {employee.designation || 'Staff Practitioner'} in the {employee.department || 'Clinical Operations'} division. 
                  Having joined our hospital on {employee.joiningDate || 'recently'}, {employee.gender === 'Male' ? 'he' : employee.gender === 'Female' ? 'she' : 'they'} maintains an active operational footprint 
                  with {employee.experienceYears || 0} years of professional experience in healthcare operations.
                </p>
              </div>

              {/* General Work parameters */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">REPORTING MANAGER</span>
                  <span className="text-xs font-semibold text-slate-800">{employee.reportingManagerName || 'None assigned'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">HOSPITAL SHIFT WORK</span>
                  <span className="text-xs font-semibold text-slate-800">{employee.shiftName || 'General Shift'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">OFFICIAL EMAIL</span>
                  <span className="text-xs font-semibold text-slate-800">{employee.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">PHONE CONTACT</span>
                  <span className="text-xs font-semibold text-slate-800">{employee.phone || 'Not provided'}</span>
                </div>
              </div>

              {/* Activity log timeline */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Audit & Activity Log</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full mt-1 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Staff Account Created & Registered</span>
                      <span className="text-[10px] text-slate-400 block">{employee.joiningDate || 'Today'} - Onboarding Workflow</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Role Credentials Active ({employee.assignedRoles?.[0] || employee.role || 'Staff'})</span>
                      <span className="text-[10px] text-slate-400 block">{employee.joiningDate || 'Today'} - Security Clearance Granted</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick overview side stats */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Workspace Quick Stats</h3>
              
              <div className="space-y-3.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Attendance Logged</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {attendance.length > 0 ? `${Math.round((attendance.filter(a => a.status === 'Present' || a.status === 'Late').length / attendance.length) * 100)}%` : 'N/A (New Joiner)'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Remaining Annual Leaves</span>
                  <span className="font-semibold text-slate-900 font-mono">{employee.leaveBalance?.annual || 0} Days</span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Documents Uploaded</span>
                  <span className="font-semibold text-emerald-600 font-mono">{employeeDocuments.length || 0} Verified</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Assigned Permissions Overview</h4>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className={`flex items-center gap-1 font-medium ${employee.permissions?.EMR?.view !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${employee.permissions?.EMR?.view !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    EMR View: {employee.permissions?.EMR?.view !== false ? 'Yes' : 'No'}
                  </div>
                  <div className={`flex items-center gap-1 font-medium ${employee.permissions?.['Patient Management']?.edit !== false ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${employee.permissions?.['Patient Management']?.edit !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    Patient Edit: {employee.permissions?.['Patient Management']?.edit !== false ? 'Yes' : 'No'}
                  </div>
                  <div className={`flex items-center gap-1 font-medium ${employee.permissions?.Billing?.edit ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${employee.permissions?.Billing?.edit ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    Billing Edit: {employee.permissions?.Billing?.edit ? 'Yes' : 'No'}
                  </div>
                  <div className={`flex items-center gap-1 font-medium ${employee.permissions?.['Staff Management']?.view ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${employee.permissions?.['Staff Management']?.view ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    Staff Manage: {employee.permissions?.['Staff Management']?.view ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Personal Information */}
        {activeTab === 'Personal' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Demographics & Identity Details</h3>
              {isAdminOrHR && !isEditingPersonal && (
                <button onClick={() => setIsEditingPersonal(true)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              )}
              {isEditingPersonal && (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingPersonal(false)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSavePersonal} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">DATE OF BIRTH</span>
                  {isEditingPersonal ? (
                    <input type="date" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={personalFormData.dob} onChange={e => setPersonalFormData({...personalFormData, dob: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.dob || 'Not provided'}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">GENDER IDENTITY</span>
                  {isEditingPersonal ? (
                    <select className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={personalFormData.gender} onChange={e => setPersonalFormData({...personalFormData, gender: e.target.value})}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.gender || 'Not provided'}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">BLOOD GROUP TYPE</span>
                  {isEditingPersonal ? (
                    <select className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={personalFormData.bloodGroup} onChange={e => setPersonalFormData({...personalFormData, bloodGroup: e.target.value})}>
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.bloodGroup || 'Not provided'}</span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">AADHAAR SECURE CARD NUMBER</span>
                  {isEditingPersonal ? (
                    <input type="text" placeholder="XXXX-XXXX-XXXX" className="w-full h-8 px-2 border border-slate-200 rounded text-xs font-mono outline-none focus:border-blue-500" value={personalFormData.aadhaar} onChange={e => setPersonalFormData({...personalFormData, aadhaar: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800 font-mono">{employee.aadhaar || 'Not provided'}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">PAN TAX SECURE NUMBER</span>
                  {isEditingPersonal ? (
                    <input type="text" placeholder="ABCDE1234F" className="w-full h-8 px-2 border border-slate-200 rounded text-xs font-mono outline-none focus:border-blue-500" value={personalFormData.pan} onChange={e => setPersonalFormData({...personalFormData, pan: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800 font-mono">{employee.pan || 'Not provided'}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">RESIDENTIAL PERMANENT ADDRESS</span>
                  {isEditingPersonal ? (
                    <textarea rows="3" className="w-full p-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500 resize-none" value={personalFormData.address} onChange={e => setPersonalFormData({...personalFormData, address: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800 leading-relaxed block">{employee.address || 'Not provided'}</span>
                  )}
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/40 space-y-3 h-fit">
                <span className="text-xs font-bold text-blue-955 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Emergency Hospital Contact
                </span>
                <p className="text-[11px] text-blue-700 leading-relaxed">This contact is flagged for critical shift/medical alerts.</p>
                <div className="space-y-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-blue-500 font-semibold block mb-1">PRIMARY CONTACT NAME</span>
                    {isEditingPersonal ? (
                      <input type="text" className="w-full h-7 px-2 border border-blue-200 rounded bg-white text-xs outline-none focus:border-blue-500" value={personalFormData.emergencyContact.name} onChange={e => setPersonalFormData({...personalFormData, emergencyContact: {...personalFormData.emergencyContact, name: e.target.value}})} />
                    ) : (
                      <span className="font-semibold text-slate-800">{employee.emergencyContact?.name || 'Not provided'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-500 font-semibold block mb-1">RELATIONSHIP TIE</span>
                    {isEditingPersonal ? (
                      <input type="text" className="w-full h-7 px-2 border border-blue-200 rounded bg-white text-xs outline-none focus:border-blue-500" value={personalFormData.emergencyContact.relation} onChange={e => setPersonalFormData({...personalFormData, emergencyContact: {...personalFormData.emergencyContact, relation: e.target.value}})} />
                    ) : (
                      <span className="font-semibold text-slate-800">{employee.emergencyContact?.relation || 'Not provided'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-500 font-semibold block mb-1">PHONE NUMBER</span>
                    {isEditingPersonal ? (
                      <input type="tel" className="w-full h-7 px-2 border border-blue-200 rounded bg-white text-xs font-mono outline-none focus:border-blue-500" value={personalFormData.emergencyContact.phone} onChange={e => setPersonalFormData({...personalFormData, emergencyContact: {...personalFormData.emergencyContact, phone: e.target.value}})} />
                    ) : (
                      <span className="font-semibold text-slate-800 font-mono">{employee.emergencyContact?.phone || 'Not provided'}</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: Professional Information */}
        {activeTab === 'Professional' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Hospital Assignment Metadata</h3>
              {isAdminOrHR && !isEditingProfessional && (
                <button onClick={() => setIsEditingProfessional(true)} className="px-4 py-2 text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              )}
              {isEditingProfessional && (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingProfessional(false)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveProfessional} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">ACCESS ROLE</span>
                  {isEditingProfessional ? (
                    <select 
                      className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500 bg-white" 
                      value={professionalFormData.role || 'doctor'} 
                      onChange={e => {
                        const newRole = e.target.value;
                        setProfessionalFormData({
                          ...professionalFormData, 
                          role: newRole,
                          assignedRoles: [newRole.charAt(0).toUpperCase() + newRole.slice(1)]
                        });
                      }}
                    >
                      <option value="doctor">Doctor</option>
                      <option value="receptionist">Receptionist</option>
                      <option value="lab">Laboratory</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="hr">HR Manager</option>
                      <option value="admin">System Admin</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-slate-800 capitalize">{employee.role}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">MEDICAL DIVISION / DEPT</span>
                  {isEditingProfessional ? (
                    <input type="text" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.department} onChange={e => setProfessionalFormData({...professionalFormData, department: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.department}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">CLINICAL DESIGNATION</span>
                  {isEditingProfessional ? (
                    <input type="text" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.designation} onChange={e => setProfessionalFormData({...professionalFormData, designation: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.designation}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">EMPLOYMENT CONTRACT TYPE</span>
                  {isEditingProfessional ? (
                    <input type="text" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.employmentType} onChange={e => setProfessionalFormData({...professionalFormData, employmentType: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.employmentType}</span>
                  )}
                </div>
                {(employee.role === 'doctor' || professionalFormData.role === 'doctor') && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">DOCTOR CONSULTATION FEE (₹)</span>
                    {isEditingProfessional ? (
                      <input type="number" className="w-full h-8 px-2 border border-slate-200 rounded text-xs font-semibold text-slate-800 outline-none focus:border-blue-500" value={professionalFormData.consultationFee} onChange={e => setProfessionalFormData({...professionalFormData, consultationFee: e.target.value !== '' ? Number(e.target.value) : ''})} />
                    ) : (
                      <span className="text-xs font-bold text-blue-600 font-mono">₹{employee.consultationFee !== undefined ? employee.consultationFee : 500}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">REPORTING MANAGER</span>
                  {isEditingProfessional ? (
                    <input type="text" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.reportingManagerName} onChange={e => setProfessionalFormData({...professionalFormData, reportingManagerName: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.reportingManagerName || 'None'}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">ROSTER SHIFT</span>
                  {isEditingProfessional ? (
                    <input type="text" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.shiftName} onChange={e => setProfessionalFormData({...professionalFormData, shiftName: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.shiftName}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">WEEKLY OFF DAYS</span>
                  {isEditingProfessional ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                        const isSelected = Array.isArray(professionalFormData.weeklyOff)
                          ? professionalFormData.weeklyOff.includes(day)
                          : (professionalFormData.weeklyOff || '').split(',').map(d => d.trim()).includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              let currentOffs = Array.isArray(professionalFormData.weeklyOff)
                                ? [...professionalFormData.weeklyOff]
                                : (professionalFormData.weeklyOff ? professionalFormData.weeklyOff.split(',').map(d => d.trim()) : []);
                              if (currentOffs.includes(day)) {
                                currentOffs = currentOffs.filter(d => d !== day);
                              } else {
                                currentOffs.push(day);
                              }
                              setProfessionalFormData({...professionalFormData, weeklyOff: currentOffs});
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">
                      {Array.isArray(employee.weeklyOff) ? employee.weeklyOff.join(', ') : (employee.weeklyOff || 'Sunday (Default)')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">GEOGRAPHICAL WORK LOCATION</span>
                  {isEditingProfessional ? (
                    <input type="text" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.workLocation} onChange={e => setProfessionalFormData({...professionalFormData, workLocation: e.target.value})} />
                  ) : (
                    <span className="text-xs font-semibold text-slate-800">{employee.workLocation || 'City Care Clinic'}</span>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">NOTICE PERIOD</span>
                    {isEditingProfessional ? (
                      <input type="number" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.noticePeriodDays} onChange={e => setProfessionalFormData({...professionalFormData, noticePeriodDays: parseInt(e.target.value) || 0})} />
                    ) : (
                      <span className="text-xs font-semibold text-slate-800">{employee.noticePeriodDays} Days</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">EXPERIENCE</span>
                    {isEditingProfessional ? (
                      <input type="number" className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-500" value={professionalFormData.experienceYears} onChange={e => setProfessionalFormData({...professionalFormData, experienceYears: parseInt(e.target.value) || 0})} />
                    ) : (
                      <span className="text-xs font-semibold text-slate-800">{employee.experienceYears} Years</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">EMPLOYEE SECURITY CLEARANCE</span>
                  <span className="text-xs font-semibold text-emerald-600">HIPAA Certified</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: Attendance logs */}
        {activeTab === 'Attendance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Punch In/Out Log</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated synchronization with fingerprint scanners and RFID logs.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Biometric Node Online
              </span>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Roster Date</th>
                    <th className="px-6 py-3">Punch In</th>
                    <th className="px-6 py-3">Punch Out</th>
                    <th className="px-6 py-3">Shift Working Hours</th>
                    <th className="px-6 py-3">Overtime</th>
                    <th className="px-6 py-3 text-right">Status Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-semibold text-slate-800">{att.date}</td>
                      <td className="px-6 py-3 font-mono text-slate-600">{att.punchIn}</td>
                      <td className="px-6 py-3 font-mono text-slate-600">{att.punchOut}</td>
                      <td className="px-6 py-3 font-mono text-slate-700">{att.workingHours > 0 ? `${att.workingHours.toFixed(1)} Hrs` : 'Active / Pending'}</td>
                      <td className="px-6 py-3 font-mono text-emerald-600">{att.overtimeHours > 0 ? `+${att.overtimeHours.toFixed(1)} Hrs` : '0.0'}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                          att.status === 'Late' ? 'bg-orange-50 text-orange-700' :
                          att.status === 'Half Day' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No biometric punch logs recorded for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: Leave & Balance */}
        {activeTab === 'Leave' && (
          <div className="space-y-6">
            
            {/* Balance widgets */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Leave Balance Matrix</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">SICK LEAVE</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">{employee.leaveBalance.sick}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">CASUAL LEAVE</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">{employee.leaveBalance.casual}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">ANNUAL LEAVE</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">{employee.leaveBalance.annual}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">COMPENSATORY</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">{employee.leaveBalance.compOff}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">MATERNITY</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">{employee.leaveBalance.maternity}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">LWP</span>
                  <span className="text-lg font-bold text-slate-800 font-mono">{employee.leaveBalance.lwp}</span>
                </div>
              </div>
            </div>

            {isAdminOrHR && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-600" />
                  Leave Setup & Allocation (HR Mode)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Carried Forward</label>
                    <input 
                      type="number"
                      value={carriedForwardLeaves}
                      onChange={(e) => setCarriedForwardLeaves(Number(e.target.value) || 0)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Monthly Sick Leave</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={monthlyLeaveAllocation.sick}
                      onChange={(e) => setMonthlyLeaveAllocation({...monthlyLeaveAllocation, sick: Number(e.target.value) || 0})}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Monthly Casual Leave</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={monthlyLeaveAllocation.casual}
                      onChange={(e) => setMonthlyLeaveAllocation({...monthlyLeaveAllocation, casual: Number(e.target.value) || 0})}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Monthly Paid/Annual</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={monthlyLeaveAllocation.annual}
                      onChange={(e) => setMonthlyLeaveAllocation({...monthlyLeaveAllocation, annual: Number(e.target.value) || 0})}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await onUpdateEmployee(employee.id, {
                          carriedForwardLeaves,
                          monthlyLeaveAllocation
                        });
                        showToast('Leave configuration updated successfully!', 'success');
                      } catch (err) {
                        showToast('Failed to update leave configuration.', 'error');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Save Leave Allocations
                  </button>
                </div>
              </div>
            )}

            {/* Leave requests lists */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leave Applications Archive</h3>
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-3">Leave Type</th>
                      <th className="px-6 py-3">Start Date</th>
                      <th className="px-6 py-3">End Date</th>
                      <th className="px-6 py-3">Calendar Days</th>
                      <th className="px-6 py-3">Reason for Leave</th>
                      <th className="px-6 py-3 text-right">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-semibold text-slate-800">{l.leaveType}</td>
                        <td className="px-6 py-3 text-slate-600">{l.startDate}</td>
                        <td className="px-6 py-3 text-slate-600">{l.endDate}</td>
                        <td className="px-6 py-3 font-mono text-slate-700">{l.totalDays} Days</td>
                        <td className="px-6 py-3 text-slate-500 italic max-w-xs truncate">{l.reason}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                            l.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {leaves.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                          No leave applications on file for this contract.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: Salary & Payslips */}
        {activeTab === 'Payroll' && (
          <div className="space-y-6">
            
            {/* Salary Breakdown Widget */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Salary Structure Breakdown</h3>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold text-xs px-3 py-1 rounded-full ${employee.ctcAnnual > 0 ? 'text-blue-600 bg-blue-50' : 'text-amber-700 bg-amber-50 border border-amber-200'}`}>
                    Annual CTC: ₹{(employee.ctcAnnual || 0).toLocaleString()} {employee.ctcAnnual === 0 ? '(Not Set)' : ''}
                  </span>
                  {isAdminOrHR && !isEditingSalary && (
                    <button 
                      onClick={() => {
                        setSalaryFormData({
                          ctcAnnual: employee.ctcAnnual !== undefined && employee.ctcAnnual !== null ? employee.ctcAnnual : 0,
                          pfEnrolled: employee.pfEnrolled !== false,
                          esiEnrolled: employee.esiEnrolled !== false
                        });
                        setIsEditingSalary(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Salary Structure
                    </button>
                  )}
                </div>
              </div>

              {isEditingSalary && (
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 mb-6 space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-blue-600" />
                      Update Annual CTC & Statutory Contributions
                    </h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsEditingSalary(false)} 
                        className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveSalary} 
                        className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Save Salary Changes
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Annual CTC (₹ INR) *</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 480000" 
                        value={salaryFormData.ctcAnnual} 
                        onChange={e => setSalaryFormData({...salaryFormData, ctcAnnual: e.target.value})} 
                        className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white font-mono font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500" 
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <input 
                        type="checkbox" 
                        id="edit-pf-enrolled"
                        checked={salaryFormData.pfEnrolled} 
                        onChange={e => setSalaryFormData({...salaryFormData, pfEnrolled: e.target.checked})} 
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer" 
                      />
                      <label htmlFor="edit-pf-enrolled" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Provident Fund (PF) Enrolled
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <input 
                        type="checkbox" 
                        id="edit-esi-enrolled"
                        checked={salaryFormData.esiEnrolled} 
                        onChange={e => setSalaryFormData({...salaryFormData, esiEnrolled: e.target.checked})} 
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer" 
                      />
                      <label htmlFor="edit-esi-enrolled" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Employee State Insurance (ESI) Enrolled
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">MONTHLY EARNINGS</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Basic Pay</span>
                      <span className="font-semibold text-slate-800 font-mono">₹{Math.round(((employee.ctcAnnual || 0) * 0.45 / 12)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HRA (House Rent Allowance)</span>
                      <span className="font-semibold text-slate-800 font-mono">₹{Math.round(((employee.ctcAnnual || 0) * 0.20 / 12)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Medical Allowance</span>
                      <span className="font-semibold text-slate-800 font-mono">₹{employee.ctcAnnual > 0 ? '1,250' : '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Conveyance Allowance</span>
                      <span className="font-semibold text-slate-800 font-mono">₹{employee.ctcAnnual > 0 ? '1,600' : '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Special Allowance</span>
                      <span className="font-semibold text-slate-800 font-mono">₹{Math.round(((employee.ctcAnnual || 0) * 0.15 / 12)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">MONTHLY DEDUCTIONS</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Provident Fund (PF)</span>
                      <span className="font-semibold text-red-600 font-mono">{employee.pfEnrolled && employee.ctcAnnual > 0 ? `-₹${Math.min(1800, Math.round(((employee.ctcAnnual || 0) * 0.45 / 12) * 0.12)).toLocaleString()}` : '₹0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Employee State Insurance (ESI)</span>
                      <span className="font-semibold text-red-600 font-mono">{employee.esiEnrolled && employee.ctcAnnual > 0 ? `-₹${Math.round(((employee.ctcAnnual || 0) * 0.45 / 12) * 0.0075).toLocaleString()}` : '₹0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Professional Tax (PT)</span>
                      <span className="font-semibold text-red-600 font-mono">{employee.ctcAnnual > 0 ? '-₹200' : '₹0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated Income Tax (TDS)</span>
                      <span className="font-semibold text-red-600 font-mono">-₹{Math.round(((employee.ctcAnnual || 0) * 0.18 / 12)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary slips list */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Historical Salary Slips</h3>
              <p className="text-[11px] text-slate-400">Generated automatically at the end of every active hospital billing cycle.</p>
              
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-3">Payslip Cycle</th>
                      <th className="px-6 py-3">Gross Earnings</th>
                      <th className="px-6 py-3">Total Deductions</th>
                      <th className="px-6 py-3">Net Payable Amount</th>
                      <th className="px-6 py-3">Payment Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salarySlips.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                          No historical payslips on record yet. Payslips are generated automatically at the end of each completed monthly billing cycle.
                        </td>
                      </tr>
                    ) : (
                      salarySlips.map((slip) => (
                        <tr key={slip.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3 font-semibold text-slate-800">{slip.month}</td>
                          <td className="px-6 py-3 font-mono text-slate-600">₹{slip.totalEarnings.toLocaleString()}</td>
                          <td className="px-6 py-3 font-mono text-slate-600">₹{slip.totalDeductions.toLocaleString()}</td>
                          <td className="px-6 py-3 font-mono text-emerald-600 font-bold">₹{slip.netPayable.toLocaleString()}</td>
                          <td className="px-6 py-3">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                              {slip.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button 
                              onClick={() => setSelectedPayslip(slip)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold ml-auto"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Print Slip
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 7: Goals & Reviews */}
        {activeTab === 'Performance' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Performance Framework</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Core active KPIs */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operational Target Goals</h4>
                
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">EMR Documentation Accuracy</span>
                      <span className="text-[11px] font-mono font-bold text-blue-600">95% Target</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Maintains 100% compliance with Joint Commission patient file standards.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">Clinical Wait-Time Optimization</span>
                      <span className="text-[11px] font-mono font-bold text-blue-600">&lt;15 mins</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Optimizing patient processing speed in Outpatient / Clinic consulting rooms.</p>
                  </div>
                </div>
              </div>

              {/* Quarterly Review */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Q2 Executive Performance Summary
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">RATING GIVEN BY MEDICAL DIRECTOR</span>
                    <span className="font-bold text-slate-800">4.8 / 5.0 (Exceptional Footprint)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">STRENGTHS EXPORTED</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Maintains flawless diagnostic records and exhibits empathetic triage management. Praised highly in patient satisfaction surveys.
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">PROMOTION ELIGIBILITY</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded mt-1 inline-block">
                      Eligible (Pending Q4 Board Audit)
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 8: Verification Docs */}
        {activeTab === 'Documents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Credential Verification Vault</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Mandatory clinical licenses, DEA registrations, and identity sheets.</p>
              </div>
              <button 
                onClick={() => {
                  showToast('Scanning document vault... System is verified with State Licensing Servers.', 'success');
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                Trigger Licensure Sync
              </button>
            </div>

            <div className="space-y-3">
              {documentsList.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                  No verification credentials uploaded yet.
                </div>
              ) : (
                documentsList.map((doc, idx) => (
                  <div key={doc.name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-colors gap-3">
                    <div className="flex gap-3">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100 text-slate-600 shadow-sm shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Category: {doc.type} &bull; Expiration: <span className="font-semibold text-slate-600">{doc.expiry}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        doc.status === 'Verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {doc.status}
                      </span>
                      {doc.status !== 'Verified' && (
                        <button
                          onClick={() => handleVerifyDoc(idx)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
                        >
                          Approve & Verify
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Custom shared documents section */}
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Employee Document Portfolio</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Custom uploads, contracts, and employment letters.</p>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">{employeeDocuments.length} Shared Files</span>
              </div>

              {/* Upload area inline if HR/Admin */}
              {isAdminOrHR && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Upload & Link New Document</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Document Title</label>
                      <input 
                        type="text"
                        placeholder="e.g. Offer Letter 2026"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Category</label>
                      <select
                        value={newDocCategory}
                        onChange={(e) => setNewDocCategory(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-none"
                      >
                        <option value="offer_letter">Offer Letter</option>
                        <option value="medical_license">Medical License (Clinical)</option>
                        <option value="dea_registration">DEA / Pharmacy Registration</option>
                        <option value="medical_degree">Medical Degree</option>
                        <option value="certifications">Certifications / Fellowships</option>
                        <option value="identity_documents">Identity Documents</option>
                        <option value="joining_report">Joining Report</option>
                        <option value="salary_slips">Salary Slips</option>
                        <option value="others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Choose File</label>
                      <input 
                        id="new-doc-file-input"
                        type="file"
                        onChange={handleDocFileChange}
                        className="w-full text-xs file:bg-blue-50 file:border-none file:px-3 file:py-1 file:rounded-md file:text-[10px] file:font-semibold file:text-blue-700 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newDocTitle.trim() || !newDocData) {
                          showToast('Please fill out the title and choose a file first.', 'error');
                          return;
                        }
                        const newDocObj = {
                          _id: 'DOC-' + Date.now(),
                          category: newDocCategory,
                          title: newDocTitle.trim(),
                          fileName: newDocData.fileName,
                          fileData: newDocData.fileData,
                          fileType: newDocData.fileType,
                          uploadedAt: new Date().toISOString(),
                          uploadedBy: 'HR Manager'
                        };
                        const updatedDocs = [...employeeDocuments, newDocObj];
                        try {
                          await onUpdateEmployee(employee.id, { documents: updatedDocs });
                          setEmployeeDocuments(updatedDocs);
                          setNewDocTitle('');
                          setNewDocFile(null);
                          setNewDocData(null);
                          const fileInput = document.getElementById('new-doc-file-input');
                          if (fileInput) fileInput.value = '';
                          showToast('Document uploaded and saved successfully!', 'success');
                        } catch (err) {
                          showToast('Failed to upload document.', 'error');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      Upload & Save Document
                    </button>
                  </div>
                </div>
              )}

              {/* Documents table/list */}
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse bg-white text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Document Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">File Name</th>
                      <th className="px-4 py-3">Uploaded At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeDocuments.map((doc) => {
                      const docId = doc._id || doc.id;
                      return (
                        <tr key={docId} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{doc.title}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded capitalize">
                              {doc.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{doc.fileName}</td>
                          <td className="px-4 py-3 text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded font-semibold text-[10px]"
                            >
                              Preview
                            </button>
                            <a
                              href={doc.fileData}
                              download={doc.fileName}
                              className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded font-semibold text-[10px] inline-block"
                            >
                              Download
                            </a>
                            {isAdminOrHR && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const updatedDocs = employeeDocuments.filter(d => (d._id || d.id) !== docId);
                                  try {
                                    await onUpdateEmployee(employee.id, { documents: updatedDocs });
                                    setEmployeeDocuments(updatedDocs);
                                    showToast('Document deleted successfully!', 'success');
                                  } catch (err) {
                                    showToast('Failed to delete document.', 'error');
                                  }
                                }}
                                className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded font-semibold text-[10px]"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {employeeDocuments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 italic">No custom documents uploaded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'Slots' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Doctor Appointment Slots Configuration</h3>
                <p className="text-xs text-slate-400">Configure custom daily availability intervals for patient consultation bookings. HR will set custom times by their own for each slot.</p>
              </div>
            </div>
            
            {/* Add Custom Slot Input row */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Start Time</label>
                  <input 
                    type="time"
                    value={newSlotStartTime}
                    onChange={(e) => setNewSlotStartTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer h-10"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">End Time</label>
                  <input 
                    type="time"
                    value={newSlotEndTime}
                    onChange={(e) => setNewSlotEndTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer h-10"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Max Patients (Limit)</label>
                  <input 
                    type="number"
                    min="1"
                    value={newSlotLimit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSlotLimit(val === '' ? '' : Number(val));
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white h-10"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Or Edit/Create Slot String Manually</label>
                  <input 
                    type="text"
                    placeholder="e.g. 05:30 PM to 06:30 PM (Limit: 3)"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white h-10"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const formatTime12h = (timeVal) => {
                      if (!timeVal) return '';
                      const [hoursStr, minutesStr] = timeVal.split(':');
                      let hours = parseInt(hoursStr, 10);
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12;
                      hours = hours ? hours : 12;
                      const hoursFormatted = hours < 10 ? '0' + hours : hours;
                      return `${hoursFormatted}:${minutesStr} ${ampm}`;
                    };

                    let finalSlot = newSlotTime.trim();
                    if (!finalSlot) {
                      if (!newSlotStartTime || !newSlotEndTime) {
                        showToast('Please select start/end times or enter slot time manually.', 'error');
                        return;
                      }
                      const start12 = formatTime12h(newSlotStartTime);
                      const end12 = formatTime12h(newSlotEndTime);
                      finalSlot = `${start12} to ${end12}${newSlotLimit ? ` (Limit: ${newSlotLimit})` : ''}`;
                    }

                    if (selectedSlots.includes(finalSlot)) {
                      showToast('This slot already exists!', 'error');
                      return;
                    }
                    setSelectedSlots([...selectedSlots, finalSlot]);
                    setNewSlotTime('');
                    setNewSlotStartTime('');
                    setNewSlotEndTime('');
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap h-10"
                >
                  Add Slot
                </button>
              </div>
            </div>

            {/* List of active custom slots */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Slots Configuration</h4>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.map((slot) => {
                  const match = slot.match(/(.*?)\s*\(Limit:\s*(\d+)\)/i);
                  const displayStr = match ? match[1].trim() : slot;
                  const limitVal = match ? match[2] : null;

                  return (
                    <div 
                      key={slot} 
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 group hover:border-red-200 transition-colors"
                    >
                      <span>{displayStr}</span>
                      {limitVal && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 font-bold rounded text-[10px]">
                          Limit: {limitVal}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSlots(selectedSlots.filter(s => s !== slot));
                        }}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {selectedSlots.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No custom slots configured. Enter a custom time slot above.</p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
              <div className="text-xs text-slate-500 font-semibold">
                <span className="text-blue-600">{selectedSlots.length} custom slots configured</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlots(employee.doctorSlots || [])}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await onUpdateEmployee(employee.id, { doctorSlots: selectedSlots });
                      showToast('Doctor slots updated successfully!', 'success');
                    } catch (e) {
                      showToast('Failed to update doctor slots', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Save Slots
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Salary payslip print popup */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-6">
            
            {/* Header branding */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-blue-600 text-base">Metro Community Hospital & Clinics</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Official Monthly Payslip</p>
              </div>
              <button 
                onClick={() => setSelectedPayslip(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold font-mono"
              >
                &times;
              </button>
            </div>

            {/* Slip metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">EMPLOYEE DETAILS</span>
                <span className="font-semibold text-slate-800">{selectedPayslip.employeeName} ({selectedPayslip.employeeId})</span>
                <span className="text-slate-500 block mt-0.5">{selectedPayslip.designation} &bull; {selectedPayslip.department}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">PAY CYCLE</span>
                <span className="font-semibold text-slate-800">{selectedPayslip.month}</span>
                <span className="text-slate-500 block mt-0.5">Status: <span className="text-emerald-600 font-bold">Paid via Direct Bank Transfer</span></span>
              </div>
            </div>

            {/* Calculations table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-2 bg-slate-50 font-semibold p-2.5 border-b border-slate-100 text-slate-400 text-[10px]">
                <span>EARNING CATEGORY</span>
                <span className="text-right">AMOUNT (₹ INR)</span>
              </div>
              <div className="divide-y divide-slate-100 p-2.5 space-y-2">
                <div className="flex justify-between">
                  <span>Basic Pay Portion</span>
                  <span className="font-mono">₹{selectedPayslip.basic.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>House Rent Allowance (HRA)</span>
                  <span className="font-mono">₹{selectedPayslip.hra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medical & Conveyance Allowance</span>
                  <span className="font-mono">₹{(selectedPayslip.conveyance + selectedPayslip.medicalAllowance).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Special Allowance</span>
                  <span className="font-mono">₹{selectedPayslip.specialAllowance.toLocaleString()}</span>
                </div>
                {selectedPayslip.bonus > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Performance Executive Bonus</span>
                    <span className="font-mono">+₹{selectedPayslip.bonus.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 bg-slate-50 font-semibold p-2.5 border-t border-b border-slate-100 text-slate-400 text-[10px] mt-2">
                <span>DEDUCTIONS REGISTER</span>
                <span className="text-right">ESTIMATED AMOUNT</span>
              </div>
              <div className="divide-y divide-slate-100 p-2.5 space-y-2 text-slate-500">
                <div className="flex justify-between">
                  <span>Provident Fund (PF)</span>
                  <span className="font-mono">-₹{selectedPayslip.pfDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>ESI Share</span>
                  <span className="font-mono">-₹{selectedPayslip.esiDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional Tax</span>
                  <span className="font-mono">-₹200</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Income TDS Tax</span>
                  <span className="font-mono">-₹{selectedPayslip.incomeTax.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Pay summary and bank info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-blue-50/50 rounded-xl border border-blue-100/40 text-xs gap-3">
              <div>
                <span className="text-[10px] text-blue-500 font-bold block">RECIPIENT BANK NODE</span>
                <span className="text-slate-700 font-medium">{employee.bankDetails.bankName} (IFSC: {employee.bankDetails.ifsc})</span>
                <span className="text-slate-400 block font-mono">A/C: {employee.bankDetails.accountNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-500 font-bold block">NET PAYABLE AMOUNT DEPOSITED</span>
                <span className="text-lg font-bold text-slate-900 font-mono">₹{selectedPayslip.netPayable.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button 
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Close Slip
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print Physical Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Overlay Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 hr-modal-overlay"
          onClick={() => setPreviewDoc(null)}
          data-lenis-prevent="true"
          style={{ overscrollBehavior: 'contain', zIndex: 10000 }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-3xl w-full p-6 relative hr-admin-modal flex flex-col"
            style={{ maxHeight: '90vh', animation: 'adminFadeIn 0.2s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800">{previewDoc.title}</span>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 rounded-lg p-2 min-h-[300px]">
              {previewDoc.fileType.startsWith('image/') ? (
                <img src={previewDoc.fileData} alt={previewDoc.title} className="max-w-full max-h-[60vh] object-contain rounded" />
              ) : previewDoc.fileType === 'application/pdf' ? (
                <iframe src={previewDoc.fileData} title={previewDoc.title} className="w-full h-[60vh] border-0 rounded" />
              ) : (
                <div className="text-center text-slate-500 text-xs p-8">
                  <p className="font-semibold">{previewDoc.fileName}</p>
                  <p className="mt-1">Binary file preview not supported directly. Please download to view.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
