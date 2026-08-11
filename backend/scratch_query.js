const mongoose = require('mongoose');

function getFinancialYearString(date = new Date()) {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  let fyStart, fyEnd;
  if (month >= 3) {
    fyStart = year;
    fyEnd = year + 1;
  } else {
    fyStart = year - 1;
    fyEnd = year;
  }
  const fyEndShort = String(fyEnd).slice(-2);
  return `${fyStart}-${fyEndShort}`;
}

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://curoxa:medicore@medicore.emltj84.mongodb.net/?appName=medicore');
    const tenantId = "med-hospi-757";
    const fyStr = getFinancialYearString();
    const prefix = `PO-${fyStr}-`;

    // 1. Insert a temporary PO with sequence 0005
    const mockPOId = `${prefix}0005`;
    await mongoose.connection.db.collection('purchaseorders').insertOne({
      tenantId,
      poId: mockPOId,
      vendorId: new mongoose.Types.ObjectId(),
      vendorName: "Temp Test Vendor",
      items: [],
      totalAmount: 100,
      requestedBy: "Tester",
      status: "Draft"
    });
    console.log("Inserted temporary PO:", mockPOId);

    // 2. Fetch the next sequential ID
    const latestPO = await mongoose.connection.db.collection('purchaseorders').findOne({
      tenantId,
      poId: { $regex: `^${prefix}` }
    }, { sort: { poId: -1 } });

    let nextSerial = 1;
    if (latestPO && latestPO.poId) {
      const parts = latestPO.poId.split('-');
      const lastSerialStr = parts[parts.length - 1];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }

    const nextPoId = `${prefix}${String(nextSerial).padStart(4, '0')}`;
    console.log("Computed next PO ID after insert:", nextPoId);

    // 3. Clean up the temporary PO
    await mongoose.connection.db.collection('purchaseorders').deleteOne({ poId: mockPOId });
    console.log("Deleted temporary PO:", mockPOId);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};
run();
