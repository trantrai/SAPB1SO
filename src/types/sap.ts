export interface Customer {
  CardCode: string;
  CardName: string;
  Phone1?: string;
  EmailAddress?: string;
  Currency?: string;
  CurrentAccountBalance?: number;
  CreditLimit?: number;
  Address?: string;
  ZipCode?: string;
  City?: string;
}

export interface ItemPrice {
  PriceList: number;
  Price: number;
  Currency: string;
}

export interface Item {
  ItemCode: string;
  ItemName: string;
  QuantityOnStock: number;
  DefaultWarehouse?: string;
  SalesUnit?: string;
  Price?: number;
  Currency?: string;
  ItemPrices?: ItemPrice[];
}

export interface Warehouse {
  WarehouseCode: string;
  WarehouseName: string;
}

export interface VatGroup {
  Code: string;
  Name: string;
  Rate: number;
}

export interface OrderLineItem {
  id: string; // client temporary id
  ItemCode: string;
  ItemDescription: string;
  Quantity: number;
  UnitPrice: number;
  DiscountPercent: number;
  WarehouseCode: string;
  VatGroup: string;
  TaxPercentage: number;
  LineTotal: number;
  UnitsOfMeasurment?: string;
  U_Remark?: string;
}

export interface SapOrderPayload {
  CardCode: string;
  DocDate?: string;
  DocDueDate: string;
  TaxDate?: string;
  NumAtCard?: string;
  Comments?: string;
  DiscountPercent?: number;
  DocCurrency?: string;
  U_WebOrderID?: string;
  U_Carrier?: string;
  DocumentLines: Array<{
    ItemCode: string;
    Quantity: number;
    UnitPrice?: number;
    DiscountPercent?: number;
    WarehouseCode?: string;
    VatGroup?: string;
    U_Remark?: string;
  }>;
}

export interface SalesOrder {
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
  DocumentLines?: Array<{
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
}

export interface SapServiceLayerConfig {
  serverUrl: string;
  companyDB: string;
  username: string;
  password?: string;
  useSandbox: boolean;
  sslVerify: boolean;
}

export interface ConnectionStatus {
  connected: boolean;
  mode: 'live' | 'sandbox';
  serverUrl: string;
  companyDB: string;
  username: string;
  sessionId?: string;
  routeId?: string;
  version?: string;
  latencyMs?: number;
  lastChecked?: string;
  error?: string;
}

export interface PayloadAuditLog {
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
