import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  InspectionTask,
  InspectionTaskStatus,
  InspectionResult,
  InspectionDashboardStats,
  DEVICE_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  INSPECTION_RESULT_LABELS,
  INSPECTION_RESULT_COLORS,
  BUILDINGS,
} from "../../../shared/types";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Camera,
  Send,
} from "lucide-react";

const statusTabs: { key: InspectionTaskStatus | "all"; label: string; icon: any; color: string }[] = [
  { key: "all", label: "全部", icon: ClipboardCheck, color: "bg-slate-500" },
  { key: "pending", label: "待巡检", icon: Clock, color: "bg-slate-500" },
  { key: "completed", label: "已完成", icon: CheckCircle2, color: "bg-green-500" },
  { key: "abnormal", label: "异常", icon: AlertTriangle, color: "bg-red-500" },
  { key: "overdue", label: "逾期", icon: Clock, color: "bg-purple-500" },
  { key: "skipped", label: "无法巡检", icon: Ban, color: "bg-amber-500" },
];

export default function InspectionDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<InspectionDashboardStats | null>(null);
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InspectionTaskStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [submitResult, setSubmitResult] = useState<InspectionResult>("normal");
  const [submitRemark, setSubmitRemark] = useState("");
  const [filterDeviceType, setFilterDeviceType] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [statsRes, tasksRes] = await Promise.all([
        request<{ stats: InspectionDashboardStats }>("/api/inspection/tasks/dashboard"),
        request<{ tasks: InspectionTask[] }>("/api/inspection/tasks"),
      ]);
      setStats(statsRes.stats);
      setTasks(tasksRes.tasks || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(taskId: number) {
    try {
      await request(`/api/inspection/tasks/${taskId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          result: submitResult,
          actualTime: new Date().toISOString(),
          remark: submitRemark,
          photos: [],
        }),
      });
      toast.success(submitResult === "abnormal" ? "已提交异常，隐患已自动创建" : "巡检结果已提交");
      setSubmittingId(null);
      setSubmitRemark("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleGenerate() {
    try {
      const result = await request<{ created: number; skipped: number }>("/api/inspection/tasks/generate", { method: "POST" });
      toast.success(`已自动生成 ${result.created} 条巡检任务`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  let filtered = activeTab === "all" ? tasks : tasks.filter((t) => t.status === activeTab);
  if (filterDeviceType) filtered = filtered.filter((t) => t.deviceType === filterDeviceType);
  if (filterBuilding) filtered = filtered.filter((t) => t.buildingId === Number(filterBuilding));

  const statCards = stats
    ? [
        { label: "待巡检", value: stats.pendingCount, icon: <Clock size={22} />, color: "bg-slate-50 text-slate-600" },
        { label: "已完成", value: stats.completedCount, icon: <CheckCircle2 size={22} />, color: "bg-green-50 text-green-600" },
        { label: "异常", value: stats.abnormalCount, icon: <AlertTriangle size={22} />, color: "bg-red-50 text-red-600" },
        { label: "逾期", value: stats.overdueCount, icon: <Clock size={22} />, color: "bg-purple-50 text-purple-600" },
        { label: "无法巡检", value: stats.skippedCount, icon: <Ban size={22} />, color: "bg-amber-50 text-amber-600" },
      ]
    : [];

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">
        <ClipboardCheck size={40} className="mx-auto mb-3 animate-pulse" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">巡检任务看板</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw size={14} /> 刷新</Button>
          <Button size="sm" variant="secondary" onClick={handleGenerate}>自动生成任务</Button>
        </div>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">筛选条件</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <Select value={filterDeviceType} onChange={(e) => setFilterDeviceType(e.target.value)} options={[{ value: "", label: "全部类型" }, ...Object.entries(DEVICE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
            </div>
            <div className="w-40">
              <Select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)} options={[{ value: "", label: "全部楼栋" }, ...BUILDINGS.map((b) => ({ value: b.id, label: b.name }))]} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statusTabs.map((tab) => (
                <Button key={tab.key} size="sm" variant={activeTab === tab.key ? "primary" : "ghost"} onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-slate-400">
              <ClipboardCheck size={48} className="mx-auto mb-3 opacity-50" />
              暂无巡检任务
            </CardBody>
          </Card>
        ) : (
          filtered.map((task) => {
            const isExpanded = expandedId === task.id;
            const isSubmitting = submittingId === task.id;
            return (
              <Card key={task.id}>
                <CardBody className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-500">{task.taskNo}</span>
                        <Badge className={TASK_STATUS_COLORS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                        <Badge className="bg-slate-100 text-slate-600">{DEVICE_TYPE_LABELS[task.deviceType]}</Badge>
                      </div>
                      <div className="text-sm text-slate-800 font-medium mb-1">{task.deviceName}</div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{task.buildingName} - {task.floor}</span>
                        <span>巡检人：{task.inspectorName}</span>
                        <span>计划时间：{formatDateTime(task.planTime)}</span>
                        {task.actualTime && <span>实际时间：{formatDateTime(task.actualTime)}</span>}
                        {task.result && <Badge className={INSPECTION_RESULT_COLORS[task.result]}>{INSPECTION_RESULT_LABELS[task.result]}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === "pending" && (
                        <Button size="sm" onClick={() => { setSubmittingId(task.id); setSubmitResult("normal"); setSubmitRemark(""); }}>
                          <Send size={14} /> 提交结果
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? "收起" : "详情"}
                      </Button>
                    </div>
                  </div>

                  {isSubmitting && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">巡检结果</label>
                        <div className="flex gap-2">
                          {([["normal", "正常", "bg-green-500"], ["abnormal", "异常", "bg-red-500"], ["skipped", "无法巡检", "bg-amber-500"]] as const).map(([val, label, color]) => (
                            <label key={val} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${submitResult === val ? "border-primary-500 bg-primary-50" : "border-slate-200 hover:border-slate-300"}`}>
                              <input type="radio" name={`result-${task.id}`} checked={submitResult === val} onChange={() => setSubmitResult(val)} className="sr-only" />
                              <span className={`w-3 h-3 rounded-full ${color}`} />
                              <span className="text-sm font-medium">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Input label="备注" value={submitRemark} onChange={(e) => setSubmitRemark(e.target.value)} placeholder="巡检备注（选填）" />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setSubmittingId(null)}>取消</Button>
                        <Button size="sm" onClick={() => handleSubmit(task.id)}>确认提交</Button>
                      </div>
                    </div>
                  )}

                  {isExpanded && !isSubmitting && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div><span className="text-slate-500">任务编号：</span>{task.taskNo}</div>
                          <div><span className="text-slate-500">设备名称：</span>{task.deviceName}</div>
                          <div><span className="text-slate-500">设备类型：</span>{DEVICE_TYPE_LABELS[task.deviceType]}</div>
                          <div><span className="text-slate-500">位置：</span>{task.buildingName} - {task.floor}</div>
                        </div>
                        <div className="space-y-2">
                          <div><span className="text-slate-500">巡检人：</span>{task.inspectorName}</div>
                          <div><span className="text-slate-500">计划时间：</span>{formatDateTime(task.planTime)}</div>
                          <div><span className="text-slate-500">实际时间：</span>{task.actualTime ? formatDateTime(task.actualTime) : "-"}</div>
                          <div><span className="text-slate-500">结果：</span>{task.result ? INSPECTION_RESULT_LABELS[task.result] : "-"}</div>
                          <div><span className="text-slate-500">备注：</span>{task.remark || "-"}</div>
                          <div><span className="text-slate-500">创建时间：</span>{formatDateTime(task.createdAt)}</div>
                          <div><span className="text-slate-500">完成时间：</span>{task.completedAt ? formatDateTime(task.completedAt) : "-"}</div>
                        </div>
                      </div>
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
