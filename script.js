let quizCount = 1;

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

// Adicionar event listener para o upload de arquivo
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csv-file').addEventListener('change', handleFileUpload);
    document.getElementById('quiz-file-1').addEventListener('change', function(event) {
        handleQuizFileUpload(event, 1);
    });
    checkSavedData();
    loadAllQuizzesFromStorage();
    setupTitleEditListeners();
});

// Configurar listeners para edição de título
function setupTitleEditListeners() {
    const quizzes = document.querySelectorAll('.quiz-container');
    quizzes.forEach(quiz => {
        const quizId = quiz.id.replace('quiz-', '');
        const editBtn = quiz.querySelector('.edit-title-btn');
        const titleInput = quiz.querySelector('.quiz-title-input');
        
        if (editBtn) {
            editBtn.onclick = function(e) {
                e.preventDefault();
                toggleEditTitle(parseInt(quizId));
            };
        }
        
        if (titleInput) {
            titleInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    toggleEditTitle(parseInt(quizId));
                }
            });
        }
    });
}

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
    
    localStorage.setItem('kahoot_all_quizzes', JSON.stringify(allQuizzesData));
    localStorage.setItem('kahoot_quiz_titles', JSON.stringify(quizTitles));
    localStorage.setItem('kahoot_quiz_count', quizCount);
}

// Carregar todos os quizzes do localStorage
function loadAllQuizzesFromStorage() {
    const savedData = localStorage.getItem('kahoot_all_quizzes');
    const savedQuizCount = localStorage.getItem('kahoot_quiz_count');
    const savedTitles = localStorage.getItem('kahoot_quiz_titles');
    
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
        
        // Reconfigurar listeners após carregar
        setTimeout(() => {
            setupTitleEditListeners();
        }, 100);
        
        checkSavedData();
    }
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
                <button class="edit-title-btn" onclick="toggleEditTitle(${quizId})" title="Editar título">✏️ Editar</button>
            </h3>
            <button class="remove-quiz" onclick="removeQuiz(${quizId})">Remover Quiz</button>
        </div>
        <button class="import-quiz-btn" onclick="triggerQuizImport(${quizId})">📁 Importar Dados do Kahoot</button>
        <input type="file" id="quiz-file-${quizId}" class="quiz-file-input" accept=".csv,.xlsx,.xls,.pdf">
        <div id="players-quiz-${quizId}">
            <div class="player-entry">
                <input type="text" class="name-input" placeholder="Nome do Participante">
                <input type="number" class="score-input" placeholder="Pontuação" min="0">
                <button class="remove-player" onclick="removePlayer(this)" title="Excluir participante">✕</button>
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

// Verificar se há dados salvos
function checkSavedData() {
    const savedData = localStorage.getItem('kahoot_all_quizzes');
    if (savedData) {
        const allQuizzesData = JSON.parse(savedData);
        const quizCount = Object.keys(allQuizzesData).length;
        document.getElementById('saved-data-message').textContent = `${quizCount} quiz(zes) salvos no navegador!`;
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
            <button class="remove-player" onclick="removePlayer(this)" title="Excluir participante">✕</button>
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
                headers = ['Player', 'Total Score (points)'];
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
                        headers = ['Player', 'Total Score (points)'];
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
        if (header.includes('player') || header.includes('nome') || header.includes('player') || header.includes('participante') || header.includes('nickname')) {
            nameIndex = i;
            break;
        }
    }
    
    // Procurar coluna de pontuação
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (header.includes('score') || header.includes('pontu') || header.includes('total') || header.includes('points')) {
            scoreIndex = i;
            break;
        }
    }
    
    if (nameIndex === -1 || scoreIndex === -1) {
        alert('Não foi possível encontrar as colunas de nome e pontuação. Certifique-se de que o arquivo contém colunas com "Player" e "Total Score (points)" (ou "Name" e "Score").');
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
                <button class="remove-player" onclick="removePlayer(this)" title="Excluir participante">✕</button>
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
                <button class="edit-title-btn" title="Editar título">✏️ Editar</button>
            </h3>
            <button class="remove-quiz" onclick="removeQuiz(${quizCount})">Remover Quiz</button>
        </div>
        <button class="import-quiz-btn" onclick="triggerQuizImport(${quizCount})">📁 Importar Dados do Kahoot</button>
        <input type="file" id="quiz-file-${quizCount}" class="quiz-file-input" accept=".csv,.xlsx,.xls,.pdf">
        <div id="players-quiz-${quizCount}">
            <div class="player-entry">
                <input type="text" class="name-input" placeholder="Nome do Participante">
                <input type="number" class="score-input" placeholder="Pontuação" min="0">
                <button class="remove-player" onclick="removePlayer(this)" title="Excluir participante">✕</button>
            </div>
        </div>
        <button class="add-player" onclick="addPlayer(${quizCount})">+ Adicionar Participante</button>
    `;
    
    quizzesDiv.appendChild(newQuizDiv);
    
    // Setup listener de importação para o novo quiz
    setupQuizImportListener(quizCount);
    
    // Adicionar auto-save listeners
    addQuizAutoSaveListeners(quizCount);
    
    // Setup listener de edição de título
    const editBtn = newQuizDiv.querySelector('.edit-title-btn');
    const titleInput = newQuizDiv.querySelector('.quiz-title-input');
    
    editBtn.onclick = function(e) {
        e.preventDefault();
        toggleEditTitle(quizCount);
    };
    
    titleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            toggleEditTitle(quizCount);
        }
    });
    
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
        <button class="remove-player" onclick="removePlayer(this)">✕</button>
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
            <button class="remove-player" onclick="removePlayer(this)">✕</button>
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