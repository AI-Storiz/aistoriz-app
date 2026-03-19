import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const COMPRESSION_QUALITY = 0.7;
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;

export async function compressBase64Image(base64DataUrl: string): Promise<string> {
  try {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:image')) {
      return base64DataUrl;
    }

    const base64Data = base64DataUrl.split(',')[1];
    if (!base64Data) {
      return base64DataUrl;
    }

    const tempUri = FileSystem.cacheDirectory + `temp_compress_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(tempUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const manipulatedImage = await manipulateAsync(
      tempUri,
      [{ resize: { width: MAX_WIDTH, height: MAX_HEIGHT } }],
      {
        compress: COMPRESSION_QUALITY,
        format: SaveFormat.JPEG,
      }
    );

    const compressedBase64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await FileSystem.deleteAsync(tempUri, { idempotent: true });
    await FileSystem.deleteAsync(manipulatedImage.uri, { idempotent: true });

    return `data:image/jpeg;base64,${compressedBase64}`;
  } catch (error) {
    console.error('Image compression failed:', error);
    return base64DataUrl;
  }
}

export async function compressComicPages(pages: any[]): Promise<any[]> {
  console.log('Compressing comic pages...');
  const startTime = Date.now();
  
  const compressedPages = await Promise.all(
    pages.map(async (page, pageIndex) => {
      const compressedPage = { ...page };

      if (page.imageUrl && page.imageUrl.startsWith('data:image')) {
        compressedPage.imageUrl = await compressBase64Image(page.imageUrl);
      }

      if (page.panelImages && Array.isArray(page.panelImages)) {
        compressedPage.panelImages = await Promise.all(
          page.panelImages.map(async (panelUrl: string, panelIndex: number) => {
            if (panelUrl && panelUrl.startsWith('data:image')) {
              return await compressBase64Image(panelUrl);
            }
            return panelUrl;
          })
        );
      }

      console.log(`Page ${pageIndex + 1} compressed`);
      return compressedPage;
    })
  );

  const elapsed = Date.now() - startTime;
  console.log(`Compression complete in ${elapsed}ms`);
  
  return compressedPages;
}
