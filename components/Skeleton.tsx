import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * Skeleton loader con pulso suave — en vez de un spinner genérico, el layout
 * que viene se insinúa mientras carga (lineamientos de diseño del proyecto).
 */
export function Skeleton({ height = 76, width }: { height?: number; width?: number | `${number}%` }) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        height,
        width: width ?? '100%',
        borderRadius: radius.lg,
        backgroundColor: colors.bgElev,
        opacity: pulse,
        marginBottom: spacing.md,
      }}
    />
  );
}

export function SkeletonList({ count = 4, height = 76 }: { count?: number; height?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={i === 0 ? height + 28 : height} />
      ))}
    </View>
  );
}
