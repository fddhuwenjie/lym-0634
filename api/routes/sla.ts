import { Router } from "express";
import {
  listSlaConfigs,
  createSlaConfig,
  updateSlaConfig,
  deleteSlaConfig,
  getSlaDashboardStats,
  getSlaRecordsByOrder,
  getSlaEscalationsByOrder,
  handleEscalation,
  resolveEscalation,
  getSlaWarningsByOrder,
  listOrdersWithSla,
  processAllSla,
  handleMaterialShortage,
  handleMaterialRestocked,
  checkMaterialRequirements,
  tryResumeSlaForMaterial,
  enrichOrderWithSla,
  getSlaConfig,
} from "../services/slaService";
import { getOrderById } from "../services/orderService";

const router = Router();

router.get("/configs", (req, res) => {
  const params: any = {};
  if (req.query.repairType) params.repairType = req.query.repairType;
  if (req.query.urgency) params.urgency = req.query.urgency;
  if (req.query.buildingId !== undefined) {
    params.buildingId = req.query.buildingId
      ? Number(req.query.buildingId)
      : null;
  }
  const configs = listSlaConfigs(params);
  res.json({ configs });
});

router.post("/configs", (req, res) => {
  try {
    const config = createSlaConfig({
      repairType: req.body.repairType,
      urgency: req.body.urgency,
      buildingId: req.body.buildingId,
      buildingName: req.body.buildingName,
      responseLimit: Number(req.body.responseLimit),
      arriveLimit: Number(req.body.arriveLimit),
      completeLimit: Number(req.body.completeLimit),
      warningThreshold: Number(req.body.warningThreshold),
    });
    res.json({ config });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/configs/:id", (req, res) => {
  try {
    const config = updateSlaConfig(Number(req.params.id), {
      responseLimit: req.body.responseLimit
        ? Number(req.body.responseLimit)
        : undefined,
      arriveLimit: req.body.arriveLimit
        ? Number(req.body.arriveLimit)
        : undefined,
      completeLimit: req.body.completeLimit
        ? Number(req.body.completeLimit)
        : undefined,
      warningThreshold: req.body.warningThreshold
        ? Number(req.body.warningThreshold)
        : undefined,
    });
    res.json({ config });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/configs/:id", (req, res) => {
  try {
    deleteSlaConfig(Number(req.params.id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/config/match", (req, res) => {
  const { repairType, urgency, buildingId } = req.query;
  const config = getSlaConfig(
    String(repairType),
    String(urgency),
    buildingId ? Number(buildingId) : undefined
  );
  res.json({ config });
});

router.get("/dashboard", (_req, res) => {
  const stats = getSlaDashboardStats();
  res.json({ stats });
});

router.get("/process", (_req, res) => {
  const result = processAllSla();
  res.json({ result });
});

router.get("/orders", (req, res) => {
  const params: any = {};
  if (req.query.slaStatus) params.slaStatus = req.query.slaStatus;
  if (req.query.stage) params.stage = req.query.stage;
  const orders = listOrdersWithSla(params);
  res.json({ orders });
});

router.get("/orders/:id", (req, res) => {
  const order = getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "工单不存在" });
  const orderWithSla = enrichOrderWithSla(order);
  const slaRecords = getSlaRecordsByOrder(order.id);
  const escalations = getSlaEscalationsByOrder(order.id);
  const warnings = getSlaWarningsByOrder(order.id);
  res.json({ order: orderWithSla, slaRecords, escalations, warnings });
});

router.get("/orders/:id/records", (req, res) => {
  const records = getSlaRecordsByOrder(Number(req.params.id));
  res.json({ records });
});

router.get("/orders/:id/escalations", (req, res) => {
  const escalations = getSlaEscalationsByOrder(Number(req.params.id));
  res.json({ escalations });
});

router.get("/orders/:id/warnings", (req, res) => {
  const warnings = getSlaWarningsByOrder(Number(req.params.id));
  res.json({ warnings });
});

router.post("/escalations/:id/handle", (req, res) => {
  try {
    const { handlerId, handlerName, handlerRemark } = req.body;
    const escalation = handleEscalation(
      Number(req.params.id),
      Number(handlerId),
      handlerName,
      handlerRemark
    );
    res.json({ escalation });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/escalations/:id/resolve", (req, res) => {
  try {
    const { resolution, resolverId, resolverName } = req.body;
    const escalation = resolveEscalation(
      Number(req.params.id),
      resolution,
      Number(resolverId),
      resolverName
    );
    res.json({ escalation });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/orders/:id/material-shortage", (req, res) => {
  try {
    const { pendingMaterials } = req.body;
    if (!pendingMaterials || !Array.isArray(pendingMaterials)) {
      throw new Error("缺少 pendingMaterials 参数");
    }
    const result = handleMaterialShortage(Number(req.params.id), pendingMaterials);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/orders/:id/material-restocked", (req, res) => {
  try {
    const resumed = handleMaterialRestocked(Number(req.params.id));
    res.json({ success: true, resumed });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/orders/:id/material-check", (req, res) => {
  try {
    const satisfied = checkMaterialRequirements(Number(req.params.id));
    res.json({ success: true, satisfied });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/materials/:id/try-resume", (req, res) => {
  try {
    const result = tryResumeSlaForMaterial(Number(req.params.id));
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
