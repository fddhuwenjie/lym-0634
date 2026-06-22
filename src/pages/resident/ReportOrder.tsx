import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import {
  BUILDINGS,
  REPAIR_TYPE_LABELS,
  RepairType,
  URGENCY_LABELS,
  UrgencyLevel,
} from "../../../shared/types";
import { request, useToast } from "@/lib/api";
import { Wrench, Send } from "lucide-react";

export default function ReportOrder() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    buildingId: 1,
    unitNumber: "1",
    roomNumber: "101",
    type: "plumbing" as RepairType,
    urgency: "medium" as UrgencyLevel,
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.description.trim()) {
      toast.error("请填写问题描述");
      return;
    }
    setLoading(true);
    try {
      const building = BUILDINGS.find((b) => b.id === form.buildingId)!;
      const { order } = await request("/api/work-orders", {
        method: "POST",
        body: JSON.stringify({
          residentId: user.id,
          residentName: user.name,
          buildingId: form.buildingId,
          buildingName: building.name,
          unitNumber: form.unitNumber,
          roomNumber: form.roomNumber,
          type: form.type,
          urgency: form.urgency,
          description: form.description,
        }),
      });
      toast.success("报修提交成功");
      navigate(`/resident/orders/${order.id}`);
    } catch (e: any) {
      toast.error(e.message || "提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-accent-500 text-white flex items-center justify-center">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">提交报修</h2>
              <p className="text-sm text-slate-500">
                请填写报修信息，我们将尽快安排维修
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="所在楼栋"
                value={form.buildingId}
                onChange={(e) =>
                  setForm({ ...form, buildingId: Number(e.target.value) })
                }
                options={BUILDINGS.map((b) => ({
                  value: b.id,
                  label: b.name,
                }))}
              />
              <Input
                label="单元号"
                placeholder="如 1"
                value={form.unitNumber}
                onChange={(e) =>
                  setForm({ ...form, unitNumber: e.target.value })
                }
              />
              <Input
                label="房间号"
                placeholder="如 101"
                value={form.roomNumber}
                onChange={(e) =>
                  setForm({ ...form, roomNumber: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="报修类型"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as RepairType })
                }
                options={Object.entries(REPAIR_TYPE_LABELS).map(
                  ([v, label]) => ({ value: v, label })
                )}
              />
              <Select
                label="紧急程度"
                value={form.urgency}
                onChange={(e) =>
                  setForm({ ...form, urgency: e.target.value as UrgencyLevel })
                }
                options={Object.entries(URGENCY_LABELS).map(([v, label]) => ({
                  value: v,
                  label,
                }))}
              />
            </div>

            <Textarea
              label="问题描述"
              rows={5}
              placeholder="请详细描述需要维修的问题，如：卫生间水龙头漏水、客厅灯不亮等"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/resident/orders")}
              >
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                <Send size={16} />
                {loading ? "提交中..." : "提交报修"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
