export type WorkOrderStatus =
  | "pending"
  | "dispatched"
  | "processing"
  | "pending_evaluation"
  | "closed";

export type UrgencyLevel = "low" | "medium" | "high" | "urgent";

export type RepairType =
  | "plumbing"
  | "electrical"
  | "structural"
  | "appliance"
  | "other";

export type UserRole = "resident" | "service" | "worker" | "admin";

export interface User {
  id: number;
  name: string;
  role: UserRole;
  phone?: string;
  buildingIds?: number[];
  roomNumber?: string;
}

export interface Building {
  id: number;
  name: string;
}

export interface WorkOrder {
  id: number;
  orderNo: string;
  residentId: number;
  residentName: string;
  buildingId: number;
  buildingName: string;
  unitNumber: string;
  roomNumber: string;
  type: RepairType;
  urgency: UrgencyLevel;
  description: string;
  images: string[];
  status: WorkOrderStatus;
  workerId?: number;
  workerName?: string;
  dispatchRemark?: string;
  arriveTime?: string;
  processRemark?: string;
  completeRemark?: string;
  completeImages: string[];
  createdAt: string;
  dispatchedAt?: string;
  completedAt?: string;
  closedAt?: string;
  isOverdue: boolean;
  isRework: boolean;
  reworkCount: number;
  abnormalReason?: string;
}

export interface DispatchLog {
  id: number;
  orderId: number;
  fromWorkerId?: number;
  fromWorkerName?: string;
  toWorkerId: number;
  toWorkerName: string;
  operatorId: number;
  operatorName: string;
  remark: string;
  createdAt: string;
}

export interface Material {
  id: number;
  name: string;
  unit: string;
  stock: number;
  warningThreshold: number;
  price: number;
}

export type MaterialTransactionType =
  | "use"
  | "stock_in"
  | "return"
  | "adjust";

export interface MaterialTransaction {
  id: number;
  materialId: number;
  materialName: string;
  orderId?: number;
  orderNo?: string;
  type: MaterialTransactionType;
  quantity: number;
  beforeStock: number;
  afterStock: number;
  operatorId: number;
  operatorName: string;
  remark: string;
  createdAt: string;
}

export interface Evaluation {
  id: number;
  orderId: number;
  orderNo: string;
  residentId: number;
  residentName: string;
  workerId?: number;
  workerName?: string;
  rating: number;
  content: string;
  createdAt: string;
  isLocked: boolean;
}

export interface ExportRecord {
  id: number;
  type: "quality" | "material" | "evaluation" | "inspection_tasks" | "hazard_records";
  fileName: string;
  filters: Record<string, any>;
  status: "processing" | "done";
  createdBy: number;
  createdByName: string;
  createdAt: string;
}

export interface SlaConfig {
  id: number;
  repairType: RepairType;
  urgency: UrgencyLevel;
  buildingId: number;
  buildingName: string | null;
  responseLimit: number;
  arriveLimit: number;
  completeLimit: number;
  warningThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export type SlaStatus = "normal" | "warning" | "overdue" | "escalated" | "resolved";
export type SlaStage = "response" | "arrive" | "complete";
export type SlaPauseReason = "material_shortage" | "rework" | "redispatch" | "other";

export interface PendingMaterial {
  materialId: number;
  materialName: string;
  requiredQuantity: number;
  currentStock: number;
}

export interface SlaRecord {
  id: number;
  orderId: number;
  orderNo: string;
  stage: SlaStage;
  status: SlaStatus;
  startTime: string;
  deadline: string;
  limitMinutes: number;
  warningAt?: string;
  overdueAt?: string;
  isPaused: boolean;
  pauseReason?: SlaPauseReason;
  pausedAt?: string;
  resumedAt?: string;
  pauseMinutes: number;
  actualMinutes?: number;
  resolvedAt?: string;
  pendingMaterials: PendingMaterial[];
  createdAt: string;
}

export interface SlaEscalation {
  id: number;
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
  handlerRemark?: string;
  handlerId?: number;
  handlerName?: string;
  handledAt?: string;
  resolution?: string;
  resolverId?: number;
  resolverName?: string;
  resolvedAt?: string;
  isResolved: boolean;
  createdAt: string;
}

export interface SlaWarning {
  id: number;
  orderId: number;
  orderNo: string;
  slaRecordId: number;
  stage: SlaStage;
  remainingMinutes: number;
  notifiedTo: string[];
  createdAt: string;
}

export interface SlaDashboardStats {
  warningCount: number;
  overdueCount: number;
  escalatedCount: number;
  resolvedCount: number;
  warningOrders: WorkOrderWithSla[];
  overdueOrders: WorkOrderWithSla[];
  escalatedOrders: WorkOrderWithSla[];
  resolvedOrders: WorkOrderWithSla[];
}

export interface WorkOrderWithSla extends WorkOrder {
  slaRecords: SlaRecord[];
  escalations: SlaEscalation[];
  currentSlaStatus: SlaStatus;
  currentStage: SlaStage | null;
  currentDeadline: string | null;
  remainingMinutes: number | null;
  overdueMinutes: number | null;
  lastEscalation: SlaEscalation | null;
}

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  normal: "正常",
  warning: "预警",
  overdue: "已超时",
  escalated: "已升级",
  resolved: "已解除",
};

export const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
  normal: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  escalated: "bg-purple-100 text-purple-700",
  resolved: "bg-slate-100 text-slate-700",
};

export const SLA_STAGE_LABELS: Record<SlaStage, string> = {
  response: "响应",
  arrive: "到场",
  complete: "完工",
};

export const SLA_PAUSE_REASON_LABELS: Record<SlaPauseReason, string> = {
  material_shortage: "材料缺货",
  rework: "返工",
  redispatch: "改派",
  other: "其他",
};

export const ESCALATION_TARGET_LABELS: Record<string, string> = {
  service_manager: "客服主管",
  repair_manager: "维修主管",
};

export interface MaterialUsage {
  materialId: number;
  quantity: number;
}

export interface StatsData {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  avgProcessMinutes: number;
  ordersByBuilding: { name: string; value: number }[];
  ordersByType: { name: string; value: number }[];
  ordersByMonth: { name: string; value: number }[];
  overdueOrders: number;
  avgRating: number;
  totalEvaluations: number;
}

export const REPAIR_TYPE_LABELS: Record<RepairType, string> = {
  plumbing: "水暖维修",
  electrical: "电气维修",
  structural: "土建维修",
  appliance: "家电维修",
  other: "其他维修",
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: "一般",
  medium: "紧急",
  high: "高紧急",
  urgent: "特急",
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: "待受理",
  dispatched: "已派单",
  processing: "处理中",
  pending_evaluation: "待评价",
  closed: "已关闭",
};

export const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  dispatched: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  pending_evaluation: "bg-purple-50 text-purple-700 border-purple-200",
  closed: "bg-green-50 text-green-700 border-green-200",
};

export const TRANSACTION_TYPE_LABELS: Record<MaterialTransactionType, string> = {
  use: "使用扣减",
  stock_in: "入库",
  return: "退库",
  adjust: "库存调整",
};

export const TRANSACTION_TYPE_COLORS: Record<MaterialTransactionType, string> = {
  use: "text-red-600",
  stock_in: "text-green-600",
  return: "text-blue-600",
  adjust: "text-slate-600",
};

export const BUILDINGS: Building[] = [
  { id: 1, name: "1号楼" },
  { id: 2, name: "2号楼" },
  { id: 3, name: "3号楼" },
  { id: 4, name: "4号楼" },
  { id: 5, name: "5号楼" },
];

export type DeviceType = "electrical" | "plumbing" | "hvac" | "fire" | "elevator" | "monitor" | "access" | "other";
export type InspectionFrequency = "daily" | "weekly" | "monthly";
export type InspectionTaskStatus = "pending" | "completed" | "abnormal" | "skipped" | "overdue";
export type InspectionResult = "normal" | "abnormal" | "skipped";
export type HazardSeverity = "low" | "medium" | "high" | "critical";
export type HazardStatus = "pending_rectify" | "rectifying" | "pending_review" | "closed" | "rejected";

export interface InspectionDevice {
  id: number;
  name: string;
  deviceType: DeviceType;
  buildingId: number;
  buildingName: string;
  floor: string;
  responsiblePerson: string;
  responsiblePersonId?: number;
  frequency: InspectionFrequency;
  enabled: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionTask {
  id: number;
  taskNo: string;
  deviceId: number;
  deviceName: string;
  deviceType: DeviceType;
  buildingId: number;
  buildingName: string;
  floor: string;
  inspectorId: number;
  inspectorName: string;
  planTime: string;
  actualTime?: string;
  result?: InspectionResult;
  photos: string[];
  remark?: string;
  status: InspectionTaskStatus;
  createdAt: string;
  completedAt?: string;
}

export interface HazardRecord {
  id: number;
  hazardNo: string;
  taskId: number;
  deviceId: number;
  deviceName: string;
  deviceType: DeviceType;
  buildingId: number;
  buildingName: string;
  floor: string;
  description: string;
  severity: HazardSeverity;
  rectifyPerson: string;
  rectifyPersonId: number;
  deadline: string;
  status: HazardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HazardHistory {
  id: number;
  hazardId: number;
  action: string;
  operatorId: number;
  operatorName: string;
  remark?: string;
  createdAt: string;
}

export interface InspectionDashboardStats {
  pendingCount: number;
  completedCount: number;
  abnormalCount: number;
  overdueCount: number;
  skippedCount: number;
}

export interface HazardDashboardStats {
  pendingRectifyCount: number;
  rectifyingCount: number;
  pendingReviewCount: number;
  closedCount: number;
  overdueCount: number;
  rejectedCount: number;
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  electrical: "电气设备",
  plumbing: "给排水设备",
  hvac: "暖通空调",
  fire: "消防设备",
  elevator: "电梯设备",
  monitor: "监控设备",
  access: "门禁设备",
  other: "其他设备",
};

export const DEVICE_TYPE_COLORS: Record<DeviceType, string> = {
  electrical: "bg-amber-100 text-amber-700",
  plumbing: "bg-blue-100 text-blue-700",
  hvac: "bg-cyan-100 text-cyan-700",
  fire: "bg-red-100 text-red-700",
  elevator: "bg-purple-100 text-purple-700",
  monitor: "bg-indigo-100 text-indigo-700",
  access: "bg-teal-100 text-teal-700",
  other: "bg-slate-100 text-slate-700",
};

export const FREQUENCY_LABELS: Record<InspectionFrequency, string> = {
  daily: "每日",
  weekly: "每周",
  monthly: "每月",
};

export const FREQUENCY_COLORS: Record<InspectionFrequency, string> = {
  daily: "bg-orange-100 text-orange-700",
  weekly: "bg-blue-100 text-blue-700",
  monthly: "bg-green-100 text-green-700",
};

export const TASK_STATUS_LABELS: Record<InspectionTaskStatus, string> = {
  pending: "待巡检",
  completed: "已完成",
  abnormal: "异常",
  skipped: "无法巡检",
  overdue: "逾期",
};

export const TASK_STATUS_COLORS: Record<InspectionTaskStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  completed: "bg-green-100 text-green-700",
  abnormal: "bg-red-100 text-red-700",
  skipped: "bg-amber-100 text-amber-700",
  overdue: "bg-purple-100 text-purple-700",
};

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, string> = {
  normal: "正常",
  abnormal: "异常",
  skipped: "无法巡检",
};

export const INSPECTION_RESULT_COLORS: Record<InspectionResult, string> = {
  normal: "bg-green-100 text-green-700",
  abnormal: "bg-red-100 text-red-700",
  skipped: "bg-amber-100 text-amber-700",
};

export const HAZARD_SEVERITY_LABELS: Record<HazardSeverity, string> = {
  low: "一般",
  medium: "中等",
  high: "严重",
  critical: "紧急",
};

export const HAZARD_SEVERITY_COLORS: Record<HazardSeverity, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export const HAZARD_STATUS_LABELS: Record<HazardStatus, string> = {
  pending_rectify: "待整改",
  rectifying: "整改中",
  pending_review: "待复查",
  closed: "已关闭",
  rejected: "驳回重新整改",
};

export const HAZARD_STATUS_COLORS: Record<HazardStatus, string> = {
  pending_rectify: "bg-red-100 text-red-700",
  rectifying: "bg-amber-100 text-amber-700",
  pending_review: "bg-blue-100 text-blue-700",
  closed: "bg-green-100 text-green-700",
  rejected: "bg-purple-100 text-purple-700",
};
