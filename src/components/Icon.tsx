import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { iconPaths } from './icon-paths';

export function Icon({ name, size = 24, color = colors.onSurface }: {
  name: keyof typeof iconPaths;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Path d={iconPaths[name]} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
