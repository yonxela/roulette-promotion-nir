const SUPABASE_URL = 'https://rxrodfskmvldozpznyrp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rm-U3aeXydu4W0wdSMLW5w_I4LIW5MO';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_CODE = '1122';

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let state = {
        participants: [],
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
        companies: (JSON.parse(localStorage.getItem('fe_companies')) || [
            { id: 'default', name: 'Full Energy', logo: null, nit: 'N/A', manager: 'Sistema', phone: 'N/A', email: 'v1.0', code: 'FEA001' }
        ]).map(c => {
            if (c.id === 'default' && !c.code) c.code = 'FEA001';
            if (!c.code) c.code = generateAccessCode(c.name);
            return c;
        }),
        currentCompanyId: localStorage.getItem('fe_current_company') || 'default',
        currentParticipant: null,
        isSpinning: false,
        isMaster: false
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
    const historyView = document.getElementById('history-view');
    const fullHistoryBody = document.getElementById('full-history-body');
    const btnHistory = document.getElementById('btn-history');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const btnExport = document.getElementById('btn-export');

    const companyDisplayName = document.getElementById('company-display-name');
    const headerCompanySelector = document.getElementById('header-company-selector');
    const mainLogoContainer = document.getElementById('main-logo-container');
    const companiesList = document.getElementById('companies-list');
    const btnAddCompany = document.getElementById('btn-add-company');
    const newCompanyNameInput = document.getElementById('new-company-name');
    const newCompanyNitInput = document.getElementById('new-company-nit');
    const newCompanyManagerInput = document.getElementById('new-company-manager');
    const newCompanyPhoneInput = document.getElementById('new-company-phone');
    const newCompanyEmailInput = document.getElementById('new-company-email');
    const newCompanyLogoInput = document.getElementById('new-company-logo');
    const logoFileNameHint = document.getElementById('logo-file-name');

    const loginView = document.getElementById('login-view');
    const accessCodeInput = document.getElementById('access-code-input');
    const btnLogin = document.getElementById('btn-login');
    const loginError = document.getElementById('login-error');
    const appHeader = document.querySelector('header');

    const btnSisdel = document.getElementById('btn-sisdel');
    const sisdelView = document.getElementById('sisdel-view');
    const btnCloseSisdel = document.getElementById('btn-close-sisdel');

    const btnPrizesNav = document.getElementById('btn-prizes-nav');
    const prizesManagementView = document.getElementById('prizes-management-view');
    const btnClosePrizes = document.getElementById('btn-close-prizes');
    const btnSavePrizes = document.getElementById('btn-save-prizes');

    const btnHistoryNavModal = document.getElementById('btn-history-nav-modal');

    const qrView = document.getElementById('qr-view');
    const qrcodeDisplay = document.getElementById('qrcode-display');
    const qrCompanyName = document.getElementById('qr-company-name');
    const qrAccessCodeText = document.getElementById('qr-access-code-text');
    const btnCloseQr = document.getElementById('btn-close-qr');
    const btnPrintQr = document.getElementById('btn-print-qr');

    let qrInstance = null;

    // --- Initialization ---
    async function init() {
        const today = new Date().toLocaleDateString();
        autoDateSpan.textContent = today;
        updateHeaderCompany();
        
        // Auto-login via QR o URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code');
        const nameParam = urlParams.get('name');

        console.log("Detectado parámetro code:", codeParam);

        if (codeParam) {
            let company = state.companies.find(c => c.code === codeParam);
            
            if (!company && nameParam) {
                company = {
                    id: 'temp_' + codeParam,
                    name: decodeURIComponent(nameParam),
                    code: codeParam,
                    logo: null
                };
                state.companies.push(company);
            }

            if (company) {
                state.isMaster = false;
                state.currentCompanyId = company.id;
                updateHeaderCompany();
                showView('registration');
            } else {
                showView('login');
            }
        } else {
            showView('login'); 
        }

        // Aviso para el desarrollador sobre el uso de archivos locales
        if (window.location.protocol === 'file:') {
            console.warn("ATENCIÓN: Estás ejecutando el sistema desde un archivo local (file://). Los códigos QR generados apuntarán a tu disco duro y NO funcionarán en celulares externos. Para que funcionen, debes subir el sistema a una página web.");
        }

        await fetchParticipants();
        renderWheel();
    }

    async function fetchParticipants() {
        try {
            const { data, error } = await supabaseClient
                .from('participantes')
                .select('*');

            if (error) throw error;
            state.participants = data || [];
            renderHistory();
        } catch (err) {
            console.error('Error fetching:', err.message);
        }
    }

    function renderHistory() {
        if (!participantsTableBody) return;
        participantsTableBody.innerHTML = '';
        if (fullHistoryBody) fullHistoryBody.innerHTML = '';

        const currentCompany = state.companies.find(c => c.id === state.currentCompanyId);

        state.participants.forEach(p => {
            // Filtrar por empresa si el campo existe en la DB, sino mostrar todos pero marcar la empresa actual
            // Para multi-empresa real, deberíamos filtrar por p.empresa_id
            
            const fechaStr = p.fecha ? (p.fecha.includes(',') ? p.fecha.split(',')[0] : p.fecha) : '';
            
            // Mini table in settings
            const rowMini = document.createElement('tr');
            rowMini.innerHTML = `
                <td>${fechaStr}</td>
                <td>${p.factura || ''}</td>
                <td>${p.piloto || ''}</td>
                <td style="font-weight:700;color:var(--success)">${p.premio || ''}</td>
            `;
            participantsTableBody.appendChild(rowMini);

            // Full table in history view
            if (fullHistoryBody) {
                const rowFull = document.createElement('tr');
                rowFull.innerHTML = `
                    <td>${p.fecha || ''}</td>
                    <td>${p.factura || ''}</td>
                    <td>${p.piloto || ''}</td>
                    <td>${p.placa || ''}</td>
                    <td>Q ${p.consumo || '0.00'}</td>
                    <td>${p.empresa || ''}</td>
                    <td style="font-weight:700;color:var(--success)">${p.premio || ''}</td>
                `;
                fullHistoryBody.appendChild(rowFull);
            }
        });
    }

    function updateHeaderCompany() {
        const company = state.companies.find(c => c.id === state.currentCompanyId) || state.companies[0];
        
        // Update Selector
        headerCompanySelector.innerHTML = '';
        state.companies.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            opt.selected = c.id === state.currentCompanyId;
            headerCompanySelector.appendChild(opt);
        });

        // Update Logo/Name
        mainLogoContainer.innerHTML = '';
        if (company.logo) {
            const img = document.createElement('img');
            img.src = company.logo;
            img.alt = company.name;
            mainLogoContainer.appendChild(img);
        } else {
            const h1 = document.createElement('h1');
            h1.innerHTML = `${company.name.split(' ')[0]} <span>${company.name.split(' ').slice(1).join(' ')}</span>`;
            mainLogoContainer.appendChild(h1);
        }
    }

    // --- Navigation ---
    function showView(view) {
        loginView.classList.add('hidden');
        registrationView.classList.add('hidden');
        rouletteView.classList.add('hidden');
        historyView.classList.add('hidden');
        sisdelView.classList.add('hidden');
        prizesManagementView.classList.add('hidden');
        qrView.classList.add('hidden');
        appHeader.classList.add('hidden');
        
        // Controlar visibilidad de botones de administración
        if (state.isMaster) {
            btnConfig.classList.remove('hidden');
            if(btnHistory) btnHistory.classList.add('hidden'); // Siempre oculto en header por petición
            if(btnSisdel) btnSisdel.classList.remove('hidden');
            if(btnPrizesNav) btnPrizesNav.classList.remove('hidden');
            if(btnHistoryNavModal) btnHistoryNavModal.classList.remove('hidden');
            headerCompanySelector.classList.remove('hidden');
        } else {
            btnConfig.classList.add('hidden');
            if(btnHistory) btnHistory.classList.add('hidden');
            if(btnSisdel) btnSisdel.classList.add('hidden');
            if(btnPrizesNav) btnPrizesNav.classList.add('hidden');
            if(btnHistoryNavModal) btnHistoryNavModal.classList.add('hidden');
            headerCompanySelector.classList.add('hidden');
        }

        if (view === 'login') {
            loginView.classList.remove('hidden');
        } else {
            appHeader.classList.remove('hidden');
            if (view === 'registration') {
                registrationView.classList.remove('hidden');
            } else if (view === 'roulette') {
                rouletteView.classList.remove('hidden');
                renderWheel();
            } else if (view === 'history') {
                historyView.classList.remove('hidden');
                fetchParticipants();
            } else if (view === 'sisdel') {
                sisdelView.classList.remove('hidden');
                renderCompaniesConfig();
            } else if (view === 'prizes_config') {
                prizesManagementView.classList.remove('hidden');
                renderPrizesConfig();
            } else if (view === 'qr') {
                qrView.classList.remove('hidden');
            }
        }
    }

    // --- Events ---
    promoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const invoiceNum = document.getElementById('invoice-number').value.trim();
        const vehiclePlate = document.getElementById('vehicle-plate').value.trim();
        const pilotName = document.getElementById('pilot-name').value.trim();
        const consumption = document.getElementById('total-consumption').value.trim();

        try {
            const { data, error } = await supabaseClient
                .from('participantes')
                .select('factura')
                .eq('factura', invoiceNum);

            if (data && data.length > 0) {
                alert('Esta factura ya ha participado.');
                return;
            }

            state.currentParticipant = {
                factura: invoiceNum,
                placa: vehiclePlate,
                piloto: pilotName,
                consumo: consumption,
                fecha: new Date().toLocaleString(),
                empresa: (state.companies.find(c => c.id === state.currentCompanyId) || {}).name,
                premio: null
            };
            showView('roulette');
        } catch (err) {
            console.error('Error validation:', err.message);
            // Si falla la validación por red, dejamos pasar igual o avisamos
            alert('Aviso: No se pudo verificar la factura en la nube, pero puedes jugar.');
            showView('roulette');
        }
    });

    btnBack.addEventListener('click', () => {
        if (!state.isSpinning) showView('registration');
    });

    function renderWheel() {
        wheel.innerHTML = '';
        const numSegments = state.prizes.length;
        const segmentAngle = 360 / numSegments;
        const gradient = state.prizes.map((p, i) =>
            `${p.color} ${(i * 360) / numSegments}deg ${((i + 1) * 360) / numSegments}deg`
        ).join(', ');

        wheel.style.background = `conic-gradient(${gradient})`;

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
        const segmentAngle = 360 / numPrizes;
        const extraSpins = 5 + Math.floor(Math.random() * 5);
        const rotation = (extraSpins * 360) + (360 - (prizeIndex * segmentAngle) - (segmentAngle / 2));
        wheel.style.transform = `rotate(${rotation}deg)`;

        setTimeout(async () => {
            state.isSpinning = false;
            btnSpin.disabled = false;
            state.currentParticipant.premio = prize.text;

            try {
                const { error } = await supabaseClient.from('participantes').insert([state.currentParticipant]);
                if (error) throw error;
            } catch (err) {
                alert('Error al guardar en la nube: ' + err.message);
            }

            await fetchParticipants();
            winnerPilotName.textContent = state.currentParticipant.piloto;
            wonPrizeText.textContent = prize.text;
            winnerOverlay.classList.remove('hidden');
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }, 6100);
    });

    btnDone.addEventListener('click', () => {
        winnerOverlay.classList.add('hidden');
        promoForm.reset();
        showView('registration');
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        setTimeout(() => { wheel.style.transition = 'transform 6s cubic-bezier(0.1, 0, 0, 1)'; }, 10);
    });

    // --- Login Events ---
    btnLogin.addEventListener('click', () => {
        const inputCode = accessCodeInput.value.trim();
        
        // 1. Validar Código Master
        if (inputCode === MASTER_CODE) {
            state.isMaster = true;
            loginError.classList.add('hidden');
            accessCodeInput.value = '';
            showView('registration');
            return;
        }

        // 2. Validar Códigos de Empresas
        const company = state.companies.find(c => c.code === inputCode);
        if (company) {
            state.isMaster = false;
            state.currentCompanyId = company.id;
            localStorage.setItem('fe_current_company', company.id);
            updateHeaderCompany();
            loginError.classList.add('hidden');
            accessCodeInput.value = '';
            showView('registration');
        } else {
            loginError.classList.remove('hidden');
            accessCodeInput.value = '';
        }
    });

    // Botón para cerrar sesión o cambiar de empresa
    const btnLogout = document.createElement('button');
    btnLogout.textContent = 'Cambiar de Empresa';
    btnLogout.className = 'btn-text';
    btnLogout.style.marginTop = '1rem';
    btnLogout.addEventListener('click', () => showView('login'));
    registrationView.appendChild(btnLogout);

    accessCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnLogin.click();
    });

    // --- History Events ---
    if (btnHistory) btnHistory.addEventListener('click', () => showView('history'));
    if (btnCloseHistory) btnCloseHistory.addEventListener('click', () => showView('registration'));
    
    btnExport.addEventListener('click', () => {
        if (state.participants.length === 0) {
            alert('No hay registros para exportar.');
            return;
        }

        const headers = ['Fecha', 'Factura', 'Piloto', 'Placa', 'Consumo (Q)', 'Empresa', 'Premio'];
        const csvContent = [
            headers.join(','),
            ...state.participants.map(p => [
                `"${p.fecha || ''}"`,
                `"${p.factura || ''}"`,
                `"${p.piloto || ''}"`,
                `"${p.placa || ''}"`,
                `"${p.consumo || ''}"`,
                `"${p.empresa || ''}"`,
                `"${p.premio || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_ruleta_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- Settings Events ---
    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            try {
                renderPrizesConfig();
                fetchParticipants(); 
            } catch (err) {
                console.error('Error loading settings data:', err);
            }
        });
    }

    if (btnSisdel) {
        btnSisdel.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            showView('sisdel');
        });
    }

    if (btnPrizesNav) {
        btnPrizesNav.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            showView('prizes_config');
        });
    }

    if (btnHistoryNavModal) {
        btnHistoryNavModal.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            showView('history');
        });
    }

    btnCloseQr.addEventListener('click', () => {
        showView('sisdel');
    });

    btnPrintQr.addEventListener('click', () => {
        window.print();
    });

    function generateQR(companyCode, companyName) {
        const code = companyCode && companyCode !== 'undefined' ? companyCode : 'FEA001';
        qrCompanyName.textContent = companyName;
        qrAccessCodeText.textContent = `CÓDIGO: ${code}`;
        qrcodeDisplay.innerHTML = '';
        
        // Generar URL para el QR (incluimos nombre para dispositivos nuevos)
        const baseUrl = window.location.href.split('?')[0].split('#')[0];
        const url = `${baseUrl}?code=${code}&name=${encodeURIComponent(companyName)}`;
        
        new QRCode(qrcodeDisplay, {
            text: url,
            width: 256,
            height: 256,
            colorDark: "#001f3f",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        showView('qr');
    }

    btnCloseSisdel.addEventListener('click', () => {
        showView('registration');
        settingsModal.classList.remove('hidden'); // Volver a settings
    });

    btnClosePrizes.addEventListener('click', () => {
        showView('registration');
        settingsModal.classList.remove('hidden'); // Volver a settings
    });

    btnSavePrizes.addEventListener('click', () => {
        const textInputs = document.querySelectorAll('.edit-prize-text');
        const colorInputs = document.querySelectorAll('.edit-prize-color');
        state.prizes = Array.from(textInputs).map((input, i) => ({
            text: input.value,
            color: colorInputs[i].value
        }));
        localStorage.setItem('fe_prizes', JSON.stringify(state.prizes));
        showView('registration');
        settingsModal.classList.remove('hidden');
        renderWheel();
        alert('Configuración de premios guardada.');
    });

    headerCompanySelector.addEventListener('change', (e) => {
        state.currentCompanyId = e.target.value;
        localStorage.setItem('fe_current_company', state.currentCompanyId);
        updateHeaderCompany();
        fetchParticipants();
    });

    newCompanyLogoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            logoFileNameHint.textContent = e.target.files[0].name;
        }
    });

    function renderCompaniesConfig() {
        if (!companiesList) return;
        companiesList.innerHTML = '';
        state.companies.forEach((comp, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${comp.logo ? `<img src="${comp.logo}" class="company-item-logo">` : '<div class="company-item-logo" style="display:flex;align-items:center;justify-content:center;font-size:10px;border:1px dashed #555;">Sin Logo</div>'}
                </td>
                <td>
                    <strong style="color:var(--primary);">${comp.name}</strong>
                    <div style="font-size:0.7rem; color:var(--text-dim);">${comp.id}</div>
                </td>
                <td>
                    <div style="font-weight:600;">NIT: ${comp.nit || 'N/A'}</div>
                    <div style="font-size:0.8rem; color:var(--text-dim);">${comp.manager || 'N/A'}</div>
                </td>
                <td>
                    <div>${comp.phone || 'N/A'}</div>
                    <div style="font-size:0.8rem; color:var(--text-dim);">${comp.email || 'N/A'}</div>
                </td>
                <td>
                    <div class="access-code-container" style="padding: 0.2rem 0.5rem;">
                        <span class="access-code-value" style="font-size: 0.9rem;">${comp.code || '---'}</span>
                    </div>
                </td>
                <td style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary btn-qr-gen" data-code="${comp.code}" data-name="${comp.name}" style="padding: 5px 10px; font-size: 0.7rem;">QR</button>
                    ${comp.id !== 'default' ? `<button class="icon-btn btn-remove-company" data-index="${idx}" title="Eliminar">&times;</button>` : '<span style="font-size:0.7rem; color:gray;">Protegido</span>'}
                </td>
            `;
            companiesList.appendChild(row);
        });

        document.querySelectorAll('.btn-remove-company').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                if (state.companies[idx].id === state.currentCompanyId) {
                    state.currentCompanyId = 'default';
                    localStorage.setItem('fe_current_company', 'default');
                }
                state.companies.splice(idx, 1);
                saveCompanies();
                renderCompaniesConfig();
                updateHeaderCompany();
            });
        });

        document.querySelectorAll('.btn-qr-gen').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                generateQR(target.dataset.code, target.dataset.name);
            });
        });
    }

    btnAddCompany.addEventListener('click', () => {
        const name = newCompanyNameInput.value.trim();
        const nit = newCompanyNitInput.value.trim();
        const manager = newCompanyManagerInput.value.trim();
        const phone = newCompanyPhoneInput.value.trim();
        const email = newCompanyEmailInput.value.trim();

        if (!name) return alert('Ingrese el nombre de la empresa');

        const file = newCompanyLogoInput.files[0];
        const processAdd = (logoBase64) => {
            addCompany({
                name,
                nit,
                manager,
                phone,
                email,
                logo: logoBase64
            });
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => processAdd(e.target.result);
            reader.readAsDataURL(file);
        } else {
            processAdd(null);
        }
    });

    function generateAccessCode(companyName) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        
        // 3 Letras al azar
        let L1 = letters.charAt(Math.floor(Math.random() * letters.length));
        let L3 = letters.charAt(Math.floor(Math.random() * letters.length));
        
        // La segunda letra será la primera del nombre de la empresa
        let L2 = (companyName.charAt(0) || 'X').toUpperCase();
        
        // 3 Números al azar
        let N1 = numbers.charAt(Math.floor(Math.random() * numbers.length));
        let N2 = numbers.charAt(Math.floor(Math.random() * numbers.length));
        let N3 = numbers.charAt(Math.floor(Math.random() * numbers.length));
        
        return `${L1}${L2}${L3}${N1}${N2}${N3}`;
    }

    function addCompany(data) {
        const newComp = {
            id: 'comp_' + Date.now(),
            ...data,
            code: generateAccessCode(data.name)
        };
        state.companies.push(newComp);
        saveCompanies();
        
        // Reset form
        newCompanyNameInput.value = '';
        newCompanyNitInput.value = '';
        newCompanyManagerInput.value = '';
        newCompanyPhoneInput.value = '';
        newCompanyEmailInput.value = '';
        newCompanyLogoInput.value = '';
        logoFileNameHint.textContent = 'Ningún archivo';
        
        renderCompaniesConfig();
        updateHeaderCompany();
        alert(`Empresa creada con éxito. Código de acceso: ${newComp.code}`);
    }

    function saveCompanies() {
        localStorage.setItem('fe_companies', JSON.stringify(state.companies));
    }

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
                <input type="color" value="${prize.color}" data-index="${index}" class="edit-prize-color" style="width:50px;padding:0;">
                <button class="icon-btn btn-remove-prize" data-index="${index}">&times;</button>
            `;
            prizesList.appendChild(row);
        });

        document.querySelectorAll('.btn-remove-prize').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                state.prizes.splice(idx, 1);
                renderPrizesConfig();
            });
        });
    }

    btnAddPrize.addEventListener('click', () => {
        state.prizes.push({ text: 'Nuevo Premio', color: '#666' });
        renderPrizesConfig();
    });

    btnSaveSettings.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    init();
});
