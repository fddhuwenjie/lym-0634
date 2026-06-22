import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkOrderCard from "@/components/WorkOrderCard";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import { request, useToast } from "@/lib/api";
import { WorkOrder } from "../../../shared/types";
import { Plus, ClipboardList } from "lucide-react";

export default function ResidentOrders() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    try {
      setLoading(true);
      const { orders } = await request(
        `/api/work-orders?residentId=${user.id}`
      );
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">我的工单</h2>
        </div>
        <Button onClick={() => navigate("/resident/report")}>
          <Plus size={16} />
          提交报修
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-10">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">暂无工单，点击右上角提交报修</p>
          <Button onClick={() => navigate("/resident/report")}>
            <Plus size={16} />
            提交报修
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => (
            <WorkOrderCard
              key={o.id}
              order={o}
              onClick={() => navigate(`/resident/orders/${o.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
