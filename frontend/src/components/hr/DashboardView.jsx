import React, { useState } from 'react';
import { 
  Users, UserCheck, CalendarDays, Briefcase, DollarSign, Clock, 
  ArrowRight, ShieldAlert, CheckCircle2, XCircle, ChevronRight, AlertCircle, FileText, BadgeCheck
} from 'lucide-react';

export default function DashboardView({
  employees = [],
  leaveRequests = [],
  attendanceRecords = [],
  notifications = [],
  onApproveLeave,
  onRejectLeave,
  onApproveAttendance,
  onRejectAttendance,
  onSelectEmployee,
  onNavigate,
  jobs = [],
  candidates = []
}) {
  const [approvalComments, setApprovalComments] = useState({});
  const [selectedActionId, setSelectedActionId] = useState(null);

  // Dynamic today's date or fall back to the latest date in attendance records
  const getTodayDateStr = () => {
    if (attendanceRecords.length === 0) return new Date().toISOString().split('T')[0];
    const dates = attendanceRecords.map(r => r.date).sort();
    return dates[dates.length - 1] || new Date().toISOString().split('T')[0];
  };
  const todayDateStr = getTodayDateStr();

  // Computed Stats - 100% Dynamic
  const totalEmployees = employees.length;
  const presentToday = attendanceRecords.filter(r => r.date === todayDateStr && (r.status === 'Present' || r.status === 'Late')).length;
  const onLeaveToday = leaveRequests.filter(r => r.status === 'Approved' && (r.fromDate || r.startDate) <= todayDateStr && (r.toDate || r.endDate) >= todayDateStr).length;
  const openPositions = jobs.filter(j => j.status === 'Open').reduce((sum, j) => sum + (j.vacancies || 0), 0);

  // Calculate dynamic joining count this week
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const joiningThisWeekCount = employees.filter(e => e.joiningDate && new Date(e.joiningDate) >= sevenDaysAgo).length;

  // Calculate dynamic approved leave for tomorrow
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];
  const approvedTomorrowCount = leaveRequests.filter(r => r.status === 'Approved' && (r.fromDate || r.startDate) <= tomorrowStr && (r.toDate || r.endDate) >= tomorrowStr).length;

  // Dynamic Payroll Due Date (End of Current Month)
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const payrollDueDateStr = lastDayOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const pendingApprovalsCount = leaveRequests.filter(r => r.status === 'Pending').length + 
                                 attendanceRecords.filter(r => r.correctionRequested && r.correctionStatus === 'Pending').length;

  // Department Distribution data
  const deptCounts = {};
  employees.forEach(emp => {
    deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
  });

  const departmentData = Object.entries(deptCounts).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / (totalEmployees || 1)) * 100),
    color: name === 'Cardiology' ? '#3b82f6' : 
           name === 'Emergency Medicine' ? '#ef4444' :
           name === 'Outpatient Services' ? '#10b981' :
           name === 'Pharmacy' ? '#f59e0b' :
           name === 'Pathology & Lab' ? '#8b5cf6' : '#64748b'
  }));

  // Gender Distribution
  const maleCount = employees.filter(e => e.gender === 'Male').length;
  const femaleCount = employees.filter(e => e.gender === 'Female').length;
  const otherCount = employees.filter(e => e.gender === 'Other').length;

  const formattedToday = new Date(todayDateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6" id="dashboard-view-root">
      {/* Top Banner with Local Context */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Hospital Command Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome back, HR Manager. Today is {formattedToday}.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('Directory', true)}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
          >
            Add New Employee
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Action Cards - 100% DYNAMIC */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Employees */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-slate-800">{totalEmployees}</h3>
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-0.5 mt-1">
              {joiningThisWeekCount > 0 ? `+${joiningThisWeekCount} joining this week` : (totalEmployees > 0 ? `${totalEmployees} active roster` : 'No staff registered')}
            </span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Present Today</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-slate-800">{presentToday}</h3>
            <span className="text-xs text-slate-400 font-medium mt-1 block">
              {totalEmployees > 0 ? `${Math.round((presentToday / totalEmployees) * 100)}% active rate` : '0% active rate'}
            </span>
          </div>
        </div>

        {/* On Leave */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">On Leave</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-slate-800">{onLeaveToday}</h3>
            <span className="text-xs text-orange-600 font-medium mt-1 block">
              {approvedTomorrowCount > 0 ? `${approvedTomorrowCount} approved for tomorrow` : (onLeaveToday > 0 ? `${onLeaveToday} currently on leave` : '0 on leave today')}
            </span>
          </div>
        </div>

        {/* Payroll Due */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payroll Due</span>
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-display font-bold text-slate-800">{payrollDueDateStr}</h3>
            <span className="text-xs text-emerald-500 font-medium mt-1 block">
              {totalEmployees > 0 ? `Roster for ${totalEmployees} staff` : 'No staff enrolled'}
            </span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Action</span>
            <div className={`p-2 rounded-xl ${pendingApprovalsCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-display font-bold text-slate-800">{pendingApprovalsCount}</h3>
            <span className="text-xs text-red-500 font-medium mt-1 block">
              {pendingApprovalsCount > 0 ? `${pendingApprovalsCount} requiring review` : 'All items reviewed'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left column - Charts & Action Center */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Action Center - Approvals & Corrections */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900">Pending HR Action Items</h2>
                <p className="text-slate-400 text-xs mt-0.5">Approve or Reject clinical leave and attendance corrections.</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">
                {pendingApprovalsCount} Pending
              </span>
            </div>

            <div className="space-y-4">
              {/* Leave Requests */}
              {leaveRequests.filter(req => req.status === 'Pending').map(req => {
                const reqId = req._id || req.id;
                return (
                  <div key={reqId} className="p-4 bg-slate-50 rounded-xl border border-slate-155 hover:border-blue-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {(() => {
                          const matchedEmp = employees.find(e => e.id === req.employeeId || e.staff_id === req.employeeId);
                          const photoUrl = matchedEmp?.photoUrl || req.employeePhoto || '';
                          if (photoUrl) {
                            return (
                              <img 
                                src={photoUrl} 
                                alt={req.employeeName} 
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            );
                          } else {
                            return (
                              <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 select-none">
                                {req.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            );
                          }
                        })()}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 
                              onClick={() => onSelectEmployee(req.employeeId)}
                              className="font-semibold text-sm text-slate-900 hover:text-blue-600 cursor-pointer"
                            >
                              {req.employeeName}
                            </h4>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                              {req.department}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Requested <span className="font-semibold text-slate-800">{req.leaveType}</span> for <span className="font-semibold text-slate-800">{req.totalDays || req.days} Days</span> ({req.startDate || req.fromDate} to {req.endDate || req.toDate})
                          </p>
                          <p className="text-xs text-slate-600 italic mt-2 bg-white p-2 rounded border border-slate-100">
                            &ldquo;{req.reason}&rdquo;
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-red-50 text-red-600 font-semibold text-[10px] uppercase rounded">
                        High Priority
                      </span>
                    </div>

                    {selectedActionId === reqId ? (
                      <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-slate-200">
                        <input 
                          type="text" 
                          placeholder="Add HR feedback comments..."
                          value={approvalComments[reqId] || ''}
                          onChange={(e) => setApprovalComments({...approvalComments, [reqId]: e.target.value})}
                          className="text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                        <div className="flex justify-end gap-2 text-xs">
                          <button 
                            onClick={() => setSelectedActionId(null)}
                            className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => {
                              onRejectLeave(reqId, approvalComments[reqId] || 'Rejected by HR');
                              setSelectedActionId(null);
                            }}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            Confirm Reject
                          </button>
                          <button 
                            onClick={() => {
                              onApproveLeave(reqId, approvalComments[reqId] || 'Approved by HR Manager');
                              setSelectedActionId(null);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Confirm Approve
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button 
                          onClick={() => setSelectedActionId(reqId)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-all"
                        >
                          Action Details...
                        </button>
                        <button 
                          onClick={() => onRejectLeave(reqId, 'Rejected by HR')}
                          className="px-3 py-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => onApproveLeave(reqId, 'Approved via HR Quick Actions')}
                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Attendance Corrections */}
              {attendanceRecords.filter(rec => rec.correctionRequested && rec.correctionStatus === 'Pending').map(rec => {
                const recId = rec._id || rec.id;
                return (
                  <div key={recId} className="p-4 bg-slate-50 rounded-xl border border-slate-155 hover:border-amber-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {(() => {
                          const matchedEmp = employees.find(e => e.id === rec.employeeId || e.staff_id === rec.employeeId);
                          const photoUrl = matchedEmp?.photoUrl || rec.employeePhoto || '';
                          if (photoUrl) {
                            return (
                              <img 
                                src={photoUrl} 
                                alt={rec.employeeName} 
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            );
                          } else {
                            return (
                              <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm text-blue-600 font-bold flex items-center justify-center text-xs shrink-0 select-none">
                                {rec.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            );
                          }
                        })()}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 
                              onClick={() => onSelectEmployee(rec.employeeId)}
                              className="font-semibold text-sm text-slate-900 hover:text-blue-600 cursor-pointer"
                            >
                              {rec.employeeName}
                            </h4>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded">
                              {rec.department}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Biometric Correction Request for <span className="font-semibold text-slate-800">{rec.date}</span>
                          </p>
                          <div className="grid grid-cols-2 gap-4 mt-2 bg-white p-2 rounded border border-slate-100 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">PUNCH RECORDED</span>
                              <span className="text-slate-600 line-through">{rec.punchIn || rec.clockIn} &rarr; {rec.punchOut || rec.clockOut}</span>
                            </div>
                            <div>
                              <span className="text-blue-600 block text-[10px] font-bold">PROPOSED CORRECT TIME</span>
                              <span className="text-blue-700 font-semibold">{rec.correctionPunchIn} &rarr; {rec.correctionPunchOut}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 italic mt-2 bg-white p-2 rounded border border-slate-100">
                            &ldquo;{rec.correctionReason}&rdquo;
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 font-semibold text-[10px] uppercase rounded">
                        Biometric Correction
                      </span>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                      <button 
                        onClick={() => onRejectAttendance(recId)}
                        className="px-3 py-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => onApproveAttendance(recId)}
                        className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition-all"
                      >
                        Approve & Re-Sync Log
                      </button>
                    </div>
                  </div>
                );
              })}

              {pendingApprovalsCount === 0 && (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <h4 className="font-semibold text-slate-800 text-sm">Inbox Fully Cleared!</h4>
                  <p className="text-slate-400 text-xs mt-1">There are no pending employee approvals or corrections remaining.</p>
                </div>
              )}
            </div>
          </div>

          {/* Department Headcount distribution custom chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Hospital Resource Distribution</h3>
            <p className="text-slate-400 text-xs mb-6">Staff proportions grouped by critical healthcare specialties.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Custom SVG Donut Chart */}
              <div className="relative flex justify-center">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="75"
                    className="stroke-slate-100"
                    strokeWidth="18"
                    fill="transparent"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="75"
                    stroke="#3b82f6"
                    strokeWidth="18"
                    strokeDasharray="471"
                    strokeDashoffset="380"
                    fill="transparent"
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="75"
                    stroke="#ef4444"
                    strokeWidth="18"
                    strokeDasharray="471"
                    strokeDashoffset="410"
                    transform="rotate(70 96 96)"
                    fill="transparent"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="75"
                    stroke="#10b981"
                    strokeWidth="18"
                    strokeDasharray="471"
                    strokeDashoffset="410"
                    transform="rotate(130 96 96)"
                    fill="transparent"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="75"
                    stroke="#f59e0b"
                    strokeWidth="18"
                    strokeDasharray="471"
                    strokeDashoffset="410"
                    transform="rotate(190 96 96)"
                    fill="transparent"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="75"
                    stroke="#8b5cf6"
                    strokeWidth="18"
                    strokeDasharray="471"
                    strokeDashoffset="350"
                    transform="rotate(250 96 96)"
                    fill="transparent"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Donut Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-display font-bold text-slate-800">{totalEmployees}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Staff</span>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="space-y-3.5">
                {departmentData.map((dept) => (
                  <div key={dept.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="text-slate-600 font-medium">{dept.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono">{dept.count} Staff</span>
                      <span className="font-semibold text-slate-950 font-mono w-8 text-right">{dept.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Alerts Panel, Shift summary, HR analytics summary */}
        <div className="space-y-6">
          
          {/* Recent Executive Bulletins / Alerts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-slate-900">Hospital Alerts Rail</h3>
                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">
                  Real-time Audits
                </span>
              </div>
              <p className="text-slate-400 text-xs mb-5">Compliance risks, anniversary triggers, and license tracking.</p>

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center py-8">
                    <BadgeCheck className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <h5 className="font-semibold text-slate-700 text-xs">All Clear</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 font-sans">No alerts or active tracking notices for today.</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`p-3.5 rounded-xl border flex gap-3 transition-colors ${
                        notif.read ? 'bg-white border-slate-100' : 'bg-blue-50/40 border-blue-100/60'
                      }`}
                    >
                      <div className="mt-0.5">
                        {notif.category === 'License Expiry' && <ShieldAlert className="w-5 h-5 text-red-500" />}
                        {notif.category === 'Probation Ending' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                        {notif.category === 'Work Anniversary' && <BadgeCheck className="w-5 h-5 text-emerald-500" />}
                        {notif.category === 'Shift Changes' && <Clock className="w-5 h-5 text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900">{notif.title}</span>
                          <span className="text-[10px] text-slate-400">{notif.date}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                        {notif.employeeId && (
                          <button 
                            onClick={() => onSelectEmployee(notif.employeeId)}
                            className="text-[10px] text-blue-600 font-semibold hover:underline mt-2 flex items-center gap-0.5"
                          >
                            View Employee Profile
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
