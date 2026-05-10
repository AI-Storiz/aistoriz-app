import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Platform, Alert } from "react-native";
import JSZip from "jszip";
import { getApiUrl } from "./query-client";

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

const uniqueCacheFile = (prefix: string, ext: string) =>
  `${FileSystem.cacheDirectory}${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;

/**
 * Comic image URLs often carry `?token=`; RN fetch is more reliable with Bearer as well.
 * On web, we don't need auth headers because the proxy API handles authentication.
 */
function buildImageFetchHeaders(url: string): Record<string, string> {
  if (Platform.OS === "web") {
    return {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    };
  }

  const headers: Record<string, string> = {
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };
  try {
    const u = new URL(url);
    const tok = u.searchParams.get("token");
    if (tok) {
      headers.Authorization = `Bearer ${tok}`;
    }
  } catch {
    /* non-absolute URL — leave without Authorization */
  }
  return headers;
}

/** Non-empty panel image URLs with dialogue rows kept in sync (skips blank slots that 404). */
function getPanelImagesForExport(page: ComicPage): { urls: string[]; panels?: PanelData[] } {
  const raw = page.panelImages;
  if (!raw?.length) return { urls: [] };
  const entries = raw
    .map((img, i) => ({ url: (img || "").trim(), panel: page.panels?.[i] }))
    .filter((e) => e.url.length > 0);
  if (!entries.length) return { urls: [] };
  return {
    urls: entries.map((e) => e.url),
    panels: entries.map((e) => e.panel ?? {}),
  };
}

/** Ordered image URLs for this page (panels if any non-empty, else main imageUrl). */
function getFlatImageUrlsForExport(page: ComicPage): string[] {
  const { urls } = getPanelImagesForExport(page);
  if (urls.length > 0) return urls;
  const main = (page.imageUrl || "").trim();
  return main ? [main] : [];
}

/** expo-print sometimes returns a relative path; moveAsync needs a real file:// URI. */
const normalizeLocalFileUri = (uri: string): string => {
  const u = uri.trim();
  if (u.startsWith("file://")) return u;
  if (u.startsWith("/")) return `file://${u}`;
  const base = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  if (!base) return u;
  return `${base}${u.replace(/^\.\//, "")}`;
};

/**
 * Resolve any supported image reference to a full data:image/...;base64,... URL
 * (correct MIME for http(s) so PDF/WebView rendering is reliable).
 */
const getImageAsDataUrl = async (imageUrl: string): Promise<string> => {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    throw new Error("Empty image URL");
  }

  if (trimmed.startsWith("data:image")) {
    return trimmed;
  }

  if (
    trimmed.startsWith("file://") ||
    (FileSystem.documentDirectory && trimmed.startsWith(FileSystem.documentDirectory)) ||
    (FileSystem.cacheDirectory && trimmed.startsWith(FileSystem.cacheDirectory))
  ) {
    const content = await FileSystem.readAsStringAsync(trimmed, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!content) throw new Error("Could not read local image file");
    return `data:image/jpeg;base64,${content}`;
  }

  const response = await fetch(trimmed, { headers: buildImageFetchHeaders(trimmed) });
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status})`);
  }

  const blob = await response.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const r = reader.result;
      if (typeof r === "string") resolve(r);
      else reject(new Error("FileReader did not return a string"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });

  if (!dataUrl.startsWith("data:image") || !dataUrl.includes("base64,")) {
    throw new Error("Downloaded file was not a recognizable image");
  }
  return dataUrl;
};

/**
 * Raw base64 payload (no data: prefix) for ZIP / file writes.
 */
const getImageAsBase64 = async (imageUrl: string): Promise<string> => {
  const dataUrl = await getImageAsDataUrl(imageUrl);
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Invalid data image URI");
  return dataUrl.slice(comma + 1).replace(/\s/g, "");
};

/** Try URLs in order; only retries when download fails with HTTP 404 (e.g. empty first panel slot). */
const getImageAsBase64WithFallbacks = async (candidates: string[]): Promise<string> => {
  const seen = new Set<string>();
  const list = candidates
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !seen.has(c) && (seen.add(c), true));

  if (list.length === 0) {
    throw new Error("No image URL to download");
  }

  let lastError: Error | null = null;
  for (const url of list) {
    try {
      return await getImageAsBase64(url);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      lastError = err;
      if (err.message.includes("(404)") || err.message.includes(" 404")) {
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error("Image download failed");
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
  const dataUrlPromises = panelImages.map((img) => getImageAsDataUrl(img));
  const dataUrls = await Promise.all(dataUrlPromises);

  let gridStyle = "";
  let panelHtml = "";

  const createPanelWithBubble = (dataUrl: string, index: number, gridSpan?: string): string => {
    const dialogue = panels?.[index]?.dialogue || "";
    const bubbleHtml = generateSpeechBubbleHtml(dialogue);
    const spanStyle = gridSpan ? `grid-column: ${gridSpan};` : "";

    return `
      <div style="position: relative; overflow: hidden; border-radius: 8px; background: #f0f0f0; ${spanStyle}">
        <img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
        ${bubbleHtml}
      </div>
    `;
  };

  if (panelCount === 1) {
    gridStyle = "display: flex; justify-content: center; align-items: center; height: 100%;";
    const dialogue = panels?.[0]?.dialogue || "";
    const bubbleHtml = generateSpeechBubbleHtml(dialogue);
    panelHtml = `
      <div style="position: relative; max-width: 100%; max-height: 100%;">
        <img src="${dataUrls[0]}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" />
        ${bubbleHtml}
      </div>
    `;
  } else if (panelCount === 2) {
    gridStyle = "display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 100%;";
    panelHtml = dataUrls.map((du, idx) => createPanelWithBubble(du, idx)).join("");
  } else if (panelCount === 3) {
    gridStyle = "display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; height: 100%;";
    panelHtml = `
      ${createPanelWithBubble(dataUrls[0], 0, "1 / 3")}
      ${createPanelWithBubble(dataUrls[1], 1)}
      ${createPanelWithBubble(dataUrls[2], 2)}
    `;
  } else {
    gridStyle = "display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; height: 100%;";
    panelHtml = dataUrls.slice(0, 4).map((du, idx) => createPanelWithBubble(du, idx)).join("");
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
    if (pages.length === 0) {
      return { success: false, message: "No pages to export." };
    }

    if (Platform.OS === "web") {
      // On web, use jspdf to generate PDF directly
      try {
        // Dynamically import jspdf (only loads on web)
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: 'a4',
          compress: true,
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);

        let isFirstPage = true;

        for (const page of pages) {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          // Add page label
          const pageLabel = page.pageType === 'cover' ? 'Cover' : page.pageType === 'conclusion' ? 'Conclusion' : `Page ${page.pageNumber}`;
          pdf.setFontSize(12);
          pdf.setTextColor(100, 100, 100);
          pdf.text(pageLabel, margin, margin - 10);

          // Get all images for this page
          const images = getFlatImageUrlsForExport(page);
          if (images.length === 0 && page.imageUrl?.trim()) {
            images.push(page.imageUrl.trim());
          }

          if (images.length === 0) {
            continue;
          }

          // Convert first image to data URL and add to PDF
          try {
            const dataUrl = await getImageAsDataUrl(images[0]);

            // Calculate dimensions to fit within content area while maintaining aspect ratio
            const img = new window.Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = dataUrl;
            });

            const aspectRatio = img.width / img.height;
            let imgWidth = contentWidth;
            let imgHeight = contentWidth / aspectRatio;

            // If height exceeds content area, scale by height instead
            if (imgHeight > contentHeight) {
              imgHeight = contentHeight;
              imgWidth = contentHeight * aspectRatio;
            }

            // Center the image
            const xPos = margin + (contentWidth - imgWidth) / 2;
            const yPos = margin;

            pdf.addImage(dataUrl, 'JPEG', xPos, yPos, imgWidth, imgHeight);
          } catch (imgError) {
            console.error(`Failed to add image for page ${page.pageNumber}:`, imgError);
          }
        }

        // Save the PDF
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        return {
          success: true,
          message: "PDF downloaded successfully! Check your Downloads folder.",
        };
      } catch (error: any) {
        console.error("Web PDF generation error:", error);
        return {
          success: false,
          message: `PDF generation failed: ${error.message}`,
        };
      }
    }

    // Mobile: Generate HTML and use Print API
    const imageHtmlPromises = pages.map(async (page) => {
      const pageLabel = page.pageType === 'cover' ? 'Cover' : page.pageType === 'conclusion' ? 'Conclusion' : `Page ${page.pageNumber}`;

      let contentHtml = '';

      const { urls: panelUrls, panels: panelRows } = getPanelImagesForExport(page);
      if (panelUrls.length > 0) {
        contentHtml = await generatePanelGridHtml(panelUrls, page.pageType, title, panelRows);
      } else if (page.imageUrl?.trim()) {
        const dataUrl = await getImageAsDataUrl(page.imageUrl.trim());
        const dialogue = page.scenes?.dialogue || "";
        const bubbleHtml = dialogue ? generateSpeechBubbleHtml(dialogue) : "";
        contentHtml = `
          <div style="position: relative; max-width: 100%; max-height: 100%;">
            <img src="${dataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;" />
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

    // Mobile: Save PDF to file system
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
    const exportPath = getExportPath();
    await ensureDirectoryExists(exportPath);
    const destinationUri = `${exportPath}${fileName}`;

    const pdfSourceUri = normalizeLocalFileUri(uri);
    await FileSystem.moveAsync({
      from: pdfSourceUri,
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
      // On web, trigger browser downloads for each image by fetching as blob first
      let downloadCount = 0;
      let failedCount = 0;

      for (const page of pages) {
        const images = getFlatImageUrlsForExport(page);
        for (let i = 0; i < images.length; i++) {
          try {
            // Fetch the image as a blob to avoid cross-origin issues
            const response = await fetch(images[i], {
              mode: 'cors',
              credentials: 'include',
            });

            if (!response.ok) {
              console.error(`Failed to fetch image: ${response.status}`);
              failedCount++;
              continue;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            const fileName = images.length > 1
              ? `${title}_page_${page.pageNumber}_panel_${i + 1}.jpg`
              : `${title}_page_${page.pageNumber}.jpg`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the object URL after a short delay
            setTimeout(() => URL.revokeObjectURL(url), 100);

            downloadCount++;

            // Small delay between downloads to avoid browser blocking
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Failed to download image:`, error);
            failedCount++;
          }
        }
      }

      if (downloadCount === 0) {
        return { success: false, message: "Failed to download any images. Please try again." };
      }

      const message = failedCount > 0
        ? `${downloadCount} image${downloadCount !== 1 ? 's' : ''} downloaded. ${failedCount} failed. Check your Downloads folder.`
        : `${downloadCount} image${downloadCount !== 1 ? 's' : ''} downloaded. Check your Downloads folder.`;

      return { success: true, message };
    }

    const exportPath = getExportPath();
    await ensureDirectoryExists(exportPath);

    const savedFiles: string[] = [];
    for (const page of pages) {
      const images = getFlatImageUrlsForExport(page);
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

  // Try to fetch the image as blob first (works better with CORS)
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  } catch (fetchError) {
    // Fallback: try with image element (won't work with CORS but worth trying)
    console.warn("Fetch failed, trying image element:", fetchError);
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      // Don't set crossOrigin to avoid CORS preflight for same-origin images

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL("image/jpeg", 0.95);
          const base64 = dataURL.split(",")[1];
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });
  }
};

export const exportToZIP = async (
  pages: ComicPage[],
  title: string = "Comic"
): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      console.log("[ZIP] Starting ZIP export for", pages.length, "pages");
      const zip = new JSZip();
      let successCount = 0;
      let failedCount = 0;

      for (const page of pages) {
        const images = getFlatImageUrlsForExport(page);
        console.log(`[ZIP] Page ${page.pageNumber}: Found ${images.length} images`);

        for (let i = 0; i < images.length; i++) {
          try {
            console.log(`[ZIP] Fetching image: ${images[i]}`);
            const base64Data = await getWebBase64(images[i]);
            const fileName = images.length > 1
              ? `page_${page.pageNumber}_panel_${i + 1}.jpg`
              : `page_${page.pageNumber}.jpg`;
            zip.file(fileName, base64Data, { base64: true });
            successCount++;
            console.log(`[ZIP] Successfully added ${fileName}`);
          } catch (error) {
            console.error(`[ZIP] Failed to add image to ZIP: ${images[i]}`, error);
            failedCount++;
          }
        }
      }

      if (successCount === 0) {
        console.error("[ZIP] No images were added to ZIP");
        return {
          success: false,
          message: "Could not add any images to ZIP. Please check console for errors."
        };
      }

      console.log(`[ZIP] Generating ZIP file with ${successCount} images`);
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      const zipFileName = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.zip`;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);

      console.log(`[ZIP] ZIP file download triggered: ${zipFileName}`);

      const message = failedCount > 0
        ? `ZIP created with ${successCount} image${successCount !== 1 ? 's' : ''}. ${failedCount} image${failedCount !== 1 ? 's' : ''} could not be added. Check your Downloads folder.`
        : `ZIP file with ${successCount} image${successCount !== 1 ? 's' : ''} downloaded! Check your Downloads folder.`;

      return { success: true, message };
    }

    const zip = new JSZip();
    for (const page of pages) {
      const images = getFlatImageUrlsForExport(page);
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
      const images = getFlatImageUrlsForExport(page);
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

/**
 * Share one comic page as JPG, trying several image URLs when the first returns 404
 * (common when `panelImages[0]` points at an empty panel but `imageUrl` is the full-page `/panel/-1/` image).
 */
export const shareComicPageJPG = async (page: ComicPage): Promise<ExportResult> => {
  try {
    if (Platform.OS === "web") {
      // On web, download the page image directly instead of sharing
      const images = getFlatImageUrlsForExport(page);
      if (images.length === 0) {
        const mainImage = (page.imageUrl || "").trim();
        if (mainImage) {
          images.push(mainImage);
        }
      }

      if (images.length === 0) {
        return { success: false, message: "No image available to download." };
      }

      // Download each image by fetching as blob first
      let downloadCount = 0;
      for (let i = 0; i < images.length; i++) {
        try {
          // Fetch the image as a blob
          const response = await fetch(images[i], {
            mode: 'cors',
            credentials: 'include',
          });

          if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status}`);
            continue;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          const fileName = images.length > 1
            ? `page_${page.pageNumber}_panel_${i + 1}.jpg`
            : `page_${page.pageNumber}.jpg`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up the object URL after a short delay
          setTimeout(() => URL.revokeObjectURL(url), 100);

          downloadCount++;

          // Small delay between downloads
          if (i < images.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Failed to download image ${i}:`, error);
        }
      }

      if (downloadCount === 0) {
        return { success: false, message: "Failed to download images. Please try again." };
      }

      return {
        success: true,
        message: downloadCount > 1
          ? `${downloadCount} images downloaded. Check your Downloads folder.`
          : "Image downloaded. Check your Downloads folder."
      };
    }

    const candidates: string[] = [];
    const add = (u?: string) => {
      const t = (u || "").trim();
      if (t && !candidates.includes(t)) candidates.push(t);
    };

    for (const u of getFlatImageUrlsForExport(page)) add(u);
    add(page.imageUrl);
    if (page.panelImages) {
      for (const u of page.panelImages) add(u);
    }

    const base64 = await getImageAsBase64WithFallbacks(candidates);
    const tempPath = uniqueCacheFile(`share_page_${page.pageNumber}`, "jpg");
    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return shareFile(tempPath, "image/jpeg");
  } catch (error: any) {
    console.error("Share comic page JPG error:", error);
    return { success: false, message: `Share failed: ${error.message}` };
  }
};

export const shareSingleJPG = async (
  imageUrl: string,
  pageNumber: number
): Promise<ExportResult> => {
  return shareComicPageJPG({
    pageNumber,
    imageUrl,
  });
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
