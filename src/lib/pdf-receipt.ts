import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

export interface ReceiptItem {
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discount?: number;
}

export interface ReceiptOrderData {
  id: number;
  orderNumber: string;
  orderDate: string; // YYYY-MM-DD or date string
  orderTime?: string;
  shopCode: string;
  shopName: string;
  ownerName?: string;
  phone?: string;
  address?: string;
  area?: string;
  city?: string;
  creditLimit?: number;
  orderBooker: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: string;
  items: ReceiptItem[];
}

export function formatDateDMY(dateInput: any): string {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    const d = String(dateInput.getDate()).padStart(2, "0");
    const m = String(dateInput.getMonth() + 1).padStart(2, "0");
    const y = dateInput.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const str = String(dateInput).trim();
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }
  // YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return str.slice(0, 10);
}

export function formatDueDate(dateInput: any, addDays: number = 10): string {
  if (!dateInput) return "";
  let baseDate: Date;
  if (dateInput instanceof Date) {
    baseDate = new Date(dateInput.getTime());
  } else {
    const str = String(dateInput).trim();
    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      baseDate = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
      baseDate = new Date(str);
    }
  }

  if (isNaN(baseDate.getTime())) return "";
  baseDate.setDate(baseDate.getDate() + addDays);
  const d = String(baseDate.getDate()).padStart(2, "0");
  const m = String(baseDate.getMonth() + 1).padStart(2, "0");
  const y = baseDate.getFullYear();
  return `${d}-${m}-${y}`;
}

function formatPrintTimestamp(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, "0");
  return `${d}-${m}-${y} ${hoursStr}:${minutes}:${seconds}${ampm}`;
}

function formatNum(num: number | undefined | null): string {
  const n = Number(num || 0);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function generateReceiptPdf(orders: ReceiptOrderData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 24, bottom: 20, left: 32, right: 32 },
        autoFirstPage: false,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      const logoPath = path.join(process.cwd(), "public", "logo.png");
      const hasLogo = fs.existsSync(logoPath);

      orders.forEach((order) => {
        renderAuthenticWholesaleInvoice(doc, order, hasLogo ? logoPath : null);
      });

      // Add dynamic page numbering
      const range = doc.bufferedPageRange();
      const rightMargin = 563.28;

      if (range.count > 0) {
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.font("Helvetica").fontSize(7).fillColor("#64748b");
          doc.text(
            `Page ${i - range.start + 1} of ${range.count}`,
            rightMargin - 80,
            775,
            { width: 80, align: "right", lineBreak: false }
          );
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function renderAuthenticWholesaleInvoice(
  doc: PDFKit.PDFDocument,
  order: ReceiptOrderData,
  logoPath: string | null
) {
  doc.addPage({
    size: "A4",
    margins: { top: 24, bottom: 20, left: 32, right: 32 },
  });

  const leftMargin = 32;
  const rightMargin = 563.28;
  const pageWidth = rightMargin - leftMargin; // 531.28 pt

  // ==========================================
  // TOP BRAND ACCENT STRIPE
  // ==========================================
  const stripeY = 18;
  doc.rect(leftMargin, stripeY, pageWidth * 0.78, 3.5).fillColor("#065f46").fill();
  doc.rect(leftMargin + pageWidth * 0.78 + 3, stripeY, pageWidth * 0.22 - 3, 3.5).fillColor("#ea580c").fill();

  // ==========================================
  // 1. HEADER SECTION (AUTHENTIC WHOLESALE BILL)
  // ==========================================
  const headerTopY = 28;

  // --- Left: Agency Identity & Contact ---
  let leftY = headerTopY;
  if (logoPath) {
    try {
      const logoW = 86;
      const logoH = 55;
      doc.image(logoPath, leftMargin, leftY, { width: logoW, height: logoH });
      leftY += logoH + 6;
    } catch {
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#065f46").text("NADEEM AGENCIES", leftMargin, leftY, { lineBreak: false });
      leftY += 22;
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#065f46").text("NADEEM AGENCIES", leftMargin, leftY, { lineBreak: false });
    leftY += 22;
  }

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#065f46");
  doc.text("WHOLESALE FMCG DISTRIBUTORS", leftMargin, leftY, { lineBreak: false });
  leftY += 10.5;

  doc.font("Helvetica").fontSize(7.5).fillColor("#334155");
  doc.text("Near Puma Petrol Pump, Civil Hospital Road, Bahawalpur", leftMargin, leftY, { lineBreak: false });
  leftY += 10;

  doc.text("Phone: 0301-8681309 , 0304-5213796", leftMargin, leftY, { lineBreak: false });
  leftY += 10;

  doc.font("Helvetica").fontSize(7).fillColor("#64748b");
  doc.text("NTN: Registered Wholesale Distributor", leftMargin, leftY, { lineBreak: false });
  leftY += 10;

  // --- Right: INVOICE Heading & Structured Metadata ---
  const rightColX = 330;
  const labelX = 330;
  const labelW = 80;
  const valueX = 415;
  const valueW = rightMargin - valueX; // 148.28 pt

  doc.font("Helvetica-Bold").fontSize(24).fillColor("#065f46");
  doc.text("INVOICE", rightColX, headerTopY, { align: "right", width: rightMargin - rightColX, lineBreak: false });

  // Metadata Table Rows
  let metaY = headerTopY + 28;
  const metaRowH = 11.5;

  // Ensure Location is clean and short to prevent any wrapping or collision
  const rawLocation = order.area || order.city || "BAHAWALPUR";
  const locationStr = rawLocation.toUpperCase().slice(0, 24);

  const metaRows: [string, string, boolean][] = [
    ["Invoice No:", order.orderNumber || `ORD-${String(order.id).padStart(6, "0")}`, true],
    ["Order Date:", formatDateDMY(order.orderDate), false],
    ["Due Date:", formatDueDate(order.orderDate, 10), true],
    ["Trans #:", String(order.id || ""), false],
    ["Location:", locationStr, false],
    ["Sales Area:", (order.city || "BAHAWALPUR").toUpperCase(), false],
    ["Sales Group:", "N L C", false],
  ];

  metaRows.forEach(([lbl, val, isHighlight], idx) => {
    doc.font("Helvetica").fontSize(7.5).fillColor("#64748b");
    doc.text(lbl, labelX, metaY, { width: labelW, align: "left", lineBreak: false });

    if (idx === 0) {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a");
    } else if (idx === 2) {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ea580c");
    } else {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
    }
    // lineBreak: false and ellipsis: true absolutely prevents text wrapping into next lines
    doc.text(val, valueX, metaY, { width: valueW, align: "right", lineBreak: false, ellipsis: true });
    metaY += metaRowH;
  });

  // ==========================================
  // 2. CHARGE TO / CUSTOMER INFORMATION
  // ==========================================
  const chargeY = Math.max(leftY, metaY) + 6;

  // Charge To Header Bar
  doc.rect(leftMargin, chargeY, pageWidth, 15).fillColor("#f1f5f9").fill();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
  doc.text("CHARGE TO / RETAIL SHOP", leftMargin + 8, chargeY + 3.5, { lineBreak: false });

  if (order.shopCode) {
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0284c7");
    doc.text(`SHOP CODE: ${order.shopCode}`, rightMargin - 120, chargeY + 3.5, { width: 112, align: "right", lineBreak: false });
  }

  // Customer Details Block (3 dedicated clean rows, strictly zero overlap)
  const custBoxY = chargeY + 15;
  const custBoxH = 38;
  doc.rect(leftMargin, custBoxY, pageWidth, custBoxH).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

  // Row 1: Shop Code & Name
  const shopDisplayName = order.shopCode
    ? `${order.shopCode} - ${order.shopName?.toUpperCase() || "RETAIL CUSTOMER"}`
    : (order.shopName?.toUpperCase() || "WALK-IN CUSTOMER");

  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a");
  doc.text(shopDisplayName, leftMargin + 8, custBoxY + 5, {
    width: pageWidth - 16,
    lineBreak: false,
    ellipsis: true,
  });

  // Row 2: Proprietor & Phone
  doc.font("Helvetica").fontSize(7.5).fillColor("#475569");
  const propText = order.ownerName ? `Proprietor: ${order.ownerName}` : "Proprietor: —";
  const phoneText = order.phone ? `Phone: ${order.phone}` : "Phone: —";
  doc.text(`${propText}     ·     ${phoneText}`, leftMargin + 8, custBoxY + 17, {
    width: pageWidth - 16,
    lineBreak: false,
    ellipsis: true,
  });

  // Row 3: Full Address
  const fullAddress = order.address || order.area || order.city || "Bahawalpur";
  doc.text(`Address: ${fullAddress}`, leftMargin + 8, custBoxY + 27, {
    width: pageWidth - 16,
    lineBreak: false,
    ellipsis: true,
  });

  // ==========================================
  // 3. BOOKER & SALES STRIP
  // ==========================================
  const stripY = custBoxY + custBoxH + 6;
  const stripH = 28;

  doc.rect(leftMargin, stripY, pageWidth, stripH).fillColor("#f8fafc").fill();
  doc.rect(leftMargin, stripY, pageWidth, stripH).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

  const stripCols = [
    { label: "Sales Person Contact", val: "03045213796", width: 105 },
    { label: "Sales Person / Booker", val: (order.orderBooker || "ADEEL KHAN").toUpperCase(), width: 135 },
    { label: "Delivery Note No.", val: "auto", width: 80 },
    { label: "Due Date", val: formatDueDate(order.orderDate, 10), width: 80 },
    { label: "Payment Terms", val: "Payment due within 10 days", width: pageWidth - 400 },
  ];

  let stripColX = leftMargin + 8;
  stripCols.forEach((col) => {
    doc.font("Helvetica").fontSize(6.5).fillColor("#64748b");
    doc.text(col.label, stripColX, stripY + 3.5, { width: col.width - 4, lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
    doc.text(col.val, stripColX, stripY + 14, { width: col.width - 4, lineBreak: false, ellipsis: true });

    stripColX += col.width;
  });

  // ==========================================
  // 4. LINE ITEMS TABLE (AUTHENTIC & CLEAN)
  // ==========================================
  const tableY = stripY + stripH + 8;
  const thH = 20;

  const itemCols = [
    { label: "CODE", x: leftMargin, width: 56, align: "left" as const },
    { label: "ITEM DESCRIPTION", x: leftMargin + 56, width: 220, align: "left" as const },
    { label: "QTY. UNIT", x: leftMargin + 276, width: 68, align: "right" as const },
    { label: "PRICE (RS)", x: leftMargin + 344, width: 60, align: "right" as const },
    { label: "DISC.", x: leftMargin + 404, width: 46, align: "right" as const },
    { label: "TOTAL (RS)", x: leftMargin + 450, width: rightMargin - (leftMargin + 450), align: "right" as const },
  ];

  // Header background: Deep Emerald `#065f46`
  doc.rect(leftMargin, tableY, pageWidth, thH).fillColor("#065f46").fill();

  itemCols.forEach((col) => {
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
    doc.text(col.label, col.x + 4, tableY + 5.5, {
      width: col.width - 8,
      align: col.align,
      lineBreak: false,
    });
  });

  const items = Array.isArray(order.items) ? order.items : [];
  const rowHeight = items.length <= 8 ? 16 : 14.5;
  let rowY = tableY + thH;
  let totalQty = 0;

  items.forEach((item, idx) => {
    const qty = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const lineTotal = Number(item.lineTotal || 0);
    const disc = Number(item.discount || 0);
    totalQty += qty;

    if (rowY > 640) {
      doc.addPage({ size: "A4", margins: { top: 24, bottom: 20, left: 32, right: 32 } });
      rowY = 24;

      doc.rect(leftMargin, rowY, pageWidth * 0.78, 3).fillColor("#065f46").fill();
      doc.rect(leftMargin + pageWidth * 0.78 + 3, rowY, pageWidth * 0.22 - 3, 3).fillColor("#ea580c").fill();
      rowY += 9;

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#065f46")
        .text(`NADEEM AGENCIES  ·  INVOICE ${order.orderNumber || order.id} (Continued)`, leftMargin, rowY, { lineBreak: false });
      rowY += 15;

      doc.rect(leftMargin, rowY, pageWidth, thH).fillColor("#065f46").fill();
      itemCols.forEach((col) => {
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff");
        doc.text(col.label, col.x + 4, rowY + 5.5, { width: col.width - 8, align: col.align, lineBreak: false });
      });
      rowY += thH;
    }

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.rect(leftMargin, rowY, pageWidth, rowHeight).fillColor("#f8fafc").fill();
    } else {
      doc.rect(leftMargin, rowY, pageWidth, rowHeight).fillColor("#ffffff").fill();
    }

    // Hairline row divider
    doc.moveTo(leftMargin, rowY + rowHeight).lineTo(rightMargin, rowY + rowHeight).strokeColor("#f1f5f9").lineWidth(0.5).stroke();

    const cellY = rowY + 3.5;

    // Code
    doc.font("Helvetica").fontSize(7).fillColor("#475569");
    doc.text(item.productCode || String(idx + 1), itemCols[0].x + 4, cellY, {
      width: itemCols[0].width - 8,
      align: "left",
      lineBreak: false,
      ellipsis: true,
    });

    // Description
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a");
    doc.text(item.productName || "", itemCols[1].x + 4, cellY, {
      width: itemCols[1].width - 8,
      align: "left",
      lineBreak: false,
      ellipsis: true,
    });

    // Qty. Unit
    doc.font("Helvetica").fontSize(7.5).fillColor("#0f172a");
    doc.text(`${formatNum(qty)} ${item.unit || "pcs"}`, itemCols[2].x + 2, cellY, {
      width: itemCols[2].width - 4,
      align: "right",
      lineBreak: false,
    });

    // Price
    doc.text(formatNum(unitPrice), itemCols[3].x + 2, cellY, {
      width: itemCols[3].width - 4,
      align: "right",
      lineBreak: false,
    });

    // Discount
    doc.font("Helvetica").fontSize(7).fillColor("#64748b");
    doc.text(disc > 0 ? formatNum(disc) : "—", itemCols[4].x + 2, cellY, {
      width: itemCols[4].width - 4,
      align: "right",
      lineBreak: false,
    });

    // Total Amount (bold deep emerald)
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#065f46");
    doc.text(formatNum(lineTotal), itemCols[5].x + 2, cellY, {
      width: itemCols[5].width - 4,
      align: "right",
      lineBreak: false,
    });

    rowY += rowHeight;
  });

  // Table Summary / Subtotals Bar
  const sumRowY = rowY + 1;
  const sumRowH = 18;

  doc.rect(leftMargin, sumRowY, pageWidth, sumRowH).fillColor("#f0fdf4").fill();
  doc.moveTo(leftMargin, sumRowY).lineTo(rightMargin, sumRowY).strokeColor("#065f46").lineWidth(0.75).stroke();
  doc.moveTo(leftMargin, sumRowY + sumRowH).lineTo(rightMargin, sumRowY + sumRowH).strokeColor("#065f46").lineWidth(0.75).stroke();

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#065f46");
  doc.text("TOTALS", itemCols[1].x + 4, sumRowY + 4.5, { width: 100, align: "left", lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a");
  doc.text(formatNum(totalQty), itemCols[2].x + 2, sumRowY + 4.5, {
    width: itemCols[2].width - 4,
    align: "right",
    lineBreak: false,
  });

  doc.text(formatNum(order.subtotal || order.grandTotal), itemCols[3].x + 2, sumRowY + 4.5, {
    width: itemCols[3].width - 4,
    align: "right",
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#64748b");
  doc.text(formatNum(order.discount || 0), itemCols[4].x + 2, sumRowY + 4.5, {
    width: itemCols[4].width - 4,
    align: "right",
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#065f46");
  doc.text(formatNum(order.grandTotal), itemCols[5].x + 2, sumRowY + 4, {
    width: itemCols[5].width - 4,
    align: "right",
    lineBreak: false,
  });

  // ==========================================
  // 5. FINANCIAL & LEDGER BALANCE SUMMARY
  // ==========================================
  const balY = sumRowY + sumRowH + 10;
  const balTileW = pageWidth / 3;
  const balTileH = 34;

  const prevBalance = Number(order.creditLimit || 0);
  const totalBalance = Number(order.grandTotal || 0) + prevBalance;

  // Box 1: Last Payment
  const b1X = leftMargin;
  doc.rect(b1X, balY, balTileW, balTileH).fillColor("#f8fafc").fill();
  doc.rect(b1X, balY, balTileW, balTileH).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#64748b").text("LAST PAYMENT", b1X + 10, balY + 6, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(`Rs. ${formatNum(0)}`, b1X + 10, balY + 17, { lineBreak: false });

  // Box 2: Previous Balance
  const b2X = leftMargin + balTileW;
  doc.rect(b2X, balY, balTileW, balTileH).fillColor("#f8fafc").fill();
  doc.rect(b2X, balY, balTileW, balTileH).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#64748b").text("PREVIOUS BALANCE", b2X + 10, balY + 6, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(`Rs. ${formatNum(prevBalance)}`, b2X + 10, balY + 17, { lineBreak: false });

  // Box 3: Total Balance Due (Highlighted Mint Box)
  const b3X = leftMargin + (balTileW * 2);
  doc.rect(b3X, balY, balTileW, balTileH).fillColor("#ecfdf5").fill();
  doc.rect(b3X, balY, balTileW, balTileH).strokeColor("#a7f3d0").lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#065f46").text("TOTAL BALANCE DUE", b3X + 10, balY + 6, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#065f46").text(`Rs. ${formatNum(totalBalance)}`, b3X + 10, balY + 16, { lineBreak: false });

  // ==========================================
  // 6. OFFICIAL WHOLESALE TERMS & REMARKS
  // ==========================================
  const termsY = balY + balTileH + 12;
  doc.rect(leftMargin, termsY, pageWidth, 28).fillColor("#fafafa").fill();
  doc.rect(leftMargin, termsY, pageWidth, 28).strokeColor("#e5e7eb").lineWidth(0.5).stroke();

  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#0f172a");
  doc.text("WHOLESALE TERMS & DELIVERY NOTE:", leftMargin + 8, termsY + 5, { lineBreak: false });

  doc.font("Helvetica").fontSize(6.5).fillColor("#475569");
  doc.text(
    "1. Goods once sold will not be returned without prior verification.   2. Please verify package counts and seals at unloading.",
    leftMargin + 8,
    termsY + 13,
    { width: pageWidth - 16, lineBreak: false, ellipsis: true }
  );
  doc.text(
    "3. Any breakage or discrepancy must be reported within 24 hours to Nadeem Agencies office.",
    leftMargin + 8,
    termsY + 20,
    { width: pageWidth - 16, lineBreak: false, ellipsis: true }
  );

  // ==========================================
  // 7. DUAL OFFICIAL SIGNATURES
  // ==========================================
  const footerY = 720;
  const sigLineW = 190;

  // Left Signature: Salesman / Booker
  doc.moveTo(leftMargin, footerY).lineTo(leftMargin + sigLineW, footerY).strokeColor("#94a3b8").lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text("Booker / Sales Person Signature", leftMargin, footerY + 5, { lineBreak: false });
  doc.font("Helvetica").fontSize(6.5).fillColor("#64748b").text("Nadeem Agencies Wholesale Desk", leftMargin, footerY + 15, { lineBreak: false });

  // Right Signature: Customer Receiving Stamp & Signature
  const rightSigX = rightMargin - sigLineW;
  doc.moveTo(rightSigX, footerY).lineTo(rightMargin, footerY).strokeColor("#94a3b8").lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text("Customer Signature & Stamp", rightSigX, footerY + 5, {
    width: sigLineW,
    align: "right",
    lineBreak: false,
  });
  doc.font("Helvetica").fontSize(6.5).fillColor("#64748b").text("Goods Received in Good Condition", rightSigX, footerY + 15, {
    width: sigLineW,
    align: "right",
    lineBreak: false,
  });

  // ==========================================
  // 8. RUNNING FOOTER
  // ==========================================
  const bottomRuleY = 758;
  doc.moveTo(leftMargin, bottomRuleY).lineTo(rightMargin, bottomRuleY).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#065f46").text(
    "NADEEM AGENCIES  ·  WHOLESALE FMCG DISTRIBUTION NETWORK  ·  BAHAWALPUR",
    leftMargin,
    bottomRuleY + 5,
    { width: pageWidth, align: "center", lineBreak: false }
  );

  doc.font("Helvetica").fontSize(6.5).fillColor("#64748b").text(
    `Print Date and Time: ${formatPrintTimestamp()}`,
    leftMargin,
    bottomRuleY + 16,
    { lineBreak: false }
  );
}
