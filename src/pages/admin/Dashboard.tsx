import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { request, useToast, formatDateTime } from "@/lib/api";
import { StatsData, STATUS_LABELS, WorkOrder } from "../../../shared/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  TrendingUp,
  Home,
} from "lucide-react";

const TYPE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const BUILDING_COLORS = ["#06b6d4", "#14b8a6", "#22c55e", "#eab308", "#f97316"];

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const data = await request<StatsData>("/api/admin/stats");
      setStats(data);
      const { orders } = await request("/api/work-orders?limit=5");
      setRecentOrders(orders || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const statCards = stats
    ? [
        {
          label: "总工单",
          value: stats.totalOrders,
          icon: <ClipboardList size={22} />,
          color: "bg-blue-50 text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          label: "处理中",
          value: stats.processingOrders,
          icon: <Clock size={22} />,
          color: "bg-amber-50 text-amber-600",
          bgColor: "bg-amber-50",
        },
        {
          label: "已完成",
          value: stats.completedOrders,
          icon: <CheckCircle2 size={22} />,
          color: "bg-green-50 text-green-600",
          bgColor: "bg-green-50",
        },
        {
          label: "超时工单",
          value: stats.overdueOrders,
          icon: <AlertTriangle size={22} />,
          color: "bg-red-50 text-red-600",
          bgColor: "bg-red-50",
        },
        {
          label: "平均处理时长",
          value: stats.avgProcessMinutes ? `${Math.round(stats.avgProcessMinutes)}分钟` : "-",
          icon: <TrendingUp size={22} />,
          color: "bg-purple-50 text-purple-600",
          bgColor: "bg-purple-50",
        },
        {
          label: "平均评分",
          value: stats.avgRating ? stats.avgRating.toFixed(1) : "-",
          icon: <Star size={22} />,
          color: "bg-yellow-50 text-yellow-600",
          bgColor: "bg-yellow-50",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">
        <ClipboardList size={40} className="mx-auto mb-3 animate-pulse" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">维修看板</h2>
        </div>
        <span className="text-xs text-slate-400">
          更新于 {formatDateTime(new Date().toISOString())}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody className="py-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>
                {s.icon}
              </div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <span className="font-semibold text-slate-800">楼栋工单分布</span>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.ordersByBuilding || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="工单数量" radius={[4, 4, 0, 0]}>
                    {(stats?.ordersByBuilding || []).map((_, i) => (
                      <Cell key={i} fill={BUILDING_COLORS[i % BUILDING_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <span className="font-semibold text-slate-800">维修类型分布</span>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.ordersByType || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {(stats?.ordersByType || []).map((_, i) => (
                      <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <span className="font-semibold text-slate-800">月度工单趋势</span>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.ordersByMonth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="工单数量"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={{ fill: "#0891b2", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="font-semibold text-slate-800">最近工单</span>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">工单号</th>
                  <th className="px-4 py-3 text-left font-medium">地址</th>
                  <th className="px-4 py-3 text-left font-medium">类型</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">维修工</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      暂无工单
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs">{o.orderNo}</td>
                      <td className="px-4 py-3">
                        {o.buildingName}-{o.unitNumber}-{o.roomNumber}
                      </td>
                      <td className="px-4 py-3">{o.description.slice(0, 15)}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-slate-100 text-slate-700">
                          {STATUS_LABELS[o.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{o.workerName || "-"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateTime(o.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
