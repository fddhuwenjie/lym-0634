import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  SlaConfig,
  RepairType,
  UrgencyLevel,
  REPAIR_TYPE_LABELS,
  URGENCY_LABELS,
  BUILDINGS,
} from "../../../shared/types";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Clock,
  AlertTriangle,
  Building2,
} from "lucide-react";

export default function SlaConfigPage() {
  const toast = useToast();
  const [configs, setConfigs] = useState<SlaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SlaConfig>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    repairType: "plumbing" as RepairType,
    urgency: "medium" as UrgencyLevel,
    buildingId: "",
    responseLimit: 30,
    arriveLimit: 60,
    completeLimit: 1440,
    warningThreshold: 30,
  });

  async function loadConfigs() {
    try {
      setLoading(true);
      const { configs } = await request("/api/sla/configs");
      setConfigs(configs || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  async function handleAdd() {
    try {
      const body: any = {
        repairType: addForm.repairType,
        urgency: addForm.urgency,
        responseLimit: addForm.responseLimit,
        arriveLimit: addForm.arriveLimit,
        completeLimit: addForm.completeLimit,
        warningThreshold: addForm.warningThreshold,
      };
      if (addForm.buildingId) {
        body.buildingId = parseInt(addForm.buildingId);
        body.buildingName = BUILDINGS.find(
          (b) => b.id === parseInt(addForm.buildingId)
        )?.name;
      }
      await request("/api/sla/configs", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("配置创建成功");
      setShowAddForm(false);
      setAddForm({
        repairType: "plumbing",
        urgency: "medium",
        buildingId: "",
        responseLimit: 30,
        arriveLimit: 60,
        completeLimit: 1440,
        warningThreshold: 30,
      });
      loadConfigs();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleEdit(config: SlaConfig) {
    setEditingId(config.id);
    setEditForm({
      responseLimit: config.responseLimit,
      arriveLimit: config.arriveLimit,
      completeLimit: config.completeLimit,
      warningThreshold: config.warningThreshold,
    });
  }

  async function handleSave(id: number) {
    try {
      await request(`/api/sla/configs/${id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      toast.success("配置更新成功");
      setEditingId(null);
      setEditForm({});
      loadConfigs();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除此配置吗？")) return;
    try {
      await request(`/api/sla/configs/${id}`, {
        method: "DELETE",
      });
      toast.success("配置删除成功");
      loadConfigs();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}分钟`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}小时`;
    return `${Math.round(minutes / 1440)}天`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">SLA 配置管理</h2>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} />
          新增配置
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-primary-600" />
              <span className="font-semibold text-slate-800">新增 SLA 配置</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  报修类型
                </label>
                <Select
                  value={addForm.repairType}
                  onChange={(e) =>
                    setAddForm({ ...addForm, repairType: e.target.value as RepairType })
                  }
                  options={Object.entries(REPAIR_TYPE_LABELS).map(([value, label]) => ({
                    value,
                    label: label as string,
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  紧急程度
                </label>
                <Select
                  value={addForm.urgency}
                  onChange={(e) =>
                    setAddForm({ ...addForm, urgency: e.target.value as UrgencyLevel })
                  }
                  options={Object.entries(URGENCY_LABELS).map(([value, label]) => ({
                    value,
                    label: label as string,
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Building2 size={14} className="text-slate-400" />
                  楼栋（可选）
                </label>
                <Select
                  value={addForm.buildingId}
                  onChange={(e) =>
                    setAddForm({ ...addForm, buildingId: e.target.value })
                  }
                  options={[
                    { value: "", label: "全部楼栋（通用配置）" },
                    ...BUILDINGS.map((b) => ({ value: b.id.toString(), label: b.name })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-slate-400" />
                  预警阈值（分钟）
                </label>
                <Input
                  type="number"
                  value={addForm.warningThreshold}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      warningThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  响应时限（分钟）
                </label>
                <Input
                  type="number"
                  value={addForm.responseLimit}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      responseLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  到场时限（分钟）
                </label>
                <Input
                  type="number"
                  value={addForm.arriveLimit}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      arriveLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock size={14} className="text-slate-400" />
                  完工时限（分钟）
                </label>
                <Input
                  type="number"
                  value={addForm.completeLimit}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      completeLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                <X size={16} />
                取消
              </Button>
              <Button onClick={handleAdd}>
                <Save size={16} />
                保存
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <span className="font-semibold text-slate-800">SLA 配置列表</span>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="py-8 text-center text-slate-400">加载中...</div>
          ) : configs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">暂无配置</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">报修类型</th>
                    <th className="px-4 py-3 text-left font-medium">紧急程度</th>
                    <th className="px-4 py-3 text-left font-medium">适用楼栋</th>
                    <th className="px-4 py-3 text-left font-medium">响应时限</th>
                    <th className="px-4 py-3 text-left font-medium">到场时限</th>
                    <th className="px-4 py-3 text-left font-medium">完工时限</th>
                    <th className="px-4 py-3 text-left font-medium">预警阈值</th>
                    <th className="px-4 py-3 text-left font-medium">更新时间</th>
                    <th className="px-4 py-3 text-left font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr
                      key={config.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        {REPAIR_TYPE_LABELS[config.repairType]}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-slate-100 text-slate-700">
                          {URGENCY_LABELS[config.urgency]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {config.buildingName || "全部楼栋"}
                      </td>
                      {editingId === config.id ? (
                        <>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={editForm.responseLimit}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  responseLimit: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20"
                              min={1}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={editForm.arriveLimit}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  arriveLimit: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20"
                              min={1}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={editForm.completeLimit}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  completeLimit: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20"
                              min={1}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={editForm.warningThreshold}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  warningThreshold: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20"
                              min={1}
                            />
                          </td>
                          <td className="px-4 py-3">-</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSave(config.id)}
                              >
                                <Save size={14} />
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm({});
                                }}
                              >
                                <X size={14} />
                                取消
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            {formatMinutes(config.responseLimit)}
                          </td>
                          <td className="px-4 py-3">
                            {formatMinutes(config.arriveLimit)}
                          </td>
                          <td className="px-4 py-3">
                            {formatMinutes(config.completeLimit)}
                          </td>
                          <td className="px-4 py-3">
                            {config.warningThreshold}分钟
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatDateTime(config.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(config)}
                              >
                                <Edit2 size={14} />
                                编辑
                              </Button>
                              {!config.buildingId && configs.filter(
                                (c) =>
                                  c.repairType === config.repairType &&
                                  c.urgency === config.urgency &&
                                  c.buildingId
                              ).length === 0 ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(config.id)}
                                  className="text-red-500"
                                >
                                  <Trash2 size={14} />
                                  删除
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(config.id)}
                                  className="text-red-500"
                                >
                                  <Trash2 size={14} />
                                  删除
                                </Button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
