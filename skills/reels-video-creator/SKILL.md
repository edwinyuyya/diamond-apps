---
name: reels-video-creator
description: Plan and script high-retention Instagram Reels, TikTok and YouTube Shorts quickly, including hook, shot list, voiceover, on-screen text, caption, hashtags, AI video prompts and posting plan. Use when the user asks for a reels script, short video idea, content plan, "bikin reels", "skrip video pendek", "ide konten", viral hook, or batch content for promotion, education, product, storytelling or personal brand.
---

# Reels / Shorts Video Creator

Goal: turn a topic into a ready-to-shoot or ready-to-generate short video package in one answer. Be fast: deliver first, refine after.

## Step 0: Inputs (infer; ask at most ONE question, only if essential)
- Topic / offer
- Audience (default: Indonesian general audience, casual tone)
- Goal: awareness, leads, sales, education, entertainment (default: awareness)
- Production mode: **A) Camera / talking head**, **B) Stock + text (faceless)**, **C) AI-generated clips** (default C if the user mentions an AI video generator)
- Language (match the user's; Indonesian by default if they write in Indonesian)

## Hard rules for retention
- Length: 15–30s default; max 45s unless asked
- **Hook in the first 3 seconds**: a question, bold claim, pattern interrupt or visual shock. Never start with a greeting or logo.
- One idea per video. One CTA at the end.
- Cut or change visuals every 1.5–3 seconds
- On-screen text: ≤ 7 words per card, large, inside safe zone (keep 250px free at bottom and 150px at top for UI)
- Sentences ≤ 10 words, spoken at conversational pace (~2.5 words/sec)
- End with a loop or open question to drive replays and comments
- No false claims, no copyrighted music/characters, no misleading medical/financial promises

## Hook formulas (pick 3 options, recommend 1)
1. Pain: "Masih [masalah]? Berhenti lakukan ini."
2. Curiosity: "Ini alasan [hal umum] sebenarnya [kejutan]."
3. Number: "3 cara [hasil] dalam [waktu]."
4. Contrarian: "Semua orang salah soal [topik]."
5. Story: "Kemarin saya [kejadian aneh]…"
6. Before/After: show result first, then rewind.

## Structure (20–30s)
| Time | Part | Purpose |
|------|------|---------|
| 0–3s | Hook | Stop the scroll |
| 3–8s | Problem / tension | Why it matters |
| 8–22s | Payoff (1–3 points) | The value |
| 22–27s | Proof or twist | Credibility |
| 27–30s | CTA + loop | Follow / save / comment keyword |

## Output format (always in this order)
1. **Concept** (1 line) + goal + mode
2. **3 hook options**, with the recommended one marked
3. **Shot list table**: `# | time | visual / AI prompt | voiceover | on-screen text | SFX/music`
4. **Full voiceover** (clean paragraph, for TTS)
5. **Caption** (hook line + 2–3 lines value + CTA) and **8–12 hashtags** (mix: 3 broad, 4 niche, 3 specific)
6. **Cover text** (≤ 5 words) and **on-screen first frame** suggestion
7. **Music/sound**: mood + BPM, suggest trending-audio check inside the app instead of naming tracks
8. **Posting tips**: best times (default 11:00–13:00 or 19:00–21:00 WIB), pin a comment, reply to comments with video
9. If mode C: **AI prompts** per shot using the template below, plus a **JSON** block

### AI clip prompt template
`[style] + [subject with fixed description] + [action] + [setting] + [camera move] + [lighting] + 9:16, no text`
Reuse an identical subject description in every shot. Generate 4–6s clips, image-to-video for consistency. Negative prompt: `blur, flicker, deformed hands, extra fingers, text, watermark, logo, low quality`.

### JSON schema (mode C)
```json
{
  "title": "",
  "aspect_ratio": "9:16",
  "duration_sec": 0,
  "voiceover": "",
  "music_prompt": "",
  "shots": [
    {"id": 1, "start": 0, "end": 3, "prompt": "", "camera": "", "text_overlay": "", "sfx": ""}
  ]
}
```

## Batch mode
If the user asks for "content plan" or "7 hari": produce a table of N videos with `day | pillar | hook | format | CTA`, using content pillars (edukasi, proof, story, promo, hiburan) in a 40/20/20/10/10 ratio, then script only the first video in full unless told otherwise.

## Fast-iteration commands
After delivery offer: "ganti hook", "lebih santai", "lebih pendek (15s)", "versi English", "buat 5 variasi", "jadikan JSON".

## Quality checklist
- [ ] Hook visible/audible within 3 seconds
- [ ] Shot durations sum to the target length
- [ ] ≤ 7 words per on-screen text card
- [ ] Exactly one CTA
- [ ] Caption + hashtags included
- [ ] Safe zones respected; no copyrighted material
