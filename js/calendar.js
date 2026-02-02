console.log('calendar.js cargado correctamente - Versión Columnas Derecha');

class CalendarManager {
    constructor() {
        this.selectedClasses = new Set();
        this.classesData = this.initializeClassesData();
        this.init();
    }

    // Inicializar datos de clases
    initializeClassesData() {
        return [
            {
                id: 1,
                title: "Elaboración de Protocolos",
                date: "2026-02-05",
                displayDate: "05/02/2026",
                time: "09:00",
                displayTime: "09:00hs",
                endTime: "12:00",
                modality: "Presencial",
                instructor: "Dr. Pedro Mundel",
                location: "Aula Principal",
                description: "Clase sobre elaboración de protocolos de investigación"
            },
            {
                id: 2,
                title: "Rotación de Personal",
                date: "2026-02-11",
                displayDate: "11/02/2026",
                time: "14:00",
                displayTime: "14:00hs",
                endTime: "17:00",
                modality: "Virtual",
                instructor: "Lic. Karina Raihy, Lic. Lilian Toledo",
                location: "Microsoft Teams",
                description: "Clase sobre rotación de personal en entornos hospitalarios"
            },
            {
                id: 3,
                title: "Ausentismo",
                date: "2026-02-19",
                displayDate: "19/02/2026",
                time: "10:00",
                displayTime: "10:00hs",
                endTime: "13:00",
                modality: "Híbrida",
                instructor: "Lic. Mercedes Sosa",
                location: "Aula 201 + Teams",
                description: "Clase sobre manejo de ausentismo laboral"
            },
            {
                id: 4,
                title: "Stroke / IAM",
                date: "2026-02-24",
                displayDate: "24/02/2026",
                time: "09:00",
                displayTime: "09:00hs",
                endTime: "12:00",
                modality: "Presencial",
                instructor: "Lic. Daniel de la Rosa, Lic. Liliana Areco",
                location: "Aula Principal",
                description: "Clase sobre protocolos de stroke e infarto agudo de miocardio"
            },
            {
                id: 5,
                title: "CoPaP",
                date: "2026-02-25",
                displayDate: "25/02/2026",
                time: "15:00",
                displayTime: "15:00hs",
                endTime: "18:00",
                modality: "Virtual",
                instructor: "Lic. Karina Raihy, Enf. Sara Aiduc",
                location: "Microsoft Teams",
                description: "Clase sobre cuidados paliativos y atención primaria"
            }
        ];
    }

    // Obtener recordatorios seleccionados
    getSelectedReminders() {
        const checkboxes = document.querySelectorAll('.reminder-checkbox:checked');
        const reminders = Array.from(checkboxes).map(cb => parseInt(cb.value));
        return reminders.sort((a, b) => a - b);
    }

    // Agregar clase al calendario
    addToCalendar(classId) {
        if (this.selectedClasses.has(classId)) {
            // Si ya está seleccionada, quitarla
            this.selectedClasses.delete(classId);
            this.updateClassCard(classId, false);
            this.showToast('Clase removida', 'La clase ha sido removida de la selección');
        } else {
            // Agregar a la selección
            this.selectedClasses.add(classId);
            this.updateClassCard(classId, true);
            this.showToast('Clase agregada', 'La clase ha sido agregada a tu calendario');
        }
        
        this.updateSelectionCount();
        this.updatePreview();
        this.updateDownloadButton();
    }

    // Actualizar apariencia de la tarjeta de clase
    updateClassCard(classId, isSelected) {
        const classCard = document.querySelector(`.calendar-class-card[data-class-id="${classId}"]`);
        const button = classCard?.querySelector('.add-to-calendar-btn');
        
        if (classCard && button) {
            if (isSelected) {
                classCard.classList.add('selected');
                button.textContent = '✓ Agregada';
                button.classList.add('added');
            } else {
                classCard.classList.remove('selected');
                button.textContent = '+ Agregar a .ics';
                button.classList.remove('added');
            }
        }
    }

    // Actualizar contador de selección
    updateSelectionCount() {
        const countElement = document.getElementById('selectedClassesCount');
        if (countElement) {
            countElement.textContent = this.selectedClasses.size;
        }
    }

    // Actualizar vista previa
    updatePreview() {
        const previewList = document.getElementById('previewList');
        if (!previewList) return;
        
        if (this.selectedClasses.size === 0) {
            previewList.innerHTML = '<div class="empty-preview">No hay clases seleccionadas</div>';
            return;
        }
        
        previewList.innerHTML = '';
        
        Array.from(this.selectedClasses).forEach(classId => {
            const cls = this.classesData.find(c => c.id === classId);
            if (!cls) return;
            
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <div class="preview-item-info">
                    <div class="preview-item-title">${cls.title}</div>
                    <div class="preview-item-details">
                        <span>${cls.displayDate}</span>
                        <span>${cls.displayTime}</span>
                        <span>${cls.modality}</span>
                    </div>
                </div>
                <button class="remove-preview-btn" onclick="calendarManager.removeFromPreview(${classId})" title="Remover">
                    ✕
                </button>
            `;
            
            previewList.appendChild(previewItem);
        });
    }

    // Remover clase desde la vista previa
    removeFromPreview(classId) {
        this.selectedClasses.delete(classId);
        this.updateClassCard(classId, false);
        this.updateSelectionCount();
        this.updatePreview();
        this.updateDownloadButton();
        this.showToast('Clase removida', 'La clase ha sido removida de la selección');
    }

    // Actualizar estado del botón de descarga
    updateDownloadButton() {
        const downloadBtn = document.getElementById('downloadSelectedBtn');
        if (downloadBtn) {
            downloadBtn.disabled = this.selectedClasses.size === 0;
        }
    }

    // Generar contenido .ics para clases seleccionadas
    generateICSContent(reminders = []) {
        if (this.selectedClasses.size === 0) {
            throw new Error('No hay clases seleccionadas');
        }

        const now = new Date();
        const dtstamp = this.formatDateForICS(now);
        
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Sistema de Inscripciones//Calendario Personal//ES',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Clases Seleccionadas - Sistema de Inscripciones`,
            'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
            'X-WR-CALDESC:Clases seleccionadas del sistema de inscripciones'
        ];

        // Añadir cada clase seleccionada
        Array.from(this.selectedClasses).forEach(classId => {
            const cls = this.classesData.find(c => c.id === classId);
            if (cls) {
                icsContent = icsContent.concat(this.createEvent(cls, reminders, dtstamp));
            }
        });

        icsContent.push('END:VCALENDAR');
        
        return icsContent.join('\r\n');
    }

    // Generar contenido .ics para todas las clases
    generateAllICSContent(reminders = []) {
        const now = new Date();
        const dtstamp = this.formatDateForICS(now);
        
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Sistema de Inscripciones//Todas las Clases//ES',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Todas las Clases - Sistema de Inscripciones',
            'X-WR-TIMEZONE:America/Argentina/Buenos_Aires',
            'X-WR-CALDESC:Todas las clases del sistema de inscripciones'
        ];

        // Añadir todas las clases
        this.classesData.forEach(cls => {
            icsContent = icsContent.concat(this.createEvent(cls, reminders, dtstamp));
        });

        icsContent.push('END:VCALENDAR');
        
        return icsContent.join('\r\n');
    }

    // Crear un evento individual
    createEvent(cls, reminders, dtstamp) {
        const startDate = new Date(`${cls.date}T${cls.time}:00`);
        const endDate = new Date(`${cls.date}T${cls.endTime}:00`);
        
        const event = [
            'BEGIN:VEVENT',
            `UID:${cls.id}-${Date.now()}@sistema-inscripciones.com`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${this.formatDateForICS(startDate)}`,
            `DTEND:${this.formatDateForICS(endDate)}`,
            `SUMMARY:${this.escapeICS(cls.title)}`,
            `DESCRIPTION:${this.escapeICS(`${cls.description}\\nModalidad: ${cls.modality}\\nInstructor: ${cls.instructor}\\nHorario: ${cls.displayTime}`)}`,
            `LOCATION:${this.escapeICS(cls.location)}`,
            `STATUS:CONFIRMED`,
            `SEQUENCE:0`,
            `TRANSP:OPAQUE`,
            `CREATED:${dtstamp}`,
            `LAST-MODIFIED:${dtstamp}`
        ];

        // Añadir alarmas/recordatorios
        reminders.forEach(minutes => {
            if (minutes > 0) {
                event.push(
                    'BEGIN:VALARM',
                    'ACTION:DISPLAY',
                    `TRIGGER:-PT${minutes}M`,
                    `DESCRIPTION:Recordatorio: ${this.escapeICS(cls.title)}`,
                    'END:VALARM'
                );
            }
        });

        event.push('END:VEVENT');
        return event;
    }

    // Formatear fecha para .ics
    formatDateForICS(date) {
        const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return utcDate.toISOString()
            .replace(/[-:]/g, '')
            .split('.')[0] + 'Z';
    }

    // Escapar texto para .ics
    escapeICS(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }

    // Descargar archivo .ics
    downloadICS(filename, content) {
        const blob = new Blob([content], { 
            type: 'text/calendar;charset=utf-8'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // Descargar clases seleccionadas
    downloadSelected() {
        try {
            const reminders = this.getSelectedReminders();
            
            if (reminders.length === 0) {
                alert('⚠️ Selecciona al menos un recordatorio');
                return;
            }

            if (this.selectedClasses.size === 0) {
                alert('⚠️ Selecciona al menos una clase');
                return;
            }

            const icsContent = this.generateICSContent(reminders);
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const filename = `clases_seleccionadas_${dateStr}.ics`;
            
            this.downloadICS(filename, icsContent);
            
            this.showSuccessMessage(
                'Calendario descargado',
                `${this.selectedClasses.size} clases con recordatorios`
            );
            
            console.log('✅ Clases seleccionadas descargadas:', {
                cantidad: this.selectedClasses.size,
                recordatorios: reminders
            });
            
        } catch (error) {
            console.error('❌ Error descargando clases seleccionadas:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

    // Descargar todas las clases
    downloadAll() {
        try {
            const reminders = this.getSelectedReminders();
            
            if (reminders.length === 0) {
                alert('⚠️ Selecciona al menos un recordatorio');
                return;
            }

            const icsContent = this.generateAllICSContent(reminders);
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const filename = `todas_las_clases_${dateStr}.ics`;
            
            this.downloadICS(filename, icsContent);
            
            this.showSuccessMessage(
                'Todas las clases descargadas',
                `${this.classesData.length} clases con recordatorios`
            );
            
            console.log('✅ Todas las clases descargadas:', {
                cantidad: this.classesData.length,
                recordatorios: reminders
            });
            
        } catch (error) {
            console.error('❌ Error descargando todas las clases:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

    // Mostrar mensaje de éxito
    showSuccessMessage(title, message) {
        // Remover mensajes anteriores
        const existingMsg = document.querySelector('.calendar-success-message');
        if (existingMsg) existingMsg.remove();

        // Crear nuevo mensaje
        const successMsg = document.createElement('div');
        successMsg.className = 'calendar-success-message';
        successMsg.innerHTML = `
            <div class="success-icon">✅</div>
            <div class="success-content">
                <strong>${title}</strong>
                <div>${message}</div>
            </div>
        `;

        document.body.appendChild(successMsg);

        // Remover después de 4 segundos
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.classList.add('fade-out');
                setTimeout(() => successMsg.remove(), 300);
            }
        }, 4000);
    }

    // Mostrar toast temporal
    showToast(title, message) {
        const toast = document.createElement('div');
        toast.className = 'calendar-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--bg-container);
            color: var(--text-primary);
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            border-left: 4px solid var(--accent-color);
            z-index: 9999;
            max-width: 300px;
            animation: slideInUp 0.3s ease;
        `;
        
        toast.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 0.9em; color: var(--text-secondary);">${message}</div>
        `;

        document.body.appendChild(toast);

        // Remover después de 3 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutDown 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    // Marcar clases próximas (próximos 3 días)
    markUpcomingClasses() {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
        
        this.classesData.forEach(cls => {
            const classDate = new Date(`${cls.date}T${cls.time}:00`);
            const classCard = document.querySelector(`.calendar-class-card[data-class-id="${cls.id}"]`);
            
            if (classCard && classDate > now && classDate <= threeDaysFromNow) {
                classCard.classList.add('upcoming-class');
            }
        });
    }

    // Inicializar
    init() {
        console.log('✅ CalendarManager inicializado');
        
        // Configurar eventos de los checkboxes
        document.querySelectorAll('.reminder-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                console.log('🔔 Recordatorios actualizados:', this.getSelectedReminders());
            });
        });
        
        // Marcar clases próximas
        this.markUpcomingClasses();
        
        // Actualizar estado inicial
        this.updateSelectionCount();
        this.updatePreview();
        this.updateDownloadButton();
        
        // Verificar periódicamente clases próximas
        setInterval(() => this.markUpcomingClasses(), 60000);
    }
}

// Crear instancia global
window.calendarManager = new CalendarManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Añadir animaciones CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInUp {
            from {
                transform: translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutDown {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(100%);
                opacity: 0;
            }
        }
        
        .calendar-toast {
            animation: slideInUp 0.3s ease;
        }
    `;
    document.head.appendChild(style);
    
    console.log('📅 Calendario (Columnas Derecha) completamente inicializado');
});

// API para uso desde otros scripts
window.CalendarAPI = {
    addClass: function(classData) {
        // Esta función permite agregar clases dinámicamente desde otros scripts
        console.log('➕ Agregando clase dinámicamente:', classData);
        // Implementación futura para agregar clases dinámicamente
    },
    
    clearSelection: function() {
        calendarManager.selectedClasses.clear();
        calendarManager.updateSelectionCount();
        calendarManager.updatePreview();
        calendarManager.updateDownloadButton();
        
        // Limpiar selección visual
        document.querySelectorAll('.calendar-class-card').forEach(card => {
            card.classList.remove('selected');
            const button = card.querySelector('.add-to-calendar-btn');
            if (button) {
                button.textContent = '+ Agregar a .ics';
                button.classList.remove('added');
            }
        });
        
        calendarManager.showToast('Selección limpiada', 'Todas las clases han sido removidas');
    }
};