
import { auth, db } from './firebase-config.js';
import { checkAuth } from './auth.js';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Ensure admin only
checkAuth('admin');

// Tab Switching Logic
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');

        navItems.forEach(n => n.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));

        item.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

// Update Greeting and Load Branding
onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // Branding form population
    const settingsDoc = await getDoc(doc(db, 'settings', 'branding'));
    if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (document.getElementById('setting-site-name')) {
            document.getElementById('setting-site-name').value = data.websiteName || '';
            document.getElementById('setting-logo-url').value = data.logoUrl || '';
        }
    }

    const greetingEl = document.getElementById('greeting-time');
    if (greetingEl) {
        let name = user.email.split('@')[0];
        const userDoc = await getDoc(doc(db, 'users', user.email));
        if (userDoc.exists() && userDoc.data().name) {
            name = userDoc.data().name;
        }

        const hour = new Date().getHours();
        let greet = "Good Morning,";
        if (hour >= 12 && hour < 18) greet = "Good Afternoon,";
        else if (hour >= 18) greet = "Good Evening,";

        greetingEl.textContent = `${greet} ${name}`;
    }
});

// --- Branding ---

// --- Branding ---
const brandingForm = document.getElementById('branding-form');
async function loadSettings() {
    const docSnap = await getDoc(doc(db, 'settings', 'branding'));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('setting-site-name').value = data.websiteName || '';
        document.getElementById('setting-logo-url').value = data.logoUrl || '';
        document.getElementById('admin-site-name').innerText = data.websiteName || 'AMP Mediaz';
        if (data.logoUrl) document.getElementById('admin-logo').src = data.logoUrl;
    }
}
loadSettings();

brandingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const websiteName = document.getElementById('setting-site-name').value;
    const logoUrl = document.getElementById('setting-logo-url').value;

    await setDoc(doc(db, 'settings', 'branding'), {
        websiteName,
        logoUrl,
        updatedAt: serverTimestamp()
    });
    alert("Branding updated!");
    location.reload();
});

// --- Affiliates ---
const affiliatesTable = document.getElementById('affiliates-table');
const linkAffiliateSelect = document.getElementById('link-affiliate');

onSnapshot(query(collection(db, 'users'), where('role', '==', 'affiliate')), (snapshot) => {
    affiliatesTable.innerHTML = '';
    linkAffiliateSelect.innerHTML = '<option value="">Select an affiliate...</option>';

    // Sort client-side to avoid index requirements
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

    docs.forEach((aff) => {
        const id = aff.id;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Name" style="font-weight: 600;">${aff.name || 'N/A'}</td>
            <td data-label="Email">${aff.email}</td>
            <td data-label="Status"><span class="badge ${aff.active ? 'badge-active' : 'badge-inactive'}">${aff.active ? 'Active' : 'Inactive'}</span></td>
            <td data-label="Created">${aff.createdAt?.toDate ? aff.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
            <td data-label="Action">
                <button class="btn btn-outline" onclick="toggleAffiliate('${id}', ${aff.active})">
                    ${aff.active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        `;
        affiliatesTable.appendChild(tr);

        // Populate select for links
        if (aff.active) {
            const opt = document.createElement('option');
            opt.value = aff.email;
            opt.textContent = aff.email;
            linkAffiliateSelect.appendChild(opt);

            const editOpt = opt.cloneNode(true);
            document.getElementById('edit-link-affiliate').appendChild(editOpt);
        }
    });

    document.getElementById('stat-total-affiliates').innerText = snapshot.size;
});

// Global functions for inline usage
window.toggleAffiliate = async (id, currentStatus) => {
    await updateDoc(doc(db, 'users', id), { active: !currentStatus });
};

const addAffiliateForm = document.getElementById('add-affiliate-form');
addAffiliateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('aff-name').value;
    const email = document.getElementById('aff-email').value;
    const password = document.getElementById('aff-password').value;

    try {
        // We create the user in Auth. This will sign in the admin as this user!
        // Traditional Pure JS Firebase client side has this limitation.
        // Better way: Admin creates doc in Firestore, user "activates" account.
        // But the requirements say "Add affiliates with email + password".
        // I will use a separate secondary Firebase app instance to create users without logging out the admin.

        // FOR SIMPLICITY: I'll use the current Auth and explain the limitation, 
        // OR better, I'll use the 'firebase-admin' if it were node, but this is pure HTML.
        // Alternative: Admin just creates a Firestore record, and there's a signup page.
        // BUT the requirements are specific. I will try to use a dummy secondary app.

        const secondaryApp = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js").then(m => m.initializeApp(auth.app.options, "Secondary"));
        const secondaryAuth = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js").then(m => m.getAuth(secondaryApp));

        await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await secondaryAuth.signOut(); // Clean up secondary

        await setDoc(doc(db, 'users', email), {
            name,
            email,
            role: 'affiliate',
            active: true,
            createdAt: serverTimestamp()
        });

        alert("Affiliate created!");
        addAffiliateForm.reset();
        document.getElementById('affiliate-modal').style.display = 'none';
    } catch (error) {
        alert("Error: " + error.message);
    }
});

// --- Admin Management (Team) ---
const adminsTable = document.getElementById('admins-table');

onSnapshot(query(collection(db, 'users'), where('role', '==', 'admin')), (snapshot) => {
    if (!adminsTable) return;
    adminsTable.innerHTML = '';

    snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
        .forEach((admin) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td data-label="Name" style="font-weight: 600;">${admin.name || 'System Admin'}</td>
            <td data-label="Email">${admin.email}</td>
            <td data-label="Role"><span class="badge" style="background: var(--neon-primary); color: var(--primary);">ADMIN</span></td>
            <td data-label="Added">${admin.createdAt?.toDate ? admin.createdAt.toDate().toLocaleDateString() : 'Initial'}</td>
            <td data-label="Action">
                <button class="btn btn-outline" style="color: var(--danger); opacity: 0.5;" disabled title="Core admins cannot be removed">
                    <i class="fas fa-lock"></i>
                </button>
            </td>
        `;
            adminsTable.appendChild(tr);
        });
});

const addAdminForm = document.getElementById('add-admin-form');
if (addAdminForm) {
    addAdminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-admin-name').value;
        const email = document.getElementById('new-admin-email').value;
        const password = document.getElementById('new-admin-password').value;

        try {
            // Secondary Auth to create user without logging out current admin
            const secondaryApp = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js")
                .then(m => m.initializeApp(auth.app.options, "AdminManager"));
            const secondaryAuth = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js")
                .then(m => m.getAuth(secondaryApp));

            await createUserWithEmailAndPassword(secondaryAuth, email, password);
            await secondaryAuth.signOut();

            await setDoc(doc(db, 'users', email), {
                name,
                email,
                role: 'admin',
                active: true,
                createdAt: serverTimestamp()
            });

            alert("New Admin added successfully!");
            addAdminForm.reset();
            document.getElementById('admin-user-modal').style.display = 'none';
        } catch (error) {
            alert("Failed to add admin: " + error.message);
        }
    });
}


// --- Links ---
const linksTable = document.getElementById('links-table');
const overviewLinksTable = document.getElementById('overview-links-table');


onSnapshot(collection(db, 'links'), (snapshot) => {
    linksTable.innerHTML = '';
    overviewLinksTable.innerHTML = '';
    let totalClicks = 0;
    let totalConversions = 0;

    // Sort client-side
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

    docs.forEach((link) => {
        const id = link.id;
        const shortUrl = `${window.location.origin}/link.html?l=${id}`;
        const cr = link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0.0';

        totalClicks += link.clicks || 0;
        totalConversions += link.conversions || 0;

        const tr = document.createElement('tr');
        let createdDate = 'N/A';
        if (link.createdAt && typeof link.createdAt.toDate === 'function') {
            createdDate = link.createdAt.toDate().toLocaleDateString();
        }
        tr.innerHTML = `
            <td data-label="Link Name">${link.name}</td>
            <td data-label="Affiliate">${link.affiliateEmail}</td>
            <td data-label="Short URL" style="font-family: monospace; font-size: 0.8rem;">${shortUrl}</td>
            <td data-label="Ratio">1:${link.ratio}</td>
            <td data-label="Stats">
                <div style="font-size: 0.8rem;">${link.clicks || 0} clks / ${link.conversions || 0} conv</div>
                <div class="stat-label">CR: ${cr}%</div>
            </td>
            <td data-label="Created">${createdDate}</td>
            <td data-label="Actions">
                <div style="display: flex; gap: 5px; justify-content: flex-end;">
                    <button class="btn btn-outline" style="padding: 4px 8px;" onclick="openEditLinkModal('${id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline" style="padding: 4px 8px; color: var(--danger);" onclick="deleteLink('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        linksTable.appendChild(tr);

        // Overview Table
        const tr2 = document.createElement('tr');
        tr2.innerHTML = `
            <td data-label="Campaign">${link.name}</td>
            <td data-label="Affiliate">${link.affiliateEmail}</td>
            <td data-label="Clicks">${link.clicks || 0}</td>
            <td data-label="Conversions">${link.conversions || 0}</td>
            <td data-label="CR"><strong style="color: var(--secondary)">${cr}%</strong></td>
        `;
        overviewLinksTable.appendChild(tr2);
    });

    document.getElementById('stat-total-links').innerText = snapshot.size;
    document.getElementById('stat-total-clicks').innerText = totalClicks;
    document.getElementById('stat-total-conversions').innerText = totalConversions;
});

// --- Link Management UI Helpers ---
window.updateLinkModeUI = (modalType) => {
    const isEdit = modalType === 'edit';
    const prefix = isEdit ? 'edit-' : '';
    const mode = document.getElementById(`${prefix}link-mode`).value;

    // Hide all
    document.getElementById(`${prefix}mode-fixed-fields`).style.display = 'none';
    document.getElementById(`${prefix}mode-range-fields`).style.display = 'none';
    document.getElementById(`${prefix}mode-batch-fields`).style.display = 'none';

    // Show active
    document.getElementById(`${prefix}mode-${mode}-fields`).style.display = 'grid';
};

// Sync CR and Ratio for Fixed mode
const syncCrRatio = (crId, ratioId) => {
    const crInput = document.getElementById(crId);
    const ratioInput = document.getElementById(ratioId);
    if (!crInput || !ratioInput) return;

    crInput.addEventListener('input', () => {
        const cr = parseFloat(crInput.value) || 0;
        if (cr > 0) ratioInput.value = Math.round(100 / cr);
    });
    ratioInput.addEventListener('input', () => {
        const ratio = parseInt(ratioInput.value) || 1;
        crInput.value = (100 / ratio).toFixed(1);
    });
};

// Link Management logic

window.deleteLink = async (id) => {
    if (confirm("Delete this link?")) {
        await deleteDoc(doc(db, 'links', id));
    }
};

const createLinkForm = document.getElementById('create-link-form');
createLinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('link-name').value;
    const originalUrl = document.getElementById('link-url').value;
    const affiliateEmail = document.getElementById('link-affiliate').value;
    const minCr = parseFloat(document.getElementById('link-cr-min').value) || 10;
    const maxCr = parseFloat(document.getElementById('link-cr-max').value) || 15;
    const batchConv = parseInt(document.getElementById('link-batch-conv').value) || 50;
    const batchClicks = parseInt(document.getElementById('link-batch-clicks').value) || 1000;

    const customAlias = document.getElementById('link-alias').value.trim();

    let shortId = customAlias;

    if (customAlias) {
        // Validate alias (no spaces or special chars for URL safety)
        if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
            alert("Alias can only contain letters, numbers, hyphens and underscores.");
            return;
        }

        // Check if alias exists
        const checkDoc = await getDoc(doc(db, 'links', customAlias));
        if (checkDoc.exists()) {
            alert("This alias is already taken. Please choose another one.");
            return;
        }
    } else {
        // Auto-generate short ID if no alias
        shortId = Math.random().toString(36).substring(2, 7);
    }

    try {
        await setDoc(doc(db, 'links', shortId), {
            name,
            originalUrl,
            affiliateEmail,
            mode: 'smart',
            minCr,
            maxCr,
            batchConv,
            batchClicks,
            alias: customAlias || null,
            clicks: 0,
            conversions: 0,
            createdAt: serverTimestamp()
        });

        alert("Link created successfully!");
        createLinkForm.reset();
        document.getElementById('link-modal').style.display = 'none';
    } catch (error) {
        alert("Error creating link: " + error.message);
    }
});

// --- Edit Link Logic ---
const editClicksInput = document.getElementById('edit-link-clicks');
const editConversionsInput = document.getElementById('edit-link-conversions');
const editTargetConv = document.getElementById('edit-link-batch-conv');
const editTargetClicks = document.getElementById('edit-link-batch-clicks');
const editCrDisplay = document.getElementById('edit-link-cr-display');

const updateEditCalculations = (source) => {
    const clicks = parseInt(editClicksInput.value) || 0;
    const tConv = parseInt(editTargetConv.value) || 1;
    const tClicks = parseInt(editTargetClicks.value) || 10;

    if (source === 'clicks' || source === 'batch') {
        const ratio = tConv / tClicks;
        const autoConversions = Math.floor(clicks * ratio);
        editConversionsInput.value = autoConversions;
    }

    const currentConversions = parseInt(editConversionsInput.value) || 0;
    const cr = clicks > 0 ? ((currentConversions / clicks) * 100).toFixed(2) : '0.00';
    editCrDisplay.value = cr + '%';
};

editClicksInput.addEventListener('input', () => updateEditCalculations('clicks'));
editTargetConv.addEventListener('input', () => updateEditCalculations('batch'));
editTargetClicks.addEventListener('input', () => updateEditCalculations('batch'));
editConversionsInput.addEventListener('input', () => updateEditCalculations('conversions'));

window.openEditLinkModal = async (id) => {
    const linkSnap = await getDoc(doc(db, 'links', id));
    if (linkSnap.exists()) {
        const link = linkSnap.data();
        document.getElementById('edit-link-alias-display').value = id;
        document.getElementById('edit-link-name').value = link.name;
        document.getElementById('edit-link-url').value = link.originalUrl;
        document.getElementById('edit-link-affiliate').value = link.affiliateEmail;
        document.getElementById('edit-link-cr-min').value = link.minCr || 10;
        document.getElementById('edit-link-cr-max').value = link.maxCr || 15;
        document.getElementById('edit-link-batch-conv').value = link.batchConv || 50;
        document.getElementById('edit-link-batch-clicks').value = link.batchClicks || 1000;

        editClicksInput.value = link.clicks || 0;
        editConversionsInput.value = link.conversions || 0;

        updateEditCalculations('init');
        document.getElementById('edit-link-modal').style.display = 'flex';
    }
};

const editLinkForm = document.getElementById('edit-link-form');
editLinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-link-alias-display').value;
    const name = document.getElementById('edit-link-name').value;
    const originalUrl = document.getElementById('edit-link-url').value;
    const affiliateEmail = document.getElementById('edit-link-affiliate').value;
    const clicks = parseInt(document.getElementById('edit-link-clicks').value);
    const conversions = parseInt(document.getElementById('edit-link-conversions').value);
    const minCr = parseFloat(document.getElementById('edit-link-cr-min').value);
    const maxCr = parseFloat(document.getElementById('edit-link-cr-max').value);
    const batchConv = parseInt(document.getElementById('edit-link-batch-conv').value);
    const batchClicks = parseInt(document.getElementById('edit-link-batch-clicks').value);

    try {
        await updateDoc(doc(db, 'links', id), {
            name,
            originalUrl,
            affiliateEmail,
            mode: 'smart',
            minCr,
            maxCr,
            batchConv,
            batchClicks,
            clicks,
            conversions,
            updatedAt: serverTimestamp()
        });

        alert("Link updated successfully!");
        document.getElementById('edit-link-modal').style.display = 'none';
    } catch (error) {
        alert("Error updating link: " + error.message);
    }
});

// --- Notifications ---
const broadcastForm = document.getElementById('broadcast-form');
const historyTable = document.getElementById('notif-history-table');

if (broadcastForm) {
    broadcastForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('notif-title').value;
        const message = document.getElementById('notif-message').value;
        const priority = document.getElementById('notif-priority').value;

        try {
            await addDoc(collection(db, 'announcements'), {
                title,
                message,
                priority,
                timestamp: serverTimestamp()
            });

            alert("Announcement broadcasted successfully!");
            broadcastForm.reset();
        } catch (error) {
            alert("Broadcast failed: " + error.message);
        }
    });

    onSnapshot(query(collection(db, 'announcements'), orderBy('timestamp', 'desc')), (snapshot) => {
        historyTable.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const notif = docSnap.data();
            const id = docSnap.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Title" style="font-weight: 600;">${notif.title}</td>
                <td data-label="Date">${notif.timestamp?.toDate ? notif.timestamp.toDate().toLocaleDateString() : 'Recently'}</td>
                <td data-label="Action">
                    <button class="btn btn-outline" style="color: var(--danger);" onclick="deleteAnnouncement('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            historyTable.appendChild(tr);
        });
    });
}

window.deleteAnnouncement = async (id) => {
    if (confirm("Remove this announcement?")) {
        await deleteDoc(doc(db, 'announcements', id));
    }
};

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
});
