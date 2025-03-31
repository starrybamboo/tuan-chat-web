# Welcome to React Router V7!

A modern, production-ready template for building full-stack React applications using React Router.

## React Router V7 (aka Remix) Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 [Tailwind CSS](https://tailwindcss.com/) for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Addon Libraries (in disucssion)

- [x] [React Query](https://tanstack.com/query/latest)
- [x] [DaisyUI](https://daisyui.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
pnpm install
```

### Vscode Setup

The repository includes a `.vscode` folder with settings. The setting block the default `prettier` extensions and use `esLint` for formatting on save. The fomatter is pre-configured in `eslint.config.mjs` file. Please make sure you have the `eslint` extension installed in your vscode.

**Due to Vscode limitations, after you clone the repo and installed dependencies, you need to run `pnpm lint` in your terminal to finish the `eslint` setup.**

### Development

Start the development server with HMR (powered by [Vite](https://vitejs.dev/)):

```bash
pnpm dev
```

Your application will be available at `http://localhost:5173`.

The project is pre-configured with `husky` and `lint-staged` to run lint before every commit.

If you failed to commit because of linting errors, run the following command to fix the errors:

```bash
pnpm lint:fix
```

this will lint the whole repository, fix the errors fixable by `eslint` and display the rest of the errors.

---

Built with ❤️ using React Router.
