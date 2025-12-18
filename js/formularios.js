console.log('formularios.js cargado - MongoDB Version');

// Variable global para verificar si authSystem está disponible
let authSystemReady = false;

// Función para esperar a que authSystem esté disponible
function waitForAuthSystem() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 50; // 5 segundos máximo
        let attempts = 0;
        
        const checkAuth = () => {
            attempts++;
            if (typeof authSystem !== 'undefined' && authSystem !== null) {
                console.log('✅ authSystem cargado después de', attempts, 'intentos');
                authSystemReady = true;
                resolve(authSystem);
            } else if (attempts >= maxAttempts) {
                reject(new Error('authSystem no se cargó después de ' + maxAttempts + ' intentos'));
            } else {
                setTimeout(checkAuth, 100); // Reintentar cada 100ms
            }
        };
        
        checkAuth();
    });
}

// Función segura para obtener el usuario actual
function getCurrentUserSafe() {
    if (authSystemReady && authSystem && typeof authSystem.getCurrentUser === 'function') {
        return authSystem.getCurrentUser();
    }
    return null;
}

// Función segura para verificar si está logueado
function isLoggedInSafe() {
    if (authSystemReady && authSystem && typeof authSystem.isLoggedIn === 'function') {
        return authSystem.isLoggedIn();
    }
    return false;
}

// Función segura para verificar si es admin
function isAdminSafe() {
    if (authSystemReady && authSystem && typeof authSystem.isAdmin === 'function') {
        return authSystem.isAdmin();
    }
    return false;
}

// Función segura para hacer requests
async function makeRequestSafe(endpoint, data = null, method = 'POST') {
    if (authSystemReady && authSystem && typeof authSystem.makeRequest === 'function') {
        return await authSystem.makeRequest(endpoint, data, method);
    }
    throw new Error('authSystem no disponible');
}

// Función para obtener la clase actual del formulario
function obtenerClaseActual() {
    const selectClase = document.getElementById('clase');
    if (selectClase && selectClase.value) {
        return selectClase.value;
    }
    return null;
}

// Función mejorada para verificar si el usuario ya completó el formulario
async function usuarioYaCompletoFormulario() {
    try {
        const usuarioActual = getCurrentUserSafe();
        const claseActual = obtenerClaseActual();
        
        console.log('🔍 Verificando inscripción MongoDB:', {
            usuario: usuarioActual,
            clase: claseActual
        });
        
        if (!usuarioActual) {
            console.log('❌ No hay usuario logueado');
            return false;
        }
        
        if (!claseActual) {
            console.log('❌ No se pudo determinar la clase actual');
            return false;
        }
        
        // Verificar si el usuario es admin (los admins pueden ver el formulario siempre)
        if (isAdminSafe()) {
            console.log('👑 Usuario admin, omitiendo verificación');
            return false;
        }
        
        // Verificar si tenemos _id del usuario
        if (!usuarioActual._id) {
            console.log('❌ Usuario no tiene _id, no se puede verificar');
            return false;
        }
        
        const result = await makeRequestSafe(
            `/inscripciones/verificar/${usuarioActual._id}/${encodeURIComponent(claseActual)}`,
            null,
            'GET'
        );
        
        console.log('📊 Resultado verificación MongoDB:', result);
        
        // Verificar diferentes formatos de respuesta
        if (result.data && result.data.exists !== undefined) {
            return result.data.exists;
        } else if (result.exists !== undefined) {
            return result.exists;
        } else {
            console.log('⚠️ Formato de respuesta inesperado:', result);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verificando formulario MongoDB:', error);
        
        // En caso de error, asumimos que no está completado para no bloquear al usuario
        return false;
    }
}

// Función para obtener el enlace de Teams desde el formulario
function obtenerEnlaceTeams() {
    const form = document.getElementById('inscripcionForm');
    if (!form) return null;
    
    // Buscar el campo hidden con name="_next"
    const nextField = form.querySelector('input[name="_next"]');
    if (nextField && nextField.value) {
        console.log('🔗 Enlace Teams encontrado:', nextField.value);
        return nextField.value;
    }
    
    // Alternativa: buscar en el action del formulario
    if (form.action && form.action.includes('teams.microsoft.com')) {
        console.log('🔗 Enlace Teams encontrado en action:', form.action);
        return form.action;
    }
    
    console.warn('⚠️ No se encontró enlace de Teams en el formulario');
    return null;
}

// Función mejorada para mostrar mensaje de formulario ya completado
function mostrarFormularioYaCompletado() {
    console.log('🔄 Mostrando mensaje de formulario ya completado...');
    
    const container = document.querySelector('.container');
    const form = document.getElementById('inscripcionForm');
    const claseActual = obtenerClaseActual();
    const enlaceTeams = obtenerEnlaceTeams(); // Obtener enlace dinámico
    
    if (!container) {
        console.error('❌ No se encontró el contenedor principal');
        return;
    }
    
    // Ocultar el formulario
    if (form) {
        form.style.display = 'none';
        console.log('✅ Formulario ocultado');
    }
    
    // Remover mensaje anterior si existe
    const mensajeAnterior = document.querySelector('.mensaje-ya-completado');
    if (mensajeAnterior) {
        mensajeAnterior.remove();
        console.log('✅ Mensaje anterior removido');
    }
    
    // Crear el contenido del mensaje según si hay enlace disponible
    let contenidoEnlace = '';
    if (enlaceTeams) {
        contenidoEnlace = `
            <p style="color: #667eea; font-size: 1em; margin-bottom: 25px; padding: 15px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; border-left: 4px solid #667eea;">
                <strong>¿Te saliste de la reunión accidentalmente?</strong><br>
                <a href="${enlaceTeams}" 
                   style="color: #667eea; text-decoration: underline; font-weight: bold;">
                    Haz click aquí para ingresar nuevamente
                </a>
            </p>
        `;
    } else {
        contenidoEnlace = `
            <p style="color: #888888; font-size: 0.9em; margin-bottom: 25px; padding: 15px; background: rgba(136, 136, 136, 0.1); border-radius: 8px; border-left: 4px solid #888888;">
                <em>Enlace de la reunión no disponible</em>
            </p>
        `;
    }
    
    // Crear nuevo mensaje
    const mensaje = document.createElement('div');
    mensaje.className = 'mensaje-ya-completado';
    mensaje.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div style="font-size: 4em; margin-bottom: 20px;">✅</div>
            <h2 style="color: #28a745; margin-bottom: 15px;">Formulario completado</h2>
            <p style="color: #b0b0b0; margin-bottom: 20px; font-size: 1.1em;">
                ¡Gracias! Ya has completado el formulario de inscripción para:<br>
                <strong style="color: #e0e0e0;">${claseActual || 'esta clase'}</strong>
            </p>
            <p style="color: #888888; font-size: 0.9em; margin-bottom: 20px;">
                No es necesario enviarlo nuevamente para esta clase.
            </p>
            ${contenidoEnlace}
            <div style="margin-top: 20px;">
                <button onclick="window.location.href='../index.html'" class="back-btn" style="margin: 5px;">
                    ← Volver al Menú Principal
                </button>
                <button onclick="logoutSafe();" class="back-btn logout-btn" style="margin: 5px;">
                    Cerrar Sesión
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(mensaje);
    console.log('✅ Mensaje de formulario ya completado mostrado');
}

// Función segura para logout
function logoutSafe() {
    if (authSystemReady && authSystem && typeof authSystem.logout === 'function') {
        authSystem.logout();
    }
    window.location.reload();
}

// Función para mostrar mensaje de error en la verificación
function mostrarErrorVerificacion(mensaje) {
    const container = document.querySelector('.container');
    const form = document.getElementById('inscripcionForm');
    
    if (form) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mensaje-cierre';
        errorDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 3em; margin-bottom: 15px;">⚠️</div>
                <h3 style="color: #dc3545; margin-bottom: 10px;">Error de Verificación</h3>
                <p style="color: #b0b0b0;">${mensaje}</p>
                <button onclick="window.location.reload()" class="back-btn" style="margin-top: 15px;">
                    Reintentar
                </button>
            </div>
        `;
        
        form.parentNode.insertBefore(errorDiv, form);
    }
}

// Función para autocompletar desde usuario logueado
function autocompletarDesdeUsuario() {
    if (isLoggedInSafe()) {
        const user = getCurrentUserSafe();
        console.log('🔄 Autocompletando formulario con datos del usuario:', user);
        
        const inputApellidoNombre = document.getElementById('apellidoNombre');
        const inputLegajo = document.getElementById('legajo');
        const selectTurno = document.getElementById('turno');
        const inputEmail = document.getElementById('email');
        
        // Verificar que los elementos existen antes de asignar valores
        if (inputApellidoNombre && user.apellidoNombre) {
            inputApellidoNombre.value = user.apellidoNombre;
            console.log('✅ Apellido y nombre autocompletado:', user.apellidoNombre);
        }
        if (inputLegajo && user.legajo) {
            inputLegajo.value = user.legajo;
            console.log('✅ Legajo autocompletado:', user.legajo);
        }
        if (selectTurno && user.turno) {
            selectTurno.value = user.turno;
            console.log('✅ Turno autocompletado:', user.turno);
        }
        if (inputEmail && user.email) {
            inputEmail.value = user.email;
            console.log('✅ Email autocompletado:', user.email);
        }
    }
}

// Guardar inscripción en MongoDB
async function guardarInscripcionEnMongoDB(formData) {
    try {
        const usuarioActual = getCurrentUserSafe();
        const claseActual = obtenerClaseActual();
        
        console.log('💾 Guardando inscripción en MongoDB...', {
            usuario: usuarioActual,
            clase: claseActual
        });
        
        const inscripcionData = {
            usuarioId: usuarioActual._id,
            clase: claseActual,
            turno: formData.get('turno'),
            fecha: new Date().toISOString()
        };
        
        const result = await makeRequestSafe('/inscripciones', inscripcionData);
        console.log('✅ Inscripción guardada en MongoDB:', result);
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando inscripción MongoDB:', error);
        throw error;
    }
}

// Función mejorada para validar el formulario antes de enviar
async function validarFormulario(event) {
    event.preventDefault();
    
    console.log('🔍 Iniciando validación del formulario MongoDB...');
    
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn ? submitBtn.textContent : 'Enviar Inscripción';
    
    try {
        // Deshabilitar botón para evitar múltiples envíos
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Validando...';
        }
        
        // Verificar si el usuario ya completó el formulario (doble verificación)
        console.log('🔍 Verificación adicional antes del envío...');
        const yaCompleto = await usuarioYaCompletoFormulario();
        
        if (yaCompleto) {
            const claseActual = obtenerClaseActual();
            const enlaceTeams = obtenerEnlaceTeams();
            
            let mensajeAlerta = `❌ Ya has completado el formulario de inscripción para: ${claseActual}\n\nNo es necesario enviarlo nuevamente para esta clase.`;
            
            if (enlaceTeams) {
                mensajeAlerta += `\n\n¿Te saliste de la reunión accidentalmente?\nHaz click aquí para ingresar nuevamente: ${enlaceTeams}`;
            }
            
            alert(mensajeAlerta);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            
            // Mostrar mensaje en la interfaz
            mostrarFormularioYaCompletado();
            return false;
        }
        
        console.log('✅ Usuario no ha completado esta clase, procediendo con el envío...');
        
        const form = document.getElementById('inscripcionForm');
        if (!form) {
            console.error('❌ Formulario no encontrado');
            return false;
        }
        
        const formData = new FormData(form);
        
        console.log('💾 Guardando en MongoDB...');
        if (submitBtn) {
            submitBtn.textContent = '💾 Guardando...';
        }
        
        const guardadoExitoso = await guardarInscripcionEnMongoDB(formData);
        
        if (guardadoExitoso) {
            console.log('✅ Guardado en MongoDB exitoso, enviando a FormSubmit...');
            if (submitBtn) {
                submitBtn.textContent = '📤 Enviando...';
            }
            
            // Enviar formulario a FormSubmit
            form.submit();
            
        } else {
            console.log('⚠️ Falló guardado en MongoDB, pero enviando formulario de todos modos...');
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            form.submit();
        }
        
    } catch (error) {
        console.error('❌ Error en el proceso de envío MongoDB:', error);
        alert('❌ Error al procesar el formulario: ' + error.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// Crear botones de opciones para administradores
function crearOpcionesAdmin() {
    const backBtnContainer = document.querySelector('.back-btn-container');
    
    if (backBtnContainer && isLoggedInSafe() && isAdminSafe()) {
        backBtnContainer.innerHTML = '';
        
        const adminBtn = document.createElement('button');
        adminBtn.textContent = '📊 Ir al Panel de Administración';
        adminBtn.className = 'back-btn admin-panel-btn';
        adminBtn.onclick = function() {
            window.location.href = '/admin/dashboard.html';
        };
        backBtnContainer.appendChild(adminBtn);
        
        const formBtn = document.createElement('button');
        formBtn.textContent = '📝 Ver Formulario de Inscripción';
        formBtn.className = 'back-btn form-btn active';
        formBtn.onclick = function() {
            document.querySelectorAll('.back-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
        };
        backBtnContainer.appendChild(formBtn);
        
        const adminInfo = document.createElement('div');
        adminInfo.className = 'admin-info';
        adminInfo.innerHTML = `
            <span style="color: #667eea; font-weight: bold;">👤 Modo Administrador - MongoDB</span>
        `;
        backBtnContainer.appendChild(adminInfo);
    }
}

// Función mejorada para inicializar la aplicación
async function inicializarAplicacion() {
    console.log('🚀 Inicializando aplicación MongoDB...');
    
    try {
        // Esperar a que authSystem esté disponible
        await waitForAuthSystem();
        console.log('✅ authSystem listo para usar');
        
    } catch (error) {
        console.error('❌ Error esperando por authSystem:', error);
        mostrarErrorVerificacion('Error al cargar el sistema de autenticación. Por favor, recargue la página.');
        return;
    }
    
    // Verificar autenticación
    if (!isLoggedInSafe()) {
        try {
            console.log('🔐 Usuario no logueado, mostrando modal de login...');
            await authSystem.showLoginModal();
            console.log('✅ Usuario autenticado MongoDB:', getCurrentUserSafe());
        } catch (error) {
            console.log('❌ Usuario canceló el login');
            window.location.href = '../index.html';
            return;
        }
    }
    
    console.log('🔍 Verificando si usuario ya completó el formulario...');
    
    try {
        // Verificar si el usuario ya completó el formulario PARA ESTA CLASE ESPECÍFICA
        const yaCompleto = await usuarioYaCompletoFormulario();
        console.log('📊 Resultado de verificación MongoDB:', yaCompleto);
        
        if (yaCompleto) {
            console.log('✅ Usuario ya completó el formulario para esta clase, mostrando mensaje...');
            mostrarFormularioYaCompletado();
            return; // Detener la ejecución aquí
        }
        
        console.log('✅ Usuario puede completar el formulario, continuando...');
        
    } catch (error) {
        console.error('❌ Error en la verificación inicial:', error);
        mostrarErrorVerificacion('Error al verificar el estado del formulario. Por favor, recargue la página.');
        return;
    }
    
    // Si es admin, mostrar opciones especiales
    if (isAdminSafe()) {
        console.log('👑 Usuario administrador detectado, mostrando opciones...');
        crearOpcionesAdmin();
    }
    
    // Autocompletar datos del usuario
    autocompletarDesdeUsuario();
    
    // Configurar evento de envío del formulario
    const form = document.getElementById('inscripcionForm');
    if (form) {
        form.addEventListener('submit', validarFormulario);
        console.log('✅ Event listener del formulario configurado MongoDB');
    } else {
        console.error('❌ Formulario no encontrado');
    }
    
    // Agregar botón de logout
    const backBtnContainer = document.querySelector('.back-btn-container');
    if (backBtnContainer && isLoggedInSafe()) {
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Cerrar Sesión';
        logoutBtn.className = 'back-btn logout-btn';
        logoutBtn.onclick = function() {
            logoutSafe();
        };
        backBtnContainer.appendChild(logoutBtn);
    }
    
    console.log('✅ Aplicación inicializada correctamente con MongoDB');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, iniciando aplicación MongoDB...');
    inicializarAplicacion();
});

// Función de depuración para verificar el estado
function debugEstadoFormulario() {
    console.log('=== DEBUG ESTADO FORMULARIO ===');
    console.log('authSystem disponible:', typeof authSystem !== 'undefined');
    console.log('authSystemReady:', authSystemReady);
    console.log('Usuario logueado:', isLoggedInSafe());
    console.log('Usuario actual:', getCurrentUserSafe());
    console.log('Clase actual:', obtenerClaseActual());
    console.log('Formulario existe:', !!document.getElementById('inscripcionForm'));
    console.log('Mensaje ya completado existe:', !!document.querySelector('.mensaje-ya-completado'));
    console.log('==============================');
}

// Exponer función de debug para testing
window.debugEstadoFormulario = debugEstadoFormulario;