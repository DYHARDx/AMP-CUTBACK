
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function applyBranding() {
    try {
        const brandingDoc = await getDoc(doc(db, 'settings', 'branding'));
        if (brandingDoc.exists()) {
            const data = brandingDoc.data();
            const logo = data.logoUrl;
            const name = data.websiteName;

            if (logo) {
                const logoElements = document.querySelectorAll('img[id$="logo"], .nav-branding img, .header-branding img');
                logoElements.forEach(img => {
                    img.src = logo;
                    img.style.display = 'block';
                });
            }

            if (name) {
                const nameElements = document.querySelectorAll('[id$="site-name"], .nav-branding span, .admin-header span');
                nameElements.forEach(el => {
                    el.innerText = name;
                });
                // Update page title if it contains default name
                if (document.title.includes('AMP Mediaz')) {
                    document.title = document.title.replace('AMP Mediaz', name);
                }
            }
        }
    } catch (e) {
        console.error("Branding apply error:", e);
    }
}

// Auto-run on load
applyBranding();
