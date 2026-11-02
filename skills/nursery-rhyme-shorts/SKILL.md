---
name: nursery-rhyme-shorts
description: Write complete scripts for 3D-animated kids' nursery rhyme Shorts/Reels (Cocomelon / NuNu Tv style) for AI video generators. Use when the user asks for a nursery rhyme, kids song, toddler video script, children's animation script, "skrip lagu anak", "video anak 3D", or wants scene-by-scene prompts with lyrics for Kling, Veo, Runway, Hailuo, Sora, Pika or similar tools.
---

# Nursery Rhyme Shorts Script Writer

Produce an original, kid-safe, scene-by-scene script for a vertical 9:16 3D nursery rhyme video, ready to paste into an AI video generator. Never copy existing songs' lyrics; traditional public-domain rhymes may be adapted.

## Step 0: Gather inputs (ask only for what is missing, max 1 short question)
- Topic / habit (e.g. wash hands, brush teeth, ABC, colors, sharing)
- Character names (default: **Benny** toddler boy + **Ellie** yellow baby elephant)
- Target tool (Kling / Veo / Runway / Hailuo / other) and clip length limit (default 5s)
- Output language for lyrics (default English; Indonesian if the user writes in Indonesian)

If the user gave a topic, do not ask anything: use defaults and deliver.

## Fixed format
- 9:16 vertical, 30–60 seconds total (default 45s), 8–10 scenes of 4–6s each
- Camera at toddler eye level, simple moves only (push-in, tracking, slow orbit)
- One repeated **hook** (2 short lines) sung 3 times; this is what makes the video replayable
- Last frame matches first frame so the Short loops

## Song structure
1. Problem (0–4s): character has a small problem tied to the topic
2. Setup (4–15s): set the scene, introduce the action
3. **Hook** (~15–22s): repetitive, onomatopoeic, 5–8 syllables per line
4. Action verse (22–34s): the how-to, with rhyming couplets
5. **Hook** again, faster (34–40s)
6. Payoff + high-five + wink (40–45s)

Lyrics rules: words a 2–4 year old knows, short lines, rhyme in couplets, lots of sound words (splash, pop, boing), positive tone, no fear or shaming.

## Character lock (copy verbatim into EVERY scene prompt)
Write one 1–2 sentence description per character and never change the wording between scenes. Default:
- **Benny**: chubby toddler boy, big round blue eyes, rosy cheeks, spiky orange-blond hair with a small tuft, light-blue t-shirt with a yellow star, yellow shorts, tiny white sneakers.
- **Ellie**: soft yellow baby elephant, big pink-tinted ears, round belly, warm brown eyes, always smiling.

## Global style prompt (prefix on every scene)
> 3D animated Pixar-style children's nursery rhyme, vertical 9:16, ultra-bright saturated colors, soft rounded shapes, glossy plastic-toy textures, soft cinematic lighting, shallow depth of field, sunny backyard with purple fence and green lawn, smooth bouncy animation, no text, kid-safe.

## Negative prompt
realistic, photo, live action, dark, scary, creepy, extra fingers, deformed hands, distorted face, text, subtitles, watermark, logo, blur, flicker.

## Audio direction
Upbeat playful kids' pop, ~110 BPM, xylophone + ukulele + soft claps, warm friendly vocal, simple repeating melody, short SFX (splash, pop, giggle).

## Output format (always in this order)
1. **Title** (`[Action] Song | Nursery Rhymes for Kids`) + 1-line description + 5 hashtags
2. **Scene table**: `# | time | visual prompt (style + character lock + action + camera) | lyrics/audio`
3. **Full lyrics** block with [Verse]/[Chorus]/[Outro] labels, ready for a music generator (e.g. Suno)
4. **Music prompt** (one paragraph, from Audio direction)
5. **JSON** for batch use:
```json
{
  "title": "",
  "aspect_ratio": "9:16",
  "style_prompt": "",
  "negative_prompt": "",
  "characters": {"Benny": "", "Ellie": ""},
  "music_prompt": "",
  "scenes": [
    {"id": 1, "start": 0, "end": 4, "prompt": "", "camera": "", "lyrics": "", "sfx": ""}
  ]
}
```
6. **Consistency tips** (max 4 bullets): generate character reference images first, use image-to-video, keep clips ≤6s, reuse the exact character lock text.

## Quality checklist before answering
- [ ] Hook appears 3 times and is ≤ 8 syllables per line
- [ ] Every scene prompt contains style prefix + character lock
- [ ] Total scene durations add up to the target length
- [ ] Nothing scary, unsafe, branded, or copied from an existing song
- [ ] Ending frame matches the opening for looping

## Episode ideas (offer 3 when asked "what next")
Brush Your Teeth, Bath Time Splash, Share the Candy, Balloon ABC, Water Day Slide, Baa Baa Sheep Says Sorry, Put On Your Shoes, Clean Up Time, Eat Your Veggies, Traffic Light Colors.
