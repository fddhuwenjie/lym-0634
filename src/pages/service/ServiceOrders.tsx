import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WorkOrderCard from "@/components/WorkOrderCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  WorkOrder,
  WorkOrderStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  BUILDINGS,
  User,
} from "../../../shared/types";
import {
  ClipboardList,
  Filter,
  UserRound,
  MapPin,
  RotateCcw,
  Send,
} from "lucide-react";

export default function ServiceOrders() {
  const navigate = useNavigate();
  const toast = useToast();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", buildingId: "", type: "" });
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<WorkOrder | null>(null);
  const [workers, setWorkers] = useState<User[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [dispatchRemark, setDispatchRemark] = useState("");
  const [dispatching, setDispatching] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.buildingId) params.append("buildingId", filters.buildingId);
      if (filters.type) params.append("type", filters.type);
      const { orders } = await request(`/api/work-orders?${params.toString()}`);
      setOrders(orders);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openDispatch(order: WorkOrder) {
    setDispatchOrder(order);
    setSelectedWorker(null);
    setDispatchRemark("");
    setShowDispatch(true);
    try {
      const { users } = await request("/api/auth/users?role=worker");
      const validWorkers = (users as User[]).filter((w) =>
        (w.buildingIds || []).includes(order.buildingId)
      );
      setWorkers(validWorkers);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDispatch() {
    if (!dispatchOrder || !selectedWorker) {
      toast.error("请选择维修工");
      return;
    }
    setDispatching(true);
    try {
      await request(`/api/work-orders/${dispatchOrder.id}/dispatch`, {
        method: "POST",
        body: JSON.stringify({
          workerId: selectedWorker,
          operatorId: 2,
          operatorName: "李四",
          remark: dispatchRemark,
        }),
      });
      toast.success("派单成功");
      setShowDispatch(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDispatching(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters]);

  const statuses: WorkOrderStatus[] = [
    "pending",
    "dispatched",
    "processing",
    "pending_evaluation",
    "closed",
  ];
  const counts = statuses.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">工单管理</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "", label: "全部状态" },
              ...statuses.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
            ]}
            className="!w-36"
          />
          <Select
            value={filters.buildingId}
            onChange={(e) =>
              setFilters({ ...filters, buildingId: e.target.value })
            }
            options={[
              { value: "", label: "全部楼栋" },
              ...BUILDINGS.map((b) => ({ value: b.id, label: b.name })),
            ]}
            className="!w-36"
          />
          <Button variant="outline" size="sm" onClick={load}>
            <RotateCcw size={14} />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {statuses.map((s) => (
          <Card key={s}>
            <CardBody className="text-center py-4">
              <div className="text-2xl font-bold text-slate-800">
                {counts[s] || 0}
              </div>
              <Badge className={`mt-1 ${STATUS_COLORS[s]}`}>
                {STATUS_LABELS[s]}
              </Badge>
            </CardBody>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <ClipboardList size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">暂无工单</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => (
            <WorkOrderCard
              key={o.id}
              order={o}
              onClick={() => navigate(`/service/orders/${o.id}/dispatch`)}
              extra={
                <div className="flex gap-2">
                  {o.status === "pending" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDispatch(o);
                      }}
                    >
                      <Send size={14} />
                      派单
                    </Button>
                  )}
                  {o.status === "dispatched" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDispatch(o);
                      }}
                    >
                      <RotateCcw size={14} />
                      改派
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {showDispatch && dispatchOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {dispatchOrder.workerId ? "改派工单" : "派单"}
                </span>
                <button
                  onClick={() => setShowDispatch(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                <div>
                  <span className="text-slate-500">工单：</span>
                  <span className="font-mono">{dispatchOrder.orderNo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-slate-400" />
                  {dispatchOrder.buildingName}-{dispatchOrder.unitNumber}-
                  {dispatchOrder.roomNumber}
                </div>
                <div className="text-slate-700 line-clamp-1">
                  {dispatchOrder.description}
                </div>
                {dispatchOrder.workerId && (
                  <div className="text-slate-500">
                    当前维修工：{dispatchOrder.workerName}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择维修工
                  <span className="text-xs text-slate-400 ml-1">
                    （仅显示负责该楼栋的维修工）
                  </span>
                </label>
                {workers.length === 0 ? (
                  <div className="text-sm text-danger py-2">
                    暂无负责该楼栋的维修工
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-auto scrollbar-thin">
                    {workers.map((w) => (
                      <label
                        key={w.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedWorker === w.id
                            ? "border-accent-500 bg-accent-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="worker"
                          checked={selectedWorker === w.id}
                          onChange={() => setSelectedWorker(w.id)}
                          className="accent-accent-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <UserRound size={16} className="text-slate-400" />
                            <span className="font-medium text-slate-800">
                              {w.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            负责楼栋：
                            {(w.buildingIds || [])
                              .map((id) => BUILDINGS.find((b) => b.id === id)?.name)
                              .filter(Boolean)
                              .join("、")}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  派单备注
                </label>
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  rows={2}
                  placeholder="请输入派单备注（可选）"
                  value={dispatchRemark}
                  onChange={(e) => setDispatchRemark(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowDispatch(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleDispatch}
                  disabled={!selectedWorker || dispatching}
                >
                  <Send size={14} />
                  {dispatching ? "提交中..." : "确认派单"}
                </Button>
              </div>
            </CardBody>
          </div>
        </div>
      )}
    </div>
  );
}
