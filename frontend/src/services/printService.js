/**
 * ══════════════════════════════════════════════════════════════════════════
 * Thermal Print Service (80mm / 3-inch POS standard)
 * Prints ONLY the receipt / KOT slip inside an isolated iframe,
 * completely preventing the main application UI / whole page from printing.
 * ══════════════════════════════════════════════════════════════════════════
 */

export const printThermalContent = (innerHtml, title = 'Thermal Slip') => {
  // Remove any previously leftover print iframes
  const oldIframe = document.getElementById('thermal-print-iframe');
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '80mm';
  iframe.style.height = '100px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 2mm 3mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            width: 74mm;
            padding: 2mm 1mm;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin: 4px 0;
          }
          th {
            text-align: left;
            border-bottom: 1px dashed #000;
            padding: 3px 0;
            font-size: 11px;
          }
          td {
            padding: 2px 0;
            vertical-align: top;
          }
          .row {
            display: flex;
            justify-content: space-between;
          }
          .tag {
            font-size: 10px;
            color: #333;
            padding-left: 8px;
          }
        </style>
      </head>
      <body>
        ${innerHtml}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      iframe.remove();
    }, 1500);
  }, 300);
};

export const printKotTicket = (kot, shopName = 'RESTAURANT KITCHEN') => {
  if (!kot) return;
  const itemsHtml = Array.isArray(kot.items)
    ? kot.items
        .map(
          it => `
          <div style="margin-bottom: 5px;">
            <div class="row bold">
              <span>${it.qty} × ${it.name}</span>
            </div>
            ${
              it.modifiers && it.modifiers.length > 0
                ? `<div class="tag">+ ${it.modifiers.join(', ')}</div>`
                : ''
            }
            ${it.notes ? `<div class="tag">** ${it.notes} **</div>` : ''}
          </div>
        `
        )
        .join('')
    : '';

  const slipHtml = `
    <div class="center">
      <h3 style="font-size: 16px; margin-bottom: 2px;">*** KITCHEN ORDER TICKET ***</h3>
      <div style="font-size: 11px;">${shopName}</div>
      <div class="divider"></div>
      <div class="row">
        <span>KOT No: <strong>${kot.ticket_number || 'KOT-???'}</strong></span>
        <span>Station: <strong>${kot.station || 'Kitchen'}</strong></span>
      </div>
      <div class="row">
        <span>Table: <strong>${kot.table?.name || 'Takeaway'}</strong></span>
        <span>Time: ${new Date(kot.printed_at || Date.now()).toLocaleTimeString()}</span>
      </div>
    </div>
    <div class="divider"></div>
    <div style="padding: 4px 0;">
      ${itemsHtml}
    </div>
    <div class="divider"></div>
    <div class="center" style="font-size: 10px; margin-top: 4px;">
      Status: ${String(kot.status || 'pending').toUpperCase()}
    </div>
  `;

  printThermalContent(slipHtml, `KOT_${kot.ticket_number || 'Slip'}`);
};

export const printGuestBill = (order, table, shopSettings = {}) => {
  if (!order) return;
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsHtml = items
    .map(it => {
      const name = it.product?.name || it.name || `Item #${it.product_id}`;
      const qty = it.qty || 1;
      const price = Number(it.line_total || qty * it.unit_price || 0).toFixed(2);
      return `
        <tr>
          <td>
            ${name}
            ${
              it.modifiers && it.modifiers.length > 0
                ? `<div class="tag">+ ${it.modifiers.join(', ')}</div>`
                : ''
            }
          </td>
          <td style="text-align: center;">${qty}</td>
          <td class="right">${price}</td>
        </tr>
      `;
    })
    .join('');

  const subtotal = Number(order.subtotal || 0).toFixed(2);
  const tax = Number(order.tax_total || 0).toFixed(2);
  const discount = Number(order.discount_total || 0).toFixed(2);
  const grandTotal = Number(order.grand_total || 0).toFixed(2);
  const paymentMethod = String(order.payment_method || 'CASH').toUpperCase();
  const shopName = shopSettings.shop_name || 'RESTAURANT & DINING';
  const shopAddress = shopSettings.shop_address || '';
  const shopPhone = shopSettings.shop_phone ? `Ph: ${shopSettings.shop_phone}` : '';
  const gstin = shopSettings.gstin ? `GSTIN: ${shopSettings.gstin}` : '';

  const slipHtml = `
    <div class="center">
      <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 2px;">${shopName}</h2>
      ${shopAddress ? `<div style="font-size: 10px;">${shopAddress}</div>` : ''}
      ${shopPhone ? `<div style="font-size: 10px;">${shopPhone}</div>` : ''}
      ${gstin ? `<div style="font-size: 10px;">${gstin}</div>` : ''}
      <div class="divider"></div>
      <div style="font-size: 13px; font-weight: bold;">TAX INVOICE / GUEST BILL</div>
      <div class="row" style="font-size: 11px; margin-top: 4px;">
        <span>Bill No: <strong>${order.order_number || 'ORD-???'}</strong></span>
        <span>${table?.name ? `Table: <strong>${table.name}</strong>` : 'Takeaway'}</span>
      </div>
      <div class="row" style="font-size: 11px;">
        <span>Date: ${new Date(order.created_at || Date.now()).toLocaleString('en-IN')}</span>
        <span>Payment: <strong>${paymentMethod}</strong></span>
      </div>
    </div>

    <div class="divider"></div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center; width: 35px;">Qty</th>
          <th class="right" style="width: 55px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="divider"></div>
    <div style="font-size: 11px;">
      <div class="row">
        <span>Subtotal:</span>
        <span>Rs. ${subtotal}</span>
      </div>
      ${
        Number(discount) > 0
          ? `
        <div class="row">
          <span>Discount:</span>
          <span>- Rs. ${discount}</span>
        </div>
      `
          : ''
      }
      <div class="row">
        <span>GST / Tax:</span>
        <span>Rs. ${tax}</span>
      </div>
      <div class="double-divider"></div>
      <div class="row bold" style="font-size: 14px;">
        <span>GRAND TOTAL:</span>
        <span>Rs. ${grandTotal}</span>
      </div>
      <div class="double-divider"></div>
    </div>

    <div class="center" style="font-size: 11px; margin-top: 6px;">
      <div>Status: <strong>PAID &amp; SETTLED</strong></div>
      <div style="margin-top: 4px;">*** THANK YOU! VISIT AGAIN ***</div>
    </div>
  `;

  printThermalContent(slipHtml, `Bill_${order.order_number || 'Slip'}`);
};
