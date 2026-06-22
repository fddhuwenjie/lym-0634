import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Wrench,
  FileText,
  ClipboardList,
  Warehouse,
  Star,
  Download,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { UserRole } from "../../shared/types";
import { Button } from "./ui/Button";

const menus: Record<UserRole, { path: string; label: string; icon: React.ReactNode }[]> = {
  resident: [
    { path: "/resident/report", label: "提交报修", icon: <Wrench size={18} /> },
    { path: "/resident/orders", label: "我的工单", icon: <FileText size={18} /> },
  ],
  service: [
    { path: "/service/orders", label: "工单管理", icon: <ClipboardList size={18} /> },
  ],
  worker: [
    { path: "/worker/orders", label: "我的工单", icon: <ClipboardList size={18} /> },
  ],
  admin: [
    { path: "/admin/dashboard", label: "维修看板", icon: <Home size={18} /> },
    { path: "/admin/materials", label: "材料库存", icon: <Warehouse size={18} /> },
    { path: "/admin/evaluations", label: "服务评价", icon: <Star size={18} /> },
    { path: "/admin/export", label: "数据导出", icon: <Download size={18} /> },
  ],
};

const roleNames: Record<UserRole, string> = {
  resident: "住户",
  service: "客服",
  worker: "维修工",
  admin: "管理员",
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    navigate("/");
    return null;
  }

  const roleMenus = menus[user.role] || [];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-primary-800 text-white flex flex-col shadow-xl">
        <div className="h-16 flex items-center px-5 border-b border-primary-700/50">
          <Building2 className="text-accent-400" size={26} />
          <span className="ml-2 text-lg font-bold tracking-wide">
            物业维修系统
          </span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {roleMenus.map((m) => {
            const active =
              location.pathname === m.path ||
              location.pathname.startsWith(m.path + "/");
            return (
              <Link
                key={m.path}
                to={m.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-accent-500 text-white shadow-md"
                    : "text-primary-100 hover:bg-primary-700/50"
                }`}
              >
                {m.icon}
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-primary-700/50">
          <div className="text-xs text-primary-200 mb-1">
            当前角色：{roleNames[user.role]}
          </div>
          <div className="text-sm font-medium mb-3">{user.name}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-white hover:bg-primary-700 justify-start"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut size={16} />
            退出登录
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-800">
            {roleMenus.find(
              (m) =>
                location.pathname === m.path ||
                location.pathname.startsWith(m.path + "/")
            )?.label || "物业维修派单与材料核销系统"}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">欢迎，{user.name}</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
