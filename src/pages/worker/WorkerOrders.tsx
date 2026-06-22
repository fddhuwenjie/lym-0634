import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkOrderCard from "@/components/WorkOrderCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { useAuthStore } from "@/store/auth";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  WorkOrder,
  WorkOrderStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../../../shared/types";
import { ClipboardList, MapPin } from "lucide-react";

export default function WorkerOrders() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkOrderStatus | "all">("all");

  async function load() {
    if (!user) return;
    try {
      setLoading(true);
      const { orders } = await request(`/api/work-orders?workerId=${user.id}`);
      setOrders(orders);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  const tabs: (WorkOrderStatus | "all")[] = [
    "all",
    "dispatched",
    "processing",
    "pending_evaluation",
    "closed",
  ];
  const tabLabels: Record<string, string> = {
    all: "全部",
    ...STATUS_LABELS,
  };

  const filtered = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">我的工单</h2>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          刷新
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-1 inline-flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
              activeTab === t
                ? "bg-primary-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tabLabels[t]}
            <span
              className={`ml-1.5 text-xs ${
                activeTab === t ? "text-white/80" : "text-slate-400"
              }`}
            >
              ({t === "all" ? orders.length : orders.filter((o) => o.status === t).length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">暂无工单</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((o) => (
            <WorkOrderCard
              key={o.id}
              order={o}
              onClick={() => navigate(`/worker/orders/${o.id}/process`)}
              extra={
                (o.status === "dispatched" || o.status === "processing") && (
                  <Button size="sm" variant="primary">
                    {o.status === "dispatched" ? "到场处理" : "继续处理"}
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
