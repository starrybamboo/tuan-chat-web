# WebGAL Wrapper Upgrade Plan

## 1. Status Analysis: WebGAL Mapping Coverage

The current chat room implements the core **"Visual Novel"** experience but lacks **"Performance"** and **"Gameplay"** features.

### ✅ Mapped (Implemented)
These features automatically convert from chat to WebGAL preview:
*   **Dialogue:** Chat messages $\rightarrow$ `Character:Text;`
*   **Figures:** Avatar/Character switching $\rightarrow$ `changeFigure` (supports left/center/right)
*   **MiniAvatar:** Sidebar mini-avatar $\rightarrow$ `miniAvatar`
*   **Background:** Room background/Image messages $\rightarrow$ `changeBg`
*   **Voice:** TTS synthesis $\rightarrow$ `playVoice` (via URL)
*   **Scene:** Room switching $\rightarrow$ `changeScene` (implicit)

### ❌ Unmapped (Missing)
These WebGAL features cannot currently be triggered in chat:

| Category | Missing Feature | WebGAL Command | Suggested Usage |
| :--- | :--- | :--- | :--- |
| **Audio** | **BGM** | `bgm` | Set room BGM (e.g., Cafe music) |
| **Audio** | **SFX** | `playEffect` | Play sound on sticker send or system alert |
| **VFX** | **Weather/Effects** | `pixiPerform` | Rain, snow, cherry blossoms, etc. |
| **Anim** | **Character Anim** | `setAnimation` | Shake, jump, fade (express emotion) |
| **Video** | **Video Playback** | `playVideo` | Play cutscenes or video clips |
| **Text** | **Furigana/Rich Text** | `[Kanji](reading)` | Ruby text for difficult words |
| **Logic** | **Variables/Switches** | `setVar` / `-when` | Affection points, branching (gameplay focused) |

---

## 2. Plan: WebGAL Wrapper Upgrade (Chat as a Wrapper)

Goal: Transform the chat room into a **Real-time Editor/Controller** for WebGAL by introducing a "Command System" and "Director Panel".

### Step 1: Audio Wrapper (BGM & SFX)
*   **Task:** Map `bgm` and `playEffect` commands in `chatRenderer.ts`.
*   **UI:** Add "Music Control Panel" in the sidebar for the room owner to upload/select BGM.
*   **Effect:** Changing BGM in chat syncs with WebGAL preview.

### Step 2: VFX Wrapper (Environment Effects)
*   **Task:** Map `pixiPerform` commands (rain/snow/sakura).
*   **UI:** Add "Effect Buttons" (e.g., 🌧️ ❄️ 🌸) near the input box.
*   **Effect:** Clicking "Rain" triggers rain in everyone's WebGAL preview.

### Step 3: Animation Wrapper (Character Performance)
*   **Task:** Map `setAnimation` commands.
*   **UI:** Allow long-pressing the send button to choose an "Emotion Animation" (e.g., Angry-Shake, Happy-Jump).
*   **Effect:** Characters perform actions while speaking.

### Step 4: Slash Commands
*   **Task:** Update message parser to support text commands like `/bgm music.mp3` or `/rain`.
*   **Benefit:** Allows advanced users to control the engine directly via text without UI.

---

## 3. Further Considerations
*   **Permissions:** Should BGM be restricted to Room Owners? (Recommendation: Yes for BGM, No for temporary VFX).
*   **Asset Management:** How to handle BGM/SFX uploads? (Reuse existing file upload logic).
