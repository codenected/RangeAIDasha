import fs from "fs";
import * as dasha from "@dasha.ai/platform-sdk";
import Path from "path";

interface IAudioPhrase {
  audio?: string;
  phrase?: string;
  voice?: Partial<dasha.VoiceInfo>;
}

interface IAudioResources {
  voice?: Partial<dasha.VoiceInfo>;
  phrases?: IAudioPhrase[];
}

export function loadAudioResources(folder: string) {
  const resources: Partial<
    Record<
      string,
      Partial<
        Record<
          string,
          Partial<
            Record<string, Partial<Record<number, Partial<Record<number, Partial<Record<string, dasha.TtsResponse>>>>>>>
          >
        >
      >
    >
  > = {};
  const files = fs.readdirSync(folder);
  for (const file of files.filter((file) => file.endsWith(".json"))) {
    const pack: IAudioResources = JSON.parse(fs.readFileSync(Path.join(folder, file)).toString());
    pack.voice ??= {};
    pack.voice.language ??= "";
    pack.voice.speaker ??= "";
    pack.voice.emotion ??= "Neutral";
    pack.voice.speed ??= 1;
    pack.voice.variation ??= 0;
    for (const phrase of pack.phrases ?? []) {
      if (phrase.phrase === undefined) throw new Error("`phrase` is undefined");
      if (phrase.audio === undefined) throw new Error("`audio` is undefined");
      phrase.voice = { ...pack.voice, ...phrase.voice };
      resources[phrase.voice.language!] ??= {};
      resources[phrase.voice.language!]![phrase.voice.speaker!] ??= {};
      resources[phrase.voice.language!]![phrase.voice.speaker!]![phrase.voice.emotion!] ??= {};
      resources[phrase.voice.language!]![phrase.voice.speaker!]![phrase.voice.emotion!]![phrase.voice.speed!] ??= {};
      resources[phrase.voice.language!]![phrase.voice.speaker!]![phrase.voice.emotion!]![phrase.voice.speed!]![
        phrase.voice.variation!
      ] ??= {};

      const audioFile = Path.join(folder, phrase.audio);

      resources[phrase.voice.language!]![phrase.voice.speaker!]![phrase.voice.emotion!]![phrase.voice.speed!]![
        phrase.voice.variation!
      ]![phrase.phrase!] = {
        audioFormat: Path.extname(audioFile).slice(1),
        audioData: new Uint8Array(fs.readFileSync(audioFile)),
      };
    }
  }

  return resources;
}
