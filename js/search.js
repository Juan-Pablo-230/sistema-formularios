const searchAliases = {
    'aislamiento': 'Aislamientos y casos clínicos',
    'aislamientos': 'Aislamientos y casos clínicos',
    'jornada': 'Jornada seguridad del pte 2025',
    'seguridad': 'Jornada seguridad del pte 2025',
    'hisopado': 'Hisopados',
    'hisopados': 'Hisopados',
    'higiene': 'Higiene hospitalaria',
    'hospitalaria': 'Higiene hospitalaria'
};

document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    // Ocultar el recuadro si no hay término de búsqueda
    if (searchTerm.length < 1) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    // Mostrar el recuadro cuando hay búsqueda
    resultsContainer.style.display = 'block';
    
    let normalizedSearchTerm = searchTerm;
    for (const [alias, officialName] of Object.entries(searchAliases)) {
        if (searchTerm.includes(alias)) {
            normalizedSearchTerm = officialName.toLowerCase();
            break;
        }
    }
    
    const classCards = document.querySelectorAll('.class-card');
    const matches = [];
    
    classCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        
        if (title.includes(normalizedSearchTerm) || 
            normalizedSearchTerm.includes(title) ||
            description.includes(normalizedSearchTerm) ||
            normalizedSearchTerm.includes(description)) {
            
            matches.push({
                title: card.querySelector('h3').textContent,
                description: card.querySelector('p').textContent,
                element: card
            });
        }
    });
    
    if (matches.length > 0) {
        matches.forEach(match => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            const link = document.createElement('a');
            link.href = '#';
            link.innerHTML = `<strong>${match.title}</strong><br><small>${match.description}</small>`;
            
            link.onclick = function(e) {
                e.preventDefault();
                
                // Hacer scroll suave hacia la tarjeta
                match.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Efecto de highlight
                const originalBackground = match.element.style.background;
                match.element.style.background = 'linear-gradient(135deg, #ffd166 0%, #ffa500 100%)';
                match.element.style.transition = 'background 0.5s ease';
                
                setTimeout(() => {
                    match.element.style.background = originalBackground;
                }, 2000);
            };
            
            resultItem.appendChild(link);
            resultsContainer.appendChild(resultItem);
        });
    } else {
        resultsContainer.innerHTML = '<div class="no-results">No se encontraron clases relacionadas con los términos de búsqueda.</div>';
    }
});

// Ocultar resultados cuando se hace click fuera
document.addEventListener('click', function(e) {
    const searchContainer = document.querySelector('.search-box');
    const resultsContainer = document.getElementById('searchResults');
    
    if (!searchContainer.contains(e.target)) {
        resultsContainer.style.display = 'none';
    }
});