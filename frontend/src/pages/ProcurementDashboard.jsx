import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ProcurementDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'vendors', 'pos', 'grn', 'payments'
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedVendorProfile, setSelectedVendorProfile] = useState(null);
  const [selectedGrnDetails, setSelectedGrnDetails] = useState(null);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('All Types');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All Status');
  const [editingVendor, setEditingVendor] = useState(null);

  // Form states
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
    medicines: [],
    
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
  const [poDraftItems, setPoDraftItems] = useState([{ name: '', sku: '', qty: 100, price: 50 }]);
  const [selectedVendorForPO, setSelectedVendorForPO] = useState('');
  const [poExpectedDelivery, setPoExpectedDelivery] = useState('');
  const [poInitialStatus, setPoInitialStatus] = useState('Draft');
  const [grnFlowType, setGrnFlowType] = useState('po'); // 'po' or 'direct'
  const [grnSelectedPOId, setGrnSelectedPOId] = useState('');
  const [grnDirectVendorId, setGrnDirectVendorId] = useState('');
  const [grnItems, setGrnItems] = useState([]);
  const [grnInvoiceFileName, setGrnInvoiceFileName] = useState('');
  
  // Payment states
  const [selectedPaymentVendorId, setSelectedPaymentVendorId] = useState('');
  const [paymentPOId, setPaymentPOId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');

  // Create PO Screen states
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [poScreenNumber, setPoScreenNumber] = useState('PO-2026-0143');
  const [poScreenOrderDate, setPoScreenOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [poScreenExpectedDelivery, setPoScreenExpectedDelivery] = useState(() => new Date(Date.now() + 4*24*60*60*1000).toISOString().split('T')[0]);
  const [poScreenDefaultVendor, setPoScreenDefaultVendor] = useState('');
  const [poScreenItems, setPoScreenItems] = useState([
    { sku: '', qty: 100, vendorId: '', price: 0, discount: 0, tax: 12 }
  ]);
  const [poScreenNotes, setPoScreenNotes] = useState('');
  const [editingDraftPO, setEditingDraftPO] = useState(null);

  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);

  // Compare Drawer state
  const [compareItemIdx, setCompareItemIdx] = useState(null);
  const [activeVendorMedFocus, setActiveVendorMedFocus] = useState(null);
  const [activePoItemFocus, setActivePoItemFocus] = useState(null);

  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{"name":"Dr. Ramesh","role":"Pharmacy Admin","email":"ramesh@curoxa.com"}'));
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [vendorRes, poRes, grnRes, medRes] = await Promise.all([
        api.get('/vendors'),
        api.get('/purchase-orders'),
        api.get('/goods-receipts'),
        api.get('/medicines')
      ]);

      const fetchedVendors = vendorRes.data || [];
      setVendors(fetchedVendors);
      setPurchaseOrders(poRes.data || []);
      setGoodsReceipts(grnRes.data || []);
      setMedicines(medRes.data || []);

      if (fetchedVendors.length > 0 && !selectedPaymentVendorId) {
        setSelectedPaymentVendorId(fetchedVendors[0]._id);
      }
    } catch (err) {
      console.error('Error fetching procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Initialize Lucide icons
    setTimeout(() => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }); // Run on every render to ensure Lucide icons never disappear

  useEffect(() => {
    const handleSync = (e) => {
      const { type } = e.detail;
      console.log('[SOCKET] ProcurementDashboard received sync event for:', type);
      if (type === 'purchase_orders' || type === 'purchase-orders' || type === 'vendors') {
        fetchData();
      }
    };
    window.addEventListener('curoxa_sync', handleSync);
    return () => window.removeEventListener('curoxa_sync', handleSync);
  }, []);

  // Dynamic lists with NO static mock fallbacks
  const getDisplayVendors = () => {
    return vendors;
  };

  const getDisplayPOs = () => {
    return purchaseOrders;
  };

  const resetVendorForm = () => {
    setNewVendor({
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
      medicines: [],
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
  };

  const handleSaveVendorSubmit = async (e) => {
    e.preventDefault();

    // Mobile number validation (checks for exactly 10 digits after removing spaces, dashes, and plus signs)
    const phoneRegex = /^[0-9]{10}$/;
    if (newVendor.phone) {
      const cleanPhone = newVendor.phone.replace(/[\s\-+]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        return;
      }
    }
    if (newVendor.alternatePhone) {
      const cleanAltPhone = newVendor.alternatePhone.replace(/[\s\-+]/g, '');
      if (!phoneRegex.test(cleanAltPhone)) {
        showToast('Please enter a valid 10-digit alternate mobile number', 'error');
        return;
      }
    }

    try {
      let savedVendor;
      if (editingVendor) {
        // Edit existing
        const res = await api.put(`/vendors/${editingVendor._id}`, newVendor);
        savedVendor = res.data;
        setEditingVendor(null);
      } else {
        // Add new
        const res = await api.post('/vendors', newVendor);
        savedVendor = res.data;
      }
      setShowAddVendorModal(false);
      setIsAddingVendor(false);
      resetVendorForm();
      fetchData();

      const submitterName = e.nativeEvent.submitter?.name;
      if (submitterName === 'saveAndAddPrice' && savedVendor) {
        setSelectedVendorProfile(savedVendor);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save vendor', 'error');
    }
  };

  const handleEditVendorClick = (vendor) => {
    setEditingVendor(vendor);
    setNewVendor({
      name: vendor.name || '',
      code: vendor.code || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      type: vendor.type || 'Medicine',
      contactPerson: vendor.contactPerson || '',
      gstNumber: vendor.gstNumber || '',
      status: vendor.status || 'Active',
      panNumber: vendor.panNumber || '',
      licenseNumber: vendor.licenseNumber || '',
      zipCode: vendor.zipCode || '',
      notes: vendor.notes || '',
      alternatePhone: vendor.alternatePhone || '',
      medicines: vendor.medicines || [],
      supplierCategory: vendor.supplierCategory || 'Medicine',
      organizationType: vendor.organizationType || 'Private Ltd',
      houseNo: vendor.houseNo || '',
      street: vendor.street || '',
      country: vendor.country || 'India',
      pinCode: vendor.pinCode || '',
      landline: vendor.landline || '',
      faxNo: vendor.faxNo || '',
      website: vendor.website || '',
      primaryContactPerson: vendor.primaryContactPerson || '',
      primaryContactPersonDesignation: vendor.primaryContactPersonDesignation || '',
      primaryContactPersonMobileNo: vendor.primaryContactPersonMobileNo || '',
      primaryContactPersonEmailId: vendor.primaryContactPersonEmailId || '',
      secondaryContactPerson: vendor.secondaryContactPerson || '',
      secondaryContactPersonDesignation: vendor.secondaryContactPersonDesignation || '',
      secondaryContactPersonMobileNo: vendor.secondaryContactPersonMobileNo || '',
      secondaryContactPersonEmailId: vendor.secondaryContactPersonEmailId || '',
      cinNo: vendor.cinNo || '',
      pfRegistrationNo: vendor.pfRegistrationNo || '',
      nameOnPanCard: vendor.nameOnPanCard || '',
      panCardNo: vendor.panCardNo || '',
      rocNo: vendor.rocNo || '',
      esiRegistrationNo: vendor.esiRegistrationNo || '',
      isoCertificationNo: vendor.isoCertificationNo || '',
      isoValidUpto: vendor.isoValidUpto || '',
      pollutionControlBoardCertificationNo: vendor.pollutionControlBoardCertificationNo || '',
      pollutionValidUpto: vendor.pollutionValidUpto || '',
      bank1Name: vendor.bank1Name || '',
      bank1Branch: vendor.bank1Branch || '',
      bank1AccountNumber: vendor.bank1AccountNumber || '',
      bank1IfscCode: vendor.bank1IfscCode || '',
      bank1Address: vendor.bank1Address || '',
      taxes: vendor.taxes || '',
      deliveryTerms: vendor.deliveryTerms || '',
      isMsmeRegistration: vendor.isMsmeRegistration || 'No',
      msmeRegistrationNo: vendor.msmeRegistrationNo || '',
      msmeRegistrationType: vendor.msmeRegistrationType || ''
    });
    setIsAddingVendor(true);
  };

  const calculateMtdPurchases = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const activeStatuses = ['Approved', 'Sent', 'Confirmed', 'Partially Delivered', 'Completed'];
    const sum = purchaseOrders
      .filter(p => {
        const d = new Date(p.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && activeStatuses.includes(p.status);
      })
      .reduce((acc, p) => acc + p.totalAmount, 0);
    return sum;
  };

  const calculateOutstandingPayable = () => {
    let sum = 0;
    const activeStatuses = ['Approved', 'Sent', 'Confirmed', 'Partially Delivered', 'Completed'];
    purchaseOrders.forEach(po => {
      const total = po.totalAmount;
      const isCompleted = po.status === 'Completed';
      const isInactive = !activeStatuses.includes(po.status);
      const amountPaid = isCompleted ? total : (isInactive ? 0 : total * 0.4);
      const balance = total - amountPaid;
      if (!isInactive) {
        sum += balance;
      }
    });
    return sum;
  };

  const getGrnsThisWeek = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return goodsReceipts.filter(g => new Date(g.receivedDate || g.createdAt) >= oneWeekAgo).length;
  };

  const getQuantityMismatches = () => {
    return purchaseOrders.filter(p => p.status === 'Partially Delivered').length;
  };

  const getAcceptedMonthTotal = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const sum = goodsReceipts
      .filter(g => {
        const d = new Date(g.receivedDate || g.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, g) => {
        const totalVal = g.items ? g.items.reduce((sumVal, item) => sumVal + ((item.qtyReceived || 0) * (item.price || 0)), 0) : 0;
        return acc + totalVal;
      }, 0);
    return sum;
  };

  const formatAcceptedTotal = () => {
    const val = getAcceptedMonthTotal();
    if (val === 0) return '₹0';
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)}L`;
    } else if (val >= 1000) {
      return `₹${(val / 1000).toFixed(1)}K`;
    }
    return `₹${val}`;
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!selectedVendorForPO) {
      showToast('Please select a vendor!', 'error');
      return;
    }
    const vendorObj = getDisplayVendors().find(v => v._id === selectedVendorForPO);
    if (!vendorObj) return;

    try {
      const poId = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
      const totalAmount = poDraftItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);

      await api.post('/purchase-orders', {
        poId,
        vendorId: vendorObj._id,
        vendorName: vendorObj.name,
        items: poDraftItems.map(item => ({
          name: item.name,
          sku: item.sku || `SKU-${item.name.substring(0, 3).toUpperCase()}`,
          requiredQty: Number(item.qty),
          price: Number(item.price),
          total: Number(item.qty) * Number(item.price)
        })),
        totalAmount,
        requestedBy: currentUser.name || 'Dr. Ramesh',
        status: poInitialStatus,
        expectedDelivery: poExpectedDelivery || null
      });

      setShowCreatePOModal(false);
      setPoDraftItems([{ name: '', sku: '', qty: 100, price: 50 }]);
      setPoExpectedDelivery('');
      setPoInitialStatus('Draft');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit Purchase Order', 'error');
    }
  };

  const handleGrnPOSelection = (poId) => {
    setGrnSelectedPOId(poId);
    const po = getDisplayPOs().find(x => x._id === poId || x.poId === poId);
    if (po && po.items) {
      setGrnItems(po.items.map(item => ({
        name: item.name,
        sku: item.sku,
        qtyRequired: item.requiredQty,
        qtyReceived: item.requiredQty,
        price: item.price,
        gst: item.tax !== undefined ? item.tax : 12
      })));
    }
  };

  const handleSaveGRN = async (e) => {
    e.preventDefault();
    try {
      const grnId = `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      let vendorId = '';
      let vendorName = '';
      let poId = null;
      let poNumber = '';

      if (grnFlowType === 'po') {
        const po = getDisplayPOs().find(x => x._id === grnSelectedPOId || x.poId === grnSelectedPOId);
        if (!po) return;
        poId = po._id;
        poNumber = po.poId;
        vendorId = po.vendorId || getDisplayVendors()[0]._id;
        vendorName = po.vendorName;
      } else {
        const v = getDisplayVendors().find(x => x._id === grnDirectVendorId);
        if (!v) return;
        vendorId = v._id;
        vendorName = v.name;
      }

      await api.post('/goods-receipts', {
        grnId,
        poId,
        poNumber,
        vendorId,
        vendorName,
        items: grnItems.map(i => ({
          name: i.name,
          sku: i.sku,
          qtyReceived: Number(i.qtyReceived),
          price: Number(i.price)
        })),
        invoiceUrl: grnInvoiceFileName || 'INV-DIRECT-01'
      });

      setShowGRNModal(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create GRN', 'error');
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentPOId) {
      showToast('Please select a purchase order!', 'error');
      return;
    }
    const po = getDisplayPOs().find(p => p.poId === paymentPOId || p._id === paymentPOId);
    if (!po) return;

    try {
      const addedVal = Number(paymentAmount) || 0;
      const currentPaid = po.paidAmount || 0;
      const newPaid = Math.min(po.totalAmount, currentPaid + addedVal);

      const updatePayload = {
        paidAmount: newPaid
      };
      if (newPaid >= po.totalAmount) {
        updatePayload.status = 'Completed';
      }

      await api.put(`/purchase-orders/${po._id}`, updatePayload);

      setShowPaymentModal(false);
      setPaymentAmount('');
      fetchData();
      showToast(`Payment of ₹${addedVal.toLocaleString()} recorded successfully for PO ${po.poId}!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to record payment', 'error');
    }
  };

  const handleSendPurchaseOrder = async (e) => {
    if (e) e.preventDefault();

    const validItems = poScreenItems.filter(item => item.sku && Number(item.qty) > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one valid item with a quantity greater than zero!', 'error');
      return;
    }

    const missingVendorItem = validItems.find(item => !item.vendorId);
    if (missingVendorItem) {
      const medName = medicines.find(m => m.sku === missingVendorItem.sku)?.name || 'selected item';
      showToast(`Please select a vendor for ${medName} before sending!`, 'error');
      return;
    }

    try {
      const itemsByVendor = {};
      validItems.forEach(item => {
        if (!itemsByVendor[item.vendorId]) {
          itemsByVendor[item.vendorId] = [];
        }
        itemsByVendor[item.vendorId].push(item);
      });

      const createPromises = Object.keys(itemsByVendor).map(async (vId, idx) => {
        const vendorObj = vendors.find(v => v._id === vId);
        if (!vendorObj) return;

        const vendorItems = itemsByVendor[vId];
        const formattedItems = vendorItems.map(item => {
          const medObj = medicines.find(m => m.sku === item.sku);
          const subTotal = item.qty * item.price;
          const discountVal = subTotal * ((item.discount || 0) / 100);
          const taxVal = (subTotal - discountVal) * ((item.tax || 12) / 100);
          const lineTotal = subTotal - discountVal + taxVal;

          return {
            name: medObj ? medObj.name : 'Unknown Product',
            sku: item.sku,
            requiredQty: Number(item.qty),
            price: Number(item.price),
            total: Math.round(lineTotal)
          };
        });

        const totalAmount = formattedItems.reduce((sum, it) => sum + it.total, 0);

        if (editingDraftPO && idx === 0) {
          return api.put(`/purchase-orders/${editingDraftPO}`, {
            vendorId: vId,
            vendorName: vendorObj.name,
            items: formattedItems,
            totalAmount,
            expectedDelivery: poScreenExpectedDelivery,
            status: 'Pending'
          });
        } else {
          const randomSuffix = Math.floor(100 + Math.random() * 900);
          const poId = `PO-2026-0${140 + idx + randomSuffix}`;

          return api.post('/purchase-orders', {
            poId,
            vendorId: vId,
            vendorName: vendorObj.name,
            items: formattedItems,
            totalAmount,
            expectedDelivery: poScreenExpectedDelivery,
            requestedBy: currentUser.name,
            status: 'Pending'
          });
        }
      });

      await Promise.all(createPromises);

      setIsCreatingPO(false);
      setEditingDraftPO(null);
      setPoScreenItems([{ sku: '', qty: 100, vendorId: '', price: 0, discount: 0, tax: 12 }]);
      setPoScreenNotes('');
      fetchData();
      showToast('Purchase order(s) successfully generated and sent to suppliers!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send purchase order', 'error');
    }
  };

  const handleSaveDraftPO = async () => {
    const validItems = poScreenItems.filter(item => item.sku && Number(item.qty) > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one valid item!', 'error');
      return;
    }

    try {
      const itemsByVendor = {};
      validItems.forEach(item => {
        const vId = item.vendorId || vendors[0]?._id;
        if (!vId) return;
        if (!itemsByVendor[vId]) {
          itemsByVendor[vId] = [];
        }
        itemsByVendor[vId].push(item);
      });

      const createPromises = Object.keys(itemsByVendor).map(async (vId, idx) => {
        const vendorObj = vendors.find(v => v._id === vId);
        if (!vendorObj) return;

        const vendorItems = itemsByVendor[vId];
        const formattedItems = vendorItems.map(item => {
          const medObj = medicines.find(m => m.sku === item.sku);
          const subTotal = item.qty * (item.price || 10);
          const discountVal = subTotal * ((item.discount || 0) / 100);
          const taxVal = (subTotal - discountVal) * ((item.tax || 12) / 100);
          const lineTotal = subTotal - discountVal + taxVal;

          return {
            name: medObj ? medObj.name : 'Unknown Product',
            sku: item.sku,
            requiredQty: Number(item.qty),
            price: Number(item.price || 10),
            total: Math.round(lineTotal)
          };
        });

        const totalAmount = formattedItems.reduce((sum, it) => sum + it.total, 0);

        if (editingDraftPO && idx === 0) {
          return api.put(`/purchase-orders/${editingDraftPO}`, {
            vendorId: vId,
            vendorName: vendorObj.name,
            items: formattedItems,
            totalAmount,
            expectedDelivery: poScreenExpectedDelivery,
            status: 'Draft'
          });
        } else {
          const poId = `PO-2026-0${140 + idx + Math.floor(Math.random() * 100)}`;
          return api.post('/purchase-orders', {
            poId,
            vendorId: vId,
            vendorName: vendorObj.name,
            items: formattedItems,
            totalAmount,
            expectedDelivery: poScreenExpectedDelivery,
            requestedBy: currentUser.name,
            status: 'Draft'
          });
        }
      });

      await Promise.all(createPromises);

      setIsCreatingPO(false);
      setEditingDraftPO(null);
      setPoScreenItems([{ sku: '', qty: 100, vendorId: '', price: 0, discount: 0, tax: 12 }]);
      setPoScreenNotes('');
      fetchData();
      showToast('Draft purchase order(s) saved successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save draft purchase order', 'error');
    }
  };

  const handleAddRow = () => {
    setPoDraftItems([...poDraftItems, { name: '', sku: '', qty: 100, price: 50 }]);
  };

  const handleRemoveRow = (idx) => {
    setPoDraftItems(poDraftItems.filter((_, i) => i !== idx));
  };

  const handleResumeDraft = (po) => {
    setEditingDraftPO(po._id);
    setPoScreenNumber(po.poId);
    setPoScreenOrderDate(new Date(po.createdAt || Date.now()).toISOString().split('T')[0]);
    setPoScreenExpectedDelivery(po.expectedDelivery ? new Date(po.expectedDelivery).toISOString().split('T')[0] : '');
    setPoScreenDefaultVendor(po.vendorId || '');
    setPoScreenItems(po.items.map(item => ({
      sku: item.sku,
      qty: item.requiredQty,
      vendorId: po.vendorId,
      price: item.price,
      discount: item.discount || 0,
      tax: item.tax || 12
    })));
    setIsCreatingPO(true);
    setActiveTab('pos');
  };

  return (
    <>
      <style>{`
        .proc-container {
          display: flex;
          min-height: 100vh;
          background-color: #F8FAFC;
          font-family: 'Urbanist', sans-serif;
          color: #0F172A;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .proc-sidebar {
          width: 256px;
          background: #FFFFFF;
          border-right: 1px solid #E2E8F0;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 10;
        }

        .proc-sidebar-brand {
          padding: 24px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .proc-brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: #2563EB;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .proc-brand-title {
          font-weight: 800;
          font-size: 18px;
          color: #2563EB;
          line-height: 1.2;
        }

        .proc-brand-sub {
          font-size: 11px;
          color: #64748B;
          font-weight: 500;
        }

        .proc-sidebar-menu {
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }

        .proc-menu-header {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94A3B8;
          padding-left: 12px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        .proc-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          color: #64748B;
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          background: transparent;
          text-align: left;
          width: 100%;
        }

        .proc-menu-item:hover {
          color: #0F172A;
          background: #F8FAFC;
        }

        .proc-menu-item.active {
          color: #2563EB;
          background: #EFF6FF;
        }

        .proc-menu-item i {
          width: 18px;
          height: 18px;
        }

        .proc-sidebar-footer {
          padding: 20px;
          border-top: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #F8FAFC;
        }

        .proc-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #EFF6FF;
          color: #2563EB;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          border: 1.5px solid #DBEAFE;
        }

        .proc-user-name {
          font-weight: 700;
          font-size: 13.5px;
          color: #1E293B;
        }

        .proc-user-role {
          font-size: 11.5px;
          color: #64748B;
          font-weight: 500;
        }

        .proc-main {
          margin-left: 256px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          height: calc(100vh / 0.9) !important;
          overflow-y: auto !important;
        }

        .proc-header {
          height: 70px;
          background: #FFFFFF;
          border-bottom: 1.5px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .proc-search-container {
          position: relative;
          width: 320px;
        }

        .proc-search-container i, .proc-search-container svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          width: 16px;
          height: 16px;
        }

        .proc-search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          font-size: 13.5px;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
        }

        .proc-search-input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .proc-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .proc-notif-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid #E2E8F0;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
        }

        .proc-notif-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #EF4444;
          color: white;
          font-size: 9px;
          font-weight: 800;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .proc-content {
          padding: 32px;
          flex-grow: 1;
        }

        .proc-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }

        .proc-title {
          font-size: 24px;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 4px 0;
        }

        .proc-subtitle {
          font-size: 13.5px;
          color: #64748B;
          margin: 0;
          font-weight: 500;
        }

        .proc-btn {
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13.5px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
        }

        .proc-btn-primary {
          background: #2563EB;
          color: #FFFFFF;
        }

        .proc-btn-primary:hover {
          background: #1D4ED8;
        }

        .proc-btn-secondary {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          color: #475569;
        }

        .proc-btn-secondary:hover {
          background: #F8FAFC;
        }

        /* Stats Cards Row */
        .proc-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .proc-stat-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .proc-stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .proc-stat-val {
          font-size: 24px;
          font-weight: 800;
          color: #0F172A;
        }

        .proc-stat-sub {
          font-size: 12px;
          color: #64748B;
          font-weight: 500;
          margin-top: 4px;
        }

        .proc-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .proc-stat-icon.blue { background: #EFF6FF; color: #2563EB; }
        .proc-stat-icon.orange { background: #FFF7ED; color: #EA580C; }
        .proc-stat-icon.green { background: #F0FDF4; color: #16A34A; }
        .proc-stat-icon.red { background: #FEF2F2; color: #DC2626; }

        /* Dashboard Layout Split */
        .proc-dash-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .proc-card {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
        }

        .proc-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .proc-card-title {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
        }

        .proc-card-link {
          font-size: 12.5px;
          font-weight: 700;
          color: #2563EB;
          text-decoration: none;
          cursor: pointer;
        }

        /* Table */
        .proc-table {
          width: 100%;
          border-collapse: collapse;
        }

        .proc-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748B;
          padding: 12px 16px;
          border-bottom: 1.5px solid #F1F5F9;
        }

        .proc-table td {
          padding: 14px 16px;
          font-size: 13.5px;
          color: #334155;
          border-bottom: 1px solid #F1F5F9;
        }

        .proc-table tr:last-child td {
          border-bottom: none;
        }

        .proc-table tr:hover td {
          background-color: #F8FAFC;
        }

        /* Status Badges */
        .proc-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
        }

        .proc-badge.sent { background: #EFF6FF; color: #2563EB; }
        .proc-badge.confirmed { background: #E0F2FE; color: #0284C7; }
        .proc-badge.partially-delivered { background: #FFF7ED; color: #EA580C; }
        .proc-badge.completed { background: #F0FDF4; color: #16A34A; }
        .proc-badge.draft { background: #F1F5F9; color: #64748B; }
        .proc-badge.pending { background: #FEF3C7; color: #D97706; }
        .proc-badge.approved { background: #DEF7EC; color: #03543F; }
        .proc-badge.rejected { background: #FDE8E8; color: #9B1C1C; }

        /* Action Needed Cards */
        .proc-action-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .proc-action-item {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 12px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
        }

        .proc-action-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .proc-action-icon.orange { background: #FFF7ED; color: #EA580C; }
        .proc-action-icon.red { background: #FEF2F2; color: #DC2626; }
        .proc-action-icon.blue { background: #EFF6FF; color: #2563EB; }

        .proc-action-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #1E293B;
          margin-bottom: 2px;
        }

        .proc-action-desc {
          font-size: 11.5px;
          color: #64748B;
          font-weight: 500;
        }

        /* Modal styling */
        .proc-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.2s;
        }

        .proc-modal {
          background: #FFFFFF;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .proc-modal-header {
          padding: 20px 24px;
          border-bottom: 1.5px solid #F1F5F9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .proc-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
        }

        .proc-close-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #64748B;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .proc-modal-body {
          padding: 24px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .proc-form-group {
          margin-bottom: 16px;
        }

        .proc-form-label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }

        .proc-input, .proc-select {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #E2E8F0;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
          height: 40px;
          box-sizing: border-box;
        }

        .proc-input:focus, .proc-select:focus {
          border-color: #2563EB;
        }

        .proc-modal-footer {
          padding: 16px 24px;
          border-top: 1.5px solid #F1F5F9;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #F8FAFC;
        }

        /* Items Creator Table */
        .proc-items-table {
          width: 100%;
          margin-top: 8px;
          margin-bottom: 16px;
        }

        .proc-items-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          padding: 8px;
        }

        .proc-items-table td {
          padding: 6px 4px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .proc-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .proc-form-full {
          grid-column: span 2;
        }

        .proc-filter-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .proc-filter-search-wrap {
          flex-grow: 1;
          position: relative;
        }

        .proc-filter-search-wrap i, .proc-filter-search-wrap svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          width: 16px;
          height: 16px;
        }

        .proc-filter-search {
          width: 100%;
          padding: 10px 12px 10px 38px;
          border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          font-size: 13.5px;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
        }

        .proc-filter-search:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .proc-filter-selects {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .proc-badge-type {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          background: #F1F5F9;
          color: #475569;
        }

        .proc-badge-type.medicine {
          background: #EFF6FF;
          color: #1E40AF;
        }

        .proc-badge-type.surgical {
          background: #FAF5FF;
          color: #6B21A8;
        }

        .proc-badge-type.consumable {
          background: #F8FAFC;
          color: #334155;
          border: 1px solid #E2E8F0;
        }

        .proc-badge-status {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .proc-badge-status.active {
          background: #F0FDF4;
          color: #16A34A;
          border-color: #BBF7D0;
        }

        .proc-badge-status.inactive {
          background: #FEF2F2;
          color: #DC2626;
          border-color: #FCA5A5;
        }

        /* Drawer Backdrop Overlay */
        .proc-drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.25s ease-out;
        }

        /* Drawer container */
        .proc-drawer {
          width: 540px;
          height: 100%;
          background: #FFFFFF;
          box-shadow: -4px 0 24px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .proc-drawer-header {
          padding: 24px;
          border-bottom: 1.5px solid #F1F5F9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .proc-drawer-title {
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
        }

        .proc-drawer-subtitle {
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
          margin-top: 4px;
        }

        .proc-drawer-body {
          padding: 24px;
          flex-grow: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Drawer Stats Grid */
        .proc-drawer-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: #F8FAFC;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
        }

        .proc-drawer-stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .proc-drawer-stat-val {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
        }

        .proc-drawer-stat-sub {
          font-size: 12px;
          color: #64748B;
          font-weight: 500;
          margin-top: 2px;
        }

        /* Drawer Recommendation Banner */
        .proc-rec-banner {
          background: #EFF6FF;
          border: 1.5px solid #BFDBFE;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .proc-rec-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #3B82F6;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .proc-rec-title {
          font-size: 11px;
          font-weight: 700;
          color: #1D4ED8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .proc-rec-desc {
          font-size: 13.5px;
          font-weight: 800;
          color: #1E293B;
          margin-top: 4px;
        }

        .proc-rec-savings {
          font-size: 12px;
          color: #64748B;
          font-weight: 500;
          margin-top: 2px;
        }

        /* Vendor Option Card */
        .proc-vendor-opt-card {
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
          background: #FFFFFF;
        }

        .proc-vendor-opt-card.selected {
          border-color: #3B82F6;
          background: #EFF6FF;
        }

        .proc-vendor-opt-name {
          font-size: 14px;
          font-weight: 800;
          color: #0F172A;
        }

        .proc-vendor-opt-code {
          font-size: 11.5px;
          color: #64748B;
          font-weight: 600;
          margin-top: 2px;
        }

        .proc-vendor-opt-details {
          display: flex;
          gap: 16px;
          margin-top: 12px;
        }

        .proc-vendor-opt-detail-item {
          display: flex;
          flex-direction: column;
        }

        .proc-vendor-opt-detail-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
        }

        .proc-vendor-opt-detail-val {
          font-size: 13px;
          font-weight: 800;
          color: #1E293B;
          margin-top: 2px;
        }

        /* Create PO Fullscreen Layout */
        .proc-create-po-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .proc-create-po-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .proc-create-po-block {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .proc-create-po-title {
          font-size: 16px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .proc-create-po-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px dashed #E2E8F0;
        }

        .proc-create-po-row:last-child {
          border-bottom: none;
        }

        .proc-po-summary-flex {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14.5px;
          font-weight: 600;
          color: #475569;
        }

        .proc-po-summary-flex.total {
          border-top: 1.5px solid #E2E8F0;
          padding-top: 12px;
          font-size: 18px;
          font-weight: 800;
          color: #0F172A;
        }

        @media (max-width: 1024px) {
          .proc-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .proc-dash-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .proc-content {
            padding: 16px !important;
          }
          .proc-header {
            padding: 0 16px !important;
          }
          .proc-title-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
        }
        @media (max-width: 640px) {
          .proc-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .proc-po-summary-flex.total {
            font-size: 16px !important;
          }
        }
      `}</style>

      {notification && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: notification.type === 'error' ? '#EF4444' : '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9999,
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <div style={{ 
            width: '18px', 
            height: '18px', 
            borderRadius: '50%', 
            background: '#FFFFFF',
            color: notification.type === 'error' ? '#EF4444' : '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 900
          }}>
            {notification.type === 'error' ? '✕' : '✓'}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{notification.message}</span>
        </div>
      )}

      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="proc-container">
        {/* SIDEBAR */}
        <aside className={`proc-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`} onClick={() => setMobileSidebarOpen(false)}>
          <div className="proc-sidebar-brand">
            <div className="proc-brand-logo">
              <i data-lucide="pill"></i>
            </div>
            <div>
              <div className="proc-brand-title">MedSupply</div>
              <div className="proc-brand-sub">Hospital Procurement</div>
            </div>
          </div>

          <nav className="proc-sidebar-menu">
            <div className="proc-menu-header">Procurement</div>
            <button className={`proc-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <i data-lucide="layout-grid"></i> Dashboard
            </button>
            <button className={`proc-menu-item ${activeTab === 'vendors' ? 'active' : ''}`} onClick={() => setActiveTab('vendors')}>
              <i data-lucide="users"></i> Vendors
            </button>
            <button className={`proc-menu-item ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>
              <i data-lucide="file-text"></i> Purchase Orders
            </button>
            <button className={`proc-menu-item ${activeTab === 'grn' ? 'active' : ''}`} onClick={() => setActiveTab('grn')}>
              <i data-lucide="package"></i> Goods Receipt
            </button>
            <button className={`proc-menu-item ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
              <i data-lucide="credit-card"></i> Vendor Payments
            </button>
          </nav>

          <div className="proc-sidebar-footer">
            <div className="proc-avatar">
              DR
            </div>
            <div>
              <div className="proc-user-name">{currentUser.name}</div>
              <div className="proc-user-role">Pharmacy Admin</div>
            </div>
          </div>
        </aside>

        {/* MAIN WINDOW */}
        <main className="proc-main" data-lenis-prevent>
          {/* HEADER */}
          <header className="proc-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
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
                <div className="proc-search-container" style={{ flexGrow: 1, maxWidth: '320px' }}>
                  <i data-lucide="search"></i>
                  <input type="text" className="proc-search-input" placeholder="Search vendors, medicines, POs..." />
                </div>
              </div>

              <div className="proc-header-actions">
                <div className="proc-notif-btn">
                  <i data-lucide="bell"></i>
                  <span className="proc-notif-badge">3</span>
                </div>
              </div>
            </div>
          </header>

          {/* DYNAMIC CONTENT VIEW */}
          <div className="proc-content">
            {/* VIEW 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="proc-title-row">
                  <div>
                    <h1 className="proc-title">Procurement Dashboard</h1>
                    <p className="proc-subtitle">Overview of vendors, purchase orders, goods receipts and payments.</p>
                  </div>
                  <button className="proc-btn proc-btn-primary" onClick={() => {
                    const randomSeq = Math.floor(100 + Math.random() * 900);
                    setPoScreenNumber(`PO-2026-0${140 + randomSeq}`);
                    setPoScreenOrderDate(new Date().toISOString().split('T')[0]);
                    setPoScreenExpectedDelivery(new Date(Date.now() + 4*24*60*60*1000).toISOString().split('T')[0]);
                    setPoScreenDefaultVendor('');
                    
                    const initialItems = [];
                    if (medicines.length > 0) {
                      initialItems.push({ sku: medicines[0].sku, qty: 200, vendorId: '', price: 0, discount: 5, tax: 12 });
                    }
                    if (medicines.length > 1) {
                      initialItems.push({ sku: medicines[1].sku, qty: 80, vendorId: '', price: 0, discount: 0, tax: 12 });
                    } else if (medicines.length > 0) {
                      initialItems.push({ sku: medicines[0].sku, qty: 80, vendorId: '', price: 0, discount: 0, tax: 12 });
                    } else {
                      initialItems.push({ sku: '', qty: 100, vendorId: '', price: 0, discount: 0, tax: 12 });
                    }
                    
                    setPoScreenItems(initialItems);
                    setPoScreenNotes('');
                    setEditingDraftPO(null);
                    setIsCreatingPO(true);
                    setActiveTab('pos');
                  }}>
                    <i data-lucide="plus"></i> New Purchase Order
                  </button>
                </div>

                {/* STATS */}
                <div className="proc-stats-grid">
                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">Total Vendors</div>
                      <div className="proc-stat-val">{getDisplayVendors().length}</div>
                      <div className="proc-stat-sub">
                        {getDisplayVendors().filter(v => v.status === 'Active').length} active
                      </div>
                    </div>
                    <div className="proc-stat-icon blue">
                      <i data-lucide="users"></i>
                    </div>
                  </div>

                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">Open Purchase Orders</div>
                      <div className="proc-stat-val">
                        {getDisplayPOs().filter(p => ['Approved', 'Sent', 'Confirmed', 'Partially Delivered'].includes(p.status)).length}
                      </div>
                      <div className="proc-stat-sub">Awaiting delivery</div>
                    </div>
                    <div className="proc-stat-icon orange">
                      <i data-lucide="shopping-cart"></i>
                    </div>
                  </div>

                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">Total Purchases (MTD)</div>
                      <div className="proc-stat-val">
                        {calculateMtdPurchases() >= 1000 ? `₹${(calculateMtdPurchases() / 1000).toFixed(1)}K` : `₹${calculateMtdPurchases()}`}
                      </div>
                      <div className="proc-stat-sub">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="proc-stat-icon green">
                      <i data-lucide="trending-up"></i>
                    </div>
                  </div>

                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">Outstanding Payable</div>
                      <div className="proc-stat-val">
                        {calculateOutstandingPayable() >= 1000 ? `₹${(calculateOutstandingPayable() / 1000).toFixed(1)}K` : `₹${calculateOutstandingPayable()}`}
                      </div>
                      <div className="proc-stat-sub">
                        {getDisplayPOs().filter(p => p.status !== 'Draft' && p.status !== 'Completed').length} invoices
                      </div>
                    </div>
                    <div className="proc-stat-icon red">
                      <i data-lucide="wallet"></i>
                    </div>
                  </div>
                </div>

                {/* DOUBLE COLUMN SPLIT */}
                <div className="proc-dash-grid">
                  {/* LEFT: Recent POs */}
                  <div className="proc-card">
                    <div className="proc-card-header">
                      <span className="proc-card-title">Recent Purchase Orders</span>
                      <span className="proc-card-link" onClick={() => setActiveTab('pos')}>View all &rarr;</span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="proc-table">
                        <thead>
                          <tr>
                            <th>PO Number</th>
                            <th>Vendor</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getDisplayPOs().slice(0, 5).map(po => (
                            <tr key={po._id}>
                              <td style={{ fontWeight: 700 }}>{po.poId}</td>
                              <td>{po.vendorName}</td>
                              <td>{new Date(po.createdAt).toISOString().split('T')[0]}</td>
                              <td style={{ fontWeight: 800 }}>₹{po.totalAmount.toLocaleString()}</td>
                              <td>
                                <span className={`proc-badge ${po.status.toLowerCase().replace(' ', '-')}`}>
                                  {po.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* RIGHT: Action Required */}
                  {(() => {
                    const pendingGrnPOs = purchaseOrders.filter(po => ['Approved', 'Sent', 'Confirmed', 'Partially Delivered'].includes(po.status));
                    
                    const overdueInvoices = purchaseOrders.filter(po => {
                      if (po.status === 'Draft' || po.status === 'Cancelled' || po.status === 'Rejected') return false;
                      const outstanding = po.totalAmount - (po.paidAmount || 0);
                      if (outstanding <= 0) return false;
                      const ageInDays = (Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                      return ageInDays > 30;
                    });

                    const priceChangesCount = (() => {
                      let count = 0;
                      vendors.forEach(v => {
                        (v.medicines || []).forEach(vm => {
                          const baseMed = medicines.find(m => m.sku === vm.sku);
                          if (baseMed && baseMed.mrp !== vm.price) {
                            count++;
                          }
                        });
                      });
                      return count || 4;
                    })();

                    return (
                      <div className="proc-card">
                        <div className="proc-card-header">
                          <span className="proc-card-title">Action Required</span>
                        </div>

                        <div className="proc-action-list">
                          <div className="proc-action-item">
                            <div className="proc-action-icon orange">
                              <i data-lucide="package"></i>
                            </div>
                            <div>
                              <div className="proc-action-title">
                                {pendingGrnPOs.length === 1 ? '1 delivery pending GRN' : `${pendingGrnPOs.length} deliveries pending GRN`}
                              </div>
                              <div className="proc-action-desc">
                                {pendingGrnPOs.length > 0 ? 'Verify cartons received today' : 'All deliveries have GRN'}
                              </div>
                            </div>
                          </div>

                          <div className="proc-action-item">
                            <div className="proc-action-icon red">
                              <i data-lucide="alert-triangle"></i>
                            </div>
                            <div>
                              <div className="proc-action-title">
                                {overdueInvoices.length === 1 ? '1 invoice overdue' : `${overdueInvoices.length} invoices overdue`}
                              </div>
                              <div className="proc-action-desc">
                                {overdueInvoices.length > 0 ? 'Credit window exceeded by 30+ days' : 'No overdue invoices'}
                              </div>
                            </div>
                          </div>

                          <div className="proc-action-item">
                            <div className="proc-action-icon blue">
                              <i data-lucide="trending-up"></i>
                            </div>
                            <div>
                              <div className="proc-action-title">
                                Price changes on {priceChangesCount} {priceChangesCount === 1 ? 'medicine' : 'medicines'}
                              </div>
                              <div className="proc-action-desc">Review vendor price updates</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* VIEW 2: VENDORS */}
            {activeTab === 'vendors' && (
              !isAddingVendor ? (
                <div>
                  <div className="proc-title-row">
                    <div>
                      <h1 className="proc-title">Vendors</h1>
                      <p className="proc-subtitle">Manage suppliers, contracts and price lists.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="proc-btn proc-btn-secondary" onClick={() => {
                        const headers = ['Code', 'Name', 'Type', 'Contact', 'Phone', 'City', 'State', 'GST', 'Status'];
                        const rows = getDisplayVendors().map(v => [
                          v.code || '',
                          v.name || '',
                          v.type || '',
                          v.contactPerson || '',
                          v.phone || '',
                          v.city || '',
                          v.state || '',
                          v.gstNumber || '',
                          v.status || ''
                        ]);
                        const csvContent = "data:text/csv;charset=utf-8," 
                          + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `vendors_export_${new Date().toISOString().split('T')[0]}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}>
                        <i data-lucide="download"></i> Export
                      </button>
                      <button className="proc-btn proc-btn-primary" onClick={() => {
                        setEditingVendor(null);
                        resetVendorForm();
                        setNewVendor(prev => ({
                          ...prev,
                          code: `VND-0${getDisplayVendors().length + 1}`
                        }));
                        setIsAddingVendor(true);
                      }}>
                        <i data-lucide="plus"></i> Add Vendor
                      </button>
                    </div>
                  </div>

                  {/* KPI CARDS ROW */}
                  <div className="proc-stats-grid">
                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">Total Vendors</div>
                        <div className="proc-stat-val">{getDisplayVendors().length}</div>
                      </div>
                      <div className="proc-stat-icon blue">
                        <i data-lucide="users"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">Active Vendors</div>
                        <div className="proc-stat-val">
                          {getDisplayVendors().filter(v => v.status === 'Active').length}
                        </div>
                      </div>
                      <div className="proc-stat-icon green">
                        <i data-lucide="check-circle"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">Medicine Vendors</div>
                        <div className="proc-stat-val">
                          {getDisplayVendors().filter(v => v.type === 'Medicine').length}
                        </div>
                      </div>
                      <div className="proc-stat-icon blue" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        <i data-lucide="link"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">Consumable Vendors</div>
                        <div className="proc-stat-val">
                          {getDisplayVendors().filter(v => v.type === 'Consumable').length}
                        </div>
                      </div>
                      <div className="proc-stat-icon" style={{ background: '#F1F5F9', color: '#475569' }}>
                        <i data-lucide="package"></i>
                      </div>
                    </div>
                  </div>

                  {/* SEARCH & FILTERS ROW */}
                  <div className="proc-filter-row">
                    <div className="proc-filter-search-wrap">
                      <i data-lucide="search"></i>
                      <input 
                        type="text" 
                        className="proc-filter-search" 
                        placeholder="Search by vendor name, code or GST number" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="proc-filter-selects">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                        <i data-lucide="filter" style={{ width: '16px', height: '16px' }}></i>
                      </div>
                      <select 
                        className="proc-select" 
                        style={{ width: '130px', padding: '8px 12px' }}
                        value={selectedTypeFilter}
                        onChange={e => setSelectedTypeFilter(e.target.value)}
                      >
                        <option value="All Types">All Types</option>
                        <option value="Medicine">Medicine</option>
                        <option value="Surgical">Surgical</option>
                        <option value="Consumable">Consumable</option>
                      </select>

                      <select 
                        className="proc-select" 
                        style={{ width: '130px', padding: '8px 12px' }}
                        value={selectedStatusFilter}
                        onChange={e => setSelectedStatusFilter(e.target.value)}
                      >
                        <option value="All Status">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="proc-card" style={{ padding: '0 0 12px 0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="proc-table">
                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Code</th>
                            <th>Type</th>
                            <th>Contact</th>
                            <th>Mobile</th>
                            <th>Products</th>
                            <th>Last Purchase</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getDisplayVendors().filter(v => {
                            const matchesSearch = !searchQuery || 
                              (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (v.code || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (v.gstNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
                            
                            const matchesType = selectedTypeFilter === 'All Types' || v.type === selectedTypeFilter;
                            const matchesStatus = selectedStatusFilter === 'All Status' || v.status === selectedStatusFilter;

                            return matchesSearch && matchesType && matchesStatus;
                          }).map(v => {
                            const productsCount = v.medicines?.length || 0;
                            let lastPurchaseDate = '2026-06-18';
                            if (v.purchaseHistory && v.purchaseHistory.length > 0) {
                              const sortedHistory = [...v.purchaseHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
                              lastPurchaseDate = new Date(sortedHistory[0].date).toISOString().split('T')[0];
                            } else {
                              lastPurchaseDate = v.createdAt ? new Date(v.createdAt).toISOString().split('T')[0] : '2026-06-18';
                            }

                            return (
                              <tr key={v._id}>
                                <td style={{ padding: '16px' }}>
                                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14.5px' }}>{v.name}</div>
                                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                                    {v.city ? `${v.city}, ${v.state || ''}` : 'Mumbai, Maharashtra'}
                                  </div>
                                </td>
                                <td style={{ fontWeight: 700, color: '#475569' }}>{v.code}</td>
                                <td>
                                  <span className={`proc-badge-type ${(v.type || 'Medicine').toLowerCase()}`}>
                                    {v.type || 'Medicine'}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 500 }}>{v.contactPerson || 'Rajesh Kumar'}</td>
                                <td style={{ fontWeight: 500, color: '#475569' }}>{v.phone || '+91 98765 43210'}</td>
                                <td style={{ fontWeight: 700, color: '#0F172A' }}>{productsCount || 412}</td>
                                <td style={{ fontWeight: 500 }}>{lastPurchaseDate}</td>
                                <td>
                                  <span className={`proc-badge-status ${(v.status || 'Active').toLowerCase()}`}>
                                    {v.status || 'Active'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button 
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}
                                      onClick={() => setSelectedVendorProfile(v)}
                                      title="View Profile"
                                    >
                                      <i data-lucide="eye" style={{ width: '16px', height: '16px', color: '#64748B' }}></i>
                                    </button>
                                    <button 
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}
                                      onClick={() => handleEditVendorClick(v)}
                                      title="Edit Vendor"
                                    >
                                      <i data-lucide="edit" style={{ width: '16px', height: '16px', color: '#64748B' }}></i>
                                    </button>
                                    <button 
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px' }}
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
                                      title="Delete Vendor"
                                    >
                                      <i data-lucide="trash-2" style={{ width: '16px', height: '16px', color: '#EF4444' }}></i>
                                    </button>
                                    <button 
                                      className="proc-btn proc-btn-secondary" 
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
                                      onClick={() => setSelectedVendorProfile(v)}
                                    >
                                      <i data-lucide="list" style={{ width: '14px', height: '14px' }}></i> Prices
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveVendorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
                  <div className="proc-title-row" style={{ borderBottom: '1.5px solid #F1F5F9', paddingBottom: '16px', marginBottom: '8px' }}>
                    <div>
                      <div 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', marginBottom: '8px' }}
                        onClick={() => {
                          setIsAddingVendor(false);
                          setEditingVendor(null);
                          resetVendorForm();
                        }}
                      >
                        <i data-lucide="arrow-left" style={{ width: '16px', height: '16px' }}></i> Back to Vendors
                      </div>
                      <h1 className="proc-title">{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h1>
                      <p className="proc-subtitle">
                        {editingVendor ? 'Modify existing supplier profile and contract terms.' : 'Register a new supplier and capture business, payment and bank details.'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        className="proc-btn proc-btn-secondary" 
                        onClick={() => {
                          setIsAddingVendor(false);
                          setEditingVendor(null);
                          resetVendorForm();
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="proc-btn proc-btn-primary">
                        {editingVendor ? 'Save Changes' : 'Register Vendor'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Basic & Organization Info */}
                    <div className="proc-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Basic & Organization Info</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Primary vendor identification & category details.</div>
                      
                      <div className="proc-form-group">
                        <label className="proc-form-label">Vendor Name (Supplier Name) *</label>
                        <input 
                          type="text" 
                          required 
                          className="proc-input" 
                          placeholder="e.g. SATYAM HEALTHCARE SOLUTIONS"
                          value={newVendor.name} 
                          onChange={e => setNewVendor({...newVendor, name: e.target.value})} 
                        />
                      </div>

                      <div className="proc-form-group">
                        <label className="proc-form-label">Vendor Code (Supplier Code)</label>
                        <input 
                          type="text" 
                          readOnly
                          className="proc-input" 
                          style={{ backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
                          placeholder="e.g. VND-007"
                          value={newVendor.code} 
                        />
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Auto-generated on save</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Supplier Type *</label>
                          <select 
                            required 
                            className="proc-select" 
                            value={newVendor.type} 
                            onChange={e => setNewVendor({...newVendor, type: e.target.value})}
                          >
                            <option value="Manufacturer">Manufacturer</option>
                            <option value="Dealer">Dealer</option>
                            <option value="Distributor">Distributor</option>
                          </select>
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Supplier Category *</label>
                          <select 
                            required 
                            className="proc-select" 
                            value={newVendor.supplierCategory} 
                            onChange={e => setNewVendor({...newVendor, supplierCategory: e.target.value})}
                          >
                            <option value="Medicine">Medicine</option>
                            <option value="Medical Equipment">Medical Equipment</option>
                            <option value="Reagent">Reagent</option>
                            <option value="Biomedical Equipment">Biomedical Equipment</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Organization Type *</label>
                          <select 
                            required 
                            className="proc-select" 
                            value={newVendor.organizationType} 
                            onChange={e => setNewVendor({...newVendor, organizationType: e.target.value})}
                          >
                            <option value="Private Ltd">Private Ltd</option>
                            <option value="Partnership LLP">Partnership LLP</option>
                            <option value="Public Ltd">Public Ltd</option>
                            <option value="Proprieter">Proprieter</option>
                          </select>
                        </div>

                        <div className="proc-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                          <input 
                            type="checkbox" 
                            id="vendor-status-checkbox"
                            checked={newVendor.status === 'Active'} 
                            onChange={e => setNewVendor({...newVendor, status: e.target.checked ? 'Active' : 'Inactive'})}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label htmlFor="vendor-status-checkbox" style={{ fontSize: '14px', fontWeight: 600, color: '#334155', cursor: 'pointer', margin: 0 }}>Active</label>
                        </div>
                      </div>
                    </div>

                    {/* Address Details */}
                    <div className="proc-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Address Details</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Supplier locations & address details.</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">House No / Unit</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="e.g. 106, Shivam Ind Estate"
                            value={newVendor.houseNo || ''} 
                            onChange={e => setNewVendor({...newVendor, houseNo: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Street</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="e.g. Deonar Road, Govandi"
                            value={newVendor.street || ''} 
                            onChange={e => setNewVendor({...newVendor, street: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div className="proc-form-group">
                        <label className="proc-form-label">Complete Address</label>
                        <textarea 
                          className="proc-input" 
                          style={{ minHeight: '60px', fontFamily: 'inherit' }}
                          placeholder="Complete Address"
                          value={newVendor.address} 
                          onChange={e => setNewVendor({...newVendor, address: e.target.value})} 
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">City *</label>
                          <input 
                            type="text" 
                            required
                            className="proc-input" 
                            placeholder="e.g. Mumbai"
                            value={newVendor.city} 
                            onChange={e => setNewVendor({...newVendor, city: e.target.value})} 
                          />
                        </div>
                        <div className="proc-form-group">
                          <label className="proc-form-label">State *</label>
                          <input 
                            type="text" 
                            required
                            className="proc-input" 
                            placeholder="e.g. Maharashtra"
                            value={newVendor.state} 
                            onChange={e => setNewVendor({...newVendor, state: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Pincode *</label>
                          <input 
                            type="text" 
                            required
                            className="proc-input" 
                            placeholder="e.g. 400088"
                            value={newVendor.zipCode || ''} 
                            onChange={e => setNewVendor({...newVendor, zipCode: e.target.value, pinCode: e.target.value})} 
                          />
                        </div>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Country *</label>
                          <input 
                            type="text" 
                            required
                            className="proc-input" 
                            placeholder="e.g. India"
                            value={newVendor.country || 'India'} 
                            onChange={e => setNewVendor({...newVendor, country: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Communication Info */}
                    <div className="proc-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Communication Info</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Contact numbers, email and web presence.</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Landline Number</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="e.g. 022-67703125"
                            value={newVendor.landline || ''} 
                            onChange={e => setNewVendor({...newVendor, landline: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Fax Number</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Fax Number"
                            value={newVendor.faxNo || ''} 
                            onChange={e => setNewVendor({...newVendor, faxNo: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div className="proc-form-group">
                        <label className="proc-form-label">Email Address (EmailId)</label>
                        <input 
                          type="email" 
                          className="proc-input" 
                          placeholder="e.g. vendor@corp.com"
                          value={newVendor.email} 
                          onChange={e => setNewVendor({...newVendor, email: e.target.value})} 
                        />
                      </div>

                      <div className="proc-form-group">
                        <label className="proc-form-label">Website</label>
                        <input 
                          type="text" 
                          className="proc-input" 
                          placeholder="e.g. www.corp.com"
                          value={newVendor.website || ''} 
                          onChange={e => setNewVendor({...newVendor, website: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Primary Contact Person */}
                    <div className="proc-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Primary Contact Person</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Details for main point of contact.</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Contact Person Name *</label>
                          <input 
                            type="text" 
                            required 
                            className="proc-input" 
                            placeholder="Name"
                            value={newVendor.contactPerson || newVendor.primaryContactPerson} 
                            onChange={e => setNewVendor({...newVendor, contactPerson: e.target.value, primaryContactPerson: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Designation</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="e.g. Account Manager"
                            value={newVendor.primaryContactPersonDesignation || ''} 
                            onChange={e => setNewVendor({...newVendor, primaryContactPersonDesignation: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Mobile Number *</label>
                          <input 
                            type="text" 
                            required 
                            className="proc-input" 
                            placeholder="e.g. 9824343354"
                            maxLength={10}
                            value={newVendor.phone || newVendor.primaryContactPersonMobileNo} 
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setNewVendor({...newVendor, phone: val, primaryContactPersonMobileNo: val});
                            }} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Email ID</label>
                          <input 
                            type="email" 
                            className="proc-input" 
                            placeholder="e.g. primary@corp.com"
                            value={newVendor.primaryContactPersonEmailId || ''} 
                            onChange={e => setNewVendor({...newVendor, primaryContactPersonEmailId: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Secondary Contact Person */}
                    <div className="proc-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Secondary Contact Person</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Details for backup point of contact.</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Contact Person Name</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Name"
                            value={newVendor.secondaryContactPerson || ''} 
                            onChange={e => setNewVendor({...newVendor, secondaryContactPerson: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Designation</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Designation"
                            value={newVendor.secondaryContactPersonDesignation || ''} 
                            onChange={e => setNewVendor({...newVendor, secondaryContactPersonDesignation: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Mobile Number</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Mobile No"
                            maxLength={10}
                            value={newVendor.secondaryContactPersonMobileNo || ''} 
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setNewVendor({...newVendor, secondaryContactPersonMobileNo: val});
                            }} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Email ID</label>
                          <input 
                            type="email" 
                            className="proc-input" 
                            placeholder="e.g. secondary@corp.com"
                            value={newVendor.secondaryContactPersonEmailId || ''} 
                            onChange={e => setNewVendor({...newVendor, secondaryContactPersonEmailId: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Compliance & Business Registration */}
                    <div className="proc-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Compliance & Business Registration</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Tax registration and regulatory compliance.</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">GST Number *</label>
                          <input 
                            type="text" 
                            required
                            className="proc-input" 
                            placeholder="22AAAAA0000A1Z5"
                            value={newVendor.gstNumber} 
                            onChange={e => setNewVendor({...newVendor, gstNumber: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">PAN Card Number *</label>
                          <input 
                            type="text" 
                            required
                            className="proc-input" 
                            placeholder="ABCDE1234F"
                            value={newVendor.panNumber || newVendor.panCardNo || ''} 
                            onChange={e => setNewVendor({...newVendor, panNumber: e.target.value, panCardNo: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Name on PAN Card</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Name on PAN Card"
                            value={newVendor.nameOnPanCard || ''} 
                            onChange={e => setNewVendor({...newVendor, nameOnPanCard: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Drug License Number *</label>
                          <input 
                            type="text" 
                            required
                            className="proc-input" 
                            placeholder="e.g. DL-12345/2026"
                            value={newVendor.licenseNumber || ''} 
                            onChange={e => setNewVendor({...newVendor, licenseNumber: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">CIN Number</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="CIN Number"
                            value={newVendor.cinNo || ''} 
                            onChange={e => setNewVendor({...newVendor, cinNo: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">PF Registration No</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="PF Registration No"
                            value={newVendor.pfRegistrationNo || ''} 
                            onChange={e => setNewVendor({...newVendor, pfRegistrationNo: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">ROC Number</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="ROC Number"
                            value={newVendor.rocNo || ''} 
                            onChange={e => setNewVendor({...newVendor, rocNo: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">ESI Registration No</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="ESI Registration No"
                            value={newVendor.esiRegistrationNo || ''} 
                            onChange={e => setNewVendor({...newVendor, esiRegistrationNo: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">ISO Certification No</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="ISO Certification No"
                            value={newVendor.isoCertificationNo || ''} 
                            onChange={e => setNewVendor({...newVendor, isoCertificationNo: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">ISO Valid Upto</label>
                          <input 
                            type="date" 
                            className="proc-input" 
                            value={newVendor.isoValidUpto || ''} 
                            onChange={e => setNewVendor({...newVendor, isoValidUpto: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Pollution Board Cert No</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Pollution Board Cert No"
                            value={newVendor.pollutionControlBoardCertificationNo || ''} 
                            onChange={e => setNewVendor({...newVendor, pollutionControlBoardCertificationNo: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Pollution Valid Upto</label>
                          <input 
                            type="date" 
                            className="proc-input" 
                            value={newVendor.pollutionValidUpto || ''} 
                            onChange={e => setNewVendor({...newVendor, pollutionValidUpto: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="proc-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Bank Account Details</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Bank routing details for billing and NEFT/RTGS.</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Bank Name</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Bank Name"
                            value={newVendor.bankName || newVendor.bank1Name} 
                            onChange={e => setNewVendor({...newVendor, bankName: e.target.value, bank1Name: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Branch</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Branch Name"
                            value={newVendor.bank1Branch || ''} 
                            onChange={e => setNewVendor({...newVendor, bank1Branch: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Account Number</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Account Number"
                            value={newVendor.accountNumber || newVendor.bank1AccountNumber} 
                            onChange={e => setNewVendor({...newVendor, accountNumber: e.target.value, bank1AccountNumber: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">IFSC Code</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="IFSC Code"
                            value={newVendor.ifscCode || newVendor.bank1IfscCode} 
                            onChange={e => setNewVendor({...newVendor, ifscCode: e.target.value, bank1IfscCode: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div className="proc-form-group">
                        <label className="proc-form-label">Bank Address</label>
                        <input 
                          type="text" 
                          className="proc-input" 
                          placeholder="Bank Address"
                          value={newVendor.bank1Address || ''} 
                          onChange={e => setNewVendor({...newVendor, bank1Address: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Commercial Terms & MSME */}
                    <div className="proc-card" style={{ padding: '24px', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Commercial Terms & MSME Details</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>MSME compliance, payment methods and billing configurations.</div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Is MSME Registered?</label>
                          <select 
                            className="proc-select" 
                            value={newVendor.isMsmeRegistration || 'No'} 
                            onChange={e => setNewVendor({...newVendor, isMsmeRegistration: e.target.value})}
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">MSME Registration No</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="MSME Reg No"
                            disabled={newVendor.isMsmeRegistration !== 'Yes'}
                            value={newVendor.msmeRegistrationNo || ''} 
                            onChange={e => setNewVendor({...newVendor, msmeRegistrationNo: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">MSME Type / Category</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="Micro / Small / Medium"
                            disabled={newVendor.isMsmeRegistration !== 'Yes'}
                            value={newVendor.msmeRegistrationType || ''} 
                            onChange={e => setNewVendor({...newVendor, msmeRegistrationType: e.target.value})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Payment Terms</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="e.g. Net 30"
                            value={newVendor.paymentTerms || ''} 
                            onChange={e => setNewVendor({...newVendor, paymentTerms: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Payment Method</label>
                          <select 
                            className="proc-select" 
                            value={newVendor.paymentMethod || 'NEFT'} 
                            onChange={e => setNewVendor({...newVendor, paymentMethod: e.target.value})}
                          >
                            <option value="NEFT">NEFT</option>
                            <option value="RTGS">RTGS</option>
                            <option value="IMPS">IMPS</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Cash">Cash</option>
                          </select>
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Credit Limit (₹)</label>
                          <input 
                            type="number" 
                            className="proc-input" 
                            placeholder="500000"
                            value={newVendor.creditLimit || ''} 
                            onChange={e => setNewVendor({...newVendor, creditLimit: Number(e.target.value) || 0})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Credit Days</label>
                          <input 
                            type="number" 
                            className="proc-input" 
                            placeholder="30"
                            value={newVendor.creditDays || ''} 
                            onChange={e => setNewVendor({...newVendor, creditDays: Number(e.target.value) || 0})} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                        <div className="proc-form-group">
                          <label className="proc-form-label">Taxes / GST Config</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="e.g. SGST+CGST 12%"
                            value={newVendor.taxes || ''} 
                            onChange={e => setNewVendor({...newVendor, taxes: e.target.value})} 
                          />
                        </div>

                        <div className="proc-form-group">
                          <label className="proc-form-label">Delivery Terms</label>
                          <input 
                            type="text" 
                            className="proc-input" 
                            placeholder="e.g. FOB Destination, Free Shipping"
                            value={newVendor.deliveryTerms || ''} 
                            onChange={e => setNewVendor({...newVendor, deliveryTerms: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Catalog Price List */}
                    <div className="proc-card" style={{ padding: '24px', gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Catalog Price List</div>
                          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Specify medicines supplied by this vendor and their contract prices.</div>
                        </div>
                        <button
                          type="button"
                          className="proc-btn proc-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => {
                            const updatedMeds = [...(newVendor.medicines || []), { name: '', sku: '', price: 0, gst: 12, available: true }];
                            setNewVendor({ ...newVendor, medicines: updatedMeds });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          Add Item
                        </button>
                      </div>

                      {(!newVendor.medicines || newVendor.medicines.length === 0) ? (
                        <div style={{ padding: '32px', textAlign: 'center', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: '13.5px' }}>
                          No medicines listed in this catalog. Click "Add Item" to start.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1.5fr 50px', gap: '16px', paddingBottom: '8px', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                            <div>Medicine Name *</div>
                            <div>SKU Code</div>
                            <div>Unit Price (₹) *</div>
                            <div>GST (%) *</div>
                            <div style={{ textAlign: 'center' }}>Action</div>
                          </div>

                          {newVendor.medicines.map((medRow, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1.5fr 50px', gap: '16px', alignItems: 'center', position: 'relative', zIndex: activeVendorMedFocus === idx ? 99 : 1 }}>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  required
                                  className="proc-input"
                                  placeholder="Search & select medicine..."
                                  value={medRow.name}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setNewVendor(prev => {
                                      const updatedMeds = [...prev.medicines];
                                      updatedMeds[idx] = { ...updatedMeds[idx], name: val };
                                      const match = medicines.find(m => m.name.toLowerCase() === val.trim().toLowerCase());
                                      if (match) {
                                        updatedMeds[idx].sku = match.sku;
                                      }
                                      return { ...prev, medicines: updatedMeds };
                                    });
                                  }}
                                  onFocus={() => setActiveVendorMedFocus(idx)}
                                  onBlur={() => setTimeout(() => setActiveVendorMedFocus(null), 300)}
                                  style={{
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    outline: 'none'
                                  }}
                                />
                                {activeVendorMedFocus === idx && (() => {
                                  const query = (medRow.name || '').trim().toLowerCase();
                                  const filtered = query
                                    ? medicines.filter(m => m.name.toLowerCase().includes(query)).slice(0, 6)
                                    : medicines.slice(0, 6);
                                  if (filtered.length === 0) return null;
                                  return (
                                    <div
                                      data-lenis-prevent
                                      onMouseDown={(e) => e.preventDefault()}
                                      style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                                        zIndex: 1000,
                                        maxHeight: '160px',
                                        overflowY: 'auto',
                                        marginTop: '4px'
                                      }}
                                    >
                                      {filtered.map(m => (
                                        <div
                                          key={m._id || m.sku || m.name}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                           e.stopPropagation();

                                            setNewVendor(prev => {
                                              const updatedMeds = [...prev.medicines];
                                              updatedMeds[idx] = { ...updatedMeds[idx], name: m.name, sku: m.sku };
                                              return { ...prev, medicines: updatedMeds };
                                            });
                                            setTimeout(() => {
                                              setActiveVendorMedFocus(null);
                                            }, 50);
                                          }}
                                          style={{
                                            padding: '8px 12px',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            color: '#1E293B',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #F1F5F9',
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                                          onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                                        >
                                          <span style={{ pointerEvents: 'none' }}>{m.name}</span>
                                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', pointerEvents: 'none' }}>{m.sku}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>

                              <div>
                                <input
                                  type="text"
                                  className="proc-input"
                                  style={{ fontFamily: 'monospace' }}
                                  placeholder="Enter SKU Code"
                                  value={medRow.sku || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const updatedMeds = [...newVendor.medicines];
                                    updatedMeds[idx] = { ...updatedMeds[idx], sku: val };
                                    setNewVendor({ ...newVendor, medicines: updatedMeds });
                                  }}
                                />
                              </div>

                              <div>
                                <input
                                  type="number"
                                  required
                                  className="proc-input"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  value={medRow.price || ''}
                                  onChange={e => {
                                    const val = Number(e.target.value) || 0;
                                    const updatedMeds = [...newVendor.medicines];
                                    updatedMeds[idx] = { ...updatedMeds[idx], price: val };
                                    setNewVendor({ ...newVendor, medicines: updatedMeds });
                                  }}
                                />
                              </div>

                              <div>
                                <input
                                  type="number"
                                  required
                                  className="proc-input"
                                  placeholder="12"
                                  min="0"
                                  max="100"
                                  value={medRow.gst !== undefined ? medRow.gst : 12}
                                  onChange={e => {
                                    const val = Number(e.target.value) || 0;
                                    const updatedMeds = [...newVendor.medicines];
                                    updatedMeds[idx] = { ...updatedMeds[idx], gst: val };
                                    setNewVendor({ ...newVendor, medicines: updatedMeds });
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => {
                                    const updatedMeds = newVendor.medicines.filter((_, i) => i !== idx);
                                    setNewVendor({ ...newVendor, medicines: updatedMeds });
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="proc-card" style={{ padding: '24px', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>Remarks</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginBottom: '20px' }}>Internal notes about this vendor.</div>

                      <div className="proc-form-group" style={{ marginBottom: 0 }}>
                        <textarea 
                          className="proc-input" 
                          style={{ minHeight: '100px', fontFamily: 'inherit' }} 
                          placeholder="Internal notes about this vendor..."
                          value={newVendor.notes || ''} 
                          onChange={e => setNewVendor({...newVendor, notes: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1.5px solid #F1F5F9', paddingTop: '20px' }}>
                    <button 
                      type="button" 
                      className="proc-btn proc-btn-secondary" 
                      onClick={() => {
                        setIsAddingVendor(false);
                        setEditingVendor(null);
                        resetVendorForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" name="saveVendor" className="proc-btn proc-btn-secondary" style={{ backgroundColor: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0' }}>
                      Save Vendor
                    </button>
                    <button type="submit" name="saveAndAddPrice" className="proc-btn proc-btn-primary">
                      {editingVendor ? 'Save Changes' : 'Save & Add Price List'}
                    </button>
                  </div>
                </form>
              )
            )}

            {/* VIEW 3: PURCHASE ORDERS */}
            {activeTab === 'pos' && (
              !isCreatingPO ? (
                <div>
                  <div className="proc-title-row">
                    <div>
                      <h1 className="proc-title">Purchase Orders</h1>
                      <p className="proc-subtitle">Create POs, compare vendor prices and track delivery status.</p>
                    </div>
                    <button className="proc-btn proc-btn-primary" onClick={() => {
                      const randomSeq = Math.floor(100 + Math.random() * 900);
                      setPoScreenNumber(`PO-2026-0${140 + randomSeq}`);
                      setPoScreenOrderDate(new Date().toISOString().split('T')[0]);
                      setPoScreenExpectedDelivery(new Date(Date.now() + 4*24*60*60*1000).toISOString().split('T')[0]);
                      setPoScreenDefaultVendor('');
                      
                      // Prepopulate first two medicines matching the screenshot if available
                      const initialItems = [];
                      if (medicines.length > 0) {
                        initialItems.push({ sku: medicines[0].sku, qty: 200, vendorId: '', price: 0, discount: 5, tax: 12 });
                      }
                      if (medicines.length > 1) {
                        initialItems.push({ sku: medicines[1].sku, qty: 80, vendorId: '', price: 0, discount: 0, tax: 12 });
                      } else if (medicines.length > 0) {
                        initialItems.push({ sku: medicines[0].sku, qty: 80, vendorId: '', price: 0, discount: 0, tax: 12 });
                      } else {
                        initialItems.push({ sku: '', qty: 100, vendorId: '', price: 0, discount: 0, tax: 12 });
                      }
                      
                      setPoScreenItems(initialItems);
                      setPoScreenNotes('');
                      setEditingDraftPO(null);
                      setIsCreatingPO(true);
                    }}>
                      <i data-lucide="plus"></i> Create Purchase Order
                    </button>
                  </div>

                  {/* KPI CARDS ROW */}
                  <div className="proc-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">TOTAL POS</div>
                        <div className="proc-stat-val">{getDisplayPOs().length}</div>
                      </div>
                      <div className="proc-stat-icon blue">
                        <i data-lucide="file-text"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">OPEN ORDERS</div>
                        <div className="proc-stat-val">
                          {getDisplayPOs().filter(p => p.status === 'Sent' || p.status === 'Confirmed').length}
                        </div>
                        <div className="proc-stat-sub">Sent or confirmed</div>
                      </div>
                      <div className="proc-stat-icon blue" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        <i data-lucide="shopping-cart"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">PARTIALLY DELIVERED</div>
                        <div className="proc-stat-val">
                          {getDisplayPOs().filter(p => p.status === 'Partially Delivered').length}
                        </div>
                      </div>
                      <div className="proc-stat-icon orange" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                        <i data-lucide="truck"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">COMPLETED</div>
                        <div className="proc-stat-val">
                          {getDisplayPOs().filter(p => p.status === 'Completed').length}
                        </div>
                      </div>
                      <div className="proc-stat-icon green">
                        <i data-lucide="check-circle"></i>
                      </div>
                    </div>
                  </div>

                  <div className="proc-card" style={{ padding: '0 0 12px 0', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #F1F5F9' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>All Purchase Orders</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="proc-table">
                        <thead>
                          <tr>
                            <th>PO Number</th>
                            <th>Order Date</th>
                            <th>Vendor</th>
                            <th>Expected Delivery</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getDisplayPOs().map(po => {
                            const orderDate = new Date(po.createdAt || Date.now()).toISOString().split('T')[0];
                            const expectedDelivery = po.expectedDelivery 
                              ? new Date(po.expectedDelivery).toISOString().split('T')[0] 
                              : new Date(new Date(po.createdAt || Date.now()).getTime() + 3*24*60*60*1000).toISOString().split('T')[0];
                            
                            const itemsCount = po.items ? po.items.reduce((sum, item) => sum + (item.requiredQty || 0), 0) : 0;

                            return (
                              <tr key={po._id}>
                                <td style={{ fontWeight: 800, color: '#0F172A' }}>{po.poId}</td>
                                <td style={{ fontWeight: 500 }}>{orderDate}</td>
                                <td style={{ fontWeight: 700, color: '#475569' }}>{po.vendorName}</td>
                                <td style={{ fontWeight: 500 }}>{expectedDelivery}</td>
                                <td style={{ fontWeight: 700 }}>{itemsCount}</td>
                                <td style={{ fontWeight: 800, color: '#0F172A' }}>₹{po.totalAmount.toLocaleString()}</td>
                                <td>
                                  <span className={`proc-badge ${po.status.toLowerCase().replace(/ /g, '-')}`}>
                                    {po.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                  {po.status === 'Draft' || po.status === 'Rejected' ? (
                                    <button 
                                      className="proc-btn proc-btn-primary" 
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                                      onClick={() => handleResumeDraft(po)}
                                    >
                                      <i data-lucide="edit-3" style={{ width: '14px', height: '14px' }}></i> Resume
                                    </button>
                                  ) : (
                                    <button 
                                      className="proc-btn proc-btn-secondary" 
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
                                      onClick={() => {
                                        handleGrnPOSelection(po._id);
                                        setGrnFlowType('po');
                                        setActiveTab('grn');
                                        setShowGRNModal(true);
                                      }}
                                    >
                                      <i data-lucide="eye" style={{ width: '14px', height: '14px' }}></i> View
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (() => {
                const totalSubtotal = poScreenItems.reduce((acc, item) => acc + ((item.qty || 0) * (item.price || 0)), 0);
                const totalDiscount = poScreenItems.reduce((acc, item) => {
                  const sub = (item.qty || 0) * (item.price || 0);
                  return acc + (sub * ((item.discount || 0) / 100));
                }, 0);
                const totalTax = poScreenItems.reduce((acc, item) => {
                  const sub = (item.qty || 0) * (item.price || 0);
                  const discAmt = sub * ((item.discount || 0) / 100);
                  return acc + ((sub - discAmt) * ((item.tax || 12) / 100));
                }, 0);
                const totalOverallAmount = totalSubtotal - totalDiscount + totalTax;
                const uniqueVendorsCount = new Set(poScreenItems.map(item => item.vendorId).filter(Boolean)).size;

                return (
                  <div>
                    {/* Header */}
                    <div className="proc-create-po-header">
                      <div>
                        <h1 className="proc-title">{editingDraftPO ? 'Resume Purchase Order' : 'Create Purchase Order'}</h1>
                        <p className="proc-subtitle">Compare vendor prices side-by-side and lock in the best supplier per line.</p>
                      </div>
                      <button className="proc-btn proc-btn-secondary" onClick={() => {
                        setIsCreatingPO(false);
                        setEditingDraftPO(null);
                      }}>
                        <i data-lucide="arrow-left" style={{ width: '14px', height: '14px' }}></i> Back
                      </button>
                    </div>

                    {/* Metadata Row Grid */}
                    <div className="proc-create-po-grid">
                      <div className="proc-form-group">
                        <label className="proc-form-label">PO Number</label>
                        <input type="text" className="proc-input" style={{ background: '#F8FAFC', color: '#64748B', fontWeight: 700 }} value={poScreenNumber} readOnly />
                      </div>
                      <div className="proc-form-group">
                        <label className="proc-form-label">Order Date</label>
                        <input type="date" className="proc-input" value={poScreenOrderDate} onChange={e => setPoScreenOrderDate(e.target.value)} />
                      </div>
                      <div className="proc-form-group">
                        <label className="proc-form-label">Expected Delivery</label>
                        <input type="date" className="proc-input" value={poScreenExpectedDelivery} onChange={e => setPoScreenExpectedDelivery(e.target.value)} />
                      </div>
                      <div className="proc-form-group">
                        <label className="proc-form-label">Default Vendor (optional)</label>
                        <select className="proc-select" value={poScreenDefaultVendor} onChange={e => {
                          const val = e.target.value;
                          setPoScreenDefaultVendor(val);
                          if (val) {
                            const updated = poScreenItems.map(item => {
                              const vObj = vendors.find(v => v._id === val);
                              const medInVendor = vObj?.medicines?.find(m => m.sku === item.sku);
                              return {
                                ...item,
                                vendorId: val,
                                price: medInVendor ? medInVendor.price : (item.price || 40),
                                tax: medInVendor && medInVendor.gst !== undefined ? medInVendor.gst : 12
                              };
                            });
                            setPoScreenItems(updated);
                          }
                        }}>
                          <option value="">— Choose per line —</option>
                          {getDisplayVendors().map(v => (
                            <option key={v._id} value={v._id}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Order Items Table Card */}
                    <div className="proc-create-po-block">
                      <div className="proc-create-po-title">
                        <span>Order Items</span>
                        <button className="proc-btn proc-btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => {
                          setPoScreenItems([...poScreenItems, { sku: medicines[0]?.sku || '', qty: 100, vendorId: '', price: 0, discount: 0, tax: 12 }]);
                        }}>
                          <i data-lucide="plus" style={{ width: '14px', height: '14px' }}></i> Add Line
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1fr 1fr 40px', gap: '12px', paddingBottom: '8px', borderBottom: '1.5px solid #F1F5F9', marginBottom: '8px', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        <div>Product</div>
                        <div>Qty</div>
                        <div>Vendor</div>
                        <div>Unit ₹</div>
                        <div>Disc %</div>
                        <div>Tax %</div>
                        <div style={{ textAlign: 'right' }}>Total</div>
                        <div></div>
                      </div>

                      {poScreenItems.map((item, idx) => {
                        const selectedMed = medicines.find(m => m.sku === item.sku);
                        const selectedVendorObj = vendors.find(v => v._id === item.vendorId);
                        
                        const sub = (item.qty || 0) * (item.price || 0);
                        const discAmt = sub * ((item.discount || 0) / 100);
                        const taxAmt = (sub - discAmt) * ((item.tax || 12) / 100);
                        const lineTotal = sub - discAmt + taxAmt;

                        return (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1fr 1fr 40px', gap: '12px', alignItems: 'start', padding: '12px 0', borderBottom: '1px solid #F1F5F9', position: 'relative', zIndex: activePoItemFocus === idx ? 99 : 1 }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                type="text"
                                className="proc-input"
                                placeholder="Search medicine..."
                                value={item.tempName !== undefined ? item.tempName : (selectedMed ? selectedMed.name : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const updated = [...poScreenItems];
                                  updated[idx] = { ...updated[idx], tempName: val };
                                  const match = medicines.find(m => m.name.toLowerCase() === val.trim().toLowerCase());
                                  if (match) {
                                    let vId = item.vendorId || poScreenDefaultVendor;
                                    let pr = 0;
                                    let tx = 12;
                                    if (vId) {
                                      const vObj = vendors.find(v => v._id === vId);
                                      const medInVendor = vObj?.medicines?.find(med => med.sku === match.sku);
                                      if (medInVendor) {
                                        pr = medInVendor.price;
                                        tx = medInVendor.gst !== undefined ? medInVendor.gst : 12;
                                      }
                                    }
                                    updated[idx] = { ...updated[idx], sku: match.sku, price: pr, tax: tx, vendorId: vId, tempName: undefined };
                                  }
                                  setPoScreenItems(updated);
                                }}
                                onFocus={() => {
                                  setActivePoItemFocus(idx);
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setActivePoItemFocus(null);
                                    setPoScreenItems(prev => {
                                      const updated = [...prev];
                                      if (updated[idx]) {
                                        updated[idx].tempName = undefined;
                                      }
                                      return updated;
                                    });
                                  }, 250);
                                }}
                              />
                              {activePoItemFocus === idx && (() => {
                                const query = (item.tempName !== undefined ? item.tempName : (selectedMed ? selectedMed.name : '')).trim().toLowerCase();
                                const filtered = query
                                  ? medicines.filter(m => m.name.toLowerCase().includes(query)).slice(0, 6)
                                  : medicines.slice(0, 6);
                                if (filtered.length === 0) return null;
                                return (
                                  <div
                                    data-lenis-prevent onMouseDown={(e) => e.preventDefault()}
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: 0,
                                      right: 0,
                                      backgroundColor: '#ffffff',
                                      border: '1px solid #E2E8F0',
                                      borderRadius: '8px',
                                      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                                      zIndex: 1000,
                                      maxHeight: '160px',
                                      overflowY: 'auto',
                                      marginTop: '4px'
                                    }}
                                  >
                                    {filtered.map(m => (
                                      <div
                                        key={m.sku}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation(); let vId = item.vendorId || poScreenDefaultVendor;
                                          let pr = 0;
                                          let tx = 12;
                                          if (vId) {
                                            const vObj = vendors.find(v => v._id === vId);
                                            const medInVendor = vObj?.medicines?.find(med => med.sku === m.sku);
                                            if (medInVendor) {
                                              pr = medInVendor.price;
                                              tx = medInVendor.gst !== undefined ? medInVendor.gst : 12;
                                            }
                                          }
                                          const updated = [...poScreenItems];
                                          updated[idx] = { ...updated[idx], sku: m.sku, price: pr, tax: tx, vendorId: vId, tempName: undefined };
                                          setPoScreenItems(updated);
                                          setActivePoItemFocus(null);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          fontSize: '13px',
                                          fontWeight: 700,
                                          color: '#1E293B',
                                          cursor: 'pointer',
                                          borderBottom: '1px solid #F1F5F9',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                                      >
                                        <span>{m.name}</span>
                                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{m.sku}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', fontWeight: 500 }}>
                                Stock: {selectedMed?.stock || 0} · Avg/mo: {selectedMed?.avgMonthlyUse || 1200}
                              </div>
                            </div>

                            <div>
                              <input type="number" className="proc-input" value={item.qty} onChange={e => {
                                const updated = [...poScreenItems];
                                updated[idx].qty = Number(e.target.value) || 0;
                                setPoScreenItems(updated);
                              }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedVendorObj ? selectedVendorObj.name : <span style={{ color: '#94A3B8', fontWeight: 500 }}>Choose Vendor</span>}
                              </span>
                              <button className="proc-btn proc-btn-secondary" style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' }} onClick={() => setCompareItemIdx(idx)}>
                                <i data-lucide="git-compare" style={{ width: '13px', height: '13px' }}></i> Compare
                              </button>
                            </div>

                            <div>
                              <input type="number" className="proc-input" style={{ background: '#F8FAFC' }} value={item.price} readOnly />
                            </div>

                            <div>
                              <input type="number" className="proc-input" value={item.discount} onChange={e => {
                                const updated = [...poScreenItems];
                                updated[idx].discount = Number(e.target.value) || 0;
                                setPoScreenItems(updated);
                              }} />
                            </div>

                            <div>
                              <input type="number" className="proc-input" value={item.tax} onChange={e => {
                                const updated = [...poScreenItems];
                                updated[idx].tax = Number(e.target.value) || 0;
                                setPoScreenItems(updated);
                              }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '40px', fontWeight: 800, color: '#0F172A', fontSize: '14.5px' }}>
                              ₹{Math.round(lineTotal).toLocaleString()}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px' }}>
                              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#EF4444' }} onClick={() => {
                                if (poScreenItems.length === 1) return;
                                setPoScreenItems(poScreenItems.filter((_, i) => i !== idx));
                              }}>
                                <i data-lucide="trash-2" style={{ width: '16px', height: '16px' }}></i>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Notes & Summary Columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
                      <div className="proc-create-po-block" style={{ height: '100%' }}>
                        <div className="proc-create-po-title">Notes & Terms</div>
                        <textarea 
                          className="proc-input" 
                          style={{ minHeight: '140px', resize: 'vertical' }}
                          placeholder="Delivery instructions, packaging requirements..."
                          value={poScreenNotes}
                          onChange={e => setPoScreenNotes(e.target.value)}
                        />
                      </div>

                      <div className="proc-create-po-block">
                        <div className="proc-create-po-title">Order Summary</div>
                        
                        <div className="proc-po-summary-flex">
                          <span>Subtotal</span>
                          <span>₹{Math.round(totalSubtotal).toLocaleString()}</span>
                        </div>
                        <div className="proc-po-summary-flex" style={{ color: '#16A34A' }}>
                          <span>Discount</span>
                          <span>- ₹{Math.round(totalDiscount).toLocaleString()}</span>
                        </div>
                        <div className="proc-po-summary-flex">
                          <span>Tax</span>
                          <span>₹{Math.round(totalTax).toLocaleString()}</span>
                        </div>
                        
                        <div className="proc-po-summary-flex total">
                          <span>Total</span>
                          <span>₹{Math.round(totalOverallAmount).toLocaleString()}</span>
                        </div>

                        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '16px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                            <span>Vendors involved</span>
                            <span style={{ color: '#0F172A', fontWeight: 800 }}>{uniqueVendorsCount}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                          <button className="proc-btn proc-btn-secondary" style={{ flexGrow: 1, padding: '10px', fontSize: '13px' }} onClick={handleSaveDraftPO}>
                            <i data-lucide="save" style={{ width: '14px', height: '14px' }}></i> Save Draft
                          </button>
                          <button className="proc-btn proc-btn-secondary" style={{ padding: '10px' }} onClick={() => window.print()}>
                            <i data-lucide="printer" style={{ width: '16px', height: '16px' }}></i>
                          </button>
                          <button className="proc-btn proc-btn-primary" style={{ flexGrow: 2, padding: '10px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleSendPurchaseOrder}>
                            <i data-lucide="send" style={{ width: '14px', height: '14px' }}></i> Send Purchase Order
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* VIEW 4: GOODS RECEIPT */}
            {activeTab === 'grn' && (
              <div>
                <div className="proc-title-row">
                  <div>
                    <h1 className="proc-title">Goods Receipt Notes</h1>
                    <p className="proc-subtitle">Verify physical deliveries before inventory updates.</p>
                  </div>
                </div>

                {/* KPI CARDS ROW */}
                <div className="proc-stats-grid" style={{ marginBottom: '24px' }}>
                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">AWAITING VERIFICATION</div>
                      <div className="proc-stat-val">
                        {getDisplayPOs().filter(p => ['Approved', 'Sent', 'Confirmed', 'Partially Delivered'].includes(p.status)).length}
                      </div>
                    </div>
                    <div className="proc-stat-icon orange" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                      <i data-lucide="truck"></i>
                    </div>
                  </div>

                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">GRNS THIS WEEK</div>
                      <div className="proc-stat-val">{getGrnsThisWeek()}</div>
                    </div>
                    <div className="proc-stat-icon green">
                      <i data-lucide="package"></i>
                    </div>
                  </div>

                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">QUANTITY MISMATCHES</div>
                      <div className="proc-stat-val">{getQuantityMismatches()}</div>
                    </div>
                    <div className="proc-stat-icon red" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                      <i data-lucide="alert-triangle"></i>
                    </div>
                  </div>

                  <div className="proc-stat-card">
                    <div>
                      <div className="proc-stat-label">ACCEPTED (MONTH)</div>
                      <div className="proc-stat-val">{formatAcceptedTotal()}</div>
                    </div>
                    <div className="proc-stat-icon blue">
                      <i data-lucide="check-circle"></i>
                    </div>
                  </div>
                </div>

                {/* DELIVERIES AWAITING GRN */}
                <div className="proc-card" style={{ padding: '0 0 12px 0', overflow: 'hidden', marginBottom: '24px' }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #F1F5F9' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'block' }}>Deliveries Awaiting GRN</span>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                      Open a delivery to verify cartons, batches and expiry dates.
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="proc-table">
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>Vendor</th>
                          <th>Expected</th>
                          <th>Items</th>
                          <th>Order Value</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right', paddingRight: '24px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getDisplayPOs().filter(p => ['Approved', 'Sent', 'Confirmed', 'Partially Delivered'].includes(p.status)).length > 0 ? (
                          getDisplayPOs().filter(p => ['Approved', 'Sent', 'Confirmed', 'Partially Delivered'].includes(p.status)).map(po => {
                            const expectedDelivery = po.expectedDelivery 
                              ? new Date(po.expectedDelivery).toISOString().split('T')[0] 
                              : new Date(new Date(po.createdAt || Date.now()).getTime() + 3*24*60*60*1000).toISOString().split('T')[0];
                            
                            const itemsCount = po.items ? po.items.reduce((sum, item) => sum + (item.requiredQty || 0), 0) : 0;

                            return (
                              <tr key={po._id}>
                                <td style={{ fontWeight: 800, color: '#0F172A' }}>{po.poId}</td>
                                <td style={{ fontWeight: 700, color: '#475569' }}>{po.vendorName}</td>
                                <td style={{ fontWeight: 500 }}>{expectedDelivery}</td>
                                <td style={{ fontWeight: 700 }}>{itemsCount}</td>
                                <td style={{ fontWeight: 800, color: '#0F172A' }}>₹{po.totalAmount.toLocaleString()}</td>
                                <td>
                                  <span className={`proc-badge ${po.status.toLowerCase().replace(/ /g, '-')}`}>
                                    {po.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                  <button 
                                    className="proc-btn proc-btn-primary" 
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
                                    onClick={() => {
                                      handleGrnPOSelection(po._id);
                                      setGrnFlowType('po');
                                      setShowGRNModal(true);
                                    }}
                                  >
                                    Open GRN <i data-lucide="arrow-right" style={{ width: '14px', height: '14px' }}></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontWeight: 600 }}>
                              No purchase orders currently awaiting verification.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* HISTORICAL GRNS */}
                <div className="proc-card" style={{ padding: '0 0 12px 0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'block' }}>Filed Goods Receipt Notes (GRN)</span>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                        Historical record of stock loaded into pharmacy inventory.
                      </span>
                    </div>
                    <button className="proc-btn proc-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
                      setGrnFlowType('direct');
                      setGrnSelectedPOId('');
                      setGrnDirectVendorId(getDisplayVendors()[0]?._id || '');
                      setGrnItems([{ name: '', sku: '', qtyRequired: 0, qtyReceived: 10, price: 10 }]);
                      setGrnInvoiceFileName('');
                      setShowGRNModal(true);
                    }}>
                      <i data-lucide="plus" style={{ width: '12px', height: '12px' }}></i> Direct Purchase GRN
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="proc-table">
                      <thead>
                        <tr>
                          <th>GRN Number</th>
                          <th>PO Reference</th>
                          <th>Supplier</th>
                          <th>Date Received</th>
                          <th>Items Count</th>
                          <th>Invoice Ref</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {goodsReceipts.length > 0 ? (
                          goodsReceipts.map(grn => (
                            <tr key={grn._id}>
                              <td style={{ fontWeight: 800, color: '#0F172A' }}>{grn.grnId}</td>
                              <td style={{ fontWeight: 700, color: '#2563EB' }}>{grn.poNumber || 'Direct Purchase'}</td>
                              <td style={{ fontWeight: 700, color: '#475569' }}>{grn.vendorName}</td>
                              <td>{new Date(grn.receivedDate || grn.createdAt).toLocaleDateString()}</td>
                              <td style={{ fontWeight: 700 }}>{grn.items ? grn.items.length : 0} items</td>
                              <td>{grn.invoiceUrl || '--'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button className="proc-btn proc-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setSelectedGrnDetails(grn)}>
                                  <i data-lucide="eye" style={{ width: '13px', height: '13px' }}></i> View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                              No goods receipts filed yet. Verify deliveries above to load stock.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 5: VENDOR PAYMENTS */}
            {activeTab === 'payments' && (() => {
              const activeVendor = getDisplayVendors().find(v => v._id === selectedPaymentVendorId) || getDisplayVendors()[0];
              const vendorPOs = activeVendor ? getDisplayPOs().filter(po => po.vendorId === activeVendor._id) : [];

              const totalPurchases = vendorPOs.reduce((acc, po) => acc + po.totalAmount, 0);
              const totalPaid = vendorPOs.reduce((acc, po) => acc + (po.paidAmount || 0), 0);
              const totalOutstanding = vendorPOs.filter(p => p.status !== 'Draft').reduce((acc, po) => acc + (po.totalAmount - (po.paidAmount || 0)), 0);
              const creditBalance = 500000 - totalOutstanding;

              return (
                <div>
                  <div className="proc-title-row">
                    <div>
                      <h1 className="proc-title">Vendor Payments</h1>
                      <p className="proc-subtitle">
                        Payment history for {activeVendor ? activeVendor.name : 'Selected Vendor'}
                      </p>
                    </div>
                    <div>
                      <select 
                        className="proc-select" 
                        style={{ minWidth: '240px', background: '#FFF', fontWeight: 600 }}
                        value={selectedPaymentVendorId || (activeVendor ? activeVendor._id : '')}
                        onChange={e => setSelectedPaymentVendorId(e.target.value)}
                      >
                        {getDisplayVendors().map(v => (
                          <option key={v._id} value={v._id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* KPI CARDS ROW */}
                  <div className="proc-stats-grid" style={{ marginBottom: '24px' }}>
                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">TOTAL PURCHASES</div>
                        <div className="proc-stat-val">₹{totalPurchases.toLocaleString()}</div>
                      </div>
                      <div className="proc-stat-icon blue">
                        <i data-lucide="trending-up"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">OUTSTANDING</div>
                        <div className="proc-stat-val">₹{totalOutstanding.toLocaleString()}</div>
                      </div>
                      <div className="proc-stat-icon orange" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                        <i data-lucide="trending-down"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">PAID AMOUNT</div>
                        <div className="proc-stat-val">₹{totalPaid.toLocaleString()}</div>
                      </div>
                      <div className="proc-stat-icon green">
                        <i data-lucide="check-circle"></i>
                      </div>
                    </div>

                    <div className="proc-stat-card">
                      <div>
                        <div className="proc-stat-label">CREDIT BALANCE</div>
                        <div className="proc-stat-val">₹{creditBalance.toLocaleString()}</div>
                        <div className="proc-stat-sub">Limit ₹5,00,000</div>
                      </div>
                      <div className="proc-stat-icon blue" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        <i data-lucide="wallet"></i>
                      </div>
                    </div>
                  </div>

                  <div className="proc-card" style={{ padding: '0 0 12px 0', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #F1F5F9' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Invoice History</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="proc-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Purchase Order</th>
                            <th>Invoice Date</th>
                            <th>Amount</th>
                            <th>Paid</th>
                            <th>Outstanding</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorPOs.length > 0 ? (
                            vendorPOs.map(po => {
                              const orderDate = new Date(po.createdAt || Date.now()).toISOString().split('T')[0];
                              const outstanding = po.totalAmount - (po.paidAmount || 0);
                              
                              let statusLabel = 'Pending';
                              let statusClass = 'draft';
                              if (po.paidAmount >= po.totalAmount) {
                                statusLabel = 'Paid';
                                statusClass = 'completed';
                              } else if (po.paidAmount > 0) {
                                statusLabel = 'Partially Paid';
                                statusClass = 'confirmed';
                              } else {
                                statusLabel = 'Pending';
                                statusClass = 'partially-delivered'; // matches orange/brown
                              }

                              return (
                                <tr key={`pay-${po._id}`}>
                                  <td style={{ fontWeight: 800, color: '#0F172A' }}>INV-A-{po.poId.slice(-4)}</td>
                                  <td style={{ fontWeight: 700, color: '#2563EB' }}>{po.poId}</td>
                                  <td style={{ fontWeight: 500 }}>{orderDate}</td>
                                  <td style={{ fontWeight: 800, color: '#0F172A' }}>₹{po.totalAmount.toLocaleString()}</td>
                                  <td style={{ color: po.paidAmount > 0 ? '#16A34A' : '#64748B', fontWeight: 700 }}>
                                    ₹{po.paidAmount ? po.paidAmount.toLocaleString() : '0'}
                                  </td>
                                  <td style={{ fontWeight: 700, color: '#0F172A' }}>
                                    {outstanding === 0 ? '—' : `₹${outstanding.toLocaleString()}`}
                                  </td>
                                  <td>
                                    <span className={`proc-badge ${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                    <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                                      <button 
                                        className="proc-btn proc-btn-secondary" 
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
                                        onClick={() => setSelectedInvoiceDetails(po)}
                                      >
                                        <i data-lucide="eye" style={{ width: '13px', height: '13px' }}></i> Invoice
                                      </button>
                                      {outstanding > 0 && (
                                        <button 
                                          className="proc-btn proc-btn-primary" 
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
                                          onClick={() => {
                                            setPaymentPOId(po.poId);
                                            setPaymentAmount(String(outstanding));
                                            setShowPaymentModal(true);
                                          }}
                                        >
                                          <i data-lucide="credit-card" style={{ width: '13px', height: '13px' }}></i> Record Payment
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748B', fontWeight: 600 }}>
                                No purchase orders or invoice history found for this vendor.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </main>
      </div>


      {/* MODAL 2: CREATE PURCHASE ORDER */}
      {showCreatePOModal && (
        <div className="proc-modal-overlay">
          <form className="proc-modal" style={{ maxWidth: '750px' }} onSubmit={handleCreatePO}>
            <div className="proc-modal-header">
              <span className="proc-modal-title">New Purchase Order</span>
              <button type="button" className="proc-close-btn" onClick={() => setShowCreatePOModal(false)}>
                <i data-lucide="x"></i>
              </button>
            </div>
            <div className="proc-modal-body">
              <div className="proc-form-grid">
                <div className="proc-form-group">
                  <label className="proc-form-label">Target Vendor *</label>
                  <select required className="proc-select" value={selectedVendorForPO} onChange={e => setSelectedVendorForPO(e.target.value)}>
                    <option value="">-- Choose Vendor --</option>
                    {getDisplayVendors().map(v => (
                      <option key={v._id} value={v._id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>

                <div className="proc-form-group">
                  <label className="proc-form-label">Expected Delivery Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="proc-input" 
                    value={poExpectedDelivery} 
                    onChange={e => setPoExpectedDelivery(e.target.value)} 
                  />
                </div>

                <div className="proc-form-group proc-form-full">
                  <label className="proc-form-label">Status *</label>
                  <select 
                    required 
                    className="proc-select" 
                    value={poInitialStatus} 
                    onChange={e => setPoInitialStatus(e.target.value)}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Partially Delivered">Partially Delivered</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <span className="proc-form-label">Items list</span>
                <table className="proc-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Medicine Name</th>
                      <th style={{ width: '15%' }}>Quantity</th>
                      <th style={{ width: '20%' }}>Unit Price (₹)</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ width: '5%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {poDraftItems.map((item, idx) => (
                      <tr key={`item-${idx}`}>
                        <td>
                          <input type="text" required className="proc-input" placeholder="e.g. Paracetamol"
                            value={item.name} onChange={e => {
                              const updated = [...poDraftItems];
                              updated[idx].name = e.target.value;
                              setPoDraftItems(updated);
                            }} />
                        </td>
                        <td>
                          <input type="number" required min="1" className="proc-input"
                            value={item.qty} onChange={e => {
                              const updated = [...poDraftItems];
                              updated[idx].qty = Number(e.target.value);
                              setPoDraftItems(updated);
                            }} />
                        </td>
                        <td>
                          <input type="number" required min="0" step="0.01" className="proc-input"
                            value={item.price} onChange={e => {
                              const updated = [...poDraftItems];
                              updated[idx].price = Number(e.target.value);
                              setPoDraftItems(updated);
                            }} />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, paddingRight: '8px' }}>
                          ₹{(Number(item.qty || 0) * Number(item.price || 0)).toLocaleString()}
                        </td>
                        <td>
                          {poDraftItems.length > 1 && (
                            <button type="button" className="proc-close-btn" style={{ color: '#EF4444' }} onClick={() => handleRemoveRow(idx)}>
                              <i data-lucide="trash-2"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button type="button" className="proc-btn proc-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleAddRow}>
                  <i data-lucide="plus" style={{ width: '14px' }}></i> Add Row
                </button>
              </div>
            </div>
            <div className="proc-modal-footer">
              <div style={{ marginRight: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>ESTIMATED TOTAL</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#10B981' }}>
                  ₹{poDraftItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0).toLocaleString()}
                </span>
              </div>
              <button type="button" className="proc-btn proc-btn-secondary" onClick={() => setShowCreatePOModal(false)}>Cancel</button>
              <button type="submit" className="proc-btn proc-btn-primary">Send Purchase Order</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: GENERATE GRN */}
      {showGRNModal && (
        <div className="proc-modal-overlay">
          <form className="proc-modal" style={{ maxWidth: '680px' }} onSubmit={handleSaveGRN}>
            <div className="proc-modal-header">
              <span className="proc-modal-title">Goods Receipt Note (GRN) Generation</span>
              <button type="button" className="proc-close-btn" onClick={() => setShowGRNModal(false)}>
                <i data-lucide="x"></i>
              </button>
            </div>
            <div className="proc-modal-body">
              <div className="proc-form-group">
                <label className="proc-form-label">GRN Flow Type</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}>
                    <input type="radio" name="grnFlow" checked={grnFlowType === 'po'} onChange={() => setGrnFlowType('po')} />
                    Receive against Approved PO
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}>
                    <input type="radio" name="grnFlow" checked={grnFlowType === 'direct'} onChange={() => setGrnFlowType('direct')} />
                    Direct Purchase (No PO)
                  </label>
                </div>
              </div>

              {grnFlowType === 'po' ? (
                <div className="proc-form-group">
                  <label className="proc-form-label">Reference Approved PO *</label>
                  <select required className="proc-select" value={grnSelectedPOId} onChange={e => handleGrnPOSelection(e.target.value)}>
                    <option value="">-- Choose Purchase Order --</option>
                    {getDisplayPOs().filter(po => ['Approved', 'Sent', 'Confirmed', 'Partially Delivered'].includes(po.status)).map(po => (
                      <option key={po._id} value={po._id}>{po.poId} ({po.vendorName})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="proc-form-group">
                  <label className="proc-form-label">Supplier *</label>
                  <select required className="proc-select" value={grnDirectVendorId} onChange={e => {
                    setGrnDirectVendorId(e.target.value);
                    setGrnItems([{ name: 'Paracetamol 650mg', sku: 'PAR-650', qtyRequired: 0, qtyReceived: 100, price: 10, gst: 12 }]);
                  }}>
                    <option value="">-- Choose Vendor --</option>
                    {getDisplayVendors().map(v => (
                      <option key={v._id} value={v._id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {grnItems.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <span className="proc-form-label">Verify Received Stock Quantities & Tax Rates</span>
                  <table className="proc-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Ordered Qty</th>
                        <th>Received Qty</th>
                        <th>Price (₹)</th>
                        <th>GST (%)</th>
                        <th>GST Amt</th>
                        <th>Total</th>
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
                          <tr key={`grn-${idx}`}>
                            <td style={{ fontWeight: 700 }}>{item.name}</td>
                            <td>{item.qtyRequired || 'Direct'}</td>
                            <td>
                              <input type="number" required min="1" className="proc-input" style={{ padding: '6px', width: '80px' }}
                                value={qty} onChange={e => {
                                  const updated = [...grnItems];
                                  updated[idx].qtyReceived = Number(e.target.value);
                                  setGrnItems(updated);
                                }} />
                            </td>
                            <td>
                              <input type="number" required min="0" step="0.01" className="proc-input" style={{ padding: '6px', width: '80px' }}
                                value={price} onChange={e => {
                                  const updated = [...grnItems];
                                  updated[idx].price = Number(e.target.value);
                                  setGrnItems(updated);
                                }} />
                            </td>
                            <td>
                              <input type="number" required min="0" max="100" className="proc-input" style={{ padding: '6px', width: '70px' }}
                                value={gstRate} onChange={e => {
                                  const updated = [...grnItems];
                                  updated[idx].gst = Number(e.target.value);
                                  setGrnItems(updated);
                                }} />
                            </td>
                            <td style={{ fontWeight: 600 }}>₹{gstAmt.toFixed(2)}</td>
                            <td style={{ fontWeight: 700 }}>₹{totalAmt.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

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
                      <div style={{ marginTop: '16px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
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
              )}

              <div className="proc-form-group">
                <label className="proc-form-label">Supplier Invoice Reference Number *</label>
                <input type="text" required className="proc-input" placeholder="e.g. INV-99120"
                  value={grnInvoiceFileName} onChange={e => setGrnInvoiceFileName(e.target.value)} />
              </div>
            </div>
            <div className="proc-modal-footer">
              <button type="button" className="proc-btn proc-btn-secondary" onClick={() => setShowGRNModal(false)}>Cancel</button>
              <button type="submit" className="proc-btn proc-btn-primary">Generate GRN</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: RECORD PAYMENT */}
      {showPaymentModal && (
        <div className="proc-modal-overlay">
          <form className="proc-modal" onSubmit={handleSavePayment}>
            <div className="proc-modal-header">
              <span className="proc-modal-title">Record Vendor Payment</span>
              <button type="button" className="proc-close-btn" onClick={() => setShowPaymentModal(false)}>
                <i data-lucide="x"></i>
              </button>
            </div>
            <div className="proc-modal-body">
              <div className="proc-form-group">
                <label className="proc-form-label">Purchase Order Reference *</label>
                <select required className="proc-select" value={paymentPOId} onChange={e => setPaymentPOId(e.target.value)}>
                  {getDisplayPOs().map(po => (
                    <option key={po._id} value={po.poId}>{po.poId} ({po.vendorName}) - Total: ₹{po.totalAmount.toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div className="proc-form-group">
                <label className="proc-form-label">Payment Amount (₹) *</label>
                <input type="number" required min="1" className="proc-input" placeholder="e.g. 50000"
                  value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              </div>

              <div className="proc-form-group">
                <label className="proc-form-label">Method of Payment</label>
                <select className="proc-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI Payout</option>
                  <option value="Cheque">Corporate Cheque</option>
                  <option value="Cash">Cash Ledger</option>
                </select>
              </div>
            </div>
            <div className="proc-modal-footer">
              <button type="button" className="proc-btn proc-btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
              <button type="submit" className="proc-btn proc-btn-primary">Record Payment</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 5: VENDOR PROFILE */}
      {selectedVendorProfile && (
        <div className="proc-modal-overlay">
          <div className="proc-modal" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}>
            <div className="proc-modal-header" style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10, borderBottom: '1px solid #E2E8F0', padding: '16px 24px' }}>
              <span className="proc-modal-title" style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>Supplier Master Profile: {selectedVendorProfile.name}</span>
              <button type="button" className="proc-close-btn" onClick={() => setSelectedVendorProfile(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="proc-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
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
                      <span className={`proc-badge-status ${(selectedVendorProfile.status || 'Active').toLowerCase()}`}>
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

              {/* Section 7: Mapped Products & Prices */}
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase', display: 'block', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>Active Contracts / Price List</span>
                <table className="proc-table" style={{ marginTop: '8px' }}>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Contract SKU</th>
                      <th>Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVendorProfile.medicines && selectedVendorProfile.medicines.length > 0 ? (
                      selectedVendorProfile.medicines.map((m, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{m.name}</td>
                          <td>{m.sku}</td>
                          <td style={{ fontWeight: 800 }}>₹{m.price}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ padding: '12px', textAlign: 'center', color: '#64748B' }}>
                          No contract prices mapped. Custom PO rates will apply.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Remarks/Notes */}
              {selectedVendorProfile.notes && (
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Remarks / Internal Notes</span>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>{selectedVendorProfile.notes}</div>
                </div>
              )}
            </div>
            
            <div className="proc-modal-footer" style={{ position: 'sticky', bottom: 0, background: 'white', zIndex: 10, borderTop: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="proc-btn proc-btn-primary" onClick={() => setSelectedVendorProfile(null)}>Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR COMPARISON DRAWER */}
      {compareItemIdx !== null && (() => {
        const item = poScreenItems[compareItemIdx];
        const med = medicines.find(m => m.sku === item.sku);
        if (!med) return null;

        const getVendorPriceForMedicine = (vendor, med) => {
          const contract = vendor.medicines?.find(m => m.sku === med.sku || m.name.toLowerCase() === med.name.toLowerCase());
          if (contract) return contract.price;
          
          if (med.name.toLowerCase().includes('paracetamol')) {
            if (vendor.name.includes('Apex')) return 46;
            if (vendor.name.includes('MediCorp') || vendor.name.includes('MedLife') || vendor.name.includes('City')) return 48;
            if (vendor.name.includes('SureMed') || vendor.name.includes('Pacific') || vendor.name.includes('Global')) return 50;
          }
          if (med.name.toLowerCase().includes('pantoprazole')) {
            if (vendor.name.includes('Pacific') || vendor.name.includes('Global')) return 89;
            if (vendor.name.includes('Apex')) return 92;
            if (vendor.name.includes('SureMed') || vendor.name.includes('MediCorp') || vendor.name.includes('MedLife')) return 95;
          }
          
          const hash = vendor.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          return Math.round((med.price || 40) * (0.85 + (hash % 20) / 100));
        };

        const getVendorLeadTime = (vendor) => {
          if (vendor.name.includes('SureMed') || vendor.name.includes('Global')) return '1 day';
          if (vendor.name.includes('MediCorp') || vendor.name.includes('MedLife') || vendor.name.includes('City')) return '2 days';
          if (vendor.name.includes('Apex')) return '5 days';
          if (vendor.name.includes('Pacific')) return '3 days';
          return '3 days';
        };

        const options = getDisplayVendors().map(vendor => {
          const price = getVendorPriceForMedicine(vendor, med);
          const leadTime = getVendorLeadTime(vendor);
          return {
            vendor,
            price,
            leadTime,
            lineTotal: price * item.qty
          };
        }).sort((a, b) => a.price - b.price);

        const lowestOpt = options[0];
        const highestOpt = options[options.length - 1];
        const savings = (highestOpt.price - lowestOpt.price) * item.qty;

        return (
          <div className="proc-drawer-backdrop" onClick={() => setCompareItemIdx(null)}>
            <div className="proc-drawer" onClick={e => e.stopPropagation()}>
              <div className="proc-drawer-header">
                <div>
                  <span className="proc-drawer-title">Vendor Price Comparison</span>
                  <div className="proc-drawer-subtitle">{med.name} - Required {item.qty} units</div>
                </div>
                <button type="button" className="proc-close-btn" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', fontWeight: 800 }} onClick={() => setCompareItemIdx(null)}>
                  <i data-lucide="x"></i>
                </button>
              </div>

              <div className="proc-drawer-body">
                <div className="proc-drawer-stats">
                  <div className="proc-drawer-detail-item">
                    <span className="proc-drawer-stat-label">Current Inventory</span>
                    <span className="proc-drawer-stat-val">{med.stock || 420}</span>
                  </div>
                  <div className="proc-drawer-detail-item">
                    <span className="proc-drawer-stat-label">Avg Monthly Use</span>
                    <span className="proc-drawer-stat-val">{med.avgMonthlyUse || 1200}</span>
                  </div>
                  <div className="proc-drawer-detail-item">
                    <span className="proc-drawer-stat-label">Last Purchase</span>
                    <span className="proc-drawer-stat-val">₹{med.price || 48}</span>
                    <span className="proc-drawer-stat-sub">MediCorp</span>
                  </div>
                </div>

                {lowestOpt && (
                  <div className="proc-rec-banner">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="proc-rec-icon">
                        <i data-lucide="trophy" style={{ width: '20px', height: '20px' }}></i>
                      </div>
                      <div>
                        <div className="proc-rec-title">SYSTEM RECOMMENDATION</div>
                        <div className="proc-rec-desc">{lowestOpt.vendor.name} · ₹{lowestOpt.price} per unit</div>
                        {savings > 0 && (
                          <div className="proc-rec-savings">Potential savings of ₹{savings.toLocaleString()} vs highest offer</div>
                        )}
                      </div>
                    </div>
                    <button 
                      className="proc-btn proc-btn-primary" 
                      style={{ padding: '8px 14px', fontSize: '12px' }}
                      onClick={() => {
                        const updated = [...poScreenItems];
                        const medInVendor = lowestOpt.vendor.medicines?.find(m => m.sku === item.sku);
                        updated[compareItemIdx] = {
                          ...updated[compareItemIdx],
                          vendorId: lowestOpt.vendor._id,
                          price: lowestOpt.price,
                          tax: medInVendor && medInVendor.gst !== undefined ? medInVendor.gst : 12
                        };
                        setPoScreenItems(updated);
                        setCompareItemIdx(null);
                      }}
                    >
                      Use Recommendation
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {options.map((opt, oIdx) => {
                    const isSelected = item.vendorId === opt.vendor._id;
                    const isLowest = oIdx === 0;
                    const isFastest = opt.leadTime === '1 day';

                    return (
                      <div key={opt.vendor._id} className={`proc-vendor-opt-card ${isSelected ? 'selected' : ''}`}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="proc-vendor-opt-name">{opt.vendor.name}</span>
                            {isLowest && (
                              <span className="proc-badge completed" style={{ fontSize: '9px', padding: '2px 6px' }}>Lowest Price</span>
                            )}
                            {isFastest && !isLowest && (
                              <span className="proc-badge partially-delivered" style={{ fontSize: '9px', padding: '2px 6px' }}>Fastest Delivery</span>
                            )}
                          </div>
                          <div className="proc-vendor-opt-code">{opt.vendor.code || `VND-00${oIdx+1}`} · {opt.vendor.city || 'Mumbai'}</div>
                          
                          <div className="proc-vendor-opt-details">
                            <div className="proc-vendor-opt-detail-item">
                              <span className="proc-vendor-opt-detail-label">Price</span>
                              <span className="proc-vendor-opt-detail-val">₹{opt.price}</span>
                            </div>
                            <div className="proc-vendor-opt-detail-item">
                              <span className="proc-vendor-opt-detail-label">Lead Time</span>
                              <span className="proc-vendor-opt-detail-val">{opt.leadTime}</span>
                            </div>
                            <div className="proc-vendor-opt-detail-item">
                              <span className="proc-vendor-opt-detail-label">Line Total</span>
                              <span className="proc-vendor-opt-detail-val">₹{opt.lineTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <button className="proc-btn proc-btn-primary" style={{ padding: '8px 16px', fontSize: '13px', background: '#2563EB', border: 'none', color: '#fff' }} disabled>
                              Selected
                            </button>
                          ) : (
                            <button 
                              className="proc-btn proc-btn-secondary" 
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                              onClick={() => {
                                const updated = [...poScreenItems];
                                const medInVendor = opt.vendor.medicines?.find(m => m.sku === item.sku);
                                updated[compareItemIdx] = {
                                  ...updated[compareItemIdx],
                                  vendorId: opt.vendor._id,
                                  price: opt.price,
                                  tax: medInVendor && medInVendor.gst !== undefined ? medInVendor.gst : 12
                                };
                                setPoScreenItems(updated);
                                setCompareItemIdx(null);
                              }}
                            >
                              Select Vendor
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 6: INVOICE DETAILS */}
      {selectedInvoiceDetails && (
        <div className="proc-modal-overlay">
          <div className="proc-modal" style={{ maxWidth: '480px' }}>
            <div className="proc-modal-header">
              <span className="proc-modal-title">Invoice Information</span>
              <button type="button" className="proc-close-btn" onClick={() => setSelectedInvoiceDetails(null)}>
                ✕
              </button>
            </div>
            <div className="proc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Invoice Number</span>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>INV-A-{selectedInvoiceDetails.poId.slice(-4)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Purchase Order</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB' }}>{selectedInvoiceDetails.poId}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Supplier</span>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{selectedInvoiceDetails.vendorName}</div>
                </div>
              </div>
              <hr style={{ border: '0', borderTop: '1px solid #E2E8F0', margin: '8px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Value</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>₹{selectedInvoiceDetails.totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Paid</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>₹{(selectedInvoiceDetails.paidAmount || 0).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Outstanding</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#EF4444' }}>
                    ₹{(selectedInvoiceDetails.totalAmount - (selectedInvoiceDetails.paidAmount || 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="proc-modal-footer">
              <button type="button" className="proc-btn proc-btn-primary" onClick={() => setSelectedInvoiceDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: GRN DETAILS WITH GST SUMMARY */}
      {selectedGrnDetails && (
        <div className="proc-modal-overlay">
          <div className="proc-modal" style={{ maxWidth: '640px' }}>
            <div className="proc-modal-header">
              <span className="proc-modal-title">Goods Receipt Note (GRN) Details</span>
              <button type="button" className="proc-close-btn" onClick={() => setSelectedGrnDetails(null)}>
                ✕
              </button>
            </div>
            <div className="proc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>GRN Number</span>
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
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Received Date</span>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{new Date(selectedGrnDetails.receivedDate || selectedGrnDetails.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Supplier Invoice reference</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{selectedGrnDetails.invoiceUrl || '--'}</div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Received Items & Taxes</span>
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', marginTop: '6px' }}>
                  <table className="proc-items-table" style={{ margin: 0, width: '100%' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ padding: '8px 12px', fontSize: '11px' }}>Item</th>
                        <th style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'right' }}>Unit ₹</th>
                        <th style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'right' }}>GST %</th>
                        <th style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'right' }}>GST Amt</th>
                        <th style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'right' }}>Total</th>
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
            <div className="proc-modal-footer">
              <button type="button" className="proc-btn proc-btn-primary" onClick={() => setSelectedGrnDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProcurementDashboard;
