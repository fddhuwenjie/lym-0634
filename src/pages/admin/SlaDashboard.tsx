import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  SlaDashboardStats,
  WorkOrderWithSla,
  SlaEscalation,
  SLA_STATUS_LABELS,
  SLA_STATUS_COLORS,
  SLA_STAGE_LABELS,
  STATUS_LABELS,
  REPAIR_TYPE_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
} from "../../../shared/types";
import {
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  MessageSquare,
  UserCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type TabType = "warning" | "overdue" | "escalated" | "resolved";

export default function SlaDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<SlaDashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("warning");
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [handlingEscalation, setHandlingEscalation] = useState<number | null>(null);
  const [handlerRemark, setHandlerRemark] = useState("");
  const [resolution, setResolution] = useState("");
  const [resolvingEscalation, setResolvingEscalation] = useState<number | null>(null);

  async function loadStats() {
    try {
      setLoading(true);
      const { stats } = await request<{ stats: SlaDashboardStats }>("/api/sla/dashboard");
      setStats(stats);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  function getOrdersForTab(): WorkOrderWithSla[] {
    if (!stats) return [];
    switch (activeTab) {
      case "warning":
        return stats.warningOrders;
      case "overdue":
        return stats.overdueOrders;
      case "escalated":
        return stats.escalatedOrders;
      case "resolved":
        return stats.resolvedOrders;
      default:
        return [];
    }
  }

  const tabs: {
    key: TabType;
    label: string;
    icon: any;
    color: string;
    count: number;
  }[] = [
    {
      key: "warning",
      label: "即将超时",
      icon: AlertTriangle,
      color: "bg-amber-500",
      count: stats?.warningCount || 0,
    },
    {
      key: "overdue",
      label: "已超时",
      icon: Clock,
      color: "bg-red-500",
      count: stats?.overdueCount || 0,
    },
    {
      key: "escalated",
      label: "已升级",
      icon: ArrowUpCircle,
      color: "bg-purple-500",
      count: stats?.escalatedCount || 0,
    },
    {
      key: "resolved",
      label: "已解除",
      icon: CheckCircle2,
      color: "bg-green-500",
      count: stats?.resolvedCount || 0,
    },
  ];

  async function handleEscalation(escalationId: number) {
    try {
      await request(`/api/sla/escalations/${escalationId}/handle`, {
        method: "POST",
        body: JSON.stringify({
          handlerId: 5,
          handlerName: "系统管理员",
          handlerRemark,
        }),
      });
      toast.success("已签收处理");
      setHandlingEscalation(null);
      setHandlerRemark("");
      loadStats();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function resolveEscalation(escalationId: number) {
    try {
      await request(`/api/sla/escalations/${escalationId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          resolution,
          resolverId: 5,
          resolverName: "系统管理员",
        }),
      });
      toast.success("已解除升级");
      setResolvingEscalation(null);
      setResolution("");
      loadStats();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function formatDuration(minutes: number | null): string {
    if (minutes === null) return "-";
    const abs = Math.abs(minutes);
    if (abs < 60) return `${minutes}分钟`;
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    const sign = minutes < 0 ? "-" : "";
    return `${sign}${hours}小时${mins > 0 ? `${mins}分钟` : ""}`;
  }

  function OrderCard({ order }: { order: WorkOrderWithSla }) {
    const isExpanded = expandedOrderId === order.id;
    const hasActiveEscalation = order.lastEscalation && !order.lastEscalation.isResolved;

    return (
      <Card key={order.id} className="mb-3">
        <CardBody className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs text-slate-500">
                  {order.orderNo}
                </span>
                <Badge className={URGENCY_COLORS[order.urgency]}>
                  {URGENCY_LABELS[order.urgency]}
                </Badge>
                <Badge className={SLA_STATUS_COLORS[order.currentSlaStatus]}>
                  {SLA_STATUS_LABELS[order.currentSlaStatus]}
                </Badge>
                <Badge className="bg-slate-100 text-slate-700">
                  {STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <div className="text-sm text-slate-800 font-medium mb-1">
                {REPAIR_TYPE_LABELS[order.type]} - {order.description.slice(0, 50)}
              </div>
              <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  {order.buildingName}-{order.unitNumber}-{order.roomNumber}
                </span>
                <span>报修人：{order.residentName}</span>
                <span>维修工：{order.workerName || "未分配"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                {order.currentStage && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-slate-500">
                      当前阶段：{SLA_STAGE_LABELS[order.currentStage]}
                    </span>
                  </div>
                )}
                {order.currentDeadline && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={12} className="text-slate-400" />
                    <span className="text-slate-500">
                      截止时间：{formatDateTime(order.currentDeadline)}
                    </span>
                  </div>
                )}
                {order.remainingMinutes !== null && (
                  <div
                    className={`flex items-center gap-1 ${
                      order.remainingMinutes < 0 ? "text-red-600" : "text-slate-500"
                    }`}
                  >
                    {order.remainingMinutes < 0 ? (
                      <XCircle size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    <span>
                      {order.remainingMinutes < 0 ? "超时" : "剩余"}：
                      {formatDuration(order.remainingMinutes)}
                    </span>
                  </div>
                )}
              </div>

              {hasActiveEscalation && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle size={14} className="text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      已升级处理
                    </span>
                  </div>
                  <div className="text-xs text-purple-700 space-y-1">
                    <div>
                      <span className="text-purple-500">触发原因：</span>
                      {order.lastEscalation!.triggerReason}
                    </div>
                    <div>
                      <span className="text-purple-500">升级对象：</span>
                      {order.lastEscalation!.escalatedToUserName}
                    </div>
                    <div>
                      <span className="text-purple-500">升级时间：</span>
                      {formatDateTime(order.lastEscalation!.createdAt)}
                    </div>
                    {order.lastEscalation!.handlerRemark && (
                      <div>
                        <span className="text-purple-500">处理意见：</span>
                        {order.lastEscalation!.handlerRemark}
                      </div>
                    )}
                  </div>

                  {handlingEscalation === order.lastEscalation!.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full p-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={2}
                        placeholder="请输入处理意见..."
                        value={handlerRemark}
                        onChange={(e) => setHandlerRemark(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEscalation(order.lastEscalation!.id)}
                          disabled={!handlerRemark.trim()}
                        >
                          <UserCheck size={14} />
                          确认签收
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setHandlingEscalation(null);
                            setHandlerRemark("");
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : resolvingEscalation === order.lastEscalation!.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full p-2 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={2}
                        placeholder="请输入处理结果..."
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => resolveEscalation(order.lastEscalation!.id)}
                          disabled={!resolution.trim()}
                        >
                          <CheckCircle2 size={14} />
                          解除升级
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setResolvingEscalation(null);
                            setResolution("");
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      {!order.lastEscalation!.handlerRemark && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-600"
                          onClick={() => {
                            setHandlingEscalation(order.lastEscalation!.id);
                            setHandlerRemark("");
                          }}
                        >
                          <MessageSquare size={14} />
                          签收处理
                        </Button>
                      )}
                      {order.lastEscalation!.handlerRemark &&
                        !order.lastEscalation!.isResolved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600"
                            onClick={() => {
                              setResolvingEscalation(order.lastEscalation!.id);
                              setResolution("");
                            }}
                          >
                            <CheckCircle2 size={14} />
                            解除升级
                          </Button>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Button size="sm" variant="ghost" onClick={() => loadStats()}>
                <RefreshCw size={14} />
                刷新
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp size={14} />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    详情
                  </>
                )}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">SLA 记录</h4>
                  <div className="space-y-2">
                    {order.slaRecords.map((record) => (
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
                            <div>暂停时长：{record.pauseMinutes}分钟</div>
                          )}
                          {record.isPaused && record.pauseReason && (
                            <div className="text-amber-600">
                              已暂停：{record.pauseReason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">升级记录</h4>
                  {order.escalations.length === 0 ? (
                    <div className="text-xs text-slate-400">暂无升级记录</div>
                  ) : (
                    <div className="space-y-2">
                      {order.escalations.map((esc) => (
                        <div
                          key={esc.id}
                          className="p-2 bg-slate-50 rounded-lg text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-purple-700">
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
                          <div className="text-slate-500 space-y-0.5">
                            <div>升级对象：{esc.escalatedToUserName}</div>
                            <div>升级时间：{formatDateTime(esc.createdAt)}</div>
                            {esc.handlerRemark && (
                              <div>处理意见：{esc.handlerRemark}</div>
                            )}
                            {esc.resolution && (
                              <div className="text-green-600">
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
                  )}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">
        <Clock size={40} className="mx-auto mb-3 animate-pulse" />
        加载中...
      </div>
    );
  }

  const orders = getOrdersForTab();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">SLA 监控看板</h2>
        </div>
        <Button onClick={loadStats} size="sm">
          <RefreshCw size={14} />
          刷新数据
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tabs.map((tab) => (
          <Card
            key={tab.key}
            className={`cursor-pointer transition-all ${
              activeTab === tab.key
                ? "ring-2 ring-primary-500 ring-offset-2"
                : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <CardBody className="py-4">
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-lg ${tab.color} bg-opacity-20 flex items-center justify-center`}
                >
                  <tab.icon size={20} className={tab.color.replace("bg-", "text-")} />
                </div>
                <div
                  className={`text-2xl font-bold ${tab.color.replace(
                    "bg-",
                    "text-"
                  )}`}
                >
                  {tab.count}
                </div>
              </div>
              <div className="text-sm text-slate-600 mt-2">{tab.label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "primary" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
            className="flex-shrink-0"
          >
            <tab.icon size={14} />
            {tab.label} ({tab.count})
          </Button>
        ))}
      </div>

      <div>
        {orders.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-slate-400">
              <CheckCircle2 size={48} className="mx-auto mb-3 opacity-50" />
              暂无{tabs.find((t) => t.key === activeTab)?.label}工单
            </CardBody>
          </Card>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
