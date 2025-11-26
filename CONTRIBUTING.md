## 🌍 Translations

### How to Add a Translation

1. **Create a new locale folder**
   
   Navigate to the `_locales` directory and create a new folder with the appropriate locale code:
   ```bash
   mkdir _locales/fr  # For French
   mkdir _locales/es  # For Spanish
   mkdir _locales/de  # For German
   # etc.
   ```
   
   Use the [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) for your language.

2. **Copy the English template**
   
   Copy the English `messages.json` file as your starting point:
   ```bash
   cp _locales/en/messages.json _locales/YOUR_LOCALE/messages.json
   ```

3. **Translate the messages**
   
   Open your new `messages.json` file and translate **only** the `"message"` values. Keep the keys and structure unchanged:
   
   ```json
   {
     "extensionName": {
       "message": "YouTube Custom Settings",  // ← Translate this (actually don't because it's the extension's name, but you got the idea 🤓)
       "description": "Name of the extension"  // ← Leave this in English (it's for context)
     }
   }
   ```

4. **Important notes**
   
   - **Do not translate**: JSON keys, `"description"` fields, or placeholder names
   - **Keep placeholders**: If a message contains `$PLACEHOLDER$`, keep it as-is in your translation
   - **Maintain formatting**: Preserve line breaks and punctuation where meaningful
   - **Test your translation**: Build the extension and verify your translation appears correctly

5. **Submit your translation**
   
   Create a pull request with your new locale folder. Make sure to:
   - Test the extension with your locale
   - Update the [`CHANGELOG.md`](CHANGELOG.md) in the `[Unreleased]` section under `Added`
   - Mention which language you've added

### Example Translation

English (`_locales/en/messages.json`):
```json
{
  "popup_originalTitles": {
    "message": "Original Titles",
    "description": "Title for original titles feature"
  }
}
```

French (`_locales/fr/messages.json`):
```json
{
  "popup_originalTitles": {
    "message": "Titres originaux",
    "description": "Title for original titles feature"
  }
}
```