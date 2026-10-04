import { Customer, Item, Warehouse, VatGroup, SalesOrder, ConnectionStatus, PayloadAuditLog } from '../types/sap';

export const sapApi = {
  async getStatus(): Promise<ConnectionStatus> {
    const res = await fetch('/api/sap/status');
    if (!res.ok) throw new Error('Không thể tải trạng thái kết nối');
    return res.json();
  },

  async updateConfig(config: {
    serverUrl: string;
    companyDB: string;
    username: string;
    password?: string;
    useSandbox: boolean;
    sslVerify: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/sap/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Cập nhật cấu hình thất bại');
    }
    return res.json();
  },

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string; details?: any }> {
    const res = await fetch('/api/sap/test-connection', {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Kiểm tra kết nối thất bại');
    }
    return data;
  },

  async getCustomers(): Promise<Customer[]> {
    const res = await fetch('/api/sap/customers');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi khi tải danh sách khách hàng');
    }
    return res.json();
  },

  async getItems(): Promise<Item[]> {
    const res = await fetch('/api/sap/items');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi khi tải danh sách mặt hàng');
    }
    return res.json();
  },

  async getWarehouses(): Promise<Warehouse[]> {
    const res = await fetch('/api/sap/warehouses');
    if (!res.ok) return [];
    return res.json();
  },

  async getVatGroups(): Promise<VatGroup[]> {
    const res = await fetch('/api/sap/vat-groups');
    if (!res.ok) return [];
    return res.json();
  },

  async getOrders(): Promise<SalesOrder[]> {
    const res = await fetch('/api/sap/orders');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi khi tải danh sách đơn hàng');
    }
    return res.json();
  },

  async getOrder(id: number): Promise<SalesOrder> {
    const res = await fetch(`/api/sap/orders/${id}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Không tìm thấy đơn hàng #${id}`);
    }
    return res.json();
  },

  async createOrder(payload: any): Promise<{ success: boolean; message: string; order: any }> {
    const res = await fetch('/api/sap/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi khi tạo Sales Order trên SAP B1');
    }
    return data;
  },

  async cancelOrder(docEntry: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/sap/orders/${docEntry}/cancel`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Không thể hủy đơn hàng #${docEntry}`);
    }
    return data;
  },

  async closeOrder(docEntry: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/sap/orders/${docEntry}/close`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Không thể đóng đơn hàng #${docEntry}`);
    }
    return data;
  },

  async getLogs(): Promise<PayloadAuditLog[]> {
    const res = await fetch('/api/sap/logs');
    if (!res.ok) return [];
    return res.json();
  },
};
