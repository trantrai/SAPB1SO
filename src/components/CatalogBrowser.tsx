import React, { useState } from 'react';
import { Customer, Item, Warehouse } from '../types/sap';
import { Search, Package, Users, Plus, Warehouse as WhIcon, Phone, MapPin, DollarSign } from 'lucide-react';

interface CatalogBrowserProps {
  customers: Customer[];
  items: Item[];
  warehouses: Warehouse[];
  onSelectCustomerForOrder: (cardCode: string) => void;
  onSelectItemForOrder: (itemCode: string) => void;
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  customers,
  items,
  warehouses,
  onSelectCustomerForOrder,
  onSelectItemForOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'customers'>('items');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(
    (i) =>
      i.ItemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.ItemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.CardCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.CardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.City && c.City.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (val: number, cur = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: cur === 'USD' ? 'USD' : 'VND',
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tra Cứu Đối Tác & Tồn Kho SAP B1</h1>
          <p className="text-sm text-slate-600">
            Dữ liệu đồng bộ trực tiếp từ Service Layer: BusinessPartners (OITM) và Items (OITW)
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'items' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Danh Mục Hàng Hóa ({items.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors ${
              activeTab === 'customers' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Khách Hàng ({customers.length})</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={activeTab === 'items' ? 'Tìm theo mã hoặc tên hàng...' : 'Tìm theo mã, tên khách hoặc khu vực...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Tab: Items */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase border-b border-slate-200">
                  <th className="py-2.5 px-3.5 w-28">Mã Hàng</th>
                  <th className="py-2.5 px-3.5 min-w-[280px]">Tên Mặt Hàng</th>
                  <th className="py-2.5 px-3.5 w-24 text-center">ĐVT</th>
                  <th className="py-2.5 px-3.5 w-28 text-center">Kho Mặc Định</th>
                  <th className="py-2.5 px-3.5 w-28 text-right">Tồn Kho</th>
                  <th className="py-2.5 px-3.5 w-36 text-right">Đơn Giá Tham Chiếu</th>
                  <th className="py-2.5 px-3.5 w-32 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.ItemCode} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-700">{item.ItemCode}</td>
                    <td className="py-3 px-3.5 font-medium text-slate-900">{item.ItemName}</td>
                    <td className="py-3 px-3.5 text-center text-slate-600">{item.SalesUnit || 'Cái'}</td>
                    <td className="py-3 px-3.5 text-center font-mono text-slate-600">{item.DefaultWarehouse || '01'}</td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold">
                      <span className={item.QuantityOnStock > 10 ? 'text-emerald-700' : 'text-amber-700'}>
                        {item.QuantityOnStock}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(item.Price || 0, item.Currency)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => onSelectItemForOrder(item.ItemCode)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Lập Đơn</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Customers */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase border-b border-slate-200">
                  <th className="py-2.5 px-3.5 w-28">Mã BP</th>
                  <th className="py-2.5 px-3.5 min-w-[280px]">Tên Khách Hàng (CardName)</th>
                  <th className="py-2.5 px-3.5 w-32">Liên Hệ</th>
                  <th className="py-2.5 px-3.5 w-36">Khu Vực</th>
                  <th className="py-2.5 px-3.5 w-36 text-right">Dư Nợ Hiện Tại</th>
                  <th className="py-2.5 px-3.5 w-36 text-right">Hạn Mức Tín Dụng</th>
                  <th className="py-2.5 px-3.5 w-32 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.CardCode} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-700">{cust.CardCode}</td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900">{cust.CardName}</div>
                      <div className="text-[11px] text-slate-500">{cust.Address}</div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      <div>{cust.Phone1 || '-'}</div>
                      <div className="text-[11px] text-slate-400">{cust.EmailAddress || ''}</div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">{cust.City || 'Toàn quốc'}</td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {formatCurrency(cust.CurrentAccountBalance || 0, cust.Currency)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {formatCurrency(cust.CreditLimit || 0, cust.Currency)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => onSelectCustomerForOrder(cust.CardCode)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Lập Đơn</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
