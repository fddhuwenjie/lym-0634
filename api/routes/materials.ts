import { Router } from "express";
import {
  listMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  stockIn,
  returnMaterial,
  listTransactions,
} from "../services/materialService";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ materials: listMaterials() });
});

router.post("/", (req, res) => {
  try {
    const m = createMaterial(
      req.body.name,
      req.body.unit,
      Number(req.body.stock) || 0,
      Number(req.body.warningThreshold) || 5,
      Number(req.body.price) || 0
    );
    res.json({ material: m });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const m = updateMaterial(Number(req.params.id), req.body);
    res.json({ material: m });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/stock-in", (req, res) => {
  try {
    const m = stockIn(
      Number(req.params.id),
      Number(req.body.quantity),
      Number(req.body.operatorId),
      req.body.operatorName,
      req.body.remark
    );
    res.json({ material: m });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/return", (req, res) => {
  try {
    const m = returnMaterial(
      Number(req.params.id),
      Number(req.body.quantity),
      Number(req.body.operatorId),
      req.body.operatorName,
      req.body.orderId ? Number(req.body.orderId) : undefined,
      req.body.remark
    );
    res.json({ material: m });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/transactions/list", (req, res) => {
  const params: any = {};
  if (req.query.materialId) params.materialId = Number(req.query.materialId);
  if (req.query.orderId) params.orderId = Number(req.query.orderId);
  if (req.query.type) params.type = req.query.type;
  res.json({ transactions: listTransactions(params) });
});

export default router;
