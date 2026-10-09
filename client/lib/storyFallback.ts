export type StoryDialogue = { character: string; text: string };

export type StoryPage = {
  pageNumber: number;
  pageType?: string;
  narration: string;
  dialogues: StoryDialogue[];
};

export type FailedJobStory = {
  title?: string;
  pages: StoryPage[];
};

export type SavedPreviewPage = {
  pageNumber: number;
  imageUrl?: string;
  panelImages?: string[];
  pageType?: string;
  scenes?: { description: string; dialogue: string };
  panels?: Array<{ description: string; dialogue: string; cameraAngle?: string }>;
  generationMode?: string;
};

export type TextFallbackPage = {
  pageNumber: number;
  pageType?: "cover" | "body" | "conclusion";
  imageUrl: string;
  panelImages?: string[];
  narration: string;
  dialogues: StoryDialogue[];
  scenes: { description: string; dialogue: string };
  panels?: Array<{ description: string; dialogue: string; cameraAngle?: string }>;
  generationMode?: "multi-model" | "gemini-fullpage";
};

function hasDisplayImage(page: SavedPreviewPage | undefined): boolean {
  if (!page) return false;
  if (typeof page.imageUrl === "string" && page.imageUrl.trim()) return true;
  return Array.isArray(page.panelImages) && page.panelImages.some((image) => image.trim().length > 0);
}

function pageType(value: string | undefined): TextFallbackPage["pageType"] {
  if (value === "cover" || value === "body" || value === "conclusion") return value;
  return undefined;
}

/**
 * Pages the viewer can render after image generation failed.
 * A saved page with an image is kept. Pages with no image still carry narration and dialogue.
 * Returns null when there is no story text to show.
 */
export function previewPagesAfterImageFailure(
  story: FailedJobStory | null | undefined,
  savedPages: SavedPreviewPage[] | null | undefined,
): TextFallbackPage[] | null {
  if (!story || !Array.isArray(story.pages) || story.pages.length === 0) return null;
  const saved = Array.isArray(savedPages) ? savedPages : [];
  return story.pages.map((page) => {
    const imagePage = saved.find((candidate) => candidate.pageNumber === page.pageNumber);
    const dialogue = page.dialogues
      .map((line) => (line.character ? `${line.character}: ${line.text}` : line.text))
      .filter((line) => line.trim().length > 0)
      .join("\n");
    if (imagePage && hasDisplayImage(imagePage)) {
      return {
        pageNumber: page.pageNumber,
        pageType: pageType(imagePage.pageType ?? page.pageType),
        imageUrl: imagePage.imageUrl?.trim() || "",
        panelImages: imagePage.panelImages,
        narration: page.narration,
        dialogues: page.dialogues,
        scenes: imagePage.scenes ?? { description: page.narration, dialogue },
        panels: imagePage.panels,
        generationMode: imagePage.generationMode === "multi-model" || imagePage.generationMode === "gemini-fullpage"
          ? imagePage.generationMode
          : undefined,
      };
    }
    return {
      pageNumber: page.pageNumber,
      pageType: pageType(page.pageType),
      imageUrl: "",
      narration: page.narration,
      dialogues: page.dialogues,
      scenes: { description: page.narration, dialogue },
    };
  });
}
