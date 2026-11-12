# State: Warna Hewan (kids colour song, YouTube)

Read this first in every new session, after loading the cinecode skill (Claude Code: the Skill tool, never a plain read of SKILL.md), then `python3 KIT/scripts/init_film.py . --update-tools` silently; update "Now" before ending every turn. Keep it short.
Kit: /root/.claude/skills/cinecode
Method: this chat coordinates and builds what it holds the context for; a fresh helper takes only an independent part beside it (sound, narration takes, research, the independent viewer) or a long film's chapter, briefed from files (`/root/.claude/skills/cinecode/references/context-protocol.md`).

## Resume here
<!-- Updated at every gate and before every handoff. A new chat starts with "STATE.md'den devam et" / "Continue from STATE.md". -->
- **Phase:** 6a draft v2 delivered, waiting for the user's choice (final, notes, jury); VOICE BLOCKED: Gemini key must be added by the user in environment settings (GEMINI_API_KEY), host generativelanguage.googleapis.com is allowed; until then the film has no spoken voice, colour names show as big text; building (style frame, type, animatic, draft) (mode Film chosen; theme: learning colours with animals; API token if needed: DeepSeek via proxy)
- **Pace:** through
- **Approved gates:** none
- **Open notes:** none (notes/round-N.md)
- **Next action:** <one concrete line, with the files to read>
- **Budget so far:** <~estimate> of the <Balanced> ceiling (<n>%)

## Now
- **Step:** 1 Interview
- **Gate:** draft v2 delivered; waiting for user: Final / Notes / Jury. Known flags left on purpose: quiet and slightly bright intro to 27 s (sparse toy orchestra), 2 scenes with little subject motion (90-93.75 s, 114-120 s sunset hold)
- **Next step:** <one concrete line>
- **Waiting for:** <user / background job / nothing>
- **Profile:** quality
- **Purpose:** cinematic (kids animation for a YouTube channel; user said: educational + entertainment for ages up to 5, like the NuNu Tv style screenshot but with different, original characters; save the result)
- **Format:** 120 s, 16:9, 1920x1080, 24 fps (user)
- **Medium:** 2D soft toon animation drawn in code (user switched from 3D after a render test: software GL ~5 frames in 3 min, 2880 frames needed; 2D chosen as starred)
- **Look:** custom 'Permen Kilap' (user pick C): glossy plump rounded 2D toon, small specular highlights, soft shadows, warm sun from upper left; palette #FFE9F2 #FF5C8A #FFC93C #3DBBF0 #5ED38A; board stills unavailable (filmgrab unreachable), picked from written directions
- **Finishing:** <none · motion blur (shots) · print tone · gate weave> <!-- off by default; chosen at the style frame -->
- **Music:** code (user): toy orchestra (pizzicato, glockenspiel, xylophone), four-note theme, one note per colour; voice: colour names spoken only, candidates to be picked by ear (not yet made) <!-- always asked, the recording picked by ear -->
- **Type:** Fredoka 500/700 (display + text), rounded and friendly for toddlers; picked as the star because Pace is through (OFL, jsDelivr)
- **Subtitles:** off
- **Last output:** Pelangi di Taman-draft.mp4 (renders/draft-v2.mp4, 960x540); independent viewer running -> review/critique-v2.md
- **Disk free at last check:** <GB, date>

## Running jobs
| Job | Command (short) | PID | Status file | Log | Started |
|---|---|---|---|---|---|

## Gates
| Step | Gate | Result | Date | Note |
|---|---|---|---|---|
| 1 | interview answered / defaults accepted | | | |
| 2 | roadmap approved | OK | 2026-11-12 | |
| 3 | script and text approved | OK | 2026-11-12 | |
| 4 | style frame approved, finishing chosen | | | |
| 4b | type pairing picked | | | |
| 5 | animatic approved | | | |
| 6a | draft cut approved | delivered v2, waiting | 2026-11-12 | no spoken voice yet |
| 6 | final delivered | | | |

## Decisions
| Date | Decision | Why | Who |
|---|---|---|---|
| 2026-11-12 | Sound is synthetic by choice: toy orchestra and code foley, no recorded effects | the user chose music in code; the toy-box sound is the identity; the sound pack host is not reachable from this machine | agent, from the user's pick |
| 2026-11-12 | The orange bloom moved from 1:36 to 1:37.5 (bar 39) so the one beat of silence and the return of the music land on the bar grid | music at 96 BPM has 2.5 s bars | agent |
| 2026-11-12 | The film is built in film.html (the 2D engine), the Film mode folder keeps its roadmap, script and gates | 3D is too slow here (software GL, about 5 frames in 3 minutes); the user chose 2D | user |

## Notes rounds
Verbatim notes and the per-shot split live in `notes/round-N.md`.

| Round | File | Shots touched | Unchanged | Status |
|---|---|---|---|---|

## Agent tasks
| Task | Calls | Brief (files read) | Output file | Result |
|---|---|---|---|---|

## Budget meter
Ceiling: <Economy / Balanced / Quality> (internal caps: `references/context-protocol.md` §6). Stop and ask at 80%.

| Phase | Share of ceiling | Estimate so far | % of share | Note |
|---|---|---|---|---|
| 1-2 Interview + roadmap | 10% | | | |
| 3 Script | 10% | | | |
| 4 Style frame | 20% | | | |
| 5 Animatic | 15% | | | |
| 6 Render, sound, final | 35% | | | |
| Notes rounds | 10% | | | |
| **Total** | 100% | | | |

## Versions
| Version | File | What changed | Snapshot |
|---|---|---|---|
