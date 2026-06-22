import { Router } from "express";
import {
  listMaterials,
  createMaterial,
  updateMaterial,
  stockIn,
  returnMaterial,
  listTransactions,
} from "../services/materialService";
import { db } from "../db/database";
import { handleMaterialRestocked } from "../services/slaService";

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
    const result = stockIn(
      Number(req.params.id),
      Number(req.body.quantity),
      Number(req.body.operatorId),
      req.body.operatorName,
      req.body.remark
    );

    if (result.beforeStock === 0 && result.afterStock > 0) {
      const pendingOrders = db
        .prepare(
          `SELECT DISTINCT o.id 
           FROM work_orders o
           INNER JOIN sla_records s ON o.id = s.order_id
           WHERE o.status IN ('dispatched', 'processing')
             AND s.is_paused = 1
             AND s.pause_reason = 'material_shortage'`
        )
        .all() as { id: number }[];

      for (const po of pendingOrders) {
        handleMaterialRestocked(po.id);
      }
    }

    res.json({ material: result.material });
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
