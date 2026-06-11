import projects from "../projects.json";
import { OverviewDashboard } from "./overview-dashboard";
import type { ProjectEntry } from "./monitor-types";

export default function Home() {
  return <OverviewDashboard projects={projects as ProjectEntry[]} />;
}
