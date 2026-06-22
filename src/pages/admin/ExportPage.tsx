import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { request, useToast, formatDateTime, formatDate } from "@/lib/api";
import { ExportRecord, BUILDINGS } from "../../../shared/types";
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
} from "lucide-react";

type ExportType = "quality" | "material" | "evaluation";

const exportTypeOptions: { value: ExportType; label: string; desc: string }[] = [
  {
    value: "quality",
    label: "服务质量导出",
    desc: "包含工单处理时长、状态流转、异常原因等质量数据",
  },
  {
    value: "material",
    label: "材料核销导出",
    desc: "包含工单材料明细、用量、单价、金额等核销数据",
  },
  {
    value: "evaluation",
    label: "服务评价导出",
    desc: "包含评分、评价内容、评价时间等评价数据",
  },
];

export default function ExportPage() {
  const toast = useToast();
  const [exportType, setExportType] = useState<ExportType>("quality");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    buildingId: "",
  });
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function loadHistory() {
    try {
      setLoading(true);
      const { exports: e } = await request("/api/admin/export-history");
      setHistory(e || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const body: Record<string, any> = {
        type: exportType,
        createdBy: 5,
        createdByName: "系统管理员",
      };
      if (filters.startDate) body.startDate = filters.startDate;
      if (filters.endDate) body.endDate = filters.endDate;
      if (filters.buildingId) body.buildingId = parseInt(filters.buildingId);

      const res = await request<{ id: number; fileName: string }>("/api/admin/export", {
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

  async function downloadExport(id: number, fileName: string) {
    try {
      const link = document.createElement("a");
      link.href = `/api/admin/export/${id}/download`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("开始下载");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">数据导出</h2>
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
            <label className="block text-sm font-medium text-slate-700 mb-3">
              选择导出类型
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {exportTypeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    exportType === opt.value
                      ? "border-accent-500 bg-accent-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    checked={exportType === opt.value}
                    onChange={() => setExportType(opt.value)}
                    className="sr-only"
                  />
                  <div className="font-medium text-slate-800 mb-1">{opt.label}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">{opt.desc}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <CalendarDays size={14} className="text-slate-400" />
                开始日期
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <CalendarDays size={14} className="text-slate-400" />
                结束日期
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                <Building2 size={14} className="text-slate-400" />
                楼栋（可选）
              </label>
              <Select
                value={filters.buildingId}
                onChange={(e) => setFilters({ ...filters, buildingId: e.target.value })}
                options={[
                  { value: "", label: "全部楼栋" },
                  ...BUILDINGS.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={handleExport} disabled={exporting} className="min-w-[140px]">
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <FileDown size={16} />
                  开始导出
                </>
              )}
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
            <Button variant="ghost" size="sm" onClick={loadHistory}>
              <RefreshCw size={14} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">文件名</th>
                  <th className="px-4 py-3 text-left font-medium">类型</th>
                  <th className="px-4 py-3 text-left font-medium">筛选条件</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">操作人</th>
                  <th className="px-4 py-3 text-left font-medium">创建时间</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      加载中...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <History size={36} className="mx-auto mb-2 opacity-50" />
                      暂无导出记录
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet size={14} className="text-green-600" />
                          <span className="font-mono text-xs">{h.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {exportTypeOptions.find((o) => o.value === h.type)?.label || h.type}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {h.filters && Object.keys(h.filters).length > 0 ? (
                          <div className="space-y-0.5">
                            {h.filters.startDate && (
                              <div>开始：{formatDate(h.filters.startDate)}</div>
                            )}
                            {h.filters.endDate && <div>结束：{formatDate(h.filters.endDate)}</div>}
                            {h.filters.buildingId && (
                              <div>
                                楼栋：
                                {BUILDINGS.find((b) => b.id === h.filters.buildingId)?.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {h.status === "done" ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 size={12} className="mr-1" />
                            已完成
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">
                            <Loader2 size={12} className="mr-1 animate-spin" />
                            处理中
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">{h.createdByName}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(h.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {h.status === "done" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadExport(h.id, h.fileName)}
                          >
                            <Download size={14} />
                            下载
                          </Button>
                        )}
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
