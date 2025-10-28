let quizCount = 1;

// Adicionar event listener para o upload de arquivo
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('csv-file').addEventListener('change', handleFileUpload);
});

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let jsonData;
            
            if (fileName.endsWith('.pdf')) {
                // Processar PDF
                processPDF(e.target.result);
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
                
                // Pegar a primeira planilha
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                    header: 1, 
                    raw: false,
                    defval: ''
                });
            }
            
            // Processar os dados
            processKahootData(jsonData);
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

async function processPDF(arrayBuffer) {
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
        parsePDFText(fullText);
    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        alert('Erro ao processar o PDF. Certifique-se de que é um relatório válido do Kahoot.');
    }
}

function parsePDFText(text) {
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
    
    processKahootData(data);
}

function processKahootData(data) {
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
        if (header.includes('score') || header.includes('pontu') || header.includes('total') || header.includes('points')) {
            scoreIndex = i;
            break;
        }
    }
    
    if (nameIndex === -1 || scoreIndex === -1) {
        alert('Não foi possível encontrar as colunas de nome e pontuação. Certifique-se de que o arquivo contém colunas com "Nome" e "Pontuação" (ou "Name" e "Score").');
        return;
    }
    
    // Limpar participantes existentes do primeiro quiz
    const playersDiv = document.getElementById('players-quiz-1');
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
                <button class="remove-player" onclick="removePlayer(this)">✕</button>
            `;
            playersDiv.appendChild(playerDiv);
        }
    }
    
    alert(`${data.length - 1} participantes importados com sucesso!`);
    
    // Limpar o input de arquivo
    document.getElementById('csv-file').value = '';
}

function addQuiz() {
    quizCount++;
    const quizzesDiv = document.getElementById('quizzes');
    
    const newQuizDiv = document.createElement('div');
    newQuizDiv.className = 'quiz-container';
    newQuizDiv.id = `quiz-${quizCount}`;
    
    newQuizDiv.innerHTML = `
        <div class="quiz-header">
            <h3>Quiz ${quizCount}</h3>
            <button class="remove-quiz" onclick="removeQuiz(${quizCount})">Remover Quiz</button>
        </div>
        <div id="players-quiz-${quizCount}">
            <div class="player-entry">
                <input type="text" class="name-input" placeholder="Nome do Participante">
                <input type="number" class="score-input" placeholder="Pontuação" min="0">
                <button class="remove-player" onclick="removePlayer(this)">✕</button>
            </div>
        </div>
        <button class="add-player" onclick="addPlayer(${quizCount})">+ Adicionar Participante</button>
    `;
    
    quizzesDiv.appendChild(newQuizDiv);
    
    // Habilitar o botão de remover no primeiro quiz quando houver mais de um quiz
    if (quizCount === 2) {
        document.querySelector(`#quiz-1 .remove-quiz`).removeAttribute('disabled');
    }
}

function removeQuiz(quizId) {
    const quizToRemove = document.getElementById(`quiz-${quizId}`);
    quizToRemove.remove();
    
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
    
    // Resetar contagem de quizzes
    quizCount = 1;
    
    // Desabilitar botão de remover do primeiro quiz
    const removeBtn = firstQuiz.querySelector('.remove-quiz');
    removeBtn.setAttribute('disabled', 'true');
    
    // Esconder resultados
    document.getElementById('ranking-results').classList.add('hidden');
}