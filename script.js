// Importando o Firebase (Versão Modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
// 1. Vá no Firebase Console > Project Settings > General
// 2. Copie a config e cole abaixo:
const firebaseConfig = {
     apiKey: "AIzaSyB50zJNYvzE9ecqBEWprummFQczftTAQi4",
  authDomain: "planejamento-eb861.firebaseapp.com",
  projectId: "planejamento-eb861",
  storageBucket: "planejamento-eb861.firebasestorage.app",
  messagingSenderId: "845098431812",
  appId: "1:845098431812:web:53c8dff83b5b5bfb33d311",
  measurementId: "G-CJN1J3RFD6"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONFIGURAÇÕES GERAIS ---
const PREVISAO_CHAVES = new Date("2026-12-31T00:00:00").getTime(); // Ajuste a data da entrega
const VALOR_PARCELA_MENSAL = 1500.00; // Ajuste o valor da sua parcela
const DATA_FINAL_PAGAMENTO = new Date("2028-01-01T00:00:00");

// --- FUNÇÕES DE INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    startCountdown();
    loadDashboard();
    loadFurniture();
    loadRenovations();
    loadChecklist();
});

// 1. Contador Regressivo
function startCountdown() {
    setInterval(() => {
        const now = new Date().getTime();
        const distance = PREVISAO_CHAVES - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        document.getElementById("timer").innerHTML = `${days}d ${hours}h restantes`;
    }, 1000);
}

// 2. Lógica Financeira (Parcelas até 2028 + Totais)
function calculateInstallments() {
    const now = new Date();
    let months = (DATA_FINAL_PAGAMENTO.getFullYear() - now.getFullYear()) * 12;
    months -= now.getMonth();
    months += DATA_FINAL_PAGAMENTO.getMonth();
    
    // Se a data já passou, zera
    if (months <= 0) return 0;

    return months * VALOR_PARCELA_MENSAL;
}

// Atualiza o Dashboard somando tudo
async function updateFinancialSummary(furnTotal, renovTotal) {
    const installTotal = calculateInstallments();
    const grandTotal = furnTotal + renovTotal + installTotal;

    document.getElementById('total-furniture').innerText = formatCurrency(furnTotal);
    document.getElementById('total-renovation').innerText = formatCurrency(renovTotal);
    document.getElementById('total-installments').innerText = formatCurrency(installTotal);
    document.getElementById('grand-total').innerText = formatCurrency(grandTotal);
}

// --- FUNÇÕES DO FIRESTORE (CRUD) ---

// Adicionar Item
window.addItem = async (type) => {
    let collectionName, data;

    if (type === 'furniture') {
        const name = document.getElementById('furn-name').value;
        const price = parseFloat(document.getElementById('furn-price').value) || 0;
        const link = document.getElementById('furn-link').value;
        collectionName = 'furniture';
        data = { name, price, link, type: 'furniture' };
    } else if (type === 'renovation') {
        const name = document.getElementById('renov-name').value;
        const price = parseFloat(document.getElementById('renov-price').value) || 0;
        const category = document.getElementById('renov-type').value;
        collectionName = 'renovations';
        data = { name, price, category, type: 'renovation' };
    }

    try {
        await addDoc(collection(db, collectionName), data);
        alert("Item salvo!");
        closeModal(`modal-${type}`);
    } catch (e) {
        console.error("Erro ao adicionar: ", e);
        alert("Erro ao salvar (verifique a config do Firebase)");
    }
}

// Carregar Móveis (Realtime)
function loadFurniture() {
    const list = document.getElementById('list-furniture');
    onSnapshot(collection(db, "furniture"), (snapshot) => {
        list.innerHTML = '';
        let total = 0;
        snapshot.forEach((doc) => {
            const item = doc.data();
            total += item.price;
            list.innerHTML += `
                <li class="item-card">
                    <div>
                        <strong>${item.name}</strong><br>
                        <a href="${item.link}" target="_blank">Ver Link <i class="fas fa-external-link-alt"></i></a>
                    </div>
                    <span>${formatCurrency(item.price)}</span>
                </li>
            `;
        });
        // Atualiza o total global passando o valor atual desta categoria
        // Nota: Em um app real, faríamos um state management melhor, 
        // mas aqui vamos recalcular lendo do DOM ou guardando em variável global
        window.furnTotalGlobal = total; 
        updateFinancialSummary(window.furnTotalGlobal || 0, window.renovTotalGlobal || 0);
    });
}

// Carregar Reformas (Realtime)
function loadRenovations() {
    const list = document.getElementById('list-renovation');
    onSnapshot(collection(db, "renovations"), (snapshot) => {
        list.innerHTML = '';
        let total = 0;
        snapshot.forEach((doc) => {
            const item = doc.data();
            total += item.price;
            list.innerHTML += `
                <li class="item-card">
                    <div>
                        <strong>${item.name}</strong> <small>(${item.category})</small>
                    </div>
                    <span>${formatCurrency(item.price)}</span>
                </li>
            `;
        });
        window.renovTotalGlobal = total;
        updateFinancialSummary(window.furnTotalGlobal || 0, window.renovTotalGlobal || 0);
    });
}

// Carregar Checklist de Vistoria (Estático + Status no Banco poderia ser implementado)
function loadChecklist() {
    const items = [
        "Testar todas as tomadas (multímetro)",
        "Verificar caimento de água (box/ralos)",
        "Abrir e fechar todas as portas/janelas",
        "Verificar riscos nos pisos e azulejos",
        "Testar disjuntores e quadro de luz",
        "Verificar se há vazamentos nos sifões"
    ];
    
    const container = document.getElementById('list-inspection');
    items.forEach(item => {
        container.innerHTML += `
            <div class="check-item">
                <input type="checkbox">
                <label>${item}</label>
            </div>
        `;
    });
}

// --- UTILITÁRIOS ---
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Funções de Modal
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

// Fecha modal se clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }

}
