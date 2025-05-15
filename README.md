# Task Stack Manager

A zero-dependency task stack manager that runs entirely in the browser. No external dependencies, no package managers, no CDNs required.

## Features

- Zero external runtime dependencies
- Works offline
- Encrypted data storage
- Modern browser APIs only
- Single self-contained bundle

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Deployment

The application is automatically deployed to GitHub Pages when changes are merged to the main branch. The deployment process:

1. Builds the application using esbuild
2. Deploys the built files to GitHub Pages
3. The site will be available at `https://<username>.github.io/task-stack`

## Browser Support

- Chrome ≥ 90
- Firefox ≥ 90
- Safari ≥ 14
- Edge ≥ 90

## License

MIT
