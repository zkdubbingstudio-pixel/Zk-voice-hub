import os
import glob

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace console.error with console.warn for read errors
    content = content.replace('console.error("Firebase Read Error:", err);', 'console.warn("Firebase Read Error (Quota/Offline):", err.message);')
    content = content.replace('console.error("Firebase read error", err);', 'console.warn("Firebase Read Error (Quota/Offline):", err.message);')
    content = content.replace('console.error("Error fetching anime details:", error);', 'console.warn("Firebase Read Error (Quota/Offline):", error.message);')
    content = content.replace('console.error("Error fetching anime data:", err);', 'console.warn("Firebase Read Error (Quota/Offline):", err.message);')
    content = content.replace('console.error("Failed to track view:", err);', 'console.warn("Failed to track view (Quota/Offline):", err.message);')
    content = content.replace('console.error(err);', 'console.warn(err.message || err);')
    
    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src/pages'):
    for file in files:
        if file.endswith('.tsx'):
            patch_file(os.path.join(root, file))
