import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { CharacterSelectionModal } from "@/components/CharacterSelectionModal";
import { ModalBackdrop } from "@/components/ModalBackdrop";
import FooterTextAd from "@/components/FooterTextAd";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface ArtStyleData {
  id: number;
  name: string;
  displayOrder: number;
  isPremium: boolean;
  unlockCost: number;
  isActive: boolean;
  isUnlocked: boolean;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Character {
  id: string;
  name: string;
  type: string;
  imageUri?: string;
  description?: string;
}

const COLORS = {
  bg: "#E5E7EB",
  card: "#F9FAFB",
  accent: "#0EA5E9",
  text: "#1F2937",
  dim: "#6B7280",
};

const STYLES = [
  { name: "Comic", image: require("../../assets/images/style-comic.png") },
  { name: "Manga", image: require("../../assets/images/style-manga.png") },
  { name: "Manhwa", image: require("../../assets/images/style-manhwa.png") },
  { name: "Graphic", image: require("../../assets/images/style-graphic.png") },
  { name: "Kawaii", image: require("../../assets/images/style-kawaii.png") },
  { name: "Noir", image: require("../../assets/images/style-noir.png") },
  { name: "Anime", image: require("../../assets/images/style-anime.png") },
  { name: "Afro", image: require("../../assets/images/style-afro.png") },
];

const INSPIRE_GENERIC: Record<string, string[]> = {
  Comic: [
    "A retired superhero is forced back into action when their arch-nemesis escapes from prison and threatens the city. But this time, the hero must team up with their villain's daughter to save the day.",
    "In a world where everyone has superpowers, one ordinary teenager discovers they're the only person immune to all abilities. When a power-stealing villain starts attacking, they become humanity's last hope.",
    "A group of unlikely heroes must save their neighborhood from an alien invasion that only they can see. Each of them holds a piece of a puzzle that could save the world.",
    "A cosmic storm grants random citizens incredible powers. As chaos erupts, one unlikely leader must rally these confused new heroes before a shadowy organization captures them all for experiments.",
  ],
  Manga: [
    "A high school student discovers they can enter the world inside their favorite manga. But changes they make there start affecting the real world in unexpected and dangerous ways.",
    "In a fantasy academy where students train to become summoners, a clumsy outcast accidentally bonds with the most powerful and grumpy ancient dragon spirit who just wants to sleep for another millennium.",
    "A young chef competes in a legendary cooking tournament where dishes come to life and battle. Their secret ingredient? Recipes passed down from their missing grandmother who was once a champion.",
    "A shy bookworm finds a cursed notebook that brings anything drawn in it to life. When their doodles start causing havoc across Tokyo, they must master their art skills to draw solutions before the city falls apart.",
  ],
  Manhwa: [
    "After being betrayed by their company, an office worker wakes up 10 years in the past with all their future knowledge. This time, they'll climb to the top of the corporate world and get revenge.",
    "A talented but poor art student becomes the secret tutor for a cold-hearted CEO's rebellious daughter. As they help her discover her passion for painting, unexpected feelings begin to bloom.",
    "The most popular idol in the country has a secret - at midnight, they transform into an ordinary person no one recognizes. That's when they meet someone who loves them for who they really are.",
    "A genius programmer accidentally creates an AI that can predict the future. When powerful corporations and governments come hunting for it, they must stay one step ahead while deciding humanity's fate.",
  ],
  Graphic: [
    "In a dystopian city controlled by corrupt mega-corporations, a disgraced detective discovers a conspiracy that goes all the way to the top. With nothing left to lose, they wage a one-person war against the system.",
    "A grizzled war veteran returns home to find their small town overrun by a mysterious cult. As they dig deeper, they uncover horrors that make the battlefield seem tame.",
    "In a world where memories can be extracted and sold, a memory thief discovers a stolen memory that reveals a government cover-up. Now every agency in the city wants them dead.",
    "A burned-out journalist receives an anonymous tip about a secret underground fighting ring where the city's elite gamble on life and death. Going undercover, they discover the fights are rigged by someone at the very top.",
  ],
  Kawaii: [
    "A tiny magical creature accidentally falls out of a rainbow and lands in a bakery. Now they must help the shy baker win the town's cupcake competition while trying to find their way back home!",
    "A clumsy cloud fairy keeps accidentally making it rain at the worst times. When the sun festival is threatened, they must learn to control their powers with help from their adorable animal friends.",
    "A group of baby animals run a secret cafe in the forest where they serve magical treats. But oh no! The grumpy old owl next door wants peace and quiet. Can they become friends?",
    "A little star falls from the sky into a magical garden where flowers can talk. The star must collect five rainbow petals before sunrise to fly back home, making adorable friends along the way!",
  ],
  Noir: [
    "A down-on-their-luck private eye takes one last case - finding a missing jazz singer in the rain-soaked streets of 1940s Los Angeles. But nothing is what it seems in this city of shadows.",
    "A femme fatale walks into a detective's office with a simple request: find her missing husband. But as the investigation deepens, the detective realizes they're being played in a deadly game.",
    "The city's most notorious crime boss is found dead in a locked room. Everyone has a motive, everyone has an alibi, and everyone is lying. One detective must cut through the darkness to find the truth.",
    "A crooked cop tries to go straight, but their past won't let them. When a cold case resurfaces with new evidence pointing to someone they protected, they must choose between loyalty and justice.",
  ],
  Anime: [
    "A transfer student discovers their new school is actually a secret training ground for magical warriors. When dark forces attack, they must unlock powers they never knew they had.",
    "Five strangers wake up in a mysterious tower with no memories. Each floor presents impossible challenges, but the biggest mystery is why they were chosen and what waits at the top.",
    "A talented musician loses their ability to hear music after an accident. When they meet a ghost who can only communicate through song, together they embark on a journey to heal both their souls.",
    "In a world where dreams are shared, a lonely dreamer discovers they can enter other people's nightmares and fight the monsters within. But each battle costs a piece of their own happy memories.",
  ],
  Afro: [
    "In a future where Africa leads the world in technology, a young inventor discovers their grandmother's ancient artifacts hold the key to stopping an alien invasion threatening Earth.",
    "A warrior princess from a hidden kingdom powered by vibranium-like crystals must venture into the outside world to recover stolen artifacts before they fall into the wrong hands.",
    "Three friends discover they are descendants of African gods and must master their ancestral powers to protect their city from a tech corporation trying to harness forbidden magic.",
    "A young griot discovers their storytelling voice can reshape reality. When an ancient darkness begins erasing history itself, they must journey across the spirit world to restore the stolen stories of their ancestors.",
  ],
};

const INSPIRE_WITH_NAMES: Record<string, Array<(names: string[]) => string>> = {
  Comic: [
    (n) => n.length === 1
      ? `After discovering a mysterious alien artifact, ${n[0]} gains incredible shape-shifting powers. But every transformation comes at a cost, and a secret government agency is closing in fast.`
      : n.length === 2
      ? `${n[0]}, a vigilante with super strength, crosses paths with ${n[1]}, a rogue hacker who can control machines with their mind. Forced into an uneasy alliance, they must stop a rampaging robot army before it levels the city.`
      : `${n[0]}, a fearless leader with invulnerability, must recruit ${n[1]}, a hothead who controls fire, and ${n[2]}, a mysterious loner who can turn invisible. Together this unlikely team faces a villain who can copy any superpower.`,
    (n) => n.length === 1
      ? `${n[0]} wakes up one morning with the power to stop time. At first it's fun, but when they discover frozen moments are being stolen by creatures from another dimension, the real battle begins.`
      : n.length === 2
      ? `Two heroes from different dimensions, ${n[0]} (with immense strength) and ${n[1]} (with psychic powers), find themselves trapped in a strange new reality. They must rely on their combined powers and growing bond to find a way home.`
      : `When a portal tears open above the city, ${n[0]} (super speed), ${n[1]} (energy shields), and ${n[2]} (telepathy) are the only ones who can close it. But the portal is guarded by dark versions of themselves from the other side.`,
    (n) => n.length === 1
      ? `Everyone thinks ${n[0]} is just an ordinary delivery driver. But at night, they don an armored suit and patrol the streets as the city's most wanted vigilante, hunted by both cops and criminals.`
      : n.length === 2
      ? `${n[0]}, a seasoned hero with flight abilities, takes ${n[1]}, a rookie with teleportation powers, under their wing. Their mentor-student bond is tested when a global threat forces them to make impossible sacrifices.`
      : `${n[0]}, the brains with tech-genius gadgets, ${n[1]}, the muscle with unbreakable skin, and ${n[2]}, the wildcard with reality-warping powers, form a secret squad. Their first mission: infiltrate a floating fortress before it launches a devastating attack.`,
    (n) => n.length === 1
      ? `${n[0]} inherits a dusty old comic book shop only to discover the basement holds a gateway to a universe where comic book villains are very real. Now they must become the hero the pages need.`
      : n.length === 2
      ? `${n[0]}, a street-level detective with enhanced senses, forms an uneasy alliance with ${n[1]}, a brilliant but aloof scientist who controls electricity. Together they uncover a city-wide conspiracy that runs deeper than either imagined.`
      : `A lab accident gives ${n[0]} the power of magnetism, ${n[1]} the ability to phase through walls, and ${n[2]} control over gravity. When the scientist responsible comes to reclaim those powers, they must fight together or lose everything.`,
  ],
  Manga: [
    (n) => n.length === 1
      ? `${n[0]} enrolls in a prestigious battle academy where students fight using spirit weapons. Ranked dead last, they discover a forbidden technique that could make them the strongest or destroy them completely.`
      : n.length === 2
      ? `${n[0]}, a disciplined sword fighter, is paired with ${n[1]}, a chaotic magic user, for the academy's deadly duo tournament. Despite clashing personalities, their opposite fighting styles create an unstoppable combination.`
      : `${n[0]}, a warrior with a cursed blade, ${n[1]}, a healer hiding immense destructive power, and ${n[2]}, a cunning tactician with illusion magic, form a guild. Their first quest uncovers an ancient evil that wiped out the previous generation of heroes.`,
    (n) => n.length === 1
      ? `After losing everything in a monster attack, ${n[0]} makes a contract with a mysterious fox spirit. In exchange for incredible power, they must complete seven impossible tasks before the next full moon.`
      : n.length === 2
      ? `${n[0]}, who can see spirits, meets ${n[1]}, a ghost who doesn't remember how they died. Together they investigate the mystery of ${n[1]}'s death, uncovering a supernatural conspiracy that threatens both the living and the dead.`
      : `In a school where students are ranked by magical power, ${n[0]} (fire mage, ranked last), ${n[1]} (ice mage, ranked first), and ${n[2]} (forbidden void mage, unranked) are forced into a team. A demon invasion makes them the academy's only hope.`,
    (n) => n.length === 1
      ? `${n[0]} discovers a hidden dungeon beneath their school that resets every night. Each floor holds incredible treasures and terrifying monsters. But someone else has been raiding it, and they'll kill to keep their secret.`
      : n.length === 2
      ? `${n[0]}, a bold adventurer with earth-shaking punches, teams up with ${n[1]}, a calm strategist who controls wind. They enter the world's most dangerous dungeon where no party has survived past floor fifty.`
      : `The legendary Three Star Guild is reborn when ${n[0]} (lightning speed), ${n[1]} (beast transformation), and ${n[2]} (time manipulation) discover they share a connected destiny. An ancient prophecy says only they can stop the Demon King's return.`,
    (n) => n.length === 1
      ? `${n[0]} is an ordinary student by day but transforms into a legendary masked fighter in underground tournaments at night. When a rival discovers their identity, their two worlds collide in explosive fashion.`
      : n.length === 2
      ? `${n[0]}, a proud samurai with lightning-fast reflexes, reluctantly partners with ${n[1]}, a mischievous thief who can manipulate shadows. A bounty on both their heads forces them to work together across treacherous lands.`
      : `When a dimensional rift unleashes monsters across the land, ${n[0]} (master swordsman), ${n[1]} (explosive magic caster), and ${n[2]} (shield-bearing guardian) must journey to seal it. Each carries a secret that could shatter the group's trust.`,
  ],
  Manhwa: [
    (n) => n.length === 1
      ? `After a near-death experience, ${n[0]} awakens with the ability to see quest windows and level up like in a video game. Starting from the weakest rank, they begin a ruthless climb to become the strongest hunter alive.`
      : n.length === 2
      ? `${n[0]}, a cold and calculating S-rank hunter, is forced to mentor ${n[1]}, an F-rank hunter with a mysterious hidden power. Their dynamic shifts when ${n[1]}'s abilities awaken during a catastrophic dungeon break.`
      : `The Hunter Association assigns ${n[0]} (S-rank tank), ${n[1]} (A-rank assassin), and ${n[2]} (B-rank healer with a dark secret) to clear a dungeon that has killed every team sent before them. Inside, they discover the dungeon is alive.`,
    (n) => n.length === 1
      ? `${n[0]} is reborn into the body of a disgraced noble in a fantasy world they read about in a novel. Knowing every plot twist and betrayal to come, they rewrite fate to become the kingdom's most powerful ruler.`
      : n.length === 2
      ? `${n[0]}, a ruthless CEO who controls the business world, and ${n[1]}, a fearless journalist determined to expose corruption, become entangled in a dangerous game of power where trust is the most expensive currency.`
      : `In a tower that grants wishes to whoever reaches the top, ${n[0]} (a warrior seeking revenge), ${n[1]} (a strategist seeking knowledge), and ${n[2]} (a wanderer seeking a lost loved one) form a fragile alliance. The tower tests their loyalty on every floor.`,
    (n) => n.length === 1
      ? `Everyone mocks ${n[0]} for being the weakest student at the magic academy. But when they accidentally absorb a forbidden artifact, they gain the power to devour and copy any spell they encounter.`
      : n.length === 2
      ? `${n[0]}, a noble knight sworn to protect the kingdom, discovers that ${n[1]}, the person they were ordered to execute, holds the only power capable of stopping the demon army. Torn between duty and survival, they must choose.`
      : `${n[0]} (a genius alchemist), ${n[1]} (a disgraced swordmaster), and ${n[2]} (a runaway royal) are marked by the same cursed brand. They have 30 days to find a cure before the curse consumes them, but powerful forces want them dead first.`,
    (n) => n.length === 1
      ? `${n[0]} returns from military service to find the underground fighting world they once dominated has a new king. To reclaim their title and save their family's dojo, they must fight through ten brutal challengers.`
      : n.length === 2
      ? `${n[0]}, an ex-special forces operative turned bodyguard, is hired to protect ${n[1]}, a genius inventor whose creation could change the world. As assassins close in, a bond deeper than duty forms between them.`
      : `Three outcasts, ${n[0]} (a hacker who sees digital ghosts), ${n[1]} (a fighter with regeneration), and ${n[2]} (a psychic who reads emotions), are recruited by a shadow organization. Their first mission reveals the organization's true sinister purpose.`,
  ],
  Graphic: [
    (n) => n.length === 1
      ? `${n[0]}, a disgraced former special agent, is pulled back into the underworld when their old partner goes missing. Every clue leads deeper into a web of corruption that reaches the highest levels of government.`
      : n.length === 2
      ? `${n[0]}, a battle-scarred mercenary haunted by their past, is hired alongside ${n[1]}, a cunning intelligence operative with a hidden agenda. The mission is simple: extract a prisoner. The truth behind it is anything but.`
      : `${n[0]} (the mastermind), ${n[1]} (the weapons expert), and ${n[2]} (the infiltrator) are assembled for one last heist. The target: a vault buried beneath a war-torn city. The catch: one of them is secretly working for the enemy.`,
    (n) => n.length === 1
      ? `In a crumbling city on the edge of apocalypse, ${n[0]} is the last honest cop trying to protect the innocent. When a serial killer starts targeting survivors, they must hunt a monster while the world burns around them.`
      : n.length === 2
      ? `${n[0]}, a hardened survivor in a post-apocalyptic wasteland, reluctantly teams up with ${n[1]}, a mysterious wanderer who claims to know the location of the last safe haven. Trust is a luxury neither can afford.`
      : `In the ruins of civilization, ${n[0]} (a ruthless scavenger), ${n[1]} (a former soldier clinging to honor), and ${n[2]} (a scientist who may have caused the apocalypse) must cross enemy territory to reach a rumored sanctuary before winter kills them all.`,
    (n) => n.length === 1
      ? `${n[0]} discovers they can see 24 hours into the future after a freak accident. When they witness a catastrophic attack before it happens, they have one day to stop it while being hunted by people who want to weaponize their gift.`
      : n.length === 2
      ? `${n[0]}, a retired hitman seeking redemption, crosses paths with ${n[1]}, a young witness who saw something they shouldn't have. With a bounty on both their heads, they must fight their way out of a city that wants them dead.`
      : `Three strangers, ${n[0]} (an ex-con trying to go clean), ${n[1]} (a corrupt detective with a conscience), and ${n[2]} (a whistleblower on the run), are drawn together by a conspiracy. Alone they're targets. Together they might just survive.`,
    (n) => n.length === 1
      ? `After surviving a brutal ambush, ${n[0]} wakes up in a hospital with no memory of the last six months. Piecing together clues tattooed on their own body, they uncover a plot that they were once part of.`
      : n.length === 2
      ? `${n[0]}, a war photographer who has seen too much, partners with ${n[1]}, a driven human rights lawyer, to expose a black-site prison. What they find inside challenges everything they thought they knew about justice.`
      : `${n[0]} (a bounty hunter), ${n[1]} (a disgraced politician), and ${n[2]} (a vengeful hacker) each receive a mysterious invitation. They are given 48 hours to find a missing person. Failure means their deepest secrets go public.`,
  ],
  Kawaii: [
    (n) => n.length === 1
      ? `${n[0]} is a tiny apprentice wizard whose spells always go hilariously wrong! When their latest mishap turns the school pets into giant fluffy monsters, they must fix everything before the headmaster returns!`
      : n.length === 2
      ? `${n[0]}, a cheerful bunny baker, and ${n[1]}, a grumpy cat florist, are neighbors who can't stop arguing. But when a big storm threatens the town fair, they must work together and discover they make an amazing team!`
      : `${n[0]} (a peppy star collector), ${n[1]} (a sleepy cloud rider), and ${n[2]} (a brave little firefly) go on a quest to find the lost rainbow bridge! Each brings a special talent that helps them overcome adorable obstacles along the way.`,
    (n) => n.length === 1
      ? `${n[0]} finds a magical paintbrush that brings their drawings to life! They paint a puppy, a butterfly, and a tiny dragon who all become best friends. Together they go on the sweetest adventure to paint a new rainbow!`
      : n.length === 2
      ? `${n[0]}, a little fox who loves cooking, enters a baking contest against ${n[1]}, a competitive but kind-hearted bear. When their cakes accidentally merge into one super-cake, they learn that teamwork tastes the sweetest!`
      : `${n[0]} (a singing bird), ${n[1]} (a dancing frog), and ${n[2]} (a drumming hamster) form a band for the Forest Music Festival! Their practice is a hilarious disaster, but their hearts are so big that magic happens on stage.`,
    (n) => n.length === 1
      ? `${n[0]} discovers a secret garden where flowers grant wishes! But each wish comes with a silly twist. Wishing for a castle gives them a castle made of pillows! Can they figure out the right wish before the garden closes at sunset?`
      : n.length === 2
      ? `${n[0]}, an adventurous kitten explorer, meets ${n[1]}, a shy turtle mapmaker, in an enchanted forest. Together they follow a treasure map that leads them through candy caves, marshmallow mountains, and a friendly dragon's tea party!`
      : `${n[0]} (a brave little penguin), ${n[1]} (a curious baby owl), and ${n[2]} (a bouncy lamb) find a magical door in the meadow. Behind it is Snack Land, where everything is made of treats! But they need to solve sweet puzzles to find their way home.`,
    (n) => n.length === 1
      ? `${n[0]} accidentally hatches a baby cloud that follows them everywhere, raining on everything! They must find Mama Cloud in the sky to return the baby, making adorable friends who help along the way.`
      : n.length === 2
      ? `${n[0]}, a tiny fairy with sparkle powers, and ${n[1]}, a baby dragon who sneezes glitter, team up to decorate the entire forest for the Spring Party. Everything goes wonderfully wrong in the cutest possible ways!`
      : `${n[0]} (a playful puppy wizard), ${n[1]} (a clever kitty inventor), and ${n[2]} (a jolly bear chef) open a magical shop together. Each customer brings a funny problem that only their combined adorable talents can solve!`,
  ],
  Noir: [
    (n) => n.length === 1
      ? `${n[0]}, a weathered private investigator drowning in debt, takes a case that seems too simple: follow a cheating spouse. But the trail leads to a murdered politician, a stolen fortune, and a truth that could bury them.`
      : n.length === 2
      ? `${n[0]}, a cynical detective with a photographic memory, is paired with ${n[1]}, an ambitious new partner hiding a personal vendetta. A string of murders in the theater district pulls them into a world of glamour, deceit, and blood.`
      : `${n[0]} (a corrupt cop seeking redemption), ${n[1]} (a nightclub singer who knows too many secrets), and ${n[2]} (a retired forger dragged back into the game) are each blackmailed by the same unseen figure. To survive, they must find them first.`,
    (n) => n.length === 1
      ? `The night ${n[0]} found the dead body in their office was just the beginning. Framed for a murder they didn't commit, they have 48 hours to find the real killer in a city where everyone lies.`
      : n.length === 2
      ? `${n[0]}, a jaded ex-cop running a dingy bar, reluctantly helps ${n[1]}, a desperate journalist whose investigation into the mayor's office has put a target on their back. Trust is dangerous in this city of rain and regret.`
      : `A priceless diamond vanishes during a blackout. ${n[0]} (the insurance investigator), ${n[1]} (the prime suspect with a perfect alibi), and ${n[2]} (the fence who was supposed to buy it) each hold a piece of the puzzle, and none of them are innocent.`,
    (n) => n.length === 1
      ? `${n[0]} runs a bookshop by day, but at night they're the city's most discreet information broker. When a client turns up dead after their last meeting, the shadows close in and every secret becomes a weapon.`
      : n.length === 2
      ? `${n[0]}, a disgraced lawyer banished from the courtroom, teams up with ${n[1]}, a street-smart hustler with connections in every dark alley. A missing witness case spirals into a conspiracy involving the city's most powerful judge.`
      : `In the smoky backrooms of 1940s Chicago, ${n[0]} (a sharp-tongued reporter), ${n[1]} (a charming con artist), and ${n[2]} (a world-weary detective) each chase the same lead: a mobster's secret ledger that could topple an empire or start a war.`,
    (n) => n.length === 1
      ? `${n[0]} wakes up in a rain-soaked alley with a gun in one hand, blood on the other, and no memory of the last twelve hours. The only clue: a matchbook from a jazz club that burned down three years ago.`
      : n.length === 2
      ? `${n[0]}, a haunted war veteran turned private eye, is hired by ${n[1]}, an enigmatic widow whose husband's death was ruled a suicide. As they dig into the case, old wounds reopen and nothing is as clear-cut as it seems.`
      : `Three strangers receive identical black envelopes: ${n[0]} (a retired safecracker), ${n[1]} (a disbarred doctor), and ${n[2]} (an ex-spy living under a false name). The message inside is simple: one of you is a killer. You have one night to figure out who.`,
  ],
  Anime: [
    (n) => n.length === 1
      ? `${n[0]} transfers to a new school only to discover it sits on a sealed gateway to a demon world. When the seal cracks, they awaken an ancient power within their bloodline and must protect their classmates from creatures no one else can see.`
      : n.length === 2
      ? `${n[0]}, a hot-blooded fighter with flame powers, and ${n[1]}, a cool and calculating ice wielder, are rivals at the Spirit Combat Academy. When a threat bigger than their rivalry emerges, only by combining fire and ice can they survive.`
      : `${n[0]} (a reckless swordsman with a demon-sealed arm), ${n[1]} (a genius mage who never misses), and ${n[2]} (a mysterious healer with forbidden knowledge) are thrown together by fate. A dark prophecy says their bond will either save the world or destroy it.`,
    (n) => n.length === 1
      ? `After a freak accident during a school trip, ${n[0]} gains the ability to rewind time by exactly one minute. It seems useless until they discover a time loop trapping their entire city, and they're the only one who notices.`
      : n.length === 2
      ? `${n[0]}, a street fighter with unmatched martial arts skills, meets ${n[1]}, a mysterious transfer student who can manipulate gravity. When an underground tournament with deadly stakes begins, they enter as partners with their lives on the line.`
      : `When an ancient seal breaks, ${n[0]} (wielder of lightning), ${n[1]} (master of illusions), and ${n[2]} (controller of earth and stone) are chosen as guardians. The catch: their powers only fully activate when all three fight together as one unit.`,
    (n) => n.length === 1
      ? `${n[0]} is the only student at their academy without a visible power. Mocked by everyone, they secretly train alone until a legendary master reveals that their true ability, power nullification, is the rarest and most feared of all.`
      : n.length === 2
      ? `${n[0]}, a brilliant tactician who fights with enchanted cards, forms an unlikely partnership with ${n[1]}, a wild and unpredictable brawler with explosive energy blasts. Their opposite styles clash until a common enemy forces perfect synchronization.`
      : `${n[0]} (a fallen angel seeking redemption), ${n[1]} (a demon trying to become human), and ${n[2]} (a human caught between both worlds) discover their fates are linked by an ancient curse. Breaking it requires trust none of them are ready to give.`,
    (n) => n.length === 1
      ? `${n[0]} discovers they can enter a parallel world every time they fall asleep. In that world, they're a legendary hero everyone depends on. But the line between dream and reality begins to blur dangerously.`
      : n.length === 2
      ? `${n[0]}, a young pilot of a giant mech, is assigned a new co-pilot: ${n[1]}, a former enemy combatant. To operate the mech, they must synchronize their minds, but their conflicting memories and emotions threaten to tear the machine apart.`
      : `In a floating city above the clouds, ${n[0]} (a sky pirate captain), ${n[1]} (a royal guard who questions everything), and ${n[2]} (a mechanic with a secret invention) uncover a plot to crash the entire city. They have 24 hours to stop it.`,
  ],
  Afro: [
    (n) => n.length === 1
      ? `${n[0]} inherits a mysterious mask from their grandmother that grants the powers of an ancient African guardian spirit. As a new threat rises from beneath the savanna, they must embrace their heritage to protect their people.`
      : n.length === 2
      ? `${n[0]}, a tech-savvy inventor from Nairobi, joins forces with ${n[1]}, a spiritual warrior trained in ancient combat arts. When a shadow corporation targets sacred lands, their fusion of technology and tradition becomes the ultimate weapon.`
      : `${n[0]} (a solar-powered hero from Lagos), ${n[1]} (a shape-shifter connected to the animal kingdom), and ${n[2]} (a time-bender descended from ancient seers) are called by the Ancestors to form the Guardians of the Motherland against an interdimensional threat.`,
    (n) => n.length === 1
      ? `In a futuristic African metropolis, ${n[0]} is a courier who can run faster than any machine. When they accidentally deliver a package containing a world-changing energy source, every faction in the city wants them caught or dead.`
      : n.length === 2
      ? `${n[0]}, a brilliant scientist who harnesses vibranium-like crystals, and ${n[1]}, a fierce warrior chieftain protecting a hidden kingdom, must put aside their ideological differences when colonizers armed with stolen tech threaten both their worlds.`
      : `${n[0]} (a griot whose voice commands the elements), ${n[1]} (a blacksmith who forges weapons from starfall metal), and ${n[2]} (a navigator who reads the spirit paths) embark on an epic quest across a mythical Africa to reunite the shattered Crown of Kingdoms.`,
    (n) => n.length === 1
      ? `${n[0]} is chosen by a cosmic panther spirit to become the new protector of their city. But the previous protector went rogue, and now they must defeat their corrupted predecessor while learning to master powers they barely understand.`
      : n.length === 2
      ? `${n[0]}, a DJ whose beats can manipulate sound waves into force fields, teams up with ${n[1]}, a martial artist whose movements channel ancestral energy. Together they defend their neighborhood from a gang using stolen mystical artifacts.`
      : `When ancient burial sites start glowing across the continent, ${n[0]} (a university professor who can read ancient scripts), ${n[1]} (a street-smart parkour expert with enhanced agility), and ${n[2]} (a healer whose touch channels ancestral spirits) race to solve the mystery before a dark cult completes a world-ending ritual.`,
    (n) => n.length === 1
      ? `${n[0]} discovers they can communicate with the spirits of legendary African heroes throughout history. When a techno-sorcerer threatens to erase all ancestral connections, they must channel the power of every hero who came before.`
      : n.length === 2
      ? `${n[0]}, a street artist whose murals come alive at night, discovers ${n[1]}, a wandering mystic who can step into painted worlds. Together they travel through ${n[0]}'s art to find a stolen relic hidden across multiple painted dimensions.`
      : `${n[0]} (master of storms), ${n[1]} (commander of the earth), and ${n[2]} (keeper of the eternal flame) are descendants of three warring kingdoms who must unite for the first time in a thousand years. An ancient imprisoned god is breaking free, and only their combined legacy can stop it.`,
  ],
};

const LANGUAGES = ["Detect", "English", "German", "Spanish", "French", "Japanese", "Korean", "Chinese"];
const PAGE_OPTIONS = [1, 3, 5, 7, 9];

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { token, user, updateCredits } = useAuth();
  const scale = useSharedValue(1);

  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [storyPrompt, setStoryPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [pagesCount, setPagesCount] = useState(5);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPagesModal, setShowPagesModal] = useState(false);
  const [inspireIndex, setInspireIndex] = useState<Record<string, number>>({
    Comic: 0,
    Manga: 0,
    Manhwa: 0,
    Graphic: 0,
    Kawaii: 0,
    Noir: 0,
    Anime: 0,
    Afro: 0,
  });

  const [artStylesData, setArtStylesData] = useState<ArtStyleData[]>([]);
  const [unlockAllCost, setUnlockAllCost] = useState(500);
  const [allStylesUnlocked, setAllStylesUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [selectedLockedStyle, setSelectedLockedStyle] = useState<ArtStyleData | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"single" | "all">("single");
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultSuccess, setResultSuccess] = useState(true);
  const [creditBase, setCreditBase] = useState(20);
  const [creditPerPage, setCreditPerPage] = useState(15);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const loadArtStyles = async () => {
    try {
      const response = await fetch(new URL("/api/art-styles", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setArtStylesData(data.styles);
        setUnlockAllCost(data.unlockAllCost);
        setAllStylesUnlocked(data.allUnlocked);
      }
    } catch (error) {
      console.error("Error loading art styles:", error);
    }
  };

  const loadCreditPricing = async () => {
    try {
      const response = await fetch(new URL("/api/credits/settings", getApiUrl()).toString());
      if (response.ok) {
        const data = await response.json();
        if (typeof data.baseCost === "number") setCreditBase(data.baseCost);
        if (typeof data.costPerPage === "number") setCreditPerPage(data.costPerPage);
      }
    } catch (error) {
      console.error("Error loading credit settings:", error);
    }
  };

  const handleUnlockSingle = () => {
    if (!selectedLockedStyle) return;
    const cost = selectedLockedStyle.unlockCost;
    const balance = user?.credits ?? 0;
    if (balance < cost) {
      setShowUnlockModal(false);
      setResultSuccess(false);
      setResultMessage(`You need ${cost} credits but only have ${balance}. Please top up your credits first.`);
      setShowResultModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setConfirmAction("single");
    setShowUnlockModal(false);
    setShowConfirmModal(true);
  };

  const handleUnlockAll = () => {
    const cost = unlockAllCost;
    const balance = user?.credits ?? 0;
    if (balance < cost) {
      setShowUnlockModal(false);
      setResultSuccess(false);
      setResultMessage(`You need ${cost} credits but only have ${balance}. Please top up your credits first.`);
      setShowResultModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setConfirmAction("all");
    setShowUnlockModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    setIsPurchasing(true);
    try {
      const url = confirmAction === "single"
        ? new URL(`/api/art-styles/${selectedLockedStyle?.id}/unlock`, getApiUrl()).toString()
        : new URL("/api/art-styles/unlock-all", getApiUrl()).toString();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowConfirmModal(false);
        if (typeof data.credits === "number") {
          updateCredits(data.credits);
        }
        const styleName = confirmAction === "single" ? selectedLockedStyle?.name : "All Styles";
        const cost = confirmAction === "single" ? (selectedLockedStyle?.unlockCost ?? 0) : unlockAllCost;
        setResultSuccess(true);
        setResultMessage(`${styleName} unlocked successfully! ${cost} credits have been deducted from your balance.`);
        setShowResultModal(true);
        setSelectedLockedStyle(null);
        if (confirmAction === "all") setAllStylesUnlocked(true);
        loadArtStyles();
      } else {
        setShowConfirmModal(false);
        setResultSuccess(false);
        setResultMessage(data.error || "Failed to complete the purchase. Please try again.");
        setShowResultModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      setShowConfirmModal(false);
      setResultSuccess(false);
      setResultMessage("Something went wrong. Please check your connection and try again.");
      setShowResultModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPurchasing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCharacters();
      loadArtStyles();
      loadCreditPricing();
      checkAndClearSelection();
    }, [])
  );

  const checkAndClearSelection = async () => {
    try {
      const shouldClear = await AsyncStorage.getItem("clearCharacterSelection");
      if (shouldClear === "true") {
        setSelectedCharacterIds([]);
        await AsyncStorage.removeItem("clearCharacterSelection");
      }
    } catch (error) {
      console.error("Error checking clear flag:", error);
    }
  };

  const loadCharacters = async () => {
    try {
      const response = await fetch(new URL("/api/characters", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const { characters } = await response.json();
        const mappedCharacters: Character[] = characters.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          type: "custom",
          imageUri: c.photoUri,
        }));
        setAllCharacters(mappedCharacters);
      }
      
      const newCharacterId = await AsyncStorage.getItem("newlyAddedCharacterId");
      if (newCharacterId) {
        setSelectedCharacterIds((prev) => 
          prev.includes(newCharacterId) ? prev : [...prev, newCharacterId]
        );
        await AsyncStorage.removeItem("newlyAddedCharacterId");
      }
    } catch (error) {
      console.error("Error loading characters:", error);
    }
  };

  const handleDeleteCharacter = async (id: string) => {
    try {
      const response = await fetch(new URL(`/api/characters/${id}`, getApiUrl()).toString(), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const updated = allCharacters.filter((c) => c.id !== id);
        setAllCharacters(updated);
        setSelectedCharacterIds((prev) => prev.filter((cid) => cid !== id));
      }
    } catch (error) {
      console.error("Error deleting character:", error);
    }
  };

  const handleAddNewCharacter = () => {
    setShowCharacterModal(false);
    navigation.navigate("AddCharacter");
  };

  const selectedCharacters = allCharacters.filter((c) =>
    selectedCharacterIds.includes(c.id)
  );

  const handleInspireMe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const style = STYLES[selectedStyle].name;
    const selectedChars = allCharacters.filter((c) =>
      selectedCharacterIds.includes(c.id)
    );
    const charNames = selectedChars
      .filter((c) => c.name && c.name.trim().length > 0)
      .map((c) => c.name.trim());

    let templates: string[];
    if (charNames.length > 0) {
      const fns = INSPIRE_WITH_NAMES[style];
      templates = fns.map((fn) => fn(charNames.slice(0, 3)));
    } else {
      templates = INSPIRE_GENERIC[style];
    }

    const currentIndex = inspireIndex[style];
    setStoryPrompt(templates[currentIndex % templates.length]);
    setInspireIndex((prev) => ({
      ...prev,
      [style]: (currentIndex + 1) % templates.length,
    }));
  };

  const handleClearPrompt = () => {
    setStoryPrompt("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const calculateCost = () => {
    return creditBase + Math.max(0, pagesCount - 1) * creditPerPage;
  };

  const handleGenerate = () => {
    if (!storyPrompt.trim()) {
      Alert.alert("Missing Story", "Please enter a story prompt to continue.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate("Generating", {
      storyPrompt: storyPrompt.trim(),
      style: STYLES[selectedStyle].name,
      characters: selectedCharacters.map((c) => ({
        name: c.name,
        type: c.type,
        imageUri: c.imageUri,
        description: c.description,
      })),
      pagesCount,
      scenesPerPage: 6,
      title: undefined,
      language: selectedLanguage === "Detect" ? undefined : selectedLanguage,
    });
  };

  const isGenerateEnabled = storyPrompt.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>AI Storiz</Text>
        <Pressable 
          style={styles.credits}
          onPress={() => navigation.navigate("Subscription")}
        >
          <Feather name="hexagon" size={14} color={COLORS.accent} />
          <Text style={styles.creditsNum}>{user?.credits ?? 0}</Text>
        </Pressable>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
      >
            <Animated.View entering={FadeIn.duration(200)}>
              <Text style={styles.bigTitle}>Create</Text>
              <Text style={styles.bigTitleAccent}>something epic</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <Pressable 
                style={styles.characterBlock}
                onPress={() => setShowCharacterModal(true)}
                testID="button-add-characters"
              >
                {selectedCharacters.length > 0 ? (
                  <View style={styles.charAvatarRow}>
                    {selectedCharacters.slice(0, 4).map((char, index) => (
                      <View 
                        key={char.id} 
                        style={[
                          styles.charAvatar,
                          { marginLeft: index > 0 ? -12 : 0, zIndex: 10 - index }
                        ]}
                      >
                        {char.imageUri ? (
                          <Image 
                            source={{ uri: char.imageUri }} 
                            style={styles.charAvatarImage}
                          />
                        ) : (
                          <Feather name="user" size={18} color={COLORS.accent} />
                        )}
                      </View>
                    ))}
                    {selectedCharacters.length > 4 && (
                      <View style={[styles.charAvatar, styles.charAvatarMore, { marginLeft: -12 }]}>
                        <Text style={styles.charAvatarMoreText}>+{selectedCharacters.length - 4}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.charCircle}>
                    <Feather name="camera" size={22} color={COLORS.accent} />
                  </View>
                )}
                <View style={styles.charContent}>
                  <Text style={styles.charTitle}>
                    {selectedCharacters.length > 0 
                      ? `${selectedCharacters.length} Character${selectedCharacters.length > 1 ? "s" : ""} Selected`
                      : "Add Characters"}
                  </Text>
                  <Text style={styles.charSub} numberOfLines={1}>
                    {selectedCharacters.length > 0
                      ? selectedCharacters.map(c => c.name).join(", ")
                      : "Upload photos to create heroes"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.dim} />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <Text style={styles.label}>ART STYLE</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.styleScroll}
              >
                {STYLES.map((s, i) => {
                  const apiStyle = artStylesData.find(a => a.name === s.name);
                  const isLocked = apiStyle ? (apiStyle.isPremium && !apiStyle.isUnlocked) : false;

                  return (
                    <Pressable
                      key={s.name}
                      style={[styles.styleCard, selectedStyle === i && !isLocked && styles.styleCardOn, isLocked && styles.styleCardLocked]}
                      onPress={() => {
                        if (isLocked && apiStyle) {
                          setSelectedLockedStyle(apiStyle);
                          setShowUnlockModal(true);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        } else {
                          setSelectedStyle(i);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      testID={`button-style-${s.name.toLowerCase()}`}
                    >
                      <View style={[styles.styleImageBox, selectedStyle === i && !isLocked && styles.styleImageBoxOn]}>
                        <Image 
                          source={s.image} 
                          style={[styles.styleImage, isLocked && { opacity: 0.4 }]}
                          resizeMode="cover"
                        />
                        {isLocked ? (
                          <View style={styles.styleLock}>
                            <Feather name="lock" size={14} color="#fff" />
                          </View>
                        ) : selectedStyle === i ? (
                          <View style={styles.styleCheck}>
                            <Feather name="check" size={12} color={COLORS.card} />
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.styleText, selectedStyle === i && !isLocked && styles.styleTextOn, isLocked && styles.styleTextLocked]}>
                        {s.name}
                      </Text>
                      {isLocked && apiStyle ? (
                        <Text style={styles.styleCostBadge}>{apiStyle.unlockCost} cr</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>YOUR STORY</Text>
                <Pressable 
                  style={styles.inspireChip}
                  onPress={handleInspireMe}
                  testID="button-inspire-me"
                >
                  <Feather name="zap" size={14} color={COLORS.accent} />
                  <Text style={styles.inspireText}>Inspire</Text>
                </Pressable>
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Describe your epic story idea..."
                  placeholderTextColor={COLORS.dim}
                  multiline
                  value={storyPrompt}
                  onChangeText={setStoryPrompt}
                  maxLength={3000}
                  testID="input-story-prompt"
                />
                <View style={styles.inputFooter}>
                  <Pressable style={styles.clearBtn} onPress={handleClearPrompt}>
                    <Feather name="trash-2" size={16} color={COLORS.dim} />
                  </Pressable>
                  <Text style={styles.charCount}>{storyPrompt.length} / 3000</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(280).springify()}>
              <View style={styles.dropdownRow}>
                <View style={styles.dropdownCol}>
                  <Text style={styles.label}>LANGUAGE</Text>
                  <Pressable 
                    style={styles.dropdown}
                    onPress={() => {
                      setShowLanguageModal(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    testID="dropdown-language"
                  >
                    <Feather name="globe" size={16} color={COLORS.accent} />
                    <Text style={styles.dropdownText}>{selectedLanguage}</Text>
                    <Feather name="chevron-down" size={18} color={COLORS.dim} />
                  </Pressable>
                </View>
                <View style={styles.dropdownCol}>
                  <Text style={styles.label}>PAGES</Text>
                  <Pressable 
                    style={styles.dropdown}
                    onPress={() => {
                      setShowPagesModal(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    testID="dropdown-pages"
                  >
                    <Feather name="file-text" size={16} color={COLORS.accent} />
                    <Text style={styles.dropdownText}>{pagesCount} pages</Text>
                    <Feather name="chevron-down" size={18} color={COLORS.dim} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).springify()}>
              <View style={styles.costCard}>
                <View style={styles.costRow}>
                  <View style={styles.costLeft}>
                    <Feather name="clock" size={16} color={COLORS.dim} />
                    <Text style={styles.costLabel}>Est. time</Text>
                  </View>
                  <Text style={styles.costValue}>~2 min</Text>
                </View>
                <View style={styles.costDivider} />
                <View style={styles.costRow}>
                  <View style={styles.costLeft}>
                    <Feather name="hexagon" size={16} color={COLORS.accent} />
                    <Text style={styles.costLabel}>Cost</Text>
                  </View>
                  <Text style={styles.costValueAccent}>{calculateCost()} credits</Text>
                </View>
              </View>
            </Animated.View>

            <View style={{ marginTop: 16, marginBottom: 20 }}>
              <FooterTextAd />
            </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + tabBarHeight }]}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.generateBtnWrapper, btnStyle]} pointerEvents="auto">
          <Pressable
            style={[styles.goBtn, !isGenerateEnabled && styles.goBtnDisabled]}
            onPressIn={() => {
              if (isGenerateEnabled) {
                scale.value = withSpring(0.96);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }}
            onPressOut={() => {
              scale.value = withSpring(1);
            }}
            onPress={handleGenerate}
            testID="button-generate"
          >
            <Feather 
              name="image" 
              size={20} 
              color={COLORS.card} 
            />
            <Text style={styles.goBtnText}>
              Generate Comic
            </Text>
            <Feather name="arrow-right" size={20} color={COLORS.card} />
          </Pressable>
        </Animated.View>
      </View>

      <CharacterSelectionModal
        visible={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        characters={allCharacters}
        selectedIds={selectedCharacterIds}
        onSelectionChange={setSelectedCharacterIds}
        onAddNew={handleAddNewCharacter}
        onDeleteCharacter={handleDeleteCharacter}
      />

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <ModalBackdrop onDismiss={() => setShowLanguageModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                style={[
                  styles.modalOption,
                  selectedLanguage === lang && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedLanguage(lang);
                  setShowLanguageModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedLanguage === lang && styles.modalOptionTextSelected,
                ]}>
                  {lang}
                </Text>
                {selectedLanguage === lang && (
                  <Feather name="check" size={18} color={COLORS.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={showPagesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPagesModal(false)}
      >
        <ModalBackdrop onDismiss={() => setShowPagesModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Pages</Text>
            {PAGE_OPTIONS.map((count) => (
              <Pressable
                key={count}
                style={[
                  styles.modalOption,
                  pagesCount === count && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setPagesCount(count);
                  setShowPagesModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  pagesCount === count && styles.modalOptionTextSelected,
                ]}>
                  {count} pages
                </Text>
                {pagesCount === count && (
                  <Feather name="check" size={18} color={COLORS.accent} />
                )}
              </Pressable>
            ))}
          </View>
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={showUnlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowUnlockModal(false); setSelectedLockedStyle(null); }}
      >
        <ModalBackdrop onDismiss={() => { setShowUnlockModal(false); setSelectedLockedStyle(null); }}>
          <View style={styles.unlockModalContent}>
            <View style={styles.unlockHeader}>
              <Feather name="unlock" size={28} color={COLORS.accent} />
              <Text style={styles.unlockTitle}>Unlock Art Style</Text>
              <Text style={styles.unlockSub}>
                Choose how you want to unlock {selectedLockedStyle?.name ?? "this style"}
              </Text>
            </View>

            <Pressable
              style={styles.unlockOption}
              onPress={handleUnlockSingle}
              disabled={isPurchasing}
              testID="button-unlock-single"
            >
              <View style={styles.unlockOptionLeft}>
                <View style={styles.unlockIconCircle}>
                  <Feather name="star" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.unlockOptionText}>
                  <Text style={styles.unlockOptionTitle}>
                    Unlock {selectedLockedStyle?.name ?? "Style"}
                  </Text>
                  <Text style={styles.unlockOptionDesc}>
                    Permanently unlock this art style
                  </Text>
                </View>
              </View>
              <View style={styles.unlockCostBadge}>
                {isPurchasing ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <Text style={styles.unlockCostText}>
                    {selectedLockedStyle?.unlockCost ?? 0} credits
                  </Text>
                )}
              </View>
            </Pressable>

            <View style={styles.unlockDivider}>
              <View style={styles.unlockDividerLine} />
              <Text style={styles.unlockDividerText}>OR</Text>
              <View style={styles.unlockDividerLine} />
            </View>

            <Pressable
              style={[styles.unlockOption, styles.unlockOptionPremium]}
              onPress={handleUnlockAll}
              disabled={isPurchasing}
              testID="button-unlock-all"
            >
              <View style={styles.unlockOptionLeft}>
                <View style={[styles.unlockIconCircle, styles.unlockIconCirclePremium]}>
                  <Feather name="zap" size={18} color="#F59E0B" />
                </View>
                <View style={styles.unlockOptionText}>
                  <Text style={styles.unlockOptionTitle}>Unlock All Styles</Text>
                  <Text style={styles.unlockOptionDesc}>
                    All current and future art styles
                  </Text>
                </View>
              </View>
              <View style={[styles.unlockCostBadge, styles.unlockCostBadgePremium]}>
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <Text style={[styles.unlockCostText, styles.unlockCostTextPremium]}>
                    {unlockAllCost} credits
                  </Text>
                )}
              </View>
            </Pressable>

            <Pressable
              style={styles.unlockCancel}
              onPress={() => { setShowUnlockModal(false); setSelectedLockedStyle(null); }}
            >
              <Text style={styles.unlockCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowConfirmModal(false); setSelectedLockedStyle(null); }}
      >
        <ModalBackdrop onDismiss={() => { setShowConfirmModal(false); setSelectedLockedStyle(null); }}>
          <View style={styles.unlockModalContent}>
            <View style={styles.unlockHeader}>
              <View style={styles.confirmIconCircle}>
                <Feather name="alert-circle" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.unlockTitle}>Confirm Purchase</Text>
            </View>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Item</Text>
                <Text style={styles.confirmValue}>
                  {confirmAction === "single"
                    ? `Unlock ${selectedLockedStyle?.name ?? "Style"}`
                    : "Unlock All Styles"}
                </Text>
              </View>
              <View style={styles.confirmDividerThin} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Cost</Text>
                <Text style={[styles.confirmValue, { color: "#EF4444" }]}>
                  -{confirmAction === "single"
                    ? (selectedLockedStyle?.unlockCost ?? 0)
                    : unlockAllCost} credits
                </Text>
              </View>
              <View style={styles.confirmDividerThin} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Current Balance</Text>
                <Text style={styles.confirmValue}>{user?.credits ?? 0} credits</Text>
              </View>
              <View style={styles.confirmDividerThin} />
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>After Purchase</Text>
                <Text style={[styles.confirmValue, { color: "#22C55E", fontWeight: "700" }]}>
                  {(user?.credits ?? 0) - (confirmAction === "single"
                    ? (selectedLockedStyle?.unlockCost ?? 0)
                    : unlockAllCost)} credits
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.confirmBtn}
              onPress={handleConfirmPurchase}
              disabled={isPurchasing}
              testID="button-confirm-purchase"
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>
                  Confirm & Deduct {confirmAction === "single"
                    ? (selectedLockedStyle?.unlockCost ?? 0)
                    : unlockAllCost} Credits
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.unlockCancel}
              onPress={() => { setShowConfirmModal(false); setSelectedLockedStyle(null); }}
            >
              <Text style={styles.unlockCancelText}>Go Back</Text>
            </Pressable>
          </View>
        </ModalBackdrop>
      </Modal>

      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <ModalBackdrop onDismiss={() => setShowResultModal(false)}>
          <View style={styles.unlockModalContent}>
            <View style={styles.unlockHeader}>
              <View style={[styles.confirmIconCircle, resultSuccess ? styles.resultIconSuccess : styles.resultIconError]}>
                <Feather
                  name={resultSuccess ? "check-circle" : "x-circle"}
                  size={32}
                  color={resultSuccess ? "#22C55E" : "#EF4444"}
                />
              </View>
              <Text style={styles.unlockTitle}>
                {resultSuccess ? "Purchase Complete" : "Purchase Failed"}
              </Text>
              <Text style={styles.resultMessage}>{resultMessage}</Text>
            </View>

            <Pressable
              style={[styles.confirmBtn, !resultSuccess && styles.confirmBtnError]}
              onPress={() => setShowResultModal(false)}
              testID="button-close-result"
            >
              <Text style={styles.confirmBtnText}>
                {resultSuccess ? "Got It" : "OK"}
              </Text>
            </Pressable>
          </View>
        </ModalBackdrop>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  logo: {
    width: 96,
    height: 96,
    marginVertical: -32,
    marginLeft: -20,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
  credits: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  creditsNum: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
  bigTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
    marginTop: 4,
  },
  bigTitleAccent: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.accent,
    fontFamily: "Nunito_700Bold",
    marginBottom: 14,
  },
  characterBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  charCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.accent}15`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  charImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  charAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  charAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.accent}15`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  charAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  charAvatarMore: {
    backgroundColor: COLORS.accent,
  },
  charAvatarMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.card,
    fontFamily: "Nunito_700Bold",
  },
  charContent: {
    flex: 1,
    marginLeft: 14,
  },
  charTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Nunito_600SemiBold",
  },
  charSub: {
    fontSize: 13,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    letterSpacing: 1,
    marginBottom: 12,
    fontFamily: "Nunito_700Bold",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inspireChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.accent}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  inspireText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.accent,
    fontFamily: "Nunito_600SemiBold",
  },
  styleScroll: {
    gap: 12,
    paddingBottom: 24,
  },
  styleCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    width: 100,
  },
  styleCardOn: {
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  styleImageBox: {
    width: 76,
    height: 58,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    position: "relative",
    overflow: "hidden",
  },
  styleImage: {
    width: "100%",
    height: "100%",
  },
  styleImageBoxOn: {
    backgroundColor: `${COLORS.accent}15`,
  },
  styleCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  styleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dim,
    fontFamily: "Nunito_600SemiBold",
  },
  styleTextOn: {
    color: COLORS.accent,
    fontWeight: "700",
  },
  styleCardLocked: {
    opacity: 0.85,
  },
  styleTextLocked: {
    color: "#9CA3AF",
  },
  styleLock: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  styleCostBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.accent,
    fontFamily: "Nunito_700Bold",
    marginTop: 2,
  },
  unlockModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    width: "90%",
    maxWidth: 380,
    alignSelf: "center",
  },
  unlockHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  unlockTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
    marginTop: 12,
  },
  unlockSub: {
    fontSize: 14,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginTop: 6,
  },
  unlockOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 16,
  },
  unlockOptionPremium: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  unlockOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  unlockIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.accent}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockIconCirclePremium: {
    backgroundColor: "#FEF3C7",
  },
  unlockOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  unlockOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
  },
  unlockOptionDesc: {
    fontSize: 12,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    marginTop: 2,
  },
  unlockCostBadge: {
    backgroundColor: `${COLORS.accent}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unlockCostBadgePremium: {
    backgroundColor: "#FEF3C7",
  },
  unlockCostText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accent,
    fontFamily: "Nunito_700Bold",
  },
  unlockCostTextPremium: {
    color: "#D97706",
  },
  unlockDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  unlockDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  unlockDividerText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.dim,
    fontFamily: "Nunito_700Bold",
    marginHorizontal: 12,
  },
  unlockCancel: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 10,
  },
  unlockCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dim,
    fontFamily: "Nunito_600SemiBold",
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDetails: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  confirmLabel: {
    fontSize: 14,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Nunito_600SemiBold",
  },
  confirmDividerThin: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  confirmBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnError: {
    backgroundColor: "#EF4444",
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Nunito_700Bold",
  },
  resultIconSuccess: {
    backgroundColor: "#DCFCE7",
  },
  resultIconError: {
    backgroundColor: "#FEE2E2",
  },
  resultMessage: {
    fontSize: 14,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  inputWrap: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    fontSize: 15,
    color: COLORS.text,
    fontFamily: "Nunito_400Regular",
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.bg,
  },
  clearBtn: {
    padding: 4,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  dropdownCol: {
    flex: 1,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  dropdownText: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    color: COLORS.text,
  },
  costCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  costLabel: {
    fontSize: 14,
    color: COLORS.dim,
    fontFamily: "Nunito_400Regular",
  },
  costValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Nunito_600SemiBold",
  },
  costValueAccent: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.accent,
    fontFamily: "Nunito_700Bold",
  },
  costDivider: {
    height: 1,
    backgroundColor: COLORS.bg,
    marginVertical: 12,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  generateBtnWrapper: {
    marginBottom: 16,
  },
  goBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  goBtnDisabled: {
    backgroundColor: COLORS.dim,
    opacity: 0.6,
  },
  goBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.card,
    fontFamily: "Nunito_700Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Nunito_700Bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.bg,
  },
  modalOptionSelected: {
    backgroundColor: `${COLORS.accent}15`,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: "Nunito_600SemiBold",
  },
  modalOptionTextSelected: {
    color: COLORS.accent,
    fontWeight: "700",
  },
});
