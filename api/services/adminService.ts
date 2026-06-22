import { db } from "../db/database";
import {
  StatsData,
  Evaluation,
  ExportRecord,
  REPAIR_TYPE_LABELS,
  SLA_STATUS_LABELS,
  SLA_STAGE_LABELS,
} from "../../shared/types";
import { listOrders, listDispatchLogs, getOrderMaterials } from "./orderService";
import { listTransactions } from "./materialService";
import { enrichOrderWithSla, getSlaRecordsByOrder, getSlaEscalationsByOrder } from "./slaService";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exportDir = path.resolve(__dirname, "../../data/exports");
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

export function getStats(): StatsData {
  const allOrders = listOrders();
  const totalOrders = allOrders.length;
  const pendingOrders = allOrders.filter((o) => o.status === "pending").length;
  const processingOrders = allOrders.filter(
    (o) => o.status === "dispatched" || o.status === "processing"
  ).length;
  const completedOrders = allOrders.filter(
    (o) => o.status === "closed" || o.status === "pending_evaluation"
  ).length;
  const overdueOrders = allOrders.filter((o) => o.isOverdue).length;

  let totalMinutes = 0;
  let count = 0;
  for (const o of allOrders) {
    if (o.arriveTime && o.completedAt) {
      totalMinutes +=
        (new Date(o.completedAt).getTime() - new Date(o.arriveTime).getTime()) /
        60000;
      count++;
    }
  }
  const avgProcessMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;

  const byBuilding: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  for (const o of allOrders) {
    byBuilding[o.buildingName] = (byBuilding[o.buildingName] || 0) + 1;
    const typeLabel =
      REPAIR_TYPE_LABELS[o.type as keyof typeof REPAIR_TYPE_LABELS] || o.type;
    byType[typeLabel] = (byType[typeLabel] || 0) + 1;
    const d = new Date(o.createdAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
  }

  const evaluations = listEvaluations();
  let totalRating = 0;
  for (const e of evaluations) totalRating += e.rating;
  const avgRating =
    evaluations.length > 0
      ? Math.round((totalRating / evaluations.length) * 10) / 10
      : 0;

  return {
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    avgProcessMinutes,
    ordersByBuilding: Object.entries(byBuilding).map(([name, value]) => ({
      name,
      value,
    })),
    ordersByType: Object.entries(byType).map(([name, value]) => ({
      name,
      value,
    })),
    ordersByMonth: Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value })),
    overdueOrders,
    avgRating,
    totalEvaluations: evaluations.length,
  };
}

export function listEvaluations(): Evaluation[] {
  return db
    .prepare(
      `SELECT e.*, o.worker_id, o.worker_name
       FROM evaluations e LEFT JOIN work_orders o ON e.order_id = o.id
       ORDER BY e.created_at DESC`
    )
    .all()
    .map((r: any) => ({
      id: r.id,
      orderId: r.order_id,
      orderNo: r.order_no,
      residentId: r.resident_id,
      residentName: r.resident_name,
      workerId: r.worker_id,
      workerName: r.worker_name,
      rating: r.rating,
      content: r.content,
      createdAt: r.created_at,
      isLocked: !!r.is_locked,
    }));
}

function escapeCsv(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function createExport(
  type: "quality" | "material" | "evaluation" | "inspection_tasks" | "hazard_records",
  filters: Record<string, any>,
  createdBy: number,
  createdByName: string
): ExportRecord {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}_${String(
    now.getHours()
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const typeMap = { quality: "服务质量", material: "材料核销", evaluation: "服务评价" };
  const fileName = `${typeMap[type]}_导出_${ts}.csv`;
  const filePath = path.join(exportDir, fileName);

  let csvContent = "";

  if (type === "quality") {
    const orders = listOrders(filters);
    csvContent =
      "工单编号,楼栋,单元房间,报修类型,紧急程度,状态,报修人,维修工,创建时间,派单时间,到场时间,完工时间,处理时长(分钟),是否返工,返工次数,是否超时,异常原因,派单备注,处理说明,完工说明," +
      "SLA状态,SLA当前阶段,SLA截止时间,剩余时间(分钟),超时时间(分钟)," +
      "响应时限(分钟),到场时限(分钟),完工时限(分钟)," +
      "升级次数,最后升级原因,最后升级对象,最后升级时间,升级处理意见,升级处理结果,升级解除时间," +
      "SLA暂停次数,暂停原因,暂停时长(分钟)\n";
    for (const o of orders) {
      const orderWithSla = enrichOrderWithSla(o);
      const slaRecords = getSlaRecordsByOrder(o.id);
      const escalations = getSlaEscalationsByOrder(o.id);
      
      let duration = "";
      if (o.arriveTime && o.completedAt) {
        duration = String(
          Math.round(
            (new Date(o.completedAt).getTime() -
              new Date(o.arriveTime).getTime()) /
              60000
          )
        );
      }
      const dispatches = listDispatchLogs(o.id);
      const lastDispatch = dispatches[0];
      
      const lastEscalation = escalations.find(e => !e.isResolved) || escalations[0];
      const pauseRecords = slaRecords.filter(r => r.isPaused || r.pauseMinutes > 0);
      const totalPauseMinutes = pauseRecords.reduce((sum, r) => sum + r.pauseMinutes, 0);
      const pauseReasons = [...new Set(pauseRecords.map(r => r.pauseReason).filter(Boolean))].join(";");
      
      const slaConfig = slaRecords.length > 0 ? {
        responseLimit: slaRecords.find(r => r.stage === "response")?.limitMinutes || "",
        arriveLimit: slaRecords.find(r => r.stage === "arrive")?.limitMinutes || "",
        completeLimit: slaRecords.find(r => r.stage === "complete")?.limitMinutes || "",
      } : { responseLimit: "", arriveLimit: "", completeLimit: "" };
      
      csvContent +=
        [
          o.orderNo,
          o.buildingName,
          `${o.unitNumber}单元${o.roomNumber}`,
          REPAIR_TYPE_LABELS[o.type as keyof typeof REPAIR_TYPE_LABELS],
          o.urgency,
          o.status,
          o.residentName,
          o.workerName || "",
          o.createdAt,
          o.dispatchedAt || "",
          o.arriveTime || "",
          o.completedAt || "",
          duration,
          o.isRework ? "是" : "否",
          o.reworkCount,
          o.isOverdue ? "是" : "否",
          o.abnormalReason || "",
          lastDispatch?.remark || o.dispatchRemark || "",
          o.processRemark || "",
          o.completeRemark || "",
          SLA_STATUS_LABELS[orderWithSla.currentSlaStatus as keyof typeof SLA_STATUS_LABELS] || orderWithSla.currentSlaStatus,
          orderWithSla.currentStage ? SLA_STAGE_LABELS[orderWithSla.currentStage as keyof typeof SLA_STAGE_LABELS] : "",
          orderWithSla.currentDeadline || "",
          orderWithSla.remainingMinutes !== null ? orderWithSla.remainingMinutes : "",
          orderWithSla.overdueMinutes !== null ? orderWithSla.overdueMinutes : "",
          slaConfig.responseLimit,
          slaConfig.arriveLimit,
          slaConfig.completeLimit,
          escalations.length,
          lastEscalation?.triggerReason || "",
          lastEscalation?.escalatedToUserName || "",
          lastEscalation?.createdAt || "",
          lastEscalation?.handlerRemark || "",
          lastEscalation?.resolution || "",
          lastEscalation?.resolvedAt || "",
          pauseRecords.length,
          pauseReasons,
          totalPauseMinutes,
        ]
          .map(escapeCsv)
          .join(",") +
        "\n";
    }
  } else if (type === "material") {
    const transactions = listTransactions(filters);
    csvContent =
      "流水ID,材料名称,关联工单,类型,数量,变动前库存,变动后库存,操作人,备注,时间\n";
    for (const t of transactions) {
      csvContent +=
        [
          t.id,
          t.materialName,
          t.orderNo || "",
          t.type,
          t.quantity,
          t.beforeStock,
          t.afterStock,
          t.operatorName,
          t.remark,
          t.createdAt,
        ]
          .map(escapeCsv)
          .join(",") +
        "\n";
    }
  } else {
    const evaluations = listEvaluations();
    csvContent = "工单编号,报修人,维修工,评分(1-5),评价内容,评价时间,是否锁定\n";
    for (const e of evaluations) {
      csvContent +=
        [
          e.orderNo,
          e.residentName,
          e.workerName || "",
          e.rating,
          e.content,
          e.createdAt,
          e.isLocked ? "是" : "否",
        ]
          .map(escapeCsv)
          .join(",") +
        "\n";
    }
  }

  fs.writeFileSync(filePath, "\ufeff" + csvContent, "utf-8");

  const result = db
    .prepare(
      `INSERT INTO export_history 
       (type, file_name, filters, status, created_by, created_by_name, created_at)
       VALUES (?, ?, ?, 'done', ?, ?, ?)`
    )
    .run(
      type,
      fileName,
      JSON.stringify(filters),
      createdBy,
      createdByName,
      now.toISOString()
    );

  return getExportRecord(result.lastInsertRowid as number)!;
}

export function getExportRecord(id: number): ExportRecord | undefined {
  const r = db
    .prepare("SELECT * FROM export_history WHERE id = ?")
    .get(id) as any;
  if (!r) return undefined;
  return {
    id: r.id,
    type: r.type,
    fileName: r.file_name,
    filters: r.filters ? JSON.parse(r.filters) : {},
    status: r.status,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
  };
}

export function listExportHistory(): ExportRecord[] {
  return db
    .prepare("SELECT * FROM export_history ORDER BY created_at DESC")
    .all()
    .map((r: any) => ({
      id: r.id,
      type: r.type,
      fileName: r.file_name,
      filters: r.filters ? JSON.parse(r.filters) : {},
      status: r.status,
      createdBy: r.created_by,
      createdByName: r.created_by_name,
      createdAt: r.created_at,
    }));
}

export function getExportFilePath(fileName: string): string {
  const safeName = path.basename(fileName);
  return path.join(exportDir, safeName);
}
