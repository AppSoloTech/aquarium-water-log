// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'plus.circle.fill': 'add-circle',
  'plus': 'add',
  'drop.fill': 'water-drop',
  'list.bullet': 'list',
  'gearshape.fill': 'settings',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  'bell.fill': 'notifications',
  'bell.badge.fill': 'add-alert',
  'target': 'track-changes',
  'externaldrive.fill': 'storage',
  'arrow.left': 'arrow-back',
  'arrow.clockwise': 'refresh',
  'info.circle.fill': 'info',
  'square.and.arrow.down.fill': 'file-download',
  'square.and.arrow.up.fill': 'file-upload',
  'trash.fill': 'delete',
  'pencil': 'edit',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'star.fill': 'star',
  'star': 'star-outline',
  'flask.fill': 'science',
  'calendar': 'event',
  'clock': 'access-time',
  'chart.bar.fill': 'bar-chart',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'error',
  'square.grid.2x2.fill': 'grid-view',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
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
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
