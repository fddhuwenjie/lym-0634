import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { request, useToast, formatDateTime } from "@/lib/api";
import { Evaluation, WorkOrder, STATUS_LABELS } from "../../../shared/types";
import {
  Star,
  MessageSquare,
  RefreshCw,
  UserRound,
  Clock,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function EvaluationManagement() {
  const toast = useToast();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showRework, setShowRework] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [reworkRemark, setReworkRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    avgRating: 0,
    total: 0,
    ratingCounts: [0, 0, 0, 0, 0],
  });

  async function load() {
    try {
      setLoading(true);
      const { evaluations: e } = await request("/api/admin/evaluations");
      setEvaluations(e || []);
      if (e && e.length > 0) {
        const avg = e.reduce((s: number, ev: Evaluation) => s + ev.rating, 0) / e.length;
        const counts = [0, 0, 0, 0, 0];
        e.forEach((ev: Evaluation) => {
          if (ev.rating >= 1 && ev.rating <= 5) counts[ev.rating - 1]++;
        });
        setStats({ avgRating: avg, total: e.length, ratingCounts: counts });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openRework(ev: Evaluation) {
    setSelectedEvaluation(ev);
    setReworkRemark("");
    setShowRework(true);
  }

  async function handleRework() {
    if (!selectedEvaluation) return;
    setSubmitting(true);
    try {
      await request(`/api/work-orders/${selectedEvaluation.orderId}/rework`, {
        method: "PUT",
        body: JSON.stringify({
          operatorId: 5,
          reason: reworkRemark || "评价不满意，要求返工",
        }),
      });
      toast.success("返工工单已创建");
      setShowRework(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderStars(rating: number, size = 16) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}
          />
        ))}
      </div>
    );
  }

  const maxCount = Math.max(...stats.ratingCounts, 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={22} className="text-primary-600" />
          <h2 className="text-xl font-semibold text-slate-800">服务评价</h2>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw size={14} />
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center">
            <div className="text-4xl font-bold text-slate-800 mb-1">
              {stats.avgRating ? stats.avgRating.toFixed(1) : "-"}
            </div>
            <div className="flex justify-center mb-2">{renderStars(Math.round(stats.avgRating), 18)}</div>
            <div className="text-sm text-slate-500">平均评分</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-4xl font-bold text-slate-800 mb-1">{stats.total}</div>
            <div className="text-sm text-slate-500 mt-4">评价总数</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm font-medium text-slate-700 mb-3">评分分布</div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-slate-600">{star}星</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all"
                      style={{ width: `${(stats.ratingCounts[star - 1] / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-500">
                    {stats.ratingCounts[star - 1]}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <span className="font-semibold text-slate-800">评价列表</span>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-16 text-slate-500">加载中...</div>
          ) : evaluations.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">暂无评价记录</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {evaluations.map((ev) => {
                const expanded = expandedId === ev.id;
                const isLowRating = ev.rating <= 2;
                return (
                  <div key={ev.id} className="hover:bg-slate-50 transition-colors">
                    <div
                      className="px-5 py-4 cursor-pointer"
                      onClick={() => setExpandedId(expanded ? null : ev.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isLowRating ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                            }`}
                          >
                            <UserRound size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">
                                {ev.residentName}
                              </span>
                              {renderStars(ev.rating)}
                              {ev.isLocked && (
                                <Badge className="bg-slate-100 text-slate-500 text-xs">
                                  <Clock size={10} className="mr-1" />
                                  已锁定
                                </Badge>
                              )}
                              {isLowRating && (
                                <Badge className="bg-red-50 text-red-600 text-xs">
                                  <AlertCircle size={10} className="mr-1" />
                                  低分
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              工单：{ev.orderNo} · 维修工：{ev.workerName || "-"} ·{" "}
                              {formatDateTime(ev.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLowRating && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRework(ev);
                              }}
                            >
                              <RotateCcw size={14} />
                              返工
                            </Button>
                          )}
                          {expanded ? (
                            <ChevronUp size={18} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={18} className="text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    {expanded && (
                      <div className="px-5 pb-4">
                        <div className="bg-slate-50 rounded-lg p-4 ml-13">
                          <div className="text-sm text-slate-700 leading-relaxed">
                            {ev.content || "（无评价内容）"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {showRework && selectedEvaluation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-semibold">发起返工</span>
                <button
                  onClick={() => setShowRework(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="bg-red-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-1.5 text-red-700 font-medium">
                  <AlertCircle size={14} />
                  低分评价触发返工
                </div>
                <div className="text-red-600 text-xs mt-1">
                  工单：{selectedEvaluation.orderNo}
                </div>
                <div className="text-red-600 text-xs">
                  评分：{selectedEvaluation.rating}星
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  返工原因
                </label>
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  rows={3}
                  placeholder="请输入返工原因说明"
                  value={reworkRemark}
                  onChange={(e) => setReworkRemark(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowRework(false)}>
                  取消
                </Button>
                <Button onClick={handleRework} disabled={submitting}>
                  {submitting ? "提交中..." : "确认返工"}
                </Button>
              </div>
            </CardBody>
          </div>
        </div>
      )}
    </div>
  );
}
