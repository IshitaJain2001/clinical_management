import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import HRPayroll from './HRPayroll';
import SearchableDropdown from '../components/SearchableDropdown';
import { convertPdfToImage } from '../utils/pdfHelper';

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

const PharmacyDashboard = () => {
  const tenantModules = (() => {
    try {
      return JSON.parse(localStorage.getItem('tenantModules') || '{}');
    } catch (e) {
      return {};
    }
  })();

  const [activeTab, setActiveTab] = useState('dash');
  const [showHomeCalendar, setShowHomeCalendar] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('All'); // 'All', 'Urgent', 'New', 'In Progress'
  const [prescriptionsFilter, setPrescriptionsFilter] = useState('Pending'); // 'All', 'Pending', 'In Progress', 'Dispensed', 'Cancelled'
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('curoxa_sidebar_collapsed') === 'true');
  
  // Real logged-in user or premium default fallback
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{"name":"Ankit Sharma","role":"Pharmacy","email":"ankit.sharma@curoxa.com"}'));
  const user = currentUser;

  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditEmail, setProfileEditEmail] = useState('');
  const [profileEditAvatar, setProfileEditAvatar] = useState('');
  const [profileEditLoading, setProfileEditLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [customPharmacyLetterhead, setCustomPharmacyLetterhead] = useState(() => localStorage.getItem('curoxa_pharmacy_letterhead') || null);

  const handlePharmacyLetterheadUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawResult = reader.result;
        const imgUrl = await convertPdfToImage(rawResult);
        localStorage.setItem('curoxa_pharmacy_letterhead', imgUrl);
        setCustomPharmacyLetterhead(imgUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const checkAndConvertExisting = async () => {
      const stored = localStorage.getItem('curoxa_pharmacy_letterhead');
      if (stored && (stored.startsWith('data:application/pdf') || stored.endsWith('.pdf') || stored.includes('application/pdf'))) {
        const imgUrl = await convertPdfToImage(stored);
        localStorage.setItem('curoxa_pharmacy_letterhead', imgUrl);
        setCustomPharmacyLetterhead(imgUrl);
      }
    };
    checkAndConvertExisting();
  }, []);

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
  const [receptionistSubTab, setReceptionistSubTab] = useState('queue');
  const [labSubTab, setLabSubTab] = useState('tests');

  // Dynamic role coverage real data / transaction states
  const [coverageQueue, setCoverageQueue] = useState([]);
  const [coverageAppts, setCoverageAppts] = useState([]);
  const [coverageBills, setCoverageBills] = useState([]);
  const [coverageReagents, setCoverageReagents] = useState([]);
  const [patients, setPatients] = useState([]);
  const [coverageDoctors, setCoverageDoctors] = useState([]);
  const [coverageLabRequests, setCoverageLabRequests] = useState([]);
  const [selectedPatForCoverAppt, setSelectedPatForCoverAppt] = useState('');
  const [selectedDocForCoverAppt, setSelectedDocForCoverAppt] = useState('');
  const [selectedSlotForCoverAppt, setSelectedSlotForCoverAppt] = useState('09:30 AM');
  const [selectedRegGender, setSelectedRegGender] = useState('Female');

  // Coverage Lab workflow states
  const [showCoverageLabModal, setShowCoverageLabModal] = useState(false);
  const [selectedCoverageLabTest, setSelectedCoverageLabTest] = useState(null);
  const [coverageLabRemarks, setCoverageLabRemarks] = useState('');
  const [coverageLabParams, setCoverageLabParams] = useState({ value: '', unit: '' });
  const [coverageLabFileName, setCoverageLabFileName] = useState('');
  const [showCoverageLabDetailsModal, setShowCoverageLabDetailsModal] = useState(false);

  // Procurement States
  const [procurementSubTab, setProcurementSubTab] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [pharmacyTickets, setPharmacyTickets] = useState([]);
  const [showResolveTicketModal, setShowResolveTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketResolutionReason, setTicketResolutionReason] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    type: 'Manufacturer',
    contactPerson: '',
    gstNumber: '',
    status: 'Active',
    panNumber: '',
    licenseNumber: '',
    zipCode: '',
    notes: '',
    alternatePhone: '',
    
    // New Excel Fields
    supplierCategory: 'Medicine',
    organizationType: 'Private Ltd',
    houseNo: '',
    street: '',
    country: 'India',
    pinCode: '',
    landline: '',
    faxNo: '',
    website: '',
    primaryContactPerson: '',
    primaryContactPersonDesignation: '',
    primaryContactPersonMobileNo: '',
    primaryContactPersonEmailId: '',
    secondaryContactPerson: '',
    secondaryContactPersonDesignation: '',
    secondaryContactPersonMobileNo: '',
    secondaryContactPersonEmailId: '',
    cinNo: '',
    pfRegistrationNo: '',
    nameOnPanCard: '',
    panCardNo: '',
    rocNo: '',
    esiRegistrationNo: '',
    isoCertificationNo: '',
    isoValidUpto: '',
    pollutionControlBoardCertificationNo: '',
    pollutionValidUpto: '',
    bank1Name: '',
    bank1Branch: '',
    bank1AccountNumber: '',
    bank1IfscCode: '',
    bank1Address: '',
    taxes: '',
    deliveryTerms: '',
    isMsmeRegistration: 'No',
    msmeRegistrationNo: '',
    msmeRegistrationType: ''
  });
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [editablePriceList, setEditablePriceList] = useState([]);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [poDraftItems, setPoDraftItems] = useState([{ name: '', sku: '', qty: 100 }]);
  const [poSplitSummary, setPoSplitSummary] = useState([]);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [grnFlowType, setGrnFlowType] = useState('po'); // 'po' or 'direct'
  const [grnSelectedPOId, setGrnSelectedPOId] = useState('');
  const [grnDirectVendorId, setGrnDirectVendorId] = useState('');
  const [grnItems, setGrnItems] = useState([]);
  const [grnInvoiceFile, setGrnInvoiceFile] = useState(null);
  const [grnInvoiceFileName, setGrnInvoiceFileName] = useState('');
  const [grnUploadProgress, setGrnUploadProgress] = useState(0);
  const [grnIsUploading, setGrnIsUploading] = useState(false);
  const [grnNotes, setGrnNotes] = useState('');
  const [selectedGrnDetails, setSelectedGrnDetails] = useState(null);
  const [editingGrn, setEditingGrn] = useState(null);

  const fetchProcurementData = async () => {
    try {
      const vendorRes = await api.get('/vendors');
      setVendors(vendorRes.data);
      const poRes = await api.get('/purchase-orders');
      setPurchaseOrders(poRes.data);
      const grnRes = await api.get('/goods-receipts');
      setGoodsReceipts(grnRes.data);
      const ticketsRes = await api.get('/pharmacy-tickets');
      setPharmacyTickets(ticketsRes.data);
    } catch (err) {
      console.error("Failed to fetch procurement data:", err);
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    const phoneRegex = /^[0-9]{10}$/;
    if (newVendor.phone) {
      const cleanPhone = newVendor.phone.replace(/[\s\-+]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        return;
      }
    }
    try {
      const res = await api.post('/vendors', newVendor);
      setVendors([...vendors, res.data]);
      setShowAddVendorModal(false);
      showToast('Vendor added successfully!');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to add vendor', 'error');
    }
  };

  const handleSavePriceList = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/vendors/${selectedVendor._id}/price-list`, { medicines: editablePriceList });
      setVendors(vendors.map(v => v._id === selectedVendor._id ? res.data : v));
      setSelectedVendor(res.data);
      setShowPriceListModal(false);
      showToast('Price list updated successfully!');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to update price list', 'error');
    }
  };

  const handleResolveTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !ticketResolutionReason.trim()) return;
    try {
      const res = await api.put(`/pharmacy-tickets/${selectedTicket._id}/resolve`, { reason: ticketResolutionReason });
      setPharmacyTickets(pharmacyTickets.map(t => t._id === selectedTicket._id ? res.data : t));
      
      const medId = selectedTicket.medicineId;
      const currentQty = selectedTicket.currentStock || 0;
      await api.put(`/medicines/${medId}`, { stock: currentQty + 100 });
      
      showToast('Replenishment ticket resolved & stock updated successfully!');
      setShowResolveTicketModal(false);
      setTicketResolutionReason('');
      fetchProcurementData();
      fetchInventory();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to resolve ticket', 'error');
    }
  };

  const handleDraftPOAddRow = () => {
    setPoDraftItems([...poDraftItems, { name: '', sku: '', qty: 100 }]);
  };

  const handleDraftPORemoveRow = (index) => {
    setPoDraftItems(poDraftItems.filter((_, idx) => idx !== index));
  };

  const handleDraftPOChange = (index, field, value) => {
    const updated = [...poDraftItems];
    updated[index][field] = value;
    if (field === 'name') {
      const matched = inventory.find(item => item.name === value);
      if (matched) {
        updated[index].sku = matched.sku;
      }
    }
    setPoDraftItems(updated);
  };

  const getCheapestVendorForItem = (sku) => {
    let cheapestVendor = null;
    let lowestPrice = Infinity;
    vendors.forEach(v => {
      const match = v.medicines?.find(med => med.sku === sku && med.available);
      if (match && match.price < lowestPrice) {
        lowestPrice = match.price;
        cheapestVendor = v;
      }
    });
    return { vendor: cheapestVendor, price: lowestPrice };
  };

  const calculatePOSplits = () => {
    const splits = {};
    poDraftItems.forEach(item => {
      if (!item.name || !item.sku || !item.qty) return;
      const { vendor, price } = getCheapestVendorForItem(item.sku);
      if (vendor) {
        if (!splits[vendor._id]) {
          splits[vendor._id] = {
            vendorId: vendor._id,
            vendorName: vendor.name,
            items: [],
            totalAmount: 0
          };
        }
        const qty = Number(item.qty) || 0;
        const total = price * qty;
        splits[vendor._id].items.push({
          name: item.name,
          sku: item.sku,
          requiredQty: qty,
          price: price,
          total: total
        });
        splits[vendor._id].totalAmount += total;
      } else {
        if (vendors.length > 0) {
          const fallback = vendors[0];
          const price = 50.0;
          if (!splits[fallback._id]) {
            splits[fallback._id] = {
              vendorId: fallback._id,
              vendorName: fallback.name,
              items: [],
              totalAmount: 0
            };
          }
          const qty = Number(item.qty) || 0;
          const total = price * qty;
          splits[fallback._id].items.push({
            name: item.name,
            sku: item.sku,
            requiredQty: qty,
            price: price,
            total: total
          });
          splits[fallback._id].totalAmount += total;
        }
      }
    });
    setPoSplitSummary(Object.values(splits));
  };

  const handleSendPurchaseOrders = async () => {
    if (poSplitSummary.length === 0) return;
    try {
      for (const split of poSplitSummary) {
        const poId = `PO-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        await api.post('/purchase-orders', {
          poId,
          vendorId: split.vendorId,
          vendorName: split.vendorName,
          items: split.items,
          totalAmount: split.totalAmount,
          requestedBy: currentUser.name || 'Pharmacist'
        });
      }
      await fetchProcurementData();
      setShowCreatePOModal(false);
      showToast('Purchase Orders sent to Admin for approval!');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to submit Purchase Orders', 'error');
    }
  };

  const handleGrnPOSelection = (poId) => {
    setGrnSelectedPOId(poId);
    const po = purchaseOrders.find(x => x._id === poId);
    if (po) {
      setGrnItems(po.items.map(item => ({
        name: item.name,
        sku: item.sku,
        qtyRequired: item.requiredQty,
        qtyReceived: item.requiredQty,
        price: item.price,
        gst: item.tax !== undefined ? item.tax : 12,
        batchNumber: '',
        expiryDate: '',
        mfgDate: ''
      })));
    }
  };

  const handleOpenEditGrn = (grn) => {
    setEditingGrn(grn);
    setGrnFlowType(grn.poId ? 'po' : 'direct');
    setGrnSelectedPOId(grn.poId || '');
    setGrnDirectVendorId(grn.vendorId || '');
    setGrnItems((grn.items || []).map(it => ({
      name: it.name,
      sku: it.sku,
      qtyRequired: it.qtyOrdered || 0,
      qtyReceived: it.qtyReceived,
      price: it.price,
      gst: it.gst !== undefined ? it.gst : 12,
      batchNumber: it.batchNumber || '',
      expiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString().substring(0, 10) : '',
      mfgDate: it.mfgDate ? new Date(it.mfgDate).toISOString().substring(0, 10) : ''
    })));
    setGrnInvoiceFileName(grn.invoiceUrl || '');
    setGrnInvoiceFile(null);
    setGrnNotes(grn.notes || '');
    setShowGRNModal(true);
  };

  const handleSaveGRN = async (e, statusParam = 'Verified/Completed') => {
    if (e) e.preventDefault();
    
    const today = new Date().toISOString().split('T')[0];
    const futureMfgItem = grnItems.find(item => item.mfgDate && item.mfgDate > today);
    if (futureMfgItem) {
      showToast(`Manufacturing date for ${futureMfgItem.name} cannot be in the future!`, 'error');
      return;
    }
    
    if (grnFlowType === 'direct' && !grnInvoiceFileName) {
      showToast('Supplier invoice document is required for direct purchase!', 'error');
      return;
    }

    try {
      const grnId = editingGrn ? editingGrn.grnId : `GRN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      let vendorId = '';
      let vendorName = '';
      let poId = null;
      let poNumber = '';

      if (grnFlowType === 'po') {
        const po = purchaseOrders.find(x => x._id === grnSelectedPOId);
        if (!po) return;
        poId = po._id;
        poNumber = po.poId;
        vendorId = po.vendorId;
        vendorName = po.vendorName;
      } else {
        const v = vendors.find(x => x._id === grnDirectVendorId);
        if (!v) {
          showToast('Please select a vendor!', 'error');
          return;
        }
        vendorId = v._id;
        vendorName = v.name;
      }

      const payload = {
        grnId,
        poId,
        poNumber,
        vendorId,
        vendorName,
        items: grnItems.map(it => ({
          name: it.name,
          sku: it.sku,
          qtyOrdered: it.qtyRequired || 0,
          qtyReceived: it.qtyReceived,
          price: it.price,
          gst: it.gst !== undefined ? it.gst : 12,
          batchNumber: it.batchNumber || '',
          expiryDate: it.expiryDate || null,
          mfgDate: it.mfgDate || null
        })),
        invoiceUrl: grnInvoiceFileName || '',
        notes: grnNotes || '',
        status: statusParam
      };

      if (editingGrn) {
        await api.put(`/goods-receipts/${editingGrn._id}`, payload);
      } else {
        await api.post('/goods-receipts', payload);
      }

      await fetchProcurementData();
      await fetchInventory();
      setShowGRNModal(false);
      setGrnNotes('');
      setEditingGrn(null);
      showToast(statusParam === 'Draft' ? 'GRN saved as Draft successfully!' : 'GRN generated & stock updated successfully!');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Failed to save GRN', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    if (type === 'error') {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 3000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const redirectedTabsRef = useRef({});

  // Reset redirection flag on tab changes
  useEffect(() => {
    redirectedTabsRef.current = {
      [activeTab]: redirectedTabsRef.current[activeTab]
    };
  }, [activeTab]);

  // Restrict activeTab for cover users based on active coverage permissions
  useEffect(() => {
    const isCoverUser = currentUser?.role !== 'pharmacy';
    if (!isCoverUser) return;
    if (!coverageState || Object.keys(coverageState).length === 0) return;

    let isPermitted = false;
    if (activeTab === 'dash' || activeTab === 'profile-tab') {
      isPermitted = true;
    } else if (activeTab === 'prescriptions' || activeTab === 'internal') {
      isPermitted = !!(coverageState['ph-queue']?.on || coverageState['ph-dispense']?.on);
    } else if (activeTab === 'sales') {
      isPermitted = !!coverageState['ph-billing']?.on;
    } else if (activeTab === 'inventory') {
      isPermitted = !!(coverageState['ph-stock']?.on || coverageState['dr-stockview']?.on);
    } else if (activeTab === 'returns') {
      isPermitted = !!coverageState['ph-stock']?.on;
    } else if (activeTab === 'reports') {
      isPermitted = !!(coverageState['ph-stock']?.on || coverageState['ph-billing']?.on);
    } else {
      isPermitted = true;
    }

    if (!isPermitted) {
      if (coverageState['ph-queue']?.on || coverageState['ph-dispense']?.on) {
        setActiveTab('prescriptions');
      } else if (coverageState['ph-stock']?.on || coverageState['dr-stockview']?.on) {
        setActiveTab('inventory');
      } else if (coverageState['ph-billing']?.on) {
        setActiveTab('sales');
      } else {
        setActiveTab('dash');
      }
    }
  }, [coverageState, activeTab, currentUser]);

  // Auto-redirect first subtab on activeTab cover change
  useEffect(() => {
    if (!coverageState || Object.keys(coverageState).length === 0) return;
    if (redirectedTabsRef.current[activeTab]) return;

    if (activeTab === 'receptionist_cover') {
      if (coverageState['rc-queue']?.on) {
        setReceptionistSubTab('queue');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['rc-appt']?.on) {
        setReceptionistSubTab('appt');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['rc-register']?.on) {
        setReceptionistSubTab('register');
        redirectedTabsRef.current[activeTab] = true;
      } else if (coverageState['rc-billing']?.on) {
        setReceptionistSubTab('billing');
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
          showToast(`Role Coverage Revoked: ${permissionNames[k] || k}!`);
        });
      }
      
      prevCoverageKeysRef.current = activeKeys;
    }
  }, [coverageState]);

  const [inventory, setInventory] = useState([]);
  const [indents, setIndents] = useState([]);
  const [selectedIndent, setSelectedIndent] = useState(null);
  const [showIndentModal, setShowIndentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsSearchQuery, setPrescriptionsSearchQuery] = useState('');
  const [prescriptionsDateFilter, setPrescriptionsDateFilter] = useState('');
  const [overviewPage, setOverviewPage] = useState(1);
  const [prescriptionsPage, setPrescriptionsPage] = useState(1);
  const [returnLogs, setReturnLogs] = useState([]);
  const [showLogReturnModal, setShowLogReturnModal] = useState(false);
  const [returnType, setReturnType] = useState('Prescription-Linked');
  const [returnPatientName, setReturnPatientName] = useState('');
  const [returnPatientPhone, setReturnPatientPhone] = useState('');
  const [returnPrescriptionId, setReturnPrescriptionId] = useState('');
  const [returnPrescriptionCode, setReturnPrescriptionCode] = useState('');
  const [returnItems, setReturnItems] = useState([{ medicineName: '', quantity: 1, unitPrice: 0, reason: 'Doctor changed medication', action: 'Restocked' }]);
  const [rxSearchQuery, setRxSearchQuery] = useState('');
  const [isRxDropdownOpen, setIsRxDropdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Toast status notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Modal states for inventory operations
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescriptionGroup, setSelectedPrescriptionGroup] = useState(null);
  const [prescriptionModalStep, setPrescriptionModalStep] = useState('details'); // 'details' or 'payment'
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('UPI');
  const [cashReceived, setCashReceived] = useState('');
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'restock'
  const [formData, setFormData] = useState({
    name: '',
    category: 'Pain Relief',
    sku: '',
    stock: 0,
    unit: 'Strip',
    mrp: 0,
    expiry: ''
  });
  const [currentId, setCurrentId] = useState(null);

  // Barcode / Webcam scanning states
  const [isWebcamScanning, setIsWebcamScanning] = useState(false);
  const [webcamScanner, setWebcamScanner] = useState(null);
  const [scanDebugLog, setScanDebugLog] = useState('');

  // Auto cleanup webcam on modal close
  useEffect(() => {
    if (!showMedicineModal) {
      if (webcamScanner) {
        try {
          if (window.Quagga) window.Quagga.stop();
        } catch (e) { console.error(e); }
        setIsWebcamScanning(false);
        setWebcamScanner(null);
      } else {
        setIsWebcamScanning(false);
      }
    }
  }, [showMedicineModal]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800 Hz beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12); // Short beep duration
    } catch (e) {
      console.warn("Audio Context beep error", e);
    }
  };

  const handleBarcodeFound = async (barcode) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setFormData(prev => ({ ...prev, sku: trimmed }));
    setSuccessMessage(`Barcode scanned: ${trimmed}. Looking up product...`);

    // Step 1: Check local database first
    try {
      const response = await api.get(`/medicines/barcode/${trimmed}`);
      if (response.data && response.data.name) {
        setFormData({
          name: response.data.name,
          category: response.data.category,
          sku: response.data.sku,
          stock: '',
          unit: response.data.unit,
          mrp: response.data.mrp,
          expiry: response.data.expiry
        });
        setSuccessMessage(`Found in inventory: ${response.data.name}`);
        setTimeout(() => setSuccessMessage(''), 4000);
        return;
      }
    } catch (err) {
      console.log("Not in local DB, trying public APIs...");
    }

    // Step 2: Try Open Food Facts API (free, no key needed)
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${trimmed}.json`);
      const offData = await offRes.json();
      if (offData.status === 1 && offData.product) {
        const p = offData.product;
        const productName = p.product_name || p.product_name_en || '';
        const brand = p.brands || '';
        const categories = p.categories || '';
        const fullName = brand ? `${brand} - ${productName}` : productName;
        
        if (fullName) {
          setFormData(prev => ({
            ...prev,
            name: fullName,
            sku: trimmed,
            category: categories.split(',')[0]?.trim() || prev.category || 'General'
          }));
          setSuccessMessage(`Found online: ${fullName}`);
          setTimeout(() => setSuccessMessage(''), 4000);
          return;
        }
      }
    } catch (e) {
      console.log("Open Food Facts lookup failed:", e.message);
    }

    // Step 3: Try UPC ItemDB API (free, no key needed)
    try {
      const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${trimmed}`);
      const upcData = await upcRes.json();
      if (upcData.items && upcData.items.length > 0) {
        const item = upcData.items[0];
        const productName = item.title || '';
        const brand = item.brand || '';
        const category = item.category || '';
        const fullName = brand && productName ? `${brand} - ${productName}` : (productName || brand);

        if (fullName) {
          setFormData(prev => ({
            ...prev,
            name: fullName,
            sku: trimmed,
            category: category.split(',')[0]?.trim() || prev.category || 'General'
          }));
          setSuccessMessage(`Found online: ${fullName}`);
          setTimeout(() => setSuccessMessage(''), 4000);
          return;
        }
      }
    } catch (e) {
      console.log("UPC ItemDB lookup failed:", e.message);
    }

    // Step 4: No lookup found — barcode set, user fills rest
    setSuccessMessage(`Barcode ${trimmed} not found in any database. Please fill details manually.`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleSkuKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      playBeep();
      handleBarcodeFound(e.target.value);
    }
  };

  const handleZoomChange = (zoomVal) => {
    try {
      const videoElem = document.querySelector("#barcode-webcam-reader video");
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject;
        const tracks = stream.getVideoTracks();
        if (tracks && tracks.length > 0) {
          const track = tracks[0];
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
          if (capabilities.zoom) {
            const min = capabilities.zoom.min || 1;
            const max = capabilities.zoom.max || 4;
            const constrainedVal = Math.max(min, Math.min(zoomVal, max));
            track.applyConstraints({
              advanced: [{ zoom: constrainedVal }]
            }).catch(e => console.log("Failed to apply zoom constraints", e));
          }
        }
      }
    } catch (e) {
      console.warn("Zoom constraint failed", e);
    }
  };

  const initWebcamReader = () => {
    setIsWebcamScanning(true);
    setScanDebugLog('Initializing QuaggaJS...');
    setTimeout(() => {
      try {
        if (!window.Quagga) {
          setScanDebugLog('ERROR: QuaggaJS not loaded!');
          return;
        }

        const targetEl = document.getElementById('barcode-webcam-reader');
        if (!targetEl) {
          setScanDebugLog('ERROR: Container not found!');
          return;
        }

        let frameCount = 0;
        let detected = false;

        window.Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: targetEl,
            constraints: {
              facingMode: "environment",
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          },
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader",
              "code_128_reader",
              "code_39_reader",
              "upc_reader",
              "upc_e_reader"
            ]
          },
          locate: true,
          frequency: 10
        }, function(err) {
          if (err) {
            console.error('Quagga init error:', err);
            setScanDebugLog('Camera error: ' + (err.message || err));
            setIsWebcamScanning(false);
            return;
          }
          setScanDebugLog('Camera active! Scanning for EAN-13, EAN-8, CODE-128, UPC...');
          window.Quagga.start();
          setWebcamScanner({ type: 'quagga' });

          // Style the video to fill container
          const video = targetEl.querySelector('video');
          if (video) {
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.borderRadius = '12px';
          }
          const canvas = targetEl.querySelector('canvas');
          if (canvas) {
            canvas.style.display = 'none';
          }
        });

        window.Quagga.onProcessed(function(result) {
          frameCount++;
          if (frameCount % 50 === 0) {
            setScanDebugLog(`Frame ${frameCount}: Scanning... (no barcode yet)`);
          }
        });

        window.Quagga.onDetected(function(result) {
          if (detected) return;
          const code = result.codeResult.code;
          const format = result.codeResult.format;
          if (!code) return;
          detected = true;
          setScanDebugLog(`DECODED: "${code}" (${format})`);
          playBeep();
          handleBarcodeFound(code);
          try {
            window.Quagga.stop();
          } catch(e) {}
          setIsWebcamScanning(false);
          setWebcamScanner(null);
        });

      } catch (err) {
        console.error(err);
        setScanDebugLog('Error: ' + err.message);
      }
    }, 200);
  };

  const startWebcamScanner = () => {
    if (!window.Quagga) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/@ericblade/quagga2/dist/quagga.min.js";
      script.async = true;
      script.onload = () => initWebcamReader();
      script.onerror = () => {
        setErrorMessage('Failed to load scanner library.');
        setTimeout(() => setErrorMessage(''), 3000);
      };
      document.body.appendChild(script);
    } else {
      initWebcamReader();
    }
  };

  const stopWebcamScanner = () => {
    try {
      if (window.Quagga) window.Quagga.stop();
    } catch (e) { console.error(e); }
    setIsWebcamScanning(false);
    setWebcamScanner(null);
  };

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Active Date for Calendar
  const [activeCalendarDate, setActiveCalendarDate] = useState(new Date());

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
      const { type, message, changes } = e.detail || {};
      console.log('[SOCKET] PharmacyDashboard received sync event for:', type);
      if (type === 'coverage') {
        fetchCoverageData();
      } else if (type === 'prescription_updated') {
        if (changes && changes.pharmacist) {
          showToast(message || 'A prescription has been edited by the doctor!', 'info');
        }
        fetchData();
      } else {
        fetchData();
      }
    };
    window.addEventListener('curoxa_sync', handleSync);
    return () => window.removeEventListener('curoxa_sync', handleSync);
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/medicines');
      setInventory(res.data);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    }
  };

  const handleExportSalesCSV = () => {
    if (!prescriptions || prescriptions.length === 0) {
      showToast("No transaction records to export.");
      return;
    }

    const headers = ["Prescription ID", "Patient Name", "Patient ID", "Doctor Name", "Date & Time", "Total Items", "Total Amount", "Status"];

    const rows = prescriptions.map((p, index) => {
      const pId = p._id ? `RX-${p._id.substring(p._id.length - 6).toUpperCase()}` : `RX-00${index}`;
      const patientName = p.patientId?.name || 'Unknown Patient';
      const patientIdVal = p.patientId?._id ? `MDC-${p.patientId._id.toString().substring(18).toUpperCase()}` : 'N/A';
      const docName = p.doctorId?.name || 'Dr. Self';
      const dateTime = p.createdAt ? `${new Date(p.createdAt).toLocaleDateString()} ${new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A';
      const enrichedItems = enrichItemsWithPrice(p.items);
      const amountVal = enrichedItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
      const amount = `₹${amountVal.toFixed(2)}`;
      const status = p.status === 'Pending Pharmacy Dispatch' ? 'Pending' : p.status;

      return [pId, patientName, patientIdVal, docName, dateTime, itemsCount, amount, status]
        .map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pharmacy_sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("Transaction report exported successfully as CSV");
  };

  const handleExportInventoryCSV = () => {
    if (!inventory || inventory.length === 0) {
      showToast("No inventory records to export.");
      return;
    }

    const headers = ["Medicine Name", "Category", "SKU Code", "Stock Quantity", "Unit", "MRP", "Expiry Date"];

    const rows = inventory.map(inv => {
      const name = inv.name || '';
      const category = inv.category || '';
      const sku = inv.sku || '';
      const stock = inv.stock || 0;
      const unit = inv.unit || 'units';
      const mrp = `₹${(inv.mrp || 0).toFixed(2)}`;
      const expiry = inv.expiry || 'N/A';

      return [name, category, sku, stock, unit, mrp, expiry]
        .map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pharmacy_inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast("Inventory report exported successfully as CSV");
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
      // Receptionist cover: appointments and queue
      const apptsRes = await api.get('/appointments');
      if (apptsRes.data && Array.isArray(apptsRes.data)) {
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = apptsRes.data.filter(a => a.date && a.date.startsWith(today));
        setCoverageAppts(todayAppts.slice(0, 5).map(a => ({
          id: a._id,
          patient: a.patientId?.name || 'Unknown',
          slot: a.time || 'N/A',
          status: a.status || 'Upcoming',
          contact: a.patientId?.contact || 'N/A'
        })));

        // OPD Daily Token Queue derived from today's appointments
        setCoverageQueue(todayAppts.map((a, idx) => ({
          id: a._id,
          token: `T-${(idx + 1).toString().padStart(3, '0')}`,
          patient: a.patientId?.name || 'Unknown',
          status: a.status || 'Waiting',
          time: a.time || 'N/A'
        })));
      }

      const billsRes = await api.get('/billing');
      if (billsRes.data && Array.isArray(billsRes.data)) {
        setCoverageBills(billsRes.data.slice(0, 10).map(b => ({
          id: b._id,
          name: b.patientId?.name || 'Unknown',
          service: b.items?.[0]?.description || 'Medical Service',
          amount: b.totalAmount || 0,
          paid: b.status === 'Paid'
        })));
      }

      // Lab coverage: diagnostic test orders queue
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

      // Lab cover: reagents/inventory
      const labInvRes = await api.get('/lab-inventory');
      if (labInvRes.data && Array.isArray(labInvRes.data)) {
        setCoverageReagents(labInvRes.data.map(item => ({
          id: item._id,
          name: item.name || 'Unknown Reagent',
          level: item.stock || 0,
          unit: item.unit || 'units',
          minSafe: item.threshold || 0,
          status: (item.stock || 0) <= (item.threshold || 0) ? 'Low Stock' : 'Safe'
        })));
      }

      // Patients list
      const ptsRes = await api.get('/patients');
      if (ptsRes.data && Array.isArray(ptsRes.data)) {
        const mapped = ptsRes.data.map(p => ({
          ...p,
          uhid: `MDC-${p._id.toString().substring(18).toUpperCase()}`
        }));
        setPatients(mapped);
      }

      // Staff (Doctors) list
      const staffRes = await api.get('/auth/users/all');
      if (staffRes.data && Array.isArray(staffRes.data)) {
        setCoverageDoctors(staffRes.data.filter(s => s.role === 'doctor'));
      }
    } catch (err) {
      console.error("Failed to fetch coverage data", err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await api.get('/prescriptions');
      setPrescriptions(res.data);
      await fetchInventory();
      await fetchCoverageData();
      await fetchProcurementData();
      try {
        const returnRes = await api.get('/returns');
        setReturnLogs(returnRes.data);
      } catch (err) {
        console.error("Failed to fetch return logs:", err);
      }
      try {
        const indentsRes = await api.get('/indents');
        setIndents(indentsRes.data);
      } catch (err) {
        console.error("Failed to fetch indents:", err);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const dispensedPrescriptions = prescriptions.filter(p => p.status === 'Dispensed');

  const handleSelectPrescriptionForReturn = (pId) => {
    const rx = prescriptions.find(p => p._id === pId);
    if (rx) {
      setReturnPrescriptionId(rx._id);
      const code = rx._id ? `RX-${rx._id.substring(rx._id.length - 6).toUpperCase()}` : '';
      setReturnPrescriptionCode(code);
      setReturnPatientName(rx.patientId?.name || 'Walk-in');
      setReturnPatientPhone(rx.patientId?.phone || rx.patientId?.contact || '');
      const initialItems = (rx.items || []).map(item => {
        const medName = item.medicine || item.medicineName || item.name || '';
        const medInventory = inventory.find(i => i.name?.toLowerCase() === medName.toLowerCase());
        const price = medInventory ? medInventory.mrp : (item.price || 50);
        return {
          medicineName: medName,
          quantity: item.quantity || 1,
          maxQuantity: item.quantity || 1,
          unitPrice: price,
          reason: 'Doctor changed medication',
          action: 'Restocked',
          included: true
        };
      });
      setReturnItems(initialItems);
    }
  };

  const handleAddOfflineReturnItem = () => {
    setReturnItems(prev => [
      ...prev,
      { medicineName: '', quantity: 1, unitPrice: 0, reason: 'Doctor changed medication', action: 'Restocked' }
    ]);
  };

  const handleOfflineMedicineChange = (idx, medName) => {
    const med = inventory.find(i => i.name === medName);
    const updated = [...returnItems];
    updated[idx].medicineName = medName;
    if (med) {
      updated[idx].unitPrice = med.mrp || 0;
    }
    setReturnItems(updated);
  };

  const handleSaveReturnLog = async (e) => {
    e.preventDefault();
    if (!returnPatientName.trim()) {
      showToast("Please enter patient name.", true);
      return;
    }

    let itemsToSubmit = [];
    if (returnType === 'Prescription-Linked') {
      itemsToSubmit = returnItems.filter(item => item.included);
      if (itemsToSubmit.length === 0) {
        showToast("Please select at least one item to return.", true);
        return;
      }
    } else {
      itemsToSubmit = returnItems.filter(item => item.medicineName);
      if (itemsToSubmit.length === 0) {
        showToast("Please add at least one medicine to return.", true);
        return;
      }
    }

    const totalRefund = itemsToSubmit.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);

    const payload = {
      returnType,
      patientName: returnPatientName,
      patientPhone: returnPatientPhone,
      prescriptionId: returnType === 'Prescription-Linked' ? returnPrescriptionId : undefined,
      prescriptionCode: returnType === 'Prescription-Linked' ? returnPrescriptionCode : undefined,
      items: itemsToSubmit.map(item => ({
        medicineName: item.medicineName,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        reason: item.reason,
        action: item.action
      })),
      totalRefund
    };

    try {
      await api.post('/returns', payload);
      showToast("Medication return logged successfully! Inventory updated.");
      setShowLogReturnModal(false);
      setReturnPatientName('');
      setReturnPatientPhone('');
      setReturnPrescriptionId('');
      setReturnPrescriptionCode('');
      setReturnItems([{ medicineName: '', quantity: 1, unitPrice: 0, reason: 'Doctor changed medication', action: 'Restocked' }]);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to log return.", true);
    }
  };

  // Compute stock alerts dynamically from real inventory
  const alerts = inventory
    .filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock')
    .map((item, idx) => ({
      _id: item._id,
      id: `ALT-${idx + 1}`,
      item: item.name,
      type: item.status,
      severity: item.status === 'Out of Stock' ? 'High' : 'Medium',
      date: 'Today',
      rawItem: item
    }));

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, [activeTab, showProfileMenu, showMedicineModal, showPrescriptionModal, activeSubTab, prescriptionsFilter]);

  // Freeze background page scroll when any Modal Dialog is active
  useEffect(() => {
    if (showMedicineModal || showPrescriptionModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showMedicineModal, showPrescriptionModal, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const dispensePrescription = async (idOrIds) => {
    try {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      for (const id of ids) {
        await api.put(`/prescriptions/${id}`, { status: 'Dispensed' });
      }
      fetchData();
      setSuccessMessage('Prescription(s) Dispensed Successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to dispense prescription(s)');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleConfirmPaymentAndDispense = async () => {
    if (selectedPaymentMode === 'Cash') {
      const cashNum = Number(cashReceived);
      const totalDue = selectedPrescriptionGroup.amountVal || 0;
      if (!cashReceived || cashNum < totalDue) {
        setErrorMessage('Insufficient cash received amount');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
    }
    
    try {
      const raw = selectedPrescriptionGroup.rawObj;
      const ids = Array.isArray(raw) ? raw.map(x => x._id) : [raw._id];
      
      for (const id of ids) {
        await api.put(`/prescriptions/${id}`, { status: 'Dispensed', paymentMode: selectedPaymentMode });
      }

      // Create a Billing record in the backend for the dispensed prescription
      try {
        const patientId = selectedPrescriptionGroup.patientIdVal || 
                          (Array.isArray(raw) ? raw[0].patientId?._id || raw[0].patientId : raw.patientId?._id || raw.patientId);
        
        await api.post('/billing', {
          patientId,
          items: (selectedPrescriptionGroup.itemsList || []).map(item => ({
            description: `Medicine: ${item.medicine}`,
            amount: item.lineTotal || ((item.unitPrice || 0) * (item.quantity || 1))
          })),
          totalAmount: selectedPrescriptionGroup.amountVal || 0,
          paymentMethod: selectedPaymentMode,
          status: 'Paid'
        });
      } catch (billingErr) {
        console.error("Failed to auto-create billing record from pharmacy dispense", billingErr);
      }
      
      fetchData();
      setSuccessMessage(`Payment of ₹${(selectedPrescriptionGroup.amountVal || 0).toFixed(2)} settled via ${selectedPaymentMode}. Prescription dispensed successfully.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      
      // Auto-trigger print invoice bill
      handlePrintInvoice(selectedPrescriptionGroup);
      
      setShowPrescriptionModal(false);
      setCashReceived('');
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to settle payment and dispense');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handlePrintInvoice = (group) => {
    const printWindow = window.open('', '_blank');
    const enrichedItems = group.itemsList || [];
    const computedTotal = enrichedItems.reduce((acc, item) => acc + (item.lineTotal || 0), 0);
    const itemsHtml = enrichedItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; font-size: 14px; color: #0F172A; font-weight: 600;">
          ${item.medicine}
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">${item.dosage} • ${item.instructions || ''}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: center; font-size: 14px; color: #475569;">${item.duration}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: center; font-size: 14px; color: #475569;">${item.quantity || 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px; color: #475569;">₹${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-size: 14px; color: #0F172A; font-weight: 700;">₹${(item.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${group.id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body { font-family: 'Outfit', sans-serif; color: #1E293B; margin: 0; padding: 0; background: white; }
            .invoice-container {
              width: 100%;
              min-height: 100%;
              box-sizing: border-box;
              padding: 40mm 20mm 30mm 20mm; /* Space for letterhead */
              position: relative;
            }
            .print-letterhead-bg {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              width: 100%;
              height: 100%;
              z-index: -1;
              object-fit: contain;
              object-position: center top;
            }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: 800; color: #2563EB; }
            .meta { text-align: right; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { padding: 16px; border: 1px solid #E2E8F0; border-radius: 12px; background: #F8FAFC; }
            .card-title { font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 6px; }
            .card-val { font-size: 14px; font-weight: 700; color: #0F172A; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #F8FAFC; padding: 12px; text-align: left; border-bottom: 2px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; }
            .total { margin-top: 30px; text-align: right; font-size: 20px; font-weight: 800; color: #0F172A; border-top: 2px solid #E2E8F0; padding-top: 15px; }
            .print-only { display: block; }
            @media print {
              body * { visibility: hidden; }
              .invoice-container, .invoice-container *, .print-letterhead-bg { visibility: visible; }
              .invoice-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
            }
          </style>
        </head>
        <body>
          ${customPharmacyLetterhead ? (
            customPharmacyLetterhead.startsWith('data:application/pdf') || customPharmacyLetterhead.endsWith('.pdf') || customPharmacyLetterhead.includes('application/pdf') ? `
              <embed src="${customPharmacyLetterhead}" type="application/pdf" class="print-letterhead-bg" style="border: none;" />
            ` : `
              <img src="${customPharmacyLetterhead}" class="print-letterhead-bg" alt="Letterhead" />
            `
          ) : `
          <div class="print-only" style="position: fixed; top: 0; left: 0; width: 210mm; height: 25mm; background: #0F172A; color: white; padding: 5mm 15mm; box-sizing: border-box; z-index: -1;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 900;">CUROXA PHARMACY</h1>
            <p style="margin: 0; font-size: 10px; opacity: 0.8;">Premium Healthcare EMR System</p>
          </div>
          `}
          <div class="invoice-container" style="position: relative; z-index: 10;">
            ${!customPharmacyLetterhead ? `
            <div class="header">
              <div>
                <div class="title">Curoxa Pharmacy</div>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748B;">Premium Healthcare EMR System</p>
              </div>
              <div class="meta">
                <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #0F172A;">INVOICE ${group.id}</h3>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748B;">Date: ${group.dateStr || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
            ` : `
            <div class="meta" style="margin-bottom: 20px; text-align: right;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #0F172A;">INVOICE ${group.id}</h3>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748B;">Date: ${group.dateStr || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            `}
          <div class="details">
            <div class="card">
              <div class="card-title">Patient Details</div>
              <div class="card-val">${group.name}</div>
              <div style="font-size: 13px; color: #64748B; margin-top: 2px;">${group.age} Y / ${group.gender}</div>
              <div style="font-size: 13px; color: #64748B; margin-top: 2px;">${group.phone || ''}</div>
            </div>
            <div class="card">
              <div class="card-title">Doctor Details</div>
              <div class="card-val">${group.docName}</div>
              <div style="font-size: 13px; color: #64748B; margin-top: 2px;">${group.specialty}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th style="text-align: center;">Duration</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">Total: ₹${computedTotal.toFixed(2)}</div>
          <script>window.print();</script>
          </div> <!-- end invoice container -->
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      name: '',
      category: 'Pain Relief',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      stock: 50,
      unit: 'Strip',
      mrp: 20.00,
      expiry: '31/12/2025'
    });
    setShowMedicineModal(true);
  };

  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setCurrentId(item._id);
    setFormData({
      name: item.name,
      category: item.category,
      sku: item.sku,
      stock: item.stock,
      unit: item.unit,
      mrp: item.mrp,
      expiry: item.expiry
    });
    setShowMedicineModal(true);
  };

  const handleOpenRestock = (item) => {
    setModalMode('restock');
    setCurrentId(item._id);
    setFormData({
      name: item.name,
      category: item.category,
      sku: item.sku,
      stock: item.stock,
      unit: item.unit,
      mrp: item.mrp,
      expiry: item.expiry
    });
    setShowMedicineModal(true);
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await api.post('/medicines', formData);
        setSuccessMessage('Medicine added successfully');
      } else {
        await api.put(`/medicines/${currentId}`, formData);
        setSuccessMessage('Medicine updated successfully');
      }
      setShowMedicineModal(false);
      fetchInventory();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.error || 'Failed to save medicine');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDeleteMedicine = async (id) => {
    try {
      await api.delete(`/medicines/${id}`);
      setSuccessMessage('Medicine deleted successfully');
      fetchInventory();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to delete medicine');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Beautiful calendar days generator (Mon-Sun layout)
  const getCalendarDays = () => {
    const year = activeCalendarDate.getFullYear();
    const month = activeCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Align Mon = 0
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    
    const daysList = [];
    // Previous Month padding
    for (let i = startDay - 1; i >= 0; i--) {
      daysList.push({ day: daysInPrev - i, current: false });
    }
    // Current Month days
    for (let i = 1; i <= daysInMonth; i++) {
      daysList.push({ day: i, current: true });
    }
    // Next Month padding
    const remaining = 35 - daysList.length;
    for (let i = 1; i <= remaining; i++) {
      daysList.push({ day: i, current: false });
    }
    return daysList;
  };

  const handlePrevMonth = () => {
    setActiveCalendarDate(new Date(activeCalendarDate.getFullYear(), activeCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveCalendarDate(new Date(activeCalendarDate.getFullYear(), activeCalendarDate.getMonth() + 1, 1));
  };

  const getSalesBreakdown = () => {
    let cash = 0;
    let upi = 0;
    let card = 0;

    prescriptions
      .filter(p => p.status === 'Dispensed' || p.status === 'Dispensed by Pharmacy')
      .forEach(p => {
        const amt = (p.items || []).reduce((acc, curr) => {
          const invItem = inventory.find(inv => inv.name.toLowerCase() === (curr.medicine || '').toLowerCase());
          const price = invItem ? invItem.mrp : (curr.price || 50);
          let qty = curr.quantity || 1;
          if (qty === 1 && curr.duration) {
            const match = curr.duration.match(/\d+/);
            if (match) {
              const days = parseInt(match[0]);
              let freq = 2;
              if (curr.dosage) {
                const dos = curr.dosage.toLowerCase();
                if (dos.includes('once') || dos === '1-0-0' || dos === '0-0-1' || dos === '0-1-0') freq = 1;
                else if (dos.includes('thrice') || dos === '1-1-1') freq = 3;
              }
              qty = days * freq;
            }
          }
          return acc + (price * qty);
        }, 0);

        const mode = p.paymentMode || (p._id ? ['UPI', 'Cash', 'Card'][parseInt(p._id.substring(p._id.length - 2), 16) % 3] : 'UPI');
        if (mode === 'Cash') cash += amt;
        else if (mode === 'Card') card += amt;
        else upi += amt;
      });

    const total = cash + upi + card;
    return { cash, upi, card, total };
  };

  // Resolve medicine price from pharmacy inventory by matching name
  const resolveItemPrice = (medicineName) => {
    if (!medicineName || !inventory || inventory.length === 0) return 0;
    const normalised = medicineName.trim().toLowerCase();
    const match = inventory.find(inv => inv.name && inv.name.trim().toLowerCase() === normalised);
    return match ? (match.mrp || 0) : 0;
  };

  // Enrich prescription items with real inventory prices
  const enrichItemsWithPrice = (items) => {
    if (!items || items.length === 0) return [];
    return items.map(item => {
      const unitPrice = item.price || resolveItemPrice(item.medicine) || 0;
      const qty = item.quantity || 1;
      return { ...item, unitPrice, quantity: qty, lineTotal: unitPrice * qty };
    });
  };

  // High fidelity default data lists matching the design screenshot
  // Real backend prescriptions only
  const getPrescriptionsList = () => {
    const formattedBackend = prescriptions.map((p, index) => {
      const pId = p._id ? `#RX-${p._id.substring(p._id.length - 6).toUpperCase()}` : `#RX-00${index}`;
      const enrichedItems = enrichItemsWithPrice(p.items);
      const computedTotal = enrichedItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
      return {
        id: pId,
        name: p.patientId?.name || 'Unknown Patient',
        age: p.patientId?.age || 35,
        gender: p.patientId?.gender || 'Male',
        phone: p.patientId?.phone || p.patientId?.contact || '9876543210',
        patientIdVal: p.patientId?._id || '',
        docName: p.doctorId?.name || 'Dr. Self',
        specialty: p.doctorId?.specialty || 'General Practitioner',
        time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
        dateObj: p.createdAt ? new Date(p.createdAt) : new Date(),
        itemsCount: enrichedItems.length,
        itemsList: enrichedItems,
        amountVal: computedTotal,
        status: p.status === 'Pending Pharmacy Dispatch' ? 'Pending' : p.status,
        rawObj: p
      };
    });

    const finalQueue = formattedBackend.map(rx => ({
      ...rx,
      items: rx.itemsCount,
      amount: `₹${rx.amountVal.toFixed(2)}`
    }));

    // Filter by Active Calendar Date
    let filtered = finalQueue;
    if (activeCalendarDate) {
      filtered = filtered.filter(p => {
        const d = p.dateObj;
        return d.getDate() === activeCalendarDate.getDate() &&
               d.getMonth() === activeCalendarDate.getMonth() &&
               d.getFullYear() === activeCalendarDate.getFullYear();
      });
    }

    // Filter by Sub Tab
    if (activeSubTab === 'Urgent') {
      return filtered.filter(p => p.status === 'Pending').slice(0, 2); 
    } else if (activeSubTab === 'New') {
      return filtered.filter(p => p.status === 'Pending');
    } else if (activeSubTab === 'In Progress') {
      return filtered.filter(p => p.status === 'In Progress');
    }
    return filtered;
  };

  const getDedicatedPrescriptionsList = () => {
    const formattedBackend = prescriptions.map((p, index) => {
      const pId = p._id ? `RX-${p._id.substring(p._id.length - 6).toUpperCase()}` : `RX-00${index}`;
      const enrichedItems = enrichItemsWithPrice(p.items);
      const computedTotal = enrichedItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
      return {
        id: pId,
        name: p.patientId?.name || 'Unknown Patient',
        age: p.patientId?.age || 33,
        gender: p.patientId?.gender || 'Male',
        phone: p.patientId?.phone || p.patientId?.contact || '9876543210',
        patientIdVal: p.patientId?._id || '',
        docName: p.doctorId?.name || 'Dr. Self',
        specialty: p.doctorId?.specialty || 'General Medicine',
        time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:20 AM',
        dateStr: p.createdAt ? new Date(p.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '24 May 2024',
        dateObj: p.createdAt ? new Date(p.createdAt) : new Date(),
        itemsCount: enrichedItems.length,
        itemsList: enrichedItems,
        amountVal: computedTotal,
        status: p.status === 'Pending Pharmacy Dispatch' ? 'Pending' : p.status,
        rawObj: p
      };
    });

    let finalQueue = formattedBackend.map(rx => ({
      ...rx,
      items: rx.itemsCount,
      amount: `₹${rx.amountVal.toFixed(2)}`
    }));

    // 1. Filter based on prescriptionFilter state
    if (prescriptionsFilter !== 'All') {
      finalQueue = finalQueue.filter(p => p.status.toLowerCase() === prescriptionsFilter.toLowerCase());
    }

    // 2. Filter based on Search Query
    if (prescriptionsSearchQuery.trim()) {
      const q = prescriptionsSearchQuery.toLowerCase();
      finalQueue = finalQueue.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }

    // 3. Filter by Date Picker (prescriptionsDateFilter format YYYY-MM-DD)
    if (prescriptionsDateFilter) {
      const filterDateStr = new Date(prescriptionsDateFilter).toDateString();
      finalQueue = finalQueue.filter(p => {
        const d = p.dateObj;
        return d.toDateString() === filterDateStr;
      });
    }

    return finalQueue;
  };

  const activeQueue = getPrescriptionsList();
  const activeTabPrescriptions = getDedicatedPrescriptionsList();

  // Dynamic pagination for Overview queue
  const overviewPageSize = 5;
  const totalOverviewPages = Math.ceil(activeQueue.length / overviewPageSize) || 1;
  const paginatedOverviewQueue = activeQueue.slice((overviewPage - 1) * overviewPageSize, overviewPage * overviewPageSize);

  // Dynamic pagination for prescriptions tab
  const prescriptionsPageSize = 10;
  const totalPrescriptionsPages = Math.ceil(activeTabPrescriptions.length / prescriptionsPageSize) || 1;
  const paginatedPrescriptions = activeTabPrescriptions.slice((prescriptionsPage - 1) * prescriptionsPageSize, prescriptionsPage * prescriptionsPageSize);

  const salesBreakdown = getSalesBreakdown();
  const totalVal = salesBreakdown.total || 1;
  const cashPct = Math.round((salesBreakdown.cash / totalVal) * 100);
  const upiPct = Math.round((salesBreakdown.upi / totalVal) * 100);
  const cardPct = Math.round((salesBreakdown.card / totalVal) * 100);

  return (
    <>
      <style>{`
        /* Box sizing safeguard for layout alignments */
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

        .modal-overlay {
          display: flex !important;
          z-index: 1300 !important;
          background: rgba(15, 23, 42, 0.45) !important;
          backdrop-filter: blur(8px) !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* SIDEBAR OVERRIDES */
        .sidebar {
          width: 256px !important;
          background: #FFFFFF !important;
          border-right: 1px solid #E2E8F0 !important;
          box-shadow: none !important;
          padding: 16px 0 !important;
          height: calc(100vh / 0.9) !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          z-index: 100 !important;
        }
        .sidebar-logo {
          padding: 8px 24px 20px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-size: 22px !important;
          font-weight: 900 !important;
          color: #2563EB !important;
          letter-spacing: -0.5px !important;
        }
        .sidebar-logo svg, .sidebar-logo i {
          color: #2563EB !important;
          width: 24px !important;
          height: 24px !important;
        }
        .sidebar nav {
          display: flex !important;
          flex-direction: column !important;
          height: calc(100% - 130px) !important;
          overflow-y: auto !important;
        }
        .sidebar .nav-link {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 12px 20px !important;
          margin: 4px 16px !important;
          border-radius: 8px !important;
          color: #64748B !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          transition: all 0.2s ease !important;
          border-left: none !important;
          position: relative !important;
        }
        .sidebar .nav-link:hover {
          background: #F8FAFC !important;
          color: #0F172A !important;
        }
        .sidebar .nav-link.active {
          background: #EFF6FF !important;
          color: #2563EB !important;
          font-weight: 700 !important;
          position: relative !important;
          border-left: none !important;
        }

        .sidebar-profile-card {
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
        .sidebar-profile-card:hover {
          background: #F1F5F9 !important;
        }
        .sidebar-profile-avatar {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
          border: 2px solid #60A5FA !important;
        }
        .sidebar-profile-info {
          display: flex !important;
          flex-direction: column !important;
        }
        .sidebar-profile-name {
          font-size: 13.5px !important;
          font-weight: 800 !important;
          color: #0F172A !important;
          line-height: 1.3 !important;
        }
        .sidebar-profile-role {
          font-size: 11px !important;
          color: #64748B !important;
          font-weight: 600 !important;
        }
        .sidebar-profile-chevron {
          color: #64748B !important;
          width: 16px !important;
          height: 16px !important;
          margin-left: auto !important;
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
          justify-content: flex-end !important;
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
          left: 0 !important;
          z-index: 99 !important;
          gap: 20px !important;
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
          padding: 24px !important;
        }

        .kpi-grid {
          display: grid !important;
          grid-template-columns: repeat(5, 1fr) !important;
          gap: 20px !important;
          margin-bottom: 24px !important;
        }

        .premium-kpi-card {
          background: #ffffff !important;
          border: 1px solid #F1F5F9 !important;
          border-radius: 16px !important;
          padding: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          transition: transform 0.2s, box-shadow 0.2s !important;
          cursor: pointer !important;
        }
        .premium-kpi-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.02) !important;
        }

        .kpi-val {
          font-size: 28px !important;
          font-weight: 800 !important;
          color: #0F172A !important;
          line-height: 1.2 !important;
        }
        
        .kpi-lbl {
          font-size: 11.5px !important;
          color: #64748B !important;
          font-weight: 700 !important;
          margin-bottom: 4px !important;
        }

        .kpi-trend {
          font-size: 11px !important;
          font-weight: 700 !important;
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
        }

        .trend-up {
          color: #10B981 !important;
        }
        .trend-danger {
          color: #EF4444 !important;
        }

        .icon-box-kpi {
          width: 44px !important;
          height: 44px !important;
          border-radius: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* TABLES */
        .premium-table {
          width: 100% !important;
          border-collapse: collapse !important;
          text-align: left !important;
        }
        .premium-table th {
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #94A3B8 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          padding: 12px 16px !important;
          border-bottom: 1px solid #F1F5F9 !important;
        }
        .premium-table td {
          padding: 16px !important;
          border-bottom: 1px solid #F8FAFC !important;
        }
        .premium-table tbody tr:hover {
          background-color: #F8FAFC !important;
        }

        /* BADGES */
        .pill-badge {
          padding: 4px 10px !important;
          border-radius: 6px !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          display: inline-flex !important;
        }
        .badge-pending {
          background: #EFF6FF !important;
          color: #2563EB !important;
        }
        .badge-progress {
          background: #F5F3FF !important;
          color: #7C3AED !important;
        }
        .badge-dispensed {
          background: #ECFDF5 !important;
          color: #10B981 !important;
        }
        .badge-low {
          background: #FEF2F2 !important;
          color: #EF4444 !important;
        }

        /* SUB TABS */
        .subtab-pill {
          padding: 6px 14px !important;
          border-radius: 8px !important;
          font-size: 12.5px !important;
          font-weight: 700 !important;
          color: #64748B !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        .subtab-pill:hover {
          background: #F1F5F9 !important;
          color: #0F172A !important;
        }
        .subtab-pill.active {
          background: #EFF6FF !important;
          color: #2563EB !important;
        }

        /* CALENDAR */
        .calendar-cell {
          width: 28px !important;
          height: 28px !important;
          margin: 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          border-radius: 50% !important;
          transition: all 0.15s !important;
        }
        .calendar-cell.inactive {
          color: #CBD5E1 !important;
        }
        .calendar-cell.active {
          background: #2563EB !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }
        .calendar-cell:hover:not(.active) {
          background: #F1F5F9 !important;
        }

        @keyframes slideUp {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .mobile-menu-toggle {
          display: none !important;
        }

        .top-nav-search {
          position: relative;
          width: 320px;
        }

        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: 1fr !important;
          }
          .sidebar {
            left: -240px !important;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            display: flex !important;
            z-index: 2000 !important;
          }
          .sidebar.mobile-open {
            left: 0 !important;
            z-index: 2010 !important;
          }
          .top-nav, .main-content {
            margin-left: 0 !important;
          }
          .top-nav {
            padding: 0 16px !important;
            justify-content: space-between !important;
            left: 0 !important;
          }
          .mobile-menu-toggle {
            display: flex !important;
            z-index: 100 !important;
          }
          .top-nav-search {
            width: auto !important;
            max-width: 180px !important;
            flex: 1 !important;
          }
          .modal-overlay {
            left: 0 !important;
            width: 100% !important;
          }
          .mobile-backdrop {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-color: rgba(15, 23, 42, 0.4) !important;
            backdrop-filter: blur(4px) !important;
            z-index: 1999 !important;
            animation: fadeIn 0.2s ease-out !important;
          }

          /* Safe-area spacing overrides for bottom sidebar profile on mobile */
          .sidebar {
            height: 100% !important;
            height: 100dvh !important;
            padding-bottom: calc(32px + env(safe-area-inset-bottom, 32px)) !important;
          }
          .sidebar-profile-card {
            padding-bottom: 16px !important;
            margin-bottom: 0 !important;
          }
          .sidebar-profile-popover {
            bottom: calc(80px + 32px + env(safe-area-inset-bottom, 32px)) !important;
          }
        }

        /* ----- PHARMACY DASHBOARD RESPONSIVE SPLIT LAYOUT ----- */
        .pharmacy-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        /* Calendar Retraction & Expansion Drawer Styles */
        @media (min-width: 1025px) {
          .calendar-row {
            display: flex !important;
            width: 100% !important;
            gap: 0px !important;
            margin-bottom: 24px !important;
          }
          .calendar-left-panel {
            width: 100% !important;
            flex-shrink: 0 !important;
            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .calendar-left-panel.calendar-open {
            width: calc(63% - 12px) !important;
          }
          .calendar-right-panel {
            width: 0px !important;
            margin-left: 0px !important;
            opacity: 0 !important;
            visibility: hidden !important;
            overflow: hidden !important;
            padding: 0px !important;
            border: none !important;
            box-shadow: none !important;
            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
                        margin-left 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
                        opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                        padding 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        visibility 0.5s !important;
            flex-shrink: 0 !important;
          }
          .calendar-right-panel.calendar-open {
            width: calc(37% - 12px) !important;
            margin-left: 24px !important;
            opacity: 1 !important;
            visibility: visible !important;
            padding: 24px !important;
            border: 1px solid #F1F5F9 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.01) !important;
          }
        }

        @media (max-width: 1024px) {
          .calendar-row {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
            margin-bottom: 24px !important;
          }
          .calendar-left-panel {
            width: 100% !important;
          }
          .calendar-right-panel {
            width: 100% !important;
            opacity: 0 !important;
            visibility: hidden !important;
            max-height: 0px !important;
            overflow: hidden !important;
            margin-left: 0px !important;
            padding: 0px !important;
            border: none !important;
            box-shadow: none !important;
            transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
                        opacity 0.4s ease, 
                        padding 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        visibility 0.5s !important;
          }
          .calendar-right-panel.calendar-open {
            max-height: 800px !important;
            opacity: 1 !important;
            visibility: visible !important;
            padding: 24px !important;
            border: 1px solid #F1F5F9 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.01) !important;
          }
        }
        @media (max-width: 640px) {
          .pharmacy-card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .pharmacy-card-header .subtab-container {
            width: 100% !important;
            overflow-x: auto !important;
            display: flex !important;
            white-space: nowrap !important;
            padding-bottom: 4px !important;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>

      {/* Sidebar Layout */}
      {/* Main Sidebar */}
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
          <a href="#" className={`nav-link ${activeTab === 'dash' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dash'); setMobileSidebarOpen(false); }}>
            <i data-lucide="layout-grid"></i> Overview
          </a>
          {(currentUser?.role === 'pharmacy' || (coverageState['ph-queue']?.on || coverageState['ph-dispense']?.on)) && (
            <a href="#" className={`nav-link ${activeTab === 'prescriptions' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('prescriptions'); setMobileSidebarOpen(false); }}>
              <i data-lucide="file-text"></i> Prescriptions
            </a>
          )}
          {(currentUser?.role === 'pharmacy' || (coverageState['ph-queue']?.on || coverageState['ph-dispense']?.on)) && (
            <a href="#" className={`nav-link ${activeTab === 'internal' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('internal'); setMobileSidebarOpen(false); }}>
              <i data-lucide="git-pull-request"></i> Internal requests
            </a>
          )}
          {(currentUser?.role === 'pharmacy' || coverageState['ph-billing']?.on) && (
            <a href="#" className={`nav-link ${activeTab === 'sales' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('sales'); setMobileSidebarOpen(false); }}>
              <i data-lucide="credit-card"></i> Sales
            </a>
          )}
          {(currentUser?.role === 'pharmacy' || (coverageState['ph-stock']?.on || coverageState['dr-stockview']?.on)) && (
            <a href="#" className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('inventory'); setMobileSidebarOpen(false); }}>
              <i data-lucide="package"></i> Inventory
            </a>
          )}
          {(currentUser?.role === 'pharmacy' || coverageState['ph-stock']?.on) && (
            <a href="#" className={`nav-link ${activeTab === 'returns' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('returns'); setMobileSidebarOpen(false); }}>
              <i data-lucide="refresh-cw"></i> Returns
            </a>
          )}
          {(currentUser?.role === 'pharmacy' || (coverageState['ph-stock']?.on || coverageState['ph-billing']?.on)) && (
            <a href="#" className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('reports'); setMobileSidebarOpen(false); }}>
              <i data-lucide="trending-up"></i> Reports
            </a>
          )}
          {(currentUser?.role === 'pharmacy' || currentUser?.role === 'admin' || coverageState['ph-stock']?.on) && (
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); window.open('/procurement', '_blank'); setMobileSidebarOpen(false); }}>
              <i data-lucide="shopping-cart"></i> Procurement
            </a>
          )}
 
 
          {/* DYNAMIC COVERAGE INTEGRATION LINKS */}
          {(Object.keys(coverageState || {}).some(k => k.startsWith('rc-') && coverageState[k]?.on)) && tenantModules.reception?.enabled !== false && (
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); window.open('/receptionist', '_blank'); setMobileSidebarOpen(false); }} style={{ color: '#E11D48', fontWeight: 800 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              Receptionist Cover
            </a>
          )}
          {(Object.keys(coverageState || {}).some(k => k.startsWith('lt-') && coverageState[k]?.on)) && tenantModules.laboratory?.enabled !== false && (
            <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); window.open('/lab', '_blank'); setMobileSidebarOpen(false); }} style={{ color: '#059669', fontWeight: 800 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M6 18H18"/><path d="M10 14H14"/><path d="M12 2v20"/><path d="M18 10H6"/></svg>
              Lab Cover
            </a>
          )}
        </nav>

        {/* Bottom Profile Card */}
        <div className="sidebar-profile-card" onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}>
          {currentUser.avatar ? (
            <img 
              className="sidebar-profile-avatar" 
              src={currentUser.avatar} 
              alt="Pharmacist Avatar" 
              style={{ objectFit: 'cover', border: '2px solid #BFDBFE' }}
            />
          ) : (
            <div className="sidebar-profile-avatar-initials" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', marginRight: '10px', flexShrink: 0 }}>
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PH'}
            </div>
          )}
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{currentUser.name}</span>
            <span className="sidebar-profile-role">Pharmacy</span>
          </div>
          <i data-lucide="chevron-down" className="sidebar-profile-chevron" style={{ transition: '0.3s', transform: showProfileMenu ? 'rotate(180deg)' : 'none' }}></i>

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
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A' }}>{currentUser.name}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Pharmacy Manager</div>
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

      {/* Top Navbar */}
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

        <div className="top-nav-search">
          <i data-lucide="search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', width: '16px' }}></i>
          <input 
            type="text" 
            style={{ 
              paddingLeft: '40px', 
              width: '100%', 
              height: '40px', 
              borderRadius: '8px', 
              border: '1px solid #E2E8F0', 
              background: '#F8FAFC', 
              fontSize: '13px', 
              color: '#1E293B', 
              outline: 'none' 
            }} 
            placeholder="Search patient by mobile/ID" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Notification Bell */}
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
    )}

      {/* Main Content Area */}
      <div className={"main-content " + (activeTab === 'hr-payroll' ? "fullscreen-portal" : (isSidebarCollapsed ? "collapsed" : ""))} data-lenis-prevent>
        
        {successMessage && (
          <div style={{ color: '#15803D', background: '#F0FDF4', border: '1px solid #DCFCE7', padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i data-lucide="check-circle" style={{ width: '16px' }}></i>{successMessage}
          </div>
        )}
        {errorMessage && (
          <div style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FEE2E2', padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i data-lucide="alert-triangle" style={{ width: '16px' }}></i>{errorMessage}
          </div>
        )}

        {activeTab === 'hr-payroll' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: 0 }}>
            <HRPayroll onExit={() => setActiveTab('dash')} />
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'dash' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            
            {/* 5 KPI Cards Grid */}
            <div className="kpi-grid">
              
              {/* Card 1: Today's Prescriptions */}
              <div className="premium-kpi-card" onClick={() => setActiveTab('prescriptions')}>
                <div>
                  <div className="kpi-lbl">Today's Prescriptions</div>
                  <div className="kpi-val">{prescriptions.filter(p => {
                    const pDate = p.createdAt ? new Date(p.createdAt).toDateString() : new Date().toDateString();
                    return pDate === new Date().toDateString();
                  }).length}</div>
                  <div className="kpi-trend trend-up">
                    <span>Active Today</span>
                  </div>
                </div>
                <div className="icon-box-kpi" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <i data-lucide="file-text" style={{ width: '20px' }}></i>
                </div>
              </div>

              {/* Card 2: Pending to Dispense */}
              <div className="premium-kpi-card" onClick={() => setActiveTab('prescriptions')}>
                <div>
                  <div className="kpi-lbl">Pending to Dispense</div>
                  <div className="kpi-val">{prescriptions.filter(p => p.status === 'Pending Pharmacy Dispatch' || p.status === 'Pending' || p.status === 'In Progress').length}</div>
                  <div className="kpi-trend trend-danger">
                    <span>Awaiting payment</span>
                  </div>
                </div>
                <div className="icon-box-kpi" style={{ background: '#FEF2F2', color: '#EF4444' }}>
                  <i data-lucide="edit-3" style={{ width: '20px' }}></i>
                </div>
              </div>

              {/* Card 3: Prescriptions Dispensed */}
              <div className="premium-kpi-card" onClick={() => setActiveTab('prescriptions')}>
                <div>
                  <div className="kpi-lbl">Prescriptions Dispensed</div>
                  <div className="kpi-val">{prescriptions.filter(p => p.status === 'Dispensed' || p.status === 'Dispensed by Pharmacy').length}</div>
                  <div className="kpi-trend trend-up">
                    <span>Completed</span>
                  </div>
                </div>
                <div className="icon-box-kpi" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                  <i data-lucide="check" style={{ width: '20px' }}></i>
                </div>
              </div>

              {/* Card 4: Today's Sales */}
              <div className="premium-kpi-card" onClick={() => setActiveTab('sales')}>
                <div>
                  <div className="kpi-lbl">Today's Sales</div>
                  <div className="kpi-val">₹{getSalesBreakdown().total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div className="kpi-trend trend-up">
                    <span>Real-time billing</span>
                  </div>
                </div>
                <div className="icon-box-kpi" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                  <i data-lucide="credit-card" style={{ width: '20px' }}></i>
                </div>
              </div>

              {/* Card 5: Low Stock Items */}
              <div className="premium-kpi-card" onClick={() => setActiveTab('inventory')}>
                <div>
                  <div className="kpi-lbl">Low Stock Items</div>
                  <div className="kpi-val">{inventory.filter(item => item.status === 'Low Stock' || item.status === 'Out of Stock').length}</div>
                  <div className="kpi-trend" style={{ color: '#2563EB', textDecoration: 'underline' }}>
                    <span>View All</span>
                  </div>
                </div>
                <div className="icon-box-kpi" style={{ background: '#FDF2F8', color: '#DB2777' }}>
                  <i data-lucide="alert-triangle" style={{ width: '20px' }}></i>
                </div>
              </div>

            </div>

            {/* Split Section: Table and Calendar */}
            <div className="calendar-row mobile-stack">
              
              {/* Prescriptions Queue */}
              <div className={`glass-card calendar-left-panel ${showHomeCalendar ? 'calendar-open' : ''}`} style={{ padding: '24px', border: '1px solid #F1F5F9', borderRadius: '16px', background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
                <div className="pharmacy-card-header">
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Prescriptions Queue</h3>
                  <div className="subtab-container" style={{ display: 'flex', gap: '8px' }}>
                    {['All', 'Urgent', 'New', 'In Progress'].map(tab => (
                      <span 
                        key={tab} 
                        className={`subtab-pill ${activeSubTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveSubTab(tab)}
                      >
                        {tab} {tab === 'All' ? `(${prescriptions.length})` : tab === 'Urgent' ? `(${prescriptions.filter(p => p.status === 'Pending' || p.status === 'Pending Pharmacy Dispatch').slice(0, 2).length})` : tab === 'New' ? `(${prescriptions.filter(p => p.status === 'Pending' || p.status === 'Pending Pharmacy Dispatch').length})` : `(${prescriptions.filter(p => p.status === 'In Progress').length})`}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <a href="#" style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); setActiveTab('prescriptions'); }}>View All →</a>
                    {!showHomeCalendar && (
                      <button 
                        onClick={() => setShowHomeCalendar(true)}
                        title="Expand Calendar"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          borderRadius: '8px',
                          color: '#64748B',
                          backgroundColor: '#F1F5F9',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                          <line x1="16" x2="16" y1="2" y2="6"/>
                          <line x1="8" x2="8" y1="2" y2="6"/>
                          <line x1="3" x2="21" y1="10" y2="10"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Patient Details</th>
                        <th>Doctor</th>
                        <th>Time</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOverviewQueue.length > 0 ? (
                        paginatedOverviewQueue.map((p, idx) => (
                          <tr key={idx}>
                            <td>
                              <div 
                                style={{ fontWeight: 700, fontSize: '14px', color: '#2563EB', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => {
                                  setSelectedPrescriptionGroup(p);
                                  setPrescriptionModalStep('details');
                                  setShowPrescriptionModal(true);
                                }}
                              >
                                {p.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{p.age} Y, {p.gender}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#334155' }}>{p.docName}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{p.specialty}</div>
                            </td>
                            <td style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                              <div>{p.time}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Today</div>
                            </td>
                            <td style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                              <span 
                                style={{ color: '#2563EB', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => {
                                  setSelectedPrescriptionGroup(p);
                                  setPrescriptionModalStep('details');
                                  setShowPrescriptionModal(true);
                                }}
                              >
                                {p.items}
                              </span>
                            </td>
                            <td style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{p.amount}</td>
                            <td>
                              <span className={`pill-badge ${p.status === 'Pending' ? 'badge-pending' : (p.status === 'In Progress' ? 'badge-progress' : 'badge-dispensed')}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>
                              {p.status === 'Pending' && p.rawObj && (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px', background: '#2563EB', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                                  onClick={() => {
                                    setSelectedPrescriptionGroup(p);
                                    setPrescriptionModalStep('payment');
                                    setShowPrescriptionModal(true);
                                  }}
                                >
                                  Dispense
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14px', fontWeight: 600 }}>
                            No prescriptions in the pharmacy queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                    {activeQueue.length > 0 
                      ? `Showing ${(overviewPage - 1) * overviewPageSize + 1} to ${Math.min(overviewPage * overviewPageSize, activeQueue.length)} of ${activeQueue.length} prescriptions`
                      : 'Showing 0 prescriptions'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => setOverviewPage(prev => Math.max(1, prev - 1))}
                      disabled={overviewPage === 1}
                      style={{ background: 'none', border: 'none', cursor: overviewPage === 1 ? 'not-allowed' : 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                    >
                      <i data-lucide="chevron-left" style={{ width: '16px' }}></i>
                    </button>
                    {Array.from({ length: totalOverviewPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = overviewPage === pageNum;
                      return (
                        <span 
                          key={pageNum}
                          onClick={() => setOverviewPage(pageNum)}
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
                      onClick={() => setOverviewPage(prev => Math.min(totalOverviewPages, prev + 1))}
                      disabled={overviewPage === totalOverviewPages}
                      style={{ background: 'none', border: 'none', cursor: overviewPage === totalOverviewPages ? 'not-allowed' : 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                    >
                      <i data-lucide="chevron-right" style={{ width: '16px' }}></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Today's Overview (Calendar Card) */}
              <div className={`glass-card calendar-right-panel ${showHomeCalendar ? 'calendar-open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Today's Overview</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      onClick={() => setShowHomeCalendar(false)}
                      title="Collapse Calendar"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '6px',
                        borderRadius: '8px',
                        color: '#64748B',
                        backgroundColor: '#F1F5F9',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>

                {/* Calendar Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                    {activeCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', color: '#64748B' }}>
                    <i data-lucide="chevron-left" style={{ width: '16px', cursor: 'pointer' }} onClick={handlePrevMonth}></i>
                    <i data-lucide="chevron-right" style={{ width: '16px', cursor: 'pointer' }} onClick={handleNextMonth}></i>
                  </div>
                </div>

                {/* Week headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <span key={day} style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8' }}>{day}</span>
                  ))}
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '24px' }}>
                  {getCalendarDays().map((d, idx) => (
                    <div 
                      key={idx} 
                      className={`calendar-cell ${!d.current ? 'inactive' : ''} ${d.current && d.day === activeCalendarDate.getDate() ? 'active' : ''}`}
                      onClick={() => d.current && setActiveCalendarDate(new Date(activeCalendarDate.getFullYear(), activeCalendarDate.getMonth(), d.day))}
                    >
                      {d.day}
                    </div>
                  ))}
                </div>

                {/* Bullet Stats list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB' }}></span>
                      <span>Prescriptions</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>58</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EA580C' }}></span>
                      <span>Dispensed</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>35</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }}></span>
                      <span>Pending</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>23</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span>
                      <span>Cancelled</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>0</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom 4-Card Analytics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              
              {/* Card 1: Inventory Snapshot */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Inventory Snapshot</h4>
                  <i data-lucide="package" style={{ width: '16px', color: '#2563EB' }} onClick={() => setActiveTab('inventory')}></i>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                      <i data-lucide="folder" style={{ width: '14px' }}></i>
                      <span>Total Items</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>1,245</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                      <i data-lucide="check-circle" style={{ width: '14px', color: '#2563EB' }}></i>
                      <span>In Stock</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB' }}>{inventory.filter(m => (m.stock || 0) > 20).length}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                      <i data-lucide="alert-triangle" style={{ width: '14px', color: '#EA580C' }}></i>
                      <span>Low Stock</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#EA580C' }}>{inventory.filter(m => (m.stock || 0) > 0 && (m.stock || 0) <= 20).length}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                      <i data-lucide="x-circle" style={{ width: '14px', color: '#EF4444' }}></i>
                      <span>Out of Stock</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#EF4444' }}>{inventory.filter(m => (m.stock || 0) === 0).length}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Sales Split */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Sales Split</h4>
                  <i data-lucide="trending-up" style={{ width: '16px', color: '#2563EB' }}></i>
                </div>

                {/* SVG Donut Chart */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', height: '110px' }}>
                  <svg width="100" height="100" viewBox="0 0 36 36">
                    <path
                      className="pharmacy-donut-ring"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="3.5"
                    />
                    <path
                      className="pharmacy-donut-segment"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#854D0E" // Cash (Brown)
                      strokeWidth="3.5"
                      strokeDasharray={`${cashPct} ${100 - cashPct}`}
                      strokeDashoffset="25"
                    />
                    <path
                      className="pharmacy-donut-segment"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#2563EB" // UPI (Blue)
                      strokeWidth="3.5"
                      strokeDasharray={`${upiPct} ${100 - upiPct}`}
                      strokeDashoffset={25 - cashPct}
                    />
                    <path
                      className="pharmacy-donut-segment"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#7C3AED" // Card (Purple)
                      strokeWidth="3.5"
                      strokeDasharray={`${cardPct} ${100 - cardPct}`}
                      strokeDashoffset={25 - cashPct - upiPct}
                    />
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '8px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Total Sales</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A' }}>₹{salesBreakdown.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Legends list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }}></span>
                      UPI
                    </span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>₹{salesBreakdown.upi.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({upiPct}%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#854D0E' }}></span>
                      Cash
                    </span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>₹{salesBreakdown.cash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({cashPct}%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }}></span>
                      Card
                    </span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>₹{salesBreakdown.card.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({cardPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Low Stock Alerts */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Low Stock Alerts</h4>
                  <a href="#" style={{ fontSize: '11.5px', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); setActiveTab('inventory'); }}>View All</a>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(() => {
                    const lowItems = inventory.filter(m => (m.stock || 0) <= 20).slice(0, 4);
                    if (lowItems.length === 0) return (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                        All medicines are well-stocked ✓
                      </div>
                    );
                    return lowItems.map(med => (
                      <div key={med._id || med.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: '10px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{med.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Stock: {med.stock || 0}</div>
                        </div>
                        <span className={`pill-badge ${(med.stock || 0) === 0 ? 'badge-out' : 'badge-low'}`}>
                          {(med.stock || 0) === 0 ? 'Out' : 'Low'}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Card 4: Payment Summary */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Payment Summary</h4>
                  <i data-lucide="wallet" style={{ width: '16px', color: '#2563EB' }}></i>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                      <i data-lucide="banknote" style={{ width: '14px' }}></i>
                      <span>Cash</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>₹{salesBreakdown.cash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>{cashPct}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                      <i data-lucide="qr-code" style={{ width: '14px' }}></i>
                      <span>UPI</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>₹{salesBreakdown.upi.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>{upiPct}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                      <i data-lucide="credit-card" style={{ width: '14px' }}></i>
                      <span>Card</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>₹{salesBreakdown.card.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>{cardPct}%</div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569' }}>Total Collection</span>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#2563EB' }}>₹{salesBreakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: PRESCRIPTIONS LIST */}
        {activeTab === 'prescriptions' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            
            {/* Header and Filter Buttons Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Prescriptions List</h2>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search query input */}
                <div style={{ position: 'relative', width: '280px' }}>
                  <i data-lucide="search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', color: '#64748B' }}></i>
                  <input 
                    type="text" 
                    placeholder="Search name, phone, or RX ID..." 
                    value={prescriptionsSearchQuery} 
                    onChange={(e) => { setPrescriptionsSearchQuery(e.target.value); setPrescriptionsPage(1); }} 
                    style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600, outline: 'none', transition: 'all 0.2s', color: '#1E293B' }}
                  />
                  {prescriptionsSearchQuery && (
                    <i data-lucide="x" onClick={() => setPrescriptionsSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', color: '#94A3B8', cursor: 'pointer' }}></i>
                  )}
                </div>

                {/* Calendar Date Filter input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '6px 12px' }}>
                  <i data-lucide="calendar" style={{ width: '16px', color: '#64748B' }}></i>
                  <input 
                    type="date" 
                    value={prescriptionsDateFilter} 
                    onChange={(e) => { setPrescriptionsDateFilter(e.target.value); setPrescriptionsPage(1); }} 
                    style={{ border: 'none', outline: 'none', fontSize: '13px', fontWeight: 700, color: '#334155', cursor: 'pointer', fontFamily: 'Urbanist, sans-serif' }}
                  />
                  {prescriptionsDateFilter && (
                    <i data-lucide="x" onClick={() => setPrescriptionsDateFilter('')} style={{ width: '14px', color: '#94A3B8', cursor: 'pointer', marginLeft: '4px' }}></i>
                  )}
                </div>

                {/* Clear filter button */}
                {(prescriptionsSearchQuery || prescriptionsDateFilter || prescriptionsFilter !== 'All') && (
                  <button 
                    onClick={() => { setPrescriptionsSearchQuery(''); setPrescriptionsDateFilter(''); setPrescriptionsFilter('All'); setPrescriptionsPage(1); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tab Filter Pills */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { key: 'All', count: prescriptions.length },
                { key: 'Pending', count: prescriptions.filter(p => p.status === 'Pending' || p.status === 'Pending Pharmacy Dispatch').length },
                { key: 'In Progress', count: prescriptions.filter(p => p.status === 'In Progress').length },
                { key: 'Dispensed', count: prescriptions.filter(p => p.status === 'Dispensed').length },
                { key: 'Cancelled', count: prescriptions.filter(p => p.status === 'Cancelled').length }
              ].map(item => {
                const isActive = prescriptionsFilter.toLowerCase() === item.key.toLowerCase();
                return (
                  <button
                    key={item.key}
                    onClick={() => { setPrescriptionsFilter(item.key); setPrescriptionsPage(1); }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '24px',
                      border: isActive ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      background: isActive ? '#EFF6FF' : 'white',
                      color: isActive ? '#2563EB' : '#64748B',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    {item.key} ({item.count})
                  </button>
                );
              })}
            </div>

            {/* Prescriptions Database Table */}
            <div className="glass-card" style={{ padding: '0 24px 24px 24px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '16px' }}>Prescription ID</th>
                      <th style={{ padding: '16px' }}>Patient</th>
                      <th style={{ padding: '16px' }}>Doctor</th>
                      <th style={{ padding: '16px' }}>Time</th>
                      <th style={{ padding: '16px', textAlign: 'center' }}>Items</th>
                      <th style={{ padding: '16px' }}>Amount</th>
                      <th style={{ padding: '16px' }}>Status</th>
                      <th style={{ padding: '16px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrescriptions.length > 0 ? (
                      paginatedPrescriptions.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                            <span style={{ color: '#2563EB', fontWeight: 800, fontSize: '13.5px' }}>{p.id}</span>
                          </td>
                          
                          <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                            <div 
                              style={{ fontWeight: 800, fontSize: '13.5px', color: '#2563EB', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => {
                                setSelectedPrescriptionGroup(p);
                                setPrescriptionModalStep('details');
                                setShowPrescriptionModal(true);
                              }}
                            >
                              {p.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginTop: '2px' }}>{p.age} Y, {p.gender}</div>
                          </td>
                          
                          <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 800, fontSize: '13px', color: '#334155' }}>{p.docName}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginTop: '2px' }}>{p.specialty}</div>
                          </td>
                          
                          <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>{p.time}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginTop: '2px' }}>{p.dateStr}</div>
                          </td>
                          
                          <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>
                            <span 
                              style={{ color: '#2563EB', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => {
                                setSelectedPrescriptionGroup(p);
                                setPrescriptionModalStep('details');
                                setShowPrescriptionModal(true);
                              }}
                            >
                              {p.items}
                            </span>
                          </td>
                          
                          <td style={{ padding: '16px', verticalAlign: 'middle', fontWeight: 800, fontSize: '13.5px', color: '#0F172A' }}>
                            {p.amount}
                          </td>
                          
                          <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                            <span 
                              className="pill-badge" 
                              style={{ 
                                background: p.status === 'Pending' ? '#FFF7ED' : p.status === 'In Progress' ? '#F5F3FF' : '#ECFDF5', 
                                color: p.status === 'Pending' ? '#EA580C' : p.status === 'In Progress' ? '#7C3AED' : '#10B981',
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '6px'
                              }}
                            >
                              {p.status}
                            </span>
                          </td>
                          
                          <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {p.status === 'Pending' ? (
                              <button 
                                className="btn-outline-dispense" 
                                style={{ 
                                  border: '1px solid #2563EB', 
                                  background: 'white', 
                                  color: '#2563EB', 
                                  fontWeight: 700, 
                                  padding: '6px 16px', 
                                  borderRadius: '8px', 
                                  fontSize: '12.5px', 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  outline: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#2563EB';
                                  e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.color = '#2563EB';
                                }}
                                onClick={() => {
                                  setSelectedPrescriptionGroup(p);
                                  setPrescriptionModalStep('payment');
                                  setShowPrescriptionModal(true);
                                }}
                              >
                                Dispense
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>
                                <i data-lucide="check" style={{ width: '14px', marginRight: '4px', verticalAlign: 'middle', color: '#10B981' }}></i>
                                Fulfilled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontSize: '14px', fontWeight: 600 }}>
                          No prescriptions found matching this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                  {activeTabPrescriptions.length > 0 
                    ? `Showing ${(prescriptionsPage - 1) * prescriptionsPageSize + 1} to ${Math.min(prescriptionsPage * prescriptionsPageSize, activeTabPrescriptions.length)} of ${activeTabPrescriptions.length} prescriptions`
                    : 'Showing 0 prescriptions'}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setPrescriptionsPage(prev => Math.max(1, prev - 1))}
                    disabled={prescriptionsPage === 1}
                    style={{ background: 'none', border: 'none', cursor: prescriptionsPage === 1 ? 'not-allowed' : 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                  >
                    <i data-lucide="chevron-left" style={{ width: '16px' }}></i>
                  </button>
                  {Array.from({ length: totalPrescriptionsPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    if (pageNum === 1 || pageNum === totalPrescriptionsPages || Math.abs(pageNum - prescriptionsPage) <= 1) {
                      const isActive = prescriptionsPage === pageNum;
                      return (
                        <span 
                          key={pageNum}
                          onClick={() => setPrescriptionsPage(pageNum)}
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
                    }
                    if (pageNum === 2 && prescriptionsPage > 3) {
                      return <span key="dots-start" style={{ color: '#94A3B8', fontSize: '12.5px', fontWeight: 700 }}>...</span>;
                    }
                    if (pageNum === totalPrescriptionsPages - 1 && prescriptionsPage < totalPrescriptionsPages - 2) {
                      return <span key="dots-end" style={{ color: '#94A3B8', fontSize: '12.5px', fontWeight: 700 }}>...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => setPrescriptionsPage(prev => Math.min(totalPrescriptionsPages, prev + 1))}
                    disabled={prescriptionsPage === totalPrescriptionsPages}
                    style={{ background: 'none', border: 'none', cursor: prescriptionsPage === totalPrescriptionsPages ? 'not-allowed' : 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                  >
                    <i data-lucide="chevron-right" style={{ width: '16px' }}></i>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Pharmacy Catalog</h2>
              <button 
                className="btn btn-primary" 
                style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '10px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={handleOpenAdd}
              >
                <i data-lucide="plus" style={{ width: '16px' }}></i> Add Medication
              </button>
            </div>

            <div className="glass-card">
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Category</th>
                      <th>SKU Code</th>
                      <th>Stock Quantity</th>
                      <th>Unit</th>
                      <th>MRP (₹)</th>
                      <th>Expiry</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(inv => (
                      <tr key={inv._id}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{inv.name}</div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#64748B' }}>{inv.category}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>{inv.sku}</td>
                        <td>
                          <b style={{ color: inv.stock > 20 ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                            {inv.stock}
                          </b>
                        </td>
                        <td style={{ fontWeight: 600, color: '#64748B' }}>{inv.unit}</td>
                        <td style={{ fontWeight: 800, color: '#0F172A' }}>₹{inv.mrp ? inv.mrp.toFixed(2) : '0.00'}</td>
                        <td style={{ fontWeight: 600, color: '#475569' }}>{inv.expiry}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'transparent', color: '#475569', fontWeight: 700, cursor: 'pointer' }} 
                              onClick={() => handleOpenEdit(inv)}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #FEE2E2', background: 'transparent', color: '#EF4444', fontWeight: 700, cursor: 'pointer' }} 
                              onClick={() => handleDeleteMedicine(inv._id)}
                            >
                              Delete
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

        {/* TAB 4: INTERNAL REQUESTS */}
        {activeTab === 'internal' && (() => {
          const getIndentStatusStyle = (status) => {
            switch (status) {
              case 'Pending': return { background: '#FEF3C7', color: '#D97706', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 };
              case 'Approved': return { background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 };
              case 'Received':
              case 'Fulfilled': return { background: '#D1FAE5', color: '#065F46', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 };
              case 'Partially Fulfilled': return { background: '#FFF3E0', color: '#E65100', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 };
              case 'Rejected':
              case 'Cannot Fulfill': return { background: '#FEE2E2', color: '#991B1B', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 };
              default: return { background: '#F1F5F9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 };
            }
          };

          const getIndentRowBg = (status) => {
            if (status === 'Pending') return 'rgba(254, 243, 199, 0.15)';
            if (status === 'Approved') return 'rgba(209, 250, 229, 0.15)';
            if (status === 'Received' || status === 'Fulfilled') return 'rgba(209, 250, 229, 0.10)';
            if (status === 'Partially Fulfilled') return 'rgba(255, 243, 224, 0.15)';
            if (status === 'Rejected' || status === 'Cannot Fulfill') return 'rgba(254, 226, 226, 0.15)';
            return 'transparent';
          };

          const avatarColors = ['#E0F2FE', '#FEE2E2', '#E0FDF4', '#FEF3C7', '#F3E8FF'];
          const avatarText = ['#0369A1', '#991B1B', '#16A34A', '#D97706', '#6D28D9'];

          return (
            <div style={{ animation: 'slideUp 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Internal Clinic Requests</h2>
                  <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>Review, track, and fulfill medicine indents and consumable supplies requested internally.</p>
                </div>
              </div>

              <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: '16px', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Indent ID</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Ordered</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requested By</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Qty</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                        <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indents.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#94A3B8', fontWeight: 600 }}>
                            No internal requests found
                          </td>
                        </tr>
                      ) : (
                        indents.map((ind, idx) => (
                          <tr 
                            key={ind._id || ind.indentId || idx} 
                            onClick={() => { setSelectedIndent(ind); setShowIndentModal(true); }}
                            style={{ 
                              background: getIndentRowBg(ind.status), 
                              borderBottom: '1px solid rgba(241,245,249,0.8)',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(241,245,249,0.4)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = getIndentRowBg(ind.status); }}
                          >
                            <td style={{ padding: '14px 20px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>
                              {ind.indentId}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '8px', 
                                  background: avatarColors[idx % avatarColors.length], 
                                  color: avatarText[idx % avatarText.length], 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontSize: '11px', 
                                  fontWeight: 900, 
                                  flexShrink: 0 
                                }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                                    <path d="m8.5 8.5 7 7"/>
                                  </svg>
                                </div>
                                <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '13.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '260px' }} title={(ind.items || []).map(it => it.name).join(', ')}>
                                  {(ind.items || []).map(it => it.name).join(', ') || 'No Items'}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#475569', fontSize: '13px' }}>
                              {ind.requestedBy}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '13px', color: ind.priority === 'Urgent' ? '#DC2626' : '#475569' }}>
                                {ind.priority === 'Urgent' && (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="18 15 12 9 6 15"/>
                                  </svg>
                                )}
                                {ind.priority}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#475569', fontSize: '13.5px' }}>
                              {ind.totalQty}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={getIndentStatusStyle(ind.status)}>{ind.status}</span>
                            </td>
                            <td onClick={e => e.stopPropagation()} style={{ padding: '14px 20px', textAlign: 'right' }}>
                              {!['Received', 'Fulfilled', 'Cannot Fulfill', 'Rejected'].includes(ind.status) ? (
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    disabled={loading}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        setLoading(true);
                                        await api.put(`/indents/${ind._id}`, { status: 'Fulfilled' });
                                        setIndents(prev => prev.map(item => item._id === ind._id ? { ...item, status: 'Fulfilled' } : item));
                                        showToast('Indent marked as Fulfilled!');
                                      } catch (err) {
                                        console.error(err);
                                        showToast('Failed to update status', 'error');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    style={{ padding: '6px 10px', background: '#10B981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                  >
                                    Fulfill
                                  </button>
                                  <button
                                    disabled={loading}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        setLoading(true);
                                        await api.put(`/indents/${ind._id}`, { status: 'Partially Fulfilled' });
                                        setIndents(prev => prev.map(item => item._id === ind._id ? { ...item, status: 'Partially Fulfilled' } : item));
                                        showToast('Indent marked as Partially Fulfilled');
                                      } catch (err) {
                                        console.error(err);
                                        showToast('Failed to update status', 'error');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    style={{ padding: '6px 10px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                  >
                                    Partial
                                  </button>
                                  <button
                                    disabled={loading}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        setLoading(true);
                                        await api.put(`/indents/${ind._id}`, { status: 'Cannot Fulfill' });
                                        setIndents(prev => prev.map(item => item._id === ind._id ? { ...item, status: 'Cannot Fulfill' } : item));
                                        showToast('Indent marked as Cannot Fulfill');
                                      } catch (err) {
                                        console.error(err);
                                        showToast('Failed to update status', 'error');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    style={{ padding: '6px 10px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>Processed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB 5: SALES LOG */}
        {activeTab === 'sales' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginBottom: '24px' }}>Sales & Settlement Logs</h2>
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <i data-lucide="credit-card" style={{ width: '48px', height: '48px', marginBottom: '16px', color: '#2563EB' }}></i>
              <h3>Today's Billing Batches</h3>
              <p style={{ color: '#64748B', maxWidth: '400px', margin: '0 auto 20px' }}>Monitor live billing settlements, download invoice drafts, and review total daily collections isolated to the active hospital branch.</p>
              <button className="btn btn-primary" onClick={handleExportSalesCSV} style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '10px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                <i data-lucide="download" style={{ width: '16px', marginRight: '6px' }}></i> Export Transaction Report
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: RETURNS */}
        {activeTab === 'returns' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            
            {/* Header and Log Return Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Medication Returns</h2>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setReturnType('Prescription-Linked');
                  setReturnPatientName('');
                  setReturnPatientPhone('');
                  setReturnPrescriptionId('');
                  setReturnPrescriptionCode('');
                  setReturnItems([{ medicineName: '', quantity: 1, unitPrice: 0, reason: 'Doctor changed medication', action: 'Restocked' }]);
                  setShowLogReturnModal(true);
                }}
                style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '10px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              >
                <i data-lucide="plus" style={{ width: '16px' }}></i> Log Medication Return
              </button>
            </div>

            {/* Metrics cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#EFF6FF', color: '#2563EB', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i data-lucide="refresh-cw" style={{ width: '22px' }}></i>
                </div>
                <div>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 700 }}>Total Returns</span>
                  <h4 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>{returnLogs.length} Cases</h4>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#ECFDF5', color: '#10B981', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i data-lucide="dollar-sign" style={{ width: '22px' }}></i>
                </div>
                <div>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 700 }}>Total Refunded</span>
                  <h4 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 900, color: '#10B981' }}>
                    ₹{returnLogs.reduce((acc, curr) => acc + curr.totalRefund, 0).toFixed(2)}
                  </h4>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#F0FDF4', color: '#16A34A', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i data-lucide="package" style={{ width: '22px' }}></i>
                </div>
                <div>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 700 }}>Restocked Items</span>
                  <h4 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 900, color: '#16A34A' }}>
                    {returnLogs.reduce((acc, curr) => acc + (curr.items || []).reduce((sum, item) => sum + (item.action === 'Restocked' ? item.quantity : 0), 0), 0)} Units
                  </h4>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#FEF2F2', color: '#EF4444', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i data-lucide="trash" style={{ width: '22px' }}></i>
                </div>
                <div>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 700 }}>Discarded Items</span>
                  <h4 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 900, color: '#EF4444' }}>
                    {returnLogs.reduce((acc, curr) => acc + (curr.items || []).reduce((sum, item) => sum + (item.action === 'Discarded' ? item.quantity : 0), 0), 0)} Units
                  </h4>
                </div>
              </div>
            </div>

            {/* Return Logs Table */}
            <div className="glass-card">
              <div style={{ overflowX: 'auto' }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Return ID</th>
                      <th>Type</th>
                      <th>Patient Details</th>
                      <th>Returned Medicines</th>
                      <th>Refund Amount</th>
                      <th>Date & Time</th>
                      <th>Logged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnLogs.map(log => (
                      <tr key={log._id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{log.returnId}</td>
                        <td>
                          <span 
                            className="pill-badge" 
                            style={{ 
                              background: log.returnType === 'Prescription-Linked' ? '#EFF6FF' : '#F1F5F9', 
                              color: log.returnType === 'Prescription-Linked' ? '#2563EB' : '#475569',
                              fontWeight: 700,
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: '6px'
                            }}
                          >
                            {log.returnType}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{log.patientName}</div>
                          {log.patientPhone && <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>{log.patientPhone}</div>}
                          {log.returnType === 'Prescription-Linked' && log.prescriptionCode && (
                            <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700, marginTop: '4px' }}>
                              Linked: {log.prescriptionCode}
                            </div>
                          )}
                          {log.returnType === 'Prescription-Linked' && log.prescriptionId?.createdAt && (
                            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                              Purchased: {new Date(log.prescriptionId.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {(log.items || []).map((item, idx) => (
                              <div key={idx} style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                                • {item.medicineName} x <b>{item.quantity}</b> 
                                <span style={{ marginLeft: '6px', fontSize: '10.5px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: item.action === 'Restocked' ? '#ECFDF5' : '#FEF2F2', color: item.action === 'Restocked' ? '#10B981' : '#EF4444' }}>
                                  {item.action}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 800, color: '#10B981' }}>₹{log.totalRefund.toFixed(2)}</td>
                        <td style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                          {new Date(log.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td style={{ fontWeight: 700, color: '#475569' }}>{log.loggedBy}</td>
                      </tr>
                    ))}
                    {returnLogs.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                          <i data-lucide="inbox" style={{ width: '32px', height: '32px', marginBottom: '8px', color: '#CBD5E1', display: 'block', margin: '0 auto' }}></i>
                          No medication returns logged today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 7: REPORTS */}
        {activeTab === 'reports' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginBottom: '24px' }}>Pharmacy Analytics & Reports</h2>
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
              <i data-lucide="trending-up" style={{ width: '48px', height: '48px', marginBottom: '16px', color: '#2563EB' }}></i>
              <h3>Download CSV Reports</h3>
              <p style={{ color: '#64748B', maxWidth: '400px', margin: '0 auto 20px' }}>Compile complete records of inventories, stock movements, purchase orders, and sales receipts scoped to this clinical tenant.</p>
              <button className="btn btn-primary" onClick={handleExportInventoryCSV} style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '10px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                <i data-lucide="download" style={{ width: '16px', marginRight: '6px' }}></i> Generate CSV
              </button>
            </div>
          </div>
        )}

        {/* TAB 8: PROFILE */}
        {activeTab === 'profile-tab' && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', marginBottom: '24px' }}>Staff Profile</h2>
            <div className="glass-card" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <img 
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80" 
                alt="Pharmacist Avatar" 
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #EFF6FF' }} 
              />
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>{user.name}</h3>
                <p style={{ margin: '4px 0 12px', fontSize: '13px', color: '#64748B', fontWeight: 700 }}>Pharmacy Operations Manager</p>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                  <div>Email: <b>{user.email || 'ankit.sharma@curoxa.com'}</b></div>
                  <div style={{ marginTop: '4px' }}>Shift Status: <span style={{ color: '#10B981', fontWeight: 800 }}>Active Shift</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: PROCUREMENT SUITE */}
        {activeTab === 'procurement' && (
          <div style={{ animation: 'slideUp 0.3s ease-out', paddingBottom: '40px' }}>
            {/* SUB-TABS BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Procurement Suite</h2>
              <div style={{ display: 'flex', gap: '8px', background: '#E2E8F0', padding: '4px', borderRadius: '10px' }}>
                <button 
                  className="btn" 
                  style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: procurementSubTab === 'vendors' ? 'white' : 'transparent', color: procurementSubTab === 'vendors' ? '#2563EB' : '#64748B', boxShadow: procurementSubTab === 'vendors' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                  onClick={() => setProcurementSubTab('vendors')}
                >
                  Vendors
                </button>
                <button 
                  className="btn" 
                  style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: procurementSubTab === 'pos' ? 'white' : 'transparent', color: procurementSubTab === 'pos' ? '#2563EB' : '#64748B', boxShadow: procurementSubTab === 'pos' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                  onClick={() => setProcurementSubTab('pos')}
                >
                  Purchase Orders
                </button>
                <button 
                  className="btn" 
                  style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: procurementSubTab === 'grn' ? 'white' : 'transparent', color: procurementSubTab === 'grn' ? '#2563EB' : '#64748B', boxShadow: procurementSubTab === 'grn' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                  onClick={() => setProcurementSubTab('grn')}
                >
                  Goods Receipts (GRN)
                </button>
                <button 
                  className="btn" 
                  style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: procurementSubTab === 'tickets' ? 'white' : 'transparent', color: procurementSubTab === 'tickets' ? '#2563EB' : '#64748B', boxShadow: procurementSubTab === 'tickets' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                  onClick={() => setProcurementSubTab('tickets')}
                >
                  Replenishment Tickets
                </button>
              </div>
            </div>

            {/* VENDORS VIEW */}
            {procurementSubTab === 'vendors' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Supplier Partnerships</h3>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '8px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={() => {
                      setNewVendor({ name: '', code: `VEND-0${vendors.length + 1}`, email: '', phone: '', address: '', type: 'Manufacturer', supplierCategory: 'Medicine', organizationType: 'Private Ltd', isMsmeRegistration: 'No' });
                      setShowAddVendorModal(true);
                    }}
                  >
                    <i data-lucide="plus" style={{ width: '16px' }}></i> Add Vendor
                  </button>
                </div>

                <div className="glass-card">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Vendor Code</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendors.map(v => (
                          <tr key={v._id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{v.code}</td>
                            <td><div style={{ fontWeight: 800, color: '#0F172A' }}>{v.name}</div></td>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{v.email || '--'}</td>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{v.phone || '--'}</td>
                            <td style={{ fontWeight: 600, color: '#475569' }}>{v.address || '--'}</td>
                            <td style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'transparent', color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}
                                onClick={() => setSelectedVendor(v)}
                              >
                                View Profile
                              </button>
                              <button 
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete vendor "${v.name}"?`)) {
                                    try {
                                      await api.delete(`/vendors/${v._id}`);
                                      setVendors(prev => prev.filter(x => x._id !== v._id));
                                      showToast('Vendor deleted successfully!');
                                    } catch (err) {
                                      console.error(err);
                                      showToast('Failed to delete vendor', 'error');
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {vendors.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>No vendors configured.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PURCHASE ORDERS VIEW */}
            {procurementSubTab === 'pos' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Purchase Orders</h3>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '8px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={() => {
                      setPoDraftItems([{ name: 'Paracetamol 650mg', sku: 'PAR-650', qty: 100 }]);
                      setPoSplitSummary([]);
                      setShowCreatePOModal(true);
                    }}
                  >
                    <i data-lucide="plus" style={{ width: '16px' }}></i> Create Purchase Order
                  </button>
                </div>

                <div className="glass-card">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>Supplier</th>
                          <th>Date</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th>Requested By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrders.map(po => (
                          <tr key={po._id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{po.poId}</td>
                            <td style={{ fontWeight: 800, color: '#475569' }}>{po.vendorName}</td>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 800, color: '#0F172A' }}>₹{po.totalAmount.toFixed(2)}</td>
                            <td>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: '11px', 
                                fontWeight: 800,
                                background: po.status === 'Approved' ? '#DEF7EC' : (po.status === 'Rejected' ? '#FDE8E8' : '#FEF08A'),
                                color: po.status === 'Approved' ? '#03543F' : (po.status === 'Rejected' ? '#9B1C1C' : '#713F12')
                              }}>
                                {po.status}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{po.requestedBy}</td>
                          </tr>
                        ))}
                        {purchaseOrders.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>No purchase orders created.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* GOODS RECEIPTS (GRN) VIEW */}
            {procurementSubTab === 'grn' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Goods Receipt Notes (GRN)</h3>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '8px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    onClick={() => {
                      setEditingGrn(null);
                      setGrnFlowType('po');
                      setGrnSelectedPOId('');
                      setGrnDirectVendorId('');
                      setGrnItems([]);
                      setGrnInvoiceFile(null);
                      setGrnInvoiceFileName('');
                      setGrnNotes('');
                      setShowGRNModal(true);
                    }}
                  >
                    <i data-lucide="plus" style={{ width: '16px' }}></i> Create GRN
                  </button>
                </div>

                <div className="glass-card">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>GRN ID</th>
                          <th>Reference PO</th>
                          <th>Supplier</th>
                          <th>Date</th>
                          <th>Items Received</th>
                          <th>Type</th>
                          <th>Invoice</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {goodsReceipts.map(grn => (
                          <tr key={grn._id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{grn.grnId}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748B' }}>{grn.poNumber || 'Direct Purchase'}</td>
                            <td style={{ fontWeight: 800, color: '#475569' }}>{grn.vendorName}</td>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{new Date(grn.receivedDate || grn.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 700, color: '#0F172A' }}>{grn.items.length} items</td>
                            <td>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: '11px', 
                                fontWeight: 800,
                                background: grn.poId ? '#E0F2FE' : '#F3F4F6',
                                color: grn.poId ? '#0369A1' : '#374151'
                              }}>
                                {grn.poId ? 'PO Filled' : 'Direct'}
                              </span>
                            </td>
                            <td>
                              {grn.invoiceUrl ? (
                                <a 
                                  href={grn.invoiceUrl} 
                                  download={`invoice-${grn.grnId}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  style={{ color: '#3B82F6', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                  View Doc
                                </a>
                              ) : (
                                <span style={{ color: '#94A3B8' }}>—</span>
                              )}
                            </td>
                            <td>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                background: grn.status === 'Draft' ? '#FEF3C7' : '#D1FAE5',
                                color: grn.status === 'Draft' ? '#D97706' : '#065F46'
                              }}>
                                {grn.status || 'Verified/Completed'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => setSelectedGrnDetails(grn)}
                                >
                                  View
                                </button>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#0EA5E9', border: 'none', color: 'white', borderRadius: '4px', fontWeight: 700 }}
                                  onClick={() => handleOpenEditGrn(grn)}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {goodsReceipts.length === 0 && (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>No Goods Receipt Notes created yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PROCUREMENT TICKETS VIEW */}
            {procurementSubTab === 'tickets' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Replenishment Tickets</h3>
                </div>

                <div className="glass-card">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Medicine</th>
                          <th>Recorded Stock</th>
                          <th>Status</th>
                          <th>Admin Comment</th>
                          <th>Pharmacy Reason</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pharmacyTickets.map(ticket => (
                          <tr key={ticket._id}>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{new Date(ticket.createdAt).toLocaleString()}</td>
                            <td style={{ fontWeight: 800, color: '#0F172A' }}>{ticket.medicineName}</td>
                            <td style={{ fontWeight: 700, color: '#EF4444' }}>{ticket.currentStock} units</td>
                            <td>
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: '11px', 
                                fontWeight: 800,
                                background: ticket.status === 'Resolved' ? '#D1FAE5' : '#FEF3C7',
                                color: ticket.status === 'Resolved' ? '#065F46' : '#92400E'
                              }}>
                                {ticket.status}
                              </span>
                            </td>
                            <td style={{ color: '#475569', fontSize: '12px' }}>{ticket.adminComment}</td>
                            <td style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>{ticket.pharmacyReason || <span style={{ color: '#94A3B8' }}>—</span>}</td>
                            <td style={{ textAlign: 'center' }}>
                              {ticket.status === 'Open' ? (
                                <button 
                                  className="btn btn-primary" 
                                  style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', background: '#D97706', border: 'none', color: 'white', fontWeight: 700, borderRadius: '6px' }}
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setTicketResolutionReason('');
                                    setShowResolveTicketModal(true);
                                  }}
                                >
                                  Resolve
                                </button>
                              ) : (
                                <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: '12px' }}>Completed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {pharmacyTickets.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>No replenishment tickets raised yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: RECEPTIONIST DYNAMIC COVERAGE */}
        {activeTab === 'receptionist_cover' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Receptionist Active Coverage</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 600 }}>Emergency Front Desk Duty Coverage. Manage patients queue, register new OPD visits and clear billing logs.</p>
              </div>
              <span className="badge-pill new" style={{ background: '#FFE4E6', color: '#E11D48', padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}>
                ● Active Receptionist Coverage
              </span>
            </div>

            {/* Sub-navigation inside coverage */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '24px' }}>
              {coverageState['rc-queue']?.on && (
                <button 
                  type="button"
                  className={`btn-view-detail ${receptionistSubTab === 'queue' ? 'active' : ''}`}
                  onClick={() => setReceptionistSubTab('queue')}
                  style={{ background: receptionistSubTab === 'queue' ? '#E11D48' : 'transparent', color: receptionistSubTab === 'queue' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Token Queue
                </button>
              )}
              {coverageState['rc-appt']?.on && (
                <button 
                  type="button"
                  className={`btn-view-detail ${receptionistSubTab === 'appt' ? 'active' : ''}`}
                  onClick={() => setReceptionistSubTab('appt')}
                  style={{ background: receptionistSubTab === 'appt' ? '#E11D48' : 'transparent', color: receptionistSubTab === 'appt' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Appointments
                </button>
              )}
              {coverageState['rc-register']?.on && (
                <button 
                  type="button"
                  className={`btn-view-detail ${receptionistSubTab === 'register' ? 'active' : ''}`}
                  onClick={() => setReceptionistSubTab('register')}
                  style={{ background: receptionistSubTab === 'register' ? '#E11D48' : 'transparent', color: receptionistSubTab === 'register' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  OPD Registration
                </button>
              )}
              {coverageState['rc-billing']?.on && (
                <button 
                  type="button"
                  className={`btn-view-detail ${receptionistSubTab === 'billing' ? 'active' : ''}`}
                  onClick={() => setReceptionistSubTab('billing')}
                  style={{ background: receptionistSubTab === 'billing' ? '#E11D48' : 'transparent', color: receptionistSubTab === 'billing' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Billing Ledger
                </button>
              )}
            </div>

            {/* SUBTAB: TOKEN QUEUE */}
            {receptionistSubTab === 'queue' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>OPD Daily Token Roster</h3>
                  <button 
                    type="button"
                    className="btn-cover-action receptionist-primary"
                    onClick={() => {
                      showToast("Calling Next Patient in Token Queue!");
                    }}
                  >
                    Call Next Token
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>TOKEN NO</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>PATIENT</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>STATUS</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>CHECK-IN TIME</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageQueue.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '16px 8px', fontWeight: 800, color: '#2563EB', fontSize: '13px' }}>{item.token}</td>
                        <td style={{ padding: '16px 8px', fontWeight: 700, color: '#1E293B', fontSize: '13.5px' }}>{item.patient}</td>
                        <td style={{ padding: '16px 8px' }}>
                          <span className={`badge-pill ${item.status === 'Waiting' ? 'waiting' : 'new'}`} style={{ fontSize: '10px' }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', color: '#64748B', fontSize: '12.5px', fontWeight: 600 }}>{item.time}</td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          {item.status !== 'Completed' ? (
                            <button 
                              type="button"
                              className="btn-cover-action receptionist-primary"
                              onClick={async () => {
                                try {
                                  await api.put(`/appointments/${item.id}`, { status: 'Completed' });
                                  showToast(`Token ${item.token} marked as Completed!`);
                                  fetchCoverageData();
                                } catch (e) {
                                  showToast('Failed to update appointment status.');
                                }
                              }}
                            >
                              Mark Completed
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUBTAB: APPOINTMENT */}
            {receptionistSubTab === 'appt' && (
              <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>Scheduled Slots</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {coverageAppts.map(app => (
                      <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', display: 'block' }}>{app.slot}</span>
                          <span style={{ fontSize: '14px', fontWeight: 750, color: '#1E293B' }}>{app.patient}</span>
                          <span style={{ fontSize: '11px', color: '#64748B', display: 'block', fontWeight: 600 }}>{app.contact}</span>
                        </div>
                        <span className="badge-pill new" style={{ fontSize: '10px' }}>{app.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>Book Appointment Slot</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const patientId = selectedPatForCoverAppt;
                    const doctorId = selectedDocForCoverAppt;
                    const slot = selectedSlotForCoverAppt;
                    const reason = e.target.elements.patReason.value || 'General Consultation';
                    if (!patientId || !doctorId) {
                      showToast("Please select a patient and a doctor");
                      return;
                    }
                    
                    try {
                      await api.post('/appointments', {
                        patientId,
                        doctorId,
                        date: new Date(),
                        time: slot,
                        reason
                      });
                      
                      const docObj = coverageDoctors.find(d => String(d._id) === String(doctorId));
                      const docFee = docObj ? (docObj.consultationFee !== undefined ? docObj.consultationFee : 500) : 500;
                      await api.post('/billing', {
                        patientId,
                        items: [
                          { description: 'OPD Consultation Fee', amount: docFee },
                          { description: 'Registration Fee', amount: 50 }
                        ],
                        totalAmount: docFee + 50,
                        paymentMethod: 'Cash'
                      });

                      showToast(`Appointment booked successfully!`);
                      e.target.reset();
                      setSelectedPatForCoverAppt('');
                      setSelectedDocForCoverAppt('');
                      setSelectedSlotForCoverAppt('09:30 AM');
                      fetchCoverageData();
                    } catch (err) {
                      showToast('Failed to book appointment.');
                    }
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Select Patient</label>
                        <SearchableDropdown
                          value={selectedPatForCoverAppt}
                          onChange={setSelectedPatForCoverAppt}
                          options={patients.map(p => ({ value: p._id, label: `${p.name} (${p.uhid || 'No UHID'})` }))}
                          placeholder="Choose Patient..."
                        />
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Assign Doctor</label>
                        <SearchableDropdown
                          value={selectedDocForCoverAppt}
                          onChange={setSelectedDocForCoverAppt}
                          options={coverageDoctors.map(doc => ({ value: doc._id, label: `${doc.name} (${doc.specialty || 'General'})` }))}
                          placeholder="Choose Doctor..."
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Time Slot</label>
                        <SearchableDropdown
                          value={selectedSlotForCoverAppt}
                          onChange={setSelectedSlotForCoverAppt}
                          options={[
                            { value: '09:30 AM', label: '09:30 AM' },
                            { value: '10:30 AM', label: '10:30 AM' },
                            { value: '12:00 PM', label: '12:00 PM' },
                            { value: '03:30 PM', label: '03:30 PM' },
                            { value: '04:30 PM', label: '04:30 PM' }
                          ]}
                          placeholder="Select Time Slot..."
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Reason for Visit</label>
                        <input type="text" name="patReason" style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 650, outline: 'none' }} placeholder="e.g. Cough and Fever" />
                      </div>

                      <button type="submit" className="btn-cover-action receptionist-primary" style={{ width: '100%', height: '44px', marginTop: '8px' }}>
                        Book Appointment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SUBTAB: REGISTRATION */}
            {receptionistSubTab === 'register' && (
              <div className="glass-card" style={{ padding: '32px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', maxWidth: '600px', margin: '0 auto' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>OPD Patient Registration</h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '24px', fontWeight: 600 }}>Create standard EMR clinical records for new OPD patients.</p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const name = e.target.elements.regName.value;
                  const phone = e.target.elements.regPhone.value;
                  const age = e.target.elements.regAge.value;
                  const gender = selectedRegGender;
                  const address = e.target.elements.regAddress.value;
                  if (!name || !phone) return;
                  
                  try {
                    await api.post('/patients', {
                      name,
                      contact: phone,
                      age,
                      gender,
                      address
                    });
                    showToast(`Patient "${name}" registered successfully!`);
                    e.target.reset();
                    setSelectedRegGender('Female');
                    fetchCoverageData();
                  } catch (err) {
                    showToast('Failed to register patient.');
                  }
                }}>
                  <div className="mobile-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Full Name</label>
                      <input type="text" name="regName" style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 650, outline: 'none' }} required placeholder="e.g. Priya Nair" />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Mobile Phone</label>
                      <input type="tel" name="regPhone" style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 650, outline: 'none' }} required placeholder="e.g. +91 91122 33445" />
                    </div>
                  </div>

                  <div className="mobile-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Age (Years)</label>
                      <input type="number" name="regAge" style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', fontSize: '13px', fontWeight: 650, outline: 'none' }} defaultValue="28" required />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Gender</label>
                      <SearchableDropdown
                        value={selectedRegGender}
                        onChange={setSelectedRegGender}
                        options={[
                          { value: 'Female', label: 'Female' },
                          { value: 'Male', label: 'Male' },
                          { value: 'Other', label: 'Other' }
                        ]}
                        placeholder="Select Gender..."
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Residential Address</label>
                    <textarea name="regAddress" style={{ width: '100%', height: '70px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontWeight: 650, outline: 'none', resize: 'none' }} placeholder="e.g. Sector-14, DLF Phase 1, Gurgaon" defaultValue="" />
                  </div>

                  <button type="submit" className="btn-cover-action receptionist-primary" style={{ width: '100%', height: '46px' }}>
                    Register & Open EMR Account
                  </button>
                </form>
              </div>
            )}

            {/* SUBTAB: BILLING */}
            {receptionistSubTab === 'billing' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>OPD Billing Clearance Ledger</h3>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>BILL ID</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>PATIENT</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>SERVICE</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>AMOUNT</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>STATUS</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800, textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageBills.map(bill => (
                      <tr key={bill.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '16px 8px', fontWeight: 800, color: '#475569', fontSize: '12.5px' }}>#{bill.id}</td>
                        <td style={{ padding: '16px 8px', fontWeight: 700, color: '#1E293B', fontSize: '13.5px' }}>{bill.name}</td>
                        <td style={{ padding: '16px 8px', color: '#475569', fontSize: '13px', fontWeight: 600 }}>{bill.service}</td>
                        <td style={{ padding: '16px 8px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>₹{bill.amount}</td>
                        <td style={{ padding: '16px 8px' }}>
                          <span className={`badge-pill ${bill.paid ? 'new' : 'waiting'}`} style={{ fontSize: '10px' }}>
                            {bill.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          {!bill.paid ? (
                            <button 
                              type="button"
                              className="btn-cover-action receptionist-primary"
                              onClick={async () => {
                                try {
                                  await api.put(`/billing/${bill.id}`, { status: 'Paid' });
                                  showToast(`Payment ₹${bill.amount} collected for ${bill.name}!`);
                                  fetchCoverageData();
                                } catch (e) {
                                  showToast('Failed to clear bill.');
                                }
                              }}
                            >
                              Collect Fee
                            </button>
                          ) : (
                            <button 
                              type="button"
                              className="btn-cover-action receptionist-primary"
                              style={{ background: 'transparent', border: '1px solid #E2E8F0', color: '#64748B' }}
                              onClick={() => showToast("Re-printing duplicate receipt...")}
                            >
                              Print Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: LAB DYNAMIC COVERAGE */}
        {activeTab === 'lab_cover' && (
          <div className="tab-content active" style={{ animation: 'slideUp 0.4s ease-out', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Laboratory Active Coverage</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0, fontWeight: 600 }}>Providing emergency clinical oversight for Diagnostic Lab. All report signing logged.</p>
              </div>
              <span className="badge-pill new" style={{ background: '#D1FAE5', color: '#059669', padding: '6px 12px', fontSize: '11px', fontWeight: 800 }}>
                ● Clinical Lab Coverage
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '24px' }}>
              {coverageState['lt-queue']?.on && (
                <button 
                  type="button"
                  className={`btn-view-detail ${labSubTab === 'tests' ? 'active' : ''}`}
                  onClick={() => setLabSubTab('tests')}
                  style={{ background: labSubTab === 'tests' ? '#059669' : 'transparent', color: labSubTab === 'tests' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Emergency Test Orders
                </button>
              )}
              {coverageState['lt-reagents']?.on && (
                <button 
                  type="button"
                  className={`btn-view-detail ${labSubTab === 'reagents' ? 'active' : ''}`}
                  onClick={() => setLabSubTab('reagents')}
                  style={{ background: labSubTab === 'reagents' ? '#059669' : 'transparent', color: labSubTab === 'reagents' ? 'white' : '#64748B', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Reagents & Kits Inventory
                </button>
              )}
            </div>

            {/* SUBTAB: TESTS QUEUE */}
            {labSubTab === 'tests' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>Diagnostic Test Orders Queue</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {coverageLabRequests.map(test => (
                    <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #F1F5F9', borderRadius: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{test.name}</span>
                          <span className={`badge-pill ${test.priority === 'High' ? 'revisit' : 'new'}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{test.priority} Priority</span>
                        </div>
                        <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600, display: 'block', marginTop: '4px' }}>Test: <b>{test.test}</b></span>
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 550 }}>Order ID: #{test.id} · Status: {test.status}</span>
                      </div>
                      {test.status === 'Pending' ? (
                        <button 
                          type="button"
                          className="btn-cover-action lab-primary"
                          style={{ background: '#2563EB', borderColor: '#2563EB' }}
                          onClick={async () => {
                            try {
                              await api.put(`/labs/${test.id}`, {
                                status: 'In Progress',
                                notes: 'Specimen sample collected by delegated clinical coverage.'
                              });
                              showToast(`Sample collected successfully for ${test.name}!`);
                              fetchCoverageData();
                            } catch (e) {
                              showToast('Failed to update sample status.');
                            }
                          }}
                        >
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
                        >
                          Enter Results
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Signed & Dispatched</span>
                          <button 
                            type="button"
                            className="btn-cover-action lab-primary"
                            style={{ background: '#475569', color: 'white', padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => {
                              setSelectedCoverageLabTest(test);
                              setShowCoverageLabDetailsModal(true);
                            }}
                          >
                            View Report
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUBTAB: REAGENTS */}
            {labSubTab === 'reagents' && (
              <div className="glass-card" style={{ padding: '24px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '20px' }}>Diagnostic Reagents Ledger</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>REAGENT NAME</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>STOCK LEVEL</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>MIN SAFE STOCK</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800 }}>STATUS</th>
                      <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '12px', fontWeight: 800, textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coverageReagents.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '16px 8px', fontWeight: 700, color: '#1E293B', fontSize: '13.5px' }}>{item.name}</td>
                        <td style={{ padding: '16px 8px', fontWeight: 800, color: '#0F172A', fontSize: '13.5px' }}>{item.level} {item.unit}</td>
                        <td style={{ padding: '16px 8px', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>{item.minSafe} {item.unit}</td>
                        <td style={{ padding: '16px 8px' }}>
                          <span className={`badge-pill ${item.status === 'Safe' ? 'new' : 'waiting'}`} style={{ fontSize: '10px' }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                          <button 
                            type="button"
                            className="btn-cover-action lab-primary"
                            onClick={async () => {
                              try {
                                await api.put(`/lab-inventory/${item.id}`, {
                                  isRestock: true,
                                  addQty: 50
                                });
                                showToast(`Emergency restock order issued for ${item.name}!`);
                                fetchCoverageData();
                              } catch (e) {
                                showToast('Failed to restock reagent.');
                              }
                            }}
                          >
                            Restock +50
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Log Return Modal */}
      {showLogReturnModal && (
        <div className="modal-overlay" data-lenis-prevent onClick={() => { setShowLogReturnModal(false); setIsRxDropdownOpen(false); }}>
          <div className="modal-box glass-card" style={{ width: '90%', maxWidth: '750px', maxHeight: '90vh', background: 'white', padding: '28px 28px 20px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => { e.stopPropagation(); setIsRxDropdownOpen(false); }}>
            <style>{`
              .modal-scroll-body::-webkit-scrollbar {
                width: 6px;
              }
              .modal-scroll-body::-webkit-scrollbar-track {
                background: transparent;
              }
              .modal-scroll-body::-webkit-scrollbar-thumb {
                background: #CBD5E1;
                border-radius: 3px;
              }
              .modal-scroll-body::-webkit-scrollbar-thumb:hover {
                background: #94A3B8;
              }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1A1D23', margin: 0 }}>
                Log Medication Return
              </h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => { setShowLogReturnModal(false); setIsRxDropdownOpen(false); }}>
                <i data-lucide="x" style={{ width: '20px', height: '20px' }}></i>
              </button>
            </div>

            <form onSubmit={handleSaveReturnLog} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-scroll-body" data-lenis-prevent style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column' }}>
                
                {/* Return Type Toggle */}
                <div style={{ display: 'flex', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
                  <button 
                    type="button"
                    onClick={() => { setReturnType('Prescription-Linked'); setReturnItems([{ medicineName: '', quantity: 1, unitPrice: 0, reason: 'Doctor changed medication', action: 'Restocked' }]); setReturnPatientName(''); setReturnPatientPhone(''); setRxSearchQuery(''); setIsRxDropdownOpen(false); }}
                    style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: returnType === 'Prescription-Linked' ? 'white' : 'transparent', color: returnType === 'Prescription-Linked' ? '#2563EB' : '#64748B', boxShadow: returnType === 'Prescription-Linked' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                  >
                    Hospital Prescription
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setReturnType('Walk-in / Offline'); setReturnItems([{ medicineName: '', quantity: 1, unitPrice: 0, reason: 'Doctor changed medication', action: 'Restocked' }]); setReturnPatientName(''); setReturnPatientPhone(''); setRxSearchQuery(''); setIsRxDropdownOpen(false); }}
                    style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', background: returnType === 'Walk-in / Offline' ? 'white' : 'transparent', color: returnType === 'Walk-in / Offline' ? '#2563EB' : '#64748B', boxShadow: returnType === 'Walk-in / Offline' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                  >
                    Walk-in / Offline Sale
                  </button>
                </div>

                {returnType === 'Prescription-Linked' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Select Dispensed Prescription</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text"
                          placeholder="Search prescription by patient name or RX code..."
                          value={rxSearchQuery}
                          onFocus={() => setIsRxDropdownOpen(true)}
                          onChange={(e) => { setRxSearchQuery(e.target.value); setIsRxDropdownOpen(true); }}
                          style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '13.5px', fontWeight: 600, color: '#334155', background: 'white' }}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </span>
                        {rxSearchQuery && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setRxSearchQuery('');
                              setReturnPrescriptionId('');
                              setReturnPrescriptionCode('');
                              setReturnPatientName('');
                              setReturnPatientPhone('');
                              setReturnItems([{ medicineName: '', quantity: 1, unitPrice: 0, reason: 'Doctor changed medication', action: 'Restocked' }]);
                            }}
                            style={{ position: 'absolute', right: '32px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>

                      {/* Dropdown Suggestions List */}
                      {isRxDropdownOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '220px', overflowY: 'auto', padding: '6px' }}>
                          {(() => {
                            const filtered = dispensedPrescriptions.filter(p => {
                              const rxCode = `RX-${p._id.substring(p._id.length - 6).toUpperCase()}`;
                              const name = (p.patientId?.name || '').toLowerCase();
                              const query = rxSearchQuery.toLowerCase().trim();
                              return rxCode.toLowerCase().includes(query) || name.includes(query);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div style={{ padding: '12px', textAlign: 'center', fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                                  No dispensed prescriptions found
                                </div>
                              );
                            }

                            return filtered.map(p => {
                              const rxCode = `RX-${p._id.substring(p._id.length - 6).toUpperCase()}`;
                              const formattedDate = new Date(p.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                              const isSelected = p._id === returnPrescriptionId;
                              
                              return (
                                <button
                                  key={p._id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectPrescriptionForReturn(p._id);
                                    setRxSearchQuery(`${rxCode} - ${p.patientId?.name || 'Unknown Patient'} (${formattedDate})`);
                                    setIsRxDropdownOpen(false);
                                  }}
                                  style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 12px', borderRadius: '8px', border: 'none', background: isSelected ? '#EFF6FF' : 'transparent', textAlign: 'left', cursor: 'pointer', marginBottom: '2px', transition: 'all 0.15s' }}
                                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: isSelected ? '#2563EB' : '#1E293B' }}>{rxCode}</span>
                                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>{formattedDate}</span>
                                  </div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 650, color: '#475569', marginTop: '2px' }}>
                                    Patient: <span style={{ fontWeight: 750, color: '#0F172A' }}>{p.patientId?.name || 'Unknown Patient'}</span>
                                  </div>
                                </button>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>

                    {returnPrescriptionId && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Patient Name</label>
                          <input type="text" readOnly value={returnPatientName} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: 600, color: '#64748B' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Contact Number</label>
                          <input type="text" readOnly value={returnPatientPhone} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: 600, color: '#64748B' }} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Patient Name *</label>
                      <input 
                        type="text" 
                        required
                        value={returnPatientName} 
                        onChange={(e) => setReturnPatientName(e.target.value)} 
                        placeholder="Enter patient name"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, color: '#334155' }} 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Contact Number</label>
                      <input 
                        type="text" 
                        value={returnPatientPhone} 
                        onChange={(e) => setReturnPatientPhone(e.target.value)} 
                        placeholder="Enter phone number"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, color: '#334155' }} 
                      />
                    </div>
                  </div>
                )}

                {/* Medicines List to Return */}
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', marginBottom: '12px', marginTop: '10px' }}>Medicines to Return</h4>
                
                {/* Column Headers */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: returnType === 'Prescription-Linked' ? '40px 1.5fr 80px 100px 1.2fr 100px' : '2fr 80px 100px 1.2fr 100px 40px', 
                  gap: '10px', 
                  padding: '0 12px',
                  marginBottom: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {returnType === 'Prescription-Linked' ? (
                    <>
                      <div style={{ textAlign: 'center' }}>Ret?</div>
                      <div>Medicine Name</div>
                      <div style={{ textAlign: 'center' }}>Qty</div>
                      <div style={{ textAlign: 'center' }}>Price (₹)</div>
                      <div>Reason</div>
                      <div>Action</div>
                    </>
                  ) : (
                    <>
                      <div>Medicine Name</div>
                      <div style={{ textAlign: 'center' }}>Qty</div>
                      <div style={{ textAlign: 'center' }}>Price (₹)</div>
                      <div>Reason</div>
                      <div>Action</div>
                      <div></div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {returnItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: returnType === 'Prescription-Linked' ? '40px 1.5fr 80px 100px 1.2fr 100px' : '2fr 80px 100px 1.2fr 100px 40px', gap: '10px', alignItems: 'center', background: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      
                      {returnType === 'Prescription-Linked' && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={!!item.included} 
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx].included = e.target.checked;
                              setReturnItems(updated);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </div>
                      )}

                      {returnType === 'Prescription-Linked' ? (
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155', wordBreak: 'break-word' }}>
                          {item.medicineName}
                        </div>
                      ) : (
                        <SearchableDropdown
                          value={item.medicineName}
                          onChange={(val) => handleOfflineMedicineChange(idx, val)}
                          options={inventory.map(inv => ({ value: inv.name, label: `${inv.name} (₹${inv.mrp.toFixed(2)})` }))}
                          placeholder="Select Medicine..."
                        />
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <input 
                          type="number"
                          min={1}
                          max={returnType === 'Prescription-Linked' ? item.maxQuantity : undefined}
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...returnItems];
                            updated[idx].quantity = Math.max(1, Number(e.target.value) || 1);
                            if (returnType === 'Prescription-Linked' && item.maxQuantity && updated[idx].quantity > item.maxQuantity) {
                              updated[idx].quantity = item.maxQuantity;
                            }
                            setReturnItems(updated);
                          }}
                          style={{ width: '100%', height: '38px', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}
                        />
                        {returnType === 'Prescription-Linked' && (
                          <div style={{ fontSize: '10px', color: '#94A3B8', textAlign: 'center', marginTop: '2px', fontWeight: 700 }}>Max: {item.maxQuantity}</div>
                        )}
                      </div>

                      <div style={{ width: '100%' }}>
                        <input 
                          type="number"
                          step="0.01"
                          readOnly={returnType === 'Prescription-Linked'}
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...returnItems];
                            updated[idx].unitPrice = Number(e.target.value) || 0;
                            setReturnItems(updated);
                          }}
                          style={{ width: '100%', height: '38px', padding: '8px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, textAlign: 'center', background: returnType === 'Prescription-Linked' ? '#F1F5F9' : 'white' }}
                        />
                      </div>

                      <div style={{ width: '100%' }}>
                        <SearchableDropdown
                          value={item.reason}
                          onChange={(val) => {
                            const updated = [...returnItems];
                            updated[idx].reason = val;
                            setReturnItems(updated);
                          }}
                          options={[
                            { value: 'Doctor changed medication', label: 'Doctor changed med' },
                            { value: 'Wrong item purchased', label: 'Wrong item purchased' },
                            { value: 'Defective/Expired batch', label: 'Defective/Expired batch' },
                            { value: 'Excess quantity', label: 'Excess quantity' },
                            { value: 'Other', label: 'Other' }
                          ]}
                          placeholder="Select Reason"
                        />
                      </div>

                      <div style={{ width: '100%' }}>
                        <SearchableDropdown
                          value={item.action}
                          onChange={(val) => {
                            const updated = [...returnItems];
                            updated[idx].action = val;
                            setReturnItems(updated);
                          }}
                          options={[
                            { value: 'Restocked', label: 'Restock' },
                            { value: 'Discarded', label: 'Discard' }
                          ]}
                          placeholder="Select Action"
                        />
                      </div>

                      {returnType === 'Walk-in / Offline' && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            disabled={returnItems.length <= 1}
                            onClick={() => {
                              if (returnItems.length > 1) {
                                setReturnItems(returnItems.filter((_, i) => i !== idx));
                              }
                            }}
                            style={{ background: 'none', border: 'none', cursor: returnItems.length <= 1 ? 'not-allowed' : 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>

                {returnType === 'Walk-in / Offline' && (
                  <button
                    type="button"
                    onClick={handleAddOfflineReturnItem}
                    style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}
                  >
                    <i data-lucide="plus" style={{ width: '16px' }}></i> Add Medicine Row
                  </button>
                )}

                <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1D4ED8' }}>Estimated Total Refund</span>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>Refund will be processed back to original source.</p>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#1D4ED8' }}>
                    ₹{returnItems.reduce((acc, curr) => {
                      if (returnType === 'Prescription-Linked' && !curr.included) return acc;
                      if (returnType === 'Walk-in / Offline' && !curr.medicineName) return acc;
                      return acc + (Number(curr.quantity) || 0) * (Number(curr.unitPrice) || 0);
                    }, 0).toFixed(2)}
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexShrink: 0, borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '10px 20px', border: '1px solid #CBD5E1', background: 'transparent', color: '#64748B', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowLogReturnModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', background: '#2563EB', border: 'none', color: 'white', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  Confirm Return & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Manage Medicine Modal */}
      {showMedicineModal && (
        <div className="modal-overlay" data-lenis-prevent onClick={() => setShowMedicineModal(false)}>
          <div className="modal-box glass-card" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', background: 'white', padding: '28px 28px 20px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <style>{`
              .modal-scroll-body::-webkit-scrollbar {
                width: 6px;
              }
              .modal-scroll-body::-webkit-scrollbar-track {
                background: transparent;
              }
              .modal-scroll-body::-webkit-scrollbar-thumb {
                background: #CBD5E1;
                border-radius: 3px;
              }
              .modal-scroll-body::-webkit-scrollbar-thumb:hover {
                background: #94A3B8;
              }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1A1D23', margin: 0 }}>
                {modalMode === 'add' ? 'Add New Medicine' : modalMode === 'restock' ? 'Restock Medicine' : 'Edit Medicine Details'}
              </h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setShowMedicineModal(false)}>
                <i data-lucide="x" style={{ width: '20px', height: '20px' }}></i>
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Scrollable Form Fields Body */}
              <div className="modal-scroll-body" data-lenis-prevent style={{ overflowY: 'auto', flex: 1, paddingRight: '8px', marginBottom: '16px', display: 'flex', flexDirection: 'column' }}>
                {modalMode !== 'restock' ? (
                <>
                  {/* Premium Scanner Toolbar */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                    <button 
                      type="button" 
                      onClick={isWebcamScanning ? stopWebcamScanner : startWebcamScanner} 
                      style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        height: '42px', 
                        borderRadius: '10px', 
                        border: '1px solid #E2E8F0', 
                        background: isWebcamScanning ? '#FFF1F2' : '#F0F9FF', 
                        color: isWebcamScanning ? '#E11D48' : '#0284C7', 
                        fontWeight: 700, 
                        fontSize: '12.5px', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s' 
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      {isWebcamScanning ? 'Stop Camera Scanning' : 'Scan with Webcam'}
                    </button>
                  </div>

                  {/* Live Webcam Scanner Reader Viewport */}
                  {isWebcamScanning && (
                    <div style={{ marginBottom: '16px', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', background: '#F8FAFC', flexShrink: 0 }}>
                      <style>{`
                        @keyframes scanLineMove {
                          0% { top: 25%; }
                          50% { top: 75%; }
                          100% { top: 25%; }
                        }
                      `}</style>
                      <div style={{ padding: '8px 12px', background: '#F1F5F9', fontSize: '11px', fontWeight: 700, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Webcam Barcode Scan View</span>
                        <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse 1s infinite' }}></span> Active Camera
                        </span>
                      </div>
                      {/* Resilient video track container wrapper */}
                      <div style={{ width: '100%', minHeight: '220px', background: '#000', position: 'relative' }}>
                        {/* Pure mount container for html5-qrcode video track */}
                        <div id="barcode-webcam-reader" style={{ width: '100%' }}></div>
                        
                        {/* Glowing red laser scanning animation line overlays cleanly on top */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '10%',
                          width: '80%',
                          height: '2px',
                          background: '#EF4444',
                          boxShadow: '0 0 10px #EF4444, 0 0 4px #EF4444',
                          zIndex: 10,
                          pointerEvents: 'none',
                          animation: 'scanLineMove 2.2s infinite ease-in-out'
                        }}></div>
                      </div>
                    </div>
                  )}
                  {/* Debug status bar */}
                  {scanDebugLog && (
                    <div style={{ padding: '8px 12px', marginBottom: '12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: '#92400E', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      🔬 {scanDebugLog}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#64748B' }}>Medicine Name</label>
                    <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#64748B' }}>Category</label>
                      <SearchableDropdown
                        value={formData.category}
                        onChange={(val) => setFormData({...formData, category: val})}
                        options={[
                          { value: 'Pain Relief', label: 'Pain Relief' },
                          { value: 'Antibiotic', label: 'Antibiotic' },
                          { value: 'Anti-Allergic', label: 'Anti-Allergic' },
                          { value: 'Antacid', label: 'Antacid' },
                          { value: 'Cough Syrup', label: 'Cough Syrup' },
                          { value: 'Vitamins', label: 'Vitamins' }
                        ]}
                        placeholder="Select Category"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#64748B' }}>SKU Code (or scan physical gun)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.sku} 
                        onChange={e => setFormData({...formData, sku: e.target.value})} 
                        onKeyDown={handleSkuKeyDown}
                        placeholder="Scan or Enter barcode"
                        required 
                        style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', outline: 'none' }} 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#64748B' }}>Unit Type</label>
                      <SearchableDropdown
                        value={formData.unit}
                        onChange={(val) => setFormData({...formData, unit: val})}
                        options={[
                          { value: 'Strip', label: 'Strip' },
                          { value: 'Capsule', label: 'Capsule' },
                          { value: 'Bottle', label: 'Bottle' },
                          { value: 'Tablet', label: 'Tablet' }
                        ]}
                        placeholder="Select Unit Type"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#64748B' }}>MRP (₹)</label>
                      <input type="number" step="0.01" className="form-control" value={formData.mrp} onChange={e => setFormData({...formData, mrp: Number(e.target.value)})} required style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                    </div>
                  </div>
                </>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#64748B' }}>
                    {modalMode === 'restock' ? 'New Stock Quantity' : 'Initial Stock'}
                  </label>
                  <input type="number" className="form-control" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} required style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#64748B' }}>Expiry Date</label>
                  <input type="text" className="form-control" placeholder="DD/MM/YYYY" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '10px', fontSize: '13px', outline: 'none' }} />
                </div>
              </div>

              </div>

              {/* Sticky Action Footer */}
              <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', height: '48px', borderRadius: '12px', border: '1px solid #E2E8F0', background: 'transparent', color: '#64748B', fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowMedicineModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: '48px', borderRadius: '12px', background: '#2563EB', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  {modalMode === 'add' ? 'Add Medicine' : modalMode === 'restock' ? 'Verify Restock' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Prescribed Medicines Modal */}
      {showPrescriptionModal && selectedPrescriptionGroup && (
        <div 
          onClick={() => setShowPrescriptionModal(false)} 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15,23,42,0.45)', 
            backdropFilter: 'blur(4px)', 
            zIndex: 9000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px' 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: 'white', 
              borderRadius: '24px', 
              width: '100%', 
              maxWidth: '520px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
              maxHeight: '90vh', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              animation: 'fadeIn 0.25s ease-out',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {prescriptionModalStep === 'details' ? 'Prescription Details' : 'Payment Settlement'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                    {selectedPrescriptionGroup.id || 'RX10058'}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: selectedPrescriptionGroup.status === 'Pending' ? '#FFF7ED' : '#ECFDF5',
                    color: selectedPrescriptionGroup.status === 'Pending' ? '#EA580C' : '#10B981',
                    textTransform: 'uppercase'
                  }}>
                    {selectedPrescriptionGroup.status}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowPrescriptionModal(false)} 
                style={{ 
                  background: '#F1F5F9', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '32px', 
                  height: '32px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#64748B', 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
              >
                ✕
              </button>
            </div>

            {prescriptionModalStep === 'details' ? (
              <>
                {/* Modal Body: DETAILS STEP */}
                <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }} data-lenis-prevent>
                  {/* Patient Details */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Details</span>
                    </div>
                    <div style={{ paddingLeft: '24px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{selectedPrescriptionGroup.name}</div>
                      <div style={{ fontSize: '13.5px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                        {selectedPrescriptionGroup.age} Y, {selectedPrescriptionGroup.gender}
                      </div>
                      <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                        {selectedPrescriptionGroup.phone || '9876543210'}
                      </div>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doctor Details</span>
                    </div>
                    <div style={{ paddingLeft: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{selectedPrescriptionGroup.docName}</div>
                      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>{selectedPrescriptionGroup.specialty}</div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div style={{ marginBottom: '24px', borderBottom: '1px solid #F1F5F9', paddingBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                        {selectedPrescriptionGroup.dateStr || '24 May 2024'}, {selectedPrescriptionGroup.time}
                      </span>
                    </div>
                  </div>

                  {/* Items List with Price Breakdown */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                      Items ({selectedPrescriptionGroup.itemsList?.length || 0})
                    </div>
                    {/* Table Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', padding: '8px 0', borderBottom: '2px solid #E2E8F0', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Medicine</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', textAlign: 'center', minWidth: '40px' }}>Qty</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', textAlign: 'right', minWidth: '60px' }}>Rate</span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', textAlign: 'right', minWidth: '70px' }}>Amount</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {selectedPrescriptionGroup.itemsList && selectedPrescriptionGroup.itemsList.length > 0 ? (
                        selectedPrescriptionGroup.itemsList.map((item, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr auto auto auto', 
                              gap: '8px',
                              alignItems: 'center',
                              padding: '10px 0',
                              borderBottom: idx === selectedPrescriptionGroup.itemsList.length - 1 ? 'none' : '1px solid #F1F5F9'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>{item.medicine}</div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
                                {item.dosage} • {item.duration} {item.instructions ? `• ${item.instructions}` : ''}
                              </div>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textAlign: 'center', minWidth: '40px' }}>
                              {item.quantity || 1}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textAlign: 'right', minWidth: '60px' }}>
                              ₹{(item.unitPrice || 0).toFixed(2)}
                            </span>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', textAlign: 'right', minWidth: '70px' }}>
                              ₹{(item.lineTotal || 0).toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
                          No medicines listed.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer: DETAILS STEP */}
                <div style={{ padding: '24px 28px', borderTop: '1px solid #F1F5F9', flexShrink: 0, background: '#F8FAFC', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#475569' }}>Total Amount</span>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>
                      ₹{(selectedPrescriptionGroup.amountVal || 0).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <input type="file" id="upload-pharm-letterhead" accept="image/*" onChange={handlePharmacyLetterheadUpload} style={{ display: 'none' }} />
                      <label 
                        htmlFor="upload-pharm-letterhead" 
                        style={{
                          padding: '10px 16px',
                          background: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #DBEAFE',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease-in-out',
                          height: '48px',
                          boxSizing: 'border-box'
                        }}
                      >
                        <i data-lucide="image" style={{ width: '14px', height: '14px' }}></i>
                        {customPharmacyLetterhead ? 'Change Letterhead' : 'Upload Letterhead'}
                      </label>
                      {customPharmacyLetterhead && (
                        <button 
                          type="button"
                          onClick={() => {
                            localStorage.removeItem('curoxa_pharmacy_letterhead');
                            setCustomPharmacyLetterhead(null);
                          }}
                          style={{ marginLeft: '8px', padding: '10px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', height: '48px', boxSizing: 'border-box' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 1, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        height: '48px', 
                        borderRadius: '12px', 
                        border: '1px solid #CBD5E1', 
                        background: 'white', 
                        color: '#334155', 
                        fontWeight: 700, 
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }} 
                      onClick={() => handlePrintInvoice(selectedPrescriptionGroup)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      View Invoice
                    </button>
                    {selectedPrescriptionGroup.status === 'Pending' && (
                      <button 
                        type="button" 
                        style={{ 
                          flex: 1, 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          height: '48px', 
                          borderRadius: '12px', 
                          background: '#2563EB', 
                          border: 'none', 
                          color: 'white', 
                          fontWeight: 700, 
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                        }}
                        onClick={() => {
                          setPrescriptionModalStep('payment');
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Dispense Now
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Modal Body: CHECKOUT STEP */}
                <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }} data-lenis-prevent>
                  {/* Bill Summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #F1F5F9' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Amount Due</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                        ₹{(selectedPrescriptionGroup.amountVal || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569' }}>{selectedPrescriptionGroup.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>{selectedPrescriptionGroup.items} Items Prescribed</div>
                    </div>
                  </div>

                  {/* Payment Mode Selector Grid */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                    Select Payment Method
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    {['UPI', 'Cash', 'Card'].map(mode => {
                      const active = selectedPaymentMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => {
                            setSelectedPaymentMode(mode);
                            setCashReceived('');
                          }}
                          style={{
                            height: '46px',
                            borderRadius: '12px',
                            border: active ? '2px solid #2563EB' : '1px solid #CBD5E1',
                            background: active ? '#EFF6FF' : 'white',
                            color: active ? '#2563EB' : '#475569',
                            fontWeight: 800,
                            fontSize: '13.5px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          {mode === 'UPI' && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><rect x="6" y="6" width="12" height="12"/></svg>}
                          {mode === 'Cash' && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>}
                          {mode === 'Card' && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>}
                          <span>{mode}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Interactive Payment Forms */}
                  {selectedPaymentMode === 'UPI' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                      <div style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>Send payment link to patient</div>
                        <button style={{ padding: '8px 16px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Send SMS Link</button>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>UPI Payment Pending</div>
                        <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>Supports GPay, PhonePe, Paytm & BHIM UPI</div>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMode === 'Cash' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'slideUp 0.2s ease-out' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>Cash Amount Received</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#475569', fontSize: '15px' }}>₹</span>
                          <input 
                            type="number" 
                            placeholder="Enter amount given by patient" 
                            value={cashReceived} 
                            onChange={(e) => setCashReceived(e.target.value)} 
                            style={{ 
                              width: '100%', 
                              height: '46px', 
                              paddingLeft: '32px', 
                              border: '1px solid #CBD5E1', 
                              borderRadius: '12px', 
                              fontSize: '15px', 
                              fontWeight: 700, 
                              outline: 'none',
                              color: '#0F172A'
                            }} 
                            required
                          />
                        </div>
                      </div>
                      {cashReceived && Number(cashReceived) >= (selectedPrescriptionGroup.amountVal || 0) && (
                        <div style={{ 
                          background: '#ECFDF5', 
                          border: '1px solid #A7F3D0', 
                          padding: '14px 18px', 
                          borderRadius: '12px', 
                          color: '#047857', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          fontSize: '14px', 
                          fontWeight: 800,
                          animation: 'slideUp 0.15s ease-out'
                        }}>
                          <span>Change to Return:</span>
                          <span>₹{(Number(cashReceived) - (selectedPrescriptionGroup.amountVal || 0)).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPaymentMode === 'Card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '24px 20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '14.5px' }}>POS Terminal Awaiting Card</div>
                        <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '6px', fontWeight: 600 }}>Please tap or insert the customer's Credit/Debit card on the POS machine.</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer: CHECKOUT STEP */}
                <div style={{ padding: '24px 28px', borderTop: '1px solid #F1F5F9', flexShrink: 0, background: '#F8FAFC', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 1, 
                        height: '48px', 
                        borderRadius: '12px', 
                        border: '1px solid #CBD5E1', 
                        background: 'white', 
                        color: '#64748B', 
                        fontWeight: 700, 
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }} 
                      onClick={() => setPrescriptionModalStep('details')}
                    >
                      Back
                    </button>
                    <button 
                      type="button" 
                      style={{ 
                        flex: 2, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        height: '48px', 
                        borderRadius: '12px', 
                        background: '#10B981', 
                        border: 'none', 
                        color: 'white', 
                        fontWeight: 800, 
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                      }}
                      onClick={handleConfirmPaymentAndDispense}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Confirm Pay & Dispense
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* COVERAGE LAB MODALS */}
      {showCoverageLabModal && selectedCoverageLabTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '20px' }} onClick={() => setShowCoverageLabModal(false)}>
          <div style={{ width: '100%', maxWidth: '500px', padding: '28px', borderRadius: '16px', background: 'white' }} onClick={e => e.stopPropagation()}>
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
                showToast(`Lab results finalized & dispatched for ${selectedCoverageLabTest.name}!`);
                setShowCoverageLabModal(false);
                fetchCoverageData();
              } catch (err) {
                showToast('Failed to finalize results.');
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

      {showCoverageLabDetailsModal && selectedCoverageLabTest && (() => {
        const parsed = parseResults(selectedCoverageLabTest.results);
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '20px' }} onClick={() => setShowCoverageLabDetailsModal(false)}>
            <div style={{ width: '100%', maxWidth: '480px', padding: '28px', borderRadius: '16px', background: 'white' }} onClick={e => e.stopPropagation()}>
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
                        onClick={(e) => { e.preventDefault(); showToast(`Downloading: ${parsed.document}`); }} 
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '440px', padding: '28px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Edit Pharmacist Profile</h2>
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
                    style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #10B981', boxShadow: '0 8px 20px rgba(16,185,129,0.15)' }} 
                  />
                ) : (
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, boxShadow: '0 8px 20px rgba(16,185,129,0.15)' }}>
                    {profileEditName ? profileEditName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PH'}
                  </div>
                )}
                
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#ECFDF5', color: '#047857', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', border: '1px dashed #10B981' }}>
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
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', height: '40px', padding: '0 12px', fontSize: '13px', fontWeight: 600, outline: 'none', backgroundColor: '#F1F5F9', cursor: 'not-allowed' }}
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
                  style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', height: '40px', padding: '0 12px', fontSize: '13px', fontWeight: 600, outline: 'none', backgroundColor: '#F1F5F9', cursor: 'not-allowed' }}
                  value={profileEditEmail} 
                  disabled
                  required 
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Managed by Administrator</span>
              </div>

              <button 
                type="submit" 
                style={{ width: '100%', height: '44px', fontWeight: 800, borderRadius: '8px', background: '#10B981', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                disabled={profileEditLoading}
              >
                {profileEditLoading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD VENDOR */}
      {showAddVendorModal && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setShowAddVendorModal(false)}>
          <div className="modal-box glass-card" style={{ width: '90%', maxWidth: '500px', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Add New Vendor</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setShowAddVendorModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleAddVendor}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Vendor Code</label>
                <input 
                  type="text" 
                  value={newVendor.code} 
                  onChange={e => setNewVendor({ ...newVendor, code: e.target.value })}
                  style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', outline: 'none', fontSize: '13px', fontWeight: 600 }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Vendor Name</label>
                <input 
                  type="text" 
                  value={newVendor.name} 
                  onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="e.g. Acme Pharmaceuticals"
                  style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', outline: 'none', fontSize: '13px', fontWeight: 600 }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Email Address</label>
                <input 
                  type="email" 
                  value={newVendor.email} 
                  onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                  placeholder="e.g. orders@acme.com"
                  style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', outline: 'none', fontSize: '13px', fontWeight: 600 }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Phone Number</label>
                <input 
                  type="text" 
                  value={newVendor.phone} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setNewVendor({ ...newVendor, phone: val });
                  }}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  style={{ width: '100%', height: '40px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 12px', outline: 'none', fontSize: '13px', fontWeight: 600 }}
                  required 
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Address</label>
                <textarea 
                  value={newVendor.address} 
                  onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                  placeholder="Street details, City"
                  style={{ width: '100%', height: '80px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', outline: 'none', fontSize: '13px', fontWeight: 600, resize: 'none' }}
                  required 
                />
              </div>

              <button 
                type="submit" 
                style={{ width: '100%', height: '44px', fontWeight: 800, borderRadius: '8px', background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Save Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VENDOR DETAILS DRAWER / PROFILE */}
      {selectedVendor && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setSelectedVendor(null)}>
          <div className="modal-box glass-card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0 }}>{selectedVendor.name}</h2>
                <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#2563EB', fontWeight: 700 }}>Code: {selectedVendor.code}</span>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setSelectedVendor(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Information</h4>
                <div style={{ fontSize: '13.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>Email: <b style={{ color: '#0F172A' }}>{selectedVendor.email || '--'}</b></div>
                  <div>Phone: <b style={{ color: '#0F172A' }}>{selectedVendor.phone || '--'}</b></div>
                  <div>Address: <b style={{ color: '#0F172A' }}>{selectedVendor.address || '--'}</b></div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commercial Snapshot</h4>
                <div style={{ fontSize: '13.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>Price List Scope: <b style={{ color: '#0F172A' }}>{selectedVendor.medicines?.length || 0} Products</b></div>
                  <div>Completed Orders: <b style={{ color: '#0F172A' }}>{selectedVendor.purchaseHistory?.length || 0} POs</b></div>
                </div>
              </div>
            </div>

            {/* Price list panel */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>Catalog Price List</h4>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #E2E8F0', background: '#F8FAFC', fontWeight: 700, color: '#2563EB' }}
                  onClick={() => {
                    setEditablePriceList(selectedVendor.medicines || []);
                    setShowPriceListModal(true);
                  }}
                >
                  Manage Price List
                </button>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Medicine</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>SKU Code</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Unit Price</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVendor.medicines?.map((med, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{med.name}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748B' }}>{med.sku}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>₹{med.price.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 800, 
                            background: med.available ? '#DEF7EC' : '#FDE8E8', 
                            color: med.available ? '#03543F' : '#9B1C1C' 
                          }}>
                            {med.available ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!selectedVendor.medicines || selectedVendor.medicines.length === 0) && (
                      <tr>
                        <td colSpan="4" style={{ padding: '14px', textStyle: 'italic', textAlign: 'center', color: '#94A3B8' }}>No items listed.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase History panel */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>Purchase Order History</h4>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>PO Number</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Date</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Total Cost</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVendor.purchaseHistory?.map((hist, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>{hist.poId}</td>
                        <td style={{ padding: '10px 14px', color: '#64748B' }}>{new Date(hist.date).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0F172A' }}>₹{hist.amount.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, background: '#DEF7EC', color: '#03543F' }}>
                            {hist.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!selectedVendor.purchaseHistory || selectedVendor.purchaseHistory.length === 0) && (
                      <tr>
                        <td colSpan="4" style={{ padding: '14px', textStyle: 'italic', textAlign: 'center', color: '#94A3B8' }}>No purchase history recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRICE LIST EDITOR */}
      {showPriceListModal && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }} onClick={() => setShowPriceListModal(false)}>
          <div className="modal-box glass-card" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Configure Price List ({selectedVendor?.name})</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setShowPriceListModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSavePriceList}>
              <div style={{ maxHeight: '45vh', overflowY: 'auto', marginBottom: '20px', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Medicine</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>SKU Code</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Price (₹)</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>GST (%)</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Available</th>
                      <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 800 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editablePriceList.map((med, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                          <input 
                            type="text" 
                            value={med.name} 
                            onChange={e => {
                              const updated = [...editablePriceList];
                              updated[idx].name = e.target.value;
                              setEditablePriceList(updated);
                            }}
                            style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '4px', height: '30px', padding: '0 8px', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <input 
                            type="text" 
                            value={med.sku} 
                            onChange={e => {
                              const updated = [...editablePriceList];
                              updated[idx].sku = e.target.value;
                              setEditablePriceList(updated);
                            }}
                            style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '4px', height: '30px', padding: '0 8px', outline: 'none', fontFamily: 'monospace' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <input 
                            type="number" 
                            step="0.01"
                            value={med.price} 
                            onChange={e => {
                              const updated = [...editablePriceList];
                              updated[idx].price = Number(e.target.value) || 0;
                              setEditablePriceList(updated);
                            }}
                            style={{ width: '80px', border: '1px solid #E2E8F0', borderRadius: '4px', height: '30px', padding: '0 8px', outline: 'none', fontWeight: 800 }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={med.gst !== undefined ? med.gst : 12} 
                            onChange={e => {
                              const updated = [...editablePriceList];
                              updated[idx].gst = Number(e.target.value) || 0;
                              setEditablePriceList(updated);
                            }}
                            style={{ width: '60px', border: '1px solid #E2E8F0', borderRadius: '4px', height: '30px', padding: '0 8px', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={med.available} 
                            onChange={e => {
                              const updated = [...editablePriceList];
                              updated[idx].available = e.target.checked;
                              setEditablePriceList(updated);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 800, cursor: 'pointer' }}
                            onClick={() => {
                              setEditablePriceList(editablePriceList.filter((_, i) => i !== idx));
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px', border: '1px dashed #2563EB', background: 'transparent', color: '#2563EB', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => {
                    setEditablePriceList([...editablePriceList, { name: '', sku: '', price: 10.0, gst: 12, available: true }]);
                  }}
                >
                  + Add Custom Medicine
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px', border: '1px solid #CBD5E1', background: 'transparent', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => {
                    const existingSkus = editablePriceList.map(x => x.sku);
                    const newItems = inventory
                      .filter(x => !existingSkus.includes(x.sku))
                      .map(x => ({
                        name: x.name,
                        sku: x.sku,
                        price: Math.round(x.mrp * 0.7),
                        gst: 12,
                        available: true
                      }));
                    setEditablePriceList([...editablePriceList, ...newItems]);
                  }}
                >
                  + Populate from Clinic Inventory
                </button>
              </div>

              <button 
                type="submit" 
                style={{ width: '100%', height: '44px', fontWeight: 800, borderRadius: '8px', background: '#2563EB', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Save Price List Configurations
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE PURCHASE ORDER */}
      {showCreatePOModal && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setShowCreatePOModal(false)}>
          <div className="modal-box glass-card" style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Create Reorder Purchase Orders</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setShowCreatePOModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Selected Medications & Quantities</h4>
                <div style={{ maxHeight: '35vh', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>Medicine Name</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>SKU Code</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>Qty</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poDraftItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <SearchableDropdown
                              value={item.name}
                              onChange={val => handleDraftPOChange(idx, 'name', val)}
                              options={inventory.map(inv => ({ value: inv.name, label: inv.name }))}
                              placeholder="Select medicine..."
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input 
                              type="text" 
                              value={item.sku} 
                              onChange={e => handleDraftPOChange(idx, 'sku', e.target.value)}
                              style={{ width: '100%', height: '32px', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 8px', outline: 'none', fontFamily: 'monospace' }}
                              placeholder="SKU"
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input 
                              type="number" 
                              value={item.qty} 
                              onChange={e => handleDraftPOChange(idx, 'qty', e.target.value)}
                              style={{ width: '70px', height: '32px', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0 8px', outline: 'none', fontWeight: 800 }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <button 
                              type="button" 
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 800 }}
                              onClick={() => handleDraftPORemoveRow(idx)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '12px', border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                    onClick={handleDraftPOAddRow}
                  >
                    + Add Row
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12px', border: 'none', background: '#2563EB', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                    onClick={calculatePOSplits}
                  >
                    Compare & Split Orders
                  </button>
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #E2E8F0', paddingLeft: '24px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Supplier Pricing Comparison</h4>
                
                {poDraftItems.some(x => x.name !== '') ? (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px', fontSize: '11.5px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '6px 10px', color: '#475569', fontWeight: 800 }}>Medicine</th>
                          {vendors.map(v => (
                            <th key={v._id} style={{ padding: '6px 10px', color: '#475569', fontWeight: 800 }}>{v.name.split(' ')[0]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {poDraftItems.filter(x => x.name !== '').map((item, idx) => {
                          const { vendor: cheapestVendor } = getCheapestVendorForItem(item.sku);
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '6px 10px', fontWeight: 700 }}>{item.name}</td>
                              {vendors.map(v => {
                                const match = v.medicines?.find(med => med.sku === item.sku && med.available);
                                const isCheapest = cheapestVendor && cheapestVendor._id === v._id;
                                return (
                                  <td key={v._id} style={{ padding: '6px 10px', color: isCheapest ? '#10B981' : '#475569', fontWeight: isCheapest ? 800 : 500 }}>
                                    {match ? `₹${match.price.toFixed(2)}${isCheapest ? ' ✓' : ''}` : 'N/A'}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '12.5px', color: '#94A3B8', textStyle: 'italic', marginBottom: '16px' }}>Add medications to compare prices.</p>
                )}

                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Split PO Submissions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '25vh', overflowY: 'auto', marginBottom: '16px' }}>
                  {poSplitSummary.map((split, index) => (
                    <div key={index} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{split.vendorName}</span>
                        <span style={{ fontWeight: 900, color: '#2563EB', fontSize: '13px' }}>₹{split.totalAmount.toFixed(2)}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        {split.items.map(i => `${i.name} (x${i.requiredQty})`).join(', ')}
                      </div>
                    </div>
                  ))}
                  {poSplitSummary.length === 0 && (
                    <span style={{ fontSize: '12.5px', color: '#94A3B8', textStyle: 'italic' }}>Click Compare & Split Orders to compute splits.</span>
                  )}
                </div>

                <button 
                  type="button" 
                  disabled={poSplitSummary.length === 0}
                  onClick={handleSendPurchaseOrders}
                  style={{ width: '100%', height: '44px', fontWeight: 800, borderRadius: '8px', background: poSplitSummary.length > 0 ? '#10B981' : '#CBD5E1', color: 'white', border: 'none', cursor: poSplitSummary.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Generate Purchase Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE GOODS RECEIPT NOTE (GRN) */}
      {showGRNModal && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setShowGRNModal(false)}>
          <div className="modal-box glass-card" style={{ width: '95%', maxWidth: '850px', maxHeight: '90vh', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Create Goods Receipt Note (GRN)</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setShowGRNModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={(e) => handleSaveGRN(e, 'Verified/Completed')}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', background: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="grnFlowType" 
                    value="po" 
                    checked={grnFlowType === 'po'}
                    onChange={() => {
                      setGrnFlowType('po');
                      setGrnSelectedPOId('');
                      setGrnItems([]);
                    }}
                  />
                  Against Approved PO
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="grnFlowType" 
                    value="direct" 
                    checked={grnFlowType === 'direct'}
                    onChange={() => {
                      setGrnFlowType('direct');
                      setGrnDirectVendorId('');
                      setGrnItems([{ name: 'Paracetamol 650mg', sku: 'PAR-650', qtyRequired: 0, qtyReceived: 100, price: 12.50, batchNumber: '', expiryDate: '', mfgDate: '' }]);
                    }}
                  />
                  Direct Purchase (Without PO)
                </label>
              </div>

              {grnFlowType === 'po' ? (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Select Approved Purchase Order</label>
                  <SearchableDropdown
                    value={grnSelectedPOId}
                    onChange={handleGrnPOSelection}
                    options={purchaseOrders.filter(x => x.status === 'Approved' || x.status === 'Partially Received').map(po => ({ value: po._id, label: `${po.poId} - ${po.vendorName} (₹${po.totalAmount})` }))}
                    placeholder="Choose approved order..."
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Select Vendor</label>
                  <SearchableDropdown
                    value={grnDirectVendorId}
                    onChange={setGrnDirectVendorId}
                    options={vendors.map(v => ({ value: v._id, label: v.name }))}
                    placeholder="Choose supplier..."
                  />
                </div>
              )}

              {grnItems.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medications Received & Expiry Details (Incl. GST calculations)</h4>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '950px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '20%' }}>Medicine</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '10%' }}>SKU</th>
                          {grnFlowType === 'po' && <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '6%' }}>PO Qty</th>}
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '8%' }}>Recv Qty</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '10%' }}>Batch No.</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '10%' }}>Mfg Date</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '10%' }}>Expiry Date</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '8%' }}>Price (₹)</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '6%' }}>GST (%)</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '8%' }}>GST Amt</th>
                          <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '8%' }}>Total</th>
                          {grnFlowType === 'direct' && <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, width: '2%' }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {grnItems.map((item, idx) => {
                          const qty = item.qtyReceived || 0;
                          const price = item.price || 0;
                          const gstRate = item.gst !== undefined ? item.gst : 12;
                          const gstAmt = qty * price * (gstRate / 100);
                          const totalAmt = qty * price + gstAmt;

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                                {grnFlowType === 'po' ? item.name : (
                                  <SearchableDropdown
                                    value={item.name}
                                    onChange={val => {
                                      const updated = [...grnItems];
                                      updated[idx].name = val;
                                      const matched = inventory.find(x => x.name === val);
                                      if (matched) updated[idx].sku = matched.sku;
                                      setGrnItems(updated);
                                    }}
                                    options={inventory.map(i => ({ value: i.name, label: i.name }))}
                                    placeholder="Select..."
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                                {grnFlowType === 'po' ? item.sku : (
                                  <input 
                                    type="text" 
                                    value={item.sku} 
                                    onChange={e => {
                                      const updated = [...grnItems];
                                      updated[idx].sku = e.target.value;
                                      setGrnItems(updated);
                                    }}
                                    style={{ width: '90%', height: '28px', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none', padding: '0 4px' }}
                                  />
                                )}
                              </td>
                              {grnFlowType === 'po' && <td style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>{item.qtyRequired}</td>}
                              <td style={{ padding: '8px 12px' }}>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={qty} 
                                  onChange={e => {
                                    const updated = [...grnItems];
                                    updated[idx].qtyReceived = Number(e.target.value) || 0;
                                    setGrnItems(updated);
                                  }}
                                  style={{ width: '60px', height: '28px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 6px', outline: 'none', fontWeight: 800 }}
                                />
                                {grnFlowType === 'po' && item.qtyReceived !== item.qtyRequired && (
                                  <div style={{ marginTop: '4px' }}>
                                    {item.qtyReceived < item.qtyRequired ? (
                                      <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 700, background: '#FEF3C7', padding: '2px 4px', borderRadius: '4px', display: 'inline-block' }}>
                                        Under ({item.qtyRequired - item.qtyReceived})
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '10px', color: '#2563EB', fontWeight: 700, background: '#EFF6FF', padding: '2px 4px', borderRadius: '4px', display: 'inline-block' }}>
                                        Over ({item.qtyReceived - item.qtyRequired})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input 
                                  type="text"
                                  placeholder="Batch"
                                  value={item.batchNumber}
                                  onChange={e => {
                                    const updated = [...grnItems];
                                    updated[idx].batchNumber = e.target.value;
                                    setGrnItems(updated);
                                  }}
                                  style={{ width: '90%', height: '28px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 4px', outline: 'none' }}
                                  required
                                />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input 
                                  type="date"
                                  max={new Date().toISOString().split('T')[0]}
                                  value={item.mfgDate}
                                  onChange={e => {
                                    const today = new Date().toISOString().split('T')[0];
                                    if (e.target.value > today) {
                                      showToast('Manufacturing date cannot be in the future!', 'error');
                                      return;
                                    }
                                    const updated = [...grnItems];
                                    updated[idx].mfgDate = e.target.value;
                                    setGrnItems(updated);
                                  }}
                                  style={{ width: '90%', height: '28px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 4px', outline: 'none' }}
                                />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input 
                                  type="date"
                                  value={item.expiryDate}
                                  onChange={e => {
                                    const updated = [...grnItems];
                                    updated[idx].expiryDate = e.target.value;
                                    setGrnItems(updated);
                                  }}
                                  style={{ width: '90%', height: '28px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 4px', outline: 'none' }}
                                  required
                                />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {grnFlowType === 'po' ? `₹${price.toFixed(2)}` : (
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={price} 
                                    onChange={e => {
                                      const updated = [...grnItems];
                                      updated[idx].price = Number(e.target.value) || 0;
                                      setGrnItems(updated);
                                    }}
                                    style={{ width: '70px', height: '28px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 6px', outline: 'none', fontWeight: 800 }}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input 
                                  type="number" 
                                  min="0"
                                  max="100"
                                  value={gstRate} 
                                  onChange={e => {
                                    const updated = [...grnItems];
                                    updated[idx].gst = Number(e.target.value) || 0;
                                    setGrnItems(updated);
                                  }}
                                  style={{ width: '50px', height: '28px', border: '1px solid #CBD5E1', borderRadius: '4px', padding: '0 4px', outline: 'none' }}
                                />
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 600 }}>₹{gstAmt.toFixed(2)}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 700 }}>₹{totalAmt.toFixed(2)}</td>
                              {grnFlowType === 'direct' && (
                                <td style={{ padding: '8px 12px' }}>
                                  <button 
                                    type="button" 
                                    style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 800, cursor: 'pointer' }}
                                    onClick={() => setGrnItems(grnItems.filter((_, i) => i !== idx))}
                                  >
                                    ✕
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    {grnFlowType === 'direct' ? (
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '11.5px', border: '1px dashed #CBD5E1', cursor: 'pointer', background: 'transparent' }}
                        onClick={() => setGrnItems([...grnItems, { name: '', sku: '', qtyRequired: 0, qtyReceived: 100, price: 10.0, gst: 12, batchNumber: '', expiryDate: '', mfgDate: '' }])}
                      >
                        + Add Item
                      </button>
                    ) : <div />}

                    {(() => {
                      const totals = grnItems.reduce((acc, item) => {
                        const qty = Number(item.qtyReceived) || 0;
                        const price = Number(item.price) || 0;
                        const gst = item.gst !== undefined ? item.gst : 12;
                        const sub = qty * price;
                        const gstAmt = sub * (gst / 100);
                        return {
                          subtotal: acc.subtotal + sub,
                          gstTotal: acc.gstTotal + gstAmt,
                          grandTotal: acc.grandTotal + sub + gstAmt
                        };
                      }, { subtotal: 0, gstTotal: 0, grandTotal: 0 });

                      return (
                        <div style={{ minWidth: '280px', padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 600, color: '#475569' }}>
                            <span>Subtotal (Excl. GST)</span>
                            <span>₹{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 700, color: '#EA580C' }}>
                            <span>GST Burden</span>
                            <span>₹{totals.gstTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '4px', fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                            <span>Total (Incl. GST)</span>
                            <span>₹{totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* SUPPLIER INVOICE ATTACHMENT WITH PROGRESS BAR SIMULATION */}
              <div style={{ marginBottom: '20px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Supplier Invoice Document {grnFlowType === 'direct' && <span style={{ color: '#EF4444' }}>* (Required)</span>}
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setGrnIsUploading(true);
                      setGrnUploadProgress(0);
                      let progressVal = 0;
                      const interval = setInterval(() => {
                        progressVal += 20;
                        setGrnUploadProgress(progressVal);
                        if (progressVal >= 100) {
                          clearInterval(interval);
                          setGrnIsUploading(false);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setGrnInvoiceFile(file);
                            setGrnInvoiceFileName(event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }, 100);
                    }
                  }}
                  style={{ fontSize: '13px', color: '#334155' }}
                  required={grnFlowType === 'direct'}
                />

                {grnIsUploading && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#2563EB', fontWeight: 700, marginBottom: '4px' }}>
                      <span>Uploading document...</span>
                      <span>{grnUploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${grnUploadProgress}%`, height: '100%', background: '#2563EB', transition: 'width 0.1s ease-out' }} />
                    </div>
                  </div>
                )}

                {!grnIsUploading && grnInvoiceFileName && (
                  <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px', fontWeight: 700 }}>
                    ✓ Invoice Uploaded: {grnInvoiceFile ? grnInvoiceFile.name : 'Uploaded Document'}
                  </div>
                )}
              </div>

              {/* NOTES / REMARKS */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>Receipt Notes / Discrepancy Remarks</label>
                <textarea
                  value={grnNotes}
                  onChange={e => setGrnNotes(e.target.value)}
                  placeholder="Enter invoice details, batch notes, or variance reasons..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13.5px', minHeight: '60px', outline: 'none' }}
                />
              </div>

              {/* ACTIONS FOOTER WITH DRAFT AND VERIFIED CONTROLS */}
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <button 
                  type="button"
                  style={{ flex: 1, height: '44px', fontWeight: 800, borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', color: '#475569', cursor: 'pointer' }}
                  onClick={() => setShowGRNModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={grnItems.length === 0 || (grnFlowType === 'direct' && !grnInvoiceFileName)}
                  style={{ flex: 1, height: '44px', fontWeight: 800, borderRadius: '8px', border: '1px solid #2563EB', background: 'transparent', color: '#2563EB', cursor: (grnItems.length > 0 && (grnFlowType === 'po' || grnInvoiceFileName)) ? 'pointer' : 'not-allowed' }}
                  onClick={(e) => handleSaveGRN(e, 'Draft')}
                >
                  Save as Draft
                </button>
                <button 
                  type="submit" 
                  disabled={grnItems.length === 0 || (grnFlowType === 'direct' && !grnInvoiceFileName)}
                  style={{ flex: 2, height: '44px', fontWeight: 800, borderRadius: '8px', background: (grnItems.length > 0 && (grnFlowType === 'po' || grnInvoiceFileName)) ? '#059669' : '#CBD5E1', color: 'white', border: 'none', cursor: (grnItems.length > 0 && (grnFlowType === 'po' || grnInvoiceFileName)) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Submit & Verify Goods Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE REPLENISHMENT TICKET */}
      {showResolveTicketModal && selectedTicket && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setShowResolveTicketModal(false)}>
          <div className="modal-box glass-card" style={{ width: '95%', maxWidth: '500px', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Resolve Replenishment Ticket</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setShowResolveTicketModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleResolveTicket}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>MEDICINE NAME</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{selectedTicket.medicineName}</span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>ADMIN COMMENT</span>
                <p style={{ fontSize: '13px', color: '#334155', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', margin: 0 }}>{selectedTicket.adminComment}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', display: 'block', marginBottom: '6px' }}>
                  Resolution / Sourcing Reason <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  required
                  rows="4"
                  placeholder="e.g. Sourced 100 units from Satyam Distributors. Stock replenished."
                  value={ticketResolutionReason}
                  onChange={(e) => setTicketResolutionReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowResolveTicketModal(false)}
                  style={{ height: '38px', padding: '0 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'white', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ height: '38px', padding: '0 20px', borderRadius: '8px', border: 'none', background: '#059669', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                >
                  Resolve & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Indent Order Summary Modal */}
      {showIndentModal && selectedIndent && (
        <div onClick={() => { setShowIndentModal(false); setSelectedIndent(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
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
                    <span style={{
                      background: selectedIndent.status === 'Received' || selectedIndent.status === 'Fulfilled' ? '#D1FAE5' : selectedIndent.status === 'Pending' ? '#FEF3C7' : selectedIndent.status === 'Approved' ? '#EFF6FF' : selectedIndent.status === 'Partially Fulfilled' ? '#FFF3E0' : '#FEE2E2',
                      color: selectedIndent.status === 'Received' || selectedIndent.status === 'Fulfilled' ? '#065F46' : selectedIndent.status === 'Pending' ? '#D97706' : selectedIndent.status === 'Approved' ? '#2563EB' : selectedIndent.status === 'Partially Fulfilled' ? '#E65100' : '#991B1B',
                      padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800
                    }}>{selectedIndent.status}</span>
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
 
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 0 0 0', borderTop: '1px solid #F1F5F9', flexShrink: 0, marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowIndentModal(false); setSelectedIndent(null); }}
                style={{ height: '40px', padding: '0 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#64748B' }}
              >
                Close
              </button>
              {!['Received', 'Fulfilled', 'Cannot Fulfill', 'Rejected'].includes(selectedIndent.status) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Cannot Fulfill Button */}
                  <button
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await api.put(`/indents/${selectedIndent._id}`, { status: 'Cannot Fulfill' });
                        const updated = { ...selectedIndent, status: 'Cannot Fulfill' };
                        setIndents(prev => prev.map(ind => ind._id === selectedIndent._id ? updated : ind));
                        setSelectedIndent(updated);
                        showToast('Indent marked as Cannot Fulfill');
                      } catch (err) {
                        console.error(err);
                        showToast('Failed to update indent status', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{ height: '40px', padding: '0 14px', borderRadius: '8px', border: 'none', background: '#EF4444', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Cannot Fulfill
                  </button>

                  {/* Partially Fulfilled Button */}
                  <button
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await api.put(`/indents/${selectedIndent._id}`, { status: 'Partially Fulfilled' });
                        const updated = { ...selectedIndent, status: 'Partially Fulfilled' };
                        setIndents(prev => prev.map(ind => ind._id === selectedIndent._id ? updated : ind));
                        setSelectedIndent(updated);
                        showToast('Indent marked as Partially Fulfilled');
                      } catch (err) {
                        console.error(err);
                        showToast('Failed to update indent status', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{ height: '40px', padding: '0 14px', borderRadius: '8px', border: 'none', background: '#F59E0B', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Partially Fulfilled
                  </button>

                  {/* Fulfilled Button */}
                  <button
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await api.put(`/indents/${selectedIndent._id}`, { status: 'Fulfilled' });
                        const updated = { ...selectedIndent, status: 'Fulfilled' };
                        setIndents(prev => prev.map(ind => ind._id === selectedIndent._id ? updated : ind));
                        setSelectedIndent(updated);
                        showToast('Indent marked as Fulfilled!');
                      } catch (err) {
                        console.error(err);
                        showToast('Failed to update indent status', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{ height: '40px', padding: '0 14px', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Fulfilled
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: GRN DETAILS WITH GST SUMMARY */}
      {selectedGrnDetails && (
        <div className="modal-overlay" data-lenis-prevent style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }} onClick={() => setSelectedGrnDetails(null)}>
          <div className="modal-box glass-card" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', position: 'relative', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Goods Receipt Note (GRN) Details</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }} onClick={() => setSelectedGrnDetails(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>GRN ID</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{selectedGrnDetails.grnId}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>PO Reference</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563EB' }}>{selectedGrnDetails.poNumber || 'Direct Purchase'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Supplier</span>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{selectedGrnDetails.vendorName}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Date Received</span>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{new Date(selectedGrnDetails.receivedDate || selectedGrnDetails.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedGrnDetails.invoiceUrl && (
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Invoice Document</span>
                  <div>
                    <a href={selectedGrnDetails.invoiceUrl} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 800, textDecoration: 'underline', fontSize: '13px' }}>
                      Download/View Invoice
                    </a>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Received Medications & Taxes</span>
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', marginTop: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800 }}>Medicine</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>Price</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>GST %</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>GST Amt</th>
                        <th style={{ padding: '8px 12px', color: '#475569', fontWeight: 800, textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedGrnDetails.items || []).map((item, idx) => {
                        const qty = item.qtyReceived || 0;
                        const price = item.price || 0;
                        const gstRate = item.gst !== undefined ? item.gst : 12;
                        const gstAmt = qty * price * (gstRate / 100);
                        const totalAmt = qty * price + gstAmt;

                        return (
                          <tr key={`grn-detail-${idx}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{item.name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{qty}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{price.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{gstRate}%</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>₹{gstAmt.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>₹{totalAmt.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {(() => {
                const totals = (selectedGrnDetails.items || []).reduce((acc, item) => {
                  const qty = Number(item.qtyReceived) || 0;
                  const price = Number(item.price) || 0;
                  const gst = item.gst !== undefined ? item.gst : 12;
                  const sub = qty * price;
                  const gstAmt = sub * (gst / 100);
                  return {
                    subtotal: acc.subtotal + sub,
                    gstTotal: acc.gstTotal + gstAmt,
                    grandTotal: acc.grandTotal + sub + gstAmt
                  };
                }, { subtotal: 0, gstTotal: 0, grandTotal: 0 });

                return (
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      <span>Subtotal (Excl. GST)</span>
                      <span>₹{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#EA580C' }}>
                      <span>Total GST Burden</span>
                      <span>₹{totals.gstTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '6px', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      <span>Total Amount (Incl. GST)</span>
                      <span>₹{totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '8px 20px', borderRadius: '8px', background: '#334155', color: 'white', fontWeight: 800, cursor: 'pointer', border: 'none' }} onClick={() => setSelectedGrnDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PharmacyDashboard;
