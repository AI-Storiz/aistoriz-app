import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { authedComicImageSource } from "@/lib/comicImageSource";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SpeechBubble } from "./SpeechBubble";

interface Panel {
  imageUrl: string;
  dialogue?: string;
  description?: string;
  cameraAngle?: string;
}

interface ComicPanelGridProps {
  panels: Panel[];
  containerWidth: number;
  pageType?: 'cover' | 'body' | 'conclusion';
  title?: string;
}

const PANEL_LAYOUTS: Record<number, { rows: number[][]; heights: number[] }> = {
  1: { rows: [[1]], heights: [1] },
  2: { rows: [[1], [1]], heights: [0.5, 0.5] },
  3: { rows: [[1], [0.5, 0.5]], heights: [0.55, 0.45] },
  4: { rows: [[0.5, 0.5], [0.5, 0.5]], heights: [0.5, 0.5] },
  5: { rows: [[1], [0.5, 0.5], [0.5, 0.5]], heights: [0.4, 0.3, 0.3] },
  6: { rows: [[0.5, 0.5], [0.33, 0.34, 0.33], [0.5, 0.5]], heights: [0.35, 0.3, 0.35] },
  7: { rows: [[0.5, 0.5], [0.33, 0.34, 0.33], [0.33, 0.34, 0.33]], heights: [0.35, 0.325, 0.325] },
  8: { rows: [[0.5, 0.5], [0.33, 0.34, 0.33], [0.33, 0.34, 0.33], [0.5, 0.5]], heights: [0.25, 0.25, 0.25, 0.25] },
};

const GUTTER_SIZE = 6;

export function ComicPanelGrid({ 
  panels, 
  containerWidth, 
  pageType, 
  title,
}: ComicPanelGridProps) {
  const { theme } = useTheme();
  const { token } = useAuth();
  const isCover = pageType === 'cover';
  const totalHeight = (containerWidth * 4) / 3 * 1.35;
  const contentHeight = totalHeight;
  
  if (panels.length === 0) {
    return (
      <View style={[styles.container, { width: containerWidth, height: totalHeight, backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText type="small" style={{ color: theme.placeholder }}>No panels</ThemedText>
      </View>
    );
  }
  
  if (isCover && panels.length === 1) {
    return (
      <View style={[styles.container, { width: containerWidth, height: totalHeight }]}>
        <View style={styles.outerBorder}>
          {title ? (
            <View style={styles.coverTitleBar}>
              <ThemedText style={styles.coverTitleText} numberOfLines={2}>{title}</ThemedText>
            </View>
          ) : null}
          <View style={styles.coverImageInset}>
            <Image
              source={authedComicImageSource(panels[0].imageUrl, token)}
              recyclingKey={panels[0].imageUrl}
              style={styles.coverImageFill}
              contentFit="cover"
              cachePolicy="disk"
              transition={0}
            />
          </View>
        </View>
      </View>
    );
  }
  
  const panelCount = Math.min(panels.length, 8);
  const layout = PANEL_LAYOUTS[panelCount] || PANEL_LAYOUTS[6];
  
  let panelIndex = 0;
  
  return (
    <View style={[styles.container, { width: containerWidth, height: totalHeight }]}>
      <View style={styles.outerBorder}>
        <View style={[styles.panelsContainer, { height: contentHeight - 4 }]}>
          {layout.rows.map((row, rowIndex) => {
            const rowHeight = (contentHeight - 4 - (layout.rows.length + 1) * GUTTER_SIZE) * layout.heights[rowIndex];
            return (
              <View 
                key={rowIndex} 
                style={[
                  styles.row, 
                  { 
                    height: rowHeight,
                    marginTop: rowIndex === 0 ? GUTTER_SIZE : 0,
                    marginBottom: GUTTER_SIZE,
                  }
                ]}
              >
                {row.map((widthRatio, colIndex) => {
                  const panel = panels[panelIndex];
                  const currentPanelIndex = panelIndex;
                  panelIndex++;
                  
                  if (!panel) return null;
                  
                  const panelWidth = (containerWidth - 6 - (row.length + 1) * GUTTER_SIZE) * widthRatio;
                  
                  return (
                    <View 
                      key={colIndex} 
                      style={[
                        styles.panelContainer, 
                        { 
                          width: panelWidth, 
                          height: rowHeight,
                          marginLeft: colIndex === 0 ? GUTTER_SIZE : 0,
                          marginRight: GUTTER_SIZE,
                        }
                      ]}
                    >
                      {panel.imageUrl ? (
                        <View style={styles.panelImageContainer}>
                          <Image
                            source={authedComicImageSource(panel.imageUrl, token)}
                            recyclingKey={panel.imageUrl}
                            style={styles.panelImage}
                            contentFit="cover"
                            cachePolicy="disk"
                            transition={0}
                          />
                        </View>
                      ) : (
                        <View style={[styles.placeholderPanel, { backgroundColor: theme.backgroundSecondary }]}>
                          <ThemedText type="small" style={{ color: theme.placeholder }}>Loading...</ThemedText>
                        </View>
                      )}
                      {panel.dialogue ? (
                        <View style={styles.dialogueOverlay}>
                          <View style={styles.speechBubble}>
                            <ThemedText type="small" style={styles.dialogueText} numberOfLines={3}>
                              {panel.dialogue}
                            </ThemedText>
                            <View style={styles.bubbleTail} />
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  outerBorder: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  panelsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
  },
  panelContainer: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  panelImageContainer: {
    flex: 1,
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  panelImage: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
  placeholderPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitleBar: {
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  coverTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  coverImageInset: {
    flex: 1,
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  coverImageFill: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  titleContainerTop: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  titleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    maxWidth: '40%',
    overflow: 'hidden',
  },
  titleText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  dialogueOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  dialogueText: {
    color: '#000',
    fontSize: 10,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'left',
  },
});
