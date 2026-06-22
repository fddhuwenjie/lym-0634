import { db } from "../db/database";
import { Material, MaterialTransaction, User } from "../../shared/types";

export function listMaterials(): Material[] {
  return db
    .prepare("SELECT * FROM materials ORDER BY id ASC")
    .all() as Material[];
}

export function getMaterial(id: number): Material | undefined {
  return db.prepare("SELECT * FROM materials WHERE id = ?").get(id) as
    | Material
    | undefined;
}

export function createMaterial(
  name: string,
  unit: string,
  stock: number,
  warningThreshold: number,
  price: number
): Material {
  const result = db
    .prepare(
      `INSERT INTO materials (name, unit, stock, warning_threshold, price) 
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, unit, stock, warningThreshold, price);
  return getMaterial(result.lastInsertRowid as number)!;
}

export function updateMaterial(
  id: number,
  data: Partial<Omit<Material, "id">>
): Material {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.unit !== undefined) {
    fields.push("unit = ?");
    values.push(data.unit);
  }
  if (data.warningThreshold !== undefined) {
    fields.push("warning_threshold = ?");
    values.push(data.warningThreshold);
  }
  if (data.price !== undefined) {
    fields.push("price = ?");
    values.push(data.price);
  }
  values.push(id);
  db.prepare(`UPDATE materials SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values
  );
  return getMaterial(id)!;
}

export function stockIn(
  id: number,
  quantity: number,
  operatorId: number,
  operatorName: string,
  remark?: string
) {
  const mat = getMaterial(id);
  if (!mat) throw new Error("材料不存在");
  if (quantity <= 0) throw new Error("入库数量必须大于0");

  const now = new Date().toISOString();
  const beforeStock = mat.stock;
  const afterStock = beforeStock + quantity;

  const tx = db.transaction(() => {
    db.prepare("UPDATE materials SET stock = ? WHERE id = ?").run(
      afterStock,
      id
    );
    db.prepare(
      `INSERT INTO material_transactions 
       (material_id, material_name, type, quantity, before_stock, after_stock, 
        operator_id, operator_name, remark, created_at)
       VALUES (?, ?, 'stock_in', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      mat.name,
      quantity,
      beforeStock,
      afterStock,
      operatorId,
      operatorName,
      remark || "材料入库",
      now
    );
  });
  tx();

  return getMaterial(id)!;
}

export function returnMaterial(
  id: number,
  quantity: number,
  operatorId: number,
  operatorName: string,
  orderId?: number,
  remark?: string
) {
  const mat = getMaterial(id);
  if (!mat) throw new Error("材料不存在");
  if (quantity <= 0) throw new Error("退库数量必须大于0");

  const now = new Date().toISOString();
  const beforeStock = mat.stock;
  const afterStock = beforeStock + quantity;

  let orderNo: string | undefined;
  if (orderId) {
    const order = db.prepare("SELECT order_no FROM work_orders WHERE id = ?").get(orderId) as any;
    if (order) orderNo = order.order_no;
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE materials SET stock = ? WHERE id = ?").run(
      afterStock,
      id
    );
    db.prepare(
      `INSERT INTO material_transactions 
       (material_id, material_name, order_id, order_no, type, quantity, before_stock, after_stock, 
        operator_id, operator_name, remark, created_at)
       VALUES (?, ?, ?, ?, 'return', ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      mat.name,
      orderId || null,
      orderNo || null,
      quantity,
      beforeStock,
      afterStock,
      operatorId,
      operatorName,
      remark || "材料退库",
      now
    );
  });
  tx();

  return getMaterial(id)!;
}

export function listTransactions(params?: {
  materialId?: number;
  orderId?: number;
  type?: string;
}): MaterialTransaction[] {
  const conditions: string[] = [];
  const args: any[] = [];
  if (params?.materialId) {
    conditions.push("material_id = ?");
    args.push(params.materialId);
  }
  if (params?.orderId) {
    conditions.push("order_id = ?");
    args.push(params.orderId);
  }
  if (params?.type) {
    conditions.push("type = ?");
    args.push(params.type);
  }
  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  return db
    .prepare(
      `SELECT * FROM material_transactions ${where} ORDER BY created_at DESC`
    )
    .all(...args) as MaterialTransaction[];
}

export function listUsers(role?: string): User[] {
  const rows = role
    ? db.prepare("SELECT * FROM users WHERE role = ?").all(role)
    : db.prepare("SELECT * FROM users").all();
  return rows.map((r: any) => ({
    ...r,
    buildingIds: r.building_ids ? JSON.parse(r.building_ids) : undefined,
    roomNumber: r.room_number,
  }));
}

export function getUser(id: number): User | undefined {
  const r = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!r) return undefined;
  return {
    ...r,
    buildingIds: r.building_ids ? JSON.parse(r.building_ids) : undefined,
    roomNumber: r.room_number,
  };
}
