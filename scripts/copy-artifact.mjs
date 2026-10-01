import { copyFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'music-player.html');
console.log('artifact -> music-player.html');
