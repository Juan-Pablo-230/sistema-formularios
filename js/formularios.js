console.log('formularios.js cargado - Versión Optimizada');

// Función para obtener el usuario actual (segura)
function getCurrentUser() {
    return authSystem?.getCurrentUser?.() || null;
}

// Función para verificar si ya completó el formulario
async function usuarioYaCompletoFormulario() {
    try {
        const usuarioActual = getCurrentUser();
        const claseActual = document.getElementById('clase')?.value;
        
        if (!usuarioActual || !claseActual) return false;
        
        // Admins pueden ver siempre
        if (authSystem.isAdmin?.()) return false;
        
        const result = await authSystem.makeRequest(
            `/inscripciones/verificar/${usuarioActual._id}/${encodeURIComponent(claseActual)}`,
            null,
            'GET'
        );
        
        return result.data?.exists || false;
        
    } catch (error) {
        console.error('Error verificando formulario:', error);
        return false;
    }
}

// Función para guardar inscripción
async function guardarInscripcionEnMongoDB(formData) {
    try {
        const usuarioActual = getCurrentUser();
        const claseActual = document.getElementById('clase')?.value;
        
        const inscripcionData = {
            usuarioId: usuarioActual._id,
            clase: claseActual,
            turno: formData.get('turno'),
            fecha: new Date().toISOString()
        };
        
        await authSystem.makeRequest('/inscripciones', inscripcionData);
        return true;
        
    } catch (error) {
        console.error('Error guardando inscripción:', error);
        throw error;
    }
}

// Función para autocompletar datos
function autocompletarDesdeUsuario() {
    if (authSystem.isLoggedIn?.()) {
        const user = getCurrentUser();
        
        ['apellidoNombre', 'legajo', 'email'].forEach(field => {
            const input = document.getElementById(field);
            if (input && user[field]) {
                input.value = user[field];
            }
        });
        
        const turnoSelect = document.getElementById('turno');
        if (turnoSelect && user.turno) {
            turnoSelect.value = user.turno;
        }
    }
}

// Función principal de validación
async function validarFormulario(event) {
    event.preventDefault();
    
    const form = document.getElementById('inscripcionForm');
    const submitBtn = form?.querySelector('.submit-btn');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Validando...';
    }
    
    try {
        // Verificar si ya completó
        const yaCompleto = await usuarioYaCompletoFormulario();
        if (yaCompleto) {
            alert('❌ Ya has completado este formulario.');
            mostrarMensajeYaCompletado();
            return false;
        }
        
        // Guardar en MongoDB
        const formData = new FormData(form);
        await guardarInscripcionEnMongoDB(formData);
        
        // Enviar a FormSubmit
        form.submit();
        
    } catch (error) {
        console.error('Error en el envío:', error);
        alert('Error: ' + error.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ingresar a la clase';
        }
    }
}

// Función para mostrar mensaje
function mostrarMensajeYaCompletado() {
    const container = document.querySelector('.container');
    const form = document.getElementById('inscripcionForm');
    
    if (form) form.style.display = 'none';
    
    const mensaje = document.createElement('div');
    mensaje.className = 'mensaje-ya-completado';
    mensaje.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div style="font-size: 4em; margin-bottom: 20px;">✅</div>
            <h2 style="color: #28a745;">Formulario Completado</h2>
            <p>Ya has completado este formulario.</p>
            <button onclick="window.location.href='../index.html'" class="back-btn">
                ← Volver al Menú
            </button>
        </div>
    `;
    
    container.appendChild(mensaje);
}

// Inicialización
async function inicializarAplicacion() {
    console.log('Inicializando aplicación...');
    
    // Verificar autenticación
    if (!authSystem.isLoggedIn?.()) {
        try {
            await authSystem.showLoginModal();
        } catch (error) {
            window.location.href = '../index.html';
            return;
        }
    }
    
    // Verificar si ya completó
    const yaCompleto = await usuarioYaCompletoFormulario();
    if (yaCompleto) {
        mostrarMensajeYaCompletado();
        return;
    }
    
    // Autocompletar y configurar
    autocompletarDesdeUsuario();
    
    const form = document.getElementById('inscripcionForm');
    if (form) {
        form.addEventListener('submit', validarFormulario);
    }
    
    // Agregar botón de logout
    const backBtnContainer = document.querySelector('.back-btn-container');
    if (backBtnContainer && authSystem.isLoggedIn?.()) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'back-btn logout-btn';
        logoutBtn.textContent = 'Cerrar Sesión';
        logoutBtn.onclick = () => {
            authSystem.logout();
            window.location.reload();
        };
        backBtnContainer.appendChild(logoutBtn);
    }
}

// Inicializar cuando esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarAplicacion);
} else {
    inicializarAplicacion();
}