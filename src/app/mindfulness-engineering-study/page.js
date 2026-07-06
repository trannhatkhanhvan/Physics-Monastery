import fs from "fs";
import path from "path";
import PublicStudyPage from "./PublicStudyPage";

export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();
const DATA_PATH = path.join(
  PROJECT_ROOT,
  "research",
  "mindfulness-engineering-study",
  "outputs",
  "public",
  "presentation_data.json"
);

function readPresentationData() {
  try {
    if (!fs.existsSync(DATA_PATH)) return null;
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {
    return null;
  }
}

export default function MindfulnessEngineeringStudyPage() {
  const data = readPresentationData();

  return <PublicStudyPage data={data} />;
}
