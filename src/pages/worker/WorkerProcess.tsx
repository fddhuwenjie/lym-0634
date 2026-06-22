import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { useAuthStore } from "@/store/auth";
import {
  request,
  formatDateTime,
  useToast,
} from "@/lib/api";
import {
  WorkOrder,
  Material,
  MaterialUsage,
  STATUS_LABELS,
  STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  REPAIR_TYPE_LABELS,
} from "../../../shared/types";
import {
  ArrowLeft,
  MapPin,
  User,
  CheckCircle2,
  Wrench,
  Package,
  Plus,
  Minus,
  Send,
} from "lucide-react";

export default function WorkerProcess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [usedMaterials, setUsedMaterials] = useState<
    { materialId: number; quantity: number }[]
  >([]);
  const [processRemark, setProcessRemark] = useState("");
  const [completeRemark, setCompleteRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [orderRes, matRes] = await Promise.all([
        request(`/api/work-orders/${id}`),
        request("/api/materials"),
      ]);
      setOrder(orderRes.order);
      setProcessRemark(orderRes.order.processRemark || "");
      setMaterials(matRes.materials);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleArrive() {
    if (!order || !user) return;
    try {
      setSubmitting(true);
      const { order: updated } = await request(`/api/work-orders/${id}/arrive`, {
        method: "PUT",
        body: JSON.stringify({ workerId: user.id }),
      });
      setOrder(updated);
      toast.success("签到成功，已开始处理");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveProcess() {
    if (!order || !user) return;
    try {
      setSubmitting(true);
      const { order: updated } = await request(
        `/api/work-orders/${id}/process`,
        {
          method: "PUT",
          body: JSON.stringify({
            workerId: user.id,
            processRemark,
          }),
        }
      );
      setOrder(updated);
      toast.success("处理进度已保存");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function changeMaterialQty(materialId: number, delta: number) {
    setUsedMaterials((prev) => {
      const existing = prev.find((m) => m.materialId === materialId);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) {
          return prev.filter((m) => m.materialId !== materialId);
        }
        return prev.map((m) =>
          m.materialId === materialId ? { ...m, quantity: newQty } : m
        );
      }
      if (delta > 0) {
        return [...prev, { materialId, quantity: delta }];
      }
      return prev;
    });
  }

  function getQty(materialId: number) {
    return usedMaterials.find((m) => m.materialId === materialId)?.quantity || 0;
  }

  async function handleComplete() {
    if (!order || !user) return;
    if (!completeRemark.trim()) {
      toast.error("请填写完工说明");
      return;
    }
    try {
      setSubmitting(true);
      await request(`/api/work-orders/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          workerId: user.id,
          completeRemark,
          completeImages: [],
          materialUsages: usedMaterials,
        }),
      });
      toast.success("工单已完工");
      navigate("/worker/orders");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <div className="text-center py-10 text-slate-500">加载中...</div>;
  if (!order)
    return <div className="text-center py-10 text-slate-500">工单不存在</div>;

  const totalCost = usedMaterials.reduce((sum, um) => {
    const m = materials.find((x) => x.id === um.materialId);
    return sum + (m ? m.price * um.quantity : 0);
  }, 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          返回
        </Button>
        <h2 className="text-xl font-semibold text-slate-800">工单处理</h2>
        <Badge className={STATUS_COLORS[order.status]}>
          {STATUS_LABELS[order.status]}
        </Badge>
        {order.isOverdue && <Badge variant="danger">已超时</Badge>}
        {order.isRework && (
          <Badge variant="warning">返工工单 x{order.reworkCount}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-primary-600" />
                <span className="font-semibold">工单信息</span>
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">工单号</span>
                <p className="font-mono text-slate-700">{order.orderNo}</p>
              </div>
              <div>
                <span className="text-slate-500">地址</span>
                <p className="font-medium text-slate-800">
                  {order.buildingName}-{order.unitNumber}-{order.roomNumber}
                </p>
              </div>
              <div>
                <span className="text-slate-500">报修人</span>
                <p className="font-medium text-slate-800 flex items-center gap-1">
                  <User size={14} />
                  {order.residentName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500">类型</span>
                  <p className="font-medium text-slate-800">
                    {REPAIR_TYPE_LABELS[order.type]}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">紧急程度</span>
                  <p>
                    <Badge className={URGENCY_COLORS[order.urgency]}>
                      {URGENCY_LABELS[order.urgency]}
                    </Badge>
                  </p>
                </div>
              </div>
              <div>
                <span className="text-slate-500">问题描述</span>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {order.description}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">提交时间</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">派单时间</span>
                  <span>{formatDateTime(order.dispatchedAt)}</span>
                </div>
                {order.arriveTime && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">到场时间</span>
                    <span className="text-success">{formatDateTime(order.arriveTime)}</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary-600" />
                <span className="font-semibold">处理步骤</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: "客服派单", done: !!order.dispatchedAt },
                  { label: "到场签到", done: !!order.arriveTime },
                  {
                    label: "处理中",
                    done: order.status === "processing" || order.arriveTime ? true : false,
                  },
                  {
                    label: "完工提交",
                    done: ["pending_evaluation", "closed"].includes(order.status),
                  },
                ].map((s, i, arr) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        s.done
                          ? "bg-accent-500 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {s.done ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm ${
                          s.done ? "text-slate-800 font-medium" : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          className={`w-0.5 h-4 ml-[11px] mt-1 ${
                            s.done ? "bg-accent-200" : "bg-slate-200"
                          }`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {order.status === "dispatched" && (
            <Card className="border-amber-300 bg-amber-50/30">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-800">等待到场签到</div>
                    <div className="text-sm text-amber-600 mt-0.5">
                      请到达现场后点击下方按钮签到开始处理
                    </div>
                  </div>
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={handleArrive}
                    disabled={submitting}
                  >
                    <Wrench size={18} />
                    {submitting ? "签到中..." : "到场签到"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {order.status === "processing" && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-primary-600" />
                    <span className="font-semibold">处理记录</span>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Textarea
                    label="处理说明（可保存更新）"
                    rows={3}
                    value={processRemark}
                    onChange={(e) => setProcessRemark(e.target.value)}
                    placeholder="请记录维修过程、问题原因等"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={handleSaveProcess}
                      disabled={submitting}
                    >
                      保存处理记录
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-primary-600" />
                      <span className="font-semibold">使用材料</span>
                    </div>
                    {usedMaterials.length > 0 && (
                      <span className="text-sm text-slate-500">
                        合计：
                        <span className="font-semibold text-primary-700 ml-1">
                          ¥{totalCost.toFixed(2)}
                        </span>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {materials.map((m) => {
                      const qty = getQty(m.id);
                      const lowStock = m.stock <= m.warningThreshold;
                      return (
                        <div
                          key={m.id}
                          className={`border rounded-lg p-3 ${
                            qty > 0
                              ? "border-accent-400 bg-accent-50"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-slate-800 text-sm">
                                {m.name}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                库存：
                                <span
                                  className={
                                    lowStock ? "text-danger font-medium" : ""
                                  }
                                >
                                  {m.stock} {m.unit}
                                </span>{" "}
                                · ¥{m.price}/{m.unit}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => changeMaterialQty(m.id, -1)}
                                disabled={qty <= 0 || m.stock <= 0}
                                className="w-7 h-7 rounded-md border border-slate-300 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center font-medium">
                                {qty}
                              </span>
                              <button
                                onClick={() => changeMaterialQty(m.id, 1)}
                                disabled={qty >= m.stock}
                                className="w-7 h-7 rounded-md border border-slate-300 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          {lowStock && qty === 0 && (
                            <div className="text-xs text-danger mt-1">
                              ⚠ 库存偏低
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>

              <Card className="border-primary-300">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary-600" />
                    <span className="font-semibold">完工提交</span>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Textarea
                    label="完工说明 *"
                    rows={3}
                    value={completeRemark}
                    onChange={(e) => setCompleteRemark(e.target.value)}
                    placeholder="请详细描述维修完成情况、更换部件、使用说明等"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={handleComplete}
                      disabled={submitting}
                    >
                      <Send size={16} />
                      {submitting ? "提交中..." : "提交完工"}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </>
          )}

          {["pending_evaluation", "closed"].includes(order.status) && (
            <Card className="border-success">
              <CardBody>
                <div className="text-center py-6">
                  <CheckCircle2 size={48} className="mx-auto text-success mb-3" />
                  <div className="font-semibold text-lg text-slate-800">
                    工单已处理完成
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {order.status === "pending_evaluation"
                      ? "等待住户评价"
                      : "工单已关闭"}
                  </div>
                  {order.completeRemark && (
                    <div className="mt-4 text-left bg-slate-50 rounded-lg p-3 text-sm">
                      <div className="text-slate-500 text-xs mb-1">完工说明</div>
                      <div className="text-slate-700 whitespace-pre-wrap">
                        {order.completeRemark}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
