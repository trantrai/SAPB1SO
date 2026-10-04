import React, { useState, useEffect } from 'react';
import { ConnectionStatus } from '../types/sap';
import { sapApi } from '../services/sapApi';
import {
  X,
  Database,
  ShieldCheck,
  Server,
  Key,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';

interface SapConfigModalProps {
  status: ConnectionStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SapConfigModal: React.FC<SapConfigModalProps> = ({
  status,
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [serverUrl, setServerUrl] = useState('');
  const [companyDB, setCompanyDB] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useSandbox, setUseSandbox] = useState(true);
  const [sslVerify, setSslVerify] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    message: string;
    details?: any;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status) {
      setServerUrl(status.serverUrl || 'https://192.168.1.100:50000/b1s/v1');
      setCompanyDB(status.companyDB || 'SBODEMOVN');
      setUsername(status.username || 'manager');
      setUseSandbox(status.mode === 'sandbox');
    }
  }, [status, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // First save active config so test checks against these settings
      await sapApi.updateConfig({
        serverUrl,
        companyDB,
        username,
        password,
        useSandbox,
        sslVerify,
      });
      const res = await sapApi.testConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Không thể kết nối đến SAP Service Layer',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await sapApi.updateConfig({
        serverUrl,
        companyDB,
        username,
        password,
        useSandbox,
        sslVerify,
      });
      onConfigSaved();
      onClose();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Lỗi lưu cấu hình',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const applyDemoPreset = () => {
    setServerUrl('https://192.168.1.100:50000/b1s/v1');
    setCompanyDB('SBODEMOVN');
    setUsername('manager');
    setPassword('1234');
    setUseSandbox(true);
    setSslVerify(false);
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cấu Hình Kết Nối SAP B1 HANA Service Layer
              </h2>
              <p className="text-xs text-slate-500">
                Giao thức OData REST API (Port 50000 / HTTPS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Mode Switcher */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">
                  Chế Độ Vận Hành
                </span>
                <span className="text-xs text-slate-500">
                  Chuyển đổi giữa Kết nối Trực tiếp SAP HANA và Môi trường Sandbox
                </span>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setUseSandbox(false)}
                  className={`px-3 py-1 font-medium rounded-md transition-colors ${
                    !useSandbox
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live SAP HANA
                </button>
                <button
                  type="button"
                  onClick={() => setUseSandbox(true)}
                  className={`px-3 py-1 font-medium rounded-md transition-colors ${
                    useSandbox
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sandbox Demo
                </button>
              </div>
            </div>

            {useSandbox && (
              <div className="flex items-start gap-2 pt-1 text-[11px] text-blue-700">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Đang dùng bộ dữ liệu mẫu chuẩn SAP B1 HANA (SBODEMOVN) với đầy đủ khách hàng, mặt hàng, bảng giá, kho và số chứng từ tự động tăng.
                </span>
              </div>
            )}
          </div>

          {/* Server URL */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Địa Chỉ Service Layer Endpoint (URL)
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://192.168.1.100:50000/b1s/v1"
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Mặc định cổng Service Layer trên HANA là 50000 hoặc 443 nếu qua Nginx Proxy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company DB */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tên Cơ Sở Dữ Liệu (CompanyDB)
              </label>
              <input
                type="text"
                value={companyDB}
                onChange={(e) => setCompanyDB(e.target.value)}
                placeholder="SBODEMOVN"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tài Khoản SAP (UserName)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="manager"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mật Khẩu SAP (Password)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu người dùng SAP B1..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* SSL Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sslVerify"
              checked={sslVerify}
              onChange={(e) => setSslVerify(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sslVerify" className="text-xs text-slate-600 cursor-pointer">
              Bắt buộc xác thực SSL Certificate (Bỏ chọn nếu server HANA dùng Self-Signed Cert nội bộ)
            </label>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.latencyMs !== undefined && (
                  <p className="font-mono text-[11px]">
                    Độ trễ phản hồi: <strong className="tabular-nums">{testResult.latencyMs} ms</strong>
                  </p>
                )}
                {testResult.details && (
                  <p className="text-[11px] text-slate-600">
                    Phiên bản: {testResult.details.version} · DB: {testResult.details.companyDB}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={applyDemoPreset}
              className="text-xs text-slate-500 hover:text-slate-800 underline text-left"
            >
              Thiết lập lại mẫu Demo
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>Kiểm Tra Kết Nối</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-lg transition-colors shadow-xs"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
