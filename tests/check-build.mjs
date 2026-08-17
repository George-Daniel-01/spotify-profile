import fs from 'fs';
import path from 'path';

const buildDir = path.resolve('D:/code/spotify-profile/client/build');
const files = fs.readdirSync(path.join(buildDir, 'static/js'));
const mainFile = files.find(f => f.startsWith('main.'));
console.log('Build files:', files.join(', '));
console.log('Main file:', mainFile);

const js = fs.readFileSync(path.join(buildDir, 'static/js', mainFile), 'utf8');
console.log('Size:', js.length);

const checks = {
  'featuresFromArtists': /featuresFromArtists/.test(js),
  'getAudioFeaturesForTracks': /getAudioFeaturesForTracks/.test(js),
  'singer-songwriter': js.includes('singer-songwriter'),
  'instrumentalness': js.includes('instrumentalness'),
  'danceability': js.includes('danceability'),
  'Last 4 Weeks': js.includes('Last 4 Weeks'),
  'Average Tempo': js.includes('Average Tempo'),
  'GENRE_MAP': js.includes('GENRE_MAP'),
};

for (const [key, val] of Object.entries(checks)) {
  console.log(`${val ? '✓' : '✗'} ${key}`);
}
