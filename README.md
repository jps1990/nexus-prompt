# NexusPrompt

A powerful AI-powered prompt generation tool for creators, photographers, and artists. Generate detailed, professional variations of your creative prompts with advanced artistic direction.

![Live Version](https://nexusprompt.netlify.app)

![NexusPrompt](https://github.com/jps1990/nexus-prompt/raw/main/public/preview.png)

## Features

- 🎨 Generate 10 unique, detailed prompt variations
- 🎯 Professional artistic direction and technical specifications
- 💫 Enhance existing prompts with AI
- ⚡ Real-time streaming generation
- 🔒 Secure API key encryption
- 💾 Export/Import your prompt library
- 🌙 Beautiful dark mode interface
- 🖼️ Direct integration with HyperFlux AI for image generation

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/jps1990/nexus-prompt.git
cd nexus-prompt
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the root directory with your OpenAI API key:

```env
VITE_OPENAI_API_KEY=your_api_key_here
VITE_ENCRYPTION_KEY=your_encryption_key_here
VITE_NSFW_ALLOWED=false
```

4. Start the development server

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Environment Variables

- `VITE_OPENAI_API_KEY`: Your OpenAI API key
- `VITE_ENCRYPTION_KEY`: Secret key for encrypting API keys in localStorage
- `VITE_NSFW_ALLOWED`: Enable/disable NSFW content (optional) Use "true" or "false" as you want.

## Technologies Used

- React
- TypeScript
- Vite
- Tailwind CSS
- OpenAI API
- Zustand
- Lucide Icons

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this project helpful, consider buying me a coffee:

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/sunboom)
