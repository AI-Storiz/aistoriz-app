import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Platform, Alert } from "react-native";
import JSZip from "jszip";

export interface PanelData {
  description?: string;
  dialogue?: string;
  cameraAngle?: string;
}

export interface ComicPage {
  pageNumber: number;
  imageUrl: string;
  panelImages?: string[];
  pageType?: 'cover' | 'body' | 'conclusion';
  scenes?: {
    description: string;
    dialogue: string;
  };
  panels?: PanelData[];
}

export interface ExportResult {
  success: boolean;
  message: string;
  filePath?: string;
  fileName?: string;
}

const EXPORT_DIR = "AIStoriz";
const getExportPath = () => {
  if (Platform.OS === "android") {
    return `${FileSystem.documentDirectory}${EXPORT_DIR}/`;
  }
  return `${FileSystem.cacheDirectory}${EXPORT_DIR}/`;
};

const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  } catch (error) {
    console.log("Directory creation handled:", error);
  }
};

const getImageAsBase64 = async (imageUrl: string): Promise<string> => {
  if (imageUrl.startsWith("data:image")) {
    return imageUrl.split(",")[1];
  }

  if (imageUrl.startsWith("file://") || imageUrl.startsWith(FileSystem.documentDirectory || "")) {
    const content = await FileSystem.readAsStringAsync(imageUrl, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return content;
  }

  const tempPath = `${FileSystem.cacheDirectory}temp_export_${Date.now()}.png`;
  await FileSystem.downloadAsync(imageUrl, tempPath);
  const content = await FileSystem.readAsStringAsync(tempPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await FileSystem.deleteAsync(tempPath, { idempotent: true });
  return content;
};

const generateSpeechBubbleHtml = (dialogue: string): string => {
  if (!dialogue || dialogue.trim() === '') return '';
  
  return `
    <div style="
      position: absolute;
      bottom: 8px;
      left: 8px;
      right: 8px;
      background: white;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 6px 10px;
      font-family: 'Comic Sans MS', cursive, sans-serif;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      max-height: 60px;
      overflow: hidden;
      z-index: 5;
    ">
      ${dialogue}
    </div>
  `;
};

const generatePanelGridHtml = async (
  panelImages: string[], 
  pageType?: string, 
  pageTitle?: string,
  panels?: PanelData[]
): Promise<string> => {
  const panelCount = panelImages.length;
  const base64Promises = panelImages.map(img => getImageAsBase64(img));
  const base64Images = await Promise.all(base64Promises);
  
  let gridStyle = '';
  let panelHtml = '';
  
  const createPanelWithBubble = (b64: string, index: number, gridSpan?: string): string => {
    const dialogue = panels?.[index]?.dialogue || '';
    const bubbleHtml = generateSpeechBubbleHtml(dialogue);
    const spanStyle = gridSpan ? `grid-column: ${gridSpan};` : '';
    
    return `
      <div style="position: relative; overflow: hidden; border-radius: 8px; background: #f0f0f0; ${spanStyle}">
        <img src="data:image/png;base64,${b64}" style="width: 100%; height: 100%; object-fit: cover;" />
        ${bubbleHtml}
      </div>
    `;
  };
  
  if (panelCount === 1) {
    gridStyle = 'display: flex; justify-content: center; align-items: center; height: 100%;';
    const dialogue = panels?.[0]?.dialogue || '';
    const bubbleHtml = generateSpeechBubbleHtml(dialogue);
    panelHtml = `
      <div style="position: relative; max-width: 100%; max-height: 100%;">
        <img src="data:image/png;base64,${base64Images[0]}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" />
        ${bubbleHtml}
      </div>
    `;
  } else if (panelCount === 2) {
    gridStyle = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 100%;';
    panelHtml = base64Images.map((b64, idx) => createPanelWithBubble(b64, idx)).join('');
  } else if (panelCount === 3) {
    gridStyle = 'display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; height: 100%;';
    panelHtml = `
      ${createPanelWithBubble(base64Images[0], 0, '1 / 3')}
      ${createPanelWithBubble(base64Images[1], 1)}
      ${createPanelWithBubble(base64Images[2], 2)}
    `;
  } else {
    gridStyle = 'display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; height: 100%;';
    panelHtml = base64Images.slice(0, 4).map((b64, idx) => createPanelWithBubble(b64, idx)).join('');
  }
  
  const titleHtml = pageType === 'cover' && pageTitle 
    ? `<div style="position: absolute; bottom: 40px; left: 0; right: 0; text-align: center; z-index: 10;">
        <h1 style="font-family: 'Comic Sans MS', cursive, sans-serif; font-size: 28px; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); margin: 0;">${pageTitle}</h1>
       </div>`
    : '';
  
  return `<div style="position: relative; ${gridStyle}">${panelHtml}${titleHtml}</div>`;
};

export const exportToPDF = async (
  pages: ComicPage[],
  title: string = "My Comic"
): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      return { success: false, message: "PDF export is not supported on web." };
    }

    if (pages.length === 0) {
      return { success: false, message: "No pages to export." };
    }

    const imageHtmlPromises = pages.map(async (page) => {
      const pageLabel = page.pageType === 'cover' ? 'Cover' : page.pageType === 'conclusion' ? 'Conclusion' : `Page ${page.pageNumber}`;
      
      let contentHtml = '';
      
      if (page.panelImages && page.panelImages.length > 0) {
        contentHtml = await generatePanelGridHtml(page.panelImages, page.pageType, title, page.panels);
      } else if (page.imageUrl) {
        const base64 = await getImageAsBase64(page.imageUrl);
        const dialogue = page.scenes?.dialogue || '';
        const bubbleHtml = dialogue ? generateSpeechBubbleHtml(dialogue) : '';
        contentHtml = `
          <div style="position: relative; max-width: 100%; max-height: 100%;">
            <img src="data:image/png;base64,${base64}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" />
            ${bubbleHtml}
          </div>
        `;
      }
      
      return `
        <div style="page-break-after: always; padding: 15px; box-sizing: border-box; height: 100vh; display: flex; flex-direction: column;">
          <h2 style="font-family: Arial, sans-serif; margin: 0 0 10px 0; font-size: 14px; color: #666;">${pageLabel}</h2>
          <div style="flex: 1; overflow: hidden;">
            ${contentHtml}
          </div>
        </div>
      `;
    });

    const imageHtmlArray = await Promise.all(imageHtmlPromises);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            @page { margin: 0; size: A4; }
            body { margin: 0; padding: 0; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${imageHtmlArray.join("")}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
    const exportPath = getExportPath();
    await ensureDirectoryExists(exportPath);
    const destinationUri = `${exportPath}${fileName}`;

    await FileSystem.moveAsync({
      from: uri,
      to: destinationUri,
    });

    return {
      success: true,
      message: `PDF saved successfully!`,
      filePath: destinationUri,
      fileName,
    };
  } catch (error: any) {
    console.error("PDF export error:", error);
    return { success: false, message: `PDF export failed: ${error.message}` };
  }
};

export const exportToJPG = async (
  pages: ComicPage[],
  title: string = "Comic"
): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      for (const page of pages) {
        const images = page.panelImages && page.panelImages.length > 0 ? page.panelImages : (page.imageUrl ? [page.imageUrl] : []);
        for (let i = 0; i < images.length; i++) {
          const link = document.createElement("a");
          link.href = images[i];
          const fileName = images.length > 1
            ? `${title}_page_${page.pageNumber}_panel_${i + 1}.jpg`
            : `${title}_page_${page.pageNumber}.jpg`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      return { success: true, message: "Images downloaded to your browser." };
    }

    const exportPath = getExportPath();
    await ensureDirectoryExists(exportPath);

    const savedFiles: string[] = [];
    for (const page of pages) {
      const images = page.panelImages && page.panelImages.length > 0 ? page.panelImages : (page.imageUrl ? [page.imageUrl] : []);
      for (let i = 0; i < images.length; i++) {
        const fileName = images.length > 1
          ? `${title.replace(/[^a-zA-Z0-9]/g, "_")}_page_${page.pageNumber}_panel_${i + 1}.jpg`
          : `${title.replace(/[^a-zA-Z0-9]/g, "_")}_page_${page.pageNumber}.jpg`;
        const filePath = `${exportPath}${fileName}`;
        const base64 = await getImageAsBase64(images[i]);
        await FileSystem.writeAsStringAsync(filePath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        savedFiles.push(filePath);
      }
    }

    return {
      success: true,
      message: `${savedFiles.length} JPG files saved!`,
      filePath: exportPath,
      fileName: `${title}_pages`,
    };
  } catch (error: any) {
    console.error("JPG export error:", error);
    return { success: false, message: `JPG export failed: ${error.message}` };
  }
};

const getWebBase64 = async (imageUrl: string): Promise<string> => {
  if (imageUrl.startsWith("data:image")) {
    return imageUrl.split(",")[1];
  }
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.readAsDataURL(blob);
  });
};

export const exportToZIP = async (
  pages: ComicPage[],
  title: string = "Comic"
): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      const zip = new JSZip();
      for (const page of pages) {
        const images = page.panelImages && page.panelImages.length > 0 ? page.panelImages : (page.imageUrl ? [page.imageUrl] : []);
        for (let i = 0; i < images.length; i++) {
          const base64Data = await getWebBase64(images[i]);
          const fileName = images.length > 1 
            ? `page_${page.pageNumber}_panel_${i + 1}.jpg`
            : `page_${page.pageNumber}.jpg`;
          zip.file(fileName, base64Data, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, message: "ZIP file downloaded!" };
    }

    const zip = new JSZip();
    for (const page of pages) {
      const images = page.panelImages && page.panelImages.length > 0 ? page.panelImages : (page.imageUrl ? [page.imageUrl] : []);
      for (let i = 0; i < images.length; i++) {
        const base64 = await getImageAsBase64(images[i]);
        const fileName = images.length > 1 
          ? `page_${page.pageNumber}_panel_${i + 1}.jpg`
          : `page_${page.pageNumber}.jpg`;
        zip.file(fileName, base64, { base64: true });
      }
    }

    const zipContent = await zip.generateAsync({ type: "base64" });
    const exportPath = getExportPath();
    await ensureDirectoryExists(exportPath);
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.zip`;
    const zipPath = `${exportPath}${fileName}`;

    await FileSystem.writeAsStringAsync(zipPath, zipContent, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      success: true,
      message: "ZIP file created successfully!",
      filePath: zipPath,
      fileName,
    };
  } catch (error: any) {
    console.error("ZIP export error:", error);
    return { success: false, message: `ZIP export failed: ${error.message}` };
  }
};

export const downloadToDevice = async (
  pages: ComicPage[],
  title: string = "Comic"
): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      return exportToJPG(pages, title);
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      return {
        success: false,
        message: "Permission denied. Please allow access to save images.",
      };
    }

    let savedCount = 0;
    const exportPath = getExportPath();
    await ensureDirectoryExists(exportPath);

    for (const page of pages) {
      const images = page.panelImages && page.panelImages.length > 0 ? page.panelImages : (page.imageUrl ? [page.imageUrl] : []);
      for (let i = 0; i < images.length; i++) {
        const fileName = images.length > 1
          ? `${title.replace(/[^a-zA-Z0-9]/g, "_")}_page_${page.pageNumber}_panel_${i + 1}.jpg`
          : `${title.replace(/[^a-zA-Z0-9]/g, "_")}_page_${page.pageNumber}.jpg`;
        const filePath = `${exportPath}${fileName}`;
        const base64 = await getImageAsBase64(images[i]);
        await FileSystem.writeAsStringAsync(filePath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await MediaLibrary.saveToLibraryAsync(filePath);
        savedCount++;
      }
    }

    const albumName = "AIStoriz Comics";
    try {
      let album = await MediaLibrary.getAlbumAsync(albumName);
      if (!album) {
        const assets = await MediaLibrary.getAssetsAsync({ first: 1, sortBy: MediaLibrary.SortBy.creationTime });
        if (assets.assets.length > 0) {
          album = await MediaLibrary.createAlbumAsync(albumName, assets.assets[0], false);
        }
      }
    } catch (albumError) {
      console.log("Album creation optional:", albumError);
    }

    return {
      success: true,
      message: `${savedCount} images saved to Photos and ${exportPath}`,
      filePath: exportPath,
    };
  } catch (error: any) {
    console.error("Download error:", error);
    return { success: false, message: `Download failed: ${error.message}` };
  }
};

export const shareFile = async (
  filePath: string,
  mimeType: string = "application/octet-stream"
): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      return { success: false, message: "File sharing not supported on web." };
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, message: "Sharing is not available on this device." };
    }

    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle: "Share your comic",
    });

    return { success: true, message: "Shared successfully!" };
  } catch (error: any) {
    console.error("Share error:", error);
    return { success: false, message: `Share failed: ${error.message}` };
  }
};

export const sharePDF = async (pages: ComicPage[], title: string): Promise<ExportResult> => {
  const pdfResult = await exportToPDF(pages, title);
  if (!pdfResult.success || !pdfResult.filePath) {
    return pdfResult;
  }
  return shareFile(pdfResult.filePath, "application/pdf");
};

export const shareSingleJPG = async (
  imageUrl: string,
  pageNumber: number
): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      if (navigator.share) {
        await navigator.share({
          title: `Comic Page ${pageNumber}`,
          text: "Check out this comic page!",
        });
        return { success: true, message: "Shared!" };
      }
      return { success: false, message: "Sharing not supported in this browser." };
    }

    const base64 = await getImageAsBase64(imageUrl);
    const tempPath = `${FileSystem.cacheDirectory}share_page_${pageNumber}.jpg`;
    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return shareFile(tempPath, "image/jpeg");
  } catch (error: any) {
    console.error("Share single JPG error:", error);
    return { success: false, message: `Share failed: ${error.message}` };
  }
};

export const shareZIP = async (pages: ComicPage[], title: string): Promise<ExportResult> => {
  const zipResult = await exportToZIP(pages, title);
  if (!zipResult.success || !zipResult.filePath) {
    return zipResult;
  }
  return shareFile(zipResult.filePath, "application/zip");
};

export const getExportDirectory = (): string => {
  return getExportPath();
};
