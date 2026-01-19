
let quizCount = 1;
let currentCategory = 'classe-teen';

// Adicionar event listener para o upload de arquivo
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csv-file').addEventListener('change', handleFileUpload);
    document.getElementById('quiz-file-1').addEventListener('change', function(event) {
        handleQuizFileUpload(event, 1);
    });
    
    // Adicionar listener para mudança de categoria
    document.getElementById('category-select').addEventListener('change', handleCategoryChange);
    
    // Carregar categoria salva
    const savedCategory = localStorage.getItem('kahoot_current_category');
    if (savedCategory) {
        currentCategory = savedCategory;
        document.getElementById('category-select').value = savedCategory;
    }
    
    checkSavedData();
    loadAllQuizzesFromStorage();
});

// Salvar todos os quizzes no localStorage
function saveAllQuizzesToStorage() {
    const quizzes = document.querySelectorAll('.quiz-container');
    const allQuizzesData = {};
    const quizTitles = {};
    
    quizzes.forEach(quiz => {
        const quizId = quiz.id.replace('quiz-', '');
        const playersDiv = quiz.querySelector(`#players-quiz-${quizId}`);
        const playerEntries = playersDiv.querySelectorAll('.player-entry');
        const data = [];
        
        // Salvar título do quiz
        const titleDisplay = quiz.querySelector('.quiz-title-display');
        if (titleDisplay) {
            quizTitles[quizId] = titleDisplay.textContent;
        }
        
        playerEntries.forEach(entry => {
            const name = entry.querySelector('.name-input').value.trim();
            const score = entry.querySelector('.score-input').value;
            if (name || score) {
                data.push({ name, score });
            }
        });
        
        if (data.length > 0) {
            allQuizzesData[quizId] = data;
        }
    });
    
    // Salvar com chave específica da categoria
    localStorage.setItem(`kahoot_all_quizzes_${currentCategory}`, JSON.stringify(allQuizzesData));
    localStorage.setItem(`kahoot_quiz_titles_${currentCategory}`, JSON.stringify(quizTitles));
    localStorage.setItem(`kahoot_quiz_count_${currentCategory}`, quizCount);
    localStorage.setItem('kahoot_current_category', currentCategory);
}

// Carregar todos os quizzes do localStorage
function loadAllQuizzesFromStorage() {
    const savedData = localStorage.getItem(`kahoot_all_quizzes_${currentCategory}`);
    const savedQuizCount = localStorage.getItem(`kahoot_quiz_count_${currentCategory}`);
    const savedTitles = localStorage.getItem(`kahoot_quiz_titles_${currentCategory}`);
    
    if (savedData) {
        const allQuizzesData = JSON.parse(savedData);
        const quizTitles = savedTitles ? JSON.parse(savedTitles) : {};
        const quizIds = Object.keys(allQuizzesData).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Restaurar contador de quizzes
        if (savedQuizCount) {
            quizCount = parseInt(savedQuizCount);
        }
        
        // Criar quizzes necessários
        for (let i = 2; i <= quizIds.length; i++) {
            if (!document.getElementById(`quiz-${i}`)) {
                addQuizSilent(i);
            }
        }
        
        // Carregar dados e títulos em cada quiz
        quizIds.forEach(quizId => {
            if (allQuizzesData[quizId]) {
                loadPlayersToQuiz(parseInt(quizId), allQuizzesData[quizId]);
            }
            if (quizTitles[quizId]) {
                updateQuizTitle(parseInt(quizId), quizTitles[quizId]);
            }
        });
        
        checkSavedData();
    }
}

// Trocar categoria
function handleCategoryChange() {
    const newCategory = document.getElementById('category-select').value;
    
    if (newCategory !== currentCategory) {
        const confirmChange = confirm('Trocar de categoria irá salvar os dados atuais e carregar os dados da nova categoria. Deseja continuar?');
        
        if (confirmChange) {
            // Salvar dados da categoria atual antes de trocar
            saveAllQuizzesToStorage();
            
            // Atualizar categoria
            currentCategory = newCategory;
            localStorage.setItem('kahoot_current_category', currentCategory);
            
            // Limpar todos os quizzes da tela
            clearAllQuizzes();
            
            // Resetar contador
            quizCount = 1;
            
            // Recriar Quiz 1
            recreateQuiz1();
            
            // Carregar dados da nova categoria
            loadAllQuizzesFromStorage();
            
            // Atualizar status de dados salvos
            checkSavedData();
            
            // Ocultar ranking se estiver visível
            document.getElementById('ranking-results').classList.add('hidden');
        } else {
            // Reverter select se o usuário cancelar
            document.getElementById('category-select').value = currentCategory;
        }
    }
}

// Limpar todos os quizzes da tela
function clearAllQuizzes() {
    const quizzesDiv = document.getElementById('quizzes');
    quizzesDiv.innerHTML = '';
}

// Recriar Quiz 1 vazio
function recreateQuiz1() {
    const quizzesDiv = document.getElementById('quizzes');
    
    const quiz1Div = document.createElement('div');
    quiz1Div.className = 'quiz-container';
    quiz1Div.id = 'quiz-1';
    
    quiz1Div.innerHTML = `
        <div class="quiz-header">
            <h3>
                <span class="quiz-title-display">Quiz 1</span>
                <input type="text" class="quiz-title-input" style="display: none;" value="Quiz 1">
                <button class="edit-title-btn" onclick="toggleEditTitle(1)">✏️ Editar</button>
            </h3>
            <button class="remove-quiz" onclick="removeQuiz(1)" disabled>Remover Quiz</button>
        </div>
        <button class="import-quiz-btn" onclick="triggerQuizImport(1)">📁 Importar Dados do Kahoot</button>
        <input type="file" id="quiz-file-1" class="quiz-file-input" accept=".csv,.xlsx,.xls,.pdf">
        <div id="players-quiz-1">
            <div class="player-entry">
                <input type="text" class="name-input" placeholder="Nome do Participante">
                <input type="number" class="score-input" placeholder="Pontuação" min="0">
                <button class="remove-player" onclick="removePlayer(this)">🗑️</button>
            </div>
        </div>
        <button class="add-player" onclick="addPlayer(1)">+ Adicionar Participante</button>
    `;
    
    quizzesDiv.appendChild(quiz1Div);
    
    // Setup listener de importação
    document.getElementById('quiz-file-1').addEventListener('change', function(event) {
        handleQuizFileUpload(event, 1);
    });
    
    // Adicionar auto-save listeners
    addQuizAutoSaveListeners(1);
}

// Adicionar quiz silenciosamente (sem incrementar contador)
function addQuizSilent(quizId) {
    const quizzesDiv = document.getElementById('quizzes');
    
    const newQuizDiv = document.createElement('div');
    newQuizDiv.className = 'quiz-container';
    newQuizDiv.id = `quiz-${quizId}`;
    
    newQuizDiv.innerHTML = `
        <div class="quiz-header">
            <h3>
                <span class="quiz-title-display">Quiz ${quizId}</span>
                <input type="text" class="quiz-title-input" style="display: none;" value="Quiz ${quizId}">
                <button class="edit-title-btn" onclick="toggleEditTitle(${quizId})">✏️ Editar</button>
            </h3>
            <button class="remove-quiz" onclick="removeQuiz(${quizId})">Remover Quiz</button>
        </div>
        <button class="import-quiz-btn" onclick="triggerQuizImport(${quizId})">📁 Importar Dados do Kahoot</button>
        <input type="file" id="quiz-file-${quizId}" class="quiz-file-input" accept=".csv,.xlsx,.xls,.pdf">
        <div id="players-quiz-${quizId}">
            <div class="player-entry">
                <input type="text" class="name-input" placeholder="Nome do Participante">
                <input type="number" class="score-input" placeholder="Pontuação" min="0">
                <button class="remove-player" onclick="removePlayer(this)">🗑️</button>
            </div>
        </div>
        <button class="add-player" onclick="addPlayer(${quizId})">+ Adicionar Participante</button>
    `;
    
    quizzesDiv.appendChild(newQuizDiv);
    
    // Setup listener de importação para o novo quiz
    setupQuizImportListener(quizId);
    
    // Habilitar o botão de remover no primeiro quiz quando houver mais de um quiz
    if (quizId === 2) {
        document.querySelector(`#quiz-1 .remove-quiz`).removeAttribute('disabled');
    }
    
    // Adicionar auto-save listeners
    addQuizAutoSaveListeners(quizId);
}

// Toggle edição de título do quiz
function toggleEditTitle(quizId) {
    const quiz = document.getElementById(`quiz-${quizId}`);
    const titleDisplay = quiz.querySelector('.quiz-title-display');
    const titleInput = quiz.querySelector('.quiz-title-input');
    const editBtn = quiz.querySelector('.edit-title-btn');
    
    if (titleInput.style.display === 'none') {
        // Entrar em modo de edição
        titleInput.value = titleDisplay.textContent;
        titleDisplay.style.display = 'none';
        titleInput.style.display = 'inline-block';
        editBtn.textContent = '💾 Salvar';
        titleInput.focus();
    } else {
        // Salvar título
        const newTitle = titleInput.value.trim() || `Quiz ${quizId}`;
        titleDisplay.textContent = newTitle;
        titleInput.value = newTitle;
        titleDisplay.style.display = 'inline';
        titleInput.style.display = 'none';
        editBtn.textContent = '✏️ Editar';
        saveAllQuizzesToStorage();
    }
}

// Atualizar título do quiz
function updateQuizTitle(quizId, title) {
    const quiz = document.getElementById(`quiz-${quizId}`);
    if (quiz) {
        const titleDisplay = quiz.querySelector('.quiz-title-display');
        const titleInput = quiz.querySelector('.quiz-title-input');
        if (titleDisplay && titleInput) {
            titleDisplay.textContent = title;
            titleInput.value = title;
        }
    }
}

// Verificar se há dados salvos
function checkSavedData() {
    const category = currentCategory;
    const savedData = localStorage.getItem(`kahoot_all_quizzes_${category}`);
    if (savedData) {
        const allQuizzesData = JSON.parse(savedData);
        const quizCount = Object.keys(allQuizzesData).length;
        const categoryName = category === 'classe-teen' ? 'Classe Teen' : 'Culto Jovem';
        document.getElementById('saved-data-message').textContent = `${quizCount} quiz(zes) salvos (${categoryName})!`;
        document.getElementById('load-saved-btn').style.display = 'inline-block';
        document.getElementById('clear-saved-btn').style.display = 'inline-block';
    } else {
        document.getElementById('saved-data-message').textContent = 'Nenhum dado salvo ainda.';
        document.getElementById('load-saved-btn').style.display = 'none';
        document.getElementById('clear-saved-btn').style.display = 'none';
    }
}

// Carregar dados salvos
function loadSavedData() {
    loadAllQuizzesFromStorage();
    alert('Dados carregados com sucesso!');
}

// Limpar dados salvos
function clearSavedData() {
    if (confirm('Tem certeza que deseja limpar TODOS os dados salvos?')) {
        localStorage.removeItem('kahoot_all_quizzes');
        localStorage.removeItem('kahoot_quiz_count');
        localStorage.removeItem('kahoot_quiz1_data'); // Limpar legado
        document.getElementById('saved-data-message').textContent = 'Nenhum dado salvo ainda.';
        document.getElementById('load-saved-btn').style.display = 'none';
        document.getElementById('clear-saved-btn').style.display = 'none';
        alert('Dados salvos removidos!');
        location.reload();
    }
}

// Salvar Quiz 1 no localStorage (manter para compatibilidade)
function saveQuiz1ToStorage() {
    saveAllQuizzesToStorage();
}

// Carregar Quiz 1 do localStorage automaticamente (removido - agora usa loadAllQuizzes)
function loadQuiz1FromStorage() {
    // Função mantida vazia para compatibilidade
}

// Adicionar auto-save listeners para um quiz específico
function addQuizAutoSaveListeners(quizId) {
    const playersDiv = document.getElementById(`players-quiz-${quizId}`);
    if (playersDiv) {
        playersDiv.addEventListener('input', function() {
            saveAllQuizzesToStorage();
        });
    }
}

// Carregar jogadores em um quiz específico
function loadPlayersToQuiz(quizId, data) {
    const playersDiv = document.getElementById(`players-quiz-${quizId}`);
    if (!playersDiv) return;
    
    playersDiv.innerHTML = '';
    
    data.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-entry';
        playerDiv.innerHTML = `
            <input type="text" class="name-input" placeholder="Nome do Participante" value="${player.name}">
            <input type="number" class="score-input" placeholder="Pontuação" min="0" value="${player.score || ''}">
            <button class="remove-player" onclick="removePlayer(this)">🗑️</button>
        `;
        playersDiv.appendChild(playerDiv);
    });
    
    // Adicionar listeners para auto-salvar
    addQuizAutoSaveListeners(quizId);
}

// Adicionar listeners para auto-salvar Quiz 1 (manter para compatibilidade)
function addAutoSaveListeners() {
    addQuizAutoSaveListeners(1);
}

// Trigger import para um quiz específico
function triggerQuizImport(quizId) {
    document.getElementById(`quiz-file-${quizId}`).click();
}

// Setup do listener de importação para um quiz específico
function setupQuizImportListener(quizId) {
    const fileInput = document.getElementById(`quiz-file-${quizId}`);
    fileInput.addEventListener('change', function(event) {
        handleQuizFileUpload(event, quizId);
    });
}

function handleFileUpload(event) {
    handleQuizFileUpload(event, 1);
}

function handleQuizFileUpload(event, quizId) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let jsonData;
            
            if (fileName.endsWith('.pdf')) {
                // Processar PDF
                processPDF(e.target.result, quizId);
                return;
            } else if (fileName.endsWith('.csv')) {
                // Processar CSV
                const text = e.target.result;
                const lines = text.split('\n');
                jsonData = lines.map(line => {
                    // Parser CSV simples que lida com vírgulas e aspas
                    const values = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let char of line) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            values.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim());
                    return values;
                }).filter(row => row.some(cell => cell !== ''));
            } else {
                // Processar Excel
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { 
                    type: 'array',
                    cellDates: true,
                    cellFormula: false,
                    cellHTML: false
                });
                
                // Pegar a SEGUNDA planilha (índice 1)
                const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const allRows = XLSX.utils.sheet_to_json(sheet, { 
                    header: 1, 
                    raw: false,
                    defval: ''
                });
                
                // Pular as duas primeiras linhas (título e subtítulo) e começar da terceira
                jsonData = allRows.slice(2);
                
                // Adicionar cabeçalho da terceira linha como primeira linha
                if (jsonData.length > 0) {
                    // A terceira linha do Excel agora é a primeira linha do jsonData
                    // Não precisamos fazer nada extra, já está correto
                }
            }
            
            // Processar os dados
            processKahootData(jsonData, quizId);
        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            alert('Erro ao processar o arquivo. Certifique-se de que o arquivo é um CSV, Excel ou PDF válido do Kahoot.');
        }
    };
    
    reader.onerror = function() {
        alert('Erro ao ler o arquivo. Por favor, tente novamente.');
    };
    
    if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

async function processPDF(arrayBuffer, quizId) {
    try {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Extrair texto de todas as páginas
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        // Processar o texto extraído
        parsePDFText(fullText, quizId);
    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        alert('Erro ao processar o PDF. Certifique-se de que é um relatório válido do Kahoot.');
    }
}

function parsePDFText(text, quizId) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const data = [];
    
    // Tentar identificar padrões do Kahoot
    // Formato comum: Nome ... Pontuação ou Nome Pontuação
    const nameScorePattern = /^(.+?)\s+(\d+)$/;
    
    let headers = [];
    let foundData = false;
    
    for (let line of lines) {
        line = line.trim();
        
        // Pular linhas de cabeçalho/título
        if (line.toLowerCase().includes('kahoot') || 
            line.toLowerCase().includes('final scores') ||
            line.toLowerCase().includes('results') ||
            line.toLowerCase().includes('rank')) {
            continue;
        }
        
        // Tentar extrair nome e pontuação
        const match = line.match(nameScorePattern);
        if (match) {
            const name = match[1].replace(/^\d+\s*/, '').trim(); // Remove ranking number
            const score = match[2];
            
            if (!foundData) {
                headers = ['Nome', 'Pontuação'];
                data.push(headers);
                foundData = true;
            }
            
            data.push([name, score]);
        } else {
            // Tentar extrair dados separados por espaços múltiplos ou tabs
            const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());
            if (parts.length >= 2) {
                const lastPart = parts[parts.length - 1];
                if (/^\d+$/.test(lastPart)) {
                    const name = parts.slice(0, -1).join(' ').replace(/^\d+\s*/, '').trim();
                    const score = lastPart;
                    
                    if (!foundData) {
                        headers = ['Nome', 'Pontuação'];
                        data.push(headers);
                        foundData = true;
                    }
                    
                    if (name) {
                        data.push([name, score]);
                    }
                }
            }
        }
    }
    
    if (data.length < 2) {
        alert('Não foi possível extrair dados do PDF. O formato pode não ser compatível. Tente usar CSV ou Excel.');
        return;
    }
    
    processKahootData(data, quizId);
}

function processKahootData(data, quizId) {
    if (data.length < 2) {
        alert('Arquivo não contém dados suficientes.');
        return;
    }
    
    // Encontrar colunas relevantes (nome e pontuação)
    const headers = data[0].map(h => String(h).toLowerCase());
    
    let nameIndex = -1;
    let scoreIndex = -1;
    
    // Procurar coluna de nome
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (header.includes('name') || header.includes('nome') || header.includes('player') || header.includes('participante') || header.includes('nickname')) {
            nameIndex = i;
            break;
        }
    }
    
    // Procurar coluna de pontuação
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (header.includes('score') || header.includes('pontu') || header.includes('total') || header.includes('points') || header.includes('point')) {
            scoreIndex = i;
            break;
        }
    }
    
    if (nameIndex === -1 || scoreIndex === -1) {
        alert('Não foi possível encontrar as colunas de nome e pontuação. Certifique-se de que o arquivo contém colunas com "Player" e "Total Score" (ou variações como "Nome" e "Pontuação").');
        return;
    }
    
    // Limpar participantes existentes do quiz
    const playersDiv = document.getElementById(`players-quiz-${quizId}`);
    playersDiv.innerHTML = '';
    
    // Adicionar os participantes importados
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = row[nameIndex];
        const score = row[scoreIndex];
        
        if (name && score !== undefined && score !== null) {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-entry';
            playerDiv.innerHTML = `
                <input type="text" class="name-input" placeholder="Nome do Participante" value="${name}">
                <input type="number" class="score-input" placeholder="Pontuação" min="0" value="${score}">
                <button class="remove-player" onclick="removePlayer(this)">🗑️</button>
            `;
            playersDiv.appendChild(playerDiv);
        }
    }
    
    alert(`${data.length - 1} participantes importados com sucesso no Quiz ${quizId}!`);
    
    // Salvar todos os quizzes
    saveAllQuizzesToStorage();
    addQuizAutoSaveListeners(quizId);
    
    // Limpar o input de arquivo
    if (quizId === 1) {
        document.getElementById('csv-file').value = '';
    } else {
        document.getElementById(`quiz-file-${quizId}`).value = '';
    }
}

function addQuiz() {
    quizCount++;
    const quizzesDiv = document.getElementById('quizzes');
    
    const newQuizDiv = document.createElement('div');
    newQuizDiv.className = 'quiz-container';
    newQuizDiv.id = `quiz-${quizCount}`;
    
    newQuizDiv.innerHTML = `
        <div class="quiz-header">
            <h3>
                <span class="quiz-title-display">Quiz ${quizCount}</span>
                <input type="text" class="quiz-title-input" style="display: none;" value="Quiz ${quizCount}">
                <button class="edit-title-btn" onclick="toggleEditTitle(${quizCount})">✏️ Editar</button>
            </h3>
            <button class="remove-quiz" onclick="removeQuiz(${quizCount})">Remover Quiz</button>
        </div>
        <button class="import-quiz-btn" onclick="triggerQuizImport(${quizCount})">📁 Importar Dados do Kahoot</button>
        <input type="file" id="quiz-file-${quizCount}" class="quiz-file-input" accept=".csv,.xlsx,.xls,.pdf">
        <div id="players-quiz-${quizCount}">
            <div class="player-entry">
                <input type="text" class="name-input" placeholder="Nome do Participante">
                <input type="number" class="score-input" placeholder="Pontuação" min="0">
                <button class="remove-player" onclick="removePlayer(this)">🗑️</button>
            </div>
        </div>
        <button class="add-player" onclick="addPlayer(${quizCount})">+ Adicionar Participante</button>
    `;
    
    quizzesDiv.appendChild(newQuizDiv);
    
    // Setup listener de importação para o novo quiz
    setupQuizImportListener(quizCount);
    
    // Adicionar auto-save listeners
    addQuizAutoSaveListeners(quizCount);
    
    // Habilitar o botão de remover no primeiro quiz quando houver mais de um quiz
    if (quizCount === 2) {
        document.querySelector(`#quiz-1 .remove-quiz`).removeAttribute('disabled');
    }
}

function removeQuiz(quizId) {
    const quizToRemove = document.getElementById(`quiz-${quizId}`);
    quizToRemove.remove();
    
    // Salvar alteração
    saveAllQuizzesToStorage();
    
    // Se só restar um quiz, desabilitar seu botão de remover
    const remainingQuizzes = document.querySelectorAll('.quiz-container');
    if (remainingQuizzes.length === 1) {
        const firstQuizRemoveBtn = remainingQuizzes[0].querySelector('.remove-quiz');
        firstQuizRemoveBtn.setAttribute('disabled', 'true');
    }
}

function addPlayer(quizId) {
    const playersDiv = document.getElementById(`players-quiz-${quizId}`);
    
    const newPlayerDiv = document.createElement('div');
    newPlayerDiv.className = 'player-entry';
    
    newPlayerDiv.innerHTML = `
        <input type="text" class="name-input" placeholder="Nome do Participante">
        <input type="number" class="score-input" placeholder="Pontuação" min="0">
        <button class="remove-player" onclick="removePlayer(this)">🗑️</button>
    `;
    
    playersDiv.appendChild(newPlayerDiv);
    
    // Salvar automaticamente
    saveAllQuizzesToStorage();
}

function removePlayer(button) {
    const playerEntry = button.parentElement;
    const playersDiv = playerEntry.parentElement;
    
    // Só permite remover se houver mais de um participante no quiz
    const playerEntries = playersDiv.querySelectorAll('.player-entry');
    if (playerEntries.length > 1) {
        playerEntry.remove();
    } else {
        alert('Cada quiz precisa ter pelo menos um participante.');
    }
    
    // Salvar automaticamente
    saveAllQuizzesToStorage();
}

function calculateRanking() {
    const calculateBtn = document.getElementById('calculate-btn');
    const startTime = Date.now();
    
    // Desabilitar botão e adicionar spinner
    calculateBtn.disabled = true;
    calculateBtn.classList.add('calculating');
    calculateBtn.innerHTML = 'Calculando... <span class="spinner"></span>';
    
    // Usar setTimeout para permitir que o spinner apareça antes do processamento
    setTimeout(function() {
        try {
            const playerScores = {};
            
            // Coletar todas as pontuações de todos os quizzes
            const quizzes = document.querySelectorAll('.quiz-container');
            
            quizzes.forEach(quiz => {
                const playerEntries = quiz.querySelectorAll('.player-entry');
                
                playerEntries.forEach(entry => {
                    const nameInput = entry.querySelector('.name-input');
                    const scoreInput = entry.querySelector('.score-input');
                    
                    const name = nameInput.value.trim();
                    const score = parseInt(scoreInput.value) || 0;
                    
                    if (name) {
                        if (!playerScores[name]) {
                            playerScores[name] = 0;
                        }
                        playerScores[name] += score;
                    }
                });
            });
            
            // Converter para array e ordenar
            const playersArray = Object.keys(playerScores).map(name => {
                return { name, totalScore: playerScores[name] };
            });
            
            playersArray.sort((a, b) => b.totalScore - a.totalScore);
            
            // Mostrar o ranking
            const rankingBody = document.getElementById('ranking-body');
            rankingBody.innerHTML = '';
            
            playersArray.forEach((player, index) => {
                const row = document.createElement('tr');
                
                // Adicionar classe para medalha nas três primeiras posições
                let positionClass = '';
                if (index === 0) positionClass = 'medal-1';
                else if (index === 1) positionClass = 'medal-2';
                else if (index === 2) positionClass = 'medal-3';
                
                row.innerHTML = `
                    <td class="position ${positionClass}">${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.totalScore}</td>
                `;
                
                rankingBody.appendChild(row);
            });
            
            // Mostrar a seção de resultados
            document.getElementById('ranking-results').classList.remove('hidden');
            
            // Calcular tempo decorrido
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 1000 - elapsedTime);
            
            // Garantir que o spinner fique visível por pelo menos 1 segundo
            setTimeout(function() {
                // Reabilitar botão e remover spinner
                calculateBtn.disabled = false;
                calculateBtn.classList.remove('calculating');
                calculateBtn.innerHTML = 'Calcular Ranking';
                
                // Scroll suave até os resultados
                document.getElementById('ranking-results').scrollIntoView({ behavior: 'smooth' });
            }, remainingTime);
            
        } catch (error) {
            console.error('Erro ao calcular ranking:', error);
            alert('Erro ao calcular o ranking. Por favor, verifique os dados e tente novamente.');
            
            // Reabilitar botão imediatamente em caso de erro
            calculateBtn.disabled = false;
            calculateBtn.classList.remove('calculating');
            calculateBtn.innerHTML = 'Calcular Ranking';
        }
    }, 100);
}

function exportToCSV() {
    const table = document.getElementById('ranking-table');
    let csv = [];
    
    // Adicionar cabeçalho
    const header = [];
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach(cell => {
        header.push(cell.textContent);
    });
    csv.push(header.join(','));
    
    // Adicionar linhas
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
            rowData.push(cell.textContent);
        });
        csv.push(rowData.join(','));
    });
    
    // Criar blob e link para download
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ranking_kahoot.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToImage() {
    const rankingContainer = document.getElementById('ranking-container');
    const rankingType = document.getElementById('ranking-type').value;
    
    // Descobrir o número e título do último quiz
    const quizzes = document.querySelectorAll('.quiz-container');
    const lastQuiz = quizzes[quizzes.length - 1];
    const lastQuizTitle = lastQuiz ? lastQuiz.querySelector('.quiz-title-display').textContent : 'Quiz 1';
    
    // Definir título baseado no tipo de ranking selecionado
    let imageTitle;
    let fileNameSuffix;
    
    if (rankingType === 'culto-jovem') {
        imageTitle = 'Ranking Final - Kahoot Culto Jovem';
        fileNameSuffix = 'culto_jovem';
    } else {
        // Classe Teen (padrão)
        imageTitle = `Ranking Final - Kahoot (${lastQuizTitle})`;
        const safeFileName = lastQuizTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
        fileNameSuffix = safeFileName;
    }
    
    // Adicionar título temporário para a imagem
    const tempTitle = document.createElement('h2');
    tempTitle.textContent = imageTitle;
    tempTitle.style.color = '#46178f';
    tempTitle.style.textAlign = 'center';
    tempTitle.style.marginBottom = '20px';
    rankingContainer.insertBefore(tempTitle, rankingContainer.firstChild);
    
    // Capturar o container como imagem
    html2canvas(rankingContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true
    }).then(function(canvas) {
        // Converter para blob e baixar
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            link.download = `ranking_kahoot_${fileNameSuffix}_${date}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        });
        
        // Remover título temporário
        rankingContainer.removeChild(tempTitle);
    }).catch(function(error) {
        console.error('Erro ao gerar imagem:', error);
        alert('Erro ao gerar imagem. Por favor, tente novamente.');
        // Remover título temporário em caso de erro
        if (rankingContainer.contains(tempTitle)) {
            rankingContainer.removeChild(tempTitle);
        }
    });
}

function resetAll() {
    // Remover todos os quizzes exceto o primeiro
    const quizzes = document.querySelectorAll('.quiz-container');
    quizzes.forEach((quiz, index) => {
        if (index > 0) {
            quiz.remove();
        }
    });
    
    // Resetar o primeiro quiz
    const firstQuiz = document.getElementById('quiz-1');
    const playersDiv = document.getElementById('players-quiz-1');
    playersDiv.innerHTML = `
        <div class="player-entry">
            <input type="text" class="name-input" placeholder="Nome do Participante">
            <input type="number" class="score-input" placeholder="Pontuação" min="0">
            <button class="remove-player" onclick="removePlayer(this)">🗑️</button>
        </div>
    `;
    
    // Limpar dados salvos do Quiz 1
    localStorage.removeItem('kahoot_quiz1_data');
    localStorage.removeItem('kahoot_all_quizzes');
    localStorage.removeItem('kahoot_quiz_count');
    checkSavedData();
    
    // Re-adicionar listeners de auto-save
    addQuizAutoSaveListeners(1);
    
    // Resetar contagem de quizzes
    quizCount = 1;
    
    // Desabilitar botão de remover do primeiro quiz
    const removeBtn = firstQuiz.querySelector('.remove-quiz');
    removeBtn.setAttribute('disabled', 'true');
    
    // Esconder resultados
    document.getElementById('ranking-results').classList.add('hidden');
}