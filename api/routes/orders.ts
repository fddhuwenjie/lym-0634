import { Router } from "express";
import {
  createOrder,
  listOrders,
  getOrderById,
  dispatchOrder,
  listDispatchLogs,
  arriveAtSite,
  updateProcess,
  completeOrder,
  reworkOrder,
  evaluateOrder,
  getOrderMaterials,
  getEvaluationByOrder,
  checkWorkerArea,
} from "../services/orderService";
import { checkWorkerArea as _cwa } from "../services/orderService";

const router = Router();

router.post("/", (req, res) => {
  try {
    const order = createOrder(req.body);
    res.json({ order });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/", (req, res) => {
  const params: any = {};
  if (req.query.status) params.status = req.query.status;
  if (req.query.residentId) params.residentId = Number(req.query.residentId);
  if (req.query.workerId) params.workerId = Number(req.query.workerId);
  if (req.query.buildingId) params.buildingId = Number(req.query.buildingId);
  if (req.query.type) params.type = req.query.type;
  const orders = listOrders(params);
  res.json({ orders });
});

router.get("/:id", (req, res) => {
  const order = getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "工单不存在" });
  const dispatchLogs = listDispatchLogs(order.id);
  const materials = getOrderMaterials(order.id);
  const evaluation = getEvaluationByOrder(order.id);
  res.json({ order, dispatchLogs, materials, evaluation });
});

router.post("/:id/dispatch", (req, res) => {
  try {
    const { workerId, operatorId, operatorName, remark, isRedispatch } = req.body;
    const order = dispatchOrder(
      Number(req.params.id),
      workerId,
      operatorId,
      operatorName,
      remark,
      isRedispatch
    );
    res.json({ order });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id/arrive", (req, res) => {
  try {
    const { workerId } = req.body;
    const order = arriveAtSite(Number(req.params.id), workerId);
    res.json({ order });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id/process", (req, res) => {
  try {
    const { workerId, processRemark } = req.body;
    const order = updateProcess(
      Number(req.params.id),
      workerId,
      processRemark || ""
    );
    res.json({ order });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/complete", (req, res) => {
  try {
    const order = completeOrder({
      orderId: Number(req.params.id),
      workerId: req.body.workerId,
      completeRemark: req.body.completeRemark || "",
      completeImages: req.body.completeImages || [],
      materialUsages: req.body.materialUsages || [],
    });
    res.json({ order });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id/rework", (req, res) => {
  try {
    const { operatorId, reason } = req.body;
    const order = reworkOrder(Number(req.params.id), operatorId, reason);
    res.json({ order });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/evaluate", (req, res) => {
  try {
    const order = evaluateOrder({
      orderId: Number(req.params.id),
      residentId: req.body.residentId,
      rating: req.body.rating,
      content: req.body.content || "",
    });
    res.json({ order });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id/dispatch-logs", (req, res) => {
  const logs = listDispatchLogs(Number(req.params.id));
  res.json({ logs });
});

router.get("/:id/materials", (req, res) => {
  const materials = getOrderMaterials(Number(req.params.id));
  res.json({ materials });
});

router.get("/validate/worker-area", (req, res) => {
  const { workerId, buildingId } = req.query;
  const ok = checkWorkerArea(Number(workerId), Number(buildingId));
  res.json({ valid: ok });
});

export default router;
