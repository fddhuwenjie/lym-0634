import { db } from "../db/database";
import {
  WorkOrder,
  DispatchLog,
  User,
  MaterialUsage,
  WorkOrderStatus,
  type PendingMaterial,
} from "../../shared/types";
import {
  startOrderSla,
  transitionSlaStage,
  getActiveSlaRecord,
  pauseSlaRecord,
  resumeSlaRecord,
  updateSlaRecordStatus,
  getSlaConfig,
  createSlaRecord,
  handleMaterialShortage,
} from "./slaService";

function parseWorkOrder(row: any): WorkOrder {
  return {
    ...row,
    images: row.images ? JSON.parse(row.images) : [],
    completeImages: row.complete_images ? JSON.parse(row.complete_images) : [],
    isOverdue: !!row.is_overdue,
    isRework: !!row.is_rework,
    reworkCount: row.rework_count || 0,
    dispatchRemark: row.dispatch_remark,
    arriveTime: row.arrive_time,
    processRemark: row.process_remark,
    completeRemark: row.complete_remark,
    dispatchedAt: row.dispatched_at,
    completedAt: row.completed_at,
    closedAt: row.closed_at,
    abnormalReason: row.abnormal_reason,
    workerId: row.worker_id,
    workerName: row.worker_name,
    residentId: row.resident_id,
    residentName: row.resident_name,
    buildingId: row.building_id,
    buildingName: row.building_name,
    unitNumber: row.unit_number,
    roomNumber: row.room_number,
    orderNo: row.order_no,
    createdAt: row.created_at,
  };
}

function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `WX${y}${m}${d}${rand}`;
}

export function checkOverdue(order: WorkOrder): boolean {
  if (order.status === "dispatched" && order.dispatchedAt) {
    const diff = Date.now() - new Date(order.dispatchedAt).getTime();
    if (diff > 24 * 60 * 60 * 1000) return true;
  }
  if (order.status === "processing" && order.arriveTime) {
    const diff = Date.now() - new Date(order.arriveTime).getTime();
    if (diff > 48 * 60 * 60 * 1000) return true;
  }
  return false;
}

function updateOverdueFlag(orderId: number) {
  const order = getOrderById(orderId);
  if (!order) return;
  const overdue = checkOverdue(order) ? 1 : 0;
  db.prepare("UPDATE work_orders SET is_overdue = ? WHERE id = ?").run(
    overdue,
    orderId
  );
}

export function checkDuplicateReport(
  residentId: number,
  buildingId: number,
  unitNumber: string,
  roomNumber: string,
  type: string
): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM work_orders 
       WHERE resident_id = ? AND building_id = ? AND unit_number = ? 
       AND room_number = ? AND type = ? AND status != 'closed'`
    )
    .get(residentId, buildingId, unitNumber, roomNumber, type) as {
    cnt: number;
  };
  return row.cnt > 0;
}

export function checkWorkerArea(workerId: number, buildingId: number): boolean {
  const worker = db
    .prepare("SELECT * FROM users WHERE id = ? AND role = 'worker'")
    .get(workerId) as any;
  if (!worker) return false;
  const rawIds = worker.building_ids;
  if (!rawIds) return false;
  let buildingIds: number[] = [];
  if (typeof rawIds === "string") {
    buildingIds = JSON.parse(rawIds);
  } else if (Array.isArray(rawIds)) {
    buildingIds = rawIds;
  }
  return buildingIds.includes(buildingId);
}

export function createOrder(params: {
  residentId: number;
  residentName: string;
  buildingId: number;
  buildingName: string;
  unitNumber: string;
  roomNumber: string;
  type: string;
  urgency: string;
  description: string;
  images?: string[];
}): WorkOrder {
  const duplicate = checkDuplicateReport(
    params.residentId,
    params.buildingId,
    params.unitNumber,
    params.roomNumber,
    params.type
  );
  if (duplicate) {
    throw new Error("您已有同类型未关闭的工单，请勿重复报修");
  }

  const orderNo = generateOrderNo();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO work_orders 
       (order_no, resident_id, resident_name, building_id, building_name, 
        unit_number, room_number, type, urgency, description, images, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(
      orderNo,
      params.residentId,
      params.residentName,
      params.buildingId,
      params.buildingName,
      params.unitNumber,
      params.roomNumber,
      params.type,
      params.urgency,
      params.description,
      JSON.stringify(params.images || []),
      now
    );

  const orderId = result.lastInsertRowid as number;
  startOrderSla(orderId);

  return getOrderById(orderId)!;
}

export function getOrderById(id: number): WorkOrder | null {
  const row = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(id);
  if (!row) return null;
  const order = parseWorkOrder(row);
  return { ...order, isOverdue: checkOverdue(order) };
}

export function listOrders(params?: {
  status?: WorkOrderStatus;
  residentId?: number;
  workerId?: number;
  buildingId?: number;
  type?: string;
}): WorkOrder[] {
  const conditions: string[] = [];
  const args: any[] = [];

  if (params?.status) {
    conditions.push("status = ?");
    args.push(params.status);
  }
  if (params?.residentId) {
    conditions.push("resident_id = ?");
    args.push(params.residentId);
  }
  if (params?.workerId) {
    conditions.push("worker_id = ?");
    args.push(params.workerId);
  }
  if (params?.buildingId) {
    conditions.push("building_id = ?");
    args.push(params.buildingId);
  }
  if (params?.type) {
    conditions.push("type = ?");
    args.push(params.type);
  }

  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const rows = db
    .prepare(`SELECT * FROM work_orders ${where} ORDER BY created_at DESC`)
    .all(...args);

  return rows.map((r: any) => {
    const order = parseWorkOrder(r);
    return { ...order, isOverdue: checkOverdue(order) };
  });
}

export function dispatchOrder(
  orderId: number,
  workerId: number,
  operatorId: number,
  operatorName: string,
  remark?: string,
  forceRedispatch?: boolean
): WorkOrder {
  const order = getOrderById(orderId);
  if (!order) throw new Error("工单不存在");
  const isRedispatch = forceRedispatch || !!order.workerId;
  if (isRedispatch) {
    if (!["dispatched", "processing"].includes(order.status)) {
      throw new Error("当前状态不支持改派");
    }
  } else {
    if (!["pending"].includes(order.status)) {
      throw new Error("当前状态不支持派单");
    }
  }

  if (!checkWorkerArea(workerId, order.buildingId)) {
    throw new Error("该维修工不负责此楼栋片区");
  }

  const worker = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(workerId) as User | undefined;
  if (!worker) throw new Error("维修工不存在");

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE work_orders SET status = 'dispatched', worker_id = ?, worker_name = ?, 
       dispatch_remark = ?, dispatched_at = ? WHERE id = ?`
    ).run(workerId, worker.name, remark || "", now, orderId);

    db.prepare(
      `INSERT INTO dispatch_logs 
       (order_id, from_worker_id, to_worker_id, operator_id, remark, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      orderId,
      order.workerId || null,
      workerId,
      operatorId,
      remark || (isRedispatch ? "改派工单" : "派单"),
      now
    );
  });
  tx();

  if (isRedispatch) {
    const activeRecord = getActiveSlaRecord(orderId);
    if (activeRecord) {
      if (activeRecord.isPaused) {
        resumeSlaRecord(activeRecord.id);
      } else {
        pauseSlaRecord(activeRecord.id, "redispatch");
        const recordAfterPause = getActiveSlaRecord(orderId);
        if (recordAfterPause && recordAfterPause.isPaused) {
          resumeSlaRecord(recordAfterPause.id);
        }
      }
    }
  } else {
    transitionSlaStage(orderId, "arrive", now);
  }

  return getOrderById(orderId)!;
}

export function listDispatchLogs(orderId: number): DispatchLog[] {
  const rows = db
    .prepare(
      `SELECT d.*, 
              uf.name as from_worker_name,
              ut.name as to_worker_name,
              uo.name as operator_name
       FROM dispatch_logs d
       LEFT JOIN users uf ON d.from_worker_id = uf.id
       LEFT JOIN users ut ON d.to_worker_id = ut.id
       LEFT JOIN users uo ON d.operator_id = uo.id
       WHERE d.order_id = ? ORDER BY d.created_at DESC`
    )
    .all(orderId);

  return rows.map((r: any) => ({
    id: r.id,
    orderId: r.order_id,
    fromWorkerId: r.from_worker_id,
    fromWorkerName: r.from_worker_name,
    toWorkerId: r.to_worker_id,
    toWorkerName: r.to_worker_name,
    operatorId: r.operator_id,
    operatorName: r.operator_name,
    remark: r.remark,
    createdAt: r.created_at,
  }));
}

export function arriveAtSite(orderId: number, workerId: number): WorkOrder {
  const order = getOrderById(orderId);
  if (!order) throw new Error("工单不存在");
  if (order.status !== "dispatched") {
    throw new Error("当前状态不支持签到");
  }
  if (order.workerId !== workerId) {
    throw new Error("不是分配给您的工单");
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE work_orders SET status = 'processing', arrive_time = ? WHERE id = ?`
  ).run(now, orderId);

  transitionSlaStage(orderId, "complete", now);

  return getOrderById(orderId)!;
}

export function updateProcess(
  orderId: number,
  workerId: number,
  processRemark: string
): WorkOrder {
  const order = getOrderById(orderId);
  if (!order) throw new Error("工单不存在");
  if (order.status !== "processing") {
    throw new Error("当前状态不支持处理更新");
  }
  if (order.workerId !== workerId) {
    throw new Error("不是分配给您的工单");
  }

  db.prepare("UPDATE work_orders SET process_remark = ? WHERE id = ?").run(
    processRemark,
    orderId
  );

  return getOrderById(orderId)!;
}

export function completeOrder(params: {
  orderId: number;
  workerId: number;
  completeRemark: string;
  completeImages?: string[];
  materialUsages: MaterialUsage[];
}): WorkOrder {
  const order = getOrderById(params.orderId);
  if (!order) throw new Error("工单不存在");
  if (order.status !== "processing") {
    throw new Error("请先到场签到后再完工");
  }
  if (!order.arriveTime) {
    throw new Error("必须先到场签到才能完工");
  }
  if (order.workerId !== params.workerId) {
    throw new Error("不是分配给您的工单");
  }

  const pendingMaterials: (PendingMaterial & { unit: string })[] = [];
  for (const usage of params.materialUsages) {
    const mat = db
      .prepare("SELECT * FROM materials WHERE id = ?")
      .get(usage.materialId) as any;
    if (!mat) throw new Error(`材料不存在: id=${usage.materialId}`);
    if (mat.stock < usage.quantity) {
      pendingMaterials.push({
        materialId: mat.id,
        materialName: mat.name,
        requiredQuantity: usage.quantity,
        currentStock: mat.stock,
        unit: mat.unit,
      });
    }
  }

  if (pendingMaterials.length > 0) {
    const result = handleMaterialShortage(params.orderId, pendingMaterials);
    const shortDesc = pendingMaterials
      .map((m) => `${m.materialName} 需求${m.requiredQuantity}${m.unit}，库存${m.currentStock}${m.unit}`)
      .join("; ");
    throw new Error(`材料库存不足: ${shortDesc}，已自动暂停 SLA 计时`);
  }

  const now = new Date().toISOString();
  const worker = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(params.workerId) as User;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE work_orders SET status = 'pending_evaluation', complete_remark = ?, 
       complete_images = ?, completed_at = ? WHERE id = ?`
    ).run(
      params.completeRemark,
      JSON.stringify(params.completeImages || []),
      now,
      params.orderId
    );

    for (const usage of params.materialUsages) {
      const mat = db
        .prepare("SELECT * FROM materials WHERE id = ?")
        .get(usage.materialId) as any;
      const beforeStock = mat.stock;
      const afterStock = beforeStock - usage.quantity;

      db.prepare("UPDATE materials SET stock = ? WHERE id = ?").run(
        afterStock,
        usage.materialId
      );

      db.prepare(
        `INSERT INTO material_transactions 
         (material_id, material_name, order_id, order_no, type, quantity, 
          before_stock, after_stock, operator_id, operator_name, remark, created_at)
         VALUES (?, ?, ?, ?, 'use', ?, ?, ?, ?, ?, '工单材料使用', ?)`
      ).run(
        usage.materialId,
        mat.name,
        params.orderId,
        order.orderNo,
        usage.quantity,
        beforeStock,
        afterStock,
        params.workerId,
        worker.name,
        now
      );
    }
  });
  tx();

  const activeRecord = getActiveSlaRecord(params.orderId);
  if (activeRecord) {
    const actualMinutes = Math.round(
      (new Date(now).getTime() - new Date(activeRecord.startTime).getTime()) /
        60000
    );
    updateSlaRecordStatus(activeRecord.id, "resolved", {
      resolvedAt: now,
      actualMinutes,
    });
  }

  return getOrderById(params.orderId)!;
}

export function reworkOrder(
  orderId: number,
  operatorId: number,
  reason: string
): WorkOrder {
  const order = getOrderById(orderId);
  if (!order) throw new Error("工单不存在");
  if (!["pending_evaluation", "closed"].includes(order.status)) {
    throw new Error("当前状态不支持返工");
  }
  if (!order.workerId) {
    throw new Error("工单未分配维修工，无法返工");
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE work_orders SET status = 'processing', is_rework = 1, 
     rework_count = rework_count + 1, abnormal_reason = ?, closed_at = NULL WHERE id = ?`
  ).run(reason, orderId);

  const config = getSlaConfig(order.type, order.urgency, order.buildingId);
  if (config) {
    createSlaRecord(orderId, order.orderNo, "complete", now, config.completeLimit);
    
    const activeRecord = getActiveSlaRecord(orderId);
    if (activeRecord) {
      pauseSlaRecord(activeRecord.id, "rework");
      const recordAfterPause = getActiveSlaRecord(orderId);
      if (recordAfterPause && recordAfterPause.isPaused) {
        resumeSlaRecord(recordAfterPause.id);
      }
    }
  }

  return getOrderById(orderId)!;
}

export function evaluateOrder(params: {
  orderId: number;
  residentId: number;
  rating: number;
  content: string;
}): WorkOrder {
  const order = getOrderById(params.orderId);
  if (!order) throw new Error("工单不存在");
  if (order.status !== "pending_evaluation") {
    throw new Error("当前状态不支持评价");
  }
  if (order.residentId !== params.residentId) {
    throw new Error("不是您的工单");
  }
  if (order.completedAt) {
    const diff = Date.now() - new Date(order.completedAt).getTime();
    if (diff > 7 * 24 * 60 * 60 * 1000) {
      throw new Error("评价已超时，无法评价");
    }
  }
  const existingEval = db
    .prepare("SELECT * FROM evaluations WHERE order_id = ?")
    .get(params.orderId);
  if (existingEval) {
    throw new Error("已评价，不可重复评价");
  }
  if (params.rating < 1 || params.rating > 5) {
    throw new Error("评分必须为1-5星");
  }

  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO evaluations 
       (order_id, order_no, resident_id, resident_name, worker_id, worker_name, 
        rating, content, created_at, is_locked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      params.orderId,
      order.orderNo,
      params.residentId,
      order.residentName,
      order.workerId,
      order.workerName,
      params.rating,
      params.content,
      now
    );
    db.prepare(
      `UPDATE work_orders SET status = 'closed', closed_at = ? WHERE id = ?`
    ).run(now, params.orderId);
  });
  tx();

  return getOrderById(params.orderId)!;
}

export function getOrderMaterials(orderId: number) {
  return db
    .prepare(
      `SELECT mt.*, m.unit, m.price 
       FROM material_transactions mt 
       LEFT JOIN materials m ON mt.material_id = m.id
       WHERE mt.order_id = ? AND mt.type = 'use'`
    )
    .all(orderId)
    .map((r: any) => ({
      id: r.id,
      materialId: r.material_id,
      materialName: r.material_name,
      quantity: r.quantity,
      unit: r.unit,
      price: r.price,
      totalPrice: r.price * r.quantity,
    }));
}

export function getEvaluationByOrder(orderId: number) {
  const row = db
    .prepare("SELECT * FROM evaluations WHERE order_id = ?")
    .get(orderId) as any;
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    orderNo: row.order_no,
    residentId: row.resident_id,
    residentName: row.resident_name,
    workerId: row.worker_id,
    workerName: row.worker_name,
    rating: row.rating,
    content: row.content,
    createdAt: row.created_at,
    isLocked: !!row.is_locked,
  };
}
