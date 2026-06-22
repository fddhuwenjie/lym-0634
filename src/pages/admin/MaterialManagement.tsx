import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { request, useToast, formatDateTime } from "@/lib/api";
import {
  Material,
  MaterialTransaction,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_COLORS,
} from "../../../shared/types";
import {
  Warehouse,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Package,
  AlertTriangle,
  X,
} from "lucide-react";

type TabType = "stock" | "transactions";

export default function MaterialManagement() {
  const toast = useToast();
  const [tab, setTab] = useState<TabType>("stock");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStockIn, setShowStockIn] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({ quantity: 0, remark: "" });
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("");

  async function loadMaterials() {
    try {
      setLoading(true);
      const { materials: m } = await request("/api/materials");
      setMaterials(m || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      const { transactions: t } = await request(`/api/materials/transactions?${params.toString()}`);
      setTransactions(t || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "stock") loadMaterials();
    else loadTransactions();
  }, [tab, filterType]);

  function openStockIn(m: Material) {
    setSelectedMaterial(m);
    setFormData({ quantity: 0, remark: "" });
    setShowStockIn(true);
  }

  function openReturn(m: Material) {
    setSelectedMaterial(m);
    setFormData({ quantity: 0, remark: "" });
    setShowReturn(true);
  }

  async function handleStockIn() {
    if (!selectedMaterial || formData.quantity <= 0) {
      toast.error("请输入有效的入库数量");
      return;
    }
    setSubmitting(true);
    try {
      await request(`/api/materials/${selectedMaterial.id}/stock-in`, {
        method: "POST",
        body: JSON.stringify({
          quantity: formData.quantity,
          operatorId: 5,
          operatorName: "系统管理员",
          remark: formData.remark,
        }),
      });
      toast.success("入库成功");
      setShowStockIn(false);
      loadMaterials();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn() {
    if (!selectedMaterial || formData.quantity <= 0) {
      toast.error("请输入有效的退库数量");
      return;
    }
    setSubmitting(true);
    try {
      await request(`/api/materials/${selectedMaterial.id}/return`, {
        method: "POST",
        body: JSON.stringify({
          quantity: formData.quantity,
          operatorId: 5,
          operatorName: "系统管理员",
          remark: formData.remark,
        }),
      });
      toast.success("退库成功");
      setShowReturn(false);
      loadMaterials();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderModal(
    show: boolean,
    onClose: () => void,
    title: string,
    onSubmit: () => void,
    variant: "stockIn" | "return"
  ) {
    if (!show || !selectedMaterial) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{title}</span>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-slate-400" />
                <span className="font-medium text-slate-800">{selectedMaterial.name}</span>
              </div>
              <div className="text-slate-500">
                当前库存：{selectedMaterial.stock} {selectedMaterial.unit}
              </div>
              <div className="text-slate-500">
                单价：¥{selectedMaterial.price.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {variant === "stockIn" ? "入库数量" : "退库数量"}
              </label>
              <Input
                type="number"
                min={1}
                value={formData.quantity || ""}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                placeholder={`请输入${variant === "stockIn" ? "入库" : "退库"}数量`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                备注（可选）
              </label>
              <textarea
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                rows={2}
                placeholder="请输入备注说明"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={onSubmit} disabled={submitting || formData.quantity <= 0}>
                {submitting ? "提交中..." : "确认"}
              </Button>
            </div>
          </CardBody>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Warehouse size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">材料库存</h2>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("stock")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "stock"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Package size={16} />
            库存列表
          </div>
        </button>
        <button
          onClick={() => setTab("transactions")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "transactions"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <History size={16} />
            出入库流水
          </div>
        </button>
      </div>

      {tab === "stock" && (
        <>
          {loading ? (
            <div className="text-center py-20 text-slate-500">加载中...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {materials.map((m) => {
                const isLow = m.stock <= m.warningThreshold;
                return (
                  <Card key={m.id} hoverable>
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isLow ? "bg-red-50 text-red-500" : "bg-primary-50 text-primary-600"
                            }`}
                          >
                            <Package size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{m.name}</div>
                            <div className="text-xs text-slate-500">单价：¥{m.price.toFixed(2)}</div>
                          </div>
                        </div>
                        {isLow && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle size={12} className="mr-1" />
                            库存预警
                          </Badge>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-xs text-slate-500">当前库存</div>
                            <div
                              className={`text-2xl font-bold ${
                                isLow ? "text-red-600" : "text-slate-800"
                              }`}
                            >
                              {m.stock}
                              <span className="text-sm font-normal text-slate-500 ml-1">
                                {m.unit}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400">
                            预警阈值：{m.warningThreshold}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => openStockIn(m)}
                        >
                          <ArrowDownToLine size={14} />
                          入库
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openReturn(m)}
                        >
                          <ArrowUpFromLine size={14} />
                          退库
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "transactions" && (
        <>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={[
                { value: "", label: "全部类型" },
                { value: "use", label: "使用扣减" },
                { value: "stock_in", label: "入库" },
                { value: "return", label: "退库" },
                { value: "adjust", label: "库存调整" },
              ]}
              className="!w-40"
            />
          </div>
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">时间</th>
                      <th className="px-4 py-3 text-left font-medium">材料</th>
                      <th className="px-4 py-3 text-left font-medium">类型</th>
                      <th className="px-4 py-3 text-left font-medium">数量</th>
                      <th className="px-4 py-3 text-left font-medium">库存变化</th>
                      <th className="px-4 py-3 text-left font-medium">关联工单</th>
                      <th className="px-4 py-3 text-left font-medium">操作人</th>
                      <th className="px-4 py-3 text-left font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          加载中...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          暂无流水记录
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {formatDateTime(t.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {t.materialName}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-medium ${TRANSACTION_TYPE_COLORS[t.type]}`}
                            >
                              {TRANSACTION_TYPE_LABELS[t.type]}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {t.type === "use" ? "-" : t.type === "return" || t.type === "stock_in" ? "+" : ""}
                            {t.quantity}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {t.beforeStock} → {t.afterStock}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {t.orderNo || "-"}
                          </td>
                          <td className="px-4 py-3">{t.operatorName}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                            {t.remark || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {renderModal(showStockIn, () => setShowStockIn(false), "材料入库", handleStockIn, "stockIn")}
      {renderModal(showReturn, () => setShowReturn(false), "材料退库", handleReturn, "return")}
    </div>
  );
}
