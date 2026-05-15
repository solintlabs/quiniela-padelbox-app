import { Image } from 'react-native';

export function Logo({ width = 160 }: { width?: number }) {
  return (
    <Image
      source={require('../assets/logo-blanco.png')}
      style={{ width, height: width / 3.2, resizeMode: 'contain' }}
    />
  );
}
