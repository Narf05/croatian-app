Build a personal, non-commercial Croatian learning web app (PWA) for a single user. Keep it minimal: it is a personal library that tracks what I learn and my current level.

GENERAL
- The interface is entirely in Croatian.
- Offline-first: all vocabulary, lists, lessons, songs and progress are stored locally on the phone and work without internet. Installable on mobile.
- One-tap export/import of all data as a backup file.
- Level tracking on the CEFR scale (A1–C2), shown on a simple progress page.
- Stress marking: for every new word, and on request, show which letter carries the stress (highlight the stressed vowel). No pronunciation guide.
- Standard Croatian only. Where a word differs from Serbian/Bosnian (e.g. tjedan vs nedelja), flag it.

AI USAGE (Claude API)
- AI is a tool, not a constant observer. It is only called (a) inside the features that need it, and (b) in one weekly analysis.
- Claude Haiku: quick translation, translation bubble, "how it works" explanations, words of the day.
- Claude Sonnet: lessons, conversation, song translation, weekly analysis.
- The API key is stored locally; AI features show a clear message when offline.

CENTRAL WORD LIBRARY
- One shared store of saved words/expressions. Every section can add to it.
- Each entry: Croatian word, translation, stressed letter, grammar info (gender/case/aspect pair if relevant), example sentence, source (translation / song / lesson / conversation / reading / daily word / mistake), date added, SRS status.
- Words can be organised into custom lists.
- Spaced repetition (SRS): every reviewed word gets a next-review date based on my answers; wrong answers come back sooner.

SECTIONS
1. Lekcije (Lessons)
   - I ask for a specific topic; the AI generates a short course (explanation, examples, small exercises) at my level.
   - Lessons are saved and accessible offline.
   - Shows the weekly recommended topics.

2. Brzi prijevod (Quick translation)
   - Instant, direct, simple translation of a word or sentence.
   - A separate, expandable "Kako funkcionira" (How it works) section: grammar, case/form, usage, related words.
   - One-tap "add to list".

3. Pjesme (Songs)
   - I enter the song name and paste the lyrics; the app shows a line-by-line translation.
   - Tap any word or line for its explanation and to add it to a list.
   - Songs are saved with their translations for offline review.

4. Čitanje (Reading)
   - I paste any text; tap words or sentences to translate and save them. Texts are saved.

5. Razgovor (Conversation)
   - The AI generates a new, concrete everyday scenario each time at my level and plays the other person.
   - At the end: short feedback on mistakes. Mistakes go into a mistake log and become review cards; new words can be saved.

6. Vježbe gramatike (Grammar drills)
   - Short exercises on the 7 noun cases and verb aspect pairs (e.g. pisati/napisati), ideally built from words in my library.
   - Can be pre-generated and done offline.

7. Vokabular (Vocabulary)
   - Study my lists and SRS reviews: flashcards (both directions), multiple choice, typing the answer, a matching game.
   - Works fully offline.

8. Riječi dana (Words of the day)
   - Every day, 3 words or expressions two levels above mine that are useful in real conversation, each with translation, stressed letter and an example; one tap to save.
   - Generated weekly in a batch so they are available offline.

GLOBAL TRANSLATION BUBBLE
- A floating button on every screen: type or select a word and get a quick, natural, everyday translation, with an option to save it.

WEEKLY ANALYSIS
- Once a week, the AI reviews my library, SRS results, mistake log and activity, updates my level estimate, and writes a short recommendation (what to review, which lesson topics, which grammar to drill).
