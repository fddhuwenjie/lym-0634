import { db } from "../db/database";
import {
  InspectionDevice,
  InspectionTask,
  InspectionTaskStatus,
  InspectionResult,
  HazardRecord,
  HazardStatus,
  HazardHistory,
  InspectionDashboardStats,
  HazardDashboardStats,
  DeviceType,
  InspectionFrequency,
  HazardSeverity,
  DEVICE_TYPE_LABELS,
  FREQUENCY_LABELS,
  HAZARD_SEVERITY_LABELS,
  HAZARD_STATUS_LABELS,
  TASK_STATUS_LABELS,
  INSPECTION_RESULT_LABELS,
  BUILDINGS,
} from "../../shared/types";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exportDir = path.resolve(__dirname, "../../data/exports");
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

function parseDevice(row: any): InspectionDevice {
  return {
    id: row.id,
    name: row.name,
    deviceType: row.device_type,
    buildingId: row.building_id,
    buildingName: row.building_name,
    floor: row.floor,
    responsiblePerson: row.responsible_person,
    responsiblePersonId: row.responsible_person_id,
    frequency: row.frequency,
    enabled: !!row.enabled,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseTask(row: any): InspectionTask {
  return {
    id: row.id,
    taskNo: row.task_no,
    deviceId: row.device_id,
    deviceName: row.device_name,
    deviceType: row.device_type,
    buildingId: row.building_id,
    buildingName: row.building_name,
    floor: row.floor,
    inspectorId: row.inspector_id,
    inspectorName: row.inspector_name,
    planTime: row.plan_time,
    actualTime: row.actual_time,
    result: row.result,
    photos: row.photos ? JSON.parse(row.photos) : [],
    remark: row.remark,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function parseHazard(row: any): HazardRecord {
  return {
    id: row.id,
    hazardNo: row.hazard_no,
    taskId: row.task_id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    deviceType: row.device_type,
    buildingId: row.building_id,
    buildingName: row.building_name,
    floor: row.floor,
    description: row.description,
    severity: row.severity,
    rectifyPerson: row.rectify_person,
    rectifyPersonId: row.rectify_person_id,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseHazardHistory(row: any): HazardHistory {
  return {
    id: row.id,
    hazardId: row.hazard_id,
    action: row.action,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    remark: row.remark,
    createdAt: row.created_at,
  };
}

export function listDevices(params?: {
  deviceType?: string;
  buildingId?: number;
  responsiblePersonId?: number;
  enabled?: boolean;
}): InspectionDevice[] {
  const conditions: string[] = [];
  const args: any[] = [];
  if (params?.deviceType) {
    conditions.push("device_type = ?");
    args.push(params.deviceType);
  }
  if (params?.buildingId) {
    conditions.push("building_id = ?");
    args.push(params.buildingId);
  }
  if (params?.responsiblePersonId) {
    conditions.push("responsible_person_id = ?");
    args.push(params.responsiblePersonId);
  }
  if (params?.enabled !== undefined) {
    conditions.push("enabled = ?");
    args.push(params.enabled ? 1 : 0);
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  return db
    .prepare(`SELECT * FROM inspection_devices ${where} ORDER BY id DESC`)
    .all(...args)
    .map(parseDevice);
}

export function getDeviceById(id: number): InspectionDevice | null {
  const row = db.prepare("SELECT * FROM inspection_devices WHERE id = ?").get(id) as any;
  return row ? parseDevice(row) : null;
}

export function createDevice(params: {
  name: string;
  deviceType: DeviceType;
  buildingId: number;
  buildingName: string;
  floor: string;
  responsiblePerson: string;
  responsiblePersonId?: number;
  frequency: InspectionFrequency;
  enabled?: boolean;
  remark?: string;
}): InspectionDevice {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO inspection_devices
       (name, device_type, building_id, building_name, floor, responsible_person, responsible_person_id, frequency, enabled, remark, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      params.name,
      params.deviceType,
      params.buildingId,
      params.buildingName,
      params.floor,
      params.responsiblePerson,
      params.responsiblePersonId || null,
      params.frequency,
      params.enabled !== undefined ? (params.enabled ? 1 : 0) : 1,
      params.remark || null,
      now,
      now
    );
  return getDeviceById(result.lastInsertRowid as number)!;
}

export function updateDevice(
  id: number,
  params: {
    name?: string;
    deviceType?: DeviceType;
    buildingId?: number;
    buildingName?: string;
    floor?: string;
    responsiblePerson?: string;
    responsiblePersonId?: number;
    frequency?: InspectionFrequency;
    enabled?: boolean;
    remark?: string;
  }
): InspectionDevice {
  const now = new Date().toISOString();
  const fields: string[] = [];
  const args: any[] = [];
  if (params.name !== undefined) { fields.push("name = ?"); args.push(params.name); }
  if (params.deviceType !== undefined) { fields.push("device_type = ?"); args.push(params.deviceType); }
  if (params.buildingId !== undefined) { fields.push("building_id = ?"); args.push(params.buildingId); }
  if (params.buildingName !== undefined) { fields.push("building_name = ?"); args.push(params.buildingName); }
  if (params.floor !== undefined) { fields.push("floor = ?"); args.push(params.floor); }
  if (params.responsiblePerson !== undefined) { fields.push("responsible_person = ?"); args.push(params.responsiblePerson); }
  if (params.responsiblePersonId !== undefined) { fields.push("responsible_person_id = ?"); args.push(params.responsiblePersonId); }
  if (params.frequency !== undefined) { fields.push("frequency = ?"); args.push(params.frequency); }
  if (params.enabled !== undefined) { fields.push("enabled = ?"); args.push(params.enabled ? 1 : 0); }
  if (params.remark !== undefined) { fields.push("remark = ?"); args.push(params.remark); }
  fields.push("updated_at = ?");
  args.push(now);
  args.push(id);
  db.prepare(`UPDATE inspection_devices SET ${fields.join(", ")} WHERE id = ?`).run(...args);
  return getDeviceById(id)!;
}

export function deleteDevice(id: number): void {
  db.prepare("DELETE FROM inspection_devices WHERE id = ?").run(id);
}

function generateTaskNo(): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `XJ${ts}${rand}`;
}

function generateHazardNo(): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `YH${ts}${rand}`;
}

export function createTask(params: {
  deviceId: number;
  inspectorId: number;
  inspectorName: string;
  planTime: string;
}): InspectionTask {
  const device = getDeviceById(params.deviceId);
  if (!device) throw new Error("设备不存在");
  const now = new Date().toISOString();
  const taskNo = generateTaskNo();
  db.prepare(
    `INSERT INTO inspection_tasks
     (task_no, device_id, device_name, device_type, building_id, building_name, floor, inspector_id, inspector_name, plan_time, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(
    taskNo,
    device.id,
    device.name,
    device.deviceType,
    device.buildingId,
    device.buildingName,
    device.floor,
    params.inspectorId,
    params.inspectorName,
    params.planTime,
    now
  );
  const row = db.prepare("SELECT * FROM inspection_tasks WHERE task_no = ?").get(taskNo) as any;
  return parseTask(row);
}

export function listTasks(params?: {
  deviceType?: string;
  buildingId?: number;
  inspectorId?: number;
  status?: InspectionTaskStatus;
  startDate?: string;
  endDate?: string;
}): InspectionTask[] {
  markOverdueTasks();
  const conditions: string[] = [];
  const args: any[] = [];
  if (params?.deviceType) {
    conditions.push("device_type = ?");
    args.push(params.deviceType);
  }
  if (params?.buildingId) {
    conditions.push("building_id = ?");
    args.push(params.buildingId);
  }
  if (params?.inspectorId) {
    conditions.push("inspector_id = ?");
    args.push(params.inspectorId);
  }
  if (params?.status) {
    conditions.push("status = ?");
    args.push(params.status);
  }
  if (params?.startDate) {
    conditions.push("plan_time >= ?");
    args.push(params.startDate);
  }
  if (params?.endDate) {
    conditions.push("plan_time <= ?");
    args.push(params.endDate + "T23:59:59");
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  return db
    .prepare(`SELECT * FROM inspection_tasks ${where} ORDER BY plan_time DESC`)
    .all(...args)
    .map(parseTask);
}

export function getTaskById(id: number): InspectionTask | null {
  const row = db.prepare("SELECT * FROM inspection_tasks WHERE id = ?").get(id) as any;
  return row ? parseTask(row) : null;
}

export function submitInspection(
  taskId: number,
  params: {
    result: InspectionResult;
    actualTime: string;
    photos?: string[];
    remark?: string;
  }
): { task: InspectionTask; hazard?: HazardRecord } {
  const task = getTaskById(taskId);
  if (!task) throw new Error("巡检任务不存在");
  if (task.status !== "pending") throw new Error("任务已处理");

  const now = new Date().toISOString();
  const status: InspectionTaskStatus =
    params.result === "normal" ? "completed" :
    params.result === "abnormal" ? "abnormal" :
    "skipped";

  db.prepare(
    `UPDATE inspection_tasks SET result = ?, actual_time = ?, photos = ?, remark = ?, status = ?, completed_at = ? WHERE id = ?`
  ).run(
    params.result,
    params.actualTime,
    JSON.stringify(params.photos || []),
    params.remark || null,
    status,
    now,
    taskId
  );

  let hazard: HazardRecord | undefined;
  if (params.result === "abnormal") {
    hazard = autoCreateHazard(taskId, params.remark || "巡检发现异常");
  }

  return { task: getTaskById(taskId)!, hazard };
}

function autoCreateHazard(taskId: number, description: string): HazardRecord {
  const task = getTaskById(taskId);
  if (!task) throw new Error("巡检任务不存在");

  const device = getDeviceById(task.deviceId);
  const now = new Date().toISOString();
  const hazardNo = generateHazardNo();
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO hazard_records
     (hazard_no, task_id, device_id, device_name, device_type, building_id, building_name, floor, description, severity, rectify_person, rectify_person_id, deadline, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'medium', ?, ?, ?, 'pending_rectify', ?, ?)`
  ).run(
    hazardNo,
    taskId,
    task.deviceId,
    task.deviceName,
    task.deviceType,
    task.buildingId,
    task.buildingName,
    task.floor,
    description,
    device?.responsiblePerson || "未知",
    device?.responsiblePersonId || 0,
    deadline,
    now,
    now
  );

  const row = db.prepare("SELECT * FROM hazard_records WHERE hazard_no = ?").get(hazardNo) as any;
  const hazard = parseHazard(row);

  addHazardHistory(hazard.id, "created", 0, "系统", `隐患自动创建：${description}`);

  return hazard;
}

export function markOverdueTasks(): number {
  const now = new Date().toISOString();
  const result = db.prepare(
    `UPDATE inspection_tasks SET status = 'overdue' WHERE status = 'pending' AND plan_time < ?`
  ).run(now);
  return result.changes;
}

export function getInspectionDashboard(): InspectionDashboardStats {
  markOverdueTasks();
  const pending = (db.prepare("SELECT COUNT(*) as cnt FROM inspection_tasks WHERE status = 'pending'").get() as any).cnt;
  const completed = (db.prepare("SELECT COUNT(*) as cnt FROM inspection_tasks WHERE status = 'completed'").get() as any).cnt;
  const abnormal = (db.prepare("SELECT COUNT(*) as cnt FROM inspection_tasks WHERE status = 'abnormal'").get() as any).cnt;
  const overdue = (db.prepare("SELECT COUNT(*) as cnt FROM inspection_tasks WHERE status = 'overdue'").get() as any).cnt;
  const skipped = (db.prepare("SELECT COUNT(*) as cnt FROM inspection_tasks WHERE status = 'skipped'").get() as any).cnt;
  return { pendingCount: pending, completedCount: completed, abnormalCount: abnormal, overdueCount: overdue, skippedCount: skipped };
}

export function listHazards(params?: {
  deviceType?: string;
  buildingId?: number;
  status?: HazardStatus;
  severity?: HazardSeverity;
  startDate?: string;
  endDate?: string;
}): HazardRecord[] {
  markOverdueHazards();
  const conditions: string[] = [];
  const args: any[] = [];
  if (params?.deviceType) {
    conditions.push("device_type = ?");
    args.push(params.deviceType);
  }
  if (params?.buildingId) {
    conditions.push("building_id = ?");
    args.push(params.buildingId);
  }
  if (params?.status) {
    conditions.push("status = ?");
    args.push(params.status);
  }
  if (params?.severity) {
    conditions.push("severity = ?");
    args.push(params.severity);
  }
  if (params?.startDate) {
    conditions.push("created_at >= ?");
    args.push(params.startDate);
  }
  if (params?.endDate) {
    conditions.push("created_at <= ?");
    args.push(params.endDate + "T23:59:59");
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  return db
    .prepare(`SELECT * FROM hazard_records ${where} ORDER BY created_at DESC`)
    .all(...args)
    .map(parseHazard);
}

export function getHazardById(id: number): HazardRecord | null {
  const row = db.prepare("SELECT * FROM hazard_records WHERE id = ?").get(id) as any;
  return row ? parseHazard(row) : null;
}

export function getHazardHistory(hazardId: number): HazardHistory[] {
  return db
    .prepare("SELECT * FROM hazard_history WHERE hazard_id = ? ORDER BY created_at ASC")
    .all(hazardId)
    .map(parseHazardHistory);
}

function addHazardHistory(hazardId: number, action: string, operatorId: number, operatorName: string, remark?: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO hazard_history (hazard_id, action, operator_id, operator_name, remark, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(hazardId, action, operatorId, operatorName, remark || null, now);
}

export function assignHazard(
  hazardId: number,
  params: { rectifyPerson: string; rectifyPersonId: number; deadline: string; severity?: HazardSeverity },
  operatorId: number,
  operatorName: string
): HazardRecord {
  const hazard = getHazardById(hazardId);
  if (!hazard) throw new Error("隐患记录不存在");
  if (hazard.status !== "pending_rectify") throw new Error("当前状态不允许指派");

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE hazard_records SET rectify_person = ?, rectify_person_id = ?, deadline = ?, severity = ?, updated_at = ? WHERE id = ?`
  ).run(params.rectifyPerson, params.rectifyPersonId, params.deadline, params.severity || hazard.severity, now, hazardId);

  addHazardHistory(hazardId, "assigned", operatorId, operatorName, `指派给 ${params.rectifyPerson}，整改期限 ${params.deadline}`);
  return getHazardById(hazardId)!;
}

export function startRectify(hazardId: number, operatorId: number, operatorName: string, remark?: string): HazardRecord {
  const hazard = getHazardById(hazardId);
  if (!hazard) throw new Error("隐患记录不存在");
  if (!["pending_rectify", "rejected"].includes(hazard.status)) throw new Error("当前状态不允许开始整改");

  const now = new Date().toISOString();
  db.prepare(`UPDATE hazard_records SET status = 'rectifying', updated_at = ? WHERE id = ?`).run(now, hazardId);
  addHazardHistory(hazardId, "rectify_start", operatorId, operatorName, remark || "开始整改");
  return getHazardById(hazardId)!;
}

export function submitRectify(hazardId: number, operatorId: number, operatorName: string, remark?: string): HazardRecord {
  const hazard = getHazardById(hazardId);
  if (!hazard) throw new Error("隐患记录不存在");
  if (hazard.status !== "rectifying") throw new Error("当前状态不允许提交整改");

  const now = new Date().toISOString();
  db.prepare(`UPDATE hazard_records SET status = 'pending_review', updated_at = ? WHERE id = ?`).run(now, hazardId);
  addHazardHistory(hazardId, "rectify_submit", operatorId, operatorName, remark || "提交整改完成，待复查");
  return getHazardById(hazardId)!;
}

export function reviewHazard(hazardId: number, operatorId: number, operatorName: string, passed: boolean, remark?: string): HazardRecord {
  const hazard = getHazardById(hazardId);
  if (!hazard) throw new Error("隐患记录不存在");
  if (hazard.status !== "pending_review") throw new Error("当前状态不允许复查");

  const now = new Date().toISOString();
  if (passed) {
    db.prepare(`UPDATE hazard_records SET status = 'closed', updated_at = ? WHERE id = ?`).run(now, hazardId);
    addHazardHistory(hazardId, "review_pass", operatorId, operatorName, remark || "复查通过，隐患关闭");
  } else {
    db.prepare(`UPDATE hazard_records SET status = 'rejected', updated_at = ? WHERE id = ?`).run(now, hazardId);
    addHazardHistory(hazardId, "review_reject", operatorId, operatorName, remark || "复查不通过，驳回重新整改");
  }
  return getHazardById(hazardId)!;
}

export function closeHazard(hazardId: number, operatorId: number, operatorName: string, remark?: string): HazardRecord {
  const hazard = getHazardById(hazardId);
  if (!hazard) throw new Error("隐患记录不存在");

  const now = new Date().toISOString();
  db.prepare(`UPDATE hazard_records SET status = 'closed', updated_at = ? WHERE id = ?`).run(now, hazardId);
  addHazardHistory(hazardId, "closed", operatorId, operatorName, remark || "手动关闭");
  return getHazardById(hazardId)!;
}

export function markOverdueHazards(): number {
  const now = new Date().toISOString();
  const result = db.prepare(
    `UPDATE hazard_records SET status = 'rejected' WHERE status IN ('pending_rectify', 'rectifying') AND deadline < ?`
  ).run(now);
  return result.changes;
}

export function getHazardDashboard(): HazardDashboardStats {
  markOverdueHazards();
  const pendingRectify = (db.prepare("SELECT COUNT(*) as cnt FROM hazard_records WHERE status = 'pending_rectify'").get() as any).cnt;
  const rectifying = (db.prepare("SELECT COUNT(*) as cnt FROM hazard_records WHERE status = 'rectifying'").get() as any).cnt;
  const pendingReview = (db.prepare("SELECT COUNT(*) as cnt FROM hazard_records WHERE status = 'pending_review'").get() as any).cnt;
  const closed = (db.prepare("SELECT COUNT(*) as cnt FROM hazard_records WHERE status = 'closed'").get() as any).cnt;
  const rejected = (db.prepare("SELECT COUNT(*) as cnt FROM hazard_records WHERE status = 'rejected'").get() as any).cnt;
  const now = new Date().toISOString();
  const overdue = (db.prepare("SELECT COUNT(*) as cnt FROM hazard_records WHERE status NOT IN ('closed') AND deadline < ?").get(now) as any).cnt;
  return { pendingRectifyCount: pendingRectify, rectifyingCount: rectifying, pendingReviewCount: pendingReview, closedCount: closed, overdueCount: overdue, rejectedCount: rejected };
}

export function generateAutoTasks(): { created: number; skipped: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = today.toISOString();
  let created = 0;
  let skipped = 0;

  const devices = db.prepare("SELECT * FROM inspection_devices WHERE enabled = 1").all() as any[];

  for (const device of devices) {
    const freq = device.frequency as InspectionFrequency;
    let shouldGenerate = false;

    if (freq === "daily") {
      shouldGenerate = true;
    } else if (freq === "weekly") {
      shouldGenerate = today.getDay() === 1;
    } else if (freq === "monthly") {
      shouldGenerate = today.getDate() === 1;
    }

    if (!shouldGenerate) {
      skipped++;
      continue;
    }

    const existing = db.prepare(
      `SELECT COUNT(*) as cnt FROM inspection_tasks WHERE device_id = ? AND plan_time >= ? AND plan_time < ?`
    ).get(device.id, todayStr, new Date(today.getTime() + 86400000).toISOString()) as any;

    if (existing.cnt > 0) {
      skipped++;
      continue;
    }

    const inspector = device.responsible_person_id
      ? { id: device.responsible_person_id, name: device.responsible_person }
      : { id: 0, name: device.responsible_person };

    createTask({
      deviceId: device.id,
      inspectorId: inspector.id,
      inspectorName: inspector.name,
      planTime: todayStr,
    });
    created++;
  }

  return { created, skipped };
}

function escapeCsv(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportInspectionTasks(filters: Record<string, any>, createdBy: number, createdByName: string): { id: number; fileName: string } {
  const tasks = listTasks({
    deviceType: filters.deviceType,
    buildingId: filters.buildingId,
    inspectorId: filters.inspectorId,
    status: filters.status,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const fileName = `巡检任务_导出_${ts}.csv`;
  const filePath = path.join(exportDir, fileName);

  let csv = "任务编号,设备名称,设备类型,楼栋,楼层,巡检人,计划时间,实际时间,巡检结果,任务状态,备注,创建时间,完成时间\n";
  for (const t of tasks) {
    csv += [
      t.taskNo,
      t.deviceName,
      DEVICE_TYPE_LABELS[t.deviceType] || t.deviceType,
      t.buildingName,
      t.floor,
      t.inspectorName,
      t.planTime,
      t.actualTime || "",
      t.result ? INSPECTION_RESULT_LABELS[t.result] || t.result : "",
      TASK_STATUS_LABELS[t.status] || t.status,
      t.remark || "",
      t.createdAt,
      t.completedAt || "",
    ].map(escapeCsv).join(",") + "\n";
  }

  fs.writeFileSync(filePath, "\ufeff" + csv, "utf-8");

  const result = db.prepare(
    `INSERT INTO export_history (type, file_name, filters, status, created_by, created_by_name, created_at) VALUES (?, ?, ?, 'done', ?, ?, ?)`
  ).run("inspection_tasks", fileName, JSON.stringify(filters), createdBy, createdByName, now.toISOString());

  return { id: result.lastInsertRowid as number, fileName };
}

export function exportHazardRecords(filters: Record<string, any>, createdBy: number, createdByName: string): { id: number; fileName: string } {
  const hazards = listHazards({
    deviceType: filters.deviceType,
    buildingId: filters.buildingId,
    status: filters.status,
    severity: filters.severity,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const fileName = `隐患明细_导出_${ts}.csv`;
  const filePath = path.join(exportDir, fileName);

  let csv = "隐患编号,设备名称,设备类型,楼栋,楼层,异常描述,严重程度,整改责任人,整改期限,当前状态,创建时间,更新时间\n";
  for (const h of hazards) {
    csv += [
      h.hazardNo,
      h.deviceName,
      DEVICE_TYPE_LABELS[h.deviceType] || h.deviceType,
      h.buildingName,
      h.floor,
      h.description,
      HAZARD_SEVERITY_LABELS[h.severity] || h.severity,
      h.rectifyPerson,
      h.deadline,
      HAZARD_STATUS_LABELS[h.status] || h.status,
      h.createdAt,
      h.updatedAt,
    ].map(escapeCsv).join(",") + "\n";
  }

  fs.writeFileSync(filePath, "\ufeff" + csv, "utf-8");

  const result = db.prepare(
    `INSERT INTO export_history (type, file_name, filters, status, created_by, created_by_name, created_at) VALUES (?, ?, ?, 'done', ?, ?, ?)`
  ).run("hazard_records", fileName, JSON.stringify(filters), createdBy, createdByName, now.toISOString());

  return { id: result.lastInsertRowid as number, fileName };
}
