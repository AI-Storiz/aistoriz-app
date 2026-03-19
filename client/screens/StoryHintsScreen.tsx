import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const COLORS = {
  bg: "#E5E7EB",
  card: "#F9FAFB",
  accent: "#0EA5E9",
  text: "#1F2937",
  dim: "#6B7280",
  green: "#10B981",
  orange: "#F59E0B",
  purple: "#8B5CF6",
};

interface HintSectionProps {
  icon: string;
  iconColor: string;
  number: string;
  title: string;
  children: React.ReactNode;
  delay: number;
}

function HintSection({ icon, iconColor, number, title, children, delay }: HintSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        style={styles.sectionCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconCircle, { backgroundColor: `${iconColor}15` }]}>
            <Feather name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionNumber}>STEP {number}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.dim}
          />
        </View>
        {expanded ? (
          <View style={styles.sectionBody}>
            {children}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <Feather name="check-circle" size={16} color={COLORS.green} style={styles.tipIcon} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

function BadExample({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <Feather name="x-circle" size={16} color="#EF4444" style={styles.tipIcon} />
      <Text style={[styles.tipText, { color: "#EF4444" }]}>{text}</Text>
    </View>
  );
}

function GoodExample({ text }: { text: string }) {
  return (
    <View style={styles.tipRow}>
      <Feather name="check-circle" size={16} color={COLORS.green} style={styles.tipIcon} />
      <Text style={[styles.tipText, { color: COLORS.green }]}>{text}</Text>
    </View>
  );
}

function SectionNote({ text }: { text: string }) {
  return (
    <View style={styles.noteBox}>
      <Feather name="info" size={16} color={COLORS.accent} />
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

export default function StoryHintsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={styles.introText}>
            Learn how to create amazing comics from start to finish. Follow these steps and tips to get the best results every time.
          </Text>
        </Animated.View>

        <HintSection
          icon="user-plus"
          iconColor={COLORS.accent}
          number="1"
          title="Creating Characters"
          delay={50}
        >
          <Text style={styles.bodyText}>
            Characters are the heart of your comic. Creating good characters leads to better, more consistent stories.
          </Text>
          <Text style={styles.subHeading}>Uploading Character Photos</Text>
          <Tip text="Use clear, well-lit photos with the face clearly visible" />
          <Tip text="Choose photos with simple backgrounds (solid wall, plain sky)" />
          <Tip text="Front-facing or 3/4 angle photos work best" />
          <Tip text="One person per photo for best results" />
          <BadExample text="Blurry, dark, or group photos" />
          <BadExample text="Photos with busy backgrounds or sunglasses" />

          <Text style={styles.subHeading}>Naming Your Characters</Text>
          <Tip text="Use short, distinct names that are easy to tell apart" />
          <Tip text="Avoid names that sound too similar (e.g., Sam and Stan)" />

          <Text style={styles.subHeading}>Character Descriptions</Text>
          <Tip text="Add a brief description to help the AI understand your character" />
          <GoodExample text='"A brave young knight who is always optimistic"' />
          <GoodExample text='"A wise old wizard with a mysterious past"' />
          <BadExample text="Leaving the description blank" />
          <SectionNote text="You can save characters to reuse them across multiple comics!" />
        </HintSection>

        <HintSection
          icon="edit-3"
          iconColor={COLORS.purple}
          number="2"
          title="Writing Great Story Prompts"
          delay={100}
        >
          <Text style={styles.bodyText}>
            Your story prompt is the most important input. The better your prompt, the better your comic will be.
          </Text>

          <Text style={styles.subHeading}>Be Specific About the Setting</Text>
          <Tip text="Tell the AI where and when the story takes place" />
          <GoodExample text='"In a futuristic underwater city where humans live in glass domes"' />
          <BadExample text='"In a city"' />

          <Text style={styles.subHeading}>Include Conflict or a Problem</Text>
          <Tip text="Every good story needs a challenge the characters must overcome" />
          <GoodExample text={'"A thief steals the village\'s only source of clean water, and two friends must track them down through a dangerous forest"'} />
          <BadExample text='"Two friends go on an adventure"' />

          <Text style={styles.subHeading}>Use Action Words</Text>
          <Tip text='Use verbs like "battles", "discovers", "escapes", "rescues", "builds"' />
          <Tip text="Action words create more dynamic and exciting comics" />
          <GoodExample text='"Luna discovers a hidden portal and battles shadow creatures to save her brother"' />
          <BadExample text='"Luna finds something and things happen"' />

          <Text style={styles.subHeading}>Mention Emotions and Motivations</Text>
          <Tip text="Tell the AI WHY your characters do what they do" />
          <GoodExample text='"Driven by guilt over losing his sister, Max searches the haunted ruins alone"' />
          <BadExample text='"Max goes to some ruins"' />

          <Text style={styles.subHeading}>Suggest the Ending</Text>
          <Tip text="Hint at how you want the story to wrap up" />
          <GoodExample text='"In the end, they realize the real treasure was the bond they built along the way"' />
          <Tip text="You can request a happy ending, a twist, or a cliffhanger" />

          <Text style={styles.subHeading}>Prompt Length Sweet Spot</Text>
          <Tip text="2-4 sentences is ideal: enough detail without overwhelming the AI" />
          <Tip text="Too short = vague, generic story. Too long = AI may ignore parts" />

          <SectionNote text="Think of your prompt as a movie pitch: Who are the characters? What's the problem? What makes it exciting?" />
        </HintSection>

        <HintSection
          icon="layers"
          iconColor={COLORS.orange}
          number="3"
          title="Choosing the Right Art Style"
          delay={150}
        >
          <Text style={styles.bodyText}>
            Each art style gives your comic a completely different look and feel. Choose one that matches your story's mood.
          </Text>
          <Tip text="Comic - Classic bold lines and bright colors. Great for superhero and action stories" />
          <Tip text="Manga - Japanese-inspired style. Perfect for dramatic, emotional, or fantasy stories" />
          <Tip text="Watercolor - Soft, painterly look. Best for calm, dreamy, or nature stories" />
          <Tip text="Pixel Art - Retro 8-bit video game look. Fun for gaming or adventure themes" />
          <Tip text="3D Render - Modern CGI-like visuals. Great for sci-fi and futuristic stories" />
          <Tip text="Pop Art - Bold, colorful Andy Warhol style. Great for fun, lighthearted stories" />
          <Tip text="Noir - Dark, moody black and white. Perfect for mystery and detective stories" />
          <Tip text="Fantasy - Rich, detailed illustration style. Ideal for magical worlds and epic quests" />
          <SectionNote text="Some art styles are premium and require a subscription to unlock." />
        </HintSection>

        <HintSection
          icon="book-open"
          iconColor="#EC4899"
          number="4"
          title="Picking the Right Page Count"
          delay={200}
        >
          <Text style={styles.bodyText}>
            The number of pages affects how your story is paced. More pages means more detail and buildup.
          </Text>
          <Tip text="3 pages - Quick, punchy stories. Good for simple jokes or one action scene" />
          <Tip text="4 pages - Short stories with a beginning, conflict, and resolution" />
          <Tip text="5 pages - Full story arc with room for character development and buildup" />
          <Tip text="6-8 pages - Extended stories with deeper plots and multiple twists" />
          <SectionNote text="5 pages is the sweet spot for most stories. It gives the AI enough room to build tension and deliver a satisfying ending." />

          <Text style={styles.subHeading}>Credits Cost</Text>
          <Tip text="Base cost: 50 credits for the first page" />
          <Tip text="Each additional page: +15 credits" />
          <Tip text="Example: A 5-page comic costs 50 + (4 x 15) = 110 credits" />
        </HintSection>

        <HintSection
          icon="zap"
          iconColor={COLORS.accent}
          number="5"
          title="Generating Your Comic"
          delay={250}
        >
          <Text style={styles.bodyText}>
            Once you've set up your characters, prompt, style, and page count, hit the Generate button and wait for the magic.
          </Text>
          <Tip text="Generation usually takes 1-3 minutes depending on page count" />
          <Tip text="Don't close the app while generating - progress is tracked in real time" />
          <Tip text="If generation fails, your credits are usually refunded automatically" />
          <Tip text="You'll see a progress bar showing each stage of the creation process" />
          <SectionNote text="If your comic doesn't turn out as expected, try tweaking your prompt and regenerating. Small changes in wording can lead to very different results!" />
        </HintSection>

        <HintSection
          icon="download"
          iconColor={COLORS.green}
          number="6"
          title="Exporting and Sharing"
          delay={300}
        >
          <Text style={styles.bodyText}>
            Once your comic is ready, you have several ways to save and share it.
          </Text>
          <Tip text="Save as PDF - Creates a multi-page PDF document of your entire comic" />
          <Tip text="Save as Images - Downloads each page as a separate JPG file" />
          <Tip text="Save as ZIP - Bundles all pages into a single ZIP archive" />
          <Tip text="Share - Use your device's native share sheet to send to friends, social media, or messaging apps" />
          <SectionNote text="All exported comics include your art style and are in high resolution, ready for printing or posting online." />
        </HintSection>

        <HintSection
          icon="hexagon"
          iconColor={COLORS.orange}
          number="7"
          title="Credits and Plans"
          delay={350}
        >
          <Text style={styles.bodyText}>
            Credits are the currency used to generate comics. Here's how they work.
          </Text>
          <Tip text="New accounts start with 50 free credits" />
          <Tip text="Each comic costs credits based on page count (50 base + 15 per extra page)" />
          <Tip text="Watch rewarded video ads to earn free credits" />
          <Tip text="Refer friends to earn bonus credits for both of you" />
          <Tip text="Subscribe to a Weekly or Yearly plan for regular credit top-ups" />
          <SectionNote text="Check the Credits section on your Profile page to see your current balance and purchase options." />
        </HintSection>

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <View style={styles.proTipsCard}>
            <View style={styles.proTipsHeader}>
              <Feather name="star" size={20} color={COLORS.orange} />
              <Text style={styles.proTipsTitle}>Pro Tips for Amazing Comics</Text>
            </View>
            <Tip text="Start simple - your first comic can be 3 pages to get the hang of it" />
            <Tip text="Experiment with different art styles for the same story to see what looks best" />
            <Tip text="Name your characters after real people for a fun, personalized touch" />
            <Tip text="Include a villain or antagonist - conflict makes stories exciting" />
            <Tip text="Add environmental details in your prompt (weather, time of day, landmarks)" />
            <Tip text="Try different genres: superhero, mystery, romance, sci-fi, fantasy, comedy" />
            <Tip text="Read your generated comic and use it as inspiration for a sequel prompt" />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
  },
  introText: {
    fontSize: 15,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  sectionNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.dim,
    letterSpacing: 1,
    fontFamily: "Nunito_700Bold",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
    marginTop: 2,
  },
  sectionBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.bg,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: "Nunito_400Regular",
    lineHeight: 21,
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
    marginTop: 14,
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingRight: 8,
  },
  tipIcon: {
    marginTop: 2,
    marginRight: 10,
    flexShrink: 0,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: "Nunito_400Regular",
    lineHeight: 20,
    flex: 1,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${COLORS.accent}10`,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.accent,
    fontFamily: "Nunito_400Regular",
    lineHeight: 19,
    flex: 1,
  },
  proTipsCard: {
    backgroundColor: `${COLORS.orange}10`,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  proTipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  proTipsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
});
