
# CareBridge Discharge Assistant 🏥

> **Safe Recovery Starts Here.**  
> A patient-centered digital guardian that transforms complex hospital discharge papers into clear, multilingual, and actionable recovery plans using Gemini AI.

![CareBridge Banner](https://via.placeholder.com/1200x400/2563eb/ffffff?text=CareBridge+Patient+Safety+Assistant)

## 💡 The Problem
Hospital discharge instructions are often confusing, filled with medical jargon, and provided only in English. This leads to **readmission**, **medication errors**, and **patient anxiety**.

## 🚀 The Solution
**CareBridge** acts as a bilingual medical companion. By simply snapping a photo of discharge papers, patients receive an interactive, 8th-grade level guide to their recovery, grounded in real-time safety data.

## ✨ Key Features

### 1. 🌍 **Total Localization (English, Spanish, Hindi, Chinese)**
Not just translation—**localization**. The entire UI, including buttons, prompts, and the AI persona, adapts to the user's cultural context.
*   *Powered by Gemini System Instructions & Custom Dictionary.*

### 2. 🗺️ **Visual Recovery Timeline**
Transforms static text into a dynamic **24-48 Hour Roadmap**.
*   Categorizes tasks: Medication 💊, Rest 🛌, Nutrition 🥛, Follow-up 🩺.
*   *Powered by Gemini 3 Pro Structured Output.*

### 3. 🛡️ **Med Guardian (Safety & Verification)**
*   **AI Safety Checks:** Uses Google Search Grounding to check prescribed meds against each other for dangerous interactions in real-time.
*   **Bottle Verification:** Users can photograph their pill bottles. The AI compares the physical bottle label against the discharge orders to prevent errors.
*   *Powered by Multimodal Vision & Grounding Tools.*

### 4. 🗣️ **Live AI Assistant (Gemini Live API)**
A real-time, low-latency voice companion ("CareBridge Assistant") that patients can talk to.
*   Uses `gemini-2.5-flash-native-audio-preview` for human-like interaction.
*   Supports "Teach-Back" methodology to verify understanding.
*   Detects emergency keywords (e.g., "pain", "can't breathe") to trigger UI warnings.

### 5. 📍 **Smart Follow-Ups**
Extracts appointment details and generates direct Google Maps links for clinics and providers.
*   *Powered by Google Maps Grounding Tool.*

---

## 🏗️ Technical Architecture

CareBridge is a **client-side AI application** that interacts directly with the Google Gemini API. It removes the need for a complex intermediate backend, reducing latency and complexity for hackathon prototyping.

### 1. The Reasoning Engine (`gemini-3-pro-preview`)
*   **Role:** The "Brain" of the application.
*   **Tasks:**
    *   **OCR & Extraction:** Reads complex PDF/Image layouts and converts them to raw text.
    *   **Structured Output:** Forces the model to return a strict JSON schema (`DischargeAnalysis` type) containing medications, timeline events, and red flags.
    *   **Translation & Localization:** Translates medical concepts into the target language (Hindi, Spanish, Chinese) while maintaining an 8th-grade reading level.
    *   **Safety Grounding:** Uses the **Google Search Tool** to verify drug interactions against live medical data.

### 2. The Live Conversation Loop (`gemini-2.5-flash-native-audio-preview`)
*   **Role:** Real-time voice interaction.
*   **Architecture:**
    *   **Audio Input:** Browser `AudioContext` captures microphone input (16kHz).
    *   **Streaming:** Raw PCM audio chunks are sent via WebSocket using `ai.live.connect`.
    *   **Processing:** The model processes audio *natively* (no Speech-to-Text intermediate step) for <500ms latency.
    *   **Output:** The model streams back raw PCM audio (24kHz), which is decoded and played via the browser's `AudioBufferSourceNode`.

### 3. Visual Verification System
*   **Input:** Camera capture of a physical pill bottle.
*   **Context:** The extracted discharge medication list.
*   **Logic:** `gemini-3-pro-preview` compares the visual evidence (bottle label) against the digital record (discharge summary) to detect mismatches in dosage or drug name.

### 4. Audio Generation (`gemini-2.5-flash-preview-tts`)
*   **Role:** High-quality reading of the recovery plan.
*   **Config:** Uses specific voice personas (e.g., 'Fenrir') to convey authority and empathy.

---

## 🛠️ Technology Stack

This project is built for the **Gemini 3 Hackathon**, utilizing the latest features of the `@google/genai` SDK:

*   **Frontend:** React 19, TypeScript, Tailwind CSS.
*   **AI Logic:** Google GenAI SDK.
*   **Models Used:**
    *   **`gemini-3-pro-preview`**: The "Brain." Handles complex reasoning (`thinkingConfig`), extraction, and safety grounding.
    *   **`gemini-2.5-flash-native-audio-preview-12-2025`**: The "Voice." Powers the Live API WebSocket connection for real-time conversation.
    *   **`gemini-2.5-flash-preview-tts`**: Generates high-quality speech for reading plans aloud.
    *   **`gemini-2.5-flash`**: Used for lightweight Maps grounding tasks.

---

## 🏃‍♂️ Getting Started

### Prerequisites
*   A Google Cloud Project with the **Gemini API** enabled.
*   A valid API Key.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/carebridge.git
    cd carebridge
    ```

2.  **Environment Setup**
    CareBridge requires the API key to be available in `process.env.API_KEY`.
    *   *Note: In a production web environment, ensure your API key is restricted or proxied to prevent exposure.*

3.  **Run the Application**
    This project uses ESM modules. If running locally with a bundler (like Vite or Parcel):
    ```bash
    npm install
    npm start
    ```
    If using the current simple setup, serve the directory via a local server (e.g., Live Server in VS Code).

---

## 🧪 Usage Flow

1.  **Select Language:** Choose your preferred language (e.g., Hindi). The app interface updates immediately.
2.  **Upload/Scan:** Upload a PDF or take a picture of the hospital discharge summary.
3.  **Review Plan:**
    *   **Timeline:** See your immediate next steps.
    *   **Plain Talk:** Read a simplified explanation or listen to it via TTS.
    *   **Guardian:** Check for drug interactions and verify physical pill bottles.
4.  **Talk to CareBridge:** Click "Live AI Assistant" to ask questions naturally using your voice.

---

## ⚠️ Disclaimer
**CareBridge is a prototype for educational and hackathon purposes only.** It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

---

Made with ❤️ and 🤖 using **Google Gemini**.
