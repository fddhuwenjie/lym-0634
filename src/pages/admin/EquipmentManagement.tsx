import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  InspectionDevice,
  DeviceType,
  InspectionFrequency,
  DEVICE_TYPE_LABELS,
  DEVICE_TYPE_COLORS,
  FREQUENCY_LABELS,
  FREQUENCY_COLORS,
  BUILDINGS,
} from "../../../shared/types";
import {
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Building2,
  RefreshCw,
} from "lucide-react";

const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const frequencyOptions = Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }));
const buildingOptions = BUILDINGS.map((b) => ({ value: b.id, label: b.name }));

interface DeviceForm {
  name: string;
  deviceType: DeviceType;
  buildingId: number;
  buildingName: string;
  floor: string;
  responsiblePerson: string;
  responsiblePersonId: number;
  frequency: InspectionFrequency;
  enabled: boolean;
  remark: string;
}

const emptyForm: DeviceForm = {
  name: "",
  deviceType: "electrical",
  buildingId: 1,
  buildingName: "1号楼",
  floor: "",
  responsiblePerson: "",
  responsiblePersonId: 0,
  frequency: "monthly",
  enabled: true,
  remark: "",
};

export default function EquipmentManagement() {
  const toast = useToast();
  const [devices, setDevices] = useState<InspectionDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeviceForm>({ ...emptyForm });
  const [filterType, setFilterType] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterEnabled, setFilterEnabled] = useState("");

  async function load() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.set("deviceType", filterType);
      if (filterBuilding) params.set("buildingId", filterBuilding);
      if (filterEnabled) params.set("enabled", filterEnabled);
      const { devices } = await request(`/api/inspection/devices?${params.toString()}`);
      setDevices(devices || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit() {
    if (!form.name.trim()) return toast.error("请输入设备名称");
    if (!form.floor.trim()) return toast.error("请输入楼层位置");
    if (!form.responsiblePerson.trim()) return toast.error("请输入责任人");

    const building = BUILDINGS.find((b) => b.id === Number(form.buildingId));
    const body = { ...form, buildingId: Number(form.buildingId), buildingName: building?.name || "" };

    try {
      if (editingId) {
        await request(`/api/inspection/devices/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("设备更新成功");
      } else {
        await request("/api/inspection/devices", { method: "POST", body: JSON.stringify(body) });
        toast.success("设备创建成功");
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除此设备吗？")) return;
    try {
      await request(`/api/inspection/devices/${id}`, { method: "DELETE" });
      toast.success("设备已删除");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function startEdit(device: InspectionDevice) {
    setEditingId(device.id);
    setForm({
      name: device.name,
      deviceType: device.deviceType,
      buildingId: device.buildingId,
      buildingName: device.buildingName,
      floor: device.floor,
      responsiblePerson: device.responsiblePerson,
      responsiblePersonId: device.responsiblePersonId || 0,
      frequency: device.frequency,
      enabled: device.enabled,
      remark: device.remark || "",
    });
    setShowForm(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">设备台账管理</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={load}>
            <RefreshCw size={14} /> 刷新
          </Button>
          <Button size="sm" onClick={startCreate}>
            <Plus size={14} /> 新增设备
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">筛选条件</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[{ value: "", label: "全部类型" }, ...deviceTypeOptions]}
            />
            <Select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              options={[{ value: "", label: "全部楼栋" }, ...buildingOptions]}
            />
            <Select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value)}
              options={[
                { value: "", label: "全部状态" },
                { value: "1", label: "启用" },
                { value: "0", label: "停用" },
              ]}
            />
            <Button size="sm" onClick={load}>
              <Search size={14} /> 查询
            </Button>
          </div>
        </CardBody>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">{editingId ? "编辑设备" : "新增设备"}</span>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="设备名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入设备名称" />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">设备类型</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" value={form.deviceType} onChange={(e) => setForm({ ...form, deviceType: e.target.value as DeviceType })}>
                  {deviceTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">所在楼栋</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: Number(e.target.value) })}>
                  {buildingOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <Input label="楼层位置" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="如 B1、1F、2F" />
              <Input label="责任人" value={form.responsiblePerson} onChange={(e) => setForm({ ...form, responsiblePerson: e.target.value })} placeholder="请输入责任人姓名" />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">巡检频率</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as InspectionFrequency })}>
                  {frequencyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">启用状态</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500" value={form.enabled ? "1" : "0"} onChange={(e) => setForm({ ...form, enabled: e.target.value === "1" })}>
                  <option value="1">启用</option>
                  <option value="0">停用</option>
                </select>
              </div>
              <Input label="备注" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="选填" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>取消</Button>
              <Button onClick={handleSubmit}>{editingId ? "保存修改" : "创建设备"}</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">设备名称</th>
                  <th className="px-4 py-3 text-left font-medium">设备类型</th>
                  <th className="px-4 py-3 text-left font-medium">楼栋</th>
                  <th className="px-4 py-3 text-left font-medium">楼层</th>
                  <th className="px-4 py-3 text-left font-medium">责任人</th>
                  <th className="px-4 py-3 text-left font-medium">巡检频率</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">备注</th>
                  <th className="px-4 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">加载中...</td></tr>
                ) : devices.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400"><Cpu size={36} className="mx-auto mb-2 opacity-50" />暂无设备记录</td></tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3"><Badge className={DEVICE_TYPE_COLORS[d.deviceType]}>{DEVICE_TYPE_LABELS[d.deviceType]}</Badge></td>
                      <td className="px-4 py-3">{d.buildingName}</td>
                      <td className="px-4 py-3">{d.floor}</td>
                      <td className="px-4 py-3">{d.responsiblePerson}</td>
                      <td className="px-4 py-3"><Badge className={FREQUENCY_COLORS[d.frequency]}>{FREQUENCY_LABELS[d.frequency]}</Badge></td>
                      <td className="px-4 py-3"><Badge className={d.enabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>{d.enabled ? "启用" : "停用"}</Badge></td>
                      <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">{d.remark || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(d)}><Pencil size={14} /></Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(d.id)}><Trash2 size={14} /></Button>
                        </div>
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
