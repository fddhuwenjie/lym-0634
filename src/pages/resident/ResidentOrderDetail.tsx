import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea, Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/auth";
import { request, formatDateTime, useToast } from "@/lib/api";
import {
  WorkOrder,
  DispatchLog,
  Evaluation,
  STATUS_LABELS,
  STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  REPAIR_TYPE_LABELS,
  SlaRecord,
  SlaEscalation,
  SlaWarning,
  SLA_STATUS_LABELS,
  SLA_STATUS_COLORS,
  SLA_STAGE_LABELS,
  WorkOrderWithSla,
} from "../../../shared/types";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  User,
  FileText,
  Send,
  Package,
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
} from "lucide-react";

interface MaterialUsage {
  id: number;
  materialName: string;
  quantity: number;
  unit: string;
  price: number;
  totalPrice: number;
}

export default function ResidentOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  const [order, setOrder] = useState<WorkOrderWithSla | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);
  const [materials, setMaterials] = useState<MaterialUsage[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [slaRecords, setSlaRecords] = useState<SlaRecord[]>([]);
  const [slaEscalations, setSlaEscalations] = useState<SlaEscalation[]>([]);
  const [slaWarnings, setSlaWarnings] = useState<SlaWarning[]>([]);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const data = await request(`/api/work-orders/${id}`);
      setOrder(data.order);
      setDispatchLogs(data.dispatchLogs || []);
      setMaterials(data.materials || []);
      setEvaluation(data.evaluation);
      
      try {
        const slaData = await request(`/api/sla/orders/${id}`);
        setOrder(slaData.order);
        setSlaRecords(slaData.slaRecords || []);
        setSlaEscalations(slaData.escalations || []);
        setSlaWarnings(slaData.warnings || []);
      } catch (slaError) {
        console.log("SLA 数据加载失败", slaError);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleEvaluate() {
    if (!user || !order) return;
    if (!content.trim()) {
      toast.error("请填写评价内容");
      return;
    }
    setSubmitting(true);
    try {
      await request(`/api/work-orders/${id}/evaluate`, {
        method: "POST",
        body: JSON.stringify({
          residentId: user.id,
          rating,
          content,
        }),
      });
      toast.success("评价成功");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-10 text-slate-500">加载中...</div>;
  if (!order) return <div className="text-center py-10 text-slate-500">工单不存在</div>;

  const isEvaluationLocked =
    order.status === "pending_evaluation" &&
    order.completedAt &&
    Date.now() - new Date(order.completedAt).getTime() > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          返回
        </Button>
        <h2 className="text-xl font-semibold text-slate-800">工单详情</h2>
        <Badge className={STATUS_COLORS[order.status]}>
          {STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-primary-600" />
                  <span className="font-semibold">报修信息</span>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {order.orderNo}
                </span>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">报修类型</span>
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
                <div className="col-span-2">
                  <span className="text-slate-500">报修地址</span>
                  <p className="font-medium text-slate-800 flex items-center gap-1">
                    <MapPin size={14} />
                    {order.buildingName} {order.unitNumber}单元 {order.roomNumber}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">报修人</span>
                  <p className="font-medium text-slate-800 flex items-center gap-1">
                    <User size={14} />
                    {order.residentName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">提交时间</span>
                  <p className="font-medium text-slate-800 flex items-center gap-1">
                    <Clock size={14} />
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-500 text-sm">问题描述</span>
                <p className="mt-1 text-slate-800 whitespace-pre-wrap">
                  {order.description}
                </p>
              </div>
            </CardBody>
          </Card>

          {order && order.currentSlaStatus && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-primary-600" />
                  <span className="font-semibold">SLA 服务时效</span>
                  <Badge className={SLA_STATUS_COLORS[order.currentSlaStatus]}>
                    {SLA_STATUS_LABELS[order.currentSlaStatus]}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {order.currentStage && (
                  <div className="text-sm">
                    <span className="text-slate-500">当前阶段：</span>
                    <span className="font-medium text-slate-800">
                      {SLA_STAGE_LABELS[order.currentStage]}
                    </span>
                  </div>
                )}
                {order.currentDeadline && (
                  <div className="text-sm">
                    <span className="text-slate-500">截止时间：</span>
                    <span className="font-medium text-slate-800">
                      {formatDateTime(order.currentDeadline)}
                    </span>
                  </div>
                )}
                {order.remainingMinutes !== null && (
                  <div className="text-sm">
                    <span className="text-slate-500">剩余时间：</span>
                    <span
                      className={`font-medium ${
                        order.remainingMinutes < 0 ? "text-red-600" : "text-slate-800"
                      }`}
                    >
                      {order.remainingMinutes < 0
                        ? `已超时 ${Math.abs(order.remainingMinutes)} 分钟`
                        : `${order.remainingMinutes} 分钟`}
                    </span>
                  </div>
                )}
                {slaRecords.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-sm font-medium text-slate-700 mb-2">
                      SLA 记录
                    </div>
                    <div className="space-y-2">
                      {slaRecords.map((record) => (
                        <div
                          key={record.id}
                          className="p-2 bg-slate-50 rounded-lg text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {SLA_STAGE_LABELS[record.stage]}阶段
                            </span>
                            <Badge className={SLA_STATUS_COLORS[record.status]}>
                              {SLA_STATUS_LABELS[record.status]}
                            </Badge>
                          </div>
                          <div className="text-slate-500 space-y-0.5">
                            <div>
                              时限：{record.limitMinutes}分钟，截止：
                              {formatDateTime(record.deadline)}
                            </div>
                            {record.actualMinutes && (
                              <div>实际用时：{record.actualMinutes}分钟</div>
                            )}
                            {record.pauseMinutes > 0 && (
                              <div className="text-amber-600">
                                暂停时长：{record.pauseMinutes}分钟
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {slaEscalations.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-sm font-medium text-slate-700 mb-2">
                      升级记录
                    </div>
                    <div className="space-y-2">
                      {slaEscalations.map((esc) => (
                        <div
                          key={esc.id}
                          className={`p-3 rounded-lg text-xs ${
                            esc.isResolved
                              ? "bg-green-50 border border-green-200"
                              : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-red-700">
                              <ArrowUpCircle size={12} className="inline mr-1" />
                              {esc.triggerReason}
                            </span>
                            <Badge
                              className={
                                esc.isResolved
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }
                            >
                              {esc.isResolved ? "已解除" : "待处理"}
                            </Badge>
                          </div>
                          <div className="text-slate-600 space-y-0.5">
                            <div>升级对象：{esc.escalatedToUserName}</div>
                            <div>升级时间：{formatDateTime(esc.createdAt)}</div>
                            {esc.handlerRemark && (
                              <div>处理意见：{esc.handlerRemark}</div>
                            )}
                            {esc.resolution && (
                              <div className="text-green-700">
                                <CheckCircle2
                                  size={12}
                                  className="inline mr-1"
                                />
                                处理结果：{esc.resolution}
                              </div>
                            )}
                            {esc.resolvedAt && (
                              <div>解除时间：{formatDateTime(esc.resolvedAt)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {slaWarnings.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-sm font-medium text-slate-700 mb-2">
                      预警记录
                    </div>
                    <div className="space-y-2">
                      {slaWarnings.map((warning) => (
                        <div
                          key={warning.id}
                          className="p-2 bg-amber-50 rounded-lg text-xs border border-amber-200"
                        >
                          <div className="text-amber-700">
                            <AlertTriangle
                              size={12}
                              className="inline mr-1"
                            />
                            {SLA_STAGE_LABELS[warning.stage]}
                            阶段剩余 {warning.remainingMinutes} 分钟
                          </div>
                          <div className="text-amber-600 text-xs mt-1">
                            {formatDateTime(warning.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {order.workerName && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User size={18} className="text-primary-600" />
                  <span className="font-semibold">处理信息</span>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500">维修工</span>
                    <p className="font-medium text-slate-800">{order.workerName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">派单时间</span>
                    <p className="font-medium text-slate-800">
                      {formatDateTime(order.dispatchedAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">到场时间</span>
                    <p className="font-medium text-slate-800">
                      {formatDateTime(order.arriveTime)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">完工时间</span>
                    <p className="font-medium text-slate-800">
                      {formatDateTime(order.completedAt)}
                    </p>
                  </div>
                </div>
                {order.processRemark && (
                  <div>
                    <span className="text-slate-500">处理说明</span>
                    <p className="mt-1 text-slate-800 whitespace-pre-wrap">
                      {order.processRemark}
                    </p>
                  </div>
                )}
                {order.completeRemark && (
                  <div>
                    <span className="text-slate-500">完工说明</span>
                    <p className="mt-1 text-slate-800 whitespace-pre-wrap">
                      {order.completeRemark}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {materials.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-primary-600" />
                  <span className="font-semibold">使用材料</span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="pb-2 font-normal">材料名称</th>
                        <th className="pb-2 font-normal">数量</th>
                        <th className="pb-2 font-normal">单价</th>
                        <th className="pb-2 font-normal text-right">小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="py-2 text-slate-800">{m.materialName}</td>
                          <td className="py-2 text-slate-700">
                            {m.quantity} {m.unit}
                          </td>
                          <td className="py-2 text-slate-700">¥{m.price}</td>
                          <td className="py-2 text-right font-medium">
                            ¥{m.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} className="py-2 text-right text-slate-500">
                          合计
                        </td>
                        <td className="py-2 text-right font-semibold text-primary-700">
                          ¥
                          {materials
                            .reduce((s, m) => s + m.totalPrice, 0)
                            .toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          {dispatchLogs.length > 0 && (
            <Card>
              <CardHeader>
                <span className="font-semibold">派单记录</span>
              </CardHeader>
              <CardBody className="space-y-3">
                {dispatchLogs.map((log) => (
                  <div key={log.id} className="text-sm border-l-2 border-primary-200 pl-3 py-1">
                    <div className="text-slate-500 text-xs">
                      {formatDateTime(log.createdAt)}
                    </div>
                    <div className="text-slate-800">
                      {log.operatorName} {log.remark}
                      {log.fromWorkerName && (
                        <>
                          {" "}从 <b>{log.fromWorkerName}</b> 改派至{" "}
                          <b>{log.toWorkerName}</b>
                        </>
                      )}
                      {!log.fromWorkerName && (
                        <> 给 <b>{log.toWorkerName}</b></>
                      )}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {order.status === "pending_evaluation" && !evaluation && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-warning" />
                  <span className="font-semibold">服务评价</span>
                  {isEvaluationLocked && (
                    <Badge variant="danger">已超时，无法评价</Badge>
                  )}
                </div>
              </CardHeader>
              {!isEvaluationLocked && (
                <CardBody className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      评分
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            size={32}
                            className={
                              n <= rating
                                ? "fill-warning text-warning"
                                : "text-slate-300"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    label="评价内容"
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="请描述您对本次服务的评价"
                  />
                  <Button onClick={handleEvaluate} disabled={submitting}>
                    <Send size={16} />
                    {submitting ? "提交中..." : "提交评价"}
                  </Button>
                </CardBody>
              )}
            </Card>
          )}

          {evaluation && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-warning" />
                  <span className="font-semibold">我的评价</span>
                  {evaluation.isLocked && (
                    <Badge variant="danger">已锁定</Badge>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={20}
                      className={
                        n <= evaluation.rating
                          ? "fill-warning text-warning"
                          : "text-slate-300"
                      }
                    />
                  ))}
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {evaluation.content}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {formatDateTime(evaluation.createdAt)}
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <span className="font-semibold">工单流转</span>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: "提交报修", time: order.createdAt, done: true },
                  {
                    label: "客服派单",
                    time: order.dispatchedAt,
                    done: !!order.dispatchedAt,
                  },
                  {
                    label: "维修工到场",
                    time: order.arriveTime,
                    done: !!order.arriveTime,
                  },
                  {
                    label: "维修完工",
                    time: order.completedAt,
                    done: !!order.completedAt,
                  },
                  {
                    label: "完成评价",
                    time: order.closedAt,
                    done: order.status === "closed",
                  },
                ].map((step, i, arr) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.done
                          ? "bg-accent-500 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm ${
                          step.done ? "text-slate-800 font-medium" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </div>
                      {step.time && (
                        <div className="text-xs text-slate-500">
                          {formatDateTime(step.time)}
                        </div>
                      )}
                      {i < arr.length - 1 && (
                        <div
                          className={`w-0.5 h-4 ml-[11px] mt-1 ${
                            step.done ? "bg-accent-200" : "bg-slate-200"
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
      </div>
    </div>
  );
}
