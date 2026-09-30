import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspect() {
  const animeSnap = await getDocs(collection(db, 'anime'));
  console.log("=== ANIME SAMPLE (Total: " + animeSnap.size + ") ===");
  animeSnap.docs.slice(0, 3).forEach(d => {
    console.log(d.id, JSON.stringify(d.data(), null, 2));
  });

  const epSnap = await getDocs(collection(db, 'episodes'));
  console.log("=== EPISODES SAMPLE (Total: " + epSnap.size + ") ===");
  epSnap.docs.slice(0, 3).forEach(d => {
    console.log(d.id, JSON.stringify(d.data(), null, 2));
  });

  const seasonSnap = await getDocs(collection(db, 'seasons'));
  console.log("=== SEASONS SAMPLE (Total: " + seasonSnap.size + ") ===");
  seasonSnap.docs.slice(0, 3).forEach(d => {
    console.log(d.id, JSON.stringify(d.data(), null, 2));
  });

  process.exit(0);
}
inspect().catch(err => { console.error(err); process.exit(1); });
