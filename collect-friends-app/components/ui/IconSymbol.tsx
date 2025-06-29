// Using beautiful Lucide icons across all platforms

import { Platform } from 'react-native';
import { SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { Icons } from '@/utils/iconHelper';

type LucideIconComponent = any;
type LucideIconMapping = Record<SymbolViewProps['name'], LucideIconComponent>;
type IconSymbolName = keyof typeof LUCIDE_MAPPING;

/**
 * Add your SF Symbols to Lucide icons mappings here.
 * - see Lucide Icons at https://lucide.dev/icons
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const LUCIDE_MAPPING = {
  'house.fill': Icons.Home,
  'paperplane.fill': Icons.Send,
  'chevron.left.forwardslash.chevron.right': Icons.Code,
  'chevron.right': Icons.ChevronRight,
  'map.fill': Icons.MapPin,
  'message.fill': Icons.MessageSquare,
  'gear': Icons.Settings,
} as LucideIconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and beautiful Lucide icons on all other platforms.
 * This ensures a consistent, professional look across platforms with optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Lucide icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: any; // Keep for compatibility but not used with Lucide
}) {
  // For non-iOS platforms, use Lucide icons
  if (Platform.OS !== 'ios') {
    const LucideIcon = LUCIDE_MAPPING[name];
    
    if (!LucideIcon) {
      // Fallback for unmapped icons
      return null;
    }

    return (
      <LucideIcon
        size={size}
        color={color}
        style={style}
      />
    );
  }

  // For iOS, continue using SF Symbols (expo-symbols)
  // Note: This requires expo-symbols to be imported conditionally
  const { SymbolView } = require('expo-symbols');
  
  return (
    <SymbolView
      weight="regular"
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
