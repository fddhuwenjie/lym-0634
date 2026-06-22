import { Router } from "express";
import { listUsers } from "../services/materialService";

const router = Router();

router.post("/login", (req, res) => {
  const { role, userId } = req.body;
  const users = listUsers(role);
  if (users.length === 0) {
    return res.status(400).json({ error: "角色不存在" });
  }
  const user = userId ? users.find((u) => u.id === Number(userId)) : users[0];
  if (!user) {
    return res.status(400).json({ error: "用户不存在" });
  }
  res.json({ user });
});

router.get("/users", (req, res) => {
  const { role } = req.query;
  const users = listUsers(role as string);
  res.json({ users });
});

export default router;
