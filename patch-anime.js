const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminAnime.tsx', 'utf8');
code = code.replace(
  "import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';",
  "import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';"
);
code = code.replace(
  /const fetchAnime = async \(\) => {[\s\S]*?};\n/,
  `const fetchAnime = () => {
    const unsub = onSnapshot(collection(db, 'anime'), (snap) => {
      setAnimeList(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return unsub;
  };

  useEffect(() => {
    const unsub = fetchAnime();
    return () => unsub();
  }, []);\n`
);
code = code.replace(/useEffect\(\(\) => \{\s*fetchAnime\(\);\s*\}, \[\]\);\n/g, "");
code = code.replace(/fetchAnime\(\);/g, ""); // Remove old manual fetch calls after updates
fs.writeFileSync('src/pages/admin/AdminAnime.tsx', code);
