import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PharmacyService } from '../../services/pharmacy.service';

interface MedicationRequest {
  id: number;
  requestId: string;
  requestedBy: string;
  requestedAt: string;
  medication: string;
  dosage: string;
  quantity: number;
  patients: PatientMedication[];
  status: 'pending' | 'in_preparation' | 'ready' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
  medicationId?: number;
  availableInStock?: boolean;
  stockAvailable?: number;
}

interface PatientMedication {
  patientName: string;
  bedNumber: string;
  areaName?: string;
  area?: string;
  areaId?: number;
  patientId?: number;
  doses: MedicationDose[];
}

interface MedicationDose {
  time: string;
  quantity: string;
  administered: boolean;
}

interface DeliveryHistoryItem {
  id: number;
  deliveryId?: string;
  requestId?: string;
  medication: string;
  dosage: string;
  quantity: number;
  requestedBy: string;
  deliveredAt?: string;
  deliveredAtRaw?: Date; // Fecha original para comparación
  cancelledAt?: string;
  deliveredBy?: string;
  patients?: string[];
  patientsInfo?: PatientMedication[];
  notes: string;
  type: 'delivery' | 'cancelled';
}

interface InventoryItem {
  id?: number;
  medication: string;
  dosage: string;
  stock: number;
  minStock: number;
  location: string;
  expiryDate: string;
  status: 'available' | 'low_stock' | 'expired' | 'out_of_stock';
}

@Component({
  selector: 'app-pharmacy-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-dashboard.component.html',
  styleUrl: './pharmacy-dashboard.component.css',
})
export class PharmacyDashboardComponent implements OnInit {
  pharmacyUserName: string = 'Farmacia Central';
  
  pendingRequestsCount: number = 0;
  inPreparationCount: number = 0;
  readyForDeliveryCount: number = 0;
  deliveredTodayCount: number = 0;

  medicationRequests: MedicationRequest[] = [];
  filteredRequests: MedicationRequest[] = [];

  deliveryHistory: DeliveryHistoryItem[] = [];
  filteredHistory: DeliveryHistoryItem[] = [];

  inventory: InventoryItem[] = [];
  filteredInventory: InventoryItem[] = [];

  requestFilter: string = 'all';
  searchTerm: string = '';
  historySearchTerm: string = '';
  inventorySearchTerm: string = '';

  activeSection: string = 'requests';

  showDeliveryModal: boolean = false;
  selectedRequest: MedicationRequest | null = null;
  deliveryNotes: string = '';
  
  // Modal de rechazo
  showRejectModal: boolean = false;
  rejectionReason: string = '';
  
  // Gestión de inventario
  showAddMedicationModal = false;
  showDeleteMedicationModal = false;
  selectedMedicationForDelete: InventoryItem | null = null;
  newMedicationForm: {
    name: string;
    dosage: string;
    description: string;
    stock: number;
    minStock: number;
    location: string;
    expiryDate: string;
  } = {
    name: '',
    dosage: '',
    description: '',
    stock: 0,
    minStock: 50,
    location: '',
    expiryDate: ''
  };
  
  // Historial completo (entregas y rechazos)
  fullHistory: any[] = [];

  constructor(
    private authService: AuthService,
    private pharmacyService: PharmacyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.pharmacyUserName = `${currentUser.firstName} ${currentUser.lastName}`;
    }
    this.loadData();
  }

  loadData(): void {
    this.pharmacyService.getInventory().subscribe({
      next: (inventory) => {
        this.inventory = inventory.map(i => ({
          id: i.id,
          medication: i.name,
          dosage: i.dosage,
          stock: i.stock,
          minStock: i.minStock,
          location: i.location || 'N/A',
          expiryDate: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('es-ES') : 'N/A',
          status: i.status
        }));
        
        this.filteredInventory = this.inventory;
        
        this.loadRequests();
        this.loadHistory();
      },
      error: (error) => {
        console.error('Error cargando inventario:', error);
        this.inventory = [];
        this.filteredInventory = [];
        this.loadRequests();
        this.loadHistory();
      }
    });
  }

  loadRequests(): void {
    this.pharmacyService.getMedicationRequests().subscribe({
      next: (requests) => {
        this.medicationRequests = requests.map(r => {
          // Verificar disponibilidad REAL en inventario desde BD
          const medicationInInventory = this.inventory.find(
            inv => inv.medication === r.medication.name && inv.dosage === r.dosage
          );
          const isAvailable = medicationInInventory ? 
            (medicationInInventory.stock >= r.quantity && medicationInInventory.status !== 'out_of_stock') : 
            false;
          
          return {
            id: r.id,
            requestId: r.requestId,
            requestedBy: `${r.requestedBy.firstName} ${r.requestedBy.lastName} (Enfermera)`,
            requestedAt: new Date(r.createdAt).toLocaleString('es-ES'),
            medication: r.medication.name,
            dosage: r.dosage,
            quantity: r.quantity,
            patients: r.patientsInfo || [],
            status: r.status,
            priority: r.priority,
            notes: r.notes || '',
            medicationId: r.medication.id,
            availableInStock: isAvailable,
            stockAvailable: medicationInInventory?.stock || 0
          };
        });
        
        this.filteredRequests = this.medicationRequests;
        
        // Actualizar contadores después de cargar solicitudes
        this.updateCounters();
        
        console.log('✅ Solicitudes cargadas:', this.medicationRequests.length);
      },
      error: (error) => {
        console.error('Error cargando solicitudes:', error);
        alert('Error al cargar las solicitudes. Por favor, recarga la página.');
        this.medicationRequests = [];
        this.filteredRequests = [];
        this.updateCounters();
      }
    });
  }

  loadHistory(): void {
    this.pharmacyService.getDeliveryHistory(true).subscribe({
      next: (historyData: any) => {
        // Procesar entregas
        const deliveries = (historyData.deliveries || []).map((h: any) => {
          const deliveredDate = h.deliveredAt ? new Date(h.deliveredAt) : new Date();
          return {
            id: h.id,
            deliveryId: h.deliveryId,
            medication: h.medication.name,
            dosage: h.dosage,
            quantity: h.quantity,
            requestedBy: `${h.requestedBy.firstName} ${h.requestedBy.lastName}`,
            deliveredAt: deliveredDate.toLocaleString('es-ES'),
            deliveredAtRaw: deliveredDate, // Guardar fecha original para comparación
            deliveredBy: `${h.deliveredBy.firstName} ${h.deliveredBy.lastName}`,
            patients: h.patients || [],
            notes: h.notes || 'Sin observaciones',
            type: 'delivery'
          };
        });
        
        // Procesar rechazos
        const cancelled = (historyData.cancelled || []).map((r: any) => ({
          id: r.id,
          requestId: r.requestId,
          medication: r.medication.name,
          dosage: r.dosage,
          quantity: r.quantity,
          requestedBy: `${r.requestedBy.firstName} ${r.requestedBy.lastName}`,
          cancelledAt: new Date(r.cancelledAt).toLocaleString('es-ES'),
          notes: r.notes || '',
          patientsInfo: r.patientsInfo || [],
          type: 'cancelled'
        }));
        
        // Combinar y ordenar por fecha
        this.fullHistory = [...deliveries, ...cancelled].sort((a, b) => {
          const dateA = a.deliveredAt || a.cancelledAt;
          const dateB = b.deliveredAt || b.cancelledAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        // Mantener compatibilidad con código existente
        this.deliveryHistory = deliveries;
        this.filteredHistory = this.fullHistory;
        
        // Actualizar contadores después de cargar historial
        this.updateCounters();
        
        console.log('✅ Historial cargado:', {
          entregas: deliveries.length,
          rechazos: cancelled.length,
          total: this.fullHistory.length
        });
      },
      error: (error) => {
        console.error('Error cargando historial:', error);
        this.deliveryHistory = [];
        this.filteredHistory = [];
        this.fullHistory = [];
        this.updateCounters();
      }
    });
  }


  updateCounters(): void {
    // Contar solicitudes por estado
    this.pendingRequestsCount = this.medicationRequests.filter(r => r.status === 'pending').length;
    this.inPreparationCount = this.medicationRequests.filter(r => r.status === 'in_preparation').length;
    this.readyForDeliveryCount = this.medicationRequests.filter(r => r.status === 'ready').length;
    
    // Contar entregas del día actual desde el historial completo
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.deliveredTodayCount = this.fullHistory.filter(h => {
      if (h.type !== 'delivery') return false;
      
      try {
        // Usar deliveredAtRaw si está disponible (fecha original), sino parsear deliveredAt
        let deliveryDate: Date;
        if ((h as any).deliveredAtRaw) {
          deliveryDate = new Date((h as any).deliveredAtRaw);
        } else if (h.deliveredAt) {
          // Si viene como string formateado (ej: "17/12/2025, 19:30:00")
          if (typeof h.deliveredAt === 'string') {
            const dateStr = h.deliveredAt.split(',')[0]; // Tomar solo la parte de la fecha
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              // Formato DD/MM/YYYY
              deliveryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
              // Intentar parseo directo
              deliveryDate = new Date(h.deliveredAt);
            }
          } else {
            deliveryDate = new Date(h.deliveredAt);
          }
        } else {
          return false;
        }
        
        deliveryDate.setHours(0, 0, 0, 0);
        const isToday = deliveryDate.getTime() === today.getTime();
        
        return isToday;
      } catch (e) {
        console.error('Error parseando fecha de entrega:', h.deliveredAt, e);
        return false;
      }
    }).length;
    
    console.log('📊 Contadores actualizados:', {
      pendientes: this.pendingRequestsCount,
      enPreparacion: this.inPreparationCount,
      listas: this.readyForDeliveryCount,
      entregadasHoy: this.deliveredTodayCount,
      totalHistorial: this.fullHistory.length,
      entregasEnHistorial: this.fullHistory.filter(h => h.type === 'delivery').length,
      fechaHoy: today.toDateString()
    });
  }

  filterRequests(): void {
    this.filteredRequests = this.medicationRequests.filter(req => {
      const matchesSearch = !this.searchTerm ||
        req.medication.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.requestedBy.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.requestFilter === 'all' || req.status === this.requestFilter;

      return matchesSearch && matchesStatus;
    });
  }

  filterHistory(): void {
    this.filteredHistory = this.fullHistory.filter(item => {
      const matchesSearch = !this.historySearchTerm ||
        item.medication.toLowerCase().includes(this.historySearchTerm.toLowerCase()) ||
        item.requestedBy.toLowerCase().includes(this.historySearchTerm.toLowerCase());
      return matchesSearch;
    });
  }

  filterInventory(): void {
    this.filteredInventory = this.inventory.filter(item => {
      return !this.inventorySearchTerm ||
        item.medication.toLowerCase().includes(this.inventorySearchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(this.inventorySearchTerm.toLowerCase());
    });
  }

  changeSection(section: string): void {
    this.activeSection = section;
  }

  // Usar disponibilidad REAL del inventario (sin simulaciones)
  isMedicationAvailable(request: MedicationRequest): boolean {
    return request.availableInStock || false;
  }

  changeRequestStatus(request: MedicationRequest, newStatus: 'pending' | 'in_preparation' | 'ready' | 'delivered' | 'cancelled'): void {
    // Si es rechazo, abrir modal para razón
    if (newStatus === 'cancelled') {
      this.openRejectModal(request);
      return;
    }
    
    // Verificar disponibilidad REAL del inventario
    const isAvailable = this.isMedicationAvailable(request);
    
    if (!isAvailable && (newStatus === 'in_preparation' || newStatus === 'ready')) {
      const confirmMessage = `⚠️ Este medicamento no está disponible en inventario (Stock: ${request.stockAvailable || 0}).\n\n¿Deseas continuar marcándolo como "${newStatus === 'in_preparation' ? 'En Preparación' : 'Listo'}" de todas formas?\n\nNota: Deberás solicitar el medicamento externamente o agregarlo al inventario primero.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.pharmacyService.updateRequestStatus(request.id, newStatus).subscribe({
      next: () => {
        request.status = newStatus;
        
        const statusMessages: { [key: string]: string } = {
          'in_preparation': '🔄 Solicitud en preparación',
          'ready': '✅ Solicitud lista para entregar',
          'delivered': '📦 Solicitud marcada como entregada'
        };

        alert(statusMessages[newStatus] || 'Estado actualizado');
        
        // Recargar datos y actualizar contadores
        this.loadRequests();
        this.loadHistory();

        if (newStatus === 'ready') {
          alert('✅ Medicamento listo. Puede entregarse cuando la enfermera lo recoja.');
        }
      },
      error: (error) => {
        console.error('Error actualizando estado:', error);
        alert(error.error?.message || 'Error al actualizar el estado');
      }
    });
  }

  openRejectModal(request: MedicationRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRequest = null;
    this.rejectionReason = '';
  }

  confirmRejection(): void {
    if (!this.selectedRequest) return;
    
    if (!this.rejectionReason.trim()) {
      alert('Por favor ingresa una razón para rechazar la solicitud');
      return;
    }

    this.pharmacyService.updateRequestStatus(
      this.selectedRequest.id, 
      'cancelled', 
      this.rejectionReason
    ).subscribe({
      next: () => {
        alert('❌ Solicitud rechazada exitosamente');
        this.closeRejectModal();
        this.loadRequests();
        this.loadHistory();
        this.updateCounters();
      },
      error: (error) => {
        console.error('Error rechazando solicitud:', error);
        alert(error.error?.message || 'Error al rechazar la solicitud');
      }
    });
  }

  getHistoryTypeLabel(type: string): string {
    return type === 'delivery' ? '📦 Entregada' : '❌ Rechazada';
  }

  getHistoryDate(item: any): string {
    return item.deliveredAt || item.cancelledAt || 'N/A';
  }

  openDeliveryModal(request: MedicationRequest): void {
    this.selectedRequest = request;
    this.deliveryNotes = '';
    this.showDeliveryModal = true;
  }

  closeDeliveryModal(): void {
    this.showDeliveryModal = false;
    this.selectedRequest = null;
    this.deliveryNotes = '';
  }

  confirmDelivery(): void {
    if (!this.selectedRequest) return;

    this.pharmacyService.deliverMedication(this.selectedRequest.id, this.deliveryNotes).subscribe({
      next: (response) => {
        alert(`✅ Entrega confirmada\nID: ${response.deliveryId}`);
        
        // Recargar datos para actualizar todo
        this.loadRequests();
        this.loadHistory();
        this.updateCounters();
        this.closeDeliveryModal();
      },
      error: (error) => {
        console.error('Error registrando entrega:', error);
        alert('Error al registrar la entrega');
      }
    });
  }

  viewRequestDetails(request: MedicationRequest): void {
    const patientsInfo = request.patients.map(p => 
      `${p.patientName} (${p.bedNumber}):\n${p.doses.map(d => `  - ${d.time}: ${d.quantity}`).join('\n')}`
    ).join('\n\n');

    alert(`📋 Detalles de Solicitud\n\nID: ${request.requestId}\nMedicamento: ${request.medication} ${request.dosage}\nCantidad Total: ${request.quantity}\n\nPacientes:\n${patientsInfo}\n\nNotas: ${request.notes}`);
  }

  updateStock(item: InventoryItem): void {
    if (!item.id) {
      alert('Error: No se pudo identificar el medicamento');
      return;
    }

    const newStock = prompt(`Actualizar stock de ${item.medication} ${item.dosage}\nStock actual: ${item.stock}`, item.stock.toString());
    
    if (newStock && !isNaN(parseInt(newStock)) && parseInt(newStock) >= 0) {
      this.pharmacyService.updateMedicationStock(item.id, parseInt(newStock)).subscribe({
        next: () => {
          this.pharmacyService.getInventory().subscribe({
            next: (inventory) => {
              this.inventory = inventory.map(i => ({
                id: i.id,
                medication: i.name,
                dosage: i.dosage,
                stock: i.stock,
                minStock: i.minStock,
                location: i.location || 'N/A',
                expiryDate: i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('es-ES') : 'N/A',
                status: i.status
              }));
              
              this.filteredInventory = this.inventory;
              
              this.loadRequests();
              
              alert(`✅ Stock actualizado: ${newStock} unidades`);
            },
            error: (error) => {
              console.error('Error recargando inventario:', error);
              alert('✅ Stock actualizado, pero hubo un error al recargar la vista');
            }
          });
        },
        error: (error) => {
          console.error('Error actualizando stock:', error);
          alert('Error al actualizar el stock');
        }
      });
    }
  }

  printReport(): void {
    window.print();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': '⏳ Pendiente',
      'in_preparation': '🔄 Preparando',
      'ready': '✅ Lista',
      'delivered': '📦 Entregada'
    };
    return labels[status] || status;
  }

  getInventoryStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'available': '✓ Disponible',
      'low_stock': '⚠️ Stock Bajo',
      'expired': '🚫 Vencido',
      'out_of_stock': '❌ Sin Stock'
    };
    return labels[status] || status;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ========== GESTIÓN DE INVENTARIO ==========

  openAddMedicationModal(): void {
    this.newMedicationForm = {
      name: '',
      dosage: '',
      description: '',
      stock: 0,
      minStock: 50,
      location: '',
      expiryDate: ''
    };
    this.showAddMedicationModal = true;
  }

  closeAddMedicationModal(): void {
    this.showAddMedicationModal = false;
    this.newMedicationForm = {
      name: '',
      dosage: '',
      description: '',
      stock: 0,
      minStock: 50,
      location: '',
      expiryDate: ''
    };
  }

  createMedication(): void {
    if (!this.newMedicationForm.name || !this.newMedicationForm.dosage) {
      alert('El nombre y la dosis son requeridos');
      return;
    }

    if (this.newMedicationForm.stock < 0) {
      alert('El stock no puede ser negativo');
      return;
    }

    this.pharmacyService.createMedication(this.newMedicationForm).subscribe({
      next: () => {
        alert('✅ Medicamento agregado al inventario exitosamente');
        this.closeAddMedicationModal();
        this.loadData();
      },
      error: (error) => {
        console.error('Error creando medicamento:', error);
        alert(error.error?.message || 'Error al crear el medicamento');
      }
    });
  }

  openDeleteMedicationModal(item: InventoryItem): void {
    this.selectedMedicationForDelete = item;
    this.showDeleteMedicationModal = true;
  }

  closeDeleteMedicationModal(): void {
    this.showDeleteMedicationModal = false;
    this.selectedMedicationForDelete = null;
  }

  confirmDeleteMedication(): void {
    if (!this.selectedMedicationForDelete?.id) {
      alert('Error: No se pudo identificar el medicamento');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar "${this.selectedMedicationForDelete.medication} ${this.selectedMedicationForDelete.dosage}" del inventario?\n\nEsta acción marcará el medicamento como inactivo.`)) {
      return;
    }

    this.pharmacyService.deleteMedication(this.selectedMedicationForDelete.id).subscribe({
      next: () => {
        alert('✅ Medicamento eliminado del inventario exitosamente');
        this.closeDeleteMedicationModal();
        this.loadData();
      },
      error: (error) => {
        console.error('Error eliminando medicamento:', error);
        alert(error.error?.message || 'Error al eliminar el medicamento');
      }
    });
  }
}

