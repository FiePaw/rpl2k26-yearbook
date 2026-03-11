# gemini_grounded.py
from google import genai
from google.genai import types
import os

# Ambil API key dari env var (recommended)
API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")

# Inisialisasi client
client = genai.Client(api_key=API_KEY)

# Definisikan tool grounding Google Search
grounding_tool = types.Tool(
    google_search=types.GoogleSearch()
)

config = types.GenerateContentConfig(
    tools=[grounding_tool]
)

prompt = """
Give me the correct LRC timestamped lyrics for the song:
"Bertaut" by Nadin Amizah.

IMPORTANT:
- Use real song timing using Google Search grounding.
- Detect intro duration before vocals start.
- Detect outro/fade out timing.
- Output ONLY LRC lines in this format:
  [MM:SS] lyric text
- NO extra explanation or metadata.
"""

response = client.models.generate_content(
    model="gemini-2.5-flash",   # model yang mendukung grounding
    contents=prompt,
    config=config,
)

# Response dapat berisi banyak kandidat; .text adalah shortcut
print(response.text)
# Jika ingin grounding metadata:
# print(response.candidates[0].grounding_metadata)
