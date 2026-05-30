const puppeteer = require("puppeteer");

// Helper: Generate Kundali Chart SVG HTML
function generateKundaliChartHTML(planets) {
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

    const getRashiNumber = (signName) => {
        if (!signName) return 1;
        const idx = signs.findIndex(s => s.toLowerCase() === signName.toLowerCase().trim());
        return idx !== -1 ? idx + 1 : 1;
    };

    const planetHindi = { 'Sun': 'सू', 'Moon': 'चं', 'Mars': 'मं', 'Mercury': 'बु', 'Jupiter': 'गु', 'Venus': 'शु', 'Saturn': 'श', 'Rahu': 'रा', 'Ketu': 'के', 'Ascendant': 'ल' };

    const ascendant = planets.find(p => p.name === 'Ascendant');
    const lagnaRashiNo = ascendant ? getRashiNumber(ascendant.sign) : 1;

    const rashiMap = {};
    const planetsMap = { 1: ['ल'], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] };

    for (let h = 1; h <= 12; h++) {
        rashiMap[h] = ((lagnaRashiNo - 1 + h - 1) % 12) + 1;
    }

    planets.filter(p => p.name !== 'Ascendant').forEach(p => {
        const h = parseInt(p.house);
        if (h >= 1 && h <= 12) planetsMap[h].push(planetHindi[p.name] || p.name.substring(0, 2));
    });

    const housePos = {
        1:  { rashi: [200, 40],  planets: [200, 95] },
        2:  { rashi: [125, 30],  planets: [80, 60] },
        3:  { rashi: [30, 125],  planets: [65, 85] },
        4:  { rashi: [42, 200],  planets: [105, 200] },
        5:  { rashi: [30, 275],  planets: [65, 315] },
        6:  { rashi: [125, 370], planets: [80, 340] },
        7:  { rashi: [200, 360], planets: [200, 305] },
        8:  { rashi: [275, 370], planets: [320, 340] },
        9:  { rashi: [370, 275], planets: [335, 315] },
        10: { rashi: [358, 200], planets: [295, 200] },
        11: { rashi: [370, 125], planets: [335, 85] },
        12: { rashi: [275, 30],  planets: [320, 60] },
    };

    let housesSVG = '';
    for (let h = 1; h <= 12; h++) {
        const pos = housePos[h];
        const rashi = rashiMap[h];
        const pList = planetsMap[h] || [];
        housesSVG += `<text x="${pos.rashi[0]}" y="${pos.rashi[1]}" text-anchor="middle" fill="#b45309" font-size="13" font-weight="600">${rashi}</text>`;
        if (pList.length > 0) {
            if (pList.length <= 3) {
                housesSVG += `<text x="${pos.planets[0]}" y="${pos.planets[1]}" text-anchor="middle" fill="#991b1b" font-size="13" font-weight="bold">${pList.join(' ')}</text>`;
            } else {
                const l1 = pList.slice(0, 3).join(' ');
                const l2 = pList.slice(3).join(' ');
                housesSVG += `<text x="${pos.planets[0]}" y="${pos.planets[1] - 8}" text-anchor="middle" fill="#991b1b" font-size="11" font-weight="bold">${l1}</text>`;
                housesSVG += `<text x="${pos.planets[0]}" y="${pos.planets[1] + 8}" text-anchor="middle" fill="#991b1b" font-size="11" font-weight="bold">${l2}</text>`;
            }
        }
    }

    return `
    <svg viewBox="0 0 400 400" width="320" height="320" xmlns="http://www.w3.org/2000/svg" style="font-family: 'Noto Sans Devanagari', sans-serif;">
        <rect x="0" y="0" width="400" height="400" fill="#fdfbf7" stroke="#991b1b" stroke-width="4" rx="8"/>
        <rect x="6" y="6" width="388" height="388" fill="none" stroke="#d97706" stroke-width="1.5" rx="6" opacity="0.6"/>
        <line x1="0" y1="0" x2="400" y2="400" stroke="#991b1b" stroke-width="2.5"/>
        <line x1="400" y1="0" x2="0" y2="400" stroke="#991b1b" stroke-width="2.5"/>
        <polygon points="200,0 0,200 200,400 400,200" fill="none" stroke="#991b1b" stroke-width="2.5"/>
        <text x="28" y="28" text-anchor="middle" fill="#b45309" font-size="14" font-weight="bold">ॐ</text>
        <text x="372" y="28" text-anchor="middle" fill="#b45309" font-size="14" font-weight="bold">श्री</text>
        <text x="28" y="385" text-anchor="middle" fill="#b45309" font-size="13" font-weight="bold">शुभ</text>
        <text x="372" y="385" text-anchor="middle" fill="#b45309" font-size="13" font-weight="bold">लाभ</text>
        <circle cx="200" cy="200" r="4" fill="#b45309"/>
        ${housesSVG}
    </svg>`;
}

// @desc    Generate and Download Kundali as PDF
// @route   POST /api/kundali/download
// @access  Private (User must be logged in)
exports.downloadKundali = async (req, res) => {
    let browser = null;
    try {
        const { birthDetails, planets, predictions, userInfo } = req.body;

        if (!birthDetails || !planets) {
            return res.status(400).json({ success: false, message: "birthDetails and planets data required" });
        }

        const ascendant = planets.find(p => p.name === 'Ascendant');
        const moonSign = planets.find(p => p.name === 'Moon');
        const sunSign = planets.find(p => p.name === 'Sun');

        const chartSVG = generateKundaliChartHTML(planets);

        // Build Planets Table Rows
        const planetRows = planets
            .filter(p => p.name !== 'Ascendant')
            .map((p, i) => `
                <tr style="background:${i % 2 === 0 ? '#ffffff' : '#fdfcfa'}">
                    <td style="padding:8px 12px; font-weight:600; color:#1c1c1c; white-space:nowrap;">
                        ${p.name}${(p.isRetro === 'true' || p.isRetro === true) ? ' <span style="font-size:10px;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:4px;">Vakri</span>' : ''}
                    </td>
                    <td style="padding:8px 12px; color:#374151;">${p.sign || '-'}</td>
                    <td style="padding:8px 12px; color:#374151;">${p.signLord || '-'}</td>
                    <td style="padding:8px 12px; color:#374151;">${p.nakshatra || '-'}</td>
                    <td style="padding:8px 12px; text-align:center; color:#374151;">${p.nakshatra_pad || '-'}</td>
                    <td style="padding:8px 12px; text-align:center;">
                        <span style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:2px 8px;border-radius:20px;font-weight:bold;font-size:11px;">${p.house || '-'}</span>
                    </td>
                    <td style="padding:8px 12px; color:#374151; font-size:11px;">${p.planet_awastha || '-'}</td>
                </tr>
            `).join('');

        // Build Predictions Sections
        const predictionHTML = (predictions && predictions.length > 0) ? predictions.map(pred => `
            <div style="margin-bottom:20px; padding:16px; background:#fffbf5; border:1px solid #fde68a; border-radius:10px; break-inside:avoid;">
                <div style="font-size:13px; font-weight:700; color:#92400e; margin-bottom:8px; border-bottom:1px solid #fde68a; padding-bottom:6px;">
                    ${pred.planet} — Grah Bhavishyafal
                </div>
                <div style="font-size:11.5px; color:#374151; line-height:1.8;">
                    ${pred.house_report || 'Bhavishyavani uplabdh nahi hai.'}
                </div>
            </div>
        `).join('') : '<p style="color:#6b7280; font-style:italic;">Predictions uplabdh nahi hain.</p>';

        const generatedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const generatedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const htmlContent = `
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Janam Kundali</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; 
            background: #fff; 
            color: #1c1c1c;
            font-size: 12px;
        }
        @page { margin: 0; size: A4; }

        .page-wrapper { width: 210mm; min-height: 297mm; padding: 0; }

        /* ========== HEADER ========== */
        .header {
            background: linear-gradient(135deg, #1c1c1c 0%, #2a1f0a 60%, #1c1c1c 100%);
            padding: 28px 40px 24px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(circle at 15% 50%, rgba(196,155,99,0.15) 0%, transparent 60%),
                        radial-gradient(circle at 85% 50%, rgba(196,155,99,0.15) 0%, transparent 60%);
        }
        .header-content { position: relative; z-index: 1; text-align: center; }
        .header-brand { font-family: 'Cinzel', serif; color: #c49b63; font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 6px; }
        .header-title { font-family: 'Cinzel', serif; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px; }
        .header-title span { color: #c49b63; }
        .header-subtitle { color: #9ca3af; font-size: 11px; letter-spacing: 0.1em; }
        .header-meta { 
            display: flex; gap: 20px; justify-content: center; margin-top: 14px; 
            flex-wrap: wrap;
        }
        .header-meta-item { 
            background: rgba(196,155,99,0.12); border: 1px solid rgba(196,155,99,0.3);
            padding: 5px 14px; border-radius: 20px; color: #e5d5b8; font-size: 10.5px;
        }

        /* ========== MAIN CONTENT ========== */
        .content { padding: 28px 36px; }

        /* ========== SECTION ========== */
        .section { margin-bottom: 24px; }
        .section-title {
            font-family: 'Cinzel', serif;
            font-size: 14px; font-weight: 700; color: #1c1c1c;
            border-bottom: 2px solid #c49b63;
            padding-bottom: 6px; margin-bottom: 14px;
            display: flex; align-items: center; gap: 8px;
        }
        .section-title span.icon { color: #c49b63; }

        /* ========== INFO CARDS ========== */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px; }
        .info-card {
            background: linear-gradient(135deg, #1c1c1c, #2a2a2a);
            border: 1px solid rgba(196,155,99,0.2);
            border-radius: 10px; padding: 14px; text-align: center;
        }
        .info-card .label { color: #c49b63; font-size: 9px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px; }
        .info-card .value { color: #ffffff; font-family: 'Cinzel', serif; font-size: 14px; font-weight: 700; }

        .detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
        .detail-card {
            background: #faf9f6; border: 1px solid #f0ece6;
            border-radius: 8px; padding: 10px; text-align: center;
        }
        .detail-card .label { color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
        .detail-card .value { color: #1c1c1c; font-weight: 700; font-size: 12px; }

        /* ========== CHART SECTION ========== */
        .chart-section {
            display: flex; gap: 24px; align-items: flex-start;
            background: #fdfcfa; border: 1px solid #f0ece6; border-radius: 14px;
            padding: 20px; margin-bottom: 24px;
        }
        .chart-wrapper { flex-shrink: 0; }
        .chart-legend { flex: 1; }
        .legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #374151; }
        .legend-badge {
            background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;
            width: 24px; height: 24px; border-radius: 5px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 12px; flex-shrink: 0;
            font-family: 'Noto Sans Devanagari', sans-serif;
        }

        /* ========== TABLE ========== */
        .planets-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .planets-table thead tr { background: #faf9f6; }
        .planets-table thead th { 
            padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; 
            border-bottom: 2px solid #f0ece6; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.05em;
        }
        .planets-table tbody tr { border-bottom: 1px solid #f5f0eb; }
        .planets-table tbody tr:last-child { border-bottom: none; }

        /* ========== PREDICTIONS ========== */
        .predictions-section { page-break-before: always; }

        /* ========== FOOTER ========== */
        .footer {
            background: #1c1c1c; padding: 16px 36px;
            display: flex; justify-content: space-between; align-items: center;
            margin-top: 32px;
        }
        .footer-brand { font-family: 'Cinzel', serif; color: #c49b63; font-size: 13px; font-weight: 700; }
        .footer-note { color: #6b7280; font-size: 10px; text-align: right; }
        .footer-divider { color: #374151; font-size: 10px; text-align: center; }
    </style>
</head>
<body>
<div class="page-wrapper">

    <!-- HEADER -->
    <div class="header">
        <div class="header-content">
            <div class="header-brand">✦ Vedic Astrology ✦</div>
            <div class="header-title">Janam <span>Kundali</span></div>
            <div class="header-subtitle">Shudh Vedic Jyotish — Janam Patrika</div>
            <div class="header-meta">
                ${userInfo?.name ? `<div class="header-meta-item">👤 ${userInfo.name}</div>` : ''}
                ${userInfo?.dob ? `<div class="header-meta-item">📅 ${userInfo.dob}</div>` : ''}
                ${userInfo?.tob ? `<div class="header-meta-item">⏰ ${userInfo.tob}</div>` : ''}
                ${userInfo?.city ? `<div class="header-meta-item">📍 ${userInfo.city}</div>` : ''}
                <div class="header-meta-item">🗓️ Generated: ${generatedDate} ${generatedTime}</div>
            </div>
        </div>
    </div>

    <!-- MAIN CONTENT -->
    <div class="content">

        <!-- Summary Cards -->
        <div class="section">
            <div class="section-title"><span class="icon">🔮</span> Grah Vivaran Saar</div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="label">Lagna (Ascendant)</div>
                    <div class="value">${ascendant?.sign || 'N/A'}</div>
                </div>
                <div class="info-card">
                    <div class="label">Rashi (Moon Sign)</div>
                    <div class="value">${moonSign?.sign || 'N/A'}</div>
                </div>
                <div class="info-card">
                    <div class="label">Sun Sign</div>
                    <div class="value">${sunSign?.sign || 'N/A'}</div>
                </div>
            </div>

            <!-- Birth Detail Cards -->
            <div class="detail-grid">
                <div class="detail-card">
                    <div class="label">Sunrise</div>
                    <div class="value">${birthDetails.sunrise || '-'}</div>
                </div>
                <div class="detail-card">
                    <div class="label">Sunset</div>
                    <div class="value">${birthDetails.sunset || '-'}</div>
                </div>
                <div class="detail-card">
                    <div class="label">Ayanamsha</div>
                    <div class="value">${birthDetails.ayanamsha ? parseFloat(birthDetails.ayanamsha).toFixed(4) : '-'}</div>
                </div>
                <div class="detail-card">
                    <div class="label">Timezone</div>
                    <div class="value">+${birthDetails.timezone || '5.5'}</div>
                </div>
            </div>
        </div>

        <!-- Kundali Chart Section -->
        <div class="section">
            <div class="section-title"><span class="icon">🔯</span> Janam Kundali Chakra (Lagna Chart)</div>
            <div class="chart-section">
                <div class="chart-wrapper">
                    ${chartSVG}
                </div>
                <div class="chart-legend">
                    <div style="font-weight:700; font-size:12px; color:#1c1c1c; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #f0ece6;">
                        🕉️ Graha Sanket (Legend)
                    </div>
                    <div class="legend-grid">
                        <div class="legend-item"><div class="legend-badge">ल</div><span>Lagna</span></div>
                        <div class="legend-item"><div class="legend-badge">सू</div><span>Surya</span></div>
                        <div class="legend-item"><div class="legend-badge">चं</div><span>Chandra</span></div>
                        <div class="legend-item"><div class="legend-badge">मं</div><span>Mangal</span></div>
                        <div class="legend-item"><div class="legend-badge">बु</div><span>Budha</span></div>
                        <div class="legend-item"><div class="legend-badge">गु</div><span>Guru</span></div>
                        <div class="legend-item"><div class="legend-badge">शु</div><span>Shukra</span></div>
                        <div class="legend-item"><div class="legend-badge">श</div><span>Shani</span></div>
                        <div class="legend-item"><div class="legend-badge">रा</div><span>Rahu</span></div>
                        <div class="legend-item"><div class="legend-badge">के</div><span>Ketu</span></div>
                    </div>
                    <div style="margin-top:16px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:10px; font-size:10.5px; color:#92400e; line-height:1.7;">
                        <strong>📜 Pandit Ji Vichaar:</strong><br/>
                        Aapki Rashi <strong>${moonSign?.sign || 'N/A'}</strong> aur Lagna <strong>${ascendant?.sign || 'N/A'}</strong> hai. Yeh Kundali chakra aapke janam samay ki aakashiya sthiti ko darshata hai.
                    </div>
                </div>
            </div>
        </div>

        <!-- Planets Table -->
        <div class="section">
            <div class="section-title"><span class="icon">🪐</span> Graha Sthiti (Planetary Positions)</div>
            <table class="planets-table">
                <thead>
                    <tr>
                        <th>Graha</th>
                        <th>Rashi (Sign)</th>
                        <th>Rashi Swami</th>
                        <th>Nakshatra</th>
                        <th style="text-align:center;">Paad</th>
                        <th style="text-align:center;">Bhava (House)</th>
                        <th>Awastha</th>
                    </tr>
                </thead>
                <tbody>
                    ${planetRows}
                </tbody>
            </table>
        </div>

        <!-- Predictions -->
        <div class="section predictions-section">
            <div class="section-title"><span class="icon">🔮</span> Grah Bhavishyafal (Planetary Predictions)</div>
            ${predictionHTML}
        </div>

    </div>

    <!-- FOOTER -->
    <div class="footer">
        <div class="footer-brand">✦ Astrolargery</div>
        <div class="footer-divider">Shudh Vedic Jyotish · Accurate Predictions</div>
        <div class="footer-note">Generated on ${generatedDate}<br/>Powered by Astrolargery.com</div>
    </div>

</div>
</body>
</html>`;

        // Launch Puppeteer and generate PDF
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security'
            ]
        });
        const page = await browser.newPage();

        // Use domcontentloaded to avoid waiting for external fonts to fully load
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Extra wait to let CSS render
        await new Promise(r => setTimeout(r, 1500));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            timeout: 60000
        });

        await browser.close();
        browser = null;

        const userName = userInfo?.name ? userInfo.name.replace(/\s+/g, '_') : 'User';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Kundali_${userName}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);

    } catch (error) {
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        console.error("====== Kundali PDF Error ======");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        console.error("===============================");
        res.status(500).json({ success: false, message: "PDF generation failed", error: error.message });
    }
};
