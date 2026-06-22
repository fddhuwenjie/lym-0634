import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";

import ReportOrder from "@/pages/resident/ReportOrder";
import ResidentOrders from "@/pages/resident/ResidentOrders";
import ResidentOrderDetail from "@/pages/resident/ResidentOrderDetail";

import ServiceOrders from "@/pages/service/ServiceOrders";

import WorkerOrders from "@/pages/worker/WorkerOrders";
import WorkerProcess from "@/pages/worker/WorkerProcess";

import Dashboard from "@/pages/admin/Dashboard";
import MaterialManagement from "@/pages/admin/MaterialManagement";
import EvaluationManagement from "@/pages/admin/EvaluationManagement";
import ExportPage from "@/pages/admin/ExportPage";
import SlaConfigPage from "@/pages/admin/SlaConfigPage";
import SlaDashboard from "@/pages/admin/SlaDashboard";

import EquipmentManagement from "@/pages/admin/EquipmentManagement";
import InspectionDashboard from "@/pages/admin/InspectionDashboard";
import HazardDashboard from "@/pages/admin/HazardDashboard";
import InspectionExportPage from "@/pages/admin/InspectionExportPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/resident" element={<Layout />}>
          <Route index element={<Navigate to="/resident/report" replace />} />
          <Route path="report" element={<ReportOrder />} />
          <Route path="orders" element={<ResidentOrders />} />
          <Route path="orders/:id" element={<ResidentOrderDetail />} />
        </Route>

        <Route path="/service" element={<Layout />}>
          <Route index element={<Navigate to="/service/orders" replace />} />
          <Route path="orders" element={<ServiceOrders />} />
          <Route path="orders/:id" element={<ResidentOrderDetail />} />
        </Route>

        <Route path="/worker" element={<Layout />}>
          <Route index element={<Navigate to="/worker/orders" replace />} />
          <Route path="orders" element={<WorkerOrders />} />
          <Route path="orders/:id/process" element={<WorkerProcess />} />
        </Route>

        <Route path="/admin" element={<Layout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sla-dashboard" element={<SlaDashboard />} />
          <Route path="sla-config" element={<SlaConfigPage />} />
          <Route path="materials" element={<MaterialManagement />} />
          <Route path="evaluations" element={<EvaluationManagement />} />
          <Route path="equipment" element={<EquipmentManagement />} />
          <Route path="inspection" element={<InspectionDashboard />} />
          <Route path="hazard" element={<HazardDashboard />} />
          <Route path="inspection-export" element={<InspectionExportPage />} />
          <Route path="export" element={<ExportPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
