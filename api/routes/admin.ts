import { Router } from "express";
import {
  getStats,
  listEvaluations,
  createExport,
  listExportHistory,
  getExportFilePath,
} from "../services/adminService";
import fs from "fs";

const router = Router();

router.get("/stats", (_req, res) => {
  res.json({ stats: getStats() });
});

router.get("/evaluations", (_req, res) => {
  res.json({ evaluations: listEvaluations() });
});

router.post("/export", (req, res) => {
  try {
    const record = createExport(
      req.body.type,
      req.body.filters || {},
      Number(req.body.createdBy),
      req.body.createdByName
    );
    res.json({ record });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/export-history", (_req, res) => {
  res.json({ records: listExportHistory() });
});

router.get("/export/:id/download", (req, res) => {
  const history = listExportHistory();
  const record = history.find((r) => r.id === Number(req.params.id));
  if (!record) return res.status(404).json({ error: "导出记录不存在" });
  const filePath = getExportFilePath(record.fileName);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "文件不存在" });
  res.download(filePath, record.fileName);
});

export default router;
