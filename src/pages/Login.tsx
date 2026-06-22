import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Headphones,
  Wrench,
  ShieldCheck,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { UserRole } from "../../shared/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/api";

const roles: {
  key: UserRole;
  name: string;
  desc: string;
  icon: React.ReactNode;
  gradient: string;
}[] = [
  {
    key: "resident",
    name: "住户",
    desc: "提交报修、查看工单、评价服务",
    icon: <UserRound size={36} />,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    key: "service",
    name: "客服",
    desc: "受理报修、派单改派、工单管理",
    icon: <Headphones size={36} />,
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    key: "worker",
    name: "维修工",
    desc: "接单处理、到场签到、材料使用",
    icon: <Wrench size={36} />,
    gradient: "from-amber-500 to-amber-600",
  },
  {
    key: "admin",
    name: "管理员",
    desc: "查看看板、库存管理、数据导出",
    icon: <ShieldCheck size={36} />,
    gradient: "from-purple-500 to-purple-600",
  },
];

const roleDefaultRoutes: Record<UserRole, string> = {
  resident: "/resident/report",
  service: "/service/orders",
  worker: "/worker/orders",
  admin: "/admin/dashboard",
};

export default function Login() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  async function handleLogin() {
    if (!selected) return;
    setLoading(true);
    try {
      await login(selected);
      toast.success("登录成功");
      navigate(roleDefaultRoutes[selected]);
    } catch (e: any) {
      toast.error(e.message || "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-800 via-primary-900 to-slate-900 p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-2xl shadow-xl mb-4">
            <Building2 size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            物业维修派单与材料核销系统
          </h1>
          <p className="text-primary-200">请选择您的角色进入系统</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {roles.map((r) => (
            <Card
              key={r.key}
              hoverable
              className={`cursor-pointer transition-all p-5 text-center ${
                selected === r.key
                  ? "ring-2 ring-accent-500 -translate-y-1 shadow-card-hover"
                  : ""
              }`}
              onClick={() => setSelected(r.key)}
            >
              <div
                className={`w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-white shadow-md`}
              >
                {r.icon}
              </div>
              <div className="font-semibold text-slate-800 text-base mb-1">
                {r.name}
              </div>
              <div className="text-xs text-slate-500 leading-relaxed">
                {r.desc}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!selected || loading}
            onClick={handleLogin}
            className="px-8 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700"
          >
            {loading ? "登录中..." : "进入系统"}
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
