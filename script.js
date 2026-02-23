document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let state = {
        participants: JSON.parse(localStorage.getItem('fe_participants')) || [],
        prizes: JSON.parse(localStorage.getItem('fe_prizes')) || [
            { text: 'PlayStation 5', color: '#FF007F' },
            { text: 'Iphone 15', color: '#00F2FE' },
            { text: 'Q 500.00', color: '#00FF88' },
            { text: 'Q 200.00', color: '#FFD700' },
            { text: 'Combustible', color: '#FF8800' },
            { text: 'Gorra Full Energy', color: '#8800FF' },
            { text: 'Sigue Participando', color: '#444444' },
            { text: 'Descuento 10%', color: '#FF5500' }
        ],
        currentParticipant: null,
        isSpinning: false
    };

    // --- DOM Elements ---
    const registrationView = document.getElementById('registration-view');
    const rouletteView = document.getElementById('roulette-view');
    const promoForm = document.getElementById('promo-form');
    const autoDateSpan = document.getElementById('auto-date');
    const wheel = document.getElementById('roulette-wheel');
    const btnSpin = document.getElementById('btn-spin');
    const btnBack = document.getElementById('btn-back');
    const btnConfig = document.getElementById('btn-config');
    const settingsModal = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const prizesList = document.getElementById('prizes-list');
    const btnAddPrize = document.getElementById('btn-add-prize');
    const winnerOverlay = document.getElementById('winner-overlay');
    const winnerPilotName = document.getElementById('winner-pilot-name');
    const wonPrizeText = document.getElementById('won-prize-text');
    const btnDone = document.getElementById('btn-done');
    const participantsTableBody = document.querySelector('#participants-table tbody');

    // --- Initialization ---
    function init() {
        const today = new Date().toLocaleDateString();
        autoDateSpan.textContent = today;
        renderWheel();
        renderHistory();
    }

    // --- Navigation ---
    function showView(view) {
        registrationView.classList.add('hidden');
        rouletteView.classList.add('hidden');

        if (view === 'registration') {
            registrationView.classList.remove('hidden');
        } else if (view === 'roulette') {
            rouletteView.classList.remove('hidden');
            renderWheel(); // Re-render to ensure latest prizes
        }
    }

    // --- Registration Logic ---
    promoForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const invoiceNum = document.getElementById('invoice-number').value.trim();
        const vehiclePlate = document.getElementById('vehicle-plate').value.trim();
        const pilotName = document.getElementById('pilot-name').value.trim();
        const consumption = document.getElementById('total-consumption').value.trim();

        // Check if invoice already used
        const alreadyUsed = state.participants.find(p => p.invoice === invoiceNum);
        if (alreadyUsed) {
            alert('Este número de factura ya ha participado.');
            return;
        }

        state.currentParticipant = {
            invoice: invoiceNum,
            plate: vehiclePlate,
            pilot: pilotName,
            consumption: consumption,
            date: new Date().toLocaleString(),
            prize: null
        };

        showView('roulette');
    });

    btnBack.addEventListener('click', () => {
        if (!state.isSpinning) {
            showView('registration');
        }
    });

    // --- Roulette Logic ---
    function renderWheel() {
        wheel.innerHTML = '';
        const numSegments = state.prizes.length;
        const segmentAngle = 360 / numSegments;

        state.prizes.forEach((prize, i) => {
            const segment = document.createElement('div');
            segment.className = 'wheel-segment';
            segment.style.position = 'absolute';
            segment.style.width = '100%';
            segment.style.height = '100%';
            segment.style.background = prize.color;

            // Draw segment as a wedge using clip-path
            // Correct logic for radial segments
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;

            // Using SVG or complex CSS for wedges is better. 
            // Simple approach: rotate the text and let the wheel background handle wedges
            // For a high-end look, let's use Conic-Gradient for the wheel background
        });

        const gradient = state.prizes.map((p, i) =>
            `${p.color} ${(i * 360) / state.prizes.length}deg ${((i + 1) * 360) / state.prizes.length}deg`
        ).join(', ');

        wheel.style.background = `conic-gradient(${gradient})`;

        // Add Labels
        state.prizes.forEach((prize, i) => {
            const label = document.createElement('div');
            label.className = 'segment-label';
            label.textContent = prize.text;
            label.style.position = 'absolute';
            label.style.left = '50%';
            label.style.top = '50%';
            label.style.transformOrigin = '0 0';
            const rotateAngle = (i * segmentAngle) + (segmentAngle / 2);
            label.style.transform = `rotate(${rotateAngle}deg) translateY(-140px) translateX(-50%)`;
            label.style.fontWeight = '700';
            label.style.fontSize = '0.8rem';
            label.style.color = 'white';
            label.style.textShadow = '0 1px 4px rgba(0,0,0,0.8)';
            label.style.width = '120px';
            label.style.textAlign = 'center';
            wheel.appendChild(label);
        });
    }

    btnSpin.addEventListener('click', () => {
        if (state.isSpinning) return;

        state.isSpinning = true;
        btnSpin.disabled = true;

        const numPrizes = state.prizes.length;
        const prizeIndex = Math.floor(Math.random() * numPrizes);
        const prize = state.prizes[prizeIndex];

        // Calculation: 360 / numPrizes = angle per prize
        // We want the indicator at the top (0deg) to point to the winner
        // The wheel rotates CLOCKWISE. So if target is index 2, we rotate by (360 - index*angle - halfAngle)
        const segmentAngle = 360 / numPrizes;
        const extraSpins = 5 + Math.floor(Math.random() * 5); // 5 to 10 extra spins
        const rotation = (extraSpins * 360) + (360 - (prizeIndex * segmentAngle) - (segmentAngle / 2));

        wheel.style.transform = `rotate(${rotation}deg)`;

        setTimeout(() => {
            state.isSpinning = false;
            btnSpin.disabled = false;

            // Complete participant data
            state.currentParticipant.prize = prize.text;
            state.participants.push(state.currentParticipant);

            // Save to local storage
            localStorage.setItem('fe_participants', JSON.stringify(state.participants));

            // Show Winner
            winnerPilotName.textContent = state.currentParticipant.pilot;
            wonPrizeText.textContent = prize.text;
            winnerOverlay.classList.remove('hidden');

            // Confetti!
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00F2FE', '#FF007F', '#00FF88']
            });

            renderHistory();
        }, 6100); // Wait for transition
    });

    btnDone.addEventListener('click', () => {
        winnerOverlay.classList.add('hidden');
        promoForm.reset();
        showView('registration');
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        setTimeout(() => { wheel.style.transition = 'transform 6s cubic-bezier(0.1, 0, 0, 1)'; }, 10);
    });

    // --- Settings / Admin ---
    btnConfig.addEventListener('click', () => {
        renderPrizesConfig();
        settingsModal.classList.remove('hidden');
    });

    btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    function renderPrizesConfig() {
        prizesList.innerHTML = '';
        state.prizes.forEach((prize, index) => {
            const row = document.createElement('div');
            row.className = 'prize-row';
            row.innerHTML = `
                <input type="text" value="${prize.text}" data-index="${index}" class="edit-prize-text">
                <input type="color" value="${prize.color}" data-index="${index}" class="edit-prize-color" style="width: 50px; padding: 0;">
                <button class="icon-btn btn-remove-prize" data-index="${index}" style="background: rgba(255,0,0,0.1); border-color: rgba(255,0,0,0.2)">&times;</button>
            `;
            prizesList.appendChild(row);
        });

        // Add remove handlers
        document.querySelectorAll('.btn-remove-prize').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                state.prizes.splice(index, 1);
                renderPrizesConfig();
            });
        });
    }

    btnAddPrize.addEventListener('click', () => {
        state.prizes.push({ text: 'Nuevo Premio', color: '#666666' });
        renderPrizesConfig();
    });

    btnSaveSettings.addEventListener('click', () => {
        const textInputs = document.querySelectorAll('.edit-prize-text');
        const colorInputs = document.querySelectorAll('.edit-prize-color');

        const newPrizes = [];
        textInputs.forEach((input, i) => {
            newPrizes.push({
                text: input.value,
                color: colorInputs[i].value
            });
        });

        state.prizes = newPrizes;
        localStorage.setItem('fe_prizes', JSON.stringify(state.prizes));
        settingsModal.classList.add('hidden');
        renderWheel();
    });

    function renderHistory() {
        participantsTableBody.innerHTML = '';
        [...state.participants].reverse().forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.date.split(',')[0]}</td>
                <td>${p.invoice}</td>
                <td>${p.pilot}</td>
                <td style="font-weight: 700; color: var(--success)">${p.prize}</td>
            `;
            participantsTableBody.appendChild(row);
        });
    }

    init();
});