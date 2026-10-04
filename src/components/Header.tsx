import React from 'react';
import { ConnectionStatus } from '../types/sap';
import { Settings, RefreshCw, Layers, ShieldCheck, AlertCircle, PlusCircle, ListOrdered, Database, Terminal } from 'lucide-react';

interface HeaderProps {
  currentTab: 'create' | 'list' | 'catalog' | 'logs';
  onSelectTab: (tab: 'create' | 'list' | 'catalog' | 'logs') => void;
  status: ConnectionStatus | null;
  onOpenConfig: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  status,
  onOpenConfig,
  onRefreshData,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Zone 1: Brand Wordmark (Single clean element) */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-xs tracking-wider">
              B1
            </div>
            <div>
              <a
                href="#dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTab('create');
                }}
                className="text-lg font-bold text-slate-900 tracking-tight hover:text-blue-700 transition-colors"
              >
                SAP B1 HANA Service Layer
              </a>
              <p className="text-xs text-slate-500">Cổng Quản Lý & Lập Đơn Bán Hàng (Sales Order)</p>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('create')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'create'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo Đơn Hàng</span>
            </button>

            <button
              onClick={() => onSelectTab('list')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'list'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>Danh Sách Đơn</span>
            </button>

            <button
              onClick={() => onSelectTab('catalog')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'catalog'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Đối Tác & Tồn Kho</span>
            </button>

            <button
              onClick={() => onSelectTab('logs')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'logs'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Payload Inspector</span>
            </button>
          </nav>

          {/* Zone 3: Connection Status & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              title="Làm mới dữ liệu từ SAP"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={onOpenConfig}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                status?.mode === 'live'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {status?.mode === 'live' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span className="font-semibold">
                {status?.mode === 'live' ? 'SAP HANA Live' : 'Sandbox (SBODEMOVN)'}
              </span>
              <span className="text-slate-400">|</span>
              <Settings className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile nav sub-bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
        <button
          onClick={() => onSelectTab('create')}
          className={`px-3 py-1 font-medium rounded ${
            currentTab === 'create' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          Tạo Đơn
        </button>
        <button
          onClick={() => onSelectTab('list')}
          className={`px-3 py-1 font-medium rounded ${
            currentTab === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          Danh Sách
        </button>
        <button
          onClick={() => onSelectTab('catalog')}
          className={`px-3 py-1 font-medium rounded ${
            currentTab === 'catalog' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          Kho & BP
        </button>
        <button
          onClick={() => onSelectTab('logs')}
          className={`px-3 py-1 font-medium rounded ${
            currentTab === 'logs' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          Logs
        </button>
      </div>
    </header>
  );
};
