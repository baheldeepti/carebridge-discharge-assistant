
# CareBridge Project Demo Script

**Target Duration:** 2:30 minutes
**Theme:** Patient Safety, Multilingual Accessibility, Multimodal AI

---

## 🎬 Act 1: The Problem (0:00 - 0:20)

| Visual Scene | Audio / Voiceover | Technical Note |
| :--- | :--- | :--- |
| **[Stock Footage/B-Roll]** A person looking confused at a stack of paper documents. Close up on complex medical text like "Azithromycin 250mg PO QD". | "Hospital discharge instructions are the most critical, yet most confusing documents a patient receives." | |
| **[Split Screen]** Show the same document next to a non-English speaker looking distressed. | "For millions of patients with language barriers or low health literacy, misunderstanding these papers leads to medication errors and readmission." | |
| **[Logo Animation]** CareBridge Logo appears on white background. | "Introducing CareBridge. The intelligent, multilingual patient safety guardian." | |

---

## 🎬 Act 2: The Core Workflow (0:20 - 1:00)

| Visual Scene | Audio / Voiceover | Technical Note |
| :--- | :--- | :--- |
| **[Screen Rec]** User opens the App. Clicks the "Hindi" (🇮🇳) or "Spanish" (🇪🇸) button. The UI labels instantly flip language. | "CareBridge isn't just a translator; it's a fully localized medical companion. We start by choosing our preferred language." | **Frontend:** React 19 + Dynamic Localization |
| **[Screen Rec]** User clicks 'Snap Photo' and captures the `sample_discharge_summary.md` or a physical paper. | "We simply snap a photo of the raw clinical discharge summary." | **Input:** Multimodal (Images/PDF) |
| **[Screen Rec]** Loading spinner "CareBridge Assistant is reviewing...". Cut to the **Analysis View**. Show the **Visual Timeline**. | "Using **Gemini 3 Pro**, we extract unstructured clinical data and restructure it into a 'First 48 Hours' recovery roadmap." | **Model:** `gemini-3-pro-preview`<br>**Config:** `thinkingConfig` enabled for complex extraction. |
| **[Screen Rec]** Scroll down to "Plain Talk". User clicks the "🔊 LISTEN" button. | "Complex jargon is converted into 8th-grade plain language. And with Gemini's high-fidelity Text-to-Speech, patients can listen to their plan." | **Model:** `gemini-2.5-flash-preview-tts`<br>**Voice:** 'Fenrir' |

---

## 🎬 Act 3: Multimodal Safety - "Med Guardian" (1:00 - 1:40)

| Visual Scene | Audio / Voiceover | Technical Note |
| :--- | :--- | :--- |
| **[Screen Rec]** User clicks the "Med Guardian" (🛡️) tab. | "Safety is our priority. The Med Guardian system performs two critical checks." | |
| **[Screen Rec]** Show the "AI Safety Check" cards. Highlight a specific warning about drug interactions. | "First, it cross-references prescribed medications against live medical data using Google Search Grounding to flag interactions." | **Tool:** `googleSearch` grounding |
| **[Screen Rec]** User clicks "Scan Bottle". Camera opens. User holds a physical pill bottle up to the camera. | "Second, we solve physical errors. The patient photographs their actual pill bottle..." | **Feature:** Vision / OCR |
| **[Screen Rec]** The App shows a Green Checkmark "Verified Match" or Red Warning. | "...and Gemini compares the physical label against the doctor's digital orders to verify dosage and drug name match." | **Model:** `gemini-3-pro-preview` (Vision capability) |

---

## 🎬 Act 4: The "Wow" Factor - Live AI Assistant (1:40 - 2:10)

| Visual Scene | Audio / Voiceover | Technical Note |
| :--- | :--- | :--- |
| **[Screen Rec]** User clicks "Live AI Assistant". The dark mode modal opens with the waveform visualization. | "But what if the patient has questions? We utilize the **Gemini Live API** for real-time, low-latency voice interaction." | **API:** `ai.live.connect` |
| **[Live Demo Audio]** <br>**User:** "I'm feeling a bit dizzy after taking the pill, is that normal?"<br>**AI (Fenrir Voice):** "Dizziness can be a side effect of Lisinopril. However, if you feel faint, please sit down. Are you checking your blood pressure?" | "The model holds the full context of the discharge plan. It uses a supportive persona to answer questions and checks for understanding." | **Model:** `gemini-2.5-flash-native-audio-preview` |
| **[Screen Rec]** User says "My chest hurts really bad." The screen flashes RED with the SOS banner. | "It even detects emergency keywords in real-time to trigger UI safety warnings." | **Logic:** Client-side keyword detection on `inputTranscription` |

---

## 🎬 Act 5: Conclusion & Stack (2:10 - 2:30)

| Visual Scene | Audio / Voiceover | Technical Note |
| :--- | :--- | :--- |
| **[Slide/Graphic]** Architecture Diagram showing: <br>1. Gemini 3 Pro (Reasoning)<br>2. Gemini Live (WebSockets)<br>3. Gemini Flash (TTS) | "Built with the full power of the Gemini ecosystem: 3 Pro for reasoning, Flash for speed, and Live API for connection." | |
| **[Screen Rec]** Back to Home screen. "Safe Recovery Starts Here." | "CareBridge. Turning complex paperwork into safe, understandable recovery." | |

---

## 🛠️ Production Tips

1.  **Device Frame:** Wrap screen recordings in a mobile device frame for a polished look.
2.  **Speed:** Speed up the "Processing" parts of the video (scanning/loading) to keep momentum.
3.  **Audio:** Ensure the TTS audio from the app is recorded clearly (system audio) so the viewer can hear the quality of the 'Fenrir' voice.
