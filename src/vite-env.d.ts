/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional OpenRouter API key baked in at build time. When set, the
   * remote backend uses it as a fallback if the user hasn't pasted
   * their own key into the chooser modal. See `.env.example` for the
   * security note (the value is visible in the deployed bundle).
   */
  readonly VITE_OPENROUTER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
