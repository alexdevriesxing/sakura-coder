import type { WorkflowId, WorkflowProfile } from '../types/sakura';

export const WORKFLOW_REGISTRY: Record<WorkflowId, WorkflowProfile> = {
  'general-coding': {
    id: 'general-coding',
    displayName: 'General Coding',
    description: 'For existing repositories, bug fixes, refactors, scripts, and general programming.',
    recommendedStacks: ['TypeScript', 'Rust', 'Python', 'Go'],
    defaultDocs: ['README.md', 'AGENTS.md', 'docs/IMPLEMENTATION_PLAN.md'],
    requiredQuestions: ['What is the project goal?', 'What language/stack?'],
    defaultFolders: ['src', 'tests', 'docs'],
    systemPrompt: `You are a senior software architect assistant. Inspect first, plan second, patch third, validate fourth. Avoid unnecessary dependencies and broad rewrites. Prioritize small, reviewable patches.`,
    guardrails: ['Never rewrite existing working code', 'Always run tests after changes', 'Keep patches small'],
    validationChecklist: ['TypeScript passes', 'Tests pass', 'No regressions'],
    releaseChecklist: ['Full test suite', 'Build succeeds', 'Documentation updated'],
    imageAssetTypes: [
      { id: 'architecture-diagram', description: 'Architecture diagram concept', outputFolder: 'assets/generated/general/docs', requiredMetadata: ['projectName', 'prompt'] },
      { id: 'readme-header', description: 'README header image', outputFolder: 'assets/generated/general/readme', requiredMetadata: ['projectName', 'prompt'] },
    ],
    imagePromptTemplate: 'Create an original {{assetType}} for {{projectName}}. Subject: {{subject}}. Style: {{style}}.',
    imageNegativePromptTemplate: 'copyrighted characters, protected logos, watermark, text, low quality',
    audioAudioTypes: [],
    audioPromptTemplate: '',
    audioNegativePromptTemplate: '',
    outputFolders: { images: 'assets/generated/general', audio: 'assets/generated/general' },
    starterTemplates: [
      { id: 'create-vite', name: 'Vite + TypeScript', description: 'Minimal Vite starter with TypeScript', url: 'npm create vite@latest', recommended: true },
      { id: 'create-next', name: 'Next.js + TypeScript', description: 'Full-featured Next.js starter', url: 'npx create-next-app', recommended: true },
    ],
  },
  'game-development': {
    id: 'game-development',
    displayName: 'Game Development Studio',
    description: 'For Phaser, Flame, Godot-style planning, HTML5 arcade games, pixel-art games, spritesheets, tilesets, and asset-heavy projects.',
    recommendedStacks: ['Phaser 3', 'Godot', 'Unity', 'Flame'],
    defaultDocs: ['docs/GDD.md', 'docs/CORE_GAMEPLAY_LOOP.md', 'docs/TECHNICAL_ARCHITECTURE.md', 'docs/LEVEL_DESIGN.md', 'docs/ASSET_BIBLE.md', 'docs/AUDIO_BIBLE.md'],
    requiredQuestions: ['What genre?', 'What core gameplay loop?', 'Target platforms?'],
    defaultFolders: ['src', 'assets', 'assets/generated', 'docs'],
    systemPrompt: `You are a game designer and technical architect. Create GDDs with core game loop design, scene architecture, input handling, collision systems, save data, and performance constraints. Generate non-infringing media.`,
    guardrails: ['Never infringe copyrights', 'No protected game soundalikes', 'No celebrity voice clones'],
    validationChecklist: ['Game compiles', 'No console errors', 'Gameplay works'],
    releaseChecklist: ['Build for target platform', 'Check performance', 'Test all scenes'],
    imageAssetTypes: [
      { id: 'character_sprite', description: 'Character sprite', outputFolder: 'assets/generated/sprites', requiredMetadata: ['projectName', 'assetType', 'dimensions'] },
      { id: 'enemy_sprite', description: 'Enemy sprite', outputFolder: 'assets/generated/sprites', requiredMetadata: ['projectName', 'assetType'] },
      { id: 'item_sprite', description: 'Item/collectible sprite', outputFolder: 'assets/generated/sprites', requiredMetadata: ['projectName', 'assetType'] },
      { id: 'spritesheet', description: 'Character spritesheet', outputFolder: 'assets/generated/spritesheets', requiredMetadata: ['projectName', 'frameCount', 'dimensions'] },
      { id: 'tileset', description: 'Game tileset', outputFolder: 'assets/generated/tilesets', requiredMetadata: ['projectName', 'tileSize'] },
      { id: 'background_layer', description: 'Background layer', outputFolder: 'assets/generated/backgrounds', requiredMetadata: ['projectName', 'parallax'] },
      { id: 'ui_button_set', description: 'UI button set', outputFolder: 'assets/generated/ui', requiredMetadata: ['projectName', 'buttonCount'] },
      { id: 'title_screen', description: 'Title screen', outputFolder: 'assets/generated/marketing', requiredMetadata: ['projectName'] },
      { id: 'game_logo', description: 'Game logo', outputFolder: 'assets/generated/icons', requiredMetadata: ['projectName'] },
      { id: 'marketing_hero', description: 'Marketing hero image', outputFolder: 'assets/generated/marketing', requiredMetadata: ['projectName', 'platform'] },
    ],
    imagePromptTemplate: 'Create an original game {{assetType}} for {{projectName}}. Subject: {{subject}}. Style: {{style}}. Pixel-perfect or clean vector. Game-ready, high quality.',
    imageNegativePromptTemplate: 'copyrighted characters, protected logos, unreadable text, trademarked game characters, exact celebrity likeness, low resolution, duplicate limbs',
    audioAudioTypes: [
      { id: 'ui_click', description: 'UI click sound', outputFolder: 'assets/generated/audio/game/sfx', defaultDuration: 0.3, loopable: false, requiredMetadata: ['projectName', 'audioType'] },
      { id: 'ui_confirm', description: 'UI confirm sound', outputFolder: 'assets/generated/audio/game/sfx', defaultDuration: 0.5, loopable: false, requiredMetadata: ['projectName'] },
      { id: 'jump_sound', description: 'Jump sound', outputFolder: 'assets/generated/audio/game/sfx', defaultDuration: 0.4, loopable: false, requiredMetadata: ['projectName', 'gameplayTrigger'] },
      { id: 'pickup_sound', description: 'Item pickup sound', outputFolder: 'assets/generated/audio/game/sfx', defaultDuration: 0.6, loopable: false, requiredMetadata: ['projectName'] },
      { id: 'hit_sound', description: 'Hit/damage sound', outputFolder: 'assets/generated/audio/game/sfx', defaultDuration: 0.3, loopable: false, requiredMetadata: ['projectName'] },
      { id: 'explosion', description: 'Explosion SFX', outputFolder: 'assets/generated/audio/game/sfx', defaultDuration: 1.5, loopable: false, requiredMetadata: ['projectName'] },
      { id: 'level_music', description: 'Level music loop', outputFolder: 'assets/generated/audio/game/music', defaultDuration: 60, loopable: true, requiredMetadata: ['projectName', 'mood', 'bpm'] },
      { id: 'battle_music', description: 'Battle music loop', outputFolder: 'assets/generated/audio/game/music', defaultDuration: 90, loopable: true, requiredMetadata: ['projectName', 'intensity'] },
      { id: 'menu_music', description: 'Menu music loop', outputFolder: 'assets/generated/audio/game/music', defaultDuration: 30, loopable: true, requiredMetadata: ['projectName'] },
      { id: 'victory_jingle', description: 'Victory jingle', outputFolder: 'assets/generated/audio/game/stingers', defaultDuration: 5, loopable: false, requiredMetadata: ['projectName'] },
      { id: 'ambient_loop', description: 'Ambient soundscape', outputFolder: 'assets/generated/audio/game/ambience', defaultDuration: 60, loopable: true, requiredMetadata: ['projectName', 'environment'] },
    ],
    audioPromptTemplate: 'Create original {{audioType}} for {{projectName}}. Mood: {{mood}}. Duration: {{duration}}s. {{style}}. Game-ready SFX or music loop.',
    audioNegativePromptTemplate: 'copyrighted melodies, famous game soundalikes, celebrity voices, protected character voices, exact soundalikes',
    outputFolders: { images: 'assets/generated', audio: 'assets/generated/audio/game' },
    starterTemplates: [
      { id: 'create-phaser', name: 'Phaser CLI (Interactive)', description: 'Phaser 4/3 CLI - select framework/bundler/TypeScript', url: 'npm create @phaserjs/game@latest', recommended: true },
      { id: 'phaser-vite', name: 'Phaser 3 + Vite', description: 'Phaser 3 + Vite + TypeScript', url: 'npx degit phaserjs/template-vite', recommended: false },
      { id: 'phaser-vite-ts', name: 'Phaser 3 + Vite + TS', description: 'Phaser 3 + Vite + TypeScript', url: 'npx degit phaserjs/template-vite#typescript', recommended: false },
      { id: 'phaser-webpack', name: 'Phaser 3 + Webpack', description: 'Phaser 3 + Webpack + TypeScript', url: 'npx degit phaserjs/template-webpack-ts', recommended: false },
      { id: 'phaser-esbuild', name: 'Phaser 3 + ESBuild', description: 'Phaser 3 + ESBuild + TypeScript', url: 'npx degit phaserjs/template-esbuild-ts', recommended: false },
      { id: 'phaser-rollup', name: 'Phaser 3 + Rollup', description: 'Phaser 3 + Rollup + TypeScript', url: 'npx degit phaserjs/template-rollup-ts', recommended: false },
      { id: 'phaser-bun', name: 'Phaser 3 + Bun', description: 'Phaser 3 + Bun + Vite + TypeScript', url: 'npx degit phaserjs/template-bun', recommended: false },
      { id: 'ourcade-vite', name: 'ourcade Phaser Vite', description: 'Ourcade Phaser 3 + Vite template', url: 'npx degit ourcade/phaser3-vite-template', recommended: false },
      { id: 'phaser4-vite', name: 'Phaser 4 + Vite', description: 'Phaser 4 beta + Vite + TypeScript', url: 'npx degit michaelpwest/phaser-typescript-template', recommended: false },
      { id: 'godot-template', name: 'Godot 4 Template', description: 'Godot 4 generic game template', url: 'npx degit crystal-bit/godot-game-template', recommended: true },
      { id: 'godot-minimal', name: 'Godot Minimal', description: 'Godot 4 minimal with menus/scenes', url: 'npx degit Maaack/Godot-Minimal-Game-Template', recommended: false },
      { id: 'godot-jam', name: 'Godot Jam', description: 'Godot 4 jam template with CI/CD', url: 'npx degit hatmix/godot-4-jam-template', recommended: false },
      { id: 'unity-starter', name: 'Unity Starter', description: 'Unity project with packages/architecture', url: 'npx degit SamuelAsherRivello/unity-project-template', recommended: false },
      { id: 'unity-mai', name: 'MaiKuraki UnityStarter', description: 'Production Unity framework + GAS', url: 'npx degit MaiKuraki/UnityStarter', recommended: false },
      { id: 'unity-cyclone', name: 'CycloneGames Unity', description: 'Unity modular gameplay framework', url: 'npx degit CycloneGames/CycloneGames.GameplayFramework', recommended: false },
      { id: 'flame-base', name: 'Flame Base', description: 'Flame game engine base template', url: 'flutter create --platforms=android,ios mygame && cd mygame && flutter pub add flame', recommended: false },
    ],
  },
  'website-webapp': {
    id: 'website-webapp',
    displayName: 'Website & Webapp Studio',
    description: 'For marketing websites, content websites, SaaS frontends, landing pages, Cloudflare Pages, Next.js apps, and SEO-heavy projects.',
    recommendedStacks: ['Next.js', 'Vite', 'React', 'Astro', 'Tailwind CSS', 'PostgreSQL', 'Drizzle ORM', 'Supabase', 'Docker'],
    defaultDocs: ['docs/WEBSITE_BRIEF.md', 'docs/DESIGN_SYSTEM.md', 'docs/DATABASE_SCHEMA.md', 'docs/DOCKER_SETUP.md', 'docs/INFORMATION_ARCHITECTURE.md', 'docs/PAGE_MAP.md', 'docs/COMPONENT_SYSTEM.md', 'docs/SEO_PLAN.md'],
    requiredQuestions: ['What type of website?', 'Target audience?', 'Main CTA?', 'Do you need a database (Postgres, etc)?', 'Preferred UI Library (shadcn/ui, Radix, etc)?', 'Do you need Docker support?'],
    defaultFolders: ['src', 'public', 'docs', 'src/lib/db', 'src/components/ui', 'assets/design', 'docker'],
    systemPrompt: `You are a high-end web UI/UX specialist and full-stack architect. 
    Follow modern design principles: 
    - Use whitespace effectively (8pt grid).
    - Implement accessible color contrast (WCAG AA+).
    - Prioritize typography hierarchy.
    - Use modern component patterns (shadcn/ui style).
    - Architect robust database schemas using Postgres/Drizzle.
    - Provide production-ready Docker configurations.
    - Optimize for Core Web Vitals and SEO.
    
    TEMPLATE EXAMPLES:
    - Next.js (Modern Web): Use App Router, Server Components, Tailwind v4, and shadcn/ui.
    - Database (Postgres): Use Drizzle for type-safe queries. Example: db.select().from(users).where(eq(users.id, 1)).
    - Python (Data): Use Pandas/NumPy for vectorization. Example: df.groupby('cat').sum().
    
    Create website briefs with page maps, component maps, SEO structured data, accessibility, responsive design, and deployment planning.`,
    guardrails: [
      'Follow WCAG accessibility',
      'Include alt text',
      'No auto-playing audio without consent',
      'Use parameterized queries for SQL',
      'Never expose DB credentials in client code',
      'Use multi-stage Docker builds for production'
    ],
    validationChecklist: ['Lighthouse score > 90', 'Responsive works', 'No console errors', 'DB migrations valid'],
    releaseChecklist: ['Build succeeds', 'SEO validated', 'Performance checked', 'DB production ready'],
    imageAssetTypes: [
      { id: 'homepage_hero', description: 'Homepage hero', outputFolder: 'assets/generated/web/hero', defaultAspectRatio: '16:9', requiredMetadata: ['targetPage'] },
      { id: 'section_illustration', description: 'Section illustration', outputFolder: 'assets/generated/web/sections', requiredMetadata: ['targetSection'] },
      { id: 'blog_article', description: 'Blog article image', outputFolder: 'assets/generated/web/articles', requiredMetadata: ['seoAltText'] },
      { id: 'open_graph', description: 'Open Graph image', outputFolder: 'assets/generated/web/social', defaultAspectRatio: '1200:630', requiredMetadata: ['title'] },
      { id: 'social_preview', description: 'Social preview', outputFolder: 'assets/generated/web/social', requiredMetadata: ['platform'] },
      { id: 'product_mockup', description: 'Product mockup', outputFolder: 'assets/generated/web/marketing', requiredMetadata: ['productName'] },
      { id: 'icon_set', description: 'Icon set', outputFolder: 'assets/generated/web/icons', requiredMetadata: ['iconCount'] },
      { id: 'web_layout_mockup', description: 'Website Layout Mockup', outputFolder: 'assets/generated/web/mockups', requiredMetadata: ['pageName'] },
      { id: 'responsive_breakpoints', description: 'Responsive Breakpoints Visual', outputFolder: 'assets/generated/web/mockups', requiredMetadata: [] },
      { id: 'db_diagram', description: 'Database ER Diagram', outputFolder: 'assets/generated/web/docs', requiredMetadata: [] },
    ],
    imagePromptTemplate: 'Create an original {{assetType}} for {{projectName}}. Subject: {{subject}}. Style: {{style}}. Modern, premium, professional web design.',
    imageNegativePromptTemplate: 'copyrighted characters, watermark, text, low resolution, noise, dated design, cluttered UI',
    audioAudioTypes: [
      { id: 'notification_chime', description: 'Notification chime', outputFolder: 'assets/generated/audio/web/notifications', defaultDuration: 2, loopable: false, requiredMetadata: ['targetPage'] },
      { id: 'brand_sting', description: 'Brand sound logo', outputFolder: 'assets/generated/audio/web/brand', defaultDuration: 3, loopable: false, requiredMetadata: ['brandName'] },
      { id: 'interaction_sound', description: 'UI interaction sound', outputFolder: 'assets/generated/audio/web/interaction', defaultDuration: 0.2, loopable: false, requiredMetadata: ['interactionType'] },
    ],
    audioPromptTemplate: 'Create original {{audioType}} for {{projectName}}. Duration: {{duration}}s. {{style}}. Subtle, non-distracting.',
    audioNegativePromptTemplate: 'annoying, harsh, too loud, copyrighted melodies',
    outputFolders: { images: 'assets/generated/web', audio: 'assets/generated/audio/web' },
    starterTemplates: [
      { id: 'create-next-full', name: 'Next.js + Postgres + Drizzle', description: 'Next.js 16 + App Router + Postgres + Drizzle ORM + shadcn/ui', url: 'npx create-next-app@latest . --typescript --tailwind --eslint --app --use-npm --src-dir && npm install drizzle-orm pg && npm install -D drizzle-kit @types/pg', recommended: true },
      { id: 'next-saas-starter', name: 'Next.js SaaS Boilerplate', description: 'Full SaaS stack: Next.js + Auth + Stripe + Postgres', url: 'npx degit steven-tey/precedent', recommended: true },
      { id: 'astro-db', name: 'Astro + Studio DB', description: 'Astro with integrated Database and UI components', url: 'npm create astro@latest -- --template starlight/docs', recommended: false },
      { id: 'next-forge', name: 'Next Forge', description: 'Production Turborepo + Clerk + Stripe + Drizzle', url: 'npx next-forge@latest init', recommended: true },
      { id: 'remix-postgres', name: 'Remix + Postgres', description: 'Remix Run stack with Postgres/Prisma', url: 'npx create-remix@latest --template remix-run/indie-stack', recommended: false },
    ],
  },
  'app-development': {
    id: 'app-development',
    displayName: 'App Development Studio',
    description: 'For desktop apps, mobile apps, business tools, CRMs, dashboards, offline-first apps, and admin tools.',
    recommendedStacks: ['Tauri', 'Electron', 'React Native', 'Flutter', 'Swift'],
    defaultDocs: ['docs/PRD.md', 'docs/USER_ROLES.md', 'docs/USER_FLOWS.md', 'docs/DATA_MODEL.md', 'docs/API_SPEC.md', 'docs/MOBILE_SIGNING.md'],
    requiredQuestions: ['What platform?', 'Offline required?', 'Main user flows?', 'Need app store signing?'],
    defaultFolders: ['src', 'assets', 'docs'],
    systemPrompt: `You are a product architect. Create PRDs with user roles, flows, data models, API specs, permissions, and release planning.`,
    guardrails: ['Follow security best practices', 'Include auth/permissions model', 'Test edge cases'],
    validationChecklist: ['Build succeeds', 'All screens render', 'API contracts valid'],
    releaseChecklist: ['Platform builds', 'Store guidelines met', 'Signing configured'],
    imageAssetTypes: [
      { id: 'app_icon', description: 'App icon', outputFolder: 'assets/generated/app/icons', requiredMetadata: ['platform', 'dimensions'] },
      { id: 'splash_screen', description: 'Splash screen', outputFolder: 'assets/generated/app/screenshots', requiredMetadata: ['platform'] },
      { id: 'onboarding_illustration', description: 'Onboarding illustration', outputFolder: 'assets/generated/app/onboarding', requiredMetadata: ['step'] },
      { id: 'feature_illustration', description: 'Feature illustration', outputFolder: 'assets/generated/app/features', requiredMetadata: ['featureName'] },
      { id: 'mobile_screenshot', description: 'Mobile app screenshot', outputFolder: 'assets/generated/app/screenshots', requiredMetadata: ['screenName'] },
      { id: 'ios_preview', description: 'iOS App Preview Frame', outputFolder: 'assets/generated/app/previews', requiredMetadata: ['deviceModel'] },
      { id: 'android_preview', description: 'Android App Preview Frame', outputFolder: 'assets/generated/app/previews', requiredMetadata: ['deviceModel'] },
      { id: 'desktop_mockup', description: 'Desktop App Mockup', outputFolder: 'assets/generated/app/previews', requiredMetadata: ['osType'] },
    ],
    imagePromptTemplate: 'Create an original {{assetType}} for {{projectName}}. Subject: {{subject}}. Style: {{style}}. Platform-ready, clean.',
    imageNegativePromptTemplate: 'copyrighted characters, watermark, text, low quality',
    audioAudioTypes: [
      { id: 'notification_sound', description: 'App notification sound', outputFolder: 'assets/generated/audio/app/notifications', defaultDuration: 2, loopable: false, requiredMetadata: ['platform'] },
      { id: 'success_sound', description: 'Success feedback sound', outputFolder: 'assets/generated/audio/app/states', defaultDuration: 1, loopable: false, requiredMetadata: [] },
      { id: 'error_sound', description: 'Error feedback sound', outputFolder: 'assets/generated/audio/app/states', defaultDuration: 1, loopable: false, requiredMetadata: [] },
    ],
    audioPromptTemplate: 'Create original {{audioType}} for {{projectName}}. Duration: {{duration}}s. Clear, UX-friendly SFX.',
    audioNegativePromptTemplate: 'harsh, annoying, confusing',
    outputFolders: { images: 'assets/generated/app', audio: 'assets/generated/audio/app' },
    starterTemplates: [
      { id: 'create-tauri', name: 'Tauri CLI (Official)', description: 'Tauri 2 + React + TypeScript', url: 'npm create tauri-app@latest', recommended: true },
      { id: 'create-tauri-react', name: 'create-tauri-react', description: 'Tauri 2 + React 19 + shadcn/ui', url: 'npx create-tauri-react@latest', recommended: true },
      { id: 'tauri-react-starter', name: 'kszongic Tauri React', description: 'Tauri 2 + React + Tailwind CSS', url: 'npx degit kszongic/tauri-react-starter', recommended: false },
      { id: 'modern-desktop', name: 'Modern Desktop Template', description: 'Tauri 2 + React 19 + Zustand + TanStack Query', url: 'npx degit elibroftw/modern-desktop-app-template', recommended: false },
      { id: 'tauri-blueprint', name: 'Blueprint Tauri React', description: 'Tauri + React + Vite + Ant Design', url: 'npx degit BlueprintDevHub/tauri-react-template', recommended: false },
      { id: 'rn-expo', name: 'React Native Expo', description: 'RN Expo with TypeScript', url: 'npx create-expo-app@latest', recommended: true },
      { id: 'rn-expo-router', name: 'React Native Expo Router', description: 'RN Expo + Expo Router file-based nav', url: 'npx create-expo-app@latest --template expo-router', recommended: false },
      { id: 'rn-rnr-starter', name: 'rnr-starter', description: 'RN Expo boilerplate 50+ UI components', url: 'npx create-expo-app MyApp --template rnr-starter', recommended: false },
      { id: 'rn-bare', name: 'React Native Bare', description: 'RN bare + TypeScript + feature-first', url: 'npx degit maximcoding/react-native-bare-starter', recommended: false },
      { id: 'rn-eas-build', name: 'EAS Build (Cloud)', description: 'Expo cloud builds via EAS - no local Xcode/Android Studio', url: 'npm install -g eas-cli && eas init', recommended: false },
      { id: 'rn-eas-submit', name: 'EAS Submit', description: 'Submit to App Store/Play Store via EAS', url: 'eas submit -p ios', recommended: false },
      { id: 'swiftui-stack', name: 'SwiftUI Indie Stack', description: 'SwiftUI + TCA + RevenueCat + Firebase', url: 'npx degit cliffordh/swiftui-indie-stack', recommended: false },
      { id: 'swiftui-starter', name: 'SwiftUI Starter Kit', description: 'SwiftUI starter with Firebase', url: 'npx degit iosapptemplates/swiftui-starter-kit', recommended: false },
      { id: 'swift-no-mac', name: 'No-Mac iOS Starter', description: 'Pure SwiftUI + GitHub Actions (no Mac needed)', url: 'npx degit msonrm/no-mac-ios-starter', recommended: false },
      { id: 'ios-fastlane', name: 'iOS Fastlane', description: 'iOS CI/CD with Fastlane + Match', url: 'fastlane init && fastlane match init', recommended: false },
      { id: 'flutter-create', name: 'Flutter (Official)', description: 'Flutter create project', url: 'flutter create myapp', recommended: true },
      { id: 'flutter-flame', name: 'Flutter Flame', description: 'Flame game engine for Flutter', url: 'flutter create mygame && cd mygame && flutter pub add flame', recommended: false },
      { id: 'flutter-build-apk', name: 'Flutter Build APK', description: 'Build debug APK locally', url: 'flutter build apk --debug', recommended: false },
      { id: 'flutter-build-aab', name: 'Flutter Build AAB', description: 'Build Android App Bundle', url: 'flutter build appbundle', recommended: false },
      { id: 'flutter-build-ipa', name: 'Flutter Build iOS', description: 'iOS build (requires macOS)', url: 'flutter build ios --release', recommended: false },
    ],
  },
  'ai-cloudflare': {
    id: 'ai-cloudflare',
    displayName: 'AI / Cloudflare Worker Studio',
    description: 'For Cloudflare Workers, Workers AI apps, AI wrappers, API products, prompt tools, and serverless apps.',
    recommendedStacks: ['Cloudflare Workers', 'Workers AI', 'D1', 'KV', ' Durable Objects'],
    defaultDocs: ['docs/AI_APP_BRIEF.md', 'docs/WORKER_ARCHITECTURE.md', 'docs/API_CONTRACT.md', 'docs/PROMPT_ARCHITECTURE.md'],
    requiredQuestions: ['What AI capability?', 'Rate limits?', 'Storage needs?'],
    defaultFolders: ['src', 'docs'],
    systemPrompt: `You are a serverless AI architect. Create Worker architectures with API contracts, prompt engineering, rate limiting, KV/D1 storage, and observability.`,
    guardrails: ['Include rate limiting', 'Add safety filters', 'Track costs'],
    validationChecklist: ['Worker deploys', 'Rate limits work', 'No sensitive data in logs'],
    releaseChecklist: ['Workers config valid', 'Performance tested', 'Costs within budget'],
    imageAssetTypes: [
      { id: 'ai_product_hero', description: 'AI product hero', outputFolder: 'assets/generated/ai/hero', requiredMetadata: ['productName'] },
      { id: 'architecture_diagram', description: 'Cloud architecture diagram', outputFolder: 'assets/generated/ai/concepts', requiredMetadata: ['components'] },
      { id: 'api_workflow', description: 'API workflow visual', outputFolder: 'assets/generated/ai/diagrams', requiredMetadata: ['flow'] },
    ],
    imagePromptTemplate: 'Create an original {{assetType}} for {{projectName}}. Subject: {{subject}}. Technical, clean illustration.',
    imageNegativePromptTemplate: 'copyrighted logos, watermarks, text',
    audioAudioTypes: [
      { id: 'voice_greeting', description: 'Voice agent greeting', outputFolder: 'assets/generated/audio/ai/voice', defaultDuration: 5, loopable: false, requiredMetadata: ['transcript'] },
      { id: 'notification_tone', description: 'System notification tone', outputFolder: 'assets/generated/audio/ai/notifications', defaultDuration: 1, loopable: false, requiredMetadata: [] },
    ],
    audioPromptTemplate: 'Create original {{audioType}} for {{projectName}}. Duration: {{duration}}s. Clear voice or tone.',
    audioNegativePromptTemplate: 'celebrity voices, copyrighted speech',
    outputFolders: { images: 'assets/generated/ai', audio: 'assets/generated/audio/ai' },
    starterTemplates: [
      { id: 'create-cloudflare', name: 'Cloudflare CLI (Official)', description: 'Cloudflare Workers CLI - interactive template selection', url: 'npm create cloudflare@latest', recommended: true },
      { id: 'worker-typescript', name: 'Worker TypeScript Template', description: 'Cloudflare Workers + TypeScript', url: 'npx wrangler generate my-worker https://github.com/cloudflare/worker-typescript-template', recommended: false },
      { id: 'worker-sites', name: 'Worker Sites', description: 'Cloudflare Workers Sites (static assets)', url: 'npx wrangler generate my-site https://github.com/cloudflare/worker-sites-template', recommended: false },
      { id: 'cloudflare-workflows', name: 'Cloudflare Workflows', description: 'Cloudflare Workflows starter', url: 'npm create cloudflare@latest -- --template cloudflare/workflows-starter', recommended: false },
    ],
  },
  'asset-generation': {
    id: 'asset-generation',
    displayName: 'Asset Generation Studio',
    description: 'For image prompts, sprites, tilesets, logos, UI packs, game asset libraries, and prompt libraries.',
    recommendedStacks: ['Flux', 'Midjourney'],
    defaultDocs: ['docs/ASSET_BIBLE.md', 'docs/PROMPT_PACK.md'],
    requiredQuestions: ['What asset type?', 'Style guide?', 'Quantity?'],
    defaultFolders: ['assets', 'assets/generated', 'docs'],
    systemPrompt: `You are an asset pipeline specialist. Generate original non-infringing assets with consistent style, metadata, and naming conventions.`,
    guardrails: ['Never infringe copyrights', 'No protected character lookalikes', 'Include metadata'],
    validationChecklist: ['Style consistent', 'Metadata complete', 'Naming follows rules'],
    releaseChecklist: ['All assets validated', 'License clear', 'Pack organized'],
    imageAssetTypes: [
      { id: 'character_pack', description: 'Character pack', outputFolder: 'assets/generated/asset-studio/characters', requiredMetadata: ['packName', 'characterCount'] },
      { id: 'environment_pack', description: 'Environment pack', outputFolder: 'assets/generated/asset-studio/environments', requiredMetadata: ['packName', 'sceneCount'] },
      { id: 'ui_kit', description: 'UI kit', outputFolder: 'assets/generated/asset-studio/ui', requiredMetadata: ['componentCount'] },
      { id: 'icon_pack', description: 'Icon pack', outputFolder: 'assets/generated/asset-studio/icons', requiredMetadata: ['iconCount', 'style'] },
    ],
    imagePromptTemplate: 'Create an original {{assetType}} for {{projectName}}. Subject: {{subject}}. Style: {{style}}. Consistent with style guide.',
    imageNegativePromptTemplate: 'inconsistent, watermarks, copyrighted characters, low quality',
    audioAudioTypes: [
      { id: 'sfx_pack', description: 'SFX pack', outputFolder: 'assets/generated/audio/asset-studio/game-sfx', defaultDuration: 2, loopable: false, requiredMetadata: ['packName', 'sfxCount'] },
      { id: 'music_pack', description: 'Music loop pack', outputFolder: 'assets/generated/audio/asset-studio/music-loops', defaultDuration: 30, loopable: true, requiredMetadata: ['packName', 'trackCount'] },
    ],
    audioPromptTemplate: 'Create {{audioType}} for {{projectName}}. Consistent with style guide: {{style}}.',
    audioNegativePromptTemplate: 'inconsistent quality, copyrighted melodies',
    outputFolders: { images: 'assets/generated/asset-studio', audio: 'assets/generated/audio/asset-studio' },
    starterTemplates: [],
  },
  'audio-generation': {
    id: 'audio-generation',
    displayName: 'Audio Generation Studio',
    description: 'For focused audio work: music loops, SFX, UI sounds, narration, voice lines, stingers, and sound logos.',
    recommendedStacks: ['Minimax Music API'],
    defaultDocs: ['docs/AUDIO_BRIEF.md', 'docs/AUDIO_BIBLE.md', 'docs/MUSIC_STYLE_GUIDE.md'],
    requiredQuestions: ['What audio type?', 'Mood/style?', 'Duration?'],
    defaultFolders: ['assets', 'assets/generated/audio', 'docs'],
    systemPrompt: `You are an audio production specialist. Generate original non-infringing audio with descriptive music language: mood, tempo, instrumentation, genre, energy. Never clone voices.`,
    guardrails: ['Never clone voices', 'No copyrighted melodies', 'Include transcripts'],
    validationChecklist: ['Audio clean', 'Format correct', 'Metadata complete'],
    releaseChecklist: ['All tracks validated', 'Licensing clear', 'Pack organized'],
    imageAssetTypes: [],
    imagePromptTemplate: '',
    imageNegativePromptTemplate: '',
    audioAudioTypes: [
      { id: 'music_loop', description: 'Music loop', outputFolder: 'assets/generated/audio/studio/music', defaultDuration: 30, loopable: true, requiredMetadata: ['mood', 'bpm', 'key'] },
      { id: 'full_track', description: 'Full music track', outputFolder: 'assets/generated/audio/studio/music', defaultDuration: 180, loopable: false, requiredMetadata: ['mood', 'bpm'] },
      { id: 'sound_effect', description: 'Sound effect', outputFolder: 'assets/generated/audio/studio/sfx', defaultDuration: 3, loopable: false, requiredMetadata: ['category'] },
      { id: 'ui_sound', description: 'UI sound', outputFolder: 'assets/generated/audio/studio/ui', defaultDuration: 0.5, loopable: false, requiredMetadata: ['useCase'] },
      { id: 'narration', description: 'Narration/voiceover', outputFolder: 'assets/generated/audio/studio/voice', defaultDuration: 60, loopable: false, requiredMetadata: ['transcript', 'voice'] },
      { id: 'podcast_intro', description: 'Podcast intro', outputFolder: 'assets/generated/audio/studio/podcast', defaultDuration: 15, loopable: false, requiredMetadata: ['showName'] },
      { id: 'stinger', description: 'Audio stinger', outputFolder: 'assets/generated/audio/studio/stingers', defaultDuration: 5, loopable: false, requiredMetadata: ['useCase'] },
    ],
    audioPromptTemplate: 'Create original {{audioType}} for {{projectName}}. Mood: {{mood}}. Duration: {{duration}}s. {{style}}. {{instrumentation}}.',
    audioNegativePromptTemplate: 'copyrighted melodies, celebrity voices, protected character voices, exact soundalikes',
    outputFolders: { images: 'assets/generated/studio', audio: 'assets/generated/audio/studio' },
    starterTemplates: [],
  },
  'python-scripting': {
    id: 'python-scripting',
    displayName: 'Python Scripting & Data',
    description: 'For data analysis, automation, web scraping, AI/ML experiments, and Python-based backends.',
    recommendedStacks: ['Python', 'Pandas', 'NumPy', 'FastAPI', 'Flask', 'Scikit-learn', 'Pytest', 'Docker'],
    defaultDocs: ['docs/PYTHON_PROJECT_BRIEF.md', 'docs/DATA_PIPELINE.md', 'docs/API_SPEC.md', 'docs/VENV_SETUP.md'],
    requiredQuestions: ['Project goal?', 'Data sources?', 'Need a web API?', 'Database required?'],
    defaultFolders: ['src', 'data', 'notebooks', 'tests', 'docs'],
    systemPrompt: `You are a Python expert and data scientist. 
    Follow PEP 8 guidelines. 
    Use virtual environments (venv) for dependency management.
    Write clean, vectorized code for data processing.
    Provide comprehensive tests with pytest.
    Design robust APIs with FastAPI or Flask.
    Implement data visualizations with matplotlib/seaborn.`,
    guardrails: [
      'Always use a virtual environment',
      'Never commit large datasets to git',
      'Sanitize all user inputs',
      'Handle API rate limits'
    ],
    validationChecklist: ['Pytest passes', 'Type checks (mypy) pass', 'API endpoints valid'],
    releaseChecklist: ['Requirements.txt updated', 'Docker image builds', 'Documentation complete'],
    imageAssetTypes: [
      { id: 'data_flow_diagram', description: 'Data processing flow', outputFolder: 'assets/generated/python/docs', requiredMetadata: [] },
      { id: 'chart_concept', description: 'Visualization concept', outputFolder: 'assets/generated/python/viz', requiredMetadata: ['chartType'] },
    ],
    imagePromptTemplate: 'Create an original {{assetType}} for {{projectName}}. Subject: {{subject}}. Style: {{style}}.',
    imageNegativePromptTemplate: 'copyrighted characters, watermark, text',
    audioAudioTypes: [],
    audioPromptTemplate: '',
    audioNegativePromptTemplate: '',
    outputFolders: { images: 'assets/generated/python', audio: 'assets/generated/python' },
    starterTemplates: [
      { id: 'python-fastapi', name: 'FastAPI Starter', description: 'Modern Python web API with FastAPI', url: 'python -m venv venv && ./venv/Scripts/activate && pip install fastapi uvicorn', recommended: true },
      { id: 'python-data-science', name: 'Data Science Stack', description: 'Pandas, NumPy, and Matplotlib pre-installed', url: 'python -m venv venv && ./venv/Scripts/activate && pip install pandas numpy matplotlib seaborn jupyter', recommended: true },
      { id: 'python-script', name: 'Basic Script', description: 'Simple Python script template', url: 'python -m venv venv && ./venv/Scripts/activate', recommended: false },
    ],
   },
  'retro-game-dev': {
    id: 'retro-game-dev',
    displayName: 'Retro Game Dev Studio',
    description: 'For C64, ZX Spectrum, Amiga, Atari, and other vintage systems. Includes assembly, C, and chip-tune assets.',
    recommendedStacks: ['Assembly (6502/Z80/68000)', 'C (cc65/z88dk)', 'KickAssembler', 'Amiga C', 'Docker'],
    defaultDocs: ['docs/RETRO_DESIGN.md', 'docs/MEMORY_MAP.md', 'docs/HARDWARE_REGS.md', 'docs/ASSET_CONVERSION.md', 'docs/EMULATOR_SETUP.md'],
    requiredQuestions: ['Which target system (C64, Amiga, etc)?', 'Language (Assembly, C, BASIC)?', 'Need emulator setup?', 'Target storage (Disk, Tape, Cartridge)?'],
    defaultFolders: ['src', 'assets/sprites', 'assets/tiles', 'assets/music', 'assets/screens', 'tools', 'bin', 'docs/hardware'],
    systemPrompt: `You are a legendary retro game developer and hardware hacker. 
    Expertise:
    - C64: VIC-II, SID, 6502 Assembly.
    - ZX Spectrum: Z80 Assembly, ULA, Beeper/AY-3-8910.
    - Amiga: OCS/ECS/AGA, Copper, Blitter, Paula, 68000 Assembly.
    - Atari 8-bit/ST: ANTIC, GTIA, POKEY, MIDI.
    - Optimization: Cycle-counting, memory bank switching, raster interrupts.
    - Assets: Pixel-perfect, limited palette, tile-based.

    RETRO CODE EXAMPLES:
    - 6502 (C64): lda #$01 : sta $d020 (Change border color).
    - Z80 (Spectrum): ld a, 7 : out (254), a (Change border color).
    - C (cc65): *(char*)0xd020 = 1; (Change border color).
    - Amiga (Copper): dc.w $0180, $000 (Set background color to black).

    Always provide optimized code and explain hardware constraints clearly for non-coders.`,
    guardrails: [
      'Respect memory limits of target hardware',
      'Use cycle-exact timing where needed',
      'Validate palette for target system',
      'Never exceed hardware sprites/blitter limits'
    ],
    validationChecklist: ['Compiles for target', 'Memory map valid', 'Palette correct', 'Cycles optimized'],
    releaseChecklist: ['PRG/D64/ADF generated', 'Tested in Emulator', 'Documentation complete'],
    imageAssetTypes: [
      { id: 'retro_sprite', description: 'Retro Sprite (Pixel-perfect)', outputFolder: 'assets/generated/retro/sprites', requiredMetadata: ['system', 'palette'] },
      { id: 'retro_tileset', description: 'Retro Tileset', outputFolder: 'assets/generated/retro/tilesets', requiredMetadata: ['tileSize', 'system'] },
      { id: 'retro_screen', description: 'Full Screen Mockup', outputFolder: 'assets/generated/retro/screens', requiredMetadata: ['resolution'] },
      { id: 'retro_font', description: '8-bit Character Set', outputFolder: 'assets/generated/retro/fonts', requiredMetadata: [] },
    ],
    imagePromptTemplate: 'Create an original {{system}} {{assetType}}. Style: pixel-art, limited palette, {{system}} hardware accurate.',
    imageNegativePromptTemplate: 'high resolution, anti-aliasing, modern gradients, blurry',
    audioAudioTypes: [
      { id: 'chip_tune', description: 'SID/AY/Paula Chip-tune', outputFolder: 'assets/generated/retro/audio', defaultDuration: 30, loopable: true, requiredMetadata: ['system', 'channels'] },
      { id: 'retro_sfx', description: '8-bit Sound Effect', outputFolder: 'assets/generated/retro/audio', defaultDuration: 1, loopable: false, requiredMetadata: ['system'] },
    ],
    audioPromptTemplate: 'Create a {{system}} accurate {{audioType}}. Mood: {{mood}}. Hardware: {{system}} sound chip.',
    audioNegativePromptTemplate: 'modern samples, high fidelity, realistic instruments',
    outputFolders: { images: 'assets/generated/retro', audio: 'assets/generated/retro/audio' },
    starterTemplates: [
      { id: 'c64-cc65', name: 'C64 (cc65)', description: 'C development for C64 using cc65 toolchain', url: 'docker run --rm -v ${PWD}:/work -w /work ghcr.io/sakura/retro-tools:latest cc65 init', recommended: true },
      { id: 'amiga-c', name: 'Amiga C (VBCC)', description: 'Amiga development with VBCC and NDK', url: 'docker run --rm -v ${PWD}:/work -w /work ghcr.io/sakura/retro-tools:latest amiga-init', recommended: true },
      { id: 'zx-z88dk', name: 'ZX Spectrum (z88dk)', description: 'C and Assembly for Spectrum', url: 'docker run --rm -v ${PWD}:/work -w /work ghcr.io/sakura/retro-tools:latest z88dk-init', recommended: false },
    ],
  },
};

export const getWorkflowProfile = (id: WorkflowId): WorkflowProfile => {
  const profile = WORKFLOW_REGISTRY[id];
  if (!profile) throw new Error(`Unknown workflow: ${id}`);
  return profile;
};

export const getWorkflowIds = (): WorkflowId[] => Object.keys(WORKFLOW_REGISTRY) as WorkflowId[];