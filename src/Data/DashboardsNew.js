import {MAIN_DASHBOARD_URL} from "../API/apiConfig";

export default function DashboardsNew() {
  return (
    <iframe
      src={MAIN_DASHBOARD_URL}
      style={{ width: "100%", height: "100vh", border: "none" }}
      title="Dashboard"
    />
  );
}
