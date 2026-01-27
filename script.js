import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBS_1SV_RpZ9WhUQEqbgXGC5_D-seor4Ls",
  authDomain: "planejamento-d3c78.firebaseapp.com",
  projectId: "planejamento-d3c78",
  storageBucket: "planejamento-d3c78.firebasestorage.app",
  messagingSenderId: "840047083909",
  appId: "1:840047083909:web:5456504fdd393d6dcb04ec"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data Limite para as parcelas (Fixo conforme pedido)
const DATA_LIMITE_PARCELAS = new Date("2028-03-01T00:00:00");

// --- 1. CONFIGURAÇÃO DE DATA (Contagem Regressiva) ---
// Carrega a data salva ou usa um padrão
async function loadDateConfig() {
    const docRef = doc(db, "settings", "general");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().deliveryDate) {
        const savedDate = docSnap.data().deliveryDate;
        document.getElementById("date-config").value = savedDate;
        startCountdown(savedDate);
    } else {
        // Padrão se não tiver nada salvo
        document.getElementById("date-config").value = "2026-12-31";
        startCountdown("2026-12-31");
    }
}

// Salva a nova data quando o usuário muda
window.updateDateConfig = async (newDate) => {
    await setDoc(doc(db, "settings", "general"), { deliveryDate: newDate });
    startCountdown(newDate);
    alert("Data atualizada!");
}

function startCountdown(dateString) {
    // Limpa intervalo anterior se houver (para não bugar o timer)
    if(window.timerInterval) clearInterval(window.timerInterval);

    const target = new Date(dateString + "T00:00:00").getTime();

    window.timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = target - now;

        if (distance < 0) {
            document.getElementById("timer").innerHTML = "CHAVES NA MÃO!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        document.getElementById("timer").innerHTML = `${days} dias e ${hours} horas`;
    }, 1000);
}

// --- 2. PARCELAS MENSAIS (TABELA EDITÁVEL) ---
function loadMonthlyInstallments() {
    // Ouve a coleção de pagamentos em tempo real
    onSnapshot(collection(db, "payments"), (snapshot) => {
        const paymentsData = {};
        snapshot.forEach(doc => {
            paymentsData[doc.id] = doc.data().value;
        });

        const tbody = document.getElementById("installments-list");
        tbody.innerHTML = "";
        
        let currentDate = new Date();
        // Ajusta para o dia 1 do mês atual para evitar pular meses
        currentDate.setDate(1); 
        
        let totalInstallments = 0;

        // Loop de Hoje até 01/03/2028
        while (currentDate <= DATA_LIMITE_PARCELAS) {
            // Cria ID único tipo "2026-01"
            const monthId = currentDate.toISOString().slice(0, 7); 
            const displayMonth = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            
            // Pega valor salvo ou 0
            const value = paymentsData[monthId] || 0;
            totalInstallments += value;

            tbody.innerHTML += `
                <tr>
                    <td style="text-transform: capitalize;">${displayMonth}</td>
                    <td>
                        R$ <input type="number" 
                               class="money-input" 
                               value="${value}" 
                               onchange="savePayment('${monthId}', this.value)">
                    </td>
                    <td>${value > 0 ? '<i class="fas fa-check-circle" style="color:green"></i>' : '-'}</td>
                </tr>
            `;

            // Avança 1 mês
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        window.installTotalGlobal = totalInstallments;
        updateFinancialSummary();
    });
}

window.savePayment = async (monthId, value) => {
    const numValue = parseFloat(value) || 0;
    // Salva na coleção "payments" com ID sendo o mês (ex: "2026-05")
    await setDoc(doc(db, "payments", monthId), { value: numValue });
    // O onSnapshot vai atualizar a tela sozinho
}

// --- 3. CRUD GENÉRICO (Adicionar e Remover) ---

// Adicionar
window.addItem = async (type) => {
    let collectionName, data;

    if (type === 'furniture') {
        const name = document.getElementById('furn-name').value;
        const price = parseFloat(document.getElementById('furn-price').value) || 0;
        const link = document.getElementById('furn-link').value;
        const image = document.getElementById('furn-img').value;
        collectionName = 'furniture';
        data = { name, price, link, image };
    } 
    else if (type === 'renovation') {
        const name = document.getElementById('renov-name').value;
        const price = parseFloat(document.getElementById('renov-price').value) || 0;
        const category = document.getElementById('renov-type').value;
        collectionName = 'renovations';
        data = { name, price, category };
    }
    else if (type === 'checklist') {
        const name = document.getElementById('check-name').value;
        collectionName = 'checklist';
        data = { name, checked: false };
    }

    if(data.name) {
        await addDoc(collection(db, collectionName), data);
        closeModal(`modal-${type}`);
        document.querySelectorAll(`#modal-${type} input`).forEach(i => i.value = '');
    }
}

// REMOVER ITEM (NOVO)
window.deleteItem = async (collectionName, id) => {
    if(confirm("Tem certeza que quer apagar este item?")) {
        await deleteDoc(doc(db, collectionName, id));
    }
}

// --- 4. CARREGAMENTO DAS LISTAS ---

function loadFurniture() {
    const list = document.getElementById('list-furniture');
    onSnapshot(collection(db, "furniture"), (snapshot) => {
        list.innerHTML = '';
        let total = 0;
        snapshot.forEach((doc) => {
            const item = doc.data();
            total += item.price || 0;
            
            const imgDisplay = item.image 
                ? `<img src="${item.image}" class="furn-thumb">` 
                : `<div class="furn-thumb" style="background:#ddd; display:flex; align-items:center; justify-content:center"><i class="fas fa-couch"></i></div>`;

            list.innerHTML += `
                <li class="item-card">
                    <div class="item-info">
                        ${imgDisplay}
                        <div class="details">
                            <strong>${item.name}</strong><br>
                            ${item.link ? `<a href="${item.link}" target="_blank">Link</a>` : ''}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center">
                        <span style="font-weight:bold; margin-right:10px">${formatCurrency(item.price)}</span>
                        <button class="btn-delete" onclick="deleteItem('furniture', '${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </li>
            `;
        });
        window.furnTotalGlobal = total;
        updateFinancialSummary();
    });
}

function loadRenovations() {
    const list = document.getElementById('list-renovation');
    onSnapshot(collection(db, "renovations"), (snapshot) => {
        list.innerHTML = '';
        let total = 0;
        snapshot.forEach((doc) => {
            const item = doc.data();
            total += item.price || 0;
            list.innerHTML += `
                <li class="item-card">
                    <div class="item-info">
                        <strong>${item.name}</strong> <small>(${item.category})</small>
                    </div>
                    <div style="display:flex; align-items:center">
                        <span style="font-weight:bold; margin-right:10px">${formatCurrency(item.price)}</span>
                        <button class="btn-delete" onclick="deleteItem('renovations', '${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </li>
            `;
        });
        window.renovTotalGlobal = total;
        updateFinancialSummary();
    });
}

function loadChecklist() {
    const list = document.getElementById('list-checklist');
    onSnapshot(collection(db, "checklist"), (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach((doc) => {
            const item = doc.data();
            list.innerHTML += `
                <div class="check-item">
                    <label>${item.name}</label>
                    <button class="btn-delete" onclick="deleteItem('checklist', '${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    });
}

function updateFinancialSummary() {
    const total = (window.furnTotalGlobal || 0) + (window.renovTotalGlobal || 0) + (window.installTotalGlobal || 0);
    document.getElementById('total-furniture').innerText = formatCurrency(window.furnTotalGlobal || 0);
    document.getElementById('total-renovation').innerText = formatCurrency(window.renovTotalGlobal || 0);
    document.getElementById('total-installments').innerText = formatCurrency(window.installTotalGlobal || 0);
    document.getElementById('grand-total').innerText = formatCurrency(total);
}

function formatCurrency(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';
window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.style.display = "none"; }

// INICIALIZAÇÃO
loadDateConfig();
loadMonthlyInstallments();
loadFurniture();
loadRenovations();
loadChecklist();
