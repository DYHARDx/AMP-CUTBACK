import { auth, db } from './firebase-config.js';
import { applyBranding } from './branding_engine.js';
import { checkAuth } from './auth.js';
import {
    collection,
    getDoc,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Ensure affiliate access
checkAuth('affiliate');

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // Load User Branding and Info
    const userDoc = await getDoc(doc(db, 'users', user.email));
    let displayName = user.email.split('@')[0];
    if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.name) {
            displayName = userData.name;
        }
    }

    // Dynamic Greeting
    const greetingEl = document.getElementById('affiliate-greeting');
    if (greetingEl) {
        const hour = new Date().getHours();
        let greet = "Welcome back,";
        if (hour < 12) greet = "Good Morning,";
        else if (hour < 18) greet = "Good Afternoon,";
        else greet = "Good Evening,";
        greetingEl.innerText = `${greet} ${displayName}`;
    }


    // Load user links
    onSnapshot(query(collection(db, 'links'), where('affiliateEmail', '==', user.email)), (snapshot) => {
        const table = document.getElementById('links-table').querySelector('tbody');
        table.innerHTML = '';

        let totalClicks = 0;
        let totalConversions = 0;

        // Sort latest first manually (prevents index errors)
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        docs.forEach((link) => {
            const id = link.id;
            const shortUrl = `${window.location.origin}/link.html?l=${id}`;
            const clicks = link.clicks || 0;
            const conversions = link.conversions || 0;
            const cr = clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0';

            totalClicks += clicks;
            totalConversions += conversions;

            const tr = document.createElement('tr');
            tr.className = 'clickable-row';

            let createdDate = 'Recently';
            if (link.createdAt && typeof link.createdAt.toDate === 'function') {
                createdDate = link.createdAt.toDate().toLocaleDateString();
            }

            tr.innerHTML = `
                <td data-label="Campaign">${link.name || 'Unnamed'}</td>
                <td data-label="Short URL" style="font-family: monospace; font-size: 0.8rem;">${shortUrl}</td>
                <td data-label="Clicks">${clicks}</td>
                <td data-label="Conversions">${conversions}</td>
                <td data-label="CR"><strong style="color: var(--secondary)">${cr}%</strong></td>
                <td data-label="Created">${createdDate}</td>
            `;

            // Interaction: Open Detail Page
            tr.onclick = () => {
                window.location.href = `campaign.html?id=${id}`;
            };

            table.appendChild(tr);
        });

        // Update Overall Stats
        if (document.getElementById('stat-my-links')) {
            document.getElementById('stat-my-links').innerText = snapshot.size;
            document.getElementById('stat-my-clicks').innerText = totalClicks;

            const totalCR = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) + '%' : '0%';
            document.getElementById('stat-my-cr').innerText = totalCR;
        }

        if (docs.length > 0) {
            const top = docs.reduce((prev, current) => ((prev.clicks || 0) > (current.clicks || 0)) ? prev : current);
            document.getElementById('top-link-name').innerText = top.name || 'Top Link';
            document.getElementById('top-link-clicks').innerText = top.clicks || 0;
            document.getElementById('top-link-conv').innerText = top.conversions || 0;

            // Interaction: Open Top Link Detail
            document.getElementById('top-link-name').closest('.stat-card').onclick = () => {
                window.location.href = `campaign.html?id=${top.id}`;
            };
            document.getElementById('top-link-name').closest('.stat-card').style.cursor = 'pointer';

        } else {
            document.getElementById('top-link-name').innerText = "No Campaigns Yet";
        }
    }, (error) => {
        console.error("Link snapshot error:", error);
    });
});

// Notifications Navigation
window.toggleNotifications = () => {
    window.location.href = 'notifications.html';
};

// Load Announcements
const notifFeed = document.getElementById('notifications-feed');
const notifBadge = document.getElementById('notif-badge');

if (notifFeed) {
    onSnapshot(query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(5)), (snapshot) => {
        notifFeed.innerHTML = '';

        if (snapshot.empty) {
            notifBadge.style.display = 'none';
            return;
        }

        // Show badge if there are notifications
        notifBadge.style.display = 'block';
        notifBadge.style.background = 'var(--secondary)'; // Use secondary color for alert
        if (snapshot.docs[0].data().priority === 'high') {
            notifBadge.classList.add('pulse');
            notifBadge.style.background = 'var(--danger)';
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');

            // Priority Styling
            let bg = 'rgba(255, 255, 255, 0.05)';
            let border = 'rgba(255, 255, 255, 0.1)';
            let accent = 'var(--primary)';

            if (data.priority === 'high') {
                bg = 'rgba(239, 68, 68, 0.05)';
                border = 'rgba(239, 68, 68, 0.2)';
                accent = 'var(--danger)';
            } else if (data.priority === 'low') {
                bg = 'transparent';
                border = 'dashed rgba(255, 255, 255, 0.05)';
                accent = 'var(--text-muted)';
            }

            div.className = 'glass animate-fade-in';
            div.style.cssText = `padding: 1.25rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid ${border}; background: ${bg}; position: relative; overflow: hidden;`;

            div.innerHTML = `
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${accent};"></div>
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: ${accent}20; color: ${accent}; width: 35px; height: 35px; min-width: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${data.priority === 'high' ? 'fa-exclamation-triangle' : 'fa-bullhorn'}"></i>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="margin-bottom: 4px; font-weight: 700; color: ${accent === 'var(--text-muted)' ? 'var(--text)' : accent};">${data.title}</h4>
                        <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-muted);">${data.message}</p>
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px; opacity: 0.6;">
                            <i class="far fa-clock"></i> ${data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : 'Just now'}
                        </p>
                    </div>
                </div>
            `;
            notifFeed.appendChild(div);
        });
    }, (error) => {
        console.error("Announcements error:", error);
    });
}

window.toggleNotifications = () => {
    if (notifFeed) {
        const isCurrentlyHidden = notifFeed.style.display === 'none' || notifFeed.style.display === '';

        if (isCurrentlyHidden) {
            notifFeed.style.display = 'block';
            notifBadge.style.display = 'none'; // Clear badge when looking at alerts
            notifFeed.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            notifFeed.style.display = 'none';
        }
    }
};

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
});
