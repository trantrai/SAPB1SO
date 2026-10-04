import React, { useState, useEffect } from 'react';
import { Customer, Item, Warehouse, VatGroup, OrderLineItem } from '../types/sap';
import {
  Plus,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle2,
  FileCode,
  DollarSign,
  Calendar,
  User,
  Package,
  Layers,
  Send,
  Sparkles,
  Info
} from 'lucide-react';

interface SalesOrderFormProps {
  customers: Customer[];
  items: Item[];
  warehouses: Warehouse[];
  vatGroups: VatGroup[];
  onSubmitOrder: (payload: any) => Promise<{ success: boolean; order: any; message: string }>;
  onViewOrder: (docEntry: number) => void;
}

export const SalesOrderForm: React.FC<SalesOrderFormProps> = ({
  customers,
  items,
  warehouses,
  vatGroups,
  onSubmitOrder,
  onViewOrder,
}) => {
  // Header state
  const [cardCode, setCardCode] = useState<string>('');
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [docDueDate, setDocDueDate] = useState<string>(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [numAtCard, setNumAtCard] = useState<string>('');
  const [comments, setComments] = useState<string>('Đơn hàng tạo từ Web App kết nối SAP Service Layer');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('VND');
  const [webOrderId, setWebOrderId] = useState<string>(`WEB-${Math.floor(100000 + Math.random() * 900000)}`);
  const [carrier, setCarrier] = useState<string>('Nội bộ');

  // Lines state
  const [lines, setLines] = useState<OrderLineItem[]>([]);
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ docNum: number; docEntry: number; docTotal: number } | null>(null);

  // Selected customer object
  const selectedCustomer = customers.find((c) => c.CardCode === cardCode);

  // Set default customer and initial line on load
  useEffect(() => {
    if (customers.length > 0 && !cardCode) {
      setCardCode(customers[0].CardCode);
    }
  }, [customers, cardCode]);

  useEffect(() => {
    if (items.length > 0 && lines.length === 0) {
      addLine(items[0].ItemCode);
    }
  }, [items]);

  const addLine = (defaultItemCode?: string) => {
    const item = items.find((i) => i.ItemCode === defaultItemCode) || items[0];
    if (!item) return;

    const newLine: OrderLineItem = {
      id: 'line_' + Math.random().toString(36).substring(2, 9),
      ItemCode: item.ItemCode,
      ItemDescription: item.ItemName,
      Quantity: 1,
      UnitPrice: item.Price || 0,
      DiscountPercent: 0,
      WarehouseCode: item.DefaultWarehouse || warehouses[0]?.WarehouseCode || '01',
      VatGroup: vatGroups[0]?.Code || 'VAT10',
      TaxPercentage: vatGroups[0]?.Rate || 10,
      LineTotal: item.Price || 0,
      UnitsOfMeasurment: item.SalesUnit || 'Chiếc',
      U_Remark: '',
    };

    setLines((prev) => [...prev, newLine]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      setErrorMsg('Đơn hàng cần có ít nhất 1 dòng mặt hàng');
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const duplicateLine = (id: string) => {
    const lineToCopy = lines.find((l) => l.id === id);
    if (!lineToCopy) return;

    const cloned: OrderLineItem = {
      ...lineToCopy,
      id: 'line_' + Math.random().toString(36).substring(2, 9),
    };
    setLines((prev) => [...prev, cloned]);
  };

  const updateLineItem = (id: string, itemCode: string) => {
    const item = items.find((i) => i.ItemCode === itemCode);
    if (!item) return;

    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const unitPrice = item.Price || line.UnitPrice;
        const lineTotal = line.Quantity * unitPrice * (1 - line.DiscountPercent / 100);
        return {
          ...line,
          ItemCode: item.ItemCode,
          ItemDescription: item.ItemName,
          UnitPrice: unitPrice,
          WarehouseCode: item.DefaultWarehouse || line.WarehouseCode,
          UnitsOfMeasurment: item.SalesUnit || line.UnitsOfMeasurment,
          LineTotal: Math.round(lineTotal),
        };
      })
    );
  };

  const updateLineField = (id: string, field: keyof OrderLineItem, value: any) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };

        // Recalculate line total if quantity, unitPrice or discount changed
        if (field === 'Quantity' || field === 'UnitPrice' || field === 'DiscountPercent') {
          const qty = field === 'Quantity' ? parseFloat(value) || 0 : line.Quantity;
          const price = field === 'UnitPrice' ? parseFloat(value) || 0 : line.UnitPrice;
          const disc = field === 'DiscountPercent' ? parseFloat(value) || 0 : line.DiscountPercent;
          updated.LineTotal = Math.round(qty * price * (1 - disc / 100));
        }

        if (field === 'VatGroup') {
          const vat = vatGroups.find((v) => v.Code === value);
          updated.TaxPercentage = vat ? vat.Rate : 10;
        }

        return updated;
      })
    );
  };

  // Calculations
  const linesSubtotal = lines.reduce((acc, line) => acc + line.LineTotal, 0);
  const headerDiscountAmount = (linesSubtotal * (discountPercent || 0)) / 100;
  const netAfterHeaderDiscount = linesSubtotal - headerDiscountAmount;

  // Calculate tax proportionally
  const totalTaxAmount = lines.reduce((acc, line) => {
    const lineRatio = linesSubtotal > 0 ? line.LineTotal / linesSubtotal : 0;
    const lineAfterHeaderDiscount = line.LineTotal - headerDiscountAmount * lineRatio;
    return acc + (lineAfterHeaderDiscount * line.TaxPercentage) / 100;
  }, 0);

  const grandTotal = Math.round(netAfterHeaderDiscount + totalTaxAmount);

  // Construct SAP B1 Service Layer Payload
  const getSapPayload = () => {
    return {
      CardCode: cardCode,
      DocDate: docDate,
      DocDueDate: docDueDate,
      TaxDate: docDate,
      NumAtCard: numAtCard || undefined,
      Comments: comments,
      DiscountPercent: discountPercent > 0 ? discountPercent : undefined,
      DocCurrency: currency,
      U_WebOrderID: webOrderId || undefined,
      U_Carrier: carrier || undefined,
      DocumentLines: lines.map((line) => ({
        ItemCode: line.ItemCode,
        Quantity: line.Quantity,
        UnitPrice: line.UnitPrice,
        DiscountPercent: line.DiscountPercent > 0 ? line.DiscountPercent : undefined,
        WarehouseCode: line.WarehouseCode,
        VatGroup: line.VatGroup,
        U_Remark: line.U_Remark || undefined,
      })),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!cardCode) {
      setErrorMsg('Vui lòng chọn khách hàng (CardCode)');
      return;
    }

    if (lines.length === 0) {
      setErrorMsg('Đơn hàng phải có ít nhất 1 dòng mặt hàng');
      return;
    }

    // Check quantities
    for (const l of lines) {
      if (l.Quantity <= 0) {
        setErrorMsg(`Mặt hàng ${l.ItemCode} có số lượng không hợp lệ`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = getSapPayload();
      const res = await onSubmitOrder(payload);
      setSuccessResult({
        docNum: res.order.DocNum || res.order.DocEntry,
        docEntry: res.order.DocEntry,
        docTotal: res.order.DocTotal || grandTotal,
      });
      // Generate new Web order ID for next creation
      setWebOrderId(`WEB-${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi yêu cầu tới SAP Service Layer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessResult(null);
    setErrorMsg(null);
    setLines([]);
    if (items.length > 0) {
      addLine(items[0].ItemCode);
    }
  };

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency === 'USD' ? 'USD' : 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tạo Đơn Bán Hàng (Sales Order)</h1>
          <p className="text-sm text-slate-600">
            Tạo mới chứng từ Sales Order (ORDR / RDR1) chuẩn SAP B1 HANA qua Service Layer OData
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowJsonPreview(!showJsonPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showJsonPreview
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{showJsonPreview ? 'Ẩn JSON Payload' : 'Xem JSON Service Layer'}</span>
          </button>
        </div>
      </div>

      {/* JSON Payload Inspection Drawer */}
      {showJsonPreview && (
        <div className="bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-semibold text-blue-400">POST /b1s/v1/Orders (Service Layer Payload)</span>
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(getSapPayload(), null, 2))}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              <Copy className="w-3 h-3" />
              <span>Copy JSON</span>
            </button>
          </div>
          <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(getSapPayload(), null, 2)}
          </pre>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Lỗi Service Layer:</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Thông Tin Khách Hàng & Chứng Từ (Document Header)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Select */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Khách hàng (Customer - CardCode / CardName) <span className="text-red-500">*</span>
              </label>
              <select
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                {customers.map((c) => (
                  <option key={c.CardCode} value={c.CardCode}>
                    [{c.CardCode}] {c.CardName}
                  </option>
                ))}
              </select>

              {/* Customer quick metadata snippet */}
              {selectedCustomer && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>SĐT: <strong className="text-slate-700 font-medium">{selectedCustomer.Phone1 || 'N/A'}</strong></span>
                  <span>·</span>
                  <span>Hạn mức tín dụng: <strong className="text-slate-700 tabular-nums font-mono">{formatVND(selectedCustomer.CreditLimit || 0)}</strong></span>
                  <span>·</span>
                  <span>Dư nợ hiện tại: <strong className="text-slate-700 tabular-nums font-mono">{formatVND(selectedCustomer.CurrentAccountBalance || 0)}</strong></span>
                  <span>·</span>
                  <span>Khu vực: <strong className="text-slate-700">{selectedCustomer.City || 'Toàn quốc'}</strong></span>
                </div>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Loại Tiền Tệ (DocCurrency)
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="VND">VND - Đồng Việt Nam</option>
                <option value="USD">USD - Đô la Mỹ</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>

            {/* Document Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ngày Chứng Từ (DocDate)
              </label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ngày Giao Hàng (DocDueDate) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={docDueDate}
                onChange={(e) => setDocDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Customer Ref PO Number */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số Đơn Khách Hàng (NumAtCard / PO Ref)
              </label>
              <input
                type="text"
                value={numAtCard}
                onChange={(e) => setNumAtCard(e.target.value)}
                placeholder="VD: PO-2026-X99"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* User Defined Fields (UDF) & Remarks Row */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mã Đơn Kênh Web (UDF: U_WebOrderID)
              </label>
              <input
                type="text"
                value={webOrderId}
                onChange={(e) => setWebOrderId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Đơn Vị Vận Chuyển (UDF: U_Carrier)
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                <option value="Nội bộ">Đội xe công ty (Nội bộ)</option>
                <option value="Viettel Post">Viettel Post</option>
                <option value="Giao Hàng Tiết Kiệm">Giao Hàng Tiết Kiệm</option>
                <option value="Khách tự nhận">Khách tự vận chuyển tại kho</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Ghi Chú Đơn Hàng (Comments)
              </label>
              <input
                type="text"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Ghi chú giao nhận, yêu cầu kỹ thuật..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Line Items Table Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                Chi Tiết Mặt Hàng (Document Lines - RDR1)
              </h2>
              <span className="text-xs text-slate-500 font-mono">({lines.length} dòng)</span>
            </div>

            <button
              type="button"
              onClick={() => addLine()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Mặt Hàng</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Mặt Hàng (ItemCode / Name)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Số Lượng</th>
                  <th className="py-2.5 px-3 w-20 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 w-36 text-right">Đơn Giá ({currency})</th>
                  <th className="py-2.5 px-3 w-24 text-right">CK (%)</th>
                  <th className="py-2.5 px-3 w-32">Kho (Whs)</th>
                  <th className="py-2.5 px-3 w-28">Thuế</th>
                  <th className="py-2.5 px-3 w-36 text-right">Thành Tiền</th>
                  <th className="py-2.5 px-3 w-20 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lines.map((line, idx) => {
                  const currentItem = items.find((i) => i.ItemCode === line.ItemCode);
                  const isStockLow = currentItem && currentItem.QuantityOnStock < line.Quantity;

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Row Index */}
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* Item Selector */}
                      <td className="py-3 px-3">
                        <select
                          value={line.ItemCode}
                          onChange={(e) => updateLineItem(line.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-600"
                        >
                          {items.map((i) => (
                            <option key={i.ItemCode} value={i.ItemCode}>
                              {i.ItemCode} - {i.ItemName} (Tồn: {i.QuantityOnStock})
                            </option>
                          ))}
                        </select>
                        {isStockLow && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-700 mt-1">
                            <Info className="w-3 h-3" />
                            <span>Tồn kho ({currentItem?.QuantityOnStock}) thấp hơn số lượng đặt!</span>
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={line.Quantity}
                          onChange={(e) => updateLineField(line.id, 'Quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-right font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600"
                        />
                      </td>

                      {/* UoM */}
                      <td className="py-3 px-3 text-center text-slate-500 font-medium">
                        {line.UnitsOfMeasurment}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={line.UnitPrice}
                          onChange={(e) => updateLineField(line.id, 'UnitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 text-right font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.DiscountPercent}
                          onChange={(e) => updateLineField(line.id, 'DiscountPercent', e.target.value)}
                          className="w-full px-2 py-1.5 text-right font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600"
                        />
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-3">
                        <select
                          value={line.WarehouseCode}
                          onChange={(e) => updateLineField(line.id, 'WarehouseCode', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-600"
                        >
                          {warehouses.map((wh) => (
                            <option key={wh.WarehouseCode} value={wh.WarehouseCode}>
                              {wh.WarehouseCode} - {wh.WarehouseName.split('(')[0]}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* VatGroup */}
                      <td className="py-3 px-3">
                        <select
                          value={line.VatGroup}
                          onChange={(e) => updateLineField(line.id, 'VatGroup', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-600"
                        >
                          {vatGroups.map((v) => (
                            <option key={v.Code} value={v.Code}>
                              {v.Code} ({v.Rate}%)
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Line Total */}
                      <td className="py-3 px-3 text-right font-semibold font-mono tabular-nums text-slate-800">
                        {formatVND(line.LineTotal)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateLine(line.id)}
                            title="Sao chép dòng"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            title="Xóa dòng"
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Bottom Section: Remarks & Summary Calculations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Remarks & Quick Tips */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Quy tắc Nghiệp vụ SAP B1 HANA Service Layer
            </h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Kiểm tra tồn kho:</strong> Service Layer sẽ tự động xác thực số lượng khả dụng tại kho tương ứng trước khi commit transaction.
              </li>
              <li>
                <strong>Tự động sinh chứng từ:</strong> Khi tạo thành công, hệ thống SAP B1 sẽ cấp phát <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-800">DocEntry</code> và <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-800">DocNum</code> duy nhất.
              </li>
              <li>
                <strong>Thuế & Hạch toán:</strong> Mã nhóm thuế (VatGroup) tự động tính vào tài khoản thuế đầu ra khi phát sinh hóa đơn AR sau này.
              </li>
            </ul>
          </div>

          {/* Totals & Submit Box */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Tổng tiền hàng (Lines Subtotal):</span>
              <span className="font-mono tabular-nums font-medium">{formatVND(linesSubtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span>Chiết khấu tổng đơn:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-0.5 text-right font-mono text-xs bg-slate-50 border border-slate-300 rounded"
                />
                <span>%</span>
              </div>
              <span className="font-mono tabular-nums text-red-600 font-medium">
                -{formatVND(headerDiscountAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Thuế GTGT ước tính (VAT Total):</span>
              <span className="font-mono tabular-nums font-medium">{formatVND(totalTaxAmount)}</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">Tổng Cộng (DocTotal):</span>
              <span className="text-xl font-bold font-mono tabular-nums text-blue-700">
                {formatVND(grandTotal)}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg transition-colors shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi tới SAP Service Layer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Tạo Đơn Hàng Trên SAP B1</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Success Modal */}
      {successResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Tạo Sales Order Thành Công!</h3>
              <p className="text-xs text-slate-600 mt-1">
                Chứng từ đã được ghi nhận trên cơ sở dữ liệu SAP B1 HANA qua Service Layer.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã chứng từ (DocEntry):</span>
                <span className="font-mono font-bold text-slate-900">{successResult.docEntry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số đơn SAP (DocNum):</span>
                <span className="font-mono font-bold text-blue-700">{successResult.docNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng giá trị đơn:</span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  {formatVND(successResult.docTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onViewOrder(successResult.docEntry);
                  setSuccessResult(null);
                }}
                className="flex-1 py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Xem Chi Tiết Đơn
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                Tạo Đơn Tiếp Theo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
