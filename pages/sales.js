import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Sales page provides an interface to create tax invoices. It allows users
 * to select products from inventory, input customer details, auto-calculate
 * taxes and generate a PDF invoice which can be shared via WhatsApp. When
 * saved, the invoice is persisted to the database and inventory quantities
 * are decreased accordingly.
 */
export default function Sales() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    customer_name: '',
    customer_address: '',
    customer_gstin: '',
    place_of_supply: '',
    vehicle_no: '',
    items: [], // array of { item_id, description, hsn_sac, quantity, rate }
    taxes: { cgst: 0, sgst: 0, igst: 0 }
  });
  const [message, setMessage] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState(null);
  const [lastInvoice, setLastInvoice] = useState(null);
  const invoiceRef = useRef(null);

  useEffect(() => {
    // Load inventory items
    async function load() {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (res.ok) setItems(data.items);
      } catch (err) {
        console.error('Sales page load error', err);
      }
    }
    load();
  }, []);

  // Add a new invoice item row
  function addItem() {
    setForm(prev => ({ ...prev, items: [...prev.items, { item_id: '', description: '', hsn_sac: '', quantity: 0, rate: 0 }] }));
  }
  // Remove item row
  function removeItem(index) {
    setForm(prev => {
      const arr = [...prev.items];
      arr.splice(index, 1);
      return { ...prev, items: arr };
    });
  }
  // Update item field
  function handleItemChange(index, field, value) {
    setForm(prev => {
      const arr = [...prev.items];
      arr[index] = { ...arr[index], [field]: value };
      // If selecting item id, populate rate and description and hsn
      if (field === 'item_id') {
        const item = items.find(i => i.id === parseInt(value));
        if (item) {
          arr[index].rate = item.rate;
          arr[index].description = item.item_name;
          arr[index].hsn_sac = item.hsn_sac;
        }
      }
      return { ...prev, items: arr };
    });
  }
  // Handler for customer fields
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }
  // Handler for tax fields
  function handleTaxChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, taxes: { ...prev.taxes, [name]: value } }));
  }
  // Calculate totals
  function calculateTotals() {
    let taxable = 0;
    form.items.forEach(item => {
      taxable += (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 0);
    });
    const cgst = parseFloat(form.taxes.cgst) || 0;
    const sgst = parseFloat(form.taxes.sgst) || 0;
    const igst = parseFloat(form.taxes.igst) || 0;
    return { taxable, cgst, sgst, igst, grand: taxable + cgst + sgst + igst };
  }
  // Save invoice and generate PDF
  async function handleGenerate(e) {
    e.preventDefault();
    setMessage(null);
    try {
      // Save invoice to DB first
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customer_name,
          customer_address: form.customer_address,
          customer_gstin: form.customer_gstin,
          place_of_supply: form.place_of_supply,
          vehicle_no: form.vehicle_no,
          items: form.items.map(it => ({
            item_id: parseInt(it.item_id),
            description: it.description,
            hsn_sac: it.hsn_sac,
            quantity: parseFloat(it.quantity),
            rate: parseFloat(it.rate)
          })),
          taxes: {
            cgst: parseFloat(form.taxes.cgst) || 0,
            sgst: parseFloat(form.taxes.sgst) || 0,
            igst: parseFloat(form.taxes.igst) || 0,
          }
        })
      });
      const data = await res.json();
      if (res.ok) {
        setInvoiceNumber(data.invoice_number);
        // store details for sharing
        setLastInvoice({ customer_name: form.customer_name, grand: totals.grand });
        // After saving, generate PDF
        await generatePDF(data.invoice_number);
        setMessage('Invoice saved and PDF generated');
        // Reset form
        setForm({ customer_name: '', customer_address: '', customer_gstin: '', place_of_supply: '', vehicle_no: '', items: [], taxes: { cgst: 0, sgst: 0, igst: 0 } });
        // Refresh inventory because items sold changed quantities
        const invRes = await fetch('/api/inventory');
        const invData = await invRes.json();
        if (invRes.ok) setItems(invData.items);
      } else {
        setMessage(data.error || 'Error creating invoice');
      }
    } catch (err) {
      console.error('Invoice generation error', err);
      setMessage('Error creating invoice');
    }
  }
  // Generate PDF from invoice preview element using html2canvas & jsPDF
  async function generatePDF(invNo) {
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Fit image within page
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
    pdf.save(`${invNo || 'invoice'}.pdf`);
  }
  // Share invoice via WhatsApp (text only). This opens WhatsApp with prefilled text.
  function shareWhatsApp() {
    // Use last invoice details if available
    const customer = lastInvoice?.customer_name || form.customer_name;
    const amount = lastInvoice?.grand || calculateTotals().grand;
    const text = `Invoice ${invoiceNumber}\nCustomer: ${customer}\nAmount: ₹${amount?.toFixed(2)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  const totals = calculateTotals();

  return (
    <Layout>
      <Head>
        <title>Sales | VSOL-MiNi</title>
      </Head>
      <h1 className="text-2xl font-semibold mb-4">Sales & Invoice</h1>
      {message && <p className="mb-4 text-green-700">{message}</p>}
      {/* Invoice creation form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-lg font-medium mb-2">Create Invoice</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Customer details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Customer Name</label>
              <input type="text" name="customer_name" value={form.customer_name} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Customer Address</label>
              <input type="text" name="customer_address" value={form.customer_address} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Customer GSTIN</label>
              <input type="text" name="customer_gstin" value={form.customer_gstin} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Place of Supply</label>
              <input type="text" name="place_of_supply" value={form.place_of_supply} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">Vehicle No.</label>
              <input type="text" name="vehicle_no" value={form.vehicle_no} onChange={handleChange} className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
          {/* Items table */}
          <div>
            <h3 className="text-sm font-medium mb-2">Items</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Item</th>
                    <th className="px-2 py-1">HSN/SAC</th>
                    <th className="px-2 py-1">Qty</th>
                    <th className="px-2 py-1">Rate</th>
                    <th className="px-2 py-1">Total</th>
                    <th className="px-2 py-1">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it, idx) => {
                    const total = (parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0);
                    return (
                      <tr key={idx} className="border-b">
                        <td className="px-2 py-1">{idx + 1}</td>
                        <td className="px-2 py-1">
                          <select value={it.item_id} onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)} className="border rounded px-1 py-0.5">
                            <option value="">Select</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>{item.item_name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input type="text" value={it.hsn_sac || ''} onChange={(e) => handleItemChange(idx, 'hsn_sac', e.target.value)} className="border rounded px-1 py-0.5 w-24" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" value={it.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} step="0.01" className="border rounded px-1 py-0.5 w-20" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" value={it.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} step="0.01" className="border rounded px-1 py-0.5 w-24" />
                        </td>
                        <td className="px-2 py-1">₹ {total.toFixed(2)}</td>
                        <td className="px-2 py-1">
                          <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-xs">Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem} className="mt-2 bg-blue-500 text-white px-3 py-1 rounded">Add Item</button>
          </div>
          {/* Tax inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">CGST (₹)</label>
              <input type="number" name="cgst" value={form.taxes.cgst} onChange={handleTaxChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">SGST (₹)</label>
              <input type="number" name="sgst" value={form.taxes.sgst} onChange={handleTaxChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">IGST (₹)</label>
              <input type="number" name="igst" value={form.taxes.igst} onChange={handleTaxChange} step="0.01" className="w-full px-2 py-1 border rounded" />
            </div>
          </div>
          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save & PDF</button>
            {invoiceNumber && (
              <button type="button" onClick={shareWhatsApp} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Share via WhatsApp</button>
            )}
          </div>
        </form>
      </div>
      {/* Invoice preview */}
      <div className="bg-white p-4 rounded shadow" ref={invoiceRef} id="invoice-preview">
        <h2 className="text-lg font-medium mb-2 text-center">Tax Invoice</h2>
        <div className="flex justify-between text-sm">
          <div>
            <strong>Your Business Name</strong><br />
            {/* Add more company details if available via settings later */}
          </div>
          <div className="text-right">
            <div>Invoice No: {invoiceNumber || 'N/A'}</div>
            <div>Date: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
        {/* Customer & invoice details */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 text-sm gap-4">
          <div className="border p-2">
            <strong>Billed To (Buyer):</strong><br />
            {form.customer_name}<br />
            {form.customer_address}<br />
            {form.customer_gstin && (<span>GSTIN: {form.customer_gstin}</span>)}
          </div>
          <div className="border p-2">
            <strong>Invoice Details:</strong><br />
            {form.place_of_supply && (<span>Place of Supply: {form.place_of_supply}<br /></span>)}
            {form.vehicle_no && (<span>Vehicle No: {form.vehicle_no}</span>)}
          </div>
        </div>
        {/* Items table */}
        <table className="w-full text-xs mt-4 border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-1 py-1">S.No</th>
              <th className="border px-1 py-1">Description</th>
              <th className="border px-1 py-1">HSN/SAC</th>
              <th className="border px-1 py-1">Qty</th>
              <th className="border px-1 py-1">Rate</th>
              <th className="border px-1 py-1">Taxable Value</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((it, idx) => {
              const taxable = (parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0);
              return (
                <tr key={idx}>
                  <td className="border px-1 py-1 text-center">{idx + 1}</td>
                  <td className="border px-1 py-1">{it.description}</td>
                  <td className="border px-1 py-1">{it.hsn_sac}</td>
                  <td className="border px-1 py-1 text-right">{it.quantity}</td>
                  <td className="border px-1 py-1 text-right">{it.rate}</td>
                  <td className="border px-1 py-1 text-right">{taxable.toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Taxable Total</td>
              <td className="border px-1 py-1 text-right">{totals.taxable.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Add: CGST</td>
              <td className="border px-1 py-1 text-right">{totals.cgst.toFixed(2)}</td>
            </tr>
              <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Add: SGST</td>
              <td className="border px-1 py-1 text-right">{totals.sgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-semibold">Add: IGST</td>
              <td className="border px-1 py-1 text-right">{totals.igst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border px-1 py-1 text-right font-bold">Grand Total</td>
              <td className="border px-1 py-1 text-right font-bold">{totals.grand.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-sm">Amount in words: {numberToWords(Math.round(totals.grand))} only.</p>
      </div>
    </Layout>
  );
}

// Helper function to convert numbers to words (simplified for rupees). This
// supports up to crores for typical invoice values. You could replace this
// implementation with a more robust library if needed.
function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = [ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' ];
  const b = [ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' ];
  const g = [ '', 'Thousand', 'Lakh', 'Crore' ];
  function helper(n) {
    let str = '';
    if (n < 20) str = a[n];
    else if (n < 100) str = b[Math.floor(n/10)] + (n % 10 ? ' ' + a[n % 10] : '');
    else {
      str = a[Math.floor(n/100)] + ' Hundred' + (n % 100 ? ' ' + helper(n % 100) : '');
    }
    return str;
  }
  if (num === 0) return 'Zero';
  let res = '';
  const parts = [];
  let i = 0;
  while (num > 0) {
    parts.push(num % 1000);
    num = Math.floor(num / 1000);
  }
  for (let idx = parts.length - 1; idx >= 0; idx--) {
    if (parts[idx]) {
      res += helper(parts[idx]) + (g[idx] ? ' ' + g[idx] + ' ' : '');
    }
  }
  return res.trim();
}