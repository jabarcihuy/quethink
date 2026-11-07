import { SvgXml } from "react-native-svg";
import { useWindowDimensions } from "react-native";
import { artwork } from "../../assets/illustrations";
/** Custom geometric SVG assets; adjacent text owns their accessible meaning. */
export function LearningArt({
  name,
  size = 112,
}: {
  name: keyof typeof artwork;
  size?: number;
}) {
  const { width, fontScale } = useWindowDimensions();
  const displaySize =
    width < 350 || fontScale >= 1.25 ? Math.min(size, 72) : size;
  return (
    <SvgXml
      xml={artwork[name]}
      width={displaySize}
      height={displaySize}
      style={{ flexShrink: 0 }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
