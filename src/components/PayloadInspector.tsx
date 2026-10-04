import React, { useState, useEffect } from 'react';
import { PayloadAuditLog } from '../types/sap';
import { sapApi } from '../services/sapApi';
import { Terminal, RefreshCw, Copy, Check, Code2, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

export const PayloadInspector: React.FC = () => {
  const [logs, setLogs] = useState<PayloadAuditLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeLang, setCodeLang] = useState<'curl' | 'nodejs' | 'python'>('nodejs');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await sapApi.getLogs();
      setLogs(data);
      if (data.length > 0 && !selectedLogId) {
        setSelectedLogId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const selectedLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCurlSnippet = (log: PayloadAuditLog) => {
    const hasData = log.requestPayload && Object.keys(log.requestPayload).length > 0;
    return `curl -k -X ${log.method} "https://<SAP_HANA_IP>:50000/b1s/v1/${log.endpoint.replace(/^\//, '')}" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: B1SESSION=<YOUR_SESSION_ID>; ROUTEID=.node1" \\${
    hasData ? `\n  -d '${JSON.stringify(log.requestPayload, null, 2)}'` : ''
  }`;
  };

  const getNodeJsSnippet = (log: PayloadAuditLog) => {
    return `const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

async function executeServiceLayer() {
  const response = await axios({
    method: '${log.method}',
    url: 'https://<SAP_HANA_IP>:50000/b1s/v1/${log.endpoint.replace(/^\//, '')}',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'B1SESSION=...'
    },
    data: ${log.requestPayload ? JSON.stringify(log.requestPayload, null, 4) : 'undefined'},
    httpsAgent: agent
  });
  console.log(response.data);
}`;
  };

  const getPythonSnippet = (log: PayloadAuditLog) => {
    return `import requests

url = "https://<SAP_HANA_IP>:50000/b1s/v1/${log.endpoint.replace(/^\//, '')}"
headers = {
    "Content-Type": "application/json",
    "Cookie": "B1SESSION=..."
}
payload = ${log.requestPayload ? JSON.stringify(log.requestPayload, null, 4) : 'None'}

response = requests.request("${log.method}", url, headers=headers, json=payload, verify=False)
print(response.json())`;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Service Layer Payload Inspector</h1>
          <p className="text-sm text-slate-600">
            Giám sát thời gian thực các request/response OData gửi tới SAP B1 HANA Service Layer
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm Mới Logs</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Request List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 uppercase tracking-wider">Lịch Sử Yêu Cầu ({logs.length})</span>
            <span className="text-slate-500 font-mono text-[11px]">B1SESSION Pooled</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có request nào được ghi nhận. Thử tạo đơn hoặc làm mới danh sách.
              </div>
            ) : (
              logs.map((log) => {
                const isSelected = log.id === (selectedLog?.id || '');
                const isError = log.responseStatus >= 400;

                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className={`w-full text-left p-3 transition-colors text-xs flex flex-col gap-1.5 ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                            log.method === 'POST'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.method}
                        </span>
                        <span className="font-mono text-slate-800 font-medium truncate max-w-[180px]">
                          {log.endpoint}
                        </span>
                      </div>

                      <span
                        className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold ${
                          isError
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {log.responseStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span className="tabular-nums">{log.durationMs}ms</span>
                      </span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Request & Response Details */}
        <div className="lg:col-span-7 space-y-4">
          {selectedLog ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedLog.method} {selectedLog.endpoint}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                        selectedLog.responseStatus >= 400
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Status: {selectedLog.responseStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Thời gian: {selectedLog.timestamp} · Độ trễ: {selectedLog.durationMs}ms · Chế độ: {selectedLog.mode}
                  </p>
                </div>
              </div>

              {/* Code Snippet Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Đoạn Mã Gọi API (Code Snippet)
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-xs font-mono">
                    {(['nodejs', 'curl', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setCodeLang(lang)}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          codeLang === lang ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative bg-slate-950 text-slate-200 p-3.5 rounded-xl font-mono text-xs overflow-x-auto">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        codeLang === 'nodejs'
                          ? getNodeJsSnippet(selectedLog)
                          : codeLang === 'curl'
                          ? getCurlSnippet(selectedLog)
                          : getPythonSnippet(selectedLog),
                        'snippet'
                      )
                    }
                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-white rounded bg-slate-800"
                    title="Sao chép code"
                  >
                    {copiedCode === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {codeLang === 'nodejs'
                      ? getNodeJsSnippet(selectedLog)
                      : codeLang === 'curl'
                      ? getCurlSnippet(selectedLog)
                      : getPythonSnippet(selectedLog)}
                  </pre>
                </div>
              </div>

              {/* Request Payload */}
              {selectedLog.requestPayload && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Request Body (JSON Payload):</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.requestPayload, null, 2), 'req')}
                      className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1"
                    >
                      {copiedCode === 'req' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-800">
                    {JSON.stringify(selectedLog.requestPayload, null, 2)}
                  </pre>
                </div>
              )}

              {/* Response Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Response Body (SAP Service Layer):</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedLog.responseBody, null, 2), 'res')}
                    className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1"
                  >
                    {copiedCode === 'res' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono text-xs max-h-60 overflow-y-auto whitespace-pre-wrap text-slate-800">
                  {JSON.stringify(selectedLog.responseBody, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center text-slate-500 text-sm">
              Chọn một bản ghi bên trái để phân tích payload
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
