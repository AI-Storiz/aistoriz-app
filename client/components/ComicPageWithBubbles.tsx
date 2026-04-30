import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { SpeechBubble, BubblePosition } from "./SpeechBubble";
import { BorderRadius, Spacing } from "@/constants/theme";
import { ThemedText } from "./ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { authedComicImageSource } from "@/lib/comicImageSource";

interface PageScenes {
  description: string;
  dialogue: string;
}

interface ComicPageWithBubblesProps {
  imageUrl: string;
  scenes?: PageScenes;
  containerWidth: number;
  containerHeight: number;
  pageNumber: number;
  totalPages?: number;
  isCover?: boolean;
  title?: string;
  onEditPress?: () => void;
  showEditButton?: boolean;
  borderColor?: string;
  backgroundColor?: string;
  hideBubbles?: boolean;
}

function determineBubblePlacement(
  pageNumber: number
): BubblePosition {
  const dialoguePositions: BubblePosition[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const dialogueIndex = pageNumber % dialoguePositions.length;
  return dialoguePositions[dialogueIndex];
}

function splitLongDialogue(dialogue: string): string[] {
  const MAX_SINGLE_LENGTH = 100;
  
  if (!dialogue || dialogue.length <= MAX_SINGLE_LENGTH) {
    return [dialogue];
  }

  const midpoint = Math.floor(dialogue.length / 2);
  let splitIndex = midpoint;

  for (let i = 0; i < 30; i++) {
    if (dialogue[midpoint + i] === " " || dialogue[midpoint + i] === ".") {
      splitIndex = midpoint + i + 1;
      break;
    }
    if (dialogue[midpoint - i] === " " || dialogue[midpoint - i] === ".") {
      splitIndex = midpoint - i + 1;
      break;
    }
  }

  return [
    dialogue.substring(0, splitIndex).trim(),
    dialogue.substring(splitIndex).trim()
  ].filter(s => s.length > 0);
}

function getSecondBubblePosition(firstPosition: BubblePosition): BubblePosition {
  const opposites: Record<BubblePosition, BubblePosition> = {
    "top-left": "bottom-right",
    "top-right": "bottom-left",
    "bottom-left": "top-right",
    "bottom-right": "top-left",
  };
  return opposites[firstPosition];
}

export function ComicPageWithBubbles({
  imageUrl,
  scenes,
  containerWidth,
  containerHeight,
  pageNumber,
  totalPages,
  isCover = false,
  title,
  onEditPress,
  showEditButton = false,
  borderColor = "#000000",
  backgroundColor = "#f5f5f5",
  hideBubbles = false,
}: ComicPageWithBubblesProps) {
  const { token } = useAuth();
  const dialogue = scenes?.dialogue || "";
  const resolvedSource = imageUrl?.trim() ? authedComicImageSource(imageUrl, token) : null;

  const dialoguePosition = determineBubblePlacement(pageNumber);

  const dialogueParts = splitLongDialogue(dialogue);
  const hasTwoBubbles = dialogueParts.length > 1;
  const showBubbles = !hideBubbles;

  const imageHeight = containerHeight;

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      <View style={[hideBubbles ? styles.outerBorderNone : styles.outerBorder, { borderColor: hideBubbles ? 'transparent' : borderColor }]}>
        {isCover && title && !hideBubbles ? (
          <View style={styles.coverTitleBar}>
            <ThemedText style={styles.coverTitleText} numberOfLines={2}>{title}</ThemedText>
          </View>
        ) : null}
        <View style={[styles.imageContainer, { backgroundColor, height: (isCover && title && !hideBubbles) ? undefined : imageHeight, flex: (isCover && title && !hideBubbles) ? 1 : undefined }]}>
          {resolvedSource ? (
            <View style={hideBubbles ? styles.imageInsetFull : styles.imageInset}>
              <Image
                source={resolvedSource}
                recyclingKey={imageUrl}
                style={styles.image}
                contentFit={hideBubbles ? "fill" : "cover"}
                cachePolicy="disk"
                transition={hideBubbles ? 0 : 200}
              />
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Feather name="image" size={48} color="#999" />
              <ThemedText style={styles.placeholderText}>
                Image could not be generated
              </ThemedText>
            </View>
          )}

          {showBubbles && dialogueParts[0] && !isCover ? (
            <SpeechBubble
              text={dialogueParts[0]}
              position={dialoguePosition}
              containerWidth={containerWidth}
              containerHeight={imageHeight}
            />
          ) : null}

          {showBubbles && hasTwoBubbles && dialogueParts[1] && !isCover ? (
            <SpeechBubble
              text={dialogueParts[1]}
              position={getSecondBubblePosition(dialoguePosition)}
              containerWidth={containerWidth}
              containerHeight={imageHeight}
            />
          ) : null}

          {showEditButton ? (
            <Pressable
              style={[styles.editButton, { borderColor }]}
              onPress={onEditPress}
              testID={`button-edit-page-${pageNumber}`}
            >
              <Feather name="edit-2" size={16} color="#000" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  outerBorder: {
    flex: 1,
    borderWidth: 3,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  outerBorderNone: {
    flex: 1,
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  imageContainer: {
    flex: 1,
    position: "relative",
  },
  imageInset: {
    flex: 1,
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  imageInsetFull: {
    flex: 1,
    padding: 0,
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: "100%",
    height: "100%",
  },
  editButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  coverTitleBar: {
    backgroundColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTitleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: '40%',
  },
});
