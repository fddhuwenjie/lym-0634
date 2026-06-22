import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  ExportRecord,
  DEVICE_TYPE_LABELS,
  HAZARD_STATUS_LABELS,
  HAZARD_SEVERITY_LABELS,
  TASK_STATUS_LABELS,
  BUILDINGS,
} from "../../../shared/types";
import {
  Download,
  FileSpreadsheet,
  History,
  CalendarDays,
  Building2,
  FileDown,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ClipboardCheck,
  ShieldAlert,
} from "lucide-react";

type ExportTab = "inspection_tasks" | "hazard_records";

const tabOptions: { value: ExportTab; label: string; desc: string }[] = [
  { value: "inspection_tasks", label: "巡检任务导出", desc: "包含巡检任务编号、设备、巡检人、结果、状态等数据" },
  { value: "hazard_records", label: "隐患明细导出", desc: "包含隐患编号、设备、异常描述、严重程度、整改状态等数据" },
];

export default function InspectionExportPage() {
  const toast = useToast();
  const [tab, setTab] = useState<ExportTab>("inspection_tasks");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    buildingId: "",
    deviceType: "",
    status: "",
    severity: "",
  });
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function loadHistory() {
    try {
      setLoading(true);
      const { records } = await request("/api/admin/export-history");
      const filtered = (records || []).filter((r: ExportRecord) =>
        r.type === "inspection_tasks" || r.type === "hazard_records"
      );
      setHistory(filtered);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const body: Record<string, any> = {
        filters: {},
        createdBy: 5,
        createdByName: "系统管理员",
      };
      if (filters.startDate) body.filters.startDate = filters.startDate;
      if (filters.endDate) body.filters.endDate = filters.endDate;
      if (filters.buildingId) body.filters.buildingId = parseInt(filters.buildingId);
      if (filters.deviceType) body.filters.deviceType = filters.deviceType;
      if (filters.status) body.filters.status = filters.status;
      if (filters.severity) body.filters.severity = filters.severity;

      const endpoint = tab === "inspection_tasks"
        ? "/api/inspection/export/tasks"
        : "/api/inspection/export/hazards";

      const res = await request<{ id: number; fileName: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast.success("导出成功，正在下载...");
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = `/api/admin/export/${res.id}/download`;
        link.download = res.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 300);
      loadHistory();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">巡检与隐患数据导出</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary-600" />
            <span className="font-semibold text-slate-800">创建导出</span>
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">选择导出类型</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tabOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    tab === opt.value ? "border-accent-500 bg-accent-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input type="radio" name="exportTab" checked={tab === opt.value} onChange={() => setTab(opt.value)} className="sr-only" />
                  <div className="flex items-center gap-2 mb-1">
                    {opt.value === "inspection_tasks" ? <ClipboardCheck size={16} className="text-primary-600" /> : <ShieldAlert size={16} className="text-primary-600" />}
                    <span className="font-medium text-slate-800">{opt.label}</span>
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed">{opt.desc}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1"><CalendarDays size={14} className="text-slate-400" />开始日期</label>
              <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1"><CalendarDays size={14} className="text-slate-400" />结束日期</label>
              <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1"><Building2 size={14} className="text-slate-400" />楼栋</label>
              <Select value={filters.buildingId} onChange={(e) => setFilters({ ...filters, buildingId: e.target.value })} options={[{ value: "", label: "全部楼栋" }, ...BUILDINGS.map((b) => ({ value: b.id, label: b.name }))]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">设备类型</label>
              <Select value={filters.deviceType} onChange={(e) => setFilters({ ...filters, deviceType: e.target.value })} options={[{ value: "", label: "全部类型" }, ...Object.entries(DEVICE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">状态</label>
              {tab === "inspection_tasks" ? (
                <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} options={[{ value: "", label: "全部状态" }, ...Object.entries(TASK_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
              ) : (
                <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} options={[{ value: "", label: "全部状态" }, ...Object.entries(HAZARD_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
              )}
            </div>
            {tab === "hazard_records" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">严重程度</label>
                <Select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} options={[{ value: "", label: "全部程度" }, ...Object.entries(HAZARD_SEVERITY_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleExport} disabled={exporting} className="min-w-[140px]">
              {exporting ? <><Loader2 size={16} className="animate-spin" />导出中...</> : <><FileDown size={16} />开始导出</>}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary-600" />
              <span className="font-semibold text-slate-800">导出历史</span>
            </div>
            <Button variant="ghost" size="sm" onClick={loadHistory}><RefreshCw size={14} />刷新</Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">文件名</th>
                  <th className="px-4 py-3 text-left font-medium">类型</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">操作人</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">加载中...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400"><History size={36} className="mx-auto mb-2 opacity-50" />暂无导出记录</td></tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><FileSpreadsheet size={14} className="text-green-600" /><span className="font-mono text-xs">{h.fileName}</span></div></td>
                      <td className="px-4 py-3">{h.type === "inspection_tasks" ? "巡检任务" : "隐患明细"}</td>
                      <td className="px-4 py-3"><Badge className="bg-green-100 text-green-700"><CheckCircle2 size={12} className="mr-1" />已完成</Badge></td>
                      <td className="px-4 py-3">{h.createdByName}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(h.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => {
                          const link = document.createElement("a");
                          link.href = `/api/admin/export/${h.id}/download`;
                          link.download = h.fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}><Download size={14} />下载</Button>
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
