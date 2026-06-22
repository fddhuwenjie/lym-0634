import { Router } from "express";
import {
  listDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  listTasks,
  getTaskById,
  createTask,
  submitInspection,
  getInspectionDashboard,
  listHazards,
  getHazardById,
  getHazardHistory,
  assignHazard,
  startRectify,
  submitRectify,
  reviewHazard,
  closeHazard,
  getHazardDashboard,
  generateAutoTasks,
  exportInspectionTasks,
  exportHazardRecords,
} from "../services/inspectionService";

const router = Router();

router.get("/devices", (req, res) => {
  const params: any = {};
  if (req.query.deviceType) params.deviceType = req.query.deviceType;
  if (req.query.buildingId) params.buildingId = Number(req.query.buildingId);
  if (req.query.responsiblePersonId) params.responsiblePersonId = Number(req.query.responsiblePersonId);
  if (req.query.enabled !== undefined) params.enabled = req.query.enabled === "1" || req.query.enabled === "true";
  res.json({ devices: listDevices(params) });
});

router.get("/devices/:id", (req, res) => {
  const device = listDevices().find((d) => d.id === Number(req.params.id));
  if (!device) return res.status(404).json({ error: "设备不存在" });
  res.json({ device });
});

router.post("/devices", (req, res) => {
  try {
    const device = createDevice({
      name: req.body.name,
      deviceType: req.body.deviceType,
      buildingId: Number(req.body.buildingId),
      buildingName: req.body.buildingName,
      floor: req.body.floor,
      responsiblePerson: req.body.responsiblePerson,
      responsiblePersonId: req.body.responsiblePersonId ? Number(req.body.responsiblePersonId) : undefined,
      frequency: req.body.frequency,
      enabled: req.body.enabled,
      remark: req.body.remark,
    });
    res.json({ device });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/devices/:id", (req, res) => {
  try {
    const device = updateDevice(Number(req.params.id), {
      name: req.body.name,
      deviceType: req.body.deviceType,
      buildingId: req.body.buildingId ? Number(req.body.buildingId) : undefined,
      buildingName: req.body.buildingName,
      floor: req.body.floor,
      responsiblePerson: req.body.responsiblePerson,
      responsiblePersonId: req.body.responsiblePersonId,
      frequency: req.body.frequency,
      enabled: req.body.enabled,
      remark: req.body.remark,
    });
    res.json({ device });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/devices/:id", (req, res) => {
  try {
    deleteDevice(Number(req.params.id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/tasks", (req, res) => {
  const params: any = {};
  if (req.query.deviceType) params.deviceType = req.query.deviceType;
  if (req.query.buildingId) params.buildingId = Number(req.query.buildingId);
  if (req.query.inspectorId) params.inspectorId = Number(req.query.inspectorId);
  if (req.query.status) params.status = req.query.status;
  if (req.query.startDate) params.startDate = String(req.query.startDate);
  if (req.query.endDate) params.endDate = String(req.query.endDate);
  res.json({ tasks: listTasks(params) });
});

router.get("/tasks/dashboard", (_req, res) => {
  res.json({ stats: getInspectionDashboard() });
});

router.get("/tasks/:id", (req, res) => {
  const task = getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ error: "巡检任务不存在" });
  res.json({ task });
});

router.post("/tasks", (req, res) => {
  try {
    const task = createTask({
      deviceId: Number(req.body.deviceId),
      inspectorId: Number(req.body.inspectorId),
      inspectorName: req.body.inspectorName,
      planTime: req.body.planTime,
    });
    res.json({ task });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/tasks/:id/submit", (req, res) => {
  try {
    const result = submitInspection(Number(req.params.id), {
      result: req.body.result,
      actualTime: req.body.actualTime,
      photos: req.body.photos,
      remark: req.body.remark,
    });
    res.json({ task: result.task, hazard: result.hazard });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/tasks/generate", (_req, res) => {
  const result = generateAutoTasks();
  res.json(result);
});

router.get("/hazards", (req, res) => {
  const params: any = {};
  if (req.query.deviceType) params.deviceType = req.query.deviceType;
  if (req.query.buildingId) params.buildingId = Number(req.query.buildingId);
  if (req.query.status) params.status = req.query.status;
  if (req.query.severity) params.severity = req.query.severity;
  if (req.query.startDate) params.startDate = String(req.query.startDate);
  if (req.query.endDate) params.endDate = String(req.query.endDate);
  res.json({ hazards: listHazards(params) });
});

router.get("/hazards/dashboard", (_req, res) => {
  res.json({ stats: getHazardDashboard() });
});

router.get("/hazards/:id", (req, res) => {
  const hazard = getHazardById(Number(req.params.id));
  if (!hazard) return res.status(404).json({ error: "隐患记录不存在" });
  res.json({ hazard });
});

router.get("/hazards/:id/history", (req, res) => {
  res.json({ history: getHazardHistory(Number(req.params.id)) });
});

router.post("/hazards/:id/assign", (req, res) => {
  try {
    const hazard = assignHazard(
      Number(req.params.id),
      {
        rectifyPerson: req.body.rectifyPerson,
        rectifyPersonId: Number(req.body.rectifyPersonId),
        deadline: req.body.deadline,
        severity: req.body.severity,
      },
      Number(req.body.operatorId),
      req.body.operatorName
    );
    res.json({ hazard });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/hazards/:id/start-rectify", (req, res) => {
  try {
    const hazard = startRectify(
      Number(req.params.id),
      Number(req.body.operatorId),
      req.body.operatorName,
      req.body.remark
    );
    res.json({ hazard });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/hazards/:id/submit-rectify", (req, res) => {
  try {
    const hazard = submitRectify(
      Number(req.params.id),
      Number(req.body.operatorId),
      req.body.operatorName,
      req.body.remark
    );
    res.json({ hazard });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/hazards/:id/review", (req, res) => {
  try {
    const hazard = reviewHazard(
      Number(req.params.id),
      Number(req.body.operatorId),
      req.body.operatorName,
      req.body.passed === true || req.body.passed === "true",
      req.body.remark
    );
    res.json({ hazard });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/hazards/:id/close", (req, res) => {
  try {
    const hazard = closeHazard(
      Number(req.params.id),
      Number(req.body.operatorId),
      req.body.operatorName,
      req.body.remark
    );
    res.json({ hazard });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/export/tasks", (req, res) => {
  try {
    const result = exportInspectionTasks(
      req.body.filters || {},
      Number(req.body.createdBy),
      req.body.createdByName
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/export/hazards", (req, res) => {
  try {
    const result = exportHazardRecords(
      req.body.filters || {},
      Number(req.body.createdBy),
      req.body.createdByName
    );
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
