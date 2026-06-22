import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  HazardRecord,
  HazardStatus,
  HazardSeverity,
  HazardHistory,
  HazardDashboardStats,
  DEVICE_TYPE_LABELS,
  HAZARD_STATUS_LABELS,
  HAZARD_STATUS_COLORS,
  HAZARD_SEVERITY_LABELS,
  HAZARD_SEVERITY_COLORS,
  BUILDINGS,
} from "../../../shared/types";
import {
  ShieldAlert,
  Wrench,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Send,
  History,
} from "lucide-react";

const statusTabs: { key: HazardStatus | "all"; label: string; color: string }[] = [
  { key: "all", label: "全部", color: "bg-slate-500" },
  { key: "pending_rectify", label: "待整改", color: "bg-red-500" },
  { key: "rectifying", label: "整改中", color: "bg-amber-500" },
  { key: "pending_review", label: "待复查", color: "bg-blue-500" },
  { key: "closed", label: "已关闭", color: "bg-green-500" },
  { key: "rejected", label: "驳回重新整改", color: "bg-purple-500" },
];

export default function HazardDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<HazardDashboardStats | null>(null);
  const [hazards, setHazards] = useState<HazardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HazardStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<number, HazardHistory[]>>({});
  const [actionHazardId, setActionHazardId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [actionRemark, setActionRemark] = useState("");
  const [assignForm, setAssignForm] = useState({ rectifyPerson: "", rectifyPersonId: 0, deadline: "", severity: "medium" as HazardSeverity });

  async function load() {
    try {
      setLoading(true);
      const [statsRes, hazardsRes] = await Promise.all([
        request<{ stats: HazardDashboardStats }>("/api/inspection/hazards/dashboard"),
        request<{ hazards: HazardRecord[] }>("/api/inspection/hazards"),
      ]);
      setStats(statsRes.stats);
      setHazards(hazardsRes.hazards || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(hazardId: number) {
    try {
      const { history } = await request<{ history: HazardHistory[] }>(`/api/inspection/hazards/${hazardId}/history`);
      setHistoryMap((prev) => ({ ...prev, [hazardId]: history || [] }));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(hazardId: number, action: string) {
    try {
      const body: any = { operatorId: 5, operatorName: "系统管理员", remark: actionRemark };
      if (action === "assign") {
        body.rectifyPerson = assignForm.rectifyPerson;
        body.rectifyPersonId = assignForm.rectifyPersonId;
        body.deadline = assignForm.deadline;
        body.severity = assignForm.severity;
      }
      if (action === "review") {
        body.passed = actionType === "review_pass";
      }
      await request(`/api/inspection/hazards/${hazardId}/${action}`, { method: "POST", body: JSON.stringify(body) });
      toast.success("操作成功");
      setActionHazardId(null);
      setActionRemark("");
      setActionType("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  let filtered = activeTab === "all" ? hazards : hazards.filter((h) => h.status === activeTab);

  const statCards = stats
    ? [
        { label: "待整改", value: stats.pendingRectifyCount, icon: <AlertTriangle size={22} />, color: "bg-red-50 text-red-600" },
        { label: "整改中", value: stats.rectifyingCount, icon: <Wrench size={22} />, color: "bg-amber-50 text-amber-600" },
        { label: "待复查", value: stats.pendingReviewCount, icon: <Eye size={22} />, color: "bg-blue-50 text-blue-600" },
        { label: "已关闭", value: stats.closedCount, icon: <CheckCircle2 size={22} />, color: "bg-green-50 text-green-600" },
        { label: "逾期", value: stats.overdueCount, icon: <Clock size={22} />, color: "bg-purple-50 text-purple-600" },
      ]
    : [];

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">
        <ShieldAlert size={40} className="mx-auto mb-3 animate-pulse" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">隐患闭环看板</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} /> 刷新</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody className="py-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 flex-wrap">
        {statusTabs.map((tab) => (
          <Button key={tab.key} size="sm" variant={activeTab === tab.key ? "primary" : "ghost"} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-slate-400">
              <ShieldAlert size={48} className="mx-auto mb-3 opacity-50" />
              暂无隐患记录
            </CardBody>
          </Card>
        ) : (
          filtered.map((hazard) => {
            const isExpanded = expandedId === hazard.id;
            const isAction = actionHazardId === hazard.id;
            const history = historyMap[hazard.id] || [];

            return (
              <Card key={hazard.id}>
                <CardBody className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{hazard.hazardNo}</span>
                        <Badge className={HAZARD_STATUS_COLORS[hazard.status]}>{HAZARD_STATUS_LABELS[hazard.status]}</Badge>
                        <Badge className={HAZARD_SEVERITY_COLORS[hazard.severity]}>{HAZARD_SEVERITY_LABELS[hazard.severity]}</Badge>
                        <Badge className="bg-slate-100 text-slate-600">{DEVICE_TYPE_LABELS[hazard.deviceType]}</Badge>
                      </div>
                      <div className="text-sm text-slate-800 font-medium mb-1">{hazard.deviceName}</div>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <div>{hazard.buildingName} - {hazard.floor} | 整改责任人：{hazard.rectifyPerson} | 整改期限：{formatDateTime(hazard.deadline)}</div>
                        <div className="text-slate-600">{hazard.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hazard.status === "pending_rectify" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => { setActionHazardId(hazard.id); setActionType("assign"); setAssignForm({ rectifyPerson: hazard.rectifyPerson, rectifyPersonId: hazard.rectifyPersonId, deadline: hazard.deadline.slice(0, 10), severity: hazard.severity }); }}>
                            <UserCheck size={14} /> 指派
                          </Button>
                          <Button size="sm" onClick={() => { setActionHazardId(hazard.id); setActionType("start_rectify"); setActionRemark(""); }}>
                            <Wrench size={14} /> 开始整改
                          </Button>
                        </>
                      )}
                      {hazard.status === "rejected" && (
                        <Button size="sm" onClick={() => { setActionHazardId(hazard.id); setActionType("start_rectify"); setActionRemark(""); }}>
                          <Wrench size={14} /> 重新整改
                        </Button>
                      )}
                      {hazard.status === "rectifying" && (
                        <Button size="sm" onClick={() => { setActionHazardId(hazard.id); setActionType("submit_rectify"); setActionRemark(""); }}>
                          <Send size={14} /> 提交整改
                        </Button>
                      )}
                      {hazard.status === "pending_review" && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => { setActionHazardId(hazard.id); setActionType("review_pass"); setActionRemark(""); }}>
                            <CheckCircle2 size={14} /> 复查通过
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => { setActionHazardId(hazard.id); setActionType("review_reject"); setActionRemark(""); }}>
                            <XCircle size={14} /> 驳回
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setExpandedId(isExpanded ? null : hazard.id); if (!isExpanded && !historyMap[hazard.id]) loadHistory(hazard.id); }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    </div>
                  </div>

                  {isAction && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      {actionType === "assign" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <Input label="整改责任人" value={assignForm.rectifyPerson} onChange={(e) => setAssignForm({ ...assignForm, rectifyPerson: e.target.value })} />
                          <Input label="责任人ID" type="number" value={assignForm.rectifyPersonId || ""} onChange={(e) => setAssignForm({ ...assignForm, rectifyPersonId: Number(e.target.value) })} />
                          <Input label="整改期限" type="date" value={assignForm.deadline} onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })} />
                          <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700">严重程度</label>
                            <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300" value={assignForm.severity} onChange={(e) => setAssignForm({ ...assignForm, severity: e.target.value as HazardSeverity })}>
                              {Object.entries(HAZARD_SEVERITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                      <Input label="备注" value={actionRemark} onChange={(e) => setActionRemark(e.target.value)} placeholder="操作备注（选填）" />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setActionHazardId(null); setActionRemark(""); }}>取消</Button>
                        <Button size="sm" onClick={() => {
                          if (actionType === "assign") handleAction(hazard.id, "assign");
                          else if (actionType === "start_rectify") handleAction(hazard.id, "start-rectify");
                          else if (actionType === "submit_rectify") handleAction(hazard.id, "submit-rectify");
                          else if (actionType === "review_pass") handleAction(hazard.id, "review");
                          else if (actionType === "review_reject") handleAction(hazard.id, "review");
                        }}>确认</Button>
                      </div>
                    </div>
                  )}

                  {isExpanded && !isAction && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="space-y-2">
                          <div><span className="text-slate-500">隐患编号：</span>{hazard.hazardNo}</div>
                          <div><span className="text-slate-500">设备名称：</span>{hazard.deviceName}</div>
                          <div><span className="text-slate-500">设备类型：</span>{DEVICE_TYPE_LABELS[hazard.deviceType]}</div>
                          <div><span className="text-slate-500">位置：</span>{hazard.buildingName} - {hazard.floor}</div>
                        </div>
                        <div className="space-y-2">
                          <div><span className="text-slate-500">异常描述：</span>{hazard.description}</div>
                          <div><span className="text-slate-500">严重程度：</span>{HAZARD_SEVERITY_LABELS[hazard.severity]}</div>
                          <div><span className="text-slate-500">整改责任人：</span>{hazard.rectifyPerson}</div>
                          <div><span className="text-slate-500">整改期限：</span>{formatDateTime(hazard.deadline)}</div>
                          <div><span className="text-slate-500">创建时间：</span>{formatDateTime(hazard.createdAt)}</div>
                          <div><span className="text-slate-500">更新时间：</span>{formatDateTime(hazard.updatedAt)}</div>
                        </div>
                      </div>
                      {history.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2"><History size={14} className="text-slate-400" /><span className="text-sm font-medium text-slate-700">处理历史</span></div>
                          <div className="space-y-2">
                            {history.map((h) => (
                              <div key={h.id} className="p-2 bg-slate-50 rounded-lg text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-slate-700">{h.action}</span>
                                  <span className="text-slate-400">{formatDateTime(h.createdAt)}</span>
                                </div>
                                <div className="text-slate-500">操作人：{h.operatorName}{h.remark ? ` | ${h.remark}` : ""}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
