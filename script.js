// Importações Oficiais do Firebase v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- SUA CONFIGURAÇÃO EXATA ---
const firebaseConfig = {
  apiKey: "AIzaSyBS_1SV_RpZ9WhUQEqbgXGC5_D-seor4Ls",
  authDomain: "planejamento-d3c78.firebaseapp.com",
  projectId: "planejamento-d3c78",
  storageBucket: "planejamento-d3c78.firebasestorage.app",
  messagingSenderId: "840047083909",
  appId: "1:840047083909:web:5456504fdd393d6dcb04ec"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONFIGURAÇÕES DE DATAS E VALORES ---
// Data da entrega das chaves (Exemplo: Dezembro 2026)
const DATA_ENTREGA_CHAVES = new Date("2026-12-31T00:00:00").getTime(); 

// Data final das parcelas (Conforme seu pedido: 01/01/2028)
const DATA_FIM_PARCELA = new Date("2028-01-01T00:00:00");

// Valor da sua parcela mensal (EDITE AQUI O VALOR REAL)
const VALOR_PARCELA_MENSAL = 1500.00; 

// --- 1. Contagem Regressiva ---
function startCountdown() {
    setInterval(() => {
        const now = new Date().getTime();
        const distance = DATA_ENTREGA_CHAVES - now;

        if (distance < 0) {
            document.getElementById("timer").innerHTML = "CHAVES NA MÃO!";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        document.getElementById("timer").innerHTML = `${days} dias e ${hours} horas`;
    }, 1000);
}

// --- 2. Cálculos Financeiros ---
function calculateInstallments() {
    const now = new Date();
    // Cálculo simples de meses até Jan/2028
    let months = (DATA_FIM_PARCELA.getFullYear() - now.getFullYear()) * 12;
    months -= now.getMonth();
    months += DATA_FIM_PARCELA.getMonth();
    
    if (months <= 0) return 0;
    return months * VALOR_PARCELA_MENSAL;
}

function updateFinancialSummary() {
    // Pega os totais salvos nas variáveis globais ou assume 0
    const furnTotal = window.furnTotalGlobal || 0;
    const renovTotal = window.renovTotalGlobal || 0;
    const installTotal = calculateInstallments();
    
    const grandTotal = furnTotal + renovTotal + installTotal;

    document.getElementById('total-furniture').innerText = formatCurrency(furnTotal);
    document.getElementById('total-renovation').innerText = formatCurrency(renovTotal);
    document.getElementById('total-installments').innerText = formatCurrency(installTotal);
    document.getElementById('grand-total').innerText = formatCurrency(grandTotal);
}

// --- 3. Funções do Banco de Dados ---

// Adicionar Item (Genérico)
window.addItem = async (type) => {
    let collectionName, data;

    if (type === 'furniture') {
        const name = document.getElementById('furn-name').value;
        const price = parseFloat(document.getElementById('furn-price').value) || 0;
        const link = document.getElementById('furn-link').value;
        const image = document.getElementById('furn-img').value; // Pega a foto

        if(!name) return alert("Digite o nome do móvel!");

        collectionName = 'furniture';
        data = { name, price, link, image, type: 'furniture', createdAt: new Date() };
    } 
    else if (type === 'renovation') {
        const name = document.getElementById('renov-name').value;
        const price = parseFloat(document.getElementById('renov-price').value) || 0;
        const category = document.getElementById('renov-type').value;

        if(!name) return alert("Digite o nome do material!");

        collectionName = 'renovations';
        data = { name, price, category, type: 'renovation', createdAt: new Date() };
    }

    try {
        await addDoc(collection(db, collectionName), data);
        alert("Salvo com sucesso!");
        closeModal(`modal-${type}`);
        // Limpa os campos
        document.querySelectorAll(`#modal-${type} input`).forEach(input => input.value = '');
    } catch (e) {
        console.error("Erro ao gravar:", e);
        alert("Erro ao salvar: " + e.message);
    }
}

// Carregar Móveis (Com Foto)
function loadFurniture() {
    const list = document.getElementById('list-furniture');
    
    // Escuta em tempo real
    onSnapshot(collection(db, "furniture"), (snapshot) => {
        list.innerHTML = '';
        let total = 0;

        if (snapshot.empty) {
            list.innerHTML = '<li style="padding:10px; text-align:center">Nenhum móvel cadastrado.</li>';
        }

        snapshot.forEach((doc) => {
            const item = doc.data();
            total += item.price;
            
            // Lógica da Imagem ou Ícone
            const imgDisplay = item.image 
                ? `<img src="${item.image}" class="furn-thumb" alt="${item.name}" onerror="this.onerror=null;this.src='';this.parentNode.innerHTML='<div class=\'furn-thumb-placeholder\'><i class=\'fas fa-couch\'></i></div>'">` 
                : `<div class="furn-thumb-placeholder"><i class="fas fa-couch"></i></div>`;

            list.innerHTML += `
                <li class="item-card">
                    <div class="item-info">
                        ${imgDisplay}
                        <div class="details">
                            <strong>${item.name}</strong><br>
                            ${item.link ? `<a href="${item.link}" target="_blank">Ver na Loja <i class="fas fa-external-link-alt"></i></a>` : ''}
                        </div>
                    </div>
                    <span class="price-tag">${formatCurrency(item.price)}</span>
                </li>
            `;
        });
        
        window.furnTotalGlobal = total;
        updateFinancialSummary();
    }, (error) => {
        console.error("Erro ao buscar móveis:", error);
    });
}

// Carregar Reformas
function loadRenovations() {
    const list = document.getElementById('list-renovation');
    
    onSnapshot(collection(db, "renovations"), (snapshot) => {
        list.innerHTML = '';
        let total = 0;

        if (snapshot.empty) {
            list.innerHTML = '<li style="padding:10px; text-align:center">Nenhum material cadastrado.</li>';
        }

        snapshot.forEach((doc) => {
            const item = doc.data();
            total += item.price;
            list.innerHTML += `
                <li class="item-card">
                    <div class="item-info">
                        <div class="furn-thumb-placeholder" style="background:#e3f2fd; color:#2196f3">
                            <i class="fas fa-hammer"></i>
                        </div>
                        <div>
                            <strong>${item.name}</strong> <small>(${item.category || 'Geral'})</small>
                        </div>
                    </div>
                    <span class="price-tag">${formatCurrency(item.price)}</span>
                </li>
            `;
        });
        
        window.renovTotalGlobal = total;
        updateFinancialSummary();
    });
}

// Carregar Checklist Vistoria
function loadChecklist() {
    const items = [
        "Quadro de luz (Disjuntores identificados?)",
        "Tomadas (Teste de voltagem)",
        "Piso (Oco? Riscado? Manchas?)",
        "Janelas (Abrem fácil? Vidros ok?)",
        "Torneiras e Sifões (Vazamentos?)",
        "Caimento da água no box e sacada",
        "Pintura e Gesso (Rachaduras?)"
    ];
    
    const container = document.getElementById('list-inspection');
    container.innerHTML = "";
    items.forEach(item => {
        container.innerHTML += `
            <div class="check-item">
                <input type="checkbox">
                <label>${item}</label>
            </div>
        `;
    });
}

// Utilitários
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// --- EXECUÇÃO IMEDIATA ---
console.log("Iniciando App...");
startCountdown();
loadFurniture();
loadRenovations();
loadChecklist();
