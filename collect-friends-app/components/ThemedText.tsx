import { Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import tw from 'twrnc';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? tw`text-base leading-6` : undefined,
        type === 'title' ? tw`text-3xl font-bold leading-8` : undefined,
        type === 'defaultSemiBold' ? tw`text-base leading-6 font-semibold` : undefined,
        type === 'subtitle' ? tw`text-xl font-bold` : undefined,
        type === 'link' ? { ...tw`leading-8 text-base`, color: '#0a7ea4' } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}
