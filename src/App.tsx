import React, { useState, useEffect, useCallback } from 'react';
import { Customer, Item, Warehouse, VatGroup, SalesOrder, ConnectionStatus } from './types/sap';
import { sapApi } from './services/sapApi';
import { Header } from './components/Header';
import { SalesOrderForm } from './components/SalesOrderForm';
import { SalesOrderList } from './components/SalesOrderList';
import { CatalogBrowser } from './components/CatalogBrowser';
import { PayloadInspector } from './components/PayloadInspector';
import { SapConfigModal } from './components/SapConfigModal';
import { OrderDetailModal } from './components/OrderDetailModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'create' | 'list' | 'catalog' | 'logs'>('create');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vatGroups, setVatGroups] = useState<VatGroup[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedDocEntry, setSelectedDocEntry] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load all foundational data
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, custRes, itemRes, whRes, vatRes, orderRes] = await Promise.all([
        sapApi.getStatus(),
        sapApi.getCustomers(),
        sapApi.getItems(),
        sapApi.getWarehouses(),
        sapApi.getVatGroups(),
        sapApi.getOrders(),
      ]);

      setStatus(statusRes);
      setCustomers(custRes);
      setItems(itemRes);
      setWarehouses(whRes);
      setVatGroups(vatRes);
      setOrders(orderRes);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu SAP:', err);
    } finally {
      setIsRefreshing(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create Order Action
  const handleCreateOrder = async (payload: any) => {
    const res = await sapApi.createOrder(payload);
    // Reload orders and items to update stock balances
    const [updatedOrders, updatedItems] = await Promise.all([
      sapApi.getOrders(),
      sapApi.getItems(),
    ]);
    setOrders(updatedOrders);
    setItems(updatedItems);
    return res;
  };

  // Cancel Order Action
  const handleCancelOrder = async (docEntry: number) => {
    await sapApi.cancelOrder(docEntry);
    const updated = await sapApi.getOrders();
    setOrders(updated);
  };

  // Close Order Action
  const handleCloseOrder = async (docEntry: number) => {
    await sapApi.closeOrder(docEntry);
    const updated = await sapApi.getOrders();
    setOrders(updated);
  };

  // Navigate from Catalog to Order creation
  const handleSelectCustomerForOrder = (cardCode: string) => {
    setCurrentTab('create');
  };

  const handleSelectItemForOrder = (itemCode: string) => {
    setCurrentTab('create');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        status={status}
        onOpenConfig={() => setIsConfigOpen(true)}
        onRefreshData={loadData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {initialLoading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">
              Đang kết nối SAP Business One HANA Service Layer...
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Khởi tạo phiên làm việc B1SESSION và đồng bộ dữ liệu đối tác, hàng hóa
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'create' && (
              <SalesOrderForm
                customers={customers}
                items={items}
                warehouses={warehouses}
                vatGroups={vatGroups}
                onSubmitOrder={handleCreateOrder}
                onViewOrder={(docEntry) => setSelectedDocEntry(docEntry)}
              />
            )}

            {currentTab === 'list' && (
              <SalesOrderList
                orders={orders}
                onViewOrder={(docEntry) => setSelectedDocEntry(docEntry)}
                onCancelOrder={handleCancelOrder}
                onCloseOrder={handleCloseOrder}
                onCreateNew={() => setCurrentTab('create')}
                isLoading={isRefreshing}
              />
            )}

            {currentTab === 'catalog' && (
              <CatalogBrowser
                customers={customers}
                items={items}
                warehouses={warehouses}
                onSelectCustomerForOrder={handleSelectCustomerForOrder}
                onSelectItemForOrder={handleSelectItemForOrder}
              />
            )}

            {currentTab === 'logs' && <PayloadInspector />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>SAP Business One HANA Service Layer (OData v1/v4)</span>
            <span className="mx-2">·</span>
            <span>Hỗ trợ session cookie pooling (B1SESSION & ROUTEID)</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Server: <strong className="font-mono text-slate-700">{status?.serverUrl?.split('//')[1] || 'HANA'}</strong></span>
            <span>·</span>
            <span>DB: <strong className="font-mono text-slate-700">{status?.companyDB}</strong></span>
          </div>
        </div>
      </footer>

      {/* SAP Service Layer Config Modal */}
      <SapConfigModal
        status={status}
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigSaved={loadData}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        docEntry={selectedDocEntry}
        onClose={() => setSelectedDocEntry(null)}
      />
    </div>
  );
}
