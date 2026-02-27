import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Actor {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface UseCase {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  package?: string;
}

interface Package {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface Relation {
  from: string;
  to: string;
  type: 'association' | 'include' | 'extend';
}

@Component({
  selector: 'app-use-case-diagram',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './use-case-diagram.component.html',
  styleUrl: './use-case-diagram.component.css'
})
export class UseCaseDiagramComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private scale = 1;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  actors: Actor[] = [
    { id: 'Admin', name: '👤 Administrador', x: 50, y: 100, color: '#ff6b6b' },
    { id: 'Nurse', name: '👤 Enfermera', x: 50, y: 300, color: '#4ecdc4' },
    { id: 'Supervisor', name: '👤 Supervisor', x: 50, y: 500, color: '#ffe66d' },
    { id: 'Pharmacy', name: '👤 Farmacia', x: 50, y: 700, color: '#95e1d3' }
  ];

  packages: Package[] = [
    { id: 'Auth', name: '🔐 Autenticación', x: 200, y: 50, width: 300, height: 200, color: '#e8f4f8' },
    { id: 'Users', name: '👥 Gestión de Usuarios', x: 550, y: 50, width: 300, height: 250, color: '#fff5e6' },
    { id: 'Areas', name: '🏥 Gestión de Áreas', x: 900, y: 50, width: 300, height: 200, color: '#f0f0f0' },
    { id: 'Beds', name: '🛏️ Gestión de Camas', x: 1250, y: 50, width: 300, height: 250, color: '#e6f3ff' },
    { id: 'Patients', name: '👨‍⚕️ Gestión de Pacientes', x: 200, y: 300, width: 300, height: 300, color: '#ffe6f0' },
    { id: 'Medications', name: '💊 Gestión de Medicamentos', x: 550, y: 350, width: 300, height: 250, color: '#e6ffe6' },
    { id: 'Schedules', name: '📅 Gestión de Horarios y Tareas', x: 900, y: 350, width: 300, height: 250, color: '#fff0e6' },
    { id: 'Shifts', name: '🔄 Gestión de Turnos', x: 1250, y: 350, width: 300, height: 200, color: '#f0e6ff' },
    { id: 'PharmacyModule', name: '💉 Módulo de Farmacia', x: 200, y: 650, width: 300, height: 250, color: '#ffe6cc' },
    { id: 'Reports', name: '📊 Reportes', x: 550, y: 650, width: 300, height: 200, color: '#e6f0ff' },
    { id: 'Notifications', name: '🔔 Notificaciones', x: 900, y: 650, width: 300, height: 200, color: '#ffe6e6' },
    { id: 'Backup', name: '💾 Backup', x: 1250, y: 650, width: 300, height: 200, color: '#e6ffe6' }
  ];

  useCases: UseCase[] = [
    // Autenticación
    { id: 'UC1', name: 'Iniciar Sesión', x: 220, y: 100, width: 120, height: 30, package: 'Auth' },
    { id: 'UC2', name: 'Registrar Usuario', x: 220, y: 140, width: 120, height: 30, package: 'Auth' },
    { id: 'UC3', name: 'Verificar Email', x: 220, y: 180, width: 120, height: 30, package: 'Auth' },
    { id: 'UC4', name: 'Cerrar Sesión', x: 220, y: 220, width: 120, height: 30, package: 'Auth' },
    
    // Gestión de Usuarios
    { id: 'UC5', name: 'Gestionar Usuarios', x: 570, y: 100, width: 120, height: 30, package: 'Users' },
    { id: 'UC6', name: 'Crear Usuario', x: 570, y: 140, width: 120, height: 30, package: 'Users' },
    { id: 'UC7', name: 'Editar Usuario', x: 570, y: 180, width: 120, height: 30, package: 'Users' },
    { id: 'UC8', name: 'Eliminar Usuario', x: 570, y: 220, width: 120, height: 30, package: 'Users' },
    { id: 'UC9', name: 'Activar/Desactivar', x: 570, y: 260, width: 120, height: 30, package: 'Users' },
    
    // Gestión de Áreas
    { id: 'UC12', name: 'Gestionar Áreas', x: 920, y: 100, width: 120, height: 30, package: 'Areas' },
    { id: 'UC13', name: 'Crear Área', x: 920, y: 140, width: 120, height: 30, package: 'Areas' },
    { id: 'UC14', name: 'Editar Área', x: 920, y: 180, width: 120, height: 30, package: 'Areas' },
    
    // Gestión de Camas
    { id: 'UC17', name: 'Gestionar Camas', x: 1270, y: 100, width: 120, height: 30, package: 'Beds' },
    { id: 'UC18', name: 'Crear Cama', x: 1270, y: 140, width: 120, height: 30, package: 'Beds' },
    { id: 'UC19', name: 'Editar Cama', x: 1270, y: 180, width: 120, height: 30, package: 'Beds' },
    { id: 'UC20', name: 'Eliminar Cama', x: 1270, y: 220, width: 120, height: 30, package: 'Beds' },
    
    // Gestión de Pacientes
    { id: 'UC24', name: 'Gestionar Pacientes', x: 220, y: 350, width: 120, height: 30, package: 'Patients' },
    { id: 'UC25', name: 'Crear Paciente', x: 220, y: 390, width: 120, height: 30, package: 'Patients' },
    { id: 'UC26', name: 'Editar Paciente', x: 220, y: 430, width: 120, height: 30, package: 'Patients' },
    { id: 'UC28', name: 'Ver Detalles', x: 220, y: 470, width: 120, height: 30, package: 'Patients' },
    { id: 'UC29', name: 'Ver Historial', x: 220, y: 510, width: 120, height: 30, package: 'Patients' },
    
    // Gestión de Medicamentos
    { id: 'UC34', name: 'Agregar Medicamento', x: 570, y: 400, width: 140, height: 30, package: 'Medications' },
    { id: 'UC35', name: 'Suspender Medicamento', x: 570, y: 440, width: 140, height: 30, package: 'Medications' },
    { id: 'UC38', name: 'Ver Medicamentos', x: 570, y: 480, width: 140, height: 30, package: 'Medications' },
    { id: 'UC39', name: 'Marcar Administrado', x: 570, y: 520, width: 140, height: 30, package: 'Medications' },
    
    // Gestión de Horarios
    { id: 'UC41', name: 'Gestionar Horarios', x: 920, y: 400, width: 120, height: 30, package: 'Schedules' },
    { id: 'UC42', name: 'Crear Tarea', x: 920, y: 440, width: 120, height: 30, package: 'Schedules' },
    { id: 'UC43', name: 'Completar Tarea', x: 920, y: 480, width: 120, height: 30, package: 'Schedules' },
    { id: 'UC46', name: 'Ver Tareas del Día', x: 920, y: 520, width: 120, height: 30, package: 'Schedules' },
    
    // Gestión de Turnos
    { id: 'UC49', name: 'Gestionar Turnos', x: 1270, y: 400, width: 120, height: 30, package: 'Shifts' },
    { id: 'UC50', name: 'Asignar Turno', x: 1270, y: 440, width: 120, height: 30, package: 'Shifts' },
    
    // Módulo de Farmacia
    { id: 'UC53', name: 'Solicitar Medicamentos', x: 220, y: 700, width: 140, height: 30, package: 'PharmacyModule' },
    { id: 'UC54', name: 'Ver Solicitudes', x: 220, y: 740, width: 140, height: 30, package: 'PharmacyModule' },
    { id: 'UC55', name: 'Marcar Preparación', x: 220, y: 780, width: 140, height: 30, package: 'PharmacyModule' },
    { id: 'UC57', name: 'Marcar Entregada', x: 220, y: 820, width: 140, height: 30, package: 'PharmacyModule' },
    
    // Reportes
    { id: 'UC61', name: 'Generar Reportes', x: 570, y: 700, width: 120, height: 30, package: 'Reports' },
    { id: 'UC62', name: 'Reporte Admin', x: 570, y: 740, width: 120, height: 30, package: 'Reports' },
    
    // Notificaciones
    { id: 'UC65', name: 'Enviar Notificación', x: 920, y: 700, width: 130, height: 30, package: 'Notifications' },
    { id: 'UC66', name: 'Recibir Notificaciones', x: 920, y: 740, width: 130, height: 30, package: 'Notifications' },
    
    // Backup
    { id: 'UC68', name: 'Crear Backup', x: 1270, y: 700, width: 120, height: 30, package: 'Backup' },
    { id: 'UC69', name: 'Listar Backups', x: 1270, y: 740, width: 120, height: 30, package: 'Backup' }
  ];

  relations: Relation[] = [
    // Administrador
    { from: 'Admin', to: 'UC1', type: 'association' },
    { from: 'Admin', to: 'UC2', type: 'association' },
    { from: 'Admin', to: 'UC5', type: 'association' },
    { from: 'Admin', to: 'UC12', type: 'association' },
    { from: 'Admin', to: 'UC17', type: 'association' },
    { from: 'Admin', to: 'UC24', type: 'association' },
    { from: 'Admin', to: 'UC34', type: 'association' },
    { from: 'Admin', to: 'UC41', type: 'association' },
    { from: 'Admin', to: 'UC49', type: 'association' },
    { from: 'Admin', to: 'UC53', type: 'association' },
    { from: 'Admin', to: 'UC61', type: 'association' },
    { from: 'Admin', to: 'UC65', type: 'association' },
    { from: 'Admin', to: 'UC68', type: 'association' },
    
    // Enfermera
    { from: 'Nurse', to: 'UC1', type: 'association' },
    { from: 'Nurse', to: 'UC19', type: 'association' },
    { from: 'Nurse', to: 'UC28', type: 'association' },
    { from: 'Nurse', to: 'UC34', type: 'association' },
    { from: 'Nurse', to: 'UC42', type: 'association' },
    { from: 'Nurse', to: 'UC53', type: 'association' },
    { from: 'Nurse', to: 'UC66', type: 'association' },
    
    // Supervisor
    { from: 'Supervisor', to: 'UC1', type: 'association' },
    { from: 'Supervisor', to: 'UC5', type: 'association' },
    { from: 'Supervisor', to: 'UC12', type: 'association' },
    { from: 'Supervisor', to: 'UC17', type: 'association' },
    { from: 'Supervisor', to: 'UC24', type: 'association' },
    { from: 'Supervisor', to: 'UC41', type: 'association' },
    { from: 'Supervisor', to: 'UC49', type: 'association' },
    { from: 'Supervisor', to: 'UC61', type: 'association' },
    { from: 'Supervisor', to: 'UC65', type: 'association' },
    
    // Farmacia
    { from: 'Pharmacy', to: 'UC1', type: 'association' },
    { from: 'Pharmacy', to: 'UC54', type: 'association' },
    { from: 'Pharmacy', to: 'UC55', type: 'association' },
    { from: 'Pharmacy', to: 'UC57', type: 'association' },
    { from: 'Pharmacy', to: 'UC66', type: 'association' },
    
    // Relaciones de inclusión
    { from: 'UC5', to: 'UC6', type: 'include' },
    { from: 'UC5', to: 'UC7', type: 'include' },
    { from: 'UC12', to: 'UC13', type: 'include' },
    { from: 'UC12', to: 'UC14', type: 'include' },
    { from: 'UC17', to: 'UC18', type: 'include' },
    { from: 'UC17', to: 'UC19', type: 'include' },
    { from: 'UC24', to: 'UC25', type: 'include' },
    { from: 'UC24', to: 'UC26', type: 'include' },
    { from: 'UC41', to: 'UC42', type: 'include' },
    { from: 'UC41', to: 'UC43', type: 'include' },
    { from: 'UC49', to: 'UC50', type: 'include' },
    { from: 'UC61', to: 'UC62', type: 'include' }
  ];

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    // Configurar tamaño del canvas
    canvas.width = window.innerWidth - 40;
    canvas.height = window.innerHeight - 200;
    
    this.draw();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    
    // Zoom con rueda del mouse
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale *= delta;
      this.scale = Math.max(0.3, Math.min(3, this.scale));
      this.draw();
    });
    
    // Pan con arrastre
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
    
    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.panX += e.clientX - this.lastMouseX;
        this.panY += e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.draw();
      }
    });
    
    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Aplicar transformaciones
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);
    
    // Dibujar paquetes
    this.packages.forEach(pkg => {
      this.drawPackage(pkg);
    });
    
    // Dibujar casos de uso
    this.useCases.forEach(uc => {
      this.drawUseCase(uc);
    });
    
    // Dibujar relaciones
    this.relations.forEach(rel => {
      this.drawRelation(rel);
    });
    
    // Dibujar actores
    this.actors.forEach(actor => {
      this.drawActor(actor);
    });
    
    this.ctx.restore();
  }

  private drawPackage(pkg: Package): void {
    this.ctx.fillStyle = pkg.color;
    this.ctx.fillRect(pkg.x, pkg.y, pkg.width, pkg.height);
    
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(pkg.x, pkg.y, pkg.width, pkg.height);
    
    // Título del paquete
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText(pkg.name, pkg.x + 10, pkg.y + 20);
  }

  private drawUseCase(uc: UseCase): void {
    const centerX = uc.x + uc.width / 2;
    const centerY = uc.y + uc.height / 2;
    const radiusX = uc.width / 2;
    const radiusY = uc.height / 2;
    
    // Elipse para caso de uso
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    
    // Texto del caso de uso
    this.ctx.fillStyle = '#333';
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(uc.name, centerX, centerY + 4);
    this.ctx.textAlign = 'left';
  }

  private drawActor(actor: Actor): void {
    const x = actor.x;
    const y = actor.y;
    
    // Dibujar figura de palo (actor)
    this.ctx.strokeStyle = actor.color;
    this.ctx.lineWidth = 2;
    
    // Cabeza (círculo)
    this.ctx.beginPath();
    this.ctx.arc(x, y - 30, 15, 0, 2 * Math.PI);
    this.ctx.stroke();
    
    // Cuerpo (línea vertical)
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 15);
    this.ctx.lineTo(x, y + 15);
    this.ctx.stroke();
    
    // Brazos (línea horizontal)
    this.ctx.beginPath();
    this.ctx.moveTo(x - 20, y);
    this.ctx.lineTo(x + 20, y);
    this.ctx.stroke();
    
    // Piernas
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 15);
    this.ctx.lineTo(x - 15, y + 35);
    this.ctx.moveTo(x, y + 15);
    this.ctx.lineTo(x + 15, y + 35);
    this.ctx.stroke();
    
    // Nombre del actor
    this.ctx.fillStyle = actor.color;
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(actor.name, x, y + 55);
    this.ctx.textAlign = 'left';
  }

  private drawRelation(rel: Relation): void {
    const from = this.findPosition(rel.from);
    const to = this.findPosition(rel.to);
    
    if (!from || !to) return;
    
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 1;
    
    if (rel.type === 'association') {
      // Línea sólida para asociación
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();
    } else if (rel.type === 'include') {
      // Línea punteada para inclusión
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      
      // Flecha con etiqueta <<include>>
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const arrowX = to.x - Math.cos(angle) * 20;
      const arrowY = to.y - Math.sin(angle) * 20;
      
      this.ctx.fillStyle = '#666';
      this.ctx.font = '10px Arial';
      this.ctx.fillText('<<include>>', (from.x + to.x) / 2, (from.y + to.y) / 2 - 5);
    }
  }

  private findPosition(id: string): { x: number; y: number } | null {
    // Buscar en actores
    const actor = this.actors.find(a => a.id === id);
    if (actor) {
      return { x: actor.x, y: actor.y };
    }
    
    // Buscar en casos de uso
    const useCase = this.useCases.find(uc => uc.id === id);
    if (useCase) {
      return { 
        x: useCase.x + useCase.width / 2, 
        y: useCase.y + useCase.height / 2 
      };
    }
    
    return null;
  }

  resetView(): void {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.draw();
  }

  zoomIn(): void {
    this.scale = Math.min(3, this.scale * 1.2);
    this.draw();
  }

  zoomOut(): void {
    this.scale = Math.max(0.3, this.scale * 0.8);
    this.draw();
  }
}
