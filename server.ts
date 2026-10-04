import express, { Request, Response } from 'express';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-Memory SAP Configuration & Session
let sapConfig = {
  serverUrl: process.env.SAP_SERVER || 'https://192.168.1.100:50000/b1s/v1',
  companyDB: process.env.SAP_COMPANY_DB || 'SBODEMOVN',
  username: process.env.SAP_USERNAME || 'manager',
  password: process.env.SAP_PASSWORD || '1234',
  useSandbox: process.env.USE_SANDBOX !== 'false', // Default to true (safe sandbox) if not explicitly set
  sslVerify: false, // Default false for intranet HANA servers
};

let b1SessionCookie = '';
let b1RouteIdCookie = '';
let lastSessionCheck = 0;
let lastLatencyMs = 0;
let lastVersion = 'SAP B1 HANA 10.0 FP2305 (Service Layer v1)';

// HTTPS Agent for self-signed certificates common on internal SAP HANA servers
const httpsAgent = new https.Agent({
  rejectUnauthorized: sapConfig.sslVerify,
});

// Audit Log for Service Layer payloads
interface AuditLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  requestPayload: any;
  responseStatus: number;
  responseBody: any;
  durationMs: number;
  mode: 'live' | 'sandbox';
}

const auditLogs: AuditLog[] = [];

function recordLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  auditLogs.unshift({
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    ...log,
  });
  if (auditLogs.length > 50) {
    auditLogs.pop();
  }
}

// ==========================================
// MOCK SAP B1 HANA DATASET (SBODEMOVN)
// ==========================================
let mockCustomers = [
  {
    CardCode: 'C20000',
    CardName: 'Công ty Cổ phần Công nghệ Maxi-Teq',
    Phone1: '028-3829-1122',
    EmailAddress: 'contact@maxi-teq.vn',
    Currency: 'VND',
    CurrentAccountBalance: 125000000,
    CreditLimit: 500000000,
    Address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, P.22, Q. Bình Thạnh',
    City: 'TP. Hồ Chí Minh',
  },
  {
    CardCode: 'C30000',
    CardName: 'Tập đoàn Điện tử Viễn thông Microchips',
    Phone1: '024-3788-9900',
    EmailAddress: 'sales@microchips.com.vn',
    Currency: 'VND',
    CurrentAccountBalance: 45000000,
    CreditLimit: 300000000,
    Address: 'Tầng 12 Keangnam Landmark 72, Phạm Hùng, Q. Nam Từ Liêm',
    City: 'Hà Nội',
  },
  {
    CardCode: 'C40000',
    CardName: 'Công ty TNHH Cơ điện & Thiết bị Earthshaker',
    Phone1: '0236-388-7766',
    EmailAddress: 'orders@earthshaker.vn',
    Currency: 'VND',
    CurrentAccountBalance: 0,
    CreditLimit: 200000000,
    Address: 'Số 45 Nguyễn Văn Linh, Q. Hải Châu',
    City: 'Đà Nẵng',
  },
  {
    CardCode: 'C50000',
    CardName: 'SG Global Logistics & Trading Corp',
    Phone1: '028-3911-5544',
    EmailAddress: 'procurement@sg-global.vn',
    Currency: 'USD',
    CurrentAccountBalance: 15400,
    CreditLimit: 50000,
    Address: 'Phòng 802 Saigon Tower, 29 Lê Duẩn, Q.1',
    City: 'TP. Hồ Chí Minh',
  },
  {
    CardCode: 'C60000',
    CardName: 'Công ty Cổ phần Đầu tư & Phát triển Đông Nam',
    Phone1: '0225-356-8899',
    EmailAddress: 'dongnam.corp@hn.vnn.vn',
    Currency: 'VND',
    CurrentAccountBalance: 82000000,
    CreditLimit: 400000000,
    Address: 'KCN Đình Vũ, Q. Hải An',
    City: 'Hải Phòng',
  },
];

let mockItems = [
  {
    ItemCode: 'A00001',
    ItemName: 'Máy in đa năng laser JB OfficePrint 1420',
    QuantityOnStock: 142,
    DefaultWarehouse: '01',
    SalesUnit: 'Chiếc',
    Price: 4850000,
    Currency: 'VND',
  },
  {
    ItemCode: 'A00002',
    ItemName: 'Máy in màu tốc độ cao Rainbow Laser 100',
    QuantityOnStock: 58,
    DefaultWarehouse: '01',
    SalesUnit: 'Chiếc',
    Price: 7200000,
    Currency: 'VND',
  },
  {
    ItemCode: 'A00003',
    ItemName: 'Máy scan tài liệu công nghiệp ScanJet 3000',
    QuantityOnStock: 25,
    DefaultWarehouse: '01',
    SalesUnit: 'Chiếc',
    Price: 11500000,
    Currency: 'VND',
  },
  {
    ItemCode: 'LM4029SB',
    ItemName: 'Bo mạch chủ máy chủ Server Board X12 DP',
    QuantityOnStock: 80,
    DefaultWarehouse: '01',
    SalesUnit: 'Bộ',
    Price: 16800000,
    Currency: 'VND',
  },
  {
    ItemCode: 'JB0001',
    ItemName: 'Ổ cứng SSD NVMe Doanh nghiệp Enterprise 2TB',
    QuantityOnStock: 320,
    DefaultWarehouse: '01',
    SalesUnit: 'Chiếc',
    Price: 3450000,
    Currency: 'VND',
  },
  {
    ItemCode: 'NET-SW-48',
    ItemName: 'Thiết bị chuyển mạch Switch 48 Cổng PoE+ Gigabit L3',
    QuantityOnStock: 34,
    DefaultWarehouse: '02',
    SalesUnit: 'Thiết bị',
    Price: 22500000,
    Currency: 'VND',
  },
  {
    ItemCode: 'SRV-RACK-42U',
    ItemName: 'Tủ Rack máy chủ Server Cabinet 42U chuẩn quốc tế',
    QuantityOnStock: 12,
    DefaultWarehouse: '02',
    SalesUnit: 'Tủ',
    Price: 18900000,
    Currency: 'VND',
  },
];

const mockWarehouses = [
  { WarehouseCode: '01', WarehouseName: 'Kho Tổng Miền Nam (General Whs)' },
  { WarehouseCode: '02', WarehouseName: 'Kho Trung chuyển & Dự phòng (Regional Whs)' },
  { WarehouseCode: '03', WarehouseName: 'Kho Hàng mẫu & Showroom (Display Whs)' },
];

const mockVatGroups = [
  { Code: 'VAT10', Name: 'Thuế suất GTGT 10%', Rate: 10 },
  { Code: 'VAT08', Name: 'Thuế suất GTGT 8% (Nghị định 44)', Rate: 8 },
  { Code: 'EXEMPT', Name: 'Không chịu thuế (0%)', Rate: 0 },
];

let mockOrders: Array<{
  DocEntry: number;
  DocNum: number;
  DocDate: string;
  DocDueDate: string;
  CardCode: string;
  CardName: string;
  DocTotal: number;
  DocCurrency: string;
  DocumentStatus: 'bost_Open' | 'bost_Close' | 'bost_Canceled';
  Comments?: string;
  NumAtCard?: string;
  DiscountPercent?: number;
  DocumentLines: Array<{
    LineNum: number;
    ItemCode: string;
    ItemDescription: string;
    Quantity: number;
    UnitPrice: number;
    DiscountPercent: number;
    WarehouseCode: string;
    VatGroup: string;
    LineTotal: number;
  }>;
}> = [
  {
    DocEntry: 1042,
    DocNum: 1042,
    DocDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    DocDueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    CardCode: 'C20000',
    CardName: 'Công ty Cổ phần Công nghệ Maxi-Teq',
    DocTotal: 34320000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Open' as const,
    Comments: 'Đơn hàng dự án nâng cấp thiết bị văn phòng Q4. Giao tại kho Landmark 81.',
    NumAtCard: 'PO-MAXI-2026-089',
    DiscountPercent: 0,
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'A00001',
        ItemDescription: 'Máy in đa năng laser JB OfficePrint 1420',
        Quantity: 4,
        UnitPrice: 4850000,
        DiscountPercent: 0,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 19400000,
      },
      {
        LineNum: 1,
        ItemCode: 'JB0001',
        ItemDescription: 'Ổ cứng SSD NVMe Doanh nghiệp Enterprise 2TB',
        Quantity: 4,
        UnitPrice: 3450000,
        DiscountPercent: 5,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 13110000,
      },
    ],
  },
  {
    DocEntry: 1041,
    DocNum: 1041,
    DocDate: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
    DocDueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    CardCode: 'C30000',
    CardName: 'Tập đoàn Điện tử Viễn thông Microchips',
    DocTotal: 73920000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Open' as const,
    Comments: 'Triển khai trung tâm dữ liệu phòng LAB 2. Cần kỹ thuật hỗ trợ test lúc bàn giao.',
    NumAtCard: 'MC-2026-Q3-014',
    DiscountPercent: 2,
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'LM4029SB',
        ItemDescription: 'Bo mạch chủ máy chủ Server Board X12 DP',
        Quantity: 3,
        UnitPrice: 16800000,
        DiscountPercent: 0,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 50400000,
      },
      {
        LineNum: 1,
        ItemCode: 'NET-SW-48',
        ItemDescription: 'Thiết bị chuyển mạch Switch 48 Cổng PoE+ Gigabit L3',
        Quantity: 1,
        UnitPrice: 22500000,
        DiscountPercent: 0,
        WarehouseCode: '02',
        VatGroup: 'VAT10',
        LineTotal: 22500000,
      },
    ],
  },
  {
    DocEntry: 1040,
    DocNum: 1040,
    DocDate: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString().split('T')[0],
    DocDueDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    CardCode: 'C40000',
    CardName: 'Công ty TNHH Cơ điện & Thiết bị Earthshaker',
    DocTotal: 15840000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Close' as const,
    Comments: 'Đã hoàn tất giao nhận và xuất hóa đơn điện tử.',
    NumAtCard: 'ES-ORD-9912',
    DiscountPercent: 0,
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'A00002',
        ItemDescription: 'Máy in màu tốc độ cao Rainbow Laser 100',
        Quantity: 2,
        UnitPrice: 7200000,
        DiscountPercent: 0,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 14400000,
      },
    ],
  },
  {
    DocEntry: 1039,
    DocNum: 1039,
    DocDate: '2026-09-18',
    DocDueDate: '2026-09-25',
    CardCode: 'C50000',
    CardName: 'SG Global Logistics & Trading Corp',
    DocTotal: 84600000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Close' as const,
    Comments: 'Hợp đồng cung cấp định kỳ Q3',
    NumAtCard: 'SG-2026-0918',
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'NET-SW-48',
        ItemDescription: 'Thiết bị chuyển mạch Switch 48 Cổng PoE+ Gigabit L3',
        Quantity: 3,
        UnitPrice: 22500000,
        DiscountPercent: 0,
        WarehouseCode: '02',
        VatGroup: 'VAT10',
        LineTotal: 67500000,
      },
    ],
  },
  {
    DocEntry: 1038,
    DocNum: 1038,
    DocDate: '2026-08-24',
    DocDueDate: '2026-08-30',
    CardCode: 'C60000',
    CardName: 'Công ty Cổ phần Đầu tư & Phát triển Đông Nam',
    DocTotal: 58300000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Close' as const,
    Comments: 'Giao hàng đợt 2 KCN Đình Vũ',
    NumAtCard: 'DN-PO-0824',
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'SRV-RACK-42U',
        ItemDescription: 'Tủ Rack máy chủ Server Cabinet 42U chuẩn quốc tế',
        Quantity: 2,
        UnitPrice: 18900000,
        DiscountPercent: 0,
        WarehouseCode: '02',
        VatGroup: 'VAT10',
        LineTotal: 37800000,
      },
    ],
  },
  {
    DocEntry: 1037,
    DocNum: 1037,
    DocDate: '2026-08-11',
    DocDueDate: '2026-08-18',
    CardCode: 'C20000',
    CardName: 'Công ty Cổ phần Công nghệ Maxi-Teq',
    DocTotal: 41200000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Close' as const,
    Comments: 'Bổ sung thiết bị lưu trữ chi nhánh',
    NumAtCard: 'MAXI-AUG-11',
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'JB0001',
        ItemDescription: 'Ổ cứng SSD NVMe Doanh nghiệp Enterprise 2TB',
        Quantity: 10,
        UnitPrice: 3450000,
        DiscountPercent: 0,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 34500000,
      },
    ],
  },
  {
    DocEntry: 1036,
    DocNum: 1036,
    DocDate: '2026-07-29',
    DocDueDate: '2026-08-05',
    CardCode: 'C30000',
    CardName: 'Tập đoàn Điện tử Viễn thông Microchips',
    DocTotal: 96800000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Close' as const,
    Comments: 'Triển khai phòng máy chủ giai đoạn 1',
    NumAtCard: 'MC-JULY-99',
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'LM4029SB',
        ItemDescription: 'Bo mạch chủ máy chủ Server Board X12 DP',
        Quantity: 5,
        UnitPrice: 16800000,
        DiscountPercent: 0,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 84000000,
      },
    ],
  },
  {
    DocEntry: 1035,
    DocNum: 1035,
    DocDate: '2026-06-15',
    DocDueDate: '2026-06-22',
    CardCode: 'C40000',
    CardName: 'Công ty TNHH Cơ điện & Thiết bị Earthshaker',
    DocTotal: 31680000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Close' as const,
    Comments: 'Đơn hàng định kỳ thiết bị in ấn',
    NumAtCard: 'ES-JUN-15',
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'A00001',
        ItemDescription: 'Máy in đa năng laser JB OfficePrint 1420',
        Quantity: 4,
        UnitPrice: 4850000,
        DiscountPercent: 0,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 19400000,
      },
    ],
  },
  {
    DocEntry: 1034,
    DocNum: 1034,
    DocDate: '2026-05-20',
    DocDueDate: '2026-05-27',
    CardCode: 'C20000',
    CardName: 'Công ty Cổ phần Công nghệ Maxi-Teq',
    DocTotal: 52800000,
    DocCurrency: 'VND',
    DocumentStatus: 'bost_Close' as const,
    Comments: 'Gói thiết bị văn phòng tổng công ty',
    NumAtCard: 'MAXI-MAY-20',
    DocumentLines: [
      {
        LineNum: 0,
        ItemCode: 'A00003',
        ItemDescription: 'Máy scan tài liệu công nghiệp ScanJet 3000',
        Quantity: 4,
        UnitPrice: 11500000,
        DiscountPercent: 0,
        WarehouseCode: '01',
        VatGroup: 'VAT10',
        LineTotal: 46000000,
      },
    ],
  },
];

// Helper to create Axios client for SAP Service Layer
function getSapAxios(): AxiosInstance {
  const cookieHeader = [b1SessionCookie, b1RouteIdCookie].filter(Boolean).join('; ');
  return axios.create({
    baseURL: sapConfig.serverUrl.replace(/\/$/, ''),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: sapConfig.sslVerify,
    }),
    timeout: 15000,
  });
}

// 1. Session Login Handler
async function getSapSession(force = false): Promise<string> {
  if (sapConfig.useSandbox) {
    b1SessionCookie = 'B1SESSION=DEMO_SANDBOX_SESSION_' + Date.now();
    b1RouteIdCookie = 'ROUTEID=.node1';
    lastSessionCheck = Date.now();
    return b1SessionCookie;
  }

  // Reuse session if valid and not forced (sessions last ~30 mins on HANA)
  if (!force && b1SessionCookie && Date.now() - lastSessionCheck < 20 * 60 * 1000) {
    return b1SessionCookie;
  }

  const startTime = Date.now();
  try {
    const loginUrl = `${sapConfig.serverUrl.replace(/\/$/, '')}/Login`;
    const res = await axios.post(
      loginUrl,
      {
        CompanyDB: sapConfig.companyDB,
        UserName: sapConfig.username,
        Password: sapConfig.password,
      },
      {
        httpsAgent: new https.Agent({
          rejectUnauthorized: sapConfig.sslVerify,
        }),
        timeout: 10000,
      }
    );

    lastLatencyMs = Date.now() - startTime;
    lastSessionCheck = Date.now();

    // Extract B1SESSION and ROUTEID from Set-Cookie headers
    const setCookie = res.headers['set-cookie'];
    if (setCookie && Array.isArray(setCookie)) {
      for (const cookieStr of setCookie) {
        if (cookieStr.includes('B1SESSION=')) {
          b1SessionCookie = cookieStr.split(';')[0];
        }
        if (cookieStr.includes('ROUTEID=')) {
          b1RouteIdCookie = cookieStr.split(';')[0];
        }
      }
    }

    if (res.data?.Version) {
      lastVersion = `SAP B1 HANA Service Layer ${res.data.Version}`;
    }

    recordLog({
      method: 'POST',
      endpoint: '/Login',
      requestPayload: { CompanyDB: sapConfig.companyDB, UserName: sapConfig.username, Password: '***' },
      responseStatus: res.status,
      responseBody: { SessionId: res.data?.SessionId, Version: res.data?.Version, SessionTimeout: res.data?.SessionTimeout },
      durationMs: lastLatencyMs,
      mode: 'live',
    });

    return b1SessionCookie;
  } catch (error: any) {
    lastLatencyMs = Date.now() - startTime;
    const errorDetails = error.response?.data || error.message;
    recordLog({
      method: 'POST',
      endpoint: '/Login',
      requestPayload: { CompanyDB: sapConfig.companyDB, UserName: sapConfig.username },
      responseStatus: error.response?.status || 500,
      responseBody: errorDetails,
      durationMs: lastLatencyMs,
      mode: 'live',
    });
    throw new Error(`Đăng nhập SAP Service Layer thất bại: ${error.response?.data?.error?.message?.value || error.message}`);
  }
}

// 2. Generic SAP Service Layer Request Dispatcher (Live or Sandbox)
async function sapRequest(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', endpoint: string, data: any = null): Promise<any> {
  const startTime = Date.now();

  // If in sandbox mode, use simulated Service Layer response
  if (sapConfig.useSandbox) {
    await new Promise((r) => setTimeout(r, 120)); // realistic network latency
    const durationMs = Date.now() - startTime;

    // Simulate different endpoints
    if (endpoint.startsWith('BusinessPartners')) {
      recordLog({ method, endpoint, requestPayload: data, responseStatus: 200, responseBody: { valueCount: mockCustomers.length }, durationMs, mode: 'sandbox' });
      return { value: mockCustomers };
    }

    if (endpoint.startsWith('Items')) {
      recordLog({ method, endpoint, requestPayload: data, responseStatus: 200, responseBody: { valueCount: mockItems.length }, durationMs, mode: 'sandbox' });
      return { value: mockItems };
    }

    if (endpoint.startsWith('Warehouses')) {
      return { value: mockWarehouses };
    }

    if (endpoint.startsWith('VatGroups')) {
      return { value: mockVatGroups };
    }

    if (endpoint.startsWith('Orders')) {
      // GET Orders
      if (method === 'GET') {
        const idMatch = endpoint.match(/Orders\((\d+)\)/);
        if (idMatch) {
          const docEntry = parseInt(idMatch[1], 10);
          const order = mockOrders.find((o) => o.DocEntry === docEntry);
          if (!order) throw new Error(`Không tìm thấy đơn hàng với DocEntry: ${docEntry}`);
          recordLog({ method, endpoint, requestPayload: null, responseStatus: 200, responseBody: order, durationMs, mode: 'sandbox' });
          return order;
        }
        recordLog({ method, endpoint, requestPayload: null, responseStatus: 200, responseBody: { valueCount: mockOrders.length }, durationMs, mode: 'sandbox' });
        return { value: mockOrders };
      }

      // POST Orders (Create Sales Order)
      if (method === 'POST') {
        // Check for /Cancel or /Close action
        const actionMatch = endpoint.match(/Orders\((\d+)\)\/(Cancel|Close)/);
        if (actionMatch) {
          const docEntry = parseInt(actionMatch[1], 10);
          const action = actionMatch[2];
          const order = mockOrders.find((o) => o.DocEntry === docEntry);
          if (!order) throw new Error(`Không tìm thấy đơn hàng ${docEntry}`);
          if (action === 'Cancel') order.DocumentStatus = 'bost_Canceled';
          if (action === 'Close') order.DocumentStatus = 'bost_Close';
          recordLog({ method, endpoint, requestPayload: data, responseStatus: 204, responseBody: { status: 'Updated' }, durationMs, mode: 'sandbox' });
          return { success: true };
        }

        // Standard Create Order
        const nextDocEntry = (mockOrders[0]?.DocEntry || 1000) + 1;
        const nextDocNum = nextDocEntry;
        const customer = mockCustomers.find((c) => c.CardCode === data.CardCode) || {
          CardCode: data.CardCode,
          CardName: 'Khách hàng ' + data.CardCode,
        };

        let calculatedSubtotal = 0;
        let calculatedTax = 0;

        const docLines = (data.DocumentLines || []).map((line: any, idx: number) => {
          const item = mockItems.find((i) => i.ItemCode === line.ItemCode);
          const unitPrice = line.UnitPrice !== undefined ? line.UnitPrice : item?.Price || 0;
          const qty = line.Quantity || 1;
          const disc = line.DiscountPercent || 0;
          const lineTotal = qty * unitPrice * (1 - disc / 100);
          const vatRate = line.VatGroup === 'VAT10' ? 0.1 : line.VatGroup === 'VAT08' ? 0.08 : 0;

          calculatedSubtotal += lineTotal;
          calculatedTax += lineTotal * vatRate;

          // Update stock quantity in sandbox
          if (item) {
            item.QuantityOnStock = Math.max(0, item.QuantityOnStock - qty);
          }

          return {
            LineNum: idx,
            ItemCode: line.ItemCode,
            ItemDescription: item?.ItemName || `Sản phẩm ${line.ItemCode}`,
            Quantity: qty,
            UnitPrice: unitPrice,
            DiscountPercent: disc,
            WarehouseCode: line.WarehouseCode || '01',
            VatGroup: line.VatGroup || 'VAT10',
            LineTotal: Math.round(lineTotal),
          };
        });

        const headerDisc = data.DiscountPercent || 0;
        const totalAfterDisc = calculatedSubtotal * (1 - headerDisc / 100);
        const grandTotal = Math.round(totalAfterDisc + calculatedTax);

        const newOrder = {
          DocEntry: nextDocEntry,
          DocNum: nextDocNum,
          DocDate: data.DocDate || new Date().toISOString().split('T')[0],
          DocDueDate: data.DocDueDate || new Date().toISOString().split('T')[0],
          CardCode: data.CardCode,
          CardName: customer.CardName,
          DocTotal: grandTotal,
          DocCurrency: data.DocCurrency || 'VND',
          DocumentStatus: 'bost_Open' as const,
          Comments: data.Comments || 'Được tạo từ Cổng Quản Lý Web SAP Service Layer',
          NumAtCard: data.NumAtCard || '',
          DiscountPercent: headerDisc,
          DocumentLines: docLines,
        };

        mockOrders.unshift(newOrder);

        const responsePayload = {
          DocEntry: newOrder.DocEntry,
          DocNum: newOrder.DocNum,
          DocTotal: newOrder.DocTotal,
          DocDate: newOrder.DocDate,
          DocDueDate: newOrder.DocDueDate,
          CardCode: newOrder.CardCode,
          CardName: newOrder.CardName,
          DocumentStatus: newOrder.DocumentStatus,
        };

        recordLog({
          method,
          endpoint,
          requestPayload: data,
          responseStatus: 201,
          responseBody: responsePayload,
          durationMs,
          mode: 'sandbox',
        });

        return responsePayload;
      }
    }

    return { success: true };
  }

  // LIVE SAP B1 SERVICE LAYER CALL
  await getSapSession();
  const client = getSapAxios();

  try {
    const res = await client({
      method,
      url: `/${endpoint.replace(/^\//, '')}`,
      data,
    });

    const durationMs = Date.now() - startTime;
    recordLog({
      method,
      endpoint,
      requestPayload: data,
      responseStatus: res.status,
      responseBody: res.data,
      durationMs,
      mode: 'live',
    });

    return res.data;
  } catch (error: any) {
    // If 401 Unauthorized, refresh session and retry once
    if (error.response?.status === 401) {
      await getSapSession(true);
      const retryClient = getSapAxios();
      const retryRes = await retryClient({
        method,
        url: `/${endpoint.replace(/^\//, '')}`,
        data,
      });

      const durationMs = Date.now() - startTime;
      recordLog({
        method,
        endpoint,
        requestPayload: data,
        responseStatus: retryRes.status,
        responseBody: retryRes.data,
        durationMs,
        mode: 'live',
      });

      return retryRes.data;
    }

    const durationMs = Date.now() - startTime;
    const sapError = error.response?.data?.error?.message?.value || error.message;

    recordLog({
      method,
      endpoint,
      requestPayload: data,
      responseStatus: error.response?.status || 500,
      responseBody: error.response?.data || error.message,
      durationMs,
      mode: 'live',
    });

    throw new Error(sapError);
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// Connection status & Diagnostic info
app.get('/api/sap/status', (_req: Request, res: Response) => {
  res.json({
    connected: sapConfig.useSandbox || !!b1SessionCookie,
    mode: sapConfig.useSandbox ? 'sandbox' : 'live',
    serverUrl: sapConfig.serverUrl,
    companyDB: sapConfig.companyDB,
    username: sapConfig.username,
    sessionId: b1SessionCookie ? b1SessionCookie.split(';')[0].replace('B1SESSION=', '') : 'NONE',
    routeId: b1RouteIdCookie || 'NONE',
    version: lastVersion,
    latencyMs: lastLatencyMs,
    lastChecked: lastSessionCheck ? new Date(lastSessionCheck).toISOString() : new Date().toISOString(),
  });
});

// Update SAP Configuration
app.post('/api/sap/config', (req: Request, res: Response) => {
  const { serverUrl, companyDB, username, password, useSandbox, sslVerify } = req.body;

  if (serverUrl !== undefined) sapConfig.serverUrl = serverUrl.trim();
  if (companyDB !== undefined) sapConfig.companyDB = companyDB.trim();
  if (username !== undefined) sapConfig.username = username.trim();
  if (password !== undefined && password.trim() !== '') sapConfig.password = password.trim();
  if (useSandbox !== undefined) sapConfig.useSandbox = !!useSandbox;
  if (sslVerify !== undefined) sapConfig.sslVerify = !!sslVerify;

  // Reset active session when configuration changes
  b1SessionCookie = '';
  b1RouteIdCookie = '';

  res.json({
    success: true,
    message: 'Đã cập nhật cấu hình SAP Service Layer',
    config: {
      serverUrl: sapConfig.serverUrl,
      companyDB: sapConfig.companyDB,
      username: sapConfig.username,
      useSandbox: sapConfig.useSandbox,
      sslVerify: sapConfig.sslVerify,
    },
  });
});

// Test Connection / Ping SAP HANA
app.post('/api/sap/test-connection', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    if (sapConfig.useSandbox) {
      await new Promise((r) => setTimeout(r, 150));
      return res.json({
        success: true,
        latencyMs: 150,
        message: 'Kết nối thành công đến Môi trường Sandbox SAP B1 HANA (SBODEMOVN)',
        details: {
          version: 'SAP Business One HANA 10.0 FP2305 Sandbox',
          companyDB: sapConfig.companyDB,
          userName: sapConfig.username,
          mode: 'sandbox',
        },
      });
    }

    await getSapSession(true);
    const latency = Date.now() - startTime;
    return res.json({
      success: true,
      latencyMs: latency,
      message: 'Kết nối thành công đến SAP Business One HANA Service Layer',
      details: {
        version: lastVersion,
        companyDB: sapConfig.companyDB,
        userName: sapConfig.username,
        mode: 'live',
      },
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return res.status(502).json({
      success: false,
      latencyMs: latency,
      message: 'Không thể kết nối tới SAP HANA Service Layer: ' + error.message,
    });
  }
});

// Customers (Business Partners)
app.get('/api/sap/customers', async (_req: Request, res: Response) => {
  try {
    const data = await sapRequest(
      'GET',
      `BusinessPartners?$filter=CardType eq 'cCustomer' and Valid eq 'tYES'&$select=CardCode,CardName,Phone1,EmailAddress,Currency,CurrentAccountBalance,CreditLimit,Address,ZipCode,City&$top=100`
    );
    res.json(data.value || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Items (Hàng hóa kho)
app.get('/api/sap/items', async (_req: Request, res: Response) => {
  try {
    const data = await sapRequest(
      'GET',
      `Items?$filter=SalesItem eq 'tYES' and Valid eq 'tYES'&$select=ItemCode,ItemName,QuantityOnStock,DefaultWarehouse,SalesUnit,ItemPrices&$top=100`
    );
    res.json(data.value || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Warehouses (Danh mục kho)
app.get('/api/sap/warehouses', async (_req: Request, res: Response) => {
  try {
    const data = await sapRequest('GET', `Warehouses?$select=WarehouseCode,WarehouseName`);
    res.json(data.value || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tax Groups (Thuế VAT)
app.get('/api/sap/vat-groups', async (_req: Request, res: Response) => {
  try {
    const data = await sapRequest('GET', `VatGroups?$select=Code,Name,Rate`);
    res.json(data.value || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Orders List
app.get('/api/sap/orders', async (_req: Request, res: Response) => {
  try {
    const data = await sapRequest(
      'GET',
      `Orders?$select=DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,DocumentStatus,Comments,NumAtCard,DiscountPercent&$orderby=DocEntry desc&$top=100`
    );
    res.json(data.value || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Single Order with DocumentLines
app.get('/api/sap/orders/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const order = await sapRequest('GET', `Orders(${id})`);
    res.json(order);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Create Order (POST /Orders)
app.post('/api/sap/orders', async (req: Request, res: Response) => {
  try {
    const { CardCode, DocDate, DocDueDate, Comments, NumAtCard, DiscountPercent, DocCurrency, U_WebOrderID, U_Carrier, DocumentLines } = req.body;

    if (!CardCode) {
      return res.status(400).json({ error: 'Mã khách hàng (CardCode) là bắt buộc.' });
    }
    if (!DocumentLines || !Array.isArray(DocumentLines) || DocumentLines.length === 0) {
      return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 dòng mặt hàng (DocumentLine).' });
    }

    // SAP Service Layer Orders standard payload
    const payload: any = {
      CardCode,
      DocDueDate: DocDueDate || new Date().toISOString().split('T')[0],
      DocDate: DocDate || new Date().toISOString().split('T')[0],
      DocumentLines: DocumentLines.map((line: any) => ({
        ItemCode: line.ItemCode,
        Quantity: parseFloat(line.Quantity) || 1,
        UnitPrice: line.UnitPrice !== undefined ? parseFloat(line.UnitPrice) : undefined,
        DiscountPercent: line.DiscountPercent !== undefined ? parseFloat(line.DiscountPercent) : undefined,
        WarehouseCode: line.WarehouseCode || undefined,
        VatGroup: line.VatGroup || undefined,
        U_Remark: line.U_Remark || undefined,
      })),
    };

    if (Comments) payload.Comments = Comments;
    if (NumAtCard) payload.NumAtCard = NumAtCard;
    if (DiscountPercent !== undefined && DiscountPercent > 0) payload.DiscountPercent = parseFloat(DiscountPercent);
    if (DocCurrency) payload.DocCurrency = DocCurrency;
    if (U_WebOrderID) payload.U_WebOrderID = U_WebOrderID;
    if (U_Carrier) payload.U_Carrier = U_Carrier;

    const result = await sapRequest('POST', 'Orders', payload);
    res.status(201).json({
      success: true,
      message: `Tạo Sales Order thành công trên SAP B1 (DocNum: ${result.DocNum || result.DocEntry})`,
      order: result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Lỗi khi tạo Sales Order trên SAP Service Layer' });
  }
});

// Cancel Order
app.post('/api/sap/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await sapRequest('POST', `Orders(${id})/Cancel`);
    res.json({ success: true, message: `Đã hủy đơn hàng #${id} trên SAP B1` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Close Order
app.post('/api/sap/orders/:id/close', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await sapRequest('POST', `Orders(${id})/Close`);
    res.json({ success: true, message: `Đã đóng đơn hàng #${id} trên SAP B1` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Audit Logs
app.get('/api/sap/logs', (_req: Request, res: Response) => {
  res.json(auditLogs);
});

// ==========================================
// VITE DEV MIDDLEWARE / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`SAP B1 Service Layer Sales Order Web App running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
