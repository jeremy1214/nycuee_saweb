import { Outlet } from "react-router-dom";
import { EesaLayout } from "./Layout";

export default function EesaSection() {
  return <EesaLayout><Outlet /></EesaLayout>;
}

export { default as EesaIntro } from "./EesaIntro";
export { default as Department } from "./Department";
export { default as DepartmentActivities } from "./DepartmentActivities";
export { default as Activity } from "./Activity";
export { default as DepartmentSkills } from "./DepartmentSkills";
export { default as DepartmentExperiences } from "./DepartmentExperiences";
