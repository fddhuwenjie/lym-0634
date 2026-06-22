import { db } from "../db/database";
import {
  SlaConfig,
  SlaRecord,
  SlaEscalation,
  SlaWarning,
  WorkOrder,
  SlaStatus,
  SlaStage,
  SlaPauseReason,
  WorkOrderWithSla,
  SlaDashboardStats,
  SLA_STAGE_LABELS,
} from "../../shared/types";
import { getOrderById, listOrders } from "./orderService";

function parseSlaConfig(row: any): SlaConfig {
  return {
    id: row.id,
    repairType: row.repair_type,
    urgency: row.urgency,
    buildingId: row.building_id,
    buildingName: row.building_name,
    responseLimit: row.response_limit,
    arriveLimit: row.arrive_limit,
    completeLimit: row.complete_limit,
    warningThreshold: row.warning_threshold,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSlaRecord(row: any): SlaRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNo: row.order_no,
    stage: row.stage,
    status: row.status,
    startTime: row.start_time,
    deadline: row.deadline,
    limitMinutes: row.limit_minutes,
    warningAt: row.warning_at,
    overdueAt: row.overdue_at,
    isPaused: !!row.is_paused,
    pauseReason: row.pause_reason,
    pausedAt: row.paused_at,
    resumedAt: row.resumed_at,
    pauseMinutes: row.pause_minutes || 0,
    actualMinutes: row.actual_minutes,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

function parseSlaEscalation(row: any): SlaEscalation {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNo: row.order_no,
    slaRecordId: row.sla_record_id,
    triggerReason: row.trigger_reason,
    triggerStage: row.trigger_stage,
    overdueMinutes: row.overdue_minutes,
    escalatedTo: row.escalated_to,
    escalatedToUserId: row.escalated_to_user_id,
    escalatedToUserName: row.escalated_to_user_name,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    handlerRemark: row.handler_remark,
    handlerId: row.handler_id,
    handlerName: row.handler_name,
    handledAt: row.handled_at,
    resolution: row.resolution,
    resolverId: row.resolver_id,
    resolverName: row.resolver_name,
    resolvedAt: row.resolved_at,
    isResolved: !!row.is_resolved,
    createdAt: row.created_at,
  };
}

function parseSlaWarning(row: any): SlaWarning {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNo: row.order_no,
    slaRecordId: row.sla_record_id,
    stage: row.stage,
    remainingMinutes: row.remaining_minutes,
    notifiedTo: row.notified_to ? JSON.parse(row.notified_to) : [],
    createdAt: row.created_at,
  };
}

export function getSlaConfig(
  repairType: string,
  urgency: string,
  buildingId?: number
): SlaConfig | null {
  let row = db
    .prepare(
      `SELECT * FROM sla_configs 
       WHERE repair_type = ? AND urgency = ? AND building_id = ?`
    )
    .get(repairType, urgency, buildingId || 0) as any;

  if (!row && buildingId) {
    row = db
      .prepare(
        `SELECT * FROM sla_configs 
         WHERE repair_type = ? AND urgency = ? AND building_id = 0`
      )
      .get(repairType, urgency) as any;
  }

  return row ? parseSlaConfig(row) : null;
}

export function listSlaConfigs(params?: {
  repairType?: string;
  urgency?: string;
  buildingId?: number;
}): SlaConfig[] {
  const conditions: string[] = [];
  const args: any[] = [];

  if (params?.repairType) {
    conditions.push("repair_type = ?");
    args.push(params.repairType);
  }
  if (params?.urgency) {
    conditions.push("urgency = ?");
    args.push(params.urgency);
  }
  if (params?.buildingId !== undefined) {
    conditions.push("building_id = ?");
    args.push(params.buildingId);
  }

  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const rows = db
    .prepare(`SELECT * FROM sla_configs ${where} ORDER BY id ASC`)
    .all(...args);

  return rows.map(parseSlaConfig);
}

export function createSlaConfig(params: {
  repairType: string;
  urgency: string;
  buildingId?: number;
  buildingName?: string;
  responseLimit: number;
  arriveLimit: number;
  completeLimit: number;
  warningThreshold: number;
}): SlaConfig {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO sla_configs 
       (repair_type, urgency, building_id, building_name, response_limit, arrive_limit, complete_limit, warning_threshold, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.repairType,
      params.urgency,
      params.buildingId || 0,
      params.buildingName || null,
      params.responseLimit,
      params.arriveLimit,
      params.completeLimit,
      params.warningThreshold,
      now,
      now
    );

  return getSlaConfigById(result.lastInsertRowid as number)!;
}

export function updateSlaConfig(
  id: number,
  params: {
    responseLimit?: number;
    arriveLimit?: number;
    completeLimit?: number;
    warningThreshold?: number;
  }
): SlaConfig {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const args: any[] = [];

  if (params.responseLimit !== undefined) {
    fields.push("response_limit = ?");
    args.push(params.responseLimit);
  }
  if (params.arriveLimit !== undefined) {
    fields.push("arrive_limit = ?");
    args.push(params.arriveLimit);
  }
  if (params.completeLimit !== undefined) {
    fields.push("complete_limit = ?");
    args.push(params.completeLimit);
  }
  if (params.warningThreshold !== undefined) {
    fields.push("warning_threshold = ?");
    args.push(params.warningThreshold);
  }
  fields.push("updated_at = ?");
  args.push(now);
  args.push(id);

  db.prepare(`UPDATE sla_configs SET ${fields.join(", ")} WHERE id = ?`).run(
    ...args
  );

  return getSlaConfigById(id)!;
}

export function deleteSlaConfig(id: number): void {
  db.prepare("DELETE FROM sla_configs WHERE id = ?").run(id);
}

export function getSlaConfigById(id: number): SlaConfig | null {
  const row = db.prepare("SELECT * FROM sla_configs WHERE id = ?").get(id) as any;
  return row ? parseSlaConfig(row) : null;
}

export function createSlaRecord(
  orderId: number,
  orderNo: string,
  stage: SlaStage,
  startTime: string,
  limitMinutes: number
): SlaRecord {
  const now = new Date().toISOString();
  const deadline = new Date(
    new Date(startTime).getTime() + limitMinutes * 60 * 1000
  ).toISOString();

  const result = db
    .prepare(
      `INSERT INTO sla_records 
       (order_id, order_no, stage, status, start_time, deadline, limit_minutes, is_paused, pause_minutes, created_at)
       VALUES (?, ?, ?, 'normal', ?, ?, ?, 0, 0, ?)`
    )
    .run(orderId, orderNo, stage, startTime, deadline, limitMinutes, now);

  return getSlaRecordById(result.lastInsertRowid as number)!;
}

export function getSlaRecordById(id: number): SlaRecord | null {
  const row = db.prepare("SELECT * FROM sla_records WHERE id = ?").get(id) as any;
  return row ? parseSlaRecord(row) : null;
}

export function getSlaRecordsByOrder(orderId: number): SlaRecord[] {
  const rows = db
    .prepare("SELECT * FROM sla_records WHERE order_id = ? ORDER BY id ASC")
    .all(orderId);
  return rows.map(parseSlaRecord);
}

export function getActiveSlaRecord(orderId: number): SlaRecord | null {
  const row = db
    .prepare(
      `SELECT * FROM sla_records 
       WHERE order_id = ? AND status NOT IN ('resolved') 
       ORDER BY id DESC LIMIT 1`
    )
    .get(orderId) as any;
  return row ? parseSlaRecord(row) : null;
}

export function updateSlaRecordStatus(
  id: number,
  status: SlaStatus,
  extra?: {
    warningAt?: string;
    overdueAt?: string;
    resolvedAt?: string;
    actualMinutes?: number;
  }
): SlaRecord {
  const fields: string[] = ["status = ?"];
  const args: any[] = [status];

  if (extra?.warningAt !== undefined) {
    fields.push("warning_at = ?");
    args.push(extra.warningAt);
  }
  if (extra?.overdueAt !== undefined) {
    fields.push("overdue_at = ?");
    args.push(extra.overdueAt);
  }
  if (extra?.resolvedAt !== undefined) {
    fields.push("resolved_at = ?");
    args.push(extra.resolvedAt);
  }
  if (extra?.actualMinutes !== undefined) {
    fields.push("actual_minutes = ?");
    args.push(extra.actualMinutes);
  }

  args.push(id);
  db.prepare(`UPDATE sla_records SET ${fields.join(", ")} WHERE id = ?`).run(
    ...args
  );

  return getSlaRecordById(id)!;
}

export function pauseSlaRecord(
  id: number,
  reason: SlaPauseReason
): SlaRecord {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE sla_records SET is_paused = 1, pause_reason = ?, paused_at = ? WHERE id = ?`
  ).run(reason, now, id);
  return getSlaRecordById(id)!;
}

export function resumeSlaRecord(id: number): SlaRecord {
  const record = getSlaRecordById(id);
  if (!record || !record.isPaused || !record.pausedAt) {
    throw new Error("SLA记录未暂停");
  }

  const now = new Date().toISOString();
  const pauseMs = new Date(now).getTime() - new Date(record.pausedAt).getTime();
  const pauseMinutes = Math.round(pauseMs / 60000);
  const newDeadline = new Date(
    new Date(record.deadline).getTime() + pauseMs
  ).toISOString();

  db.prepare(
    `UPDATE sla_records 
     SET is_paused = 0, resumed_at = ?, pause_minutes = pause_minutes + ?, 
         deadline = ?, status = 'normal', warning_at = NULL, overdue_at = NULL
     WHERE id = ?`
  ).run(now, pauseMinutes, newDeadline, id);

  return getSlaRecordById(id)!;
}

export function calculateSlaTiming(record: SlaRecord, warningThreshold?: number): {
  remainingMinutes: number | null;
  overdueMinutes: number | null;
  status: SlaStatus;
} {
  if (record.status === "resolved") {
    return { remainingMinutes: null, overdueMinutes: null, status: "resolved" };
  }

  if (record.isPaused) {
    const remainingMs =
      new Date(record.deadline).getTime() - Date.now();
    const remainingMinutes = Math.max(0, Math.round(remainingMs / 60000));
    return { remainingMinutes, overdueMinutes: null, status: record.status };
  }

  const now = Date.now();
  const deadline = new Date(record.deadline).getTime();
  const remainingMs = deadline - now;
  const remainingMinutes = Math.round(remainingMs / 60000);

  if (remainingMinutes < 0) {
    return {
      remainingMinutes,
      overdueMinutes: Math.abs(remainingMinutes),
      status: "overdue",
    };
  }

  const threshold = warningThreshold ?? 30;

  if (remainingMinutes <= threshold) {
    return { remainingMinutes, overdueMinutes: null, status: "warning" };
  }

  return { remainingMinutes, overdueMinutes: null, status: "normal" };
}

export function createSlaWarning(
  orderId: number,
  orderNo: string,
  slaRecordId: number,
  stage: SlaStage,
  remainingMinutes: number,
  notifiedTo: string[]
): SlaWarning {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO sla_warnings 
       (order_id, order_no, sla_record_id, stage, remaining_minutes, notified_to, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      orderId,
      orderNo,
      slaRecordId,
      stage,
      remainingMinutes,
      JSON.stringify(notifiedTo),
      now
    );

  const row = db.prepare("SELECT * FROM sla_warnings WHERE id = ?").get(
    result.lastInsertRowid as number
  ) as any;
  return parseSlaWarning(row);
}

export function getSlaWarningsByOrder(orderId: number): SlaWarning[] {
  const rows = db
    .prepare(
      "SELECT * FROM sla_warnings WHERE order_id = ? ORDER BY created_at DESC"
    )
    .all(orderId);
  return rows.map(parseSlaWarning);
}

export function createSlaEscalation(params: {
  orderId: number;
  orderNo: string;
  slaRecordId: number;
  triggerReason: string;
  triggerStage: SlaStage;
  overdueMinutes: number;
  escalatedTo: "service_manager" | "repair_manager";
  escalatedToUserId: number;
  escalatedToUserName: string;
  operatorId: number;
  operatorName: string;
}): SlaEscalation {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO sla_escalations 
       (order_id, order_no, sla_record_id, trigger_reason, trigger_stage, overdue_minutes, 
        escalated_to, escalated_to_user_id, escalated_to_user_name, operator_id, operator_name, 
        is_resolved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(
      params.orderId,
      params.orderNo,
      params.slaRecordId,
      params.triggerReason,
      params.triggerStage,
      params.overdueMinutes,
      params.escalatedTo,
      params.escalatedToUserId,
      params.escalatedToUserName,
      params.operatorId,
      params.operatorName,
      now
    );

  db.prepare(
    `UPDATE sla_records SET status = 'escalated' WHERE id = ?`
  ).run(params.slaRecordId);

  return getSlaEscalationById(result.lastInsertRowid as number)!;
}

export function getSlaEscalationById(id: number): SlaEscalation | null {
  const row = db.prepare("SELECT * FROM sla_escalations WHERE id = ?").get(id) as any;
  return row ? parseSlaEscalation(row) : null;
}

export function getSlaEscalationsByOrder(orderId: number): SlaEscalation[] {
  const rows = db
    .prepare(
      "SELECT * FROM sla_escalations WHERE order_id = ? ORDER BY created_at DESC"
    )
    .all(orderId);
  return rows.map(parseSlaEscalation);
}

export function getActiveEscalation(orderId: number): SlaEscalation | null {
  const row = db
    .prepare(
      `SELECT * FROM sla_escalations 
       WHERE order_id = ? AND is_resolved = 0 
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(orderId) as any;
  return row ? parseSlaEscalation(row) : null;
}

export function handleEscalation(
  id: number,
  handlerId: number,
  handlerName: string,
  handlerRemark: string
): SlaEscalation {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE sla_escalations 
     SET handler_id = ?, handler_name = ?, handler_remark = ?, handled_at = ? 
     WHERE id = ?`
  ).run(handlerId, handlerName, handlerRemark, now, id);

  return getSlaEscalationById(id)!;
}

export function resolveEscalation(
  id: number,
  resolution: string,
  resolverId: number,
  resolverName: string
): SlaEscalation {
  const now = new Date().toISOString();
  const escalation = getSlaEscalationById(id);
  if (!escalation) throw new Error("升级记录不存在");

  db.prepare(
    `UPDATE sla_escalations 
     SET resolution = ?, resolver_id = ?, resolver_name = ?, resolved_at = ?, is_resolved = 1 
     WHERE id = ?`
  ).run(resolution, resolverId, resolverName, now, id);

  db.prepare(
    `UPDATE sla_records SET status = 'resolved' WHERE id = ?`
  ).run(escalation.slaRecordId);

  return getSlaEscalationById(id)!;
}

export function startOrderSla(orderId: number): void {
  const order = getOrderById(orderId);
  if (!order) return;

  const config = getSlaConfig(order.type, order.urgency, order.buildingId);
  if (!config) return;

  createSlaRecord(
    orderId,
    order.orderNo,
    "response",
    order.createdAt,
    config.responseLimit
  );
}

export function transitionSlaStage(
  orderId: number,
  newStage: SlaStage,
  startTime: string
): void {
  const order = getOrderById(orderId);
  if (!order) return;

  const activeRecord = getActiveSlaRecord(orderId);
  if (activeRecord) {
    const actualMinutes = Math.round(
      (new Date(startTime).getTime() - new Date(activeRecord.startTime).getTime()) /
        60000
    );
    updateSlaRecordStatus(activeRecord.id, "resolved", {
      resolvedAt: startTime,
      actualMinutes,
    });
  }

  const config = getSlaConfig(order.type, order.urgency, order.buildingId);
  if (!config) return;

  let limitMinutes = config.responseLimit;
  if (newStage === "arrive") limitMinutes = config.arriveLimit;
  else if (newStage === "complete") limitMinutes = config.completeLimit;

  createSlaRecord(orderId, order.orderNo, newStage, startTime, limitMinutes);
}

export function checkAndUpdateSla(record: SlaRecord): SlaRecord {
  const order = getOrderById(record.orderId);
  let warningThreshold = 30;
  if (order) {
    const config = getSlaConfig(order.type, order.urgency, order.buildingId);
    if (config) {
      warningThreshold = config.warningThreshold;
    }
  }

  const timing = calculateSlaTiming(record, warningThreshold);
  const now = new Date().toISOString();

  if (timing.status === "warning" && record.status !== "warning") {
    updateSlaRecordStatus(record.id, "warning", { warningAt: now });

    const notifiedTo = ["service"];
    createSlaWarning(
      record.orderId,
      record.orderNo,
      record.id,
      record.stage,
      timing.remainingMinutes || 0,
      notifiedTo
    );
  } else if (timing.status === "overdue" && record.status !== "overdue") {
    updateSlaRecordStatus(record.id, "overdue", { overdueAt: now });
  }

  return getSlaRecordById(record.id)!;
}

export function escalateIfNeeded(record: SlaRecord): SlaEscalation | null {
  const order = getOrderById(record.orderId);
  let warningThreshold = 30;
  if (order) {
    const config = getSlaConfig(order.type, order.urgency, order.buildingId);
    if (config) {
      warningThreshold = config.warningThreshold;
    }
  }

  const timing = calculateSlaTiming(record, warningThreshold);
  if (timing.status !== "overdue" || !timing.overdueMinutes) return null;

  const activeEscalation = getActiveEscalation(record.orderId);
  if (activeEscalation) return null;

  let escalatedTo: "service_manager" | "repair_manager" = "service_manager";
  if (record.stage === "arrive" || record.stage === "complete") {
    escalatedTo = "repair_manager";
  }

  const targetRole = escalatedTo === "service_manager" ? "service" : "worker";
  const managers = db
    .prepare(
      `SELECT * FROM users 
       WHERE role = ? 
       ORDER BY id ASC LIMIT 1`
    )
    .all(targetRole) as any[];

  if (managers.length === 0) {
    const admins = db
      .prepare(
        `SELECT * FROM users 
         WHERE role = 'admin' 
         ORDER BY id ASC LIMIT 1`
      )
      .all() as any[];
    if (admins.length === 0) return null;
    const admin = admins[0];

    return createSlaEscalation({
      orderId: record.orderId,
      orderNo: record.orderNo,
      slaRecordId: record.id,
      triggerReason: `${SLA_STAGE_LABELS[record.stage]}阶段超时${timing.overdueMinutes}分钟`,
      triggerStage: record.stage,
      overdueMinutes: timing.overdueMinutes,
      escalatedTo,
      escalatedToUserId: admin.id,
      escalatedToUserName: admin.name,
      operatorId: admin.id,
      operatorName: "系统",
    });
  }

  const manager = managers[0];
  return createSlaEscalation({
    orderId: record.orderId,
    orderNo: record.orderNo,
    slaRecordId: record.id,
    triggerReason: `${SLA_STAGE_LABELS[record.stage]}阶段超时${timing.overdueMinutes}分钟`,
    triggerStage: record.stage,
    overdueMinutes: timing.overdueMinutes,
    escalatedTo,
    escalatedToUserId: manager.id,
    escalatedToUserName: manager.name,
    operatorId: manager.id,
    operatorName: "系统",
  });
}

export function processAllSla(): {
  warnings: number;
  overdues: number;
  escalations: number;
} {
  const activeRecords = db
    .prepare(
      `SELECT * FROM sla_records 
       WHERE status IN ('normal', 'warning') AND is_paused = 0`
    )
    .all()
    .map(parseSlaRecord);

  let warningCount = 0;
  let overdueCount = 0;
  let escalationCount = 0;

  for (const record of activeRecords) {
    const updated = checkAndUpdateSla(record);
    if (updated.status === "warning" && record.status !== "warning") {
      warningCount++;
    }
    if (updated.status === "overdue") {
      overdueCount++;
      const escalation = escalateIfNeeded(updated);
      if (escalation) escalationCount++;
    }
  }

  return { warnings: warningCount, overdues: overdueCount, escalations: escalationCount };
}

export function enrichOrderWithSla(order: WorkOrder): WorkOrderWithSla {
  const slaRecords = getSlaRecordsByOrder(order.id);
  const escalations = getSlaEscalationsByOrder(order.id);
  const activeRecord = getActiveSlaRecord(order.id);
  const lastEscalation = escalations[0] || null;

  const config = getSlaConfig(order.type, order.urgency, order.buildingId);
  const warningThreshold = config?.warningThreshold || 30;

  let currentSlaStatus: SlaStatus = "normal";
  let currentStage: SlaStage | null = null;
  let currentDeadline: string | null = null;
  let remainingMinutes: number | null = null;
  let overdueMinutes: number | null = null;

  if (activeRecord) {
    const timing = calculateSlaTiming(activeRecord, warningThreshold);
    currentSlaStatus = timing.status;
    currentStage = activeRecord.stage;
    currentDeadline = activeRecord.deadline;
    remainingMinutes = timing.remainingMinutes;
    overdueMinutes = timing.overdueMinutes;
  } else if (slaRecords.length > 0) {
    currentSlaStatus = "resolved";
  }

  if (lastEscalation && !lastEscalation.isResolved) {
    currentSlaStatus = "escalated";
  }

  return {
    ...order,
    slaRecords,
    escalations,
    currentSlaStatus,
    currentStage,
    currentDeadline,
    remainingMinutes,
    overdueMinutes,
    lastEscalation,
  };
}

export function getSlaDashboardStats(): SlaDashboardStats {
  processAllSla();

  const allOrders = listOrders();
  const ordersWithSla = allOrders.map(enrichOrderWithSla);

  const warningOrders = ordersWithSla.filter(
    (o) => o.currentSlaStatus === "warning"
  );
  const overdueOrders = ordersWithSla.filter(
    (o) => o.currentSlaStatus === "overdue"
  );
  const escalatedOrders = ordersWithSla.filter(
    (o) => o.currentSlaStatus === "escalated"
  );
  const resolvedOrders = ordersWithSla.filter(
    (o) => o.currentSlaStatus === "resolved"
  );

  return {
    warningCount: warningOrders.length,
    overdueCount: overdueOrders.length,
    escalatedCount: escalatedOrders.length,
    resolvedCount: resolvedOrders.length,
    warningOrders,
    overdueOrders,
    escalatedOrders,
    resolvedOrders,
  };
}

export function listOrdersWithSla(params?: {
  slaStatus?: SlaStatus;
  stage?: SlaStage;
}): WorkOrderWithSla[] {
  processAllSla();
  const orders = listOrders();
  let result = orders.map(enrichOrderWithSla);

  if (params?.slaStatus) {
    result = result.filter((o) => o.currentSlaStatus === params.slaStatus);
  }
  if (params?.stage) {
    result = result.filter((o) => o.currentStage === params.stage);
  }

  return result;
}

export function handleMaterialShortage(orderId: number): void {
  const activeRecord = getActiveSlaRecord(orderId);
  if (activeRecord && !activeRecord.isPaused) {
    pauseSlaRecord(activeRecord.id, "material_shortage");
  }
}

export function handleMaterialRestocked(orderId: number): void {
  const activeRecord = getActiveSlaRecord(orderId);
  if (activeRecord && activeRecord.isPaused) {
    resumeSlaRecord(activeRecord.id);
  }
}
