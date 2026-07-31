import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Abre la galería, deja recortar en cuadrado y devuelve el logo como data
 * URL ≤256px listo para logoDataUrl del backend. null si el usuario cancela.
 * Lanza Error con mensaje en español si la imagen no se puede procesar.
 */
export async function pickLogoDataUrl(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const resized = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 256 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.PNG, base64: true },
  );
  if (!resized.base64) throw new Error('No se pudo procesar la imagen.');

  let dataUrl = `data:image/png;base64,${resized.base64}`;
  if (dataUrl.length > 200_000) {
    // PNG demasiado pesado (foto compleja): reintento como JPEG comprimido.
    const jpeg = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 256 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!jpeg.base64) throw new Error('No se pudo procesar la imagen.');
    dataUrl = `data:image/jpeg;base64,${jpeg.base64}`;
    if (dataUrl.length > 200_000) {
      throw new Error('La imagen es demasiado compleja. Prueba con un logo más simple.');
    }
  }
  return dataUrl;
}
