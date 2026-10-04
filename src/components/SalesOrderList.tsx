import React, { useState, useMemo } from 'react';
import { SalesOrder } from '../types/sap';
import { MonthlySalesDashboard } from './MonthlySalesDashboard';
import {
  Search,
  Eye,
  XCircle,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  Plus
} from 'lucide-react';

interface SalesOrderListProps {
  orders: SalesOrder[];
  onViewOrder: (docEntry: number) => void;
  onCancelOrder: (docEntry: number) => Promise<void>;
  onCloseOrder: (docEntry: number) => Promise<void>;
  onCreateNew: () => void;
  isLoading: boolean;
}

export const SalesOrderList: React.FC<SalesOrderListProps> = ({
  orders,
  onViewOrder,
  onCancelOrder,
  onCloseOrder,
  onCreateNew,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'bost_Open' | 'bost_Close' | 'bost_Canceled'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.DocNum.toString().includes(searchTerm) ||
        order.CardCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.CardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.NumAtCard && order.NumAtCard.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || order.DocumentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Aggregate stats
  const totalOpenCount = orders.filter((o) => o.DocumentStatus === 'bost_Open').length;
  const totalDocAmount = orders.reduce((sum, o) => sum + (o.DocumentStatus !== 'bost_Canceled' ? o.DocTotal : 0), 0);

  const formatCurrency = (val: number, cur = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: cur === 'USD' ? 'USD' : 'VND',
    }).format(val);
  };

  const getStatusBadge = (status: SalesOrder['DocumentStatus']) => {
    switch (status) {
      case 'bost_Open':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Đang Mở (Open)
          </span>
        );
      case 'bost_Close':
        return (
          <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Đã Đóng (Closed)
          </span>
        );
      case 'bost_Canceled':
        return (
          <span className="inline-flex items-center gap-1 text-red-600 font-medium text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Đã Hủy (Canceled)
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const exportToCsv = () => {
    const headers = ['DocEntry', 'DocNum', 'DocDate', 'DocDueDate', 'CardCode', 'CardName', 'DocTotal', 'DocCurrency', 'Status', 'PO_Ref'];
    const rows = filteredOrders.map((o) => [
      o.DocEntry,
      o.DocNum,
      o.DocDate,
      o.DocDueDate,
      `"${o.CardCode}"`,
      `"${o.CardName.replace(/"/g, '""')}"`,
      o.DocTotal,
      o.DocCurrency,
      o.DocumentStatus,
      `"${(o.NumAtCard || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAP_B1_SalesOrders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancel = async (docEntry: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn HỦY đơn hàng SAP DocEntry #${docEntry}?`)) return;
    setActionLoadingId(docEntry);
    try {
      await onCancelOrder(docEntry);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClose = async (docEntry: number) => {
    if (!window.confirm(`Bạn có chắc chắn muốn ĐÓNG đơn hàng SAP DocEntry #${docEntry}?`)) return;
    setActionLoadingId(docEntry);
    try {
      await onCloseOrder(docEntry);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Danh Sách Đơn Bán Hàng (Sales Orders)</h1>
          <p className="text-sm text-slate-600">
            Tra cứu và quản lý trạng thái các đơn hàng SAP B1 HANA qua Service Layer OData
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tạo Đơn Mới</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics (Without nested cards or fake telemetry) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng Đơn Hàng</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{orders.length}</span>
            <span className="text-xs text-slate-500">Chứng từ SAP</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang Mở (Chờ Giao)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">{totalOpenCount}</span>
            <span className="text-xs text-emerald-600">bost_Open</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng Doanh Số Hiệu Lực</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-700 font-mono tabular-nums">
              {formatCurrency(totalDocAmount)}
            </span>
            <span className="text-xs text-slate-500">VND</span>
          </div>
        </div>
      </div>

      {/* Monthly Sales & Orders Dashboard Chart */}
      <MonthlySalesDashboard orders={orders} />

      {/* Filters and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo số đơn (DocNum), khách hàng, PO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Status Segmented Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 font-medium rounded-md transition-colors ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('bost_Open')}
            className={`px-3 py-1 font-medium rounded-md transition-colors ${
              statusFilter === 'bost_Open' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đang Mở ({orders.filter((o) => o.DocumentStatus === 'bost_Open').length})
          </button>
          <button
            onClick={() => setStatusFilter('bost_Close')}
            className={`px-3 py-1 font-medium rounded-md transition-colors ${
              statusFilter === 'bost_Close' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã Đóng ({orders.filter((o) => o.DocumentStatus === 'bost_Close').length})
          </button>
          <button
            onClick={() => setStatusFilter('bost_Canceled')}
            className={`px-3 py-1 font-medium rounded-md transition-colors ${
              statusFilter === 'bost_Canceled' ? 'bg-white text-red-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã Hủy ({orders.filter((o) => o.DocumentStatus === 'bost_Canceled').length})
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-3.5 w-24">Số Đơn</th>
                <th className="py-2.5 px-3.5 w-28">DocEntry</th>
                <th className="py-2.5 px-3.5 min-w-[220px]">Khách Hàng</th>
                <th className="py-2.5 px-3.5 w-28">Ngày Đặt</th>
                <th className="py-2.5 px-3.5 w-28">Ngày Giao</th>
                <th className="py-2.5 px-3.5 w-28">PO / Ref</th>
                <th className="py-2.5 px-3.5 w-32 text-right">Tổng Tiền</th>
                <th className="py-2.5 px-3.5 w-32 text-center">Trạng Thái</th>
                <th className="py-2.5 px-3.5 w-28 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải danh sách đơn từ SAP Service Layer...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="space-y-2">
                      <p className="font-medium text-slate-700">Chưa có đơn hàng nào phù hợp với bộ lọc</p>
                      <button
                        onClick={onCreateNew}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tạo Đơn Hàng Đầu Tiên</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.DocEntry} className="hover:bg-slate-50/80 transition-colors">
                    {/* DocNum */}
                    <td className="py-3 px-3.5 font-bold font-mono text-blue-700">
                      #{order.DocNum}
                    </td>

                    {/* DocEntry */}
                    <td className="py-3 px-3.5 font-mono text-slate-400">
                      {order.DocEntry}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3.5">
                      <div className="font-medium text-slate-900">{order.CardName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{order.CardCode}</div>
                    </td>

                    {/* DocDate */}
                    <td className="py-3 px-3.5 font-mono tabular-nums text-slate-600">
                      {order.DocDate}
                    </td>

                    {/* DocDueDate */}
                    <td className="py-3 px-3.5 font-mono tabular-nums text-slate-600">
                      {order.DocDueDate}
                    </td>

                    {/* NumAtCard */}
                    <td className="py-3 px-3.5 font-mono text-slate-500">
                      {order.NumAtCard || '-'}
                    </td>

                    {/* DocTotal */}
                    <td className="py-3 px-3.5 text-right font-bold font-mono tabular-nums text-slate-900">
                      {formatCurrency(order.DocTotal, order.DocCurrency)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 text-center">
                      {getStatusBadge(order.DocumentStatus)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onViewOrder(order.DocEntry)}
                          title="Xem chi tiết đơn"
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {order.DocumentStatus === 'bost_Open' && (
                          <>
                            <button
                              onClick={() => handleClose(order.DocEntry)}
                              disabled={actionLoadingId === order.DocEntry}
                              title="Đóng đơn (Close)"
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancel(order.DocEntry)}
                              disabled={actionLoadingId === order.DocEntry}
                              title="Hủy đơn (Cancel)"
                              className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
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
};
