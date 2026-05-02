// ScriptWriter Application Logic

// Data Store
const store = {
    scenes: [],
    characters: [],
    relationships: [],
    timeline: [],
    currentSceneId: null,
    currentCharacterId: null
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initNavigation();
    initSceneEditor();
    initCharacterEditor();
    initRelationships();
    initSearch();
    initExportImport();
    renderAll();
});

// Navigation
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
            
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchView(viewName) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));
    
    const targetView = document.getElementById(`${viewName}View`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Refresh specific views
    if (viewName === 'relationships') {
        renderRelationshipGraph();
    } else if (viewName === 'timeline') {
        renderTimeline();
    }
}

// Scene Editor
function initSceneEditor() {
    // Format buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            applyFormat(format);
        });
    });
    
    // Text color
    document.getElementById('textColorPicker').addEventListener('input', (e) => {
        document.execCommand('foreColor', false, e.target.value);
    });
    
    // Highlight color
    document.getElementById('highlightColor').addEventListener('change', (e) => {
        if (e.target.value) {
            document.execCommand('hiliteColor', false, e.target.value);
        }
    });
    
    // Add scene button
    document.getElementById('addSceneBtn').addEventListener('click', createNewScene);
    
    // Save scene button
    document.getElementById('saveSceneBtn').addEventListener('click', saveCurrentScene);
    
    // Delete scene button
    document.getElementById('deleteSceneBtn').addEventListener('click', deleteCurrentScene);
    
    // Character insert
    document.getElementById('characterInsert').addEventListener('change', (e) => {
        if (e.target.value) {
            insertCharacterTag(e.target.value);
            e.target.value = '';
        }
    });
}

function applyFormat(format) {
    document.execCommand(format, false, null);
}

function createNewScene() {
    const scene = {
        id: Date.now(),
        title: '',
        location: '',
        time: '',
        content: '',
        characters: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    store.scenes.push(scene);
    selectScene(scene.id);
    renderSceneList();
    clearSceneEditor();
}

function selectScene(sceneId) {
    store.currentSceneId = sceneId;
    renderSceneList();
    loadSceneIntoEditor(sceneId);
}

function loadSceneIntoEditor(sceneId) {
    const scene = store.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    document.getElementById('sceneTitle').value = scene.title || '';
    document.getElementById('sceneLocation').value = scene.location || '';
    document.getElementById('sceneTime').value = scene.time || '';
    document.getElementById('sceneContent').innerHTML = scene.content || '';
    
    renderSceneCharacters(scene);
    updateCharacterInsertDropdown();
}

function renderSceneCharacters(scene) {
    const container = document.getElementById('sceneCharacterTags');
    container.innerHTML = '';
    
    scene.characters.forEach(charId => {
        const character = store.characters.find(c => c.id === charId);
        if (character) {
            const tag = document.createElement('div');
            tag.className = 'character-tag';
            tag.style.backgroundColor = character.color || '#3498db';
            tag.innerHTML = `
                ${character.name}
                <span class="remove-tag" onclick="removeCharacterFromScene(${character.id})">×</span>
            `;
            container.appendChild(tag);
        }
    });
}

function updateCharacterInsertDropdown() {
    const select = document.getElementById('characterInsert');
    select.innerHTML = '<option value="">+ Персонаж</option>';
    
    store.characters.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id;
        option.textContent = char.name;
        select.appendChild(option);
    });
}

function insertCharacterTag(characterId) {
    const scene = store.scenes.find(s => s.id === store.currentSceneId);
    if (!scene) return;
    
    if (!scene.characters.includes(characterId)) {
        scene.characters.push(characterId);
        scene.updatedAt = new Date().toISOString();
        renderSceneCharacters(scene);
        saveToStorage();
    }
}

function removeCharacterFromScene(characterId) {
    const scene = store.scenes.find(s => s.id === store.currentSceneId);
    if (!scene) return;
    
    scene.characters = scene.characters.filter(id => id !== characterId);
    scene.updatedAt = new Date().toISOString();
    renderSceneCharacters(scene);
    saveToStorage();
}

function saveCurrentScene() {
    const scene = store.scenes.find(s => s.id === store.currentSceneId);
    if (!scene) return;
    
    scene.title = document.getElementById('sceneTitle').value;
    scene.location = document.getElementById('sceneLocation').value;
    scene.time = document.getElementById('sceneTime').value;
    scene.content = document.getElementById('sceneContent').innerHTML;
    scene.updatedAt = new Date().toISOString();
    
    saveToStorage();
    renderSceneList();
    showNotification('Сцена сохранена!', 'success');
}

function deleteCurrentScene() {
    if (!confirm('Вы уверены, что хотите удалить эту сцену?')) return;
    
    store.scenes = store.scenes.filter(s => s.id !== store.currentSceneId);
    store.currentSceneId = null;
    clearSceneEditor();
    saveToStorage();
    renderSceneList();
    showNotification('Сцена удалена', 'info');
}

function clearSceneEditor() {
    document.getElementById('sceneTitle').value = '';
    document.getElementById('sceneLocation').value = '';
    document.getElementById('sceneTime').value = '';
    document.getElementById('sceneContent').innerHTML = '';
    document.getElementById('sceneCharacterTags').innerHTML = '';
}

function renderSceneList() {
    const container = document.getElementById('sceneList');
    container.innerHTML = '';
    
    if (store.scenes.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">Нет сцен. Создайте первую!</p>';
        return;
    }
    
    store.scenes.forEach(scene => {
        const item = document.createElement('div');
        item.className = `scene-item ${scene.id === store.currentSceneId ? 'active' : ''}`;
        item.onclick = () => selectScene(scene.id);
        
        const charCount = scene.characters.length;
        const contentPreview = stripHtml(scene.content).substring(0, 50) + '...';
        
        item.innerHTML = `
            <h4>${scene.title || 'Без названия'}</h4>
            <p>📍 ${scene.location || 'Место не указано'}</p>
            <p>⏱️ ${charCount} персонаж(ей)</p>
            <p style="font-size: 0.8rem; margin-top: 5px;">${contentPreview}</p>
        `;
        
        container.appendChild(item);
    });
}

// Character Editor
function initCharacterEditor() {
    document.getElementById('addCharacterBtn').addEventListener('click', createNewCharacter);
    document.getElementById('saveCharacterBtn').addEventListener('click', saveCurrentCharacter);
    document.getElementById('deleteCharacterBtn').addEventListener('click', deleteCurrentCharacter);
}

function createNewCharacter() {
    const character = {
        id: Date.now(),
        name: '',
        role: '',
        age: '',
        description: '',
        personality: '',
        background: '',
        motivation: '',
        color: '#3498db',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    store.characters.push(character);
    selectCharacter(character.id);
    renderCharacterList();
    clearCharacterEditor();
}

function selectCharacter(characterId) {
    store.currentCharacterId = characterId;
    renderCharacterList();
    loadCharacterIntoEditor(characterId);
}

function loadCharacterIntoEditor(characterId) {
    const character = store.characters.find(c => c.id === characterId);
    if (!character) return;
    
    document.getElementById('charName').value = character.name || '';
    document.getElementById('charRole').value = character.role || '';
    document.getElementById('charAge').value = character.age || '';
    document.getElementById('charDescription').value = character.description || '';
    document.getElementById('charPersonality').value = character.personality || '';
    document.getElementById('charBackground').value = character.background || '';
    document.getElementById('charMotivation').value = character.motivation || '';
    document.getElementById('charColor').value = character.color || '#3498db';
}

function saveCurrentCharacter() {
    const character = store.characters.find(c => c.id === store.currentCharacterId);
    if (!character) return;
    
    character.name = document.getElementById('charName').value;
    character.role = document.getElementById('charRole').value;
    character.age = document.getElementById('charAge').value;
    character.description = document.getElementById('charDescription').value;
    character.personality = document.getElementById('charPersonality').value;
    character.background = document.getElementById('charBackground').value;
    character.motivation = document.getElementById('charMotivation').value;
    character.color = document.getElementById('charColor').value;
    character.updatedAt = new Date().toISOString();
    
    saveToStorage();
    renderCharacterList();
    updateCharacterInsertDropdown();
    showNotification('Персонаж сохранён!', 'success');
}

function deleteCurrentCharacter() {
    if (!confirm('Вы уверены, что хотите удалить этого персонажа?')) return;
    
    // Remove from scenes
    store.scenes.forEach(scene => {
        scene.characters = scene.characters.filter(id => id !== store.currentCharacterId);
    });
    
    // Remove relationships
    store.relationships = store.relationships.filter(
        r => r.char1 !== store.currentCharacterId && r.char2 !== store.currentCharacterId
    );
    
    store.characters = store.characters.filter(c => c.id !== store.currentCharacterId);
    store.currentCharacterId = null;
    clearCharacterEditor();
    saveToStorage();
    renderCharacterList();
    renderRelationships();
    updateCharacterInsertDropdown();
    showNotification('Персонаж удалён', 'info');
}

function clearCharacterEditor() {
    document.getElementById('charName').value = '';
    document.getElementById('charRole').value = '';
    document.getElementById('charAge').value = '';
    document.getElementById('charDescription').value = '';
    document.getElementById('charPersonality').value = '';
    document.getElementById('charBackground').value = '';
    document.getElementById('charMotivation').value = '';
    document.getElementById('charColor').value = '#3498db';
}

function renderCharacterList() {
    const container = document.getElementById('characterList');
    container.innerHTML = '';
    
    if (store.characters.length === 0) {
        container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">Нет персонажей. Создайте первого!</p>';
        return;
    }
    
    store.characters.forEach(character => {
        const item = document.createElement('div');
        item.className = `character-item ${character.id === store.currentCharacterId ? 'active' : ''}`;
        item.onclick = () => selectCharacter(character.id);
        item.style.borderLeftColor = character.color;
        
        item.innerHTML = `
            <h4>${character.name || 'Без имени'}</h4>
            <p>${character.role || 'Роль не указана'}</p>
            <p style="font-size: 0.8rem;">${character.age ? `Возраст: ${character.age}` : ''}</p>
        `;
        
        container.appendChild(item);
    });
}

// Relationships
function initRelationships() {
    document.getElementById('addRelationshipBtn').addEventListener('click', addRelationship);
}

function addRelationship() {
    const char1 = document.getElementById('relChar1').value;
    const relType = document.getElementById('relType').value;
    const char2 = document.getElementById('relChar2').value;
    const description = document.getElementById('relDescription').value;
    
    if (!char1 || !char2 || !relType) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    if (char1 === char2) {
        alert('Выберите разных персонажей');
        return;
    }
    
    const relationship = {
        id: Date.now(),
        char1: parseInt(char1),
        char2: parseInt(char2),
        type: relType,
        description: description,
        createdAt: new Date().toISOString()
    };
    
    store.relationships.push(relationship);
    saveToStorage();
    renderRelationships();
    renderRelationshipGraph();
    
    // Clear form
    document.getElementById('relChar1').value = '';
    document.getElementById('relType').value = '';
    document.getElementById('relChar2').value = '';
    document.getElementById('relDescription').value = '';
    
    showNotification('Связь добавлена!', 'success');
}

function renderRelationships() {
    // Update dropdowns
    const char1Select = document.getElementById('relChar1');
    const char2Select = document.getElementById('relChar2');
    
    char1Select.innerHTML = '<option value="">Выберите первого персонажа</option>';
    char2Select.innerHTML = '<option value="">Выберите второго персонажа</option>';
    
    store.characters.forEach(char => {
        const option1 = document.createElement('option');
        option1.value = char.id;
        option1.textContent = char.name;
        char1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = char.id;
        option2.textContent = char.name;
        char2Select.appendChild(option2);
    });
    
    // Render list
    const container = document.getElementById('relationshipList');
    container.innerHTML = '<h3>Список связей</h3>';
    
    if (store.relationships.length === 0) {
        container.innerHTML += '<p style="color: var(--secondary-color);">Нет связей</p>';
        return;
    }
    
    const typeColors = {
        family: '#e74c3c',
        friend: '#2ecc71',
        enemy: '#c0392b',
        love: '#e91e63',
        work: '#3498db',
        mentor: '#9b59b6',
        other: '#95a5a6'
    };
    
    store.relationships.forEach(rel => {
        const char1 = store.characters.find(c => c.id === rel.char1);
        const char2 = store.characters.find(c => c.id === rel.char2);
        
        if (!char1 || !char2) return;
        
        const item = document.createElement('div');
        item.className = 'relationship-item';
        
        const typeLabel = {
            family: 'Семья',
            friend: 'Друзья',
            enemy: 'Враги',
            love: 'Любовь',
            work: 'Коллеги',
            mentor: 'Наставник',
            other: 'Другое'
        }[rel.type] || rel.type;
        
        item.innerHTML = `
            <span style="color: ${char1.color}">●</span> ${char1.name}
            <span class="relationship-type" style="background-color: ${typeColors[rel.type] || '#95a5a6'}">${typeLabel}</span>
            <span style="color: ${char2.color}">●</span> ${char2.name}
            ${rel.description ? `<span style="margin-left: 10px; color: var(--secondary-color)">"${rel.description}"</span>` : ''}
            <button onclick="deleteRelationship(${rel.id})" style="margin-left: auto; background: none; border: none; cursor: pointer; color: var(--danger-color)">×</button>
        `;
        
        container.appendChild(item);
    });
}

function deleteRelationship(relId) {
    store.relationships = store.relationships.filter(r => r.id !== relId);
    saveToStorage();
    renderRelationships();
    renderRelationshipGraph();
}

function renderRelationshipGraph() {
    const svg = document.getElementById('graphSvg');
    svg.innerHTML = '';
    
    if (store.characters.length === 0) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="var(--secondary-color)">Добавьте персонажей для отображения графа</text>';
        return;
    }
    
    // Calculate positions
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(300, store.characters.length * 40);
    
    const positions = {};
    store.characters.forEach((char, index) => {
        const angle = (2 * Math.PI * index) / store.characters.length - Math.PI / 2;
        positions[char.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    });
    
    // Draw connections
    store.relationships.forEach(rel => {
        const pos1 = positions[rel.char1];
        const pos2 = positions[rel.char2];
        
        if (!pos1 || !pos2) return;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', pos1.x);
        line.setAttribute('y1', pos1.y);
        line.setAttribute('x2', pos2.x);
        line.setAttribute('y2', pos2.y);
        line.setAttribute('stroke', '#95a5a6');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
        
        // Add label
        const midX = (pos1.x + pos2.x) / 2;
        const midY = (pos1.y + pos2.y) / 2;
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#6c757d');
        text.setAttribute('font-size', '12');
        text.textContent = rel.type;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', midX - 30);
        rect.setAttribute('y', midY - 10);
        rect.setAttribute('width', 60);
        rect.setAttribute('height', 20);
        rect.setAttribute('fill', 'white');
        rect.setAttribute('stroke', '#ddd');
        svg.insertBefore(rect, text);
        svg.insertBefore(text, rect.nextSibling);
    });
    
    // Draw nodes
    store.characters.forEach(char => {
        const pos = positions[char.id];
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pos.x);
        circle.setAttribute('cy', pos.y);
        circle.setAttribute('r', '25');
        circle.setAttribute('fill', char.color);
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '3');
        svg.appendChild(circle);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', pos.x);
        text.setAttribute('y', pos.y + 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.textContent = char.name.substring(0, 2).toUpperCase();
        svg.appendChild(text);
        
        const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameLabel.setAttribute('x', pos.x);
        nameLabel.setAttribute('y', pos.y + 45);
        nameLabel.setAttribute('text-anchor', 'middle');
        nameLabel.setAttribute('fill', 'var(--text-color)');
        nameLabel.setAttribute('font-size', '14');
        nameLabel.textContent = char.name;
        svg.appendChild(nameLabel);
    });
}

// Timeline
function renderTimeline() {
    const container = document.getElementById('timeline');
    container.innerHTML = '';
    
    // Build timeline from scenes
    const timelineItems = store.scenes
        .filter(s => s.title || s.content)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    if (timelineItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--secondary-color); padding: 40px;">Добавьте сцены для отображения линии повествования</p>';
        return;
    }
    
    timelineItems.forEach((scene, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        const charNames = scene.characters
            .map(id => {
                const char = store.characters.find(c => c.id === id);
                return char ? char.name : '';
            })
            .filter(name => name)
            .join(', ');
        
        item.innerHTML = `
            <div class="timeline-content" style="border-left: 4px solid ${scene.characters.length > 0 ? (store.characters.find(c => c.id === scene.characters[0])?.color || 'var(--primary-color)') : 'var(--primary-color)'}">
                <h4>${scene.title || 'Сцена ' + (index + 1)}</h4>
                <p><strong>Место:</strong> ${scene.location || 'Не указано'}</p>
                <p><strong>Время:</strong> ${scene.time || 'Не указано'}</p>
                ${charNames ? `<p><strong>Персонажи:</strong> ${charNames}</p>` : ''}
                <p style="margin-top: 10px; font-size: 0.9rem;">${stripHtml(scene.content).substring(0, 150)}${scene.content.length > 150 ? '...' : ''}</p>
                <button onclick="selectSceneAndSwitch(${scene.id})" class="primary-btn" style="margin-top: 10px; padding: 5px 10px; font-size: 0.8rem;">Редактировать</button>
            </div>
        `;
        
        container.appendChild(item);
    });
}

function selectSceneAndSwitch(sceneId) {
    selectScene(sceneId);
    switchView('scenes');
    document.querySelector('[data-view="scenes"]').classList.add('active');
    document.querySelector('[data-view="scenes"]').siblings?.forEach(b => b.classList.remove('active'));
}

// Search
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(performSearch, 300));
}

function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const searchScenes = document.getElementById('searchScenes').checked;
    const searchCharacters = document.getElementById('searchCharacters').checked;
    const searchRelationships = document.getElementById('searchRelationships').checked;
    
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    if (!query) {
        resultsContainer.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">Введите текст для поиска</p>';
        return;
    }
    
    const results = [];
    
    // Search scenes
    if (searchScenes) {
        store.scenes.forEach(scene => {
            const titleMatch = scene.title.toLowerCase().includes(query);
            const contentMatch = stripHtml(scene.content).toLowerCase().includes(query);
            const locationMatch = scene.location.toLowerCase().includes(query);
            
            if (titleMatch || contentMatch || locationMatch) {
                results.push({
                    type: 'scene',
                    id: scene.id,
                    title: scene.title || 'Без названия',
                    preview: highlightText(stripHtml(scene.content), query),
                    match: titleMatch ? 'Название' : (locationMatch ? 'Место' : 'Содержание')
                });
            }
        });
    }
    
    // Search characters
    if (searchCharacters) {
        store.characters.forEach(character => {
            const nameMatch = character.name.toLowerCase().includes(query);
            const roleMatch = character.role.toLowerCase().includes(query);
            const descMatch = character.description.toLowerCase().includes(query);
            const personalityMatch = character.personality.toLowerCase().includes(query);
            
            if (nameMatch || roleMatch || descMatch || personalityMatch) {
                results.push({
                    type: 'character',
                    id: character.id,
                    title: character.name || 'Без имени',
                    preview: highlightText(character.description || character.personality || '', query),
                    match: nameMatch ? 'Имя' : (roleMatch ? 'Роль' : 'Описание')
                });
            }
        });
    }
    
    // Search relationships
    if (searchRelationships) {
        store.relationships.forEach(rel => {
            const descMatch = rel.description.toLowerCase().includes(query);
            
            if (descMatch) {
                const char1 = store.characters.find(c => c.id === rel.char1);
                const char2 = store.characters.find(c => c.id === rel.char2);
                
                results.push({
                    type: 'relationship',
                    id: rel.id,
                    title: `${char1?.name || '?'} ↔ ${char2?.name || '?'}`,
                    preview: highlightText(rel.description, query),
                    match: 'Описание связи'
                });
            }
        });
    }
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">Ничего не найдено</p>';
        return;
    }
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.style.cursor = 'pointer';
        item.onclick = () => {
            if (result.type === 'scene') {
                selectSceneAndSwitch(result.id);
            } else if (result.type === 'character') {
                selectCharacter(result.id);
                switchView('characters');
                document.querySelectorAll('.nav-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.view === 'characters');
                });
            }
        };
        
        const typeLabels = {
            scene: '📝 Сцена',
            character: '👥 Персонаж',
            relationship: '🔗 Связь'
        };
        
        item.innerHTML = `
            <span class="type-badge">${typeLabels[result.type]}</span>
            <h4>${highlightText(result.title, query)}</h4>
            <p style="font-size: 0.8rem; color: var(--secondary-color);">Найдено по: ${result.match}</p>
            <p style="margin-top: 10px;">${result.preview || '...'}</p>
        `;
        
        resultsContainer.appendChild(item);
    });
}

function highlightText(text, query) {
    if (!text) return '';
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export/Import
function initExportImport() {
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', importData);
}

function exportData() {
    const data = JSON.stringify(store, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `scriptwriter-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Данные экспортированы!', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                
                if (!confirm('Это заменит все текущие данные. Продолжить?')) return;
                
                Object.assign(store, imported);
                saveToStorage();
                renderAll();
                showNotification('Данные импортированы!', 'success');
            } catch (error) {
                alert('Ошибка при импорте файла');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Storage
function saveToStorage() {
    localStorage.setItem('scriptwriter-data', JSON.stringify(store));
}

function loadFromStorage() {
    const data = localStorage.getItem('scriptwriter-data');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            Object.assign(store, parsed);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
}

// Utilities
function renderAll() {
    renderSceneList();
    renderCharacterList();
    renderRelationships();
    updateCharacterInsertDropdown();
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
