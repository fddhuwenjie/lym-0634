import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "property_repair.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      building_ids TEXT,
      room_number TEXT
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      resident_id INTEGER NOT NULL,
      resident_name TEXT NOT NULL,
      building_id INTEGER NOT NULL,
      building_name TEXT NOT NULL,
      unit_number TEXT NOT NULL,
      room_number TEXT NOT NULL,
      type TEXT NOT NULL,
      urgency TEXT NOT NULL,
      description TEXT NOT NULL,
      images TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      worker_id INTEGER,
      worker_name TEXT,
      dispatch_remark TEXT,
      arrive_time TEXT,
      process_remark TEXT,
      complete_remark TEXT,
      complete_images TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      dispatched_at TEXT,
      completed_at TEXT,
      closed_at TEXT,
      is_overdue INTEGER DEFAULT 0,
      is_rework INTEGER DEFAULT 0,
      rework_count INTEGER DEFAULT 0,
      abnormal_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS dispatch_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      from_worker_id INTEGER,
      to_worker_id INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      warning_threshold INTEGER NOT NULL DEFAULT 5,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS material_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      material_name TEXT NOT NULL,
      order_id INTEGER,
      order_no TEXT,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      before_stock INTEGER NOT NULL,
      after_stock INTEGER NOT NULL,
      operator_id INTEGER NOT NULL,
      operator_name TEXT NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      order_no TEXT NOT NULL,
      resident_id INTEGER NOT NULL,
      resident_name TEXT NOT NULL,
      worker_id INTEGER,
      worker_name TEXT,
      rating INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS export_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      filters TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'done',
      created_by INTEGER NOT NULL,
      created_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sla_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_type TEXT NOT NULL,
      urgency TEXT NOT NULL,
      building_id INTEGER NOT NULL DEFAULT 0,
      building_name TEXT,
      response_limit INTEGER NOT NULL DEFAULT 30,
      arrive_limit INTEGER NOT NULL DEFAULT 60,
      complete_limit INTEGER NOT NULL DEFAULT 1440,
      warning_threshold INTEGER NOT NULL DEFAULT 30,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(repair_type, urgency, building_id)
    );

    CREATE TABLE IF NOT EXISTS sla_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      stage TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'normal',
      start_time TEXT NOT NULL,
      deadline TEXT NOT NULL,
      limit_minutes INTEGER NOT NULL,
      warning_at TEXT,
      overdue_at TEXT,
      is_paused INTEGER DEFAULT 0,
      pause_reason TEXT,
      paused_at TEXT,
      resumed_at TEXT,
      pause_minutes INTEGER DEFAULT 0,
      actual_minutes INTEGER,
      resolved_at TEXT,
      pending_materials TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id)
    );

    CREATE TABLE IF NOT EXISTS sla_escalations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      sla_record_id INTEGER NOT NULL,
      trigger_reason TEXT NOT NULL,
      trigger_stage TEXT NOT NULL,
      overdue_minutes INTEGER NOT NULL,
      escalated_to TEXT NOT NULL,
      escalated_to_user_id INTEGER NOT NULL,
      escalated_to_user_name TEXT NOT NULL,
      operator_id INTEGER NOT NULL,
      operator_name TEXT NOT NULL,
      handler_remark TEXT,
      handler_id INTEGER,
      handler_name TEXT,
      handled_at TEXT,
      resolution TEXT,
      resolver_id INTEGER,
      resolver_name TEXT,
      resolved_at TEXT,
      is_resolved INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id),
      FOREIGN KEY (sla_record_id) REFERENCES sla_records(id)
    );

    CREATE TABLE IF NOT EXISTS sla_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      sla_record_id INTEGER NOT NULL,
      stage TEXT NOT NULL,
      remaining_minutes INTEGER NOT NULL,
      notified_to TEXT NOT NULL,
      notified_user_ids TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES work_orders(id),
      FOREIGN KEY (sla_record_id) REFERENCES sla_records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
    CREATE INDEX IF NOT EXISTS idx_work_orders_worker ON work_orders(worker_id);
    CREATE INDEX IF NOT EXISTS idx_work_orders_resident ON work_orders(resident_id);
    CREATE INDEX IF NOT EXISTS idx_material_transactions_material ON material_transactions(material_id);
    CREATE INDEX IF NOT EXISTS idx_material_transactions_order ON material_transactions(order_id);
    CREATE INDEX IF NOT EXISTS idx_sla_records_order ON sla_records(order_id);
    CREATE INDEX IF NOT EXISTS idx_sla_records_status ON sla_records(status);
    CREATE INDEX IF NOT EXISTS idx_sla_records_stage ON sla_records(stage);
    CREATE INDEX IF NOT EXISTS idx_sla_escalations_order ON sla_escalations(order_id);
    CREATE INDEX IF NOT EXISTS idx_sla_escalations_resolved ON sla_escalations(is_resolved);
    CREATE INDEX IF NOT EXISTS idx_sla_warnings_order ON sla_warnings(order_id);
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare("SELECT COUNT(*) as cnt FROM users").get() as {
    cnt: number;
  };
  if (userCount.cnt > 0) return;

  const insertUser = db.prepare(
    "INSERT INTO users (name, role, phone, building_ids, room_number) VALUES (?, ?, ?, ?, ?)"
  );

  insertUser.run("张三", "resident", "13800138001", null, "1-1-101");
  insertUser.run("李四", "service", "13800138002", null, null);
  insertUser.run("王师傅", "worker", "13800138003", JSON.stringify([1, 2]), null);
  insertUser.run("赵师傅", "worker", "13800138004", JSON.stringify([3, 4, 5]), null);
  insertUser.run("系统管理员", "admin", "13800138000", null, null);

  const materialCount = db.prepare("SELECT COUNT(*) as cnt FROM materials").get() as {
    cnt: number;
  };
  if (materialCount.cnt > 0) return;

  const insertMaterial = db.prepare(
    "INSERT INTO materials (name, unit, stock, warning_threshold, price) VALUES (?, ?, ?, ?, ?)"
  );
  insertMaterial.run("PPR水管", "米", 50, 10, 8.5);
  insertMaterial.run("水龙头", "个", 30, 5, 45);
  insertMaterial.run("LED灯泡", "个", 80, 20, 12);
  insertMaterial.run("电线(2.5平方)", "米", 200, 50, 3.5);
  insertMaterial.run("单开开关", "个", 40, 10, 18);
  insertMaterial.run("防盗门锁芯", "个", 10, 3, 120);
  insertMaterial.run("生料带", "卷", 60, 15, 2);
  insertMaterial.run("PVC弯头", "个", 100, 30, 1.5);

  const slaCount = db.prepare("SELECT COUNT(*) as cnt FROM sla_configs").get() as {
    cnt: number;
  };
  if (slaCount.cnt > 0) return;

  const insertSla = db.prepare(
    `INSERT INTO sla_configs 
     (repair_type, urgency, building_id, building_name, response_limit, arrive_limit, complete_limit, warning_threshold, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const now = new Date().toISOString();
  const repairTypes: string[] = ["plumbing", "electrical", "structural", "appliance", "other"];
  const urgencies: { level: string; response: number; arrive: number; complete: number }[] = [
    { level: "low", response: 60, arrive: 120, complete: 2880 },
    { level: "medium", response: 30, arrive: 60, complete: 1440 },
    { level: "high", response: 15, arrive: 30, complete: 480 },
    { level: "urgent", response: 5, arrive: 15, complete: 120 },
  ];

  for (const rt of repairTypes) {
    for (const u of urgencies) {
      insertSla.run(rt, u.level, 0, null, u.response, u.arrive, u.complete, 30, now, now);
    }
  }
}

export default db;
