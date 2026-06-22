import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import {
  WorkOrder,
  STATUS_LABELS,
  STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  REPAIR_TYPE_LABELS,
} from "../../shared/types";
import { formatDateTime } from "@/lib/api";
import { AlertTriangle, MapPin, User } from "lucide-react";

interface Props {
  order: WorkOrder;
  onClick?: () => void;
  extra?: React.ReactNode;
}

export default function WorkOrderCard({ order, onClick, extra }: Props) {
  return (
    <Card
      hoverable
      className={`cursor-pointer ${
        order.isOverdue ? "border-danger animate-pulse-danger" : ""
      }`}
      onClick={onClick}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-slate-500 truncate">
              {order.orderNo}
            </span>
            {order.isRework && (
              <Badge variant="warning">
                <AlertTriangle size={10} className="mr-0.5" />
                返工{order.reworkCount > 1 ? `x${order.reworkCount}` : ""}
              </Badge>
            )}
            {order.isOverdue && (
              <Badge variant="danger">
                <AlertTriangle size={10} className="mr-0.5" />
                超时
              </Badge>
            )}
          </div>
          <Badge className={STATUS_COLORS[order.status]}>
            {STATUS_LABELS[order.status]}
          </Badge>
        </div>

        <div className="text-sm font-medium text-slate-800 line-clamp-1">
          {REPAIR_TYPE_LABELS[order.type]} · {order.description.slice(0, 30)}
          {order.description.length > 30 ? "..." : ""}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            {order.buildingName}-{order.unitNumber}-{order.roomNumber}
          </div>
          <div className="flex items-center gap-1">
            <User size={12} />
            {order.residentName}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <Badge className={URGENCY_COLORS[order.urgency]}>
            {URGENCY_LABELS[order.urgency]}
          </Badge>
          <span className="text-slate-400">{formatDateTime(order.createdAt)}</span>
        </div>

        {order.workerName && (
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            维修工：<span className="text-slate-700">{order.workerName}</span>
          </div>
        )}

        {extra && <div className="pt-2">{extra}</div>}
      </div>
    </Card>
  );
}
