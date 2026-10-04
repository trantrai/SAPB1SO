import React, { useEffect, useState } from 'react';
import { SalesOrder } from '../types/sap';
import { sapApi } from '../services/sapApi';
import { X, Printer, Copy, Check, FileText, Package, User, Calendar, DollarSign } from 'lucide-react';

interface OrderDetailModalProps {
  docEntry: number | null;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ docEntry, onClose }) => {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docEntry) return;

    setIsLoading(true);
    setError(null);
    sapApi
      .getOrder(docEntry)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải chi tiết đơn hàng');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [docEntry]);

  if (!docEntry) return null;

  const formatCurrency = (val: number, cur = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: cur === 'USD' ? 'USD' : 'VND',
    }).format(val);
  };

  const copyJson = () => {
    if (!order) return;
    navigator.clipboard.writeText(JSON.stringify(order, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold font-mono">
              SO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Sales Order #{order?.DocNum || docEntry}
                </h2>
                {order && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      order.DocumentStatus === 'bost_Open'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : order.DocumentStatus === 'bost_Close'
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {order.DocumentStatus === 'bost_Open'
                      ? 'Đang Mở (bost_Open)'
                      : order.DocumentStatus === 'bost_Close'
                      ? 'Đã Đóng (bost_Close)'
                      : 'Đã Hủy (bost_Canceled)'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">SAP B1 Service Layer DocEntry: {docEntry}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyJson}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Sao chép JSON gốc từ SAP"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="In phiếu đơn hàng"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Đang tải dữ liệu chứng từ từ SAP B1 Service Layer...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              {error}
            </div>
          ) : order ? (
            <>
              {/* Header Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Khách Hàng (Business Partner)
                  </span>
                  <div className="text-sm font-bold text-slate-900">{order.CardName}</div>
                  <div className="font-mono text-slate-600">Mã KH: {order.CardCode}</div>
                  {order.NumAtCard && (
                    <div className="text-slate-600">
                      Số PO khách hàng: <strong className="font-mono text-slate-900">{order.NumAtCard}</strong>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 md:text-right">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Thời Gian & Hạch Toán
                  </span>
                  <div className="text-slate-600">
                    Ngày chứng từ (DocDate): <strong className="font-mono text-slate-900">{order.DocDate}</strong>
                  </div>
                  <div className="text-slate-600">
                    Ngày giao hẹn (DocDueDate): <strong className="font-mono text-slate-900">{order.DocDueDate}</strong>
                  </div>
                  <div className="text-slate-600">
                    Loại tiền: <strong className="font-mono text-slate-900">{order.DocCurrency}</strong>
                  </div>
                </div>

                {order.Comments && (
                  <div className="md:col-span-2 pt-2 border-t border-slate-200 text-slate-600">
                    <span className="font-medium text-slate-700">Ghi chú:</span> {order.Comments}
                  </div>
                )}
              </div>

              {/* Lines Table */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Danh Sách Mặt Hàng (Document Lines)</span>
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase border-b border-slate-200">
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Mã Hàng</th>
                        <th className="py-2 px-3">Tên Hàng Hóa</th>
                        <th className="py-2 px-3 w-20 text-right">SL</th>
                        <th className="py-2 px-3 w-28 text-right">Đơn Giá</th>
                        <th className="py-2 px-3 w-20 text-right">CK (%)</th>
                        <th className="py-2 px-3 w-20 text-center">Kho</th>
                        <th className="py-2 px-3 w-20 text-center">Thuế</th>
                        <th className="py-2 px-3 w-32 text-right">Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(order.DocumentLines || []).map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-700">{line.ItemCode}</td>
                          <td className="py-2.5 px-3 text-slate-800">{line.ItemDescription}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">{line.Quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(line.UnitPrice, order.DocCurrency)}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">{line.DiscountPercent}%</td>
                          <td className="py-2.5 px-3 text-center font-mono">{line.WarehouseCode}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{line.VatGroup}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                            {formatCurrency(line.LineTotal, order.DocCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Footer */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng tiền chứng từ:</span>
                    <span className="font-mono tabular-nums font-semibold">{formatCurrency(order.DocTotal, order.DocCurrency)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Tổng Thanh Toán:</span>
                    <span className="text-lg font-bold font-mono text-blue-700 tabular-nums">
                      {formatCurrency(order.DocTotal, order.DocCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">Service Layer OData v1 · Entity: Orders</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
