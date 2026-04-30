import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "@react-navigation/elements";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { ComicBackground } from "@/components/ComicBackground";

const GENDER_OPTIONS = [
  { value: "male", label: "Male", icon: "user" },
  { value: "female", label: "Female", icon: "user" },
  { value: "neutral", label: "Don't Specify", icon: "smile" },
];

export default function AddCharacterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { token } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton onPress={() => navigation.goBack()}>
          <ThemedText type="body" style={{ color: theme.primary }}>
            Cancel
          </ThemedText>
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton
          onPress={handleSave}
          disabled={!name.trim() || !gender}
        >
          <ThemedText
            type="body"
            style={{
              color: name.trim() && gender ? theme.primary : theme.placeholder,
              fontFamily: "Nunito_700Bold",
            }}
          >
            Done
          </ThemedText>
        </HeaderButton>
      ),
    });
  }, [navigation, name, gender, imageUri]);

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos to add a character image."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !gender) {
      Alert.alert("Missing Info", "Please enter a name and select a type.");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Save to database API
      const response = await fetch(new URL("/api/characters", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          photoUri: imageUri || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save character to server");
      }

      const { character } = await response.json();
      
      // Store the newly added character ID for auto-selection
      await AsyncStorage.setItem("newlyAddedCharacterId", character.id.toString());

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error saving character:", error);
      Alert.alert("Error", "Failed to save character. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ComicBackground>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={handlePickImage}
          style={({ pressed }) => [
            styles.photoUpload,
            {
              borderColor: imageUri ? theme.primary : theme.border,
              backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault,
            },
          ]}
          testID="button-pick-image"
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoImage} resizeMode="contain" />
          ) : (
            <>
              <View style={[styles.cameraIcon, { backgroundColor: theme.primary }]}>
                <Feather name="camera" size={32} color="#FFF" />
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                Tap to add photo
              </ThemedText>
            </>
          )}
          {imageUri ? (
            <View style={[styles.photoCheck, { backgroundColor: theme.primary }]}>
              <Feather name="check" size={16} color="#FFF" />
            </View>
          ) : null}
        </Pressable>

        <ThemedText type="h3" style={styles.label}>
          Character Type
        </ThemedText>
        <View style={styles.genderContainer}>
          {GENDER_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGender(option.value);
              }}
              style={[
                styles.genderOption,
                {
                  borderColor: gender === option.value ? theme.primary : theme.border,
                  backgroundColor: gender === option.value
                    ? theme.backgroundSecondary
                    : theme.backgroundDefault,
                },
                gender === option.value ? Shadows.card : undefined,
              ]}
              testID={`button-gender-${option.value}`}
            >
              {gender === option.value ? (
                <View style={[styles.genderCheck, { backgroundColor: theme.primary }]}>
                  <Feather name="check" size={10} color="#FFF" />
                </View>
              ) : null}
              <Image
                source={require("../../assets/images/default-avatar.png")}
                style={styles.genderImage}
                resizeMode="cover"
              />
              <ThemedText
                type="caption"
                style={{ color: gender === option.value ? theme.primary : theme.text }}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="h3" style={styles.label}>
          Character Name
        </ThemedText>
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Enter Character Name"
          placeholderTextColor={theme.placeholder}
          value={name}
          onChangeText={setName}
          maxLength={100}
          testID="input-character-name"
        />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, textAlign: "right", marginTop: Spacing.xs }}
        >
          {name.length}/100
        </ThemedText>

        <ThemedText type="h3" style={[styles.label, { marginTop: Spacing.xl }]}>
          Appearance (Important!)
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}
        >
          Describe how this character looks so AI can draw them correctly
        </ThemedText>
        <TextInput
          style={[
            styles.descriptionInput,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="e.g., Young girl with long red hair, green eyes, wearing a blue dress and white sneakers"
          placeholderTextColor={theme.placeholder}
          value={description}
          onChangeText={setDescription}
          maxLength={300}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          testID="input-character-description"
        />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, textAlign: "right", marginTop: Spacing.xs }}
        >
          {description.length}/300
        </ThemedText>

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleSave}
            disabled={!name.trim() || !gender}
            testID="button-add-character"
          >
            Add Character
          </Button>
        </View>
      </ScrollView>
    </ComicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  photoUpload: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderStyle: "dashed",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  cameraIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  photoCheck: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginBottom: Spacing.md,
  },
  genderContainer: {
    flexDirection: "row",
    marginBottom: Spacing["2xl"],
  },
  genderOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginHorizontal: Spacing.xs,
  },
  genderImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: Spacing.sm,
  },
  genderCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  nameInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
  },
  descriptionInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: "auto",
  },
});
