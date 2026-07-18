import { SERVICES } from "@/config/services";
import { serviceFetch } from "@/api/client";

const angroup = SERVICES.find((s) => s.id === "angroup")!;

export interface DashboardOverview {
  [key: string]: unknown;
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  return serviceFetch<DashboardOverview>(angroup, "/api/dashboard/overview");
}
