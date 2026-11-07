import { TabStack } from "@/features/learning/TabStack";
import { useLearningText } from "@/features/learning/UI";
export default function Layout() {
  const t = useLearningText();
  return <TabStack title={t.attend} />;
}
