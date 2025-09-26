// -------------------- Firebase Setup --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// !!! MANTENHO A CHAVE MAS É RECOMENDADO USAR VARIÁVEIS DE AMBIENTE EM PRODUÇÃO !!!
const firebaseConfig = {
  apiKey: "AIzaSyDqBgWgNbfqmONsFmWUbk99TLY7qYKtMGw",
  authDomain: "limpeza-casa.firebaseapp.com",
  projectId: "limpeza-casa",
  storageBucket: "limpeza-casa.firebasestorage.app",
  messagingSenderId: "200028147487",
  appId: "1:200028147487:web:7a7d62828b93657845ea2a",
  measurementId: "G-X9FD1BEB2J"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -------------------- Sequências --------------------
const wcSuperiorSequence = [1, 2, 1, 2, 3];
const wcInferiorSequence = [5, 4, 3, 5, 4];
const cozinhaSequence 	 = [3, 5, 4, 1, 2];
const salaSequence 	 	= [4, 1, 2, 3, 5];
const corredorSequence 	= [2, 3, 5, 4, 1];

// -------------------- Datas --------------------
const calendarStart = new Date(2025, 8, 8); // 8/09/2025
const calendarEnd 	= new Date(2026, 6, 31); // 31/07/2026
let currentDate = new Date(); // inicia na data atual
if (currentDate < calendarStart) currentDate = new Date(calendarStart);
if (currentDate > calendarEnd) currentDate = new Date(calendarEnd);

// -------------------- Dados Globais --------------------
let users = ["Quarto 1", "Quarto 2", "Quarto 3", "Quarto 4", "Quarto 5"];
let divisionsData = {
  wcSuperior: { name: "WC Superior", tasks: ["Limpar lavatório", "Trocar toalhas"] },
  wcInferior: { name: "WC Inferior", tasks: ["Limpar chão", "Limpar sanita"] },
  cozinha: { name: "Cozinha", tasks: ["Lavar loiça", "Limpar balcões"] },
  sala: { name: "Sala", tasks: ["Aspirar", "Limpar mesas"] },
  corredor: { name: "Corredor", tasks: ["Varre chão", "Limpar espelhos"] },
};

// -------------------- Funções Firebase (mantidas) --------------------
async function loadUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));
  if (!querySnapshot.empty) users = querySnapshot.docs.map(doc => doc.data().name);
}
async function saveUsers() {
  for (let i = 0; i < users.length; i++) await setDoc(doc(db, "users", `person${i+1}`), { name: users[i] });
}
async function loadDivisions() {
  const snap = await getDoc(doc(db, "config", "divisions"));
  if (snap.exists()) {
    const data = snap.data();
    for (let key in divisionsData) {
      if (data[key]) {
        divisionsData[key].name = data[key].name || divisionsData[key].name;
        divisionsData[key].tasks = data[key].tasks || divisionsData[key].tasks;
      }
    }
  }
}
async function saveDivisions() {
  const dataToSave = {};
  for (let key in divisionsData) dataToSave[key] = { name: divisionsData[key].name, tasks: divisionsData[key].tasks };
  await setDoc(doc(db, "config", "divisions"), dataToSave);
}
async function loadTasks(dateKey) {
  const snap = await getDoc(doc(db, "tasks", dateKey));
  if (snap.exists()) return snap.data();
  return {};
}
async function saveTasks(dateKey, tasks) {
  await setDoc(doc(db, "tasks", dateKey), tasks);
}

// -------------------- Utilities --------------------
function formatDate(date) {
  const day = date.getDate().toString().padStart(2,"0");
  const month = (date.getMonth()+1).toString().padStart(2,"0");
  return `${day}/${month}`;
}
function weekKey(date) {
  // Cria uma chave única para a semana. Usamos o primeiro dia da semana.
  const firstDay = new Date(date);
  firstDay.setDate(firstDay.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1)); // Mudar para iniciar na Segunda-feira
  return `week_${firstDay.getFullYear()}_${firstDay.getMonth()+1}_${firstDay.getDate()}`;
}
function getWeekNumber(date) {
  // Calcula o número da semana a partir do calendarStart
  const firstDay = new Date(date);
  firstDay.setDate(firstDay.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1)); // Alinhar para Segunda-feira
  const diff = firstDay - calendarStart;
  return Math.floor(diff / (7*24*60*60*1000));
}

// -------------------- Navegação Main Section --------------------
function renderWeekNavigation() {
  const nav = document.getElementById("week-nav");
  nav.innerHTML = "";
  
  // Clonar a data atual para manipular a data de fim de semana
  const endDate = new Date(currentDate); 
  endDate.setDate(endDate.getDate() + 6); // Fim da semana (6 dias depois)

  const prev = document.createElement("button");
  prev.textContent = "« Semana Anterior";
  prev.className = "px-4 py-2 text-sm font-bold rounded-lg bg-white border border-gray-300 hover:bg-gray-100 transition duration-200";
  prev.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 7);
    if (currentDate < calendarStart) currentDate = new Date(calendarStart); // Limite inferior
    renderCards();
  });
  
  const next = document.createElement("button");
  next.textContent = "Próxima Semana »";
  next.className = "px-4 py-2 text-sm font-bold rounded-lg bg-white border border-gray-300 hover:bg-gray-100 transition duration-200";
  next.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 7);
    if (currentDate > calendarEnd) currentDate.setDate(calendarEnd.getDate() - 6); // Limite superior (volta para a última semana válida)
    renderCards();
  });
  
    const span = document.createElement("span");
    span.className = "text-xl font-extrabold mx-4 whitespace-nowrap";
    span.style.color = "var(--color-text-light)";
    span.textContent = `${formatDate(currentDate)} - ${formatDate(endDate)}`;

  nav.appendChild(prev); nav.appendChild(span); nav.appendChild(next);
}

// -------------------- Main Cards --------------------
async function renderCards() {
  renderWeekNavigation();
  const container = document.getElementById("cards-container");
  container.innerHTML = "";
  
  const key = weekKey(currentDate);
  const weekTasks = await loadTasks(key);
  const weekNum = getWeekNumber(currentDate); // Número da semana de rotação
  let weekHasAssignments = false;

  const divKeys = Object.keys(divisionsData);
  const seqs = [wcSuperiorSequence, wcInferiorSequence, cozinhaSequence, salaSequence, corredorSequence];

  users.forEach((user, userIndex) => {
    // Descobrir qual divisão este quarto tem nesta semana
    let divisionKey = null;
    let divisionName = "";

    // O índice da sequência é (weekNum MOD length)
    for (let i = 0; i < divKeys.length; i++) {
      const seq = seqs[i];
      // O valor na sequência é o número do quarto (1 a 5).
      // Comparar com (userIndex + 1)
      if ((seq[weekNum % seq.length]) === (userIndex + 1)) {
        divisionKey = divKeys[i];
        divisionName = divisionsData[divisionKey].name;
        weekHasAssignments = true;
        break;
      }
    }

    if (!divisionKey) return; // Nenhuma tarefa atribuída a este quarto nesta semana

    const personKey = `person${userIndex+1}`;
    const personDivisionTasks = (weekTasks[personKey] || {})[divisionKey] || {};
    const total = divisionsData[divisionKey].tasks.length;
    const doneCount = Object.values(personDivisionTasks).filter(v => v==="done").length;
    const progress = total>0 ? Math.round(doneCount/total*100) : 0;

    const card = document.createElement("div");
    card.className = "card flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <h3 class="font-extrabold text-xl mb-1 text-primary-dark">${divisionName}</h3>
        <p class="text-gray-600 mb-4 font-semibold">${user}</p>
        <div class="text-sm font-medium text-gray-500 mb-1">Progresso: ${progress}%</div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%"></div></div>
      </div>
      <button class="mt-4 text-center action-btn-primary px-4 py-2 hover:underline" data-person="${personKey}" data-division="${divisionKey}">
        ${doneCount === total ? 'Tarefas Concluídas' : 'Ver/Atualizar Tarefas'}
      </button>
    `;
    container.appendChild(card);
  });

  if (!weekHasAssignments) {
    const msg = document.createElement("p");
    msg.textContent = "Não há tarefas atribuídas a nenhum quarto nesta semana.";
    msg.className = "text-xl text-alert font-bold mt-4 col-span-full text-center p-6 bg-white rounded-lg shadow";
    container.appendChild(msg);
  }

  // Configurar eventos de clique para abrir o modal de tarefas
  container.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const personKey = btn.dataset.person;
      const divisionKey = btn.dataset.division;
      const tasksKey = weekKey(currentDate);
      const weekTasks = await loadTasks(tasksKey);
      const personDivisionTasks = (weekTasks[personKey]||{})[divisionKey]||{};
      const currentUserName = users[parseInt(personKey.replace("person",""))-1];
      const currentDivisionName = divisionsData[divisionKey].name;

      let html = `<h2 class="text-2xl font-bold mb-1 text-gray-800">${currentDivisionName}</h2>
                  <p class="text-lg text-primary-base font-semibold mb-4">Responsável: ${currentUserName}</p>
                  <div class="space-y-3">`;

      divisionsData[divisionKey].tasks.forEach((task,idx)=>{
        const state = personDivisionTasks[idx] || "todo";
        html += `
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border-b border-gray-200">
            <span class="font-medium text-gray-700 w-full sm:w-64 mb-1 sm:mb-0">${task}</span>
            <select data-task-idx="${idx}" data-person="${personKey}" data-division="${divisionKey}" class="mt-1 sm:mt-0 ${state} w-full sm:w-40">
              <option value="todo" ${state==="todo"?"selected":""}>🔴 Por Fazer</option>
              <option value="in_progress" ${state==="in_progress"?"selected":""}>🟡 Em Progresso</option>
              <option value="done" ${state==="done"?"selected":""}>🟢 Concluída</option>
            </select>
          </div>`;
      });
      html += `</div>`;

      // Criar Modal
      const modal = document.createElement("div");
      modal.className = "fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4";
      modal.innerHTML = `
        <div class="modal-content p-6 sm:p-8 w-full max-w-lg">
          ${html}
          <div class="flex justify-end gap-3 mt-6">
            <button id="cancel" class="cancel px-4 py-2 rounded">Cancelar</button>
            <button id="save" class="save px-4 py-2 rounded">Guardar Alterações</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      modal.querySelector("#cancel").addEventListener("click",()=>modal.remove());
      modal.querySelector("#save").addEventListener("click", async ()=>{
        const selects = modal.querySelectorAll("select");
        // Inicializar estruturas se não existirem
        if(!weekTasks[personKey]) weekTasks[personKey]={};
        if(!weekTasks[personKey][divisionKey]) weekTasks[personKey][divisionKey]={};
        // Guardar novos estados
        selects.forEach(sel=> weekTasks[personKey][divisionKey][sel.dataset.taskIdx] = sel.value);
        await saveTasks(tasksKey, weekTasks);
        modal.remove();
        renderCards(); // Re-renderizar para atualizar o progresso
      });

      modal.querySelectorAll("select").forEach(sel=>{
        sel.addEventListener("change",()=> {
          // Atualizar classe para refletir a cor de estado
          sel.className = sel.value==="done"?"done":sel.value==="in_progress"?"in_progress":"todo";
          sel.classList.add('mt-1', 'sm:mt-0', 'w-full', 'sm:w-40'); // Manter classes Tailwind
        });
      });
    });
  });
}

// -------------------- Config Section --------------------
function renderUsersConfig(){
  const container = document.getElementById("config-users");
  container.innerHTML="";
  users.forEach((u,i)=>{
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-center space-x-2";
    const label = document.createElement("label");
    label.textContent = `Quarto ${i + 1}:`;
    label.className = "w-20 font-medium text-gray-600";
    const input=document.createElement("input");
    input.type="text";
    input.value=u;
    input.dataset.index=i;
    input.className="border p-2 w-full rounded-lg transition duration-150 focus:ring-primary-base focus:border-primary-base";
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  });
}

function renderDivisionsConfig(){
  const divConfig=document.getElementById("divisions-config");
  divConfig.innerHTML="";
  for(let key in divisionsData){
    const divData = divisionsData[key];
    const card=document.createElement("div");
    card.className="card flex flex-col justify-between border-l-4 border-primary-base hover:border-primary-dark";
    card.innerHTML=`
      <div>
          <h3 class="font-extrabold text-xl mb-3 text-gray-800">${divData.name}</h3>
          <ul class="list-disc pl-5 mb-4 text-gray-600 space-y-1">
            ${divData.tasks.map(t=>`<li class="text-sm">${t}</li>`).join("")}
          </ul>
      </div>
      <button class="edit-division-btn mt-3 bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-2 rounded-lg font-semibold" data-division="${key}">Editar Divisão</button>
    `;
    divConfig.appendChild(card);
  }

  divConfig.querySelectorAll(".edit-division-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const divisionKey=btn.dataset.division;
      const divData=divisionsData[divisionKey];
      
      const modal=document.createElement("div");
      modal.className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4";
      modal.innerHTML=`
        <div class="modal-content p-6 sm:p-8 w-full max-w-lg">
          <h3 class="text-2xl font-bold mb-4 text-gray-800">Editar ${divData.name}</h3>
          
          <label class="block mb-2 font-semibold text-gray-700">Nome da divisão:</label>
          <input id="modal-name" class="border p-2 w-full rounded-lg mb-4" value="${divData.name}">
          
          <label class="block mb-2 font-semibold text-gray-700">Tarefas (uma por linha):</label>
          <div id="modal-tasks" class="space-y-2 mb-4">
            ${divData.tasks.map(t=>`<div class="flex space-x-2"><input class="task-input border p-2 w-full rounded-lg" value="${t}"><button class="remove-task-btn text-alert hover:text-red-700 font-bold" type="button">X</button></div>`).join("")}
          </div>
          <button id="add-task" class="action-btn-primary bg-primary-base px-3 py-2 rounded-lg mb-4 text-sm font-semibold">+ Adicionar Tarefa</button>
          
          <div class="flex justify-end gap-3 mt-4">
            <button id="cancel" class="cancel px-4 py-2 rounded">Cancelar</button>
            <button id="save" class="save px-4 py-2 rounded">Guardar</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const modalTasksContainer = modal.querySelector("#modal-tasks");

      const addTaskInput = (value="") => {
        const wrapper = document.createElement("div");
        wrapper.className = "flex space-x-2 items-center";
        const input=document.createElement("input");
        input.className="task-input border p-2 w-full rounded-lg";
        input.value=value;
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-task-btn text-alert hover:text-red-700 font-bold w-6 h-6 flex justify-center items-center";
        removeBtn.textContent = "X";
        removeBtn.type = "button";
        removeBtn.addEventListener("click", () => wrapper.remove());
        
        wrapper.appendChild(input);
        wrapper.appendChild(removeBtn);
        modalTasksContainer.appendChild(wrapper);
      };
      
      // Adicionar botões de remover existentes
      modal.querySelectorAll(".remove-task-btn").forEach(btn => {
          btn.addEventListener("click", (e) => e.target.closest("div").remove());
      });

      modal.querySelector("#add-task").addEventListener("click", ()=>addTaskInput());
      modal.querySelector("#cancel").addEventListener("click",()=>modal.remove());
      modal.querySelector("#save").addEventListener("click", async ()=>{
        divData.name = modal.querySelector("#modal-name").value;
        divData.tasks = Array.from(modal.querySelectorAll(".task-input")).map(i=>i.value).filter(t=>t.trim()!=="");
        
        // Se a divisão for renomeada ou tarefas alteradas, re-renderizar
        renderDivisionsConfig();
        // Garantir que as tarefas e o calendário reflitam as novas configurações
        renderCards(); 
        renderCalendar();
        
        modal.remove();
        await saveDivisions();
      });
    });
  });
}

// -------------------- Guardar nomes dos quartos --------------------
document.getElementById("save-users").addEventListener("click", async ()=>{
  const inputs = document.querySelectorAll("#config-users input");
  users = Array.from(inputs).map(i=>i.value);
  await saveUsers();
  renderCards();
  renderCalendar();
  alert("Nomes dos Quartos guardados com sucesso!"); // Feedback UX
});

// -------------------- Guardar Configuração das Divisões --------------------
document.getElementById("save-config").addEventListener("click", async ()=>{
    // A função saveDivisions é chamada dentro do modal de edição da divisão para garantir que a divisão foi configurada.
    // Este botão serve apenas como um "Guardar Geral" caso as alterações tivessem sido feitas diretamente
    alert("As alterações de Divisões são guardadas ao clicar em 'Guardar' dentro do modal de edição de cada Divisão.");
});


// -------------------- Calendário Section --------------------
function renderCalendar(){
  const div=document.getElementById("calendar-table");
  let html = `<table class="w-full text-sm border-collapse">
    <thead>
      <tr class="bg-primary-base text-white">
        <th class="p-3 border border-gray-300 rounded-tl-xl">Semana</th>
        <th class="p-3 border border-gray-300">WC Superior</th>
        <th class="p-3 border border-gray-300">WC Inferior</th>
        <th class="p-3 border border-gray-300">Cozinha</th>
        <th class="p-3 border border-gray-300">Sala</th>
        <th class="p-3 border border-gray-300 rounded-tr-xl">Corredor</th>
      </tr>
    </thead>
    <tbody>`;
  
  let date = new Date(calendarStart);
  let weekNum = 0;
  let count = 0;
  const maxWeeks = Math.ceil((calendarEnd - calendarStart) / (7*24*60*60*1000));
  
  while(date <= calendarEnd && count <= maxWeeks){
    const isCurrentWeek = getWeekNumber(currentDate) === weekNum;
    const rowClass = isCurrentWeek ? "bg-accent-light font-bold border-l-4 border-primary-dark" : "hover:bg-gray-100";
    
    // Calcular a data de fim para a coluna da semana
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);

    html+=`<tr class="${rowClass}">
      <td class="p-3 border border-gray-200 text-primary-dark">${formatDate(date)} - ${formatDate(endDate)}</td>
      <td class="p-3 border border-gray-200">${users[wcSuperiorSequence[weekNum%wcSuperiorSequence.length]-1]}</td>
      <td class="p-3 border border-gray-200">${users[wcInferiorSequence[weekNum%wcInferiorSequence.length]-1]}</td>
      <td class="p-3 border border-gray-200">${users[cozinhaSequence[weekNum%cozinhaSequence.length]-1]}</td>
      <td class="p-3 border border-gray-200">${users[salaSequence[weekNum%salaSequence.length]-1]}</td>
      <td class="p-3 border border-gray-200">${users[corredorSequence[weekNum%corredorSequence.length]-1]}</td>
    </tr>`;
    date.setDate(date.getDate()+7); 
    weekNum++;
    count++;
  }

  html+="</tbody></table>";
  div.innerHTML = html;
}

// -------------------- Navegação entre secções --------------------
document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    // Remover 'active' de todos e adicionar ao clicado
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Esconder todas as secções e mostrar a correta
    document.querySelectorAll(".section").forEach(sec=>sec.classList.add("hidden"));
    document.getElementById(btn.dataset.section).classList.remove("hidden");
    
    // Atualizar conteúdo específico ao navegar, se necessário
    if(btn.dataset.section === "config-section") {
        renderUsersConfig();
        renderDivisionsConfig();
    } else if (btn.dataset.section === "calendar-section") {
        renderCalendar();
    }
  });
});

// -------------------- Inicialização --------------------
(async ()=>{
  // Selecionar o botão principal como ativo no início
  document.querySelector(".nav-btn[data-section='main-section']")?.classList.add("active");
    
  await loadUsers();
  await loadDivisions();
  
  // As funções de renderização de Config e Calendário são chamadas na navegação ou em funções de 'save'
  renderCards(); // O 'main-section' é o padrão
  
  console.log("Aplicação inicializada.");
})();