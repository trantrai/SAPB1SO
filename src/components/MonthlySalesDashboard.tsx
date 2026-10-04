import React, { useMemo, useState } from 'react';
import { SalesOrder } from '../types/sap';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowUpRight,
  ShoppingBag,
} from 'lucide-react';

interface MonthlySalesDashboardProps {
  orders: SalesOrder[];
}

export const MonthlySalesDashboard: React.FC<MonthlySalesDashboardProps> = ({ orders }) => {
  const [chartType, setChartType] = useState<'composed' | 'bar' | 'line'>('composed');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Group orders by Year-Month from DocDate
  const monthlyData = useMemo(() => {
    const monthMap: Record<
      string,
      {
        monthKey: string;
        label: string;
        totalAmount: number;
        orderCount: number;
        openCount: number;
        closedCount: number;
        canceledCount: number;
      }
    > = {};

    orders.forEach((order) => {
      if (!order.DocDate) return;
      const dateParts = order.DocDate.split('-');
      if (dateParts.length < 2) return;

      const year = dateParts[0];
      const month = dateParts[1];
      const monthKey = `${year}-${month}`;
      const label = `T${parseInt(month, 10)}/${year.slice(2)}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthKey,
          label,
          totalAmount: 0,
          orderCount: 0,
          openCount: 0,
          closedCount: 0,
          canceledCount: 0,
        };
      }

      monthMap[monthKey].orderCount += 1;
      if (order.DocumentStatus !== 'bost_Canceled') {
        monthMap[monthKey].totalAmount += order.DocTotal || 0;
      }

      if (order.DocumentStatus === 'bost_Open') monthMap[monthKey].openCount += 1;
      else if (order.DocumentStatus === 'bost_Close') monthMap[monthKey].closedCount += 1;
      else if (order.DocumentStatus === 'bost_Canceled') monthMap[monthKey].canceledCount += 1;
    });

    // Sort chronologically
    return Object.values(monthMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [orders]);

  // Aggregate stats
  const { totalRevenue, totalOrdersCount, highestMonth, averageOrderValue } = useMemo(() => {
    let rev = 0;
    let count = 0;
    let highest = { month: 'N/A', amount: 0 };

    monthlyData.forEach((m) => {
      rev += m.totalAmount;
      count += m.orderCount;
      if (m.totalAmount > highest.amount) {
        highest = { month: m.label, amount: m.totalAmount };
      }
    });

    const aov = count > 0 ? Math.round(rev / count) : 0;
    return {
      totalRevenue: rev,
      totalOrdersCount: count,
      highestMonth: highest,
      averageOrderValue: aov,
    };
  }, [monthlyData]);

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatShortVND = (val: number) => {
    if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} tỷ`;
    if (val >= 1000000) return `${Math.round(val / 1000000)} tr`;
    if (val >= 1000) return `${Math.round(val / 1000)} k`;
    return `${val}`;
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2">
          <div className="font-semibold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Tháng: {data.label} ({data.monthKey})</span>
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                <span>Doanh số (DocTotal):</span>
              </span>
              <strong className="font-mono tabular-nums text-slate-900">
                {formatVND(data.totalAmount)}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Số lượng đơn:</span>
              </span>
              <strong className="font-mono tabular-nums text-emerald-700">
                {data.orderCount} đơn
              </strong>
            </div>

            <div className="pt-1.5 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-500">
              <span>Mở: <strong className="font-mono text-emerald-600">{data.openCount}</strong></span>
              <span>·</span>
              <span>Đóng: <strong className="font-mono text-slate-700">{data.closedCount}</strong></span>
              {data.canceledCount > 0 && (
                <>
                  <span>·</span>
                  <span>Hủy: <strong className="font-mono text-red-600">{data.canceledCount}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Biểu Đồ Xu Hướng Doanh Số & Số Lượng Đơn Bán Hàng Theo Tháng
              </h2>
              <span className="text-xs text-slate-500 font-mono">({monthlyData.length} tháng)</span>
            </div>
            <p className="text-xs text-slate-500">
              Dữ liệu tổng hợp trực tiếp từ lịch sử chứng từ Sales Order SAP B1 HANA
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Chart View Mode Switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setChartType('composed')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                chartType === 'composed'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kết Hợp
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                chartType === 'bar'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doanh Số
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                chartType === 'line'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Số Lượng Đơn
            </button>
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
            title={isCollapsed ? 'Mở rộng biểu đồ' : 'Thu gọn biểu đồ'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-5 space-y-5">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Tổng Doanh Số Kỳ Này</span>
              <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                {formatVND(totalRevenue)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Tổng Số Đơn Hàng</span>
              <span className="font-bold text-blue-700 font-mono tabular-nums text-sm">
                {totalOrdersCount} đơn
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Giá Trị TB / Đơn (AOV)</span>
              <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                {formatVND(averageOrderValue)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 block mb-0.5">Tháng Cao Điểm Nhất</span>
              <span className="font-bold text-emerald-700 font-mono tabular-nums text-sm">
                {highestMonth.month} ({formatShortVND(highestMonth.amount)})
              </span>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-64 sm:h-72 w-full pt-2">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chưa có dữ liệu đơn hàng để tạo biểu đồ
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'composed' ? (
                  <ComposedChart data={monthlyData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    {/* Left Axis: Currency */}
                    <YAxis
                      yAxisId="left"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatShortVND}
                      width={60}
                    />
                    {/* Right Axis: Order count */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#059669"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={35}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      iconType="circle"
                      formatter={(val) => <span className="text-slate-700 font-medium">{val}</span>}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="totalAmount"
                      name="Doanh số (VND)"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orderCount"
                      name="Số lượng đơn"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#059669', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={monthlyData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatShortVND}
                      width={60}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar
                      dataKey="totalAmount"
                      name="Doanh số (VND)"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                ) : (
                  <LineChart data={monthlyData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={35}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="orderCount"
                      name="Số lượng đơn"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#059669', strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
