import { defineConfig } from 'vite';
import path from 'path';

// Bundle source was flattened from upstream's src/client/ → our src/.
// If you re-sync the engine bundle from cs16-wagering/docker/cs-web-server/,
// keep the files at src/ — don't re-add the src/client/ layer.
export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/index.html')
            }
        }
    },
    root: 'src',
});
