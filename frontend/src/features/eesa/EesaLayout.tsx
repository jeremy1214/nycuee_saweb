import { Outlet } from "react-router-dom";
import { EesaLayout as Layout } from "./components/Grid";

export default function EesaLayout() {
  return <Layout><Outlet /></Layout>;
}
